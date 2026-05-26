import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { ELEMENTS } from "./elements";
import {
  LEVELS,
  MOLECULE_CHALLENGE_BY_LEVEL,
  getLevelById,
  getNextLevel,
  type PowerUpStageId,
} from "./levels";
import {
  Ball,
  Board,
  Geo,
  createEmptyBoard,
  nextBallId,
  placeAndMerge,
  mergeSettledBoard,
  generateInitialQueue,
  generateQueueElement,
  checkGameOver,
  formatScore,
  getHighestOnBoard,
  type MergeEvent,
} from "./logic";
import { ElementBall } from "./ElementBall";
import {
  emptyPowerUpInventory,
  type InventoryPowerUpId,
  type PowerUpInventory,
  useProgress,
} from "./store";
import {
  playMergeSound,
  playShootSound,
  playWinSound,
  primeAudio,
  startAmbientMusic,
  stopAmbientMusic,
  vibrate,
} from "./audio";
import { GameModeId, getGameMode, getModeLevelLabel } from "./challenges";
import { trackGameOver, trackGameStart, trackLevelWin, trackMerge, trackShot } from "./analytics";
import {
  COMPOUNDS,
  type CompoundDefinition,
  compoundKey,
  findCompoundByElements,
} from "./compounds";
import { MoleculeVisual } from "./MoleculeVisual";
import { PowerUpBadge } from "./PowerUpLibrary";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";
import { showInterstitialIfReady } from "./ads";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
  onMap?: () => void;
  mode?: GameModeId;
  resumeSavedRun?: boolean;
}

const QUEUE_SIZE = 4;
const MAX_AIM_DEG = 75;
const SHIMMER_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.shimmer;
const UNSTABLE_UNLOCK_LEVEL = POWER_UP_UNLOCK_LEVELS.unstable;
const GRAB_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.grab;
const EGUN_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.egun;
const GRAVITY_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.gravity;
const EMISSION_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.emission;
const TRANSMUTE_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.transmute;
const FUSION_JUMP_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS["fusion-jump"];
const CATALYST_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.catalyst;
const STONE_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.stone;
const GAMMA_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.gamma;
const COMPOUND_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.molecule;
const BLANK_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS.blank;
const SHUFFLE_MIN_LEVEL = POWER_UP_UNLOCK_LEVELS["queue-shuffle"];
const BLANK_ATOM_CHANCE = 0.01;
const POWER_UP_CHANCE = 0.05;
const EGUN_CHANCE = 0.01;
const EGUN_CHANCE_STEP = 0.005;
const EGUN_MIN_SHOT_GAP = 10;
const EMISSION_UNLOCK_INTERVAL_MS = 5 * 60 * 1000;
const STONE_MAX_HP = 8;
const SPAWN_FLOOR_LEVEL = 10;
const SPAWN_FLOOR_INTERVAL_MS = 2 * 60 * 1000;
const SHUFFLE_COUNT = 4;
const SHUFFLE_LIMIT = 3;
const SHUFFLE_OFFSET_MIN = 4;
const SHUFFLE_OFFSET_MAX = 10;
const GAMMA_SHOT_INTERVAL = 40;
const GAMMA_RADIUS_MULT = 3.5;
const COMPOUND_REGEN_MS = 5 * 60 * 1000;
const COMPOUND_MAX_SELECTION = 9;
const COMPOUND_MAX_ELEMENT_TYPES = 3;
const COMPOUND_STORAGE_KEY = "elemental-gold-rush-compound-charge";
export const SAVED_RUN_STORAGE_KEY = "elemental-gold-rush-saved-run";
const COMPOUND_HINT_COST = 50_000;
const COMPOUND_SUPER_HINT_COST = 100_000;
const SEEDED_BOARD_MIN_TARGET = 10;
const SEEDED_BOARD_MIN_ATOMS = 3;
const SEEDED_BOARD_MAX_ATOMS = 8;
const SEEDED_BOARD_TARGET_OFFSET = 3;
const TRANSMUTE_SHOT_INTERVAL = 30;
const CATALYST_AURA_SHOTS = 5;
const CATALYST_ADJ_FACTOR = 2.3;
const SHOT_MERGE_RADIUS_BONUS_FACTOR = 0.25;
const DISCOVERY_DECAY_STEP = 5;
const DISCOVERY_DECAY_BOOST = 0.04;
const STAGE_CLEAR_ANIMATION_MS = 6200;
const STONE_GRACE_SHOTS = 15;
const UNSTABLE_SPAWN_CHANCE = 0.04;
const MERGE_COMBO_START_MS = 240;
const MERGE_COMBO_STEP_MS = 460;
const MERGE_COMBO_END_PAD_MS = 560;
const MERGE_COMBO_SOUND_STEP_MS = 130;
const CHALLENGE_CLEAR_SCORE = 5000;
const POWER_UP_CLEAR_DELAY_MS = 2000;

function mergeComboCueDelay(index: number): number {
  return index * MERGE_COMBO_SOUND_STEP_MS;
}

const INVENTORY_PICK_LIMIT = 3;

interface SavedRunSnapshot {
  version: 1;
  savedAt: number;
  levelId: number;
  mode?: GameModeId;
  balls: Board;
  queue: number[];
  shimmerQueue: boolean[];
  eGunQueue: boolean[];
  blankQueue: boolean[];
  unstableQueue: boolean[];
  score: number;
  highest: number;
  shots: number;
  runBestCombo: number;
  earnedStars: number;
  elapsedMs: number;
  grabs: number;
  grabProgress: number;
  compoundCharges: number;
  inventoryCompoundCharges: number;
  gravityCharges: number;
  emissionCharges: number;
  emissionUnlockIndex: number;
  transmuteCharges: number;
  fusionJumpCharges: number;
  fusionJumpArmed: boolean;
  catalystCharges: number;
  catalystShotsRemaining: number;
  queueShuffleCharges: number;
  stoneHitTally: number;
  gammaCharges: number;
  pendingGamma: boolean;
  pendingStone: boolean;
  noMergeStreak: number;
  stoneSpawnCount: number;
  spawnFloorIndex: number;
  continuingPastTarget: boolean;
  continueStartedElapsedMs: number | null;
  newlyDiscoveredThisRun: number[];
  runPowerUpsUsed: number;
}

export function getSavedRunSummary():
  | { levelId: number; mode?: GameModeId; score: number; shots: number; savedAt: number }
  | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVED_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRunSnapshot>;
    if (parsed.version !== 1 || typeof parsed.levelId !== "number") return null;
    return {
      levelId: parsed.levelId,
      mode: parsed.mode,
      score: Math.max(0, Math.floor(parsed.score ?? 0)),
      shots: Math.max(0, Math.floor(parsed.shots ?? 0)),
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearSavedRun(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVED_RUN_STORAGE_KEY);
}

const POWER_UP_INVENTORY_META: Record<
  InventoryPowerUpId,
  { icon: string; name: string; description: string }
> = {
  transmute: {
    icon: "🔀",
    name: "Transmute Shot",
    description: "Reroll your current queued atom into a higher tier.",
  },
  "fusion-jump": {
    icon: "⏭",
    name: "Fusion Jump",
    description: "Arm your next merge to skip one extra element tier.",
  },
  catalyst: {
    icon: "🧪",
    name: "Catalyst Aura",
    description: "Double fusion radius for your next 5 shots.",
  },
  emission: {
    icon: "☢",
    name: "Emission",
    description: "Raise the atoms currently waiting in your queue by 1 tier.",
  },
  gravity: {
    icon: "🌀",
    name: "Gravity",
    description: "Lift all atoms upward and resolve any new fusions.",
  },
  grab: {
    icon: "🤚",
    name: "Grab",
    description: "Drag one atom to a better spot and set up a chain.",
  },
  gamma: {
    icon: "☢",
    name: "Gamma Bomb",
    description: "Detonate a wide radius that clears surrounding atoms.",
  },
  molecule: {
    icon: "ðŸ§¬",
    name: "Compound",
    description: "Start with one Compound charge for forming a molecule.",
  },
};

const POWER_UP_STAGE_NAMES: Record<PowerUpStageId, string> = {
  shimmer: "Shimmer Atom",
  unstable: "Unstable Atom",
  grab: "Grab",
  egun: "E-Gun",
  gravity: "Gravity",
  stone: "Stone",
  transmute: "Transmute Shot",
  "fusion-jump": "Fusion Jump",
  catalyst: "Catalyst Aura",
  emission: "Emission",
  gamma: "Gamma Bomb",
  blank: "Blank Atom",
  "queue-shuffle": "Queue Shuffle",
};

const POWER_UP_STAGE_TIPS: Record<PowerUpStageId, { title: string; body: string; tone?: "default" | "danger" }> = {
  shimmer: {
    title: "Shimmer practice",
    body: "A shimmering atom is waiting in the queue. Shoot it into a matching atom so it merges; that clears this training stage and unlocks Shimmer for future levels.",
  },
  unstable: {
    title: "Unstable practice",
    body: "The isotope on the board has a shell shield based on electron shells: smaller atoms have smaller shields, larger atoms last longer. Merge a fresh queued atom into it before the shield depletes to clear the stage.",
    tone: "danger",
  },
  grab: {
    title: "Grab practice",
    body: "Tap Grab, drag an atom into its matching partner, and release. A successful Grab merge clears the stage.",
  },
  egun: {
    title: "E-Gun practice",
    body: "The E-Gun fires in a straight line and upgrades every atom in the beam. It starts at a 1% spawn rate and increases slightly over time. Hit a molecule with the beam to clear this stage.",
  },
  gravity: {
    title: "Gravity practice",
    body: "Gravity is earned every 30 successful merges. Tap Gravity to pull atoms upward and resolve any new fusions.",
  },
  stone: {
    title: "Stone practice",
    body: "In normal runs, three consecutive misses after the initial 15-shot grace period load a Stone. Stones do not merge, but they shove atoms and can be destroyed for bonus points. Place this training Stone to clear the stage.",
    tone: "danger",
  },
  transmute: {
    title: "Transmute practice",
    body: "Use Transmute to upgrade the queued atom, then merge that shot into the board to clear the stage.",
  },
  "fusion-jump": {
    title: "Fusion Jump practice",
    body: "Arm Fusion Jump, then merge Chlorine with Chlorine. The jump skips ahead to Argon and clears the stage.",
  },
  catalyst: {
    title: "Catalyst practice",
    body: "Activate Catalyst, then shoot into the cluster. A catalyst-powered chain reaction clears this stage.",
  },
  emission: {
    title: "Emission practice",
    body: "Tap Emission to raise the atoms waiting in your queue. Using it clears this stage.",
  },
  gamma: {
    title: "Gamma Bomb practice",
    body: "Arm Gamma Bomb and fire into the cluster. Clearing atoms with the blast completes the stage.",
  },
  blank: {
    title: "Blank Atom practice",
    body: "A Blank Atom copies the atom it hits and one-shots Stones. Break through the stones and merge with Bromine to form Krypton.",
  },
  "queue-shuffle": {
    title: "Queue Shuffle practice",
    body: "Use Queue Shuffle to reroll the queue, then fire one of the new atoms to clear the stage.",
  },
};

function countPowerUps(inventory: Partial<Record<InventoryPowerUpId, number>>): number {
  return Object.values(inventory).reduce((total, count) => total + (count ?? 0), 0);
}

function hasPowerUps(inventory: Partial<Record<InventoryPowerUpId, number>>): boolean {
  return countPowerUps(inventory) > 0;
}

function loadCompoundChargeState(): { charges: number; spentAt: number | null } {
  if (typeof window === "undefined") return { charges: 0, spentAt: null };
  try {
    const raw = window.localStorage.getItem(COMPOUND_STORAGE_KEY);
    if (!raw) return { charges: 0, spentAt: null };
    const parsed = JSON.parse(raw) as { charges?: number; spentAt?: number | null };
    const spentAt = typeof parsed.spentAt === "number" ? parsed.spentAt : null;
    const charges = Math.min(1, Math.max(0, Math.floor(parsed.charges ?? 0)));
    if (charges <= 0 && spentAt != null && Date.now() - spentAt >= COMPOUND_REGEN_MS) {
      return { charges: 1, spentAt: null };
    }
    return { charges, spentAt };
  } catch {
    return { charges: 0, spentAt: null };
  }
}

function saveCompoundChargeState(charges: number, spentAt: number | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    COMPOUND_STORAGE_KEY,
    JSON.stringify({ charges: Math.min(1, Math.max(0, charges)), spentAt }),
  );
}

function isotopeChargeCapacity(atom: number): number {
  const period = Math.max(1, Math.min(8, ELEMENTS[atom - 1]?.period ?? 4));
  if (period <= 1) return 2;
  if (period === 2) return 8;
  return 16;
}

function countsForBalls(balls: Ball[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ball of balls) {
    const symbol = ELEMENTS[ball.atom - 1]?.symbol;
    if (!symbol) continue;
    counts[symbol] = (counts[symbol] ?? 0) + 1;
  }
  return counts;
}

function atomsForCompound(compound: CompoundDefinition): number[] {
  return Object.entries(compound.elements).flatMap(([symbol, count]) => {
    const atomicNumber = ELEMENTS.find((element) => element.symbol === symbol)?.atomicNumber ?? 1;
    return Array.from({ length: count }, () => atomicNumber);
  });
}

function hasCompoundRecipe(counts: Record<string, number>, compound: CompoundDefinition): boolean {
  return Object.entries(compound.elements).every(([symbol, count]) => (counts[symbol] ?? 0) >= count);
}

// Shared rocky styling — used for both the launcher visual and live stones
// on the board. Looks like a chunky rock with cracks and uneven shading
// instead of a smooth grey ball.
function isActiveIsotope(atom: { unstableShots?: number | null }): boolean {
  return (atom.unstableShots ?? 0) > 0;
}

function compoundFormationScore(
  compound: CompoundDefinition,
  atoms: { atom: number; unstableShots?: number | null }[],
): number {
  // Base bonus is precomputed in compounds.ts (clamped to 1,000–20,000).
  // Active unstable atoms still earn a small multiplier bonus.
  const isotopeCount = atoms.reduce(
    (count, atom) => count + (isActiveIsotope(atom) ? 1 : 0),
    0,
  );
  const multiplier = 1 + isotopeCount * 0.2;
  return Math.min(20000, Math.round(compound.bonusScore * multiplier));
}

const stoneBackground =
  // Multiple radial gradients layered to mimic uneven rocky surface,
  // plus craggy highlights and shadow pockets.
  "repeating-linear-gradient(28deg, oklch(0.78 0.018 80 / 0.16) 0 2px, transparent 2px 8px)," +
  "repeating-linear-gradient(118deg, transparent 0 5px, oklch(0.12 0.012 55 / 0.24) 5px 7px, transparent 7px 13px)," +
  "radial-gradient(circle at 22% 20%, oklch(0.68 0.025 70) 0%, transparent 32%)," +
  "radial-gradient(circle at 78% 30%, oklch(0.52 0.02 60) 0%, transparent 28%)," +
  "radial-gradient(circle at 58% 42%, oklch(0.86 0.01 80 / 0.18) 0 2px, transparent 3px)," +
  "radial-gradient(circle at 42% 58%, oklch(0.08 0.01 55 / 0.28) 0 2px, transparent 4px)," +
  "radial-gradient(circle at 30% 75%, oklch(0.22 0.015 55) 0%, transparent 38%)," +
  "radial-gradient(circle at 70% 70%, oklch(0.18 0.015 50) 0%, transparent 36%)," +
  "radial-gradient(circle at 50% 50%, oklch(0.42 0.02 60), oklch(0.28 0.02 55) 70%, oklch(0.16 0.015 50))";
const stoneBorderRadius = "48% 52% 47% 53% / 50% 46% 54% 50%";
function StoneVisual({ size, hp, seed = 17 }: { size: number; hp: number; seed?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: stoneBorderRadius,
        clipPath: stoneClipPath(seed),
        background: stoneBackground,
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.55), inset 0 -10px 18px rgba(0,0,0,0.55), inset 0 6px 14px rgba(255,255,255,0.10)",
        border: "2px solid oklch(0.2 0.015 55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.96 0.02 70)",
        fontWeight: 900,
        textShadow: "0 1px 3px rgba(0,0,0,0.85)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(125deg, transparent 38%, oklch(0.08 0.01 50 / 0.45) 39%, transparent 41%)," +
            "linear-gradient(70deg, transparent 60%, oklch(0.1 0.01 50 / 0.35) 61%, transparent 63%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ fontSize: Math.max(14, size * 0.36), lineHeight: 1.05, zIndex: 1 }}>{hp}</div>
    </div>
  );
}

function EGunVisual({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 25%, oklch(0.95 0.15 95), oklch(0.76 0.18 85) 42%, oklch(0.34 0.1 265))",
        boxShadow: "0 0 16px oklch(0.82 0.18 85 / 0.8), inset 0 -6px 10px rgba(0,0,0,0.35)",
        border: "2px solid oklch(0.9 0.17 90)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.14 0.06 265)",
        fontWeight: 1000,
        fontSize: Math.max(13, size * 0.42),
        textShadow: "0 1px 4px rgba(255,255,255,0.65)",
      }}
    >
      ⚡
    </div>
  );
}

function CatalystRadiusRing({ radius, size }: { radius: number; size: number }) {
  const diameter = radius * 2;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: size / 2 - radius,
        top: size / 2 - radius,
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        border: "2px dashed oklch(0.82 0.18 125 / 0.9)",
        background: "oklch(0.76 0.16 125 / 0.08)",
        boxShadow: "0 0 18px oklch(0.76 0.16 125 / 0.45)",
        pointerEvents: "none",
      }}
    />
  );
}

function BlankAtomVisual({ size }: { size: number }) {
  return (
    <div
      className="blank-atom"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 25%, oklch(1 0 0), oklch(0.78 0.06 250) 45%, oklch(0.22 0.03 275))",
        boxShadow:
          "0 0 18px oklch(1 0 0 / 0.75), inset 0 -6px 12px rgba(0,0,0,0.35), inset 0 5px 12px rgba(255,255,255,0.35)",
        border: "2px solid oklch(1 0 0 / 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.14 0.04 275)",
        fontWeight: 1000,
        fontSize: Math.max(14, size * 0.5),
        textShadow: "0 1px 5px rgba(255,255,255,0.8)",
      }}
    >
      ✦
    </div>
  );
}
function GammaVisual({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 30%, oklch(0.96 0.16 145), oklch(0.62 0.22 145) 55%, oklch(0.22 0.12 150))",
        boxShadow:
          "0 0 24px oklch(0.7 0.22 145 / 0.85), 0 0 48px oklch(0.7 0.22 145 / 0.45), inset 0 -6px 12px rgba(0,0,0,0.35)",
        border: "2px solid oklch(0.85 0.18 145)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.1 0.05 150)",
        fontWeight: 1000,
        fontSize: Math.max(14, size * 0.5),
        textShadow: "0 1px 4px rgba(255,255,255,0.6)",
        animation: "decay-warn-flash 1.2s ease-in-out infinite",
      }}
    >
      ☢
    </div>
  );
}
const STONE_NO_MERGE_TRIGGER = 3;
const STONE_NUDGE_MULT = 5;
const STONE_SHAPE_POINTS = 14;

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function stoneRadiusFactor(seed: number, angle: number): number {
  const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const segment = (normalized / (Math.PI * 2)) * STONE_SHAPE_POINTS;
  const i0 = Math.floor(segment) % STONE_SHAPE_POINTS;
  const i1 = (i0 + 1) % STONE_SHAPE_POINTS;
  const t = segment - Math.floor(segment);
  const smoothT = t * t * (3 - 2 * t);
  const r0 = 0.86 + seededNoise(seed * 31 + i0 * 17) * 0.26;
  const r1 = 0.86 + seededNoise(seed * 31 + i1 * 17) * 0.26;
  return r0 + (r1 - r0) * smoothT;
}

function stoneClipPath(seed: number): string {
  const points = Array.from({ length: STONE_SHAPE_POINTS }, (_, i) => {
    const angle = -Math.PI / 2 + (i / STONE_SHAPE_POINTS) * Math.PI * 2;
    const radius = 44 * stoneRadiusFactor(seed, angle);
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
  });
  return `polygon(${points.join(", ")})`;
}

function stoneSurfaceNormal(seed: number, angle: number): { x: number; y: number } {
  const delta = 0.04;
  const r0 = 0.88 * stoneRadiusFactor(seed, angle - delta);
  const r1 = 0.88 * stoneRadiusFactor(seed, angle + delta);
  const ax = Math.cos(angle - delta) * r0;
  const ay = Math.sin(angle - delta) * r0;
  const bx = Math.cos(angle + delta) * r1;
  const by = Math.sin(angle + delta) * r1;
  const tx = bx - ax;
  const ty = by - ay;
  let nx = ty;
  let ny = -tx;
  if (nx * Math.cos(angle) + ny * Math.sin(angle) < 0) {
    nx = -nx;
    ny = -ny;
  }
  const mag = Math.hypot(nx, ny) || 1;
  return { x: nx / mag, y: ny / mag };
}

function getComboLabel(mergeCount: number): string | null {
  if (mergeCount >= 6) return "Nuclear Rush!";
  if (mergeCount >= 4) return "Atomic Cascade!";
  if (mergeCount >= 3) return "Reaction Chain!";
  if (mergeCount >= 2) return "Catalyst!";
  return null;
}
function getStarParShots(level: (typeof LEVELS)[0]): number {
  if (level.starShotsThree != null) return level.starShotsThree - 1;
  const configuredPar = level.parShots ?? 30;
  const targetGap = Math.max(0, level.targetElement - level.maxQueueElement);
  const targetComplexity = Math.ceil(targetGap * (level.id >= 10 ? 2.4 : 1.15));
  const levelComplexity = Math.max(0, level.id - 1) * (level.id >= 7 ? 3 : 2);
  const realisticPar = 12 + targetComplexity + levelComplexity;
  return Math.max(configuredPar, realisticPar);
}

function calculateStars(
  level: (typeof LEVELS)[0],
  score: number,
  shots: number,
  bestCombo: number,
  timeSec: number,
): number {
  const scoreTarget =
    level.id <= 2
      ? 40
      : level.id <= 8
        ? 3_000
        : level.id <= 15
          ? 80_000
          : level.id <= 30
            ? 120_000
            : 170_000;
  return 1 + (timeSec <= 10 * 60 ? 1 : 0) + (score > scoreTarget ? 1 : 0);

}

