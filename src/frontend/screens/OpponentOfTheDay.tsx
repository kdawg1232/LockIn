import React, { useEffect, useState, useContext, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getOpponentOfTheDay, getNewOpponent } from '../services/opponentService';
import { getTodaysCoinTransactions } from '../services/timerService';
import globalTimerService, { OpponentSwitchCallback } from '../services/globalTimerService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import supabase from '../../lib/supabase';
import { colors, commonStyles, spacing, typography } from '../styles/theme';
import { SessionContext } from '../navigation/RootNavigator';

// Storage key for acceptance state
const OPPONENT_ACCEPTANCE_KEY = 'opponent_accepted_';

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

interface OpponentData {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
}

export const OpponentOfTheDay: React.FC = () => {
  const { refreshSession } = useContext(SessionContext);
  const [opponent, setOpponent] = useState<OpponentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('00:20:00');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [userStats, setUserStats] = useState({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  const [opponentStats, setOpponentStats] = useState({ coinsGained: 0, coinsLost: 0, netCoins: 0 });
  
  // New states for acceptance functionality
  const [isNewOpponent, setIsNewOpponent] = useState(false);
  const [hasAcceptedOpponent, setHasAcceptedOpponent] = useState(false);
  
  const navigation = useNavigation();
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Start pulsing animation
  const startPulseAnimation = () => {
    // Reset animation values first
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
    
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true, // Changed to true to match pulseAnim
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 1200,
          useNativeDriver: true, // Changed to true to match pulseAnim
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();
  };

  // Stop pulsing animation
  const stopPulseAnimation = () => {
    // Stop animations properly without setValue to avoid native driver conflicts
    pulseAnim.stopAnimation(() => {
      pulseAnim.setValue(1);
    });
    glowAnim.stopAnimation(() => {
      glowAnim.setValue(0);
    });
  };

  // Navigate to stats screen
  const handleNavigateToStats = () => {
    (navigation as any).navigate('Stats', {
      opponentName: `${opponent?.firstName} ${opponent?.lastName}`,
      opponentId: opponent?.id || 'unknown'
    });
  };

  // Check acceptance state
  const checkAcceptanceState = async (opponentId: string) => {
    try {
      const acceptanceKey = OPPONENT_ACCEPTANCE_KEY + opponentId;
      const accepted = await AsyncStorage.getItem(acceptanceKey);
      const hasAccepted = accepted === 'true';
      setHasAcceptedOpponent(hasAccepted);
      
      // Stop any existing animations first
      stopPulseAnimation();
      
      // If not accepted, show pulse animation
      if (!hasAccepted) {
        setIsNewOpponent(true);
        startPulseAnimation();
      } else {
        setIsNewOpponent(false);
      }
    } catch (error) {
      console.error('Error checking acceptance state:', error);
    }
  };

  // Mark opponent as accepted
  const markOpponentAccepted = async (opponentId: string) => {
    try {
      const acceptanceKey = OPPONENT_ACCEPTANCE_KEY + opponentId;
      await AsyncStorage.setItem(acceptanceKey, 'true');
      setHasAcceptedOpponent(true);
      setIsNewOpponent(false);
    } catch (error) {
      console.error('Error marking opponent accepted:', error);
    }
  };

  // Clear acceptance state (called when countdown resets)
  const clearAcceptanceState = async (opponentId: string) => {
    try {
      const acceptanceKey = OPPONENT_ACCEPTANCE_KEY + opponentId;
      await AsyncStorage.removeItem(acceptanceKey);
      setHasAcceptedOpponent(false);
    } catch (error) {
      console.error('Error clearing acceptance state:', error);
    }
  };

  const fetchOpponent = async (forceRefresh = false) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get opponent of the day (with optional force refresh)
      const opponentData = forceRefresh 
        ? await getNewOpponent(user.id)
        : await getOpponentOfTheDay(user.id);
      
      if (opponentData) {
        setOpponent(opponentData);
        // Check acceptance state for this opponent
        await checkAcceptanceState(opponentData.id);
      } else {
        console.log('No opponent found');
        // Set a fallback opponent for display
        const fallbackOpponent = {
          id: 'no-opponent',
          firstName: 'No',
          lastName: 'Opponent',
          university: 'No info given',
          major: 'No info given'
        };
        setOpponent(fallbackOpponent);
        await checkAcceptanceState(fallbackOpponent.id);
      }
    } catch (error) {
      console.error('Error fetching opponent:', error);
    }
  };

  const handleRefreshOpponent = async () => {
    setIsRefreshing(true);
    stopPulseAnimation(); // Stop any existing animation
    
    // Clear acceptance state for current opponent before fetching new one
    if (opponent) {
      await clearAcceptanceState(opponent.id);
    }
    setHasAcceptedOpponent(false);
    setIsNewOpponent(true);
    
    await fetchOpponent(true); // Force refresh
    setIsRefreshing(false);
    
    // Start pulsing for new opponent
    startPulseAnimation();
  };

  // Handle Accept button press with animation
  const handleAcceptChallenge = async () => {
    console.log('🎯 Accept button pressed', { opponent: opponent?.id, hasAccepted: hasAcceptedOpponent });
    
    if (!opponent || hasAcceptedOpponent) {
      console.log('🎯 Accept blocked - no opponent or already accepted');
      return;
    }
    
    console.log('🎯 Starting accept process...');
    
    // Stop pulsing animation immediately
    stopPulseAnimation();
    
    // Mark as accepted
    await markOpponentAccepted(opponent.id);
    
    // Navigate to StatsScreen immediately
    (navigation as any).navigate('Stats', {
      opponentName: `${opponent?.firstName} ${opponent?.lastName}`,
      opponentId: opponent?.id || 'unknown'
    });
  };

  // Update timer display and check for completion
  useEffect(() => {
    const updateTimer = () => {
      const remainingTime = globalTimerService.getNextOpponentTimeRemaining();
      setTimeRemaining(remainingTime);
      
      // If timer hits 0, show results and reset acceptance state
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

      // Clear acceptance state for current opponent
      if (opponent) {
        await clearAcceptanceState(opponent.id);
      }

      // Fetch final stats for both users
      const userResult = await getTodaysCoinTransactions(user.id);
      const opponentResult = await getTodaysCoinTransactions(opponent?.id || '');

      setUserStats({
        coinsGained: userResult.coinsGained || 0,
        coinsLost: userResult.coinsLost || 0,
        netCoins: userResult.netCoins || 0
      });

      setOpponentStats({
        coinsGained: opponentResult.coinsGained || 0,
        coinsLost: opponentResult.coinsLost || 0,
        netCoins: opponentResult.netCoins || 0
      });

      setShowResultsModal(true);
    } catch (error) {
      console.error('Error fetching final stats:', error);
    }
  };

  // Handle results modal close
  const handleCloseResults = async () => {
    setShowResultsModal(false);
    // Reset acceptance state and get new opponent
    setHasAcceptedOpponent(false);
    setIsNewOpponent(true);
    // Refresh opponent data
    await fetchOpponent(true);
    // Start pulsing for new opponent
    startPulseAnimation();
  };

  // Handle screen focus (when returning from StatsScreen)
  useFocusEffect(
    React.useCallback(() => {
      if (opponent) {
        checkAcceptanceState(opponent.id);
      }
    }, [opponent])
  );

  useEffect(() => {
    const initializeFetch = async () => {
      setIsLoading(true);
      await fetchOpponent();
      setIsLoading(false);
    };

    initializeFetch();
    
    // Cleanup animations on unmount
    return () => {
      stopPulseAnimation();
    };
  }, []);

  // Render opponent card with conditional animation
  const renderOpponentCard = () => {
    const shouldShowGlow = isNewOpponent && !hasAcceptedOpponent;
    
    const scaleStyle = {
      transform: [{ scale: shouldShowGlow ? pulseAnim : 1 }],
    };

    const glowStyle = shouldShowGlow ? {
      transform: [{ scale: glowAnim }],
      opacity: 0.3,
      position: 'absolute' as const,
      top: -10,
      left: -10,
      right: -10,
      bottom: -10,
      backgroundColor: '#FFFFFF',
      borderRadius: 30,
      zIndex: -1,
    } : null;

    return (
      <View style={styles.cardWrapper}>
        {/* Glow effect behind the card */}
        {shouldShowGlow && (
          <Animated.View style={glowStyle} />
        )}
        
        {/* Main card with scale animation */}
        <Animated.View style={[styles.opponentCard, scaleStyle]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {opponent?.avatarUrl ? (
              <Image
                source={{ uri: opponent.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {opponent?.firstName[0]?.toUpperCase()}
                  {opponent?.lastName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Opponent Information */}
          <View style={styles.infoContainer}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {opponent?.firstName} {opponent?.lastName}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoValue}>
                {opponent?.university || "No info given"}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Major</Text>
              <Text style={styles.infoValue}>
                {opponent?.major || "No info given"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2C2C2C" />
          <Text style={styles.loadingText}>
            Finding your opponent...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!opponent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            No opponent found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
        </View>

        {/* Header Title */}
        <Text style={styles.title}>Opponent of the Day</Text>
        
        {/* Opponent Card with Animation */}
        {renderOpponentCard()}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Accept Button */}
          <TouchableOpacity 
            style={[
              styles.acceptButton, 
              (hasAcceptedOpponent) && styles.acceptButtonDisabled
            ]}
            onPress={handleAcceptChallenge}
            disabled={hasAcceptedOpponent}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.acceptButtonText,
              (hasAcceptedOpponent) && styles.acceptButtonTextDisabled
            ]}>
              {hasAcceptedOpponent ? 'Accepted' : 'Accept'}
            </Text>
          </TouchableOpacity>

          {/* Countdown Timer */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>New opponent in:</Text>
            <Text style={styles.countdownTime}>{timeRemaining}</Text>
          </View>

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
        </View>

        {/* Results Modal */}
        <Modal
          visible={showResultsModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => handleCloseResults()}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Daily Challenge Results!</Text>
              
              {/* User Stats */}
              <View style={styles.resultsSection}>
                <Text style={styles.resultsName}>You</Text>
                <Text style={styles.resultsStats}>
                  Net Coins: {userStats.netCoins >= 0 ? '+' : ''}{userStats.netCoins}
                </Text>
              </View>

              <Text style={styles.resultsVs}>VS</Text>

              {/* Opponent Stats */}
              <View style={styles.resultsSection}>
                <Text style={styles.resultsName}>{opponent?.firstName} {opponent?.lastName}</Text>
                <Text style={styles.resultsStats}>
                  Net Coins: {opponentStats.netCoins >= 0 ? '+' : ''}{opponentStats.netCoins}
                </Text>
              </View>

              {/* Winner Declaration */}
              <Text style={styles.winnerText}>
                {userStats.netCoins > opponentStats.netCoins ? 'You won! 🎉' :
                 userStats.netCoins < opponentStats.netCoins ? `${opponent?.firstName} won! 🏆` :
                 "It's a tie! 🤝"}
              </Text>

              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleCloseResults}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
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
    justifyContent: 'space-between',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  errorText: {
    fontSize: 18,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 0,
  },

  opponentCard: {
    backgroundColor: '#ffffff', // white
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  avatarContainer: {
    marginBottom: 20,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
  },

  infoContainer: {
    width: '100%',
    gap: 16,
  },

  infoSection: {
    alignItems: 'flex-start',
  },

  infoLabel: {
    fontSize: 14,
    color: '#A67C52', // tan-500 (primary tan)
    marginBottom: 4,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  infoValue: {
    fontSize: 16,
    color: '#111827', // gray-900 (dark text)
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  buttonContainer: {
    gap: 12,
  },

  acceptButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  acceptButtonDisabled: {
    backgroundColor: '#9CA3AF', // gray-400 (disabled state)
    opacity: 0.6,
  },

  acceptButtonTextDisabled: {
    color: '#D1D5DB', // gray-300 (disabled text)
  },

  countdownContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: 'bold',
    fontFamily: 'Inter',
  },

  refreshButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  resultsSection: {
    alignItems: 'center',
    marginVertical: 12,
  },

  resultsName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    fontFamily: 'Inter',
  },

  resultsStats: {
    fontSize: 18,
    color: '#A67C52',
    fontFamily: 'Inter',
  },

  resultsVs: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A67C52',
    marginVertical: 8,
    fontFamily: 'Inter',
  },

  winnerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  modalButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  modalButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Grid logo styles
  gridContainer: {
    width: 36,
    height: 36,
    gap: 2,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 3,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },

  cardWrapper: {
    position: 'relative',
    marginVertical: 20,
  },
});

export default OpponentOfTheDay; 