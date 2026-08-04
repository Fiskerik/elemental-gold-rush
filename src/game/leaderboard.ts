import { getTodayQuestDate } from "./quests";
import { DEFAULT_PLAYER_DISPLAY_NAME, useProgress } from "./store";
import {
  type GameCenterLeaderboardKind,
  getCachedGameCenterPlayerCountryCode,
  getCachedGameCenterPlayerName,
  getLatestGameCenterDiagnostic,
  hasDailyGameCenterLeaderboardId,
  isGameCenterAvailable,
  loadDailyGameCenterLeaderboard,
  submitDailyGameCenterScore,
  type GameCenterLeaderboardEntry,
} from "./gameCenter";

export type LeaderboardScope = "global" | "local";
export type LeaderboardKind = GameCenterLeaderboardKind;

export interface DailyBoardScoreInput {
  baseScore: number;
  shots: number;
  elapsedMs: number;
  powerUpsUsed: number;
  bestCombo: number;
  mergeCount: number;
  comboScore: number;
}

export interface DailyBoardScoreBreakdown {
  baseScore: number;
  comboBonus: number;
  timeBonus: number;
  shotEfficiency: number;
  shotEfficiencyPenalty: number;
  fastClearBonus: number;
  powerUpPenalty: number;
  finalScore: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  countryCode: string;
  flag: string;
  name: string;
  score: number;
  shots: number;
  isPlayer?: boolean;
}

export interface LeaderboardBoard {
  entries: LeaderboardEntry[];
  player: LeaderboardEntry;
  countryCode: string;
  totalPlayerCount: number;
  source: "game-center" | "local";
  status?: string;
}

interface DailyCompoundRunRecord {
  id: string;
  kind?: LeaderboardKind;
  date: string;
  weekKey: string;
  score: number;
  shots: number;
  countryCode: string;
  name: string;
  recordedAt: number;
}

const DAILY_LEADERBOARD_STORAGE_KEY = "elemental-gold-rush-daily-runs-v3";
const LEGACY_DAILY_LEADERBOARD_STORAGE_KEY = "elemental-gold-rush-daily-runs-v2";
const LEGACY_DAILY_COMPOUND_LEADERBOARD_STORAGE_KEY = "elemental-gold-rush-daily-compound-runs";
const MAX_DAILY_COMPOUND_SECONDS = 24 * 60 * 60;
const DAILY_BOARD_FAST_CLEAR_MS = 90_000;
const DAILY_BOARD_SLOW_CLEAR_MS = 8 * 60_000;
const DAILY_BOARD_FULL_SCORE_SHOTS = 20;
const DAILY_BOARD_FLOOR_SCORE_SHOTS = 120;
const DAILY_BOARD_MIN_SHOT_EFFICIENCY = 0.25;

function normalizeCountryCode(value: string | undefined): string {
  const upper = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "US";
}

function optionalCountryCode(value: string | undefined): string {
  const upper = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "";
}

const TIME_ZONE_COUNTRY_CODES: Record<string, string> = {
  "America/Los_Angeles": "US",
  "America/Denver": "US",
  "America/Chicago": "US",
  "America/New_York": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Sao_Paulo": "BR",
  "Asia/Kolkata": "IN",
  "Asia/Tokyo": "JP",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE",
  "Europe/Copenhagen": "DK",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Stockholm": "SE",
};

export function inferPlayerCountryCode(): string {
  const gameCenterCountry = optionalCountryCode(getCachedGameCenterPlayerCountryCode());
  if (gameCenterCountry) return gameCenterCountry;
  if (typeof Intl !== "undefined") {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeZoneCountry = timeZone ? optionalCountryCode(TIME_ZONE_COUNTRY_CODES[timeZone]) : "";
    if (timeZoneCountry) return timeZoneCountry;
  }
  if (typeof navigator === "undefined") return "US";
  const locale = navigator.languages?.[0] ?? navigator.language ?? "";
  const region = locale.split("-")[1] ?? "";
  return normalizeCountryCode(region);
}

export function countryFlag(countryCode: string): string {
  const normalized = normalizeCountryCode(countryCode);
  return Array.from(normalized)
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}

function startOfIsoWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

export function getWeekKey(date = new Date()): string {
  const monday = startOfIsoWeek(date);
  return monday.toISOString().slice(0, 10);
}

