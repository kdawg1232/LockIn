-- Challenge History Table
-- Tracks daily challenge outcomes for calendar view (Task 1.32)
-- Records whether user won or lost each day's challenge
CREATE TABLE IF NOT EXISTS challenge_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_date DATE NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('win', 'loss')), -- 'win' or 'loss'
    user_net_coins INTEGER NOT NULL DEFAULT 0, -- User's net coins for the day
    opponent_net_coins INTEGER NOT NULL DEFAULT 0, -- Opponent's net coins for the day
    opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Reference to opponent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, challenge_date) -- One record per user per day
);

-- Create indexes for performance
CREATE INDEX idx_challenge_history_user_id ON challenge_history(user_id);
CREATE INDEX idx_challenge_history_date ON challenge_history(challenge_date);
CREATE INDEX idx_challenge_history_user_date ON challenge_history(user_id, challenge_date);
CREATE INDEX idx_challenge_history_outcome ON challenge_history(outcome);

-- Enable RLS
ALTER TABLE challenge_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see their own challenge history
CREATE POLICY "Users can view their own challenge history" ON challenge_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge history" ON challenge_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge history" ON challenge_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenge history" ON challenge_history
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_challenge_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_challenge_history_updated_at
    BEFORE UPDATE ON challenge_history
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_history_updated_at();

-- Grant proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON challenge_history TO authenticated;

-- Add helpful comments
COMMENT ON TABLE challenge_history IS 'Daily challenge outcomes for calendar view tracking wins and losses';
COMMENT ON COLUMN challenge_history.outcome IS 'Either win or loss for the daily challenge';
COMMENT ON COLUMN challenge_history.user_net_coins IS 'User net coins on this challenge date';
COMMENT ON COLUMN challenge_history.opponent_net_coins IS 'Opponent net coins on this challenge date';
COMMENT ON COLUMN challenge_history.challenge_date IS 'Date of the challenge (one record per day per user)'; 