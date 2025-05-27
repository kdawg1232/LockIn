import supabase from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OpponentData {
  id: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
}

const OPPONENT_STORAGE_KEY = '@opponent_of_the_day';
const LAST_FETCH_KEY = '@last_opponent_fetch';

const isNewDayRequired = async (): Promise<boolean> => {
  try {
    const lastFetch = await AsyncStorage.getItem(LAST_FETCH_KEY);
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
export const clearOpponentCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OPPONENT_STORAGE_KEY);
    await AsyncStorage.removeItem(LAST_FETCH_KEY);
    console.log('🎲 Opponent cache cleared');
  } catch (error) {
    console.error('🎲 Error clearing opponent cache:', error);
  }
};

// Function to force fetch a new opponent (bypasses cache)
export const getNewOpponent = async (currentUserId: string): Promise<OpponentData | null> => {
  console.log('🎲 Forcing fresh opponent fetch...');
  await clearOpponentCache();
  return getOpponentOfTheDay(currentUserId);
};

export const getOpponentOfTheDay = async (currentUserId: string): Promise<OpponentData | null> => {
  try {
    console.log('🎲 Getting opponent of the day for user:', currentUserId);
    
    // Check if we need to fetch a new opponent
    const needsNewOpponent = await isNewDayRequired();
    console.log('🎲 Need new opponent?', needsNewOpponent);
    
    if (!needsNewOpponent) {
      // Try to get cached opponent
      const cachedOpponent = await AsyncStorage.getItem(OPPONENT_STORAGE_KEY);
      if (cachedOpponent) {
        console.log('🎲 Using cached opponent:', JSON.parse(cachedOpponent));
        return JSON.parse(cachedOpponent);
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

    console.log('🎲 Final opponent data:', opponentData);

    // Cache the opponent and update last fetch time
    await AsyncStorage.setItem(OPPONENT_STORAGE_KEY, JSON.stringify(opponentData));
    await AsyncStorage.setItem(LAST_FETCH_KEY, new Date().toISOString());
    console.log('🎲 Cached opponent for next 24 hours');

    return opponentData;
  } catch (error) {
    console.error('🎲 Error in getOpponentOfTheDay:', error);
    return null;
  }
}; 