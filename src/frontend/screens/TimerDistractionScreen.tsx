import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, commonStyles, spacing, typography, shadows } from '../styles/theme';
import { startFocusSession, completeFocusSession, cancelFocusSession, FocusSession } from '../services/timerService';
import globalTimerService, { ActiveFocusSession } from '../services/globalTimerService';
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
      const sessionResult = await startFocusSession(user.id, 1); // 1 minute (30 seconds is 0.5, but DB expects integer)
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
      setShowCancelModal(true); // Still show modal even if DB update fails
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
            onPress: () => {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              if (currentSession) {
                cancelFocusSession(currentSession.id);
              }
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      navigation.goBack();
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
          <TouchableOpacity style={styles.startButton} onPress={handleStartTimer}>
            <Text style={styles.startButtonText}>Start Focus Session</Text>
          </TouchableOpacity>
        );
      
      case TimerState.RUNNING:
        return (
          <TouchableOpacity 
            style={[styles.stopButton, showStopConfirmation && styles.confirmButton]} 
            onPress={handleStopPress}
          >
            <Text style={styles.stopButtonText}>
              {showStopConfirmation ? 'Are you sure?' : 'Stop'}
            </Text>
          </TouchableOpacity>
        );
      
      case TimerState.COMPLETED:
      case TimerState.CANCELLED:
        return (
          <TouchableOpacity style={styles.resetButton} onPress={handleResetTimer}>
            <Text style={styles.resetButtonText}>Start New Session</Text>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[commonStyles.heading3, styles.title]}>
            Focus Session
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Timer display */}
        <View style={styles.timerContainer}>
          {/* Circular progress indicator */}
          <View style={styles.timerCircle}>
            <View style={[styles.progressCircle, { 
              transform: [{ rotate: `${(getProgressPercentage() * 3.6)}deg` }] 
            }]} />
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timerLabel}>
                {timerState === TimerState.RUNNING ? 'Focus Time' : 'Ready to Focus'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status message */}
        <View style={styles.statusContainer}>
          {timerState === TimerState.RUNNING && (
            <Text style={styles.statusText}>
              Stay focused! You'll earn {COINS_REWARD} coins when you complete this session.
            </Text>
          )}
          {timerState === TimerState.READY && (
            <Text style={styles.statusText}>
              Ready to start a 30-second focus session? You'll earn {COINS_REWARD} coins upon completion.
            </Text>
          )}
        </View>

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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lightGray,
    borderRadius: spacing.sm,
  },

  backButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.black,
  },

  headerSpacer: {
    width: 80,
  },

  // Timer display styles
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },

  timerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...shadows.lg,
  },

  progressCircle: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 8,
    borderColor: colors.primary,
    borderTopColor: colors.secondary,
    borderRightColor: colors.secondary,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },

  timerInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  timerText: {
    fontSize: typography.fontSize['5xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    fontFamily: 'monospace',
  },

  timerLabel: {
    fontSize: typography.fontSize.base,
    color: colors.darkGray,
    marginTop: spacing.sm,
  },

  // Status message styles
  statusContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  statusText: {
    fontSize: typography.fontSize.base,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },

  // Button styles
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },

  startButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },

  startButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  stopButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },

  confirmButton: {
    backgroundColor: colors.warning,
  },

  stopButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  resetButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },

  resetButtonText: {
    color: colors.black,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  modalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 280,
    ...shadows.lg,
  },

  modalTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: typography.fontSize.base,
    color: colors.darkGray,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
  },

  modalButton: {
    backgroundColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.md,
    minWidth: 120,
  },

  modalButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
  },
});

export default TimerDistractionScreen; 