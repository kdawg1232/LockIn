import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getTodaysCoinTransactions } from '../services/timerService';
import globalTimerService, { TIMER_EVENTS } from '../services/globalTimerService';
import supabase from '../../lib/supabase';
import { NavigationBar } from '../components/NavigationBar';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

// Logo component with grid design
const GridLogo: React.FC = () => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
      {/* Row 2 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
      </View>
      {/* Row 3 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
    </View>
  );
};

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
  
  // Add swipe navigation support
  const { panHandlers } = useSwipeNavigation('Stats');
  
  // Initialize opponent from route params or global timer service
  const [opponentId, setOpponentId] = useState<string>(params?.opponentId || '');
  const [opponentName, setOpponentName] = useState<string>(params?.opponentName || 'Unknown User');
  
  // State for user stats and UI
  const [currentUserId, setCurrentUserId] = useState<string>('');
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
        // Use the stats directly from the service
        const stats = {
          coinsGained: result.coinsGained,
          coinsLost: result.coinsLost,
          netCoins: result.netCoins
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
      
      const result = await getTodaysCoinTransactions(opponentUserId);
      
      if (!result.error) {
        // Use the stats directly from the service
        const stats = {
          coinsGained: result.coinsGained,
          coinsLost: result.coinsLost,
          netCoins: result.netCoins
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

  // Listen for opponent switches using the new event emitter pattern
  useEffect(() => {
    const handleOpponentSwitch = (newOpponentId: string) => {
      console.log('🔄 Opponent switch detected, new opponent:', newOpponentId);
      setOpponentId(newOpponentId);
      setOpponentName('Opponent'); // You might want to fetch the actual name
      fetchAllStats();
    };

    // Add event listener
    globalTimerService.on(TIMER_EVENTS.OPPONENT_SWITCH, handleOpponentSwitch);

    // Cleanup
    return () => {
      globalTimerService.removeListener(TIMER_EVENTS.OPPONENT_SWITCH, handleOpponentSwitch);
    };
  }, [currentUserId]); // Re-run when currentUserId changes

  // Fetch stats when screen comes into focus and when IDs are available
  useFocusEffect(
    React.useCallback(() => {
      if (currentUserId && opponentId) {
        fetchAllStats();
      }
    }, [currentUserId, opponentId])
  );

  // Handle Lock In button press - navigates to TimerScreen
  const handleLockIn = () => {
    (navigation as any).navigate('Timer');
  };

  // Handle debug refresh button press
  const handleDebugRefresh = async () => {
    console.log('🔍 Debug refresh button pressed');
    
    if (!currentUserId || !opponentId) {
      Alert.alert('Debug', 'User IDs not available yet');
      return;
    }
    
    Alert.alert(
      'Debug Refresh', 
      `Refreshing stats for:\nUser: ${currentUserId}\nOpponent: ${opponentId}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', onPress: fetchAllStats }
      ]
    );
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
        <View style={styles.content}>
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

            {/* Opponent stats card (includes countdown timer) */}
            {renderStatsCard(opponentData, false)}

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              {/* Lock In button */}
              <TouchableOpacity 
                style={styles.lockInButton} 
                onPress={handleLockIn}
                activeOpacity={0.8}
              >
                <Text style={styles.lockInButtonText}>Lock In</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
      </View>
      <NavigationBar />
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
    paddingTop: 16,
    paddingBottom: 100, // Increased to accommodate bottom navigation bar
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Title section
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 6,
  },

  updatedText: {
    fontSize: 14,
    color: '#A67C52', // tan-500 (primary tan)
    fontFamily: 'Inter',
  },

  // Stats section
  statsSection: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 10,
  },

  // Stats card styles
  statsCard: {
    backgroundColor: '#ffffff', // white
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
  },

  userBadge: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },

  userBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },

  // Stats container and items
  statsContainer: {
    gap: 12,
  },

  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 15,
    color: '#A67C52', // tan-500 (primary tan)
    fontFamily: 'Inter',
  },

  gainedValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981', // green-500
    fontFamily: 'Inter',
  },

  lostValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444', // red-500
    fontFamily: 'Inter',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB', // gray-200
    marginVertical: 6,
  },

  netLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
  },

  netValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },

  positiveNet: {
    color: '#10B981', // green-500
  },

  negativeNet: {
    color: '#EF4444', // red-500
  },

  // VS indicator styles
  vsContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },

  vsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A67C52', // tan-500 (primary tan)
    fontFamily: 'Inter',
  },

  // Button styles
  lockInButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 50,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  lockInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 18,
    color: '#A67C52', // tan-500 (primary tan)
    fontFamily: 'Inter',
  },

  // New button container styles
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },

  // Logo container styles
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Grid styles
  gridContainer: {
    width: 24,
    height: 24,
    gap: 1,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 1,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 2,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },
}); 