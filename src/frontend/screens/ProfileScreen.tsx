import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import supabase from '../../lib/supabase';
import { SessionContext } from '../navigation/RootNavigator';
import { NavigationBar } from '../components/NavigationBar';

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

  // Initialize profile data on component mount
  useEffect(() => {
    fetchUserProfile();
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
        {/* Title */}
        <Text style={styles.title}>Profile</Text>

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

  // Title
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 20,
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