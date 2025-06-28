# 🍎 Family Controls API Integration Guide
## Migrating from Expo Managed to Bare Workflow

---

## Overview

This guide provides step-by-step instructions for migrating your LockIn app from Expo Managed Workflow to Bare Workflow and integrating the iOS Family Controls API for app blocking functionality.

⚠️ **Important**: Before starting, ensure you have obtained the required entitlements from Apple:
- `com.apple.developer.family-controls` 
- `com.apple.developer.screen-time-api`

---

## 📋 Prerequisites

### Apple Developer Requirements
1. **Apple Developer Account** (paid) with admin access
2. **Special Entitlement Request** submitted and approved for Screen Time API
3. **Provisioning Profile** configured with Family Controls entitlement
4. **Physical iOS device** for testing (Family Controls doesn't work in simulator)

### Development Environment
- **Xcode 15+** installed
- **macOS Ventura** or later
- **Node.js 18+** 
- **EAS CLI** installed: `npm install -g @expo/eas-cli`
- **Expo CLI** installed: `npm install -g @expo/cli`

---

## 🚀 Step-by-Step Migration Process

### Step 1: Clean Ejection to Bare Workflow

#### 1.1 Backup Your Current Project
```bash
# Create a backup branch
git checkout -b backup-managed-workflow
git add .
git commit -m "Backup: Pre-ejection managed workflow state"
git push origin backup-managed-workflow

# Return to main development branch
git checkout dev-client
```

#### 1.2 Pre-Ejection Preparation
```bash
# Install required dependencies for bare workflow
npm install --save-dev @expo/prebuild-config
```

#### 1.3 Update app.config.ts for Bare Workflow
```typescript
// app.config.ts - Add iOS entitlements and capabilities
import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'LockIn',
  slug: 'lockin',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  plugins: [
    "expo-secure-store",
    "expo-dev-client" // Add this for bare workflow
  ],
  scheme: 'lockin',
  extra: {
    eas: {
      projectId: "6da8d060-89f0-4ad4-8cf1-0dc8505b6c75"
    }
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.karthikdigavalli.lockin',
    associatedDomains: [
      'applinks:lockin.app'
    ],
    // Add entitlements for Family Controls
    entitlements: {
      "com.apple.developer.family-controls": true,
      "com.apple.developer.screen-time-api": true
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Add required usage descriptions
      NSFamilyControlsUsageDescription: "LockIn needs access to Screen Time to help you focus by temporarily blocking distracting apps during your focus sessions.",
      NSScreenTimeUsageDescription: "LockIn uses Screen Time to track your app usage and provide focus session rewards based on your productivity."
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    package: 'com.karthikdigavalli.lockin',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'lockin',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: undefined,
  },
});
```

#### 1.4 Perform the Ejection
```bash
# Generate native iOS and Android directories
npx expo prebuild --clean

# This creates:
# - ios/ directory with Xcode project
# - android/ directory with Android Studio project
# - Preserves all your React Native code in src/
```

#### 1.5 Verify Ejection Success
```bash
# Check that native directories were created
ls -la
# Should see: ios/, android/, node_modules/, src/, etc.

# Test that the app still runs
npx expo run:ios
```

---

### Step 2: Configure Entitlements and Capabilities in Xcode

#### 2.1 Open Xcode Project
```bash
# Open the iOS project in Xcode
open ios/LockIn.xcworkspace
```

#### 2.2 Configure Signing & Capabilities
1. **Select the LockIn target** in the project navigator
2. **Go to "Signing & Capabilities" tab**
3. **Set your Team** to your Apple Developer account
4. **Update Bundle Identifier** to match your provisioning profile
5. **Add Capabilities**:
   - Click "+" to add capability
   - Add "Family Controls"
   - Add "Screen Time" (if available)

#### 2.3 Verify Entitlements File
Check `ios/LockIn/LockIn.entitlements`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.family-controls</key>
    <true/>
    <key>com.apple.developer.screen-time-api</key>
    <true/>
</dict>
</plist>
```

---

### Step 3: Create Swift Native Module

#### 3.1 Create FamilyControlsManager.swift
```bash
# Create the native module directory
mkdir -p ios/LockIn/Modules
```

Create `ios/LockIn/Modules/FamilyControlsManager.swift`:
```swift
import Foundation
import React
import FamilyControls
import ManagedSettings
import DeviceActivity

@objc(FamilyControlsManager)
class FamilyControlsManager: NSObject {
    
    private let store = ManagedSettingsStore()
    private let center = AuthorizationCenter.shared
    
    // MARK: - Module Setup
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // MARK: - Authorization Methods
    @objc
    func requestAuthorization(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                // Request authorization for Family Controls
                try await center.requestAuthorization(for: .individual)
                
                DispatchQueue.main.async {
                    let authStatus = self.center.authorizationStatus
                    resolve([
                        "status": self.authorizationStatusString(authStatus),
                        "authorized": authStatus == .approved
                    ])
                }
            } catch {
                DispatchQueue.main.async {
                    reject("AUTHORIZATION_ERROR", "Failed to request authorization: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    @objc
    func getAuthorizationStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let authStatus = center.authorizationStatus
        resolve([
            "status": authorizationStatusString(authStatus),
            "authorized": authStatus == .approved
        ])
    }
    
    // MARK: - App Blocking Methods
    @objc
    func startAppBlocking(
        _ blockedAppBundleIDs: [String],
        resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Family Controls authorization required", nil)
            return
        }
        
        // Create application tokens from bundle IDs
        let blockedApplications = Set(blockedAppBundleIDs.compactMap { bundleID in
            // Note: In production, you'd need to convert bundle IDs to ApplicationTokens
            // This requires the user to select apps through FamilyActivityPicker
            return nil // Placeholder - see Step 3.3 for proper implementation
        })
        
        // Apply restrictions
        store.shield.applications = blockedApplications
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(Set(), except: Set())
        
        resolve(["success": true, "blockedApps": blockedAppBundleIDs.count])
    }
    
    @objc
    func stopAppBlocking(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // Remove all restrictions
        store.clearAllSettings()
        resolve(["success": true])
    }
    
    @objc
    func isBlocking(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let isBlocking = !store.shield.applications.isEmpty
        resolve(["isBlocking": isBlocking])
    }
    
    // MARK: - Helper Methods
    private func authorizationStatusString(_ status: AuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .approved:
            return "approved"
        @unknown default:
            return "unknown"
        }
    }
}
```

#### 3.2 Create App Selection Module
Create `ios/LockIn/Modules/AppSelectionManager.swift`:
```swift
import Foundation
import React
import FamilyControls
import SwiftUI

@objc(AppSelectionManager)
class AppSelectionManager: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // Store selected applications for blocking
    static var selectedApplications: Set<ApplicationToken> = []
    
    @objc
    func showAppSelectionModal(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let rootViewController = RCTKeyWindow()?.rootViewController else {
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
                return
            }
            
            let appSelectionView = AppSelectionView { selectedApps in
                AppSelectionManager.selectedApplications = selectedApps
                resolve(["selectedCount": selectedApps.count])
            }
            
            let hostingController = UIHostingController(rootView: appSelectionView)
            hostingController.modalPresentationStyle = .pageSheet
            
            rootViewController.present(hostingController, animated: true)
        }
    }
    
    @objc
    func getSelectedApplications(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["selectedCount": AppSelectionManager.selectedApplications.count])
    }
}

