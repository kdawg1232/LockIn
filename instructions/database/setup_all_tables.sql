-- Main Database Setup File for LockIn App
-- This file should be run to set up all tables and configurations
-- 
-- Execute these files in order:
-- 1. users_table.sql
-- 2. focus_sessions_table.sql  
-- 3. coin_transactions_table.sql
-- 4. activity_tracking_table.sql
-- 5. challenge_history_table.sql
--
-- Or run this script which includes all table definitions:

-- ===============================
-- USERS TABLE
-- ===============================
\i users_table.sql

-- ===============================
-- FOCUS SESSIONS TABLE
-- ===============================
\i focus_sessions_table.sql

-- ===============================
-- COIN TRANSACTIONS TABLE
-- ===============================
\i coin_transactions_table.sql

-- ===============================
-- ACTIVITY TRACKING TABLE
-- ===============================
\i activity_tracking_table.sql

-- ===============================
-- CHALLENGE HISTORY TABLE (NEW)
-- ===============================
\i challenge_history_table.sql

-- ===============================
-- VERIFICATION QUERIES
-- ===============================

-- Test the setup by checking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'focus_sessions', 'coin_transactions', 'activity_tracking', 'challenge_history')
ORDER BY tablename, policyname;

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'focus_sessions', 'coin_transactions', 'activity_tracking', 'challenge_history')
ORDER BY table_name;

-- Database setup complete
-- New features added for tasks 1.29-1.32:
-- - users.focus_score: Tracks user focus achievements (+10 wins, -5 losses)
-- - users.win_streak: Consecutive days won (resets on loss)
-- - users.total_coins: Total accumulated coins
-- - challenge_history: Daily win/loss tracking for calendar view 