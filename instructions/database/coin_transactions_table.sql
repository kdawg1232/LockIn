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
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_session_id ON coin_transactions(session_id);

-- Row Level Security (RLS) Policies
-- Enable RLS on table
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can insert their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can update their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can manage their own coin transactions" ON coin_transactions;
DROP POLICY IF EXISTS "Users can manage coin transactions" ON coin_transactions;

-- Coin Transactions Policies - More permissive for opponent stats
CREATE POLICY "Authenticated users can view all coin transactions" ON coin_transactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert coin transactions" ON coin_transactions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own coin transactions" ON coin_transactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coin transactions" ON coin_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON coin_transactions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE coin_transactions IS 'Records all coin transactions (gains and losses) for users';
COMMENT ON COLUMN coin_transactions.amount IS 'Positive values for gains, negative for losses';
COMMENT ON COLUMN coin_transactions.transaction_type IS 'Type of transaction: focus_session, social_penalty, bonus, or other'; 