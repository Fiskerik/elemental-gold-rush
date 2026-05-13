import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProgressState {
  unlockedLevel: number; // highest level unlocked (1-based)
  highestElement: number; // highest atomic number ever reached
  totalScore: number;
  discoveredElements: number[]; // atomic numbers seen
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  unlockLevel: (id: number) => void;
  recordDiscovery: (atomicNumbers: number[]) => void;
  addScore: (n: number) => void;
  setHighestElement: (n: number) => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      unlockedLevel: 1,
      highestElement: 1,
      totalScore: 0,
      discoveredElements: [1],
      soundEnabled: true,
      hapticsEnabled: true,
      unlockLevel: (id) =>
        set((s) => ({ unlockedLevel: Math.max(s.unlockedLevel, id) })),
      recordDiscovery: (nums) =>
        set((s) => {
          const next = new Set(s.discoveredElements);
          nums.forEach((n) => next.add(n));
          return { discoveredElements: Array.from(next).sort((a, b) => a - b) };
        }),
      addScore: (n) => set((s) => ({ totalScore: s.totalScore + n })),
      setHighestElement: (n) =>
        set((s) => ({ highestElement: Math.max(s.highestElement, n) })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptics: () => set((s) => ({ hapticsEnabled: !s.hapticsEnabled })),
      reset: () =>
        set({
          unlockedLevel: 1,
          highestElement: 1,
          totalScore: 0,
          discoveredElements: [1],
        }),
    }),
    { name: "elemental-gold-rush" },
  ),
);