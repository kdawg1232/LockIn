import Foundation
import React
import FamilyControls
import ManagedSettings
import SwiftUI
import DeviceActivity // if you’re also using monitoring

@objc(AppSelectionManager)
class AppSelectionManager: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // Store selected applications for blocking (raw from picker)
    static var selectedApplications: Set<Application> = []
    static var selectedApplicationTokens: Set<ApplicationToken> = []
    
    @objc
    func showAppSelectionModal(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        print("🍎 [Swift] showAppSelectionModal called")
        DispatchQueue.main.async {
            guard let rootViewController = RCTKeyWindow()?.rootViewController else {
                print("🍎 [Swift] ERROR: Could not find root view controller")
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
                return
            }
            
            print("🍎 [Swift] Root view controller found, creating app selection view")
            
            let appSelectionView = AppSelectionView(
                onComplete: { selection in
                    print("🍎 [Swift] User selected \(selection.applications.count) apps")
                    AppSelectionManager.selectedApplications = selection.applications
                    AppSelectionManager.selectedApplicationTokens = selection.applicationTokens
                    resolve(["selectedCount": selection.applications.count])
                },
                onCancel: {
                    print("🍎 [Swift] User cancelled app selection")
                    // User cancelled - return 0 count
                    resolve(["selectedCount": 0])
                }
            )
            
            let hostingController = UIHostingController(rootView: appSelectionView)
            hostingController.modalPresentationStyle = .pageSheet
            
            print("🍎 [Swift] Presenting app selection modal")
            rootViewController.present(hostingController, animated: true) {
                print("🍎 [Swift] App selection modal presented successfully")
            }
        }
    }
    
    @objc
    func getSelectedApplications(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["selectedCount": AppSelectionManager.selectedApplicationTokens.count])
    }
}

// SwiftUI view for app selection
struct AppSelectionView: View {
    @State private var selection = FamilyActivitySelection()
    let onComplete: (FamilyActivitySelection) -> Void
    let onCancel: () -> Void
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Select Apps to Block")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .padding(.top)
                
                Text("Choose which apps you want to block during focus sessions")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                FamilyActivityPicker(selection: $selection)
                    .padding()
                
                Spacer()
                
                Button(action: {
                    onComplete(selection)
                    presentationMode.wrappedValue.dismiss()
                }) {
                    HStack {
                        Text("Done")
                        if !selection.applications.isEmpty {
                            Text("(\(selection.applications.count) apps)")
                                .fontWeight(.medium)
                        }
                    }
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(selection.applications.isEmpty ? Color.gray : Color.blue)
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                .disabled(selection.applications.isEmpty)
                
                Button("Cancel") {
                    onCancel()
                    presentationMode.wrappedValue.dismiss()
                }
                .foregroundColor(.secondary)
                .padding(.bottom)
            }
            .navigationBarHidden(true)
        }
    }
} 