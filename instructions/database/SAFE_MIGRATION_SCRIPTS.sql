-- SAFE MIGRATION SCRIPTS FOR TASKS 1.29-1.32
-- This version can be run multiple times safely
-- THESE PRESERVE YOUR EXISTING DATA

-- ===============================
-- STEP 1: Add new fields to existing users table
-- ===============================

-- Add focus_score field (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'focus_score'
    ) THEN
        ALTER TABLE public.users ADD COLUMN focus_score INTEGER DEFAULT 0 NOT NULL;
        COMMENT ON COLUMN public.users.focus_score IS 'Score tracking focus achievements: +10 for daily wins, -5 for losses';
    END IF;
END $$;

-- Add win_streak field (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'win_streak'
    ) THEN
        ALTER TABLE public.users ADD COLUMN win_streak INTEGER DEFAULT 0 NOT NULL;
        COMMENT ON COLUMN public.users.win_streak IS 'Consecutive days won. Resets to 0 on any loss';
    END IF;
END $$;

-- Add total_coins field (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'total_coins'
    ) THEN
        ALTER TABLE public.users ADD COLUMN total_coins INTEGER DEFAULT 0 NOT NULL;
        COMMENT ON COLUMN public.users.total_coins IS 'Total accumulated coins from all transactions';
    END IF;
END $$;

-- ===============================
-- STEP 2: Create challenge_history table (only if it doesn't exist)
-- ===============================

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

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_challenge_history_user_id ON public.challenge_history(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_history_date ON public.challenge_history(challenge_date);
CREATE INDEX IF NOT EXISTS idx_challenge_history_user_date ON public.challenge_history(user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_challenge_history_outcome ON public.challenge_history(outcome);

-- ===============================
-- STEP 3: Set up RLS policies (drop and recreate safely)
-- ===============================

-- Enable RLS (safe to run multiple times)
ALTER TABLE public.challenge_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe if they don't exist)
DROP POLICY IF EXISTS "Users can view their own challenge history" ON public.challenge_history;
DROP POLICY IF EXISTS "Users can insert their own challenge history" ON public.challenge_history;
DROP POLICY IF EXISTS "Users can update their own challenge history" ON public.challenge_history;
DROP POLICY IF EXISTS "Users can delete their own challenge history" ON public.challenge_history;

-- Create policies (now safe since we dropped them first)
CREATE POLICY "Users can view their own challenge history" ON public.challenge_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge history" ON public.challenge_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge history" ON public.challenge_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge history" ON public.challenge_history
    FOR DELETE USING (auth.uid() = user_id);

-- ===============================
-- STEP 4: Create/recreate trigger function and trigger
-- ===============================

-- Create or replace the function (safe to run multiple times)
CREATE OR REPLACE FUNCTION update_challenge_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (safe approach)
DROP TRIGGER IF EXISTS update_challenge_history_updated_at ON public.challenge_history;
CREATE TRIGGER update_challenge_history_updated_at
    BEFORE UPDATE ON public.challenge_history
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_history_updated_at();

-- ===============================
-- STEP 5: Grant permissions (safe to run multiple times)
-- ===============================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_history TO authenticated;

-- ===============================
-- STEP 6: Add table and column comments (safe to run multiple times)
-- ===============================

COMMENT ON TABLE public.challenge_history IS 'Daily challenge outcomes for calendar view tracking wins and losses';
COMMENT ON COLUMN public.challenge_history.outcome IS 'Either win or loss for the daily challenge';
COMMENT ON COLUMN public.challenge_history.user_net_coins IS 'User net coins on this challenge date';
COMMENT ON COLUMN public.challenge_history.opponent_net_coins IS 'Opponent net coins on this challenge date';
COMMENT ON COLUMN public.challenge_history.challenge_date IS 'Date of the challenge (one record per day per user)';

-- ===============================
-- STEP 7: Verification queries
-- ===============================

-- Check that new user columns exist
SELECT 
    'USER COLUMNS CHECK' as check_type,
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('focus_score', 'win_streak', 'total_coins')
ORDER BY column_name;

-- Check that challenge_history table exists
SELECT 
    'CHALLENGE_HISTORY TABLE CHECK' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'challenge_history';

-- Check RLS policies
SELECT 
    'RLS POLICIES CHECK' as check_type,
    policyname
FROM pg_policies 
WHERE tablename = 'challenge_history'
ORDER BY policyname;

-- Final success message
SELECT 'MIGRATION COMPLETED SUCCESSFULLY! All new fields and tables are ready.' as status; 