import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

let initialized = false;
let initFailed = false;
let canRequestAds = false;
let interstitialReady = false;
let interstitialLoading = false;
let rewardedReady = false;
let rewardedLoading = false;
let initFailureReason = "";
let lastRewardedError = "";
let initializationPromise: Promise<void> | null = null;
let rewardedLoadPromise: Promise<void> | null = null;
let interstitialLoadPromise: Promise<void> | null = null;

const consentRetryDelaysMs = [0, 1200, 3000];

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function envFlagEnabled(value: unknown): boolean {
  return ["1", "true", "yes", "on"].includes(configuredEnvValue(value).toLowerCase());
}

function getInterstitialAdUnitId(): string {
  return configuredEnvValue(import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID);
}

function getRewardedAdUnitId(): string {
  return configuredEnvValue(import.meta.env.VITE_ADMOB_IOS_REWARDED_ID);
}

function isTestingEnabled(): boolean {
  return envFlagEnabled(import.meta.env.VITE_ADMOB_TEST_MODE);
}

function isAdMobAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
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

function isConsentRequestFailure(reason: string): boolean {
  return reason.toLowerCase().includes("request consent info failed");
}

async function requestConsentInfoWithRetry() {
  let lastError: unknown;

  for (const delayMs of consentRetryDelaysMs) {
    if (delayMs > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    try {
      return await AdMob.requestConsentInfo();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || !isAdMobAvailable()) return;
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    try {
      initFailureReason = "";
      await AdMob.initialize({ initializeForTesting: isTestingEnabled() });

      let consentInfo = await requestConsentInfoWithRetry();
      if (!consentInfo.canRequestAds && consentInfo.isConsentFormAvailable) {
        consentInfo = await AdMob.showConsentForm();
      }

      if (!consentInfo.canRequestAds) {
        initFailureReason = "Ad consent is required before ads can be requested.";
        initFailed = true;
        return;
      }

      canRequestAds = true;
      initialized = true;
      initFailed = false;
    } catch (error) {
      const reason = describeAdError(error);
      initFailureReason = isConsentRequestFailure(reason)
        ? "Ad consent could not be loaded. Check your connection and try again."
        : reason || "AdMob initialization failed.";
      console.warn(`[ads] ${initFailureReason}`);
      initFailed = true;
      initialized = false;
      canRequestAds = false;
    } finally {
      initializationPromise = null;
    }
  })();

  await initializationPromise;
}

export async function preloadInterstitial(): Promise<void> {
  if (interstitialReady || !initialized || !canRequestAds || !isAdMobAvailable()) return;
  if (interstitialLoading && interstitialLoadPromise) {
    await interstitialLoadPromise;
    return;
  }

  const adId = getInterstitialAdUnitId();
  if (!adId) return;

  interstitialLoading = true;
  interstitialLoadPromise = (async () => {
    try {
      await AdMob.prepareInterstitial({ adId, isTesting: isTestingEnabled() });
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
  if (rewardedReady || !initialized || !canRequestAds || !isAdMobAvailable()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }

  const adId = getRewardedAdUnitId();
  if (!adId) {
    lastRewardedError = "AdMob rewarded ad unit ID is missing from this build.";
    return;
  }

  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      await AdMob.prepareRewardVideoAd({ adId, isTesting: isTestingEnabled() });
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
  if (hasProPack || !isAdMobAvailable()) return false;
  if (!initialized) await initAds(false);
  if (initFailed || !canRequestAds) return false;

  if (!interstitialReady) {
    await preloadInterstitial();
    if (!interstitialReady) return false;
  }

  interstitialReady = false;
  try {
    await AdMob.showInterstitial();
    void preloadInterstitial();
    return true;
  } catch {
    void preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(_hasProPack: boolean): Promise<RewardedAdResult> {
  if (!isAdMobAvailable()) {
    return { rewarded: false, reason: "Rewarded ads are available in the iPhone app." };
  }

  if (!initialized) await initAds(false);
  if (initFailed || !canRequestAds) {
    return {
      rewarded: false,
      reason: initFailureReason || "AdMob could not initialize in this build.",
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
    await AdMob.showRewardVideoAd();
    void preloadRewarded();
    return { rewarded: true };
  } catch (error) {
    const reason = describeAdError(error) || "Rewarded ad could not be shown.";
    lastRewardedError = reason;
    void preloadRewarded();
    return { rewarded: false, reason };
  }
}
