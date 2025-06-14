import supabase from '../../lib/supabase';

// Interface for challenge history entry
export interface ChallengeHistoryEntry {
  id: string;
  userId: string;
  challengeDate: string; // YYYY-MM-DD format
  outcome: 'win' | 'loss' | 'tie';
  userNetCoins: number;
  opponentNetCoins: number;
  opponentId?: string;
  createdAt: string;
}

// Interface for calendar data
export interface CalendarDay {
  date: string; // YYYY-MM-DD format
  outcome: 'win' | 'loss' | 'tie' | null; // null if no challenge data
  userNetCoins: number;
  opponentNetCoins: number;
}

// Type for calendar view period
export type CalendarViewType = 'week' | 'month' | 'year';

/**
 * Fetch challenge history for a user within a date range
 * Used to populate calendar views (task 1.32)
 */
export const getChallengeHistory = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ data: ChallengeHistoryEntry[]; error: string | null }> => {
  try {
    console.log('📅 Fetching challenge history:', { userId, startDate, endDate });
    
    // Check if challenge_history table exists
    let historyData, error;
    try {
      const result = await supabase
        .from('challenge_history')
        .select(`id,user_id,challenge_date,outcome,user_net_coins,opponent_net_coins,opponent_id,created_at`)
        .eq('user_id', userId);
      
      historyData = result.data;
      error = result.error;
    } catch (tableError) {
      console.log('📅 Challenge history table not available yet, returning empty data');
      return { data: [], error: null };
    }

    if (error) {
      console.error('📅 Error fetching challenge history:', error);
      return { data: [], error: error.message };
    }

    // Handle array response and filter by date range manually
    const responseData = Array.isArray(historyData) ? historyData : (historyData ? [historyData] : []);
    
    // Convert and filter database format to interface format
    const entries: ChallengeHistoryEntry[] = responseData
      .filter(row => row.challenge_date >= startDate && row.challenge_date <= endDate)
      .map(row => ({
        id: row.id,
        userId: row.user_id,
        challengeDate: row.challenge_date,
        outcome: row.outcome as 'win' | 'loss' | 'tie',
        userNetCoins: row.user_net_coins,
        opponentNetCoins: row.opponent_net_coins,
        opponentId: row.opponent_id,
        createdAt: row.created_at
      }))
      .sort((a, b) => a.challengeDate.localeCompare(b.challengeDate));

    console.log('📅 Challenge history fetched:', entries.length, 'entries');
    return { data: entries, error: null };
  } catch (error) {
    console.error('📅 Error in getChallengeHistory:', error);
    return { data: [], error: 'Failed to fetch challenge history' };
  }
};

/**
 * Generate calendar data for a specific view type
 * Returns array of calendar days with win/loss status
 */
export const getCalendarData = async (
  userId: string,
  viewType: CalendarViewType,
  referenceDate?: Date
): Promise<{ data: CalendarDay[]; error: string | null }> => {
  try {
    const today = referenceDate || new Date();
    let startDate: Date;
    let endDate: Date;

    // Calculate date range based on view type
    switch (viewType) {
      case 'week':
        // Get current week (Sunday to Saturday)
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;

      case 'month':
        // Get current month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;

      case 'year':
        // Get current year
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;

      default:
        return { data: [], error: 'Invalid view type' };
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('📅 Generating calendar data:', { viewType, startDateStr, endDateStr });

    // Fetch challenge history for the date range
    const { data: historyEntries, error } = await getChallengeHistory(userId, startDateStr, endDateStr);
    
    if (error) {
      return { data: [], error };
    }

    // Create a map for quick lookup
    const historyMap = new Map<string, ChallengeHistoryEntry>();
    historyEntries.forEach(entry => {
      historyMap.set(entry.challengeDate, entry);
    });

    // Generate calendar days
    const calendarDays: CalendarDay[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const historyEntry = historyMap.get(dateStr);

      calendarDays.push({
        date: dateStr,
        outcome: historyEntry ? historyEntry.outcome : null,
        userNetCoins: historyEntry ? historyEntry.userNetCoins : 0,
        opponentNetCoins: historyEntry ? historyEntry.opponentNetCoins : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('📅 Calendar data generated:', calendarDays.length, 'days');
    return { data: calendarDays, error: null };
  } catch (error) {
    console.error('📅 Error in getCalendarData:', error);
    return { data: [], error: 'Failed to generate calendar data' };
  }
};

/**
 * Get challenge statistics for a user
 * Returns win/loss counts and percentages
 */
export const getChallengeStats = async (
  userId: string,
  days: number = 30
): Promise<{ 
  data: { 
    totalChallenges: number; 
    wins: number; 
    losses: number; 
    winPercentage: number; 
  }; 
  error: string | null 
}> => {
  try {
    console.log('📊 Fetching challenge stats for last', days, 'days');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: historyEntries, error } = await getChallengeHistory(userId, startDateStr, endDateStr);
    
    if (error) {
      return { 
        data: { totalChallenges: 0, wins: 0, losses: 0, winPercentage: 0 }, 
        error 
      };
    }

    const wins = historyEntries.filter(entry => entry.outcome === 'win').length;
    const losses = historyEntries.filter(entry => entry.outcome === 'loss').length;
    const totalChallenges = wins + losses;
    const winPercentage = totalChallenges > 0 ? Math.round((wins / totalChallenges) * 100) : 0;

    console.log('📊 Challenge stats calculated:', { totalChallenges, wins, losses, winPercentage });
    
    return {
      data: { totalChallenges, wins, losses, winPercentage },
      error: null
    };
  } catch (error) {
    console.error('📊 Error in getChallengeStats:', error);
    return { 
      data: { totalChallenges: 0, wins: 0, losses: 0, winPercentage: 0 }, 
      error: 'Failed to fetch challenge stats' 
    };
  }
};

/**
 * Get the last 30 days of challenge history for the simplified calendar view
 * Optimized for the profile screen display
 */
export const getRecentChallengeHistory = async (
  userId: string
): Promise<{ data: CalendarDay[]; error: string | null }> => {
  try {
    console.log('📅 Fetching recent challenge history for profile screen');
    
    // Get last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 29); // 30 days total including today

    const { data: calendarData, error } = await getCalendarData(userId, 'month', endDate);
    
    if (error) {
      return { data: [], error };
    }

    // Filter to only last 30 days
    const thirtyDaysAgo = startDate.toISOString().split('T')[0];
    const filteredData = calendarData.filter(day => day.date >= thirtyDaysAgo);

    return { data: filteredData, error: null };
  } catch (error) {
    console.error('📅 Error in getRecentChallengeHistory:', error);
    return { data: [], error: 'Failed to fetch recent challenge history' };
  }
}; 