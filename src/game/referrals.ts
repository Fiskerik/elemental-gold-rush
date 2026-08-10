import { Capacitor, registerPlugin } from "@capacitor/core";

const REFERRAL_CODE_STORAGE_KEY = "atomic-fusion-referral-code";
const DEFAULT_REFERRAL_FUNCTIONS_BASE_URL =
  "https://europe-west1-atomicfusionrush.cloudfunctions.net";
const REFERRAL_FUNCTIONS_BASE_URL = String(
  import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL ?? DEFAULT_REFERRAL_FUNCTIONS_BASE_URL,
).replace(/\/$/, "");

interface ReferralSharePlugin {
  share(options: { text: string }): Promise<{ completed: boolean }>;
  promptForCode(options: {
    title: string;
    value: string;
    cancelTitle: string;
    confirmTitle: string;
  }): Promise<{ cancelled: boolean; code?: string }>;
}

const ReferralShareNative = registerPlugin<ReferralSharePlugin>("ReferralSharePlugin");

export const REFERRAL_REWARD_COINS = 20;

export function isReferralAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function readStoredReferralCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY)?.trim().toUpperCase() ?? "";
  } catch {
    return "";
  }
}

function storeReferralCode(code: string): void {
  try {
    window.localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, code);
  } catch {
    // The current session can still use the redeemed code.
  }
}

async function referralRequest<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (!REFERRAL_FUNCTIONS_BASE_URL) return null;
  try {
    const response = await fetch(`${REFERRAL_FUNCTIONS_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.warn("[referral] Backend request failed", error);
    return null;
  }
}

export function makeReferralCode(playerId: string): string {
  let hash = 2166136261;
  for (const character of playerId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `AFR-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
}

export async function registerReferralCode(playerId: string): Promise<string> {
  const code = makeReferralCode(playerId);
  const result = await referralRequest<{ ok?: boolean }>("/createReferralCode", { playerId, code });
  if (!result?.ok) throw new Error("Referral code could not be registered. Please try again.");
  storeReferralCode(code);
  return code;
}

export async function shareReferralText(text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
    const result = await ReferralShareNative.share({ text });
    return result.completed;
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ text });
    return true;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return false;
}

export async function promptForReferralCode(
  value: string,
  labels: { title: string; cancel: string; confirm: string },
): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return null;
  const result = await ReferralShareNative.promptForCode({
    title: labels.title,
    value,
    cancelTitle: labels.cancel,
    confirmTitle: labels.confirm,
  });
  if (result.cancelled) return null;
  return (result.code ?? "").trim().toUpperCase().slice(0, 11);
}

export async function redeemReferralCode(code: string, playerId: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!/^AFR-[A-Z0-9]{7}$/.test(normalized) || !playerId) return false;
  const result = await referralRequest<{ ok?: boolean }>("/redeemReferral", {
    code: normalized,
    playerId,
  });
  if (!result?.ok) return false;
  storeReferralCode(normalized);
  return true;
}

export async function settleCompletedReferral(
  playerId: string,
): Promise<{ referredAwarded: boolean; referrerCoins: number }> {
  if (!playerId) return { referredAwarded: false, referrerCoins: 0 };
  const completed = await referralRequest<{ awarded?: boolean }>("/completeReferral", { playerId });
  const claimed = await referralRequest<{ coins?: number }>("/claimReferralRewards", { playerId });
  return {
    referredAwarded: completed?.awarded === true,
    referrerCoins: Math.max(0, Math.floor(claimed?.coins ?? 0)),
  };
}

export function getStoredReferralCode(): string {
  return readStoredReferralCode();
}
