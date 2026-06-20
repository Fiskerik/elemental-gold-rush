import Capacitor
import IronSource
import UIKit

@objc(UnityAdsPlugin)
public class UnityAdsPlugin: CAPPlugin, CAPBridgedPlugin, LPMRewardedAdDelegate, LPMInterstitialAdDelegate {
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
    private var pendingRewardedLoadCalls: [CAPPluginCall] = []
    private var pendingInterstitialLoadCalls: [CAPPluginCall] = []
    private var pendingRewardedShowCall: CAPPluginCall?
    private var pendingInterstitialShowCall: CAPPluginCall?
    private var rewardedAd: LPMRewardedAd?
    private var interstitialAd: LPMInterstitialAd?
    private var rewardedAdUnitId: String?
    private var interstitialAdUnitId: String?
    private var initializationStarted = false
    private var initialized = false
    private var rewardedEarned = false

    @objc func initializeAds(_ call: CAPPluginCall) {
        guard let appKey = call.getString("appKey"), !appKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing LevelPlay iOS app key")
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

        DispatchQueue.main.async {
            NSLog("LevelPlayPlugin initializing appKey=%@", appKey)
            let requestBuilder = LPMInitRequestBuilder(appKey: appKey)
            let initRequest = requestBuilder.build()
            LevelPlay.initWith(initRequest) { _, error in
                if let error = error {
                    self.initializationStarted = false
                    self.initialized = false
                    NSLog("LevelPlayPlugin initialization failed error=%@", error.localizedDescription)
                    let calls = self.pendingInitializationCalls
                    self.pendingInitializationCalls.removeAll()
                    calls.forEach {
                        $0.reject(
                            "LevelPlay initialization failed: \(error.localizedDescription)",
                            "LEVELPLAY_INIT_FAILED"
                        )
                    }
                    return
                }

                NSLog("LevelPlayPlugin initialization complete")
                self.initialized = true
                let calls = self.pendingInitializationCalls
                self.pendingInitializationCalls.removeAll()
                calls.forEach { $0.resolve(["initialized": true]) }
            }
        }
    }