export function GameBoard({ levelId, onExit, onWin, onMap = onExit, mode = "campaign", resumeSavedRun = false }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
  const gameMode = getGameMode(mode);
  const shimmerEnabled = level.id >= SHIMMER_MIN_LEVEL;
  const grabEnabled = level.id >= GRAB_MIN_LEVEL;
  const eGunEnabled = level.id >= EGUN_MIN_LEVEL;
  const gravityEnabled = level.id >= GRAVITY_MIN_LEVEL;
  const emissionEnabled = level.id >= EMISSION_MIN_LEVEL;
  const transmuteEnabled = level.id >= TRANSMUTE_MIN_LEVEL;
  const fusionJumpEnabled = level.id >= FUSION_JUMP_MIN_LEVEL;
  const catalystEnabled = level.id >= CATALYST_MIN_LEVEL;
  const stoneEnabled = level.id >= STONE_MIN_LEVEL;
  const powerUpStage = mode === "campaign" ? level.powerUpStage : undefined;
  const isPowerUpStage = powerUpStage != null;
  const compoundEnabled = mode === "campaign" && !isPowerUpStage;
  const blankEnabled = level.id >= BLANK_MIN_LEVEL;
  const {
    recordDiscovery,
    addScore,
    setHighestElement,
    unlockLevel,
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    discoveredElements,
    discoveredCompounds,
    compoundCounts,
    recordCompoundDiscovery,
    totalScore,
    spendScore,
    reportQuestProgress,
    setBestCombo,
    setLevelStars,
    incrementLevelAttempt,
    recordLevelRun,
    setChallengeBestScore,
    powerUpInventory,
    addInventoryPowerUps,
    consumeInventoryPowerUps,
    seenTips,
    markTipSeen,
    toggleSound,
    toggleMusic,
    shootingStyle,
    hasChosenShootingStyle,
    setShootingStyle,
    hasProPack,
    clearedStagesSinceAd,
    markInterstitialShown,
  } = useProgress();

  const [balls, setBalls] = useState<Board>(() => createEmptyBoard());
  const [queue, setQueue] = useState<number[]>(() =>
    generateInitialQueue(level.maxQueueElement, QUEUE_SIZE, level.queueDecay),
  );
  // Parallel array — true means that queued atom is "shimmering" and will give
  // 2× score and 2× grab-combo progress on a successful merge.
  const [shimmerQueue, setShimmerQueue] = useState<boolean[]>(() =>
    Array.from({ length: QUEUE_SIZE }, () => shimmerEnabled && Math.random() < POWER_UP_CHANCE),
  );
  // Parallel array — true means this queue slot fires the E-gun instead of an atom.
  const [eGunQueue, setEGunQueue] = useState<boolean[]>(() =>
    Array.from({ length: QUEUE_SIZE }, () => false),
  );
  // Parallel array — true means this queue slot is a Blank atom wildcard.
  const [blankQueue, setBlankQueue] = useState<boolean[]>(() =>
    Array.from({ length: QUEUE_SIZE }, () => blankEnabled && Math.random() < BLANK_ATOM_CHANCE),
  );
  const [unstableQueue, setUnstableQueue] = useState<boolean[]>(() =>
    Array.from(
      { length: QUEUE_SIZE },
      () => level.id >= UNSTABLE_UNLOCK_LEVEL && Math.random() < UNSTABLE_SPAWN_CHANCE,
    ),
  );
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(1);
  const [shots, setShots] = useState(0);
  const [runBestCombo, setRunBestCombo] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [aimDeg, setAimDeg] = useState(0); // 0 = straight up, negative = left
  const [playStylePromptOpen, setPlayStylePromptOpen] = useState(!hasChosenShootingStyle);
  const [popups, setPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [discoveryEl, setDiscoveryEl] = useState<number | null>(null);
  const [discoveryCompound, setDiscoveryCompound] = useState<{
    compound: CompoundDefinition;
    isNew: boolean;
    count: number;
    bonusScore: number;
  } | null>(null);
  const [newlyDiscoveredThisRun, setNewlyDiscoveredThisRun] = useState<number[]>([]);
  const [formedCompoundsThisRun, setFormedCompoundsThisRun] = useState<string[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [wiggleIds, setWiggleIds] = useState<Set<number>>(new Set());
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);
  const [eGunBeamPath, setEGunBeamPath] = useState<{ x: number; y: number }[] | null>(null);
  const [gravityFxId, setGravityFxId] = useState<number | null>(null);
  const [fusionJumpFx, setFusionJumpFx] = useState<{ id: number; x: number; y: number } | null>(
    null,
  );
  const popupId = useRef(0);
  const eGunCooldownSlots = useRef(0);
  const challengeQueuePlanRef = useRef<number[]>([]);

  // === Grab power-up ===
  // Earned by making 8 merge progress in a row.
  const [grabs, setGrabs] = useState(0);
  const [grabMode, setGrabMode] = useState(false);
  const [grabbing, setGrabbing] = useState<{ id: number; x: number; y: number } | null>(null);

  const [compoundCharges, setCompoundCharges] = useState(() => loadCompoundChargeState().charges);
  const [compoundMode, setCompoundMode] = useState(false);
  const [selectedCompoundIds, setSelectedCompoundIds] = useState<Set<number>>(new Set());
  const [compoundFx, setCompoundFx] = useState<{
    compound: CompoundDefinition;
    atoms: { id: number; x: number; y: number; atom: number; r: number }[];
  } | null>(null);
  const [compoundTextFx, setCompoundTextFx] = useState<{
    id: number;
    compound: CompoundDefinition;
    isNew: boolean;
  } | null>(null);
  const [mergeComboFx, setMergeComboFx] = useState<
    { id: number; x: number; y: number; depth: number; atom: number; isotope: boolean }[]
  >([]);
  const [formingCompoundIds, setFormingCompoundIds] = useState<Set<number>>(new Set());

  // === Stone obstacle ===
  // After STONE_NO_MERGE_TRIGGER shots in a row that produce no merges, a
  // large indestructible-but-breakable Stone gets loaded into the launcher,
  // and the player launches it like any other shot.
  const [noMergeStreak, setNoMergeStreak] = useState(0);
  const [stoneHitIds, setStoneHitIds] = useState<Set<number>>(new Set());
  const [pendingStone, setPendingStone] = useState(false);
  const [stoneSpawnCount, setStoneSpawnCount] = useState(0);

  // === Combo bar for Grab power-up ===
  // Every successful merge counts toward the current streak (shimmer atoms
  // count +2). A missed shot resets progress, so Grab requires 8 merge progress
  // in a row.
  const GRAB_THRESHOLD = 8;
  const [grabProgress, setGrabProgress] = useState(0);

  // === Gravity and Emission power-ups ===
  // Gravity is awarded by 4× combos. Emission is awarded every 5 minutes and
  // upgrades only the currently queued atom without creating the level target.
  const [gravityCharges, setGravityCharges] = useState(0);
  const [gravityMergeProgress, setGravityMergeProgress] = useState(0);
  const [emissionCharges, setEmissionCharges] = useState(0);
  const [emissionUnlockIndex, setEmissionUnlockIndex] = useState(0);
  const [transmuteCharges, setTransmuteCharges] = useState(0);
  const [fusionJumpCharges, setFusionJumpCharges] = useState(0);
  const [fusionJumpArmed, setFusionJumpArmed] = useState(false);
  const [catalystCharges, setCatalystCharges] = useState(0);
  const [catalystShotsRemaining, setCatalystShotsRemaining] = useState(0);
  const [pendingReversiblePowerUp, setPendingReversiblePowerUp] = useState<
    null | "transmute" | "emission" | "fusion-jump" | "catalyst"
  >(null);
  const queueUndoRef = useRef<null | {
    queue: number[];
    shimmerQueue: boolean[];
    eGunQueue: boolean[];
    blankQueue: boolean[];
    unstableQueue: boolean[];
    powerUp: "transmute" | "emission";
  }>(null);
  const longPressTimerRef = useRef<number | null>(null);

  // === Continue past target ===
  // When the player reaches the target element, we offer a choice: claim the
  // win, or keep playing for score. While `continuingPastTarget` is true we
  // suppress further win prompts.
  const [continuingPastTarget, setContinuingPastTarget] = useState(false);
  const [continueStartedElapsedMs, setContinueStartedElapsedMs] = useState<number | null>(null);
  const [continueClaimPromptOpen, setContinueClaimPromptOpen] = useState(false);
  const [winChoice, setWinChoice] = useState<{
    stars: number;
    score: number;
    shots: number;
    bestCombo: number;
    compound?: CompoundDefinition;
  } | null>(null);
  const [stageClearFx, setStageClearFx] = useState<{
    stars: number;
    score: number;
    shots: number;
    bestCombo: number;
    compound?: CompoundDefinition;
  } | null>(null);
  const stageClearTimeoutRef = useRef<number | null>(null);
  const projectileFrameRef = useRef<number | null>(null);
  const hasClaimedUnusedInventoryRef = useRef(false);
  const [claimedResultPowerUp, setClaimedResultPowerUp] = useState<InventoryPowerUpId | null>(null);
  const runPowerUpsUsedRef = useRef(0);
  const powerUpStageCompletedRef = useRef(false);
  const [transmuteStagePending, setTransmuteStagePending] = useState(false);
  const [queueShuffleStagePending, setQueueShuffleStagePending] = useState(false);
  const runRecordedRef = useRef(false);
  const inventoryCompoundChargesRef = useRef(0);
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "restart" | "leave">(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const [selectedInventoryPowerUps, setSelectedInventoryPowerUps] = useState<PowerUpInventory>(() =>
    emptyPowerUpInventory(),
  );

  // === Run timer ===
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const [paused, setPaused] = useState(false);

  // === Queue Shuffle power-up ===
  // Earned every QUEUE_SHUFFLE_PER_STONE_HITS atom-on-stone hits this run.
  const [queueShuffleCharges, setQueueShuffleCharges] = useState(0);
  const [stoneHitTally, setStoneHitTally] = useState(0);

  // === Shot history log ===
  // Chronological list of every shot/action in this run.
  const [shotHistory, setShotHistory] = useState<
    {
      id: number;
      ts: number;
      shot: number;
      action: string;
      points: number;
      powerUp?: string;
      merges: {
        sourceAtom: number;
        atom: number;
        depth: number;
        stabilizedIsotope?: boolean;
        points: number;
      }[];
    }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyIdRef = useRef(0);
  function pushShotHistory(entry: {
    shot: number;
    action: string;
    points: number;
    powerUp?: string;
    merges?: MergeEvent[];
  }) {
    const now = Date.now();
    setShotHistory((prev) => {
      const next = [
        ...prev,
        {
          id: ++historyIdRef.current,
          ts: now,
          shot: entry.shot,
          action: entry.action,
          points: Math.max(0, Math.floor(entry.points)),
          powerUp: entry.powerUp,
          merges: (entry.merges ?? []).map((m) => ({
            sourceAtom: m.sourceAtomicNumber ?? Math.max(1, m.resultAtomicNumber - 1),
            atom: m.resultAtomicNumber,
            depth: m.chainDepth,
            stabilizedIsotope: m.stabilizedIsotope,
            points: m.scoreGained,
          })),
        },
      ];
      // Cap to last 200 entries to avoid runaway memory.
      if (next.length > 200) next.splice(0, next.length - 200);
      return next;
    });
  }

  // === Pre-level shuffle (lvl 10+) ===
  // Player gets 3 reshuffles of 4 starting atoms before the level begins.
  const shuffleEnabled = level.id >= SHUFFLE_MIN_LEVEL;
  const gammaEnabled = level.id >= GAMMA_MIN_LEVEL;
  const [shuffleStartOpen, setShuffleStartOpen] = useState(false);
  const [shufflesLeft, setShufflesLeft] = useState(SHUFFLE_LIMIT);
  const [shuffleAtoms, setShuffleAtoms] = useState<number[]>([]);

  // === Gamma bomb (lvl 12+) ===
  const [gammaCharges, setGammaCharges] = useState(0);
  const [pendingGamma, setPendingGamma] = useState(false);

  // === Spawn-floor tier (lvl 10+) — every 2 min raise lowest spawnable tier
  // if those atoms are absent from the board.
  const [spawnFloorIndex, setSpawnFloorIndex] = useState(0);

  function generateShuffleAtoms(): number[] {
    const hi = Math.max(2, level.targetElement - SHUFFLE_OFFSET_MIN);
    const lo = Math.max(1, level.targetElement - SHUFFLE_OFFSET_MAX);
    return Array.from({ length: SHUFFLE_COUNT }, () => randomAvailableElement(hi, lo));
  }

  const target = level.targetElement;
  const targetEl = ELEMENTS[target - 1];
  const moleculeObjective = useMemo(
    () =>
      COMPOUNDS.find((compound) => compound.id === MOLECULE_CHALLENGE_BY_LEVEL[level.id]) ?? null,
    [level.id],
  );
  const isMoleculeChallenge = moleculeObjective != null && mode === "campaign";
  const canIntroducePowerUps = mode === "campaign" && !isMoleculeChallenge && !isPowerUpStage;
  const unstableEnabled = level.id >= UNSTABLE_UNLOCK_LEVEL;
  const current = queue[0];
  const currentIsShimmer = shimmerQueue[0] ?? false;
  const currentIsEGun = eGunQueue[0] ?? false;
  const currentIsBlank = blankQueue[0] ?? false;
  const currentIsUnstable = unstableQueue[0] ?? false;
  const selectedCompoundAtoms = useMemo(
    () => balls.filter((b) => selectedCompoundIds.has(b.id) && b.stoneHp == null),
    [balls, selectedCompoundIds],
  );
  const compoundSelectionCounts = useMemo(
    () => countsForBalls(selectedCompoundAtoms),
    [selectedCompoundAtoms],
  );
  const matchingCompound = useMemo(
    () => findCompoundByElements(compoundSelectionCounts),
    [compoundSelectionCounts],
  );
  const matchingCompoundScore = useMemo(
    () => (matchingCompound ? compoundFormationScore(matchingCompound, selectedCompoundAtoms) : 0),
    [matchingCompound, selectedCompoundAtoms],
  );
  const matchingCompoundIsNew = matchingCompound
    ? !discoveredCompounds.includes(matchingCompound.id)
    : false;
  const availableCompoundHints = useMemo(() => {
    const boardCounts = countsForBalls(balls.filter((ball) => ball.stoneHp == null));
    return COMPOUNDS.filter((compound) => {
      const entries = Object.entries(compound.elements);
      const atomCount = entries.reduce((total, [, count]) => total + count, 0);
      if (atomCount > COMPOUND_MAX_SELECTION || entries.length > COMPOUND_MAX_ELEMENT_TYPES) return false;
      return hasCompoundRecipe(boardCounts, compound);
    });
  }, [balls]);
  const challengeCompoundReady = useMemo(() => {
    if (!isMoleculeChallenge || !moleculeObjective) return false;
    return hasCompoundRecipe(countsForBalls(balls.filter((ball) => ball.stoneHp == null)), moleculeObjective);
  }, [balls, isMoleculeChallenge, moleculeObjective]);
  const availableDiscoveredCompoundHint =
    availableCompoundHints.find((compound) => discoveredCompounds.includes(compound.id)) ??
    availableCompoundHints[0] ??
    null;
  const availableNewCompoundHint =
    availableCompoundHints.find((compound) => !discoveredCompounds.includes(compound.id)) ?? null;

  const sfx = (fn: () => void) => {
    if (soundEnabled) fn();
  };
  const haptic = (ms: number | number[]) => {
    if (hapticsEnabled) vibrate(ms);
  };
  const toggleInGameMusic = () => {
    if (!musicEnabled) startAmbientMusic();
    else stopAmbientMusic();
    toggleMusic();
  };

  useEffect(() => {
    if (musicEnabled && !gameOver && !won) startAmbientMusic();
    else stopAmbientMusic();
    return () => stopAmbientMusic();
  }, [musicEnabled, gameOver, won]);

  // Tooltip queue — small dismissable boxes that explain new mechanics.
  const [activeTip, setActiveTip] = useState<null | {
    id: string;
    title: string;
    body: string;
    tone?: "default" | "danger";
  }>(null);

  function showTip(
    id: string,
    title: string,
    body: string,
    tone: "default" | "danger" = "default",
  ) {
    if (seenTips.includes(id)) return;
    markTipSeen(id);
    setActiveTip({ id, title, body, tone });
  }

  // Force-show a tooltip regardless of whether the user has seen it.
  // Used by long-press on power-up icons to re-explain the feature.
  function showTipForce(
    id: string,
    title: string,
    body: string,
    tone: "default" | "danger" = "default",
  ) {
    if (!seenTips.includes(id)) markTipSeen(id);
    setActiveTip({ id, title, body, tone });
  }

  function registerDiscoveries(atoms: number[]) {
    const uniqueAtoms = atoms.filter((atom, index) => atom > 1 && atoms.indexOf(atom) === index);
    if (uniqueAtoms.length === 0) return;
    recordDiscovery(uniqueAtoms);
    setNewlyDiscoveredThisRun((current) => {
      const merged = [...current];
      uniqueAtoms.forEach((atom) => {
        if (!merged.includes(atom)) merged.push(atom);
      });
      return merged.sort((a, b) => a - b);
    });
  }

  function loadSavedRunSnapshot(): SavedRunSnapshot | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(SAVED_RUN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedRunSnapshot;
      if (parsed.version !== 1 || parsed.levelId !== levelId || parsed.mode !== mode) return null;
      if (!Array.isArray(parsed.balls) || !Array.isArray(parsed.queue)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function buildSavedRunSnapshot(): SavedRunSnapshot {
    return {
      version: 1,
      savedAt: Date.now(),
      levelId,
      mode,
      balls,
      queue,
      shimmerQueue,
      eGunQueue,
      blankQueue,
      unstableQueue,
      score,
      highest,
      shots,
      runBestCombo,
      earnedStars,
      elapsedMs,
      grabs,
      grabProgress,
      compoundCharges,
      inventoryCompoundCharges: inventoryCompoundChargesRef.current,
      gravityCharges,
      emissionCharges,
      emissionUnlockIndex,
      transmuteCharges,
      fusionJumpCharges,
      fusionJumpArmed,
      catalystCharges,
      catalystShotsRemaining,
      queueShuffleCharges,
      stoneHitTally,
      gammaCharges,
      pendingGamma,
      pendingStone,
      noMergeStreak,
      stoneSpawnCount,
      spawnFloorIndex,
      continuingPastTarget,
      continueStartedElapsedMs,
      newlyDiscoveredThisRun,
      runPowerUpsUsed: runPowerUpsUsedRef.current,
    };
  }

  function saveRunSnapshot() {
    if (typeof window === "undefined" || won || gameOver) return;
    window.localStorage.setItem(SAVED_RUN_STORAGE_KEY, JSON.stringify(buildSavedRunSnapshot()));
  }

  function exitToMenu() {
    saveRunSnapshot();
    onExit();
  }

  function leaveGameDiscardingRun() {
    clearSavedRun();
    onExit();
  }

  function restartLevel() {
    clearSavedRun();
    setPaused(false);
    setSettingsOpen(false);
    setGameOver(false);
    setWon(false);
    setWinChoice(null);
    setContinueClaimPromptOpen(false);
    setContinuingPastTarget(false);
    setInventoryPickerOpen(false);
    setConfirmAction(null);
    setRestartNonce((nonce) => nonce + 1);
  }

  useEffect(() => {
    if (isMoleculeChallenge || !compoundEnabled) return;
    if (paused || settingsOpen || inventoryPickerOpen || playStylePromptOpen || confirmAction) return;
    const refresh = () => {
      const state = loadCompoundChargeState();
      setCompoundCharges(Math.max(state.charges, inventoryCompoundChargesRef.current));
      if (state.charges > 0 && state.spentAt == null) saveCompoundChargeState(1, null);
    };
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, [compoundEnabled, isMoleculeChallenge, paused, settingsOpen, inventoryPickerOpen, playStylePromptOpen, confirmAction]);

  useEffect(() => {
    if (resumeSavedRun) {
      const saved = loadSavedRunSnapshot();
      if (saved) {
        setNewlyDiscoveredThisRun(saved.newlyDiscoveredThisRun ?? []);
        setBalls(saved.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
        setQueue(saved.queue);
        setShimmerQueue(saved.shimmerQueue);
        setEGunQueue(saved.eGunQueue);
        setBlankQueue(saved.blankQueue);
        setUnstableQueue(saved.unstableQueue ?? Array.from({ length: QUEUE_SIZE }, () => false));
        setScore(saved.score);
        setHighest(saved.highest);
        setShots(saved.shots);
        setRunBestCombo(saved.runBestCombo);
        setEarnedStars(saved.earnedStars);
        setGameOver(false);
        setWon(false);
        setSettingsOpen(false);
        setDiscoveryEl(null);
        setHighlightId(null);
        setWiggleIds(new Set());
        setProjectile(null);
        setGravityFxId(null);
        setBusy(false);
        setAimDeg(0);
        setGrabs(saved.grabs);
        setGrabMode(false);
        setGrabbing(null);
        setCompoundCharges(saved.compoundCharges);
        inventoryCompoundChargesRef.current = saved.inventoryCompoundCharges ?? 0;
        setCompoundMode(false);
        setSelectedCompoundIds(new Set());
        setCompoundFx(null);
        setCompoundTextFx(null);
        setFormingCompoundIds(new Set());
        setDiscoveryCompound(null);
        setFormedCompoundsThisRun([]);
        setGrabProgress(saved.grabProgress);
        setContinuingPastTarget(saved.continuingPastTarget);
        setContinueStartedElapsedMs(saved.continueStartedElapsedMs);
        setContinueClaimPromptOpen(false);
        setWinChoice(null);
        setStageClearFx(null);
        setNoMergeStreak(saved.noMergeStreak);
        setStoneHitIds(new Set());
        setPendingStone(saved.pendingStone);
        setStoneSpawnCount(saved.stoneSpawnCount);
        setGravityCharges(saved.gravityCharges);
        setGravityMergeProgress(0);
        setEmissionCharges(saved.emissionCharges);
        setEmissionUnlockIndex(saved.emissionUnlockIndex);
        setTransmuteCharges(saved.transmuteCharges);
        setFusionJumpCharges(saved.fusionJumpCharges);
        setFusionJumpArmed(saved.fusionJumpArmed);
        setCatalystCharges(saved.catalystCharges);
        setCatalystShotsRemaining(saved.catalystShotsRemaining);
        setPendingReversiblePowerUp(null);
        hasClaimedUnusedInventoryRef.current = false;
        setClaimedResultPowerUp(null);
        runPowerUpsUsedRef.current = saved.runPowerUpsUsed;
        powerUpStageCompletedRef.current = false;
        setTransmuteStagePending(false);
        setQueueShuffleStagePending(false);
        runRecordedRef.current = false;
        setSelectedInventoryPowerUps(emptyPowerUpInventory());
        setInventoryPickerOpen(false);
        setShotHistory([]);
        setHistoryOpen(false);
        setQueueShuffleCharges(saved.queueShuffleCharges);
        setStoneHitTally(saved.stoneHitTally);
        setGammaCharges(saved.gammaCharges);
        setPendingGamma(saved.pendingGamma);
        setSpawnFloorIndex(saved.spawnFloorIndex);
        setShufflesLeft(SHUFFLE_LIMIT);
        setShuffleAtoms([]);
        setShuffleStartOpen(false);
        queueUndoRef.current = null;
        challengeQueuePlanRef.current = [];
        eGunCooldownSlots.current = 0;
        startTimeRef.current = Date.now() - saved.elapsedMs;
        setElapsedMs(saved.elapsedMs);
        clearSavedRun();
        trackGameStart(levelId, mode);
        return;
      }
    }
    setNewlyDiscoveredThisRun([]);
    const initialBalls = isPowerUpStage
      ? createPowerUpStageBoard(powerUpStage)
      : isMoleculeChallenge
      ? createMoleculeChallengeBoard(moleculeObjective)
      : mode === "pure-hydrogen"
        ? createEmptyBoard()
      : level.id >= SHUFFLE_MIN_LEVEL
        ? buildShuffleStartBoard(generateShuffleAtoms())
        : createSeededBoard();
    setBalls(initialBalls);
    const initialHighest = Math.max(1, getHighestOnBoard(initialBalls));
    if (initialHighest > 1) setHighestElement(initialHighest);
    const initialDiscoveries = initialBalls
      .map((b) => b.atom)
      .filter((n, i, atoms) => n > 1 && atoms.indexOf(n) === i && !discoveredElements.includes(n));
    if (initialDiscoveries.length > 0) registerDiscoveries(initialDiscoveries);
    const powerUpQueuePrefix = isPowerUpStage ? powerUpStageQueuePrefix(powerUpStage) : [];
    const challengeQueuePrefix = isMoleculeChallenge
      ? moleculeChallengeQueuePrefix(moleculeObjective)
      : [];
    challengeQueuePlanRef.current = challengeQueuePrefix.slice(QUEUE_SIZE);
    const initialQueue = [
      ...powerUpQueuePrefix,
      ...challengeQueuePrefix,
      ...generateInitialQueue(level.maxQueueElement, QUEUE_SIZE, currentQueueDecay()),
    ].slice(0, QUEUE_SIZE);
    const initialEGun = Array.from({ length: QUEUE_SIZE }, (_, i) => powerUpStage === "egun" && i === 0);
    const initialBlank = initialEGun.map(
      (isEGun) => powerUpStage === "blank" || (!isEGun && blankEnabled && Math.random() < BLANK_ATOM_CHANCE),
    );
    const initialShimmer = initialEGun.map(
      (isEGun, i) =>
        (powerUpStage === "shimmer" && i === 0) ||
        (!isEGun && !initialBlank[i] && shimmerEnabled && Math.random() < POWER_UP_CHANCE),
    );
    const initialUnstable = initialEGun.map(
      (isEGun, i) =>
        !isPowerUpStage &&
        !isEGun &&
        !initialBlank[i] &&
        level.id >= UNSTABLE_UNLOCK_LEVEL &&
        Math.random() < UNSTABLE_SPAWN_CHANCE,
    );
    setQueue(
      initialQueue.map((atom, i) =>
        isPowerUpStage
          ? atom
          : initialShimmer[i]
          ? generateQueueAtom(level.maxQueueElement, initialBalls, true)
          : Math.max(atom, queueFloorFromBoard(initialBalls)),
      ),
    );
    setShimmerQueue(initialShimmer);
    setEGunQueue(initialEGun);
    setBlankQueue(initialBlank);
    setUnstableQueue(initialUnstable);
    if (isPowerUpStage && powerUpStage) {
      const tip = POWER_UP_STAGE_TIPS[powerUpStage];
      showTipForce(`powerup-stage-${powerUpStage}`, tip.title, tip.body, tip.tone);
    } else if (canIntroducePowerUps && initialUnstable.some(Boolean)) {
      showTip(
        "feature-unstable-isotope-first-spawn",
        "Unstable atom",
        "An unstable atom is shielded like electron shells — row 1 takes 2 hits, row 2 takes 8, the rest 16. Merge it before the shells decay for 2× points.",
        "danger",
      );
    }
    setScore(0);
    setHighest(initialHighest);
    setShots(0);
    setRunBestCombo(0);
    setEarnedStars(0);
    setGameOver(false);
    setWon(false);
    setSettingsOpen(false);
    setDiscoveryEl(null);
    setHighlightId(null);
    setWiggleIds(new Set());
    setProjectile(null);
    setGravityFxId(null);
    setBusy(false);
    setAimDeg(0);
    setGrabs(powerUpStage === "grab" ? 1 : 0);
    setGrabMode(false);
    setGrabbing(null);
    inventoryCompoundChargesRef.current = 0;
    if (isMoleculeChallenge) {
      setCompoundCharges(1);
    } else if (isPowerUpStage) {
      setCompoundCharges(0);
    } else {
      if (compoundEnabled) {
        setCompoundCharges(1);
        saveCompoundChargeState(1, null);
      } else {
        setCompoundCharges(0);
      }
    }
    setCompoundMode(false);
    setSelectedCompoundIds(new Set());
    setCompoundFx(null);
    setCompoundTextFx(null);
    setFormingCompoundIds(new Set());
    setDiscoveryCompound(null);
    setFormedCompoundsThisRun([]);
    setGrabProgress(0);
    setContinuingPastTarget(false);
    setContinueStartedElapsedMs(null);
    setContinueClaimPromptOpen(false);
    setWinChoice(null);
    setStageClearFx(null);
    if (stageClearTimeoutRef.current !== null) {
      window.clearTimeout(stageClearTimeoutRef.current);
      stageClearTimeoutRef.current = null;
    }
    setNoMergeStreak(0);
    setStoneHitIds(new Set());
    setPendingStone(false);
    setStoneSpawnCount(0);
    setGravityCharges(powerUpStage === "gravity" ? 1 : 0);
    setGravityMergeProgress(0);
    setEmissionCharges(powerUpStage === "emission" ? 1 : 0);
    setEmissionUnlockIndex(0);
    setTransmuteCharges(powerUpStage === "transmute" ? 1 : 0);
    setFusionJumpCharges(powerUpStage === "fusion-jump" ? 1 : 0);
    setFusionJumpArmed(false);
    setCatalystCharges(powerUpStage === "catalyst" ? 1 : 0);
    setCatalystShotsRemaining(0);
    setPendingReversiblePowerUp(null);
    hasClaimedUnusedInventoryRef.current = false;
    setClaimedResultPowerUp(null);
    runPowerUpsUsedRef.current = 0;
    powerUpStageCompletedRef.current = false;
    setTransmuteStagePending(false);
    setQueueShuffleStagePending(false);
    runRecordedRef.current = false;
    incrementLevelAttempt(levelId);
    setSelectedInventoryPowerUps(emptyPowerUpInventory());
    setInventoryPickerOpen(!isPowerUpStage && hasPowerUps(powerUpInventory));
    setShotHistory([]);
    setHistoryOpen(false);
    setGammaCharges(powerUpStage === "gamma" ? 1 : 0);
    setPendingGamma(false);
    setSpawnFloorIndex(0);
    setShufflesLeft(SHUFFLE_LIMIT);
    setShuffleAtoms([]);
    setShuffleStartOpen(false);
    setQueueShuffleCharges(powerUpStage === "queue-shuffle" ? 1 : 0);
    queueUndoRef.current = null;
    challengeQueuePlanRef.current = [];
    eGunCooldownSlots.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    trackGameStart(levelId, mode);
    // Per-level intro tooltips for newly unlocked features.
    if (canIntroducePowerUps && level.id >= SHIMMER_MIN_LEVEL) {
      showTip(
        "feature-shimmer-unlock",
        "✦ Shimmering atoms unlocked",
        "Some atoms in your queue now shimmer with a rainbow halo. Land a successful merge with one to score 2× points and fill the Grab combo bar twice as fast.",
      );
    }
    if (canIntroducePowerUps && level.id >= GRAB_MIN_LEVEL) {
      // First-ever Grab unlock: give one free charge so the player can try it immediately.
      if (!seenTips.includes("feature-grab-unlock")) {
        setGrabs((g) => g + 1);
        spawnPopup("🤚 +1 GRAB");
      }
      showTip(
        "feature-grab-unlock",
        "🤚 Grab power-up unlocked!",
        "Build the Grab combo bar by making 8 merge progress in a row. When it fills, tap the Grab button (bottom-right), then drag any atom on the board to a new position — surrounding atoms slide out of the way to make room. Use it to set up huge merge chains.",
      );
    }
    if (canIntroducePowerUps && level.id >= BLANK_MIN_LEVEL) {
      showTip(
        "feature-blank-unlock",
        "✦ Blank atom unlocked!",
        "Blank atoms are rare 1% wildcard shots. They merge as whatever atom they hit — and if they hit a Stone, the Stone vanishes completely.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement, mode, resumeSavedRun, isMoleculeChallenge, isPowerUpStage, powerUpStage, moleculeObjective, restartNonce]);

  // Show a one-time tooltip the first time a shimmer atom appears in the queue.
  useEffect(() => {
    if (!canIntroducePowerUps || !shimmerEnabled) return;
    if (shimmerQueue.some(Boolean)) {
      showTip(
        "feature-shimmer-spawn",
        "✦ A shimmering atom appeared!",
        "The glowing rainbow atom in your queue scores double and pumps your Grab combo bar by 2 per merge.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shimmerQueue, shimmerEnabled, canIntroducePowerUps]);

  // Show the E-gun explanation the first time an E-gun shot actually appears
  // in the queue (not on every level 6+ start).
  useEffect(() => {
    if (!canIntroducePowerUps || !eGunEnabled) return;
    if (eGunQueue.some(Boolean)) {
      showTip(
        "feature-egun-unlock",
        "⚡ E-gun unlocked!",
        "Rare E-gun shots fire a straight beam to the far edge without bouncing. Every atom in the beam upgrades by 1 tier.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eGunQueue, eGunEnabled, canIntroducePowerUps]);

  // Tick the run timer every second while the level is active.
  useEffect(() => {
    if (gameOver || won || paused || settingsOpen || inventoryPickerOpen || playStylePromptOpen || confirmAction) return;
    const id = setInterval(() => {
      // Use delta accumulation so paused time doesn't advance powerup timers.
      setElapsedMs((m) => m + 500);
    }, 500);
    return () => clearInterval(id);
  }, [gameOver, won, levelId, paused, settingsOpen, inventoryPickerOpen, playStylePromptOpen, confirmAction]);

  useEffect(() => {
    if (mode !== "gold-rush-timer" || gameOver || won) return;
    const limitMs = (gameMode.timerSec ?? 180) * 1000;
    if (elapsedMs < limitMs) return;
    trackGameOver(levelId, score, shots, highest, mode);
    setGameOver(true);
    spawnPopup("⏱ TIME UP");
  }, [elapsedMs, gameMode.timerSec, gameOver, highest, levelId, mode, score, shots, won]);

  useEffect(() => {
    if (!emissionEnabled) return;
    if (gameOver || won) return;
    const nextUnlockMs = (emissionUnlockIndex + 1) * EMISSION_UNLOCK_INTERVAL_MS;
    if (elapsedMs < nextUnlockMs) return;
    setEmissionCharges((g) => g + 1);
    setEmissionUnlockIndex((i) => i + 1);
    spawnPopup("☢ EMISSION READY");
    if (canIntroducePowerUps) {
      showTip(
        "feature-emission-powerup",
        "☢ Emission power-up ready!",
        "Emission unlocks every 5 minutes. Tap it to raise every atom currently waiting in your queue by 1 tier.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, gameOver, won, emissionUnlockIndex, emissionEnabled, canIntroducePowerUps]);

  // Spawn-floor scaling — level 10+: every 2 minutes raise the lowest
  // spawnable tier so runs don't drag on with low-value atoms.
  useEffect(() => {
    if (!shuffleEnabled) return;
    if (gameOver || won) return;
    const nextTickMs = (spawnFloorIndex + 1) * SPAWN_FLOOR_INTERVAL_MS;
    if (elapsedMs < nextTickMs) return;
    setSpawnFloorIndex((i) => i + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, gameOver, won, spawnFloorIndex, shuffleEnabled]);

  // Dynamic queue cap: as the board fills, unlock higher-tier atoms in the
  // shooting queue. Adds +1 tier at 15 atoms on board, +2 at 25, etc.
  // Capped at target-1 so we never spawn the literal target element.
  function dynamicMaxQueue(boardCount: number): number {
    const tierBonus = Math.max(0, Math.floor((boardCount - 5) / 10));
    const cap = Math.max(level.maxQueueElement, target - 1);
    return Math.min(level.maxQueueElement + tierBonus, cap);
  }

  function randomAvailableElement(maxElement: number, minElement = 1): number {
    const min = Math.max(1, Math.min(118, Math.floor(minElement)));
    const max = Math.max(min, Math.min(118, Math.floor(maxElement)));
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function currentQueueDecay(): number {
    if (mode === "pure-hydrogen") return 0.18;
    const discoveredBonus = Math.floor(
      Math.max(0, discoveredElements.length - 1) / DISCOVERY_DECAY_STEP,
    );
    return Math.min(0.9, (level.queueDecay ?? 0.65) + discoveredBonus * DISCOVERY_DECAY_BOOST);
  }

  function raiseAtomForEmission(atom: number): number {
    if (atom < 1) return atom;
    return Math.min(118, atom + 1);
  }

  function queueFloorFromBoard(board: Board): number {
    let floor = 1;
    // Combine two depletion drivers:
    //  - emissionUnlockIndex (every 5 min, all levels)
    //  - spawnFloorIndex     (every 2 min, lvl 10+)
    const depletionTier = Math.max(0, emissionUnlockIndex, spawnFloorIndex);
    for (let atom = 1; atom <= depletionTier; atom++) {
      const stillOnBoard = board.some((ball) => ball.stoneHp == null && ball.atom === atom);
      if (stillOnBoard) {
        floor = atom;
        break;
      }
      floor = atom + 1;
    }
    return Math.min(118, floor);
  }

  function missingLowAtomFloorIndex(board: Board): number {
    let missingThrough = 0;
    for (let atom = 1; atom < target; atom++) {
      const stillOnBoard = board.some((ball) => ball.stoneHp == null && ball.atom === atom);
      if (stillOnBoard) break;
      missingThrough = atom;
    }
    return missingThrough;
  }

  function generateQueueAtom(maxElement: number, board: Board, forceUniform = false): number {
    const minElement = queueFloorFromBoard(board);
    const effectiveMax = Math.max(minElement, maxElement);
    if (forceUniform) return randomAvailableElement(effectiveMax, minElement);
    const shiftedMax = effectiveMax - minElement + 1;
    return generateQueueElement(shiftedMax, currentQueueDecay()) + minElement - 1;
  }

  function discoveredSeedAtoms(maxSeedAtom: number): number[] {
    const atoms = discoveredElements.filter((atom) => atom >= 1 && atom <= maxSeedAtom);
    return atoms.length > 0 ? atoms : [1];
  }

  function grantPowerUpsForMerges(mergeCount: number) {
    if (gravityEnabled && mergeCount > 0) {
      setGravityMergeProgress((progress) => {
        const total = progress + mergeCount;
        const earned = Math.floor(total / 30);
        if (earned > 0) {
          setGravityCharges((g) => g + earned);
          spawnPopup(earned > 1 ? `GRAVITY READY x${earned}` : "GRAVITY READY");
          if (canIntroducePowerUps) {
            showTip(
              "feature-gravity-powerup",
              "Gravity power-up ready!",
              "Every 30 successful merges earns Gravity. Tap the Gravity button to pull atoms upward; any combinations formed still count toward Grab progress and quest progress.",
            );
          }
        }
        return total % 30;
      });
    }
    if (mergeCount < 4) return;
    if (catalystEnabled) {
      setCatalystCharges((g) => g + 1);
      spawnPopup("CATALYST READY");
      if (canIntroducePowerUps) {
        showTip(
          "feature-catalyst-powerup",
          "Catalyst Aura ready!",
          "A 4x combo unlocked Catalyst Aura. Activate it to double fusion range for your next 5 shots.",
        );
      }
    }
  }

  function grantFusionJump(count = 1) {
    if (!fusionJumpEnabled || count <= 0) return;
    setFusionJumpCharges((g) => g + count);
    spawnPopup(count > 1 ? `⏭ FUSION JUMP ×${count}` : "⏭ FUSION JUMP READY");
    if (canIntroducePowerUps) {
      showTip(
        "feature-fusion-jump-powerup",
        "⏭ Fusion Jump ready!",
        "Breaking a Stone completely unlocks Fusion Jump. Arm it to make your next merge skip one element tier.",
      );
    }
  }

  function applyShotMilestones(nextShots: number) {
    if (transmuteEnabled && nextShots > 0 && nextShots % TRANSMUTE_SHOT_INTERVAL === 0) {
      setTransmuteCharges((g) => g + 1);
      spawnPopup("🔀 TRANSMUTE READY");
      if (canIntroducePowerUps) {
        showTip(
          "feature-transmute-powerup",
          "🔀 Transmute Shot ready!",
          "Every 30 shots earns Transmute. Activate it to reroll your queued atom into a higher-tier atom.",
        );
      }
    }
    if (gammaEnabled && nextShots > 0 && nextShots % GAMMA_SHOT_INTERVAL === 0) {
      setGammaCharges((g) => g + 1);
      spawnPopup("☢ GAMMA READY");
      if (canIntroducePowerUps) {
        showTip(
          "feature-gamma-powerup",
          "☢ Gamma Bomb ready!",
          `Every 40 shots after level ${GAMMA_MIN_LEVEL} earns a Gamma Bomb. Activate it, aim, and fire: a slow heavy projectile clears every non-stone atom in a wide radius.`,
        );
      }
    }
    setCatalystShotsRemaining((remaining) => Math.max(0, remaining - 1));
  }

  function makeNextQueueSlot(
    maxElement: number,
    board: Board = balls,
  ): {
    atom: number;
    shimmer: boolean;
    eGun: boolean;
    blank: boolean;
    unstable: boolean;
  } {
    if (powerUpStage === "unstable") {
      return { atom: Math.random() < 0.5 ? 2 : 10, shimmer: false, eGun: false, blank: false, unstable: false };
    }
    if (powerUpStage === "fusion-jump") {
      return { atom: 17, shimmer: false, eGun: false, blank: false, unstable: false };
    }
    if (powerUpStage === "blank") {
      return { atom: 1, shimmer: false, eGun: false, blank: true, unstable: false };
    }
    const plannedChallengeAtom = isMoleculeChallenge ? challengeQueuePlanRef.current.shift() : undefined;
    if (plannedChallengeAtom != null) {
      return {
        atom: plannedChallengeAtom,
        shimmer: false,
        eGun: false,
        blank: false,
        unstable: false,
      };
    }
    const eGunEligible = eGunEnabled && eGunCooldownSlots.current <= 0;
    const eGunChance = EGUN_CHANCE + Math.floor(elapsedMs / EMISSION_UNLOCK_INTERVAL_MS) * EGUN_CHANCE_STEP;
    const eGun = eGunEligible && Math.random() < eGunChance;
    if (eGun) eGunCooldownSlots.current = EGUN_MIN_SHOT_GAP;
    else if (eGunCooldownSlots.current > 0) eGunCooldownSlots.current -= 1;
    const blank = !eGun && blankEnabled && Math.random() < BLANK_ATOM_CHANCE;
    const shimmer = !eGun && !blank && shimmerEnabled && Math.random() < POWER_UP_CHANCE;
    const atom = generateQueueAtom(maxElement, board, shimmer);
    const unstable =
      !eGun && !blank && unstableEnabled && atom > 1 && Math.random() < UNSTABLE_SPAWN_CHANCE;
    if (canIntroducePowerUps && unstable) {
      showTip(
        "feature-unstable-isotope-first-spawn",
        "Unstable atom",
        "An unstable atom is shielded like electron shells — row 1 takes 2 hits, row 2 takes 8, the rest 16. Merge it before the shells decay for 2× points.",
        "danger",
      );
    }
    return {
      atom,
      shimmer,
      eGun,
      blank,
      unstable,
    };
  }

  function advanceQueueAfterFiredShot(board: Board = balls) {
    const nextSlot = makeNextQueueSlot(dynamicMaxQueue(board.length), board);
    setQueue((q) => [...q.slice(1), nextSlot.atom]);
    setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
    setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
    setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
    setUnstableQueue((u) => [...u.slice(1), nextSlot.unstable]);
  }

  function showMergeComboFx(merges: MergeEvent[]) {
    if (merges.length <= 1) return;
    const fxId = Date.now();
    setMergeComboFx(
      merges.slice(1).map((merge, index) => ({
        id: fxId + index,
        x: merge.x,
        y: merge.y,
        depth: merge.chainDepth,
        atom: merge.resultAtomicNumber,
        isotope: Boolean(merge.stabilizedIsotope),
      })),
    );
    window.setTimeout(
      () => setMergeComboFx((current) => current.filter((fx) => fx.id < fxId || fx.id >= fxId + merges.length)),
      MERGE_COMBO_START_MS + merges.length * MERGE_COMBO_STEP_MS + MERGE_COMBO_END_PAD_MS,
    );
  }

  function spawnPopup(text: string) {
    const id = ++popupId.current;
    setPopups((p) => [...p, { id, text, x: 50 + (Math.random() * 20 - 10), y: 30 }]);
    setTimeout(() => setPopups((p) => p.filter((x) => x.id !== id)), 900);
  }

  function showStageClearAnimation(stats: {
    stars: number;
    score: number;
    shots: number;
    bestCombo: number;
    compound?: CompoundDefinition;
  }) {
    if (stageClearTimeoutRef.current !== null) {
      window.clearTimeout(stageClearTimeoutRef.current);
    }
    // Record the cleared run immediately so campaign-map stats update
    // even if the player exits before the result modal is dismissed.
    if (!runRecordedRef.current) {
      runRecordedRef.current = true;
      recordLevelRun(levelId, {
        score: stats.score,
        shots: stats.shots,
        powerUpsUsed: runPowerUpsUsedRef.current,
        won: true,
      });
    }
    // Clear any in-flight score/merge popups so they don't bleed into the
    // win animation or appear behind the result modal.
    setPopups([]);
    if (level.powerUpStage) {
      setWon(true);
      setBusy(false);
      stageClearTimeoutRef.current = null;
      return;
    }
    setStageClearFx(stats);
    spawnPopup(stats.compound ? "COMPOUND FORMED" : "TARGET FORMED");
    stageClearTimeoutRef.current = window.setTimeout(() => {
      setStageClearFx(null);
      // Small extra beat so the fade-out of the animation completes before
      // the score modal mounts on top.
      setWinChoice(stats);
      setBusy(false);
      stageClearTimeoutRef.current = null;
    }, STAGE_CLEAR_ANIMATION_MS + 400);
  }

  function completePowerUpStage(stage: PowerUpStageId | undefined = powerUpStage, scoreOverride = score) {
    if (!stage || powerUpStageCompletedRef.current || won || gameOver) return;
    powerUpStageCompletedRef.current = true;
    const stars = 3;
    const clearScore = scoreOverride + CHALLENGE_CLEAR_SCORE;
    setScore(clearScore);
    addScore(CHALLENGE_CLEAR_SCORE);
    setEarnedStars(stars);
    setLevelStars(levelId, stars);
    reportQuestProgress({ levelCleared: true, starsEarned: stars });
    unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
    sfx(playWinSound);
    haptic([30, 60, 30, 60, 80]);
    trackLevelWin(levelId, clearScore, shots, highest, mode);
    showStageClearAnimation({ stars, score: clearScore, shots, bestCombo: runBestCombo });
  }

  function completePowerUpStageAfterDelay(stage: PowerUpStageId | undefined = powerUpStage, scoreOverride = score) {
    if (!stage || powerUpStageCompletedRef.current || won || gameOver) return;
    powerUpStageCompletedRef.current = true;
    window.setTimeout(() => {
      powerUpStageCompletedRef.current = false;
      completePowerUpStage(stage, scoreOverride);
    }, POWER_UP_CLEAR_DELAY_MS);
  }

  function failPowerUpStage(message: string) {
    if (!isPowerUpStage || powerUpStageCompletedRef.current || won || gameOver) return;
    powerUpStageCompletedRef.current = true;
    spawnPopup(message);
    trackGameOver(levelId, score, shots, highest, mode);
    setGameOver(true);
    haptic([50, 80, 50, 80, 200]);
  }

  useEffect(() => {
    return () => {
      if (stageClearTimeoutRef.current !== null) {
        window.clearTimeout(stageClearTimeoutRef.current);
      }
      if (projectileFrameRef.current !== null) {
        window.cancelAnimationFrame(projectileFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (won || gameOver) {
      clearSavedRun();
    }
    if ((won || gameOver) && !runRecordedRef.current) {
      runRecordedRef.current = true;
      recordLevelRun(levelId, {
        score,
        shots,
        powerUpsUsed: runPowerUpsUsedRef.current,
        won,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, gameOver]);

  // === sizing ===
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardW, setBoardW] = useState(360);
  const [boardH, setBoardH] = useState(480);
  useEffect(() => {
    const update = () => {
      setBoardW(boardRef.current?.clientWidth ?? 360);
      setBoardH(boardRef.current?.clientHeight ?? 480);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const cellSize = useMemo(
    () => Math.floor((boardW - 8) / level.gridCols),
    [boardW, level.gridCols],
  );
  const ballSize = Math.floor(cellSize * 0.86);
  const R = ballSize / 2;
  // Per-element scaling — keep in sync with ElementBall's periodScale.
  const periodScaleFor = useCallback((atom: number) => {
    const p = Math.max(1, Math.min(8, ELEMENTS[atom - 1]?.period ?? 4));
    return 1 + (p - 4) * 0.11;
  }, []);
  const radiusFor = useCallback(
    (atom: number) => (ballSize / 2) * periodScaleFor(atom),
    [ballSize, periodScaleFor],
  );
  const sizeFor = useCallback(
    (atom: number) => ballSize * periodScaleFor(atom),
    [ballSize, periodScaleFor],
  );
  // Stone projectile geometry (matches a period-8 ball).
  const stoneR = (ballSize / 2) * (1 + (8 - 4) * 0.11);
  const stoneSize = stoneR * 2;
  // Effective projectile radius/size — uses stone dims when a stone is loaded.
  const eGunR = Math.max(12, ballSize * 0.34);
  const eGunSize = eGunR * 2;
  const gammaR = Math.max(stoneR * 0.85, ballSize * 0.55);
  const gammaSize = gammaR * 2;
  const projShotR = pendingGamma
      ? gammaR
    : pendingStone
      ? stoneR
      : currentIsEGun
        ? eGunR
        : radiusFor(current);
  const projShotSize = pendingGamma
      ? gammaSize
    : pendingStone
      ? stoneSize
      : currentIsEGun
        ? eGunSize
        : sizeFor(current);
  const showCatalystShotRadius = catalystShotsRemaining > 0 && !pendingStone && !currentIsEGun;
  // Visual ring now matches the ACTUAL catalyst merge reach: any atom whose
  // center is within (projR + otherR) * CATALYST_ADJ_FACTOR will merge.
  // Approximate otherR ≈ projShotR for the preview ring.
  const catalystShotRadius = projShotR * 2 * CATALYST_ADJ_FACTOR;
  const launcherX = boardW / 2;
  const launcherY = boardH - 8; // near bottom of board
  const TOP_PAD = 6;
  const SIDE_PAD = 4;

  // Resolve overlaps across all balls including stones. Stones never move
  // and ordinary atoms get pushed away from them. Used after placements and
  // shockwaves to guarantee no two balls visually overlap.
  const relaxBoard = useCallback(
    (board: Board): Board => {
      const list = board.map((b) => ({ ...b }));
      for (let iter = 0; iter < 24; iter++) {
        let moved = false;
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const a = list[i];
            const b = list[j];
            if (a.stoneHp != null && b.stoneHp != null) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            const min = a.r + b.r;
            if (d < min) {
              const push = min - d + 0.5;
              const ux = dx / d;
              const uy = dy / d;
              if (a.stoneHp != null) {
                b.x += ux * push;
                b.y += uy * push;
              } else if (b.stoneHp != null) {
                a.x -= ux * push;
                a.y -= uy * push;
              } else {
                a.x -= ux * (push / 2);
                a.y -= uy * (push / 2);
                b.x += ux * (push / 2);
                b.y += uy * (push / 2);
              }
              moved = true;
            }
          }
        }
        for (const o of list) {
          o.x = Math.max(SIDE_PAD + o.r, Math.min(boardW - SIDE_PAD - o.r, o.x));
          o.y = Math.max(TOP_PAD + o.r, o.y);
        }
        if (!moved) break;
      }
      return list;
    },
    [boardW, SIDE_PAD, TOP_PAD],
  );

  const continuePressureSteps =
    continuingPastTarget && continueStartedElapsedMs != null
      ? Math.max(0, Math.floor((elapsedMs - continueStartedElapsedMs) / 30_000))
      : 0;
  const survivalPressurePct = mode === "survival" ? Math.floor(elapsedMs / 60_000) * 0.05 : 0;
  const pendingStonePressure = pendingStone ? 1 : 0;
  const dangerZonePct = Math.min(
    0.85,
    0.2 +
      (stoneSpawnCount + pendingStonePressure) * 0.1 +
      continuePressureSteps * 0.03 +
      survivalPressurePct,
  );
  const dangerY = Math.max(TOP_PAD + ballSize, boardH * (1 - dangerZonePct));

  const geo: Geo = useMemo(
    () => ({
      width: boardW,
      height: boardH,
      radius: R,
      leftPad: SIDE_PAD,
      rightPad: SIDE_PAD,
      topPad: TOP_PAD,
      // danger line starts at a 20% red zone, rises by 10% per Stone, and rises during score-mode continuation.
      dangerY,
    }),
    [boardW, boardH, R, dangerY],
  );

  function createSeededBoard(): Board {
    if (target < SEEDED_BOARD_MIN_TARGET) {
      // SCREENSHOT_SEED: temporary seeding for marketing screenshots
    }
    const maxSeedAtom = Math.max(1, target - SEEDED_BOARD_TARGET_OFFSET);
    const availableAtoms = discoveredSeedAtoms(maxSeedAtom);
    const count =
      SEEDED_BOARD_MIN_ATOMS +
      Math.floor(Math.random() * (SEEDED_BOARD_MAX_ATOMS - SEEDED_BOARD_MIN_ATOMS + 1));
    const seeded: Board = [];
    const minAtomRadius = radiusFor(1);
    const usableWidth = Math.max(minAtomRadius * 2, boardW - SIDE_PAD * 2 - minAtomRadius * 2);
    for (let i = 0; i < count; i++) {
      const atom = availableAtoms[Math.floor(Math.random() * availableAtoms.length)];
      const r = radiusFor(atom);
      const laneX = SIDE_PAD + minAtomRadius + (usableWidth * (i + 0.5)) / count;
      const jitter = (Math.random() - 0.5) * Math.max(0, usableWidth / count - r * 2);
      seeded.push(maybeMakeUnstable({
        id: nextBallId(),
        x: Math.max(SIDE_PAD + r, Math.min(boardW - SIDE_PAD - r, laneX + jitter)),
        y: TOP_PAD + r + Math.random() * Math.max(4, r * 0.35),
        atom,
        r,
      }));
    }
    return seeded;
  }

  function maybeMakeUnstable(ball: Ball, chance = UNSTABLE_SPAWN_CHANCE): Ball {
    if (!unstableEnabled || ball.stoneHp != null || ball.atom <= 1 || Math.random() >= chance) return ball;
    showTip(
      "feature-unstable-isotope-first-spawn",
      "Unstable atom",
      "An unstable atom is shielded like electron shells — row 1 takes 2 hits, row 2 takes 8, the rest 16. Merge it before the shells decay for 2× points.",
      "danger",
    );
    return { ...ball, unstableShots: isotopeChargeCapacity(ball.atom) };
  }

  function createMoleculeChallengeBoard(compound: CompoundDefinition | null): Board {
    if (!compound) return createSeededBoard();
    const recipeAtoms = atomsForCompound(compound);
    const highestRecipeAtom = Math.max(...recipeAtoms, 1);
    const startingAtom = level.id >= 15 ? Math.max(1, highestRecipeAtom - 1) : highestRecipeAtom;
    const atoms = compound.id === "water" ? [7, 7, 1, 1] : [startingAtom];
    const count = atoms.length;
    const maxR = Math.max(...atoms.map((atom) => radiusFor(atom)), radiusFor(1));
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(count))));
    const rows = Math.ceil(count / cols);
    const spacingX = Math.max(maxR * 2.4, Math.min(boardW / (cols + 1), maxR * 3.2));
    const spacingY = Math.max(maxR * 2.25, maxR * 2.7);
    const startX = boardW / 2 - ((cols - 1) * spacingX) / 2;
    const startY = TOP_PAD + maxR + Math.max(8, maxR * 0.5);
    return atoms.map((atom, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const r = radiusFor(atom);
      return {
        id: nextBallId(),
        x: Math.max(SIDE_PAD + r, Math.min(boardW - SIDE_PAD - r, startX + col * spacingX)),
        y: startY + row * spacingY + (rows > 1 && col % 2 === 1 ? maxR * 0.18 : 0),
        atom,
        r,
      };
    });
  }

  function moleculeChallengeQueuePrefix(compound: CompoundDefinition | null): number[] {
    if (!compound) return [];
    if (compound.id === "water") return [];
    const recipeAtoms = atomsForCompound(compound);
    const highestRecipeAtom = Math.max(...recipeAtoms, 1);
    let skippedHighest = false;
    return recipeAtoms.filter((atom) => {
      if (atom === highestRecipeAtom && !skippedHighest) {
        skippedHighest = true;
        return false;
      }
      return true;
    });
  }

  function boardBall(atom: number, x: number, y: number, unstable = false): Ball {
    return {
      id: nextBallId(),
      x,
      y,
      atom,
      r: radiusFor(atom),
      unstableShots: unstable ? isotopeChargeCapacity(atom) : undefined,
    };
  }

  function boardStone(x: number, y: number): Ball {
    const r = stoneR;
    return {
      id: nextBallId(),
      x,
      y,
      atom: -1,
      r,
      stoneHp: STONE_MAX_HP,
      stoneMaxHp: STONE_MAX_HP,
    };
  }

  function createPowerUpStageBoard(stage?: PowerUpStageId): Board {
    const cx = boardW / 2;
    const top = TOP_PAD + radiusFor(1) + 10;
    const spacing = Math.max(ballSize * 1.45, 44);
    switch (stage) {
      case "shimmer":
        return [1, 2, 3, 1, 2, 3, 1, 2].map((atom, i) =>
          boardBall(atom, SIDE_PAD + radiusFor(atom) + (i % 4) * spacing, top + Math.floor(i / 4) * spacing),
        );
      case "unstable":
        return [boardBall(2, cx - spacing, top + spacing, true), boardBall(10, cx + spacing, top + spacing, true)];
      case "grab":
        return [
          boardBall(1, cx - spacing * 1.5, top),
          boardBall(1, cx + spacing * 1.5, top + spacing * 1.1),
          boardBall(2, cx - spacing * 0.5, top + spacing * 0.5),
          boardBall(2, cx + spacing * 0.6, top + spacing * 1.7),
          boardBall(3, cx - spacing * 1.2, top + spacing * 2.1),
          boardBall(3, cx + spacing * 1.4, top + spacing * 2.4),
          boardBall(4, cx, top + spacing * 2.9),
          boardBall(5, cx + spacing * 0.2, top + spacing * 3.7),
        ];
      case "egun":
        return [boardBall(5, cx, top + spacing), boardBall(3, cx, top + spacing * 2.1)];
      case "gravity":
        return [1, 1, 2, 2, 3, 3, 4, 4, 5].map((atom, i) =>
          boardBall(
            atom,
            SIDE_PAD + radiusFor(atom) + ((i * 73) % Math.max(80, boardW - 70)),
            top + ((i * 47) % Math.max(140, boardH * 0.48)),
          ),
        );
      case "stone":
        return [1, 2, 3, 4, 5, 6].map((atom, i) =>
          boardBall(atom, SIDE_PAD + radiusFor(atom) + i * (spacing * 0.8), top),
        );
      case "transmute":
        return [boardBall(4, cx, top + spacing)];
      case "fusion-jump":
        return [boardBall(17, cx, top + spacing)];
      case "catalyst":
        return Array.from({ length: 24 }, (_, i) => {
          const atom = 1 + (i % 3);
          const row = Math.floor(i / 6);
          const col = i % 6;
          return boardBall(atom, cx - spacing * 2.4 + col * spacing * 0.9, top + row * spacing * 0.78);
        });
      case "emission":
        return [boardBall(7, cx - spacing, top), boardBall(8, cx + spacing, top + spacing)];
      case "gamma":
        return Array.from({ length: 26 }, (_, i) => {
          const atom = 1 + (i % 6);
          const row = Math.floor(i / 7);
          const col = i % 7;
          return boardBall(atom, cx - spacing * 2.6 + col * spacing * 0.86, top + row * spacing * 0.76);
        });
      case "blank": {
        const bromine = boardBall(35, cx, top + spacing * 1.5);
        const gap = bromine.r + stoneR * 0.82;
        return [
          bromine,
          boardStone(cx - gap, bromine.y),
          boardStone(cx + gap, bromine.y),
          boardStone(cx, bromine.y - gap),
          boardStone(cx, bromine.y + gap),
        ];
      }
      case "queue-shuffle":
        return [boardBall(8, cx - spacing, top), boardBall(8, cx + spacing, top + spacing)];
      default:
        return createSeededBoard();
    }
  }

  function powerUpStageQueuePrefix(stage?: PowerUpStageId): number[] {
    switch (stage) {
      case "shimmer":
        return [1, 1, 2, 3];
      case "unstable":
        return [2, 10, 2, 10];
      case "egun":
        return [1, 1, 1, 1];
      case "stone":
        return [10, 9, 8, 1];
      case "transmute":
        return [3, 1, 1, 2];
      case "fusion-jump":
        return [17, 17, 17, 17];
      case "blank":
        return [1, 1, 1, 1];
      default:
        return [];
    }
  }

  // Place the 4 shuffle atoms across the top border of the board.
  function buildShuffleStartBoard(atoms: number[]): Board {
    if (atoms.length === 0) return createEmptyBoard();
    const count = atoms.length;
    const minR = Math.max(...atoms.map((a) => radiusFor(a)));
    const usableWidth = Math.max(minR * 2, boardW - SIDE_PAD * 2 - minR * 2);
    return atoms.map((atom, i) => {
      const r = radiusFor(atom);
      const laneX = SIDE_PAD + minR + (usableWidth * (i + 0.5)) / count;
      return maybeMakeUnstable({
        id: nextBallId(),
        x: Math.max(SIDE_PAD + r, Math.min(boardW - SIDE_PAD - r, laneX)),
        y: TOP_PAD + r + 2,
        atom,
        r,
      });
    });
  }

  function reshuffle() {
    if (shufflesLeft <= 0) return;
    setShuffleAtoms(generateShuffleAtoms());
    setShufflesLeft((n) => Math.max(0, n - 1));
  }

  function confirmShuffleStart() {
    const seeded = buildShuffleStartBoard(shuffleAtoms);
    setBalls(seeded);
    const initialHighest = Math.max(1, getHighestOnBoard(seeded));
    if (initialHighest > 1) setHighestElement(initialHighest);
    setHighest(initialHighest);
    const discoveries = seeded
      .map((b) => b.atom)
      .filter((n, i, atoms) => n > 1 && atoms.indexOf(n) === i && !discoveredElements.includes(n));
    if (discoveries.length > 0) registerDiscoveries(discoveries);
    setShuffleStartOpen(false);
  }

  function stoneSurfaceRadius(stone: Ball, px: number, py: number): number {
    const angle = Math.atan2(py - stone.y, px - stone.x);
    return stone.r * 0.88 * stoneRadiusFactor(stone.id, angle);
  }

  function projectileOverlapsBall(ball: Ball, px: number, py: number, projectileR: number): boolean {
    const dx = px - ball.x;
    const dy = py - ball.y;
    const obstacleR = ball.stoneHp != null ? stoneSurfaceRadius(ball, px, py) : ball.r;
    const min = projectileR + obstacleR;
    return dx * dx + dy * dy < min * min;
  }

  function firstProjectileContact(
    ball: Ball,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    projectileR: number,
  ): { t: number; x: number; y: number; nx: number; ny: number } {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      const mx = fromX + (toX - fromX) * mid;
      const my = fromY + (toY - fromY) * mid;
      if (projectileOverlapsBall(ball, mx, my, projectileR)) hi = mid;
      else lo = mid;
    }
    const x = fromX + (toX - fromX) * hi;
    const y = fromY + (toY - fromY) * hi;
    if (ball.stoneHp != null) {
      const angle = Math.atan2(y - ball.y, x - ball.x);
      const normal = stoneSurfaceNormal(ball.id, angle);
      return { t: hi, x, y, nx: normal.x, ny: normal.y };
    }
    const mag = Math.hypot(x - ball.x, y - ball.y) || 1;
    return { t: hi, x, y, nx: (x - ball.x) / mag, ny: (y - ball.y) / mag };
  }

  /**
   * Ray-cast a projectile from the launcher at `angleDeg`. Walks pixel steps,
   * reflects off stone faces, and stops at the ceiling or first non-stone hit.
   */
  function castRay(angleDeg: number): {
    x: number;
    y: number;
    path: { x: number; y: number }[];
    hitId: number | null;
    dx: number;
    dy: number;
    stoneHitIds: number[];
  } | null {
    const rad = (angleDeg * Math.PI) / 180;
    let dx = Math.sin(rad);
    let dy = -Math.cos(rad);
    let x = launcherX;
    let y = launcherY;
    const bouncedStoneIds: number[] = [];
    const recentlyBouncedStoneIds = new Set<number>();
    const projR = projShotR;
    const step = Math.max(1, projR / 4);
    const path: { x: number; y: number }[] = [{ x, y }];
    const minX = SIDE_PAD + projR;
    const maxX = boardW - SIDE_PAD - projR;
    const ceilingY = TOP_PAD + projR;
    const maxIter = 6000;
    for (let i = 0; i < maxIter; i++) {
      const prevX = x;
      const prevY = y;
      x += dx * step;
      y += dy * step;
      // bounce off side walls
      if (x < minX) {
        x = minX + (minX - x);
        dx = -dx;
      }
      if (x > maxX) {
        x = maxX - (x - maxX);
        dx = -dx;
      }
      // hit ceiling
      if (y <= ceilingY) {
        const lx = Math.max(minX, Math.min(maxX, x));
        path.push({ x: lx, y: ceilingY });
        return { x: lx, y: ceilingY, path, hitId: null, dx, dy, stoneHitIds: bouncedStoneIds };
      }
      // off the bottom
      if (y > boardH) return null;

      for (const id of Array.from(recentlyBouncedStoneIds)) {
        const stone = balls.find((b) => b.id === id);
        if (
          !stone ||
          Math.hypot(x - stone.x, y - stone.y) >
            projR + stoneSurfaceRadius(stone, x, y) + step * 4
        ) {
          recentlyBouncedStoneIds.delete(id);
        }
      }

      // collision with existing balls
      let hit:
        | { ball: Ball; t: number; x: number; y: number; nx: number; ny: number }
        | null = null;
      for (let b = 0; b < balls.length; b++) {
        // Stones ricochet shots unless the reflected path would head back downward.
        if (balls[b].stoneHp != null && recentlyBouncedStoneIds.has(balls[b].id)) continue;
        if (!projectileOverlapsBall(balls[b], x, y, projR)) continue;
        const contact = firstProjectileContact(balls[b], prevX, prevY, x, y, projR);
        if (!hit || contact.t < hit.t) hit = { ball: balls[b], ...contact };
      }
      if (hit) {
        const lx = Math.max(minX, Math.min(maxX, hit.x));
        const ly = Math.max(ceilingY, hit.y);
        const hitBall = hit.ball;
        path.push({ x: lx, y: ly });
        if (hitBall.stoneHp != null && !currentIsBlank && !pendingStone) {
          const nx = hit.nx;
          const ny = hit.ny;
          const dot = dx * nx + dy * ny;
          const reflectedX = dx - 2 * dot * nx;
          const reflectedY = dy - 2 * dot * ny;
          const reflectedMag = Math.hypot(reflectedX, reflectedY) || 1;
          const nextDx = reflectedX / reflectedMag;
          const nextDy = reflectedY / reflectedMag;
          if (nextDy > 0.12) {
            return { x: lx, y: ly, path, hitId: hitBall.id, dx, dy, stoneHitIds: bouncedStoneIds };
          }
          // Push every bounce — repeated hits on the same stone in one shot
          // should each count as a hit (e.g. stone -> wall -> same stone).
          bouncedStoneIds.push(hitBall.id);
          recentlyBouncedStoneIds.add(hitBall.id);
          dx = nextDx;
          dy = nextDy;
          x = lx + nx * (step * 2);
          y = ly + ny * (step * 2);
          continue;
        }
        return { x: lx, y: ly, path, hitId: hitBall.id, dx, dy, stoneHitIds: bouncedStoneIds };
      }
      path.push({ x, y });
    }
    return null;
  }

  function castStraightRay(
    angleDeg: number,
  ): { path: { x: number; y: number }[]; dx: number; dy: number } | null {
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const minX = SIDE_PAD + eGunR;
    const maxX = boardW - SIDE_PAD - eGunR;
    const minY = TOP_PAD + eGunR;
    const candidates: number[] = [];
    if (dx < -0.001) candidates.push((minX - launcherX) / dx);
    if (dx > 0.001) candidates.push((maxX - launcherX) / dx);
    if (dy < -0.001) candidates.push((minY - launcherY) / dy);
    const distance = candidates.filter((t) => t > 0).sort((a, b) => a - b)[0];
    if (!distance) return null;
    const end = {
      x: Math.max(minX, Math.min(maxX, launcherX + dx * distance)),
      y: Math.max(minY, launcherY + dy * distance),
    };
    const steps = Math.max(8, Math.ceil(distance / Math.max(8, eGunR)));
    const path = Array.from({ length: steps + 1 }, (_, i) => ({
      x: launcherX + (end.x - launcherX) * (i / steps),
      y: launcherY + (end.y - launcherY) * (i / steps),
    }));
    return { path, dx, dy };
  }

  function distanceToSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const vx = bx - ax;
    const vy = by - ay;
    const wx = px - ax;
    const wy = py - ay;
    const lenSq = vx * vx + vy * vy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (wx * vx + wy * vy) / lenSq));
    const cx = ax + vx * t;
    const cy = ay + vy * t;
    return Math.hypot(px - cx, py - cy);
  }

  function cancelProjectileAnimation() {
    if (projectileFrameRef.current === null) return;
    window.cancelAnimationFrame(projectileFrameRef.current);
    projectileFrameRef.current = null;
  }

  function animateProjectilePath(
    path: { x: number; y: number }[],
    totalMs: number,
    onComplete: () => void,
  ) {
    if (path.length === 0) {
      onComplete();
      return;
    }
    cancelProjectileAnimation();
    const startMs = performance.now();
    const lastIndex = path.length - 1;
    setProjectile(path[0]);

    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - startMs) / Math.max(1, totalMs)));
      const exact = progress * lastIndex;
      const index = Math.min(lastIndex, Math.floor(exact));
      const nextIndex = Math.min(lastIndex, index + 1);
      const local = exact - index;
      const from = path[index];
      const to = path[nextIndex];
      setProjectile({
        x: from.x + (to.x - from.x) * local,
        y: from.y + (to.y - from.y) * local,
      });
      if (progress >= 1) {
        projectileFrameRef.current = null;
        onComplete();
        return;
      }
      projectileFrameRef.current = window.requestAnimationFrame(tick);
    };

    projectileFrameRef.current = window.requestAnimationFrame(tick);
  }

  function damageStones(
    source: Board,
    damageById: Map<number, number>,
  ): { balls: Board; bonus: number; hitIds: Set<number>; destroyedCount: number } {
    if (damageById.size === 0) {
      return { balls: source, bonus: 0, hitIds: new Set(), destroyedCount: 0 };
    }
    const hitIds = new Set<number>();
    let bonus = 0;
    let destroyedCount = 0;
    const initialR = (ballSize / 2) * (1 + (8 - 4) * 0.11);
    const ballsAfterDamage = source
      .map((b) => {
        if (b.stoneHp == null) return b;
        const dmg = damageById.get(b.id) ?? 0;
        if (dmg <= 0) return b;
        hitIds.add(b.id);
        const maxHp = b.stoneMaxHp ?? STONE_MAX_HP;
        const newHp = b.stoneHp - dmg;
        if (newHp <= 0) {
          destroyedCount += 1;
          bonus += Math.floor(maxHp * 250 * level.scoreMultiplier);
          return null;
        }
        return { ...b, stoneHp: newHp, r: Math.max(initialR * 0.35, initialR * (newHp / maxHp)) };
      })
      .filter((b): b is Ball => b !== null);
    return { balls: ballsAfterDamage, bonus, hitIds, destroyedCount };
  }

  function stoneDamageFromMergeVicinity(
    source: Board,
    merges: { x: number; y: number }[],
  ): Map<number, number> {
    const damage = new Map<number, number>();
    for (const merge of merges) {
      for (const stone of source) {
        if (stone.stoneHp == null) continue;
        const outerR = stoneSurfaceRadius(stone, merge.x, merge.y);
        if (Math.hypot(stone.x - merge.x, stone.y - merge.y) <= outerR + radiusFor(1) * 1.6) {
          damage.set(stone.id, (damage.get(stone.id) ?? 0) + 1);
        }
      }
    }
    return damage;
  }

  function shoot() {
    if (busy || gameOver || won || inventoryPickerOpen || paused || settingsOpen || playStylePromptOpen || confirmAction) return;
    primeAudio();
    if (musicEnabled) startAmbientMusic();
    trackShot(levelId, pendingStone ? -1 : currentIsEGun ? 0 : current, aimDeg, mode);
    queueUndoRef.current = null;
    setPendingReversiblePowerUp(null);
    if (pendingGamma) {
      const hit = castRay(aimDeg);
      if (!hit) return;
      setBusy(true);
      sfx(playShootSound);
      haptic([10, 15, 10]);
      const path = hit.path;
      // Slow, heavy projectile — about 1.6× normal travel time.
      const totalMs = Math.min(560, 100 + path.length * 6);
      animateProjectilePath(path, totalMs, () => {
        setProjectile(null);
        setGravityFxId(null);
        fireGamma(hit.x, hit.y);
      });
      return;
    }
    if (currentIsEGun && !pendingStone) {
      const beam = castStraightRay(aimDeg);
      if (!beam) return;
      setBusy(true);
      sfx(playShootSound);
      haptic(15);
      setProjectile(beam.path[0]);
      setEGunBeamPath(beam.path);
      const totalMs = Math.min(220, 50 + beam.path.length * 3);
      animateProjectilePath(beam.path, totalMs, () => {
        advanceQueueAfterFiredShot();
        setProjectile(null);
        setEGunBeamPath(null);
        setGravityFxId(null);
        fireEGun(beam.path);
      });
      return;
    }
    const hit = castRay(aimDeg);
    if (!hit) return;
    setBusy(true);
    sfx(playShootSound);
    haptic(15);

    // animate projectile along path
    const path = hit.path;
    const baseMs = Math.min(560, 100 + path.length * 6);
    // Stones fly twice as fast.
    const totalMs = pendingStone ? baseMs / 2 : baseMs;
    animateProjectilePath(path, totalMs, () => {
      if (!pendingStone) advanceQueueAfterFiredShot();
      setProjectile(null);
      setGravityFxId(null);
      triggerImpact(hit.x, hit.y, hit.hitId, hit.dx, hit.dy, hit.stoneHitIds);
    });
  }

  function fireEGun(path: { x: number; y: number }[]) {
    const start = path[0];
    const end = path[path.length - 1];
    const hitIds = new Set<number>();
    const upgradedAtoms = new Set<number>();
    const updated = balls.map((b) => {
      if (b.stoneHp != null || b.atom >= 118) return b;
      if (distanceToSegment(b.x, b.y, start.x, start.y, end.x, end.y) > b.r + eGunR * 0.7)
        return b;
      hitIds.add(b.id);
      const atom = Math.min(118, b.atom + 1);
      upgradedAtoms.add(atom);
      return { ...b, atom, r: radiusFor(atom) };
    });
    const nextShots = shots + 1;
    setShots(nextShots);
    applyShotMilestones(nextShots);
    const updatedWithEffects = applyShotModeEffects(updated, nextShots);
    setBalls(updatedWithEffects);
    setWiggleIds(hitIds);
    setTimeout(() => setWiggleIds(new Set()), 380);
    setNoMergeStreak(0);
    if (upgradedAtoms.size > 0) {
      const discoveries = Array.from(upgradedAtoms).filter((n) => !discoveredElements.includes(n));
      if (discoveries.length > 0) {
        registerDiscoveries(discoveries);
        const firstDiscovery = [...discoveries].sort((a, b) => b - a)[0];
        if (firstDiscovery > 1) setDiscoveryEl(firstDiscovery);
      }
      reportQuestProgress({ discoveries, reachedAtomicNumbers: Array.from(upgradedAtoms) });
      setHighestElement(Math.max(highest, ...Array.from(upgradedAtoms)));
      setHighest((h) => Math.max(h, ...Array.from(upgradedAtoms)));
    }
    spawnPopup(hitIds.size > 0 ? `⚡ E-GUN +${hitIds.size}` : "⚡ E-GUN");
    haptic(hitIds.size > 0 ? [20, 40, 20] : 20);
    pushShotHistory({
      shot: nextShots,
      action: hitIds.size > 0 ? `E-Gun upgraded ${hitIds.size} atom${hitIds.size === 1 ? "" : "s"}` : "E-Gun fired",
      points: 0,
      powerUp: "E-Gun",
    });
    if (powerUpStage === "egun" && hitIds.size > 0) {
      completePowerUpStageAfterDelay("egun", score);
      return;
    }
    const reachedTarget = Array.from(upgradedAtoms).some((atom) => atom >= target);
    if (reachedTarget && !isMoleculeChallenge && !isPowerUpStage && !continuingPastTarget) {
      const nextHighest = Math.max(highest, ...Array.from(upgradedAtoms));
      const timeSec = (Date.now() - startTimeRef.current) / 1000;
      const stars = calculateStars(level, score, nextShots, runBestCombo, timeSec);
      setEarnedStars(stars);
      setLevelStars(levelId, stars);
      reportQuestProgress({ levelCleared: true, starsEarned: stars });
      unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
      sfx(playWinSound);
      haptic([30, 60, 30, 60, 80]);
      trackLevelWin(levelId, score, nextShots, nextHighest, mode);
      if (mode !== "campaign") setChallengeBestScore(mode, score);
      showStageClearAnimation({ stars, score, shots: nextShots, bestCombo: runBestCombo });
      return;
    }
    if (checkGameOver(updatedWithEffects, geo)) {
      trackGameOver(levelId, score, nextShots, highest, mode);
      setGameOver(true);
      haptic([50, 80, 50, 80, 200]);
    }
    setBusy(false);
  }

  function isNobleGasLocked(atom: number): boolean {
    return mode === "noble-gas-lock" && ELEMENTS[atom - 1]?.category === "noble-gas";
  }

  function fireGamma(ix: number, iy: number) {
    // Clear every non-stone atom within the gamma radius.
    const radius = gammaR * GAMMA_RADIUS_MULT;
    const hitIds = new Set<number>();
    const clearedAtoms: { atom: number; isotope: boolean }[] = [];
    const remaining: Board = balls.filter((b) => {
      if (b.stoneHp != null) return true;
      if (Math.hypot(b.x - ix, b.y - iy) > radius + b.r) return true;
      hitIds.add(b.id);
      clearedAtoms.push({ atom: b.atom, isotope: isActiveIsotope(b) });
      return false;
    });
    const nextShots = shots + 1;
    setShots(nextShots);
    applyShotMilestones(nextShots);
    setPendingGamma(false);
    const updated = applyShotModeEffects(relaxBoard(remaining), nextShots);
    setBalls(updated);
    setWiggleIds(hitIds);
    setTimeout(() => setWiggleIds(new Set()), 380);
    setNoMergeStreak(0);

    const gained = Math.floor(
      clearedAtoms.reduce((sum, atom) => sum + atom.atom * 12 * (atom.isotope ? 2 : 1), 0) *
        level.scoreMultiplier,
    );
    const nextScore = isPowerUpStage ? score : score + gained;
    if (!isPowerUpStage) {
      setScore(nextScore);
      addScore(gained);
    }

    spawnPopup(hitIds.size > 0 ? `☢ GAMMA -${hitIds.size}` : "☢ GAMMA");
    if (clearedAtoms.some((atom) => atom.isotope)) spawnPopup("ISOTOPE x2");
    haptic([30, 50, 30, 50, 60]);

    pushShotHistory({
      shot: nextShots,
      action: hitIds.size > 0 ? `Gamma cleared ${hitIds.size} atom${hitIds.size === 1 ? "" : "s"}` : "Gamma fired",
      points: gained,
      powerUp: clearedAtoms.some((atom) => atom.isotope) ? "Gamma Bomb, Isotope x2" : "Gamma Bomb",
    });

    if (powerUpStage === "gamma" && hitIds.size > 0) {
      completePowerUpStageAfterDelay("gamma", nextScore);
      return;
    }

    if (checkGameOver(updated, geo)) {
      trackGameOver(levelId, score, nextShots, highest, mode);
      setGameOver(true);
      haptic([50, 80, 50, 80, 200]);
    }
    setBusy(false);
  }

  function applyShotModeEffects(
    source: Board,
    nextShots: number,
    unstableExemptIds: Set<number> = new Set(),
  ): Board {
    let updated = source;
    if (unstableEnabled && nextShots > 0) {
      let decayed = 0;
      updated = updated.map((b) => {
        if (b.stoneHp != null || b.unstableShots == null || unstableExemptIds.has(b.id)) return b;
        const remaining = b.unstableShots - 1;
        if (remaining > 0) return { ...b, unstableShots: remaining };
        if (b.atom <= 1) return { ...b, unstableShots: undefined };
        decayed += 1;
        const atom = b.atom - 1;
        return { ...b, atom, r: radiusFor(atom), unstableShots: undefined };
      });
      if (decayed > 0) {
        spawnPopup(`☢ ${decayed} isotope${decayed === 1 ? "" : "s"} decayed`);
        haptic([18, 24, 18]);
        if (powerUpStage === "unstable") {
          window.setTimeout(() => failPowerUpStage("ISOTOPE DECAYED"), 300);
        }
      }
    }
    if (mode === "isotope-decay" && nextShots > 0 && nextShots % 20 === 0) {
      updated = updated.map((b) => {
        if (b.stoneHp != null || b.atom <= 1) return b;
        const atom = b.atom - 1;
        return { ...b, atom, r: radiusFor(atom), unstableShots: undefined };
      });
      spawnPopup("🧪 ISOTOPE DECAY −1");
      haptic([20, 35, 20]);
    }
    if (mode === "unstable-isotopes" && nextShots > 0 && nextShots % 6 === 0) {
      let remaining = 3;
      updated = updated.map((b) => {
        if (remaining <= 0 || b.stoneHp != null || b.atom <= 1 || b.unstableShots != null || Math.random() > 0.45) return b;
        remaining -= 1;
        return { ...b, unstableShots: isotopeChargeCapacity(b.atom) };
      });
      spawnPopup("☢ UNSTABLE DECAY");
    }
    if (mode === "gravity-surge" && nextShots > 0 && nextShots % 5 === 0) {
      updated = updated.map((b) => ({
        ...b,
        y: Math.min(geo.dangerY - b.r - 2, b.y + Math.max(8, ballSize * 0.22)),
      }));
      spawnPopup("🌀 GRAVITY SURGE");
      haptic([25, 25, 45]);
    }
    return updated;
  }

  function triggerImpact(
    x: number,
    y: number,
    hitId: number | null,
    dirX: number,
    dirY: number,
    bouncedStoneHitIds: number[] = [],
  ) {
    // === Pending-stone projectile branch ===
    // The launcher is loaded with a Stone — drop it at the landing point,
    // shove neighbors aside, and finish without consuming the atom queue.
    if (pendingStone) {
      const sR = stoneR;
      const sx = Math.max(SIDE_PAD + sR, Math.min(boardW - SIDE_PAD - sR, x));
      const sy = Math.max(TOP_PAD + sR, y);
      setBalls((prev) => {
        const others = prev.map((b) => ({ ...b }));
        // Shockwave: stone shoves nearby atoms with 5× reach and force,
        // and those primary-pushed atoms cascade into secondary collisions.
        const SHOCK_REACH = sR * 1.6 * STONE_NUDGE_MULT;
        const SHOCK_FORCE = sR * 0.25 * STONE_NUDGE_MULT;
        const primaryIds = new Set<number>();
        for (const o of others) {
          if (o.stoneHp != null) continue;
          const dxs = o.x - sx;
          const dys = o.y - sy;
          const d = Math.hypot(dxs, dys) || 0.001;
          if (d < SHOCK_REACH) {
            const falloff = 1 - d / SHOCK_REACH;
            o.x += (dxs / d) * SHOCK_FORCE * falloff;
            o.y += (dys / d) * SHOCK_FORCE * falloff;
            primaryIds.add(o.id);
          }
        }
        // Secondary cascade: anyone touching a primary-pushed atom gets a
        // weaker push along the same outward direction.
        const SECONDARY = 0.4;
        for (const a of others) {
          if (!primaryIds.has(a.id)) continue;
          const ax = a.x - sx;
          const ay = a.y - sy;
          const ad = Math.hypot(ax, ay) || 0.001;
          const ux = ax / ad;
          const uy = ay / ad;
          for (const b of others) {
            if (b.id === a.id) continue;
            if (primaryIds.has(b.id)) continue;
            if (b.stoneHp != null) continue;
            const dd = Math.hypot(b.x - a.x, b.y - a.y);
            if (dd < (a.r + b.r) * 1.4) {
              b.x += ux * SHOCK_FORCE * SECONDARY;
              b.y += uy * SHOCK_FORCE * SECONDARY;
            }
          }
        }
        // Push existing balls outward and resolve overlaps so the stone fits.
        for (let iter = 0; iter < 30; iter++) {
          let moved = false;
          for (const o of others) {
            const dxs = o.x - sx;
            const dys = o.y - sy;
            const d = Math.hypot(dxs, dys) || 0.001;
            const min = sR + o.r;
            if (d < min) {
              const push = min - d + 0.5;
              o.x += (dxs / d) * push;
              o.y += (dys / d) * push;
              moved = true;
            }
          }
          for (let i = 0; i < others.length; i++) {
            for (let j = i + 1; j < others.length; j++) {
              const a = others[i];
              const b = others[j];
              if (a.stoneHp != null && b.stoneHp != null) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const d = Math.hypot(dx, dy) || 0.001;
              const min = a.r + b.r;
              if (d < min) {
                const push = (min - d) / 2 + 0.25;
                a.x -= (dx / d) * push;
                a.y -= (dy / d) * push;
                b.x += (dx / d) * push;
                b.y += (dy / d) * push;
                moved = true;
              }
            }
          }
          for (const o of others) {
            o.x = Math.max(SIDE_PAD + o.r, Math.min(boardW - SIDE_PAD - o.r, o.x));
            o.y = Math.max(TOP_PAD + o.r, o.y);
          }
          if (!moved) break;
        }
        const stone: Ball = {
          id: nextBallId(),
          x: sx,
          y: sy,
          atom: -1,
          r: sR,
          stoneHp: STONE_MAX_HP,
          stoneMaxHp: STONE_MAX_HP,
        };
        return relaxBoard([...others, stone]);
      });
      setPendingStone(false);
      setStoneSpawnCount((count) => count + 1);
      setNoMergeStreak(0);
      spawnPopup("⛰ STONE!");
      haptic([30, 50, 30]);
      // Game-over check after the relax pass settles.
      setTimeout(() => {
        setBalls((prev) => {
          if (checkGameOver(prev, geo)) {
            setGameOver(true);
            haptic([50, 80, 50, 80, 200]);
          }
          return prev;
        });
        if (powerUpStage === "stone") {
          completePowerUpStageAfterDelay("stone", score);
          return;
        }
        setBusy(false);
      }, 220);
      return;
    }
    let impactBalls = balls;
    let impactStoneBonus = 0;
    if (bouncedStoneHitIds.length > 0) {
      const damage = new Map<number, number>();
      bouncedStoneHitIds.forEach((id) => damage.set(id, (damage.get(id) ?? 0) + 1));
      // Track stone hits for the Queue Shuffle power-up (every 15th hit).
      const totalHits = bouncedStoneHitIds.length;
      if (shuffleEnabled) {
        setStoneHitTally((prev) => {
          const next = prev + totalHits;
          const earned = Math.floor(next / 15) - Math.floor(prev / 15);
          if (earned > 0) {
            setQueueShuffleCharges((q) => q + earned);
            spawnPopup("QUEUE SHUFFLE");
          }
          return next;
        });
      }
      const damaged = damageStones(impactBalls, damage);
      impactBalls = damaged.balls;
      if (damaged.hitIds.size > 0) {
        setStoneHitIds(damaged.hitIds);
        setTimeout(() => setStoneHitIds(new Set()), 380);
        haptic([20, 30, 30]);
      }
      if (damaged.bonus > 0) {
        impactStoneBonus = damaged.bonus;
        grantFusionJump(damaged.destroyedCount);
        spawnPopup(`⛰ +${formatScore(damaged.bonus)}`);
      } else {
        spawnPopup("🪨 bounce hit");
      }
    }

    if (currentIsBlank && hitId !== null) {
      const blankStone = impactBalls.find((b) => b.id === hitId && b.stoneHp != null);
      if (blankStone) {
        const updated = applyShotModeEffects(impactBalls.filter((b) => b.id !== blankStone.id), shots + 1);
        const nextShots = shots + 1;
        setShots(nextShots);
        applyShotMilestones(nextShots);
        setBalls(updated);
        setStoneHitIds(new Set([blankStone.id]));
        setTimeout(() => setStoneHitIds(new Set()), 380);
        setNoMergeStreak(0);
        spawnPopup("✦ STONE ERASED");
        haptic([30, 60, 30, 90]);
        setBusy(false);
        return;
      }
    }

    // === Stone hit branch ===
    // Hitting a Stone deals 1 damage, shoves neighbors with 5× force, and
    // shrinks the stone. If destroyed, awards a big score bonus.
    if (hitId !== null) {
      const stone = impactBalls.find((b) => b.id === hitId && b.stoneHp != null);
      if (stone) {
        const projR = radiusFor(current);
        const projPeriod = Math.max(1, Math.min(8, ELEMENTS[current - 1]?.period ?? 4));
        const NUDGE = projR * (0.15 + projPeriod * 0.12) * STONE_NUDGE_MULT;
        const moved = new Map<number, { x: number; y: number }>();
        for (const o of impactBalls) {
          if (o.id === stone.id) continue;
          if (o.stoneHp != null) continue;
          const dxs = o.x - stone.x;
          const dys = o.y - stone.y;
          const d = Math.hypot(dxs, dys);
          const reach = stone.r + o.r * 2.2;
          if (d < reach) {
            const ux = d > 0.001 ? dxs / d : dirX;
            const uy = d > 0.001 ? dys / d : dirY;
            const oMinX = SIDE_PAD + o.r;
            const oMaxX = boardW - SIDE_PAD - o.r;
            const oCeil = TOP_PAD + o.r;
            let ox = o.x + ux * NUDGE;
            let oy = o.y + uy * NUDGE;
            ox = Math.max(oMinX, Math.min(oMaxX, ox));
            oy = Math.max(oCeil, oy);
            moved.set(o.id, { x: ox, y: oy });
          }
        }
        const newHp = (stone.stoneHp ?? STONE_MAX_HP) - 1;
        const maxHp = stone.stoneMaxHp ?? STONE_MAX_HP;
        const initialR = (ballSize / 2) * (1 + (8 - 4) * 0.11);
        const newR = Math.max(initialR * 0.35, initialR * (newHp / maxHp));
        const updated: Board = impactBalls
          .map((b) => {
            if (b.id === stone.id) {
              if (newHp <= 0) return null;
              return { ...b, stoneHp: newHp, r: newR };
            }
            const m = moved.get(b.id);
            return m ? { ...b, x: m.x, y: m.y } : b;
          })
          .filter((b): b is Ball => b !== null);
        // Crackle anim on the stone
        setStoneHitIds(new Set([stone.id]));
        setTimeout(() => setStoneHitIds(new Set()), 380);
        haptic([20, 30, 30]);
        sfx(playShootSound);
        let directStoneBonus = 0;
        if (newHp <= 0) {
          directStoneBonus = Math.floor(maxHp * 250 * level.scoreMultiplier);
          grantFusionJump();
          spawnPopup(`⛰ +${formatScore(directStoneBonus)}`);
          haptic([40, 60, 40, 60, 100]);
        } else {
          spawnPopup(`💥 ${newHp}`);
        }
        // Hitting a stone breaks the no-merge streak so we don't pile them up.
        setNoMergeStreak(0);
        finalizePlacement(
          x - dirX * Math.max(4, projR * 0.45),
          y - dirY * Math.max(4, projR * 0.45),
          updated,
          impactStoneBonus + directStoneBonus,
        );
        return;
      }
    }
    const blankHitAtom =
      currentIsBlank && hitId !== null
        ? impactBalls.find((b) => b.id === hitId && b.stoneHp == null)?.atom
        : undefined;
    const activeAtom = blankHitAtom ?? current;
    if (currentIsBlank && blankHitAtom != null)
      spawnPopup(`✦ BLANK → ${ELEMENTS[blankHitAtom - 1]?.symbol ?? "?"}`);

    // Wiggle nearby same-type balls before placing.
    const projR = radiusFor(activeAtom);
    const ADJ_F = 1.4;
    const matches: number[] = [];
    for (const b of impactBalls) {
      if (b.atom !== activeAtom) continue;
      if (Math.hypot(b.x - x, b.y - y) <= (projR + b.r) * ADJ_F) matches.push(b.id);
    }
    // Tactical nudge: if we hit an existing ball that won't fuse with us,
    // push it slightly along the projectile trajectory so it can drift
    // toward a same-type neighbor.
    let nudged = impactBalls;
    if (hitId !== null) {
      const hb = impactBalls.find((b) => b.id === hitId);
      if (hb && hb.atom !== activeAtom) {
        // Heavier elements (lower in the periodic table) hit harder.
        const projPeriod = Math.max(1, Math.min(8, ELEMENTS[activeAtom - 1]?.period ?? 4));
        const NUDGE = projR * (0.15 + projPeriod * 0.12);
        const minX = SIDE_PAD + hb.r;
        const maxX = boardW - SIDE_PAD - hb.r;
        const ceilingY = TOP_PAD + hb.r;
        let nx = hb.x + dirX * NUDGE;
        let ny = hb.y + dirY * NUDGE;
        nx = Math.max(minX, Math.min(maxX, nx));
        ny = Math.max(ceilingY, ny);

        // Secondary collisions: any ball the primary now overlaps gets a
        // weaker push along the same trajectory (~40% force), and overlaps
        // are resolved geometrically.
        const SECONDARY_FACTOR = 0.4;
        const moved = new Map<number, { x: number; y: number }>();
        moved.set(hb.id, { x: nx, y: ny });
        for (const o of impactBalls) {
          if (o.id === hb.id) continue;
          const dd = Math.hypot(nx - o.x, ny - o.y);
          const min = hb.r + o.r;
          if (dd < min) {
            const oMinX = SIDE_PAD + o.r;
            const oMaxX = boardW - SIDE_PAD - o.r;
            const oCeil = TOP_PAD + o.r;
            // start with directional shove
            let ox = o.x + dirX * NUDGE * SECONDARY_FACTOR;
            let oy = o.y + dirY * NUDGE * SECONDARY_FACTOR;
            // resolve residual overlap with the primary
            const ndd = Math.hypot(ox - nx, oy - ny) || 0.001;
            if (ndd < min) {
              const push = min - ndd + 0.5;
              ox += ((ox - nx) / ndd) * push;
              oy += ((oy - ny) / ndd) * push;
            }
            ox = Math.max(oMinX, Math.min(oMaxX, ox));
            oy = Math.max(oCeil, oy);
            moved.set(o.id, { x: ox, y: oy });
          }
        }
        nudged = impactBalls.map((b) => {
          const m = moved.get(b.id);
          return m ? { ...b, x: m.x, y: m.y } : b;
        });
        // Stones take damage from any collision wave that reaches them
        // (primary, secondary, or tertiary pushes).
        const stones = nudged.filter((b) => b.stoneHp != null);
        if (stones.length > 0) {
          const stoneDamage = new Map<number, number>();
          for (const [movedId] of moved) {
            const mb = nudged.find((b) => b.id === movedId);
            if (!mb || mb.stoneHp != null) continue;
            for (const st of stones) {
              const d = Math.hypot(mb.x - st.x, mb.y - st.y);
              if (d < (mb.r + st.r) * 1.15) {
                stoneDamage.set(st.id, (stoneDamage.get(st.id) ?? 0) + 1);
              }
            }
          }
          if (stoneDamage.size > 0) {
            const hitSet = new Set<number>();
            let totalBonus = 0;
            let destroyedCount = 0;
            const initialR = (ballSize / 2) * (1 + (8 - 4) * 0.11);
            nudged = nudged
              .map((b) => {
                if (b.stoneHp == null) return b;
                const dmg = stoneDamage.get(b.id) ?? 0;
                if (dmg <= 0) return b;
                hitSet.add(b.id);
                const newHp = (b.stoneHp ?? STONE_MAX_HP) - dmg;
                const maxHp = b.stoneMaxHp ?? STONE_MAX_HP;
                if (newHp <= 0) {
                  destroyedCount += 1;
                  totalBonus += Math.floor(maxHp * 250 * level.scoreMultiplier);
                  return null;
                }
                const newR = Math.max(initialR * 0.35, initialR * (newHp / maxHp));
                return { ...b, stoneHp: newHp, r: newR };
              })
              .filter((b): b is Ball => b !== null);
            if (hitSet.size > 0) {
              setStoneHitIds(hitSet);
              setTimeout(() => setStoneHitIds(new Set()), 380);
              haptic([20, 30, 30]);
            }
            if (totalBonus > 0) {
              grantFusionJump(destroyedCount);
              if (!isPowerUpStage) {
                setScore((s) => s + totalBonus);
                addScore(totalBonus);
              }
              spawnPopup(`⛰ +${formatScore(totalBonus)}`);
              haptic([40, 60, 40, 60, 100]);
            } else {
              spawnPopup(`💥 stone hit`);
            }
            setNoMergeStreak(0);
          }
        }
      }
    }
    if (matches.length === 0) {
      finalizePlacement(x, y, nudged, impactStoneBonus, activeAtom);
      return;
    }
    // Pull placement toward the closest matching atom so adjacency is
    // guaranteed at the stricter merge threshold (placeAndMerge uses ~1.15,
    // we matched at 1.4). Otherwise the wiggle plays but nothing merges.
    let placeX = x;
    let placeY = y;
    {
      let closest: { b: Ball; d: number } | null = null;
      for (const id of matches) {
        const b = nudged.find((bb) => bb.id === id);
        if (!b) continue;
        const d = Math.hypot(b.x - x, b.y - y);
        if (!closest || d < closest.d) closest = { b, d };
      }
      if (closest) {
        const need = (projR + closest.b.r) * 1.1;
        if (closest.d > need) {
          const ux = (closest.b.x - x) / (closest.d || 1);
          const uy = (closest.b.y - y) / (closest.d || 1);
          const move = closest.d - need;
          placeX = Math.max(SIDE_PAD + projR, Math.min(boardW - SIDE_PAD - projR, x + ux * move));
          placeY = Math.max(TOP_PAD + projR, y + uy * move);
        }
      }
    }
    setWiggleIds(new Set(matches));
    haptic(20);
    setTimeout(() => {
      setWiggleIds(new Set());
      finalizePlacement(placeX, placeY, nudged, impactStoneBonus, activeAtom);
    }, 360);
  }

  function finalizePlacement(
    x: number,
    y: number,
    currentBalls: Board = balls,
    impactStoneBonus = 0,
    atomOverride = current,
  ) {
    const baseNewBall: Ball = {
      id: nextBallId(),
      x,
      y,
      atom: atomOverride,
      r: radiusFor(atomOverride),
      unstableShots: currentIsUnstable ? isotopeChargeCapacity(atomOverride) : undefined,
    };
    const newBall: Ball = baseNewBall;
    if (currentBalls !== balls) setBalls(currentBalls);
    let result = placeAndMerge(
      currentBalls,
      newBall,
      geo,
      target,
      isNobleGasLocked(atomOverride) ? atomOverride : 118,
      catalystShotsRemaining > 0 ? CATALYST_ADJ_FACTOR : undefined,
      fusionJumpArmed,
      newBall.r * SHOT_MERGE_RADIUS_BONUS_FACTOR,
    );
    if (fusionJumpArmed && result.merges.length > 0) {
      setFusionJumpArmed(false);
      if (pendingReversiblePowerUp === "fusion-jump") setPendingReversiblePowerUp(null);
      // Visual cue — burst ring at the impact point.
      const fxId = Date.now();
      setFusionJumpFx({ id: fxId, x: newBall.x, y: newBall.y });
      window.setTimeout(
        () => setFusionJumpFx((fx) => (fx && fx.id === fxId ? null : fx)),
        750,
      );
      spawnPopup("⏭ FUSION JUMP!");
    }
    const nextShots = shots + 1;
    setShots(nextShots);
    applyShotMilestones(nextShots);

    const newAtoms = new Set<number>([atomOverride]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) registerDiscoveries(undiscovered);

    let mergeStoneBonus = 0;
    const mergeStoneDamage = damageStones(
      result.balls,
      stoneDamageFromMergeVicinity(result.balls, result.merges),
    );
    if (mergeStoneDamage.hitIds.size > 0) {
      result = { ...result, balls: mergeStoneDamage.balls };
      setStoneHitIds(mergeStoneDamage.hitIds);
      setTimeout(() => setStoneHitIds(new Set()), 380);
      spawnPopup(
        mergeStoneDamage.bonus > 0 ? `⛰ +${formatScore(mergeStoneDamage.bonus)}` : "💥 stone hit",
      );
      if (mergeStoneDamage.bonus > 0) {
        grantFusionJump(mergeStoneDamage.destroyedCount);
        mergeStoneBonus = mergeStoneDamage.bonus;
        if (!isPowerUpStage) addScore(mergeStoneDamage.bonus);
      }
      haptic([20, 30, 30]);
    }

    result = { ...result, balls: applyShotModeEffects(result.balls, nextShots, new Set([newBall.id])) };
    result = { ...result, balls: relaxBoard(result.balls) };
    // Refresh radii on any merged survivors (their atom changed).
    setBalls(result.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    const shimmerHit = !currentIsBlank && currentIsShimmer && result.merges.length > 0;
    const grabAdd = result.merges.length * (shimmerHit ? 2 : 1);
    if (result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
      showMergeComboFx(result.merges);
      grantPowerUpsForMerges(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      result.merges.forEach((m) => trackMerge(levelId, m.resultAtomicNumber, m.chainDepth, mode));
      const showSymbolPopups = result.merges.length >= 2;
      if (result.merges.some((merge) => merge.stabilizedIsotope)) spawnPopup("☢ ISOTOPE ×2");
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            if (showSymbolPopups) {
              spawnPopup(
                `${m.stabilizedIsotope ? "☢ " : ""}+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`,
              );
            }
          },
          mergeComboCueDelay(i),
        );
      });
    }
    if (shimmerHit) spawnPopup("✦ SHIMMER ×2 ✦");
    if (grabEnabled && grabAdd > 0) {
      setGrabProgress((p) => {
        const total = p + grabAdd;
        const earned = Math.floor(total / GRAB_THRESHOLD);
        if (earned > 0) {
          setGrabs((g) => g + earned);
          spawnPopup(`🤚 GRAB UNLOCKED${earned > 1 ? ` ×${earned}` : ""}!`);
          showTip(
            "feature-grab-first-contact",
            "🤚 Grab is ready!",
            "You earned Grab by chaining 8 merge progress in a row. Tap the Grab button (bottom-right), then drag any atom to reposition it and set up your next big reaction chain.",
          );
        }
        return total % GRAB_THRESHOLD;
      });
    } else if (grabEnabled) {
      // Missed shot — atom didn't merge with anything, so the streak resets.
      setGrabProgress(0);
    }

    // === Stone spawn check ===
    // Track shots that produce zero merges. Stones are delayed for the first
    // 15 shots of a new run; after that, 3 no-merge shots in a row loads one.
    if (stoneEnabled && result.merges.length === 0) {
      if (powerUpStage !== "stone" && nextShots <= STONE_GRACE_SHOTS) {
        setNoMergeStreak(0);
      } else {
        setNoMergeStreak((s) => {
          const next = s + 1;
          if (next >= STONE_NO_MERGE_TRIGGER) {
            setTimeout(() => loadStoneIntoLauncher(), 220);
            return 0;
          }
          return next;
        });
      }
    } else {
      setNoMergeStreak(0);
    }

    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier * (shimmerHit ? 2 : 1));
    const nextScore = isPowerUpStage ? score : score + gained + mergeStoneBonus + impactStoneBonus;
    const nextBestCombo = Math.max(runBestCombo, result.merges.length);
    const shotPowerUps = [
      pendingReversiblePowerUp === "transmute" ? "Transmute Shot" : null,
      pendingReversiblePowerUp === "emission" ? "Emission" : null,
      shimmerHit ? "Shimmer" : null,
      result.merges.some((merge) => merge.stabilizedIsotope) ? "Isotope ×2" : null,
      fusionJumpArmed ? "Fusion Jump" : null,
      pendingReversiblePowerUp === "catalyst" || catalystShotsRemaining > 0 ? "Catalyst Aura" : null,
      currentIsBlank ? "Blank Atom" : null,
      impactStoneBonus > 0 || mergeStoneBonus > 0 ? "Stone break" : null,
    ].filter((label): label is string => Boolean(label));
    pushShotHistory({
      shot: nextShots,
      action:
        result.merges.length > 0
          ? `Merged ${result.merges.length} chain${result.merges.length === 1 ? "" : "s"}`
          : "Placed without a merge",
      points: gained + mergeStoneBonus + impactStoneBonus,
      powerUp: shotPowerUps.join(", ") || undefined,
      merges: result.merges,
    });
    if (!isPowerUpStage) {
      setScore(nextScore);
      addScore(gained + impactStoneBonus);
    }

    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });

    const firstDiscovery = undiscovered.sort((a, b) => b - a)[0];
    const fusionJumpResolved = shotPowerUps.includes("Fusion Jump") && result.merges.length > 0;
    const catalystResolved =
      shotPowerUps.includes("Catalyst Aura") && result.merges.length >= 2;
    const powerUpStageResolved =
      (powerUpStage === "shimmer" && shimmerHit) ||
      (powerUpStage === "unstable" && result.merges.some((merge) => merge.stabilizedIsotope)) ||
      (powerUpStage === "transmute" && transmuteStagePending && result.merges.length > 0) ||
      (powerUpStage === "fusion-jump" && fusionJumpResolved && result.levelComplete) ||
      (powerUpStage === "catalyst" && catalystResolved) ||
      (powerUpStage === "blank" && currentIsBlank && result.levelComplete) ||
      (powerUpStage === "queue-shuffle" && queueShuffleStagePending);

    setTimeout(
      () => {
        setHighlightId(null);
        if (powerUpStageResolved) {
          setTransmuteStagePending(false);
          setQueueShuffleStagePending(false);
          completePowerUpStageAfterDelay(powerUpStage, nextScore);
          return;
        }
        if (powerUpStage === "fusion-jump" && nextShots >= 5) {
          failPowerUpStage("FUSION JUMP MISSED");
          return;
        }
        if (result.levelComplete && !isMoleculeChallenge && !isPowerUpStage && !continuingPastTarget) {
          const timeSec = (Date.now() - startTimeRef.current) / 1000;
          const stars = calculateStars(level, nextScore, nextShots, nextBestCombo, timeSec);
          setEarnedStars(stars);
          setLevelStars(levelId, stars);
          reportQuestProgress({ levelCleared: true, starsEarned: stars });
          unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
          sfx(playWinSound);
          haptic([30, 60, 30, 60, 80]);
          // Offer a choice — claim the win or keep playing for score.
          trackLevelWin(levelId, nextScore, nextShots, nextHighest, mode);
          if (mode !== "campaign") setChallengeBestScore(mode, nextScore);
          showStageClearAnimation({
            stars,
            score: nextScore,
            shots: nextShots,
            bestCombo: nextBestCombo,
          });
          return;
        }
        if (firstDiscovery && firstDiscovery > 1) {
          setDiscoveryEl(firstDiscovery);
        }
        if (checkGameOver(result.balls, geo)) {
          trackGameOver(levelId, nextScore, nextShots, nextHighest, mode);
          setGameOver(true);
          haptic([50, 80, 50, 80, 200]);
        }
        setBusy(false);
      },
      MERGE_COMBO_START_MS + result.merges.length * MERGE_COMBO_STEP_MS + MERGE_COMBO_END_PAD_MS,
    );
  }

  function collectUnusedPowerUps(): Partial<Record<InventoryPowerUpId, number>> {
    return {
      transmute: transmuteCharges,
      "fusion-jump": fusionJumpCharges + (fusionJumpArmed ? 1 : 0),
      catalyst: catalystCharges,
      emission: emissionCharges,
      gravity: gravityCharges,
      grab: grabs,
      gamma: gammaCharges + (pendingGamma ? 1 : 0),
      molecule: Math.min(compoundCharges, inventoryCompoundChargesRef.current),
    };
  }

  function claimResultPowerUp(powerUp: InventoryPowerUpId) {
    if (hasClaimedUnusedInventoryRef.current) return;
    const unused = collectUnusedPowerUps();
    if ((unused[powerUp] ?? 0) <= 0) return;
    addInventoryPowerUps({ [powerUp]: 1 });
    hasClaimedUnusedInventoryRef.current = true;
    setClaimedResultPowerUp(powerUp);
    spawnPopup(`${POWER_UP_INVENTORY_META[powerUp].name} saved`);
  }

  function changeInventorySelection(powerUp: InventoryPowerUpId, delta: 1 | -1) {
    setSelectedInventoryPowerUps((selected) => {
      const currentlySelected = selected[powerUp];
      if (delta < 0) {
        return { ...selected, [powerUp]: Math.max(0, currentlySelected - 1) };
      }
      if (countPowerUps(selected) >= INVENTORY_PICK_LIMIT) return selected;
      if (currentlySelected >= powerUpInventory[powerUp]) return selected;
      return { ...selected, [powerUp]: currentlySelected + 1 };
    });
  }

  function startWithSelectedInventory() {
    const selected = { ...selectedInventoryPowerUps };
    const selectedCount = countPowerUps(selected);
    if (selectedCount > 0 && !consumeInventoryPowerUps(selected)) return;
    setTransmuteCharges((count) => count + selected.transmute);
    setFusionJumpCharges((count) => count + selected["fusion-jump"]);
    setCatalystCharges((count) => count + selected.catalyst);
    setEmissionCharges((count) => count + selected.emission);
    setGravityCharges((count) => count + selected.gravity);
    setGrabs((count) => count + selected.grab);
    setGammaCharges((count) => count + selected.gamma);
    if (selected.molecule > 0) {
      inventoryCompoundChargesRef.current = Math.min(
        1,
        inventoryCompoundChargesRef.current + selected.molecule,
      );
      setCompoundCharges((count) => Math.min(1, count + selected.molecule));
    }
    if (selectedCount > 0) {
      spawnPopup(`🎒 LOADED ×${selectedCount}`);
      if (canIntroducePowerUps) {
        showTip(
          "feature-inventory-start",
          "🎒 Inventory loaded",
          "Unused power-ups are saved after a run. At the start of a level, choose up to 3 from your inventory to begin with an early strategy boost.",
        );
      }
    }
    setSelectedInventoryPowerUps(emptyPowerUpInventory());
    setInventoryPickerOpen(false);
  }

  function cancelPendingPowerUp(powerUp: "transmute" | "emission" | "fusion-jump" | "catalyst") {
    if (busy || gameOver || won) return false;
    if (pendingReversiblePowerUp !== powerUp) return false;
    if (
      (powerUp === "transmute" || powerUp === "emission") &&
      queueUndoRef.current?.powerUp === powerUp
    ) {
      const undo = queueUndoRef.current;
    setQueue(undo.queue);
    setShimmerQueue(undo.shimmerQueue);
    setEGunQueue(undo.eGunQueue);
    setBlankQueue(undo.blankQueue);
    setUnstableQueue(undo.unstableQueue);
      if (powerUp === "transmute") setTransmuteCharges((g) => g + 1);
      if (powerUp === "emission") setEmissionCharges((g) => g + 1);
      queueUndoRef.current = null;
    }
    if (powerUp === "fusion-jump") {
      setFusionJumpArmed(false);
      setFusionJumpCharges((g) => g + 1);
    }
    if (powerUp === "catalyst") {
      setCatalystShotsRemaining(0);
      setCatalystCharges((g) => g + 1);
    }
    setPendingReversiblePowerUp(null);
    spawnPopup("↩ CANCELED");
    haptic(15);
    return true;
  }

  function powerUpInfoHandlers(title: string, body: string) {
    const show = () => showTipForce(`powerup-info-${title}`, title, body);
    const clear = () => {
      if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    };
    return {
      onPointerDown: () => {
        clear();
        longPressTimerRef.current = window.setTimeout(show, 520);
      },
      onPointerUp: clear,
      onPointerLeave: clear,
      onContextMenu: (event: ReactMouseEvent) => {
        event.preventDefault();
        show();
      },
    };
  }

  function triggerTransmutePowerUp() {
    if (
      busy ||
      gameOver ||
      won ||
      !transmuteEnabled ||
      transmuteCharges <= 0 ||
      pendingReversiblePowerUp
    )
      return;
    if (currentIsEGun || currentIsBlank) return;
    const maxTier = Math.min(118, Math.max(current + 1, target - 1));
    if (current >= maxTier) return;
    // Only reroll into atoms the player has already discovered, so Transmute
    // never hands out a fresh element for free.
    const candidates = discoveredElements.filter((n) => n > current && n <= maxTier);
    if (candidates.length === 0 && powerUpStage !== "transmute") {
      spawnPopup("🔀 NO HIGHER DISCOVERED");
      return;
    }
    const atom = powerUpStage === "transmute" ? Math.min(maxTier, current + 1) : candidates[Math.floor(Math.random() * candidates.length)];
    setTransmuteCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    setQueue((q) => [atom, ...q.slice(1)]);
    setShimmerQueue((q) => [false, ...q.slice(1)]);
    setEGunQueue((q) => [false, ...q.slice(1)]);
    setBlankQueue((q) => [false, ...q.slice(1)]);
    setUnstableQueue((q) => [false, ...q.slice(1)]);
    if (powerUpStage === "transmute") setTransmuteStagePending(true);
    spawnPopup(`🔀 ${ELEMENTS[atom - 1]?.symbol ?? "?"}`);
    haptic([20, 30, 20]);
  }

  function triggerFusionJumpPowerUp() {
    if (cancelPendingPowerUp("fusion-jump")) return;
    if (!fusionJumpEnabled || busy || gameOver || won || fusionJumpCharges <= 0 || pendingReversiblePowerUp) return;
    setPendingReversiblePowerUp("fusion-jump");
    setFusionJumpCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    setFusionJumpArmed(true);
    spawnPopup("⏭ JUMP ARMED");
    haptic(20);
  }

  function triggerQueueShufflePowerUp() {
    if (!shuffleEnabled || busy || gameOver || won || queueShuffleCharges <= 0 || pendingGamma) return;
    const fresh = generateInitialQueue(level.maxQueueElement, QUEUE_SIZE, level.queueDecay);
    setQueue(fresh);
    setShimmerQueue(
      Array.from({ length: QUEUE_SIZE }, () => shimmerEnabled && Math.random() < POWER_UP_CHANCE),
    );
    setEGunQueue(Array.from({ length: QUEUE_SIZE }, () => false));
    setBlankQueue(
      Array.from({ length: QUEUE_SIZE }, () => blankEnabled && Math.random() < BLANK_ATOM_CHANCE),
    );
    setUnstableQueue(
      Array.from(
        { length: QUEUE_SIZE },
        () => unstableEnabled && Math.random() < UNSTABLE_SPAWN_CHANCE,
      ),
    );
    setQueueShuffleCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    if (powerUpStage === "queue-shuffle") setQueueShuffleStagePending(true);
    spawnPopup("♻ QUEUE REROLLED");
    haptic([15, 20, 15]);
  }

  function triggerGammaPowerUp() {
    if (!gammaEnabled) return;
    if (busy || gameOver || won) return;
    if (pendingGamma) {
      // Cancel & refund.
      setPendingGamma(false);
      setGammaCharges((g) => g + 1);
      spawnPopup("☢ CANCELED");
      return;
    }
    if (gammaCharges <= 0 || currentIsEGun || pendingReversiblePowerUp) return;
    setGammaCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    setPendingGamma(true);
    spawnPopup("☢ GAMMA ARMED");
    haptic([15, 25, 15]);
  }

  function triggerCompoundPowerUp() {
    if (busy || gameOver || won) return;
    if (compoundMode) {
      setCompoundMode(false);
      setSelectedCompoundIds(new Set());
      spawnPopup("Compound canceled");
      return;
    }
    if (!compoundEnabled && !isMoleculeChallenge) return;
    if (
      (!isMoleculeChallenge && compoundCharges <= 0) ||
      pendingGamma ||
      currentIsEGun ||
      pendingReversiblePowerUp
    )
      return;
    setGrabMode(false);
    setCompoundMode(true);
    setSelectedCompoundIds(new Set());
    showTip(
      "feature-compound-powerup",
      "Compound ready",
      "Select the atoms on the board using no more than 3 element types. If the recipe matches a known compound, form it for a big bonus.",
    );
    spawnPopup("Compound select");
    haptic(20);
  }

  function handleCompoundBoardTap(clientX: number, clientY: number) {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let hit: Ball | null = null;
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.stoneHp != null || formingCompoundIds.has(b.id)) continue;
      if (Math.hypot(px - b.x, py - b.y) <= b.r) {
        hit = b;
        break;
      }
    }
    if (!hit) return;
    const targetBall = hit;
    setSelectedCompoundIds((selected) => {
      const next = new Set(selected);
      if (next.has(targetBall.id)) {
        next.delete(targetBall.id);
        return next;
      }
      if (next.size >= COMPOUND_MAX_SELECTION) {
        spawnPopup(`Max ${COMPOUND_MAX_SELECTION} atoms`);
        haptic(12);
        return selected;
      }
      const currentBalls = balls.filter((b) => next.has(b.id));
      const counts = countsForBalls(currentBalls);
      const symbol = ELEMENTS[targetBall.atom - 1]?.symbol;
      if (!symbol) return selected;
      if (!counts[symbol] && Object.keys(counts).length >= COMPOUND_MAX_ELEMENT_TYPES) {
        spawnPopup("Max 3 elements");
        haptic(12);
        return selected;
      }
      next.add(targetBall.id);
      haptic(8);
      return next;
    });
  }

  function formSelectedCompound() {
    if (!matchingCompound || busy) return;
    const selectedAtoms = balls
      .filter((b) => selectedCompoundIds.has(b.id) && b.stoneHp == null)
      .map((b) => ({ id: b.id, x: b.x, y: b.y, atom: b.atom, r: b.r, unstableShots: b.unstableShots }));
    if (selectedAtoms.length === 0) return;
    const isotopeBonus = selectedAtoms.some(isActiveIsotope);
    const selectedKey = compoundKey(countsForBalls(selectedAtoms));
    if (selectedKey !== compoundKey(matchingCompound.elements)) return;
    if (isMoleculeChallenge && moleculeObjective && matchingCompound.id !== moleculeObjective.id) {
      spawnPopup(`Need ${moleculeObjective.formula}`);
      haptic(12);
      return;
    }
    const bonusScore = isMoleculeChallenge ? CHALLENGE_CLEAR_SCORE : compoundFormationScore(matchingCompound, selectedAtoms);

    if (!isMoleculeChallenge) {
      const spentAt = Date.now();
      saveCompoundChargeState(0, spentAt);
      inventoryCompoundChargesRef.current = Math.max(0, inventoryCompoundChargesRef.current - 1);
      setCompoundCharges(0);
    }
    setCompoundMode(false);
    setSelectedCompoundIds(new Set());
    setFormingCompoundIds(new Set(selectedAtoms.map((atom) => atom.id)));
    setCompoundFx({ compound: matchingCompound, atoms: selectedAtoms });
    setBusy(true);
    runPowerUpsUsedRef.current += 1;
    sfx(playWinSound);
    haptic([25, 50, 25, 75]);

    window.setTimeout(() => {
      const wasNew = !discoveredCompounds.includes(matchingCompound.id);
      const nextCount = (compoundCounts[matchingCompound.id] ?? (wasNew ? 0 : 1)) + 1;
      setBalls((currentBalls) =>
        relaxBoard(currentBalls.filter((ball) => !selectedAtoms.some((atom) => atom.id === ball.id))),
      );
      setFormingCompoundIds(new Set());
      setCompoundFx(null);
      recordCompoundDiscovery(matchingCompound.id);
      setFormedCompoundsThisRun((current) => [...current, matchingCompound.id]);
      setScore((currentScore) => currentScore + bonusScore);
      addScore(bonusScore);
      pushShotHistory({
        shot: shots,
        action: `Formed ${matchingCompound.name}`,
        points: bonusScore,
        powerUp: isotopeBonus ? "Compound, Isotope x2" : "Compound",
      });
      spawnPopup(`+${formatScore(bonusScore)}`);
      if (isotopeBonus) spawnPopup("ISOTOPE x2");
      const textFxId = Date.now();
      setCompoundTextFx({ id: textFxId, compound: matchingCompound, isNew: wasNew });
      window.setTimeout(
        () => setCompoundTextFx((fx) => (fx?.id === textFxId ? null : fx)),
        1800,
      );
      setDiscoveryCompound({ compound: matchingCompound, isNew: wasNew, count: nextCount, bonusScore });
      if (isMoleculeChallenge && moleculeObjective && matchingCompound.id === moleculeObjective.id) {
        const timeSec = (Date.now() - startTimeRef.current) / 1000;
        const stars = 3;
        setEarnedStars(stars);
        setLevelStars(levelId, stars);
        reportQuestProgress({ levelCleared: true, starsEarned: stars });
        unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
        trackLevelWin(levelId, score + bonusScore, shots, Math.max(highest, getHighestOnBoard(balls)), mode);
        showStageClearAnimation({
          stars,
          score: score + bonusScore,
          shots,
          bestCombo: runBestCombo,
          compound: matchingCompound,
        });
      }
      setBusy(false);
    }, 1450);
  }

  function revealCompoundHint(compound: CompoundDefinition, cost: number) {
    if (!compoundMode || busy) return;
    if (!spendScore(cost)) {
      spawnPopup(`Need ${formatScore(cost)} score`);
      haptic(12);
      return;
    }
    const remaining = { ...compound.elements };
    const hintedIds = new Set<number>();
    for (const ball of balls) {
      if (ball.stoneHp != null) continue;
      const symbol = ELEMENTS[ball.atom - 1]?.symbol;
      if (!symbol || !remaining[symbol]) continue;
      hintedIds.add(ball.id);
      remaining[symbol] -= 1;
    }
    setSelectedCompoundIds(hintedIds);
    spawnPopup(`Hint: ${compound.formula}`);
    haptic([15, 25, 15]);
  }

  function triggerCatalystPowerUp() {
    if (cancelPendingPowerUp("catalyst")) return;
    if (
      busy ||
      gameOver ||
      won ||
      !catalystEnabled ||
      catalystCharges <= 0 ||
      catalystShotsRemaining > 0 ||
      pendingReversiblePowerUp
    )
      return;
    setPendingReversiblePowerUp("catalyst");
    setCatalystCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    setCatalystShotsRemaining(CATALYST_AURA_SHOTS);
    spawnPopup("🧪 AURA ×5");
    haptic([20, 30, 20]);
  }

  function triggerEmissionPowerUp() {
    if (cancelPendingPowerUp("emission")) return;
    if (!emissionEnabled || busy || gameOver || won || emissionCharges <= 0 || pendingReversiblePowerUp)
      return;

    const raisedQueue = queue.map((atom, i) =>
      eGunQueue[i] || blankQueue[i] ? atom : raiseAtomForEmission(atom),
    );
    if (raisedQueue.every((atom, i) => atom === queue[i])) return;

    queueUndoRef.current = { queue, shimmerQueue, eGunQueue, blankQueue, unstableQueue, powerUp: "emission" };
    setPendingReversiblePowerUp("emission");
    setEmissionCharges((g) => Math.max(0, g - 1));
    setEmissionUnlockIndex((index) => Math.max(index, missingLowAtomFloorIndex(balls)));
    runPowerUpsUsedRef.current += 1;
    setQueue(raisedQueue);

    const reachedAtomicNumbers = raisedQueue.filter((atom, i) => atom !== queue[i]);
    const discoveries = reachedAtomicNumbers.filter((n) => !discoveredElements.includes(n));
    if (discoveries.length > 0) registerDiscoveries(discoveries);

    spawnPopup("☢ QUEUE +1");
    reportQuestProgress({ discoveries, reachedAtomicNumbers });
    haptic([25, 45, 25]);
    if (powerUpStage === "emission") completePowerUpStageAfterDelay("emission", score);
  }

  function triggerGravityPowerUp() {
    if (!gravityEnabled || busy || gameOver || won || gravityCharges <= 0) return;
    setBusy(true);
    const fxId = Date.now();
    setGravityFxId(fxId);
    setTimeout(() => setGravityFxId((active) => (active === fxId ? null : active)), 1050);
    setGravityCharges((g) => Math.max(0, g - 1));
    runPowerUpsUsedRef.current += 1;
    const atoms = balls.filter((b) => b.stoneHp == null).map((b) => ({ ...b }));
    const stones = balls.filter((b) => b.stoneHp != null).map((b) => ({ ...b }));
    atoms.sort((a, b) => a.y - b.y);
    const settled: Ball[] = [];
    for (const atom of atoms) {
      let y = TOP_PAD + atom.r;
      for (const placed of settled) {
        const dx = atom.x - placed.x;
        const min = atom.r + placed.r;
        if (Math.abs(dx) < min) {
          const verticalGap = Math.sqrt(Math.max(0, min * min - dx * dx));
          y = Math.max(y, placed.y + verticalGap + 0.5);
        }
      }
      settled.push({
        ...atom,
        x: Math.max(SIDE_PAD + atom.r, Math.min(boardW - SIDE_PAD - atom.r, atom.x)),
        y,
      });
    }

    let result = mergeSettledBoard([...stones, ...settled], geo, target, 118);
    let mergeStoneBonus = 0;
    const mergeStoneDamage = damageStones(
      result.balls,
      stoneDamageFromMergeVicinity(result.balls, result.merges),
    );
    if (mergeStoneDamage.hitIds.size > 0) {
      result = { ...result, balls: mergeStoneDamage.balls };
      mergeStoneBonus = mergeStoneDamage.bonus;
      if (mergeStoneDamage.bonus > 0) grantFusionJump(mergeStoneDamage.destroyedCount);
      setStoneHitIds(mergeStoneDamage.hitIds);
      setTimeout(() => setStoneHitIds(new Set()), 380);
    }

    const newAtoms = new Set<number>();
    result.balls.forEach((b) => {
      if (b.stoneHp == null) newAtoms.add(b.atom);
    });
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) registerDiscoveries(undiscovered);

    setBalls(result.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier) + mergeStoneBonus;
    if (!isPowerUpStage) {
      setScore((s) => s + gained);
      addScore(gained);
    }
    pushShotHistory({
      shot: shots,
      action:
        result.merges.length > 0
          ? `Gravity caused ${result.merges.length} merge${result.merges.length === 1 ? "" : "s"}`
          : "Gravity shifted the board",
      points: gained,
      powerUp: result.merges.some((merge) => merge.stabilizedIsotope)
        ? "Gravity, Isotope ×2"
        : "Gravity",
      merges: result.merges,
    });
    if (result.merges.length > 0) {
      showMergeComboFx(result.merges);
      grantPowerUpsForMerges(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      if (grabEnabled) setGrabProgress((p) => {
        const total = p + result.merges.length;
        const earned = Math.floor(total / GRAB_THRESHOLD);
        if (earned > 0) {
          setGrabs((g) => g + earned);
          spawnPopup(`🤚 GRAB UNLOCKED${earned > 1 ? ` ×${earned}` : ""}!`);
        }
        return total % GRAB_THRESHOLD;
      });
      const showSymbolPopups = result.merges.length >= 2;
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            if (showSymbolPopups)
              spawnPopup(
                `${m.stabilizedIsotope ? "☢ " : ""}+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`,
              );
          },
          mergeComboCueDelay(i),
        );
      });
    } else {
      spawnPopup("🌀 Gravity shift");
    }
    if (mergeStoneBonus > 0) spawnPopup(`⛰ +${formatScore(mergeStoneBonus)}`);
    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });
    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    if (powerUpStage === "gravity") {
      completePowerUpStageAfterDelay("gravity", score);
      return;
    }
    setTimeout(
      () => {
        setHighlightId(null);
        if (result.levelComplete && !isMoleculeChallenge && !isPowerUpStage && !continuingPastTarget) {
          const timeSec = (Date.now() - startTimeRef.current) / 1000;
          const stars = calculateStars(
            level,
            score + gained,
            shots,
            Math.max(runBestCombo, result.merges.length),
            timeSec,
          );
          setEarnedStars(stars);
          setLevelStars(levelId, stars);
          reportQuestProgress({ levelCleared: true, starsEarned: stars });
          unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
          showStageClearAnimation({
            stars,
            score: score + gained,
            shots,
            bestCombo: Math.max(runBestCombo, result.merges.length),
          });
          return;
        }
        if (checkGameOver(result.balls, geo)) setGameOver(true);
        setBusy(false);
      },
      MERGE_COMBO_START_MS + result.merges.length * MERGE_COMBO_STEP_MS + MERGE_COMBO_END_PAD_MS,
    );
  }

  // === Grab drop: place grabbed ball at (tx,ty), pushing neighbors outward ===
  function dropGrabbed(tx: number, ty: number) {
    if (!grabbing) return;
    const grabbed = balls.find((b) => b.id === grabbing.id);
    if (!grabbed) return;
    const others = balls.filter((b) => b.id !== grabbed.id).map((b) => ({ ...b }));
    const minX = SIDE_PAD + grabbed.r;
    const maxX = boardW - SIDE_PAD - grabbed.r;
    const ceilingY = TOP_PAD + grabbed.r;
    const floorY = geo.dangerY - grabbed.r - 2;
    const nx = Math.max(minX, Math.min(maxX, tx));
    const ny = Math.max(ceilingY, Math.min(floorY, ty));
    // Relax: push other balls away from drop point and resolve overlaps.
    for (let iter = 0; iter < 12; iter++) {
      let moved = false;
      for (const o of others) {
        const dx = o.x - nx;
        const dy = o.y - ny;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = grabbed.r + o.r;
        if (d < min) {
          const push = min - d + 0.5;
          o.x += (dx / d) * push;
          o.y += (dy / d) * push;
          moved = true;
        }
      }
      for (let i = 0; i < others.length; i++) {
        for (let j = i + 1; j < others.length; j++) {
          const a = others[i];
          const b = others[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.001;
          const min = a.r + b.r;
          if (d < min) {
            const push = (min - d) / 2 + 0.25;
            a.x -= (dx / d) * push;
            a.y -= (dy / d) * push;
            b.x += (dx / d) * push;
            b.y += (dy / d) * push;
            moved = true;
          }
        }
      }
      // clamp inside board
      for (const o of others) {
        o.x = Math.max(SIDE_PAD + o.r, Math.min(boardW - SIDE_PAD - o.r, o.x));
        o.y = Math.max(TOP_PAD + o.r, o.y);
      }
      if (!moved) break;
    }
    // Re-add grabbed at drop position (new id so placeAndMerge treats it as new)
    const placed: Ball = { id: nextBallId(), x: nx, y: ny, atom: grabbed.atom, r: grabbed.r };
    let result = placeAndMerge(
      others,
      placed,
      geo,
      target,
      isNobleGasLocked(grabbed.atom) ? grabbed.atom : 118,
    );

    const newAtoms = new Set<number>([grabbed.atom]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) registerDiscoveries(undiscovered);

    let mergeStoneBonus = 0;
    const mergeStoneDamage = damageStones(
      result.balls,
      stoneDamageFromMergeVicinity(result.balls, result.merges),
    );
    if (mergeStoneDamage.hitIds.size > 0) {
      result = { ...result, balls: mergeStoneDamage.balls };
      setStoneHitIds(mergeStoneDamage.hitIds);
      setTimeout(() => setStoneHitIds(new Set()), 380);
      spawnPopup(
        mergeStoneDamage.bonus > 0 ? `⛰ +${formatScore(mergeStoneDamage.bonus)}` : "💥 stone hit",
      );
      if (mergeStoneDamage.bonus > 0) {
        grantFusionJump(mergeStoneDamage.destroyedCount);
        mergeStoneBonus = mergeStoneDamage.bonus;
        if (!isPowerUpStage) addScore(mergeStoneDamage.bonus);
      }
      haptic([20, 30, 30]);
    }

    setBalls(result.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    if (grabEnabled && result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
      showMergeComboFx(result.merges);
      grantPowerUpsForMerges(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      const showSymbolPopups = result.merges.length >= 2;
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            if (showSymbolPopups)
              spawnPopup(
                `${m.stabilizedIsotope ? "☢ " : ""}+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`,
              );
          },
          mergeComboCueDelay(i),
        );
      });
    }
    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier);
    const nextScore = isPowerUpStage ? score : score + gained + mergeStoneBonus;
    if (!isPowerUpStage) {
      setScore(nextScore);
      addScore(gained);
    }
    pushShotHistory({
      shot: shots,
      action:
        result.merges.length > 0
          ? `Grab created ${result.merges.length} merge${result.merges.length === 1 ? "" : "s"}`
          : "Grab moved an atom",
      points: gained + mergeStoneBonus,
      powerUp: result.merges.some((merge) => merge.stabilizedIsotope) ? "Grab, Isotope ×2" : "Grab",
      merges: result.merges,
    });
    // Grab-and-drop that produces a merge counts as 1 step toward the next
    // Grab charge, matching how a normal merge feeds the grab progress bar.
    if (result.merges.length > 0) {
      setGrabProgress((p) => {
        const total = p + 1;
        const earned = Math.floor(total / GRAB_THRESHOLD);
        if (earned > 0) {
          setGrabs((g) => g + earned);
          spawnPopup(`🤚 GRAB UNLOCKED${earned > 1 ? ` ×${earned}` : ""}!`);
        }
        return total % GRAB_THRESHOLD;
      });
    }
    if (powerUpStage === "grab" && result.merges.length > 0) {
      completePowerUpStageAfterDelay("grab", nextScore);
      return;
    }
    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });
    setTimeout(
      () => setHighlightId(null),
      MERGE_COMBO_START_MS + result.merges.length * MERGE_COMBO_STEP_MS + MERGE_COMBO_END_PAD_MS,
    );
    // Grabbed-and-merged into the target element? Trigger the same win flow
    // a regular shot does so the level actually clears.
    if (result.levelComplete && !isMoleculeChallenge && !isPowerUpStage && !continuingPastTarget) {
      const timeSec = (Date.now() - startTimeRef.current) / 1000;
      const nextBestCombo = Math.max(runBestCombo, result.merges.length);
      const stars = calculateStars(level, nextScore, shots, nextBestCombo, timeSec);
      setEarnedStars(stars);
      setLevelStars(levelId, stars);
      reportQuestProgress({ levelCleared: true, starsEarned: stars });
      unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
      sfx(playWinSound);
      haptic([30, 60, 30, 60, 80]);
      if (mode !== "campaign") setChallengeBestScore(mode, nextScore);
      showStageClearAnimation({
        stars,
        score: nextScore,
        shots,
        bestCombo: nextBestCombo,
      });
    }
  }

  // Spawn a Stone obstacle near the top of the board, pushing nearby balls
  // outward to make room.
  function loadStoneIntoLauncher() {
    setPendingStone(true);
    window.setTimeout(() => {
      showTip(
        "feature-stone-rule",
        "Stone loaded",
        "Three consecutive non-merging shots after the first 15 shots load a Stone. It will not merge, but it shoves nearby atoms and can be destroyed for bonus points.",
        "danger",
      );
    }, 0);
    spawnPopup("⛰ STONE LOADED");
    haptic([20, 30, 20]);
    showTip(
      "feature-stone",
      "⛰ A Stone is loaded!",
      "Your next shot is a giant Stone. Aim it at clusters — it won't merge, but it shoves nearby atoms 5× harder than usual and takes 8 hits to crack for a big score bonus.",
      "danger",
    );
  }

  // Legacy: drop a stone directly onto the board (no longer used by the
  // no-merge trigger; kept for potential future power-ups).
  function spawnStoneOnBoard() {
    const stoneR = (ballSize / 2) * (1 + (8 - 4) * 0.11);
    const sx = boardW / 2;
    const sy = TOP_PAD + stoneR + 6;
    setBalls((prev) => {
      const others = prev.map((b) => ({ ...b }));
      for (let iter = 0; iter < 18; iter++) {
        let moved = false;
        for (const o of others) {
          const dxs = o.x - sx;
          const dys = o.y - sy;
          const d = Math.hypot(dxs, dys) || 0.001;
          const min = stoneR + o.r;
          if (d < min) {
            const push = min - d + 0.5;
            o.x += (dxs / d) * push;
            o.y += (dys / d) * push;
            moved = true;
          }
        }
        for (let i = 0; i < others.length; i++) {
          for (let j = i + 1; j < others.length; j++) {
            const a = others[i];
            const b = others[j];
            if (a.stoneHp != null && b.stoneHp != null) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            const min = a.r + b.r;
            if (d < min) {
              const push = (min - d) / 2 + 0.25;
              a.x -= (dx / d) * push;
              a.y -= (dy / d) * push;
              b.x += (dx / d) * push;
              b.y += (dy / d) * push;
              moved = true;
            }
          }
        }
        for (const o of others) {
          o.x = Math.max(SIDE_PAD + o.r, Math.min(boardW - SIDE_PAD - o.r, o.x));
          o.y = Math.max(TOP_PAD + o.r, o.y);
        }
        if (!moved) break;
      }
      const stone: Ball = {
        id: nextBallId(),
        x: sx,
        y: sy,
        atom: -1,
        r: stoneR,
        stoneHp: STONE_MAX_HP,
        stoneMaxHp: STONE_MAX_HP,
      };
      return [...others, stone];
    });
    setStoneSpawnCount((count) => count + 1);
    spawnPopup("⛰ STONE!");
    haptic([30, 50, 30]);
    showTip(
      "feature-stone",
      "⛰ A Stone appeared!",
      "Stones don't merge with anything. Hit one with atoms to crack it — each impact shoves nearby atoms 5× harder than usual. Destroy it after 8 hits for a big score bonus.",
      "danger",
    );
  }

  // === aim handling ===
  const updateAimFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const dx = px - launcherX;
      const dy = py - launcherY;
      if (dy >= -2) return; // pointer below launcher — ignore
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const clamped = Math.max(-MAX_AIM_DEG, Math.min(MAX_AIM_DEG, angle));
      setAimDeg(clamped);
    },
    [launcherX, launcherY],
  );

  // preview trajectory (recomputed every render based on aimDeg)
  const previewPath = useMemo(() => {
    if (busy || gameOver || won) return [];
    if (currentIsEGun && !pendingStone) {
      const r = castStraightRay(aimDeg);
      return r?.path ?? [];
    }
    const r = castRay(aimDeg);
    return r?.path ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aimDeg, balls, busy, gameOver, won, boardW, boardH, cellSize, currentIsEGun, pendingStone]);

  const eGunPreviewHitIds = useMemo(() => {
    if (!currentIsEGun || pendingStone || previewPath.length < 2) return new Set<number>();
    const start = previewPath[0];
    const end = previewPath[previewPath.length - 1];
    return new Set(
      balls
        .filter(
          (b) =>
            b.stoneHp == null &&
            b.atom < 118 &&
            distanceToSegment(b.x, b.y, start.x, start.y, end.x, end.y) <= b.r + eGunR * 0.7,
        )
        .map((b) => b.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balls, currentIsEGun, pendingStone, previewPath]);

  const progressPct = Math.min(100, (highest / target) * 100);
  const continueChoiceStats = continueClaimPromptOpen
    ? {
        stars: earnedStars || 1,
        score,
        shots,
        bestCombo: runBestCombo,
      }
    : winChoice;

  async function runAttemptAdIfDue() {
    if (clearedStagesSinceAd < 5 || hasProPack) return;
    const shown = await showInterstitialIfReady(hasProPack);
    if (shown) markInterstitialShown();
  }

  async function handleWonMain() {
    await runAttemptAdIfDue();
    onExit();
  }

  async function handleWonMap() {
    await runAttemptAdIfDue();
    onMap();
  }

  async function handleGameOverMain() {
    await runAttemptAdIfDue();
    onExit();
  }

  async function handleGameOverRetry() {
    await runAttemptAdIfDue();
    onWin(levelId);
  }

  return (
    <div
      className="app-shell"
      style={{ display: "flex", flexDirection: "column", minHeight: "100dvh", padding: 12 }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          maxWidth: 480,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Game settings"
              aria-label="Open game settings"
              style={{ ...iconBtn, minWidth: 0, padding: "6px 8px" }}
            >
              <SettingsIcon size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              title="Open shot log"
              aria-label="Open shot log"
              style={{ ...iconBtn, minWidth: 0, padding: "6px 8px" }}
            >
              📜
            </button>
            <button
              type="button"
              onClick={() => setPaused(true)}
              title="Pause"
              aria-label="Pause game"
              disabled={gameOver || won}
              style={{ ...iconBtn, minWidth: 0, padding: "6px 8px" }}
            >
              ⏸
            </button>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted-foreground)" }}>
              {getModeLevelLabel(gameMode, level)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {gameMode.id === "campaign" ? level.name : `${gameMode.emoji} ${gameMode.name}`}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent)",
                marginTop: 2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mode === "gold-rush-timer"
                ? `⏱ ${formatTime(Math.max(0, (gameMode.timerSec ?? 180) * 1000 - elapsedMs))}`
                : `⏱ ${formatTime(elapsedMs)}`}
            </div>
          </div>
          <div style={{ ...iconBtn, cursor: "default", minWidth: 74, textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>SCORE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>
              {formatScore(score)}
            </div>
            <div
              className={
                mode === "isotope-decay" && shots > 0 && shots % 20 === 19
                  ? "decay-warn-flash"
                  : undefined
              }
              style={{
                fontSize: 10,
                color:
                  mode === "isotope-decay" && shots > 0 && shots % 20 === 19
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
                fontWeight: mode === "isotope-decay" && shots > 0 && shots % 20 === 19 ? 900 : 400,
              }}
              title={
                mode === "isotope-decay" && shots > 0 && shots % 20 === 19
                  ? "Next shot triggers isotope decay!"
                  : undefined
              }
            >
              {shots} shots
            </div>
          </div>
        </div>

        {!isMoleculeChallenge && (
          <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 10,
            padding: "10px 12px",
            background: "var(--surface)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            marginBottom: 10,
          }}
        >
          <ElementBall atomicNumber={highest} size={36} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              <span>Highest reached</span>
              <span>
                Target: {targetEl?.symbol} (#{target})
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--surface-high)",
                borderRadius: 3,
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--primary), var(--accent))",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
      </div>
      <button
            type="button"
            className={continuingPastTarget ? "target-claim-flash" : undefined}
            title={
              continuingPastTarget
                ? "Target reached — tap to finish the level or keep playing."
                : `Target: ${targetEl?.symbol ?? "?"}`
            }
            aria-label="Open target completion options"
            onClick={() => {
              if (!continuingPastTarget) return;
              setContinueClaimPromptOpen(true);
            }}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              borderRadius: "50%",
              cursor: continuingPastTarget ? "pointer" : "default",
            }}
          >
            <ElementBall atomicNumber={target} size={36} glow />
          </button>
          </div>
        )}

        {isMoleculeChallenge && moleculeObjective && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              background: "color-mix(in oklch, var(--accent) 12%, var(--surface))",
              borderRadius: 10,
              border: "1px solid color-mix(in oklch, var(--accent) 45%, var(--border))",
              marginBottom: 10,
            }}
          >
            <MoleculeVisual compound={moleculeObjective} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--accent)", fontWeight: 900 }}>
                LAB CHALLENGE
              </div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>
                Form {moleculeObjective.name} ({moleculeObjective.formula}) to clear
              </div>
            </div>
          </div>
        )}

        {/* GRAB COMBO BAR */}
        {grabEnabled && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              background: "var(--surface)",
              borderRadius: 10,
              border: "1px solid var(--border)",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 14 }}>🤚</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                }}
              >
                <span>Grab combo</span>
                <span>
                  {grabProgress}/{GRAB_THRESHOLD}
                  {grabs > 0 ? `  •  ×${grabs} ready` : ""}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--surface-high)",
                  borderRadius: 3,
                  marginTop: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (grabProgress / GRAB_THRESHOLD) * 100)}%`,
                    height: "100%",
                    background:
                      grabs > 0
                        ? "linear-gradient(90deg, var(--accent), var(--success, var(--accent)))"
                        : "linear-gradient(90deg, var(--primary), var(--accent))",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* BOARD */}
        <div
          ref={boardRef}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture?.(e.pointerId);
            if (compoundMode) {
              handleCompoundBoardTap(e.clientX, e.clientY);
              return;
            }
            if (grabMode && grabs > 0 && !grabbing) {
              const rect = boardRef.current!.getBoundingClientRect();
              const px = e.clientX - rect.left;
              const py = e.clientY - rect.top;
              let hit: Ball | null = null;
              for (let i = balls.length - 1; i >= 0; i--) {
                const b = balls[i];
                if (b.stoneHp != null) continue;
                if (Math.hypot(px - b.x, py - b.y) <= b.r) {
                  hit = b;
                  break;
                }
              }
              if (hit) {
                setGrabbing({ id: hit.id, x: px, y: py });
                setGrabs((g) => g - 1);
                runPowerUpsUsedRef.current += 1;
              }
              return;
            }
            updateAimFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (grabbing) {
              const rect = boardRef.current!.getBoundingClientRect();
              setGrabbing({
                id: grabbing.id,
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
              return;
            }
            if (compoundMode) return;
            if (grabMode) return;
            if (e.buttons === 0 && e.pointerType === "mouse") {
              // hover-aim with mouse
              updateAimFromPointer(e.clientX, e.clientY);
              return;
            }
            updateAimFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (grabbing) {
              const rect = boardRef.current!.getBoundingClientRect();
              dropGrabbed(e.clientX - rect.left, e.clientY - rect.top);
              setGrabbing(null);
              setGrabMode(false);
              return;
            }
            if (compoundMode) return;
            if (grabMode) return;
            updateAimFromPointer(e.clientX, e.clientY);
            if (shootingStyle === "hold") shoot();
          }}
          style={{
            position: "relative",
            background: "linear-gradient(180deg, oklch(0.18 0.05 275), oklch(0.13 0.04 275))",
            borderRadius: 16,
            border: "1px solid var(--border)",
            padding: 4,
            flex: 1,
            minHeight: 360,
            boxShadow: "inset 0 0 30px rgba(79, 195, 247, 0.08)",
            display: "flex",
            flexDirection: "column",
            touchAction: "none",
            cursor: compoundMode ? "pointer" : "crosshair",
            userSelect: "none",
          }}
        >
          {/* danger zone shading near the launcher (bottom) */}
          <div
            className="danger-zone-rise"
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              top: geo.dangerY,
              bottom: 4,
              background:
                "linear-gradient(0deg, var(--danger-glow) 0%, oklch(0.72 0.22 25 / 0.16) 58%, transparent 100%)",
              borderTop: "1px dashed var(--destructive)",
              borderRadius: 4,
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
              zIndex: 0,
            }}
          />

          {/* BALLS — absolutely positioned in pixel space */}
          {compoundMode && (
            <CompoundSelectionPanel
              counts={compoundSelectionCounts}
              selectedCount={selectedCompoundAtoms.length}
              match={matchingCompound}
              matchScore={matchingCompoundScore}
              matchIsNew={matchingCompoundIsNew}
              objective={isMoleculeChallenge ? moleculeObjective : null}
              discoveredHint={availableDiscoveredCompoundHint}
              newHint={availableNewCompoundHint}
              canAffordHint={totalScore >= COMPOUND_HINT_COST}
              canAffordSuperHint={totalScore >= COMPOUND_SUPER_HINT_COST}
              onHint={(compound) => revealCompoundHint(compound, COMPOUND_HINT_COST)}
              onSuperHint={(compound) => revealCompoundHint(compound, COMPOUND_SUPER_HINT_COST)}
              onForm={formSelectedCompound}
              onCancel={() => {
                setCompoundMode(false);
                setSelectedCompoundIds(new Set());
              }}
            />
          )}

          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            {balls.map((b) => {
              const isDrag = grabbing?.id === b.id;
              const isCompoundSelected = selectedCompoundIds.has(b.id);
              const isFormingCompound = formingCompoundIds.has(b.id);
              const x = isDrag ? grabbing!.x : b.x;
              const y = isDrag ? grabbing!.y : b.y;
              if (b.stoneHp != null) {
                const hp = b.stoneHp;
                const isHit = stoneHitIds.has(b.id);
                const size = b.r * 2;
                return (
                  <div
                    key={b.id}
                    className={isHit ? "stone-hit" : undefined}
                    style={{
                      position: "absolute",
                      left: x - b.r,
                      top: y - b.r,
                      width: size,
                      height: size,
                      borderRadius: stoneBorderRadius,
                      clipPath: stoneClipPath(b.id),
                      background: stoneBackground,
                      boxShadow:
                        "0 6px 14px rgba(0,0,0,0.55), inset 0 -10px 18px rgba(0,0,0,0.55), inset 0 6px 14px rgba(255,255,255,0.10)",
                      border: "2px solid oklch(0.2 0.015 55)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "oklch(0.95 0.02 60)",
                      fontWeight: 900,
                      transition: isHit
                        ? "left 180ms ease-out, top 180ms ease-out, width 220ms ease-out, height 220ms ease-out"
                        : "left 180ms ease-out, top 180ms ease-out, width 220ms ease-out, height 220ms ease-out",
                      textShadow: "0 1px 3px rgba(0,0,0,0.85)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(125deg, transparent 38%, oklch(0.08 0.01 50 / 0.45) 39%, transparent 41%)," +
                          "linear-gradient(70deg, transparent 60%, oklch(0.1 0.01 50 / 0.35) 61%, transparent 63%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{ fontSize: Math.max(14, size * 0.36), lineHeight: 1.05, zIndex: 1 }}>
                      {hp}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={b.id}
                  className={[
                    gravityFxId && b.stoneHp == null ? "gravity-atom-lift" : "",
                    isCompoundSelected ? "compound-selected-atom" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    position: "absolute",
                    left: x - b.r,
                    top: y - b.r,
                    transition: isDrag
                      ? "none"
                      : "left 420ms cubic-bezier(0.2, 0.9, 0.2, 1), top 420ms cubic-bezier(0.2, 0.9, 0.2, 1)",
                    zIndex: isDrag ? 5 : undefined,
                    opacity: isFormingCompound ? 0 : 1,
                    filter: eGunPreviewHitIds.has(b.id)
                      ? "drop-shadow(0 0 16px oklch(0.82 0.18 85 / 0.95)) brightness(1.18)"
                      : isCompoundSelected
                        ? "drop-shadow(0 0 18px oklch(0.82 0.16 145 / 0.95)) brightness(1.16)"
                      : isDrag
                        ? "drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
                        : undefined,
                  }}
                >
                  <ElementBall
                    atomicNumber={b.atom}
                    size={ballSize}
                    highlight={highlightId === b.id || eGunPreviewHitIds.has(b.id)}
                    wiggle={wiggleIds.has(b.id) || isCompoundSelected}
                    glow={isDrag || isCompoundSelected}
                    unstableShots={b.unstableShots}
                  />
                </div>
              );
            })}
          </div>

          {compoundFx && (
            <CompoundFormationFx
              compound={compoundFx.compound}
              atoms={compoundFx.atoms}
              center={{ x: boardW / 2, y: Math.max(TOP_PAD + 120, boardH * 0.36) }}
            />
          )}

          {compoundTextFx && (
            <div
              className="new-compound-text-fx"
              style={{
                position: "absolute",
                left: "50%",
                top: Math.max(TOP_PAD + 42, boardH * 0.2),
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              {compoundTextFx.isNew ? "New compound: " : "Formed "}
              {compoundTextFx.compound.name}
            </div>
          )}

          {mergeComboFx.map((fx, index) => (
            <div
              key={fx.id}
              className={fx.isotope ? "merge-combo-fx isotope" : "merge-combo-fx"}
              style={
                {
                  position: "absolute",
                  left: fx.x,
                  top: fx.y,
                  zIndex: 8,
                  pointerEvents: "none",
                  animationDelay: `${MERGE_COMBO_START_MS + index * MERGE_COMBO_STEP_MS}ms`,
                  "--combo-color": ELEMENTS[fx.atom - 1]?.glowColor ?? "var(--accent)",
                } as React.CSSProperties & Record<"--combo-color", string>
              }
            >
              <span className="merge-combo-ring merge-combo-ring-a" />
              <span className="merge-combo-ring merge-combo-ring-b" />
              <span className="merge-combo-core">
                x{fx.depth + 1}
                {fx.isotope ? " isotope" : ""}
              </span>
            </div>
          ))}

          {gravityFxId && (
            <div
              className="gravity-fx"
              style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}
            >
              <div className="gravity-fx-core">🌀</div>
              <div className="gravity-fx-ring gravity-fx-ring-a" />
              <div className="gravity-fx-ring gravity-fx-ring-b" />
              {Array.from({ length: 9 }, (_, i) => (
                <div
                  key={i}
                  className="gravity-fx-stream"
                  style={{ left: `${10 + i * 10}%`, animationDelay: `${i * 45}ms` }}
                />
              ))}
            </div>
          )}

          {fusionJumpFx && (
            <div
              className="fusion-jump-fx"
              style={{
                position: "absolute",
                left: fusionJumpFx.x,
                top: fusionJumpFx.y,
                zIndex: 6,
                pointerEvents: "none",
              }}
            >
              <div className="fusion-jump-fx-ring fusion-jump-fx-ring-a" />
              <div className="fusion-jump-fx-ring fusion-jump-fx-ring-b" />
              <div className="fusion-jump-fx-core">⏭</div>
            </div>
          )}

          {stageClearFx && (
            <div
              className="stage-clear-fx"
              aria-live="polite"
              aria-label={stageClearFx.compound ? "Target compound formed" : "Target atom formed"}
            >
              <div className="stage-clear-wash" />
              <div className="stage-clear-ring stage-clear-ring-a" />
              <div className="stage-clear-ring stage-clear-ring-b" />
              <div className="stage-clear-burst">
                {Array.from({ length: 18 }, (_, i) => (
                  <span
                    key={i}
                    className="stage-clear-spark"
                    style={{
                      transform: `rotate(${i * 20}deg) translateY(-1px)`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
              <div className="stage-clear-card">
                <div className="stage-clear-eyebrow">
                  {stageClearFx.compound ? "TARGET COMPOUND FORMED" : "TARGET ATOM FORMED"}
                </div>
                <div className="stage-clear-atom">
                  {stageClearFx.compound ? (
                    <MoleculeVisual compound={stageClearFx.compound} size={104} />
                  ) : (
                    <ElementBall atomicNumber={target} size={92} glow />
                  )}
                </div>
                <div className="stage-clear-title">
                  {stageClearFx.compound
                    ? `${stageClearFx.compound.name} formed!`
                    : `${targetEl?.name ?? "Target"} discovered!`}
                </div>
                <div className="stage-clear-subtitle">Clearing the stage…</div>
                <div className="stage-clear-stars">
                  {Array.from({ length: 3 }, (_, i) => (i < stageClearFx.stars ? "★" : "☆")).join(
                    "",
                  )}
                </div>
              </div>
            </div>
          )}

          {grabMode && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 8,
                zIndex: 6,
                padding: "6px 10px",
                borderRadius: 10,
                background: "var(--surface-elevated)",
                border: "1px solid var(--accent)",
                fontSize: 11,
                color: "var(--accent)",
                fontWeight: 700,
                pointerEvents: "none",
              }}
            >
              Drag any atom to a new spot
            </div>
          )}

          {/* AIM TRAJECTORY */}
          {!busy && !gameOver && !won && previewPath.length > 1 && (
            <svg
              style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
              width={boardW}
              height={boardH}
            >
              {currentIsEGun && !pendingStone ? (
                <>
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="oklch(0.82 0.18 85)"
                    strokeWidth={20}
                    strokeLinecap="round"
                    opacity={0.18}
                  />
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="oklch(0.92 0.2 90)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    opacity={0.92}
                  />
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                </>
              ) : (
                <>
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    strokeDasharray="4 6"
                    opacity={0.6}
                  />
                  {/* landing target marker */}
                  {(() => {
                    const last = previewPath[previewPath.length - 1];
                    return (
                      <circle
                        cx={last.x}
                        cy={last.y}
                        r={ballSize / 2.4}
                        fill="none"
                        stroke="var(--accent)"
                        strokeWidth={2}
                        opacity={0.7}
                      />
                    );
                  })()}
                </>
              )}
            </svg>
          )}

          {eGunBeamPath && eGunBeamPath.length > 1 && (
            <svg
              style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 }}
              width={boardW}
              height={boardH}
            >
              <polyline
                points={eGunBeamPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="oklch(0.82 0.18 85)"
                strokeWidth={28}
                strokeLinecap="round"
                opacity={0.24}
              />
              <polyline
                points={eGunBeamPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="oklch(0.95 0.2 95)"
                strokeWidth={10}
                strokeLinecap="round"
                opacity={0.95}
              />
              <polyline
                points={eGunBeamPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="white"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.92}
              />
            </svg>
          )}

          {/* PROJECTILE */}
          {projectile && (
            <div
              style={{
                position: "absolute",
                left: projectile.x - projShotSize / 2,
                top: projectile.y - projShotSize / 2,
                pointerEvents: "none",
                zIndex: 4,
              }}
            >
              {showCatalystShotRadius && (
                <CatalystRadiusRing radius={catalystShotRadius} size={projShotSize} />
              )}
              {pendingGamma ? (
                <GammaVisual size={projShotSize} />
              ) : pendingStone ? (
                <StoneVisual size={projShotSize} hp={STONE_MAX_HP} />
              ) : currentIsEGun ? (
                <EGunVisual size={projShotSize} />
              ) : currentIsBlank ? (
                <BlankAtomVisual size={projShotSize} />
              ) : (
                <ElementBall
                  atomicNumber={current}
                  size={ballSize}
                  glow
                  shimmer={currentIsShimmer}
                  unstableShots={currentIsUnstable ? isotopeChargeCapacity(current) : undefined}
                />
              )}
            </div>
          )}

          {/* LAUNCHER */}
          <div
            role={shootingStyle === "press" ? "button" : undefined}
            tabIndex={shootingStyle === "press" ? 0 : undefined}
            aria-label={shootingStyle === "press" ? "Shoot queued atom" : undefined}
            onPointerDown={(event) => {
              if (shootingStyle !== "press") return;
              event.stopPropagation();
            }}
            onPointerUp={(event) => {
              if (shootingStyle !== "press") return;
              event.stopPropagation();
              shoot();
            }}
            onKeyDown={(event) => {
              if (shootingStyle !== "press") return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              shoot();
            }}
            style={{
              position: "absolute",
              left: launcherX - projShotSize / 2,
              top: launcherY - projShotSize / 2,
              zIndex: 2,
              pointerEvents: shootingStyle === "press" ? "auto" : "none",
              cursor: shootingStyle === "press" ? "pointer" : undefined,
              transform: `rotate(${aimDeg}deg)`,
              transformOrigin: "center center",
            }}
          >
            {!projectile && showCatalystShotRadius && (
              <CatalystRadiusRing radius={catalystShotRadius} size={projShotSize} />
            )}
            {!projectile &&
              (pendingGamma ? (
                <GammaVisual size={projShotSize} />
              ) : pendingStone ? (
                <StoneVisual size={projShotSize} hp={STONE_MAX_HP} />
              ) : currentIsEGun ? (
                <EGunVisual size={projShotSize} />
              ) : currentIsBlank ? (
                <BlankAtomVisual size={projShotSize} />
              ) : (
                <ElementBall
                  atomicNumber={current}
                  size={ballSize}
                  glow
                  shimmer={currentIsShimmer}
                  unstableShots={currentIsUnstable ? isotopeChargeCapacity(current) : undefined}
                />
              ))}
          </div>

          {/* SCORE POPUPS */}
          {popups.map((p) => (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                color: "var(--accent)",
                fontWeight: 800,
                fontSize: 18,
                animation: "float-up 900ms ease-out forwards",
                pointerEvents: "none",
                textShadow: "0 0 8px var(--accent-glow)",
                zIndex: 10,
              }}
            >
              {p.text}
            </div>
          ))}
        </div>

        {/* QUEUE BAR */}
        <div
          style={{
            marginTop: 10,
            padding: 10,
            background: "var(--surface)",
            borderRadius: 14,
            border: "1px solid var(--border)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-start", flex: "0 0 auto" }}>
            {queue
              .slice(1)
              .map((atom, index) => ({ atom, queueIndex: index + 1, distance: index }))
              .reverse()
              .map(({ atom, queueIndex, distance }) =>
                eGunQueue[queueIndex] ? (
                  <EGunVisual key={queueIndex} size={32 - distance * 3} />
                ) : blankQueue[queueIndex] ? (
                  <BlankAtomVisual key={queueIndex} size={32 - distance * 3} />
                ) : (
                  <ElementBall
                    key={queueIndex}
                    atomicNumber={atom}
                    size={32 - distance * 3}
                    shimmer={shimmerQueue[queueIndex]}
                    unstableShots={unstableQueue[queueIndex] ? isotopeChargeCapacity(atom) : undefined}
                  />
                ),
              )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 6,
              flex: "1 1 auto",
              minWidth: 0,
              overflowX: "auto",
              flexWrap: "nowrap",
              flexDirection: "row",
              padding: "2px 2px 4px",
            }}
          >
            {transmuteEnabled && (transmuteCharges > 0 || pendingReversiblePowerUp === "transmute") && (
              <button
                type="button"
                title="Transmute: reroll your current queued atom into a higher-tier atom."
                aria-label={`Use Transmute Shot power-up (${transmuteCharges} available)`}
                onClick={triggerTransmutePowerUp}
                {...powerUpInfoHandlers(
                  "🔀 Transmute Shot",
                  "Rerolls your current queued atom into a higher tier. It cannot be canceled after use, so choose carefully.",
                )}
                disabled={
                  busy ||
                  (pendingReversiblePowerUp !== "transmute" &&
                    (currentIsEGun ||
                      currentIsBlank ||
                      current >= target - 1 ||
                      pendingReversiblePowerUp != null))
                }
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${pendingReversiblePowerUp === "transmute" ? "var(--accent)" : "oklch(0.76 0.18 305)"}`,
                  background:
                    pendingReversiblePowerUp === "transmute"
                      ? "linear-gradient(135deg, var(--accent), oklch(0.5 0.18 255))"
                      : "linear-gradient(135deg, oklch(0.62 0.2 305), oklch(0.5 0.18 255))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px oklch(0.66 0.2 305 / 0.5)",
                  opacity:
                    busy || currentIsEGun || currentIsBlank || current >= target - 1
                      ? 0.55
                      : 1,
                  cursor:
                    busy || currentIsEGun || currentIsBlank || current >= target - 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="transmute" size={32} />
                </span>
                <span style={powerUpCount}>{transmuteCharges}</span>
              </button>
            )}
            {fusionJumpEnabled && (fusionJumpCharges > 0 || fusionJumpArmed) && (
              <button
                type="button"
                title="Fusion Jump: arm your next merge to skip one element tier."
                aria-label={`Arm Fusion Jump power-up (${fusionJumpCharges} available)`}
                onClick={triggerFusionJumpPowerUp}
                {...powerUpInfoHandlers(
                  "⏭ Fusion Jump",
                  "Arms your next merge to skip one element tier. Tap it again before shooting to cancel and refund the charge.",
                )}
                disabled={
                  busy ||
                  (pendingReversiblePowerUp !== "fusion-jump" && pendingReversiblePowerUp != null)
                }
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${fusionJumpArmed ? "var(--accent)" : "oklch(0.72 0.16 150)"}`,
                  background: fusionJumpArmed
                    ? "linear-gradient(135deg, var(--accent), var(--success, var(--primary)))"
                    : "linear-gradient(135deg, oklch(0.62 0.16 150), oklch(0.42 0.14 185))",
                  color: "var(--primary-foreground)",
                  boxShadow: fusionJumpArmed
                    ? "0 0 16px var(--accent-glow)"
                    : "0 0 14px oklch(0.62 0.16 150 / 0.45)",
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="fusion-jump" size={32} />
                </span>
                <span style={powerUpCount}>{fusionJumpArmed ? "↩" : fusionJumpCharges}</span>
              </button>
            )}
            {catalystEnabled && (catalystCharges > 0 || catalystShotsRemaining > 0) && (
              <button
                type="button"
                title="Catalyst Aura: double fusion radius for your next 5 shots."
                aria-label={`Use Catalyst Aura power-up (${catalystCharges} available)`}
                onClick={triggerCatalystPowerUp}
                {...powerUpInfoHandlers(
                  "🧪 Catalyst Aura",
                  "Doubles fusion radius for your next 5 shots. A green ring around the loaded shot shows the larger merge radius.",
                )}
                disabled={
                  busy ||
                  (pendingReversiblePowerUp !== "catalyst" &&
                    (catalystCharges <= 0 ||
                      catalystShotsRemaining > 0 ||
                      pendingReversiblePowerUp != null))
                }
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${catalystShotsRemaining > 0 ? "var(--accent)" : "oklch(0.78 0.18 115)"}`,
                  background:
                    catalystShotsRemaining > 0
                      ? "linear-gradient(135deg, var(--accent), oklch(0.68 0.18 115))"
                      : "linear-gradient(135deg, oklch(0.72 0.18 115), oklch(0.48 0.14 150))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px oklch(0.72 0.18 115 / 0.5)",
                  opacity: busy || catalystShotsRemaining > 0 ? 0.75 : 1,
                  cursor: busy || catalystShotsRemaining > 0 ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="catalyst" size={32} />
                </span>
                <span style={powerUpCount}>
                  {pendingReversiblePowerUp === "catalyst"
                    ? "↩"
                    : catalystShotsRemaining > 0
                      ? catalystShotsRemaining
                      : catalystCharges}
                </span>
              </button>
            )}
            {emissionEnabled && (emissionCharges > 0 || pendingReversiblePowerUp === "emission") && (
              <button
                type="button"
                title="Emission: raise your current queued atom by 1 tier."
                aria-label={`Use Emission power-up (${emissionCharges} available)`}
                onClick={triggerEmissionPowerUp}
                {...powerUpInfoHandlers(
                  "☢ Emission",
                  "Raises every atom currently waiting in your queue by 1 tier. Tap again before shooting to undo it.",
                )}
                disabled={
                  busy ||
                  (pendingReversiblePowerUp !== "emission" &&
                    (queue.every(
                        (atom, i) =>
                          eGunQueue[i] || blankQueue[i] || raiseAtomForEmission(atom) === atom,
                      ) ||
                      pendingReversiblePowerUp != null))
                }
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${pendingReversiblePowerUp === "emission" ? "var(--accent)" : "oklch(0.82 0.19 55)"}`,
                  background:
                    pendingReversiblePowerUp === "emission"
                      ? "linear-gradient(135deg, var(--accent), oklch(0.55 0.16 35))"
                      : "linear-gradient(135deg, oklch(0.72 0.19 55), oklch(0.55 0.16 35))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px oklch(0.72 0.19 55 / 0.5)",
                  opacity:
                    busy ||
                    queue.every(
                      (atom, i) =>
                        eGunQueue[i] || blankQueue[i] || raiseAtomForEmission(atom) === atom,
                    )
                      ? 0.65
                      : 1,
                  cursor:
                    busy ||
                    queue.every(
                      (atom, i) =>
                        eGunQueue[i] || blankQueue[i] || raiseAtomForEmission(atom) === atom,
                    )
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="emission" size={32} />
                </span>
                <span style={powerUpCount}>
                  {pendingReversiblePowerUp === "emission" ? "↩" : emissionCharges}
                </span>
              </button>
            )}
            {gravityEnabled && gravityCharges > 0 && (
              <button
                type="button"
                className={powerUpStage === "gravity" ? "target-claim-flash" : undefined}
                title="Gravity: make all atoms fall upward. Combos count toward Grab progress."
                aria-label={`Use Gravity power-up (${gravityCharges} available)`}
                onClick={triggerGravityPowerUp}
                {...powerUpInfoHandlers(
                  "🌀 Gravity",
                  "Immediately lifts all atoms upward and resolves any new fusions. Because it changes the board right away, it cannot be canceled after use.",
                )}
                disabled={busy}
                style={{
                  ...powerUpIconBtn,
                  border: "1px solid var(--accent)",
                  background: "linear-gradient(135deg, oklch(0.55 0.16 260), var(--primary))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px var(--accent-glow)",
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="gravity" size={32} />
                </span>
                <span style={powerUpCount}>{gravityCharges}</span>
              </button>
            )}
            {grabEnabled && grabs > 0 && (
              <button
                type="button"
                className={powerUpStage === "grab" ? "target-claim-flash" : undefined}
                title="Grab: drag any atom on the board to a new position."
                aria-label={`Toggle Grab power-up (${grabs} available)`}
                onClick={() => setGrabMode((g) => !g)}
                {...powerUpInfoHandlers(
                  "🤚 Grab",
                  "Toggle Grab, then drag an atom to a new position. Toggle it off before grabbing if you change your mind.",
                )}
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${grabMode || powerUpStage === "grab" ? "var(--accent)" : "var(--border)"}`,
                  background: grabMode
                    ? "linear-gradient(135deg, var(--accent), var(--primary))"
                    : "var(--surface-elevated)",
                  color: grabMode ? "var(--primary-foreground)" : "var(--foreground)",
                  boxShadow: grabMode || powerUpStage === "grab" ? "0 0 14px var(--accent-glow)" : undefined,
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="grab" size={32} />
                </span>
                <span style={powerUpCount}>{grabs}</span>
              </button>
            )}
            {(compoundEnabled || isMoleculeChallenge) && (compoundCharges > 0 || compoundMode || isMoleculeChallenge) && (
              <button
                type="button"
                className={challengeCompoundReady && !compoundMode ? "compound-ready-flash" : undefined}
                title="Compound: select atoms to form a known compound."
                aria-label={`Use Compound power-up (${compoundCharges} available)`}
                onClick={triggerCompoundPowerUp}
                {...powerUpInfoHandlers(
                  "Compound",
                  isMoleculeChallenge && moleculeObjective
                    ? `Form ${moleculeObjective.formula} to clear this lab challenge.`
                    : "Select atoms using no more than 3 element types. Match a known recipe to form a compound, remove those atoms, and earn a big bonus.",
                )}
                disabled={
                  busy ||
                  (!compoundMode &&
                    ((!isMoleculeChallenge && compoundCharges <= 0) ||
                      pendingGamma ||
                      currentIsEGun ||
                      pendingReversiblePowerUp != null))
                }
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${compoundMode ? "var(--accent)" : "oklch(0.75 0.16 145)"}`,
                  background: compoundMode
                    ? "linear-gradient(135deg, var(--accent), oklch(0.55 0.16 145))"
                    : "linear-gradient(135deg, oklch(0.62 0.16 145), oklch(0.42 0.13 185))",
                  color: "var(--primary-foreground)",
                  boxShadow: challengeCompoundReady && !compoundMode
                    ? "0 0 20px var(--success, var(--accent)), 0 0 34px var(--accent-glow)"
                    : compoundMode
                    ? "0 0 16px var(--accent-glow)"
                    : "0 0 14px oklch(0.62 0.16 145 / 0.45)",
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="molecule" size={32} />
                </span>
                <span style={powerUpCount}>{compoundMode ? "×" : compoundCharges}</span>
              </button>
            )}
            {gammaEnabled && (gammaCharges > 0 || pendingGamma) && (
              <button
                type="button"
                title="Gamma Bomb: clear every non-stone atom in a wide radius."
                aria-label={`Use Gamma Bomb power-up (${gammaCharges} available)`}
                onClick={triggerGammaPowerUp}
                {...powerUpInfoHandlers(
                  "☢ Gamma Bomb",
                  "Arms a slow, heavy projectile. On impact it clears every non-stone atom inside a wide radius. Tap again before shooting to cancel and refund the charge.",
                )}
                disabled={busy || (!pendingGamma && currentIsEGun)}
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${pendingGamma ? "var(--accent)" : "oklch(0.7 0.2 145)"}`,
                  background: pendingGamma
                    ? "linear-gradient(135deg, var(--accent), oklch(0.55 0.2 145))"
                    : "linear-gradient(135deg, oklch(0.6 0.2 145), oklch(0.42 0.16 150))",
                  color: "var(--primary-foreground)",
                  boxShadow: pendingGamma
                    ? "0 0 16px var(--accent-glow)"
                    : "0 0 14px oklch(0.6 0.2 145 / 0.5)",
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="gamma" size={32} />
                </span>
                <span style={powerUpCount}>{pendingGamma ? "↩" : gammaCharges}</span>
              </button>
            )}
            {shuffleEnabled && queueShuffleCharges > 0 && (
              <button
                type="button"
                title="Queue Shuffle: rerolls the 3 atoms waiting in your queue."
                aria-label={`Use Queue Shuffle power-up (${queueShuffleCharges} available)`}
                onClick={triggerQueueShufflePowerUp}
                {...powerUpInfoHandlers(
                  "♻ Queue Shuffle",
                  "Rerolls every atom currently waiting in your queue. Earned every 15 atom-on-stone hits.",
                )}
                disabled={busy || pendingGamma}
                style={{
                  ...powerUpIconBtn,
                  border: "1px solid oklch(0.78 0.16 175)",
                  background:
                    "linear-gradient(135deg, oklch(0.68 0.16 175), oklch(0.48 0.14 200))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px oklch(0.68 0.16 175 / 0.5)",
                  opacity: busy || pendingGamma ? 0.65 : 1,
                  cursor: busy || pendingGamma ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true" style={{ display: "grid", placeItems: "center" }}>
                  <PowerUpBadge icon="queue-shuffle" size={32} />
                </span>
                <span style={powerUpCount}>{queueShuffleCharges}</span>
              </button>
            )}
          </div>
        </div>

        {inventoryPickerOpen && !won && !gameOver && (
          <InventoryStartModal
            inventory={powerUpInventory}
            selected={selectedInventoryPowerUps}
            onChange={changeInventorySelection}
            onStart={startWithSelectedInventory}
            onBack={exitToMenu}
          />
        )}
        {playStylePromptOpen && !won && !gameOver && (
          <PlayStyleModal
            selected={shootingStyle}
            onSelect={(style) => {
              setShootingStyle(style);
              setPlayStylePromptOpen(false);
            }}
          />
        )}
        {confirmAction && !won && !gameOver && (
          <ConfirmRunExitModal
            action={confirmAction}
            onCancel={() => setConfirmAction(null)}
            onConfirm={() => {
              if (confirmAction === "restart") restartLevel();
              else leaveGameDiscardingRun();
            }}
          />
        )}
        {historyOpen && <ShotHistoryModal entries={shotHistory} onClose={() => setHistoryOpen(false)} />}
        {settingsOpen && !gameOver && !won && (
          <InGameSettingsModal
            musicEnabled={musicEnabled}
            soundEnabled={soundEnabled}
            shootingStyle={shootingStyle}
            onToggleMusic={toggleInGameMusic}
            onToggleSound={toggleSound}
            onToggleShootingStyle={() =>
              setShootingStyle(shootingStyle === "hold" ? "press" : "hold")
            }
            onClose={() => setSettingsOpen(false)}
            onRestart={() => setConfirmAction("restart")}
            onLeave={() => setConfirmAction("leave")}
          />
        )}
        {paused && !gameOver && !won && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Game paused"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(6px)",
              zIndex: 1000,
              display: "grid",
              placeItems: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 22,
                maxWidth: 320,
                width: "100%",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 3,
                  color: "var(--accent)",
                  fontWeight: 800,
                }}
              >
                PAUSED
              </div>
              <h2 style={{ margin: "6px 0 4px", fontSize: 24 }}>Game paused</h2>
              <p
                style={{
                  margin: "0 0 16px",
                  color: "var(--muted-foreground)",
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                All power-up timers are frozen until you resume.
              </p>
              <div style={{ display: "grid", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPaused(false)}
                  style={{
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background:
                      "linear-gradient(135deg, var(--accent), var(--primary))",
                    color: "var(--primary-foreground)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ▶ Resume
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction("leave")}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    background: "var(--surface)",
                    color: "var(--foreground)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Exit to menu
                </button>
              </div>
            </div>
          </div>
        )}
        {discoveryEl !== null && (
          <DiscoveryModal atomicNumber={discoveryEl} onClose={() => setDiscoveryEl(null)} />
        )}
        {discoveryCompound && (
          <CompoundDiscoveryModal
            compound={discoveryCompound.compound}
            isNew={discoveryCompound.isNew}
            count={discoveryCompound.count}
            bonusScore={discoveryCompound.bonusScore}
            onClose={() => setDiscoveryCompound(null)}
          />
        )}
        {activeTip && (
          <FeatureTip
            title={activeTip.title}
            body={activeTip.body}
            tone={activeTip.tone}
            onClose={() => setActiveTip(null)}
          />
        )}
        {continueChoiceStats && !won && !gameOver && (
          <ContinueChoiceModal
            level={level}
            score={continueChoiceStats.score}
            shots={continueChoiceStats.shots}
            bestCombo={continueChoiceStats.bestCombo}
            stars={continueChoiceStats.stars}
            compound={continueChoiceStats.compound}
            isContinuing={continuingPastTarget}
            onClaim={() => {
              setWon(true);
              setWinChoice(null);
              setContinueClaimPromptOpen(false);
            }}
            onContinue={() => {
              restartLevel();
              return;
              spawnPopup("Keep going! Score mode 🚀");
            }}
          />
        )}
        {won && (
          <ResultModal
            title="LEVEL COMPLETE"
            accent="var(--success)"
            score={score}
            level={level}
            shots={shots}
            bestCombo={runBestCombo}
            stars={earnedStars}
            newDiscoveries={newlyDiscoveredThisRun}
            formedCompounds={formedCompoundsThisRun}
            isPowerUpPass={isPowerUpStage}
            claimablePowerUps={
              isPowerUpStage || hasClaimedUnusedInventoryRef.current ? {} : collectUnusedPowerUps()
            }
            claimedPowerUp={claimedResultPowerUp}
            onClaimPowerUp={claimResultPowerUp}
            onDiscoveryClick={setDiscoveryEl}
            onMain={handleWonMain}
            onNext={handleWonMap}
            nextLabel="Map"
          />
        )}
        {gameOver && !won && (
          <ResultModal
            title="GAME OVER"
            accent="var(--destructive)"
            score={score}
            level={level}
            shots={shots}
            bestCombo={runBestCombo}
            stars={0}
            newDiscoveries={newlyDiscoveredThisRun}
            formedCompounds={formedCompoundsThisRun}
            onDiscoveryClick={setDiscoveryEl}
            onMain={handleGameOverMain}
            onNext={handleGameOverRetry}
            nextLabel="Retry"
          />
        )}
      </div>
    </div>
  );
}

const powerUpIconBtn: React.CSSProperties = {
  position: "relative",
  width: 40,
  height: 40,
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 900,
  cursor: "pointer",
};

const powerUpCount: React.CSSProperties = {
  position: "absolute",
  right: -4,
  bottom: -4,
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 999,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  fontSize: 10,
  lineHeight: "14px",
  fontWeight: 900,
  fontVariantNumeric: "tabular-nums",
};

const iconBtn: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 10,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  minWidth: 64,
};

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FeatureTip({
  title,
  body,
  tone = "default",
  onClose,
}: {
  title: string;
  body: string;
  tone?: "default" | "danger";
  onClose: () => void;
}) {
  const isDanger = tone === "danger";
  const accent = isDanger ? "var(--destructive)" : "var(--accent)";
  const glow = isDanger ? "oklch(0.58 0.22 25 / 0.45)" : "var(--accent-glow)";
  const buttonBg = isDanger
    ? "linear-gradient(135deg, var(--destructive), oklch(0.52 0.2 25))"
    : "linear-gradient(135deg, var(--primary), var(--accent))";
  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 96,
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "100%",
          background: "var(--surface-elevated)",
          border: `1px solid ${accent}`,
          borderRadius: 14,
          padding: "12px 14px",
          boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 24px ${glow}`,
          pointerEvents: "auto",
          animation: "pop-in 220ms ease-out",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: accent,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.45 }}>{body}</div>
        <button
          onClick={onClose}
          style={{
            marginTop: 10,
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: buttonBg,
            color: "var(--primary-foreground)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function selectedPowerUpSlots(selected: PowerUpInventory): InventoryPowerUpId[] {
  const slots: InventoryPowerUpId[] = [];
  for (const id of Object.keys(POWER_UP_INVENTORY_META) as InventoryPowerUpId[]) {
    for (let i = 0; i < selected[id] && slots.length < INVENTORY_PICK_LIMIT; i++) {
      slots.push(id);
    }
  }
  return slots;
}

function PlayStyleModal({
  selected,
  onSelect,
}: {
  selected: "hold" | "press";
  onSelect: (style: "hold" | "press") => void;
}) {
  return (
    <Modal zIndex={1200}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        PLAY STYLE
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>Choose how you shoot</h2>
      <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.45 }}>
        You can change this anytime in in-game settings or the main settings screen.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {([
          ["hold", "Hold", "Aim by holding the board, then release to shoot."],
          ["press", "Toggle", "Aim on the board first, then press the queued atom to shoot."],
        ] as const).map(([style, title, body]) => (
          <button
            key={style}
            type="button"
            onClick={() => onSelect(style)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${selected === style ? "var(--accent)" : "var(--border)"}`,
              background: selected === style
                ? "color-mix(in oklch, var(--accent) 18%, var(--surface))"
                : "var(--surface)",
              color: "var(--foreground)",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <strong>{title}</strong>
            <span style={{ display: "block", marginTop: 4, color: "var(--muted-foreground)", fontSize: 12 }}>
              {body}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function ConfirmRunExitModal({
  action,
  onCancel,
  onConfirm,
}: {
  action: "restart" | "leave";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal zIndex={1300}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--destructive)", marginBottom: 8 }}>
        {action === "restart" ? "RESTART LEVEL" : "LEAVE GAME"}
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>
        Progress and loaded power-ups will be lost.
      </h2>
      <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.45 }}>
        {action === "restart"
          ? "Restarting returns you to the pre-game inventory screen for this level."
          : "Leaving discards this run and returns you to the map."}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ ...modalBtn, background: "var(--surface-high)", color: "var(--foreground)" }}
        >
          Cancel
        </button>
        <button type="button" onClick={onConfirm} style={modalBtn}>
          {action === "restart" ? "Restart" : "Leave game"}
        </button>
      </div>
    </Modal>
  );
}

