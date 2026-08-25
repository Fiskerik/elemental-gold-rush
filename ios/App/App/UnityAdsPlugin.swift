import Capacitor
import IronSource
import UIKit

// The Objective-C/JavaScript registration name intentionally remains
// UnityAdsPlugin so existing Capacitor callers continue to work. All ad
// delivery is handled by Unity LevelPlay mediation.
@objc(UnityAdsPlugin)
public final class UnityAdsPlugin: CAPPlugin, CAPBridgedPlugin, LPMRewardedAdDelegate, LPMInterstitialAdDelegate {
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
    private var rewardedAds: [String: LPMRewardedAd] = [:]
    private var interstitialAds: [String: LPMInterstitialAd] = [:]
    private var loadingRewarded = Set<String>()
    private var loadingInterstitial = Set<String>()
    private var initializationStarted = false
    private var initialized = false
    private var rewardedEarned = false
    private let diagnosticsStorageKey = "LevelPlayPlugin.diagnostics"
    private var diagnostics: [String] = (UserDefaults.standard.array(forKey: "LevelPlayPlugin.diagnostics") as? [String]) ?? []

    fileprivate func log(_ message: String) {
        let line = "[\(Date())] \(message)"
        diagnostics.append(line)
        if diagnostics.count > 120 {
            diagnostics.removeFirst(diagnostics.count - 120)
        }
        UserDefaults.standard.set(diagnostics, forKey: diagnosticsStorageKey)
        NSLog("[LevelPlayPlugin] %@", message)
    }

    fileprivate func log(_ error: Error, context: String) {
        log("\(context) error=\(error.localizedDescription)")
    }

    @objc func getDiagnostics(_ call: CAPPluginCall) {
        call.resolve(["logs": diagnostics])
    }

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
        if initializationStarted { return }
        initializationStarted = true
        let adapterDebug = call.getBool("adapterDebug", false)

