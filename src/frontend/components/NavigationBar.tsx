import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Logo component with grid design (same as other screens)
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

export const NavigationBar = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.navigationBar}>
        {/* Profile Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={20} color="#555960" />
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>

        {/* Logo Home Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Stats')}
          style={styles.logoButton}
          activeOpacity={0.7}
        >
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
          <Text style={styles.navButtonText}>Home</Text>
        </TouchableOpacity>

        {/* Community Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Community')}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={20} color="#555960" />
          <Text style={styles.navButtonText}>Community</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
  },

  navigationBar: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30, // Reduced from 20 to move buttons closer to edges
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },

  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60, // Reduced from 80
    paddingVertical: 8,
  },

  logoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingVertical: 8,
  },

  logoContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(166, 124, 82, 0.1)', // Light tan background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  navButtonText: {
    fontSize: 11, // Reduced from 12
    color: '#555960',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Inter',
  },

  // Grid logo styles
  gridContainer: {
    width: 16, // Reduced from original size
    height: 16,
    gap: 1,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 1,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 1,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },
}); 