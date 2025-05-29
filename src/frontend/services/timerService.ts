import supabase from '../../lib/supabase';

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

    // Return the created session data
    return { data: result.data?.[0] || null, error: null };
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
      console.error('Error completing focus session:', sessionResult.error);
      return { success: false, error: sessionResult.error };
    }

    // Create a coin transaction for the awarded coins
    const coinResult = await addCoinTransaction(
      userId,
      coinsAwarded,
      'focus_session',
      sessionId,
      `Completed ${5}-minute focus session`
    );

    if (coinResult.error) {
      console.error('Error adding coin transaction:', coinResult.error);
      return { success: false, error: coinResult.error };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error in completeFocusSession:', error);
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
    const transactionData: CreateCoinTransactionData = {
      user_id: userId,
      amount,
      transaction_type: transactionType,
      session_id: sessionId,
      description: description || `${transactionType} transaction`
    };

    const result = await supabase.from('coin_transactions').insert(transactionData);
    
    if (result.error) {
      console.error('Error adding coin transaction:', result.error);
      return { data: null, error: result.error };
    }

    return { data: result.data?.[0] || null, error: null };
  } catch (error) {
    console.error('Error in addCoinTransaction:', error);
    return { data: null, error: 'Failed to add coin transaction' };
  }
};

/**
 * Get user's total coins from all transactions
 * Calculates the sum of all coin transactions for a user
 */
export const getUserTotalCoins = async (userId: string): Promise<{ totalCoins: number; error: string | null }> => {
  try {
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
 * Get user's coin transactions for today
 * Returns transactions from the current day for stats display
 */
export const getTodaysCoinTransactions = async (userId: string): Promise<{ 
  coinsGained: number; 
  coinsLost: number; 
  netCoins: number; 
  error: string | null 
}> => {
  try {
    // Get start and end of today in ISO format
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Note: This would ideally use date range filtering in Supabase
    // For now, we'll fetch all transactions and filter client-side
    const result = await supabase
      .from('coin_transactions')
      .select('amount, created_at')
      .eq('user_id', userId);

    if (result.error) {
      console.error('Error fetching today\'s transactions:', result.error);
      return { coinsGained: 0, coinsLost: 0, netCoins: 0, error: result.error };
    }

    // Filter transactions for today and calculate stats
    const todaysTransactions = result.data?.filter((transaction: any) => {
      const transactionDate = new Date(transaction.created_at);
      return transactionDate >= new Date(startOfDay) && transactionDate < new Date(endOfDay);
    }) || [];

    const coinsGained = todaysTransactions
      .filter((t: any) => t.amount > 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const coinsLost = Math.abs(todaysTransactions
      .filter((t: any) => t.amount < 0)
      .reduce((sum: number, t: any) => sum + t.amount, 0));
    
    const netCoins = coinsGained - coinsLost;

    return { coinsGained, coinsLost, netCoins, error: null };
  } catch (error) {
    console.error('Error in getTodaysCoinTransactions:', error);
    return { coinsGained: 0, coinsLost: 0, netCoins: 0, error: 'Failed to fetch today\'s transactions' };
  }
}; 