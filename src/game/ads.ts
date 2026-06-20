import { Capacitor, registerPlugin } from "@capacitor/core";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

type LevelPlayInitializeOptions = {
  appKey: string;
};

type LevelPlayAdUnitOptions = {
  adUnitId: string;
};

type LevelPlayShowResult = {
  completed?: boolean;
  skipped?: boolean;
};

interface LevelPlayPlugin {
  initializeAds(options: LevelPlayInitializeOptions): Promise<{ initialized: boolean }>;
  loadInterstitial(options: LevelPlayAdUnitOptions): Promise<{ loaded: boolean }>;
  loadRewarded(options: LevelPlayAdUnitOptions): Promise<{ loaded: boolean }>;
  showInterstitial(options: LevelPlayAdUnitOptions): Promise<LevelPlayShowResult>;
  showRewarded(options: LevelPlayAdUnitOptions): Promise<LevelPlayShowResult>;
}

// The native bridge keeps this legacy JS name so existing Capacitor registration
// stays stable while the implementation moves from Unity Ads to LevelPlay.
const LevelPlayNative = registerPlugin<LevelPlayPlugin>("UnityAdsPlugin");

const DEFAULT_LEVELPLAY_APP_KEY = "26b8f239d";
const DEFAULT_IOS_INTERSTITIAL_AD_UNIT_ID = "czf0jlk6mnbenyh0";
const DEFAULT_IOS_REWARDED_AD_UNIT_ID = "g3kygieiv8izpje1";

let initialized = false;
let initFailed = false;
let interstitialReady = false;
let interstitialLoading = false;
let rewardedReady = false;
let rewardedLoading = false;
let initFailureReason = "";
let lastRewardedError = "";
let rewardedLoadPromise: Promise<void> | null = null;
let interstitialLoadPromise: Promise<void> | null = null;

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function firstConfiguredEnvValue(...values: unknown[]): string {
  for (const value of values) {
    const configured = configuredEnvValue(value);
    if (configured) return configured;
  }
  return "";
}

function getLevelPlayAppKey(): string {
  return (
    firstConfiguredEnvValue(
      import.meta.env.VITE_LEVELPLAY_IOS_APP_KEY,
      import.meta.env.VITE_LEVELPLAY_APP_KEY,
      import.meta.env.VITE_IRONSOURCE_IOS_APP_KEY,
      import.meta.env.VITE_IRONSOURCE_APP_KEY,
    ) || DEFAULT_LEVELPLAY_APP_KEY
  );
}

function getInterstitialAdUnitId(): string {
  return (
    firstConfiguredEnvValue(
      import.meta.env.VITE_LEVELPLAY_IOS_INTERSTITIAL_AD_UNIT_ID,
      import.meta.env.VITE_LEVELPLAY_INTERSTITIAL_AD_UNIT_ID,
      import.meta.env.VITE_IRONSOURCE_IOS_INTERSTITIAL_AD_UNIT_ID,
      import.meta.env.VITE_IRONSOURCE_INTERSTITIAL_AD_UNIT_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_INTERSTITIAL_PLACEMENT_ID,
      import.meta.env.VITE_UNITY_ADS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_ADS_INTERSTITIAL_PLACEMENT_ID,
      import.meta.env.VITE_UNITYADS_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITYADS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_INTERSTITIAL_PLACEMENT_ID,
    ) || DEFAULT_IOS_INTERSTITIAL_AD_UNIT_ID
  );
}

function getRewardedAdUnitId(): string {
  return (
    firstConfiguredEnvValue(
      import.meta.env.VITE_LEVELPLAY_IOS_REWARDED_AD_UNIT_ID,
      import.meta.env.VITE_LEVELPLAY_REWARDED_AD_UNIT_ID,
      import.meta.env.VITE_IRONSOURCE_IOS_REWARDED_AD_UNIT_ID,
      import.meta.env.VITE_IRONSOURCE_REWARDED_AD_UNIT_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_REWARDED_PLACEMENT_ID,
      import.meta.env.VITE_UNITY_ADS_REWARDED_ID,
      import.meta.env.VITE_UNITY_ADS_REWARDED_PLACEMENT_ID,
      import.meta.env.VITE_UNITYADS_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITYADS_REWARDED_ID,
      import.meta.env.VITE_UNITY_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITY_REWARDED_ID,
      import.meta.env.VITE_UNITY_REWARDED_PLACEMENT_ID,
    ) || DEFAULT_IOS_REWARDED_AD_UNIT_ID
  );
}

function describeAdError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const details = error as {
    code?: unknown;
    error?: unknown;
    errorMessage?: unknown;
    message?: unknown;
  };
  const code =
    typeof details.code === "number" || typeof details.code === "string"
      ? String(details.code)
      : "";
  const message =
    configuredEnvValue(details.message) ||
    configuredEnvValue(details.errorMessage) ||
    configuredEnvValue(details.error);
  return [code, message].filter(Boolean).join(": ");
}

function describeLevelPlayConfig(): string {
  return [
    `appKey=${getLevelPlayAppKey() || "missing"}`,
    `interstitial=${getInterstitialAdUnitId()}`,
    `rewarded=${getRewardedAdUnitId()}`,
  ].join(", ");
}

function isLevelPlayAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || !isLevelPlayAvailable()) return;

  const appKey = getLevelPlayAppKey();
  if (!appKey) {
    initFailed = true;
    initFailureReason = "LevelPlay iOS app key is missing from this build.";
    return;
  }

  try {
    initFailed = false;
    initFailureReason = "";
    console.info(`[ads] Initializing LevelPlay (${describeLevelPlayConfig()})`);
    await LevelPlayNative.initializeAds({ appKey });
    initialized = true;
    initFailureReason = "";
  } catch (error) {
    initFailureReason = describeAdError(error) || "LevelPlay initialization failed.";
    console.warn(`[ads] LevelPlay initialization failed: ${initFailureReason}`);
    initFailed = true;
    initialized = false;
  }
}

export async function preloadInterstitial(): Promise<void> {
  if (interstitialReady || !isLevelPlayAvailable()) return;
  if (interstitialLoading && interstitialLoadPromise) {
    await interstitialLoadPromise;
    return;
  }

  interstitialLoading = true;
  interstitialLoadPromise = (async () => {
    try {
      await LevelPlayNative.loadInterstitial({ adUnitId: getInterstitialAdUnitId() });
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
  if (rewardedReady || !isLevelPlayAvailable()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }

  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      await LevelPlayNative.loadRewarded({ adUnitId: getRewardedAdUnitId() });
      rewardedReady = true;
    } catch (error) {
      rewardedReady = false;
      lastRewardedError = `${describeAdError(error) || "Rewarded ad failed to load."} [${describeLevelPlayConfig()}]`;
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

  if (!interstitialReady) {
    await preloadInterstitial();
    if (!interstitialReady) return false;
  }

  interstitialReady = false;
  try {
    await LevelPlayNative.showInterstitial({ adUnitId: getInterstitialAdUnitId() });
    void preloadInterstitial();
    return true;
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
    const result = await LevelPlayNative.showRewarded({ adUnitId: getRewardedAdUnitId() });
    void preloadRewarded();
    return result.completed
      ? { rewarded: true }
      : { rewarded: false, reason: "Rewarded ad was not completed." };
  } catch (error) {
    const reason = describeAdError(error) || "Rewarded ad could not be shown.";
    lastRewardedError = reason;
    void preloadRewarded();
    return { rewarded: false, reason };
  }
}
