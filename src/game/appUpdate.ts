import { compareVersions, shouldOfferAppUpdate } from "@/game/appUpdateVersion";

export const CURRENT_APP_VERSION = String(import.meta.env.VITE_APP_VERSION || "").trim();
export const APP_STORE_URL = "itms-apps://itunes.apple.com/app/id6771701538";

const APP_STORE_LOOKUP_URL =
  "https://itunes.apple.com/lookup?bundleId=com.eaconsulting.atomicfusion&country=us";
const DISMISSED_APP_UPDATE_VERSION_KEY = "atomic-fusion-dismissed-app-update-version";
let dismissedAppUpdateVersionForSession: string | null = null;

export type AppUpdate = {
  currentVersion: string;
  storeVersion: string;
  storeUrl: string;
};

type AppStoreLookupResponse = {
  resultCount?: number;
  results?: Array<{
    version?: string;
    trackViewUrl?: string;
  }>;
};

export async function checkForAppUpdate(): Promise<AppUpdate | null> {
  // An unavailable build version must never prevent the player from entering the game.
  if (typeof window === "undefined" || !CURRENT_APP_VERSION) return null;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(APP_STORE_LOOKUP_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as AppStoreLookupResponse;
    const result = payload.results?.[0];
    if (!result) return null;
    const storeVersion = result?.version?.trim();
    if (
      !storeVersion ||
      !shouldOfferAppUpdate(storeVersion, CURRENT_APP_VERSION, readDismissedAppUpdateVersion())
    ) {
      return null;
    }

    return {
      currentVersion: CURRENT_APP_VERSION,
      storeVersion,
      storeUrl: result.trackViewUrl
        ? result.trackViewUrl.replace(/^https?:\/\//, "itms-apps://")
        : APP_STORE_URL,
    };
  } catch {
    // An unavailable lookup must not lock a player out of the game.
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function dismissAppUpdate(storeVersion: string): void {
  dismissedAppUpdateVersionForSession = storeVersion;
  try {
    window.localStorage.setItem(DISMISSED_APP_UPDATE_VERSION_KEY, storeVersion);
  } catch {
    // Storage may be unavailable; the notice is still dismissible for this session.
  }
}

function readDismissedAppUpdateVersion(): string | null {
  if (dismissedAppUpdateVersionForSession) return dismissedAppUpdateVersionForSession;
  try {
    dismissedAppUpdateVersionForSession = window.localStorage.getItem(
      DISMISSED_APP_UPDATE_VERSION_KEY,
    );
    return dismissedAppUpdateVersionForSession;
  } catch {
    return null;
  }
}

export { compareVersions, shouldOfferAppUpdate } from "@/game/appUpdateVersion";