// SwiftUI view for app selection
struct AppSelectionView: View {
    @State private var selection = FamilyActivitySelection()
    let onComplete: (Set<ApplicationToken>) -> Void
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Select Apps to Block")
                    .font(.headline)
                    .padding()
                
                FamilyActivityPicker(selection: $selection)
                    .padding()
                
                Button("Done") {
                    onComplete(selection.applications)
                }
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
            .navigationBarHidden(true)
        }
    }
}
```

#### 3.3 Update FamilyControlsManager for Real App Blocking
Update the `startAppBlocking` method in `FamilyControlsManager.swift`:
```swift
@objc
func startAppBlocking(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
) {
    guard center.authorizationStatus == .approved else {
        reject("NOT_AUTHORIZED", "Family Controls authorization required", nil)
        return
    }
    
    // Use the apps selected through AppSelectionManager
    let selectedApps = AppSelectionManager.selectedApplications
    
    guard !selectedApps.isEmpty else {
        reject("NO_APPS_SELECTED", "No applications selected for blocking", nil)
        return
    }
    
    // Apply restrictions using selected applications
    store.shield.applications = selectedApps
    store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(Set(), except: Set())
    
    resolve([
        "success": true, 
        "blockedApps": selectedApps.count,
        "message": "App blocking started successfully"
    ])
}
```

---

### Step 4: Create Objective-C Bridging Files

#### 4.1 Create FamilyControlsManager Bridge
Create `ios/LockIn/Modules/FamilyControlsManager.m`:
```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FamilyControlsManager, NSObject)

