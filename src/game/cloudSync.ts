import { Capacitor } from "@capacitor/core";
import {
  authenticateGameCenter,
  loadGameCloudSave,
  saveGameCloudSave,
} from "./gameCenter";
import {
  applySerializableProgressSnapshot,
  getSerializableProgressSnapshot,
  type SerializableProgressSnapshot,
  useProgress,
} from "./store";

const CLOUD_SAVE_SCHEMA_VERSION = 1;
const CLOUD_SAVE_DEBOUNCE_MS = 1800;

interface CloudSaveEnvelope {
  schemaVersion: number;
  savedAt: number;
  gameCenterPlayerID: string;
  state: SerializableProgressSnapshot;
}

export interface CloudSyncResult {
  synced: boolean;
  restored: boolean;
  reason?: string;
}

let authenticatedPlayerID: string | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let stopSubscription: (() => void) | null = null;
let stopLifecycleListeners: (() => void) | null = null;
let syncInFlight: Promise<CloudSyncResult> | null = null;

function isNativeIos(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function isDefaultSnapshot(state: SerializableProgressSnapshot): boolean {
  return (
    state.unlockedLevel === 1 &&
    state.highestElement === 1 &&
    state.totalScore === 0 &&
    Array.isArray(state.discoveredElements) &&
    state.discoveredElements.length <= 1 &&
    (!Array.isArray(state.levelStats) || Object.keys(state.levelStats as object).length === 0) &&
    (!Array.isArray(state.earnedBadges) || (state.earnedBadges as unknown[]).length === 0)
  );
}

function parseEnvelope(payload: string | undefined): CloudSaveEnvelope | null {
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<CloudSaveEnvelope>;
    if (
      parsed.schemaVersion !== CLOUD_SAVE_SCHEMA_VERSION ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.gameCenterPlayerID !== "string" ||
      !parsed.state ||
      typeof parsed.state !== "object"
    ) {
      return null;
    }
    return parsed as CloudSaveEnvelope;
  } catch {
    return null;
  }
}

function mergeNumberMaps(
  cloudValue: unknown,
  localValue: unknown,
): Record<string, number> | undefined {
  if (!cloudValue || typeof cloudValue !== "object" || !localValue || typeof localValue !== "object") {
    return undefined;
  }
  const cloud = cloudValue as Record<string, unknown>;
  const local = localValue as Record<string, unknown>;
  const merged: Record<string, number> = {};
  for (const key of new Set([...Object.keys(cloud), ...Object.keys(local)])) {
    const cloudNumber = typeof cloud[key] === "number" ? cloud[key] : 0;
    const localNumber = typeof local[key] === "number" ? local[key] : 0;
    merged[key] = Math.max(cloudNumber, localNumber);
  }
  return merged;
}

function mergeSnapshots(
  cloud: SerializableProgressSnapshot,
  local: SerializableProgressSnapshot,
): SerializableProgressSnapshot {
  const merged: SerializableProgressSnapshot = { ...cloud, ...local };
  const unionKeys = [
    "discoveredElements",
    "discoveredCompounds",
    "viewedElementDiscoveries",
    "viewedCompoundDiscoveries",
    "earnedBadges",
    "ownedThemeProducts",
    "seenTips",
    "dailyBoardLeaderboardAchievementRecords",
  ];
  for (const key of unionKeys) {
    const cloudItems = Array.isArray(cloud[key]) ? cloud[key] : [];
    const localItems = Array.isArray(local[key]) ? local[key] : [];
    merged[key] = Array.from(new Set([...cloudItems, ...localItems]));
  }

  for (const key of [
    "unlockedLevel",
    "highestElement",
    "totalScore",
    "highestSingleShotScore",
    "bestCombo",
    "completedGameCount",
    "clearedStageCount",
    "dailyBoardRuns",
    "dailyBoardBestScore",
    "dailyCompoundRuns",
    "dailyCompoundBestScore",
  ]) {
    const cloudNumber = typeof cloud[key] === "number" ? cloud[key] : 0;
    const localNumber = typeof local[key] === "number" ? local[key] : 0;
    merged[key] = Math.max(cloudNumber, localNumber);
  }

  merged.levelStars = mergeNumberMaps(cloud.levelStars, local.levelStars) ?? local.levelStars;
  merged.challengeBestScores =
    mergeNumberMaps(cloud.challengeBestScores, local.challengeBestScores) ?? local.challengeBestScores;
  merged.compoundCounts =
    mergeNumberMaps(cloud.compoundCounts, local.compoundCounts) ?? local.compoundCounts;
  // Keep the local wallet and transaction ledger authoritative on an existing install.
  merged.goldCoins = local.goldCoins;
  merged.coinTransactions = local.coinTransactions;
  return merged;
}

