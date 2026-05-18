import { create } from "zustand";
import { GameModeId } from "./challenges";
import { persist } from "zustand/middleware";
import { getEarnedBadgeIds } from "./badges";
import {
  DailyQuest,
  QuestProgressEvent,
  applyQuestProgress,
  areDailyQuestsComplete,
  createDailyQuests,
  getTodayQuestDate,
  refreshDailyQuests,
} from "./quests";

export const INVENTORY_POWER_UPS = [
  "transmute",
  "fusion-jump",
  "catalyst",
  "emission",
  "gravity",
  "grab",
  "gamma",
] as const;

export type InventoryPowerUpId = (typeof INVENTORY_POWER_UPS)[number];

export type PowerUpInventory = Record<InventoryPowerUpId, number>;

export const emptyPowerUpInventory = (): PowerUpInventory => ({
  transmute: 0,
  "fusion-jump": 0,
  catalyst: 0,
  emission: 0,
  gravity: 0,
  grab: 0,
  gamma: 0,
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
  maxScore: number;
  bestShots: number | null;
  powerUpsUsed: number;
  totalScore: number;
  stars: number;
}

export const emptyLevelStats = (): LevelStats => ({
  attempts: 0,
  maxScore: 0,
  bestShots: null,
  powerUpsUsed: 0,
  totalScore: 0,
  stars: 0,
});

interface ProgressState {
  unlockedLevel: number; // highest level unlocked (1-based)
  highestElement: number; // highest atomic number ever reached
  totalScore: number;
  discoveredElements: number[]; // atomic numbers seen
  discoveredCompounds: string[];
  compoundCounts: Record<string, number>;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyQuestDate: string;
  dailyQuests: DailyQuest[];
  dailyStreak: number;
  claimedDailyReward: boolean;
  bestCombo: number;
  bestComboDate: string | null;
  earnedBadges: string[];
  levelStars: Record<number, number>;
  levelStats: Record<number, LevelStats>;
  challengeBestScores: Partial<Record<GameModeId, number>>;
  hasProPack: boolean;
  powerUpInventory: PowerUpInventory;
  seenTips: string[];
  markTipSeen: (id: string) => void;
  unlockLevel: (id: number) => void;
  recordDiscovery: (atomicNumbers: number[]) => void;
  recordCompoundDiscovery: (compoundId: string) => void;
  addScore: (n: number) => void;
  spendScore: (cost: number) => boolean;
  setHighestElement: (n: number) => void;
  refreshDailyLab: () => void;
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
  addInventoryPowerUps: (powerUps: Partial<Record<InventoryPowerUpId, number>>) => void;
  consumeInventoryPowerUps: (powerUps: Partial<Record<InventoryPowerUpId, number>>) => boolean;
  purchaseInventoryPowerUp: (powerUp: InventoryPowerUpId, cost: number) => boolean;
  toggleSound: () => void;
  toggleHaptics: () => void;
  reset: () => void;
}

const initialQuestDate = getTodayQuestDate();
const initialDailyQuests = createDailyQuests(initialQuestDate);

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      unlockedLevel: 1,
      highestElement: 1,
      totalScore: 0,
      discoveredElements: [1],
      discoveredCompounds: [],
      compoundCounts: {},
      soundEnabled: true,
      hapticsEnabled: true,
      dailyQuestDate: initialQuestDate,
      dailyQuests: initialDailyQuests,
      dailyStreak: 0,
      claimedDailyReward: false,
      bestCombo: 0,
      bestComboDate: null,
      earnedBadges: [],
      levelStars: {},
      levelStats: {},
      challengeBestScores: {},
      hasProPack: false,
      powerUpInventory: emptyPowerUpInventory(),
      seenTips: [],
      markTipSeen: (id) =>
        set((s) => (s.seenTips.includes(id) ? s : { seenTips: [...s.seenTips, id] })),
      unlockLevel: (id) => set((s) => ({ unlockedLevel: Math.max(s.unlockedLevel, id) })),
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
      addScore: (n) =>
        set((s) => ({ totalScore: s.totalScore + Math.max(0, Math.floor(n / 10)) })),
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
      setHighestElement: (n) => set((s) => ({ highestElement: Math.max(s.highestElement, n) })),
      refreshDailyLab: () =>
        set((s) => refreshDailyQuests(s.dailyQuestDate, s.dailyQuests, s.claimedDailyReward)),
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
          const reward = 500;
          return {
            ...refreshed,
            claimedDailyReward: true,
            dailyStreak: s.dailyStreak + 1,
            totalScore: s.totalScore + reward,
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
          return {
            levelStats: {
              ...s.levelStats,
              [levelId]: {
                ...current,
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
      grantProPack: () => set({ hasProPack: true }),
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
      purchaseInventoryPowerUp: (powerUp, cost) => {
        let purchased = false;
        set((s) => {
          if (s.totalScore < cost) return s;
          purchased = true;
          const refreshed = refreshDailyQuests(
            s.dailyQuestDate,
            s.dailyQuests,
            s.claimedDailyReward,
          );
          return {
            ...refreshed,
            totalScore: s.totalScore - cost,
            powerUpInventory: mergePowerUpInventory(s.powerUpInventory, { [powerUp]: 1 }),
            dailyQuests: applyQuestProgress(refreshed.dailyQuests, { itemsPurchased: 1 }),
          };
        });
        return purchased;
      },
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      reset: () =>
        set({
          unlockedLevel: 1,
          highestElement: 1,
          totalScore: 0,
          discoveredElements: [1],
          discoveredCompounds: [],
          compoundCounts: {},
          dailyQuestDate: getTodayQuestDate(),
          dailyQuests: createDailyQuests(),
          dailyStreak: 0,
          claimedDailyReward: false,
          bestCombo: 0,
          bestComboDate: null,
          earnedBadges: [],
          levelStars: {},
          levelStats: {},
          challengeBestScores: {},
          hasProPack: false,
          powerUpInventory: emptyPowerUpInventory(),
          seenTips: [],
        }),
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
          bestCombo: persistedState?.bestCombo ?? current.bestCombo,
          bestComboDate: persistedState?.bestComboDate ?? current.bestComboDate,
          earnedBadges: getEarnedBadgeIds(discoveredElements),
          discoveredCompounds: persistedState?.discoveredCompounds ?? current.discoveredCompounds,
          compoundCounts,
          levelStars: persistedState?.levelStars ?? current.levelStars,
          levelStats: persistedState?.levelStats ?? current.levelStats,
          challengeBestScores: persistedState?.challengeBestScores ?? current.challengeBestScores,
          hasProPack: persistedState?.hasProPack ?? current.hasProPack,
          powerUpInventory: normalizePowerUpInventory(persistedState?.powerUpInventory),
          seenTips: persistedState?.seenTips ?? current.seenTips,
        } as ProgressState;
      },
    },
  ),
);
