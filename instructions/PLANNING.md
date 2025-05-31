# 📒 PLANNING.md – Focus‑Competition Productivity App


---


## 1  Product Vision


Help students and knowledge‑workers **trade distraction for deep work** through a playful, 1‑day‑at‑a‑time competition.  Users "lock in" focus sessions that block social apps; they **earn coins** for completed sessions and **lose coins** for doom‑scrolling.  A daily matched opponent, taunts, and leaderboards add lightweight peer pressure.


---


Organization:


Organize all files in respective folders:
-- Backend
-- Frontend


## 2  Core User Stories


|  ID | Story                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- |
|  U1 | *As a user, I want to start a 30‑min or 60‑min focus timer that blocks social media so I can concentrate.*    |
|  U2 | *As a user, I want to see a live countdown and stop button so I know how much time is left.*                  |
|  U3 | *As a user, I earn ******+2****** coins (30 min) or ******+4****** coins (60 min) when the timer completes.*  |
|  U4 | *As a user, I lose 1 coin for every 15 min spent on tracked social apps.*                                     |
|  U5 | *As a user, I am paired with a random opponent each day at 07:00 and can accept/decline the matchup.*         |
|  U6 | *As a user, I can "taunt" my opponent after I finish a focus session, triggering a push notification.*        |
|  U7 | *As a user, I can view today's stats (my net coins vs opponent) and time remaining in the day.*               |
|  U8 | *As a user, I can open my profile to see total coins, calendar of outcomes, future leaderboard & redemption.* |


---


## 3  Architecture Overview


```
┌────────────────────┐            ┌─────────────────────┐
│  React Native APP  │  REST/RPC  │     Supabase        │
│  (Expo + TS)       │◀──────────▶│  Postgres + Realtime│
└────────────────────┘            └─────────────────────┘
       ▲  ▲                                   ▲
       │  │ Push & RT Subscriptions           │
       │  └───────────────────────────────────┘
       │          Cloud Functions (Edge) – opponent matchmaking & daily resets
       ▼
OS‑level usage stats / Screen‑time APIs (Android UsageStats, iOS ScreenTime)
```


We will be using React Native, Supabase for databases, and Expo for authentication and to see our app development progress visually.




---


## 5  Game Economy


* **+2** coins for 30‑min session; **+4** for 60‑min.
* **‑1** coin per 15 min social usage (config via `settings` table).
* **Daily winner** = higher net coins; winner streak TBD.
* Future: spend coins on avatars, raffle tickets, IRL discounts.


---


## 6  Non‑Functional Requirements


* **Time‑zone aware** (all daily resets @ local 07:00 user time).
* **Accessibility:** dynamic type, VoiceOver labels.
* **All screens same size** (note from sketch) → use shared `<Card>` pattern within scroll view.
* **Privacy:** raw app‑usage durations stay on device; only aggregate coin deltas synced.
* **Performance:** ≤75 MB memory, timers survive backgrounding, battery drain <1 %/hr.




## 4. Architecture & Tech Stack


| Layer                | Decision                                                                             | Rationale / Notes                                 |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Mobile Client        | **React Native + Expo (managed workflow)**                                           | Fast iteration, OTA updates, EAS Build.           |
| Styling              | **Tailwind CSS via NativeWind**                                                      | Utility‑first, designer‑friendly, cross‑platform. |
| State Mgmt           | React Context + Zustand (swapable)                                                   | Keep minimal until complexity grows.              |
| Backend‑as‑a‑Service | **Supabase** (Postgres, Row Level Security, Realtime)                                | Handles auth, database, and edge functions.       |
| Auth                 | Supabase email/password to start; OAuth later                                        | Easy to integrate with React Native.              |
| Data                 | Postgres tables (users, focus\_sessions, penalties, challenges, duels, leaderboards) | Keys kept simple (uuid PKs, created\_at).         |
| File/Object storage  | Supabase storage (optional)                                                          | Profile photos, etc.                              |
| Push / Notifications | Expo Notifications (later)                                                           | Native & scheduled notifications.                 |
| Analytics            | PostHog or Supabase dashboard (later)                                                | Privacy‑first analytics.                          |


### Scaling Notes


* Supabase is horizontally scalable; enforce sensible RLS policies.
* Keep realtime features (leaderboards) behind separate Supabase channels to avoid over‑subscribing.
* Consider moving heavy compute (usage parsing) to Supabase Edge Functions or Serverless cron.


## 5. Non‑Functional Requirements


