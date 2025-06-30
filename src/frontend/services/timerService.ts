import supabase from '../../lib/supabase';
import globalTimerService from './globalTimerService';
import { Database } from '../../types/database.types';

// Interface for focus session data
export interface FocusSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  completed: boolean;
  coins_awarded: number;
  created_at: string;
}

// Interface for coin transaction data
export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'focus_session' | 'social_penalty' | 'bonus' | 'other';
  session_id?: string;
  description: string;
  created_at: string;
}

// Interface for creating a new focus session
interface CreateFocusSessionData {
  user_id: string;
  start_time: string;
  duration_minutes: number;
  completed: boolean;
  coins_awarded: number;
}

// Interface for creating a new coin transaction
interface CreateCoinTransactionData {
  user_id: string;
  amount: number;
  transaction_type: 'focus_session' | 'social_penalty' | 'bonus' | 'other';
  session_id?: string;
  description: string;
}

/**
 * Start a new focus session in the database
 * Creates a new focus_sessions record with start time
 */
export const startFocusSession = async (userId: string, durationMinutes: number): Promise<{ data: FocusSession | null; error: string | null }> => {
  try {
    const sessionData: CreateFocusSessionData = {
      user_id: userId,
      start_time: new Date().toISOString(),
      duration_minutes: durationMinutes,
      completed: false,
      coins_awarded: 0
    };

    const result = await supabase.from('focus_sessions').insert(sessionData);
    
    if (result.error) {
      console.error('Error starting focus session:', result.error);
      return { data: null, error: result.error };
    }

    // Return the created session data - the custom client returns the inserted data directly
    return { data: result.data?.[0] || result.data, error: null };
  } catch (error) {
    console.error('Error in startFocusSession:', error);
    return { data: null, error: 'Failed to start focus session' };
  }
};

/**
 * Complete a focus session and award coins
 * Updates the session record and creates a coin transaction
 */
export const completeFocusSession = async (sessionId: string, userId: string, coinsAwarded: number): Promise<{ success: boolean; error: string | null }> => {
  try {
    console.log('🪙 Completing focus session:', { sessionId, userId, coinsAwarded });
    const endTime = new Date().toISOString();
    
    // Update the focus session as completed
    const sessionResult = await supabase
      .from('focus_sessions')
      .update({
        end_time: endTime,
        completed: true,
        coins_awarded: coinsAwarded
      })
      .eq('id', sessionId);

    if (sessionResult.error) {
      console.error('🪙 Error completing focus session:', sessionResult.error);
      return { success: false, error: sessionResult.error };
    }

    console.log('🪙 Focus session updated successfully');

    // Create a coin transaction for the awarded coins
    const coinResult = await addCoinTransaction(
      userId,
      coinsAwarded,
      'focus_session',
      sessionId,
      `Completed 30-second focus session`
    );

    if (coinResult.error) {
      console.error('🪙 Error adding coin transaction:', coinResult.error);
      return { success: false, error: coinResult.error };
    }

    console.log('🪙 Coin transaction created successfully:', coinResult.data);
    return { success: true, error: null };
  } catch (error) {
    console.error('🪙 Error in completeFocusSession:', error);
    return { success: false, error: 'Failed to complete focus session' };
  }
};

/**
 * Cancel a focus session without awarding coins
 * Updates the session record as incomplete
 */
export const cancelFocusSession = async (sessionId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    const endTime = new Date().toISOString();
    
    // Update the focus session as cancelled (not completed)
    const result = await supabase
      .from('focus_sessions')
      .update({
        end_time: endTime,
        completed: false,
        coins_awarded: 0
      })
      .eq('id', sessionId);

    if (result.error) {
      console.error('Error cancelling focus session:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in cancelFocusSession:', error);
    return { success: false, error: 'Failed to cancel focus session' };
  }
};

/**
 * Add a coin transaction to the database
 * Records any coin gain or loss with description
 */
export const addCoinTransaction = async (
  userId: string,
  amount: number,
  transactionType: 'focus_session' | 'social_penalty' | 'bonus' | 'other',
  sessionId?: string,
  description?: string
): Promise<{ data: CoinTransaction | null; error: string | null }> => {
  try {
    console.log('💰 Adding coin transaction:', { userId, amount, transactionType, sessionId, description });
    
    const transactionData: CreateCoinTransactionData = {
      user_id: userId,
      amount,
      transaction_type: transactionType,
      session_id: sessionId,
      description: description || `${transactionType} transaction`
    };

    console.log('💰 Transaction data to insert:', transactionData);

    const result = await supabase.from('coin_transactions').insert(transactionData);
    
    console.log('💰 Database insert result:', result);
    
    if (result.error) {
      console.error('💰 Error adding coin transaction:', result.error);
      return { data: null, error: result.error };
    }

    console.log('💰 Coin transaction inserted successfully:', result.data);
    return { data: result.data?.[0] || result.data, error: null };
  } catch (error) {
    console.error('💰 Error in addCoinTransaction:', error);
    return { data: null, error: 'Failed to add coin transaction' };
  }
};