function InventoryStartModal({
  inventory,
  selected,
  onChange,
  onStart,
  onBack,
}: {
  inventory: PowerUpInventory;
  selected: PowerUpInventory;
  onChange: (powerUp: InventoryPowerUpId, delta: 1 | -1) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const selectedCount = countPowerUps(selected);
  const selectedSlots = selectedPowerUpSlots(selected);
  const availablePowerUps = (Object.keys(POWER_UP_INVENTORY_META) as InventoryPowerUpId[]).filter(
    (id) => inventory[id] > 0,
  );

  return (
    <Modal>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        POWER-UP INVENTORY
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900 }}>Pick up to 3 boosts</h2>
      <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
        Fill up to 3 starting slots from your saved power-ups. Tap a filled slot to remove it.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${INVENTORY_PICK_LIMIT}, minmax(0, 1fr))`,
          gap: 8,
          marginBottom: 12,
        }}
      >
        {Array.from({ length: INVENTORY_PICK_LIMIT }, (_, i) => {
          const id = selectedSlots[i];
          const meta = id ? POWER_UP_INVENTORY_META[id] : null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (id) onChange(id, -1);
              }}
              aria-label={id ? `Remove ${meta?.name} from slot ${i + 1}` : `Empty slot ${i + 1}`}
              style={{
                minHeight: 82,
                borderRadius: 12,
                border: `1px solid ${id ? "var(--accent)" : "var(--border)"}`,
                background: id
                  ? "color-mix(in oklch, var(--accent) 16%, var(--surface-elevated))"
                  : "var(--surface)",
                color: id ? "var(--foreground)" : "var(--muted-foreground)",
                display: "grid",
                placeItems: "center",
                gap: 4,
                cursor: id ? "pointer" : "default",
                fontWeight: 900,
              }}
            >
              {id ? (
                <>
                  <PowerUpBadge icon={id} size={34} />
                  <span style={{ fontSize: 10 }}>{meta?.name}</span>
                </>
              ) : (
                <span style={{ fontSize: 11 }}>Empty</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {availablePowerUps.map((id) => {
          const meta = POWER_UP_INVENTORY_META[id];
          const selectedAmount = selected[id];
          const isSelected = selectedAmount > 0;
          const disabled = !isSelected && selectedCount >= INVENTORY_PICK_LIMIT;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id, 1)}
              disabled={disabled}
              style={{
                display: "grid",
                gridTemplateRows: "auto auto",
                alignItems: "center",
                justifyItems: "center",
                gap: 5,
                padding: "9px 6px",
                borderRadius: 12,
                border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                background: isSelected
                  ? "color-mix(in oklch, var(--accent) 18%, var(--surface-elevated))"
                  : "var(--surface)",
                color: "var(--foreground)",
                opacity: disabled ? 0.55 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "center",
              }}
            >
              <span style={{ display: "grid", placeItems: "center" }} aria-hidden="true">
                <PowerUpBadge icon={id} size={34} />
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  minWidth: 0,
                  color: isSelected ? "var(--accent)" : "var(--muted-foreground)",
                  fontWeight: 900,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {isSelected && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${meta.name} from selected inventory`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(id, -1);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onChange(id, -1);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    −
                  </span>
                )}
                <span>
                  {isSelected ? `${selectedAmount}/${inventory[id]}` : `×${inventory[id]}`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 14,
          position: "sticky",
          bottom: -24,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 0 2px",
          background:
            "linear-gradient(180deg, transparent 0%, var(--surface-elevated) 28%, var(--surface-elevated) 100%)",
          color: "var(--muted-foreground)",
          fontSize: 12,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
            borderRadius: 10,
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          ← Back
        </button>
        <span style={{ flex: "1 1 70px", textAlign: "center" }}>
          Selected {selectedCount}/{INVENTORY_PICK_LIMIT}
        </span>
        <button onClick={onStart} style={{ ...modalBtn, marginTop: 0, flex: "1 1 150px" }}>
          {selectedCount > 0 ? "Start with boosts" : "Start without boosts"}
        </button>
      </div>
    </Modal>
  );
}

