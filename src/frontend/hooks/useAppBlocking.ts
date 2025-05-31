import { Platform, NativeModules } from 'react-native';
import { useState, useEffect } from 'react';

// This will be implemented in Swift later
const { AppBlockingModule } = NativeModules;

interface AppBlockingState {
  isBlocking: boolean;
  isAuthorized: boolean;
  blockedApps: string[];
}

// Apps we want to block
const DEFAULT_BLOCKED_APPS = [
  'instagram',
  'twitter',
  'reddit',
  'snapchat',
  'tiktok'
];

export const useAppBlocking = () => {
  const [state, setState] = useState<AppBlockingState>({
    isBlocking: false,
    isAuthorized: false,
    blockedApps: DEFAULT_BLOCKED_APPS
  });

  // Request authorization to use Screen Time API
  const requestAuthorization = async () => {
    if (Platform.OS === 'ios' && AppBlockingModule?.requestAuthorization) {
      try {
        const authorized = await AppBlockingModule.requestAuthorization();
        setState(prev => ({ ...prev, isAuthorized: authorized }));
        return authorized;
      } catch (error) {
        console.error('Failed to request Screen Time authorization:', error);
        return false;
      }
    }
    // On Android or when native module isn't available, return false
    return false;
  };

  // Start blocking apps
  const startBlocking = async () => {
    if (Platform.OS === 'ios' && AppBlockingModule?.startBlocking) {
      try {
        await AppBlockingModule.startBlocking(state.blockedApps);
        setState(prev => ({ ...prev, isBlocking: true }));
        return true;
      } catch (error) {
        console.error('Failed to start app blocking:', error);
        return false;
      }
    }
    // Fallback: Just update state but don't actually block
    setState(prev => ({ ...prev, isBlocking: true }));
    return true;
  };

  // Stop blocking apps
  const stopBlocking = async () => {
    if (Platform.OS === 'ios' && AppBlockingModule?.stopBlocking) {
      try {
        await AppBlockingModule.stopBlocking();
        setState(prev => ({ ...prev, isBlocking: false }));
        return true;
      } catch (error) {
        console.error('Failed to stop app blocking:', error);
        return false;
      }
    }
    // Fallback: Just update state
    setState(prev => ({ ...prev, isBlocking: false }));
    return true;
  };

  // Update list of blocked apps
  const updateBlockedApps = (apps: string[]) => {
    setState(prev => ({ ...prev, blockedApps: apps }));
    if (state.isBlocking && Platform.OS === 'ios' && AppBlockingModule?.updateBlockedApps) {
      AppBlockingModule.updateBlockedApps(apps);
    }
  };

  // Check if specific app is currently blocked
  const isAppBlocked = async (bundleId: string): Promise<boolean> => {
    if (Platform.OS === 'ios' && AppBlockingModule?.isAppBlocked) {
      try {
        return await AppBlockingModule.isAppBlocked(bundleId);
      } catch (error) {
        console.error('Failed to check if app is blocked:', error);
        return false;
      }
    }
    // Fallback: Check against our local state
    return state.isBlocking && state.blockedApps.includes(bundleId);
  };

  return {
    ...state,
    requestAuthorization,
    startBlocking,
    stopBlocking,
    updateBlockedApps,
    isAppBlocked
  };
}; 