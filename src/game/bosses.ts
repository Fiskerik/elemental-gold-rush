export type BossId = "elemental-boss" | "periodic-guardian";

export interface BossEyeLayout {
  id: string;
  xPct: number;
  yPct: number;
  size: number;
  swayX: number;
  swayY: number;
  swayPhase: number;
}

export interface BossConfig {
  id: BossId;
  levelId: number;
  name: string;
  shortLabel: string;
  maxHealth: number;
  maxShots: number;
  centerChargeGoal: number;
  openDurationMs: number;
  maxEyeElement: number;
  outerEyes: BossEyeLayout[];
  centerEye: {
    xPct: number;
    yPct: number;
    size: number;
  };
}

export const BOSSES: Record<BossId, BossConfig> = {
  "elemental-boss": {
    id: "elemental-boss",
    levelId: 63,
    name: "Elemental Boss",
    shortLabel: "Eye Tyrant",
    maxHealth: 20,
    maxShots: 100,
    centerChargeGoal: 10,
    openDurationMs: 5_000,
    maxEyeElement: 10,
    outerEyes: [
      { id: "north-west", xPct: 23, yPct: 22, size: 58, swayX: 10, swayY: 7, swayPhase: 0.1 },
      { id: "north-east", xPct: 77, yPct: 22, size: 58, swayX: 10, swayY: 7, swayPhase: 1.3 },
      { id: "south-west", xPct: 17, yPct: 44, size: 54, swayX: 13, swayY: 9, swayPhase: 2.2 },
      { id: "south-east", xPct: 83, yPct: 44, size: 54, swayX: 13, swayY: 9, swayPhase: 3.4 },
    ],
    centerEye: {
      xPct: 50,
      yPct: 29,
      size: 108,
    },
  },
  "periodic-guardian": {
    id: "periodic-guardian",
    levelId: 64,
    name: "The Periodic Guardian",
    shortLabel: "Guardian",
    maxHealth: 20,
    maxShots: 50,
    centerChargeGoal: 0,
    openDurationMs: 3_000,
    maxEyeElement: 18,
    outerEyes: [
      { id: "north-west", xPct: 24, yPct: 22, size: 56, swayX: 9, swayY: 5, swayPhase: 0.2 },
      { id: "north-east", xPct: 76, yPct: 22, size: 56, swayX: 9, swayY: 5, swayPhase: 1.4 },
      { id: "south-west", xPct: 22, yPct: 43, size: 54, swayX: 12, swayY: 7, swayPhase: 2.3 },
      { id: "south-east", xPct: 78, yPct: 43, size: 54, swayX: 12, swayY: 7, swayPhase: 3.5 },
    ],
    centerEye: {
      xPct: 50,
      yPct: 27,
      size: 114,
    },
  },
};
