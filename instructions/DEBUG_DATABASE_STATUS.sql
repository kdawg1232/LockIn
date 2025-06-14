-- DEBUG SCRIPT: Check Database Status for Tasks 1.29-1.32
-- Run this in Supabase SQL Editor to see what's missing

-- ===============================
-- CHECK 1: Do the new columns exist in users table?
-- ===============================
SELECT 
  'USERS TABLE COLUMNS' as check_type,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('focus_score', 'win_streak', 'total_coins')
ORDER BY column_name;

-- ===============================
-- CHECK 2: Does challenge_history table exist?
-- ===============================
SELECT 
  'CHALLENGE_HISTORY TABLE' as check_type,
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'challenge_history';

-- ===============================
-- CHECK 3: What columns does challenge_history have?
-- ===============================
SELECT 
  'CHALLENGE_HISTORY COLUMNS' as check_type,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'challenge_history' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===============================
-- CHECK 4: Are there any RLS policies on challenge_history?
-- ===============================
SELECT 
  'RLS POLICIES' as check_type,
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'challenge_history'
ORDER BY policyname;

-- ===============================
-- CHECK 5: Show current users table structure
-- ===============================
SELECT 
  'ALL USERS COLUMNS' as check_type,
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===============================
-- RESULTS INTERPRETATION:
-- ===============================
-- If you see 0 rows for CHECK 1: You need to run the migration script
-- If you see 0 rows for CHECK 2: The challenge_history table doesn't exist
-- If you see errors: There might be permission issues

SELECT 'Database status check complete. Review results above.' as status; 