function readRecords(): DailyCompoundRunRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(DAILY_LEADERBOARD_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_DAILY_LEADERBOARD_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_DAILY_COMPOUND_LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<DailyCompoundRunRecord>[];
    return parsed
      .map((record) => ({
        id: String(record.id ?? ""),
        kind: (record.kind === "daily-board" ? "daily-board" : "daily-compound") as LeaderboardKind,
        date: String(record.date ?? ""),
        weekKey: String(record.weekKey ?? ""),
        score: Math.max(0, Math.floor(record.score ?? 0)),
        shots: Math.max(0, Math.floor(record.shots ?? 0)),
        countryCode: normalizeCountryCode(record.countryCode),
        name: String(record.name ?? "You"),
        recordedAt: Math.max(0, Math.floor(record.recordedAt ?? 0)),
      }))
      .filter((record) => {
        if (!record.id || !record.date || !record.weekKey) return false;
        if (record.kind === "daily-compound" && record.score > MAX_DAILY_COMPOUND_SECONDS) {
          return false;
        }
        return true;
      });
  } catch {
    return [];
  }
}

function writeRecords(records: DailyCompoundRunRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DAILY_LEADERBOARD_STORAGE_KEY, JSON.stringify(records.slice(-60)));
}

function getPlayerDisplayName(): string {
  return (
    useProgress.getState().playerDisplayName ||
    getCachedGameCenterPlayerName() ||
    DEFAULT_PLAYER_DISPLAY_NAME
  );
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calculateDailyBoardLeaderboardScore(input: DailyBoardScoreInput): number {
  return calculateDailyBoardScoreBreakdown(input).finalScore;
}

export function calculateDailyBoardScoreBreakdown(
  input: DailyBoardScoreInput,
): DailyBoardScoreBreakdown {
  const baseScore = Math.max(0, Math.floor(input.baseScore));
  const shots = Math.max(1, Math.floor(input.shots));
  const elapsedMs = Math.max(0, Math.floor(input.elapsedMs));
  const powerUpsUsed = Math.max(0, Math.floor(input.powerUpsUsed));
  const bestCombo = Math.max(0, Math.floor(input.bestCombo));
  const mergeCount = Math.max(0, Math.floor(input.mergeCount));
  const comboScore = Math.max(0, Math.floor(input.comboScore));

  const timeRatio = clamp01(
    1 -
      (elapsedMs - DAILY_BOARD_FAST_CLEAR_MS) /
        (DAILY_BOARD_SLOW_CLEAR_MS - DAILY_BOARD_FAST_CLEAR_MS),
  );
  const timeBonus = Math.round(12000 * timeRatio);
  const comboBonus = Math.round(
    Math.min(14000, bestCombo * bestCombo * 450 + mergeCount * 120 + comboScore * 0.18),
  );
  // Daily Board shot efficiency is intentionally incremental: 20 shots or
  // fewer keep full score value, then the multiplier falls linearly to 25%
  // at 120 shots and stays there for longer runs.
  const shotProgress = clamp01(
    (shots - DAILY_BOARD_FULL_SCORE_SHOTS) /
      (DAILY_BOARD_FLOOR_SCORE_SHOTS - DAILY_BOARD_FULL_SCORE_SHOTS),
  );
  const shotEfficiency =
    1 - shotProgress * (1 - DAILY_BOARD_MIN_SHOT_EFFICIENCY);
  const efficiencyAdjustedScore = Math.round((baseScore + comboBonus) * shotEfficiency);
  const shotEfficiencyPenalty = Math.max(
    0,
    baseScore + comboBonus - efficiencyAdjustedScore,
  );
  const fastClearBonus = Math.round(9000 * shotEfficiency);
  const powerUpPenalty = Math.min(2500, powerUpsUsed * 350);

  const finalScore = Math.max(1, efficiencyAdjustedScore + timeBonus + fastClearBonus - powerUpPenalty);
  return {
    baseScore,
    comboBonus,
    timeBonus,
    shotEfficiency,
    shotEfficiencyPenalty,
    fastClearBonus,
    powerUpPenalty,
    finalScore,
  };
}

function recordDailyLeaderboardRun(kind: LeaderboardKind, score: number, shots: number): boolean {
  const normalizedScore = Math.max(0, Math.floor(score));
  if (normalizedScore <= 0) return false;
  const today = getTodayQuestDate();
  const now = Date.now();
  const countryCode = inferPlayerCountryCode();
  let records = readRecords();
  if (kind === "daily-compound") {
    const previousBest = records
      .filter((record) => record.date === today && record.kind === kind)
      .sort((a, b) => a.score - b.score || a.recordedAt - b.recordedAt)[0];
    if (previousBest && normalizedScore >= previousBest.score) return false;
    records = records.filter((record) => !(record.date === today && record.kind === kind));
  }
  records.push({
    id: `${kind}-${today}-${now}`,
    kind,
    date: today,
    weekKey: getWeekKey(new Date(`${today}T12:00:00`)),
    score: normalizedScore,
    shots: kind === "daily-compound" ? 0 : Math.max(1, Math.floor(shots)),
    countryCode,
    name: getPlayerDisplayName(),
    recordedAt: now,
  });
  writeRecords(records);
  return true;
}

export function submitDailyBoardLeaderboardScore(input: DailyBoardScoreInput): number {
  const leaderboardScore = calculateDailyBoardLeaderboardScore(input);
  recordDailyLeaderboardRun("daily-board", leaderboardScore, input.shots);
  const globalBoard = getDailyLeaderboard("daily-board", "global");
  useProgress
    .getState()
    .recordDailyBoardLeaderboardPlacement(globalBoard.player.rank, globalBoard.totalPlayerCount);
  if (isGameCenterAvailable()) {
    void submitDailyGameCenterScore("daily-board", leaderboardScore, input.shots).catch((error) => {
      console.warn("Game Center daily board score submit failed", error);
    });
  }
  return leaderboardScore;
}

export function submitDailyCompoundLeaderboardScore(score: number, shots: number): void {
  const didRecordFirstAttempt = recordDailyLeaderboardRun("daily-compound", score, 0);
  if (!didRecordFirstAttempt) return;
  if (!isGameCenterAvailable()) return;
  void submitDailyGameCenterScore("daily-compound", score, 0).catch((error) => {
    console.warn("Game Center score submit failed", error);
  });
}

function playerEntry(kind: LeaderboardKind): LeaderboardEntry {
  const today = getTodayQuestDate();
  const records = readRecords();
  const countryCode = inferPlayerCountryCode();
  const todaysBest = records
    .filter((record) => record.date === today && record.kind === kind)
    .sort((a, b) =>
      kind === "daily-compound"
        ? a.score - b.score || a.recordedAt - b.recordedAt
        : b.score - a.score || a.shots - b.shots,
    )[0];
  return {
    id: "player",
    rank: 0,
    countryCode,
    flag: countryFlag(countryCode),
    name: todaysBest?.name || getPlayerDisplayName(),
    score: todaysBest?.score ?? 0,
    shots: todaysBest?.shots ?? 0,
    isPlayer: true,
  };
}

export function getDailyCompoundLeaderboard(scope: LeaderboardScope): LeaderboardBoard {
  return getDailyLeaderboard("daily-compound", scope);
}

export function getDailyLeaderboard(
  kind: LeaderboardKind,
  scope: LeaderboardScope,
): LeaderboardBoard {
  const countryCode = inferPlayerCountryCode();
  const player = playerEntry(kind);
  const entries =
    player.score > 0 && (scope === "global" || player.countryCode === countryCode)
      ? [{ ...player, rank: 1 }]
      : [];
  return {
    entries,
    player: entries.find((entry) => entry.isPlayer) ?? { ...player, rank: 0 },
    countryCode,
    totalPlayerCount: entries.length,
    source: "local",
  };
}

function entryId(entry: GameCenterLeaderboardEntry): string {
  return entry.gamePlayerId ?? entry.teamPlayerId ?? entry.alias ?? entry.playerName ?? "unknown";
}

function mapGameCenterEntry(
  entry: GameCenterLeaderboardEntry,
  scope: LeaderboardScope,
  countryCode: string,
  localEntry?: GameCenterLeaderboardEntry | null,
): LeaderboardEntry {
  const localId = localEntry ? entryId(localEntry) : "";
  const id = entryId(entry);
  const isPlayer = Boolean(localId && id === localId);
  const name =
    entry.playerName?.trim() ||
    entry.alias?.trim() ||
    (isPlayer ? getCachedGameCenterPlayerName() || getPlayerDisplayName() : "Player");
  return {
    id: `${scope}-${id}-${entry.rank}`,
    rank: entry.rank,
    countryCode,
    name,
    flag: isPlayer || scope === "local" ? countryFlag(countryCode) : "🌐",
    score: Math.max(0, Math.floor(entry.score ?? 0)),
    shots: Math.max(0, Math.floor(entry.context ?? 0)),
    isPlayer,
  };
}

function gameCenterDiagnosticStatus(kind: LeaderboardKind, fallback: string): string {
  const diagnostic = getLatestGameCenterDiagnostic(kind);
  if (!diagnostic) return fallback;
  if (!diagnostic.ok) {
    return `Game Center ${diagnostic.action} failed for ${diagnostic.leaderboardId ?? "leaderboard"}: ${diagnostic.error ?? "unknown error"}`;
  }
  if (diagnostic.action === "submit") {
    if (diagnostic.verifiedScore && diagnostic.verifiedScore > 0) {
      return `Game Center accepted score ${diagnostic.verifiedScore} on ${diagnostic.leaderboardId ?? "leaderboard"} - waiting for leaderboard rows`;
    }
    if (diagnostic.error) {
      return `Game Center accepted submit, but verification failed: ${diagnostic.error}`;
    }
    return `Game Center accepted submit for ${diagnostic.leaderboardId ?? "leaderboard"}, but no score is visible yet`;
  }
  return fallback;
}

export async function loadDailyCompoundLeaderboard(
  scope: LeaderboardScope,
): Promise<LeaderboardBoard> {
  return loadDailyLeaderboard("daily-compound", scope);
}

export async function loadDailyLeaderboard(
  kind: LeaderboardKind,
  scope: LeaderboardScope,
): Promise<LeaderboardBoard> {
  const countryCode = inferPlayerCountryCode();
  const fallbackBoard = getDailyLeaderboard(kind, scope);
  if (!isGameCenterAvailable() || !hasDailyGameCenterLeaderboardId(kind, scope)) {
    return fallbackBoard;
  }

  try {
    if (fallbackBoard.player.score > 0) {
      await submitDailyGameCenterScore(
        kind,
        fallbackBoard.player.score,
        fallbackBoard.player.shots,
      ).catch((error) => {
        console.warn("Game Center saved score retry failed", error);
      });
    }
    const result = await loadDailyGameCenterLeaderboard(kind, scope);
    const resolvedCountryCode = inferPlayerCountryCode();
    let entries = result.entries.map((entry) =>
      mapGameCenterEntry(entry, scope, resolvedCountryCode, result.localPlayer),
    );
    const gameCenterLocalPlayer = result.localPlayer
      ? mapGameCenterEntry(result.localPlayer, scope, resolvedCountryCode, result.localPlayer)
      : undefined;
    const localPlayer =
      kind === "daily-compound" &&
      fallbackBoard.player.score > 0 &&
      (!gameCenterLocalPlayer || fallbackBoard.player.score < gameCenterLocalPlayer.score)
        ? {
            ...(gameCenterLocalPlayer ?? fallbackBoard.player),
            score: fallbackBoard.player.score,
            isPlayer: true,
          }
        : gameCenterLocalPlayer;
    if (localPlayer && entries.some((entry) => entry.isPlayer)) {
      entries = entries.map((entry) =>
        entry.isPlayer ? { ...entry, score: localPlayer.score } : entry,
      );
    }
    const combinedEntries =
      localPlayer && !entries.some((entry) => entry.isPlayer)
        ? [localPlayer, ...entries].sort((a, b) => a.rank - b.rank)
        : entries;
    const visibleEntries =
      kind === "daily-compound"
        ? [...combinedEntries]
            .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
            .map((entry, index) => ({ ...entry, rank: index + 1 }))
        : combinedEntries;
    const rankedLocalPlayer =
      visibleEntries.find((entry) => entry.isPlayer) ??
      (localPlayer && kind === "daily-compound"
        ? {
            ...localPlayer,
            rank:
              visibleEntries.findIndex((entry) => entry.score >= localPlayer.score) + 1 ||
              visibleEntries.length + 1,
          }
        : localPlayer);
    const hasGameCenterScores =
      visibleEntries.length > 0 || Boolean(localPlayer && localPlayer.score > 0);
    if (!hasGameCenterScores) {
      return {
        ...fallbackBoard,
        status: gameCenterDiagnosticStatus(
          kind,
          "Game Center has no visible scores yet - showing device scores",
        ),
      };
    }
    return {
      entries: visibleEntries,
      player: rankedLocalPlayer ??
        visibleEntries.find((entry) => entry.isPlayer) ?? {
          ...playerEntry(kind),
          rank: 0,
        },
      countryCode: resolvedCountryCode,
      totalPlayerCount: Math.max(result.totalPlayerCount, entries.length),
      source: "game-center",
    };
  } catch (error) {
    console.warn("Game Center leaderboard fetch failed", error);
    return {
      ...fallbackBoard,
      status: gameCenterDiagnosticStatus(kind, "Game Center unavailable - showing device scores"),
    };
  }
}

/**
 * Settles both daily competition prizes using the leaderboard ranks visible
 * at the daily reset cutoff. The wallet claim is idempotent, so this can be
 * called by the app timer and later by a server-backed settlement flow.
 */
export async function settleDailyLeaderboardRewards(date = getTodayQuestDate()): Promise<void> {
  for (const kind of ["daily-board", "daily-compound"] as const) {
    try {
      const board = await loadDailyLeaderboard(kind, "global");
      if (board.player.rank > 0 && board.player.rank <= 3) {
        useProgress.getState().claimDailyLeaderboardReward(kind, board.player.rank, date);
      }
    } catch (error) {
      console.warn(`Daily ${kind} prize settlement failed`, error);
    }
  }
}
