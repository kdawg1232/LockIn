import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, subDays } from 'date-fns';
import { AppUsageData, DailyActivityData } from '../types/ActivityTracking';
import activityTrackingService from '../services/activityTrackingService';
import { colors, typography, spacing, shadows, commonStyles } from '../styles/theme';
import supabase from '../../lib/supabase';

const TIME_RANGES = {
    WEEK: 'week',
    MONTH: 'month',
    ALL: 'all'
} as const;

type TimeRange = typeof TIME_RANGES[keyof typeof TIME_RANGES];

// Route params interface
interface UserStatsScreenParams {
    opponentId?: string;
    opponentName?: string;
}

export const UserStatsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as UserStatsScreenParams;
    
    // Determine if viewing opponent or own stats
    const isViewingOpponent = !!params?.opponentId;
    const targetUserId = params?.opponentId;
    const displayName = params?.opponentName || 'Your';
    
    const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES.WEEK);
    const [activityData, setActivityData] = useState<DailyActivityData[]>([]);
    const [todayData, setTodayData] = useState<AppUsageData[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string>('');

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

    useEffect(() => {
        if (currentUserId || targetUserId) {
            loadActivityData();
        }
    }, [selectedRange, currentUserId, targetUserId]);

    const loadActivityData = async () => {
        const today = new Date();
        let startDate: Date;

        switch (selectedRange) {
            case TIME_RANGES.WEEK:
                startDate = subDays(today, 7);
                break;
            case TIME_RANGES.MONTH:
                startDate = subDays(today, 30);
                break;
            case TIME_RANGES.ALL:
                startDate = subDays(today, 90); // Show up to 90 days
                break;
            default:
                startDate = subDays(today, 7);
        }

        // Use target user ID if viewing opponent, otherwise use current user
        const userIdToUse = isViewingOpponent ? targetUserId : currentUserId;
        
        if (!userIdToUse) {
            console.log('No user ID available for loading activity data');
            return;
        }

        console.log(`Loading activity data for ${isViewingOpponent ? 'opponent' : 'user'}:`, userIdToUse);

        // For now, we'll still use the dummy data generator for range data
        // In production, this would be optimized to query the database properly
        const data = await activityTrackingService.getActivityRange(
            format(startDate, 'yyyy-MM-dd'),
            format(today, 'yyyy-MM-dd')
        );
        setActivityData(data);

        // Load today's data for the bar chart with specific user ID
        const todayActivityData = await activityTrackingService.getDailyActivity(
            format(today, 'yyyy-MM-dd'),
            userIdToUse
        );
        if (todayActivityData) {
            setTodayData(todayActivityData.appUsage);
        }
    };

    const renderTimeRangeSelector = () => (
        <View style={styles.timeRangeContainer}>
            {Object.values(TIME_RANGES).map((range) => (
                <TouchableOpacity
                    key={range}
                    style={[
                        styles.timeRangeButton,
                        selectedRange === range && styles.timeRangeButtonSelected
                    ]}
                    onPress={() => setSelectedRange(range)}
                >
                    <Text
                        style={[
                            styles.timeRangeText,
                            selectedRange === range && styles.timeRangeTextSelected
                        ]}
                    >
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderTodayUsageChart = () => {
        if (!todayData.length) {
            return (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>{displayName} App Usage Today (Minutes)</Text>
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No app usage data available</Text>
                        <Text style={styles.noDataSubtext}>
                            {Platform.OS === 'ios' ? 
                                'Screen Time API integration coming soon' : 
                                'Feature available on iOS devices only'
                            }
                        </Text>
                    </View>
                </View>
            );
        }

        const data = {
            labels: todayData.map(app => app.appName.split(' ')[0]), // Shorten names for display
            datasets: [{
                data: todayData.map(app => app.timeSpentMinutes)
            }]
        };

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{displayName} App Usage Today (Minutes)</Text>
                <BarChart
                    data={data}
                    width={350}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                        backgroundColor: colors.white,
                        backgroundGradientFrom: colors.white,
                        backgroundGradientTo: colors.white,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(207, 185, 145, ${opacity})`, // Primary color with opacity
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Black text
                        style: {
                            borderRadius: 16
                        }
                    }}
                    style={styles.chart}
                />
            </View>
        );
    };

    const renderTrendChart = () => {
        if (!activityData.length) {
            return (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>{displayName} Coins Lost Over Time</Text>
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No trend data available</Text>
                    </View>
                </View>
            );
        }

        const data = {
            labels: activityData.map(day => format(new Date(day.date), 'MM/dd')),
            datasets: [{
                data: activityData.map(day => day.totalCoinsLost)
            }]
        };

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>{displayName} Coins Lost Over Time</Text>
                <LineChart
                    data={data}
                    width={350}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                        backgroundColor: colors.white,
                        backgroundGradientFrom: colors.white,
                        backgroundGradientTo: colors.white,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(142, 111, 62, ${opacity})`, // Secondary color with opacity
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`, // Black text
                        style: {
                            borderRadius: 16
                        }
                    }}
                    style={styles.chart}
                    bezier
                />
            </View>
        );
    };

    const renderAppBreakdown = () => (
        <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>{displayName} Breakdown Today</Text>
            {todayData.length > 0 ? (
                todayData.map(app => (
                    <View key={app.appId} style={styles.appRow}>
                        <View style={styles.appInfo}>
                            <View 
                                style={[
                                    styles.appColor, 
                                    { backgroundColor: app.color }
                                ]} 
                            />
                            <Text style={styles.appName}>{app.appName}</Text>
                        </View>
                        <View style={styles.appStats}>
                            <Text style={styles.timeSpent}>{app.timeSpentMinutes}m</Text>
                            <Text style={styles.coinsLost}>-{app.coinsLost} 🪙</Text>
                        </View>
                    </View>
                ))
            ) : (
                <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No app usage today</Text>
                    <Text style={styles.noDataSubtext}>
                        {isViewingOpponent ? 'Opponent stayed focused!' : 'Stay focused and keep your coins!'}
                    </Text>
                </View>
            )}
        </View>
    );

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
                    {isViewingOpponent ? `${params?.opponentName}'s Stats` : 'Your App Usage'}
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.scrollView}>
                {renderTimeRangeSelector()}
                {renderTodayUsageChart()}
                {renderTrendChart()}
                {renderAppBreakdown()}
                
                {Platform.OS !== 'ios' && (
                    <Text style={styles.disclaimer}>
                        Note: Detailed app usage tracking is only available on iOS devices.
                    </Text>
                )}
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
        flex: 1
    },
    timeRangeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm
    },
    timeRangeButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 20,
        backgroundColor: colors.cream
    },
    timeRangeButtonSelected: {
        backgroundColor: colors.primary
    },
    timeRangeText: {
        ...commonStyles.body,
        color: colors.black
    },
    timeRangeTextSelected: {
        color: colors.black,
        fontWeight: typography.fontWeight.bold,
    },
    chartContainer: {
        padding: spacing.md,
        marginBottom: spacing.md
    },
    chartTitle: {
        ...commonStyles.heading3,
        color: colors.black,
        marginBottom: spacing.sm,
        textAlign: 'center'
    },
    chart: {
        marginVertical: spacing.md,
        borderRadius: 16
    },
    breakdownContainer: {
        padding: spacing.md,
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
        marginBottom: spacing.md
    },
    appRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm
    },
    appInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    appColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: spacing.sm
    },
    appName: {
        ...commonStyles.body,
        color: colors.black
    },
    appStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md
    },
    timeSpent: {
        ...commonStyles.body,
        color: colors.darkGray
    },
    coinsLost: {
        ...commonStyles.body,
        color: colors.error,
        minWidth: 60,
        textAlign: 'right'
    },
    noDataContainer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    noDataText: {
        ...commonStyles.body,
        color: colors.darkGray,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    noDataSubtext: {
        ...commonStyles.caption,
        color: colors.mediumGray,
        textAlign: 'center',
    },
    disclaimer: {
        ...commonStyles.caption,
        color: colors.mediumGray,
        textAlign: 'center',
        padding: spacing.md,
        fontStyle: 'italic'
    }
}); 