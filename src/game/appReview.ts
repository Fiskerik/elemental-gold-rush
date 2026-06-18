import { Capacitor, registerPlugin } from "@capacitor/core";

interface AppReviewPlugin {
  requestReview(): Promise<{ requested: boolean }>;
  openAppStoreReview(): Promise<{ opened: boolean }>;
}

const AppReviewNative = registerPlugin<AppReviewPlugin>("AppReviewPlugin");
export const APP_STORE_REVIEW_URL = "https://apps.apple.com/app/id6771701538?action=write-review";

export async function openAppStoreReview(): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    try {
      const result = await AppReviewNative.openAppStoreReview();
      if (result.opened) return true;
    } catch {
      // Fall through to the web URL fallback below.
    }
  }

  if (typeof window === "undefined") return false;
  try {
    window.open(APP_STORE_REVIEW_URL, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    return false;
  }
}

export async function requestAppReview(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
  try {
    const result = await AppReviewNative.requestReview();
    return result.requested;
  } catch {
    return false;
  }
}
