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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_created_at ON focus_sessions(created_at);

-- Row Level Security (RLS) Policies
-- Enable RLS on table
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can insert their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update their own focus sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can manage their own focus sessions" ON focus_sessions;

-- Focus Sessions Policies - Allow cross-user access for opponent stats
CREATE POLICY "Authenticated users can view all focus sessions" ON focus_sessions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own focus sessions" ON focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions" ON focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE ON focus_sessions TO authenticated;

-- Comments for documentation
COMMENT ON TABLE focus_sessions IS 'Tracks focus sessions started by users with completion status and coin rewards'; 