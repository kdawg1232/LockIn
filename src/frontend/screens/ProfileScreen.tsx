import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { SessionContext } from '../navigation/RootNavigator';
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
  const { refreshSession } = useContext(SessionContext);
  
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Calendar state
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedCalendarView, setSelectedCalendarView] = useState<CalendarView>('Month');
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    university: '',
    major: ''
  });

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
        
        // Initialize edit form with current data
        setEditForm({
          firstName: profile.firstName,
          lastName: profile.lastName,
          university: profile.university,
          major: profile.major
        });

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

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!userProfile) return;
    
    setIsSaving(true);
    try {
      // Update user profile in database
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editForm.firstName.trim(),
          last_name: editForm.lastName.trim(),
          university: editForm.university.trim(),
          major: editForm.major.trim()
        })
        .eq('id', userProfile.id);

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        return;
      }

      // Update local state with new data
      setUserProfile({
        ...userProfile,
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        university: editForm.university.trim(),
        major: editForm.major.trim()
      });

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              // Sign out from Supabase
              await supabase.signOut();
              
              // Refresh session state which will trigger navigation change
              await refreshSession();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Handle settings navigation (task 1.31)
  const handleSettingsNavigation = () => {
    navigation.navigate('SettingsPrivacy');
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    // Reset edit form to original values
    if (userProfile) {
      setEditForm({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        university: userProfile.university,
        major: userProfile.major
      });
    }
    setIsEditing(false);
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

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A67C52" />
          <Text style={styles.loadingText}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state - no profile data
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>
            Failed to load profile
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchUserProfile}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              Retry
            </Text>
          </TouchableOpacity>
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
        {/* Header with Title and Settings Icon */}
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

        {/* Stats Cards Row (Tasks 1.29-1.30) */}
        <View style={styles.statsRow}>
          {/* Focus Score Card */}
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{userProfile.focusScore}</Text>
            <Text style={styles.statLabel}>Focus{'\n'}Score</Text>
          </View>

          {/* Win Streak Card */}
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.winStreakNumber]}>{userProfile.winStreak}</Text>
            <Text style={styles.statLabel}>Win{'\n'}Streak</Text>
          </View>

          {/* Total Coins Card */}
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, styles.totalCoinsNumber]}>{userProfile.totalCoins}</Text>
            <Text style={styles.statLabel}>Total{'\n'}Coins</Text>
          </View>
        </View>

        {/* Challenge History Calendar (Task 1.32) */}
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarTitle}>Challenge History</Text>
            <View style={styles.calendarViewButtons}>
              {(['Week', 'Month', 'Year'] as CalendarView[]).map((view) => (
                <TouchableOpacity
                  key={view}
                  style={[
                    styles.calendarViewButton,
                    selectedCalendarView === view && styles.calendarViewButtonActive
                  ]}
                  onPress={() => setSelectedCalendarView(view)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.calendarViewButtonText,
                      selectedCalendarView === view && styles.calendarViewButtonTextActive
                    ]}
                  >
                    {view}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calendar Grid */}
          {isLoadingCalendar ? (
            <View style={styles.calendarLoading}>
              <ActivityIndicator size="small" color="#A67C52" />
            </View>
          ) : (
            <View style={styles.calendarGrid}>
              {calendarData.slice(-31).map((day, index) => renderCalendarSquare(day, index))}
            </View>
          )}

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
          </View>
        </View>

        {/* Profile Information Card */}
        <View style={styles.profileCard}>
          {/* Profile Picture */}
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
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={`${editForm.firstName} ${editForm.lastName}`}
                  onChangeText={(text) => {
                    const names = text.split(' ');
                    setEditForm({
                      ...editForm, 
                      firstName: names[0] || '',
                      lastName: names.slice(1).join(' ') || ''
                    });
                  }}
                  placeholder="Full Name"
                  placeholderTextColor="#9B8B73"
                />
              ) : (
                <View style={styles.infoField}>
                  <Text style={styles.infoText}>
                    {userProfile.firstName} {userProfile.lastName}
                  </Text>
                </View>
              )}
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
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editForm.university}
                  onChangeText={(text) => setEditForm({...editForm, university: text})}
                  placeholder="Enter your school/university"
                  placeholderTextColor="#9B8B73"
                />
              ) : (
                <View style={styles.infoField}>
                  <Text style={styles.infoText}>
                    {userProfile.university || 'Not specified'}
                  </Text>
                </View>
              )}
            </View>

            {/* Major */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Major</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editForm.major}
                  onChangeText={(text) => setEditForm({...editForm, major: text})}
                  placeholder="Enter your major"
                  placeholderTextColor="#9B8B73"
                />
              ) : (
                <View style={styles.infoField}>
                  <Text style={styles.infoText}>
                    {userProfile.major || 'Not specified'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.editButtonContainer}>
            {/* Save Changes Button */}
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancelEdit}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.viewButtonContainer}>
            {/* Edit Profile Button */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
              activeOpacity={0.8}
            >
              {isLoggingOut ? (
                <View style={styles.logoutLoading}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={[styles.logoutButtonText, { marginLeft: 8 }]}>
                    Logging out...
                  </Text>
                </View>
              ) : (
                <Text style={styles.logoutButtonText}>Logout</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Stats cards row (tasks 1.29-1.30)
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5', // Blue for focus score
    fontFamily: 'Inter',
    marginBottom: 4,
  },

  winStreakNumber: {
    color: '#059669', // Green for win streak
  },

  totalCoinsNumber: {
    color: '#DC2626', // Red for total coins
  },

  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280', // gray-500
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 16,
  },

  // Calendar card (task 1.32)
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Inter',
  },

  calendarViewButtons: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 4,
  },

  calendarViewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  calendarViewButtonActive: {
    backgroundColor: '#111827',
  },

  calendarViewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Inter',
  },

  calendarViewButtonTextActive: {
    color: '#ffffff',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 16,
  },

  calendarSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  calendarSquareEmpty: {
    backgroundColor: '#F3F4F6', // gray-100
  },

  calendarSquareWin: {
    backgroundColor: '#10B981', // green-500
  },

  calendarSquareLoss: {
    backgroundColor: '#EF4444', // red-500
  },

  calendarDayNumber: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter',
  },

  calendarLoading: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
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

  // Profile card styles
  profileCard: {
    backgroundColor: '#ffffff', // white
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  // Avatar styles
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F3F4F6', // gray-100
  },

  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
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

  // Info container styles
  infoContainer: {
    gap: 12,
  },

  infoSection: {
    marginBottom: 0,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A67C52', // tan-500 (primary tan)
    marginBottom: 4,
    fontFamily: 'Inter',
  },

  infoField: {
    backgroundColor: '#FAF7F1', // tan-50 (lightest)
    borderWidth: 1,
    borderColor: '#DABB95', // tan-300
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  nonEditableField: {
    backgroundColor: '#F9FAFB', // gray-50
    borderColor: '#E5E7EB', // gray-200
  },

  infoText: {
    fontSize: 14,
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
  },

  nonEditableText: {
    color: '#6B7280', // gray-500
  },

  // Text input styles for editing
  textInput: {
    fontSize: 14,
    color: '#111827', // gray-900 (dark text)
    backgroundColor: '#FAF7F1', // tan-50 (lightest)
    borderWidth: 1,
    borderColor: '#DABB95', // tan-300
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter',
  },

  // Button container styles
  viewButtonContainer: {
    gap: 10,
  },

  editButtonContainer: {
    gap: 10,
  },

  // Edit Profile button (tan)
  editButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  editButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Save Changes button (dark)
  saveButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Cancel button (tan outline)
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#A67C52', // tan-500 (primary tan)
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Logout button (red)
  logoutButton: {
    backgroundColor: '#EF4444', // red-500
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  logoutButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  logoutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 18,
    color: '#A67C52', // tan-500 (primary tan)
    marginTop: 16,
    fontFamily: 'Inter',
  },

  errorText: {
    fontSize: 20,
    color: '#A67C52', // tan-500 (primary tan)
    fontWeight: '600',
    marginBottom: 24,
    fontFamily: 'Inter',
  },

  retryButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
}); 