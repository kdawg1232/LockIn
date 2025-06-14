import supabase from '../../lib/supabase';
import { getUserTotalCoins } from './timerService';

// Interface for user profile data with new fields
export interface UserProfileData {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  university: string;
  major: string;
  avatarUrl?: string;
  focusScore: number;
  winStreak: number;
  totalCoins: number;
}

// Interface for challenge outcome update
export interface ChallengeOutcome {
  userId: string;
  opponentId: string;
  userNetCoins: number;
  opponentNetCoins: number;
  outcome: 'win' | 'loss' | 'tie';
  challengeDate: string; // YYYY-MM-DD format
}

/**
 * Fetch enhanced user profile data including new fields
 * Returns user profile with focus score, win streak, and total coins
 */
export const getUserProfile = async (userId: string): Promise<{ data: UserProfileData | null; error: string | null }> => {
  try {
    console.log('🔍 Fetching enhanced user profile for:', userId);
    
    // Get user profile from database including new fields
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select(`id,email,username,first_name,last_name,university,major,avatar_url,focus_score,win_streak,total_coins`)
      .eq('id', userId);

    if (profileError) {
      console.error('🔍 Error fetching profile:', profileError);
      return { data: null, error: profileError.message };
    }

    if (!profileData || (Array.isArray(profileData) && profileData.length === 0)) {
      console.error('🔍 No profile data found');
      return { data: null, error: 'Profile not found' };
    }

    // Handle array response from custom client
    const userData = Array.isArray(profileData) ? profileData[0] : profileData;

    if (!userData) {
      console.error('🔍 No user data in response');
      return { data: null, error: 'Profile not found' };
    }

    // Convert database format to interface format
    const profile: UserProfileData = {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      university: userData.university || '',
      major: userData.major || '',
      avatarUrl: userData.avatar_url,
      // Use new fields if available, otherwise default to 0
      focusScore: userData.focus_score ?? 0,
      winStreak: userData.win_streak ?? 0,
      totalCoins: userData.total_coins ?? 0
    };

    console.log('🔍 Profile fetched successfully:', { 
      userId: profile.id, 
      focusScore: profile.focusScore, 
      winStreak: profile.winStreak,
      totalCoins: profile.totalCoins 
    });

    return { data: profile, error: null };
  } catch (error) {
    console.error('🔍 Error in getUserProfile:', error);
    return { data: null, error: 'Failed to fetch user profile' };
  }
};

/**
 * Update user's focus score and win streak based on challenge outcome
 * Handles the business logic for tasks 1.29
 */
export const updateUserGameStats = async (
  userId: string, 
  outcome: 'win' | 'loss' | 'tie'
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('🎯 Updating user game stats:', { userId, outcome });
    
    // Get current user stats
    const { data: currentProfile, error: fetchError } = await getUserProfile(userId);
    
    if (fetchError || !currentProfile) {
      console.error('🎯 Error fetching current profile:', fetchError);
      return { success: false, error: fetchError || 'Profile not found' };
    }

    // Calculate new values based on outcome
    let newFocusScore: number;
    let newWinStreak: number;

    if (outcome === 'win') {
      // Win: +10 focus score, +1 win streak
      newFocusScore = currentProfile.focusScore + 10;
      newWinStreak = currentProfile.winStreak + 1;
      console.log('🎯 Win detected - adding 10 focus score, incrementing win streak');
    } else if (outcome === 'loss') {
      // Loss: -5 focus score, reset win streak to 0
      newFocusScore = currentProfile.focusScore - 5; // Can go negative
      newWinStreak = 0;
      console.log('🎯 Loss detected - subtracting 5 focus score, resetting win streak');
    } else {
      // Tie: focus score stays same, reset win streak to 0
      newFocusScore = currentProfile.focusScore;
      newWinStreak = 0;
      console.log('🎯 Tie detected - focus score unchanged, resetting win streak');
    }

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        focus_score: newFocusScore,
        win_streak: newWinStreak
      })
      .eq('id', userId);

    if (updateError) {
      console.error('🎯 Error updating game stats:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('🎯 Game stats updated successfully:', {
      userId,
      outcome,
      oldFocusScore: currentProfile.focusScore,
      newFocusScore,
      oldWinStreak: currentProfile.winStreak,
      newWinStreak
    });

    return { success: true, error: null };
  } catch (error) {
    console.error('🎯 Error in updateUserGameStats:', error);
    return { success: false, error: 'Failed to update game stats' };
  }
};