* **Privacy‑first**: store only necessary behavioural metrics; no raw key‑logging or screen data.
* **Mobile‑first performance**: ≥60 fps interactions on mid‑tier Android devices.
* **Security**: use HTTPS only, SecureStore for tokens.
* **Extensibility**: feature flags through Supabase remote config table.




## 7. Native Module Integration Plan

### App Blocking Implementation
The app blocking feature will be implemented in two phases:

#### Phase 1 - React Native MVP (Current)
* Build core app functionality using Expo managed workflow
* Implement placeholder app blocking interface via `useAppBlocking` hook
* Structure code to be "native-module ready"
* Use URL scheme interception as temporary blocking mechanism

#### Phase 2 - Native Swift Integration
* Switch to Expo Dev Client
* Create Swift module implementing `AppBlockingModule` with:
  - FamilyControls framework integration
  - Screen Time API authorization
  - ManagedSettings framework for app blocking
* Required iOS Entitlements:
  - `com.apple.developer.family-controls`
  - `com.apple.developer.screen-time-api`
* Bridge native functionality to React Native layer
* Keep existing React Native UI and state management

### Technical Implementation Details
```swift
// Future Swift module structure:
@objc(AppBlockingModule)
class AppBlockingModule: NSObject {
    @objc func requestAuthorization()  // FamilyControls auth
    @objc func startBlocking()         // ManagedSettings blocking
    @objc func stopBlocking()          // Remove restrictions
    @objc func updateBlockedApps()     // Update block list
    @objc func isAppBlocked()         // Check block status
}
```

### Migration Strategy
1. Complete core app development in Expo
2. Submit Special Entitlement Request to Apple for:
   - Screen Time API access (requires explicit Apple approval)
   - FamilyControls framework access
   - Include privacy policy, implementation details, and user benefit explanation
   - Plan for 2-4 weeks review time
3. After approval, implement Swift module
4. Switch to Expo Dev Client
5. Bridge native functionality
6. Test and deploy

Note: Screen Time API and FamilyControls framework require explicit approval from Apple through their special entitlement request process (separate from App Store review). Start this process early as it can take several weeks.

### Screen Time API Entitlement Request Guide

When submitting the request at developer.apple.com/contact/request/screen-time-api/, include:

#### 1. App Purpose & User Benefit
* **Primary Use Case**: "LockIn helps students and professionals improve focus by gamifying distraction-free work sessions"
* **User Benefits**:
  - Earn rewards for maintaining focus
  - Compete with peers to build better habits
  - Track and improve productivity metrics
  - Build sustainable deep work practices

#### 2. Screen Time API Usage
* **FamilyControls Implementation**:
  - User-initiated focus sessions
  - Temporary blocks on specific social apps
  - User can cancel session at any time
  - All restrictions auto-lift when session ends
* **Privacy & Control**:
  - No background monitoring without active session
  - User explicitly starts each focus session
  - Clear UI showing which apps are blocked
  - Easy way to disable restrictions

#### 3. Data Usage & Privacy
* **Data Collection**:
  - Only aggregate session completion status
  - No detailed app usage data stored
  - No tracking outside focus sessions
  - All app usage data stays on device
* **Privacy Measures**:
  - No third-party data sharing
  - No behavior profiling
  - Local-only app usage tracking
  - Clear privacy policy and user consent

#### 4. Technical Implementation
* **Frameworks Used**:
  - FamilyControls
  - ManagedSettings
  - DeviceActivity
* **Implementation Details**:
  - User authorizes via FamilyControls
  - ManagedSettings for app blocking
  - DeviceActivity for session tracking
  - All within user-initiated sessions

#### 5. Supporting Materials
* Include:
  - App Store privacy policy link
  - Screenshots of authorization flow
  - Mockups of blocking interface
  - User control demonstrations
  - Data handling documentation

This level of detail demonstrates to Apple that we:
1. Have a legitimate productivity use case
2. Respect user privacy and control
3. Only use necessary permissions
4. Have a well-thought-out implementation

### Migration Strategy
1. Complete core app development in Expo
2. Submit Special Entitlement Request to Apple for:
   - Screen Time API access (requires explicit Apple approval)
   - FamilyControls framework access
   - Include privacy policy, implementation details, and user benefit explanation
   - Plan for 2-4 weeks review time
3. After approval, implement Swift module
4. Switch to Expo Dev Client
5. Bridge native functionality
6. Test and deploy

Note: Screen Time API and FamilyControls framework require explicit approval from Apple through their special entitlement request process (separate from App Store review). Start this process early as it can take several weeks.

---

*Use `PLANNING.md`