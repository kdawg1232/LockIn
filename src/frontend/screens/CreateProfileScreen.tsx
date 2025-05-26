import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export const CreateProfileScreen = () => {
  const [formData, setFormData] = useState({
    university: '',
    major: '',
    year: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleCompleteProfile = async () => {
    if (!formData.university || !formData.major) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('users')
        .update({
          university: formData.university,
          major: formData.major,
          profile_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      // TODO: Navigate to main app screen
      Alert.alert('Success', 'Profile completed successfully!');
    } catch (error) {
      console.error('Profile completion error:', error);
      Alert.alert('Error', 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Profile</Text>
        <Text style={styles.subtitle}>Set up your productivity profile!</Text>

        <View style={styles.imageUploadContainer}>
          <View style={styles.placeholderImage}>
            <Text style={styles.uploadText}>Upload</Text>
          </View>
          <Text style={styles.uploadLabel}>Click to upload your photo</Text>
        </View>

        <Text style={styles.label}>University</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Purdue University"
          placeholderTextColor="#9d9795"
          value={formData.university}
          onChangeText={(text) => setFormData({ ...formData, university: text })}
        />

        <Text style={styles.label}>Major</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Computer Science"
          placeholderTextColor="#9d9795"
          value={formData.major}
          onChangeText={(text) => setFormData({ ...formData, major: text })}
        />

        <Text style={styles.label}>Year</Text>
        <TouchableOpacity style={styles.yearSelector}>
          <Text style={styles.yearSelectorText}>Select your year</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleCompleteProfile}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Completing Profile...' : 'Complete Profile & Start Competing! 🚀'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#cfb991',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#555960',
    marginBottom: 32,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#c4bfc0',
  },
  uploadText: {
    color: '#555960',
    fontSize: 16,
  },
  uploadLabel: {
    color: '#555960',
    fontSize: 14,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 16,
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#c4bfc0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#000000',
  },
  yearSelector: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#c4bfc0',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    justifyContent: 'center',
  },
  yearSelectorText: {
    fontSize: 16,
    color: '#9d9795',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#000000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#555960',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipText: {
    color: '#555960',
    fontSize: 16,
    marginTop: 16,
    textDecorationLine: 'underline',
  },
}); 