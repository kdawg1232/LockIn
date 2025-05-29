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


Sprint 2 – Focus Timer & Coin Engine
Goal: Users can start/stop focus sessions; coins credited in DB;

 2.1 Create focus_sessions table (id, user_id, start, end, duration_min)

 2.2 Add coin_transactions table (id, user_id, delta, reason, created_at)

 2.3 Implement 30-min timer component with start/stop states

 2.4 Persist session start/end to Supabase in real time

 2.5 Award +2 coins when session ≥ 30 min completed

 2.6 Award +4 coins if ≥ 60 min (placeholder for bigger reward)

 2.7 Debit −6 coins API placeholder (will be used by social-usage tracker in Sprint 4)

 2.8 Create helper getNetCoinsToday(user_id) RPC or client calc

 2.9 Refresh Daily Stats component on focus/unfocus

 2.10 Add Expo toast/snackbar for "+2 coins earned!"

 2.11 Guard against overlapping timers

 2.12 Basic unit tests for timer hooks

 2.13 Push local notifications on session completion (will be expanded later)

 2.14 Update Home skeleton to show earned coins circle after timer ends

 2.15 QA on physical devices

## Discovered During Work

✅ 1.13 Create StatsScreen with Accept button flow - Add "Accept" button to OpponentOfTheDay screen that navigates to StatsScreen showing user vs opponent stats (Coins Gained, Coins Lost, Net Coins) with "Lock In" button and daily countdown timer (2024-12-19)

✅ 1.14 Create TimerDistractionScreen with 5-minute focus timer - Implement timer screen with start/stop functionality, coin tracking database schema (coin_transactions and focus_sessions tables), and success/failure modals (2024-12-19)

✅ 1.15 Integrate real coin tracking with StatsScreen - Replace placeholder data with actual database calls, implement automatic refresh when screen comes into focus, show real user and opponent coin progress from completed focus sessions (2024-12-19)