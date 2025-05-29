# Debug Guide: Coins Not Adding to User Stats

## Step-by-Step Debugging

### Step 1: Complete a Focus Session
1. Navigate to StatsScreen and note current stats
2. Click "Lock In" → Start Focus Session
3. Wait for 30-second timer to complete
4. **Watch console logs** for these messages:

```
⏰ Timer completed - starting completion process
⏰ Current session exists: [session object]
⏰ User found: [user-id]
⏰ Calling completeFocusSession with: {sessionId, userId, coinsAwarded: 2}
🪙 Completing focus session: {sessionId, userId, coinsAwarded: 2}
🪙 Focus session updated successfully
💰 Adding coin transaction: {userId, amount: 2, transactionType: 'focus_session', ...}
💰 Transaction data to insert: [transaction object]
💰 Database insert result: [result]
💰 Coin transaction inserted successfully: [data]
🪙 Coin transaction created successfully: [transaction data]
⏰ completeFocusSession result: {success: true, error: null}
⏰ Global timer cleared, showing completion modal
```

### Step 2: Check Modal and Return to Stats
1. **Expected**: "You have earned 2 coins!" modal appears
2. Click "Continue"
3. **Watch console logs** for:

```
📈 StatsScreen focused - refreshing coin data for user: [user-id]
📈 StatsScreen: Fetching user stats for: [user-id]
📊 Fetching today's coin transactions for user: [user-id]
📊 All transactions fetched: [number]
📊 Today's transactions: [filtered array]
📊 Calculated stats: {coinsGained: 2, coinsLost: 0, netCoins: 2}
📈 StatsScreen: User stats received: [stats object]
```

### Step 3: Manual Debug Check
1. On StatsScreen, click "🔍 Debug Refresh Stats" button
2. Check the alert message - should show updated coin counts
3. **Watch console logs** for manual refresh process

## Common Issues & Solutions

### ❌ Issue 1: Timer completes but no completion logs
**Problem**: Timer completion handler not being called
**Check**: Look for `⏰ Timer completed` log
**Solution**: Check if timer is actually reaching 0 seconds

### ❌ Issue 2: Session completion fails
**Problem**: Database update or coin transaction fails
**Check**: Look for error logs with `🪙` or `💰` prefixes
**Possible causes**:
- Database tables don't exist
- RLS policies blocking the insert
- Network connectivity issues

### ❌ Issue 3: Coin transaction created but stats don't update
**Problem**: Stats fetching or calculation issue
**Check**: Look for `📊 Today's transactions` log
**Possible causes**:
- Date filtering issue (transaction created tomorrow/yesterday)
- Stats calculation logic error
- StatsScreen not refreshing properly

### ❌ Issue 4: Stats refresh but UI doesn't update
**Problem**: React state not updating
**Check**: Compare console logs vs UI display
**Solution**: Check if `setUserStats` is being called

## Quick Database Check

If you want to manually verify the database, run this SQL in Supabase:

```sql
-- Check if coin transactions are being created
SELECT * FROM coin_transactions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if focus sessions are being completed
SELECT * FROM focus_sessions 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Expected Console Output (Success Case)

When everything works correctly, you should see this sequence:

1. **Timer Completion**: `⏰` logs showing session completion
2. **Database Updates**: `🪙` and `💰` logs showing successful DB operations  
3. **Stats Refresh**: `📈` and `📊` logs showing data fetching
4. **UI Update**: User card shows "+2" coins gained

If any step is missing, that's where the issue lies! 