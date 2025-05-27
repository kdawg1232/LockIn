/**
 * Design System Theme Constants
 * 
 * This file contains all the design tokens used throughout the LockIn app.
 * These values should match the Tailwind configuration for consistency.
 */

import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette from your project requirements
export const colors = {
  // Primary Colors
  primary: '#cfb991',
  black: '#000000',
  white: '#FFFFFF',
  
  // Secondary Colors
  secondary: '#8e6f3e',
  accent: '#daaa00',
  gold: '#ddb945',
  cream: '#ebd99f',
  
  // Neutral Colors
  darkGray: '#555960',
  mediumGray: '#6f727b',
  lightGray: '#9d9795',
  paleGray: '#c4bfc0',
  
  // Semantic Colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
};

// Typography system
export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing system (based on 4px grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 96,
};

// Border radius system
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadow system
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

// Common styles that can be reused
export const commonStyles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  
  primaryCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  
  // Buttons
  button: {
    height: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  
  primaryButton: {
    height: 50,
    backgroundColor: colors.black,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  
  secondaryButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  
  // Text inputs
  textInput: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.paleGray,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.black,
    backgroundColor: colors.white,
  },
  
  // Text styles
  heading1: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
  },
  
  heading2: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
  },
  
  heading3: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    lineHeight: typography.fontSize['2xl'] * typography.lineHeight.tight,
  },
  
  bodyLarge: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.normal,
    color: colors.black,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: colors.black,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
  },
  
  bodySmall: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.darkGray,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    color: colors.mediumGray,
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  
  // Avatar styles
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  avatarText: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});

// Utility functions for dynamic styling
export const createSpacing = (multiplier: number) => spacing.md * multiplier;

export const createButtonStyle = (backgroundColor: string, textColor: string = colors.white) => ({
  button: {
    ...commonStyles.button,
    backgroundColor,
  },
  text: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: textColor,
  },
});

export const createCardStyle = (backgroundColor: string = colors.white) => ({
  ...commonStyles.card,
  backgroundColor,
});

// Screen dimensions for responsive design
export const screen = {
  width: screenWidth,
  height: screenHeight,
  isSmall: screenWidth < 375,
  isMedium: screenWidth >= 375 && screenWidth < 414,
  isLarge: screenWidth >= 414,
}; 