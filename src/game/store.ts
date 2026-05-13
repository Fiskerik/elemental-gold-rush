import { create } from "zustand";
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

interface ProgressState {
  unlockedLevel: number; // highest level unlocked (1-based)
  highestElement: number; // highest atomic number ever reached
  totalScore: number;
  discoveredElements: number[]; // atomic numbers seen
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  dailyQuestDate: string;
  dailyQuests: DailyQuest[];
  dailyStreak: number;
  claimedDailyReward: boolean;
  bestCombo: number;
  earnedBadges: string[];
  levelStars: Record<number, number>;
  hasProPack: boolean;
  unlockLevel: (id: number) => void;
  recordDiscovery: (atomicNumbers: number[]) => void;
  addScore: (n: number) => void;
  setHighestElement: (n: number) => void;
  refreshDailyLab: () => void;
  reportQuestProgress: (event: QuestProgressEvent) => void;
  claimDailyReward: () => void;
  setBestCombo: (combo: number) => void;
  setLevelStars: (levelId: number, stars: number) => void;
  grantProPack: () => void;
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
      soundEnabled: true,
      hapticsEnabled: true,
      dailyQuestDate: initialQuestDate,
      dailyQuests: initialDailyQuests,
      dailyStreak: 0,
      claimedDailyReward: false,
      bestCombo: 0,
      earnedBadges: [],
      levelStars: {},
      hasProPack: false,
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
      addScore: (n) => set((s) => ({ totalScore: s.totalScore + n })),
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
          const reward = 250 + s.dailyStreak * 50;
          return {
            ...refreshed,
            claimedDailyReward: true,
            dailyStreak: s.dailyStreak + 1,
            totalScore: s.totalScore + reward,
          };
        }),
      setBestCombo: (combo) => set((s) => ({ bestCombo: Math.max(s.bestCombo, combo) })),
      setLevelStars: (levelId, stars) =>
        set((s) => ({
          levelStars: {
            ...s.levelStars,
            [levelId]: Math.max(s.levelStars[levelId] ?? 0, stars),
          },
        })),
      grantProPack: () => set({ hasProPack: true }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      reset: () =>
        set({
          unlockedLevel: 1,
          highestElement: 1,
          totalScore: 0,
          discoveredElements: [1],
          dailyQuestDate: getTodayQuestDate(),
          dailyQuests: createDailyQuests(),
          dailyStreak: 0,
          claimedDailyReward: false,
          bestCombo: 0,
          earnedBadges: [],
          levelStars: {},
          hasProPack: false,
        }),
    }),
    {
      name: "elemental-gold-rush",
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ProgressState> | undefined;
        const discoveredElements = persistedState?.discoveredElements ?? current.discoveredElements;
        return {
          ...current,
          ...persistedState,
          dailyQuestDate: persistedState?.dailyQuestDate ?? current.dailyQuestDate,
          dailyQuests: persistedState?.dailyQuests ?? current.dailyQuests,
          dailyStreak: persistedState?.dailyStreak ?? current.dailyStreak,
          claimedDailyReward: persistedState?.claimedDailyReward ?? current.claimedDailyReward,
          bestCombo: persistedState?.bestCombo ?? current.bestCombo,
          earnedBadges: getEarnedBadgeIds(discoveredElements),
          levelStars: persistedState?.levelStars ?? current.levelStars,
          hasProPack: persistedState?.hasProPack ?? current.hasProPack,
        } as ProgressState;
      },
    },
  ),
);
