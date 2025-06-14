-- SAFE MIGRATION SCRIPTS FOR TASKS 1.29-1.32
-- Run these in Supabase SQL Editor to add new functionality
-- THESE PRESERVE YOUR EXISTING DATA

-- ===============================
-- STEP 1: Add new fields to existing users table
-- ===============================

-- Add focus_score field (default 0 for existing users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS focus_score INTEGER DEFAULT 0 NOT NULL;

-- Add win_streak field (default 0 for existing users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS win_streak INTEGER DEFAULT 0 NOT NULL;

-- Add total_coins field (default 0 for existing users)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS total_coins INTEGER DEFAULT 0 NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.users.focus_score IS 'Score tracking focus achievements: +10 for daily wins, -5 for losses';
COMMENT ON COLUMN public.users.win_streak IS 'Consecutive days won. Resets to 0 on any loss';
COMMENT ON COLUMN public.users.total_coins IS 'Total accumulated coins from all transactions';

-- ===============================
-- STEP 2: Create new challenge_history table
-- ===============================

-- Create challenge history table for calendar functionality
CREATE TABLE IF NOT EXISTS public.challenge_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss')),
    user_net_coins INTEGER NOT NULL DEFAULT 0,
    opponent_net_coins INTEGER NOT NULL DEFAULT 0,
    opponent_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_history_user_id ON public.challenge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_history_date ON public.challenge_history(challenge_date);
CREATE INDEX IF NOT EXISTS idx_challenge_history_user_date ON public.challenge_history(user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_challenge_history_outcome ON public.challenge_history(outcome);

-- ===============================
-- STEP 3: Set up RLS policies for challenge_history
-- ===============================

-- Enable RLS
ALTER TABLE public.challenge_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own challenge history
CREATE POLICY "Users can view their own challenge history" ON public.challenge_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge history" ON public.challenge_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge history" ON public.challenge_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge history" ON public.challenge_history
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- STEP 4: Create trigger for updated_at
-- ===============================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenge_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_challenge_history_updated_at ON public.challenge_history;
CREATE TRIGGER update_challenge_history_updated_at
    BEFORE UPDATE ON public.challenge_history
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_history_updated_at();

-- ===============================
-- STEP 5: Grant permissions
-- ===============================

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_history TO authenticated;

-- ===============================
-- STEP 6: Initialize total_coins for existing users (OPTIONAL)
-- ===============================

-- Uncomment this if you want to calculate total_coins from existing transactions
-- This will set total_coins = sum of all coin_transactions for each user
/*
UPDATE public.users 
SET total_coins = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.coin_transactions 
    WHERE user_id = users.id
)
WHERE total_coins = 0;
*/

-- ===============================
-- STEP 7: Add helpful comments
-- ===============================

COMMENT ON TABLE public.challenge_history IS 'Daily challenge outcomes for calendar view tracking wins and losses';
COMMENT ON COLUMN public.challenge_history.outcome IS 'Either win or loss for the daily challenge';
COMMENT ON COLUMN public.challenge_history.user_net_coins IS 'User net coins on this challenge date';
COMMENT ON COLUMN public.challenge_history.opponent_net_coins IS 'Opponent net coins on this challenge date';
COMMENT ON COLUMN public.challenge_history.challenge_date IS 'Date of the challenge (one record per day per user)';

-- ===============================
-- VERIFICATION QUERIES
-- ===============================

-- Verify new columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('focus_score', 'win_streak', 'total_coins');

-- Verify challenge_history table was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'challenge_history';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'challenge_history'
ORDER BY policyname;

-- Migration complete!
SELECT 'Migration completed successfully! New fields added and challenge_history table created.' AS status; 