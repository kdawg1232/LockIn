# 📋 Family Controls Migration Checklist

## Pre-Migration Requirements ✅
- [ ] Apple Developer Account (paid) with admin access
- [ ] Special Entitlement Request approved for Screen Time API  
- [ ] Provisioning Profile with Family Controls entitlement
- [ ] Physical iOS device for testing (15.0+)
- [ ] Xcode 15+ installed on macOS Ventura+
- [ ] EAS CLI installed: `npm install -g @expo/eas-cli`

## Step 1: Clean Ejection ✅
- [ ] Create backup branch: `git checkout -b backup-managed-workflow`
- [ ] Install prebuild config: `npm install --save-dev @expo/prebuild-config`
- [ ] Update `app.config.ts` with entitlements and Info.plist entries
- [ ] Run ejection: `npx expo prebuild --clean`
- [ ] Verify iOS/Android directories created
- [ ] Test basic app still runs: `npx expo run:ios`

## Step 2: Xcode Configuration ✅
- [ ] Open project: `open ios/LockIn.xcworkspace`
- [ ] Set Apple Developer Team in Signing & Capabilities
- [ ] Add "Family Controls" capability
- [ ] Add "Screen Time" capability (if available)
- [ ] Verify `ios/LockIn/LockIn.entitlements` contains required entitlements
- [ ] Update Bundle Identifier to match provisioning profile

## Step 3: Swift Native Module ✅
- [ ] Create directory: `mkdir -p ios/LockIn/Modules`
- [ ] Create `FamilyControlsManager.swift` with authorization and blocking methods
- [ ] Create `AppSelectionManager.swift` with SwiftUI app picker
- [ ] Add both files to Xcode project target
- [ ] Verify Swift files compile without errors

## Step 4: Objective-C Bridging ✅
- [ ] Create `FamilyControlsManager.m` bridge file
- [ ] Create `AppSelectionManager.m` bridge file  
- [ ] Add bridge files to Xcode project target
- [ ] Verify no bridging compilation errors

## Step 5: JavaScript Integration ✅
- [ ] Create `src/frontend/services/familyControlsService.ts`
- [ ] Update `src/frontend/hooks/useAppBlocking.ts`
- [ ] Add TypeScript interfaces for native modules
- [ ] Test JavaScript can call native methods (with console logs)

## Step 6: Info.plist Verification ✅
- [ ] Verify `NSFamilyControlsUsageDescription` in Info.plist
- [ ] Verify `NSScreenTimeUsageDescription` in Info.plist
- [ ] Check usage descriptions are user-friendly

## Step 7: EAS Build Setup ✅
- [ ] Update `eas.json` with entitlements for all profiles
- [ ] Create `.easignore` file
- [ ] Test development build: `eas build --platform ios --profile development`
- [ ] Install and test development build on device

## Step 8: Production Build ✅
- [ ] Build production version: `eas build --platform ios --profile production`
- [ ] Test production build thoroughly
- [ ] Prepare for App Store submission: `eas submit --platform ios`

## Step 9: Device Testing ✅
- [ ] **Authorization Flow**: Family Controls prompt appears and works
- [ ] **App Selection**: Native app picker shows and allows selection
- [ ] **App Blocking**: Selected apps are actually blocked during focus sessions
- [ ] **Session Management**: Blocking starts/stops correctly with timer
- [ ] **Error Handling**: Graceful failures with helpful error messages

## Step 10: Final Verification ✅
- [ ] All existing React Native features still work
- [ ] Family Controls integration seamless with timer flow
- [ ] App blocking works reliably across app backgrounding/foregrounding
- [ ] EAS builds work consistently
- [ ] Ready for App Store submission

## 🚨 Critical Checkpoints

### Before Ejection
- **Backup everything**: Create git branch and test restoration
- **Document current state**: Note all working features

### After Ejection
- **Verify basic functionality**: Ensure app launches and core features work
- **Test on device**: Never rely on simulator for Family Controls

### Before Production
- **Thorough device testing**: Test on multiple iOS devices and versions
- **Privacy policy update**: Update for Screen Time API usage
- **App Store preparation**: Screenshots, descriptions, entitlement explanations

## 🛠️ Quick Debug Commands

```bash
# Clean and rebuild
cd ios && xcodebuild clean && cd ..
npx expo run:ios

# Check native module availability  
# Add to your app and check console:
console.log('Native modules:', Object.keys(NativeModules));

# Verify entitlements in built app
codesign -d --entitlements - path/to/your.app

# EAS build logs
eas build:list
eas build:view [build-id]
```

## 📞 If Things Go Wrong

### Ejection Issues
1. Delete `ios/` and `android/` directories
2. Run `npx expo prebuild --clean` again
3. Check app.config.ts for syntax errors

### Native Module Issues  
1. Clean Xcode project (Product > Clean Build Folder)
2. Delete `node_modules/` and `npm install`
3. Restart Metro bundler
4. Check bridge file syntax

### EAS Build Issues
1. Check build logs for specific errors
2. Verify provisioning profile includes entitlements
3. Update Xcode and EAS CLI to latest versions
4. Contact EAS support with build ID

### Family Controls Not Working
1. Verify on physical device (not simulator)
2. Check iOS version is 15.0+
3. Verify entitlements in Apple Developer portal
4. Check authorization status with debug logs

**✅ Success Indicator**: When you can start a focus session, see the iOS Family Controls authorization prompt, select apps to block, and those apps become inaccessible during the session - you're ready for production! 🎉 