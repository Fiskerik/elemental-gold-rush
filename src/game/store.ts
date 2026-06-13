import { create } from "zustand";
import { GameModeId } from "./challenges";
import { persist } from "zustand/middleware";
import { getEarnedBadgeIds } from "./badges";
import { DEFAULT_LANGUAGE, normalizeLanguage, type AppLanguage } from "./localization";
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

function normalizeLabUpgradeLevels(levels: Partial<Record<LabUpgradeId, number>> | undefined): LabUpgradeLevels {
  const next = emptyLabUpgradeLevels();
  for (const id of LAB_UPGRADE_IDS) {
    next[id] = Math.max(0, Math.min(5, Math.floor(levels?.[id] ?? 0)));
  }
  return next;
}

function normalizeLabUpgradeEnabled(enabled: Partial<Record<LabUpgradeId, boolean>> | undefined): LabUpgradeEnabled {
  const next = emptyLabUpgradeEnabled();
  for (const id of LAB_UPGRADE_IDS) next[id] = enabled?.[id] ?? true;
  return next;
}

export type AppTheme = "dark" | "light";

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

export const emptyLevelStats = (): LevelStats => ({
  attempts: 0,
  fails: 0,
  maxScore: 0,
  bestShots: null,
  powerUpsUsed: 0,
  totalScore: 0,
  stars: 0,
});

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

