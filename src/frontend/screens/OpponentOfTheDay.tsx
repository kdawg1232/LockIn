import React, { useEffect, useState, useContext } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getOpponentOfTheDay, getNewOpponent } from '../services/opponentService';
import supabase from '../../lib/supabase';
import { colors, commonStyles, spacing, typography } from '../styles/theme';
import { SessionContext } from '../navigation/RootNavigator';

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
  const navigation = useNavigation();

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
      } else {
        console.log('No opponent found');
        // Set a fallback opponent for display
        setOpponent({
          id: 'no-opponent',
          firstName: 'No',
          lastName: 'Opponent',
          university: 'No info given',
          major: 'No info given'
        });
      }
    } catch (error) {
      console.error('Error fetching opponent:', error);
    }
  };

  const handleRefreshOpponent = async () => {
    setIsRefreshing(true);
    await fetchOpponent(true); // Force refresh
    setIsRefreshing(false);
  };

  // Handle Accept button press - navigates to StatsScreen
  const handleAcceptChallenge = () => {
    // Navigate to the StatsScreen to show user vs opponent comparison
    // Pass opponent data so the screen can display the actual opponent name
    (navigation as any).navigate('Stats', {
      opponentName: `${opponent?.firstName} ${opponent?.lastName}`,
      opponentId: opponent?.id || 'unknown'
    });
  };

  useEffect(() => {
    const initializeFetch = async () => {
      setIsLoading(true);
      await fetchOpponent();
      setIsLoading(false);
    };

    initializeFetch();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[commonStyles.body, { marginTop: spacing.md, color: colors.darkGray }]}>
            Finding your opponent...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!opponent) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <Text style={[commonStyles.heading3, { color: colors.darkGray }]}>
            No opponent found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[commonStyles.heading3, styles.title]}>
            Opponent of the Day
          </Text>
        </View>
        
        <View style={styles.opponentCard}>
          {/* Profile Image */}
          <View style={styles.avatarContainer}>
            {opponent.avatarUrl ? (
              <Image
                source={{ uri: opponent.avatarUrl }}
                style={commonStyles.avatar}
              />
            ) : (
              <View style={commonStyles.avatarPlaceholder}>
                <Text style={commonStyles.avatarText}>
                  {opponent.firstName[0]}
                  {opponent.lastName[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Opponent Info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoSection}>
              <Text style={commonStyles.bodySmall}>Name</Text>
              <Text style={[commonStyles.bodyLarge, styles.infoText]}>
                {opponent.firstName} {opponent.lastName}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={commonStyles.bodySmall}>University</Text>
              <Text style={[commonStyles.body, styles.infoText]}>
                {opponent.university || "No info given"}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={commonStyles.bodySmall}>Major</Text>
              <Text style={[commonStyles.body, styles.infoText]}>
                {opponent.major || "No info given"}
              </Text>
            </View>
          </View>

          {/* Accept Challenge Button */}
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={handleAcceptChallenge}
          >
            <Text style={styles.acceptText}>
              Accept
            </Text>
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefreshOpponent}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshText}>
              {isRefreshing ? 'Refreshing...' : 'Get New Opponent'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  
  title: {
    textAlign: 'center',
  },
  
  opponentCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  infoContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  
  infoSection: {
    marginBottom: spacing.sm,
  },
  
  infoText: {
    color: colors.black,
    fontWeight: typography.fontWeight.semibold,
  },

  acceptButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  acceptText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  refreshButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
  },

  refreshText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default OpponentOfTheDay; 