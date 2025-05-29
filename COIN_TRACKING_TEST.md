# Coin Tracking Test Guide

## Testing User Coin Tracking

### Test 1: Complete Focus Session
1. Navigate to StatsScreen and note current "Coins Gained" (should start at 0)
2. Click "Lock In" to go to TimerDistractionScreen
3. Click "Start Focus Session"
4. Wait for 30-second timer to complete
5. **Expected**: Modal appears saying "You have earned 2 coins!"
6. Click "Continue" and navigate back to StatsScreen
7. **Expected**: User's "Coins Gained" should now show "+2"
8. **Expected**: User's "Net Coins" should show "+2"

### Test 2: Multiple Sessions
1. Complete another focus session (repeat Test 1)
2. **Expected**: User's "Coins Gained" should show "+4"
3. **Expected**: User's "Net Coins" should show "+4"

## Testing Opponent Coin Tracking (Manual)

### Test 3: Real Opponent Activity
1. **Setup**: Create a second user account or have a friend create an account
2. On your main account, navigate to StatsScreen and note opponent's current stats (should start at 0)
3. **Switch to opponent account**: Log out and log into the opponent's account
4. **Complete focus session as opponent**: 
   - Navigate to StatsScreen → Lock In → Start Focus Session
   - Complete the 30-second timer
   - See "You have earned 2 coins!" modal
5. **Switch back to your account**: Log out and log back into your main account
6. **Check opponent stats**: Navigate to StatsScreen
7. **Expected**: Opponent's "Coins Gained" should now show "+2"
8. **Expected**: Opponent's "Net Coins" should show "+2"

### Test 4: Cross-User Real-Time Updates
1. **Both users active**: Have both accounts active on different devices/browsers
2. **User A completes session**: Complete focus session on User A's device
3. **User B checks stats**: Navigate to StatsScreen on User B's device
4. **Expected**: User A should appear as opponent with updated coin count
5. **Repeat vice versa**: Have User B complete a session and check User A's view

## Debug Console Logs

When testing, watch the console for these debug messages:

### User Focus Session Completion:
```
🪙 Completing focus session: {sessionId, userId, coinsAwarded}
🪙 Focus session updated successfully
🪙 Coin transaction created successfully: [transaction data]
```

### Stats Fetching:
```
📈 StatsScreen: Fetching user stats for: [userId]
📊 Fetching today's coin transactions for user: [userId]
📊 All transactions fetched: [count]
📊 Today's transactions: [filtered transactions]
📊 Calculated stats: {coinsGained, coinsLost, netCoins}
📈 StatsScreen: User stats received: [stats]
```

## Common Issues & Solutions

### ❌ Modal shows but stats don't update
- **Check**: Console logs for coin transaction creation
- **Check**: Database has `coin_transactions` table
- **Fix**: Run SQL from `DATABASE_SETUP.md`

### ❌ Stats show 0 even after completing sessions
- **Check**: Console logs for "Today's transactions" - should show filtered results
- **Check**: Date filtering logic (transactions created today)
- **Debug**: Check if transactions are being created with correct timestamps

### ❌ Opponent stats never update
- **Check**: Console logs for opponent data fetching
- **Check**: Opponent ID is valid and corresponds to a real user
- **Test**: Log into opponent account, complete a session, then log back into your account
- **Debug**: Check if opponent has actually completed any focus sessions today

### ❌ Database errors
- **Error**: "relation does not exist"
- **Fix**: Create tables using `DATABASE_SETUP.md`
- **Error**: "permission denied"
- **Fix**: Check Row Level Security policies
- **Error**: "new row violates row-level security policy"
- **Fix**: Run `FIX_RLS_POLICIES.sql` to update policies for opponent simulation

## Quick Fix for RLS Error

If you see "new row violates row-level security policy for table coin_transactions", run this SQL in Supabase:

```sql
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can manage their own coin transactions" ON coin_transactions;

-- Create permissive policy for testing
CREATE POLICY "Users can manage coin transactions" ON coin_transactions
    FOR ALL USING (auth.uid() IS NOT NULL);
```

## Expected Final State

After completing 2 user sessions and having opponent complete 1 session:

**User Card:**
- Coins Gained: +4
- Coins Lost: -0  
- Net Coins: +4

**Opponent Card:**
- Coins Gained: +2
- Coins Lost: -0
- Net Coins: +2

## Production Notes

- Real opponent data comes from actual user activity
- Consider adding coin loss scenarios (social media usage penalties)
- Add daily reset functionality for stats
- Implement real-time updates for live opponent progress 