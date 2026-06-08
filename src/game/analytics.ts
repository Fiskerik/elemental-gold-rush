import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Capacitor } from '@capacitor/core';

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

// Safe internal tracking function that bridges Web/Dev environments with Native Firebase
async function track(event: string, payload: AnalyticsPayload = {}): Promise<void> {
  // 1. Log to console during development testing
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, payload);
  }

  // 2. Send to native Firebase SDK only if running as a compiled app (iOS/Android)
  if (Capacitor.isNativePlatform()) {
    try {
      // Firebase analytics demands explicit filtering of null/undefined attributes
      const cleanParams: Record<string, string | number | boolean> = {};
      
      for (const [key, value] of Object.entries(payload)) {
        if (value !== null && value !== undefined) {
          cleanParams[key] = value;
        }
      }

      await FirebaseAnalytics.logEvent({
        name: event,
        params: cleanParams,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[analytics] Failed to log event to Firebase:', error);
      }
    }
  }
}

export function trackGameStart(levelId: number, mode = "campaign"): void {
  track("game_start", { levelId, mode });
}

export function trackShot(levelId: number, atom: number, aimDeg: number, mode = "campaign"): void {
  track("shot", { levelId, atom, aimDeg: Math.round(aimDeg), mode });
}

export function trackMerge(
  levelId: number,
  resultAtomicNumber: number,
  chainDepth: number,
  mode = "campaign",
): void {
  track("merge", { levelId, resultAtomicNumber, chainDepth, mode });
}

export function trackLevelWin(
  levelId: number,
  score: number,
  shots: number,
  highestElement: number,
  mode = "campaign",
): void {
  track("level_win", { levelId, score, shots, highestElement, mode });
}

export function trackGameOver(
  levelId: number,
  score: number,
  shots: number,
  highestElement: number,
  mode = "campaign",
): void {
  track("game_over", { levelId, score, shots, highestElement, mode });
}

export function trackPurchaseStarted(productId: string): void {
  track("purchase_started", { productId });
}

export function trackPurchaseCompleted(productId: string): void {
  track("purchase_completed", { productId });
}

export function trackMenuAction(action: string): void {
  track("menu_action", { action });
}