interface ProgressState {
  unlockedLevel: number; // highest level unlocked (1-based)
  highestElement: number; // highest atomic number ever reached
  totalScore: number;
  goldCoins: number;
  discoveredElements: number[]; // atomic numbers seen
  discoveredCompounds: string[];
  compoundCounts: Record<string, number>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  soundVolume: number; // 0-100
  musicVolume: number; // 0-100
  appTheme: AppTheme;
  appLanguage: AppLanguage;
  shootingStyle: "hold" | "press";
  hasChosenShootingStyle: boolean;
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
  hasProPack: boolean;
  proStarterCoinsGranted: boolean;
  clearedStageCount: number;
  clearedStagesSinceAd: number;
  powerUpInventory: PowerUpInventory;
  seenTips: string[];
  labUpgradeLevels: LabUpgradeLevels;
  labUpgradeEnabled: LabUpgradeEnabled;
  dailyChallenge: DailyChallengeState;
  secretCompound: SecretCompoundState;
  markTipSeen: (id: string) => void;
  refreshDailyFeatures: () => void;
  completeDailyChallenge: (score: number) => boolean;
  revealSecretCompound: () => void;
  completeSecretCompound: (compoundIds: string[]) => boolean;
  upgradeLabPowerUp: (id: LabUpgradeId) => boolean;
  toggleLabUpgrade: (id: LabUpgradeId) => void;
  unlockLevel: (id: number) => void;
  setUnlockedLevel: (id: number) => void;
  recordDiscovery: (atomicNumbers: number[]) => void;
  recordCompoundDiscovery: (compoundId: string) => void;
  addScore: (n: number) => void;
  spendScore: (cost: number) => boolean;
  spendGoldCoins: (cost: number) => boolean;
  skipLevelForCoins: (levelId: number, coinCost: number) => boolean;
  buyGoldCoins: (coins: number, pointCost: number) => boolean;
  grantGoldCoins: (coins: number) => void;
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
  grantProPack: () => void;
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
  setAppLanguage: (language: AppLanguage) => void;
  toggleAppTheme: () => void;
  setShootingStyle: (style: "hold" | "press") => void;
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
      unlockedLevel: 1,
      highestElement: 1,
      totalScore: 0,
      goldCoins: 0,
      discoveredElements: [1],
      discoveredCompounds: [],
      compoundCounts: {},
      soundEnabled: true,
      musicEnabled: true,
      hapticsEnabled: true,
      soundVolume: 100,
      musicVolume: 100,
      appTheme: "dark",
      appLanguage: DEFAULT_LANGUAGE,
      shootingStyle: "hold",
      hasChosenShootingStyle: false,
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
      hasProPack: false,
      proStarterCoinsGranted: false,
      clearedStageCount: 0,
      clearedStagesSinceAd: 0,
      powerUpInventory: emptyPowerUpInventory(),
      seenTips: [],
      labUpgradeLevels: emptyLabUpgradeLevels(),
      labUpgradeEnabled: emptyLabUpgradeEnabled(),
      dailyChallenge: initialDailyChallenge,
      secretCompound: initialSecretCompound,
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
          const dailyChallenge = refreshDailyChallengeState(s.dailyChallenge);
          const nextChallenge = {
            ...dailyChallenge,
            completed: true,
            rewardClaimed: true,
            bestScore: Math.max(dailyChallenge.bestScore, Math.max(0, Math.floor(score))),
          };
          awarded = !dailyChallenge.rewardClaimed;
          return {
            dailyChallenge: nextChallenge,
            goldCoins: s.goldCoins + (awarded ? DAILY_FEATURE_REWARD_COINS : 0),
          };
        });
        return awarded;
      },
      revealSecretCompound: () =>
        set((s) => {
          const secretCompound = refreshSecretCompoundState(s.secretCompound);
          return { secretCompound: { ...secretCompound, revealed: true } };
        }),
      completeSecretCompound: (compoundIds) => {
        let awarded = false;
        set((s) => {
          const secretCompound = refreshSecretCompoundState(s.secretCompound);
          const completed = compoundIds.includes(secretCompound.compoundId);
          if (!completed) return { secretCompound };
          awarded = !secretCompound.rewardClaimed;
          return {
            secretCompound: {
              ...secretCompound,
              revealed: true,
              completed: true,
              rewardClaimed: true,
            },
            goldCoins: s.goldCoins + (awarded ? DAILY_FEATURE_REWARD_COINS : 0),
            dailyQuests: applyQuestProgress(s.dailyQuests, { secretCompoundCleared: true }),
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
          return {
            ...refreshed,
            goldCoins: s.goldCoins - cost,
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
      unlockLevel: (id) => set((s) => {
        const unlockedLevel = Math.max(s.unlockedLevel, id);
        if (!s.hasProPack) return { unlockedLevel };
        const { levels: labUpgradeLevels } = grantUnlockedProStarterUpgrades(
          normalizeLabUpgradeLevels(s.labUpgradeLevels),
          unlockedLevel,
        );
        return { unlockedLevel, labUpgradeLevels };
      }),
      setUnlockedLevel: (id) => set((s) => {
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
      addScore: (n) => set((s) => ({ totalScore: s.totalScore + Math.max(0, Math.floor(n)) })),
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
      spendGoldCoins: (cost) => {
        let spent = false;
        set((s) => {
          const normalizedCost = Math.max(0, Math.floor(cost));
          if (normalizedCost <= 0 || s.goldCoins < normalizedCost) return s;
          spent = true;
          return { goldCoins: s.goldCoins - normalizedCost };
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
          return {
            goldCoins: s.goldCoins - normalizedCost,
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
          return {
            totalScore: s.totalScore - normalizedCost,
            goldCoins: s.goldCoins + normalizedCoins,
          };
        });
        return purchased;
      },
      grantGoldCoins: (coins) =>
        set((s) => ({
          goldCoins: s.goldCoins + Math.max(0, Math.floor(coins)),
        })),
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
          return {
            weeklyPlayBonus: weekly.weeklyPlayBonus,
            goldCoins: s.goldCoins + weekly.coinsAwarded,
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
          const bonusCoins = s.hasProPack ? 5 : 3;
          return {
            ...refreshed,
            claimedDailyReward: true,
            dailyStreak: s.dailyStreak + 1,
            goldCoins: s.goldCoins + bonusCoins,
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
        set((s) => ({
          challengeBestScores: {
            ...s.challengeBestScores,
            [mode]: Math.max(s.challengeBestScores[mode] ?? 0, score),
          },
        })),
      grantProPack: () =>
        set((s) => {
          const shouldGrantStarter = !s.proStarterCoinsGranted;
          const { levels: labUpgradeLevels, changed: grantedUpgrade } = grantUnlockedProStarterUpgrades(
            normalizeLabUpgradeLevels(s.labUpgradeLevels),
            s.unlockedLevel,
          );
          if (s.hasProPack && s.proStarterCoinsGranted && !grantedUpgrade) return s;
          return {
            hasProPack: true,
            proStarterCoinsGranted: true,
            goldCoins: s.goldCoins + (shouldGrantStarter ? 100 : 0),
            labUpgradeLevels,
          };
        }),
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
          return {
            ...refreshed,
            goldCoins: s.goldCoins - normalizedCost,
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
      setAppLanguage: (language) => set({ appLanguage: normalizeLanguage(language) }),
      toggleAppTheme: () => set((s) => ({ appTheme: s.appTheme === "dark" ? "light" : "dark" })),
      setShootingStyle: (style) => set({ shootingStyle: style, hasChosenShootingStyle: true }),
      reset: () =>
        set((s) => ({
          unlockedLevel: 1,
          highestElement: 1,
          totalScore: 0,
          goldCoins: s.goldCoins,
          discoveredElements: [1],
          discoveredCompounds: [],
          compoundCounts: {},
          soundEnabled: true,
          musicEnabled: true,
          hapticsEnabled: true,
          soundVolume: 100,
          musicVolume: 100,
          appTheme: "dark",
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
          hasProPack: false,
          proStarterCoinsGranted: false,
          clearedStageCount: 0,
          clearedStagesSinceAd: 0,
          powerUpInventory: emptyPowerUpInventory(),
          seenTips: [],
          labUpgradeLevels: emptyLabUpgradeLevels(),
          labUpgradeEnabled: emptyLabUpgradeEnabled(),
          dailyChallenge: createDailyChallenge(),
          secretCompound: createSecretCompound(),
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
        return {
          ...current,
          ...persistedState,
          dailyQuestDate: persistedState?.dailyQuestDate ?? current.dailyQuestDate,
          dailyQuests: persistedState?.dailyQuests ?? current.dailyQuests,
          dailyStreak: persistedState?.dailyStreak ?? current.dailyStreak,
          claimedDailyReward: persistedState?.claimedDailyReward ?? current.claimedDailyReward,
          weeklyPlayBonus: persistedState?.weeklyPlayBonus ?? current.weeklyPlayBonus,
          goldCoins: persistedState?.goldCoins ?? current.goldCoins,
          soundEnabled: persistedState?.soundEnabled ?? current.soundEnabled,
          musicEnabled: persistedState?.musicEnabled ?? current.musicEnabled,
          hapticsEnabled: persistedState?.hapticsEnabled ?? current.hapticsEnabled,
          soundVolume: persistedState?.soundVolume ?? current.soundVolume,
          musicVolume: persistedState?.musicVolume ?? current.musicVolume,
          appTheme: persistedState?.appTheme === "light" ? "light" : "dark",
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
          hasProPack: persistedState?.hasProPack ?? current.hasProPack,
          proStarterCoinsGranted:
            persistedState?.proStarterCoinsGranted ?? current.proStarterCoinsGranted,
          clearedStageCount: persistedState?.clearedStageCount ?? current.clearedStageCount,
          clearedStagesSinceAd:
            persistedState?.clearedStagesSinceAd ?? current.clearedStagesSinceAd,
          powerUpInventory: normalizePowerUpInventory(persistedState?.powerUpInventory),
          levelStats: normalizeLevelStatsRecord(persistedState?.levelStats),
          seenTips: persistedState?.seenTips ?? current.seenTips,
          labUpgradeLevels: normalizeLabUpgradeLevels(persistedState?.labUpgradeLevels),
          labUpgradeEnabled: normalizeLabUpgradeEnabled(persistedState?.labUpgradeEnabled),
          dailyChallenge: refreshDailyChallengeState(persistedState?.dailyChallenge ?? current.dailyChallenge),
          secretCompound: refreshSecretCompoundState(persistedState?.secretCompound ?? current.secretCompound),
        } as ProgressState;
      },
    },
  ),
);
