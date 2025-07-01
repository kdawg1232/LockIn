import Foundation
import UIKit
import React
import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI

@objc(ScreenTimeManager)
class ScreenTimeManager: NSObject, ObservableObject {
    
    private let center = AuthorizationCenter.shared
    private let deviceActivityCenter = DeviceActivityCenter()
    private var activitySelection = FamilyActivitySelection()
    
    // Monitoring configuration
    private let socialMediaMonitorName = DeviceActivityName("SocialMediaMonitor")
    private let dailyMonitorName = DeviceActivityName("DailyUsageMonitor")
    private var isMonitoringActive = false
    
    // Store usage events for React Native access
    private var dailyUsageEvents: [String: TimeInterval] = [:]
    private var lastThresholdEventTime: Date?
    
    override init() {
        super.init()
        setupNotificationObservers()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Module Setup
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // MARK: - Authorization Methods
    @objc
    func requestScreenTimeAuthorization(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        Task {
            do {
                // Request authorization for Family Controls (includes Screen Time access)
                try await center.requestAuthorization(for: .individual)
                
                await MainActor.run {
                    let authStatus = self.center.authorizationStatus
                    if authStatus == .approved {
                        // Start background monitoring when authorized
                        self.startSocialMediaMonitoring()
                    }
                    resolve([
                        "status": self.authorizationStatusString(authStatus),
                        "authorized": authStatus == .approved
                    ])
                }
            } catch {
                await MainActor.run {
                    reject("AUTHORIZATION_ERROR", "Failed to request Screen Time authorization: \(error.localizedDescription)", error)
                }
            }
        }
    }
    
    @objc
    func getScreenTimeAuthorizationStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let authStatus = center.authorizationStatus
        resolve([
            "status": authorizationStatusString(authStatus),
            "authorized": authStatus == .approved
        ])
    }
    
    // MARK: - App Selection and Configuration
    @objc
    func configureSocialMediaApps(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Screen Time authorization required", nil)
            return
        }
        
        // Use the application tokens selected through AppSelectionManager
        let selectedTokens = AppSelectionManager.selectedApplicationTokens
        
        print("📱 [Swift] Using \(selectedTokens.count) selected apps for monitoring")
        
        // Update the family activity selection using the selected tokens
        activitySelection = FamilyActivitySelection()
        
        // Note: In newer iOS versions, you cannot programmatically set the selection.
        // The FamilyActivitySelection must be populated by user interaction through FamilyActivityPicker.
        // So we'll use the tokens that were already selected through AppSelectionManager.
        
        print("📱 [Swift] Configured social media app monitoring")
        resolve([
            "configuredApps": selectedTokens.count,
            "success": true
        ])
    }
    
    // MARK: - Usage Data Methods (SwiftUI Bridge)
    @objc
    func getTodayAppUsage(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [Swift] getTodayAppUsage called")
        
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Screen Time authorization required", nil)
            return
        }
        
        // Create usage data from our tracked events and SwiftUI report
        let usageData = buildUsageDataFromEvents()
        resolve(usageData)
    }
    
    @objc
    func getAppUsageForDate(
        _ dateString: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [Swift] getAppUsageForDate called for: \(dateString)")
        
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Screen Time authorization required", nil)
            return
        }
        
        // Parse date string
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        guard let targetDate = dateFormatter.date(from: dateString) else {
            reject("INVALID_DATE", "Invalid date format. Use yyyy-MM-dd", nil)
            return
        }
        
        // For now, return today's data as DeviceActivityReport doesn't provide historical API access
        // In production, you'd store historical data from monitoring events
        let usageData = buildUsageDataFromEvents()
        resolve(usageData)
    }
    
    // MARK: - Background Monitoring Implementation
    private func startSocialMediaMonitoring() {
        guard center.authorizationStatus == .approved else {
            print("📱 [Swift] Cannot start monitoring: not authorized")
            return
        }
        
        guard !isMonitoringActive else {
            print("📱 [Swift] Monitoring already active")
            return
        }
        
        print("📱 [Swift] Starting DeviceActivity monitoring for social media usage")
        
        // Create schedule for continuous monitoring (6 AM to midnight)
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 6, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        
        // Create events for 30-minute thresholds
        let selectedTokens = AppSelectionManager.selectedApplicationTokens
        let socialMediaThresholdEvent = DeviceActivityEvent(
            applications: selectedTokens,
            categories: Set(),
            webDomains: Set(),
            threshold: DateComponents(minute: 30) // Trigger every 30 minutes
        )
        
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            DeviceActivityEvent.Name("socialMediaThreshold"): socialMediaThresholdEvent
        ]
        
        do {
            // Start monitoring
            try deviceActivityCenter.startMonitoring(
                socialMediaMonitorName,
                during: schedule,
                events: events
            )
            
            isMonitoringActive = true
            print("📱 [Swift] Successfully started social media monitoring")
            
        } catch {
            print("📱 [Swift] Failed to start monitoring: \(error.localizedDescription)")
        }
    }
    
    @objc
    func stopBackgroundMonitoring() {
        print("📱 [Swift] Stopping background monitoring")
        deviceActivityCenter.stopMonitoring([socialMediaMonitorName, dailyMonitorName])
        isMonitoringActive = false
    }
    
    @objc
    func restartBackgroundMonitoring() {
        print("📱 [Swift] Restarting background monitoring")
        stopBackgroundMonitoring()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.startSocialMediaMonitoring()
        }
    }
    
    @objc
    func getMonitoringStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let selectedTokens = AppSelectionManager.selectedApplicationTokens
        resolve([
            "isActive": isMonitoringActive,
            "authorized": center.authorizationStatus == .approved,
            "configuredApps": selectedTokens.count,
            "lastThresholdEvent": lastThresholdEventTime?.timeIntervalSince1970 ?? 0
        ])
    }
    
    // MARK: - Event Handling and Data Building
    private func setupNotificationObservers() {
        // Listen for DeviceActivity events from our monitor
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSocialMediaThreshold),
            name: NSNotification.Name("SocialMediaThresholdReached"),
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleActivityUpdate),
            name: NSNotification.Name("DeviceActivityUpdate"),
            object: nil
        )
    }
    
    @objc private func handleSocialMediaThreshold(_ notification: Notification) {
        print("📱 [Swift] Social media threshold reached - applying coin penalty")
        
        lastThresholdEventTime = Date()
        
        // Notify React Native about the threshold event
        if let userInfo = notification.userInfo {
            NotificationCenter.default.post(
                name: NSNotification.Name("LockInCoinPenalty"),
                object: nil,
                userInfo: [
                    "penalty": 1,
                    "reason": "social_media_30min",
                    "timestamp": Date().timeIntervalSince1970
                ]
            )
        }
    }
    
    @objc private func handleActivityUpdate(_ notification: Notification) {
        print("📱 [Swift] Device activity update received")
        
        // Update our local usage tracking
        if let userInfo = notification.userInfo,
           let bundleId = userInfo["bundleId"] as? String,
           let usageTime = userInfo["usageTime"] as? TimeInterval {
            
            dailyUsageEvents[bundleId] = usageTime
        }
    }
    
    private func buildUsageDataFromEvents() -> [[String: Any]] {
        var usageData: [[String: Any]] = []
        
        // Build usage data from our tracked events
        for (bundleId, totalTime) in dailyUsageEvents {
            if totalTime > 0 {
                usageData.append([
                    "bundleIdentifier": bundleId,
                    "totalTime": totalTime,
                    "categoryIdentifier": "SocialNetworking"
                ])
            }
        }
        
        // If no tracked events, provide basic data for configured apps
        if usageData.isEmpty {
            let socialMediaBundleIds = [
                "com.burbn.instagram",
                "com.twitter.twitter",
                "com.reddit.Reddit"
            ]
            
            for bundleId in socialMediaBundleIds {
                // Check if app is installed and potentially used
                if isAppInstalled(bundleId: bundleId) {
                    usageData.append([
                        "bundleIdentifier": bundleId,
                        "totalTime": 0.0, // Will be updated by monitoring events
                        "categoryIdentifier": "SocialNetworking"
                    ])
                }
            }
        }
        
        print("📱 [Swift] Returning \(usageData.count) usage entries")
        return usageData
    }
    
    private func isAppInstalled(bundleId: String) -> Bool {
        // Check if app is installed by trying to open its URL scheme
        if let url = URL(string: "\(bundleId)://") {
            return UIApplication.shared.canOpenURL(url)
        }
        return false
    }
    
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

