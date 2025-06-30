import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { GroupOpponent } from '../services/groupOpponentService';
import { getTodaysCoinTransactions } from '../services/timerService';

const { width: screenWidth } = Dimensions.get('window');

// Interface for stats data
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

interface CarouselStatsCardProps {
  opponents: GroupOpponent[];
  currentUserId: string;
  currentUserName: string;
  currentUserStats: StatsData;
  onOpponentChange?: (opponent: GroupOpponent, index: number) => void;
  onCardPress?: () => void;
}

export const CarouselStatsCard: React.FC<CarouselStatsCardProps> = ({
  opponents,
  currentUserId,
  currentUserName,
  currentUserStats,
  onOpponentChange,
  onCardPress,
}) => {
  // Carousel state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opponentStats, setOpponentStats] = useState<{ [key: string]: StatsData }>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  
  // Current opponent
  const currentOpponent = opponents[currentIndex] || null;
  
  // Fetch stats for an opponent
  const fetchOpponentStats = async (opponentId: string) => {
    try {
      const result = await getTodaysCoinTransactions(opponentId);
      const stats: StatsData = {
        coinsGained: result.coinsGained || 0,
        coinsLost: result.coinsLost || 0,
        netCoins: result.netCoins || 0,
      };
      
      setOpponentStats(prev => ({
        ...prev,
        [opponentId]: stats,
      }));
      
      return stats;
    } catch (error) {
      console.error('Error fetching opponent stats:', error);
      return { coinsGained: 0, coinsLost: 0, netCoins: 0 };
    }
  };
  
  // Load stats for current opponent
  useEffect(() => {
    if (currentOpponent && !opponentStats[currentOpponent.id]) {
      setIsLoading(true);
      fetchOpponentStats(currentOpponent.id).finally(() => {
        setIsLoading(false);
      });
    }
  }, [currentOpponent?.id]);
  
  // Notify parent of opponent change
  useEffect(() => {
    if (currentOpponent && onOpponentChange) {
      onOpponentChange(currentOpponent, currentIndex);
    }
  }, [currentIndex, currentOpponent]);
  
  // Handle swipe to next/previous opponent
  const handleSwipe = (direction: 'left' | 'right') => {
    if (opponents.length <= 1) return;
    
    setIsLoading(true);
    
    // Calculate new index with infinite loop
    let newIndex;
    if (direction === 'left') {
      newIndex = currentIndex === opponents.length - 1 ? 0 : currentIndex + 1;
    } else {
      newIndex = currentIndex === 0 ? opponents.length - 1 : currentIndex - 1;
    }
    
    // Animate card transition
    const slideDirection = direction === 'left' ? -screenWidth : screenWidth;
    
    Animated.sequence([
      // Fade out and slide current card
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: slideDirection,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      // Switch to new opponent
      Animated.timing(translateX, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      // Slide in and fade in new card
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      setIsLoading(false);
    });
    
    setCurrentIndex(newIndex);
  };
  
  // Pan responder for swipe gestures on the card
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes within the card area
      const { dx, dy } = gestureState;
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);
      
      // More responsive threshold for card swipes
      return horizontalDistance > 15 && horizontalDistance > verticalDistance * 1.2;
    },
    
    onPanResponderGrant: () => {
      // Take control of the gesture when it starts on the card
      return true;
    },
    
    onPanResponderMove: (evt, gestureState) => {
      // Update translation during gesture
      const { dx } = gestureState;
      const clampedDx = Math.max(-screenWidth * 0.3, Math.min(screenWidth * 0.3, dx));
      translateX.setValue(clampedDx);
    },
    
    onPanResponderRelease: (evt, gestureState) => {
      const { dx, vx } = gestureState;
      const swipeThreshold = screenWidth * 0.12; // Lower threshold for easier swiping
      const velocityThreshold = 0.3; // Lower velocity threshold
      
      // Determine if swipe is strong enough
      const shouldSwipe = Math.abs(dx) > swipeThreshold || Math.abs(vx) > velocityThreshold;
      
      if (shouldSwipe && opponents.length > 1) {
        const direction = dx > 0 ? 'right' : 'left';
        handleSwipe(direction);
      } else {
        // Snap back to center
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    
    onPanResponderTerminationRequest: () => false, // Don't allow other components to take over
  });
  
  // Render loading state
  if (!currentOpponent) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading opponents...</Text>
        </View>
      </View>
    );
  }
  
  // Current opponent data
  const currentOpponentStats = opponentStats[currentOpponent.id] || { coinsGained: 0, coinsLost: 0, netCoins: 0 };
  
  const userData: UserData = {
    name: currentUserName,
    stats: currentUserStats,
  };
  
  const opponentData: UserData = {
    name: `${currentOpponent.firstName} ${currentOpponent.lastName}`,
    stats: currentOpponentStats,
  };
  
  return (
    <View style={styles.container}>
      {/* Group indicator */}
      <View style={styles.groupIndicator}>
        <Text style={styles.groupText}>{currentOpponent.groupName}</Text>
        {opponents.length > 1 && (
          <View style={styles.dotsContainer}>
            {opponents.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.activeDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
      
      {/* Animated card container */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ translateX }],
            opacity: cardOpacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={onCardPress}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {/* Loading overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          )}
          
          {/* Left Side - Current User */}
          <View style={styles.userSide}>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statLabel}>Coins Gained</Text>
              <Text style={styles.statValue}>+{userData.stats.coinsGained}</Text>
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.statLabel}>Coins Lost</Text>
              <Text style={styles.statValue}>-{userData.stats.coinsLost}</Text>
            </View>
            <View style={styles.netContainer}>
              <Text style={styles.netLabel}>Net Coins</Text>
              <Text style={[
                styles.netValue,
                userData.stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet
              ]}>
                {userData.stats.netCoins >= 0 ? '+' : ''}{userData.stats.netCoins}
              </Text>
            </View>
          </View>
          
          {/* Center Divider */}
          <View style={styles.divider} />
          
          {/* Right Side - Opponent */}
          <View style={styles.userSide}>
            <Text style={styles.userName}>{opponentData.name}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statLabel}>Coins Gained</Text>
              <Text style={styles.statValue}>+{opponentData.stats.coinsGained}</Text>
            </View>
            <View style={styles.statsContainer}>
              <Text style={styles.statLabel}>Coins Lost</Text>
              <Text style={styles.statValue}>-{opponentData.stats.coinsLost}</Text>
            </View>
            <View style={styles.netContainer}>
              <Text style={styles.netLabel}>Net Coins</Text>
              <Text style={[
                styles.netValue,
                opponentData.stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet
              ]}>
                {opponentData.stats.netCoins >= 0 ? '+' : ''}{opponentData.stats.netCoins}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Swipe hint */}
      {opponents.length > 1 && (
        <Text style={styles.swipeHint}>Swipe to see other opponents</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  groupIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  groupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: '#3B82F6',
  },
  cardContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
  userSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  netContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  netValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  positiveNet: {
    color: '#059669',
  },
  negativeNet: {
    color: '#DC2626',
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 