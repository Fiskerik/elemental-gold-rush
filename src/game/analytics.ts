export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

function track(event: string, payload: AnalyticsPayload = {}): void {
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, payload);
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
