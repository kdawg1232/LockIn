import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
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
        {/* Challenge Button - Lightning Bolt */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('OpponentOfTheDay')}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={20} color="#000000" />
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
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={20} color="#000000" />
        </TouchableOpacity>

        {/* Community Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Community')}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={20} color="#000000" />
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
    paddingHorizontal: 25,
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
    minWidth: 50,
    paddingVertical: 8,
  },

  logoButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
    paddingVertical: 8,
  },

  logoContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(166, 124, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Grid logo styles
  gridContainer: {
    width: 16,
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