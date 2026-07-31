import { create } from "zustand";
import { GameModeId } from "./challenges";
import { persist } from "zustand/middleware";
import { getEarnedBadgeIds } from "./badges";
import {
  emptyDailyBoardLeaderboardAchievementCounts,
  getDailyBoardLeaderboardAchievementIds,
  normalizeDailyBoardLeaderboardAchievementCounts,
  type DailyBoardLeaderboardAchievementCounts,
} from "./leaderboardAchievements";
import { DEFAULT_LANGUAGE, normalizeLanguage, type AppLanguage } from "./localization";
import { getNextLevel, MAX_LEVEL } from "./levels";
import {
  DailyQuest,
  QuestProgressEvent,
  applyQuestProgress,
  areDailyQuestsComplete,
  createDailyQuests,
  getTodayQuestDate,
  refreshDailyQuests,
} from "./quests";
import { WeeklyPlayBonusState, claimWeeklyPlayBonus, createWeeklyPlayBonus } from "./weeklyBonus";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";
import {
  DAILY_FEATURE_REWARD_COINS,
  type DailyChallengeState,
  type SecretCompoundState,
  createDailyChallenge,
  createSecretCompound,
  refreshDailyChallengeState,
  refreshSecretCompoundState,
} from "./dailyFeatures";
import { COMPOUNDS } from "./compounds";
import { ELEMENTS } from "./elements";
import {
  COSMETIC_THEME_PURCHASES_ENABLED,
  PRODUCT_IDS,
  THEME_BUNDLE_PRODUCT_IDS,
  type ProductId,
} from "./products";

export const INVENTORY_POWER_UPS = [
  "transmute",
  "fusion-jump",
  "catalyst",
  "emission",
  "gravity",
  "grab",
  "gamma",
  "molecule",
] as const;

export type InventoryPowerUpId = (typeof INVENTORY_POWER_UPS)[number];

export type PowerUpInventory = Record<InventoryPowerUpId, number>;
export const LAB_UPGRADE_IDS = [
  "molecule",
  "shimmer",
  "unstable",
  "grab",
  "egun",
  "gravity",
  "stone",
  "transmute",
  "fusion-jump",
  "catalyst",
  "emission",
  "gamma",
  "blank",
  "queue-shuffle",
] as const;

export type LabUpgradeId = (typeof LAB_UPGRADE_IDS)[number];
export type LabUpgradeLevels = Record<LabUpgradeId, number>;
export type LabUpgradeEnabled = Record<LabUpgradeId, boolean>;

export const LAB_UPGRADE_COSTS = [10, 25, 50, 100, 200] as const;

export function getLabUpgradeLevelCap(unlockedLevel: number): number {
  if (unlockedLevel >= 50) return 5;
  if (unlockedLevel >= 35) return 4;
  if (unlockedLevel >= 20) return 3;
  if (unlockedLevel >= 10) return 2;
  if (unlockedLevel >= 5) return 1;
  return 0;
}

function grantUnlockedProStarterUpgrades(
  levels: LabUpgradeLevels,
  unlockedLevel: number,
): { levels: LabUpgradeLevels; changed: boolean } {
  const next = { ...levels };
  let changed = false;
  for (const id of LAB_UPGRADE_IDS) {
    if (unlockedLevel < POWER_UP_UNLOCK_LEVELS[id]) continue;
    const nextLevel = Math.max(next[id] ?? 0, 1);
    changed ||= nextLevel !== next[id];
    next[id] = nextLevel;
  }
  return { levels: next, changed };
}
export const emptyLabUpgradeLevels = (): LabUpgradeLevels =>
  Object.fromEntries(LAB_UPGRADE_IDS.map((id) => [id, 0])) as LabUpgradeLevels;

export const emptyLabUpgradeEnabled = (): LabUpgradeEnabled =>
  Object.fromEntries(LAB_UPGRADE_IDS.map((id) => [id, true])) as LabUpgradeEnabled;

function normalizeLabUpgradeLevels(
  levels: Partial<Record<LabUpgradeId, number>> | undefined,
): LabUpgradeLevels {
  const next = emptyLabUpgradeLevels();
  for (const id of LAB_UPGRADE_IDS) {
    next[id] = Math.max(0, Math.min(5, Math.floor(levels?.[id] ?? 0)));
  }
  return next;
}

function normalizeLabUpgradeEnabled(
  enabled: Partial<Record<LabUpgradeId, boolean>> | undefined,
): LabUpgradeEnabled {
  const next = emptyLabUpgradeEnabled();
  for (const id of LAB_UPGRADE_IDS) next[id] = enabled?.[id] ?? true;
  return next;
}

export type AppTheme = "dark" | "light";
export const BOARD_THEMES = [
  "reactor",
  "cryo",
  "forge",
  "goldLab",
  "neonPeriodic",
  "quantumVoid",
  "biohazard",
] as const;
export type BoardTheme = (typeof BOARD_THEMES)[number];

export function isBoardTheme(value: unknown): value is BoardTheme {
  return typeof value === "string" && (BOARD_THEMES as readonly string[]).includes(value);
}

export const ATOM_SKINS = ["classic", "chrome", "hologram", "crystal", "mineral", "toxic"] as const;
export type AtomSkin = (typeof ATOM_SKINS)[number];

export function isAtomSkin(value: unknown): value is AtomSkin {
  return typeof value === "string" && (ATOM_SKINS as readonly string[]).includes(value);
}

export const THEME_PRODUCT_BY_BOARD_THEME: Partial<Record<BoardTheme, ProductId>> = {
  goldLab: PRODUCT_IDS.themeGoldLab,
  neonPeriodic: PRODUCT_IDS.themeNeonPeriodic,
  quantumVoid: PRODUCT_IDS.themeQuantumVoid,
  biohazard: PRODUCT_IDS.themeBiohazard,
};

export const ATOM_SKIN_BY_BOARD_THEME: Partial<Record<BoardTheme, AtomSkin>> = {
  goldLab: "chrome",
  neonPeriodic: "hologram",
  quantumVoid: "crystal",
  biohazard: "toxic",
};

// A theme may unlock more than its automatically selected skin. Crystal Cove
// includes both the glassy Crystal Core and the faceted Mineral construction.
export const BOARD_THEME_BY_ATOM_SKIN: Partial<Record<AtomSkin, BoardTheme>> = {
  chrome: "goldLab",
  hologram: "neonPeriodic",
  crystal: "quantumVoid",
  mineral: "quantumVoid",
  toxic: "biohazard",
};

