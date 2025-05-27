/**
 * Design System Theme Constants
 * 
 * This file contains all the design tokens used throughout the LockIn app.
 * These values should match the Tailwind configuration for consistency.
 */

export const colors = {
  // Primary brand colors
  primary: {
    50: '#f9f7f4',
    100: '#f0ebe2',
    200: '#e1d4c0',
    300: '#cfb991', // Main brand color
    400: '#c4a876',
    500: '#b8975b',
    600: '#a6844d',
    700: '#8a6d41',
    800: '#715a39',
    900: '#5d4a31',
  },
  
  // Neutral grays
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
  },
  
  // App-specific colors
  background: {
    primary: '#cfb991',
    secondary: '#ffffff',
    card: '#ffffff',
  },
  text: {
    primary: '#000000',
    secondary: '#555960',
    muted: '#9d9795',
    inverse: '#ffffff',
  },
  border: {
    primary: '#c4bfc0',
    secondary: '#e5e5e5',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Common component styles
export const commonStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    ...shadows.md,
  },
  button: {
    height: 50,
    borderRadius: borderRadius.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
} as const;

// Typography styles
export const typography = {
  heading1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  heading2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  heading3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  heading4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  bodyLarge: {
    fontSize: fontSize.lg,
    color: colors.text.primary,
  },
  body: {
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
  },
} as const; 