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