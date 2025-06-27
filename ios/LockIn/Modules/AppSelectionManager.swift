import Foundation
import React
import FamilyControls
import SwiftUI

@objc(AppSelectionManager)
class AppSelectionManager: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    // Store selected applications for blocking (raw from picker)
    static var selectedApplications: Set<Application> = []
    
    @objc
    func showAppSelectionModal(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let rootViewController = RCTKeyWindow()?.rootViewController else {
                reject("NO_ROOT_VC", "Could not find root view controller", nil)
                return
            }
            
            let appSelectionView = AppSelectionView { selectedApps in
                AppSelectionManager.selectedApplications = selectedApps
                resolve(["selectedCount": selectedApps.count])
            }
            
            let hostingController = UIHostingController(rootView: appSelectionView)
            hostingController.modalPresentationStyle = .pageSheet
            
            rootViewController.present(hostingController, animated: true)
        }
    }
    
    @objc
    func getSelectedApplications(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["selectedCount": AppSelectionManager.selectedApplications.count])
    }
}

// SwiftUI view for app selection
struct AppSelectionView: View {
    @State private var selection = FamilyActivitySelection()
    let onComplete: (Set<Application>) -> Void
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
                    onComplete(selection.applications)
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
                    presentationMode.wrappedValue.dismiss()
                }
                .foregroundColor(.secondary)
                .padding(.bottom)
            }
            .navigationBarHidden(true)
        }
    }
} 