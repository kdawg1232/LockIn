import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, AppState, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';
import { startFocusSession, completeFocusSession, cancelFocusSession, FocusSession } from '../services/timerService';
import globalTimerService, { ActiveFocusSession } from '../services/globalTimerService';
import { useAppBlocking } from '../hooks/useAppBlocking';
import supabase from '../../lib/supabase';

// Timer states enum for better type safety
enum TimerState {
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export const TimerDistractionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { 
    isAuthorized,
    isBlocking,
    selectedAppsCount,
    requestAuthorization,
    showAppSelection,
    startBlocking,
    stopBlocking
  } = useAppBlocking();
  
  // Timer configuration - 30 seconds for MVP testing (will be 5 minutes in production)
  const TIMER_DURATION = 30; // 30 seconds for testing
  const COINS_REWARD = 2; // Coins awarded for completion
  
  // Timer state management
  const [timeRemaining, setTimeRemaining] = useState<number>(TIMER_DURATION);
  const [timerState, setTimerState] = useState<TimerState>(TimerState.READY);
  const [showStopConfirmation, setShowStopConfirmation] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  
  // Refs for timer management
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing active session on component mount
  useEffect(() => {
    const checkActiveSession = () => {
      const activeSession = globalTimerService.getActiveFocusSession();
      if (activeSession) {
        // Resume existing session
        const remaining = globalTimerService.getFocusSessionTimeRemaining();
        if (remaining > 0) {
          setTimeRemaining(remaining);
          setTimerState(TimerState.RUNNING);
          setCurrentSession({
            id: activeSession.sessionId,
            user_id: activeSession.userId,
            start_time: new Date(activeSession.startTime).toISOString(),
            duration_minutes: 1,
            completed: false,
            coins_awarded: 0,
            created_at: new Date(activeSession.startTime).toISOString()
          });
          startTimerInterval();
        } else {
          // Session completed while app was in background
          handleTimerComplete();
        }
      }
    };

    checkActiveSession();
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground - check if we need to resume timer
        const activeSession = globalTimerService.getActiveFocusSession();
        if (activeSession && timerState === TimerState.RUNNING) {
          const remaining = globalTimerService.getFocusSessionTimeRemaining();
          if (remaining > 0) {
            setTimeRemaining(remaining);
          } else {
            // Timer completed while in background
            handleTimerComplete();
          }
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [timerState]);

  // Request Screen Time authorization on mount for iOS
  useEffect(() => {
    if (Platform.OS === 'ios' && !isAuthorized) {
      requestAuthorization();
    }
  }, []);

  // Start timer interval
  const startTimerInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      const remaining = globalTimerService.getFocusSessionTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        handleTimerComplete();
      }
    }, 1000);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for visual indicator
  const getProgressPercentage = (): number => {
    return ((TIMER_DURATION - timeRemaining) / TIMER_DURATION) * 100;
  };

  // Start the timer and create database session
  const handleStartTimer = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to start a focus session');
        return;
      }

      // Create focus session in database
      const sessionResult = await startFocusSession(user.id, 1);
      if (sessionResult.error || !sessionResult.data) {
        Alert.alert('Error', 'Failed to start focus session. Please try again.');
        return;
      }

      // Store session data and start global timer
      setCurrentSession(sessionResult.data);
      setTimerState(TimerState.RUNNING);
      
      // Start global timer service
      await globalTimerService.startFocusSession(
        sessionResult.data.id,
        user.id,
        TIMER_DURATION,
        COINS_REWARD
      );
      
      // Start app blocking with debug logging
      console.log('🔧 About to start app blocking. Selected apps:', selectedAppsCount);
      console.log('🔧 Authorization status:', isAuthorized);
      
      const blockingResult = await startBlocking();
      console.log('🔧 App blocking result:', blockingResult);
      
      // Start local countdown interval
      startTimerInterval();

    } catch (error) {
      console.error('Error starting timer:', error);
      Alert.alert('Error', 'Failed to start focus session');
    }
  };

  // Handle timer completion - award coins
  const handleTimerComplete = async () => {
    console.log('⏰ Timer completed - starting completion process');
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop app blocking
    await stopBlocking();

    setTimerState(TimerState.COMPLETED);

    try {
      let sessionToComplete = currentSession;
      
      // If currentSession is null, try to get it from global timer service
      if (!sessionToComplete) {
        const activeSession = globalTimerService.getActiveFocusSession();
        if (activeSession) {
          console.log('⏰ No currentSession state, but found active session in global service:', activeSession);
          sessionToComplete = {
            id: activeSession.sessionId,
            user_id: activeSession.userId,
            start_time: new Date(activeSession.startTime).toISOString(),
            duration_minutes: 1,
            completed: false,
            coins_awarded: 0,
            created_at: new Date(activeSession.startTime).toISOString()
          };
          // Update local state
          setCurrentSession(sessionToComplete);
        }
      }

      if (sessionToComplete) {
        console.log('⏰ Session to complete:', sessionToComplete);
        
        // Get current user
        const { data: { user } } = await supabase.getUser();
        if (user) {
          console.log('⏰ User found:', user.id);
          
          // Complete session and award coins
          console.log('⏰ Calling completeFocusSession with:', {
            sessionId: sessionToComplete.id,
            userId: user.id,
            coinsAwarded: COINS_REWARD
          });
          
          const result = await completeFocusSession(sessionToComplete.id, user.id, COINS_REWARD);
          console.log('⏰ completeFocusSession result:', result);
          
          if (result.success) {
            // Clear global timer
            await globalTimerService.completeFocusSession();
            console.log('⏰ Global timer cleared, showing completion modal');
            setShowCompletionModal(true);
          } else {
            console.error('⏰ Failed to complete session:', result.error);
            Alert.alert('Error', 'Session completed but failed to award coins');
          }
        } else {
          console.error('⏰ No user found');
          Alert.alert('Error', 'User not found');
        }
      } else {
        console.error('⏰ No current session found and no active session in global service');
        // Still clear global timer to prevent stuck states
        await globalTimerService.completeFocusSession();
        Alert.alert('Error', 'No active session found');
      }
    } catch (error) {
      console.error('⏰ Error completing session:', error);
      // Still clear global timer to prevent stuck states
      await globalTimerService.completeFocusSession();
      Alert.alert('Error', 'Session completed but failed to award coins');
    }
  };

  // Handle stop button press - show confirmation or cancel
  const handleStopPress = () => {
    if (showStopConfirmation) {
      // User confirmed - cancel the timer
      handleCancelTimer();
    } else {
      // First press - show confirmation
      setShowStopConfirmation(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => {
        setShowStopConfirmation(false);
      }, 3000);
    }
  };

  // Cancel the timer without awarding coins
  const handleCancelTimer = async () => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop app blocking
    await stopBlocking();

    setTimerState(TimerState.CANCELLED);
    setShowStopConfirmation(false);

    try {
      if (currentSession) {
        // Cancel session in database
        await cancelFocusSession(currentSession.id);
        // Clear global timer
        await globalTimerService.cancelFocusSession();
      }
      setShowCancelModal(true);
    } catch (error) {
      console.error('Error cancelling session:', error);
      setShowCancelModal(true);
    }
  };

  // Reset timer to initial state
  const handleResetTimer = () => {
    setTimeRemaining(TIMER_DURATION);
    setTimerState(TimerState.READY);
    setShowStopConfirmation(false);
    setCurrentSession(null);
  };

  // Handle back navigation
  const handleGoBack = () => {
    // If timer is running, ask for confirmation
    if (timerState === TimerState.RUNNING) {
      Alert.alert(
        'Timer Running',
        'Are you sure you want to leave? Your progress will be lost.',
        [
          { text: 'Stay', style: 'cancel' },
          { 
            text: 'Leave', 
            style: 'destructive',
            onPress: async () => {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              if (currentSession) {
                await cancelFocusSession(currentSession.id);
                await globalTimerService.cancelFocusSession();
              }
              // Explicitly navigate to Stats screen
              (navigation as any).navigate('Stats');
            }
          }
        ]
      );
    } else {
      // Explicitly navigate to Stats screen
      (navigation as any).navigate('Stats');
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Render the main timer button
  const renderTimerButton = () => {
    switch (timerState) {
      case TimerState.READY:
        return (
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={handleStartTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start Focus Session</Text>
          </TouchableOpacity>
        );
      
      case TimerState.RUNNING:
        return (
          <TouchableOpacity 
            style={[styles.stopButton, showStopConfirmation && styles.confirmButton]} 
            onPress={handleStopPress}
            activeOpacity={0.8}
          >
            <Text style={styles.stopButtonText}>
              {showStopConfirmation ? 'Are you sure?' : 'Stop'}
            </Text>
          </TouchableOpacity>
        );
      
      case TimerState.COMPLETED:
      case TimerState.CANCELLED:
        return (
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleResetTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>Start New Session</Text>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header with back button and title */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>Focus Session</Text>

        {/* Timer display */}
        <View style={styles.timerContainer}>
          {/* Circular progress indicator */}
          <View style={styles.timerCircle}>
            {/* Progress ring - darker color fills as timer progresses */}
            <View style={[
              styles.progressRing, 
              { 
                transform: [{ rotate: `${-90 + (getProgressPercentage() * 3.6)}deg` }]
              }
            ]} />
            
            {/* Timer content */}
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerLabel}>
                {timerState === TimerState.RUNNING ? 'Focus Time' : 'Ready to Focus'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status messages */}
        <View style={styles.statusContainer}>
          {timerState === TimerState.READY && (
            <>
              <Text style={styles.statusTitle}>
                Ready to start a 30-second focus session?
              </Text>
              <Text style={styles.statusSubtitle}>
                You'll earn {COINS_REWARD} coins upon completion.
              </Text>
              <Text style={styles.statusNote}>
                Testing mode: App blocking is simulated.
              </Text>
            </>
          )}
          
          {timerState === TimerState.RUNNING && (
            <>
              <Text style={styles.statusTitle}>
                Stay focused! Testing mode active.
              </Text>
              <Text style={styles.statusSubtitle}>
                You'll earn {COINS_REWARD} coins when you complete this session.
              </Text>
            </>
          )}
        </View>

        {/* App Selection Button (for testing) */}
        {timerState === TimerState.READY && (
          <View style={styles.appSelectionContainer}>
            <Text style={styles.appSelectionTitle}>
              Apps Selected: {selectedAppsCount}
            </Text>
            <TouchableOpacity 
              style={styles.appSelectionButton}
              onPress={async () => {
                console.log('🔧 Starting app selection...');
                const success = await showAppSelection();
                console.log('🔧 App selection result:', success);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.appSelectionButtonText}>
                {selectedAppsCount > 0 ? 'Change Apps to Block' : 'Select Apps to Block'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timer control button */}
        <View style={styles.buttonContainer}>
          {renderTimerButton()}
        </View>

        {/* Completion Modal */}
        <Modal
          visible={showCompletionModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCompletionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🎉 Congratulations!</Text>
              <Text style={styles.modalMessage}>
                You have earned {COINS_REWARD} coins!
              </Text>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  setShowCompletionModal(false);
                  handleResetTimer();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Cancellation Modal */}
        <Modal
          visible={showCancelModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCancelModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Session Cancelled</Text>
              <Text style={styles.modalMessage}>
                No coins are given. Try again when you're ready to focus!
              </Text>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  setShowCancelModal(false);
                  handleResetTimer();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5BC', // tan-200 (background)
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },

  // Header styles
  header: {
    marginBottom: 32,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // muted white
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  backButtonText: {
    color: '#111827', // gray-900 (dark text)
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 48,
  },

  // Timer display styles
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },

  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FAF7F1', // tan-50 (lightest)
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 8,
    borderColor: '#DABB95', // tan-300 (lighter border)
  },

  progressRing: {
    position: 'absolute',
    width: 296,
    height: 296,
    borderRadius: 148,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#A67C52', // tan-500 (darker tan for progress)
    top: -16,
    left: -16,
  },

  timerInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    fontFamily: 'Inter',
    letterSpacing: 2,
  },

  timerLabel: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    marginTop: 8,
    fontFamily: 'Inter',
  },

  // Status message styles
  statusContainer: {
    paddingHorizontal: 24,
    marginBottom: 40,
    alignItems: 'center',
  },

  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827', // gray-900 (dark text)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 12,
    lineHeight: 24,
  },

  statusSubtitle: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 8,
    lineHeight: 22,
  },

  statusNote: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    fontFamily: 'Inter',
    lineHeight: 22,
  },

  // Button styles
  buttonContainer: {
    paddingHorizontal: 24,
  },

  startButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  stopButton: {
    backgroundColor: '#EF4444', // red-500
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  confirmButton: {
    backgroundColor: '#F59E0B', // amber-500
  },

  stopButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  resetButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  resetButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalContent: {
    backgroundColor: '#ffffff', // white
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827', // gray-900 (dark text)
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  modalMessage: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'Inter',
  },

  modalButton: {
    backgroundColor: '#111827', // gray-900 (dark text)
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 50,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Inter',
  },

  // App Selection styles
  appSelectionContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },

  appSelectionTitle: {
    fontSize: 16,
    color: '#A67C52', // tan-500 (primary tan)
    textAlign: 'center',
    fontFamily: 'Inter',
    marginBottom: 12,
  },

  appSelectionButton: {
    backgroundColor: '#A67C52', // tan-500 (primary tan)
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  appSelectionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});

export default TimerDistractionScreen; 