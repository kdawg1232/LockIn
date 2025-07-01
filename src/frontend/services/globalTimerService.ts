import AsyncStorage from '@react-native-async-storage/async-storage';
import { processDailyChallengeResolution } from './dailyChallengeService';
import { getNewOpponent } from './opponentService';
import supabase from '../../lib/supabase';
import { EventEmitter } from 'events';
import { AppState } from 'react-native';
import { ChallengeResult, ChallengeResolutionResponse } from '../types/challenge';
import { getChallengeTimeInfo, formatTimeRemaining, isAtMidnight, isAt6AM, getCurrentChallengeDate } from '../../utils/timeUtils';

// Storage keys for persistent timers
const ACTIVE_FOCUS_SESSION_KEY = 'active_focus_session';
const CURRENT_OPPONENT_ID_KEY = 'current_opponent_id';
const DAILY_STATS_RESET_KEY = 'daily_stats_reset_time';
const PENDING_CHALLENGE_RESULTS_KEY = 'pending_challenge_results';
const LAST_MIDNIGHT_PROCESS_KEY = 'last_midnight_process_date';

// Event name constants
export const TIMER_EVENTS = {
  OPPONENT_SWITCH: 'opponentSwitch',
  CHALLENGE_RESULT: 'challengeResult',
  FOCUS_SESSION_UPDATE: 'focusSessionUpdate',
  TIMER_UPDATE: 'timerUpdate',
  CHALLENGE_PERIOD_CHANGE: 'challengePeriodChange',
  MIDNIGHT_PROGRESS: 'midnightProgress', // Individual user progress at midnight
  CHALLENGE_RESULTS: 'challengeResults', // Challenge comparison results at 6 AM
} as const;

// Interface for active focus session data
export interface ActiveFocusSession {
  sessionId: string;
  userId: string;
  startTime: number; // Unix timestamp
  duration: number; // Duration in seconds (30 for testing)
  coinsReward: number;
}

// Interface for opponent switch callback
export interface OpponentSwitchCallback {
  onOpponentSwitch: (newOpponentId: string) => void;
}

interface GroupChallengeResult {
  groupName: string;
  opponentName: string;
  focusScore: number;
  opponentScore: number;
}

interface ChallengeResultEvent {
  results: GroupChallengeResult[];
}

// Interface for midnight progress event (individual user stats)
interface MidnightProgressEvent {
  userStats: {
    coinsGained: number;
    coinsLost: number;
    netCoins: number;
  };
  userName: string;
}

/**
 * Global Timer Service
 * Manages timezone-aware challenge timing (6 AM to midnight local time)
 */
class GlobalTimerService extends EventEmitter {
  private activeFocusSession: ActiveFocusSession | null = null;
  private currentOpponentId: string | null = null;
  private lastStatsResetTime: number | null = null;
  private timer: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;
  private lastMidnightProcessDate: string | null = null;
  private pendingChallengeResults: any[] = [];

