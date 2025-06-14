import { getUserTotalCoins } from './timerService';
import { updateUserGameStats, updateUserTotalCoins, recordChallengeOutcome } from './profileService';

/**
 * Daily Challenge Resolution Service
 * Handles the logic when a daily challenge period ends (opponent switch)
 */

export interface ChallengeResult {
  userId: string;
  opponentId: string;
  userNetCoins: number;
  opponentNetCoins: number;
  outcome: 'win' | 'loss' | 'tie';
  challengeDate: string;
}

/**
 * Process the end of a daily challenge period
 * This is called when the opponent timer expires or new opponent button is pressed
 */
export const processDailyChallengeResolution = async (
  userId: string,
  opponentId: string
): Promise<{ success: boolean; error: string | null; result?: ChallengeResult }> => {
  try {
    console.log('🏆 Processing daily challenge resolution:', { userId, opponentId });

    // Validate that opponent is not the same as user
    if (userId === opponentId) {
      console.error('🏆 Error: User cannot be their own opponent');
      return { success: false, error: 'Invalid opponent - cannot challenge yourself' };
    }

    // Get today's date for challenge record
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get final coin counts for both users
    console.log('🏆 Fetching final coin counts...');
    
    const [userCoinsResult, opponentCoinsResult] = await Promise.all([
      getUserTotalCoins(userId),
      getUserTotalCoins(opponentId)
    ]);

    if (userCoinsResult.error) {
      console.error('🏆 Error fetching user coins:', userCoinsResult.error);
      return { success: false, error: `Failed to get user coins: ${userCoinsResult.error}` };
    }

    if (opponentCoinsResult.error) {
      console.error('🏆 Error fetching opponent coins:', opponentCoinsResult.error);
      return { success: false, error: `Failed to get opponent coins: ${opponentCoinsResult.error}` };
    }

    const userNetCoins = userCoinsResult.totalCoins;
    const opponentNetCoins = opponentCoinsResult.totalCoins;

    console.log('🏆 Final coin counts:', { 
      userNetCoins, 
      opponentNetCoins,
      difference: userNetCoins - opponentNetCoins 
    });

    // Determine outcomes for both users
    let userOutcome: 'win' | 'loss' | 'tie';
    let opponentOutcome: 'win' | 'loss' | 'tie';

    if (userNetCoins > opponentNetCoins) {
      userOutcome = 'win';
      opponentOutcome = 'loss';
      console.log('🏆 User wins the daily challenge!');
    } else if (userNetCoins < opponentNetCoins) {
      userOutcome = 'loss';
      opponentOutcome = 'win';
      console.log('🏆 Opponent wins the daily challenge!');
    } else {
      userOutcome = 'tie';
      opponentOutcome = 'tie';
      console.log('🏆 Daily challenge ends in a tie!');
    }

    // Update both users' game stats (focus score, win streak)
    console.log('🏆 Updating user game stats...');
    const [userStatsResult, opponentStatsResult] = await Promise.all([
      updateUserGameStats(userId, userOutcome),
      updateUserGameStats(opponentId, opponentOutcome)
    ]);

    if (!userStatsResult.success) {
      console.error('🏆 Error updating user stats:', userStatsResult.error);
      return { success: false, error: `Failed to update user stats: ${userStatsResult.error}` };
    }

    if (!opponentStatsResult.success) {
      console.error('🏆 Error updating opponent stats:', opponentStatsResult.error);
      return { success: false, error: `Failed to update opponent stats: ${opponentStatsResult.error}` };
    }

    // Update total coins for both users (cumulative across all time)
    console.log('🏆 Updating total coins...');
    const [userCoinsUpdateResult, opponentCoinsUpdateResult] = await Promise.all([
      updateUserTotalCoins(userId),
      updateUserTotalCoins(opponentId)
    ]);

    if (!userCoinsUpdateResult.success) {
      console.error('🏆 Error updating user total coins:', userCoinsUpdateResult.error);
      // Don't fail the entire process for this, just log the error
      console.log('🏆 Continuing despite total coins update failure...');
    }

    if (!opponentCoinsUpdateResult.success) {
      console.error('🏆 Error updating opponent total coins:', opponentCoinsUpdateResult.error);
      // Don't fail the entire process for this, just log the error
      console.log('🏆 Continuing despite total coins update failure...');
    }

    // Record challenge history for both users
    console.log('🏆 Recording challenge history...');
    const [userHistoryResult, opponentHistoryResult] = await Promise.all([
      recordChallengeOutcome({
        userId,
        opponentId,
        userNetCoins,
        opponentNetCoins,
        outcome: userOutcome,
        challengeDate: today
      }),
      recordChallengeOutcome({
        userId: opponentId,
        opponentId: userId,
        userNetCoins: opponentNetCoins,
        opponentNetCoins: userNetCoins,
        outcome: opponentOutcome,
        challengeDate: today
      })
    ]);

    if (!userHistoryResult.success) {
      console.error('🏆 Error recording user challenge history:', userHistoryResult.error);
      // Don't fail the entire process for this, just log the error
      console.log('🏆 Continuing despite history recording failure...');
    }

    if (!opponentHistoryResult.success) {
      console.error('🏆 Error recording opponent challenge history:', opponentHistoryResult.error);
      // Don't fail the entire process for this, just log the error
      console.log('🏆 Continuing despite history recording failure...');
    }

    const result: ChallengeResult = {
      userId,
      opponentId,
      userNetCoins,
      opponentNetCoins,
      outcome: userOutcome,
      challengeDate: today
    };

    console.log('🏆 Daily challenge resolution completed successfully:', result);
    return { success: true, error: null, result };

  } catch (error) {
    console.error('🏆 Error in processDailyChallengeResolution:', error);
    return { success: false, error: 'Failed to process daily challenge resolution' };
  }
};

/**
 * Get a summary of the challenge result for display
 */
export const getChallengeResultSummary = (result: ChallengeResult): string => {
  const { outcome, userNetCoins, opponentNetCoins } = result;
  
  switch (outcome) {
    case 'win':
      return `🎉 You won! ${userNetCoins} vs ${opponentNetCoins} coins`;
    case 'loss':
      return `😔 You lost. ${userNetCoins} vs ${opponentNetCoins} coins`;
    case 'tie':
      return `🤝 It's a tie! ${userNetCoins} vs ${opponentNetCoins} coins`;
    default:
      return 'Challenge completed';
  }
}; 