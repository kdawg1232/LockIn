-- Fixed Database Schema for LockIn App Coin Tracking System
-- This addresses RLS policy issues and supports opponent stats viewing

-- Focus Sessions Table
-- Tracks all focus sessions started by users
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    coins_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coin Transactions Table  
-- Records all coin gains and losses for users
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for gains, negative for losses
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('focus_session', 'social_penalty', 'bonus', 'other')),
    session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_created_at ON focus_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_session_id ON coin_transactions(session_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on both tables
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can view their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can insert their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can manage their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can manage coin transactions" ON coin_transactions;

-- FIXED POLICIES: Allow cross-user access needed for opponent stats

-- Focus Sessions Policies
CREATE POLICY "Authenticated users can view all focus sessions" ON focus_sessions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own focus sessions" ON focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions" ON focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Coin Transactions Policies (More permissive for opponent stats)
CREATE POLICY "Authenticated users can view all coin transactions" ON coin_transactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert coin transactions" ON coin_transactions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own coin transactions" ON coin_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coin transactions" ON coin_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Optional: Create a view for easy stats calculation
CREATE OR REPLACE VIEW user_daily_stats AS
SELECT 
    user_id,
    DATE(created_at) as date,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as coins_gained,
    ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) as coins_lost,
    SUM(amount) as net_coins
FROM coin_transactions
GROUP BY user_id, DATE(created_at);

-- Grant access to the view
GRANT SELECT ON user_daily_stats TO authenticated;

-- Test the setup by checking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('focus_sessions', 'coin_transactions')
ORDER BY tablename, policyname;

-- Comments for documentation
COMMENT ON TABLE focus_sessions IS 'Tracks focus sessions started by users with completion status and coin rewards';
COMMENT ON TABLE coin_transactions IS 'Records all coin transactions (gains and losses) for users';
COMMENT ON COLUMN coin_transactions.amount IS 'Positive values for gains, negative for losses';
COMMENT ON COLUMN coin_transactions.transaction_type IS 'Type of transaction: focus_session, social_penalty, bonus, or other';
COMMENT ON VIEW user_daily_stats IS 'Aggregated daily coin statistics per user for easy querying';

-- Verification queries (uncomment to test):
-- INSERT INTO coin_transactions (user_id, amount, transaction_type, description) 
-- VALUES (auth.uid(), 2, 'focus_session', 'Test transaction');
-- 
-- SELECT * FROM coin_transactions WHERE user_id = auth.uid(); 