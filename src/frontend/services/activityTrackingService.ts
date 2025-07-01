import { Platform, NativeModules } from 'react-native';
import { AppUsageData, DailyActivityData, TRACKED_APPS, MINUTES_PER_COIN, COIN_LOSS_PER_30_MIN } from '../types/ActivityTracking';
import supabase from '../../lib/supabase';
import { addCoinTransaction } from './timerService';

// Get the ScreenTimeManager native module
const { ScreenTimeManager } = NativeModules;

class ActivityTrackingService {
    private monitoringInterval: NodeJS.Timeout | null = null;
    private monitoringIntervalMs: number = 5 * 60 * 1000; // 5 minutes
    private isMonitoring: boolean = false;
    private lastPenaltyTime: number = Date.now();

    // Get real Screen Time data from iOS using Swift bridge
    private async getNativeScreenTimeData(): Promise<AppUsageData[]> {
        if (Platform.OS !== 'ios') {
            console.log('📱 Screen Time data only available on iOS');
            return [];
        }

        try {
            console.log('📱 Calling ScreenTimeManager for real usage data');
            
            // Check if ScreenTimeManager is available
            if (!ScreenTimeManager) {
                console.error('📱 ScreenTimeManager native module not found');
                return [];
            }
            
            // Get today's app usage data from Swift module
            const rawScreenTimeData = await ScreenTimeManager.getTodayAppUsage();
            
            if (!rawScreenTimeData || !Array.isArray(rawScreenTimeData)) {
                console.log('📱 No usage data returned from ScreenTimeManager');
                return [];
            }
            
            console.log('📱 Received usage data:', rawScreenTimeData.length, 'apps');
            
            // Parse the data using existing parser
            return this.parseScreenTimeData(rawScreenTimeData);
            
        } catch (error) {
            console.error('📱 Error getting Screen Time data:', error);
            
            // If authorization is needed, request it
            if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'NOT_AUTHORIZED') {
                console.log('📱 Screen Time not authorized - requesting authorization');
                try {
                    await this.requestScreenTimeAuthorization();
                    // Retry after authorization
                    const retryData = await ScreenTimeManager.getTodayAppUsage();
                    return this.parseScreenTimeData(retryData || []);
                } catch (authError) {
                    console.error('📱 Screen Time authorization failed:', authError);
                }
            }
            
            return [];
        }
    }

    // Future method to parse Screen Time API data
    private parseScreenTimeData(rawScreenTimeData: any[]): AppUsageData[] {
        // TODO: Parse actual Screen Time data format
        // Expected format from iOS Screen Time API:
        // {
        //   bundleIdentifier: "com.burbn.instagram",
        //   totalTime: TimeInterval (seconds),
        //   categoryIdentifier: "SocialNetworking"
        // }
        
        return rawScreenTimeData
            .filter(app => this.isSocialMediaApp(app.bundleIdentifier))
            .map(app => {
                const timeSpentMinutes = Math.floor(app.totalTime / 60);
                const appId = this.bundleIdToAppId(app.bundleIdentifier);
                const appInfo = TRACKED_APPS[appId];
                
                return {
                    appId,
                    appName: appInfo?.name || app.bundleIdentifier,
                    timeSpentMinutes,
                    coinsLost: this.calculateCoinsLost(timeSpentMinutes),
                    color: appInfo?.color || '#888888'
                };
            });
    }

    // Helper to identify social media apps from bundle IDs
    private isSocialMediaApp(bundleId: string): boolean {
        const socialMediaBundles = [
            'com.burbn.instagram',           // Instagram
            'com.twitter.twitter',            // Twitter/X
            'com.reddit.Reddit',             // Reddit
            'com.toyopagroup.picaboo',       // Snapchat
            'com.zhiliaoapp.musically',      // TikTok
            'com.facebook.Facebook',         // Facebook
            'com.facebook.Messenger',        // Facebook Messenger
            'com.linkedin.LinkedIn',         // LinkedIn
            'com.pinterest',                 // Pinterest
            'com.discord',                   // Discord
        ];
        
        return socialMediaBundles.includes(bundleId);
    }

    // Helper to convert bundle ID to our app ID system
    private bundleIdToAppId(bundleId: string): string {
        const bundleMapping: Record<string, string> = {
            'com.burbn.instagram': 'instagram',
            'com.twitter.twitter': 'twitter',
            'com.reddit.Reddit': 'reddit',
            'com.toyopagroup.picaboo': 'snapchat',
            'com.zhiliaoapp.musically': 'tiktok',
            'com.facebook.Facebook': 'facebook',
        };
        
        return bundleMapping[bundleId] || bundleId;
    }

    // Calculate coins lost based on minutes (30 minutes = -1 coin, always round UP)
    private calculateCoinsLost(minutes: number): number {
        return Math.ceil(minutes / MINUTES_PER_COIN) * COIN_LOSS_PER_30_MIN;
    }

    // Apply coin penalties to user's account for social media usage
    private async applyCoinPenalties(userId: string, appUsageData: AppUsageData[]): Promise<boolean> {
        try {
            const totalCoinsLost = appUsageData.reduce((total, app) => total + app.coinsLost, 0);
            
            if (totalCoinsLost > 0) {
                console.log('📱 Applying coin penalties for social media usage:', {
                    userId,
                    totalCoinsLost,
                    appsUsed: appUsageData.length
                });
                
                // Create negative coin transaction for penalties
                const result = await addCoinTransaction(
                    userId,
                    -totalCoinsLost, // Negative amount for penalty
                    'social_penalty',
                    undefined, // No session ID for penalties
                    `Social media usage penalty: ${totalCoinsLost} coins lost from ${appUsageData.length} apps`
                );
                
                if (result.error) {
                    console.error('📱 Error applying coin penalties:', result.error);
                    return false;
                }
                
                console.log('📱 Coin penalties applied successfully:', result.data);
                return true;
            }
            
            return true; // No penalties to apply
        } catch (error) {
            console.error('📱 Error in applyCoinPenalties:', error);
            return false;
        }
    }

    // Store daily activity data using manual upsert logic to handle duplicates
    private async storeDailyActivity(data: DailyActivityData, userId?: string): Promise<boolean> {
        try {
            // Get current user ID if not provided
            let userIdToUse = userId;
            if (!userIdToUse) {
                const { data: { user } } = await supabase.getUser();
                if (!user) {
                    console.error('No authenticated user found');
                    return false;
                }
                userIdToUse = user.id;
            }

            // Check if record already exists for this user and date
            // Use single condition then filter in JavaScript (same pattern as getDailyActivity)
            const { data: existingRecord, error: selectError } = await supabase
                .from('activity_tracking')
                .select('id, user_id, date')
                .eq('date', data.date);

            if (selectError) {
                console.error('Error checking existing activity record:', selectError);
                return false;
            }

            // Filter by user_id since we can't chain eq calls with the custom client
            const userRecord = existingRecord?.filter((row: any) => row.user_id === userIdToUse);

            // Prepare the activity data
            const activityData = {
                user_id: userIdToUse,
                date: data.date,
                total_coins_lost: data.totalCoinsLost,
                app_usage: data.appUsage,
                updated_at: new Date().toISOString()
            };

            let result;
            if (userRecord && userRecord.length > 0) {
                // Record exists - update it using the record ID
                const recordId = userRecord[0].id;
                result = await supabase
                    .from('activity_tracking')
                    .update(activityData)
                    .eq('id', recordId);
                    
                console.log('📱 Updated existing activity record for', data.date);
            } else {
                // Record doesn't exist - insert new one
                result = await supabase
                    .from('activity_tracking')
                    .insert(activityData);
                    
                console.log('📱 Inserted new activity record for', data.date);
            }

            if (result.error) {
                console.error('Error storing daily activity:', result.error);
                return false;
            }
            
            console.log('📱 Daily activity data stored/updated successfully for', data.date);
            return true;
        } catch (error) {
            console.error('Error storing daily activity:', error);
            return false;
        }
    }

    // Get activity data for a specific date (try real data first, then stored data)
    async getDailyActivity(date: string, userId?: string): Promise<DailyActivityData | null> {
        try {
            // Get target user ID (for opponent viewing) or current user
            let userIdToQuery = userId;
            if (!userIdToQuery) {
                const { data: { user } } = await supabase.getUser();
                if (!user) {
                    console.error('No authenticated user found');
                    return null;
                }
                userIdToQuery = user.id;
            }
            
            // Validate user ID
            if (!userIdToQuery || userIdToQuery.trim() === '') {
                console.error('🏃 Invalid user ID provided to getDailyActivity:', userIdToQuery);
                return null;
            }

            // For today's date and current user, try to get real-time data first
            const today = new Date().toISOString().split('T')[0];
            const isToday = date === today;
            const isCurrentUser = userIdToQuery === (await supabase.getUser()).data.user?.id;
            
            if (isToday && isCurrentUser && Platform.OS === 'ios') {
                console.log('📱 Getting real-time data for today');
                try {
                    const realtimeUsage = await this.getAppUsageForDate(date);
                    if (realtimeUsage.length > 0) {
                        const totalCoinsLost = realtimeUsage.reduce((total, app) => total + app.coinsLost, 0);
                        
                        // Update stored data with real-time data
                        await this.storeDailyActivity({
                            date,
                            totalCoinsLost,
                            appUsage: realtimeUsage
                        }, userIdToQuery);
                        
                        return {
                            date,
                            totalCoinsLost,
                            appUsage: realtimeUsage
                        };
                    }
                } catch (error) {
                    console.log('📱 Real-time data not available, falling back to stored data');
                }
            }

            // Fall back to stored data from database
            const { data: activityData, error } = await supabase
                .from('activity_tracking')
                .select('*')
                .eq('date', date);

            if (error) {
                console.error('Error fetching daily activity:', error);
                return null;
            }

            // Filter by user_id since we can't chain eq calls with the custom client
            const userActivityData = activityData?.filter((row: any) => row.user_id === userIdToQuery);

            // Check if we got data back for this specific user
            if (!userActivityData || userActivityData.length === 0) {
                console.log(`📱 No stored activity data found for user ${userIdToQuery} on ${date}`);
                return null;
            }

            // Get the most recent entry for this user and date
            const latestEntry = userActivityData[userActivityData.length - 1];
            
            return {
                date: latestEntry.date,
                totalCoinsLost: latestEntry.total_coins_lost || 0,
                appUsage: latestEntry.app_usage || []
            };
            
        } catch (error) {
            console.error('Error in getDailyActivity:', error);
            return null;
        }
    }

    // Get activity data for a range of dates
    async getActivityRange(startDate: string, endDate: string): Promise<DailyActivityData[]> {
        try {
            console.log('📱 Fetching activity range:', startDate, 'to', endDate);
            
            // Get current user
            const { data: { user } } = await supabase.getUser();
            if (!user) {
                console.error('📱 No authenticated user found');
                return [];
            }

            return await this.getUserActivityRange(user.id, startDate, endDate);
        } catch (error) {
            console.error('📱 Error fetching activity range:', error);
            return [];
        }
    }

    // Update activity data using real Screen Time data
    async updateActivityData(): Promise<boolean> {
        try {
            console.log('📱 Updating activity data with real Screen Time data');
            
            // Get current user
            const { data: { user } } = await supabase.getUser();
            if (!user) {
                console.error('📱 No authenticated user found');
                return false;
            }
            
            // Request authorization if needed
            const isAuthorized = await this.requestScreenTimeAuthorization();
            if (!isAuthorized) {
                console.log('📱 Screen Time not authorized - cannot update activity data');
                return false;
            }
            
            // Get today's real usage data
            const todayUsage = await this.getNativeScreenTimeData();
            
            if (todayUsage.length === 0) {
                console.log('📱 No app usage detected today');
                // Still store empty data to mark the day as checked
                const today = new Date().toISOString().split('T')[0];
                await this.storeDailyActivity({
                    date: today,
                    totalCoinsLost: 0,
                    appUsage: []
                }, user.id);
                return true;
            }
            
            // Calculate total coins lost
            const totalCoinsLost = todayUsage.reduce((total, app) => total + app.coinsLost, 0);
            
            console.log('📱 Today\'s usage summary:', {
                appsUsed: todayUsage.length,
                totalMinutes: todayUsage.reduce((total, app) => total + app.timeSpentMinutes, 0),
                totalCoinsLost
            });
            
            // Store the activity data
            const today = new Date().toISOString().split('T')[0];
            const success = await this.storeDailyActivity({
                date: today,
                totalCoinsLost,
                appUsage: todayUsage
            }, user.id);
            
            if (success) {
                console.log('📱 Activity data updated successfully');
                
                // Apply coin penalties for current usage
                if (totalCoinsLost > 0) {
                    await this.applyCoinPenalties(user.id, todayUsage);
                }
            }
            
            return success;
            
        } catch (error) {
            console.error('📱 Error updating activity data:', error);
            return false;
        }
    }

    // Get total coins lost for today
    async getTodayCoinsLost(userId?: string): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const activityData = await this.getDailyActivity(today, userId);
        return activityData?.totalCoinsLost || 0;
    }

    // Request Screen Time authorization using Swift bridge
    async requestScreenTimeAuthorization(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            console.log('📱 Screen Time authorization only available on iOS');
            return false;
        }

        try {
            console.log('📱 Requesting Screen Time authorization');
            
            if (!ScreenTimeManager) {
                console.error('📱 ScreenTimeManager native module not found');
                return false;
            }
            
            const result = await ScreenTimeManager.requestScreenTimeAuthorization();
            
            if (result.authorized) {
                console.log('📱 Screen Time authorization granted');
                
                // Configure social media apps for monitoring
                try {
                    const configResult = await ScreenTimeManager.configureSocialMediaApps();
                    console.log('📱 Social media apps configured:', configResult);
                } catch (configError) {
                    console.error('📱 Error configuring social media apps:', configError);
                }
                
                return true;
            } else {
                console.log('📱 Screen Time authorization denied:', result.status);
                return false;
            }
            
        } catch (error) {
            console.error('📱 Error requesting Screen Time authorization:', error);
            return false;
        }
    }

    // Get comparison data for user vs opponent (for UserStatsScreen)
    async getUserVsOpponentData(userId: string, opponentId: string, dateRange: number = 7): Promise<{
        userData: DailyActivityData[];
        opponentData: DailyActivityData[];
    }> {
        try {
            console.log('📱 Fetching user vs opponent comparison data');
            
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - dateRange);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Get data for both users in parallel
            const [userData, opponentData] = await Promise.all([
                this.getUserActivityRange(userId, startDateStr, endDateStr),
                this.getUserActivityRange(opponentId, startDateStr, endDateStr)
            ]);
            
            return { userData, opponentData };
        } catch (error) {
            console.error('📱 Error fetching comparison data:', error);
            return { userData: [], opponentData: [] };
        }
    }

    // Get activity data range for a specific user
    private async getUserActivityRange(userId: string, startDate: string, endDate: string): Promise<DailyActivityData[]> {
        try {
            // Fetch data by user_id only, then filter dates in JavaScript
            // since we can't chain multiple conditions with the custom client
            const { data: activityData, error } = await supabase
                .from('activity_tracking')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                console.error('📱 Error fetching user activity range:', error);
                throw error;
            }

            // Return empty array if no data exists
            if (!activityData || activityData.length === 0) {
                console.log('📱 No activity data found for user in date range');
                return [];
            }

            // Filter by date range in JavaScript since we can't chain filters
            const filteredData = activityData.filter((row: any) => {
                const rowDate = row.date;
                return rowDate >= startDate && rowDate <= endDate;
            });

            if (filteredData.length === 0) {
                console.log('📱 No activity data found for user in specified date range');
                return [];
            }

            return filteredData.map((row: any) => ({
                date: row.date,
                totalCoinsLost: row.total_coins_lost,
                appUsage: row.app_usage
            }));
        } catch (error) {
            console.error('📱 Error in getUserActivityRange:', error);
            return [];
        }
    }

    // Start background monitoring for social media usage (only during challenge windows)
    async startBackgroundMonitoring(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            console.log('📱 Background monitoring only available on iOS');
            return false;
        }

        try {
            // Import time utils to check challenge window
            const { getChallengeTimeInfo } = await import('../../utils/timeUtils');
            const timeInfo = getChallengeTimeInfo();
            
            if (!timeInfo.isInChallengeWindow) {
                console.log('📱 Not in challenge window - background monitoring will not start');
                return false;
            }

            console.log('📱 Starting background monitoring for challenge period');
            
            // Configure social media apps for monitoring first
            try {
                const configResult = await ScreenTimeManager.configureSocialMediaApps();
                console.log('📱 Social media apps configured for monitoring:', configResult);
            } catch (configError) {
                console.error('📱 Error configuring social media apps:', configError);
                // Continue with monitoring even if configuration fails
            }
            
            // Clear any existing monitoring first
            await this.stopBackgroundMonitoring();
            
            // Start native DeviceActivity monitoring
            try {
                await ScreenTimeManager.restartBackgroundMonitoring();
                console.log('📱 Native DeviceActivity monitoring started');
            } catch (nativeError) {
                console.error('📱 Error starting native monitoring:', nativeError);
                // Continue with JavaScript monitoring even if native fails
            }
            
            // Start interval for background monitoring (check every 5 minutes)
            this.monitoringInterval = setInterval(async () => {
                await this.performBackgroundCheck();
            }, this.monitoringIntervalMs);
            
            this.isMonitoring = true;
            console.log('📱 Background monitoring started successfully for challenge period');
            return true;
        } catch (error) {
            console.error('📱 Error starting background monitoring:', error);
            return false;
        }
    }

    // Stop background monitoring
    async stopBackgroundMonitoring(): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        // Stop native DeviceActivity monitoring
        if (Platform.OS === 'ios' && ScreenTimeManager) {
            try {
                await ScreenTimeManager.stopBackgroundMonitoring();
                console.log('📱 Native DeviceActivity monitoring stopped');
            } catch (error) {
                console.error('📱 Error stopping native monitoring:', error);
            }
        }
        
        this.isMonitoring = false;
        console.log('📱 Background monitoring stopped');
    }

    // Get current session usage (calls Screen Time API for real data)
    private async getCurrentSessionUsage(): Promise<AppUsageData[]> {
        try {
            console.log('📱 Getting current session usage with real Screen Time data');
            
            // Get real Screen Time data for current session
            const currentUsage = await this.getNativeScreenTimeData();
            
            if (currentUsage.length > 0) {
                console.log('📱 Current session usage detected:', currentUsage.length, 'apps');
                
                // Log details for debugging
                currentUsage.forEach(app => {
                    console.log(`📱 ${app.appName}: ${app.timeSpentMinutes} min, -${app.coinsLost} coins`);
                });
                
                return currentUsage;
            }
            
            console.log('📱 No current session usage detected');
            return [];
        } catch (error) {
            console.error('📱 Error getting current session usage:', error);
            return [];
        }
    }

    // Merge new usage data with existing usage data
    private mergeUsageData(existing: AppUsageData[], newUsage: AppUsageData[]): AppUsageData[] {
        const merged = [...existing];
        
        newUsage.forEach(newApp => {
            const existingIndex = merged.findIndex(app => app.appId === newApp.appId);
            if (existingIndex >= 0) {
                // Update existing app usage
                merged[existingIndex].timeSpentMinutes += newApp.timeSpentMinutes;
                merged[existingIndex].coinsLost = this.calculateCoinsLost(merged[existingIndex].timeSpentMinutes);
            } else {
                // Add new app usage
                merged.push(newApp);
            }
        });
        
        return merged;
    }

    // Check if monitoring is active
    isBackgroundMonitoringActive(): boolean {
        return this.isMonitoring;
    }

    // Perform background check (called by monitoring interval)
    private async performBackgroundCheck(): Promise<void> {
        try {
            // Import time utils to check if we're still in challenge window
            const { getChallengeTimeInfo } = await import('../../utils/timeUtils');
            const timeInfo = getChallengeTimeInfo();
            
            if (!timeInfo.isInChallengeWindow) {
                console.log('📱 Challenge window ended - stopping background monitoring');
                await this.stopBackgroundMonitoring();
                return;
            }

            console.log('📱 Performing background social media usage check');
            
            // Get current session usage for monitoring
            const currentUsage = await this.getCurrentSessionUsage();
            
            if (currentUsage.length > 0) {
                const totalMinutes = currentUsage.reduce((total, app) => total + app.timeSpentMinutes, 0);
                const totalCoinsLost = currentUsage.reduce((total, app) => total + app.coinsLost, 0);
                
                console.log('📱 Social media usage detected:', {
                    apps: currentUsage.length,
                    totalMinutes,
                    totalCoinsLost
                });
                
                // Check if we need to apply penalty (every 30 minutes)
                const now = Date.now();
                const timeSinceLastPenalty = now - this.lastPenaltyTime;
                const penaltyIntervalMs = MINUTES_PER_COIN * 60 * 1000; // 30 minutes in milliseconds
                
                if (timeSinceLastPenalty >= penaltyIntervalMs) {
                    console.log('📱 Applying social media usage penalty');
                    
                    // Apply penalty for current usage
                    await this.applyCoinPenalties(await this.getCurrentUserId(), currentUsage);
                    
                    // Update last penalty time
                    this.lastPenaltyTime = now;
                    console.log('📱 Penalty applied and timestamp updated');
                }
            } else {
                console.log('📱 No social media usage detected in current monitoring cycle');
            }
        } catch (error) {
            console.error('📱 Error in background check:', error);
        }
    }

    // Helper method to get current user ID
    private async getCurrentUserId(): Promise<string> {
        const { data: { user } } = await supabase.getUser();
        if (!user) {
            throw new Error('No authenticated user found');
        }
        return user.id;
    }

    // Get app usage data for a specific date using Swift bridge
    private async getAppUsageForDate(date: string): Promise<AppUsageData[]> {
        if (Platform.OS !== 'ios') {
            console.log('📱 Screen Time data only available on iOS');
            return [];
        }

        try {
            console.log('📱 Getting app usage for date:', date);
            
            if (!ScreenTimeManager) {
                console.error('📱 ScreenTimeManager native module not found');
                return [];
            }
            
            const rawData = await ScreenTimeManager.getAppUsageForDate(date);
            
            if (!rawData || !Array.isArray(rawData)) {
                console.log('📱 No usage data for date:', date);
                return [];
            }
            
            return this.parseScreenTimeData(rawData);
            
        } catch (error) {
            console.error('📱 Error getting app usage for date:', error);
            return [];
        }
    }
}

export default new ActivityTrackingService(); 