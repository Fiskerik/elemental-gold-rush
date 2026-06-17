import { getTodayQuestDate } from "./quests";
import { DEFAULT_PLAYER_DISPLAY_NAME, useProgress } from "./store";
import {
  type GameCenterLeaderboardKind,
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

const DAILY_LEADERBOARD_STORAGE_KEY = "elemental-gold-rush-daily-runs-v2";
const LEGACY_DAILY_COMPOUND_LEADERBOARD_STORAGE_KEY = "elemental-gold-rush-daily-compound-runs";
const DAILY_BOARD_FAST_CLEAR_MS = 90_000;
const DAILY_BOARD_SLOW_CLEAR_MS = 8 * 60_000;
const DAILY_BOARD_IDEAL_SHOTS = 10;
const DAILY_BOARD_SOFT_SHOT_LIMIT = 38;

const SEEDED_NAMES = [
  ["SE", "Astrid"],
  ["US", "Nova"],
  ["DE", "Klara"],
  ["GB", "Morgan"],
  ["JP", "Hana"],
  ["FR", "Luc"],
  ["BR", "Lia"],
  ["CA", "Rowan"],
  ["AU", "Mika"],
  ["IN", "Asha"],
  ["NO", "Sven"],
  ["ES", "Iris"],
  ["IT", "Enzo"],
  ["NL", "Mila"],
  ["DK", "Freja"],
] as const;

function normalizeCountryCode(value: string | undefined): string {
  const upper = (value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : "US";
}

export function inferPlayerCountryCode(): string {
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
      window.localStorage.getItem(LEGACY_DAILY_COMPOUND_LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<DailyCompoundRunRecord>[];
    return parsed
      .map((record) => ({
        id: String(record.id ?? ""),
        kind: record.kind === "daily-board" ? "daily-board" : "daily-compound",
        date: String(record.date ?? ""),
        weekKey: String(record.weekKey ?? ""),
        score: Math.max(0, Math.floor(record.score ?? 0)),
        shots: Math.max(0, Math.floor(record.shots ?? 0)),
        countryCode: normalizeCountryCode(record.countryCode),
        name: String(record.name ?? "You"),
        recordedAt: Math.max(0, Math.floor(record.recordedAt ?? 0)),
      }))
      .filter((record) => record.id && record.date && record.weekKey);
  } catch {
    return [];
  }
}

function writeRecords(records: DailyCompoundRunRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DAILY_LEADERBOARD_STORAGE_KEY,
    JSON.stringify(records.slice(-60)),
  );
}

function getPlayerDisplayName(): string {
  return useProgress.getState().playerDisplayName || DEFAULT_PLAYER_DISPLAY_NAME;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function calculateDailyBoardLeaderboardScore(input: DailyBoardScoreInput): number {
  const baseScore = Math.max(0, Math.floor(input.baseScore));
  const shots = Math.max(1, Math.floor(input.shots));
  const elapsedMs = Math.max(0, Math.floor(input.elapsedMs));
  const powerUpsUsed = Math.max(0, Math.floor(input.powerUpsUsed));
  const bestCombo = Math.max(0, Math.floor(input.bestCombo));
  const mergeCount = Math.max(0, Math.floor(input.mergeCount));
  const comboScore = Math.max(0, Math.floor(input.comboScore));

  const timeRatio = clamp01(
    1 - (elapsedMs - DAILY_BOARD_FAST_CLEAR_MS) / (DAILY_BOARD_SLOW_CLEAR_MS - DAILY_BOARD_FAST_CLEAR_MS),
  );
  const shotRatio = clamp01(
    1 - (shots - DAILY_BOARD_IDEAL_SHOTS) / (DAILY_BOARD_SOFT_SHOT_LIMIT - DAILY_BOARD_IDEAL_SHOTS),
  );
  const timeBonus = Math.round(12000 * timeRatio);
  const shotBonus = Math.round(9000 * shotRatio);
  const comboBonus = Math.round(
    Math.min(14000, bestCombo * bestCombo * 450 + mergeCount * 120 + comboScore * 0.18),
  );
  const powerUpPenalty = Math.min(2500, powerUpsUsed * 350);

  return Math.max(1, baseScore + timeBonus + shotBonus + comboBonus - powerUpPenalty);
}

function recordDailyLeaderboardRun(kind: LeaderboardKind, score: number, shots: number): void {
  const normalizedScore = Math.max(0, Math.floor(score));
  if (normalizedScore <= 0) return;
  const today = getTodayQuestDate();
  const now = Date.now();
  const countryCode = inferPlayerCountryCode();
  const records = readRecords();
  records.push({
    id: `${kind}-${today}-${now}`,
    kind,
    date: today,
    weekKey: getWeekKey(new Date(`${today}T12:00:00`)),
    score: normalizedScore,
    shots: Math.max(1, Math.floor(shots)),
    countryCode,
    name: getPlayerDisplayName(),
    recordedAt: now,
  });
  writeRecords(records);
}

export function submitDailyBoardLeaderboardScore(input: DailyBoardScoreInput): number {
  const leaderboardScore = calculateDailyBoardLeaderboardScore(input);
  recordDailyLeaderboardRun("daily-board", leaderboardScore, input.shots);
  if (isGameCenterAvailable()) {
    void submitDailyGameCenterScore("daily-board", leaderboardScore, input.shots).catch((error) => {
      console.warn("Game Center daily board score submit failed", error);
    });
  }
  return leaderboardScore;
}

export function submitDailyCompoundLeaderboardScore(score: number, shots: number): void {
  recordDailyLeaderboardRun("daily-compound", score, shots);
  if (!isGameCenterAvailable()) return;
  void submitDailyGameCenterScore("daily-compound", score, shots).catch((error) => {
    console.warn("Game Center score submit failed", error);
  });
}

function seededNumber(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededEntries(
  kind: LeaderboardKind,
  scope: LeaderboardScope,
  countryCode: string,
): LeaderboardEntry[] {
  const today = getTodayQuestDate();
  const rows = Array.from({ length: scope === "local" ? 10 : 18 }, (_, index) => {
    const [seedCountry, name] = SEEDED_NAMES[index % SEEDED_NAMES.length];
    const rowCountry = scope === "local" ? countryCode : seedCountry;
    const variance = seededNumber(`daily-${kind}-${scope}-${today}-${index}-${rowCountry}`);
    const score =
      kind === "daily-board"
        ? Math.max(1200, 62000 - index * 2450 + (variance % 1800))
        : Math.max(250, 26000 - index * 1150 + (variance % 900));
    const shots =
      kind === "daily-board" ? 12 + ((variance + index) % 17) : 1 + (variance % 6);
    return {
      id: `seed-daily-${kind}-${scope}-${index}`,
      rank: 0,
      countryCode: rowCountry,
      flag: countryFlag(rowCountry),
      name,
      score,
      shots,
    };
  });
  return rows;
}

function playerEntry(kind: LeaderboardKind): LeaderboardEntry {
  const today = getTodayQuestDate();
  const records = readRecords();
  const countryCode = inferPlayerCountryCode();
  const todaysBest = records
    .filter((record) => record.date === today && record.kind === kind)
    .sort((a, b) => b.score - a.score || a.shots - b.shots)[0];
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
  const entries = [...seededEntries(kind, scope, countryCode), player]
    .filter((entry) => scope === "global" || entry.countryCode === countryCode)
    .sort((a, b) => b.score - a.score || a.shots - b.shots || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return {
    entries: entries.slice(0, 20),
    player: entries.find((entry) => entry.isPlayer) ?? { ...player, rank: 0 },
    countryCode,
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
  return {
    id: `${scope}-${id}-${entry.rank}`,
    rank: entry.rank,
    countryCode,
    flag: scope === "local" ? countryFlag(countryCode) : "🌐",
    name: isPlayer ? getPlayerDisplayName() : entry.playerName || entry.alias || "Player",
    score: Math.max(0, Math.floor(entry.score ?? 0)),
    shots: Math.max(0, Math.floor(entry.context ?? 0)),
    isPlayer,
  };
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
  if (!isGameCenterAvailable()) {
    return getDailyLeaderboard(kind, scope);
  }

  try {
    const result = await loadDailyGameCenterLeaderboard(kind, scope);
    const entries = result.entries.map((entry) =>
      mapGameCenterEntry(entry, scope, countryCode, result.localPlayer),
    );
    const localPlayer = result.localPlayer
      ? mapGameCenterEntry(result.localPlayer, scope, countryCode, result.localPlayer)
      : undefined;
    return {
      entries,
      player: localPlayer ??
        entries.find((entry) => entry.isPlayer) ?? {
          ...playerEntry(kind),
          rank: 0,
        },
      countryCode,
      source: "game-center",
    };
  } catch (error) {
    console.warn("Game Center leaderboard fetch failed", error);
    return {
      ...getDailyLeaderboard(kind, scope),
      status: "Game Center unavailable - showing device scores",
    };
  }
}
