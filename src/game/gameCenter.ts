import { Capacitor, registerPlugin } from "@capacitor/core";

export type GameCenterLeaderboardScope = "global" | "local";

export interface GameCenterPlayer {
  authenticated: boolean;
  alias?: string;
  displayName?: string;
  gamePlayerId?: string;
  teamPlayerId?: string;
}

export interface GameCenterLeaderboardEntry {
  rank: number;
  score: number;
  formattedScore?: string;
  context?: number;
  playerName?: string;
  alias?: string;
  gamePlayerId?: string;
  teamPlayerId?: string;
}

export interface GameCenterLeaderboardResult {
  leaderboardId: string;
  totalPlayerCount: number;
  localPlayer?: GameCenterLeaderboardEntry | null;
  entries: GameCenterLeaderboardEntry[];
}

interface GameCenterPlugin {
  authenticate(): Promise<GameCenterPlayer>;
  submitScore(options: {
    leaderboardId?: string;
    leaderboardIds?: string[];
    score: number;
    context?: number;
  }): Promise<{ submitted: boolean; leaderboardIds?: string[] }>;
  loadLeaderboard(options: {
    leaderboardId: string;
    start?: number;
    length?: number;
    playerScope?: "global" | "friends";
    timeScope?: "allTime" | "today" | "week";
  }): Promise<GameCenterLeaderboardResult>;
}

const GameCenterNative = registerPlugin<GameCenterPlugin>("GameCenterPlugin");

export const DAILY_COMPOUND_LEADERBOARD_IDS: Record<GameCenterLeaderboardScope, string> = {
  global: "daily_leaderboard_global",
  local: "daily_leaderboard_local",
};

export function isGameCenterAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function authenticateGameCenter(): Promise<GameCenterPlayer> {
  if (!isGameCenterAvailable()) {
    return { authenticated: false };
  }
  return GameCenterNative.authenticate();
}

export async function submitDailyCompoundGameCenterScore(
  score: number,
  shots: number,
): Promise<boolean> {
  if (!isGameCenterAvailable()) return false;
  const normalizedScore = Math.max(0, Math.floor(score));
  if (normalizedScore <= 0) return false;
  const normalizedShots = Math.max(0, Math.floor(shots));
  await authenticateGameCenter();
  await GameCenterNative.submitScore({
    leaderboardIds: [DAILY_COMPOUND_LEADERBOARD_IDS.global, DAILY_COMPOUND_LEADERBOARD_IDS.local],
    score: normalizedScore,
    context: normalizedShots,
  });
  return true;
}

export async function loadDailyCompoundGameCenterLeaderboard(
  scope: GameCenterLeaderboardScope,
): Promise<GameCenterLeaderboardResult> {
  await authenticateGameCenter();
  return GameCenterNative.loadLeaderboard({
    leaderboardId: DAILY_COMPOUND_LEADERBOARD_IDS[scope],
    start: 1,
    length: 25,
    playerScope: "global",
    timeScope: "allTime",
  });
}
