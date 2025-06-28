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

✅ 1.26 Create ProfileScreen with user management - Create ProfileScreen accessible from StatsScreen via top-right button. Display user profile pic, school, major, and name. Add "Edit Profile" button for updating user information in database. Include "Logout" button at bottom to sign out. Remove existing logout button from OpponentOfTheDay screen. (2024-12-26)

✅ 1.27 Implement opponent card UI/UX improvements (2024-03-19) - Enhanced opponent card with white pulsing animation for new opponents (removed green border). Added card clickability after acceptance with "Tap to view stats" hint. Fixed animation issues using consistent native drivers. Improved reset conditions for timer expiration and new opponent button. Fixed card layout and visibility issues.

✅ 1.28 On the Stats screen, add the following image to the bottom below the lock in button. The first one is Home button, when this is clicked, it takes to the Stats screen. When the profile button is clicked in the middle, the user goes to the profile screen. When the user clicks on the community button, it should lead to a new screen. Call this the CommunityScreen. On this page, just have "Coming soon!" (2024-12-26)

✅ 1.29 Profile screen needs to be changed a bit. When the User clicks on the profile screen on the navigational bar, it should lead to the profile screen where it shows the Focus Score and Win Streak. This should be part of the user database which gets updated if the user wins the challenge for the day. If they win, the win streak goes up by +1 and the focus score goes up +10. When the lose, the win streak goes back to 0 and the focus score goes down by -5. (2024-12-26)

✅ 1.30 Add in the total coins count as well, this field should be in the database as well. (2024-12-26)

✅ 1.31 At the top right there should represents a gear icon. If the user clicks on this, it should go to a new screen called Settings and Privacy. On this screen there should be a clickable word called Edit Profile, which will allow user to edit the profile. Below this, there should be anotherc clickable word called Delete Data which will allow the user to delete all their data. 
Below this, Report Content: users can report a user. The developer need to be able to monitor the content and remove or block the user. 
Below this, there should be terms of service and privacy policy (2024-12-26)

✅ 1.32 Add in the calendar (a bunch of squares that represent the past 31 or 30 days). If the user wins, they get a green square below that day. If the user loses, they get a red square. There should be a week view, month view, and year view. This should be stored into a database as well. (2024-12-26) 

⏳ 1.33 Migrate to Bare Workflow and integrate iOS Family Controls API - Eject from Expo Managed to Bare Workflow, create Swift native module for Family Controls authorization and app blocking, configure entitlements, set up EAS Build profiles for native development, implement JavaScript bridge for Family Controls API, and test on real devices (2024-12-28)

⏳ 1.34 Implement Groups Feature - Create groups system where friends can compete against each other. Rename CommunityScreen to GroupScreen with "Create Group" button. Create CreateGroupScreen for group creation (name, description, invite users by username/name). Add "Invites" button to ProfileScreen for accepting group invitations. Group creators can kick members and edit details. Users can join multiple groups. Database: groups, group_memberships, group_invitations tables. (2024-12-28)
    
    ✅ 1.34.1 Enhanced GroupInvitesScreen to show group names and inviter details - Updated getAllInvitations service to fetch group names and inviter names, improved UI styling for better readability, invitations now display "Invited by [Name]" and proper group names (2024-12-28)
    
    ✅ 1.34.2 Added invite members functionality to GroupMembersScreen - Created invitation modal with user search, manual entry, and batch invitation sending, similar to CreateGroupScreen interface (2024-12-28)
    
    ✅ 1.34.3 Restricted group invitations to creators only - Only group creators can now invite new members to their groups, ensuring proper permission control (2024-12-28)
    
    ✅ 1.34.4 Added NavigationBar to group screens - Added bottom navigation bar to GroupMembersScreen and GroupInvitesScreen for consistent navigation experience (2024-12-28)
    
    ✅ 1.34.5 Enhanced member count tracking - Updated getUserGroups service to fetch real-time member counts, groups now show accurate member counts that update when new members join (2024-12-28)