function makeEnvelope(playerID: string): string {
  const envelope: CloudSaveEnvelope = {
    schemaVersion: CLOUD_SAVE_SCHEMA_VERSION,
    savedAt: Date.now(),
    gameCenterPlayerID: playerID,
    state: getSerializableProgressSnapshot(),
  };
  return JSON.stringify(envelope);
}

export async function flushCloudProgress(): Promise<void> {
  if (!authenticatedPlayerID) return;
  try {
    await saveGameCloudSave(makeEnvelope(authenticatedPlayerID), CLOUD_SAVE_SCHEMA_VERSION);
  } catch (error) {
    console.warn("Cloud save could not be written.", error);
  }
}

function scheduleSave(): void {
  if (!authenticatedPlayerID) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void flushCloudProgress();
  }, CLOUD_SAVE_DEBOUNCE_MS);
}

function ensureSubscription(): void {
  if (stopSubscription) return;
  stopSubscription = useProgress.subscribe(() => scheduleSave());
}

export async function syncCloudProgressNow(): Promise<CloudSyncResult> {
  if (!isNativeIos()) return { synced: false, restored: false, reason: "not-ios" };
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const player = await authenticateGameCenter();
      if (!player.authenticated || !player.gamePlayerId) {
        return { synced: false, restored: false, reason: "game-center-not-signed-in" };
      }
      authenticatedPlayerID = player.gamePlayerId;
      ensureSubscription();

      const localState = getSerializableProgressSnapshot();
      const remote = await loadGameCloudSave();
      const envelope = parseEnvelope(remote.payload);
      let restored = false;

      if (envelope && envelope.gameCenterPlayerID === player.gamePlayerId) {
        const nextState = isDefaultSnapshot(localState)
          ? envelope.state
          : mergeSnapshots(envelope.state, localState);
        restored = applySerializableProgressSnapshot(nextState);
      }

      await flushCloudProgress();
      return { synced: true, restored };
    } catch (error) {
      console.warn("Cloud progress sync failed.", error);
      return { synced: false, restored: false, reason: "cloud-sync-failed" };
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

export function startCloudProgressSync(): () => void {
  if (!isNativeIos()) return () => {};
  ensureSubscription();
  const retryDelays = [1500, 5000, 12000];
  let retryIndex = 0;
  let active = true;
  const syncWithRetry = () => {
    void syncCloudProgressNow().then((result) => {
      if (!active || result.synced || retryIndex >= retryDelays.length) return;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        retryIndex += 1;
        syncWithRetry();
      }, retryDelays[retryIndex]);
    });
  };
  syncWithRetry();

  const flushWhenBackgrounded = () => {
    if (document.visibilityState === "hidden") void flushCloudProgress();
  };
  document.addEventListener("visibilitychange", flushWhenBackgrounded);
  window.addEventListener("pagehide", flushWhenBackgrounded);
  stopLifecycleListeners = () => {
    document.removeEventListener("visibilitychange", flushWhenBackgrounded);
    window.removeEventListener("pagehide", flushWhenBackgrounded);
    stopLifecycleListeners = null;
  };

  return () => {
    active = false;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
    stopLifecycleListeners?.();
    stopSubscription?.();
    stopSubscription = null;
    authenticatedPlayerID = null;
  };
}
