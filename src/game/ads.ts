import { Capacitor, registerPlugin } from "@capacitor/core";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

type UnityAdsInitializeOptions = {
  gameId: string;
  testMode: boolean;
};

type UnityAdsPlacementOptions = {
  placementId: string;
};

type UnityAdsShowResult = {
  completed?: boolean;
  skipped?: boolean;
};

interface UnityAdsPlugin {
  initialize(options: UnityAdsInitializeOptions): Promise<{ initialized: boolean }>;
  loadInterstitial(options: UnityAdsPlacementOptions): Promise<{ loaded: boolean }>;
  loadRewarded(options: UnityAdsPlacementOptions): Promise<{ loaded: boolean }>;
  showInterstitial(options: UnityAdsPlacementOptions): Promise<UnityAdsShowResult>;
  showRewarded(options: UnityAdsPlacementOptions): Promise<UnityAdsShowResult>;
}

const UnityAdsNative = registerPlugin<UnityAdsPlugin>("UnityAdsPlugin");

const DEFAULT_IOS_INTERSTITIAL_PLACEMENT_ID = "Interstitial_iOS";
const DEFAULT_IOS_REWARDED_PLACEMENT_ID = "Rewarded_iOS";

let initialized = false;
let initFailed = false;
let interstitialReady = false;
let interstitialLoading = false;
let rewardedReady = false;
let rewardedLoading = false;
let lastRewardedError = "";
let rewardedLoadPromise: Promise<void> | null = null;
let interstitialLoadPromise: Promise<void> | null = null;

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function envFlagEnabled(value: unknown): boolean {
  return typeof value === "string" && /^(1|true|yes|on)$/i.test(value.trim());
}

function firstConfiguredEnvValue(...values: unknown[]): string {
  for (const value of values) {
    const configured = configuredEnvValue(value);
    if (configured) return configured;
  }
  return "";
}

function getUnityGameId(): string {
  return firstConfiguredEnvValue(
    import.meta.env.VITE_UNITY_ADS_IOS_GAME_ID,
    import.meta.env.VITE_UNITY_ADS_GAME_ID,
    import.meta.env.VITE_UNITYADS_IOS_GAME_ID,
    import.meta.env.VITE_UNITYADS_GAME_ID,
    import.meta.env.VITE_UNITY_IOS_GAME_ID,
    import.meta.env.VITE_UNITY_GAME_ID,
  );
}

function getInterstitialPlacementId(): string {
  return (
    firstConfiguredEnvValue(
      import.meta.env.VITE_UNITY_ADS_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_INTERSTITIAL_PLACEMENT_ID,
      import.meta.env.VITE_UNITY_ADS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_ADS_INTERSTITIAL_PLACEMENT_ID,
      import.meta.env.VITE_UNITYADS_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITYADS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_IOS_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_INTERSTITIAL_ID,
      import.meta.env.VITE_UNITY_INTERSTITIAL_PLACEMENT_ID,
    ) || DEFAULT_IOS_INTERSTITIAL_PLACEMENT_ID
  );
}

function getRewardedPlacementId(): string {
  return (
    firstConfiguredEnvValue(
      import.meta.env.VITE_UNITY_ADS_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITY_ADS_IOS_REWARDED_PLACEMENT_ID,
      import.meta.env.VITE_UNITY_ADS_REWARDED_ID,
      import.meta.env.VITE_UNITY_ADS_REWARDED_PLACEMENT_ID,
      import.meta.env.VITE_UNITYADS_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITYADS_REWARDED_ID,
      import.meta.env.VITE_UNITY_IOS_REWARDED_ID,
      import.meta.env.VITE_UNITY_REWARDED_ID,
      import.meta.env.VITE_UNITY_REWARDED_PLACEMENT_ID,
    ) || DEFAULT_IOS_REWARDED_PLACEMENT_ID
  );
}

function shouldUseUnityTestMode(): boolean {
  return envFlagEnabled(
    firstConfiguredEnvValue(
      import.meta.env.VITE_UNITY_ADS_TEST_MODE,
      import.meta.env.VITE_UNITYADS_TEST_MODE,
      import.meta.env.VITE_UNITY_TEST_MODE,
      import.meta.env.VITE_UNITY_ADS_IOS_TEST_MODE,
    ),
  );
}

function describeAdError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const details = error as { code?: unknown; message?: unknown };
  const code =
    typeof details.code === "number" || typeof details.code === "string"
      ? String(details.code)
      : "";
  const message = typeof details.message === "string" ? details.message : "";
  return [code, message].filter(Boolean).join(": ");
}

function isUnityAdsAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || initFailed || !isUnityAdsAvailable()) return;

  const gameId = getUnityGameId();
  if (!gameId) {
    initFailed = true;
    return;
  }

  try {
    await UnityAdsNative.initialize({
      gameId,
      testMode: shouldUseUnityTestMode(),
    });
    initialized = true;
    await Promise.all([preloadInterstitial(), preloadRewarded()]);
  } catch {
    initFailed = true;
    initialized = false;
  }
}

export async function preloadInterstitial(): Promise<void> {
  if (interstitialReady || !isUnityAdsAvailable()) return;
  if (interstitialLoading && interstitialLoadPromise) {
    await interstitialLoadPromise;
    return;
  }

  interstitialLoading = true;
  interstitialLoadPromise = (async () => {
    try {
      await UnityAdsNative.loadInterstitial({ placementId: getInterstitialPlacementId() });
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
  if (rewardedReady || !isUnityAdsAvailable()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }

  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      await UnityAdsNative.loadRewarded({ placementId: getRewardedPlacementId() });
      rewardedReady = true;
    } catch (error) {
      rewardedReady = false;
      lastRewardedError = describeAdError(error) || "Rewarded ad failed to load.";
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

  if (!interstitialReady) {
    await preloadInterstitial();
    if (!interstitialReady) return false;
  }

  interstitialReady = false;
  try {
    await UnityAdsNative.showInterstitial({ placementId: getInterstitialPlacementId() });
    await preloadInterstitial();
    return true;
  } catch {
    await preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(_hasProPack: boolean): Promise<RewardedAdResult> {
  if (!isUnityAdsAvailable()) {
    return { rewarded: false, reason: "Rewarded ads are available in the iPhone app." };
  }

  if (!initialized) await initAds(false);
  if (initFailed) {
    return { rewarded: false, reason: "Unity Ads could not initialize in this build." };
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
    const result = await UnityAdsNative.showRewarded({ placementId: getRewardedPlacementId() });
    await preloadRewarded();
    return result.completed
      ? { rewarded: true }
      : { rewarded: false, reason: "Rewarded ad was not completed." };
  } catch (error) {
    const reason = describeAdError(error) || "Rewarded ad could not be shown.";
    lastRewardedError = reason;
    await preloadRewarded();
    return { rewarded: false, reason };
  }
}
