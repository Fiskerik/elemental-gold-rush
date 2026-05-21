type AdMobModule = {
  AdMob: {
    initialize: (options?: unknown) => Promise<void>;
    requestConsentInfo?: () => Promise<unknown>;
    showConsentForm?: () => Promise<unknown>;
    prepareInterstitial: (options: { adId: string }) => Promise<void>;
    showInterstitial: () => Promise<void>;
    addListener?: (eventName: string, listenerFunc: () => void) => { remove?: () => Promise<void> };
  };
  InterstitialAdPluginEvents?: {
    Loaded?: string;
    FailedToLoad?: string;
    Dismissed?: string;
  };
};

const ADMOB_MODULE = "@capacitor-community/admob";
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";

let initialized = false;
let ready = false;
let loading = false;

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

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized) return;
  const admob = await loadAdMob();
  if (!admob) return;
  initialized = true;

  await admob.AdMob.initialize({
    requestTrackingAuthorization: true,
    initializeForTesting: !import.meta.env.PROD,
  });
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

  await preloadInterstitial();
}

export async function preloadInterstitial(): Promise<void> {
  if (loading || ready) return;
  const admob = await loadAdMob();
  if (!admob) return;
  loading = true;
  try {
    await admob.AdMob.prepareInterstitial({ adId: getInterstitialId() });
  } catch {
    ready = false;
    loading = false;
  }
}

export async function showInterstitialIfReady(hasProPack: boolean): Promise<boolean> {
  if (hasProPack) return false;
  const admob = await loadAdMob();
  if (!admob) return false;
  if (!initialized) await initAds(false);
  if (!ready) {
    await preloadInterstitial();
    return false;
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
