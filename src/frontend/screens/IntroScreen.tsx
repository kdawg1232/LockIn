import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Logo component with grid design
const GridLogo: React.FC = () => {
  return (
    <View style={styles.gridContainer}>
      {/* Row 1 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
      {/* Row 2 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
      </View>
      {/* Row 3 */}
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
    </View>
  );
};

export const IntroScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleGetStarted = () => {
    // Navigate to Auth stack and then to Sign Up screen
    navigation.navigate('Auth', { screen: 'SignUp' });
  };

  const handleSignIn = () => {
    // Navigate to Auth stack and then to Sign In screen
    navigation.navigate('Auth', { screen: 'SignIn' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Branding */}
        <View style={styles.brandingContainer}>
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
          <Text style={styles.appTitle}>Locked In</Text>
          <Text style={styles.tagline}>Focus. Compete. Achieve.</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresContainer}>
          {/* Challenge Friends Card */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Challenge Friends</Text>
            <Text style={styles.featureDescription}>
              Compete with classmates in daily focus challenges
            </Text>
          </View>

          {/* Earn Rewards Card */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Earn Rewards</Text>
            <Text style={styles.featureDescription}>
              Unlock achievements and climb leaderboards as you stay focused
            </Text>
          </View>

          {/* Track Progress Card */}
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>Track Progress</Text>
            <Text style={styles.featureDescription}>
              Monitor your productivity and build better habits
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Get Started Button */}
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Text */}
        <Text style={styles.bottomText}>
          Join thousands of students staying focused and achieving their goals
        </Text>
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },

  // Branding section
  brandingContainer: {
    alignItems: 'center',
    marginTop: 10,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Semi-transparent white
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    padding: 8,
  },

  // Grid logo styles
  gridContainer: {
    width: 48,
    height: 48,
    gap: 2,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 4,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },

  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
    marginBottom: 8,
  },

  tagline: {
    fontSize: 18,
    color: '#A67C52', // tan-500 (primary tan)
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  // Features section
  featuresContainer: {
    gap: 16,
    marginVertical: 24,
  },

  featureCard: {
    backgroundColor: '#ffffff', // white
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
    marginBottom: 8,
    textAlign: 'center',
  },

  featureDescription: {
    fontSize: 14,
    color: '#8B6942', // tan-600 (darker tan for better visibility)
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Button section
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },

  getStartedButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  getStartedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  signInButton: {
    backgroundColor: '#ffffff', // White background
    borderWidth: 2,
    borderColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  signInButtonText: {
    color: '#A67C52', // tan-500 (primary tan)
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Bottom text
  bottomText: {
    fontSize: 14,
    color: '#8B6942', // tan-600 (darker tan for better visibility)
    fontFamily: 'Inter',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default IntroScreen; 