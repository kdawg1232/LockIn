/**
 * Time utilities for challenge timing management
 * Handles local timezone calculations for challenge periods
 */

export interface ChallengeTimeInfo {
  isInChallengeWindow: boolean;
  isInRestPeriod: boolean;
  timeUntilMidnight: number; // milliseconds
  timeUntil6AM: number; // milliseconds
  nextMidnight: Date;
  next6AM: Date;
  currentLocalTime: Date;
}

/**
 * Get comprehensive challenge timing information for the current local time
 */
export const getChallengeTimeInfo = (): ChallengeTimeInfo => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Challenge window: 6 AM to 12 AM (midnight)
  // Rest period: 12 AM (midnight) to 6 AM
  const isInChallengeWindow = currentHour >= 6 && currentHour < 24;
  const isInRestPeriod = currentHour >= 0 && currentHour < 6;
  
  // Calculate next midnight (end of current challenge)
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0); // Set to midnight of next day
  
  // Calculate next 6 AM (start of next challenge)
  const next6AM = new Date(now);
  if (currentHour >= 6) {
    // If it's after 6 AM today, next 6 AM is tomorrow
    next6AM.setDate(next6AM.getDate() + 1);
  }
  next6AM.setHours(6, 0, 0, 0);
  
  const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
  const timeUntil6AM = next6AM.getTime() - now.getTime();
  
  return {
    isInChallengeWindow,
    isInRestPeriod,
    timeUntilMidnight,
    timeUntil6AM,
    nextMidnight,
    next6AM,
    currentLocalTime: now
  };
};

/**
 * Format time remaining in HH:MM:SS format
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds <= 0) {
    return '00:00:00';
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Check if it's exactly midnight (within 1 minute tolerance)
 */
export const isAtMidnight = (toleranceMinutes: number = 1): boolean => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  
  const diffMs = Math.abs(now.getTime() - midnight.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes <= toleranceMinutes;
};

/**
 * Check if it's exactly 6 AM (within 1 minute tolerance)
 */
export const isAt6AM = (toleranceMinutes: number = 1): boolean => {
  const now = new Date();
  const sixAM = new Date(now);
  sixAM.setHours(6, 0, 0, 0);
  
  const diffMs = Math.abs(now.getTime() - sixAM.getTime());
  const diffMinutes = diffMs / (1000 * 60);
  
  return diffMinutes <= toleranceMinutes;
};

/**
 * Get the date string for the current challenge day
 * Challenge day runs from 6 AM to midnight
 */
export const getCurrentChallengeDate = (): string => {
  const now = new Date();
  const challengeDate = new Date(now);
  
  // If it's before 6 AM, the challenge day is actually yesterday
  if (now.getHours() < 6) {
    challengeDate.setDate(challengeDate.getDate() - 1);
  }
  
  return challengeDate.toISOString().split('T')[0];
};

/**
 * Calculate when the user's data should be collected based on their local midnight
 * This helps handle cross-timezone opponents
 */
export const getUserMidnightUTC = (userTimezone?: string): Date => {
  const now = new Date();
  
  if (userTimezone) {
    // If we have timezone info, calculate their midnight in UTC
    // This would require a timezone library in a full implementation
    // For now, we'll use the device's local time
    console.log('⏰ Timezone-specific calculation not implemented, using device local time');
  }
  
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight local time
  
  return midnight;
}; 