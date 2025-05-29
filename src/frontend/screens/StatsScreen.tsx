import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';

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
  
  // Placeholder data for user and opponent stats
  // TODO: Replace with real data from Supabase when coin system is implemented
  const userData: UserData = {
    name: 'You',
    stats: {
      coinsGained: 12, // Placeholder: coins earned from focus sessions today
      coinsLost: 3,    // Placeholder: coins lost from social media usage today
      netCoins: 9      // Placeholder: net coins for today (gained - lost)
    }
  };

  const opponentData: UserData = {
    name: opponentName, // Use actual opponent name from navigation params
    stats: {
      coinsGained: 8,  // Placeholder: opponent's coins earned today
      coinsLost: 5,    // Placeholder: opponent's coins lost today
      netCoins: 3      // Placeholder: opponent's net coins today
    }
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
          <Text style={[commonStyles.heading3, styles.title]}>
            Daily Challenge
          </Text>
          <View style={styles.headerSpacer} />
        </View>

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

        {/* Countdown timer */}
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

  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.black,
  },

  headerSpacer: {
    width: 80, // Same width as back button to center title
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
});

export default StatsScreen; 