    @objc func loadInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call) else { return }
        guard let adUnitId = getAdUnitId(call) else { return }

        DispatchQueue.main.async {
            self.prepareInterstitialAd(adUnitId)
            if self.interstitialAd?.isAdReady() == true {
                call.resolve(["loaded": true])
                return
            }

            NSLog("LevelPlayPlugin loading interstitial adUnitId=%@", adUnitId)
            self.pendingInterstitialLoadCalls.append(call)
            if self.pendingInterstitialLoadCalls.count == 1 {
                self.interstitialAd?.loadAd()
            }
        }
    }

    @objc func loadRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call) else { return }
        guard let adUnitId = getAdUnitId(call) else { return }

        DispatchQueue.main.async {
            self.prepareRewardedAd(adUnitId)
            if self.rewardedAd?.isAdReady() == true {
                call.resolve(["loaded": true])
                return
            }

            NSLog("LevelPlayPlugin loading rewarded adUnitId=%@", adUnitId)
            self.pendingRewardedLoadCalls.append(call)
            if self.pendingRewardedLoadCalls.count == 1 {
                self.rewardedAd?.loadAd()
            }
        }
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call) else { return }
        guard let adUnitId = getAdUnitId(call) else { return }

        DispatchQueue.main.async {
            self.prepareInterstitialAd(adUnitId)
            guard self.pendingInterstitialShowCall == nil else {
                call.reject("LevelPlay interstitial is already showing")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                call.reject("Could not find a view controller for LevelPlay")
                return
            }
            guard self.interstitialAd?.isAdReady() == true else {
                call.reject("LevelPlay interstitial is not ready")
                return
            }

            NSLog("LevelPlayPlugin showing interstitial adUnitId=%@", adUnitId)
            self.pendingInterstitialShowCall = call
            self.interstitialAd?.showAd(viewController: viewController, placementName: nil)
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call) else { return }
        guard let adUnitId = getAdUnitId(call) else { return }

        DispatchQueue.main.async {
            self.prepareRewardedAd(adUnitId)
            guard self.pendingRewardedShowCall == nil else {
                call.reject("LevelPlay rewarded ad is already showing")
                return
            }
            guard let viewController = self.bridge?.viewController else {
                call.reject("Could not find a view controller for LevelPlay")
                return
            }
            guard self.rewardedAd?.isAdReady() == true else {
                call.reject("LevelPlay rewarded ad is not ready")
                return
            }

            NSLog("LevelPlayPlugin showing rewarded adUnitId=%@", adUnitId)
            self.rewardedEarned = false
            self.pendingRewardedShowCall = call
            self.rewardedAd?.showAd(viewController: viewController, placementName: nil)
        }
    }

    public func didLoadAd(with adInfo: LPMAdInfo) {
        if !pendingRewardedLoadCalls.isEmpty, rewardedAd?.isAdReady() == true {
            NSLog("LevelPlayPlugin rewarded loaded")
            resolveRewardedLoadCalls()
            return
        }

        if !pendingInterstitialLoadCalls.isEmpty, interstitialAd?.isAdReady() == true {
            NSLog("LevelPlayPlugin interstitial loaded")
            resolveInterstitialLoadCalls()
        }
    }

    public func didFailToLoadAd(withAdUnitId adUnitId: String, error: Error) {
        NSLog("LevelPlayPlugin load failed adUnitId=%@ error=%@", adUnitId, error.localizedDescription)
        if adUnitId == rewardedAdUnitId {
            rejectRewardedLoadCalls("LevelPlay rewarded load failed: \(error.localizedDescription)")
            return
        }
        if adUnitId == interstitialAdUnitId {
            rejectInterstitialLoadCalls("LevelPlay interstitial load failed: \(error.localizedDescription)")
        }
    }

    public func didDisplayAd(with adInfo: LPMAdInfo) {}

    public func didFailToDisplayAd(with adInfo: LPMAdInfo, error: Error) {
        NSLog("LevelPlayPlugin display failed error=%@", error.localizedDescription)
        if let call = pendingRewardedShowCall {
            pendingRewardedShowCall = nil
            call.reject("LevelPlay rewarded show failed: \(error.localizedDescription)")
            return
        }
        if let call = pendingInterstitialShowCall {
            pendingInterstitialShowCall = nil
            call.reject("LevelPlay interstitial show failed: \(error.localizedDescription)")
        }
    }

    public func didClickAd(with adInfo: LPMAdInfo) {}

    public func didCloseAd(with adInfo: LPMAdInfo) {
        if let call = pendingRewardedShowCall {
            pendingRewardedShowCall = nil
            call.resolve([
                "completed": rewardedEarned,
                "skipped": !rewardedEarned
            ])
            rewardedEarned = false
            return
        }

        if let call = pendingInterstitialShowCall {
            pendingInterstitialShowCall = nil
            call.resolve(["completed": true])
        }
    }

    public func didRewardAd(with adInfo: LPMAdInfo, reward: LPMReward) {
        NSLog("LevelPlayPlugin rewarded reward=%ld %@", reward.amount, reward.name)
        rewardedEarned = true
    }

    public func didChangeAdInfo(_ adInfo: LPMAdInfo) {}

    private func ensureInitialized(_ call: CAPPluginCall) -> Bool {
        guard initialized else {
            call.reject("LevelPlay is not initialized")
            return false
        }
        return true
    }

    private func getAdUnitId(_ call: CAPPluginCall) -> String? {
        guard let adUnitId = call.getString("adUnitId"), !adUnitId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing LevelPlay ad unit ID")
            return nil
        }
        return adUnitId
    }

    private func prepareRewardedAd(_ adUnitId: String) {
        if rewardedAdUnitId == adUnitId, rewardedAd != nil {
            return
        }
        rewardedAdUnitId = adUnitId
        rewardedAd = LPMRewardedAd(adUnitId: adUnitId)
        rewardedAd?.setDelegate(self)
    }

    private func prepareInterstitialAd(_ adUnitId: String) {
        if interstitialAdUnitId == adUnitId, interstitialAd != nil {
            return
        }
        interstitialAdUnitId = adUnitId
        interstitialAd = LPMInterstitialAd(adUnitId: adUnitId)
        interstitialAd?.setDelegate(self)
    }

    private func resolveRewardedLoadCalls() {
        let calls = pendingRewardedLoadCalls
        pendingRewardedLoadCalls.removeAll()
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func resolveInterstitialLoadCalls() {
        let calls = pendingInterstitialLoadCalls
        pendingInterstitialLoadCalls.removeAll()
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectRewardedLoadCalls(_ message: String) {
        let calls = pendingRewardedLoadCalls
        pendingRewardedLoadCalls.removeAll()
        calls.forEach { $0.reject(message, "LEVELPLAY_REWARDED_LOAD_FAILED") }
    }

    private func rejectInterstitialLoadCalls(_ message: String) {
        let calls = pendingInterstitialLoadCalls
        pendingInterstitialLoadCalls.removeAll()
        calls.forEach { $0.reject(message, "LEVELPLAY_INTERSTITIAL_LOAD_FAILED") }
    }
}