  constructor() {
    super();
    this.initialize();
    this.startUpdateInterval();
    this.setupAppStateListener();
    
    // Activity monitoring will be started when challenge begins
    // This allows proper timing integration with challenge cycles
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        this.startUpdateInterval();
      } else {
        this.cleanup();
      }
    });
  }

  private startUpdateInterval() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Update every second
    this.updateInterval = setInterval(() => {
      this.checkTimers();
    }, 1000);
  }

  private checkTimers() {
    const timeInfo = getChallengeTimeInfo();
    
    // Check for midnight - end current challenge and show results
    if (isAtMidnight() && this.shouldProcessMidnight()) {
      this.handleMidnight();
    }
    
    // Check for 6 AM - start new challenge and show results modal
    if (isAt6AM() && this.shouldProcess6AM()) {
      this.handle6AM();
    }
    
    // Emit timer update with current challenge state
    this.emit(TIMER_EVENTS.TIMER_UPDATE, {
      challengeTimeInfo: timeInfo,
      timeRemaining: timeInfo.isInChallengeWindow 
        ? formatTimeRemaining(timeInfo.timeUntilMidnight)
        : formatTimeRemaining(timeInfo.timeUntil6AM),
      isInChallengeWindow: timeInfo.isInChallengeWindow,
      isInRestPeriod: timeInfo.isInRestPeriod,
      focusSessionRemaining: this.getFocusSessionTimeRemaining(),
    });
  }

  // Initialize timers from storage
  private async initialize() {
    try {
      // Load current opponent ID
      const currentOpponentIdStr = await AsyncStorage.getItem(CURRENT_OPPONENT_ID_KEY);
      if (currentOpponentIdStr) {
        this.currentOpponentId = currentOpponentIdStr;
      }

      // Load last stats reset time
      const lastStatsResetTimeStr = await AsyncStorage.getItem(DAILY_STATS_RESET_KEY);
      if (lastStatsResetTimeStr) {
        this.lastStatsResetTime = parseInt(lastStatsResetTimeStr);
      }

      // Load last midnight process date
      const lastMidnightProcessDate = await AsyncStorage.getItem(LAST_MIDNIGHT_PROCESS_KEY);
      if (lastMidnightProcessDate) {
        this.lastMidnightProcessDate = lastMidnightProcessDate;
      }

      // Load pending challenge results
      const pendingResultsStr = await AsyncStorage.getItem(PENDING_CHALLENGE_RESULTS_KEY);
      if (pendingResultsStr) {
        this.pendingChallengeResults = JSON.parse(pendingResultsStr);
      }

      // Load active focus session
      const activeFocusSessionStr = await AsyncStorage.getItem(ACTIVE_FOCUS_SESSION_KEY);
      if (activeFocusSessionStr) {
        this.activeFocusSession = JSON.parse(activeFocusSessionStr);
        console.log('🔧 Loaded active focus session from storage:', this.activeFocusSession);
      }

      // Check current time and start appropriate services
      const timeInfo = getChallengeTimeInfo();
      
      if (timeInfo.isInChallengeWindow && this.currentOpponentId) {
        // We're in a challenge window, start monitoring
        await this.startChallengeMonitoring();
        console.log('⏰ Initialized during challenge window - monitoring started');
      } else if (timeInfo.isInRestPeriod) {
        console.log('⏰ Initialized during rest period (midnight to 6 AM)');
        // Check if we have pending results to show at 6 AM
        if (this.pendingChallengeResults.length > 0) {
          console.log('⏰ Found pending challenge results for 6 AM display');
        }
      }
      
      // Emit initial challenge period state
      this.emit(TIMER_EVENTS.CHALLENGE_PERIOD_CHANGE, {
        isInChallengeWindow: timeInfo.isInChallengeWindow,
        isInRestPeriod: timeInfo.isInRestPeriod
      });
    } catch (error) {
      console.error('Error initializing global timers:', error);
    }
  }

  // Cleanup method to be called when the app is backgrounded
  public cleanup() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.removeAllListeners();
    
    // Stop activity monitoring on cleanup
    this.stopActivityMonitoring();
  }





  // This method is no longer needed as we use the opponent service directly
  // Keeping it for backward compatibility but it's deprecated
  private async selectNewOpponent(): Promise<string | null> {
    console.warn('selectNewOpponent is deprecated - use opponent service directly');
    return this.currentOpponentId;
  }

  // Get time remaining until next milestone (midnight or 6 AM)
  getTimeRemaining(): string {
    const timeInfo = getChallengeTimeInfo();
    
    if (timeInfo.isInChallengeWindow) {
      // During challenge: show time until midnight
      return formatTimeRemaining(timeInfo.timeUntilMidnight);
    } else {
      // During rest period: show time until 6 AM
      return formatTimeRemaining(timeInfo.timeUntil6AM);
    }
  }

  // Get current challenge state
  getChallengeState() {
    const timeInfo = getChallengeTimeInfo();
    return {
      isInChallengeWindow: timeInfo.isInChallengeWindow,
      isInRestPeriod: timeInfo.isInRestPeriod,
      timeRemaining: this.getTimeRemaining(),
      currentPhase: timeInfo.isInChallengeWindow ? 'challenge' : 'rest'
    };
  }

  // Get current opponent ID
  getCurrentOpponentId(): string | null {
    return this.currentOpponentId;
  }

  // Set current opponent ID (for initial setup)
  async setCurrentOpponentId(opponentId: string) {
    this.currentOpponentId = opponentId;
    await AsyncStorage.setItem(CURRENT_OPPONENT_ID_KEY, opponentId);
    this.notifyListeners();
  }

  // Get last stats reset time
  getLastStatsResetTime(): number | null {
    return this.lastStatsResetTime;
  }

  // Check if stats should be considered "reset" for a given timestamp
  isAfterLastStatsReset(timestamp: number): boolean {
    if (!this.lastStatsResetTime) {
      return true; // No reset recorded, consider all stats valid
    }
    return timestamp >= this.lastStatsResetTime;
  }

  // Start a focus session
  async startFocusSession(sessionId: string, userId: string, durationSeconds: number = 30, coinsReward: number = 2) {
    const session: ActiveFocusSession = {
      sessionId,
      userId,
      startTime: Date.now(),
      duration: durationSeconds,
      coinsReward
    };

    this.activeFocusSession = session;
    await AsyncStorage.setItem(ACTIVE_FOCUS_SESSION_KEY, JSON.stringify(session));
    this.notifyListeners();
  }

  // Get active focus session
  getActiveFocusSession(): ActiveFocusSession | null {
    return this.activeFocusSession;
  }

  // Get focus session time remaining
  getFocusSessionTimeRemaining(): number {
    if (!this.activeFocusSession) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - this.activeFocusSession.startTime;
    const remaining = (this.activeFocusSession.duration * 1000) - elapsed;

    return Math.max(0, Math.floor(remaining / 1000)); // Return seconds remaining
  }

  // Check if focus session is completed
  isFocusSessionCompleted(): boolean {
    if (!this.activeFocusSession) {
      return false;
    }

    const timeRemaining = this.getFocusSessionTimeRemaining();
    return timeRemaining <= 0;
  }

  // Complete focus session
  async completeFocusSession() {
    if (this.activeFocusSession) {
      this.activeFocusSession = null;
      await AsyncStorage.removeItem(ACTIVE_FOCUS_SESSION_KEY);
      this.notifyListeners();
    }
  }

  // Cancel focus session
  async cancelFocusSession() {
    if (this.activeFocusSession) {
      this.activeFocusSession = null;
      await AsyncStorage.removeItem(ACTIVE_FOCUS_SESSION_KEY);
      this.notifyListeners();
    }
  }

  // Notify listeners of specific updates
  private notifyListeners() {
    const timeInfo = getChallengeTimeInfo();
    
    if (this.activeFocusSession) {
      this.emit(TIMER_EVENTS.FOCUS_SESSION_UPDATE, this.activeFocusSession);
    }
    
    this.emit(TIMER_EVENTS.TIMER_UPDATE, {
      challengeTimeInfo: timeInfo,
      timeRemaining: this.getTimeRemaining(),
      isInChallengeWindow: timeInfo.isInChallengeWindow,
      isInRestPeriod: timeInfo.isInRestPeriod,
      focusSessionRemaining: this.getFocusSessionTimeRemaining(),
    });
  }





  // Force challenge end (for testing) - simulates midnight
  async forceChallengEnd() {
    console.log('🧪 Force ending challenge (simulating midnight)');
    await this.handleMidnight();
  }

  // Force challenge start (for testing) - simulates 6 AM
  async forceChallengeStart() {
    console.log('🧪 Force starting challenge (simulating 6 AM)');
    await this.handle6AM();
  }

  // Override the default addListener to handle our specific events
  public on(event: typeof TIMER_EVENTS[keyof typeof TIMER_EVENTS], listener: (...args: any[]) => void) {
    return super.on(event, listener);
  }

  // Stop activity monitoring
  private async stopActivityMonitoring() {
    try {
      const { default: activityTrackingService } = await import('./activityTrackingService');
      await activityTrackingService.stopBackgroundMonitoring();
      console.log('📱 Background app usage monitoring stopped');
    } catch (error) {
      console.error('📱 Error stopping activity monitoring:', error);
    }
  }

  // Start challenge-based activity monitoring
  private async startChallengeMonitoring() {
    try {
      // Import activity tracking service dynamically to avoid circular dependencies
      const { default: activityTrackingService } = await import('./activityTrackingService');
      
      // Stop any existing monitoring first
      await activityTrackingService.stopBackgroundMonitoring();
      
      // Start monitoring for this challenge cycle
      const monitoringStarted = await activityTrackingService.startBackgroundMonitoring();
      
      if (monitoringStarted) {
        console.log('📱 Challenge-based monitoring started for current opponent:', this.currentOpponentId);
      } else {
        console.log('📱 Background monitoring not available on this platform');
      }
    } catch (error) {
      console.error('📱 Error starting challenge monitoring:', error);
    }
  }

  // Handle midnight - show individual user progress
  private async handleMidnight() {
    try {
      console.log('🌙 Handling midnight - showing individual progress');

      const { data: { user } } = await supabase.getUser();
      if (!user?.id) {
        console.error('🌙 No user found for midnight progress');
        return;
      }

      // Mark that we've processed midnight for today
      const today = getCurrentChallengeDate();
      this.lastMidnightProcessDate = today;
      await AsyncStorage.setItem(LAST_MIDNIGHT_PROCESS_KEY, today);

      // Get user's individual stats for the day
      const { getTodaysCoinTransactions } = await import('./timerService');
      const userStatsResult = await getTodaysCoinTransactions(user.id);

      // Get user's display name
      const { getUserProfile } = await import('./profileService');
      const userProfileResult = await getUserProfile(user.id);
      
      const userName = userProfileResult?.data 
        ? `${userProfileResult.data.firstName} ${userProfileResult.data.lastName}`.trim() || 
          userProfileResult.data.username || 'You'
        : 'You';

      // Emit midnight progress event for individual user stats
      const midnightProgressData: MidnightProgressEvent = {
        userStats: {
          coinsGained: userStatsResult.coinsGained,
          coinsLost: userStatsResult.coinsLost,
          netCoins: userStatsResult.netCoins
        },
        userName
      };

      this.emit(TIMER_EVENTS.MIDNIGHT_PROGRESS, midnightProgressData);
      console.log('🌙 Midnight progress emitted:', midnightProgressData);

      // Stop activity monitoring during rest period
      await this.stopActivityMonitoring();
      console.log('🌙 Activity monitoring stopped for rest period');

      // Emit challenge period change
      this.emit(TIMER_EVENTS.CHALLENGE_PERIOD_CHANGE, {
        isInChallengeWindow: false,
        isInRestPeriod: true
      });

    } catch (error) {
      console.error('🌙 Error in handleMidnight:', error);
    }
  }

  // Handle 6 AM - process challenge results and start new challenge
  private async handle6AM() {
    try {
      console.log('🌅 Handling 6 AM - processing challenge results and starting new challenge');

      const { data: { user } } = await supabase.getUser();
      if (!user?.id) {
        console.error('🌅 No user found for 6 AM processing');
        return;
      }

      // Process challenge results for all groups
      const { groupPairingService } = await import('./groupPairingService');
      const groupPairings = await groupPairingService.getUserGroupPairings(user.id);

      const { getTodaysCoinTransactions, resetDailyCoins } = await import('./timerService');
      const { processDailyChallengeResolution } = await import('./dailyChallengeService');
      
      const results: GroupChallengeResult[] = [];

      // Process each group's challenge results
      for (const groupPairing of groupPairings) {
        const { groupName, pairing } = groupPairing;
        
        // Find the user's opponent in this group's pairs
        const userPair = pairing.pairs.find(pair => 
          pair.user1_id === user.id || pair.user2_id === user.id
        );
        
        if (userPair) {
          const opponentId = userPair.user1_id === user.id ? userPair.user2_id : userPair.user1_id;
          
          // Get final stats for both users from yesterday's challenge
          const [userStatsResult, opponentStatsResult] = await Promise.all([
            getTodaysCoinTransactions(user.id),
            getTodaysCoinTransactions(opponentId)
          ]);
          
          // Get opponent profile to get their name
          const { getUserProfile } = await import('./profileService');
          const opponentProfileResult = await getUserProfile(opponentId);
          
          // Create display name from first name, last name, or username
          const opponentName = opponentProfileResult?.data 
            ? `${opponentProfileResult.data.firstName} ${opponentProfileResult.data.lastName}`.trim() || 
              opponentProfileResult.data.username || 'Unknown'
            : 'Unknown';
          
          results.push({
            groupName,
            opponentName,
            focusScore: userStatsResult.netCoins,
            opponentScore: opponentStatsResult.netCoins
          });

          // Process challenge resolution for database records
          await processDailyChallengeResolution(user.id, opponentId);

          // Reset daily coins for both users to start fresh day
          await Promise.all([
            resetDailyCoins(user.id),
            resetDailyCoins(opponentId)
          ]);
        }
      }

      // Update last stats reset time
      this.lastStatsResetTime = Date.now();
      await AsyncStorage.setItem(DAILY_STATS_RESET_KEY, this.lastStatsResetTime.toString());

      // Emit challenge results for all groups
      if (results.length > 0) {
        this.emit(TIMER_EVENTS.CHALLENGE_RESULTS, { results } as ChallengeResultEvent);
        console.log('🌅 Challenge results emitted:', results);
      }

      // Start activity monitoring for new challenge day
      await this.startChallengeMonitoring();
      console.log('🌅 Activity monitoring started for new challenge day');

      // Emit challenge period change
      this.emit(TIMER_EVENTS.CHALLENGE_PERIOD_CHANGE, {
        isInChallengeWindow: true,
        isInRestPeriod: false
      });

    } catch (error) {
      console.error('🌅 Error in handle6AM:', error);
    }
  }

  // Check if we should process midnight (haven't processed today yet)
  private shouldProcessMidnight(): boolean {
    const today = getCurrentChallengeDate();
    return this.lastMidnightProcessDate !== today;
  }

  // Check if we should process 6 AM (only once per day)
  private shouldProcess6AM(): boolean {
    // Only process if we have pending results or no opponent set
    return this.pendingChallengeResults.length > 0 || !this.currentOpponentId;
  }
}

// Create singleton instance
const globalTimerService = new GlobalTimerService();

export default globalTimerService; 