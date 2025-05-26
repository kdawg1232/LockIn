# 📒 PLANNING.md – Focus‑Competition Productivity App


---


## 1  Product Vision


Help students and knowledge‑workers **trade distraction for deep work** through a playful, 1‑day‑at‑a‑time competition.  Users “lock in” focus sessions that block social apps; they **earn coins** for completed sessions and **lose coins** for doom‑scrolling.  A daily matched opponent, taunts, and leaderboards add lightweight peer pressure.


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
|  U7 | *As a user, I can view today’s stats (my net coins vs opponent) and time remaining in the day.*               |
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




---


*Use `PLANNING.md` as the single source of truth; reference it at the beginning of any new conversation. Update through PRs or direct edits when architectural decisions change.*