// Authorization methods
RCT_EXTERN_METHOD(requestAuthorization:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAuthorizationStatus:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// App blocking methods
RCT_EXTERN_METHOD(startAppBlocking:(NSArray<NSString *> *)blockedAppBundleIDs
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopAppBlocking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isBlocking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

#### 4.2 Create AppSelectionManager Bridge
Create `ios/LockIn/Modules/AppSelectionManager.m`:
```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppSelectionManager, NSObject)

RCT_EXTERN_METHOD(showAppSelectionModal:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSelectedApplications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

---

### Step 5: JavaScript/TypeScript Integration

#### 5.1 Create Native Module Interface
Create `src/frontend/services/familyControlsService.ts`:
```typescript
import { NativeModules, Platform } from 'react-native';

// Define TypeScript interfaces for the native modules
interface FamilyControlsManager {
  requestAuthorization(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }>;
  
  getAuthorizationStatus(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }>;
  
  startAppBlocking(blockedAppBundleIDs: string[]): Promise<{
    success: boolean;
    blockedApps: number;
    message?: string;
  }>;
  
  stopAppBlocking(): Promise<{
    success: boolean;
  }>;
  
  isBlocking(): Promise<{
    isBlocking: boolean;
  }>;
}

interface AppSelectionManager {
  showAppSelectionModal(): Promise<{
    selectedCount: number;
  }>;
  
  getSelectedApplications(): Promise<{
    selectedCount: number;
  }>;
}

// Get the native modules
const { FamilyControlsManager: FamilyControlsNative, AppSelectionManager: AppSelectionNative } = NativeModules;

class FamilyControlsService {
  private familyControls: FamilyControlsManager;
  private appSelection: AppSelectionManager;
  
  constructor() {
    if (Platform.OS !== 'ios') {
      throw new Error('Family Controls is only available on iOS');
    }
    
    this.familyControls = FamilyControlsNative;
    this.appSelection = AppSelectionNative;
    
    if (!this.familyControls) {
      throw new Error('FamilyControlsManager native module is not available');
    }
  }
  
  /**
   * Request authorization for Family Controls
   * This will show the iOS authorization prompt
   */
  async requestAuthorization(): Promise<boolean> {
    try {
      const result = await this.familyControls.requestAuthorization();
      console.log('Family Controls authorization result:', result);
      return result.authorized;
    } catch (error) {
      console.error('Failed to request Family Controls authorization:', error);
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }
  
  /**
   * Check current authorization status
   */
  async getAuthorizationStatus(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }> {
    try {
      return await this.familyControls.getAuthorizationStatus();
    } catch (error) {
      console.error('Failed to get authorization status:', error);
      throw error;
    }
  }
  
  /**
   * Show the app selection modal for users to choose which apps to block
   */
  async showAppSelectionModal(): Promise<number> {
    try {
      const result = await this.appSelection.showAppSelectionModal();
      return result.selectedCount;
    } catch (error) {
      console.error('Failed to show app selection modal:', error);
      throw error;
    }
  }
  
  /**
   * Start blocking the selected applications
   */
  async startAppBlocking(): Promise<boolean> {
    try {
      // First check if we have authorization
      const authStatus = await this.getAuthorizationStatus();
      if (!authStatus.authorized) {
        throw new Error('Family Controls authorization required');
      }
      
      // Start blocking with empty array (we use selected apps from AppSelectionManager)
      const result = await this.familyControls.startAppBlocking([]);
      console.log('App blocking started:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to start app blocking:', error);
      throw error;
    }
  }
  
  /**
   * Stop blocking all applications
   */
  async stopAppBlocking(): Promise<boolean> {
    try {
      const result = await this.familyControls.stopAppBlocking();
      console.log('App blocking stopped:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to stop app blocking:', error);
      throw error;
    }
  }
  
  /**
   * Check if app blocking is currently active
   */
  async isBlocking(): Promise<boolean> {
    try {
      const result = await this.familyControls.isBlocking();
      return result.isBlocking;
    } catch (error) {
      console.error('Failed to check blocking status:', error);
      return false;
    }
  }
  
  /**
   * Get the number of currently selected applications
   */
  async getSelectedApplicationsCount(): Promise<number> {
    try {
      const result = await this.appSelection.getSelectedApplications();
      return result.selectedCount;
    } catch (error) {
      console.error('Failed to get selected applications:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export const familyControlsService = new FamilyControlsService();
export default familyControlsService;
```

#### 5.2 Update useAppBlocking Hook
Update `src/frontend/hooks/useAppBlocking.ts`:
```typescript
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import familyControlsService from '../services/familyControlsService';

interface AppBlockingState {
  isSupported: boolean;
  isAuthorized: boolean;
  isBlocking: boolean;
  selectedAppsCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useAppBlocking = () => {
  const [state, setState] = useState<AppBlockingState>({
    isSupported: Platform.OS === 'ios',
    isAuthorized: false,
    isBlocking: false,
    selectedAppsCount: 0,
    isLoading: false,
    error: null,
  });

  // Check authorization status on mount
  useEffect(() => {
    if (state.isSupported) {
      checkAuthorizationStatus();
      checkBlockingStatus();
      getSelectedAppsCount();
    }
  }, [state.isSupported]);

  const checkAuthorizationStatus = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const authStatus = await familyControlsService.getAuthorizationStatus();
      setState(prev => ({ 
        ...prev, 
        isAuthorized: authStatus.authorized,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoading: false 
      }));
    }
  };

  const checkBlockingStatus = async () => {
    try {
      const isBlocking = await familyControlsService.isBlocking();
      setState(prev => ({ ...prev, isBlocking }));
    } catch (error) {
      console.warn('Failed to check blocking status:', error);
    }
  };

  const getSelectedAppsCount = async () => {
    try {
      const count = await familyControlsService.getSelectedApplicationsCount();
      setState(prev => ({ ...prev, selectedAppsCount: count }));
    } catch (error) {
      console.warn('Failed to get selected apps count:', error);
    }
  };

  const requestAuthorization = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const authorized = await familyControlsService.requestAuthorization();
      setState(prev => ({ 
        ...prev, 
        isAuthorized: authorized,
        isLoading: false 
      }));
      return authorized;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoading: false 
      }));
      return false;
    }
  };

  const showAppSelection = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const selectedCount = await familyControlsService.showAppSelectionModal();
      setState(prev => ({ 
        ...prev, 
        selectedAppsCount: selectedCount,
        isLoading: false 
      }));
      return selectedCount > 0;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoading: false 
      }));
      return false;
    }
  };

  const startBlocking = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if we have apps selected
      if (state.selectedAppsCount === 0) {
        throw new Error('Please select apps to block first');
      }
      
      const success = await familyControlsService.startAppBlocking();
      setState(prev => ({ 
        ...prev, 
        isBlocking: success,
        isLoading: false 
      }));
      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoading: false 
      }));
      return false;
    }
  };

  const stopBlocking = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const success = await familyControlsService.stopAppBlocking();
      setState(prev => ({ 
        ...prev, 
        isBlocking: !success,
        isLoading: false 
      }));
      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message,
        isLoading: false 
      }));
      return false;
    }
  };

  const refreshStatus = async () => {
    await Promise.all([
      checkAuthorizationStatus(),
      checkBlockingStatus(),
      getSelectedAppsCount()
    ]);
  };

  return {
    ...state,
    requestAuthorization,
    showAppSelection,
    startBlocking,
    stopBlocking,
    refreshStatus,
  };
};
```

---

### Step 6: Update Info.plist Configuration

Your `app.config.ts` already includes the necessary Info.plist entries, but verify that `ios/LockIn/Info.plist` contains:

```xml
<key>NSFamilyControlsUsageDescription</key>
<string>LockIn needs access to Screen Time to help you focus by temporarily blocking distracting apps during your focus sessions.</string>
<key>NSScreenTimeUsageDescription</key>
<string>LockIn uses Screen Time to track your app usage and provide focus session rewards based on your productivity.</string>
```

---

### Step 7: Update EAS Build Configuration

#### 7.1 Update eas.json for Native Development
```json
{
  "cli": {
    "version": ">= 16.7.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Debug",
        "entitlements": {
          "com.apple.developer.family-controls": true,
          "com.apple.developer.screen-time-api": true
        }
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Release",
        "entitlements": {
          "com.apple.developer.family-controls": true,
          "com.apple.developer.screen-time-api": true
        }
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "buildConfiguration": "Release",
        "entitlements": {
          "com.apple.developer.family-controls": true,
          "com.apple.developer.screen-time-api": true
        }
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 7.2 Create Build Commands Script
Create `.easignore` file:
```
# Ignore development files during EAS build
**/.expo/*
.expo/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
```

---

### Step 8: Build and Test with EAS Build

#### 8.1 Login to EAS and Build
```bash
# Login to EAS
eas login

# Build for development (first build to test)
eas build --platform ios --profile development

# Install on device when build completes
eas build:run --platform ios --profile development
```

#### 8.2 Build for Production
```bash
# Build for production
eas build --platform ios --profile production

# Submit to App Store (when ready)
eas submit --platform ios --profile production
```

---

### Step 9: Testing Family Controls on Real Device

#### 9.1 Test Authorization Flow
1. **Install the app** on a physical iOS device
2. **Navigate to your app blocking screen**
3. **Tap "Request Permission"** - should show iOS Family Controls prompt
4. **Grant permission** and verify authorization status

#### 9.2 Test App Selection
1. **Tap "Select Apps to Block"**
2. **Choose social media apps** (Instagram, TikTok, etc.)
3. **Verify selection count** updates correctly

#### 9.3 Test App Blocking
1. **Start a focus session** and enable app blocking
2. **Try to open a blocked app** - should show blocking screen
3. **Complete or cancel session** - verify apps become accessible again

#### 9.4 Debugging Tips
```typescript
// Add this to your timer screen for debugging
const debugFamilyControls = async () => {
  console.log('=== Family Controls Debug ===');
  const authStatus = await familyControlsService.getAuthorizationStatus();
  const isBlocking = await familyControlsService.isBlocking();
  const selectedCount = await familyControlsService.getSelectedApplicationsCount();
  
  console.log('Authorization:', authStatus);
  console.log('Is Blocking:', isBlocking);
  console.log('Selected Apps:', selectedCount);
};
```

---

### Step 10: Best Practices and Maintenance

#### 10.1 Version Control Strategy
```bash
# Keep native and JS code in sync
git add ios/ android/ src/
git commit -m "feat: integrate Family Controls native module"

# Create separate branches for major native changes
git checkout -b feature/family-controls-updates
```

#### 10.2 Development Workflow
1. **JS-first development**: Develop React Native features first
2. **Native module updates**: Update Swift code for new capabilities
3. **Bridge updates**: Update TypeScript interfaces when native API changes
4. **EAS builds**: Use development builds for testing, production for releases

#### 10.3 Error Handling Best Practices
```typescript
// Always wrap native calls in try-catch
try {
  await familyControlsService.startAppBlocking();
} catch (error) {
  // Handle specific error types
  if (error.message.includes('NOT_AUTHORIZED')) {
    // Show authorization prompt
  } else if (error.message.includes('NO_APPS_SELECTED')) {
    // Show app selection
  } else {
    // Generic error handling
  }
}
```

#### 10.4 Testing Strategy
- **Unit tests**: Test JavaScript service layer
- **Integration tests**: Test native module bridges
- **Device testing**: Always test on physical devices
- **Build testing**: Test EAS builds regularly

---

## ⚠️ Common Pitfalls and Solutions

### 1. Authorization Issues
**Problem**: Authorization prompt doesn't show
**Solution**: 
- Verify entitlements in provisioning profile
- Check Info.plist usage descriptions
- Ensure testing on physical device

### 2. Build Failures
**Problem**: EAS build fails with entitlement errors
**Solution**:
- Regenerate provisioning profile with entitlements
- Update eas.json with correct entitlements
- Check Apple Developer portal capabilities

### 3. App Selection Not Working
**Problem**: App selection modal doesn't show apps
**Solution**:
- Verify Family Controls authorization is approved
- Check SwiftUI view implementation
- Test on device with iOS 15.0+

### 4. Native Module Not Found
**Problem**: "FamilyControlsManager is not available"
**Solution**:
- Clean and rebuild Xcode project
- Verify bridging files are included in target
- Check metro bundler restart

---

## 🎯 Success Verification Checklist

- [ ] **Ejection Complete**: Native iOS/Android directories exist
- [ ] **Xcode Opens**: Can open `.xcworkspace` without errors
- [ ] **Entitlements Configured**: Family Controls capabilities visible in Xcode
- [ ] **Native Module Builds**: Swift compilation succeeds
- [ ] **Bridge Working**: JavaScript can call native methods
- [ ] **Authorization Prompt**: iOS Family Controls prompt appears
- [ ] **App Selection**: Can select apps to block via native picker
- [ ] **Blocking Works**: Selected apps are actually blocked during sessions
- [ ] **EAS Builds**: Development and production builds succeed
- [ ] **Device Testing**: All features work on physical iOS device

---

## 📞 Support and Next Steps

After completing this migration:

1. **Update your development workflow** to use EAS builds
2. **Test thoroughly** on multiple iOS devices and versions
3. **Prepare App Store submission** with privacy policy updates
4. **Consider Android alternatives** for cross-platform blocking
5. **Monitor Apple's API changes** for Family Controls updates

This migration transforms your app from a managed Expo app to a production-ready native application with deep iOS integration while maintaining all your existing React Native code and functionality. 