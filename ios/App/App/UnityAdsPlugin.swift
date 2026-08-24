import Capacitor
import UIKit
import UnityAds

@objc(UnityAdsPlugin)
public class UnityAdsPlugin: CAPPlugin, CAPBridgedPlugin {
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
    private var loadingRewardedPlacements = Set<String>()
    private var loadingInterstitialPlacements = Set<String>()
    private var initializationStarted = false
    private var initialized = false
    private var rewardedEarned = false
    private let diagnosticsStorageKey = "UnityAdsPlugin.diagnostics"
    private var diagnostics: [String] = (UserDefaults.standard.array(forKey: "UnityAdsPlugin.diagnostics") as? [String]) ?? []
    private lazy var interstitialShowDelegate = UnityInterstitialShowDelegate(owner: self)
    private lazy var rewardedShowDelegate = UnityRewardedShowDelegate(owner: self)

    fileprivate func log(_ message: String) {
        let line = "[\(Date())] \(message)"
        diagnostics.append(line)
        if diagnostics.count > 120 {
            diagnostics.removeFirst(diagnostics.count - 120)
        }
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

        if initialized {
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
            self.log("initialize start gameId=\(gameId) testMode=\(testMode)")
            let configuration = UADSInitializationConfigurationBuilder(gameId: gameId)
                .with(testMode: testMode)
                .with(logLevel: UADSLogLevel.debug)
                .build()
            UnityAds.initialize(configuration) { error in
                DispatchQueue.main.async {
                    if let error = error {
                        self.initializationStarted = false
                        self.initialized = false
                        self.log(error, context: "initialize failed")
                        let calls = self.pendingInitializationCalls
                        self.pendingInitializationCalls.removeAll()
                        calls.forEach {
                            $0.reject("Unity Ads initialization failed [\(error.code)]: \(error.message)", "UNITY_ADS_INIT_FAILED")
                        }
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
                self.log("interstitial already loaded placement=\(placementId)")
                call.resolve(["loaded": true])
                return
            }

            self.pendingInterstitialLoadCalls[placementId, default: []].append(call)
            if self.loadingInterstitialPlacements.insert(placementId).inserted {
                let configuration = UADSLoadConfigurationBuilder(placementId: placementId).build()
                UADSInterstitialAd.load(configuration) { ad, error in
                    DispatchQueue.main.async {
                        self.loadingInterstitialPlacements.remove(placementId)
                        if let ad = ad {
                            self.log("interstitial load success placement=\(placementId)")
                            ad.onAdExpired = { [weak self] _ in
                                DispatchQueue.main.async {
                                    self?.interstitialAds.removeValue(forKey: placementId)
                                    self?.log("interstitial expired placement=\(placementId)")
                                }
                            }
                            self.interstitialAds[placementId] = ad
                            self.resolveInterstitialLoadCalls(for: placementId)
                        } else {
                            if let error = error {
                                self.log(error, context: "interstitial load failed placement=\(placementId)")
                            } else {
                                self.log("interstitial load failed placement=\(placementId) error=unknown")
                            }
                            self.rejectInterstitialLoadCalls(
                                for: placementId,
                                message: error.map { "Unity Ads interstitial load failed [\($0.code)]: \($0.message)" } ?? "Unity Ads interstitial load failed: Unknown error"
                            )
                        }
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
                self.log("rewarded already loaded placement=\(placementId)")
                call.resolve(["loaded": true])
                return
            }

            self.pendingRewardedLoadCalls[placementId, default: []].append(call)
            if self.loadingRewardedPlacements.insert(placementId).inserted {
                let configuration = UADSLoadConfigurationBuilder(placementId: placementId).build()
                UADSRewardedAd.load(configuration) { ad, error in
                    DispatchQueue.main.async {
                        self.loadingRewardedPlacements.remove(placementId)
                        if let ad = ad {
                            self.log("rewarded load success placement=\(placementId)")
                            ad.onAdExpired = { [weak self] _ in
                                DispatchQueue.main.async {
                                    self?.rewardedAds.removeValue(forKey: placementId)
                                    self?.log("rewarded expired placement=\(placementId)")
                                }
                            }
                            self.rewardedAds[placementId] = ad
                            self.resolveRewardedLoadCalls(for: placementId)
                        } else {
                            if let error = error {
                                self.log(error, context: "rewarded load failed placement=\(placementId)")
                            } else {
                                self.log("rewarded load failed placement=\(placementId) error=unknown")
                            }
                            self.rejectRewardedLoadCalls(
                                for: placementId,
                                message: error.map { "Unity Ads rewarded load failed [\($0.code)]: \($0.message)" } ?? "Unity Ads rewarded load failed: Unknown error"
                            )
                        }
                    }
                }
            }
        }
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }

        DispatchQueue.main.async {
            self.log("interstitial show requested placement=\(placementId)")
            guard self.pendingInterstitialShowCall == nil else {
                self.log("interstitial show rejected: another ad is showing")
                call.reject("Unity Ads interstitial is already showing")
                return
            }
            guard let ad = self.interstitialAds.removeValue(forKey: placementId) else {
                self.log("interstitial show rejected: ad is not ready placement=\(placementId)")
                call.reject("Unity Ads interstitial is not ready")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                self.log("interstitial show rejected: view controller unavailable")
                self.interstitialAds[placementId] = ad
                call.reject("Could not find a view controller for Unity Ads")
                return
            }

            self.pendingInterstitialShowCall = call
            let configuration = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            self.log("interstitial show starting placement=\(placementId) viewController=\(type(of: viewController))")
            ad.show(configuration, delegate: self.interstitialShowDelegate)
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }

        DispatchQueue.main.async {
            self.log("rewarded show requested placement=\(placementId)")
            guard self.pendingRewardedShowCall == nil else {
                self.log("rewarded show rejected: another ad is showing")
                call.reject("Unity Ads rewarded ad is already showing")
                return
            }
            guard let ad = self.rewardedAds.removeValue(forKey: placementId) else {
                self.log("rewarded show rejected: ad is not ready placement=\(placementId)")
                call.reject("Unity Ads rewarded ad is not ready")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                self.log("rewarded show rejected: view controller unavailable")
                self.rewardedAds[placementId] = ad
                call.reject("Could not find a view controller for Unity Ads")
                return
            }

            self.rewardedEarned = false
            self.pendingRewardedShowCall = call
            let configuration = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            self.log("rewarded show starting placement=\(placementId) viewController=\(type(of: viewController))")
            ad.show(configuration, delegate: self.rewardedShowDelegate)
        }
    }

    func handleInterstitialShowFailed(_ error: UnityAdsError) {
        log(error, context: "interstitial show failed")
        pendingInterstitialShowCall?.reject("Unity Ads interstitial show failed [\(error.code)]: \(error.message)")
        pendingInterstitialShowCall = nil
    }

    func handleRewardedShowFailed(_ error: UnityAdsError) {
        log(error, context: "rewarded show failed")
        pendingRewardedShowCall?.reject("Unity Ads rewarded show failed [\(error.code)]: \(error.message)")
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }

    func handleRewardedShowReceivedReward() {
        log("rewarded show received reward")
        rewardedEarned = true
    }

    func handleInterstitialShowComplete(_ state: UADSShowFinishState) {
        log("interstitial show complete state=\(state)")
        pendingInterstitialShowCall?.resolve(["completed": state == .completed])
        pendingInterstitialShowCall = nil
    }

    func handleRewardedShowComplete(_ state: UADSShowFinishState) {
        log("rewarded show complete state=\(state) earned=\(rewardedEarned)")
        pendingRewardedShowCall?.resolve([
            "completed": state == .completed,
            "rewarded": rewardedEarned && state == .completed
        ])
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }

    private func ensureInitialized(_ call: CAPPluginCall) -> Bool {
        guard initialized else {
            log("call rejected: Unity Ads is not initialized")
            call.reject("Unity Ads is not initialized")
            return false
        }
        return true
    }

    private func getPlacementId(_ call: CAPPluginCall) -> String? {
        guard let placementId = call.getString("placementId"), !placementId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            log("call rejected: placement ID is missing")
            call.reject("Missing Unity Ads placement ID")
            return nil
        }
        return placementId
    }

    private func resolveRewardedLoadCalls(for placementId: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func resolveInterstitialLoadCalls(for placementId: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectRewardedLoadCalls(for placementId: String, message: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.reject(message, "UNITY_ADS_REWARDED_LOAD_FAILED") }
    }

    private func rejectInterstitialLoadCalls(for placementId: String, message: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: placementId) ?? []
        calls.forEach { $0.reject(message, "UNITY_ADS_INTERSTITIAL_LOAD_FAILED") }
    }
}

private final class UnityInterstitialShowDelegate: NSObject, UADSInterstitialShowDelegate {
    weak var owner: UnityAdsPlugin?

    init(owner: UnityAdsPlugin) {
        self.owner = owner
    }

    func showDidStart(_ unityAd: UADSInterstitialAd) {
        owner?.log("interstitial callback showDidStart")
    }

    func showDidClick(_ unityAd: UADSInterstitialAd) {
        owner?.log("interstitial callback showDidClick")
    }

    func showDidComplete(_ unityAd: UADSInterstitialAd, with state: UADSShowFinishState) {
        owner?.log("interstitial callback showDidComplete state=\(state)")
        owner?.handleInterstitialShowComplete(state)
    }

    func showDidFail(_ unityAd: UADSInterstitialAd, error: UnityAdsError) {
        owner?.log(error, context: "interstitial callback showDidFail")
        owner?.handleInterstitialShowFailed(error)
    }
}

private final class UnityRewardedShowDelegate: NSObject, UADSRewardedShowDelegate {
    weak var owner: UnityAdsPlugin?

    init(owner: UnityAdsPlugin) {
        self.owner = owner
    }

    func showDidStart(_ unityAd: UADSRewardedAd) {
        owner?.log("rewarded callback showDidStart")
    }

    func showDidClick(_ unityAd: UADSRewardedAd) {
        owner?.log("rewarded callback showDidClick")
    }

    func showDidComplete(_ unityAd: UADSRewardedAd, with state: UADSShowFinishState) {
        owner?.log("rewarded callback showDidComplete state=\(state)")
        owner?.handleRewardedShowComplete(state)
    }

    func showDidFail(_ unityAd: UADSRewardedAd, error: UnityAdsError) {
        owner?.log(error, context: "rewarded callback showDidFail")
        owner?.handleRewardedShowFailed(error)
    }

    func showDidReceiveReward(_ unityAd: UADSRewardedAd) {
        owner?.log("rewarded callback showDidReceiveReward")
        owner?.handleRewardedShowReceivedReward()
    }
}