function DiscoveryModal({ atomicNumber, onClose }: { atomicNumber: number; onClose: () => void }) {
  const el = ELEMENTS[atomicNumber - 1];
  if (!el) return null;
  return (
    <Modal zIndex={200}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        NEW DISCOVERY
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <ElementBall atomicNumber={atomicNumber} size={96} glow />
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{el.name}</div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 12 }}>
        {el.symbol} • Atomic #{el.atomicNumber} • Mass {el.atomicMass}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--foreground)", margin: 0 }}>
        {el.fact}
      </p>
      <button onClick={onClose} style={modalBtn}>
        Continue
      </button>
    </Modal>
  );
}

function CompoundSelectionPanel({
  counts,
  selectedCount,
  match,
  matchScore,
  matchIsNew,
  objective,
  discoveredHint,
  newHint,
  canAffordHint,
  canAffordSuperHint,
  onHint,
  onSuperHint,
  onForm,
  onCancel,
}: {
  counts: Record<string, number>;
  selectedCount: number;
  match: CompoundDefinition | null;
  matchScore: number;
  matchIsNew: boolean;
  objective: CompoundDefinition | null;
  discoveredHint: CompoundDefinition | null;
  newHint: CompoundDefinition | null;
  canAffordHint: boolean;
  canAffordSuperHint: boolean;
  onHint: (compound: CompoundDefinition) => void;
  onSuperHint: (compound: CompoundDefinition) => void;
  onForm: () => void;
  onCancel: () => void;
}) {
  const entries = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b));
  const objectiveMismatch = objective != null && match != null && match.id !== objective.id;
  const canForm = match != null && !objectiveMismatch;
  return (
    <div
      style={{
        position: "absolute",
        left: 10,
        right: 10,
        bottom: 10,
        zIndex: 8,
        padding: 10,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "color-mix(in oklch, var(--surface-elevated) 92%, transparent)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--accent)", fontWeight: 900 }}>
            COMPOUND MODE
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {selectedCount}/{COMPOUND_MAX_SELECTION} atoms · max {COMPOUND_MAX_ELEMENT_TYPES} elements
          </div>
        </div>
        <button type="button" onClick={onCancel} style={miniPanelBtn}>
          Cancel
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        {entries.length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Tap atoms to select</span>
        ) : (
          entries.map(([symbol, count]) => (
            <span key={symbol} style={compoundCountPill}>
              {symbol}: {count}
            </span>
          ))
        )}
      </div>
      {(discoveredHint || newHint) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {discoveredHint && (
            <button
              type="button"
              onClick={() => onHint(discoveredHint)}
              disabled={!canAffordHint}
              style={{
                ...miniPanelBtn,
                flex: "1 1 120px",
                opacity: canAffordHint ? 1 : 0.55,
                cursor: canAffordHint ? "pointer" : "not-allowed",
              }}
            >
              Hint 50K
            </button>
          )}
          {newHint && (
            <button
              type="button"
              onClick={() => onSuperHint(newHint)}
              disabled={!canAffordSuperHint}
              style={{
                ...miniPanelBtn,
                flex: "1 1 140px",
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                opacity: canAffordSuperHint ? 1 : 0.55,
                cursor: canAffordSuperHint ? "pointer" : "not-allowed",
              }}
            >
              Super Hint 100K
            </button>
          )}
        </div>
      )}
      {match && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: 8,
            borderRadius: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <MoleculeVisual compound={match} size={62} />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 1.2,
                color: matchIsNew ? "var(--success, oklch(0.78 0.16 145))" : "var(--accent)",
                fontWeight: 900,
              }}
            >
              {matchIsNew ? "NEW COMPOUND PREVIEW" : "COMPOUND PREVIEW"}
            </div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{match.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{match.formula}</div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onForm}
        disabled={!canForm}
        style={{
          ...modalBtn,
          width: "100%",
          marginTop: 10,
          background: canForm
            ? "linear-gradient(135deg, var(--accent), oklch(0.58 0.16 145))"
            : "var(--surface-high)",
          color: canForm ? "var(--primary-foreground)" : "var(--muted-foreground)",
          cursor: canForm ? "pointer" : "not-allowed",
          boxShadow: canForm ? "0 0 18px var(--accent-glow)" : undefined,
        }}
      >
        {objectiveMismatch
          ? `Need ${objective?.formula ?? "target"}`
          : match
            ? `Form ${match.name}`
            : objective
              ? `Form ${objective.formula}`
              : "Form Compound"}
      </button>
      {match && (
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 12,
            fontWeight: 900,
            color: "var(--accent)",
          }}
        >
          <span>{matchIsNew ? "NEW compound" : "Already discovered"}</span>
          <span>+{formatScore(matchScore)}</span>
        </div>
      )}
    </div>
  );
}

