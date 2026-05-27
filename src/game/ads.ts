type AdMobModule = {
  AdMob: {
    initialize: (options?: unknown) => Promise<void>;
    requestConsentInfo?: () => Promise<unknown>;
    showConsentForm?: () => Promise<unknown>;
    prepareInterstitial: (options: { adId: string }) => Promise<void>;
    showInterstitial: () => Promise<void>;
    prepareRewardVideoAd?: (options: { adId: string }) => Promise<void>;
    showRewardVideoAd?: () => Promise<void>;
    addListener?: (eventName: string, listenerFunc: () => void) => { remove?: () => Promise<void> };
  };
  InterstitialAdPluginEvents?: {
    Loaded?: string;
    FailedToLoad?: string;
    Dismissed?: string;
  };
  RewardAdPluginEvents?: {
    Loaded?: string;
    FailedToLoad?: string;
    Rewarded?: string;
    Dismissed?: string;
  };
};

const ADMOB_MODULE = "@capacitor-community/admob";
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";
const TEST_REWARDED_ID = "ca-app-pub-3940256099942544/1712485313";

let initialized = false;
let initFailed = false;
let ready = false;
let loading = false;
let rewardedReady = false;
let rewardedLoading = false;
let rewardedEarned = false;

async function loadAdMob(): Promise<AdMobModule | null> {
  try {
    return (await import(/* @vite-ignore */ ADMOB_MODULE)) as AdMobModule;
  } catch {
    return null;
  }
}

function getInterstitialId(): string {
  return import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID || TEST_INTERSTITIAL_ID;
}

function getRewardedId(): string {
  return import.meta.env.VITE_ADMOB_IOS_REWARDED_ID || TEST_REWARDED_ID;
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || initFailed) return;
  const admob = await loadAdMob();
  if (!admob) return;
  try {
    await admob.AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: !import.meta.env.PROD,
    });
    initialized = true;

    try {
      await admob.AdMob.requestConsentInfo?.();
      await admob.AdMob.showConsentForm?.();
    } catch {
      // Consent forms depend on the AdMob dashboard region/message setup.
    }

    admob.AdMob.addListener?.(admob.InterstitialAdPluginEvents?.Loaded ?? "interstitialAdLoaded", () => {
      ready = true;
      loading = false;
    });
    admob.AdMob.addListener?.(
      admob.InterstitialAdPluginEvents?.FailedToLoad ?? "interstitialAdFailedToLoad",
      () => {
        ready = false;
        loading = false;
      },
    );
    admob.AdMob.addListener?.(admob.RewardAdPluginEvents?.Loaded ?? "rewardedVideoAdLoaded", () => {
      rewardedReady = true;
      rewardedLoading = false;
    });
    admob.AdMob.addListener?.(
      admob.RewardAdPluginEvents?.FailedToLoad ?? "rewardedVideoAdFailedToLoad",
      () => {
        rewardedReady = false;
        rewardedLoading = false;
      },
    );
    admob.AdMob.addListener?.(admob.RewardAdPluginEvents?.Rewarded ?? "onRewardedVideoAdReward", () => {
      rewardedEarned = true;
    });

    await preloadInterstitial();
    await preloadRewarded();
  } catch {
    initFailed = true;
    initialized = false;
  }
}

export async function preloadInterstitial(): Promise<void> {
  if (loading || ready) return;
  const admob = await loadAdMob();
  if (!admob) return;
  loading = true;
  try {
    await admob.AdMob.prepareInterstitial({ adId: getInterstitialId() });
    ready = true;
  } catch {
    ready = false;
  } finally {
    loading = false;
  }
}

export async function preloadRewarded(): Promise<void> {
  if (rewardedLoading || rewardedReady) return;
  const admob = await loadAdMob();
  if (!admob?.AdMob.prepareRewardVideoAd) return;
  rewardedLoading = true;
  try {
    await admob.AdMob.prepareRewardVideoAd({ adId: getRewardedId() });
    rewardedReady = true;
  } catch {
    rewardedReady = false;
  } finally {
    rewardedLoading = false;
  }
}

export async function showInterstitialIfReady(hasProPack: boolean): Promise<boolean> {
  if (hasProPack) return false;
  const admob = await loadAdMob();
  if (!admob) return false;
  if (!initialized) await initAds(false);
  if (!ready) {
    await preloadInterstitial();
    if (!ready) return false;
  }
  ready = false;
  try {
    await admob.AdMob.showInterstitial();
    await preloadInterstitial();
    return true;
  } catch {
    await preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(hasProPack: boolean): Promise<boolean> {
  if (hasProPack) return false;
  const admob = await loadAdMob();
  if (!admob?.AdMob.showRewardVideoAd) return false;
  if (!initialized) await initAds(false);
  if (!rewardedReady) {
    await preloadRewarded();
    if (!rewardedReady) return false;
  }
  rewardedEarned = false;
  rewardedReady = false;
  try {
    await admob.AdMob.showRewardVideoAd();
    const granted = rewardedEarned;
    rewardedEarned = false;
    await preloadRewarded();
    return granted;
  } catch {
    await preloadRewarded();
    return false;
  }
}
