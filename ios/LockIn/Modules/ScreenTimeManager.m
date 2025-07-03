#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(ScreenTimeManager, RCTEventEmitter)

// Authorization methods
RCT_EXTERN_METHOD(requestScreenTimeAuthorization:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getScreenTimeAuthorizationStatus:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

// App configuration methods
RCT_EXTERN_METHOD(configureSocialMediaApps:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

// Usage data methods
RCT_EXTERN_METHOD(getTodayAppUsage:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getAppUsageForDate:(NSString *)dateString 
                 resolver:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

// Background monitoring methods
RCT_EXTERN_METHOD(stopBackgroundMonitoring)

RCT_EXTERN_METHOD(restartBackgroundMonitoring)

RCT_EXTERN_METHOD(getMonitoringStatus:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCurrentTrackedUsage:(RCTPromiseResolveBlock)resolve 
                 rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end 