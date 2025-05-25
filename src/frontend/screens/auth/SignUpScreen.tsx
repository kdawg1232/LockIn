/**
 * SignUpScreen Component
 * 
 * Handles user registration using email and password through Supabase authentication.
 * Part of Sprint 1 - Auth & First-Screen Skeleton (Task 1.4)
 * 
 * Features:
 * - Email/password validation
 * - Loading states
 * - Error handling
 * - Navigation to SignIn
 * 
 * @see PLANNING.md - Architecture & Tech Stack
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '../../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../../types/navigation';
import { validateEmail } from '../../../utils/validation';

// Styled components for consistent UI
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

export const SignUpScreen = () => {
  // State management
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<RootStackNavigationProp>();

  /**
   * Handles the sign-up process
   * Validates input, calls Supabase auth, and handles success/error states
   */
  const handleSignUp = async () => {
    // Input validation
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      Alert.alert(
        'Success',
        'Registration successful! Please check your email for verification.',
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledView className="flex-1 justify-center px-4 bg-white">
      <StyledView className="space-y-4">
        <StyledText className="text-3xl font-bold text-center mb-8">Sign Up</StyledText>
        
        <StyledView>
          <StyledTextInput
            className="bg-gray-100 px-4 py-3 rounded-lg"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            accessibilityLabel="Email input"
            testID="email-input"
          />
        </StyledView>

        <StyledView>
          <StyledTextInput
            className="bg-gray-100 px-4 py-3 rounded-lg"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accessibilityLabel="Password input"
            testID="password-input"
          />
        </StyledView>

        <StyledTouchableOpacity
          className="bg-blue-500 py-3 rounded-lg"
          onPress={handleSignUp}
          disabled={loading}
          accessibilityLabel="Sign up button"
          testID="signup-button"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <StyledText className="text-white text-center font-semibold">Sign Up</StyledText>
          )}
        </StyledTouchableOpacity>

        <StyledTouchableOpacity
          onPress={() => navigation.navigate('SignIn')}
          className="py-3"
          accessibilityLabel="Go to sign in"
          testID="signin-link"
        >
          <StyledText className="text-center text-blue-500">
            Already have an account? Sign In
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    </StyledView>
  );
}; 