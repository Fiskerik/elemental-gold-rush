import { Capacitor, registerPlugin } from "@capacitor/core";

export type GameCenterLeaderboardScope = "global" | "local";
export type GameCenterLeaderboardKind = "daily-board" | "daily-compound";

export interface GameCenterPlayer {
  authenticated: boolean;
  alias?: string;
  displayName?: string;
  countryCode?: string;
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

export interface GameCenterSubmitResult {
  submitted: boolean;
  method?: "modern" | "legacy" | string;
  score?: number;
  context?: number;
  leaderboardIds?: string[];
  verificationError?: string | null;
  verifiedLocalPlayer?: GameCenterLeaderboardEntry | null;
  verifiedTotalPlayerCount?: number;
}

export interface GameCenterDiagnosticEvent {
  action: "submit" | "load";
  ok: boolean;
  kind: GameCenterLeaderboardKind;
  leaderboardId?: string;
  leaderboardIds?: string[];
  score?: number;
  context?: number;
  method?: string;
  verifiedScore?: number;
  verifiedRank?: number;
  verifiedTotalPlayerCount?: number;
  error?: string;
  at: number;
}

interface GameCenterPlugin {
  authenticate(): Promise<GameCenterPlayer>;
  submitScore(options: {
    leaderboardId?: string;
    leaderboardIds?: string[];
    score: number;
    context?: number;
  }): Promise<GameCenterSubmitResult>;
  loadLeaderboard(options: {
    leaderboardId: string;
    start?: number;
    length?: number;
    playerScope?: "global" | "friends";
    timeScope?: "allTime" | "today" | "week";
  }): Promise<GameCenterLeaderboardResult>;
  showLeaderboard(options?: { leaderboardId?: string }): Promise<{ shown: boolean }>;
}

const GameCenterNative = registerPlugin<GameCenterPlugin>("GameCenterPlugin");
const GAME_CENTER_DIAGNOSTICS_STORAGE_KEY = "elemental-gold-rush-game-center-diagnostics";
let cachedGameCenterPlayer: GameCenterPlayer | null = null;

export const DAILY_BOARD_LEADERBOARD_IDS: Record<GameCenterLeaderboardScope, string> = {
  global:
    configuredEnvValue(
      import.meta.env.VITE_GAME_CENTER_DAILY_BOARD_GLOBAL_LEADERBOARD_ID,
      import.meta.env.VITE_DAILY_BOARD_GLOBAL_LEADERBOARD_ID,
    ) || "daily_leaderboard_global",
  local: configuredEnvValue(
    import.meta.env.VITE_GAME_CENTER_DAILY_BOARD_LOCAL_LEADERBOARD_ID,
    import.meta.env.VITE_DAILY_BOARD_LOCAL_LEADERBOARD_ID,
  ),
};

export const DAILY_COMPOUND_LEADERBOARD_IDS: Record<GameCenterLeaderboardScope, string> = {
  global:
    configuredEnvValue(
      import.meta.env.VITE_GAME_CENTER_DAILY_COMPOUND_GLOBAL_LEADERBOARD_ID,
      import.meta.env.VITE_DAILY_COMPOUND_GLOBAL_LEADERBOARD_ID,
    ) || "daily_leaderboard_local",
  local: configuredEnvValue(
    import.meta.env.VITE_GAME_CENTER_DAILY_COMPOUND_LOCAL_LEADERBOARD_ID,
    import.meta.env.VITE_DAILY_COMPOUND_LOCAL_LEADERBOARD_ID,
  ),
};

const DAILY_LEADERBOARD_IDS: Record<
  GameCenterLeaderboardKind,
  Record<GameCenterLeaderboardScope, string>
> = {
  "daily-board": DAILY_BOARD_LEADERBOARD_IDS,
  "daily-compound": DAILY_COMPOUND_LEADERBOARD_IDS,
};

export function isGameCenterAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function configuredEnvValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed && trimmed !== "undefined" && trimmed !== "null") return trimmed;
  }
  return "";
}

function uniqueLeaderboardIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
}

function getSubmitLeaderboardIds(kind: GameCenterLeaderboardKind): string[] {
  const ids = DAILY_LEADERBOARD_IDS[kind];
  return uniqueLeaderboardIds([ids.global]);
}

export function hasDailyGameCenterLeaderboardId(
  kind: GameCenterLeaderboardKind,
  scope: GameCenterLeaderboardScope,
): boolean {
  return Boolean(DAILY_LEADERBOARD_IDS[kind][scope]);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function readDiagnosticEvents(): GameCenterDiagnosticEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GAME_CENTER_DIAGNOSTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameCenterDiagnosticEvent[]) : [];
  } catch {
    return [];
  }
}

function appendDiagnosticEvent(event: GameCenterDiagnosticEvent): void {
  if (typeof window === "undefined") return;
  const events = [...readDiagnosticEvents(), event].slice(-12);
  window.localStorage.setItem(GAME_CENTER_DIAGNOSTICS_STORAGE_KEY, JSON.stringify(events));
}

export function getLatestGameCenterDiagnostic(
  kind?: GameCenterLeaderboardKind,
): GameCenterDiagnosticEvent | undefined {
  const events = readDiagnosticEvents();
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (!kind || event.kind === kind) return event;
  }
  return undefined;
}