/**
 * Get user's total coins from all transactions
 * Calculates the sum of all coin transactions for a user
 */
export const getUserTotalCoins = async (userId: string): Promise<{ totalCoins: number; error: string | null }> => {
  try {
    // Validate userId parameter
    if (!userId || userId.trim() === '') {
      console.error('💰 Invalid user ID provided to getUserTotalCoins:', userId);
      return { totalCoins: 0, error: 'Invalid user ID' };
    }
    
    // Note: This would ideally use a Supabase RPC function for better performance
    // For now, we'll fetch all transactions and calculate client-side
    const result = await supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', userId);

    if (result.error) {
      console.error('Error fetching coin transactions:', result.error);
      return { totalCoins: 0, error: result.error };
    }

    // Calculate total coins from all transactions
    const totalCoins = result.data?.reduce((sum: number, transaction: any) => sum + transaction.amount, 0) || 0;
    
    return { totalCoins, error: null };
  } catch (error) {
    console.error('Error in getUserTotalCoins:', error);
    return { totalCoins: 0, error: 'Failed to calculate total coins' };
  }
};

/**
 * Get user's coin transactions since the last stats reset
 * Returns transactions from the last stats reset time for current daily challenge
 * FIXED: Now returns separate gains/losses as expected by StatsScreen
 */
export const getTodaysCoinTransactions = async (userId: string) => {
  try {
    console.log('💰 Fetching today\'s coin transactions for user:', userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get transactions for today
    const result = await supabase
      .from('coin_transactions')
      .select('amount, created_at, transaction_type, description')
      .eq('user_id', userId);

    if (result.error) {
      console.error('💰 Error fetching transactions:', result.error);
      throw result.error;
    }

    // Filter transactions for today
    const endOfDay = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const todaysTransactions = (result.data as CoinTransaction[])
      .filter(t => {
        const date = new Date(t.created_at);
        return date >= today && date < endOfDay;
      });

    console.log('💰 Found', todaysTransactions.length, 'transactions for today:', todaysTransactions);

    // Calculate gains (positive amounts) and losses (negative amounts)
    let coinsGained = 0;
    let coinsLost = 0;

    todaysTransactions.forEach(transaction => {
      if (transaction.amount > 0) {
        coinsGained += transaction.amount;
      } else if (transaction.amount < 0) {
        coinsLost += Math.abs(transaction.amount); // Store as positive number
      }
    });

    const netCoins = coinsGained - coinsLost;

    console.log('💰 Today\'s coin summary:', { coinsGained, coinsLost, netCoins });

    return { coinsGained, coinsLost, netCoins };
  } catch (error) {
    console.error('Error fetching today\'s coin transactions:', error);
    return { coinsGained: 0, coinsLost: 0, netCoins: 0 };
  }
};

/**
 * DEBUG FUNCTION: Get all coin transactions for a user
 * Use this to debug where coins are coming from
 */
export const debugUserCoinTransactions = async (userId: string) => {
  try {
    console.log('🔍 DEBUG: Fetching all coin transactions for user:', userId);
    
    const result = await supabase
      .from('coin_transactions')
      .select('id, amount, transaction_type, description, created_at, session_id')
      .eq('user_id', userId);

    if (result.error) {
      console.error('❌ Error fetching coin transactions:', result.error);
      return;
    }

    console.log('💰 DEBUG: Found', result.data?.length || 0, 'coin transactions:');
    
    let totalCoins = 0;
    result.data?.forEach((transaction: any, index: number) => {
      totalCoins += transaction.amount;
      console.log(`💰 Transaction ${index + 1}:`, {
        amount: transaction.amount,
        type: transaction.transaction_type,
        description: transaction.description,
        date: new Date(transaction.created_at).toLocaleString(),
        sessionId: transaction.session_id
      });
    });
    
    console.log('💰 DEBUG: Total coins from all transactions:', totalCoins);
    
    return result.data;
  } catch (error) {
    console.error('🔍 DEBUG: Error in debugUserCoinTransactions:', error);
  }
}; 