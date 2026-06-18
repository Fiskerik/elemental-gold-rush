import { Capacitor, registerPlugin } from "@capacitor/core";

interface AppReviewPlugin {
  requestReview(): Promise<{ requested: boolean }>;
}

const AppReviewNative = registerPlugin<AppReviewPlugin>("AppReviewPlugin");

export async function requestAppReview(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return false;
  try {
    const result = await AppReviewNative.requestReview();
    return result.requested;
  } catch {
    return false;
  }
}