export async function authenticateGameCenter(): Promise<GameCenterPlayer> {
  if (!isGameCenterAvailable()) {
    return { authenticated: false };
  }
  const player = await GameCenterNative.authenticate();
  cachedGameCenterPlayer = player;
  return player;
}

export function getCachedGameCenterPlayerName(): string {
  const displayName = cachedGameCenterPlayer?.displayName?.trim();
  if (displayName) return displayName;
  return cachedGameCenterPlayer?.alias?.trim() ?? "";
}

export function getCachedGameCenterPlayerCountryCode(): string {
  return cachedGameCenterPlayer?.countryCode?.trim() ?? "";
}

export async function submitDailyCompoundGameCenterScore(
  score: number,
  shots: number,
): Promise<boolean> {
  return submitDailyGameCenterScore("daily-compound", score, shots);
}

export async function submitDailyGameCenterScore(
  kind: GameCenterLeaderboardKind,
  score: number,
  shots: number,
): Promise<boolean> {
  if (!isGameCenterAvailable()) return false;
  const normalizedScore = Math.max(0, Math.floor(score));
  if (normalizedScore <= 0) return false;
  const normalizedShots = Math.max(0, Math.floor(shots));
  await authenticateGameCenter();
  const leaderboardIds = getSubmitLeaderboardIds(kind);
  if (!leaderboardIds.length) return false;
  const results = await Promise.allSettled(
    leaderboardIds.map((leaderboardId) =>
      GameCenterNative.submitScore({
        leaderboardId,
        score: normalizedScore,
        context: normalizedShots,
      }),
    ),
  );
  const submittedIds = leaderboardIds.filter((_, index) => results[index]?.status === "fulfilled");
  const failedIds = leaderboardIds.filter((_, index) => results[index]?.status === "rejected");
  results.forEach((result, index) => {
    const leaderboardId = leaderboardIds[index];
    if (result.status === "fulfilled") {
      appendDiagnosticEvent({
        action: "submit",
        ok: true,
        kind,
        leaderboardId,
        leaderboardIds: result.value.leaderboardIds ?? [leaderboardId],
        score: normalizedScore,
        context: normalizedShots,
        method: result.value.method,
        verifiedScore: result.value.verifiedLocalPlayer?.score,
        verifiedRank: result.value.verifiedLocalPlayer?.rank,
        verifiedTotalPlayerCount: result.value.verifiedTotalPlayerCount,
        error: result.value.verificationError ?? undefined,
        at: Date.now(),
      });
      return;
    }
    appendDiagnosticEvent({
      action: "submit",
      ok: false,
      kind,
      leaderboardId,
      leaderboardIds: [leaderboardId],
      score: normalizedScore,
      context: normalizedShots,
      error: errorMessage(result.reason),
      at: Date.now(),
    });
  });
  if (failedIds.length) {
    console.warn("Game Center daily score submit failed for leaderboard IDs", failedIds, results);
  }
  if (submittedIds.length) {
    console.info("Game Center daily score submitted", { kind, leaderboardIds: submittedIds });
  }
  return submittedIds.length > 0;
}

export async function loadDailyCompoundGameCenterLeaderboard(
  scope: GameCenterLeaderboardScope,
): Promise<GameCenterLeaderboardResult> {
  return loadDailyGameCenterLeaderboard("daily-compound", scope);
}

export async function loadDailyGameCenterLeaderboard(
  kind: GameCenterLeaderboardKind,
  scope: GameCenterLeaderboardScope,
): Promise<GameCenterLeaderboardResult> {
  await authenticateGameCenter();
  const leaderboardId = DAILY_LEADERBOARD_IDS[kind][scope] || DAILY_LEADERBOARD_IDS[kind].global;
  if (!leaderboardId) {
    throw new Error(`Missing Game Center leaderboard ID for ${kind}/${scope}`);
  }
  try {
    const result = await GameCenterNative.loadLeaderboard({
      leaderboardId,
      start: 1,
      length: 25,
      playerScope: "global",
      timeScope: "today",
    });
    appendDiagnosticEvent({
      action: "load",
      ok: true,
      kind,
      leaderboardId,
      verifiedScore: result.localPlayer?.score,
      verifiedRank: result.localPlayer?.rank,
      verifiedTotalPlayerCount: result.totalPlayerCount,
      at: Date.now(),
    });
    return result;
  } catch (error) {
    appendDiagnosticEvent({
      action: "load",
      ok: false,
      kind,
      leaderboardId,
      error: errorMessage(error),
      at: Date.now(),
    });
    throw error;
  }
}

export async function showGameCenterLeaderboards(
  kind?: GameCenterLeaderboardKind,
  scope: GameCenterLeaderboardScope = "global",
): Promise<boolean> {
  if (!isGameCenterAvailable()) return false;
  await authenticateGameCenter();
  const leaderboardId = kind
    ? DAILY_LEADERBOARD_IDS[kind][scope] || DAILY_LEADERBOARD_IDS[kind].global
    : "";
  const result = await GameCenterNative.showLeaderboard({ leaderboardId });
  return Boolean(result.shown);
}
