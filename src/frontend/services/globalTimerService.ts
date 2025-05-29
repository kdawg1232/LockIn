import AsyncStorage from '@react-native-async-storage/async-storage';

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
        // Set initial next opponent time (20 minutes from now for MVP)
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

  // Set next opponent time (20 minutes from now for MVP)
  private async setNextOpponentTime() {
    const now = Date.now();
    this.nextOpponentTime = now + (20 * 60 * 1000); // 20 minutes in milliseconds
    await AsyncStorage.setItem(NEXT_OPPONENT_TIME_KEY, this.nextOpponentTime.toString());
    this.notifyListeners();
  }

  // Handle opponent switching when timer expires
  private async handleOpponentSwitch() {
    console.log('🔄 Opponent timer expired - switching opponent and resetting daily stats');
    
    try {
      // Get a new opponent (for now, will be same user since only one in DB)
      const newOpponentId = await this.selectNewOpponent();
      
      if (newOpponentId) {
        // Update current opponent
        this.currentOpponentId = newOpponentId;
        await AsyncStorage.setItem(CURRENT_OPPONENT_ID_KEY, newOpponentId);
        
        // Mark stats reset time
        const now = Date.now();
        this.lastStatsResetTime = now;
        await AsyncStorage.setItem(DAILY_STATS_RESET_KEY, now.toString());
        
        // Notify all opponent switch listeners
        this.opponentSwitchListeners.forEach(listener => {
          listener.onOpponentSwitch(newOpponentId);
        });
        
        console.log('🔄 Opponent switched to:', newOpponentId);
        console.log('📊 Daily stats reset at:', new Date(now).toISOString());
      }
    } catch (error) {
      console.error('Error handling opponent switch:', error);
    }
  }

  // Select a new opponent (placeholder - will select from available users)
  private async selectNewOpponent(): Promise<string | null> {
    // TODO: In the future, implement logic to:
    // 1. Fetch all users from database
    // 2. Filter out current user
    // 3. Select random opponent
    // 4. Avoid recent opponents if possible
    
    // For now, return the same opponent ID since there's only one user
    // This will still trigger stats reset
    return this.currentOpponentId;
  }

  // Get time remaining until next opponent
  getNextOpponentTimeRemaining(): string {
    if (!this.nextOpponentTime) {
      return '00:20:00';
    }

    const now = Date.now();
    const timeDiff = this.nextOpponentTime - now;

    if (timeDiff <= 0) {
      // Time expired - handle opponent switch and reset timer
      this.handleOpponentSwitch();
      this.setNextOpponentTime();
      return '00:20:00';
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