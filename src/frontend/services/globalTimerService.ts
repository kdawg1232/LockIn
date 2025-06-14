import AsyncStorage from '@react-native-async-storage/async-storage';
import { processDailyChallengeResolution } from './dailyChallengeService';
import { getNewOpponent } from './opponentService';
import supabase from '../../lib/supabase';

// Storage keys for persistent timers
const NEXT_OPPONENT_TIME_KEY = 'next_opponent_time';
const ACTIVE_FOCUS_SESSION_KEY = 'active_focus_session';
const CURRENT_OPPONENT_ID_KEY = 'current_opponent_id';
const DAILY_STATS_RESET_KEY = 'daily_stats_reset_time';

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

/**
 * Global Timer Service
 * Manages persistent timers that work regardless of app state
 */
class GlobalTimerService {
  private nextOpponentTime: number | null = null;
  private activeFocusSession: ActiveFocusSession | null = null;
  private currentOpponentId: string | null = null;
  private lastStatsResetTime: number | null = null;
  private listeners: Set<() => void> = new Set();
  private opponentSwitchListeners: Set<OpponentSwitchCallback> = new Set();

  constructor() {
    this.initialize();
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
        
        // Check if session has expired (should have completed by now)
        const now = Date.now();
        const sessionEndTime = this.activeFocusSession!.startTime + (this.activeFocusSession!.duration * 1000);
        
        if (now >= sessionEndTime) {
          // Session should have completed - mark as completed
          await this.completeFocusSession();
        }
      }
    } catch (error) {
      console.error('Error initializing global timers:', error);
    }
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
    console.log('🔄 Opponent timer expired - switching opponent and processing challenge resolution');
    
    try {
      // Get current user ID from supabase session (more reliable than AsyncStorage)
      const { data: { user } } = await supabase.getUser();
      
      if (!user || !user.id) {
        console.error('🔄 No current user ID found - cannot process opponent switch');
        return;
      }
      
      const currentUserId = user.id;

      // Process daily challenge resolution if we have a current opponent
      if (this.currentOpponentId) {
        console.log('🔄 Processing daily challenge resolution for timer expiration...');
        const resolutionResult = await processDailyChallengeResolution(currentUserId, this.currentOpponentId);
        
        if (resolutionResult.success && resolutionResult.result) {
          console.log('🔄 Challenge resolution completed:', resolutionResult.result);
        } else {
          console.error('🔄 Challenge resolution failed:', resolutionResult.error);
        }
      }

      // Get a new opponent using the opponent service
      const newOpponent = await getNewOpponent(currentUserId);
      
      if (newOpponent) {
        // Update current opponent
        this.currentOpponentId = newOpponent.id;
        await AsyncStorage.setItem(CURRENT_OPPONENT_ID_KEY, newOpponent.id);
        
        // Mark stats reset time
        const now = Date.now();
        this.lastStatsResetTime = now;
        await AsyncStorage.setItem(DAILY_STATS_RESET_KEY, now.toString());
        
        // Reset the timer for the new opponent period
        await this.setNextOpponentTime();
        console.log('⏰ Timer reset for new opponent period');
        
        // Notify all opponent switch listeners
        this.opponentSwitchListeners.forEach(listener => {
          listener.onOpponentSwitch(newOpponent.id);
        });
        
        console.log('🔄 Opponent switched to:', newOpponent.id);
        console.log('📊 Daily stats reset at:', new Date(now).toISOString());
      } else {
        console.error('🔄 Failed to get new opponent');
      }
    } catch (error) {
      console.error('Error handling opponent switch:', error);
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

  // Add listener for timer updates
  addListener(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Add listener for opponent switches
  addOpponentSwitchListener(callback: OpponentSwitchCallback) {
    this.opponentSwitchListeners.add(callback);
    return () => this.opponentSwitchListeners.delete(callback);
  }

  // Notify all listeners of timer updates
  private notifyListeners() {
    this.listeners.forEach(callback => callback());
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
}

// Create singleton instance
const globalTimerService = new GlobalTimerService();

export default globalTimerService; 