export function isBoardThemeUnlocked(
  theme: BoardTheme,
  state: { hasProPack: boolean; ownedThemeProducts: ProductId[] },
): boolean {
  if (!COSMETIC_THEME_PURCHASES_ENABLED) return true;
  if (theme === "reactor") return true;
  if (theme === "cryo" || theme === "forge") return state.hasProPack;
  const productId = THEME_PRODUCT_BY_BOARD_THEME[theme];
  return productId ? state.ownedThemeProducts.includes(productId) : false;
}

export function isAtomSkinUnlocked(
  skin: AtomSkin,
  state: { hasProPack: boolean; ownedThemeProducts: ProductId[] },
): boolean {
  if (skin === "classic") return true;
  const theme = BOARD_THEME_BY_ATOM_SKIN[skin];
  return theme ? isBoardThemeUnlocked(theme, state) : false;
}

export const DEFAULT_PLAYER_DISPLAY_NAME = "You";

export function normalizePlayerDisplayName(value: string | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} _.-]/gu, "")
    .trim()
    .slice(0, 18);
}

export const emptyPowerUpInventory = (): PowerUpInventory => ({
  transmute: 0,
  "fusion-jump": 0,
  catalyst: 0,
  emission: 0,
  gravity: 0,
  grab: 0,
  gamma: 0,
  molecule: 0,
});

function normalizePowerUpInventory(
  inventory: Partial<Record<InventoryPowerUpId, number>> | undefined,
): PowerUpInventory {
  const empty = emptyPowerUpInventory();
  for (const id of INVENTORY_POWER_UPS) {
    empty[id] = Math.max(0, Math.floor(inventory?.[id] ?? 0));
  }
  return empty;
}

function mergePowerUpInventory(
  current: PowerUpInventory,
  delta: Partial<Record<InventoryPowerUpId, number>>,
): PowerUpInventory {
  const next = { ...current };
  for (const id of INVENTORY_POWER_UPS) {
    next[id] = Math.max(0, Math.floor(next[id] + (delta[id] ?? 0)));
  }
  return next;
}

export interface LevelStats {
  attempts: number;
  fails: number;
  maxScore: number;
  bestShots: number | null;
  powerUpsUsed: number;
  totalScore: number;
  stars: number;
}

export interface CoinTransaction {
  id: string;
  at: string;
  amount: number;
  balanceAfter: number;
  reason: string;
}

export const emptyLevelStats = (): LevelStats => ({
  attempts: 0,
  fails: 0,
  maxScore: 0,
  bestShots: null,
  powerUpsUsed: 0,
  totalScore: 0,
  stars: 0,
});

const MAX_COIN_TRANSACTIONS = 80;
const MAX_LEADERBOARD_ACHIEVEMENT_RECORDS = 160;

