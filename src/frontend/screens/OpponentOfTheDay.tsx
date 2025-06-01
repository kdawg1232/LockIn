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
        {/* Header Title */}
        <Text style={styles.title}>Opponent of the Day</Text>
        
        {/* Opponent Card */}
        <View style={styles.opponentCard}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {opponent.avatarUrl ? (
              <Image
                source={{ uri: opponent.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {opponent.firstName[0]?.toUpperCase()}
                  {opponent.lastName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Opponent Information */}
          <View style={styles.infoContainer}>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>
                {opponent.firstName} {opponent.lastName}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>University</Text>
              <Text style={styles.infoValue}>
                {opponent.university || "No info given"}
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Major</Text>
              <Text style={styles.infoValue}>
                {opponent.major || "No info given"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Accept Button */}
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={handleAcceptChallenge}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>Accept</Text>
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
        </View>
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
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 0,
  },

  opponentCard: {
    backgroundColor: '#ffffff', // white
    borderRadius: 24,
    padding: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginVertical: 40,
  },

  avatarContainer: {
    marginBottom: 48,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
  },

  infoContainer: {
    width: '100%',
    gap: 32,
  },

  infoSection: {
    alignItems: 'flex-start',
  },

  infoLabel: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    marginBottom: 8,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  infoValue: {
    fontSize: 20,
    color: '#111827', // gray-900 (dark text)
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  buttonContainer: {
    gap: 16,
  },

  acceptButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  refreshButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 18,
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
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default OpponentOfTheDay; 