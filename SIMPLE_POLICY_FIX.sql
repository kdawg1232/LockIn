-- Simple Policy Fix for LockIn App
-- Run this to fix the RLS policies without conflicts

-- First, drop ALL existing policies to start clean
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies from focus_sessions
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'focus_sessions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON focus_sessions';
    END LOOP;
    
    -- Drop all policies from coin_transactions  
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'coin_transactions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON coin_transactions';
    END LOOP;
END $$;

-- Now create the correct policies
-- Focus Sessions Policies
CREATE POLICY "focus_sessions_select_all" ON focus_sessions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "focus_sessions_insert_own" ON focus_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "focus_sessions_update_own" ON focus_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Coin Transactions Policies  
CREATE POLICY "coin_transactions_select_all" ON coin_transactions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "coin_transactions_insert_any" ON coin_transactions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "coin_transactions_update_own" ON coin_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Verify the policies were created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Can read'
        WHEN cmd = 'INSERT' THEN 'Can create' 
        WHEN cmd = 'UPDATE' THEN 'Can modify'
        ELSE cmd 
    END as permission
FROM pg_policies 
WHERE tablename IN ('focus_sessions', 'coin_transactions')
ORDER BY tablename, cmd; 