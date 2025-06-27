import { NativeModules, Platform } from 'react-native';

// Define TypeScript interfaces for the native modules
interface FamilyControlsManager {
  requestAuthorization(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }>;
  
  getAuthorizationStatus(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }>;
  
  startAppBlocking(): Promise<{
    success: boolean;
    blockedApps: number;
    message?: string;
  }>;
  
  stopAppBlocking(): Promise<{
    success: boolean;
  }>;
  
  isBlocking(): Promise<{
    isBlocking: boolean;
  }>;
}

interface AppSelectionManager {
  showAppSelectionModal(): Promise<{
    selectedCount: number;
  }>;
  
  getSelectedApplications(): Promise<{
    selectedCount: number;
  }>;
}

// Get the native modules
const { FamilyControlsManager: FamilyControlsNative, AppSelectionManager: AppSelectionNative } = NativeModules;

class FamilyControlsService {
  private familyControls: FamilyControlsManager;
  private appSelection: AppSelectionManager;
  
  constructor() {
    if (Platform.OS !== 'ios') {
      throw new Error('Family Controls is only available on iOS');
    }
    
    this.familyControls = FamilyControlsNative;
    this.appSelection = AppSelectionNative;
    
    if (!this.familyControls) {
      throw new Error('FamilyControlsManager native module is not available');
    }
    
    if (!this.appSelection) {
      throw new Error('AppSelectionManager native module is not available');
    }
  }
  
  /**
   * Request authorization for Family Controls
   * This will show the iOS authorization prompt
   */
  async requestAuthorization(): Promise<boolean> {
    try {
      const result = await this.familyControls.requestAuthorization();
      console.log('Family Controls authorization result:', result);
      return result.authorized;
    } catch (error) {
      console.error('Failed to request Family Controls authorization:', error);
      throw new Error(`Authorization failed: ${error.message}`);
    }
  }
  
  /**
   * Check current authorization status
   */
  async getAuthorizationStatus(): Promise<{
    status: 'notDetermined' | 'denied' | 'approved';
    authorized: boolean;
  }> {
    try {
      return await this.familyControls.getAuthorizationStatus();
    } catch (error) {
      console.error('Failed to get authorization status:', error);
      throw error;
    }
  }
  
  /**
   * Show the app selection modal for users to choose which apps to block
   */
  async showAppSelectionModal(): Promise<number> {
    try {
      const result = await this.appSelection.showAppSelectionModal();
      console.log('App selection result:', result);
      return result.selectedCount;
    } catch (error) {
      console.error('Failed to show app selection modal:', error);
      throw error;
    }
  }
  
  /**
   * Start blocking the selected applications
   */
  async startAppBlocking(): Promise<boolean> {
    try {
      // First check if we have authorization
      const authStatus = await this.getAuthorizationStatus();
      if (!authStatus.authorized) {
        throw new Error('Family Controls authorization required');
      }
      
      // Start blocking using the apps selected via AppSelectionManager
      const result = await this.familyControls.startAppBlocking();
      console.log('App blocking started:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to start app blocking:', error);
      throw error;
    }
  }
  
  /**
   * Stop blocking all applications
   */
  async stopAppBlocking(): Promise<boolean> {
    try {
      const result = await this.familyControls.stopAppBlocking();
      console.log('App blocking stopped:', result);
      return result.success;
    } catch (error) {
      console.error('Failed to stop app blocking:', error);
      throw error;
    }
  }
  
  /**
   * Check if app blocking is currently active
   */
  async isBlocking(): Promise<boolean> {
    try {
      const result = await this.familyControls.isBlocking();
      return result.isBlocking;
    } catch (error) {
      console.error('Failed to check blocking status:', error);
      return false;
    }
  }
  
  /**
   * Get the number of currently selected applications
   */
  async getSelectedApplicationsCount(): Promise<number> {
    try {
      const result = await this.appSelection.getSelectedApplications();
      return result.selectedCount;
    } catch (error) {
      console.error('Failed to get selected applications:', error);
      return 0;
    }
  }
  
  /**
   * Check if Family Controls is supported and available
   */
  isSupported(): boolean {
    return Platform.OS === 'ios' && !!this.familyControls && !!this.appSelection;
  }
}

// Create a singleton instance with error handling for non-iOS platforms
let familyControlsService: FamilyControlsService | null = null;

try {
  if (Platform.OS === 'ios') {
    familyControlsService = new FamilyControlsService();
  }
} catch (error) {
  console.warn('Family Controls service not available:', error.message);
}

// Export the service instance
export { familyControlsService };
export default familyControlsService; 