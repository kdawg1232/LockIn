import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppUsageData } from '../types/ActivityTracking';
import activityTrackingService from '../services/activityTrackingService';
import { colors, typography, spacing, shadows, commonStyles } from '../styles/theme';
import supabase from '../../lib/supabase';

// Route params interface
interface UserStatsScreenParams {
    opponentId?: string;
    opponentName?: string;
}

export const UserStatsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as UserStatsScreenParams;
    
    // Determine if viewing opponent or comparison mode
    const isViewingOpponent = !!params?.opponentId;
    const opponentId = params?.opponentId;
    const opponentName = params?.opponentName || 'Opponent';
    
    const [currentUserId, setCurrentUserId] = useState<string>('');
    const [userTodayData, setUserTodayData] = useState<AppUsageData[]>([]);
    const [opponentTodayData, setOpponentTodayData] = useState<AppUsageData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Get current user ID
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const { data: { user } } = await supabase.getUser();
                if (user) {
                    setCurrentUserId(user.id);
                }
            } catch (error) {
                console.error('Error getting current user:', error);
            }
        };
        getCurrentUser();
    }, []);

    // Load today's data when user/opponent IDs are available
    useEffect(() => {
        if (currentUserId && (isViewingOpponent ? opponentId : true)) {
            loadTodayData();
        }
    }, [currentUserId, opponentId]);

    // Auto-refresh data every 30 seconds for real-time updates
    useEffect(() => {
        if (!isViewingOpponent && currentUserId) {
            const interval = setInterval(() => {
                console.log('📊 Auto-refreshing real-time usage data');
                loadTodayData();
            }, 30000); // 30 seconds

            return () => clearInterval(interval);
        }
    }, [isViewingOpponent, currentUserId]);

    const loadTodayData = async () => {
        setIsLoading(true);
        try {
            console.log('📊 Loading today\'s app usage data');
            
            const today = new Date().toISOString().split('T')[0];
            
            // For current user, trigger real-time data update first
            if (!isViewingOpponent) {
                console.log('📊 Updating current user real-time data');
                
                // Request Screen Time authorization if needed
                try {
                    const authorized = await activityTrackingService.requestScreenTimeAuthorization();
                    if (authorized) {
                        console.log('📊 Screen Time authorized - updating activity data');
                        await activityTrackingService.updateActivityData();
                    } else {
                        console.log('📊 Screen Time not authorized - showing stored data only');
                    }
                } catch (authError) {
                    console.error('📊 Authorization error:', authError);
                }
            }
            
            if (isViewingOpponent && opponentId) {
                // Load today's data for both users
                const [userToday, opponentToday] = await Promise.all([
                    activityTrackingService.getDailyActivity(today, currentUserId),
                    activityTrackingService.getDailyActivity(today, opponentId)
                ]);
                
                setUserTodayData(userToday?.appUsage || []);
                setOpponentTodayData(opponentToday?.appUsage || []);
                
                console.log('📊 Loaded comparison data:', {
                    userApps: userToday?.appUsage?.length || 0,
                    opponentApps: opponentToday?.appUsage?.length || 0
                });
            } else {
                // Load today's data for user only
                const userToday = await activityTrackingService.getDailyActivity(today, currentUserId);
                setUserTodayData(userToday?.appUsage || []);
                
                console.log('📊 Loaded user data:', {
                    userApps: userToday?.appUsage?.length || 0,
                    totalMinutes: userToday?.appUsage?.reduce((sum, app) => sum + app.timeSpentMinutes, 0) || 0
                });
            }
        } catch (error) {
            console.error('📊 Error loading today\'s data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderTopAppsBreakdown = () => {
        const topUserApps = userTodayData
            .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
            .slice(0, 5);

        return (
            <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>
                    {isViewingOpponent ? 'Your Top 5 Apps Today' : 'Top 5 Apps Today'}
                </Text>
                {topUserApps.length === 0 ? (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>
                            {isViewingOpponent 
                                ? 'No app usage recorded today' 
                                : 'No social media usage detected today 🎉'}
                        </Text>
                        {!isViewingOpponent && (
                            <Text style={styles.noDataSubtext}>
                                Keep it up! Or make sure Screen Time permissions are enabled.
                            </Text>
                        )}
                    </View>
                ) : (
                    <>
                        {topUserApps.map((app, index) => (
                            <View key={app.appId} style={styles.appBreakdownItem}>
                                <View style={[styles.appColorDot, { backgroundColor: app.color }]} />
                                <Text style={styles.appName}>{app.appName}</Text>
                                <View style={styles.appStatsContainer}>
                                    <Text style={styles.appTime}>{app.timeSpentMinutes} min</Text>
                                    <Text style={styles.appCoins}>-{app.coinsLost}</Text>
                                </View>
                            </View>
                        ))}
                        <View style={styles.totalSummary}>
                            <Text style={styles.totalText}>
                                Total: {topUserApps.reduce((sum, app) => sum + app.timeSpentMinutes, 0)} min, 
                                -{topUserApps.reduce((sum, app) => sum + app.coinsLost, 0)} coins
                            </Text>
                        </View>
                    </>
                )}
                
                {isViewingOpponent && (
                    <>
                        <Text style={[styles.breakdownTitle, styles.opponentTitle]}>
                            {opponentName}'s Top 5 Apps Today
                        </Text>
                        {opponentTodayData.length === 0 ? (
                            <View style={styles.noDataContainer}>
                                <Text style={styles.noDataText}>
                                    No app usage recorded for opponent today
                                </Text>
                            </View>
                        ) : (
                            <>
                                {opponentTodayData
                                    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
                                    .slice(0, 5)
                                    .map((app, index) => (
                                        <View key={app.appId} style={styles.appBreakdownItem}>
                                            <View style={[styles.appColorDot, { backgroundColor: app.color }]} />
                                            <Text style={styles.appName}>{app.appName}</Text>
                                            <View style={styles.appStatsContainer}>
                                                <Text style={styles.appTime}>{app.timeSpentMinutes} min</Text>
                                                <Text style={styles.appCoins}>-{app.coinsLost}</Text>
                                            </View>
                                        </View>
                                    ))}
                                <View style={styles.totalSummary}>
                                    <Text style={styles.totalText}>
                                        Total: {opponentTodayData.slice(0, 5).reduce((sum, app) => sum + app.timeSpentMinutes, 0)} min, 
                                        -{opponentTodayData.slice(0, 5).reduce((sum, app) => sum + app.coinsLost, 0)} coins
                                    </Text>
                                </View>
                            </>
                        )}
                    </>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading usage data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>
                    {isViewingOpponent ? `You vs ${opponentName}` : 'Your App Usage'}
                </Text>
                {!isViewingOpponent && (
                    <TouchableOpacity 
                        style={styles.refreshButton}
                        onPress={loadTodayData}
                    >
                        <Text style={styles.refreshButtonText}>🔄</Text>
                    </TouchableOpacity>
                )}
                {isViewingOpponent && <View style={styles.headerSpacer} />}
            </View>

            <ScrollView style={styles.scrollView}>
                {renderTopAppsBreakdown()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm
    },
    backButton: {
        padding: spacing.sm,
        backgroundColor: colors.cream,
        borderRadius: spacing.sm,
    },
    backButtonText: {
        ...commonStyles.body,
        color: colors.secondary,
        fontWeight: typography.fontWeight.medium,
    },
    title: {
        ...commonStyles.heading3,
        color: colors.black
    },
    headerSpacer: {
        width: 50 // Match back button width for centering
    },
    scrollView: {
        flex: 1,
        paddingTop: spacing.md
    },
    breakdownContainer: {
        padding: spacing.lg,
        backgroundColor: colors.white,
        margin: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.paleGray,
        ...shadows.md
    },
    breakdownTitle: {
        ...commonStyles.heading3,
        color: colors.black,
        marginBottom: spacing.lg,
        textAlign: 'center'
    },
    opponentTitle: {
        marginTop: spacing.xl,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.paleGray
    },
    appBreakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.paleGray
    },
    appColorDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: spacing.md
    },
    appName: {
        flex: 1,
        ...commonStyles.body,
        color: colors.black,
        fontWeight: typography.fontWeight.medium
    },
    appStatsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md
    },
    appTime: {
        ...commonStyles.body,
        color: colors.darkGray,
        fontWeight: typography.fontWeight.medium,
        minWidth: 60,
        textAlign: 'right'
    },
    appCoins: {
        ...commonStyles.body,
        color: colors.error,
        fontWeight: typography.fontWeight.bold,
        minWidth: 50,
        textAlign: 'right'
    },
    noDataText: {
        ...commonStyles.body,
        color: colors.darkGray,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    noDataContainer: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    noDataSubtext: {
        ...commonStyles.caption,
        color: colors.mediumGray,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    totalSummary: {
        marginTop: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.lightGray,
        borderRadius: spacing.sm,
    },
    totalText: {
        ...commonStyles.caption,
        color: colors.darkGray,
        textAlign: 'center',
        fontWeight: typography.fontWeight.medium,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...commonStyles.body,
        color: colors.black,
        marginTop: spacing.md
    },
    refreshButton: {
        padding: spacing.sm,
        backgroundColor: colors.primary,
        borderRadius: spacing.sm,
        minWidth: 40,
        alignItems: 'center',
    },
    refreshButtonText: {
        fontSize: 16,
        color: colors.white,
    }
}); 