import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from "@capacitor-community/admob";

export type RewardedAdResult = {
  rewarded: boolean;
  reason?: string;
};

const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/4411468910";
const TEST_REWARDED_ID = "ca-app-pub-3940256099942544/1712485313";

let initialized = false;
let initFailed = false;
let ready = false;
let loading = false;
let rewardedReady = false;
let rewardedLoading = false;
let rewardedEarned = false;
let lastRewardedError = "";
let rewardedLoadPromise: Promise<void> | null = null;

function configuredEnvValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : "";
}

function getInterstitialId(): string {
  return configuredEnvValue(import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL_ID) || TEST_INTERSTITIAL_ID;
}

function getRewardedId(): string {
  return configuredEnvValue(import.meta.env.VITE_ADMOB_IOS_REWARDED_ID) || TEST_REWARDED_ID;
}

function describeAdError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";

  const details = error as { code?: unknown; message?: unknown };
  const code = typeof details.code === "number" || typeof details.code === "string" ? String(details.code) : "";
  const message = typeof details.message === "string" ? details.message : "";
  return [code, message].filter(Boolean).join(": ");
}

async function addAdListener(
  eventName: string,
  listener: (payload?: unknown) => void,
): Promise<PluginListenerHandle | null> {
  const addListener = AdMob.addListener as unknown as (
    eventName: string,
    listenerFunc: (payload?: unknown) => void,
  ) => Promise<PluginListenerHandle>;
  return addListener(eventName, listener);
}

function removeAdListener(handle: PluginListenerHandle | null): void {
  if (!handle?.remove) return;
  void handle.remove().catch(() => {});
}

function isRewardedResponse(reward: AdMobRewardItem | undefined): boolean {
  if (!reward) return false;
  if (typeof reward.amount === "number") return reward.amount > 0;
  if (typeof reward.amount === "string") return Number(reward.amount) > 0;
  return Boolean(reward.type);
}

async function waitForRewardedCompletion(): Promise<RewardedAdResult> {
  const handles: PluginListenerHandle[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let dismissed = false;
  let settled = false;

  return new Promise<RewardedAdResult>((resolve) => {
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      handles.forEach(removeAdListener);
    };

    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    void (async () => {
      const rewardedHandle = await addAdListener(RewardAdPluginEvents.Rewarded, () => {
        rewardedEarned = true;
        finish({ rewarded: true });
      });
      if (rewardedHandle) handles.push(rewardedHandle);

      const failedHandle = await addAdListener(RewardAdPluginEvents.FailedToShow, (error) => {
        const reason = describeAdError(error) || "Rewarded ad could not be shown.";
        lastRewardedError = reason;
        finish({ rewarded: false, reason });
      });
      if (failedHandle) handles.push(failedHandle);

      const dismissedHandle = await addAdListener(RewardAdPluginEvents.Dismissed, () => {
        dismissed = true;
        setTimeout(() => {
          if (!rewardedEarned) {
            finish({ rewarded: false, reason: "The ad closed before a reward was granted." });
          }
        }, 500);
      });
      if (dismissedHandle) handles.push(dismissedHandle);

      timeoutId = setTimeout(() => {
        finish({
          rewarded: false,
          reason: "Timed out waiting for the rewarded ad to finish. Try again shortly.",
        });
      }, 120_000);

      try {
        const reward = await AdMob.showRewardVideoAd();
        if (rewardedEarned || isRewardedResponse(reward)) {
          finish({ rewarded: true });
          return;
        }
        finish({
          rewarded: false,
          reason: dismissed ? "The ad closed before a reward was granted." : "Rewarded ad finished without a reward callback.",
        });
      } catch (error) {
        const reason = describeAdError(error) || lastRewardedError || "Rewarded ad could not be shown.";
        lastRewardedError = reason;
        finish({ rewarded: false, reason });
      }
    })();
  });
}

export async function initAds(hasProPack: boolean): Promise<void> {
  if (hasProPack || initialized || initFailed || !Capacitor.isNativePlatform()) return;
  try {
    await AdMob.initialize({
      initializeForTesting: !import.meta.env.PROD,
    });
    initialized = true;

    try {
      await AdMob.requestTrackingAuthorization();
    } catch {
      // ATT prompt availability depends on iOS version and prior user choice.
    }

    try {
      await AdMob.requestConsentInfo();
      await AdMob.showConsentForm();
    } catch {
      // Consent forms depend on the AdMob dashboard region/message setup.
    }

    await Promise.all([
      addAdListener(InterstitialAdPluginEvents.Loaded, () => {
        ready = true;
        loading = false;
      }),
      addAdListener(InterstitialAdPluginEvents.FailedToLoad, () => {
        ready = false;
        loading = false;
      }),
      addAdListener(RewardAdPluginEvents.Loaded, () => {
        rewardedReady = true;
        rewardedLoading = false;
        lastRewardedError = "";
      }),
      addAdListener(RewardAdPluginEvents.FailedToLoad, (error) => {
        rewardedReady = false;
        rewardedLoading = false;
        lastRewardedError = describeAdError(error) || "Rewarded ad failed to load.";
      }),
      addAdListener(RewardAdPluginEvents.Rewarded, () => {
        rewardedEarned = true;
      }),
    ]);

    await preloadInterstitial();
    await preloadRewarded();
  } catch {
    initFailed = true;
    initialized = false;
  }
}

export async function preloadInterstitial(): Promise<void> {
  if (loading || ready || !Capacitor.isNativePlatform()) return;
  loading = true;
  try {
    await AdMob.prepareInterstitial({ adId: getInterstitialId() });
    ready = true;
  } catch {
    ready = false;
  } finally {
    loading = false;
  }
}

export async function preloadRewarded(): Promise<void> {
  if (rewardedReady || !Capacitor.isNativePlatform()) return;
  if (rewardedLoading && rewardedLoadPromise) {
    await rewardedLoadPromise;
    return;
  }
  rewardedLoading = true;
  lastRewardedError = "";
  rewardedLoadPromise = (async () => {
    try {
      await AdMob.prepareRewardVideoAd({ adId: getRewardedId() });
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
  if (hasProPack || !Capacitor.isNativePlatform()) return false;
  if (!initialized) await initAds(false);
  if (!ready) {
    await preloadInterstitial();
    if (!ready) return false;
  }
  ready = false;
  try {
    await AdMob.showInterstitial();
    await preloadInterstitial();
    return true;
  } catch {
    await preloadInterstitial();
    return false;
  }
}

export async function showRewardedForCoin(hasProPack: boolean): Promise<RewardedAdResult> {
  if (hasProPack) {
    return { rewarded: false, reason: "Rewarded ads are disabled for the Pro Lab Pack." };
  }
  if (!Capacitor.isNativePlatform()) {
    return { rewarded: false, reason: "Rewarded ads are available in the iPhone app." };
  }

  if (!initialized) await initAds(false);
  if (initFailed) {
    return { rewarded: false, reason: "AdMob could not initialize in this build." };
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

  rewardedEarned = false;
  rewardedReady = false;
  const result = await waitForRewardedCompletion();
  rewardedEarned = false;
  await preloadRewarded();
  return result;
}
