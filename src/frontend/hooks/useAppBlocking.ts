import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import familyControlsService from '../services/familyControlsService';

interface AppBlockingState {
  isSupported: boolean;
  isAuthorized: boolean;
  isBlocking: boolean;
  selectedAppsCount: number;
  isLoading: boolean;
  error: string | null;
}

export const useAppBlocking = () => {
  const [state, setState] = useState<AppBlockingState>({
    isSupported: Platform.OS === 'ios' && familyControlsService?.isSupported() || false,
    isAuthorized: false,
    isBlocking: false,
    selectedAppsCount: 0,
    isLoading: false,
    error: null,
  });

  // Check authorization status on mount
  useEffect(() => {
    if (state.isSupported && familyControlsService) {
      checkAuthorizationStatus();
      checkBlockingStatus();
      getSelectedAppsCount();
    }
  }, [state.isSupported]);

  const checkAuthorizationStatus = async () => {
    if (!familyControlsService) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const authStatus = await familyControlsService.getAuthorizationStatus();
      setState(prev => ({ 
        ...prev, 
        isAuthorized: authStatus.authorized,
        isLoading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false 
      }));
    }
  };

  const checkBlockingStatus = async () => {
    if (!familyControlsService) return;
    
    try {
      const isBlocking = await familyControlsService.isBlocking();
      setState(prev => ({ ...prev, isBlocking }));
    } catch (error) {
      console.warn('Failed to check blocking status:', error);
    }
  };

  const getSelectedAppsCount = async () => {
    if (!familyControlsService) return;
    
    try {
      const count = await familyControlsService.getSelectedApplicationsCount();
      setState(prev => ({ ...prev, selectedAppsCount: count }));
    } catch (error) {
      console.warn('Failed to get selected apps count:', error);
    }
  };

  const requestAuthorization = async (): Promise<boolean> => {
    if (!familyControlsService) {
      setState(prev => ({ ...prev, error: 'Family Controls not supported' }));
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const authorized = await familyControlsService.requestAuthorization();
      setState(prev => ({ 
        ...prev, 
        isAuthorized: authorized,
        isLoading: false 
      }));
      return authorized;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false 
      }));
      return false;
    }
  };

  const showAppSelection = async (): Promise<boolean> => {
    if (!familyControlsService) {
      setState(prev => ({ ...prev, error: 'Family Controls not supported' }));
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const selectedCount = await familyControlsService.showAppSelectionModal();
      setState(prev => ({ 
        ...prev, 
        selectedAppsCount: selectedCount,
        isLoading: false 
      }));
      return selectedCount > 0;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false 
      }));
      return false;
    }
  };

  const startBlocking = async (): Promise<boolean> => {
    if (!familyControlsService) {
      setState(prev => ({ ...prev, error: 'Family Controls not supported' }));
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Check if we have apps selected
      if (state.selectedAppsCount === 0) {
        throw new Error('Please select apps to block first');
      }
      
      const success = await familyControlsService.startAppBlocking();
      setState(prev => ({ 
        ...prev, 
        isBlocking: success,
        isLoading: false 
      }));
      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false 
      }));
      return false;
    }
  };

  const stopBlocking = async (): Promise<boolean> => {
    if (!familyControlsService) {
      setState(prev => ({ ...prev, error: 'Family Controls not supported' }));
      return false;
    }
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const success = await familyControlsService.stopAppBlocking();
      setState(prev => ({ 
        ...prev, 
        isBlocking: !success,
        isLoading: false 
      }));
      return success;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        isLoading: false 
      }));
      return false;
    }
  };

  const refreshStatus = async () => {
    await Promise.all([
      checkAuthorizationStatus(),
      checkBlockingStatus(),
      getSelectedAppsCount()
    ]);
  };

  return {
    ...state,
    requestAuthorization,
    showAppSelection,
    startBlocking,
    stopBlocking,
    refreshStatus,
  };
}; 