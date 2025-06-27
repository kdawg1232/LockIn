#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppSelectionManager, NSObject)

RCT_EXTERN_METHOD(showAppSelectionModal:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSelectedApplications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end 