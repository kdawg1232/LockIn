import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { SessionContext } from '../../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

export const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { refreshSession } = useContext(SessionContext);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    retypePassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSignUp = async () => {
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email || 
        !formData.username || !formData.password || !formData.retypePassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.retypePassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Attempting signup with:', {
        email: formData.email,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName
      });

      const result = await authService.signUp({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      console.log('📊 Signup result:', result);

      if (result.success) {
        console.log('✅ Account created successfully');
        
        if (result.requiresEmailConfirmation) {
          Alert.alert(
            'Success', 
            result.message || 'Account created! Please check your email to confirm your account before signing in.',
            [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
          );
        } else {
          Alert.alert('Success', 'Account created successfully! Please sign in.', [
            { text: 'OK', onPress: () => navigation.navigate('SignIn') }
          ]);
        }
      } else {
        console.error('❌ Signup failed:', result.error);
        
        // Show more specific error message if available
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : result.error?.message || 'Failed to create account. Please try again.';
          
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('❌ Unexpected error during signup:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Main Content Card */}
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              {/* Header */}
              <Text style={styles.title}>Join Locked In</Text>
              <Text style={styles.subtitle}>Create your account to get started</Text>

              {/* Name Fields Row */}
              <View style={styles.nameRow}>
                <TextInput
                  style={[
                    styles.input, 
                    styles.halfInput,
                    focusedInput === 'firstName' && styles.inputFocused
                  ]}
                  placeholder="First Name"
                  placeholderTextColor="#9B8B73"
                  value={formData.firstName}
                  onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                  onFocus={() => setFocusedInput('firstName')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TextInput
                  style={[
                    styles.input, 
                    styles.halfInput,
                    focusedInput === 'lastName' && styles.inputFocused
                  ]}
                  placeholder="Last Name"
                  placeholderTextColor="#9B8B73"
                  value={formData.lastName}
                  onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                  onFocus={() => setFocusedInput('lastName')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              {/* Email Field */}
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'email' && styles.inputFocused
                ]}
                placeholder="Email"
                placeholderTextColor="#9B8B73"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Username Field */}
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'username' && styles.inputFocused
                ]}
                placeholder="Username"
                placeholderTextColor="#9B8B73"
                autoCapitalize="none"
                value={formData.username}
                onChangeText={(text) => setFormData({ ...formData, username: text })}
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Password Field */}
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'password' && styles.inputFocused
                ]}
                placeholder="Password"
                placeholderTextColor="#9B8B73"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Retype Password Field */}
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'retypePassword' && styles.inputFocused
                ]}
                placeholder="Retype Password"
                placeholderTextColor="#9B8B73"
                secureTextEntry
                value={formData.retypePassword}
                onChangeText={(text) => setFormData({ ...formData, retypePassword: text })}
                onFocus={() => setFocusedInput('retypePassword')}
                onBlur={() => setFocusedInput(null)}
              />

              {/* Create Account Button */}
              <TouchableOpacity 
                style={[styles.createAccountButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.createAccountButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('SignIn')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.footerLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background)
  },
  
  keyboardAvoidingView: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },

  scrollViewContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },

  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  backButtonText: {
    fontSize: 24,
    color: '#111827', // gray-900 (dark text)
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 600,
  },

  card: {
    backgroundColor: '#ffffff', // white
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter',
  },

  subtitle: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    fontFamily: 'Inter',
  },

  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#DABB95', // tan-300
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827', // gray-900 (dark text)
    backgroundColor: '#FAF7F1', // tan-50 (lightest)
    fontFamily: 'Inter',
  },

  halfInput: {
    width: '48%',
    marginBottom: 0,
  },

  inputFocused: {
    borderColor: '#111827', // gray-900 (dark text)
    borderWidth: 2,
  },

  createAccountButton: {
    height: 56,
    backgroundColor: '#111827', // gray-900 (dark text)
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  buttonDisabled: {
    backgroundColor: '#9CA3AF', // gray-400
  },

  createAccountButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  footerText: {
    color: '#A67C52', // tan-500 (primary tan)
    fontSize: 15,
    fontFamily: 'Inter',
  },

  footerLink: {
    color: '#111827', // gray-900 (dark text)
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: 'Inter',
  },
}); 