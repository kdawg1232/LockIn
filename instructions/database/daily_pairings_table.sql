-- Daily pairings table for group member matchups
CREATE TABLE IF NOT EXISTS daily_pairings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    pairs JSONB NOT NULL, -- Array of pairs with user IDs and extra pairing flag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, date) -- Ensures one pairing set per group per day
);

-- Index for faster lookups by group and date
CREATE INDEX IF NOT EXISTS daily_pairings_group_date_idx ON daily_pairings(group_id, date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update the updated_at column
CREATE TRIGGER update_daily_pairings_updated_at
    BEFORE UPDATE ON daily_pairings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 