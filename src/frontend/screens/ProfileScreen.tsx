import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { NavigationBar } from '../components/NavigationBar';
import { getUserProfile, UserProfileData } from '../services/profileService';
import { getRecentChallengeHistory, CalendarDay } from '../services/challengeHistoryService';

// Interface for enhanced user profile data
interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
  focusScore: number;
  winStreak: number;
  totalCoins: number;
}

// Type for calendar view
type CalendarView = 'Week' | 'Month' | 'Year';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calendar state
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedCalendarView, setSelectedCalendarView] = useState<CalendarView>('Month');
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

  // Fetch enhanced user profile data including new fields
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('🔍 Fetching enhanced profile for user:', user.id);
      
      // Use the new profile service to get enhanced data
      const { data: profileData, error } = await getUserProfile(user.id);

      if (error) {
        console.error('Error fetching enhanced profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        return;
      }

      if (profileData) {
        const profile: UserProfile = {
          id: profileData.id,
          email: profileData.email,
          username: profileData.username,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          university: profileData.university,
          major: profileData.major,
          avatarUrl: profileData.avatarUrl,
          focusScore: profileData.focusScore,
          winStreak: profileData.winStreak,
          totalCoins: profileData.totalCoins
        };
        
        setUserProfile(profile);

        console.log('🔍 Enhanced profile loaded:', {
          focusScore: profile.focusScore,
          winStreak: profile.winStreak,
          totalCoins: profile.totalCoins
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch calendar data for the current view
  const fetchCalendarData = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) return;

      setIsLoadingCalendar(true);
      console.log('📅 Fetching calendar data for profile screen');
      
      const { data: historyData, error } = await getRecentChallengeHistory(user.id);
      
      if (error) {
        console.error('Error fetching calendar data:', error);
        return;
      }

      setCalendarData(historyData || []);
      console.log('📅 Calendar data loaded:', historyData?.length || 0, 'days');
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Handle settings navigation (task 1.31)
  const handleSettingsNavigation = () => {
    navigation.navigate('SettingsPrivacy' as never);
  };

  // Render calendar square for a specific day
  const renderCalendarSquare = (day: CalendarDay, index: number) => {
    let squareStyle = styles.calendarSquareEmpty;
    
    if (day.outcome === 'win') {
      squareStyle = styles.calendarSquareWin;
    } else if (day.outcome === 'loss') {
      squareStyle = styles.calendarSquareLoss;
    }

    // Show day number for the last 7 days
    const today = new Date();
    const dayDate = new Date(day.date);
    const daysDiff = Math.floor((today.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
    const showDayNumber = daysDiff <= 6;

    return (
      <View key={day.date} style={[styles.calendarSquare, squareStyle]}>
        {showDayNumber && (
          <Text style={styles.calendarDayNumber}>
            {dayDate.getDate()}
          </Text>
        )}
      </View>
    );
  };

  // Initialize profile data and calendar on component mount
  useEffect(() => {
    fetchUserProfile();
    fetchCalendarData();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#cfb991" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Settings Icon */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handleSettingsNavigation}
            activeOpacity={0.8}
          >
            <Ionicons name="settings-outline" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards Row (Tasks 1.29, 1.30) */}
        <View style={styles.statsContainer}>
          {/* Focus Score Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flash" size={24} color="#cfb991" />
            </View>
            <Text style={styles.statValue}>{userProfile.focusScore}</Text>
            <Text style={styles.statLabel}>Focus Score</Text>
          </View>

          {/* Win Streak Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={24} color="#daaa00" />
            </View>
            <Text style={styles.statValue}>{userProfile.winStreak}</Text>
            <Text style={styles.statLabel}>Win Streak</Text>
          </View>

          {/* Total Coins Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="diamond" size={24} color="#ddb945" />
            </View>
            <Text style={styles.statValue}>{userProfile.totalCoins}</Text>
            <Text style={styles.statLabel}>Total Coins</Text>
          </View>
        </View>

        {/* Calendar Section (Task 1.32) */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Challenge History</Text>
            <View style={styles.calendarViewSelector}>
              {(['Week', 'Month', 'Year'] as CalendarView[]).map((view) => (
                <TouchableOpacity
                  key={view}
                  style={[
                    styles.viewButton,
                    selectedCalendarView === view && styles.viewButtonActive
                  ]}
                  onPress={() => setSelectedCalendarView(view)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.viewButtonText,
                    selectedCalendarView === view && styles.viewButtonTextActive
                  ]}>
                    {view}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {isLoadingCalendar ? (
              <View style={styles.calendarLoading}>
                <ActivityIndicator size="small" color="#cfb991" />
                <Text style={styles.calendarLoadingText}>Loading calendar...</Text>
              </View>
            ) : (
              calendarData.map((day, index) => renderCalendarSquare(day, index))
            )}
          </View>

          {/* Calendar Legend */}
          <View style={styles.calendarLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSquare, styles.calendarSquareWin]} />
              <Text style={styles.legendText}>Win</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSquare, styles.calendarSquareLoss]} />
              <Text style={styles.legendText}>Loss</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSquare, styles.calendarSquareEmpty]} />
              <Text style={styles.legendText}>No Data</Text>
            </View>
          </View>
        </View>

        {/* Profile Information Card */}
        <View style={styles.profileCard}>
          {/* Avatar Section */}
          <View style={styles.avatarContainer}>
            {userProfile.avatarUrl ? (
              <Image 
                source={{ uri: userProfile.avatarUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(userProfile.firstName[0] || '').toUpperCase()}
                  {(userProfile.lastName[0] || '').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Profile Information */}
          <View style={styles.infoContainer}>
            {/* Name */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Name</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoText}>
                  {userProfile.firstName} {userProfile.lastName}
                </Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Email</Text>
              <View style={[styles.infoField, styles.nonEditableField]}>
                <Text style={[styles.infoText, styles.nonEditableText]}>
                  {userProfile.email}
                </Text>
              </View>
            </View>

            {/* Username */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Username</Text>
              <View style={[styles.infoField, styles.nonEditableField]}>
                <Text style={[styles.infoText, styles.nonEditableText]}>
                  {userProfile.username}
                </Text>
              </View>
            </View>

            {/* School */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>School</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoText}>
                  {userProfile.university || 'Not specified'}
                </Text>
              </View>
            </View>

            {/* Major */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Major</Text>
              <View style={styles.infoField}>
                <Text style={styles.infoText}>
                  {userProfile.major || 'Not specified'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  },

  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: 'Inter',
  },

  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter',
  },

  // Header with settings icon
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Title
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
  },

  // Settings button (task 1.31)
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Stats cards container (tasks 1.29, 1.30)
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Inter',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
    textAlign: 'center',
  },

  // Calendar section (task 1.32)
  calendarSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Inter',
  },

  calendarViewSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },

  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  viewButtonActive: {
    backgroundColor: '#cfb991',
  },

  viewButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  viewButtonTextActive: {
    color: '#ffffff',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },

  calendarSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  calendarSquareWin: {
    backgroundColor: '#10B981', // green-500
  },

  calendarSquareLoss: {
    backgroundColor: '#EF4444', // red-500
  },

  calendarSquareEmpty: {
    backgroundColor: '#E5E7EB', // gray-200
  },

  calendarDayNumber: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  calendarLoading: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },

  calendarLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'Inter',
  },

  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },

  legendText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  // Profile card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  // Avatar styles
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
  },

  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#cfb991',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter',
  },

  // Profile info styles
  infoContainer: {
    gap: 16,
  },

  infoSection: {
    gap: 6,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151', // gray-700
    fontFamily: 'Inter',
  },

  infoField: {
    backgroundColor: '#F9FAFB', // gray-50
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB', // gray-200
  },

  nonEditableField: {
    backgroundColor: '#F3F4F6', // gray-100
  },

  infoText: {
    fontSize: 16,
    color: '#111827', // gray-900
    fontFamily: 'Inter',
  },

  nonEditableText: {
    color: '#6B7280', // gray-500
  },
}); 