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
import { CarouselStatsCard } from '../components/CarouselStatsCard';
import { getGroupOpponents, GroupOpponent } from '../services/groupOpponentService';

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
  
  // Add swipe navigation support (for screen-level navigation)
  const { panHandlers } = useSwipeNavigation('Stats');
  
  // State for current user and carousel opponents
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('You'); // Store actual user name
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('00:05:00');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Carousel state for group opponents
  const [groupOpponents, setGroupOpponents] = useState<GroupOpponent[]>([]);
  const [currentOpponent, setCurrentOpponent] = useState<GroupOpponent | null>(null);
  const [currentOpponentIndex, setCurrentOpponentIndex] = useState<number>(0);
  
  // User stats
  const [userStats, setUserStats] = useState<StatsData>({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  
  // Challenge results state
  const [challengeResults, setChallengeResults] = useState<{
    results: {
      groupName: string;
      opponentName: string;
      focusScore: number;
      opponentScore: number;
    }[];
  } | null>(null);

  // Initialize current user and group opponents
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data: { user } } = await supabase.getUser();
        if (user) {
          setCurrentUserId(user.id);
          
          // Fetch user's actual name from database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('id', user.id);
          
          if (!userError && userData && userData.length > 0) {
            const userInfo = Array.isArray(userData) ? userData[0] : userData;
            const fullName = `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim();
            setCurrentUserName(fullName || 'You');
          }
          
          // Fetch group opponents
          await fetchGroupOpponents(user.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    initializeUser();
  }, []);

  // Fetch group opponents from all user's groups
  const fetchGroupOpponents = async (userId: string) => {
    try {
      console.log('🎯 Fetching group opponents for carousel');
      setIsLoading(true);
      
      const { data: opponents, error } = await getGroupOpponents(userId);
      
      if (error) {
        console.error('❌ Error fetching group opponents:', error);
        Alert.alert('Error', 'Failed to load opponents from your groups');
        return;
      }
      
      if (opponents && opponents.length > 0) {
        setGroupOpponents(opponents);
        setCurrentOpponent(opponents[0]);
        setCurrentOpponentIndex(0);
        
        console.log(`🎯 Loaded ${opponents.length} group opponents for carousel`);
      } else {
        console.log('📝 No group opponents available');
        setGroupOpponents([]);
        setCurrentOpponent(null);
      }
      
    } catch (error) {
      console.error('❌ Error in fetchGroupOpponents:', error);
      Alert.alert('Error', 'Failed to load group opponents');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user stats
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

  // Fetch only user stats (opponent stats are handled by CarouselStatsCard)
  const fetchAllStats = async () => {
    if (!currentUserId) {
      console.log('📈 Cannot fetch stats - missing user ID');
      return;
    }
    
    console.log('📈 Fetching user stats');
    
    try {
      await fetchUserStats(currentUserId);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Handle opponent carousel changes
  const handleOpponentChange = (opponent: GroupOpponent, index: number) => {
    console.log('🎯 Carousel opponent changed:', opponent.firstName, opponent.lastName, 'at index', index);
    setCurrentOpponent(opponent);
    setCurrentOpponentIndex(index);
    
    // Update global timer service with current opponent for compatibility
    globalTimerService.setCurrentOpponentId(opponent.id);
  };

  // Fetch stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (currentUserId) {
        fetchAllStats();
      }
    }, [currentUserId])
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

      // Fetch final stats for user
      const userResult = await getTodaysCoinTransactions(user.id);
      
      // Get opponent result if we have a current opponent
      const opponentResult = currentOpponent ? 
        await getTodaysCoinTransactions(currentOpponent.id) : 
        { coinsGained: 0, coinsLost: 0, netCoins: 0, error: null };

      // Show the challenge results modal
      showChallengeResults({
        won: userResult.netCoins > (opponentResult.netCoins || 0),
        opponentName: currentOpponent ? `${currentOpponent.firstName} ${currentOpponent.lastName}` : 'Opponent',
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

  // Handle refreshing all opponents
  const handleRefreshOpponents = async () => {
    setIsRefreshing(true);
    
    try {
      console.log('🔄 Refreshing all group opponents');
      
      if (currentUserId) {
        await fetchGroupOpponents(currentUserId);
        await fetchAllStats();
      }
      
    } catch (error) {
      console.error('Error refreshing opponents:', error);
      Alert.alert('Error', 'Failed to refresh opponents');
    } finally {
      setIsRefreshing(false);
    }
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

  // Note: Individual stats card rendering is now handled by CarouselStatsCard component

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header with navigation and logo - add screen swipe navigation here */}
          <View style={styles.header} {...panHandlers}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <GridLogo />
            </View>
          </View>

          {/* Title section - add screen swipe navigation here */}
          <View style={styles.titleContainer} {...panHandlers}>
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
              <Text style={styles.loadingText}>Loading opponents and stats...</Text>
            </View>
          ) : (
            <View style={styles.statsSection}>
              {/* Carousel Stats Card - shows user vs current opponent with swipe functionality */}
              <CarouselStatsCard
                opponents={groupOpponents}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserStats={userStats}
                onOpponentChange={handleOpponentChange}
                onCardPress={() => {
                  if (currentOpponent) {
                    (navigation as any).navigate('UserStats');
                  }
                }}
              />

              {/* Action buttons - add screen swipe navigation here */}
              <View style={styles.buttonContainer} {...panHandlers}>
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

                {/* Refresh Opponents Button */}
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={handleRefreshOpponents}
                  disabled={isRefreshing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.refreshButtonText}>
                    {isRefreshing ? 'Refreshing Opponents...' : 'Refresh Opponents'}
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