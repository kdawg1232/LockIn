/**
 * Styles Index
 * 
 * Central export point for all styling utilities, theme constants, and global styles.
 * Import from this file to access the design system throughout the app.
 */

// Export theme constants
export * from './theme';

// Re-export commonly used styling utilities
export { default as tw } from 'twrnc';

// Import global CSS (this ensures it's loaded)
import './global.css';

/**
 * Usage examples:
 * 
 * // Using theme constants
 * import { colors, spacing, typography } from '@/styles';
 * 
 * // Using Tailwind with twrnc
 * import { tw } from '@/styles';
 * <View style={tw`bg-[#cfb991] p-4 rounded-lg`} />
 * 
 * // Using theme constants with twrnc
 * <View style={[tw`p-4 rounded-lg`, { backgroundColor: colors.background.primary }]} />
 */ 