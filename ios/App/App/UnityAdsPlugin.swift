import Capacitor
import UIKit
import UnityAds

@objc(UnityAdsPlugin)
public final class UnityAdsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UnityAdsPlugin"
    public let jsName = "UnityAdsPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initializeAds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadRewarded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRewarded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getDiagnostics", returnType: CAPPluginReturnPromise)
    ]

    private var pendingInitializationCalls: [CAPPluginCall] = []
    private var pendingRewardedLoadCalls: [String: [CAPPluginCall]] = [:]
    private var pendingInterstitialLoadCalls: [String: [CAPPluginCall]] = [:]
    private var pendingRewardedShowCall: CAPPluginCall?
    private var pendingInterstitialShowCall: CAPPluginCall?
    private var rewardedAds: [String: UADSRewardedAd] = [:]
    private var interstitialAds: [String: UADSInterstitialAd] = [:]
    private var loadingRewarded = Set<String>()
    private var loadingInterstitial = Set<String>()
    private var initializationStarted = false
    private var initialized = false
    private var rewardedEarned = false
    private let diagnosticsStorageKey = "UnityAdsPlugin.diagnostics"
    private var diagnostics: [String] = (UserDefaults.standard.array(forKey: "UnityAdsPlugin.diagnostics") as? [String]) ?? []
    private lazy var rewardedDelegate = UnityRewardedShowDelegate(owner: self)
    private lazy var interstitialDelegate = UnityInterstitialShowDelegate(owner: self)

    fileprivate func log(_ message: String) {
        let line = "[\(Date())] \(message)"
        diagnostics.append(line)
        if diagnostics.count > 120 { diagnostics.removeFirst(diagnostics.count - 120) }
        UserDefaults.standard.set(diagnostics, forKey: diagnosticsStorageKey)
        NSLog("[UnityAdsPlugin] %@", message)
    }

    fileprivate func log(_ error: UnityAdsError, context: String) {
        log("\(context) code=\(error.code) message=\(error.message)")
    }

    @objc func getDiagnostics(_ call: CAPPluginCall) {
        call.resolve(["logs": diagnostics])
    }

    @objc func initializeAds(_ call: CAPPluginCall) {
        guard let gameId = call.getString("gameId"), !gameId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing Unity Ads iOS game ID")
            return
        }
        if initialized { call.resolve(["initialized": true]); return }
        pendingInitializationCalls.append(call)
        if initializationStarted { return }
        initializationStarted = true
        let testMode = call.getBool("testMode", false)

        DispatchQueue.main.async {
            self.log("initialize start gameId=\(gameId) testMode=\(testMode)")
            let configuration = UADSInitializationConfigurationBuilder(gameId: gameId)
                .with(testMode: testMode)
                .with(logLevel: UADSLogLevel.debug)
                .build()
            UnityAds.initialize(configuration) { error in
                DispatchQueue.main.async {
                    if let error {
                        self.initializationStarted = false
                        self.initialized = false
                        self.log(error, context: "initialize failed")
                        let calls = self.pendingInitializationCalls
                        self.pendingInitializationCalls.removeAll()
                        calls.forEach { $0.reject("Unity Ads initialization failed [\(error.code)]: \(error.message)", "UNITY_ADS_INIT_FAILED") }
                        return
                    }
                    self.log("initialize complete")
                    self.initialized = true
                    let calls = self.pendingInitializationCalls
                    self.pendingInitializationCalls.removeAll()
                    calls.forEach { $0.resolve(["initialized": true]) }
                }
            }
        }
    }

    @objc func loadInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }
        DispatchQueue.main.async {
            self.log("interstitial load requested placement=\(placementId)")
            if self.interstitialAds[placementId] != nil {
                call.resolve(["loaded": true])
                return
            }
            self.pendingInterstitialLoadCalls[placementId, default: []].append(call)
            guard self.loadingInterstitial.insert(placementId).inserted else { return }
            let config = UADSLoadConfigurationBuilder(placementId: placementId).build()
            UADSInterstitialAd.load(config) { ad, error in
                DispatchQueue.main.async {
                    self.loadingInterstitial.remove(placementId)
                    if let ad {
                        self.interstitialAds[placementId] = ad
                        self.log("interstitial load success placement=\(placementId)")
                        self.resolveInterstitialLoadCalls(for: placementId)
                    } else {
                        if let error { self.log(error, context: "interstitial load failed placement=\(placementId)") }
                        self.rejectInterstitialLoadCalls(for: placementId, message: error.map { "Unity Ads interstitial load failed [\($0.code)]: \($0.message)" } ?? "Unity Ads interstitial load failed")
                    }
                }
            }
        }
    }

    @objc func loadRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }
        DispatchQueue.main.async {
            self.log("rewarded load requested placement=\(placementId)")
            if self.rewardedAds[placementId] != nil {
                call.resolve(["loaded": true])
                return
            }
            self.pendingRewardedLoadCalls[placementId, default: []].append(call)
            guard self.loadingRewarded.insert(placementId).inserted else { return }
            let config = UADSLoadConfigurationBuilder(placementId: placementId).build()
            UADSRewardedAd.load(config) { ad, error in
                DispatchQueue.main.async {
                    self.loadingRewarded.remove(placementId)
                    if let ad {
                        self.rewardedAds[placementId] = ad
                        self.log("rewarded load success placement=\(placementId)")
                        self.resolveRewardedLoadCalls(for: placementId)
                    } else {
                        if let error { self.log(error, context: "rewarded load failed placement=\(placementId)") }
                        self.rejectRewardedLoadCalls(for: placementId, message: error.map { "Unity Ads rewarded load failed [\($0.code)]: \($0.message)" } ?? "Unity Ads rewarded load failed")
                    }
                }
            }
        }
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }
        DispatchQueue.main.async {
            guard self.pendingInterstitialShowCall == nil else { call.reject("Unity Ads interstitial is already showing"); return }
            guard let ad = self.interstitialAds.removeValue(forKey: placementId) else { call.reject("Unity Ads interstitial is not ready"); return }
            guard let viewController = self.activeViewController() else { self.interstitialAds[placementId] = ad; call.reject("Could not find a view controller for Unity Ads"); return }
            self.pendingInterstitialShowCall = call
            let config = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            self.log("interstitial show starting placement=\(placementId) viewController=\(type(of: viewController))")
            ad.show(config, delegate: self.interstitialDelegate)
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }
        DispatchQueue.main.async {
            guard self.pendingRewardedShowCall == nil else { call.reject("Unity Ads rewarded ad is already showing"); return }
            guard let ad = self.rewardedAds.removeValue(forKey: placementId) else { call.reject("Unity Ads rewarded ad is not ready"); return }
            guard let viewController = self.activeViewController() else { self.rewardedAds[placementId] = ad; call.reject("Could not find a view controller for Unity Ads"); return }
            self.rewardedEarned = false
            self.pendingRewardedShowCall = call
            let config = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            self.log("rewarded show starting placement=\(placementId) viewController=\(type(of: viewController))")
            ad.show(config, delegate: self.rewardedDelegate)
        }
    }

    fileprivate func handleInterstitialStart() { log("interstitial callback showDidStart") }
    fileprivate func handleInterstitialClick() { log("interstitial callback showDidClick") }
    fileprivate func handleInterstitialComplete(_ state: UADSShowFinishState) {
        log("interstitial callback showDidComplete state=\(state)")
        pendingInterstitialShowCall?.resolve(["completed": state == .completed])
        pendingInterstitialShowCall = nil
    }
    fileprivate func handleInterstitialFailure(_ error: UnityAdsError) {
        log(error, context: "interstitial callback showDidFail")
        pendingInterstitialShowCall?.reject("Unity Ads interstitial show failed [\(error.code)]: \(error.message)")
        pendingInterstitialShowCall = nil
    }

    fileprivate func handleRewardedStart() { log("rewarded callback showDidStart") }
    fileprivate func handleRewardedClick() { log("rewarded callback showDidClick") }
    fileprivate func handleRewardedReward() { rewardedEarned = true; log("rewarded callback showDidReceiveReward") }
    fileprivate func handleRewardedComplete(_ state: UADSShowFinishState) {
        log("rewarded callback showDidComplete state=\(state) earned=\(rewardedEarned)")
        pendingRewardedShowCall?.resolve(["completed": state == .completed, "rewarded": rewardedEarned && state == .completed])
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }
    fileprivate func handleRewardedFailure(_ error: UnityAdsError) {
        log(error, context: "rewarded callback showDidFail")
        pendingRewardedShowCall?.reject("Unity Ads rewarded show failed [\(error.code)]: \(error.message)")
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }

    private func ensureInitialized(_ call: CAPPluginCall) -> Bool {
        guard initialized else { call.reject("Unity Ads is not initialized"); return false }
        return true
    }

    private func getPlacementId(_ call: CAPPluginCall) -> String? {
        guard let placementId = call.getString("placementId"), !placementId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing Unity Ads placement ID")
            return nil
        }
        return placementId
    }

    private func activeViewController() -> UIViewController? {
        guard let root = bridge?.viewController else { return nil }
        return topViewController(from: root)
    }

    private func topViewController(from viewController: UIViewController) -> UIViewController {
        if let presented = viewController.presentedViewController, !presented.isBeingDismissed { return topViewController(from: presented) }
        if let navigation = viewController as? UINavigationController, let visible = navigation.visibleViewController { return topViewController(from: visible) }
        if let tabs = viewController as? UITabBarController, let selected = tabs.selectedViewController { return topViewController(from: selected) }
        return viewController
    }

    private func resolveRewardedLoadCalls(for placementId: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectRewardedLoadCalls(for placementId: String, message: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.reject(message, "UNITY_ADS_REWARDED_LOAD_FAILED") }
    }

    private func resolveInterstitialLoadCalls(for placementId: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectInterstitialLoadCalls(for placementId: String, message: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.reject(message, "UNITY_ADS_INTERSTITIAL_LOAD_FAILED") }
    }
}

