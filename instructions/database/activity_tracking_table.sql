-- Activity Tracking Table
-- Tracks daily social media app usage and coin penalties
-- Designed for Screen Time API integration on iOS

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

-- RLS Policies: Allow cross-user access for opponent stats (similar to coin_transactions)
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