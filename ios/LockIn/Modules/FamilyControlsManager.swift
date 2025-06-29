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
                
                await MainActor.run {
                    let authStatus = self.center.authorizationStatus
                    resolve([
                        "status": self.authorizationStatusString(authStatus),
                        "authorized": authStatus == .approved
                    ])
                }
            } catch {
                await MainActor.run {
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
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("🍎 [Swift] startAppBlocking called")
        print("🍎 [Swift] Authorization status: \(center.authorizationStatus)")
        
        guard center.authorizationStatus == .approved else {
            print("🍎 [Swift] ERROR: Not authorized for Family Controls")
            reject("NOT_AUTHORIZED", "Family Controls authorization required", nil)
            return
        }
        
        // Use the application tokens selected through AppSelectionManager
        let selectedTokens = AppSelectionManager.selectedApplicationTokens
        print("🍎 [Swift] Selected tokens count: \(selectedTokens.count)")
        
        guard !selectedTokens.isEmpty else {
            print("🍎 [Swift] ERROR: No applications selected for blocking")
            reject("NO_APPS_SELECTED", "No applications selected for blocking", nil)
            return
        }
        
        // Apply restrictions using selected application tokens
        print("🍎 [Swift] Applying restrictions to \(selectedTokens.count) apps")
        store.shield.applications = selectedTokens
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(Set(), except: Set())
        
        print("🍎 [Swift] App blocking started successfully")
        resolve([
            "success": true, 
            "blockedApps": selectedTokens.count,
            "message": "App blocking started successfully"
        ])
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
        let isBlocking = !(store.shield.applications?.isEmpty ?? true)
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