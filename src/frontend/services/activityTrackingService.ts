import { Platform } from 'react-native';
import { AppUsageData, DailyActivityData, TRACKED_APPS } from '../types/ActivityTracking';
import supabase from '../../lib/supabase';

// Constants
const COIN_LOSS_PER_15_MIN = 1;
const MINUTES_PER_COIN = 15;

class ActivityTrackingService {
    // Placeholder for native module integration
    // This will be replaced with actual Screen Time API bridge when implemented
    private async getNativeScreenTimeData(): Promise<AppUsageData[]> {
        // TODO: Implement Screen Time API bridge using FamilyControls framework
        // This will call the native Swift module when available
        
        if (Platform.OS === 'ios') {
            // When Screen Time API is available, this will call:
            // const nativeModule = NativeModules.ScreenTimeModule;
            // const rawData = await nativeModule.getTodayUsageData();
            // return this.parseScreenTimeData(rawData);
        }
        
        // For now, return empty array - dummy data is generated elsewhere
        return [];
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

    // Generate realistic dummy data for testing
    private generateDummyData(): AppUsageData[] {
        const apps = Object.entries(TRACKED_APPS);
        const dummyData: AppUsageData[] = [];
        
        // Generate realistic usage patterns (some apps used more than others)
        const usagePatterns = [
            { probability: 0.8, minMinutes: 10, maxMinutes: 60 },  // High usage apps
            { probability: 0.5, minMinutes: 5, maxMinutes: 30 },   // Medium usage apps
            { probability: 0.3, minMinutes: 1, maxMinutes: 15 },   // Low usage apps
        ];
        
        apps.forEach(([appId, appInfo], index) => {
            const pattern = usagePatterns[index % usagePatterns.length];
            
            // Random chance this app was used today
            if (Math.random() < pattern.probability) {
                const timeSpentMinutes = Math.floor(
                    Math.random() * (pattern.maxMinutes - pattern.minMinutes) + pattern.minMinutes
                );
                
                dummyData.push({
                    appId,
                    appName: appInfo.name,
                    timeSpentMinutes,
                    coinsLost: this.calculateCoinsLost(timeSpentMinutes),
                    color: appInfo.color
                });
            }
        });
        
        return dummyData;
    }

    // Calculate coins lost based on minutes
    private calculateCoinsLost(minutes: number): number {
        return Math.floor(minutes / MINUTES_PER_COIN) * COIN_LOSS_PER_15_MIN;
    }

    // Store daily activity data
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

            // For now, we'll use insert since upsert isn't available
            // In a production app, we'd implement proper upsert logic
            const { error } = await supabase
                .from('activity_tracking')
                .insert({
                    user_id: userIdToUse,
                    date: data.date,
                    total_coins_lost: data.totalCoinsLost,
                    app_usage: data.appUsage
                });

            if (error) {
                console.error('Error storing daily activity:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error storing daily activity:', error);
            return false;
        }
    }

    // Get activity data for a specific date
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

            // For now, we'll fetch all records for the date and filter by user_id
            // In a production app with proper Supabase client, this would be optimized
            const { data: activityData, error } = await supabase
                .from('activity_tracking')
                .select('*')
                .eq('date', date);

            if (error) {
                console.error('Error fetching daily activity:', error);
                throw new Error(error);
            }

            // Filter by user_id since we can't chain eq calls with the custom client
            const userActivityData = activityData?.filter((row: any) => row.user_id === userIdToQuery);

            // Check if we got data back for this specific user
            if (!userActivityData || !Array.isArray(userActivityData) || userActivityData.length === 0) {
                // If no data exists, create dummy data for testing
                // In production, this would fetch from Screen Time API
                const dummyAppUsage = this.generateDummyData();
                const totalCoinsLost = dummyAppUsage.reduce((total, app) => total + app.coinsLost, 0);
                
                const defaultData: DailyActivityData = {
                    date,
                    totalCoinsLost,
                    appUsage: dummyAppUsage
                };
                
                // Store the dummy data for consistency (only for current user, not opponents)
                if (!userId) {
                    await this.storeDailyActivity(defaultData, userIdToQuery);
                }
                return defaultData;
            }

            // Get the first (and should be only) result for this user
            const firstResult = userActivityData[0];
            return {
                date: firstResult.date,
                totalCoinsLost: firstResult.total_coins_lost,
                appUsage: firstResult.app_usage
            };
        } catch (error) {
            console.error('Error fetching daily activity:', error);
            return null;
        }
    }

    // Get activity data for a date range - simplified for the custom client
    async getActivityRange(startDate: string, endDate: string): Promise<DailyActivityData[]> {
        try {
            // Since the custom client doesn't support gte/lte, we'll generate dummy data
            // In production with proper Supabase client, this would be a real query
            console.log('Generating dummy activity range data for', startDate, 'to', endDate);
            
            const dummyRangeData: DailyActivityData[] = [];
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const dummyAppUsage = this.generateDummyData();
                const totalCoinsLost = dummyAppUsage.reduce((total, app) => total + app.coinsLost, 0);
                
                dummyRangeData.push({
                    date: dateStr,
                    totalCoinsLost,
                    appUsage: dummyAppUsage
                });
            }
            
            return dummyRangeData;
        } catch (error) {
            console.error('Error fetching activity range:', error);
            return [];
        }
    }

    // Update activity data from Screen Time API
    async updateActivityData(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            console.log('Screen Time API only available on iOS');
            return false;
        }

        try {
            // Get current user ID
            const { data: { user } } = await supabase.getUser();
            if (!user) {
                console.error('No authenticated user found');
                return false;
            }

            // Get current date in YYYY-MM-DD format
            const today = new Date().toISOString().split('T')[0];
            
            // Get screen time data from native module (placeholder for now)
            const screenTimeData = await this.getNativeScreenTimeData();
            
            if (screenTimeData.length === 0) {
                console.log('No Screen Time data available - using dummy data');
                // Fall back to dummy data for testing
                const dummyData = this.generateDummyData();
                const totalCoinsLost = dummyData.reduce((total, app) => total + app.coinsLost, 0);
                
                await this.storeDailyActivity({
                    date: today,
                    totalCoinsLost,
                    appUsage: dummyData
                }, user.id);
                return true;
            }
            
            // Calculate total coins lost
            const totalCoinsLost = screenTimeData.reduce((total, app) => 
                total + app.coinsLost, 0);

            // Update database
            await this.storeDailyActivity({
                date: today,
                totalCoinsLost,
                appUsage: screenTimeData
            }, user.id);

            return true;
        } catch (error) {
            console.error('Error updating activity data:', error);
            return false;
        }
    }

    // Get total coins lost for today
    async getTodayCoinsLost(userId?: string): Promise<number> {
        const today = new Date().toISOString().split('T')[0];
        const activityData = await this.getDailyActivity(today, userId);
        return activityData?.totalCoinsLost || 0;
    }

    // Request Screen Time authorization (iOS only)
    async requestScreenTimeAuthorization(): Promise<boolean> {
        if (Platform.OS !== 'ios') {
            console.log('Screen Time API only available on iOS');
            return false;
        }

        try {
            // TODO: When native module is available, call:
            // const nativeModule = NativeModules.ScreenTimeModule;
            // const authorized = await nativeModule.requestAuthorization();
            // return authorized;
            
            console.log('Screen Time authorization not yet implemented - using dummy data');
            return true; // For testing purposes
        } catch (error) {
            console.error('Error requesting Screen Time authorization:', error);
            return false;
        }
    }
}

export default new ActivityTrackingService(); 