        DispatchQueue.main.async {
            self.log("initialize start appKey=\(appKey) adapterDebug=\(adapterDebug)")
            if adapterDebug {
                LevelPlay.setAdaptersDebug(true)
            }
            let request = LPMInitRequestBuilder(appKey: appKey).build()
            LevelPlay.initWith(request) { [weak self] _, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error {
                        self.initializationStarted = false
                        self.initialized = false
                        self.log(error, context: "initialize failed")
                        let calls = self.pendingInitializationCalls
                        self.pendingInitializationCalls.removeAll()
                        calls.forEach {
                            $0.reject("LevelPlay initialization failed: \(error.localizedDescription)", "LEVELPLAY_INIT_FAILED")
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
        guard ensureInitialized(call), let adUnitId = getAdUnitId(call) else { return }
        DispatchQueue.main.async {
            self.log("interstitial load requested adUnitId=\(adUnitId)")
            let ad = self.interstitialAds[adUnitId] ?? self.createInterstitialAd(adUnitId)
            if ad.isAdReady() {
                call.resolve(["loaded": true])
                return
            }
            self.pendingInterstitialLoadCalls[adUnitId, default: []].append(call)
            guard self.loadingInterstitial.insert(adUnitId).inserted else { return }
            ad.loadAd()
        }
    }

    @objc func loadRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let adUnitId = getAdUnitId(call) else { return }
        DispatchQueue.main.async {
            self.log("rewarded load requested adUnitId=\(adUnitId)")
            let ad = self.rewardedAds[adUnitId] ?? self.createRewardedAd(adUnitId)
            if ad.isAdReady() {
                call.resolve(["loaded": true])
                return
            }
            self.pendingRewardedLoadCalls[adUnitId, default: []].append(call)
            guard self.loadingRewarded.insert(adUnitId).inserted else { return }
            ad.loadAd()
        }
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let adUnitId = getAdUnitId(call) else { return }
        DispatchQueue.main.async {
            self.log("interstitial show requested adUnitId=\(adUnitId)")
            guard self.pendingInterstitialShowCall == nil else {
                call.reject("LevelPlay interstitial is already showing")
                return
            }
            guard let ad = self.interstitialAds[adUnitId], ad.isAdReady() else {
                call.reject("LevelPlay interstitial is not ready")
                return
            }
            guard let viewController = self.activeViewController() else {
                call.reject("Could not find a view controller for LevelPlay")
                return
            }
            self.pendingInterstitialShowCall = call
            self.log("interstitial show starting adUnitId=\(adUnitId) viewController=\(type(of: viewController))")
            ad.showAd(viewController: viewController, placementName: nil)
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        guard ensureInitialized(call), let adUnitId = getAdUnitId(call) else { return }
        DispatchQueue.main.async {
            self.log("rewarded show requested adUnitId=\(adUnitId)")
            guard self.pendingRewardedShowCall == nil else {
                call.reject("LevelPlay rewarded ad is already showing")
                return
            }
            guard let ad = self.rewardedAds[adUnitId], ad.isAdReady() else {
                call.reject("LevelPlay rewarded ad is not ready")
                return
            }
            guard let viewController = self.activeViewController() else {
                call.reject("Could not find a view controller for LevelPlay")
                return
            }
            self.rewardedEarned = false
            self.pendingRewardedShowCall = call
            self.log("rewarded show starting adUnitId=\(adUnitId) viewController=\(type(of: viewController))")
            ad.showAd(viewController: viewController, placementName: nil)
        }
    }

    // MARK: - LevelPlay callbacks

    public func didLoadAd(with adInfo: LPMAdInfo) {
        let adUnitId = adInfo.adUnitId
        if rewardedAds[adUnitId] != nil {
            loadingRewarded.remove(adUnitId)
            log("rewarded load success adUnitId=\(adUnitId)")
            resolveRewardedLoadCalls(for: adUnitId)
        } else if interstitialAds[adUnitId] != nil {
            loadingInterstitial.remove(adUnitId)
            log("interstitial load success adUnitId=\(adUnitId)")
            resolveInterstitialLoadCalls(for: adUnitId)
        }
    }

    public func didFailToLoadAd(withAdUnitId adUnitId: String, error: Error) {
        if rewardedAds[adUnitId] != nil, loadingRewarded.contains(adUnitId) {
            loadingRewarded.remove(adUnitId)
            log(error, context: "rewarded load failed adUnitId=\(adUnitId)")
            rejectRewardedLoadCalls(for: adUnitId, message: "LevelPlay rewarded load failed: \(error.localizedDescription)")
        } else if interstitialAds[adUnitId] != nil, loadingInterstitial.contains(adUnitId) {
            loadingInterstitial.remove(adUnitId)
            log(error, context: "interstitial load failed adUnitId=\(adUnitId)")
            rejectInterstitialLoadCalls(for: adUnitId, message: "LevelPlay interstitial load failed: \(error.localizedDescription)")
        }
    }

    public func didChangeAdInfo(_ adInfo: LPMAdInfo) {}

    public func didDisplayAd(with adInfo: LPMAdInfo) {
        log("ad callback didDisplayAd adUnitId=\(adInfo.adUnitId)")
    }

    public func didFailToDisplayAd(with adInfo: LPMAdInfo, error: Error) {
        if rewardedAds[adInfo.adUnitId] != nil {
            log(error, context: "rewarded callback didFailToDisplayAd adUnitId=\(adInfo.adUnitId)")
            pendingRewardedShowCall?.reject(
                "LevelPlay rewarded display failed: \(error.localizedDescription)",
                "LEVELPLAY_REWARDED_DISPLAY_FAILED"
            )
            pendingRewardedShowCall = nil
            rewardedEarned = false
        } else if interstitialAds[adInfo.adUnitId] != nil {
            log(error, context: "interstitial callback didFailToDisplayAd adUnitId=\(adInfo.adUnitId)")
            pendingInterstitialShowCall?.reject(
                "LevelPlay interstitial display failed: \(error.localizedDescription)",
                "LEVELPLAY_INTERSTITIAL_DISPLAY_FAILED"
            )
            pendingInterstitialShowCall = nil
        } else {
            log(error, context: "unmatched callback didFailToDisplayAd adUnitId=\(adInfo.adUnitId)")
        }
    }

    public func didClickAd(with adInfo: LPMAdInfo) {
        log("ad callback didClickAd adUnitId=\(adInfo.adUnitId)")
    }

    public func didCloseAd(with adInfo: LPMAdInfo) {
        if rewardedAds[adInfo.adUnitId] != nil {
            log("rewarded callback didCloseAd adUnitId=\(adInfo.adUnitId) earned=\(rewardedEarned)")
            // Some networks report the reward immediately after the close callback.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self.pendingRewardedShowCall?.resolve([
                    "completed": self.rewardedEarned,
                    "rewarded": self.rewardedEarned
                ])
                self.pendingRewardedShowCall = nil
                self.rewardedEarned = false
            }
        } else if interstitialAds[adInfo.adUnitId] != nil {
            log("interstitial callback didCloseAd adUnitId=\(adInfo.adUnitId)")
            pendingInterstitialShowCall?.resolve(["completed": true])
            pendingInterstitialShowCall = nil
        }
    }

