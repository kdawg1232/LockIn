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
        // Extract ApplicationTokens from Application objects for ManagedSettings
        let applicationTokens: Set<ApplicationToken> = Set(selectedApps.compactMap { $0.token })
        store.shield.applications = applicationTokens
        store.shield.applicationCategories = ShieldSettings.ActivityCategoryPolicy.specific(Set(), except: Set())
        
        resolve([
            "success": true, 
            "blockedApps": selectedApps.count,
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