function CompoundFormationFx({
  compound,
  atoms,
  center,
}: {
  compound: CompoundDefinition;
  atoms: { id: number; x: number; y: number; atom: number; r: number }[];
  center: { x: number; y: number };
}) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none" }}>
      <div
        className="compound-flash"
        style={{ position: "absolute", left: center.x, top: center.y }}
      />
      {atoms.map((atom, index) => (
        <div
          key={atom.id}
          className="compound-fly-atom"
          style={
            {
              position: "absolute",
              left: atom.x - atom.r,
              top: atom.y - atom.r,
              "--compound-dx": `${center.x - atom.x}px`,
              "--compound-dy": `${center.y - atom.y}px`,
              animationDelay: `${index * 35}ms`,
            } as React.CSSProperties & Record<"--compound-dx" | "--compound-dy", string>
          }
        >
          <ElementBall atomicNumber={atom.atom} size={atom.r * 2} glow />
        </div>
      ))}
      <div
        className="compound-molecule-pop"
        style={{ position: "absolute", left: center.x, top: center.y }}
      >
        <MoleculeVisual compound={compound} size={112} />
      </div>
    </div>
  );
}

function CompoundDiscoveryModal({
  compound,
  isNew,
  count,
  bonusScore,
  onClose,
}: {
  compound: CompoundDefinition;
  isNew: boolean;
  count: number;
  bonusScore: number;
  onClose: () => void;
}) {
  return (
    <Modal zIndex={210}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        {isNew ? "NEW COMPOUND" : "COMPOUND FOUND AGAIN"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <MoleculeVisual compound={compound} size={118} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{compound.name}</div>
      <div style={{ fontSize: 18, color: "var(--accent)", fontWeight: 900, marginBottom: 8 }}>
        {compound.formula}
      </div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
        {isNew ? "Added to your collection" : `Already discovered - found ${count} times`}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--primary)", marginBottom: 10 }}>
        +{formatScore(bonusScore)}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--foreground)", margin: 0 }}>
        {compound.fact}
      </p>
      <button onClick={onClose} style={modalBtn}>
        Continue
      </button>
    </Modal>
  );
}