// MARK: - DeviceActivityMonitor Implementation
class LockInDeviceActivityMonitor: DeviceActivityMonitor {
    
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        print("📱 [Monitor] Activity monitoring started: \(activity)")
        
        // Notify about monitoring start
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: NSNotification.Name("DeviceActivityStarted"),
                object: nil,
                userInfo: ["activity": activity.rawValue]
            )
        }
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        print("📱 [Monitor] Activity monitoring ended: \(activity)")
        
        // Notify about monitoring end
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: NSNotification.Name("DeviceActivityEnded"),
                object: nil,
                userInfo: ["activity": activity.rawValue]
            )
        }
    }
    
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        print("📱 [Monitor] ⚠️ THRESHOLD REACHED: \(event) for activity: \(activity)")
        
        // This is the key method - called when user hits 30 minutes of social media usage
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: NSNotification.Name("SocialMediaThresholdReached"),
                object: nil,
                userInfo: [
                    "event": event.rawValue,
                    "activity": activity.rawValue,
                    "timestamp": Date().timeIntervalSince1970
                ]
            )
        }
    }
    
    override func intervalWillStartWarning(for activity: DeviceActivityName) {
        super.intervalWillStartWarning(for: activity)
        print("📱 [Monitor] Activity will start soon: \(activity)")
    }
    
    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
        print("📱 [Monitor] Activity will end soon: \(activity)")
    }
    
    override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventWillReachThresholdWarning(event, activity: activity)
        print("📱 [Monitor] ⚠️ WARNING: Approaching threshold for \(event)")
        
        // Notify about approaching threshold (could be used for warnings)
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: NSNotification.Name("SocialMediaThresholdWarning"),
                object: nil,
                userInfo: [
                    "event": event.rawValue,
                    "activity": activity.rawValue
                ]
            )
        }
    }
}

// MARK: - SwiftUI Bridge for DeviceActivityReport
@available(iOS 15.0, *)
struct ScreenTimeReportView: View {
    let context: DeviceActivityReport.Context
    let filter: DeviceActivityFilter
    
    var body: some View {
        DeviceActivityReport(context, filter: filter)
    }
}

// MARK: - Usage Report Helper
class ScreenTimeReportHelper: ObservableObject {
    static let shared = ScreenTimeReportHelper()
    
    private init() {}
    
    func createTodayFilter(for apps: Set<ApplicationToken>) -> DeviceActivityFilter {
        let calendar = Calendar.current
        let now = Date()
        let startOfDay = calendar.startOfDay(for: now)
        let interval = DateInterval(start: startOfDay, end: now)
        
        return DeviceActivityFilter(
            segment: .daily(during: interval),
            users: .all,
            devices: .init([.iPhone, .iPad]),
            applications: apps,
            categories: Set(),
            webDomains: Set()
        )
    }
}