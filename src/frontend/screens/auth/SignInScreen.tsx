import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '../../services/auth.service';
import { SessionContext } from '../../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;

export const SignInScreen = () => {
  const navigation = useNavigation<SignInScreenNavigationProp>();
  const { refreshSession } = useContext(SessionContext);
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!formData.emailOrUsername || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.signIn(
        formData.emailOrUsername,
        formData.password
      );

      if (result.success) {
        console.log('✅ Successfully signed in:', result.user);
        
        // Trigger session refresh to update navigation
        console.log('🔄 Triggering session refresh...');
        await refreshSession();
      } else {
        Alert.alert('Error', 'Invalid credentials. Please try again.');
      }
    } catch (error) {
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
            <Text style={styles.title}>Locked In</Text>
            <Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>

            {/* Input Fields */}
            <TextInput
              style={[
                styles.input,
                focusedInput === 'email' && styles.inputFocused
              ]}
              placeholder="Email or Username"
              placeholderTextColor="#9B8B73"
              autoCapitalize="none"
              value={formData.emailOrUsername}
              onChangeText={(text) => setFormData({ ...formData, emailOrUsername: text })}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput(null)}
            />

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

            {/* Sign In Button */}
            <TouchableOpacity 
              style={[styles.signInButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.signInButtonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('SignUp')}
                activeOpacity={0.7}
              >
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 20,
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
    paddingBottom: 50,
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

  inputFocused: {
    borderColor: '#111827', // gray-900 (dark text)
  },

  signInButton: {
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

  signInButtonText: {
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