function ShotHistoryModal({
  entries,
  onClose,
}: {
  entries: {
    id: number;
    ts: number;
    shot: number;
    action: string;
    points: number;
    powerUp?: string;
    merges: {
      sourceAtom: number;
      atom: number;
      depth: number;
      stabilizedIsotope?: boolean;
      points: number;
    }[];
  }[];
  onClose: () => void;
}) {
  return (
    <Modal>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        SHOT LOG
      </div>
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 900 }}>This run, step by step</h2>
      {entries.length === 0 ? (
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          No shots logged yet.
        </p>
      ) : (
        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            display: "grid",
            gap: 6,
            padding: 4,
            border: "1px solid var(--border)",
            borderRadius: 10,
            background: "var(--surface)",
          }}
        >
          {entries
            .slice()
            .reverse()
            .map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 8px",
                    borderRadius: 8,
                    background: "var(--surface-elevated)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--accent)",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    {e.shot}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {e.action}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {e.powerUp ? `Power-up: ${e.powerUp}` : "No power-up"}
                    </div>
                    {e.merges.length > 0 && (
                      <>
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 11,
                            color: "var(--accent)",
                            fontWeight: 900,
                          }}
                        >
                          Chain combo x{Math.max(...e.merges.map((merge) => merge.depth + 1))}
                          {e.merges.some((merge) => merge.stabilizedIsotope)
                            ? " - isotope bonus"
                            : ""}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                          {e.merges.map((merge, index) => (
                            <MergeAtomFormula key={`${e.id}-${index}`} merge={merge} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    +{formatScore(e.points)}
                  </div>
                </div>
              ))}
        </div>
      )}
      <button onClick={onClose} style={modalBtn}>
        Close
      </button>
    </Modal>
  );
}