function appendCoinTransaction(
  transactions: CoinTransaction[] | undefined,
  amount: number,
  balanceAfter: number,
  reason: string,
): CoinTransaction[] {
  const normalizedAmount = Math.floor(amount);
  if (normalizedAmount === 0) return transactions ?? [];
  return [
    ...(transactions ?? []),
    {
      id: `${Date.now()}-${Math.abs(normalizedAmount)}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      amount: normalizedAmount,
      balanceAfter,
      reason,
    },
  ].slice(-MAX_COIN_TRANSACTIONS);
}

function normalizeCoinTransactions(
  transactions: Partial<CoinTransaction>[] | undefined,
): CoinTransaction[] {
  if (!transactions) return [];
  return transactions
    .map((transaction) => ({
      id: String(transaction.id ?? ""),
      at: String(transaction.at ?? ""),
      amount: Math.floor(transaction.amount ?? 0),
      balanceAfter: Math.max(0, Math.floor(transaction.balanceAfter ?? 0)),
      reason: String(transaction.reason ?? "Gold coins"),
    }))
    .filter((transaction) => transaction.id && transaction.at && transaction.amount !== 0)
    .slice(-MAX_COIN_TRANSACTIONS);
}

function normalizeLevelStatsRecord(
  stats: Record<number, Partial<LevelStats>> | undefined,
): Record<number, LevelStats> {
  const next: Record<number, LevelStats> = {};
  if (!stats) return next;
  for (const [levelId, value] of Object.entries(stats)) {
    const base = emptyLevelStats();
    next[Number(levelId)] = {
      ...base,
      ...value,
      attempts: Math.max(0, Math.floor(value?.attempts ?? base.attempts)),
      fails: Math.max(0, Math.floor(value?.fails ?? base.fails)),
      maxScore: Math.max(0, Math.floor(value?.maxScore ?? base.maxScore)),
      bestShots: value?.bestShots == null ? null : Math.max(0, Math.floor(value.bestShots)),
      powerUpsUsed: Math.max(0, Math.floor(value?.powerUpsUsed ?? base.powerUpsUsed)),
      totalScore: Math.max(0, Math.floor(value?.totalScore ?? base.totalScore)),
      stars: Math.max(0, Math.min(3, Math.floor(value?.stars ?? base.stars))),
    };
  }
  return next;
}

function inferUnlockedLevelFromStats(
  currentUnlockedLevel: number,
  levelStats: Record<number, LevelStats>,
): number {
  return Object.entries(levelStats).reduce(
    (unlockedLevel, [levelId, stats]) => {
      if ((stats.bestShots ?? null) == null && stats.stars <= 0) return unlockedLevel;
      const id = Number(levelId);
      return Math.max(unlockedLevel, getNextLevel(id)?.id ?? id);
    },
    Math.max(1, Math.min(MAX_LEVEL, Math.floor(currentUnlockedLevel))),
  );
}

interface ProgressState {
  playerDisplayName: string;
  unlockedLevel: number; // highest level unlocked (1-based)
  highestElement: number; // highest atomic number ever reached
  totalScore: number;
  highestSingleShotScore: number;
  highestSingleShotScoreDate: string | null;
  goldCoins: number;
  coinTransactions: CoinTransaction[];
  discoveredElements: number[]; // atomic numbers seen
  discoveredCompounds: string[];
  compoundCounts: Record<string, number>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  soundVolume: number; // 0-100
  musicVolume: number; // 0-100
  appTheme: AppTheme;
  boardTheme: BoardTheme;
  atomSkin: AtomSkin;
  ownedThemeProducts: ProductId[];
  appLanguage: AppLanguage;
  shootingStyle: "hold" | "press";
  hasChosenShootingStyle: boolean;
  webBoardWide: boolean;
  dailyQuestDate: string;
  dailyQuests: DailyQuest[];
  dailyStreak: number;
  claimedDailyReward: boolean;
  weeklyPlayBonus: WeeklyPlayBonusState;
  bestCombo: number;
  bestComboDate: string | null;
  earnedBadges: string[];
  levelStars: Record<number, number>;
  levelStats: Record<number, LevelStats>;
  challengeBestScores: Partial<Record<GameModeId, number>>;
  challengeBestScoreDates: Partial<Record<GameModeId, string>>;
  hasProPack: boolean;
  proStarterCoinsGranted: boolean;
  clearedStageCount: number;
  completedGameCount: number;
  clearedStagesSinceAd: number;
  appReviewMilestonePromptSeen: boolean;
  appReviewMilestoneRewardClaimed: boolean;
  powerUpInventory: PowerUpInventory;
  seenTips: string[];
  labUpgradeLevels: LabUpgradeLevels;
  labUpgradeEnabled: LabUpgradeEnabled;
  dailyChallenge: DailyChallengeState;
  secretCompound: SecretCompoundState;
  dailyBoardRuns: number;
  dailyBoardBestScore: number;
  dailyCompoundRuns: number;
  dailyCompoundBestScore: number;
  dailyBoardLeaderboardAchievementCounts: DailyBoardLeaderboardAchievementCounts;
  dailyBoardLeaderboardAchievementRecords: string[];
  markTipSeen: (id: string) => void;
  refreshDailyFeatures: () => void;
  completeDailyChallenge: (score: number) => boolean;
  revealSecretCompound: () => void;
  completeSecretCompound: (compoundIds: string[], score?: number) => boolean;
  upgradeLabPowerUp: (id: LabUpgradeId) => boolean;
  toggleLabUpgrade: (id: LabUpgradeId) => void;
  unlockLevel: (id: number) => void;
  setUnlockedLevel: (id: number) => void;
  recordDiscovery: (atomicNumbers: number[]) => void;
  recordCompoundDiscovery: (compoundId: string) => void;
  unlockLockedElementsForCoins: (atomicNumber: number, coinCost: number) => boolean;
  unlockLockedCompoundsForCoins: (compoundId: string, coinCost: number) => boolean;
  addScore: (n: number) => void;
  recordSingleShotScore: (score: number) => void;
  spendScore: (cost: number) => boolean;
  spendGoldCoins: (cost: number, reason?: string) => boolean;
  skipLevelForCoins: (levelId: number, coinCost: number) => boolean;
  buyGoldCoins: (coins: number, pointCost: number) => boolean;
  grantGoldCoins: (coins: number, reason?: string) => void;
  markAppReviewMilestonePromptSeen: () => void;
  claimAppReviewMilestoneReward: () => boolean;
  setHighestElement: (n: number) => void;
  refreshDailyLab: () => void;
  claimWeeklyPlayBonus: () => { coinsAwarded: number; bonusAwarded: number } | null;
  reportQuestProgress: (event: QuestProgressEvent) => void;
  claimDailyReward: () => void;
  setBestCombo: (combo: number) => void;
  setLevelStars: (levelId: number, stars: number) => void;
  incrementLevelAttempt: (levelId: number) => void;
  recordLevelRun: (
    levelId: number,
    run: { score: number; shots: number; powerUpsUsed: number; won: boolean },
  ) => void;
  setChallengeBestScore: (mode: GameModeId, score: number) => void;
  recordDailyBoardLeaderboardPlacement: (
    rank: number,
    totalPlayerCount: number,
    date?: string,
  ) => void;
  grantProPack: () => void;
  toggleProPack: () => void;
  recordGameAttemptForAd: () => void;
  markInterstitialShown: () => void;
  addInventoryPowerUps: (powerUps: Partial<Record<InventoryPowerUpId, number>>) => void;
  consumeInventoryPowerUps: (powerUps: Partial<Record<InventoryPowerUpId, number>>) => boolean;
  purchaseInventoryPowerUp: (powerUp: InventoryPowerUpId, coinCost: number) => boolean;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleHaptics: () => void;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setAppTheme: (theme: AppTheme) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setAtomSkin: (skin: AtomSkin) => void;
  grantThemeProduct: (productId: ProductId) => void;
  setAppLanguage: (language: AppLanguage) => void;
  setPlayerDisplayName: (name: string) => void;
  toggleAppTheme: () => void;
  setShootingStyle: (style: "hold" | "press") => void;
  setWebBoardWide: (wide: boolean) => void;
  reset: () => void;
}

const initialQuestDate = getTodayQuestDate();
const initialDailyQuests = createDailyQuests(initialQuestDate);
const initialWeeklyPlayBonus = createWeeklyPlayBonus();
const initialDailyChallenge = createDailyChallenge(initialQuestDate);
const initialSecretCompound = createSecretCompound(initialQuestDate);

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      playerDisplayName: "",
      unlockedLevel: 1,
      highestElement: 1,
      totalScore: 0,
      highestSingleShotScore: 0,
      highestSingleShotScoreDate: null,
      goldCoins: 0,
      coinTransactions: [],
      discoveredElements: [1],
      discoveredCompounds: [],
      compoundCounts: {},
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      soundVolume: 100,
      musicVolume: 100,
      appTheme: "dark",
      boardTheme: "reactor",
      atomSkin: "classic",
      ownedThemeProducts: [],
      appLanguage: DEFAULT_LANGUAGE,
      shootingStyle: "hold",
      hasChosenShootingStyle: false,
      webBoardWide: false,
      dailyQuestDate: initialQuestDate,
      dailyQuests: initialDailyQuests,
      dailyStreak: 0,
      claimedDailyReward: false,
      weeklyPlayBonus: initialWeeklyPlayBonus,
      bestCombo: 0,
      bestComboDate: null,
      earnedBadges: [],
      levelStars: {},
      levelStats: {},
      challengeBestScores: {},
      challengeBestScoreDates: {},
      hasProPack: false,
      proStarterCoinsGranted: false,
      clearedStageCount: 0,
      completedGameCount: 0,
      clearedStagesSinceAd: 0,
      appReviewMilestonePromptSeen: false,
      appReviewMilestoneRewardClaimed: false,
      powerUpInventory: emptyPowerUpInventory(),
      seenTips: [],
      labUpgradeLevels: emptyLabUpgradeLevels(),
      labUpgradeEnabled: emptyLabUpgradeEnabled(),
      dailyChallenge: initialDailyChallenge,
      secretCompound: initialSecretCompound,
      dailyBoardRuns: 0,
      dailyBoardBestScore: 0,
      dailyCompoundRuns: 0,
      dailyCompoundBestScore: 0,
      dailyBoardLeaderboardAchievementCounts: emptyDailyBoardLeaderboardAchievementCounts(),
      dailyBoardLeaderboardAchievementRecords: [],
      markTipSeen: (id) =>
        set((s) => (s.seenTips.includes(id) ? s : { seenTips: [...s.seenTips, id] })),
      refreshDailyFeatures: () =>
        set((s) => ({
          dailyChallenge: refreshDailyChallengeState(s.dailyChallenge),
          secretCompound: refreshSecretCompoundState(s.secretCompound),
        })),
      completeDailyChallenge: (score) => {
        let awarded = false;
        set((s) => {
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          const dailyChallenge = refreshDailyChallengeState(s.dailyChallenge);
          awarded = !dailyChallenge.rewardClaimed;
          const rewardCoins = s.hasProPack ? 5 : DAILY_FEATURE_REWARD_COINS;
          const coinDelta = awarded ? rewardCoins : 0;
          const balanceAfter = s.goldCoins + coinDelta;
          const nextChallenge = {
            ...dailyChallenge,
            completed: true,
            rewardClaimed: true,
            bestScore: Math.max(dailyChallenge.bestScore, Math.max(0, Math.floor(score))),
          };
          return {
            ...refreshed,
            dailyChallenge: nextChallenge,
            dailyBoardRuns: s.dailyBoardRuns + 1,
            dailyBoardBestScore: Math.max(s.dailyBoardBestScore, nextChallenge.bestScore),
            completedGameCount: s.completedGameCount + 1,
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, {
              levelCleared: true,
              runScore: nextChallenge.bestScore,
            }),
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              coinDelta,
              balanceAfter,
              "Daily Challenge reward",
            ),
          };
        });
        return awarded;
      },
      revealSecretCompound: () =>
        set((s) => {
          const secretCompound = refreshSecretCompoundState(s.secretCompound);
          return { secretCompound: { ...secretCompound, revealed: true } };
        }),
      completeSecretCompound: (compoundIds, score) => {
        let awarded = false;
        set((s) => {
          const secretCompound = refreshSecretCompoundState(s.secretCompound);
          const completed = compoundIds.includes(secretCompound.compoundId);
          if (!completed) return { secretCompound };
          awarded = !secretCompound.rewardClaimed;
          const scoredRun = typeof score === "number";
          const rewardCoins = s.hasProPack ? 5 : DAILY_FEATURE_REWARD_COINS;
          const coinDelta = awarded ? rewardCoins : 0;
          const balanceAfter = s.goldCoins + coinDelta;
          return {
            secretCompound: {
              ...secretCompound,
              revealed: true,
              completed: true,
              rewardClaimed: true,
            },
            dailyCompoundRuns: s.dailyCompoundRuns + (scoredRun ? 1 : 0),
            dailyCompoundBestScore:
              scoredRun && awarded
                ? Math.max(s.dailyCompoundBestScore, Math.max(0, Math.floor(score)))
                : s.dailyCompoundBestScore,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              coinDelta,
              balanceAfter,
              "Daily Compound reward",
            ),
            dailyQuests: applyQuestProgress(s.dailyQuests, {
              runScore: scoredRun ? Math.max(0, Math.floor(score)) : undefined,
              secretCompoundCleared: true,
            }),
          };
        });
        return awarded;
      },
      upgradeLabPowerUp: (id) => {
        let upgraded = false;
        set((s) => {
          if (s.unlockedLevel < POWER_UP_UNLOCK_LEVELS[id]) return s;
          const levels = normalizeLabUpgradeLevels(s.labUpgradeLevels);
          const current = levels[id] ?? 0;
          const cap = getLabUpgradeLevelCap(s.unlockedLevel);
          if (current >= cap || current >= LAB_UPGRADE_COSTS.length) return s;
          const cost = LAB_UPGRADE_COSTS[current];
          if (s.goldCoins < cost) return s;
          upgraded = true;
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          const balanceAfter = s.goldCoins - cost;
          return {
            ...refreshed,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -cost,
              balanceAfter,
              `Lab upgrade: ${id}`,
            ),
            labUpgradeLevels: { ...levels, [id]: current + 1 },
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, { powerUpsUpgraded: 1 }),
          };
        });
        return upgraded;
      },
      toggleLabUpgrade: (id) =>
        set((s) => ({
          labUpgradeEnabled: {
            ...normalizeLabUpgradeEnabled(s.labUpgradeEnabled),
            [id]: !(s.labUpgradeEnabled[id] ?? true),
          },
        })),
      unlockLevel: (id) =>
        set((s) => {
          const unlockedLevel = Math.max(s.unlockedLevel, id);
          if (!s.hasProPack) return { unlockedLevel };
          const { levels: labUpgradeLevels } = grantUnlockedProStarterUpgrades(
            normalizeLabUpgradeLevels(s.labUpgradeLevels),
            unlockedLevel,
          );
          return { unlockedLevel, labUpgradeLevels };
        }),
      setUnlockedLevel: (id) =>
        set((s) => {
          const unlockedLevel = Math.max(1, Math.floor(id));
          if (!s.hasProPack) return { unlockedLevel };
          const { levels: labUpgradeLevels } = grantUnlockedProStarterUpgrades(
            normalizeLabUpgradeLevels(s.labUpgradeLevels),
            unlockedLevel,
          );
          return { unlockedLevel, labUpgradeLevels };
        }),
      recordDiscovery: (nums) =>
        set((s) => {
          const next = new Set(s.discoveredElements);
          nums.forEach((n) => next.add(n));
          const discoveredElements = Array.from(next).sort((a, b) => a - b);
          return {
            discoveredElements,
            earnedBadges: getEarnedBadgeIds(discoveredElements),
          };
        }),
      recordCompoundDiscovery: (compoundId) =>
        set((s) => ({
          discoveredCompounds: s.discoveredCompounds.includes(compoundId)
            ? s.discoveredCompounds
            : [...s.discoveredCompounds, compoundId],
          compoundCounts: {
            ...s.compoundCounts,
            [compoundId]: (s.compoundCounts[compoundId] ?? 0) + 1,
          },
        })),
      unlockLockedElementsForCoins: (atomicNumber, coinCost) => {
        let unlocked = false;
        set((s) => {
          const target = ELEMENTS.find((element) => element.atomicNumber === atomicNumber);
          const normalizedCost = Math.max(0, Math.floor(coinCost));
          if (
            !target ||
            s.discoveredElements.includes(atomicNumber) ||
            s.goldCoins < normalizedCost
          ) {
            return s;
          }
          const current = new Set(s.discoveredElements);
          current.add(atomicNumber);
          const discoveredElements = Array.from(current).sort((a, b) => a - b);
          unlocked = true;
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          const balanceAfter = s.goldCoins - normalizedCost;
          return {
            ...refreshed,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -normalizedCost,
              balanceAfter,
              `Collection element unlock: ${target.symbol}`,
            ),
            discoveredElements,
            earnedBadges: getEarnedBadgeIds(discoveredElements),
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, { itemsPurchased: 1 }),
          };
        });
        return unlocked;
      },
      unlockLockedCompoundsForCoins: (compoundId, coinCost) => {
        let unlocked = false;
        set((s) => {
          const target = COMPOUNDS.find((compound) => compound.id === compoundId);
          const normalizedCost = Math.max(0, Math.floor(coinCost));
          if (
            !target ||
            s.discoveredCompounds.includes(compoundId) ||
            s.goldCoins < normalizedCost
          ) {
            return s;
          }
          const current = new Set(s.discoveredCompounds);
          current.add(compoundId);
          const compoundCounts = { ...s.compoundCounts };
          compoundCounts[compoundId] = Math.max(1, compoundCounts[compoundId] ?? 0);
          unlocked = true;
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          const balanceAfter = s.goldCoins - normalizedCost;
          return {
            ...refreshed,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -normalizedCost,
              balanceAfter,
              `Collection compound unlock: ${target.name}`,
            ),
            discoveredCompounds: Array.from(current),
            compoundCounts,
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, { itemsPurchased: 1 }),
          };
        });
        return unlocked;
      },
      addScore: (n) => set((s) => ({ totalScore: s.totalScore + Math.max(0, Math.floor(n)) })),
      recordSingleShotScore: (score) =>
        set((s) => {
          const normalizedScore = Math.max(0, Math.floor(score));
          if (normalizedScore <= s.highestSingleShotScore) return s;
          return {
            highestSingleShotScore: normalizedScore,
            highestSingleShotScoreDate: new Date().toISOString(),
          };
        }),
      spendScore: (cost) => {
        let spent = false;
        set((s) => {
          const normalizedCost = Math.max(0, Math.floor(cost));
          if (s.totalScore < normalizedCost) return s;
          spent = true;
          return { totalScore: s.totalScore - normalizedCost };
        });
        return spent;
      },
      spendGoldCoins: (cost, reason = "Gold coins spent") => {
        let spent = false;
        set((s) => {
          const normalizedCost = Math.max(0, Math.floor(cost));
          if (normalizedCost <= 0 || s.goldCoins < normalizedCost) return s;
          spent = true;
          const balanceAfter = s.goldCoins - normalizedCost;
          return {
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -normalizedCost,
              balanceAfter,
              reason,
            ),
          };
        });
        return spent;
      },
      skipLevelForCoins: (levelId, coinCost) => {
        let skipped = false;
        set((s) => {
          const normalizedLevel = Math.max(1, Math.floor(levelId));
          const normalizedCost = Math.max(0, Math.floor(coinCost));
          const stats = s.levelStats[normalizedLevel] ?? emptyLevelStats();
          const canSkipCurrentLevel = normalizedLevel === s.unlockedLevel && (stats.fails ?? 0) > 0;
          if (!canSkipCurrentLevel || s.goldCoins < normalizedCost) return s;
          skipped = true;
          const balanceAfter = s.goldCoins - normalizedCost;
          return {
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -normalizedCost,
              balanceAfter,
              `Level ${normalizedLevel} skip`,
            ),
            unlockedLevel: Math.max(s.unlockedLevel, normalizedLevel + 1),
          };
        });
        return skipped;
      },
      buyGoldCoins: (coins, pointCost) => {
        let purchased = false;
        set((s) => {
          const normalizedCoins = Math.max(0, Math.floor(coins));
          const normalizedCost = Math.max(0, Math.floor(pointCost));
          if (normalizedCoins <= 0 || s.totalScore < normalizedCost) return s;
          purchased = true;
          const balanceAfter = s.goldCoins + normalizedCoins;
          return {
            totalScore: s.totalScore - normalizedCost,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              normalizedCoins,
              balanceAfter,
              "Score exchange",
            ),
          };
        });
        return purchased;
      },
      grantGoldCoins: (coins, reason = "Gold coins added") =>
        set((s) => {
          const normalizedCoins = Math.max(0, Math.floor(coins));
          const balanceAfter = s.goldCoins + normalizedCoins;
          return {
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              normalizedCoins,
              balanceAfter,
              reason,
            ),
          };
        }),
      markAppReviewMilestonePromptSeen: () =>
        set((s) => (s.appReviewMilestonePromptSeen ? s : { appReviewMilestonePromptSeen: true })),
      claimAppReviewMilestoneReward: () => {
        let claimed = false;
        set((s) => {
          if (s.appReviewMilestoneRewardClaimed) return s;
          claimed = true;
          const coinDelta = 5;
          const balanceAfter = s.goldCoins + coinDelta;
          return {
            appReviewMilestonePromptSeen: true,
            appReviewMilestoneRewardClaimed: true,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              coinDelta,
              balanceAfter,
              "Game 5 bonus",
            ),
          };
        });
        return claimed;
      },
      setHighestElement: (n) => set((s) => ({ highestElement: Math.max(s.highestElement, n) })),
      refreshDailyLab: () =>
        set((s) => {
          // Refresh the daily quests for today, but do NOT auto-claim the
          // weekly play-bonus coin. The user must explicitly click today's
          // day on the streak grid to claim it.
          return {
            ...refreshDailyQuests(s.dailyQuestDate, s.dailyQuests, s.claimedDailyReward),
          };
        }),
      claimWeeklyPlayBonus: () => {
        let result: { coinsAwarded: number; bonusAwarded: number } | null = null;
        set((s) => {
          const weekly = claimWeeklyPlayBonus(s.weeklyPlayBonus);
          if (weekly.coinsAwarded <= 0) {
            result = null;
            return s;
          }
          result = {
            coinsAwarded: weekly.coinsAwarded,
            bonusAwarded: weekly.bonusAwarded,
          };
          const balanceAfter = s.goldCoins + weekly.coinsAwarded;
          return {
            weeklyPlayBonus: weekly.weeklyPlayBonus,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              weekly.coinsAwarded,
              balanceAfter,
              "Weekly streak reward",
            ),
          };
        });
        return result;
      },
      reportQuestProgress: (event) =>
        set((s) => {
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          return {
            ...refreshed,
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, event),
          };
        }),
      claimDailyReward: () =>
        set((s) => {
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          if (refreshed.claimedDailyReward || !areDailyQuestsComplete(refreshed.dailyQuests))
            return refreshed;
          const bonusCoins = s.hasProPack ? 10 : 3;
          const balanceAfter = s.goldCoins + bonusCoins;
          return {
            ...refreshed,
            claimedDailyReward: true,
            dailyStreak: s.dailyStreak + 1,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              bonusCoins,
              balanceAfter,
              "Daily Lab reward",
            ),
          };
        }),
      setBestCombo: (combo) =>
        set((s) => {
          if (combo <= s.bestCombo) return s;
          return { bestCombo: combo, bestComboDate: new Date().toISOString() };
        }),
      setLevelStars: (levelId, stars) =>
        set((s) => ({
          levelStars: {
            ...s.levelStars,
            [levelId]: Math.max(s.levelStars[levelId] ?? 0, stars),
          },
          levelStats: {
            ...s.levelStats,
            [levelId]: {
              ...(s.levelStats[levelId] ?? emptyLevelStats()),
              stars: Math.max(s.levelStats[levelId]?.stars ?? 0, stars),
            },
          },
        })),
      incrementLevelAttempt: (levelId) =>
        set((s) => {
          const current = s.levelStats[levelId] ?? emptyLevelStats();
          return {
            levelStats: {
              ...s.levelStats,
              [levelId]: { ...current, attempts: current.attempts + 1 },
            },
          };
        }),
      recordLevelRun: (levelId, run) =>
        set((s) => {
          const current = s.levelStats[levelId] ?? emptyLevelStats();
          // Ad cadence is based on attempts (completed runs), not only clears.
          const attemptIncrement = 1;
          return {
            clearedStageCount: s.clearedStageCount + (run.won ? 1 : 0),
            completedGameCount: s.completedGameCount + (run.won ? 1 : 0),
            clearedStagesSinceAd: s.clearedStagesSinceAd + attemptIncrement,
            levelStats: {
              ...s.levelStats,
              [levelId]: {
                ...current,
                fails: current.fails + (run.won ? 0 : 1),
                maxScore: Math.max(current.maxScore, run.score),
                totalScore: current.totalScore + Math.max(0, run.score),
                powerUpsUsed: current.powerUpsUsed + Math.max(0, run.powerUpsUsed),
                bestShots: run.won
                  ? current.bestShots == null
                    ? run.shots
                    : Math.min(current.bestShots, run.shots)
                  : current.bestShots,
              },
            },
          };
        }),
      setChallengeBestScore: (mode, score) =>
        set((s) => {
          const normalizedScore = Math.max(0, Math.floor(score));
          const previousBest = s.challengeBestScores[mode] ?? 0;
          if (normalizedScore <= previousBest) return s;
          return {
            challengeBestScores: {
              ...s.challengeBestScores,
              [mode]: normalizedScore,
            },
            challengeBestScoreDates: {
              ...s.challengeBestScoreDates,
              [mode]: new Date().toISOString(),
            },
          };
        }),
      recordDailyBoardLeaderboardPlacement: (rank, totalPlayerCount, date = getTodayQuestDate()) =>
        set((s) => {
          const achievementIds = getDailyBoardLeaderboardAchievementIds(rank, totalPlayerCount);
          if (achievementIds.length === 0) return s;

          const existingRecords = new Set(s.dailyBoardLeaderboardAchievementRecords);
          const newRecords = achievementIds
            .map((id) => `${date}:${id}`)
            .filter((recordKey) => !existingRecords.has(recordKey));
          if (newRecords.length === 0) return s;

          const counts = { ...s.dailyBoardLeaderboardAchievementCounts };
          for (const recordKey of newRecords) {
            const id = recordKey.split(":")[1] as keyof DailyBoardLeaderboardAchievementCounts;
            counts[id] = (counts[id] ?? 0) + 1;
          }

          return {
            dailyBoardLeaderboardAchievementCounts: counts,
            dailyBoardLeaderboardAchievementRecords: [
              ...s.dailyBoardLeaderboardAchievementRecords,
              ...newRecords,
            ].slice(-MAX_LEADERBOARD_ACHIEVEMENT_RECORDS),
          };
        }),
      grantProPack: () =>
        set((s) => {
          const shouldGrantStarter = !s.proStarterCoinsGranted;
          const normalizedLevels = normalizeLabUpgradeLevels(s.labUpgradeLevels);
          // Refund the coins spent on any power-up already upgraded to Level 1,
          // since the Pro Lab Pack now grants that first level for free.
          const refundCoins = shouldGrantStarter
            ? LAB_UPGRADE_IDS.reduce(
                (sum, id) => sum + ((normalizedLevels[id] ?? 0) >= 1 ? LAB_UPGRADE_COSTS[0] : 0),
                0,
              )
            : 0;
          const { levels: labUpgradeLevels, changed: grantedUpgrade } =
            grantUnlockedProStarterUpgrades(normalizedLevels, s.unlockedLevel);
          if (s.hasProPack && s.proStarterCoinsGranted && !grantedUpgrade) return s;
          const coinDelta = shouldGrantStarter ? 100 + refundCoins : 0;
          const balanceAfter = s.goldCoins + coinDelta;
          return {
            hasProPack: true,
            proStarterCoinsGranted: true,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              coinDelta,
              balanceAfter,
              "Pro Lab Pack coins",
            ),
            labUpgradeLevels,
          };
        }),
      // Temporary local debug switch. It changes only the entitlement flag so
      // Pro Pack performance can be compared without altering purchases.
      toggleProPack: () => set((s) => ({ hasProPack: !s.hasProPack })),
      recordGameAttemptForAd: () =>
        set((s) => ({ clearedStagesSinceAd: s.clearedStagesSinceAd + 1 })),
      markInterstitialShown: () => set({ clearedStagesSinceAd: 0 }),
      addInventoryPowerUps: (powerUps) =>
        set((s) => ({
          powerUpInventory: mergePowerUpInventory(s.powerUpInventory, powerUps),
        })),
      consumeInventoryPowerUps: (powerUps) => {
        let consumed = false;
        set((s) => {
          for (const id of INVENTORY_POWER_UPS) {
            if ((powerUps[id] ?? 0) > s.powerUpInventory[id]) return s;
          }
          consumed = true;
          return {
            powerUpInventory: mergePowerUpInventory(
              s.powerUpInventory,
              Object.fromEntries(
                INVENTORY_POWER_UPS.map((id) => [id, -(powerUps[id] ?? 0)]),
              ) as Partial<Record<InventoryPowerUpId, number>>,
            ),
          };
        });
        return consumed;
      },
      purchaseInventoryPowerUp: (powerUp, coinCost) => {
        let purchased = false;
        set((s) => {
          const normalizedCost = Math.max(0, Math.floor(coinCost));
          if (s.goldCoins < normalizedCost) return s;
          purchased = true;
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          const balanceAfter = s.goldCoins - normalizedCost;
          return {
            ...refreshed,
            goldCoins: balanceAfter,
            coinTransactions: appendCoinTransaction(
              s.coinTransactions,
              -normalizedCost,
              balanceAfter,
              `Power-up: ${powerUp}`,
            ),
            powerUpInventory: mergePowerUpInventory(s.powerUpInventory, { [powerUp]: 1 }),
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, { itemsPurchased: 1 }),
          };
        });
        return purchased;
      },
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleMusic: () => set((s) => ({ musicEnabled: !s.musicEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      setSoundVolume: (volume) =>
        set(() => ({ soundVolume: Math.max(0, Math.min(100, Math.round(volume))) })),
      setMusicVolume: (volume) =>
        set(() => ({ musicVolume: Math.max(0, Math.min(100, Math.round(volume))) })),
      setAppTheme: (theme) => set({ appTheme: theme }),
      setBoardTheme: (theme) =>
        set((s) => {
          const boardTheme =
            isBoardTheme(theme) && isBoardThemeUnlocked(theme, s) ? theme : "reactor";
          const bundledAtomSkin = ATOM_SKIN_BY_BOARD_THEME[boardTheme];
          return {
            boardTheme,
            atomSkin:
              bundledAtomSkin && isAtomSkinUnlocked(bundledAtomSkin, s)
                ? bundledAtomSkin
                : s.atomSkin,
          };
        }),
      setAtomSkin: (skin) =>
        set((s) => ({
          atomSkin: isAtomSkin(skin) && isAtomSkinUnlocked(skin, s) ? skin : "classic",
        })),
      grantThemeProduct: (productId) =>
        set((s) =>
          !(THEME_BUNDLE_PRODUCT_IDS as readonly ProductId[]).includes(productId) ||
          s.ownedThemeProducts.includes(productId)
            ? s
            : { ownedThemeProducts: [...s.ownedThemeProducts, productId] },
        ),
      setAppLanguage: (language) => set({ appLanguage: normalizeLanguage(language) }),
      setPlayerDisplayName: (name) => set({ playerDisplayName: normalizePlayerDisplayName(name) }),
      toggleAppTheme: () => set((s) => ({ appTheme: s.appTheme === "dark" ? "light" : "dark" })),
      setShootingStyle: (style) => set({ shootingStyle: style, hasChosenShootingStyle: true }),
      setWebBoardWide: (wide) => set({ webBoardWide: wide }),
      reset: () =>
        set((s) => ({
          playerDisplayName: "",
          unlockedLevel: 1,
          highestElement: 1,
          totalScore: 0,
          highestSingleShotScore: 0,
          highestSingleShotScoreDate: null,
          goldCoins: s.goldCoins,
          coinTransactions: s.coinTransactions,
          discoveredElements: [1],
          discoveredCompounds: [],
          compoundCounts: {},
          soundEnabled: true,
          musicEnabled: true,
          hapticsEnabled: true,
          soundVolume: 100,
          musicVolume: 100,
          appTheme: "dark",
          boardTheme: "reactor",
          atomSkin: "classic",
          ownedThemeProducts: [],
          appLanguage: DEFAULT_LANGUAGE,
          shootingStyle: "hold",
          hasChosenShootingStyle: false,
          dailyQuestDate: getTodayQuestDate(),
          dailyQuests: createDailyQuests(),
          dailyStreak: 0,
          claimedDailyReward: false,
          weeklyPlayBonus: createWeeklyPlayBonus(),
          bestCombo: 0,
          bestComboDate: null,
          earnedBadges: [],
          levelStars: {},
          levelStats: {},
          challengeBestScores: {},
          challengeBestScoreDates: {},
          hasProPack: false,
          proStarterCoinsGranted: false,
          clearedStageCount: 0,
          completedGameCount: s.completedGameCount,
          clearedStagesSinceAd: 0,
          appReviewMilestonePromptSeen: s.appReviewMilestonePromptSeen,
          appReviewMilestoneRewardClaimed: s.appReviewMilestoneRewardClaimed,
          powerUpInventory: emptyPowerUpInventory(),
          seenTips: [],
          labUpgradeLevels: emptyLabUpgradeLevels(),
          labUpgradeEnabled: emptyLabUpgradeEnabled(),
          dailyChallenge: createDailyChallenge(),
          secretCompound: createSecretCompound(),
          dailyBoardRuns: 0,
          dailyBoardBestScore: 0,
          dailyCompoundRuns: 0,
          dailyCompoundBestScore: 0,
          dailyBoardLeaderboardAchievementCounts: s.dailyBoardLeaderboardAchievementCounts,
          dailyBoardLeaderboardAchievementRecords: s.dailyBoardLeaderboardAchievementRecords,
        })),
    }),
    {
      name: "elemental-gold-rush",
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ProgressState> | undefined;
        const discoveredElements = persistedState?.discoveredElements ?? current.discoveredElements;
        const compoundCounts = {
          ...Object.fromEntries((persistedState?.discoveredCompounds ?? []).map((id) => [id, 1])),
          ...(persistedState?.compoundCounts ?? {}),
        };
        const levelStats = normalizeLevelStatsRecord(persistedState?.levelStats);
        const unlockedLevel = inferUnlockedLevelFromStats(
          persistedState?.unlockedLevel ?? current.unlockedLevel,
          levelStats,
        );
        return {
          ...current,
          ...persistedState,
          unlockedLevel,
          playerDisplayName: "",
          highestSingleShotScore:
            persistedState?.highestSingleShotScore ?? current.highestSingleShotScore,
          highestSingleShotScoreDate:
            persistedState?.highestSingleShotScoreDate ?? current.highestSingleShotScoreDate,
          dailyQuestDate: persistedState?.dailyQuestDate ?? current.dailyQuestDate,
          dailyQuests: persistedState?.dailyQuests ?? current.dailyQuests,
          dailyStreak: persistedState?.dailyStreak ?? current.dailyStreak,
          claimedDailyReward: persistedState?.claimedDailyReward ?? current.claimedDailyReward,
          weeklyPlayBonus: persistedState?.weeklyPlayBonus ?? current.weeklyPlayBonus,
          goldCoins: persistedState?.goldCoins ?? current.goldCoins,
          coinTransactions: normalizeCoinTransactions(persistedState?.coinTransactions),
          soundEnabled: persistedState?.soundEnabled ?? current.soundEnabled,
          musicEnabled: persistedState?.musicEnabled ?? current.musicEnabled,
          hapticsEnabled: persistedState?.hapticsEnabled ?? current.hapticsEnabled,
          soundVolume: persistedState?.soundVolume ?? current.soundVolume,
          musicVolume: persistedState?.musicVolume ?? current.musicVolume,
          appTheme: persistedState?.appTheme === "light" ? "light" : "dark",
          boardTheme: isBoardTheme(persistedState?.boardTheme)
            ? persistedState.boardTheme
            : current.boardTheme,
          ownedThemeProducts: Array.isArray(persistedState?.ownedThemeProducts)
            ? persistedState.ownedThemeProducts.filter(
                (id): id is ProductId =>
                  typeof id === "string" &&
                  (THEME_BUNDLE_PRODUCT_IDS as readonly string[]).includes(id),
              )
            : current.ownedThemeProducts,
          atomSkin: isAtomSkin(persistedState?.atomSkin)
            ? persistedState.atomSkin
            : current.atomSkin,
          appLanguage: normalizeLanguage(persistedState?.appLanguage),
          shootingStyle: persistedState?.shootingStyle ?? current.shootingStyle,
          hasChosenShootingStyle:
            persistedState?.hasChosenShootingStyle ?? current.hasChosenShootingStyle,
          bestCombo: persistedState?.bestCombo ?? current.bestCombo,
          bestComboDate: persistedState?.bestComboDate ?? current.bestComboDate,
          earnedBadges: getEarnedBadgeIds(discoveredElements),
          discoveredCompounds: persistedState?.discoveredCompounds ?? current.discoveredCompounds,
          compoundCounts,
          levelStars: persistedState?.levelStars ?? current.levelStars,
          challengeBestScores: persistedState?.challengeBestScores ?? current.challengeBestScores,
          challengeBestScoreDates:
            persistedState?.challengeBestScoreDates ?? current.challengeBestScoreDates,
          hasProPack: persistedState?.hasProPack ?? current.hasProPack,
          proStarterCoinsGranted:
            persistedState?.proStarterCoinsGranted ?? current.proStarterCoinsGranted,
          clearedStageCount: persistedState?.clearedStageCount ?? current.clearedStageCount,
          completedGameCount: Math.max(
            persistedState?.completedGameCount ??
              persistedState?.clearedStageCount ??
              current.completedGameCount,
            persistedState?.clearedStageCount ?? 0,
          ),
          clearedStagesSinceAd:
            persistedState?.clearedStagesSinceAd ?? current.clearedStagesSinceAd,
          appReviewMilestonePromptSeen:
            persistedState?.appReviewMilestonePromptSeen ?? current.appReviewMilestonePromptSeen,
          appReviewMilestoneRewardClaimed:
            persistedState?.appReviewMilestoneRewardClaimed ??
            current.appReviewMilestoneRewardClaimed,
          powerUpInventory: normalizePowerUpInventory(persistedState?.powerUpInventory),
          levelStats,
          seenTips: persistedState?.seenTips ?? current.seenTips,
          labUpgradeLevels: normalizeLabUpgradeLevels(persistedState?.labUpgradeLevels),
          labUpgradeEnabled: normalizeLabUpgradeEnabled(persistedState?.labUpgradeEnabled),
          dailyChallenge: refreshDailyChallengeState(
            persistedState?.dailyChallenge ?? current.dailyChallenge,
          ),
          secretCompound: refreshSecretCompoundState(
            persistedState?.secretCompound ?? current.secretCompound,
          ),
          dailyBoardRuns: persistedState?.dailyBoardRuns ?? current.dailyBoardRuns,
          dailyBoardBestScore: persistedState?.dailyBoardBestScore ?? current.dailyBoardBestScore,
          dailyCompoundRuns: persistedState?.dailyCompoundRuns ?? current.dailyCompoundRuns,
          dailyCompoundBestScore:
            persistedState?.dailyCompoundBestScore ?? current.dailyCompoundBestScore,
          dailyBoardLeaderboardAchievementCounts: normalizeDailyBoardLeaderboardAchievementCounts(
            persistedState?.dailyBoardLeaderboardAchievementCounts,
          ),
          dailyBoardLeaderboardAchievementRecords: (
            persistedState?.dailyBoardLeaderboardAchievementRecords ?? []
          )
            .map(String)
            .slice(-MAX_LEADERBOARD_ACHIEVEMENT_RECORDS),
        } as ProgressState;
      },
    },
  ),
);
