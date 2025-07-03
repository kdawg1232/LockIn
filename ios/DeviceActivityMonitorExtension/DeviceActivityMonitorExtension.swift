import DeviceActivity
import Foundation
import ManagedSettings
import FamilyControls

// MARK: - DeviceActivityMonitor Extension for LockIn
// This extension runs in the background to monitor real Screen Time usage
class LockInDeviceActivityMonitor: DeviceActivityMonitor {
    
    // MARK: - Tracked Social Media Apps
    private let socialMediaBundleIds: Set<String> = [
        "com.burbn.instagram",           // Instagram
        "com.zhiliaoapp.musically",      // TikTok
        "com.twitter.twitter",           // Twitter/X
        "com.facebook.Facebook",         // Facebook
        "com.toyopagroup.picaboo",       // Snapchat
        "com.reddit.Reddit",             // Reddit
        "com.facebook.Messenger",        // Messenger
        "com.linkedin.LinkedIn",         // LinkedIn
        "com.pinterest",                 // Pinterest
        "com.discord",                   // Discord
        "com.instagram.threads"          // Threads
    ]
    
    private let store = ManagedSettingsStore()
    private let userDefaults = UserDefaults(suiteName: "group.com.karthikdigavalli.lockin.deviceactivity")
    
    // MARK: - Monitoring Lifecycle
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        print("📱 [Extension] Monitoring started for: \(activity.rawValue)")
        
        // Reset daily usage at start of new monitoring period
        if activity.rawValue == "LockInSocialMediaMonitor" {
            resetDailyUsageIfNeeded()
        }
        
