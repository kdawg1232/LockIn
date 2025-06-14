import supabase from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { processDailyChallengeResolution } from './dailyChallengeService';

interface OpponentData {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
}

// Generate user-specific cache keys
const getOpponentStorageKey = (userId: string) => `@opponent_of_the_day_${userId}`;
const getLastFetchKey = (userId: string) => `@last_opponent_fetch_${userId}`;

const isNewDayRequired = async (userId: string): Promise<boolean> => {
  try {
    const lastFetch = await AsyncStorage.getItem(getLastFetchKey(userId));
    if (!lastFetch) return true;

    const lastFetchDate = new Date(lastFetch);
    const now = new Date();
    const timeDiff = now.getTime() - lastFetchDate.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    return hoursDiff >= 24;
  } catch (error) {
    console.error('Error checking cache time:', error);
    return true; // Default to fetching new data if there's an error
  }
};

// Function to clear the opponent cache (for testing/debugging)
export const clearOpponentCache = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(getOpponentStorageKey(userId));
    await AsyncStorage.removeItem(getLastFetchKey(userId));
    console.log('🎲 Opponent cache cleared for user:', userId);
  } catch (error) {
    console.error('🎲 Error clearing opponent cache:', error);
  }
};

// Function to force fetch a new opponent (bypasses cache)
// This also processes the daily challenge resolution for the previous opponent
export const getNewOpponent = async (currentUserId: string): Promise<OpponentData | null> => {
  console.log('🎲 Forcing fresh opponent fetch for user:', currentUserId);
  
  // Get the current opponent before clearing cache (for challenge resolution)
  const currentOpponent = await getCurrentOpponent(currentUserId);
  
  if (currentOpponent) {
    console.log('🎲 Processing daily challenge resolution before switching opponents...');
    const resolutionResult = await processDailyChallengeResolution(currentUserId, currentOpponent.id);
    
    if (resolutionResult.success && resolutionResult.result) {
      console.log('🎲 Challenge resolution completed:', resolutionResult.result);
    } else {
      console.error('🎲 Challenge resolution failed:', resolutionResult.error);
    }
  }
  
  await clearOpponentCache(currentUserId);
  return getOpponentOfTheDay(currentUserId);
};

// Helper function to get current cached opponent without fetching new one
export const getCurrentOpponent = async (currentUserId: string): Promise<OpponentData | null> => {
  try {
    const cachedOpponent = await AsyncStorage.getItem(getOpponentStorageKey(currentUserId));
    if (cachedOpponent) {
      return JSON.parse(cachedOpponent);
    }
    return null;
  } catch (error) {
    console.error('🎲 Error getting current opponent:', error);
    return null;
  }
};

export const getOpponentOfTheDay = async (currentUserId: string): Promise<OpponentData | null> => {
  try {
    console.log('🎲 Getting opponent of the day for user:', currentUserId);
    
    // Check if we need to fetch a new opponent
    const needsNewOpponent = await isNewDayRequired(currentUserId);
    console.log('🎲 Need new opponent?', needsNewOpponent);
    
    if (!needsNewOpponent) {
      // Try to get cached opponent
      const cachedOpponent = await AsyncStorage.getItem(getOpponentStorageKey(currentUserId));
      if (cachedOpponent) {
        console.log('🎲 Using cached opponent for user', currentUserId, ':', JSON.parse(cachedOpponent));
        return JSON.parse(cachedOpponent);
      }
    } else {
      // Time for new opponent - process challenge resolution for current opponent first
      const currentOpponent = await getCurrentOpponent(currentUserId);
      
      if (currentOpponent) {
        console.log('🎲 Processing daily challenge resolution due to timer expiration...');
        const resolutionResult = await processDailyChallengeResolution(currentUserId, currentOpponent.id);
        
        if (resolutionResult.success && resolutionResult.result) {
          console.log('🎲 Challenge resolution completed:', resolutionResult.result);
        } else {
          console.error('🎲 Challenge resolution failed:', resolutionResult.error);
        }
      }
    }

    // Fetch a random opponent from Supabase
    console.log('🎲 Fetching fresh opponent from database...');
    // First, get all users except current user
    const { data: allOpponents, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, university, major, avatar_url')
      .neq('id', currentUserId);

    console.log('🎲 Database query result:', { 
      totalOpponents: allOpponents?.length || 0, 
      error,
      sampleData: allOpponents?.[0] 
    });

    if (error) {
      console.error('🎲 Error fetching opponents:', error);
      return null;
    }

    if (!allOpponents || !Array.isArray(allOpponents) || allOpponents.length === 0) {
      console.log('🎲 No opponents found in database');
      return null;
    }

    // Pick a random opponent
    const randomIndex = Math.floor(Math.random() * allOpponents.length);
    const opponent = allOpponents[randomIndex];
    console.log('🎲 Selected random opponent:', { randomIndex, opponent });

    // Transform the data to match our interface
    const opponentData: OpponentData = {
      id: opponent.id,
      firstName: opponent.first_name || '',
      lastName: opponent.last_name || '',
      university: opponent.university || '',
      major: opponent.major || '',
      avatarUrl: opponent.avatar_url
    };

    console.log('🎲 Final opponent data for user', currentUserId, ':', opponentData);

    // Cache the opponent and update last fetch time (user-specific)
    await AsyncStorage.setItem(getOpponentStorageKey(currentUserId), JSON.stringify(opponentData));
    await AsyncStorage.setItem(getLastFetchKey(currentUserId), new Date().toISOString());
    console.log('🎲 Cached opponent for user', currentUserId, 'for next 24 hours');

    return opponentData;
  } catch (error) {
    console.error('🎲 Error in getOpponentOfTheDay:', error);
    return null;
  }
}; 