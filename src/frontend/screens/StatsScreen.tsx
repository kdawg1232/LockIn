import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getTodaysCoinTransactions, debugUserCoinTransactions } from '../services/timerService';
import globalTimerService, { TIMER_EVENTS } from '../services/globalTimerService';
import { getCurrentOpponent } from '../services/opponentService';
import supabase from '../../lib/supabase';
import { NavigationBar } from '../components/NavigationBar';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useGlobalModal } from '../contexts/GlobalModalContext';
import { GridLogo } from '../components/GridLogo';
import { ChallengeResultsModal } from '../components/ChallengeResultsModal';

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
  opponentName?: string;
  opponentId?: string;
}

// Add interface for opponent details
interface OpponentDetails {
  id: string;
  firstName: string;
  lastName: string;
}

// Interface for coin transaction result
interface CoinTransactionResult {
  coinsGained: number;
  coinsLost: number;
  netCoins: number;
  error?: string | null;
}

export const StatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as StatsScreenParams | undefined;
  const { showChallengeResults, showModal, hideModal, activeModal } = useGlobalModal();
  
  // Add swipe navigation support
  const { panHandlers } = useSwipeNavigation('Stats');
  
  // Initialize opponent from route params or global timer service
  const [opponentId, setOpponentId] = useState<string>(params?.opponentId || '');
  const [opponentName, setOpponentName] = useState<string>(params?.opponentName || 'Unknown User');
  
  // State for user stats and UI
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('00:05:00');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Stats state
  const [userStats, setUserStats] = useState<StatsData>({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  const [opponentStats, setOpponentStats] = useState<StatsData>({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  
  // Add state for opponent details
  const [opponentDetails, setOpponentDetails] = useState<OpponentDetails | null>(null);
  
  // User data for rendering
  const userData: UserData = {
    name: 'You',
    stats: userStats
  };
  
  const opponentData: UserData = {
    name: opponentDetails ? `${opponentDetails.firstName} ${opponentDetails.lastName}` : 'Opponent',
    stats: opponentStats
  };

  // Inside the component:
  const [challengeResults, setChallengeResults] = useState<{
    results: {
      groupName: string;
      opponentName: string;
      focusScore: number;
      opponentScore: number;
    }[];
  } | null>(null);

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
              // Fetch opponent details instead of just setting "Opponent"
              const opponent = await getCurrentOpponent(user.id);
              if (opponent) {
                setOpponentDetails({
                  id: opponent.id,
                  firstName: opponent.firstName,
                  lastName: opponent.lastName
                });
              }
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
      
      const result = await getTodaysCoinTransactions(userId) as CoinTransactionResult;
      
      if (!result.error) {
        const stats: StatsData = {
          coinsGained: result.coinsGained || 0,
          coinsLost: result.coinsLost || 0,
          netCoins: result.netCoins || 0
        };
        
        setUserStats(stats);
        console.log('📈 User stats updated:', stats);
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
      
      const result = await getTodaysCoinTransactions(opponentUserId) as CoinTransactionResult;
      
      if (!result.error) {
        const stats: StatsData = {
          coinsGained: result.coinsGained || 0,
          coinsLost: result.coinsLost || 0,
          netCoins: result.netCoins || 0
        };
        
        setOpponentStats(stats);
        console.log('📈 Opponent stats updated:', stats);
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

  // Update opponent details when opponent switches
  useEffect(() => {
    const handleOpponentSwitch = async (newOpponentId: string) => {
      console.log('🔄 Opponent switch detected, new opponent:', newOpponentId);
      setOpponentId(newOpponentId);
      
      // Fetch new opponent details
      const opponent = await getCurrentOpponent(currentUserId);
      if (opponent) {
        setOpponentDetails({
          id: opponent.id,
          firstName: opponent.firstName,
          lastName: opponent.lastName
        });
      }
      
      fetchAllStats();
    };

    // Add event listener
    globalTimerService.on(TIMER_EVENTS.OPPONENT_SWITCH, handleOpponentSwitch);

    // Cleanup
    return () => {
      globalTimerService.removeListener(TIMER_EVENTS.OPPONENT_SWITCH, handleOpponentSwitch);
    };
  }, [currentUserId]);

  // Fetch stats when screen comes into focus and when IDs are available
  useFocusEffect(
    React.useCallback(() => {
      if (currentUserId && opponentId) {
        fetchAllStats();
      }
    }, [currentUserId, opponentId])
  );

  // Update timer display and check for completion
  useEffect(() => {
    const updateTimer = () => {
      const remainingTime = globalTimerService.getNextOpponentTimeRemaining();
      setTimeRemaining(remainingTime);
      
      // If timer hits 0, show results
      if (remainingTime === '00:00:00') {
        handleTimerComplete();
      }
    };

    // Update immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle timer completion
  const handleTimerComplete = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.getUser();
      if (!user) return;

      // Fetch final stats for both users
      const userResult = await getTodaysCoinTransactions(user.id);
      const opponentResult = opponentId ? await getTodaysCoinTransactions(opponentId) : { coinsGained: 0, coinsLost: 0, netCoins: 0, error: null };

      // Show the challenge results modal
      showChallengeResults({
        won: userResult.netCoins > (opponentResult.netCoins || 0),
        opponentName: opponentName,
        focusScore: userResult.netCoins || 0,
        opponentScore: opponentResult.netCoins || 0,
      });
    } catch (error) {
      console.error('Error fetching final stats:', error);
    }
  };

  // Listen for challenge results
  useEffect(() => {
    const handleChallengeResult = (result: any) => {
      setChallengeResults(result);
      showModal('challengeResults');
    };

    globalTimerService.on(TIMER_EVENTS.CHALLENGE_RESULT, handleChallengeResult);

    return () => {
      globalTimerService.removeListener(TIMER_EVENTS.CHALLENGE_RESULT, handleChallengeResult);
    };
  }, [showModal]);

  // Handle getting new opponent
  const handleRefreshOpponent = async () => {
    setIsRefreshing(true);
    
    // Force a complete opponent switch to reset stats and timer
    console.log('🔄 Forcing opponent switch due to manual refresh');
    await globalTimerService.forceOpponentSwitch();
    
    // Fetch new opponent details
    const opponent = await getCurrentOpponent(currentUserId);
    if (opponent) {
      setOpponentDetails({
        id: opponent.id,
        firstName: opponent.firstName,
        lastName: opponent.lastName
      });
    }
    
    // Refresh stats
    await fetchAllStats();
    setIsRefreshing(false);
  };

  // Handle Lock In button press - navigates to TimerScreen
  const handleLockIn = () => {
    (navigation as any).navigate('Timer');
  };

  // DEBUG: Handle coin transaction debugging
  const handleDebugCoins = async () => {
    if (!currentUserId) return;
    console.log('🔍 DEBUG: Starting coin transaction debug for current user...');
    await debugUserCoinTransactions(currentUserId);
    Alert.alert('Debug Complete', 'Check the console logs to see all your coin transactions. Look for lines starting with 💰');
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
        style={styles.statsCard}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        {/* Card header with user name and badge */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
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
            <Text style={styles.gainedValue}>
              +{user.stats.coinsGained}
            </Text>
          </View>

          {/* Coins Lost */}
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Coins Lost</Text>
            <Text style={styles.lostValue}>
              -{user.stats.coinsLost}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Net Coins */}
          <View style={styles.statItem}>
            <Text style={styles.netLabel}>Net Coins</Text>
            <Text style={[styles.netValue, user.stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet]}>
              {user.stats.netCoins >= 0 ? '+' : ''}{user.stats.netCoins}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }} {...panHandlers}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header with navigation and logo */}
          <View style={styles.header}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <GridLogo />
            </View>
          </View>

          {/* Title section */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Daily Challenge</Text>
            {lastUpdated && (
              <Text style={styles.updatedText}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </View>

          {isLoading ? (
            /* Loading state */
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading coin data...</Text>
            </View>
          ) : (
            <View style={styles.statsSection}>
              {/* User stats card */}
              {renderStatsCard(userData, true)}

              {/* VS indicator */}
              <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              {/* Opponent stats card */}
              {renderStatsCard(opponentData, false)}

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                {/* Countdown Timer */}
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownLabel}>New opponent in:</Text>
                  <Text style={styles.countdownTime}>{timeRemaining}</Text>
                </View>

                {/* Lock In button */}
                <TouchableOpacity 
                  style={styles.lockInButton} 
                  onPress={handleLockIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.lockInButtonText}>Lock In</Text>
                </TouchableOpacity>

                {/* Get New Opponent Button */}
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={handleRefreshOpponent}
                  disabled={isRefreshing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.refreshButtonText}>
                    {isRefreshing ? 'Getting New Opponent...' : 'Get New Opponent'}
                  </Text>
                </TouchableOpacity>

                {/* DEBUG: Debug Coins Button (temporary for development) */}
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={handleDebugCoins}
                  activeOpacity={0.8}
                >
                  <Text style={styles.debugButtonText}>Debug Coins</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      <NavigationBar />

      {/* Challenge Results Modal */}
      {challengeResults && (
        <ChallengeResultsModal
          visible={activeModal === 'challengeResults'}
          onClose={() => {
            hideModal();
            setChallengeResults(null);
          }}
          results={challengeResults.results}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background)
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 120, // Extra padding for NavigationBar
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  logoContainer: {
    width: 36,
    height: 36,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Inter',
  },

  updatedText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter',
  },

  loadingContainer: {
    minHeight: 400, // Minimum height for loading state
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  statsSection: {
    // Removed flex: 1 for ScrollView compatibility
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },

  userBadge: {
    backgroundColor: '#A67C52',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  userBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  statsContainer: {
    gap: 12,
  },

  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  gainedValue: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  lostValue: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },

  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },

  netValue: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  positiveNet: {
    color: '#059669',
  },

  negativeNet: {
    color: '#DC2626',
  },

  vsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },

  vsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A67C52',
    fontFamily: 'Inter',
  },

  buttonContainer: {
    marginTop: 24, // Fixed margin for ScrollView compatibility
    paddingTop: 24,
  },

  countdownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

  countdownLabel: {
    fontSize: 14,
    color: '#A67C52',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  countdownTime: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  lockInButton: {
    backgroundColor: '#A67C52',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  lockInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  refreshButton: {
    backgroundColor: '#A67C52',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginTop: 12,
  },

  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  // DEBUG: Debug button styles (temporary for development)
  debugButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    marginTop: 8,
  },

  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Inter',
  },
}); 