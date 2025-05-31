LLM should place green checkmark when the task in the sprint is finished:


Sprint 1 – Auth & First-Screen Skeleton
Goal: Users can sign up / sign in with Supabase auth and land on the bare-bones "Opponent of the Day" home screen.


✅ 1.1 Create Expo project & workspace setup


✅ 1.2 Install core deps (react-native-supabase, react-navigation, tailwind-react-native-classnames, dotenv)


✅ 1.3 Configure .env with Supabase URL & anon key


✅ 1.4 Implement email-password Sign Up form


✅ 1.5 Implement email-password Sign In form


✅ 1.6 Create users table (id, email, created_at, display_name, avatar_url, school, major)


✅ 1.7 On first login, write user profile row


✅ 1.8 Set up global tailwind styling baseline


✅ 1.9 Placehold "Opponent of the Day" card component (static data for now)


✅ 1.10 Link a basic Profile screen via header avatar tap


✅ 1.11 Test on Android & iOS simulators


✅ 1.12 Write unit tests for both frontend and backend in their respective folders.


Definition of Done: A new user can register, log in, and see the scaffolding of the main screen; navigation works, no runtime errors.


## Discovered During Work

✅ 1.13 Create StatsScreen with Accept button flow - Add "Accept" button to OpponentOfTheDay screen that navigates to StatsScreen showing user vs opponent stats (Coins Gained, Coins Lost, Net Coins) with "Lock In" button and daily countdown timer (2024-12-19)

✅ 1.14 Create TimerDistractionScreen with 5-minute focus timer - Implement timer screen with start/stop functionality, coin tracking database schema (coin_transactions and focus_sessions tables), and success/failure modals (2024-12-19)

✅ 1.15 Integrate real coin tracking with StatsScreen - Replace placeholder data with actual database calls, implement automatic refresh when screen comes into focus, show real user and opponent coin progress from completed focus sessions (2024-12-19)

✅ 1.16 MVP testing optimizations - Change timer from 5 minutes to 30 seconds, new opponent cycle from 24 hours to 20 minutes, remove 30-second periodic refresh in favor of focus-based updates for faster development testing (2024-12-19)

✅ 1.17 Fix timer countdown and database errors - Fixed countdown timer not updating by storing fixed end time instead of recalculating from "now", fixed database integer type error by using 1 minute instead of 0.5, and corrected custom REST client data handling (2024-12-19)

✅ 1.18 Implement persistent global timers - Created global timer service with AsyncStorage persistence for both opponent countdown (20min cycle) and focus session timers (30s), added automatic navigation to timer screen when app reopens with active session, timers now work regardless of app state or screen (2024-12-19)

✅ 1.19 Fix coin tracking and add opponent simulation - Updated completion modal to show "You have earned 2 coins!", added comprehensive debug logging to track coin transactions, created opponent simulator for testing stats updates, added debug button to manually trigger opponent activity (2024-12-19)

✅ 1.20 Fix RLS policies for opponent simulation - Fixed "new row violates row-level security policy" error by updating coin_transactions RLS policy to allow authenticated users to create transactions for any user (needed for opponent simulation), created FIX_RLS_POLICIES.sql script (2024-12-19)

✅ 1.21 Remove opponent simulation for real user testing - Removed opponent simulator service and debug buttons, updated test guide to focus on manual testing with real user accounts, cleaner codebase for production (2024-12-19)

✅ 1.22 Debug signup error "Failed to create account" - Added comprehensive error logging to auth service, signup screen, and Supabase client to identify the exact cause of signup failures. FIXED: Issue was email confirmation flow not being handled properly - users were being created successfully but code was incorrectly reporting failure. (2024-12-26)

✅ 1.25 Create UserStatsScreen with app usage graphs and Screen Time API integration - Add clickable user card on daily stats screen that navigates to UserStatsScreen showing social media app usage graphs (each app individually), with -1 coin per 15 minutes rule. Implement foundation for Apple Screen Time API and Family Controls framework integration with dummy data for now. Update DATABASE.sql with activity_tracking table schema. (2024-12-26)


## Sprint 2 - Core Focus Features
Goal: Implement core focus timer functionality, including social media blocking and enhanced timer UI.

2.1 Enhance timer UI
- Add circular progress animation
- Improve visual feedback during focus
- Add haptic feedback on start/stop/complete

2.2 Implement coin rewards system
- Create coins table in Supabase
- Track coin history
- Add animations for coin earnings
- Show coin balance in profile

2.3 Add opponent matching system
- Implement daily opponent selection
- Create matching algorithm
- Add opponent profile preview
- Show win/loss history

2.4 Create leaderboard system
- Design leaderboard UI
- Implement scoring system
- Add weekly/monthly views
- Show user rankings

2.5 Add push notifications
- Set up Expo notifications
- Add session completion notifications
- Implement opponent challenge notifications
- Add daily reminder options

2.6 Implement app blocking foundation (while waiting for Apple approval)
- Create `useAppBlocking` hook ✅
- Add placeholder UI for blocked apps ✅
- Implement temporary URL scheme blocking
- Prepare native module interface
- Add graceful fallback for Android

2.7 Add user settings
- Create settings screen
- Add notification preferences
- Configure session durations
- Manage blocked apps list

2.8 Enhance profile screen
- Add achievement badges
- Show focus session history
- Display streak information
- Add profile customization

Definition of Done: All core features are implemented and working with placeholder app blocking, ready for native module integration when Apple approves.



