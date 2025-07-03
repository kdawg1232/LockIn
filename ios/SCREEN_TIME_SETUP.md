# 📱 Production Screen Time Setup Guide

This guide helps you integrate real Apple Screen Time monitoring into your LockIn app for production coin penalties.

## ⚠️ Critical: DeviceActivityMonitor Extension Required

Apple's Screen Time API requires a **separate App Extension** to monitor usage in the background. The main app cannot monitor usage directly.

## 🔧 Xcode Project Setup

### 1. Add DeviceActivityMonitor Extension Target

1. Open your project in Xcode
2. Click **File** → **New** → **Target**
3. Select **iOS** → **App Extension** → **Device Activity Monitor**
4. Configure the extension:
   - **Product Name**: `DeviceActivityMonitorExtension`
   - **Bundle Identifier**: `com.karthikdigavalli.lockin.deviceactivity`
   - **Language**: Swift
   - **Team**: Your development team

### 2. Replace Generated Extension Code

1. Delete the auto-generated `DeviceActivityMonitorExtension.swift` file
2. Copy our production extension from: `ios/LockIn/DeviceActivityMonitorExtension/DeviceActivityMonitorExtension.swift`
3. Copy the Info.plist from: `ios/LockIn/DeviceActivityMonitorExtension/Info.plist`

### 3. Configure App Groups (Required for Communication)

1. Select your **main app target** in Xcode
2. Go to **Signing & Capabilities**
3. Add **App Groups** capability
4. Create/select group: `group.com.karthikdigavalli.lockin.deviceactivity`

5. Select your **extension target**
6. Go to **Signing & Capabilities**
7. Add **App Groups** capability
8. Use the same group: `group.com.karthikdigavalli.lockin.deviceactivity`

### 4. Add Required Frameworks

**Main App Target:**
- `DeviceActivity.framework`
- `FamilyControls.framework`
- `ManagedSettings.framework`

**Extension Target:**
- `DeviceActivity.framework`
- `FamilyControls.framework`
- `ManagedSettings.framework`

### 5. Update App Permissions

Add to your main app's `Info.plist`:

```xml
<key>NSFamilyControlsUsageDescription</key>
<string>LockIn needs Screen Time access to track social media usage and apply coin penalties during challenges.</string>
```

## 🎯 How It Works (Production Flow)

### 1. **User Authorization**
- App requests Screen Time permission via `ScreenTimeManager.requestScreenTimeAuthorization()`
- Apple shows system permission dialog

### 2. **Extension Monitoring**
- `DeviceActivityMonitorExtension` runs in background
- Monitors ALL app usage (system-level monitoring)
- Filters for social media apps we care about

### 3. **Real Coin Penalties**
- Extension detects 15+ minutes of social media usage
- Immediately sends event to main app
- Main app deducts coins from user's account
- Usage data stored in your database

### 4. **Data Flow**
```
User opens Instagram → iOS monitors usage → 15 min threshold → Extension fires → 
Main app receives event → Coin deducted → Database updated → UI updates
```

## 🚨 Testing Production Implementation

### 1. Enable Screen Time
1. iOS Settings → Screen Time → Turn On Screen Time
2. Make sure data is being collected

### 2. Test Authorization
```typescript
const authorized = await activityTrackingService.requestScreenTimeAuthorization();
console.log('Screen Time authorized:', authorized);
```

### 3. Test Monitoring
```typescript
// Start monitoring
await ScreenTimeManager.configureSocialMediaApps();

// Check status
const status = await ScreenTimeManager.getMonitoringStatus();
console.log('Monitoring active:', status.isActive);
```

### 4. Test Real Usage
1. Use Instagram/TikTok for 15+ minutes
2. Check console logs for threshold events
3. Verify coin deduction in database

## 📊 Real Data Verification

### Check Extension Data
```typescript
// Get real usage data
const usage = await ScreenTimeManager.getCurrentTrackedUsage();
console.log('Real usage detected:', usage);

// Check monitoring status
const status = await ScreenTimeManager.getMonitoringStatus();
console.log('Total usage minutes:', status.totalUsageMinutes);
```

### Database Verification
- Check `activity_tracking` table for real usage records
- Check `coin_transactions` table for penalty transactions
- Verify `reason` field shows "social_penalty"

## 🔍 Debugging

### Extension Logs
Extension logs appear in Xcode console when device is connected:
```
📱 [Extension] Monitoring started for: LockInSocialMediaMonitor
📱 [Extension] ⚠️ THRESHOLD REACHED: fifteenMinutePenalty
📱 [Extension] 🚨 15-minute social media usage detected
```

### Main App Logs
```
📱 [ScreenTime] 🚨 REAL coin penalty from extension: -1 coins for 15 minutes
📱 ✅ Production coin penalty applied successfully
```

### Common Issues

1. **No events firing**: Check App Groups configuration
2. **Permission denied**: Re-request Screen Time authorization
3. **Extension not running**: Check extension target is included in build
4. **No coin penalties**: Verify event listeners are setup

## ✅ Production Checklist

- [ ] DeviceActivityMonitor extension target added
- [ ] App Groups configured for both targets
- [ ] Required frameworks linked
- [ ] Info.plist permissions added
- [ ] Extension code replaced with our implementation
- [ ] Testing with real social media usage (15+ minutes)
- [ ] Coin penalties working in production
- [ ] Usage data storing in database
- [ ] UserStatsScreen showing real data

## 🎉 Success Indicators

When working correctly, you'll see:

1. **Real-time coin deductions** every 15 minutes of social media use
2. **Accurate usage data** in UserStatsScreen from actual Screen Time
3. **Automatic daily resets** at midnight
4. **Production logs** showing extension communication
5. **Database records** with real usage and penalties

This implementation provides **genuine Screen Time monitoring** that works even when your app is in the background - exactly what's needed for production usage tracking and coin penalties. 