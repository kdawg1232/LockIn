import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';
import supabase from '../../lib/supabase';
import { SessionContext } from '../navigation/RootNavigator';

// Interface for user profile data
interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { refreshSession } = useContext(SessionContext);
  
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    university: '',
    major: ''
  });

  // Fetch user profile data from database
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      // Get user profile data from users table
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, email, username, first_name, last_name, university, major, avatar_url')
        .eq('id', user.id);

      if (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
        return;
      }

      if (profileData && Array.isArray(profileData) && profileData.length > 0) {
        const profile: UserProfile = {
          id: profileData[0].id,
          email: profileData[0].email,
          username: profileData[0].username,
          firstName: profileData[0].first_name || '',
          lastName: profileData[0].last_name || '',
          university: profileData[0].university || '',
          major: profileData[0].major || '',
          avatarUrl: profileData[0].avatar_url
        };
        
        setUserProfile(profile);
        
        // Initialize edit form with current data
        setEditForm({
          firstName: profile.firstName,
          lastName: profile.lastName,
          university: profile.university,
          major: profile.major
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
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

  // Handle back navigation
  const handleGoBack = () => {
    if (isEditing) {
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
    } else {
      navigation.goBack();
    }
  };

  // Initialize profile data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.body, { marginTop: spacing.md, color: colors.darkGray }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state - no profile data
  if (!userProfile) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { flex: 1 }]}>
          <Text style={[commonStyles.heading3, { color: colors.darkGray }]}>
            Failed to load profile
          </Text>
          <TouchableOpacity 
            style={[commonStyles.primaryButton, { marginTop: spacing.md }]}
            onPress={fetchUserProfile}
          >
            <Text style={[commonStyles.bodyLarge, { color: colors.white }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>
              {isEditing ? '← Cancel' : '← Back'}
            </Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[commonStyles.heading3, styles.title]}>
              {isEditing ? 'Edit Profile' : 'Profile'}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* Profile Card */}
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
                  {userProfile.firstName[0] || '?'}
                  {userProfile.lastName[0] || '?'}
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
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={[styles.textInput, styles.nameInput]}
                    value={editForm.firstName}
                    onChangeText={(text) => setEditForm({...editForm, firstName: text})}
                    placeholder="First Name"
                    placeholderTextColor={colors.mediumGray}
                  />
                  <TextInput
                    style={[styles.textInput, styles.nameInput]}
                    value={editForm.lastName}
                    onChangeText={(text) => setEditForm({...editForm, lastName: text})}
                    placeholder="Last Name"
                    placeholderTextColor={colors.mediumGray}
                  />
                </View>
              ) : (
                <Text style={styles.infoText}>
                  {userProfile.firstName} {userProfile.lastName}
                </Text>
              )}
            </View>

            {/* Email (non-editable) */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={[styles.infoText, styles.nonEditableText]}>
                {userProfile.email}
              </Text>
            </View>

            {/* Username (non-editable) */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={[styles.infoText, styles.nonEditableText]}>
                {userProfile.username}
              </Text>
            </View>

            {/* University/School */}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>School</Text>
              {isEditing ? (
                <TextInput
                  style={styles.textInput}
                  value={editForm.university}
                  onChangeText={(text) => setEditForm({...editForm, university: text})}
                  placeholder="Enter your school/university"
                  placeholderTextColor={colors.mediumGray}
                />
              ) : (
                <Text style={styles.infoText}>
                  {userProfile.university || 'Not specified'}
                </Text>
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
                  placeholderTextColor={colors.mediumGray}
                />
              ) : (
                <Text style={styles.infoText}>
                  {userProfile.major || 'Not specified'}
                </Text>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          {isEditing ? (
            <View style={styles.editButtonContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Logout Button (only shown when not editing) */}
        {!isEditing && (
          <View style={styles.logoutContainer}>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <View style={styles.logoutLoading}>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={[styles.logoutButtonText, { marginLeft: spacing.sm }]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },

  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    textAlign: 'center',
    color: colors.black,
  },

  headerSpacer: {
    width: spacing.md,
  },

  // Profile card styles
  profileCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },

  // Avatar styles
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray,
  },

  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  // Info container styles
  infoContainer: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  infoSection: {
    marginBottom: spacing.xs,
  },

  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.darkGray,
    marginBottom: spacing.xs / 2,
  },

  infoText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.black,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
  },

  nonEditableText: {
    backgroundColor: colors.cream,
    color: colors.darkGray,
  },

  // Text input styles for editing
  textInput: {
    fontSize: typography.fontSize.base,
    color: colors.black,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },

  nameEditContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  nameInput: {
    flex: 1,
  },

  // Action button styles
  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },

  editButton: {
    backgroundColor: colors.secondary,
  },

  editButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  editButtonContainer: {
    gap: spacing.md,
  },

  saveButton: {
    backgroundColor: colors.black,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  // Logout button styles
  logoutContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },

  logoutButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },

  logoutButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  logoutLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default ProfileScreen; 