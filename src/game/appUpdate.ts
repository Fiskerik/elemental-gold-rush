export const CURRENT_APP_VERSION = "1.1.2";
export const APP_STORE_URL = "itms-apps://itunes.apple.com/app/id6771701538";

const APP_STORE_LOOKUP_URL =
  "https://itunes.apple.com/lookup?bundleId=com.eaconsulting.atomicfusion&country=us";

export type RequiredAppUpdate = {
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

export async function checkForRequiredAppUpdate(): Promise<RequiredAppUpdate | null> {
  if (typeof window === "undefined") return null;

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
    if (!storeVersion || compareVersions(storeVersion, CURRENT_APP_VERSION) <= 0) return null;

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

export function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left);
  const rightParts = normalizeVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function normalizeVersion(version: string): number[] {
  return version
    .split(/[+-]/, 1)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}
