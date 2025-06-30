import React from 'react';
import { View, StyleSheet } from 'react-native';

interface GridLogoProps {}

export const GridLogo: React.FC<GridLogoProps> = () => {
  return (
    <View style={styles.gridContainer}>
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
      </View>
      <View style={styles.gridRow}>
        <View style={[styles.gridSquare, styles.gridDark]} />
        <View style={[styles.gridSquare, styles.gridTan]} />
        <View style={[styles.gridSquare, styles.gridDark]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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