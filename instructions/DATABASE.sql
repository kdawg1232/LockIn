-- Users Database

-- Drop existing table
drop table if exists public.users;

-- Recreate users table with new fields
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text unique not null,
  username text unique not null,
  first_name text not null,
  last_name text not null,
  university text,
  major text,
  avatar_url text,
  profile_completed boolean default false
);

-- Enable RLS
alter table public.users enable row level security;

-- Create policies
create policy "Users can read their own data" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on public.users
  for update using (auth.uid() = id);

create policy "Enable insert for authentication users only" on public.users
  for insert
  with check (true);

-- Create indexes for performance
create index users_email_idx on public.users (email);
create index users_username_idx on public.users (username);



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

-- Activity Tracking Table
-- Tracks daily social media app usage and coin penalties
-- Designed for Screen Time API integration on iOS
-- Fix Activity Tracking Table RLS Policies
-- This script fixes the Row Level Security policies to allow opponent stats viewing

-- First, drop the existing table and recreate with correct policies
DROP TABLE IF EXISTS activity_tracking CASCADE;

-- Recreate activity tracking table
CREATE TABLE activity_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_coins_lost INTEGER NOT NULL DEFAULT 0,
    app_usage JSONB NOT NULL DEFAULT '[]', -- Array of app usage data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_activity_tracking_user_id ON activity_tracking(user_id);
CREATE INDEX idx_activity_tracking_date ON activity_tracking(date);
CREATE INDEX idx_activity_tracking_user_date ON activity_tracking(user_id, date);

-- Enable RLS
ALTER TABLE activity_tracking ENABLE ROW LEVEL SECURITY;

-- FIXED RLS Policies: Allow cross-user access for opponent stats (similar to coin_transactions)
CREATE POLICY "Authenticated users can view all activity data" ON activity_tracking
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activity data" ON activity_tracking
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own activity data" ON activity_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity data" ON activity_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_activity_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_activity_tracking_updated_at
    BEFORE UPDATE ON activity_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_activity_tracking_updated_at();

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_tracking TO authenticated;

-- Add helpful comments
COMMENT ON TABLE activity_tracking IS 'Daily social media app usage tracking for coin penalty calculations - allows cross-user viewing for opponent stats';
COMMENT ON COLUMN activity_tracking.app_usage IS 'JSONB array containing app usage data with time spent and coins lost per app';
COMMENT ON COLUMN activity_tracking.total_coins_lost IS 'Total coins lost for the day calculated from app usage (1 coin per 15 minutes)';

-- Verify the policies are created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'activity_tracking'
ORDER BY policyname; 