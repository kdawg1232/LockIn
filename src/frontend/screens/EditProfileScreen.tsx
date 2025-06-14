import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../lib/supabase';
import { getUserProfile, UserProfileData } from '../services/profileService';

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
  focusScore: number;
  winStreak: number;
  totalCoins: number;
}

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State management
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    university: '',
    major: ''
  });

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return;
      }

      console.log('🔍 Fetching profile for editing:', user.id);
      
      // Use the profile service to get user data
      const { data: profileData, error } = await getUserProfile(user.id);

      if (error) {
        console.error('Error fetching profile:', error);
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

        console.log('🔍 Profile loaded for editing');
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

      Alert.alert(
        'Success', 
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    // Reset form to original values
    if (userProfile) {
      setEditForm({
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        university: userProfile.university,
        major: userProfile.major
      });
    }
    navigation.goBack();
  };

  // Initialize profile data on component mount
  useEffect(() => {
    fetchUserProfile();
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Edit Profile</Text>

        {/* Edit Form */}
        <View style={styles.formContainer}>
          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.firstName}
              onChangeText={(text) => setEditForm({ ...editForm, firstName: text })}
              placeholder="Enter your first name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.lastName}
              onChangeText={(text) => setEditForm({ ...editForm, lastName: text })}
              placeholder="Enter your last name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* University */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>University</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.university}
              onChangeText={(text) => setEditForm({ ...editForm, university: text })}
              placeholder="Enter your university"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Major */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Major</Text>
            <TextInput
              style={styles.textInput}
              value={editForm.major}
              onChangeText={(text) => setEditForm({ ...editForm, major: text })}
              placeholder="Enter your major"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Save Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveProfile}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 32,
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

  // Header styles
  header: {
    marginBottom: 8,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // gray-900 (dark text)
    marginLeft: 8,
    fontFamily: 'Inter',
  },

  // Title
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000', // black (primary color)
    marginBottom: 32,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  // Form styles
  formContainer: {
    marginBottom: 32,
  },

  inputGroup: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151', // gray-700
    marginBottom: 8,
    fontFamily: 'Inter',
  },

  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827', // gray-900
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
    fontFamily: 'Inter',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Button styles
  buttonContainer: {
    gap: 12,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },

  saveButton: {
    backgroundColor: '#cfb991', // primary color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter',
  },

  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#D1D5DB', // gray-300
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280', // gray-500
    fontFamily: 'Inter',
  },
}); 