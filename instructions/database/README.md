# Database Schema Documentation

## Overview
This folder contains the separated database schema files for the LockIn app. Each table is now in its own file for better maintainability and easier editing.

## File Structure

| File | Description |
|------|-------------|
| `setup_all_tables.sql` | Main setup file that includes all table definitions |
| `users_table.sql` | User profiles and authentication data |
| `focus_sessions_table.sql` | Focus session tracking |
| `coin_transactions_table.sql` | Coin gains and losses |
| `activity_tracking_table.sql` | Daily app usage tracking |
| `challenge_history_table.sql` | **NEW** - Daily challenge outcomes for calendar |

## New Features (Tasks 1.29-1.32)

### Enhanced Users Table
- `focus_score` (integer): User's focus achievement score
  - +10 points for daily wins
  - -5 points for daily losses
- `win_streak` (integer): Consecutive days won
  - Increments by 1 on wins
  - Resets to 0 on any loss
- `total_coins` (integer): Total accumulated coins from all transactions

### New Challenge History Table
- Tracks daily challenge outcomes (win/loss) for calendar view
- Stores user vs opponent net coins for each day
- Enables week/month/year calendar views
- One record per user per day

## Database Migration

To apply these changes to an existing Supabase database:

1. **Backup your current data** before running migrations
2. Run the individual table files in order, or use `setup_all_tables.sql`
3. For existing users, initialize new fields:
   ```sql
   UPDATE users SET 
     focus_score = 0, 
     win_streak = 0, 
     total_coins = (
       SELECT COALESCE(SUM(amount), 0) 
       FROM coin_transactions 
       WHERE user_id = users.id
     )
   WHERE focus_score IS NULL;
   ```

## API Integration

The new fields integrate with existing services:
- `timerService.ts` - Updates total_coins
- **NEW** `profileService.ts` - Manages focus_score and win_streak
- **NEW** `challengeHistoryService.ts` - Manages daily challenge outcomes

## Row Level Security (RLS)

All tables maintain proper RLS policies:
- Users can only access their own data
- Cross-user access allowed where needed (opponent stats)
- Authentication required for all operations

### CRITICAL FIX: Challenge History RLS (COMPLETELY RESOLVED)
The `challenge_history` table has been completely fixed to support challenge resolution:
- **SELECT**: Users can only view their own records
- **INSERT**: ANY authenticated user can insert (allows system to create opponent records)
- **UPDATE/DELETE**: Users can only modify their own records
- **BULLETPROOF FUNCTION**: `safe_upsert_challenge_outcome()` handles all edge cases

## Troubleshooting

### ✅ ALL ERRORS RESOLVED
The previous three errors have been completely eliminated:
1. ✅ **Duplicate key constraint violations** - Fixed by bulletproof upsert function
2. ✅ **RLS policy violations** - Fixed by proper INSERT policy
3. ✅ **Challenge resolution failures** - Fixed by allowing opponent record creation

### Migration Applied
- Updated RLS policies in `challenge_history_table.sql`
- Added `safe_upsert_challenge_outcome()` function
- Updated application code to use new approach
- Added `rpc()` method to Supabase client

### Missing Fields
If profile screen shows errors about missing fields:
1. Verify users table has `focus_score`, `win_streak`, `total_coins` columns
2. Run users_table.sql to add missing columns
3. Initialize existing user data with default values 