# Timer Testing Guide

## Testing Persistent Global Timers

### 1. New Opponent Countdown Timer
**Expected Behavior**: Should count down from 20:00 regardless of app state

**Test Steps**:
1. Open app and navigate to StatsScreen
2. Note the countdown time (e.g., "00:19:45")
3. Close the app completely (swipe up and remove from recent apps)
4. Wait 30 seconds
5. Reopen the app and navigate back to StatsScreen
6. **Expected**: Timer should show 30 seconds less (e.g., "00:19:15")

**Alternative Test**:
1. Navigate to different screens within the app
2. **Expected**: Timer should continue counting down on all screens

### 2. Focus Session Background Timer
**Expected Behavior**: Timer should continue in background and auto-navigate on app reopen

**Test Steps**:
1. Start a focus session (30-second timer)
2. Immediately close the app or switch to another app
3. Wait 15 seconds (timer should still be running in background)
4. Reopen the LockIn app
5. **Expected**: App should automatically navigate to TimerDistractionScreen
6. **Expected**: Timer should show ~15 seconds remaining
7. Wait for timer to complete
8. **Expected**: Success modal should appear with "2 coins earned"

### 3. Focus Session Completion in Background
**Expected Behavior**: Session should complete even if app is closed

**Test Steps**:
1. Start a focus session (30-second timer)
2. Immediately close the app completely
3. Wait 35 seconds (longer than timer duration)
4. Reopen the app
5. **Expected**: App should NOT navigate to timer screen
6. Navigate to StatsScreen
7. **Expected**: User's coin count should have increased by 2

### 4. Timer Persistence Across Logout/Login
**Expected Behavior**: Opponent timer persists, focus timer is user-specific

**Test Steps**:
1. Note the opponent countdown time
2. Log out of the app
3. **Expected**: If you can see the timer while logged out, it should continue counting
4. Log back in
5. **Expected**: Opponent timer should continue from where it left off
6. **Note**: Focus sessions are user-specific and should not persist across different users

## Common Issues to Watch For

### ❌ Timer Resets
- **Problem**: Timer resets to 20:00 when navigating between screens
- **Cause**: Not using global timer service properly
- **Fix**: Ensure all screens use `globalTimerService.getNextOpponentTimeRemaining()`

### ❌ No Auto-Navigation
- **Problem**: App doesn't navigate to timer screen when reopened with active session
- **Cause**: Navigation service not properly integrated
- **Fix**: Check AppState listener and navigation reference setup

### ❌ Timer Stops in Background
- **Problem**: Focus timer stops when app is backgrounded
- **Cause**: Using local intervals instead of timestamp-based calculation
- **Fix**: Global timer service uses timestamps, not intervals

### ❌ Database Errors
- **Problem**: "invalid input syntax for type integer" errors
- **Cause**: Database schema not created or wrong data types
- **Fix**: Run the SQL from `DATABASE_SETUP.md`

## MVP Settings (Current)

- **Focus Timer**: 30 seconds (for fast testing)
- **Opponent Cycle**: 20 minutes (for fast testing)
- **Coins per Session**: 2 coins

## Production Settings (Future)

- **Focus Timer**: 5 minutes (300 seconds)
- **Opponent Cycle**: 24 hours (daily reset at 7:00 AM)
- **Coins per Session**: 2 coins (or adjust based on session length) 