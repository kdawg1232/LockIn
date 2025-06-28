import AsyncStorage from '@react-native-async-storage/async-storage';
import { processDailyChallengeResolution } from './dailyChallengeService';
import { getNewOpponent } from './opponentService';
import supabase from '../../lib/supabase';
import { EventEmitter } from 'events';
import { AppState } from 'react-native';
import { ChallengeResult, ChallengeResolutionResponse } from '../types/challenge';

// Storage keys for persistent timers
const NEXT_OPPONENT_TIME_KEY = 'next_opponent_time';
const ACTIVE_FOCUS_SESSION_KEY = 'active_focus_session';
const CURRENT_OPPONENT_ID_KEY = 'current_opponent_id';
const DAILY_STATS_RESET_KEY = 'daily_stats_reset_time';

// Event name constants
export const TIMER_EVENTS = {
  OPPONENT_SWITCH: 'opponentSwitch',
  CHALLENGE_RESULT: 'challengeResult',
  FOCUS_SESSION_UPDATE: 'focusSessionUpdate',
  TIMER_UPDATE: 'timerUpdate',
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

interface ChallengeResultEvent {
  won: boolean;
  opponentName: string;
  focusScore: number; // Coins gained by user during this challenge
  opponentScore: number; // Coins gained by opponent during this challenge
}

/**
 * Global Timer Service
 * Manages persistent timers that work regardless of app state
 */
class GlobalTimerService extends EventEmitter {
  private nextOpponentTime: number | null = null;
  private activeFocusSession: ActiveFocusSession | null = null;
  private currentOpponentId: string | null = null;
  private lastStatsResetTime: number | null = null;
  private timer: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: any = null;

  constructor() {
    super();
    this.initialize();
    this.startUpdateInterval();
    this.setupAppStateListener();
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
    // Check opponent timer
    if (this.nextOpponentTime && Date.now() >= this.nextOpponentTime) {
      this.handleOpponentSwitch();
    }

    // Check focus session
    if (this.activeFocusSession && this.isFocusSessionCompleted()) {
      this.completeFocusSession();
    }

    // Emit timer update
    this.emit(TIMER_EVENTS.TIMER_UPDATE, {
      opponentTimeRemaining: this.getNextOpponentTimeRemaining(),
      focusSessionRemaining: this.getFocusSessionTimeRemaining(),
    });
  }

  // Initialize timers from storage
  private async initialize() {
    try {
      // Load next opponent time
      const nextOpponentTimeStr = await AsyncStorage.getItem(NEXT_OPPONENT_TIME_KEY);
      if (nextOpponentTimeStr) {
        this.nextOpponentTime = parseInt(nextOpponentTimeStr);
      } else {
        // Set initial next opponent time (5 minutes from now for development)
        await this.setNextOpponentTime();
      }

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

      // Load active focus session
      const activeFocusSessionStr = await AsyncStorage.getItem(ACTIVE_FOCUS_SESSION_KEY);
      if (activeFocusSessionStr) {
        this.activeFocusSession = JSON.parse(activeFocusSessionStr);
        
        // Check if session has expired
        if (this.isFocusSessionCompleted()) {
          await this.completeFocusSession();
        }
      }
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
  }

  // Set next opponent time (5 minutes from now for development)
  private async setNextOpponentTime() {
    const now = Date.now();
    this.nextOpponentTime = now + (5 * 60 * 1000); // 5 minutes in milliseconds
    await AsyncStorage.setItem(NEXT_OPPONENT_TIME_KEY, this.nextOpponentTime.toString());
    this.notifyListeners();
  }

  // Handle opponent switching when timer expires
  private async handleOpponentSwitch() {
    if (this.currentOpponentId) {
      try {
        const { data: { user } } = await supabase.getUser();
        if (!user?.id) return;

        // Get today's coin transactions for both users before processing resolution
        const { getTodaysCoinTransactions } = await import('./timerService');
        const [userStatsResult, opponentStatsResult] = await Promise.all([
          getTodaysCoinTransactions(user.id),
          getTodaysCoinTransactions(this.currentOpponentId)
        ]);

        const resolution = await processDailyChallengeResolution(user.id, this.currentOpponentId);
        
        if (resolution.success && resolution.result) {
          // Emit the challenge result for the modal to display using today's coins gained
          this.emit(TIMER_EVENTS.CHALLENGE_RESULT, {
            won: resolution.result.outcome === 'win',
            opponentName: 'Opponent', // We don't have the opponent name in the result
            focusScore: userStatsResult.netCoins || 0, // Use coins gained today, not total coins
            opponentScore: opponentStatsResult.netCoins || 0, // Use coins gained today, not total coins
          } as ChallengeResultEvent);
        }

        // Get new opponent
        const newOpponent = await getNewOpponent(user.id);
        if (newOpponent) {
          this.currentOpponentId = newOpponent.id;
          await AsyncStorage.setItem(CURRENT_OPPONENT_ID_KEY, newOpponent.id);
          
          const now = Date.now();
          this.lastStatsResetTime = now;
          await AsyncStorage.setItem(DAILY_STATS_RESET_KEY, now.toString());
          
          await this.setNextOpponentTime();
          
          // Emit the opponent switch event
          this.emit(TIMER_EVENTS.OPPONENT_SWITCH, newOpponent.id);
        }
      } catch (error) {
        console.error('Error handling opponent switch:', error);
      }
    }
  }

  // This method is no longer needed as we use the opponent service directly
  // Keeping it for backward compatibility but it's deprecated
  private async selectNewOpponent(): Promise<string | null> {
    console.warn('selectNewOpponent is deprecated - use opponent service directly');
    return this.currentOpponentId;
  }

  // Get time remaining until next opponent
  getNextOpponentTimeRemaining(): string {
    if (!this.nextOpponentTime) {
      return '00:05:00';
    }

    const now = Date.now();
    const timeDiff = this.nextOpponentTime - now;

    if (timeDiff <= 0) {
      // Time expired - handle opponent switch and reset timer
      this.handleOpponentSwitch();
      this.setNextOpponentTime();
      return '00:05:00';
    }

    // Convert to HH:MM:SS format
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
    if (this.activeFocusSession) {
      this.emit(TIMER_EVENTS.FOCUS_SESSION_UPDATE, this.activeFocusSession);
    }
    this.emit(TIMER_EVENTS.TIMER_UPDATE, {
      opponentTimeRemaining: this.getNextOpponentTimeRemaining(),
      focusSessionRemaining: this.getFocusSessionTimeRemaining(),
    });
  }

  // Force refresh next opponent timer (for testing)
  async resetNextOpponentTimer() {
    await this.setNextOpponentTime();
  }

  // Force opponent switch (for testing)
  async forceOpponentSwitch() {
    await this.handleOpponentSwitch();
    await this.setNextOpponentTime();
  }

  // Override the default addListener to handle our specific events
  public on(event: typeof TIMER_EVENTS[keyof typeof TIMER_EVENTS], listener: (...args: any[]) => void) {
    return super.on(event, listener);
  }
}

// Create singleton instance
const globalTimerService = new GlobalTimerService();

export default globalTimerService; 