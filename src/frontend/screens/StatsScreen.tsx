import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';
import { getTodaysCoinTransactions } from '../services/timerService';
import supabase from '../../lib/supabase';

// Interface for stats data structure
interface StatsData {
  coinsGained: number;
  coinsLost: number;
  netCoins: number;
}

// Interface for user data
interface UserData {
  name: string;
  stats: StatsData;
}

// Interface for route parameters
interface StatsScreenParams {
  opponentName: string;
  opponentId: string;
}

export const StatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Get opponent data from navigation parameters
  const { opponentName, opponentId } = route.params as StatsScreenParams;
  
  // State for countdown timer - calculates time until next day at 7:00 AM
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  // State for real coin data
  const [userStats, setUserStats] = useState<StatsData>({
    coinsGained: 0,
    coinsLost: 0,
    netCoins: 0
  });
  
  const [opponentStats, setOpponentStats] = useState<StatsData>({
    coinsGained: 0,
    coinsLost: 0,
    netCoins: 0
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Real user and opponent data using actual stats
  const userData: UserData = {
    name: 'You',
    stats: userStats
  };

  const opponentData: UserData = {
    name: opponentName, // Use actual opponent name from navigation params
    stats: opponentStats
  };

  // Calculate time remaining until next opponent (7:00 AM next day)
  const calculateTimeRemaining = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0); // Set to 7:00 AM tomorrow
    
    const timeDiff = tomorrow.getTime() - now.getTime();
    
    // Convert milliseconds to hours, minutes, seconds
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Fetch user's coin data from database
  const fetchUserStats = async (userId: string) => {
    try {
      const result = await getTodaysCoinTransactions(userId);
      if (result.error) {
        console.error('Error fetching user stats:', result.error);
        return;
      }
      
      setUserStats({
        coinsGained: result.coinsGained,
        coinsLost: result.coinsLost,
        netCoins: result.netCoins
      });
    } catch (error) {
      console.error('Error in fetchUserStats:', error);
    }
  };

  // Fetch opponent's coin data from database
  const fetchOpponentStats = async (opponentUserId: string) => {
    try {
      const result = await getTodaysCoinTransactions(opponentUserId);
      if (result.error) {
        console.error('Error fetching opponent stats:', result.error);
        return;
      }
      
      setOpponentStats({
        coinsGained: result.coinsGained,
        coinsLost: result.coinsLost,
        netCoins: result.netCoins
      });
    } catch (error) {
      console.error('Error in fetchOpponentStats:', error);
    }
  };

  // Fetch all stats data
  const fetchAllStats = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }
      
      setCurrentUserId(user.id);
      
      // Fetch user's stats
      await fetchUserStats(user.id);
      
      // Fetch opponent's stats
      await fetchOpponentStats(opponentId);
      
      // Update last updated timestamp
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update countdown timer every second
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    // Update immediately
    updateTimer();
    
    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAllStats();
  }, [opponentId]);

  // Refresh data when screen comes into focus (e.g., returning from timer)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have a current user ID (avoid initial double fetch)
      if (currentUserId) {
        console.log('StatsScreen focused - refreshing coin data');
        fetchAllStats();
      }
    }, [currentUserId, opponentId])
  );

  // Set up periodic refresh to show opponent's progress (every 30 seconds)
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (currentUserId) {
        console.log('Periodic refresh - updating coin data');
        fetchAllStats();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [currentUserId, opponentId]);

  // Handle Lock In button press
  const handleLockIn = () => {
    // Navigate to the TimerDistractionScreen to start the focus session
    (navigation as any).navigate('Timer');
  };

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Render individual stats card for user or opponent
  const renderStatsCard = (user: UserData, isUser: boolean = false) => (
    <View style={[styles.statsCard, isUser ? styles.userCard : styles.opponentCard]}>
      {/* Card header with user name */}
      <View style={styles.cardHeader}>
        <Text style={[commonStyles.heading3, styles.cardTitle]}>
          {user.name}
        </Text>
        {isUser && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>YOU</Text>
          </View>
        )}
      </View>

      {/* Stats display */}
      <View style={styles.statsContainer}>
        {/* Coins Gained */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Coins Gained</Text>
          <Text style={[styles.statValue, styles.gainedValue]}>
            +{user.stats.coinsGained}
          </Text>
        </View>

        {/* Coins Lost */}
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Coins Lost</Text>
          <Text style={[styles.statValue, styles.lostValue]}>
            -{user.stats.coinsLost}
          </Text>
        </View>

        {/* Net Coins */}
        <View style={[styles.statItem, styles.netCoinsItem]}>
          <Text style={styles.statLabel}>Net Coins</Text>
          <Text style={[styles.statValue, styles.netValue, user.stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet]}>
            {user.stats.netCoins >= 0 ? '+' : ''}{user.stats.netCoins}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[commonStyles.heading3, styles.title]}>
              Daily Challenge
            </Text>
            {lastUpdated && (
              <Text style={styles.lastUpdatedText}>
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {isLoading ? (
          /* Loading state */
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading coin data...</Text>
          </View>
        ) : (
          <>
            {/* User stats card */}
            {renderStatsCard(userData, true)}

            {/* VS indicator */}
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Opponent stats card */}
            {renderStatsCard(opponentData, false)}

            {/* Lock In button */}
            <TouchableOpacity style={styles.lockInButton} onPress={handleLockIn}>
              <Text style={styles.lockInButtonText}>Lock In</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Countdown timer - always visible */}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>New opponent in:</Text>
          <Text style={styles.countdownTime}>{timeRemaining}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
    borderRadius: spacing.sm,
  },

  backButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    textAlign: 'center',
    color: colors.black,
  },

  lastUpdatedText: {
    color: colors.darkGray,
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },

  headerSpacer: {
    width: spacing.md,
  },

  // Stats card styles
  statsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.md,
  },

  userCard: {
    backgroundColor: colors.primary, // Primary gold color for user
  },

  opponentCard: {
    backgroundColor: colors.white, // White background for opponent
    borderWidth: 2,
    borderColor: colors.secondary, // Secondary brown border
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  cardTitle: {
    color: colors.black,
    fontWeight: typography.fontWeight.bold,
  },

  userBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },

  userBadgeText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },

  // Stats container and items
  statsContainer: {
    gap: spacing.sm,
  },

  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },

  netCoinsItem: {
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: spacing.sm,
  },

  statLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkGray,
  },

  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  gainedValue: {
    color: colors.success, // Green for gained coins
  },

  lostValue: {
    color: colors.error, // Red for lost coins
  },

  netValue: {
    fontSize: typography.fontSize.xl,
  },

  positiveNet: {
    color: colors.success, // Green for positive net
  },

  negativeNet: {
    color: colors.error, // Red for negative net
  },

  // VS indicator styles
  vsContainer: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },

  vsText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },

  // Lock In button styles
  lockInButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },

  lockInButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  // Countdown timer styles
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: spacing.md,
  },

  countdownLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkGray,
    marginBottom: spacing.xs,
  },

  countdownTime: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    fontFamily: 'monospace', // Use monospace for consistent digit spacing
  },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkGray,
  },
});

export default StatsScreen; 