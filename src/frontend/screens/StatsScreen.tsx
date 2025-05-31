import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';
import { getTodaysCoinTransactions } from '../services/timerService';
import globalTimerService, { OpponentSwitchCallback } from '../services/globalTimerService';
import supabase from '../../lib/supabase';

// Interface for daily stats data
interface StatsData {
  coinsGained: number;
  coinsLost: number;
  netCoins: number;
}

// Interface for user data with stats
interface UserData {
  name: string;
  stats: StatsData;
}

// Route params interface
interface StatsScreenParams {
  opponentName: string;
  opponentId: string;
}

export const StatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as StatsScreenParams;
  
  // Initialize opponent from route params or global timer service
  const [opponentId, setOpponentId] = useState<string>(params?.opponentId || '');
  const [opponentName, setOpponentName] = useState<string>(params?.opponentName || 'Unknown User');
  
  // State for user stats and UI
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('00:20:00');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Stats state
  const [userStats, setUserStats] = useState<StatsData>({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  const [opponentStats, setOpponentStats] = useState<StatsData>({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  
  // User data for rendering
  const userData: UserData = {
    name: 'You',
    stats: userStats
  };
  
  const opponentData: UserData = {
    name: opponentName,
    stats: opponentStats
  };

  // Initialize current user and opponent
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.getUser();
        if (user) {
          setCurrentUserId(user.id);
          
          // If no opponent ID from params, check global timer service
          if (!opponentId) {
            const globalOpponentId = globalTimerService.getCurrentOpponentId();
            if (globalOpponentId) {
              setOpponentId(globalOpponentId);
              // Set opponent name (for now, just use "Opponent" since it's the same user)
              setOpponentName('Opponent');
            } else {
              // Set current user as opponent if no opponent set
              globalTimerService.setCurrentOpponentId(user.id);
              setOpponentId(user.id);
              setOpponentName('Opponent');
            }
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    initializeUser();
  }, []);

  // Fetch user stats with daily reset filtering
  const fetchUserStats = async (userId: string) => {
    try {
      console.log('📈 Fetching user stats for:', userId);
      
      const result = await getTodaysCoinTransactions(userId);
      
      if (!result.error) {
        // Filter stats to only include transactions after last reset
        const lastResetTime = globalTimerService.getLastStatsResetTime();
        let filteredStats = {
          coinsGained: result.coinsGained,
          coinsLost: result.coinsLost,
          netCoins: result.netCoins
        };
        
        if (lastResetTime) {
          console.log('📈 Filtering stats after reset time:', new Date(lastResetTime).toISOString());
          // Only count coins gained after the last reset
          // For now, just reset coins gained to 0 since we're only tracking gains
          // TODO: Implement proper filtering when we have transaction timestamps
          filteredStats = { coinsGained: 0, coinsLost: 0, netCoins: 0 };
        }
        
        setUserStats(filteredStats);
        console.log('📈 User stats updated:', filteredStats);
      } else {
        console.log('📈 No user stats found or error:', result.error);
        setUserStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
    }
  };

  // Fetch opponent stats with daily reset filtering
  const fetchOpponentStats = async (opponentUserId: string) => {
    try {
      console.log('📈 Fetching opponent stats for:', opponentUserId);
      
      const result = await getTodaysCoinTransactions(opponentUserId);
      
      if (!result.error) {
        // Filter stats to only include transactions after last reset
        const lastResetTime = globalTimerService.getLastStatsResetTime();
        let filteredStats = {
          coinsGained: result.coinsGained,
          coinsLost: result.coinsLost,
          netCoins: result.netCoins
        };
        
        if (lastResetTime) {
          console.log('📈 Filtering opponent stats after reset time:', new Date(lastResetTime).toISOString());
          // Only count coins gained after the last reset
          // For now, just reset coins gained to 0 since we're only tracking gains
          // TODO: Implement proper filtering when we have transaction timestamps
          filteredStats = { coinsGained: 0, coinsLost: 0, netCoins: 0 };
        }
        
        setOpponentStats(filteredStats);
        console.log('📈 Opponent stats updated:', filteredStats);
      } else {
        console.log('📈 No opponent stats found or error:', result.error);
        setOpponentStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
      }
    } catch (error) {
      console.error('Error fetching opponent stats:', error);
      setOpponentStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
    }
  };

  // Fetch all stats
  const fetchAllStats = async () => {
    if (!currentUserId || !opponentId) {
      console.log('📈 Cannot fetch stats - missing user IDs:', { currentUserId, opponentId });
      return;
    }
    
    console.log('📈 Fetching all stats for user and opponent');
    setIsLoading(true);
    
    try {
      await Promise.all([
        fetchUserStats(currentUserId),
        fetchOpponentStats(opponentId)
      ]);
      
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle opponent switch
  const handleOpponentSwitch = (newOpponentId: string) => {
    console.log('🔄 Opponent switch detected, new opponent:', newOpponentId);
    setOpponentId(newOpponentId);
    setOpponentName('Opponent'); // For now, just use generic name
    
    // Reset stats to 0 since daily competition restarted
    setUserStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
    setOpponentStats({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
    
    // Refresh stats
    if (currentUserId) {
      fetchAllStats();
    }
  };

  // Listen for opponent switches
  useEffect(() => {
    const opponentSwitchCallback: OpponentSwitchCallback = {
      onOpponentSwitch: handleOpponentSwitch
    };
    
    const unsubscribe = globalTimerService.addOpponentSwitchListener(opponentSwitchCallback);
    
    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  // Update countdown timer every second using global timer service
  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(globalTimerService.getNextOpponentTimeRemaining());
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
        console.log('📈 StatsScreen focused - refreshing coin data for user:', currentUserId);
        fetchAllStats();
      } else {
        console.log('📈 StatsScreen focused but no currentUserId yet');
      }
    }, [currentUserId, opponentId])
  );

  // Handle Lock In button press
  const handleLockIn = () => {
    // Navigate to the TimerDistractionScreen to start the focus session
    (navigation as any).navigate('Timer');
  };

  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Handle profile navigation
  const handleProfilePress = () => {
    (navigation as any).navigate('Profile');
  };

  // Debug function to manually refresh stats
  const handleDebugRefresh = async () => {
    console.log('🔍 Manual debug refresh triggered');
    console.log('🔍 Current user ID:', currentUserId);
    console.log('🔍 Opponent ID:', opponentId);
    
    if (currentUserId) {
      console.log('🔍 Manually fetching user stats...');
      await fetchUserStats(currentUserId);
      console.log('🔍 Current user stats state:', userStats);
    }
    
    Alert.alert('Debug', `User stats: ${userStats.coinsGained} gained, ${userStats.netCoins} net`);
  };

  // Render individual stats card for user or opponent
  const renderStatsCard = (user: UserData, isUser: boolean = false) => {
    const handleCardPress = () => {
      if (isUser) {
        (navigation as any).navigate('UserStats');
      } else {
        // Navigate to opponent stats screen
        (navigation as any).navigate('OpponentStats', {
          opponentId: opponentId,
          opponentName: user.name
        });
      }
    };

    return (
      <TouchableOpacity 
        style={[styles.statsCard, isUser ? styles.userCard : styles.opponentCard]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
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
      </TouchableOpacity>
    );
  };

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
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Text style={styles.profileButtonText}>Profile</Text>
          </TouchableOpacity>
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

            {/* Debug refresh button */}
            <TouchableOpacity style={styles.debugButton} onPress={handleDebugRefresh}>
              <Text style={styles.debugButtonText}>🔍 Debug Refresh Stats</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Countdown timer - always visible */}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>New opponent in:</Text>
          <Text style={styles.countdownTime}>{timeRemaining}</Text>
          <Text style={styles.mvpNote}>MVP: 20min cycle for testing</Text>
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

  mvpNote: {
    fontSize: typography.fontSize.xs,
    color: colors.darkGray,
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

  // Debug button styles
  debugButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },

  debugButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  // Profile button styles
  profileButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
    borderRadius: spacing.sm,
  },

  profileButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});

export default StatsScreen; 