import { Capacitor, registerPlugin } from "@capacitor/core";
import { logDebug } from "../lib/debugLogger";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

type LevelPlayPlugin = {
  initializeAds(options: {
    appKey: string;
    adapterDebug: boolean;
  }): Promise<{ initialized: boolean }>;
  loadInterstitial(options: { adUnitId: string }): Promise<{ loaded: boolean }>;
  loadRewarded(options: { adUnitId: string }): Promise<{ loaded: boolean }>;
  showInterstitial(options: { adUnitId: string }): Promise<{ completed: boolean }>;
  showRewarded(options: { adUnitId: string }): Promise<{ rewarded: boolean; completed: boolean }>;
  getDiagnostics(): Promise<{ logs?: unknown }>;
};

// Keep the native plugin registration name for upgrade compatibility while
// routing every ad request through Unity LevelPlay mediation.
const LevelPlayAds = registerPlugin<LevelPlayPlugin>("UnityAdsPlugin");

let initialized = false;
let initFailed = false;
let interstitialReady = false;
let interstitialLoading = false;
let rewardedReady = false;
let rewardedLoading = false;
let initFailureReason = "";
let lastRewardedError = "";
let initializationPromise: Promise<void> | null = null;
let rewardedLoadPromise: Promise<void> | null = null;
let interstitialLoadPromise: Promise<void> | null = null;

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function envFlagEnabled(value: unknown): boolean {
  return ["1", "true", "yes", "on"].includes(configuredEnvValue(value).toLowerCase());
}

function getLevelPlayAppId(): string {
  return configuredEnvValue(import.meta.env.VITE_LEVELPLAY_IOS_APP_ID);
}

function getInterstitialAdUnitId(): string {
  return configuredEnvValue(import.meta.env.VITE_LEVELPLAY_IOS_INTERSTITIAL_ID);
}

function getRewardedAdUnitId(): string {
  return configuredEnvValue(import.meta.env.VITE_LEVELPLAY_IOS_REWARDED_ID);
}

function isLevelPlayAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function describeAdError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const details = error as { message?: unknown; errorMessage?: unknown };
  return configuredEnvValue(details.message) || configuredEnvValue(details.errorMessage);
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || !isLevelPlayAvailable()) return;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  const appKey = getLevelPlayAppId();
  if (!appKey) {
    initFailureReason = "LevelPlay iOS app key is missing from this build.";
    initFailed = true;
    return;
  }

  initializationPromise = (async () => {
    try {
      const adapterDebug = envFlagEnabled(import.meta.env.VITE_LEVELPLAY_ADAPTER_DEBUG);
      logDebug("LevelPlay initialization requested.", { appKey, adapterDebug });
      await LevelPlayAds.initializeAds({
        appKey,
        adapterDebug,
      });
      initialized = true;
      initFailed = false;
      initFailureReason = "";
      logDebug("LevelPlay initialization completed.");
    } catch (error) {
      initFailureReason = describeAdError(error) || "LevelPlay could not initialize.";
      logDebug("LevelPlay initialization failed.", { reason: initFailureReason });
      console.warn(`[ads] ${initFailureReason}`);
      initialized = false;
      initFailed = true;
    } finally {
      initializationPromise = null;
    }
  })();

  await initializationPromise;
}

export async function preloadInterstitial(): Promise<void> {
  if (interstitialReady || !initialized || !isLevelPlayAvailable()) return;
  if (interstitialLoading && interstitialLoadPromise) {
    await interstitialLoadPromise;
    return;
  }

  const adUnitId = getInterstitialAdUnitId();
  if (!adUnitId) return;

  interstitialLoading = true;
  interstitialLoadPromise = (async () => {
    try {
      await LevelPlayAds.loadInterstitial({ adUnitId });
      interstitialReady = true;
    } catch {
      interstitialReady = false;
    } finally {
      interstitialLoading = false;
      interstitialLoadPromise = null;
    }
  })();
  await interstitialLoadPromise;
}

export async function preloadRewarded(): Promise<void> {
  if (rewardedReady || !initialized || !isLevelPlayAvailable()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }

  const adUnitId = getRewardedAdUnitId();
  if (!adUnitId) {
    lastRewardedError = "LevelPlay iOS rewarded ad-unit ID is missing from this build.";
    return;
  }

  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      logDebug("LevelPlay rewarded load requested.", { adUnitId });
      await LevelPlayAds.loadRewarded({ adUnitId });
      rewardedReady = true;
      logDebug("LevelPlay rewarded load completed.", { adUnitId });
    } catch (error) {
      rewardedReady = false;
      lastRewardedError = describeAdError(error) || "Rewarded ad failed to load.";
      logDebug("LevelPlay rewarded load failed.", { adUnitId, reason: lastRewardedError });
    } finally {
      rewardedLoading = false;
      rewardedLoadPromise = null;
    }
  })();
  await rewardedLoadPromise;
}

export async function showInterstitialIfReady(hasProPack: boolean): Promise<boolean> {
  if (hasProPack || !isLevelPlayAvailable()) return false;
  if (!initialized) await initAds(false);
  if (initFailed) return false;

  const adUnitId = getInterstitialAdUnitId();
  if (!adUnitId) return false;
  if (!interstitialReady) {
    await preloadInterstitial();
    if (!interstitialReady) return false;
  }

  interstitialReady = false;
  try {
    const result = await LevelPlayAds.showInterstitial({ adUnitId });
    void preloadInterstitial();
    return result.completed;
  } catch {
    void preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(_hasProPack: boolean): Promise<RewardedAdResult> {
  if (!isLevelPlayAvailable()) {
    return { rewarded: false, reason: "Rewarded ads are available in the iPhone app." };
  }

  if (!initialized) await initAds(false);
  if (initFailed) {
    return {
      rewarded: false,
      reason: initFailureReason || "LevelPlay could not initialize in this build.",
    };
  }

  const adUnitId = getRewardedAdUnitId();
  if (!adUnitId) {
    return {
      rewarded: false,
      reason: "LevelPlay iOS rewarded ad-unit ID is missing from this build.",
    };
  }
  if (!rewardedReady) {
    await preloadRewarded();
    if (!rewardedReady) {
      return {
        rewarded: false,
        reason: lastRewardedError || "Rewarded ad is still loading. Try again shortly.",
      };
    }
  }

  rewardedReady = false;
  try {
    logDebug("LevelPlay rewarded show requested.", { adUnitId });
    const result = await LevelPlayAds.showRewarded({ adUnitId });
    logDebug("LevelPlay rewarded show completed.", { adUnitId, result });
    void preloadRewarded();
    return { rewarded: result.rewarded };
  } catch (error) {
    const reason = describeAdError(error) || "Rewarded ad could not be shown.";
    lastRewardedError = reason;
    logDebug("LevelPlay rewarded show failed.", { adUnitId, reason });
    void preloadRewarded();
    return { rewarded: false, reason };
  }
}

export async function getLevelPlayDiagnostics(): Promise<string[]> {
  if (!isLevelPlayAvailable()) return [];

  try {
    const result = await LevelPlayAds.getDiagnostics();
    const logs = Array.isArray(result.logs)
      ? result.logs.filter((entry): entry is string => typeof entry === "string")
      : [];
    logs.forEach((entry) => logDebug(`LevelPlay native: ${entry}`));
    return logs;
  } catch (error) {
    logDebug("LevelPlay diagnostics could not be read.", {
      reason: describeAdError(error) || String(error),
    });
    return [];
  }
}