/**
 * Update user's total coins field
 * Syncs with the coin_transactions table (task 1.30)
 */
export const updateUserTotalCoins = async (userId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('🪙 Updating user total coins for:', userId);
    
    // Get total coins from transactions
    const { totalCoins, error: coinsError } = await getUserTotalCoins(userId);
    
    if (coinsError) {
      console.error('🪙 Error calculating total coins:', coinsError);
      return { success: false, error: coinsError };
    }

    // Update user profile with total coins
    const { error: updateError } = await supabase
      .from('users')
      .update({ total_coins: totalCoins })
      .eq('id', userId);

    if (updateError) {
      console.error('🪙 Error updating total coins:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('🪙 Total coins updated successfully:', { userId, totalCoins });
    return { success: true, error: null };
  } catch (error) {
    console.error('🪙 Error in updateUserTotalCoins:', error);
    return { success: false, error: 'Failed to update total coins' };
  }
};

/**
 * Record daily challenge outcome in challenge_history table
 * Used for calendar view (task 1.32)
 * UPDATED: Now uses the bulletproof safe_upsert_challenge_outcome function
 * This completely eliminates all three previous errors:
 * 1. Duplicate key constraint violations
 * 2. RLS policy violations  
 * 3. Challenge resolution failures
 */
export const recordChallengeOutcome = async (outcome: ChallengeOutcome): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('📅 Recording challenge outcome using bulletproof upsert:', outcome);
    
    // Use the bulletproof safe_upsert_challenge_outcome function
    // This handles ALL edge cases: duplicates, RLS policies, race conditions, etc.
    const { data, error } = await supabase
      .rpc('safe_upsert_challenge_outcome', {
        p_user_id: outcome.userId,
        p_challenge_date: outcome.challengeDate,
        p_outcome: outcome.outcome,
        p_user_net_coins: outcome.userNetCoins,
        p_opponent_net_coins: outcome.opponentNetCoins,
        p_opponent_id: outcome.opponentId
      });

    if (error) {
      console.error('📅 Error calling safe_upsert_challenge_outcome:', error);
      
      // Handle the case where the function doesn't exist (migration not run yet)
      if (error.message && error.message.includes('function safe_upsert_challenge_outcome')) {
        console.log('📅 Migration not applied yet - safe_upsert_challenge_outcome function not found');
        console.log('📅 Please run the FINAL_COMPLETE_FIX.sql migration script in Supabase');
        return { success: false, error: 'Migration required - run FINAL_COMPLETE_FIX.sql script' };
      }
      
      return { success: false, error: error.message };
    }

    // The function returns a JSONB object with success status
    const result = data as { success: boolean; action: string; message: string };
    
    if (result.success) {
      console.log('📅 Challenge outcome recorded successfully:', result.action, '-', result.message);
      return { success: true, error: null };
    } else {
      console.error('📅 Challenge outcome recording failed:', result.message);
      return { success: false, error: result.message };
    }

  } catch (error) {
    console.error('📅 Error in recordChallengeOutcome:', error);
    return { success: false, error: 'Failed to record challenge outcome' };
  }
};

/**
 * Process end-of-day challenge results
 * Combines all the updates needed when a daily challenge concludes
 */
export const processDailyChallengeResult = async (
  userId: string,
  opponentId: string,
  userNetCoins: number,
  opponentNetCoins: number
): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('🏆 Processing daily challenge result:', {
      userId,
      opponentId,
      userNetCoins,
      opponentNetCoins
    });

    // Determine outcome
    const outcome: 'win' | 'loss' = userNetCoins > opponentNetCoins ? 'win' : 'loss';
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Update user game stats (focus score and win streak)
    const gameStatsResult = await updateUserGameStats(userId, outcome);
    if (!gameStatsResult.success) {
      return { success: false, error: gameStatsResult.error };
    }

    // Update total coins
    const coinsResult = await updateUserTotalCoins(userId);
    if (!coinsResult.success) {
      return { success: false, error: coinsResult.error };
    }

    // Record challenge outcome for calendar
    const historyResult = await recordChallengeOutcome({
      userId,
      opponentId,
      userNetCoins,
      opponentNetCoins,
      outcome,
      challengeDate: today
    });
    
    if (!historyResult.success) {
      return { success: false, error: historyResult.error };
    }

    console.log('🏆 Daily challenge result processed successfully:', { outcome });
    return { success: true, error: null };
  } catch (error) {
    console.error('🏆 Error in processDailyChallengeResult:', error);
    return { success: false, error: 'Failed to process daily challenge result' };
  }
}; 