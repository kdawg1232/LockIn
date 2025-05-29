-- Fix RLS Policies for LockIn App
-- Run this in your Supabase SQL Editor to fix the coin tracking errors

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can manage their own coin transactions" ON coin_transactions;

-- Create a more permissive policy for testing (allows opponent simulation)
CREATE POLICY "Users can manage coin transactions" ON coin_transactions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'coin_transactions';

-- Test the policy by checking if you can insert a test transaction
-- (Replace 'your-user-id' with an actual user ID from your auth.users table)
-- INSERT INTO coin_transactions (user_id, amount, transaction_type, description) 
-- VALUES ('your-user-id', 2, 'focus_session', 'Test transaction');

-- If you want to see all users in your system:
-- SELECT id, email FROM auth.users; 