private final class UnityInterstitialShowDelegate: NSObject, UADSInterstitialShowDelegate {
    weak var owner: UnityAdsPlugin?
    init(owner: UnityAdsPlugin) { self.owner = owner }
    func showDidStart(_ unityAd: UADSInterstitialAd) { owner?.handleInterstitialStart() }
    func showDidClick(_ unityAd: UADSInterstitialAd) { owner?.handleInterstitialClick() }
    func showDidComplete(_ unityAd: UADSInterstitialAd, with state: UADSShowFinishState) { owner?.handleInterstitialComplete(state) }
    func showDidFail(_ unityAd: UADSInterstitialAd, error: UnityAdsError) { owner?.handleInterstitialFailure(error) }
}

private final class UnityRewardedShowDelegate: NSObject, UADSRewardedShowDelegate {
    weak var owner: UnityAdsPlugin?
    init(owner: UnityAdsPlugin) { self.owner = owner }
    func showDidStart(_ unityAd: UADSRewardedAd) { owner?.handleRewardedStart() }
    func showDidClick(_ unityAd: UADSRewardedAd) { owner?.handleRewardedClick() }
    func showDidComplete(_ unityAd: UADSRewardedAd, with state: UADSShowFinishState) { owner?.handleRewardedComplete(state) }
    func showDidFail(_ unityAd: UADSRewardedAd, error: UnityAdsError) { owner?.handleRewardedFailure(error) }
    func showDidReceiveReward(_ unityAd: UADSRewardedAd) { owner?.handleRewardedReward() }
}