function MergeAtomFormula({
  merge,
}: {
  merge: {
    sourceAtom: number;
    atom: number;
    depth: number;
    stabilizedIsotope?: boolean;
    points: number;
  };
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "3px 5px",
        borderRadius: 999,
        background: "var(--surface)",
        border: `1px solid ${merge.stabilizedIsotope ? "oklch(0.88 0.2 70)" : "var(--border)"}`,
        boxShadow: merge.stabilizedIsotope
          ? "0 0 10px oklch(0.82 0.18 70 / 0.35)"
          : undefined,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 900, color: "var(--accent)" }}>
        x{merge.depth + 1}
      </span>
      <ElementBall atomicNumber={merge.sourceAtom} size={22} />
      <span style={{ fontSize: 10, fontWeight: 900, color: "var(--muted-foreground)" }}>+</span>
      <ElementBall atomicNumber={merge.sourceAtom} size={22} />
      <span style={{ fontSize: 10, fontWeight: 900, color: "var(--accent)" }}>-&gt;</span>
      <ElementBall atomicNumber={merge.atom} size={24} glow />
      <span style={{ fontSize: 10, fontWeight: 900, color: "var(--muted-foreground)" }}>
        +{formatScore(merge.points)}
      </span>
      {merge.stabilizedIsotope && (
        <span style={{ fontSize: 10, fontWeight: 900, color: "oklch(0.88 0.2 70)" }}>
          isotope x2
        </span>
      )}
    </span>
  );
}