        // Notify main app that monitoring started
        notifyMainApp(event: "monitoring_started", data: [
            "activity": activity.rawValue,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        print("📱 [Extension] Monitoring ended for: \(activity.rawValue)")
        
        // Save final usage data
        saveDailyUsageSummary()
        
        // Notify main app that monitoring ended
        notifyMainApp(event: "monitoring_ended", data: [
            "activity": activity.rawValue,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Critical Event: Threshold Reached
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        
        print("📱 [Extension] ⚠️ THRESHOLD REACHED: \(event.rawValue) for \(activity.rawValue)")
        
        // This is where we detect actual social media usage and apply coin penalties
        handleThresholdEvent(event: event, activity: activity)
    }
    
    override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventWillReachThresholdWarning(event, activity: activity)
        print("📱 [Extension] Warning: Approaching threshold for \(event.rawValue)")
        
        // Send warning to main app (could be used for notifications)
        notifyMainApp(event: "threshold_warning", data: [
            "eventName": event.rawValue,
            "activity": activity.rawValue,
            "timestamp": Date().timeIntervalSince1970
        ])
    }
    
    // MARK: - Real Usage Tracking & Coin Penalties
    private func handleThresholdEvent(event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        
        switch event.rawValue {
        case "fifteenMinutePenalty":
            // User has spent 15+ minutes on social media - apply coin penalty
            handleFifteenMinutePenalty()
            
        case "thirtyMinuteCheck":
            // Additional tracking point - record usage
            handleThirtyMinuteCheck()
            
        default:
            print("📱 [Extension] Unknown threshold event: \(event.rawValue)")
        }
    }
    
    private func handleFifteenMinutePenalty() {
        print("📱 [Extension] 🚨 15-minute social media usage detected - applying coin penalty")
        
        // Record usage increment
        let currentUsage = getCurrentSocialMediaUsage()
        let newUsage = currentUsage + 15.0 // Add 15 minutes
        updateSocialMediaUsage(minutes: newUsage)
        
        // Calculate coins to deduct (1 coin per 15 minutes)
        let coinsToDeduct = Int(newUsage / 15.0)
        
        // Send immediate coin penalty to main app
        notifyMainApp(event: "coin_penalty", data: [
            "penalty": coinsToDeduct,
            "reason": "social_media_15min",
            "totalMinutes": newUsage,
            "timestamp": Date().timeIntervalSince1970,
            "isRealUsage": true
        ])
        
        print("📱 [Extension] Coin penalty applied: -\(coinsToDeduct) coins for \(newUsage) minutes total")
    }
    
    private func handleThirtyMinuteCheck() {
        print("📱 [Extension] 30-minute usage checkpoint reached")
        
        let currentUsage = getCurrentSocialMediaUsage()
        let newUsage = currentUsage + 15.0 // Incremental tracking
        updateSocialMediaUsage(minutes: newUsage)
        
        // Send usage update to main app
        notifyMainApp(event: "usage_update", data: [
            "totalMinutes": newUsage,
            "timestamp": Date().timeIntervalSince1970,
            "checkpoint": "30min"
        ])
    }
    
    // MARK: - Usage Data Management
    private func getCurrentSocialMediaUsage() -> Double {
        return userDefaults?.double(forKey: "dailySocialMediaMinutes") ?? 0.0
    }
    
    private func updateSocialMediaUsage(minutes: Double) {
        userDefaults?.set(minutes, forKey: "dailySocialMediaMinutes")
        userDefaults?.set(Date(), forKey: "lastUsageUpdate")
        
        // Also update individual app usage if we can determine which app triggered this
        // For now, we distribute usage across active social media apps
        distributeMUsageAcrossApps(totalMinutes: minutes)
    }
    
    private func distributeMUsageAcrossApps(totalMinutes: Double) {
        // In a more sophisticated implementation, we would track which specific app
        // triggered the threshold. For now, we estimate distribution.
        
        let installedSocialApps = socialMediaBundleIds.filter { isAppInstalled($0) }
        let minutesPerApp = totalMinutes / Double(max(installedSocialApps.count, 1))
        
        for bundleId in installedSocialApps {
            let key = "usage_\(bundleId)"
            userDefaults?.set(minutesPerApp, forKey: key)
        }
        
        print("📱 [Extension] Distributed \(totalMinutes) minutes across \(installedSocialApps.count) apps")
    }
    
    private func resetDailyUsageIfNeeded() {
        let calendar = Calendar.current
        let now = Date()
        
        if let lastReset = userDefaults?.object(forKey: "lastDailyReset") as? Date {
            if !calendar.isDate(lastReset, inSameDayAs: now) {
                // New day - reset all usage counters
                resetAllUsageCounters()
                userDefaults?.set(now, forKey: "lastDailyReset")
                print("📱 [Extension] Reset daily usage for new day")
            }
        } else {
            // First time setup
            userDefaults?.set(now, forKey: "lastDailyReset")
        }
    }
    
    private func resetAllUsageCounters() {
        userDefaults?.set(0.0, forKey: "dailySocialMediaMinutes")
        
        // Reset individual app counters
        for bundleId in socialMediaBundleIds {
            let key = "usage_\(bundleId)"
            userDefaults?.removeObject(forKey: key)
        }
        
        // Notify main app about reset
        notifyMainApp(event: "daily_reset", data: [
            "timestamp": Date().timeIntervalSince1970,
            "resetDate": Calendar.current.startOfDay(for: Date()).timeIntervalSince1970
        ])
    }
    
    private func saveDailyUsageSummary() {
        let totalMinutes = getCurrentSocialMediaUsage()
        let today = DateFormatter().string(from: Date())
        
        userDefaults?.set(totalMinutes, forKey: "summary_\(today)")
        
        print("📱 [Extension] Saved daily summary: \(totalMinutes) minutes for \(today)")
    }
    
    // MARK: - App Installation Check
    private func isAppInstalled(_ bundleId: String) -> Bool {
        // In an extension, we have limited ability to check app installation
        // We'll assume social media apps are installed if user has reached thresholds
        return socialMediaBundleIds.contains(bundleId)
    }
    
    // MARK: - Main App Communication
    private func notifyMainApp(event: String, data: [String: Any]) {
        // Store the event for the main app to pick up
        let eventData: [String: Any] = [
            "event": event,
            "data": data,
            "extensionTimestamp": Date().timeIntervalSince1970
        ]
        
        // Save to shared UserDefaults for main app to read
        let eventsKey = "pendingEvents"
        var existingEvents = userDefaults?.array(forKey: eventsKey) as? [[String: Any]] ?? []
        existingEvents.append(eventData)
        
        // Keep only last 50 events to prevent memory issues
        if existingEvents.count > 50 {
            existingEvents = Array(existingEvents.suffix(50))
        }
        
        userDefaults?.set(existingEvents, forKey: eventsKey)
        
        print("📱 [Extension] Queued event '\(event)' for main app")
        
        // Also try to post a Darwin notification (if available)
        postDarwinNotification(event: event)
    }
    
    private func postDarwinNotification(event: String) {
        // Darwin notifications can cross process boundaries
        let notificationName = "com.karthikdigavalli.lockin.screentime.\(event)"
        CFNotificationCenterPostNotification(
            CFNotificationCenterGetDarwinNotifyCenter(),
            CFNotificationName(notificationName as CFString),
            nil,
            nil,
            true
        )
    }
} 
