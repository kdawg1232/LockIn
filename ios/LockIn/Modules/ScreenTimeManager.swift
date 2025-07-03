import Foundation
import UIKit
import React
import DeviceActivity
import FamilyControls
import ManagedSettings
import SwiftUI

@objc(ScreenTimeManager)
class ScreenTimeManager: RCTEventEmitter, ObservableObject {
    
    // MARK: - Singleton Setup
    static var shared: ScreenTimeManager!
    
    // MARK: - Core Properties
    private let center = AuthorizationCenter.shared
    private let deviceActivityCenter = DeviceActivityCenter()
    private let store = ManagedSettingsStore()
    
    // MARK: - Monitoring Configuration
    private let socialMediaMonitorName = DeviceActivityName("LockInSocialMediaMonitor")
    private var isMonitoringActive = false
    
    // MARK: - Real-time Usage Tracking
    private var currentDayUsage: [String: TimeInterval] = [:]
    private var lastUpdateTimestamp: Date = Date()
    private var coinPenaltyTimer: Timer?
    
    // MARK: - Social Media App Configuration
    private let trackedSocialMediaApps: [String: String] = [
        "com.burbn.instagram": "Instagram",
        "com.zhiliaoapp.musically": "TikTok", 
        "com.twitter.twitter": "Twitter",
        "com.facebook.Facebook": "Facebook",
        "com.toyopagroup.picaboo": "Snapchat",
        "com.reddit.Reddit": "Reddit",
        "com.facebook.Messenger": "Messenger",
        "com.linkedin.LinkedIn": "LinkedIn",
        "com.pinterest": "Pinterest",
        "com.discord": "Discord",
        "com.instagram.threads": "Threads"
    ]
    
    override init() {
        super.init();
        ScreenTimeManager.shared = self
        setupNotificationObservers()
        setupExtensionCommunication()
        resetDailyUsageIfNeeded()
        
        // Start polling for extension events
        startExtensionEventPolling()
    }
    
    deinit {
        coinPenaltyTimer?.invalidate()
        extensionEventTimer?.invalidate()
        
        // Remove Darwin notification observers
        CFNotificationCenterRemoveEveryObserver(
            CFNotificationCenterGetDarwinNotifyCenter(),
            Unmanaged.passUnretained(self).toOpaque()
        )
        
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Module Setup
    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // MARK: - RCTEventEmitter
    override func supportedEvents() -> [String]! {
        return [
            "LockInCoinPenalty",
            "ScreenTimeUsageUpdate", 
            "ScreenTimeDailyReset",
            "ScreenTimeMonitoringStarted",
            "ScreenTimeMonitoringStopped"
        ]
    }
    
    override func startObserving() {
        // Called when JS side starts listening
        print("📱 [ScreenTime] React Native started observing events")
    }
    
    override func stopObserving() {
        // Called when JS side stops listening
        print("📱 [ScreenTime] React Native stopped observing events")
    }
    
    // MARK: - Authorization Methods
    @objc
    func requestScreenTimeAuthorization(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [ScreenTime] Requesting Screen Time authorization")
        
        Task {
            do {
                // Request authorization for individual use (required for Screen Time API)
                try await center.requestAuthorization(for: .individual)
                
                await MainActor.run {
                    let status = self.center.authorizationStatus
                    let isAuthorized = status == .approved
                    
                    print("📱 [ScreenTime] Authorization result: \(status)")
                    
                    if isAuthorized {
                        // Immediately start monitoring when authorized
                        self.startProductionMonitoring()
                    }
                    
                    resolve([
                        "status": self.authorizationStatusString(status),
                        "authorized": isAuthorized
                    ])
                }
            } catch {
                await MainActor.run {
                    print("📱 [ScreenTime] Authorization failed: \(error)")
                    reject("AUTHORIZATION_ERROR", error.localizedDescription, error)
                }
            }
        }
    }
    
    @objc
    func getScreenTimeAuthorizationStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let status = center.authorizationStatus
        resolve([
            "status": authorizationStatusString(status),
            "authorized": status == .approved
        ])
    }
    
    // MARK: - App Configuration
    @objc
    func configureSocialMediaApps(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Screen Time authorization required", nil)
            return
        }
        
        print("📱 [ScreenTime] Configuring social media monitoring for \(trackedSocialMediaApps.count) apps")
        
