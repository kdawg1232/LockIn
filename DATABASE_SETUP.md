# Database Setup for LockIn App

## Quick Setup Instructions

To fix the "invalid input syntax for type integer" error and get the coin tracking system working, you need to create the required tables in your Supabase database.

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Go to the "SQL Editor" tab
3. Create a new query

### Step 2: Run the Database Schema
Copy and paste the contents of `database_schema.sql` into the SQL editor and run it.

Or run these essential tables manually:

```sql
-- Focus Sessions Table
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
CREATE TABLE IF NOT EXISTS coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('focus_session', 'social_penalty', 'bonus', 'other')),
    session_id UUID REFERENCES focus_sessions(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can manage their own focus sessions" ON focus_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Updated policy for coin transactions to allow opponent simulation
-- This allows any authenticated user to create transactions for any user (needed for opponent simulation)
CREATE POLICY "Users can manage coin transactions" ON coin_transactions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: If you want more security, you can use separate policies:
-- CREATE POLICY "Users can view all coin transactions" ON coin_transactions
--     FOR SELECT USING (true);
-- CREATE POLICY "Users can create coin transactions for anyone" ON coin_transactions  
--     FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- CREATE POLICY "Users can update their own coin transactions" ON coin_transactions
--     FOR UPDATE USING (auth.uid() = user_id);
-- CREATE POLICY "Users can delete their own coin transactions" ON coin_transactions
--     FOR DELETE USING (auth.uid() = user_id);
```

### Step 3: Test the Setup
After running the SQL:
1. Try starting a focus session in the app
2. The error should be resolved
3. Coins should be tracked properly

## Common Issues

### "invalid input syntax for type integer"
- **Cause**: The `duration_minutes` field expects an INTEGER
- **Fix**: I've updated the code to use `1` minute instead of `0.5`

### "relation does not exist"
- **Cause**: Tables haven't been created yet
- **Fix**: Run the SQL schema above

### "permission denied"
- **Cause**: Row Level Security policies not set up
- **Fix**: The policies above should resolve this

## MVP Testing Settings

For faster testing, the app is currently configured with:
- **Timer duration**: 30 seconds (instead of 5 minutes)
- **New opponent cycle**: 20 minutes (instead of 24 hours)
- **Database duration**: 1 minute (closest integer to 30 seconds)

These can be changed back to production values later. 