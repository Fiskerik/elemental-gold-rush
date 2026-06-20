import Capacitor
import UIKit
import UnityAds

@objc(UnityAdsPlugin)
public class UnityAdsPlugin: CAPPlugin, CAPBridgedPlugin, UnityAdsInitializationDelegate, UnityAdsLoadDelegate, UnityAdsShowDelegate {
    public let identifier = "UnityAdsPlugin"
    public let jsName = "UnityAdsPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initializeAds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadRewarded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRewarded", returnType: CAPPluginReturnPromise)
    ]

    private var pendingInitializationCalls: [CAPPluginCall] = []
    private var pendingLoadCalls: [String: [CAPPluginCall]] = [:]
    private var pendingShowCalls: [String: CAPPluginCall] = [:]
    private var loadedPlacements = Set<String>()
    private var initializationStarted = false

    @objc func initializeAds(_ call: CAPPluginCall) {
        guard let gameId = call.getString("gameId"), !gameId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing Unity Ads iOS game ID")
            return
        }

        if UnityAds.isInitialized() {
            call.resolve(["initialized": true])
            return
        }

        pendingInitializationCalls.append(call)
        if initializationStarted {
            return
        }

        initializationStarted = true
        let testMode = call.getBool("testMode", false)

        DispatchQueue.main.async {
            NSLog("UnityAdsPlugin initializing gameId=%@ testMode=%@", gameId, testMode ? "true" : "false")
            UnityAds.initialize(gameId, testMode: testMode, initializationDelegate: self)
        }
    }

    @objc func loadInterstitial(_ call: CAPPluginCall) {
        load(call)
    }

    @objc func loadRewarded(_ call: CAPPluginCall) {
        load(call)
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        show(call)
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        show(call)
    }

    public func initializationComplete() {
        NSLog("UnityAdsPlugin initialization complete")
        let calls = pendingInitializationCalls
        pendingInitializationCalls.removeAll()
        calls.forEach { $0.resolve(["initialized": true]) }
    }

    public func initializationFailed(_ error: UnityAdsInitializationError, withMessage message: String) {
        NSLog("UnityAdsPlugin initialization failed error=%ld message=%@", error.rawValue, message)
        initializationStarted = false
        let calls = pendingInitializationCalls
        pendingInitializationCalls.removeAll()
        calls.forEach { $0.reject(message, String(error.rawValue)) }
    }

    public func unityAdsAdLoaded(_ placementId: String) {
        loadedPlacements.insert(placementId)
        let calls = pendingLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    public func unityAdsAdFailed(toLoad placementId: String, withError error: UnityAdsLoadError, withMessage message: String) {
        loadedPlacements.remove(placementId)
        let calls = pendingLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.reject(message, String(error.rawValue)) }
    }

    public func unityAdsShowComplete(_ placementId: String, withFinish state: UnityAdsShowCompletionState) {
        loadedPlacements.remove(placementId)
        guard let call = pendingShowCalls.removeValue(forKey: placementId) else { return }

        call.resolve([
            "completed": state.rawValue == 1,
            "skipped": state.rawValue == 0
        ])
    }

    @objc(unityAdsShowFailed:withError:withMessage:)
    public func unityAdsShowFailed(_ placementId: String, withError error: UnityAdsShowError, withMessage message: String) {
        loadedPlacements.remove(placementId)
        guard let call = pendingShowCalls.removeValue(forKey: placementId) else { return }
        call.reject(message, String(error.rawValue))
    }

    public func unityAdsShowStart(_ placementId: String) {}

    public func unityAdsShowClick(_ placementId: String) {}

    private func load(_ call: CAPPluginCall) {
        guard UnityAds.isInitialized() else {
            call.reject("Unity Ads is not initialized")
            return
        }

        guard let placementId = call.getString("placementId"), !placementId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing Unity Ads placement ID")
            return
        }

        if loadedPlacements.contains(placementId) {
            call.resolve(["loaded": true])
            return
        }

        pendingLoadCalls[placementId, default: []].append(call)
        if pendingLoadCalls[placementId]?.count == 1 {
            DispatchQueue.main.async {
                UnityAds.load(placementId, options: UADSLoadOptions(), loadDelegate: self)
            }
        }
    }

    private func show(_ call: CAPPluginCall) {
        guard UnityAds.isInitialized() else {
            call.reject("Unity Ads is not initialized")
            return
        }

        guard let placementId = call.getString("placementId"), !placementId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing Unity Ads placement ID")
            return
        }

        guard pendingShowCalls[placementId] == nil else {
            call.reject("Unity Ads placement is already showing")
            return
        }

        pendingShowCalls[placementId] = call

        DispatchQueue.main.async {
            guard let viewController = self.bridge?.viewController else {
                self.pendingShowCalls.removeValue(forKey: placementId)
                call.reject("Could not find a view controller for Unity Ads")
                return
            }

            UnityAds.show(viewController, placementId: placementId, showDelegate: self)
        }
    }
}
