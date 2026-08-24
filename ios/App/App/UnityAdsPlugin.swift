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
        CAPPluginMethod(name: "showRewarded", returnType: CAPPluginReturnPromise)
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
    private lazy var interstitialShowDelegate = UnityInterstitialShowDelegate(owner: self)
    private lazy var rewardedShowDelegate = UnityRewardedShowDelegate(owner: self)

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
            NSLog("UnityAdsPlugin initializing gameId=%@ testMode=%@", gameId, String(testMode))
            let configuration = UADSInitializationConfigurationBuilder(gameId: gameId)
                .with(testMode: testMode)
                .build()
            UnityAds.initialize(configuration) { error in
                DispatchQueue.main.async {
                    if let error = error {
                        self.initializationStarted = false
                        self.initialized = false
                        NSLog("UnityAdsPlugin initialization failed error=%@", error.message)
                        let calls = self.pendingInitializationCalls
                        self.pendingInitializationCalls.removeAll()
                        calls.forEach {
                            $0.reject("Unity Ads initialization failed: \(error.message)", "UNITY_ADS_INIT_FAILED")
                        }
                        return
                    }

                    NSLog("UnityAdsPlugin initialization complete")
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
            if self.interstitialAds[placementId] != nil {
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
                            self.interstitialAds[placementId] = ad
                            self.resolveInterstitialLoadCalls(for: placementId)
                        } else {
                            self.rejectInterstitialLoadCalls(
                                for: placementId,
                                message: "Unity Ads interstitial load failed: \(error?.message ?? "Unknown error")"
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
            if self.rewardedAds[placementId] != nil {
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
                            self.rewardedAds[placementId] = ad
                            self.resolveRewardedLoadCalls(for: placementId)
                        } else {
                            self.rejectRewardedLoadCalls(
                                for: placementId,
                                message: "Unity Ads rewarded load failed: \(error?.message ?? "Unknown error")"
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
            guard self.pendingInterstitialShowCall == nil else {
                call.reject("Unity Ads interstitial is already showing")
                return
            }
            guard let ad = self.interstitialAds.removeValue(forKey: placementId) else {
                call.reject("Unity Ads interstitial is not ready")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                self.interstitialAds[placementId] = ad
                call.reject("Could not find a view controller for Unity Ads")
                return
            }

            self.pendingInterstitialShowCall = call
            let configuration = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            ad.show(configuration, delegate: self.interstitialShowDelegate)
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let placementId = getPlacementId(call) else { return }

        DispatchQueue.main.async {
            guard self.pendingRewardedShowCall == nil else {
                call.reject("Unity Ads rewarded ad is already showing")
                return
            }
            guard let ad = self.rewardedAds.removeValue(forKey: placementId) else {
                call.reject("Unity Ads rewarded ad is not ready")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                self.rewardedAds[placementId] = ad
                call.reject("Could not find a view controller for Unity Ads")
                return
            }

            self.rewardedEarned = false
            self.pendingRewardedShowCall = call
            let configuration = UADSShowConfigurationBuilder().with(viewController: viewController).build()
            ad.show(configuration, delegate: self.rewardedShowDelegate)
        }
    }

    func handleInterstitialShowFailed(_ error: UnityAdsError) {
        pendingInterstitialShowCall?.reject("Unity Ads interstitial show failed: \(error.message)")
        pendingInterstitialShowCall = nil
    }

    func handleRewardedShowFailed(_ error: UnityAdsError) {
        pendingRewardedShowCall?.reject("Unity Ads rewarded show failed: \(error.message)")
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }

    func handleRewardedShowReceivedReward() {
        rewardedEarned = true
    }

    func handleInterstitialShowComplete(_ state: UADSShowFinishState) {
        pendingInterstitialShowCall?.resolve(["completed": state == .completed])
        pendingInterstitialShowCall = nil
    }

    func handleRewardedShowComplete(_ state: UADSShowFinishState) {
        pendingRewardedShowCall?.resolve([
            "completed": state == .completed,
            "rewarded": rewardedEarned && state == .completed
        ])
        pendingRewardedShowCall = nil
        rewardedEarned = false
    }

    private func ensureInitialized(_ call: CAPPluginCall) -> Bool {
        guard initialized else {
            call.reject("Unity Ads is not initialized")
            return false
        }
        return true
    }

    private func getPlacementId(_ call: CAPPluginCall) -> String? {
        guard let placementId = call.getString("placementId"), !placementId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
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

    func showDidStart(_ unityAd: UADSInterstitialAd) {}
    func showDidClick(_ unityAd: UADSInterstitialAd) {}

    func showDidComplete(_ unityAd: UADSInterstitialAd, with state: UADSShowFinishState) {
        owner?.handleInterstitialShowComplete(state)
    }

    func showDidFail(_ unityAd: UADSInterstitialAd, error: UnityAdsError) {
        owner?.handleInterstitialShowFailed(error)
    }
}

private final class UnityRewardedShowDelegate: NSObject, UADSRewardedShowDelegate {
    weak var owner: UnityAdsPlugin?

    init(owner: UnityAdsPlugin) {
        self.owner = owner
    }

    func showDidStart(_ unityAd: UADSRewardedAd) {}
    func showDidClick(_ unityAd: UADSRewardedAd) {}

    func showDidComplete(_ unityAd: UADSRewardedAd, with state: UADSShowFinishState) {
        owner?.handleRewardedShowComplete(state)
    }

    func showDidFail(_ unityAd: UADSRewardedAd, error: UnityAdsError) {
        owner?.handleRewardedShowFailed(error)
    }

    func showDidReceiveReward(_ unityAd: UADSRewardedAd) {
        owner?.handleRewardedShowReceivedReward()
    }
}
