import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getTodaysCoinTransactions } from '../services/timerService';
import globalTimerService, { TIMER_EVENTS } from '../services/globalTimerService';
import { getCurrentOpponent } from '../services/opponentService';
import supabase from '../../lib/supabase';
import { NavigationBar } from '../components/NavigationBar';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useGlobalModal } from '../contexts/GlobalModalContext';
import { GridLogo } from '../components/GridLogo';
import { ChallengeResultsModal } from '../components/ChallengeResultsModal';
import { MidnightProgressModal } from '../components/MidnightProgressModal';
import { CarouselStatsCard } from '../components/CarouselStatsCard';
import { getGroupOpponents, GroupOpponent } from '../services/groupOpponentService';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';

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
  const [timeRemaining, setTimeRemaining] = useState<string>('00:00:00');
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

  // Midnight progress modal state
  const [midnightProgressVisible, setMidnightProgressVisible] = useState(false);
  const [midnightProgressData, setMidnightProgressData] = useState<{
    userStats: {
      coinsGained: number;
      coinsLost: number;
      netCoins: number;
    };
    userName: string;
  } | null>(null);

  // State for timer and challenge information
  const [challengeState, setChallengeState] = useState<{
    isInChallengeWindow: boolean;
    isInRestPeriod: boolean;
    currentPhase: string;
  }>({
    isInChallengeWindow: false,
    isInRestPeriod: false,
    currentPhase: 'rest'
  });

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
    
    console.log('📈 Fetching user stats and updating Screen Time data');
    
    try {
      // Always update Screen Time data first to get latest usage
      try {
        const activityTrackingService = await import('../services/activityTrackingService');
        const authorized = await activityTrackingService.default.requestScreenTimeAuthorization();
        if (authorized) {
          console.log('📈 Updating Screen Time activity data');
          await activityTrackingService.default.updateActivityData();
        }
      } catch (screenTimeError) {
        console.log('📈 Screen Time update skipped:', screenTimeError);
        // Continue with other stats even if Screen Time fails
      }
      
      // Fetch coin transaction stats
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
      const remainingTime = globalTimerService.getTimeRemaining();
      const state = globalTimerService.getChallengeState();
      setTimeRemaining(remainingTime);
      setChallengeState(state);
    };

    // Update immediately
    updateTimer();

    // Set up timer to update every second
    const timer = setInterval(updateTimer, 1000);

    // Listen for challenge period changes
    const handleChallengeChange = (event: any) => {
      console.log('📅 Challenge period changed:', event);
      updateTimer();
    };

    globalTimerService.on('challengePeriodChange', handleChallengeChange);
    globalTimerService.on('timerUpdate', updateTimer);

    return () => {
      clearInterval(timer);
      globalTimerService.removeListener('challengePeriodChange', handleChallengeChange);
      globalTimerService.removeListener('timerUpdate', updateTimer);
    };
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

  // Listen for challenge results and midnight progress
  useEffect(() => {
    const handleMidnightProgress = (data: any) => {
      console.log('🌙 Received midnight progress:', data);
      // Show individual user progress at midnight
      setMidnightProgressData(data);
      setMidnightProgressVisible(true);
    };

    const handleChallengeResults = (data: any) => {
      console.log('🌅 Received 6 AM challenge results:', data);
      // Show challenge comparison results at 6 AM
      if (data.results && data.results.length > 0) {
        setChallengeResults(data);
        showChallengeResults(data.results);
      }
    };

    globalTimerService.on('midnightProgress', handleMidnightProgress);
    globalTimerService.on('challengeResults', handleChallengeResults);

    return () => {
      globalTimerService.removeListener('midnightProgress', handleMidnightProgress);
      globalTimerService.removeListener('challengeResults', handleChallengeResults);
    };
  }, [showChallengeResults]);

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
                {/* Timer Section */}
                <View style={styles.timerSection}>
                  <Text style={styles.timerLabel}>
                    {challengeState.isInChallengeWindow 
                      ? 'Challenge ends in:' 
                      : 'Next challenge starts in:'}
                  </Text>
                  <Text style={styles.timerText}>{timeRemaining}</Text>
                  <Text style={styles.challengePhase}>
                    {challengeState.isInChallengeWindow 
                      ? '🔥 Challenge Active' 
                      : '😴 Rest Period'}
                  </Text>
                </View>

                {/* Lock In button */}
                {currentOpponent ? (
                  <TouchableOpacity 
                    style={styles.lockInButton} 
                    onPress={handleLockIn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.lockInButtonText}>Lock In</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noOpponentText}>
                    No opponent available at the moment
                  </Text>
                )}

                {/* Debug buttons for testing timing system (development only) */}
                {__DEV__ && (
                  <View style={styles.debugContainer}>
                    <TouchableOpacity 
                      style={styles.debugButton}
                      onPress={() => {
                        console.log('🧪 Force ending challenge (simulating midnight)');
                        globalTimerService.forceChallengEnd();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.debugButtonText}>Force Midnight</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.debugButton}
                      onPress={() => {
                        console.log('🧪 Force starting challenge (simulating 6 AM)');
                        globalTimerService.forceChallengeStart();
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.debugButtonText}>Force 6 AM</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      <NavigationBar />

      {/* Challenge Results Modal */}
      <ChallengeResultsModal
        visible={activeModal === 'challengeResults'}
        results={challengeResults?.results || []}
        onClose={hideModal}
      />

      {/* Midnight Progress Modal */}
      <MidnightProgressModal
        visible={midnightProgressVisible}
        onClose={() => setMidnightProgressVisible(false)}
        userStats={midnightProgressData?.userStats || { coinsGained: 0, coinsLost: 0, netCoins: 0 }}
        userName={midnightProgressData?.userName || 'You'}
      />
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

  timerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },

  timerLabel: {
    fontSize: 14,
    color: '#A67C52',
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  timerText: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  challengePhase: {
    fontSize: 14,
    color: colors.darkGray,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    marginTop: spacing.xs,
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

  noOpponentText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  debugContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md,
    gap: spacing.sm,
  },

  debugButton: {
    backgroundColor: colors.darkGray,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.sm,
    flex: 1,
  },

  debugButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },

  disclaimer: {
    textAlign: 'center',
    color: colors.darkGray,
    padding: spacing.md,
    fontStyle: 'italic'
  },

  navigationBar: {
  },
}); 