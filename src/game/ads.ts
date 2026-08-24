import { Capacitor, registerPlugin } from "@capacitor/core";
import { logDebug } from "../lib/debugLogger";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

type UnityAdsPlugin = {
  initializeAds(options: { gameId: string; testMode: boolean }): Promise<{ initialized: boolean }>;
  loadInterstitial(options: { placementId: string }): Promise<{ loaded: boolean }>;
  loadRewarded(options: { placementId: string }): Promise<{ loaded: boolean }>;
  showInterstitial(options: { placementId: string }): Promise<{ completed: boolean }>;
  showRewarded(options: { placementId: string }): Promise<{ rewarded: boolean; completed: boolean }>;
  getDiagnostics(): Promise<{ logs?: unknown }>;
};

const UnityAds = registerPlugin<UnityAdsPlugin>("UnityAdsPlugin");

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

function getGameId(): string {
  return configuredEnvValue(import.meta.env.VITE_UNITY_ADS_IOS_GAME_ID);
}

function getInterstitialPlacementId(): string {
  return configuredEnvValue(import.meta.env.VITE_UNITY_ADS_IOS_INTERSTITIAL_ID);
}

function getRewardedPlacementId(): string {
  return configuredEnvValue(import.meta.env.VITE_UNITY_ADS_IOS_REWARDED_ID);
}

function isUnityAdsAvailable(): boolean {
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
  if (hasProPack || initialized || !isUnityAdsAvailable()) return;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  const gameId = getGameId();
  if (!gameId) {
    initFailureReason = "Unity Ads iOS game ID is missing from this build.";
    initFailed = true;
    return;
  }

  initializationPromise = (async () => {
    try {
      const testMode = envFlagEnabled(import.meta.env.VITE_UNITY_ADS_TEST_MODE);
      logDebug("Unity Ads initialization requested.", { gameId, testMode });
      await UnityAds.initializeAds({
        gameId,
        testMode,
      });
      initialized = true;
      initFailed = false;
      initFailureReason = "";
      logDebug("Unity Ads initialization completed.");
    } catch (error) {
      initFailureReason = describeAdError(error) || "Unity Ads could not initialize.";
      logDebug("Unity Ads initialization failed.", { reason: initFailureReason });
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
  if (interstitialReady || !initialized || !isUnityAdsAvailable()) return;
  if (interstitialLoading && interstitialLoadPromise) {
    await interstitialLoadPromise;
    return;
  }

  const placementId = getInterstitialPlacementId();
  if (!placementId) return;

  interstitialLoading = true;
  interstitialLoadPromise = (async () => {
    try {
      await UnityAds.loadInterstitial({ placementId });
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
  if (rewardedReady || !initialized || !isUnityAdsAvailable()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }

  const placementId = getRewardedPlacementId();
  if (!placementId) {
    lastRewardedError = "Unity Ads iOS rewarded placement ID is missing from this build.";
    return;
  }

  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      logDebug("Unity Ads rewarded load requested.", { placementId });
      await UnityAds.loadRewarded({ placementId });
      rewardedReady = true;
      logDebug("Unity Ads rewarded load completed.", { placementId });
    } catch (error) {
      rewardedReady = false;
      lastRewardedError = describeAdError(error) || "Rewarded ad failed to load.";
      logDebug("Unity Ads rewarded load failed.", { placementId, reason: lastRewardedError });
    } finally {
      rewardedLoading = false;
      rewardedLoadPromise = null;
    }
  })();
  await rewardedLoadPromise;
}

export async function showInterstitialIfReady(hasProPack: boolean): Promise<boolean> {
  if (hasProPack || !isUnityAdsAvailable()) return false;
  if (!initialized) await initAds(false);
  if (initFailed) return false;

  const placementId = getInterstitialPlacementId();
  if (!placementId) return false;
  if (!interstitialReady) {
    await preloadInterstitial();
    if (!interstitialReady) return false;
  }

  interstitialReady = false;
  try {
    const result = await UnityAds.showInterstitial({ placementId });
    void preloadInterstitial();
    return result.completed;
  } catch {
    void preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(_hasProPack: boolean): Promise<RewardedAdResult> {
  if (!isUnityAdsAvailable()) {
    return { rewarded: false, reason: "Rewarded ads are available in the iPhone app." };
  }

  if (!initialized) await initAds(false);
  if (initFailed) {
    return {
      rewarded: false,
      reason: initFailureReason || "Unity Ads could not initialize in this build.",
    };
  }

  const placementId = getRewardedPlacementId();
  if (!placementId) {
    return { rewarded: false, reason: "Unity Ads iOS rewarded placement ID is missing from this build." };
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
    logDebug("Unity Ads rewarded show requested.", { placementId });
    const result = await UnityAds.showRewarded({ placementId });
    logDebug("Unity Ads rewarded show completed.", { placementId, result });
    void preloadRewarded();
    return { rewarded: result.rewarded };
  } catch (error) {
    const reason = describeAdError(error) || "Rewarded ad could not be shown.";
    lastRewardedError = reason;
    logDebug("Unity Ads rewarded show failed.", { placementId, reason });
    void preloadRewarded();
    return { rewarded: false, reason };
  }
}

export async function getUnityAdsDiagnostics(): Promise<string[]> {
  if (!isUnityAdsAvailable()) return [];

  try {
    const result = await UnityAds.getDiagnostics();
    const logs = Array.isArray(result.logs)
      ? result.logs.filter((entry): entry is string => typeof entry === "string")
      : [];
    logs.forEach((entry) => logDebug(`Unity Ads native: ${entry}`));
    return logs;
  } catch (error) {
    logDebug("Unity Ads diagnostics could not be read.", {
      reason: describeAdError(error) || String(error),
    });
    return [];
  }
}