function ContinueChoiceModal({
  level,
  score,
  shots,
  bestCombo,
  stars,
  compound,
  isContinuing = false,
  onClaim,
  onContinue,
}: {
  level: (typeof LEVELS)[0];
  score: number;
  shots: number;
  bestCombo: number;
  stars: number;
  compound?: CompoundDefinition;
  isContinuing?: boolean;
  onClaim: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal>
      <div
        style={{
          fontSize: 12,
          letterSpacing: 3,
          color: "var(--success, var(--accent))",
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {isContinuing ? "FINISH LEVEL?" : "TARGET REACHED"}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        {isContinuing
          ? "Ready to claim?"
          : compound
            ? `${compound.name} formed!`
            : `${ELEMENTS[level.targetElement - 1]?.name ?? "?"} discovered!`}
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
          margin: "0 0 14px",
        }}
      >
        The level is clear. Finish the stage, or restart this level and try a cleaner run.
      </p>
      {stars > 0 && (
        <div
          style={{
            textAlign: "center",
            fontSize: 30,
            letterSpacing: 4,
            marginBottom: 12,
            color: "var(--accent)",
          }}
        >
          {Array.from({ length: 3 }, (_, i) => (i < stars ? "★" : "☆")).join("")}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <ResultStat label="Score" value={formatScore(score)} color="var(--accent)" />
        <ResultStat label="Shots" value={`${shots}`} color="var(--foreground)" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onContinue}
          style={{ ...modalBtn, background: "var(--surface-high)", color: "var(--foreground)" }}
        >
          Restart
        </button>
        <button onClick={onClaim} style={modalBtn}>
          Finish Level
        </button>
      </div>
    </Modal>
  );
}

function ResultModal({
  title,
  accent,
  score,
  level,
  shots,
  bestCombo,
  stars,
  newDiscoveries = [],
  formedCompounds = [],
  claimablePowerUps = {},
  claimedPowerUp = null,
  isPowerUpPass = false,
  onClaimPowerUp,
  onDiscoveryClick,
  onMain,
  onNext,
  nextLabel,
}: {
  title: string;
  accent: string;
  score: number;
  level: (typeof LEVELS)[0];
  shots: number;
  bestCombo: number;
  stars: number;
  newDiscoveries?: number[];
  formedCompounds?: string[];
  claimablePowerUps?: Partial<Record<InventoryPowerUpId, number>>;
  claimedPowerUp?: InventoryPowerUpId | null;
  isPowerUpPass?: boolean;
  onClaimPowerUp?: (powerUp: InventoryPowerUpId) => void;
  onDiscoveryClick?: (atomicNumber: number) => void;
  onMain: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const [selectedSavePowerUp, setSelectedSavePowerUp] = useState<InventoryPowerUpId | null>(null);
  const formedCompoundDefinitions = formedCompounds
    .map((id) => COMPOUNDS.find((compound) => compound.id === id))
    .filter((compound): compound is CompoundDefinition => Boolean(compound));
  const powerUpUnlockName = level.powerUpStage ? POWER_UP_STAGE_NAMES[level.powerUpStage] : null;
  const shopPowerUps: string[] = ["grab", "gravity", "transmute", "fusion-jump", "catalyst", "emission", "gamma"];
  const negativePowerUpStage = level.powerUpStage === "unstable" || level.powerUpStage === "stone";
  const powerUpUnlockMessage =
    powerUpUnlockName && title === "LEVEL COMPLETE"
      ? negativePowerUpStage
        ? `${powerUpUnlockName} can now occur in upcoming levels.`
        : shopPowerUps.includes(level.powerUpStage ?? "")
        ? `${powerUpUnlockName} is now unlocked for upcoming levels and available for purchase in the shop.`
        : `${powerUpUnlockName} is now unlocked for upcoming levels.`
      : null;
  const claimableOptions = (Object.keys(POWER_UP_INVENTORY_META) as InventoryPowerUpId[]).filter(
    (id) => (claimablePowerUps[id] ?? 0) > 0,
  );
  return (
    <Modal>
      <div
        style={{ fontSize: 12, letterSpacing: 3, color: accent, fontWeight: 800, marginBottom: 8 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{level.name}</div>
      {isPowerUpPass && (
        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 10,
            margin: "4px 0 16px",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              background: "color-mix(in oklch, var(--success, var(--accent)) 20%, var(--surface))",
              border: "2px solid var(--success, var(--accent))",
              color: "var(--success, var(--accent))",
              fontSize: 42,
              fontWeight: 900,
              boxShadow: "0 0 24px var(--accent-glow)",
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--success, var(--accent))" }}>
            Pass
          </div>
        </div>
      )}
      {level.milestoneFact && (
        <p
          style={{
            fontSize: 13,
            color: "var(--muted-foreground)",
            lineHeight: 1.5,
            margin: "0 0 14px",
          }}
        >
          {level.milestoneFact}
        </p>
      )}
      {powerUpUnlockMessage && (
        <p
          style={{
            fontSize: 13,
            color: negativePowerUpStage ? "var(--destructive)" : "var(--success, var(--accent))",
            lineHeight: 1.5,
            margin: "0 0 14px",
            fontWeight: 800,
          }}
        >
          {powerUpUnlockMessage}
        </p>
      )}
      {stars > 0 && !isPowerUpPass && (
        <div
          style={{
            textAlign: "center",
            fontSize: 30,
            letterSpacing: 4,
            marginBottom: 12,
            color: "var(--accent)",
          }}
        >
          {Array.from({ length: 3 }, (_, i) => (i < stars ? "★" : "☆")).join("")}
        </div>
      )}
      {!isPowerUpPass && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <ResultStat label="Score" value={formatScore(score)} color="var(--accent)" />
          <ResultStat
            label="Target"
            value={ELEMENTS[level.targetElement - 1]?.symbol ?? "?"}
            color="var(--primary)"
          />
          <ResultStat
            label="Shots"
            value={`${shots}${level.parShots ? ` / ${getStarParShots(level)}` : ""}`}
            color="var(--foreground)"
          />
          <ResultStat label="Best Combo" value={`${bestCombo}`} color="var(--foreground)" />
        </div>
      )}
      {newDiscoveries.length > 0 && !isPowerUpPass && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: "var(--muted-foreground)",
              fontWeight: 800,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            NEW DISCOVERIES — TAP TO RE-READ
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {newDiscoveries.map((atomicNumber) => (
              <ElementBall
                key={atomicNumber}
                atomicNumber={atomicNumber}
                size={42}
                glow
                onClick={() => onDiscoveryClick?.(atomicNumber)}
              />
            ))}
          </div>
        </div>
      )}
      {formedCompoundDefinitions.length > 0 && !isPowerUpPass && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: "var(--success, var(--accent))",
              fontWeight: 800,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            COMPOUNDS FORMED
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {formedCompoundDefinitions.map((compound, index) => (
              <div key={`${compound.id}-${index}`} style={{ width: 78, textAlign: "center" }}>
                <MoleculeVisual compound={compound} size={48} />
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 900 }}>{compound.formula}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {onClaimPowerUp && !isPowerUpPass && (claimableOptions.length > 0 || claimedPowerUp) && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              color: "var(--accent)",
              fontWeight: 800,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            KEEP ONE POWER-UP
          </div>
          {claimedPowerUp ? (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--success)", fontWeight: 900 }}>
              Saved {POWER_UP_INVENTORY_META[claimedPowerUp].name} to inventory
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {claimableOptions.map((powerUp) => {
                  const meta = POWER_UP_INVENTORY_META[powerUp];
                  const selected = selectedSavePowerUp === powerUp;
                  return (
                    <button
                      key={powerUp}
                      type="button"
                      onClick={() => setSelectedSavePowerUp((current) => (current === powerUp ? null : powerUp))}
                      style={{
                        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                        borderRadius: 12,
                        background: selected ? "color-mix(in oklch, var(--accent) 18%, var(--surface))" : "var(--surface-high)",
                        color: "var(--foreground)",
                        padding: 7,
                        display: "grid",
                        justifyItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                    >
                      <PowerUpBadge icon={powerUp} size={30} />
                      <span style={{ fontSize: 9, fontWeight: 900, lineHeight: 1.1 }}>{meta.name}</span>
                      <small style={{ color: "var(--muted-foreground)", fontSize: 9 }}>
                        x{claimablePowerUps[powerUp]}
                      </small>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!selectedSavePowerUp}
                onClick={() => selectedSavePowerUp && onClaimPowerUp(selectedSavePowerUp)}
                style={{
                  ...modalBtn,
                  width: "100%",
                  marginTop: 10,
                  opacity: selectedSavePowerUp ? 1 : 0.5,
                  cursor: selectedSavePowerUp ? "pointer" : "not-allowed",
                }}
              >
                Save selected
              </button>
            </>
          )}
        </div>
      )}
      {level.scoreGoal && !isPowerUpPass && (
        <div
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Score goal: {formatScore(level.scoreGoal)}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onMain}
          style={{ ...modalBtn, background: "var(--surface-high)", color: "var(--foreground)" }}
        >
          Menu
        </button>
        <button onClick={onNext} style={modalBtn}>
          {nextLabel ?? "Next"}
        </button>
      </div>
    </Modal>
  );
}

function ResultStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 10,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted-foreground)" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function InGameSettingsModal({
  musicEnabled,
  soundEnabled,
  shootingStyle,
  onToggleMusic,
  onToggleSound,
  onToggleShootingStyle,
  onClose,
  onRestart,
  onLeave,
}: {
  musicEnabled: boolean;
  soundEnabled: boolean;
  shootingStyle: "hold" | "press";
  onToggleMusic: () => void;
  onToggleSound: () => void;
  onToggleShootingStyle: () => void;
  onClose: () => void;
  onRestart: () => void;
  onLeave: () => void;
}) {
  return (
    <Modal zIndex={1000}>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", fontWeight: 900 }}>
        SETTINGS
      </div>
      <h2 style={{ margin: "6px 0 12px", fontSize: 24, fontWeight: 900 }}>Game settings</h2>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={settingsCheckRow}>
          <input type="checkbox" checked={musicEnabled} onChange={onToggleMusic} />
          <span style={settingsLabelText}>
            <strong>Music</strong>
            <small style={settingsLabelSubtext}>Ambient background track</small>
          </span>
        </label>
        <label style={settingsCheckRow}>
          <input type="checkbox" checked={soundEnabled} onChange={onToggleSound} />
          <span style={settingsLabelText}>
            <strong>Sound</strong>
            <small style={settingsLabelSubtext}>Shot, merge, and win effects</small>
          </span>
        </label>
        <label style={settingsCheckRow}>
          <input
            type="checkbox"
            checked={shootingStyle === "press"}
            onChange={onToggleShootingStyle}
          />
          <span style={settingsLabelText}>
            <strong>Shooting: {shootingStyle === "hold" ? "Hold" : "Toggle"}</strong>
            <small style={settingsLabelSubtext}>
              {shootingStyle === "hold"
                ? "Aim and release to shoot"
                : "Aim on the board, then press the queued atom"}
            </small>
          </span>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={onClose} style={{ ...modalBtn, marginTop: 0 }}>
          Resume
        </button>
        <button
          type="button"
          onClick={onRestart}
          style={{ ...modalBtn, marginTop: 0, background: "var(--surface)", color: "var(--foreground)" }}
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onLeave}
          style={{ ...modalBtn, marginTop: 0, background: "var(--surface-high)", color: "var(--foreground)" }}
        >
          Leave game
        </button>
      </div>
    </Modal>
  );
}

function Modal({ children, zIndex = 100 }: { children: React.ReactNode; zIndex?: number }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex,
        padding: 24,
        backdropFilter: "blur(4px)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "var(--surface-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: 24,
          maxWidth: 360,
          width: "100%",
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          overscrollBehavior: "contain",
          boxSizing: "border-box",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px var(--primary-glow)",
          animation: "pop-in 280ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const modalBtn: React.CSSProperties = {
  flex: 1,
  marginTop: 14,
  padding: "12px 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 4px 16px var(--primary-glow)",
};

const settingsCheckRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr)",
  alignItems: "center",
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  cursor: "pointer",
};

const settingsLabelText: React.CSSProperties = {
  display: "grid",
  gap: 3,
  minWidth: 0,
};

const settingsLabelSubtext: React.CSSProperties = {
  display: "block",
  color: "var(--muted-foreground)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
};

const miniPanelBtn: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface)",
  color: "var(--foreground)",
  padding: "6px 9px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};

const compoundCountPill: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  background: "var(--surface)",
  color: "var(--foreground)",
  padding: "4px 8px",
  fontSize: 12,
  fontWeight: 900,
};
