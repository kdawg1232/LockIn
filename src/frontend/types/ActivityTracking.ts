export interface AppUsageData {
    appId: string;
    appName: string;
    timeSpentMinutes: number;
    coinsLost: number;
    color: string; // For consistent graph coloring
}

export interface DailyActivityData {
    date: string; // ISO string
    totalCoinsLost: number;
    appUsage: AppUsageData[];
}

// Placeholder for what we'll get from Screen Time API
export interface ScreenTimeData {
    bundleId: string;
    totalTime: number; // in minutes
    category: string;
}

// Coin calculation constants
export const MINUTES_PER_COIN = 30; // 30 minutes of usage = 1 coin lost
export const COIN_LOSS_PER_30_MIN = 1; // 1 coin lost per 30 minutes

// Constants for app tracking
export const TRACKED_APPS: Record<string, { name: string; color: string }> = {
    'instagram': { 
        name: 'Instagram',
        color: '#E4405F'
    },
    'twitter': { 
        name: 'Twitter/X',
        color: '#1DA1F2'
    },
    'reddit': { 
        name: 'Reddit',
        color: '#FF4500'
    },
    'snapchat': { 
        name: 'Snapchat',
        color: '#FFFC00'
    },
    'tiktok': { 
        name: 'TikTok',
        color: '#000000'
    },
    'facebook': {
        name: 'Facebook',
        color: '#1877F2'
    }
}; 