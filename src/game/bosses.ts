export type BossId = "elemental-boss";

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
};