        // Start monitoring immediately
        startProductionMonitoring()
        
        resolve([
            "configuredApps": trackedSocialMediaApps.count,
            "success": true,
            "message": "Social media monitoring configured successfully"
        ])
    }
    
    // MARK: - Production Monitoring Implementation
    private func startProductionMonitoring() {
        guard center.authorizationStatus == .approved else {
            print("📱 [ScreenTime] Cannot start monitoring: not authorized")
            return
        }
        
        guard !isMonitoringActive else {
            print("📱 [ScreenTime] Monitoring already active")
            return
        }
        
        print("📱 [ScreenTime] Starting PRODUCTION Screen Time monitoring")
        
        // Create 24-hour monitoring schedule
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        
        // Create monitoring events for coin penalties
        let fifteenMinuteEvent = DeviceActivityEvent(
            applications: Set(), // Monitor all apps - we'll filter in the extension
            categories: Set(),
            webDomains: Set(),
            threshold: DateComponents(minute: 15) // Trigger every 15 minutes
        )
        
        let thirtyMinuteEvent = DeviceActivityEvent(
            applications: Set(),
            categories: Set(), 
            webDomains: Set(),
            threshold: DateComponents(minute: 30) // Additional tracking
        )
        
        let events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [
            DeviceActivityEvent.Name("fifteenMinutePenalty"): fifteenMinuteEvent,
            DeviceActivityEvent.Name("thirtyMinuteCheck"): thirtyMinuteEvent
        ]
        
        do {
            // Start the monitoring
            try deviceActivityCenter.startMonitoring(
                socialMediaMonitorName,
                during: schedule,
                events: events
            )
            
            isMonitoringActive = true
            
            // Start local coin penalty timer as backup
            startCoinPenaltyTimer()
            
            print("📱 [ScreenTime] ✅ Production monitoring started successfully")
            
            // Notify React Native
            NotificationCenter.default.post(
                name: NSNotification.Name("ScreenTimeMonitoringStarted"),
                object: nil
            )
            
        } catch {
            print("📱 [ScreenTime] ❌ Failed to start monitoring: \(error)")
        }
    }
    
    @objc
    func stopBackgroundMonitoring() {
        print("📱 [ScreenTime] Stopping monitoring")
        
        deviceActivityCenter.stopMonitoring([socialMediaMonitorName])
        isMonitoringActive = false
        
        // Stop coin penalty timer
        coinPenaltyTimer?.invalidate()
        coinPenaltyTimer = nil
        
        NotificationCenter.default.post(
            name: NSNotification.Name("ScreenTimeMonitoringStopped"),
            object: nil
        )
    }
    
    @objc
    func restartBackgroundMonitoring() {
        print("📱 [ScreenTime] Restarting monitoring")
        stopBackgroundMonitoring()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
            self.startProductionMonitoring()
        }
    }
    
    // MARK: - Coin Penalty System
    private func startCoinPenaltyTimer() {
        // Timer that checks every 5 minutes for social media usage
        coinPenaltyTimer?.invalidate()
        coinPenaltyTimer = Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            self?.checkForCoinPenalties()
        }
    }
    
    private func checkForCoinPenalties() {
        Task {
            await MainActor.run {
                self.evaluateUsageForPenalties()
            }
        }
    }
    
    private func evaluateUsageForPenalties() {
        print("📱 [ScreenTime] Evaluating usage for coin penalties")
        
        let totalSocialMediaMinutes = getTotalSocialMediaUsageToday()
        let penaltiesOwed = Int(totalSocialMediaMinutes / 15) // 1 coin per 15 minutes
        
        if penaltiesOwed > 0 {
            applyCoinPenalty(amount: penaltiesOwed, minutes: totalSocialMediaMinutes)
        }
    }
    
    private func applyCoinPenalty(amount: Int, minutes: Double) {
        print("📱 [ScreenTime] Applying coin penalty: -\(amount) coins for \(minutes) minutes")
        
        // Notify React Native to apply the penalty
        NotificationCenter.default.post(
            name: NSNotification.Name("LockInCoinPenalty"),
            object: nil,
            userInfo: [
                "penalty": amount,
                "reason": "social_media_usage",
                "minutes": minutes,
                "timestamp": Date().timeIntervalSince1970
            ]
        )
    }
    
    // MARK: - Usage Data Methods
    @objc
    func getTodayAppUsage(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [ScreenTime] Getting today's PRODUCTION app usage data")
        
        guard center.authorizationStatus == .approved else {
            reject("NOT_AUTHORIZED", "Screen Time authorization required", nil)
            return
        }
        
        Task {
            let usageData = await getProductionUsageData()
            await MainActor.run {
                resolve(usageData)
            }
        }
    }
    
    @objc
    func getCurrentTrackedUsage(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("📱 [ScreenTime] Getting current tracked usage - REAL DATA")
        
        let usageArray = buildCurrentUsageResponse()
        
        print("📱 [ScreenTime] Returning \(usageArray.count) apps with real usage data")
        resolve(usageArray)
    }
    
    private func getProductionUsageData() async -> [[String: Any]] {
        print("📱 [ScreenTime] Fetching PRODUCTION Screen Time data")
        
        return await withCheckedContinuation { continuation in
            DispatchQueue.main.async {
                let usageData = self.buildCurrentUsageResponse()
                continuation.resume(returning: usageData)
            }
        }
    }
    
    private func buildCurrentUsageResponse() -> [[String: Any]] {
        var usageData: [[String: Any]] = []
        
        // First, get total social media usage from extension if available
        let totalSocialMinutes = extensionUserDefaults?.double(forKey: "dailySocialMediaMinutes") ?? 0.0
        
        if totalSocialMinutes > 0 {
            // Get individual app usage from extension
            for (bundleId, appName) in trackedSocialMediaApps {
                if isAppInstalled(bundleId: bundleId) {
                    let appUsageKey = "usage_\(bundleId)"
                    let appMinutes = extensionUserDefaults?.double(forKey: appUsageKey) ?? 0.0
                    
                    if appMinutes >= 1 { // Only include apps used for at least 1 minute
                        usageData.append([
                            "bundleIdentifier": bundleId,
                            "appName": appName,
                            "totalTime": appMinutes * 60, // Convert to seconds
                            "categoryIdentifier": "SocialNetworking"
                        ])
                        
                        print("📱 [ScreenTime] REAL (from extension): \(appName) = \(appMinutes) minutes")
                    }
                }
            }
        } else {
            // Fallback to local tracking if extension data not available
            for (bundleId, appName) in trackedSocialMediaApps {
                if isAppInstalled(bundleId: bundleId) {
                    let usageTime = currentDayUsage[bundleId] ?? 0.0
                    let usageMinutes = usageTime / 60
                    
                    if usageMinutes >= 1 { // Only include apps used for at least 1 minute
                        usageData.append([
                    "bundleIdentifier": bundleId,
                    "appName": appName,
                    "totalTime": usageTime,
                    "categoryIdentifier": "SocialNetworking"
                ])
                        
                        print("📱 [ScreenTime] LOCAL: \(appName) = \(usageMinutes) minutes")
                    }
                }
            }
        }
        
        return usageData
    }
    
    @objc
    func getMonitoringStatus(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let totalMinutes = getTotalSocialMediaUsageToday()
        
        resolve([
            "isActive": isMonitoringActive,
            "authorized": center.authorizationStatus == .approved,
            "configuredApps": trackedSocialMediaApps.count,
            "trackedApps": currentDayUsage.count,
            "totalUsageMinutes": totalMinutes,
            "lastUpdate": lastUpdateTimestamp.timeIntervalSince1970,
            "coinPenaltyActive": coinPenaltyTimer != nil
        ])
    }
    
    // MARK: - Usage Tracking & Updates
    @objc
    public func recordAppUsage(bundleId: String, sessionDuration: TimeInterval) {
        guard trackedSocialMediaApps.keys.contains(bundleId) else {
            return // Only track configured social media apps
        }
        
        let previousUsage = currentDayUsage[bundleId] ?? 0
        currentDayUsage[bundleId] = previousUsage + sessionDuration
        lastUpdateTimestamp = Date()
        
        let appName = trackedSocialMediaApps[bundleId] ?? bundleId
        let totalMinutes = currentDayUsage[bundleId]! / 60
        
        print("📱 [ScreenTime] RECORDED: \(appName) session +\(sessionDuration/60) min (total: \(totalMinutes) min)")
        
        // Notify React Native about usage update
        NotificationCenter.default.post(
            name: NSNotification.Name("ScreenTimeUsageUpdate"),
            object: nil,
            userInfo: [
                "bundleId": bundleId,
                "appName": appName,
                "sessionDuration": sessionDuration,
                "totalUsage": currentDayUsage[bundleId]!,
                "timestamp": Date().timeIntervalSince1970
            ]
        )
        
        // Check if this usage triggers a coin penalty
        checkImmediatePenalty(for: bundleId)
    }
    
    private func checkImmediatePenalty(for bundleId: String) {
        guard let totalUsage = currentDayUsage[bundleId] else { return }
        
        let totalMinutes = totalUsage / 60
        let penaltiesOwed = Int(totalMinutes / 15)
        
        if penaltiesOwed > 0 && Int(totalMinutes) % 15 == 0 {
            // User just hit a 15-minute threshold
            applyCoinPenalty(amount: 1, minutes: totalMinutes)
        }
    }
    
    private func getTotalSocialMediaUsageToday() -> Double {
        // First try to get from extension (most accurate)
        let extensionMinutes = extensionUserDefaults?.double(forKey: "dailySocialMediaMinutes") ?? 0.0
        
        if extensionMinutes > 0 {
            return extensionMinutes
        }
        
        // Fallback to local tracking
        return currentDayUsage.values.reduce(0, +) / 60 // Convert to minutes
    }
    
    // MARK: - Daily Reset & Persistence
    private func resetDailyUsageIfNeeded() {
        let calendar = Calendar.current
        let now = Date()
        let lastResetKey = "LastUsageReset"
        
        if let lastReset = UserDefaults.standard.object(forKey: lastResetKey) as? Date {
            if !calendar.isDate(lastReset, inSameDayAs: now) {
                // New day - reset usage
                currentDayUsage.removeAll()
                UserDefaults.standard.set(now, forKey: lastResetKey)
                print("📱 [ScreenTime] Reset daily usage for new day")
            }
        } else {
            // First time setup
            UserDefaults.standard.set(now, forKey: lastResetKey)
        }
    }
    
    // MARK: - Event Handling
    private func setupNotificationObservers() {
        // Listen for DeviceActivity threshold events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThresholdEvent),
            name: NSNotification.Name("DeviceActivityThresholdReached"),
            object: nil
        )
        
        // Listen for app usage updates from monitoring extension
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUsageUpdate),
            name: NSNotification.Name("DeviceActivityUsageUpdate"),
            object: nil
        )
        
        // Reset usage daily
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDayChange),
            name: UIApplication.significantTimeChangeNotification,
            object: nil
        )
    }
    
    // MARK: - Extension Communication
    private let extensionUserDefaults = UserDefaults(suiteName: "group.com.karthikdigavalli.lockin.deviceactivity")
    private var extensionEventTimer: Timer?
    
    private func setupExtensionCommunication() {
        // Listen for Darwin notifications from extension
        let notificationCenter = CFNotificationCenterGetDarwinNotifyCenter()
        
        CFNotificationCenterAddObserver(
            notificationCenter,
            Unmanaged.passUnretained(self).toOpaque(),
            { (center, observer, name, object, userInfo) in
                guard let observer = observer else { return }
                let manager = Unmanaged<ScreenTimeManager>.fromOpaque(observer).takeUnretainedValue()
                
                if let notificationName = name?.rawValue as String? {
                    DispatchQueue.main.async {
                        manager.handleDarwinNotification(notificationName)
                    }
                }
            },
            "com.karthikdigavalli.lockin.screentime.coin_penalty" as CFString,
            nil,
            .deliverImmediately
        )
        
        print("📱 [ScreenTime] Extension communication setup complete")
    }
    
    private func startExtensionEventPolling() {
        // Poll every 10 seconds for events from extension
        extensionEventTimer?.invalidate()
        extensionEventTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: true) { [weak self] _ in
            self?.processExtensionEvents()
        }
    }
    
    @objc private func handleDarwinNotification(_ notificationName: String) {
        print("📱 [ScreenTime] Received Darwin notification: \(notificationName)")
        
        if notificationName.contains("coin_penalty") {
            // Process coin penalty immediately
            processExtensionEvents()
        }
    }
    
    private func processExtensionEvents() {
        guard let events = extensionUserDefaults?.array(forKey: "pendingEvents") as? [[String: Any]] else {
            return
        }
        
        // Process all pending events
        for eventData in events {
            guard let event = eventData["event"] as? String,
                  let data = eventData["data"] as? [String: Any] else {
                continue
            }
            
            handleExtensionEvent(event: event, data: data)
        }
        
        // Clear processed events
        extensionUserDefaults?.removeObject(forKey: "pendingEvents")
    }
    
    private func handleExtensionEvent(event: String, data: [String: Any]) {
        print("📱 [ScreenTime] Processing extension event: \(event)")
        
        switch event {
        case "coin_penalty":
            handleExtensionCoinPenalty(data: data)
            
        case "usage_update":
            handleExtensionUsageUpdate(data: data)
            
        case "monitoring_started":
            print("📱 [ScreenTime] Extension monitoring started")
            
        case "monitoring_ended":
            print("📱 [ScreenTime] Extension monitoring ended")
            
        case "daily_reset":
            handleExtensionDailyReset(data: data)
            
        default:
            print("📱 [ScreenTime] Unknown extension event: \(event)")
        }
    }
    
    private func handleExtensionCoinPenalty(data: [String: Any]) {
        guard let penalty = data["penalty"] as? Int,
              let reason = data["reason"] as? String,
              let totalMinutes = data["totalMinutes"] as? Double else {
            return
        }
        
        print("📱 [ScreenTime] 🚨 REAL COIN PENALTY from extension: -\(penalty) coins for \(totalMinutes) minutes")
        
        // Update local usage data
        currentDayUsage["total_social_media"] = totalMinutes * 60 // Convert to seconds
        lastUpdateTimestamp = Date()
        
        // Emit React Native event for coin deduction
        sendEvent(withName: "LockInCoinPenalty", body: [
            "penalty": penalty,
            "reason": reason,
            "minutes": totalMinutes,
            "timestamp": Date().timeIntervalSince1970,
            "isRealUsage": true,
            "source": "extension"
        ])
        
        // Also emit usage update event
        sendEvent(withName: "ScreenTimeUsageUpdate", body: [
            "totalMinutes": totalMinutes,
            "penalty": penalty,
            "timestamp": Date().timeIntervalSince1970,
            "source": "extension"
        ])
    }
    
    private func handleExtensionUsageUpdate(data: [String: Any]) {
        guard let totalMinutes = data["totalMinutes"] as? Double else {
            return
        }
        
        // Update local usage tracking
        currentDayUsage["total_social_media"] = totalMinutes * 60 // Convert to seconds
        lastUpdateTimestamp = Date()
        
        print("📱 [ScreenTime] Extension usage update: \(totalMinutes) minutes total")
    }
    
    private func handleExtensionDailyReset(data: [String: Any]) {
        // Extension reset daily counters - do the same in main app
        currentDayUsage.removeAll()
        lastUpdateTimestamp = Date()
        
        print("📱 [ScreenTime] Daily reset triggered by extension")
        
        sendEvent(withName: "ScreenTimeDailyReset", body: data)
    }
    
    @objc private func handleThresholdEvent(_ notification: Notification) {
        print("📱 [ScreenTime] Threshold event received")
        
        if let userInfo = notification.userInfo,
           let eventName = userInfo["eventName"] as? String {
            
            if eventName == "fifteenMinutePenalty" {
                // Apply immediate coin penalty
                applyCoinPenalty(amount: 1, minutes: 15)
            }
        }
    }
    
    @objc private func handleUsageUpdate(_ notification: Notification) {
        if let userInfo = notification.userInfo,
           let bundleId = userInfo["bundleId"] as? String,
           let sessionTime = userInfo["sessionTime"] as? TimeInterval {
            
            recordAppUsage(bundleId: bundleId, sessionDuration: sessionTime)
        }
    }
    
    @objc private func handleDayChange(_ notification: Notification) {
        resetDailyUsageIfNeeded()
    }
    
    // MARK: - Helper Methods
    private func isAppInstalled(bundleId: String) -> Bool {
        // Use LSApplicationWorkspace for more reliable app detection
        guard let url = URL(string: "\(bundleId)://") else { return false }
        return UIApplication.shared.canOpenURL(url)
    }
    
    private func authorizationStatusString(_ status: AuthorizationStatus) -> String {
        switch status {
        case .notDetermined: return "notDetermined"
        case .denied: return "denied"
        case .approved: return "approved"
        @unknown default: return "unknown"
        }
    }
}

