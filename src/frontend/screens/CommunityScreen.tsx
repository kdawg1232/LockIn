import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationBar } from '../components/NavigationBar';

// Logo component with grid design (consistent with other screens)
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

export const CommunityScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <GridLogo />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Community</Text>
        
        {/* Main Content */}
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonText}>Coming soon!</Text>
        </View>
      </View>
      <NavigationBar />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background) - consistent with app
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 120,
    justifyContent: 'flex-start',
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 40,
  },

  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  comingSoonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  // Grid logo styles (consistent with other screens)
  gridContainer: {
    width: 36,
    height: 36,
    gap: 2,
  },

  gridRow: {
    flexDirection: 'row',
    gap: 2,
    flex: 1,
  },

  gridSquare: {
    flex: 1,
    borderRadius: 3,
  },

  gridDark: {
    backgroundColor: '#4B5563', // gray-600
  },

  gridTan: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
  },
}); 