    public func didRewardAd(with adInfo: LPMAdInfo, reward: LPMReward) {
        rewardedEarned = true
        log("rewarded callback didRewardAd adUnitId=\(adInfo.adUnitId) reward=\(reward.amount) \(reward.name)")
    }

    private func createRewardedAd(_ adUnitId: String) -> LPMRewardedAd {
        let ad = LPMRewardedAd(adUnitId: adUnitId)
        ad.setDelegate(self)
        rewardedAds[adUnitId] = ad
        return ad
    }

    private func createInterstitialAd(_ adUnitId: String) -> LPMInterstitialAd {
        let ad = LPMInterstitialAd(adUnitId: adUnitId)
        ad.setDelegate(self)
        interstitialAds[adUnitId] = ad
        return ad
    }

    private func ensureInitialized(_ call: CAPPluginCall) -> Bool {
        guard initialized else {
            call.reject("LevelPlay is not initialized")
            return false
        }
        return true
    }

    private func getAdUnitId(_ call: CAPPluginCall) -> String? {
        guard let adUnitId = call.getString("adUnitId"), !adUnitId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("Missing LevelPlay ad-unit ID")
            return nil
        }
        return adUnitId
    }

    private func activeViewController() -> UIViewController? {
        guard let root = bridge?.viewController else { return nil }
        return topViewController(from: root)
    }

    private func topViewController(from viewController: UIViewController) -> UIViewController {
        if let presented = viewController.presentedViewController, !presented.isBeingDismissed {
            return topViewController(from: presented)
        }
        if let navigation = viewController as? UINavigationController, let visible = navigation.visibleViewController {
            return topViewController(from: visible)
        }
        if let tabs = viewController as? UITabBarController, let selected = tabs.selectedViewController {
            return topViewController(from: selected)
        }
        return viewController
    }

    private func resolveRewardedLoadCalls(for adUnitId: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: adUnitId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectRewardedLoadCalls(for adUnitId: String, message: String) {
        let calls = pendingRewardedLoadCalls.removeValue(forKey: adUnitId) ?? []
        calls.forEach { $0.reject(message, "LEVELPLAY_REWARDED_LOAD_FAILED") }
    }

    private func resolveInterstitialLoadCalls(for adUnitId: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: adUnitId) ?? []
        calls.forEach { $0.resolve(["loaded": true]) }
    }

    private func rejectInterstitialLoadCalls(for adUnitId: String, message: String) {
        let calls = pendingInterstitialLoadCalls.removeValue(forKey: adUnitId) ?? []
        calls.forEach { $0.reject(message, "LEVELPLAY_INTERSTITIAL_LOAD_FAILED") }
    }
}
