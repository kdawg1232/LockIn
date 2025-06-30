import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getTodaysCoinTransactions } from '../services/timerService';

interface ComparisonCardProps {
  pair: {
    user1: {
      id: string;
      firstName: string;
      lastName: string;
    };
    user2: {
      id: string;
      firstName: string;
      lastName: string;
    };
    isExtraPair?: boolean;
  };
  onPress?: () => void;
}

interface UserStats {
  netCoins: number;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ pair, onPress }) => {
  const [user1Stats, setUser1Stats] = React.useState<UserStats>({ netCoins: 0 });
  const [user2Stats, setUser2Stats] = React.useState<UserStats>({ netCoins: 0 });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const [user1Result, user2Result] = await Promise.all([
          getTodaysCoinTransactions(pair.user1.id),
          getTodaysCoinTransactions(pair.user2.id)
        ]);

        setUser1Stats({ netCoins: user1Result.netCoins || 0 });
        setUser2Stats({ netCoins: user2Result.netCoins || 0 });
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [pair.user1.id, pair.user2.id]);

  const CardContent = () => (
    <View style={styles.container}>
      {/* Left Side - User 1 */}
      <View style={styles.userSide}>
        <Text style={styles.userName}>
          {pair.user1.firstName} {pair.user1.lastName}
        </Text>
        <Text style={[
          styles.netCoins,
          user1Stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet
        ]}>
          {user1Stats.netCoins >= 0 ? '+' : ''}{user1Stats.netCoins}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Right Side - User 2 */}
      <View style={styles.userSide}>
        <Text style={styles.userName}>
          {pair.user2.firstName} {pair.user2.lastName}
        </Text>
        <Text style={[
          styles.netCoins,
          user2Stats.netCoins >= 0 ? styles.positiveNet : styles.negativeNet
        ]}>
          {user2Stats.netCoins >= 0 ? '+' : ''}{user2Stats.netCoins}
        </Text>
      </View>

      {/* Extra Pair Indicator */}
      {pair.isExtraPair && (
        <View style={styles.extraPairBadge}>
          <Text style={styles.extraPairText}>Extra Match</Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading stats...</Text>
      </View>
    );
  }

  return onPress ? (
    <TouchableOpacity 
      style={styles.touchable}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <CardContent />
    </TouchableOpacity>
  ) : (
    <CardContent />
  );
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
    marginVertical: 8,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  userSide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  netCoins: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  positiveNet: {
    color: '#059669', // green-600
  },
  negativeNet: {
    color: '#DC2626', // red-600
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  extraPairBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#A67C52', // tan color
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  extraPairText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
}); 