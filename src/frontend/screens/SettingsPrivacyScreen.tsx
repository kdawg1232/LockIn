import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const SettingsPrivacyScreen: React.FC = () => {
  const navigation = useNavigation();

  // Placeholder handlers for buttons (functionality not implemented yet as per user request)
  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    console.log('Edit Profile clicked - functionality to be implemented');
  };

  const handleDeleteData = () => {
    // TODO: Implement delete data functionality
    console.log('Delete Data clicked - functionality to be implemented');
  };

  const handleReportContent = () => {
    // TODO: Implement report content functionality
    console.log('Report Content clicked - functionality to be implemented');
  };

  const handleTermsOfService = () => {
    // TODO: Implement terms of service functionality
    console.log('Terms of Service clicked - functionality to be implemented');
  };

  const handlePrivacyPolicy = () => {
    // TODO: Implement privacy policy functionality
    console.log('Privacy Policy clicked - functionality to be implemented');
  };

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
        <Text style={styles.title}>Settings & Privacy</Text>

        {/* Settings Options */}
        <View style={styles.optionsContainer}>
          {/* Edit Profile */}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="create-outline" size={24} color="#4F46E5" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Edit Profile</Text>
              <Text style={styles.optionDescription}>
                Update your personal information
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Delete Data */}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleDeleteData}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIcon, styles.dangerIcon]}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, styles.dangerText]}>Delete Data</Text>
              <Text style={styles.optionDescription}>
                Permanently delete all your data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Report Content */}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleReportContent}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="flag-outline" size={24} color="#059669" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Report Content</Text>
              <Text style={styles.optionDescription}>
                Report inappropriate content or users
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handleTermsOfService}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="document-text-outline" size={24} color="#6B7280" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Terms of Service</Text>
              <Text style={styles.optionDescription}>
                Read our terms and conditions
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity 
            style={styles.optionItem}
            onPress={handlePrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="shield-outline" size={24} color="#6B7280" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Privacy Policy</Text>
              <Text style={styles.optionDescription}>
                Learn how we protect your data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 32,
  },

  // Options container
  optionsContainer: {
    backgroundColor: '#ffffff', // white
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },

  // Option item styles
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginVertical: 4,
  },

  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6', // gray-100
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  dangerIcon: {
    backgroundColor: '#FEF2F2', // red-50
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
    marginBottom: 2,
  },

  dangerText: {
    color: '#EF4444', // red-500
  },

  optionDescription: {
    fontSize: 14,
    color: '#6B7280', // gray-500 (secondary text)
    fontFamily: 'Inter',
    lineHeight: 18,
  },
}); 