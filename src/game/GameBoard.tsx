import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { ELEMENTS } from "./elements";
import { LEVELS, getLevelById, getNextLevel } from "./levels";
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
} from "./logic";
import { ElementBall } from "./ElementBall";
import {
  emptyPowerUpInventory,
  type InventoryPowerUpId,
  type PowerUpInventory,
  useProgress,
} from "./store";
import { playMergeSound, playShootSound, playWinSound, vibrate } from "./audio";
import { GameModeId, getGameMode, getModeLevelLabel } from "./challenges";
import { trackGameOver, trackGameStart, trackLevelWin, trackMerge, trackShot } from "./analytics";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
  mode?: GameModeId;
}

const QUEUE_SIZE = 4;
const MAX_AIM_DEG = 75;
const SHIMMER_MIN_LEVEL = 5;
const GRAB_MIN_LEVEL = 4;
const EGUN_MIN_LEVEL = 6;
const BLANK_MIN_LEVEL = 10;
const BLANK_ATOM_CHANCE = 0.01;
const POWER_UP_CHANCE = 0.05;
const EGUN_CHANCE = 0.01;
const EGUN_MIN_SHOT_GAP = 10;
const EMISSION_UNLOCK_INTERVAL_MS = 5 * 60 * 1000;
const STONE_MAX_HP = 8;
const SPAWN_FLOOR_LEVEL = 10;
const SPAWN_FLOOR_INTERVAL_MS = 2 * 60 * 1000;
const SHUFFLE_MIN_LEVEL = 10;
const SHUFFLE_COUNT = 4;
const SHUFFLE_LIMIT = 3;
const SHUFFLE_OFFSET_MIN = 4;
const SHUFFLE_OFFSET_MAX = 10;
const GAMMA_MIN_LEVEL = 12;
const SEEDED_BOARD_MIN_TARGET = 10;
const SEEDED_BOARD_MIN_ATOMS = 3;
const SEEDED_BOARD_MAX_ATOMS = 8;
const SEEDED_BOARD_TARGET_OFFSET = 3;
const TRANSMUTE_SHOT_INTERVAL = 30;
const CATALYST_AURA_SHOTS = 5;
const CATALYST_ADJ_FACTOR = 2.3;
const DISCOVERY_DECAY_STEP = 5;
const DISCOVERY_DECAY_BOOST = 0.04;
const STAGE_CLEAR_ANIMATION_MS = 6200;

const INVENTORY_PICK_LIMIT = 3;

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
};

function countPowerUps(inventory: Partial<Record<InventoryPowerUpId, number>>): number {
  return Object.values(inventory).reduce((total, count) => total + (count ?? 0), 0);
}

function hasPowerUps(inventory: Partial<Record<InventoryPowerUpId, number>>): boolean {
  return countPowerUps(inventory) > 0;
}

// Shared rocky styling — used for both the launcher visual and live stones
// on the board. Looks like a chunky rock with cracks and uneven shading
// instead of a smooth grey ball.
const stoneBackground =
  // Multiple radial gradients layered to mimic uneven rocky surface,
  // plus craggy highlights and shadow pockets.
  "radial-gradient(circle at 22% 20%, oklch(0.68 0.025 70) 0%, transparent 32%)," +
  "radial-gradient(circle at 78% 30%, oklch(0.52 0.02 60) 0%, transparent 28%)," +
  "radial-gradient(circle at 30% 75%, oklch(0.22 0.015 55) 0%, transparent 38%)," +
  "radial-gradient(circle at 70% 70%, oklch(0.18 0.015 50) 0%, transparent 36%)," +
  "radial-gradient(circle at 50% 50%, oklch(0.42 0.02 60), oklch(0.28 0.02 55) 70%, oklch(0.16 0.015 50))";
const stoneBorderRadius = "48% 52% 47% 53% / 50% 46% 54% 50%";
function StoneVisual({ size, hp }: { size: number; hp: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: stoneBorderRadius,
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
const STONE_NO_MERGE_TRIGGER = 3;
const STONE_NUDGE_MULT = 5;

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
  // Hard per-level overrides win when present.
  if (level.starShotsThree != null && level.starShotsTwo != null) {
    if (shots < level.starShotsThree) return 3;
    if (shots < level.starShotsTwo) return 2;
    return 1;
  }
  // New star formula: pure performance based on shots + time vs par.
  // 3★ = at or under both par shots AND par time
  // 2★ = within 1.3× of both
  // 1★ = completed
  const par = getStarParShots(level);
  const parTime = level.parTimeSec ?? par * 5;
  const shotsRatio = shots / par;
  const timeRatio = timeSec / parTime;
  if (shotsRatio <= 1 && timeRatio <= 1) return 3;
  if (shotsRatio <= 1.3 && timeRatio <= 1.3) return 2;
  return 1;
}

export function GameBoard({ levelId, onExit, onWin, mode = "campaign" }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
  const gameMode = getGameMode(mode);
  const shimmerEnabled = level.id >= SHIMMER_MIN_LEVEL;
  const grabEnabled = level.id >= GRAB_MIN_LEVEL;
  const eGunEnabled = level.id >= EGUN_MIN_LEVEL;
  const blankEnabled = level.id >= BLANK_MIN_LEVEL;
  const {
    recordDiscovery,
    addScore,
    setHighestElement,
    unlockLevel,
    soundEnabled,
    hapticsEnabled,
    discoveredElements,
    reportQuestProgress,
    setBestCombo,
    setLevelStars,
    setChallengeBestScore,
    powerUpInventory,
    addInventoryPowerUps,
    consumeInventoryPowerUps,
    seenTips,
    markTipSeen,
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
  const [score, setScore] = useState(0);
  const [highest, setHighest] = useState(1);
  const [shots, setShots] = useState(0);
  const [runBestCombo, setRunBestCombo] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [aimDeg, setAimDeg] = useState(0); // 0 = straight up, negative = left
  const [popups, setPopups] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [discoveryEl, setDiscoveryEl] = useState<number | null>(null);
  const [newlyDiscoveredThisRun, setNewlyDiscoveredThisRun] = useState<number[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [wiggleIds, setWiggleIds] = useState<Set<number>>(new Set());
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);
  const [eGunBeamPath, setEGunBeamPath] = useState<{ x: number; y: number }[] | null>(null);
  const [gravityFxId, setGravityFxId] = useState<number | null>(null);
  const popupId = useRef(0);
  const eGunCooldownSlots = useRef(0);

  // === Grab power-up ===
  // Earned by making 8 merge progress in a row.
  const [grabs, setGrabs] = useState(0);
  const [grabMode, setGrabMode] = useState(false);
  const [grabbing, setGrabbing] = useState<{ id: number; x: number; y: number } | null>(null);

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
  } | null>(null);
  const [stageClearFx, setStageClearFx] = useState<{
    stars: number;
    score: number;
    shots: number;
    bestCombo: number;
  } | null>(null);
  const stageClearTimeoutRef = useRef<number | null>(null);
  const hasClaimedUnusedInventoryRef = useRef(false);
  const [inventoryPickerOpen, setInventoryPickerOpen] = useState(false);
  const [selectedInventoryPowerUps, setSelectedInventoryPowerUps] = useState<PowerUpInventory>(() =>
    emptyPowerUpInventory(),
  );

  // === Run timer ===
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // === Merge history log ===
  // Chronological list of every merge in this run. Opened from a button at
  // the top header so the player can review what happened.
  const [mergeHistory, setMergeHistory] = useState<
    { id: number; ts: number; atom: number; depth: number; chainSize: number }[]
  >([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyIdRef = useRef(0);
  function pushMergeHistory(merges: { resultAtomicNumber: number; chainDepth: number }[]) {
    if (merges.length === 0) return;
    const now = Date.now();
    setMergeHistory((prev) => {
      const next = [...prev];
      merges.forEach((m) => {
        next.push({
          id: ++historyIdRef.current,
          ts: now,
          atom: m.resultAtomicNumber,
          depth: m.chainDepth,
          chainSize: merges.length,
        });
      });
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
    return Array.from({ length: SHUFFLE_COUNT }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
  }

  const target = level.targetElement;
  const targetEl = ELEMENTS[target - 1];
  const current = queue[0];
  const currentIsShimmer = shimmerQueue[0] ?? false;
  const currentIsEGun = eGunQueue[0] ?? false;
  const currentIsBlank = blankQueue[0] ?? false;

  const sfx = (fn: () => void) => {
    if (soundEnabled) fn();
  };
  const haptic = (ms: number | number[]) => {
    if (hapticsEnabled) vibrate(ms);
  };

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

  useEffect(() => {
    setNewlyDiscoveredThisRun([]);
    // For level 10+ we defer seeding until the player confirms their shuffle;
    // the shuffle modal opens immediately and seeds via confirmShuffleStart().
    const initialBalls = level.id >= SHUFFLE_MIN_LEVEL ? createEmptyBoard() : createSeededBoard();
    setBalls(initialBalls);
    const initialHighest = Math.max(1, getHighestOnBoard(initialBalls));
    if (initialHighest > 1) setHighestElement(initialHighest);
    const initialDiscoveries = initialBalls
      .map((b) => b.atom)
      .filter((n, i, atoms) => n > 1 && atoms.indexOf(n) === i && !discoveredElements.includes(n));
    if (initialDiscoveries.length > 0) registerDiscoveries(initialDiscoveries);
    const initialQueue = generateInitialQueue(
      level.maxQueueElement,
      QUEUE_SIZE,
      currentQueueDecay(),
    );
    const initialEGun = Array.from({ length: QUEUE_SIZE }, () => false);
    const initialBlank = initialEGun.map(
      (isEGun) => !isEGun && blankEnabled && Math.random() < BLANK_ATOM_CHANCE,
    );
    const initialShimmer = initialEGun.map(
      (isEGun, i) =>
        !isEGun && !initialBlank[i] && shimmerEnabled && Math.random() < POWER_UP_CHANCE,
    );
    setQueue(
      initialQueue.map((atom, i) =>
        initialShimmer[i]
          ? generateQueueAtom(level.maxQueueElement, initialBalls, true)
          : Math.max(atom, queueFloorFromBoard(initialBalls)),
      ),
    );
    setShimmerQueue(initialShimmer);
    setEGunQueue(initialEGun);
    setBlankQueue(initialBlank);
    setScore(0);
    setHighest(initialHighest);
    setShots(0);
    setRunBestCombo(0);
    setEarnedStars(0);
    setGameOver(false);
    setWon(false);
    setDiscoveryEl(null);
    setHighlightId(null);
    setWiggleIds(new Set());
    setProjectile(null);
    setGravityFxId(null);
    setBusy(false);
    setAimDeg(0);
    setGrabs(0);
    setGrabMode(false);
    setGrabbing(null);
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
    setGravityCharges(0);
    setEmissionCharges(0);
    setEmissionUnlockIndex(0);
    setTransmuteCharges(0);
    setFusionJumpCharges(0);
    setFusionJumpArmed(false);
    setCatalystCharges(0);
    setCatalystShotsRemaining(0);
    setPendingReversiblePowerUp(null);
    hasClaimedUnusedInventoryRef.current = false;
    setSelectedInventoryPowerUps(emptyPowerUpInventory());
    setInventoryPickerOpen(hasPowerUps(powerUpInventory));
    setMergeHistory([]);
    setHistoryOpen(false);
    setGammaCharges(0);
    setPendingGamma(false);
    setSpawnFloorIndex(0);
    if (level.id >= SHUFFLE_MIN_LEVEL) {
      setShufflesLeft(SHUFFLE_LIMIT);
      setShuffleAtoms(generateShuffleAtoms());
      setShuffleStartOpen(true);
    } else {
      setShuffleStartOpen(false);
    }
    queueUndoRef.current = null;
    eGunCooldownSlots.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    trackGameStart(levelId, mode);
    // Per-level intro tooltips for newly unlocked features.
    if (level.id >= SHIMMER_MIN_LEVEL) {
      showTip(
        "feature-shimmer-unlock",
        "✦ Shimmering atoms unlocked",
        "Some atoms in your queue now shimmer with a rainbow halo. Land a successful merge with one to score 2× points and fill the Grab combo bar twice as fast.",
      );
    }
    if (level.id >= GRAB_MIN_LEVEL) {
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
    if (level.id >= BLANK_MIN_LEVEL) {
      showTip(
        "feature-blank-unlock",
        "✦ Blank atom unlocked!",
        "Blank atoms are rare 1% wildcard shots. They merge as whatever atom they hit — and if they hit a Stone, the Stone vanishes completely.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement, mode]);

  // Show a one-time tooltip the first time a shimmer atom appears in the queue.
  useEffect(() => {
    if (!shimmerEnabled) return;
    if (shimmerQueue.some(Boolean)) {
      showTip(
        "feature-shimmer-spawn",
        "✦ A shimmering atom appeared!",
        "The glowing rainbow atom in your queue scores double and pumps your Grab combo bar by 2 per merge.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shimmerQueue, shimmerEnabled]);

  // Show the E-gun explanation the first time an E-gun shot actually appears
  // in the queue (not on every level 6+ start).
  useEffect(() => {
    if (!eGunEnabled) return;
    if (eGunQueue.some(Boolean)) {
      showTip(
        "feature-egun-unlock",
        "⚡ E-gun unlocked!",
        "Rare E-gun shots fire a straight beam to the far edge without bouncing. Every atom in the beam upgrades by 1 tier.",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eGunQueue, eGunEnabled]);

  // Tick the run timer every second while the level is active.
  useEffect(() => {
    if (gameOver || won) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [gameOver, won, levelId]);

  useEffect(() => {
    if (mode !== "gold-rush-timer" || gameOver || won) return;
    const limitMs = (gameMode.timerSec ?? 180) * 1000;
    if (elapsedMs < limitMs) return;
    trackGameOver(levelId, score, shots, highest, mode);
    setGameOver(true);
    spawnPopup("⏱ TIME UP");
  }, [elapsedMs, gameMode.timerSec, gameOver, highest, levelId, mode, score, shots, won]);

  useEffect(() => {
    if (gameOver || won) return;
    const nextUnlockMs = (emissionUnlockIndex + 1) * EMISSION_UNLOCK_INTERVAL_MS;
    if (elapsedMs < nextUnlockMs) return;
    setEmissionCharges((g) => g + 1);
    setEmissionUnlockIndex((i) => i + 1);
    spawnPopup("☢ EMISSION READY");
    showTip(
      "feature-emission-powerup",
      "☢ Emission power-up ready!",
      "Emission unlocks every 5 minutes. Tap it to raise every atom currently waiting in your queue by 1 tier.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, gameOver, won, emissionUnlockIndex]);

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

  function grantGravityForCombo(mergeCount: number) {
    if (mergeCount < 4) return;
    setGravityCharges((g) => g + 1);
    setCatalystCharges((g) => g + 1);
    spawnPopup("🌀 GRAVITY READY");
    spawnPopup("🧪 CATALYST READY");
    showTip(
      "feature-gravity-powerup",
      "🌀 Gravity power-up ready!",
      "A 4× combo unlocks Gravity. Tap the Gravity button to make every atom fall upward; any combinations formed still count toward Grab progress and quest progress.",
    );
    showTip(
      "feature-catalyst-powerup",
      "🧪 Catalyst Aura ready!",
      "A 4× combo unlocked Catalyst Aura. Activate it to double fusion range for your next 5 shots.",
    );
  }

  function grantFusionJump(count = 1) {
    if (count <= 0) return;
    setFusionJumpCharges((g) => g + count);
    spawnPopup(count > 1 ? `⏭ FUSION JUMP ×${count}` : "⏭ FUSION JUMP READY");
    showTip(
      "feature-fusion-jump-powerup",
      "⏭ Fusion Jump ready!",
      "Breaking a Stone completely unlocks Fusion Jump. Arm it to make your next merge skip one element tier.",
    );
  }

  function applyShotMilestones(nextShots: number) {
    if (nextShots > 0 && nextShots % TRANSMUTE_SHOT_INTERVAL === 0) {
      setTransmuteCharges((g) => g + 1);
      spawnPopup("🔀 TRANSMUTE READY");
      showTip(
        "feature-transmute-powerup",
        "🔀 Transmute Shot ready!",
        "Every 30 shots earns Transmute. Activate it to reroll your queued atom into a higher-tier atom.",
      );
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
  } {
    const eGunEligible = eGunEnabled && eGunCooldownSlots.current <= 0;
    const eGun = eGunEligible && Math.random() < EGUN_CHANCE;
    if (eGun) eGunCooldownSlots.current = EGUN_MIN_SHOT_GAP;
    else if (eGunCooldownSlots.current > 0) eGunCooldownSlots.current -= 1;
    const blank = !eGun && blankEnabled && Math.random() < BLANK_ATOM_CHANCE;
    const shimmer = !eGun && !blank && shimmerEnabled && Math.random() < POWER_UP_CHANCE;
    const atom = generateQueueAtom(maxElement, board, shimmer);
    return {
      atom,
      shimmer,
      eGun,
      blank,
    };
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
  }) {
    if (stageClearTimeoutRef.current !== null) {
      window.clearTimeout(stageClearTimeoutRef.current);
    }
    setStageClearFx(stats);
    spawnPopup("⚛ TARGET FORMED");
    stageClearTimeoutRef.current = window.setTimeout(() => {
      setStageClearFx(null);
      setWinChoice(stats);
      setBusy(false);
      stageClearTimeoutRef.current = null;
    }, STAGE_CLEAR_ANIMATION_MS);
  }

  useEffect(() => {
    return () => {
      if (stageClearTimeoutRef.current !== null) {
        window.clearTimeout(stageClearTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (won || gameOver) claimUnusedPowerUps();
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
  const projShotR = pendingStone ? stoneR : currentIsEGun ? eGunR : radiusFor(current);
  const projShotSize = pendingStone ? stoneSize : currentIsEGun ? eGunSize : sizeFor(current);
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
    if (target < SEEDED_BOARD_MIN_TARGET) return createEmptyBoard();
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
      seeded.push({
        id: nextBallId(),
        x: Math.max(SIDE_PAD + r, Math.min(boardW - SIDE_PAD - r, laneX + jitter)),
        y: TOP_PAD + r + Math.random() * Math.max(4, r * 0.35),
        atom,
        r,
      });
    }
    return seeded;
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
      return {
        id: nextBallId(),
        x: Math.max(SIDE_PAD + r, Math.min(boardW - SIDE_PAD - r, laneX)),
        y: TOP_PAD + r + 2,
        atom,
        r,
      };
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

  /**
   * Ray-cast a projectile from the launcher at `angleDeg`. Walks pixel steps
   * and stops when it hits the ceiling or any existing ball. Resolves the
   * landing position so the new ball just touches whatever it hit.
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
        if (!stone || Math.hypot(x - stone.x, y - stone.y) > projR + stone.r + step * 2) {
          recentlyBouncedStoneIds.delete(id);
        }
      }

      // collision with existing balls
      let hitIdx = -1;
      let bestT = Infinity;
      for (let b = 0; b < balls.length; b++) {
        if (balls[b].stoneHp != null && recentlyBouncedStoneIds.has(balls[b].id)) continue;
        const sumR = projR + balls[b].r;
        const ddx = x - balls[b].x;
        const ddy = y - balls[b].y;
        if (ddx * ddx + ddy * ddy < sumR * sumR) {
          // back-track along (dx, dy) so |pos - ball| = sumR
          // pos = (x,y) - t*(dx,dy)
          const ox = x - balls[b].x;
          const oy = y - balls[b].y;
          const bcoef = -2 * (ox * dx + oy * dy);
          const ccoef = ox * ox + oy * oy - sumR * sumR;
          const disc = bcoef * bcoef - 4 * ccoef;
          let t = 0;
          if (disc >= 0) {
            const sq = Math.sqrt(disc);
            const t1 = (-bcoef - sq) / 2;
            const t2 = (-bcoef + sq) / 2;
            t = t1 >= 0 ? t1 : t2 >= 0 ? t2 : 0;
          }
          if (t < bestT) {
            bestT = t;
            hitIdx = b;
          }
        }
      }
      if (hitIdx >= 0) {
        const lx = Math.max(minX, Math.min(maxX, x - bestT * dx));
        const ly = Math.max(ceilingY, y - bestT * dy);
        const hitBall = balls[hitIdx];
        path.push({ x: lx, y: ly });
        if (hitBall.stoneHp != null && !currentIsBlank && bouncedStoneIds.length < 8) {
          bouncedStoneIds.push(hitBall.id);
          recentlyBouncedStoneIds.add(hitBall.id);
          const normalMag = Math.hypot(lx - hitBall.x, ly - hitBall.y) || 1;
          const nx = (lx - hitBall.x) / normalMag;
          const ny = (ly - hitBall.y) / normalMag;
          const dot = dx * nx + dy * ny;
          const reflectedX = dx - 2 * dot * nx;
          const reflectedY = dy - 2 * dot * ny;
          const bounceInfluence = 0.45;
          dx = dx * (1 - bounceInfluence) + reflectedX * bounceInfluence;
          dy = dy * (1 - bounceInfluence) + reflectedY * bounceInfluence;
          const mag = Math.hypot(dx, dy) || 1;
          dx /= mag;
          dy /= mag;
          if (import.meta.env.DEV) {
            console.log("Stone bounce", { aimDeg, dx, dy, hitId: hitBall.id });
          }
          y = ly + dy * step * 1.5;
          x = lx + dx * step * 1.5;
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
        if (Math.hypot(stone.x - merge.x, stone.y - merge.y) <= stone.r + geo.radius * 1.25) {
          damage.set(stone.id, (damage.get(stone.id) ?? 0) + 1);
        }
      }
    }
    return damage;
  }

  function shoot() {
    if (busy || gameOver || won || inventoryPickerOpen || shuffleStartOpen) return;
    trackShot(levelId, pendingStone ? -1 : currentIsEGun ? 0 : current, aimDeg, mode);
    queueUndoRef.current = null;
    setPendingReversiblePowerUp(null);
    if (currentIsEGun && !pendingStone) {
      const beam = castStraightRay(aimDeg);
      if (!beam) return;
      setBusy(true);
      sfx(playShootSound);
      haptic(15);
      setProjectile(beam.path[0]);
      setEGunBeamPath(beam.path);
      const totalMs = Math.min(220, 50 + beam.path.length * 3);
      const stepMs = totalMs / beam.path.length;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i >= beam.path.length) {
          clearInterval(interval);
          setProjectile(null);
          setEGunBeamPath(null);
          setGravityFxId(null);
          fireEGun(beam.path);
        } else {
          setProjectile(beam.path[i]);
        }
      }, stepMs);
      return;
    }
    const hit = castRay(aimDeg);
    if (!hit) return;
    setBusy(true);
    sfx(playShootSound);
    haptic(15);

    // animate projectile along path
    const path = hit.path;
    const baseMs = Math.min(360, 60 + path.length * 4);
    // Stones fly twice as fast.
    const totalMs = pendingStone ? baseMs / 2 : baseMs;
    const stepMs = totalMs / path.length;
    let i = 0;
    setProjectile(path[0]);
    const interval = setInterval(() => {
      i++;
      if (i >= path.length) {
        clearInterval(interval);
        setProjectile(null);
        setGravityFxId(null);
        triggerImpact(hit.x, hit.y, hit.hitId, hit.dx, hit.dy, hit.stoneHitIds);
      } else {
        setProjectile(path[i]);
      }
    }, stepMs);
  }

  function fireEGun(path: { x: number; y: number }[]) {
    const start = path[0];
    const end = path[path.length - 1];
    const hitIds = new Set<number>();
    const upgradedAtoms = new Set<number>();
    const updated = balls.map((b) => {
      if (b.stoneHp != null || b.atom >= 118) return b;
      if (distanceToSegment(b.x, b.y, start.x, start.y, end.x, end.y) > b.r + eGunR * 0.35)
        return b;
      hitIds.add(b.id);
      const atom = Math.min(118, b.atom + 1);
      upgradedAtoms.add(atom);
      return { ...b, atom, r: radiusFor(atom) };
    });
    const nextShots = shots + 1;
    setShots(nextShots);
    applyShotMilestones(nextShots);
    setBalls(updated);
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
    const reachedTarget = Array.from(upgradedAtoms).some((atom) => atom >= target);
    if (reachedTarget && !continuingPastTarget) {
      const nextHighest = Math.max(highest, ...Array.from(upgradedAtoms));
      const timeSec = (Date.now() - startTimeRef.current) / 1000;
      const stars = calculateStars(level, score, nextShots, runBestCombo, timeSec);
      setEarnedStars(stars);
      setLevelStars(levelId, stars);
      reportQuestProgress({ levelCleared: true, starsEarned: stars });
      unlockLevel(levelId + 1);
      sfx(playWinSound);
      haptic([30, 60, 30, 60, 80]);
      trackLevelWin(levelId, score, nextShots, nextHighest, mode);
      if (mode !== "campaign") setChallengeBestScore(mode, score);
      showStageClearAnimation({ stars, score, shots: nextShots, bestCombo: runBestCombo });
      return;
    }
    const nextSlot = makeNextQueueSlot(dynamicMaxQueue(updated.length), updated);
    setQueue((q) => [...q.slice(1), nextSlot.atom]);
    setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
    setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
    setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
    if (checkGameOver(updated, geo)) {
      trackGameOver(levelId, score, nextShots, highest, mode);
      setGameOver(true);
      haptic([50, 80, 50, 80, 200]);
    }
    setBusy(false);
  }

  function isNobleGasLocked(atom: number): boolean {
    return mode === "noble-gas-lock" && ELEMENTS[atom - 1]?.category === "noble-gas";
  }

  function applyShotModeEffects(source: Board, nextShots: number): Board {
    let updated = source;
    if (mode === "isotope-decay" && nextShots > 0 && nextShots % 20 === 0) {
      updated = updated.map((b) => {
        if (b.stoneHp != null || b.atom <= 1) return b;
        const atom = b.atom - 1;
        return { ...b, atom, r: radiusFor(atom) };
      });
      spawnPopup("🧪 ISOTOPE DECAY −1");
      haptic([20, 35, 20]);
    }
    if (mode === "unstable-isotopes" && nextShots > 0 && nextShots % 6 === 0) {
      let remaining = 3;
      updated = updated.map((b) => {
        if (remaining <= 0 || b.stoneHp != null || b.atom <= 1 || Math.random() > 0.45) return b;
        remaining -= 1;
        const atom = b.atom - 1;
        return { ...b, atom, r: radiusFor(atom) };
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
        setBusy(false);
      }, 220);
      return;
    }
    let impactBalls = balls;
    let impactStoneBonus = 0;
    if (bouncedStoneHitIds.length > 0) {
      const damage = new Map<number, number>();
      bouncedStoneHitIds.forEach((id) => damage.set(id, (damage.get(id) ?? 0) + 1));
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
        const updated = impactBalls.filter((b) => b.id !== blankStone.id);
        const nextShots = shots + 1;
        setShots(nextShots);
        applyShotMilestones(nextShots);
        setBalls(updated);
        setStoneHitIds(new Set([blankStone.id]));
        setTimeout(() => setStoneHitIds(new Set()), 380);
        setNoMergeStreak(0);
        spawnPopup("✦ STONE ERASED");
        haptic([30, 60, 30, 90]);
        const nextSlot = makeNextQueueSlot(dynamicMaxQueue(updated.length), updated);
        setQueue((q) => [...q.slice(1), nextSlot.atom]);
        setShimmerQueue((sq) => [...sq.slice(1), nextSlot.shimmer]);
        setEGunQueue((eq) => [...eq.slice(1), nextSlot.eGun]);
        setBlankQueue((bq) => [...bq.slice(1), nextSlot.blank]);
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
        finalizePlacement(x, y, updated, impactStoneBonus + directStoneBonus);
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
              setScore((s) => s + totalBonus);
              addScore(totalBonus);
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
    }, 220);
  }

  function finalizePlacement(
    x: number,
    y: number,
    currentBalls: Board = balls,
    impactStoneBonus = 0,
    atomOverride = current,
  ) {
    const newBall: Ball = {
      id: nextBallId(),
      x,
      y,
      atom: atomOverride,
      r: radiusFor(atomOverride),
    };
    if (currentBalls !== balls) setBalls(currentBalls);
    let result = placeAndMerge(
      currentBalls,
      newBall,
      geo,
      target,
      isNobleGasLocked(atomOverride) ? atomOverride : 118,
      catalystShotsRemaining > 0 ? CATALYST_ADJ_FACTOR : undefined,
      fusionJumpArmed,
    );
    if (fusionJumpArmed && result.merges.length > 0) {
      setFusionJumpArmed(false);
      if (pendingReversiblePowerUp === "fusion-jump") setPendingReversiblePowerUp(null);
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
        addScore(mergeStoneDamage.bonus);
      }
      haptic([20, 30, 30]);
    }

    result = { ...result, balls: applyShotModeEffects(result.balls, nextShots) };
    result = { ...result, balls: relaxBoard(result.balls) };
    // Refresh radii on any merged survivors (their atom changed).
    setBalls(result.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    const shimmerHit = !currentIsBlank && currentIsShimmer && result.merges.length > 0;
    const grabAdd = result.merges.length * (shimmerHit ? 2 : 1);
    if (result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
      grantGravityForCombo(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      result.merges.forEach((m) => trackMerge(levelId, m.resultAtomicNumber, m.chainDepth, mode));
      const showSymbolPopups = result.merges.length >= 2;
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            if (showSymbolPopups) {
              spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
            }
          },
          80 + i * 120,
        );
      });
      // Append to history log (single chronological record per merge).
      pushMergeHistory(result.merges);
    }
    if (shimmerHit) spawnPopup("✦ SHIMMER ×2 ✦");
    if (grabAdd > 0) {
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
    } else {
      // Missed shot — atom didn't merge with anything, so the streak resets.
      setGrabProgress(0);
    }

    // === Stone spawn check ===
    // Track shots that produce zero merges. After 3 in a row, load the
    // launcher with a Stone projectile that the player must shoot.
    if (result.merges.length === 0) {
      setNoMergeStreak((s) => {
        const next = s + 1;
        if (next >= STONE_NO_MERGE_TRIGGER) {
          setTimeout(() => loadStoneIntoLauncher(), 220);
          return 0;
        }
        return next;
      });
    } else {
      setNoMergeStreak(0);
    }

    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier * (shimmerHit ? 2 : 1));
    const nextScore = score + gained + mergeStoneBonus + impactStoneBonus;
    const nextBestCombo = Math.max(runBestCombo, result.merges.length);
    setScore(nextScore);
    addScore(gained + impactStoneBonus);

    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });

    const firstDiscovery = undiscovered.sort((a, b) => b - a)[0];

    setTimeout(
      () => {
        setHighlightId(null);
        if (result.levelComplete && !continuingPastTarget) {
          const timeSec = (Date.now() - startTimeRef.current) / 1000;
          const stars = calculateStars(level, nextScore, nextShots, nextBestCombo, timeSec);
          setEarnedStars(stars);
          setLevelStars(levelId, stars);
          reportQuestProgress({ levelCleared: true, starsEarned: stars });
          unlockLevel(levelId + 1);
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
          // Advance the queue so play can resume if the user keeps going.
          const nextSlot = makeNextQueueSlot(dynamicMaxQueue(result.balls.length), result.balls);
          setQueue((q) => [...q.slice(1), nextSlot.atom]);
          setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
          setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
          setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
          return;
        }
        if (firstDiscovery && firstDiscovery > 1) {
          setDiscoveryEl(firstDiscovery);
        }
        // Advance queue (functional update — guarantees fresh state)
        const nextSlot = makeNextQueueSlot(dynamicMaxQueue(result.balls.length), result.balls);
        setQueue((q) => [...q.slice(1), nextSlot.atom]);
        setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
        setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
        setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
        if (checkGameOver(result.balls, geo)) {
          trackGameOver(levelId, nextScore, nextShots, nextHighest, mode);
          setGameOver(true);
          haptic([50, 80, 50, 80, 200]);
        }
        setBusy(false);
      },
      200 + result.merges.length * 120,
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
    };
  }

  function claimUnusedPowerUps() {
    if (hasClaimedUnusedInventoryRef.current) return;
    const unused = collectUnusedPowerUps();
    const totalUnused = countPowerUps(unused);
    if (totalUnused <= 0) {
      hasClaimedUnusedInventoryRef.current = true;
      return;
    }
    addInventoryPowerUps(unused);
    hasClaimedUnusedInventoryRef.current = true;
    spawnPopup(`🎒 SAVED ×${totalUnused}`);
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
    const selectedCount = countPowerUps(selectedInventoryPowerUps);
    if (selectedCount > 0 && !consumeInventoryPowerUps(selectedInventoryPowerUps)) return;
    setTransmuteCharges((count) => count + selectedInventoryPowerUps.transmute);
    setFusionJumpCharges((count) => count + selectedInventoryPowerUps["fusion-jump"]);
    setCatalystCharges((count) => count + selectedInventoryPowerUps.catalyst);
    setEmissionCharges((count) => count + selectedInventoryPowerUps.emission);
    setGravityCharges((count) => count + selectedInventoryPowerUps.gravity);
    setGrabs((count) => count + selectedInventoryPowerUps.grab);
    if (selectedCount > 0) {
      spawnPopup(`🎒 LOADED ×${selectedCount}`);
      showTip(
        "feature-inventory-start",
        "🎒 Inventory loaded",
        "Unused power-ups are saved after a run. At the start of a level, choose up to 3 from your inventory to begin with an early strategy boost.",
      );
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
      pendingStone ||
      transmuteCharges <= 0 ||
      pendingReversiblePowerUp
    )
      return;
    if (currentIsEGun || currentIsBlank) return;
    const maxTier = Math.min(118, Math.max(current + 1, target - 1));
    if (current >= maxTier) return;
    const atom = current + 1 + Math.floor(Math.random() * (maxTier - current));
    setTransmuteCharges((g) => Math.max(0, g - 1));
    setQueue((q) => [atom, ...q.slice(1)]);
    setShimmerQueue((q) => [false, ...q.slice(1)]);
    setEGunQueue((q) => [false, ...q.slice(1)]);
    setBlankQueue((q) => [false, ...q.slice(1)]);
    spawnPopup(`🔀 ${ELEMENTS[atom - 1]?.symbol ?? "?"}`);
    haptic([20, 30, 20]);
  }

  function triggerFusionJumpPowerUp() {
    if (cancelPendingPowerUp("fusion-jump")) return;
    if (busy || gameOver || won || fusionJumpCharges <= 0 || pendingReversiblePowerUp) return;
    setPendingReversiblePowerUp("fusion-jump");
    setFusionJumpCharges((g) => Math.max(0, g - 1));
    setFusionJumpArmed(true);
    spawnPopup("⏭ JUMP ARMED");
    haptic(20);
  }

  function triggerCatalystPowerUp() {
    if (cancelPendingPowerUp("catalyst")) return;
    if (
      busy ||
      gameOver ||
      won ||
      catalystCharges <= 0 ||
      catalystShotsRemaining > 0 ||
      pendingReversiblePowerUp
    )
      return;
    setPendingReversiblePowerUp("catalyst");
    setCatalystCharges((g) => Math.max(0, g - 1));
    setCatalystShotsRemaining(CATALYST_AURA_SHOTS);
    spawnPopup("🧪 AURA ×5");
    haptic([20, 30, 20]);
  }

  function triggerEmissionPowerUp() {
    if (cancelPendingPowerUp("emission")) return;
    if (busy || gameOver || won || emissionCharges <= 0 || pendingStone || pendingReversiblePowerUp)
      return;

    const raisedQueue = queue.map((atom, i) =>
      eGunQueue[i] || blankQueue[i] ? atom : raiseAtomForEmission(atom),
    );
    if (raisedQueue.every((atom, i) => atom === queue[i])) return;

    queueUndoRef.current = { queue, shimmerQueue, eGunQueue, blankQueue, powerUp: "emission" };
    setPendingReversiblePowerUp("emission");
    setEmissionCharges((g) => Math.max(0, g - 1));
    setQueue(raisedQueue);

    const reachedAtomicNumbers = raisedQueue.filter((atom, i) => atom !== queue[i]);
    const discoveries = reachedAtomicNumbers.filter((n) => !discoveredElements.includes(n));
    if (discoveries.length > 0) registerDiscoveries(discoveries);

    spawnPopup("☢ QUEUE +1");
    reportQuestProgress({ discoveries, reachedAtomicNumbers });
    haptic([25, 45, 25]);
  }

  function triggerGravityPowerUp() {
    if (busy || gameOver || won || gravityCharges <= 0) return;
    setBusy(true);
    const fxId = Date.now();
    setGravityFxId(fxId);
    setTimeout(() => setGravityFxId((active) => (active === fxId ? null : active)), 1050);
    setGravityCharges((g) => Math.max(0, g - 1));
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
    setScore((s) => s + gained);
    addScore(gained);
    if (result.merges.length > 0) {
      grantGravityForCombo(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      setGrabProgress((p) => {
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
              spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
          },
          80 + i * 120,
        );
      });
      pushMergeHistory(result.merges);
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
    setTimeout(
      () => {
        setHighlightId(null);
        if (result.levelComplete && !continuingPastTarget) {
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
          unlockLevel(levelId + 1);
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
      200 + result.merges.length * 120,
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
        addScore(mergeStoneDamage.bonus);
      }
      haptic([20, 30, 30]);
    }

    setBalls(result.balls.map((b) => (b.stoneHp != null ? b : { ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    if (result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
      grantGravityForCombo(result.merges.length);
      setRunBestCombo((best) => Math.max(best, result.merges.length));
      setBestCombo(result.merges.length);
      const showSymbolPopups = result.merges.length >= 2;
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            if (showSymbolPopups)
              spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
          },
          80 + i * 120,
        );
      });
      pushMergeHistory(result.merges);
    }
    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(result.scoreGained * level.scoreMultiplier);
    const nextScore = score + gained + mergeStoneBonus;
    setScore(nextScore);
    addScore(gained);
    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });
    setTimeout(() => setHighlightId(null), 200 + result.merges.length * 120);
    // Grabbed-and-merged into the target element? Trigger the same win flow
    // a regular shot does so the level actually clears.
    if (result.levelComplete && !continuingPastTarget) {
      const timeSec = (Date.now() - startTimeRef.current) / 1000;
      const nextBestCombo = Math.max(runBestCombo, result.merges.length);
      const stars = calculateStars(level, nextScore, shots, nextBestCombo, timeSec);
      setEarnedStars(stars);
      setLevelStars(levelId, stars);
      reportQuestProgress({ levelCleared: true, starsEarned: stars });
      unlockLevel(levelId + 1);
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
            distanceToSegment(b.x, b.y, start.x, start.y, end.x, end.y) <= b.r + eGunR * 0.35,
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
            <button onClick={onExit} style={iconBtn}>
              ← Menu
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              title="Open merge history"
              aria-label="Open merge history log"
              style={{ ...iconBtn, minWidth: 0, padding: "6px 8px" }}
            >
              📜
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

        {/* TARGET PROGRESS */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
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
            if (grabMode) return;
            updateAimFromPointer(e.clientX, e.clientY);
            shoot();
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
            cursor: "crosshair",
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
              zIndex: 0,
            }}
          />

          {/* BALLS — absolutely positioned in pixel space */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
            {balls.map((b) => {
              const isDrag = grabbing?.id === b.id;
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
                  className={gravityFxId && b.stoneHp == null ? "gravity-atom-lift" : undefined}
                  style={{
                    position: "absolute",
                    left: x - b.r,
                    top: y - b.r,
                    transition: isDrag
                      ? "none"
                      : "left 420ms cubic-bezier(0.2, 0.9, 0.2, 1), top 420ms cubic-bezier(0.2, 0.9, 0.2, 1)",
                    zIndex: isDrag ? 5 : undefined,
                    filter: eGunPreviewHitIds.has(b.id)
                      ? "drop-shadow(0 0 16px oklch(0.82 0.18 85 / 0.95)) brightness(1.18)"
                      : isDrag
                        ? "drop-shadow(0 6px 12px rgba(0,0,0,0.5))"
                        : undefined,
                  }}
                >
                  <ElementBall
                    atomicNumber={b.atom}
                    size={ballSize}
                    highlight={highlightId === b.id || eGunPreviewHitIds.has(b.id)}
                    wiggle={wiggleIds.has(b.id)}
                    glow={isDrag}
                  />
                </div>
              );
            })}
          </div>

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

          {stageClearFx && (
            <div className="stage-clear-fx" aria-live="polite" aria-label="Target atom formed">
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
                <div className="stage-clear-eyebrow">TARGET ATOM FORMED</div>
                <div className="stage-clear-atom">
                  <ElementBall atomicNumber={target} size={92} glow />
                </div>
                <div className="stage-clear-title">{targetEl?.name ?? "Target"} unlocked!</div>
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
                    strokeWidth={10}
                    strokeLinecap="round"
                    opacity={0.18}
                  />
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="oklch(0.92 0.2 90)"
                    strokeWidth={4}
                    strokeLinecap="round"
                    opacity={0.92}
                  />
                  <polyline
                    points={previewPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="white"
                    strokeWidth={1.5}
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
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.24}
              />
              <polyline
                points={eGunBeamPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="oklch(0.95 0.2 95)"
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.95}
              />
              <polyline
                points={eGunBeamPath.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="white"
                strokeWidth={2}
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
              {pendingStone ? (
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
                />
              )}
            </div>
          )}

          {/* LAUNCHER */}
          <div
            style={{
              position: "absolute",
              left: launcherX - projShotSize / 2,
              top: launcherY - projShotSize / 2,
              zIndex: 2,
              pointerEvents: "none",
              transform: `rotate(${aimDeg}deg)`,
              transformOrigin: "center center",
            }}
          >
            {!projectile && showCatalystShotRadius && (
              <CatalystRadiusRing radius={catalystShotRadius} size={projShotSize} />
            )}
            {!projectile &&
              (pendingStone ? (
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
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: "var(--muted-foreground)" }}>
            NEXT →
          </div>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {queue
              .slice(1)
              .map((n, i) =>
                eGunQueue[i + 1] ? (
                  <EGunVisual key={i} size={32 - i * 3} />
                ) : blankQueue[i + 1] ? (
                  <BlankAtomVisual key={i} size={32 - i * 3} />
                ) : (
                  <ElementBall
                    key={i}
                    atomicNumber={n}
                    size={32 - i * 3}
                    shimmer={shimmerQueue[i + 1]}
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
              minWidth: 120,
              flexWrap: "wrap",
            }}
          >
            {(transmuteCharges > 0 || pendingReversiblePowerUp === "transmute") && (
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
                    (pendingStone ||
                      currentIsEGun ||
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
                    busy || pendingStone || currentIsEGun || currentIsBlank || current >= target - 1
                      ? 0.55
                      : 1,
                  cursor:
                    busy || pendingStone || currentIsEGun || currentIsBlank || current >= target - 1
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <span aria-hidden="true">🔀</span>
                <span style={powerUpCount}>{transmuteCharges}</span>
              </button>
            )}
            {(fusionJumpCharges > 0 || fusionJumpArmed) && (
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
                <span aria-hidden="true">⏭</span>
                <span style={powerUpCount}>{fusionJumpArmed ? "↩" : fusionJumpCharges}</span>
              </button>
            )}
            {(catalystCharges > 0 || catalystShotsRemaining > 0) && (
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
                <span aria-hidden="true">🧪</span>
                <span style={powerUpCount}>
                  {pendingReversiblePowerUp === "catalyst"
                    ? "↩"
                    : catalystShotsRemaining > 0
                      ? catalystShotsRemaining
                      : catalystCharges}
                </span>
              </button>
            )}
            {(emissionCharges > 0 || pendingReversiblePowerUp === "emission") && (
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
                    (pendingStone ||
                      queue.every(
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
                    pendingStone ||
                    queue.every(
                      (atom, i) =>
                        eGunQueue[i] || blankQueue[i] || raiseAtomForEmission(atom) === atom,
                    )
                      ? 0.65
                      : 1,
                  cursor:
                    busy ||
                    pendingStone ||
                    queue.every(
                      (atom, i) =>
                        eGunQueue[i] || blankQueue[i] || raiseAtomForEmission(atom) === atom,
                    )
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <span aria-hidden="true">☢</span>
                <span style={powerUpCount}>
                  {pendingReversiblePowerUp === "emission" ? "↩" : emissionCharges}
                </span>
              </button>
            )}
            {gravityCharges > 0 && (
              <button
                type="button"
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
                <span aria-hidden="true">🌀</span>
                <span style={powerUpCount}>{gravityCharges}</span>
              </button>
            )}
            {grabs > 0 && (
              <button
                type="button"
                title="Grab: drag any atom on the board to a new position."
                aria-label={`Toggle Grab power-up (${grabs} available)`}
                onClick={() => setGrabMode((g) => !g)}
                {...powerUpInfoHandlers(
                  "🤚 Grab",
                  "Toggle Grab, then drag an atom to a new position. Toggle it off before grabbing if you change your mind.",
                )}
                style={{
                  ...powerUpIconBtn,
                  border: `1px solid ${grabMode ? "var(--accent)" : "var(--border)"}`,
                  background: grabMode
                    ? "linear-gradient(135deg, var(--accent), var(--primary))"
                    : "var(--surface-elevated)",
                  color: grabMode ? "var(--primary-foreground)" : "var(--foreground)",
                  boxShadow: grabMode ? "0 0 14px var(--accent-glow)" : undefined,
                }}
              >
                <span aria-hidden="true">🤚</span>
                <span style={powerUpCount}>{grabs}</span>
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
          />
        )}
        {shuffleStartOpen && !won && !gameOver && (
          <ShuffleStartModal
            atoms={shuffleAtoms}
            shufflesLeft={shufflesLeft}
            onReshuffle={reshuffle}
            onStart={confirmShuffleStart}
          />
        )}
        {historyOpen && (
          <MergeHistoryModal entries={mergeHistory} onClose={() => setHistoryOpen(false)} />
        )}
        {discoveryEl !== null && (
          <DiscoveryModal atomicNumber={discoveryEl} onClose={() => setDiscoveryEl(null)} />
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
            isContinuing={continuingPastTarget}
            onClaim={() => {
              setWon(true);
              setWinChoice(null);
              setContinueClaimPromptOpen(false);
            }}
            onContinue={() => {
              setContinuingPastTarget(true);
              setContinueStartedElapsedMs((startedAt) => startedAt ?? elapsedMs);
              setWinChoice(null);
              setContinueClaimPromptOpen(false);
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
            onDiscoveryClick={setDiscoveryEl}
            onMain={onExit}
            onNext={() => onWin(getNextLevel(levelId)?.id ?? null)}
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
            onDiscoveryClick={setDiscoveryEl}
            onMain={onExit}
            onNext={() => onWin(levelId)}
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

function InventoryStartModal({
  inventory,
  selected,
  onChange,
  onStart,
}: {
  inventory: PowerUpInventory;
  selected: PowerUpInventory;
  onChange: (powerUp: InventoryPowerUpId, delta: 1 | -1) => void;
  onStart: () => void;
}) {
  const selectedCount = countPowerUps(selected);
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
        Saved unused power-ups can be loaded before a level starts. Tap a selected card again to add
        copies, or use minus to remove them.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
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
                gridTemplateColumns: "36px 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                background: isSelected
                  ? "color-mix(in oklch, var(--accent) 18%, var(--surface-elevated))"
                  : "var(--surface)",
                color: "var(--foreground)",
                opacity: disabled ? 0.55 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 24, textAlign: "center" }} aria-hidden="true">
                {meta.icon}
              </span>
              <span>
                <span style={{ display: "block", fontWeight: 900, fontSize: 13 }}>{meta.name}</span>
                <span style={{ display: "block", color: "var(--muted-foreground)", fontSize: 11 }}>
                  {meta.description}
                </span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                  minWidth: 76,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          color: "var(--muted-foreground)",
          fontSize: 12,
        }}
      >
        <span>
          Selected {selectedCount}/{INVENTORY_PICK_LIMIT}
        </span>
        <button onClick={onStart} style={{ ...modalBtn, marginTop: 0, flex: "0 0 auto" }}>
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
    <Modal>
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

function ShuffleStartModal({
  atoms,
  shufflesLeft,
  onReshuffle,
  onStart,
}: {
  atoms: number[];
  shufflesLeft: number;
  onReshuffle: () => void;
  onStart: () => void;
}) {
  return (
    <Modal>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        STARTING SHUFFLE
      </div>
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>Pick your opening atoms</h2>
      <p style={{ margin: "0 0 14px", color: "var(--muted-foreground)", fontSize: 13 }}>
        These 4 atoms will be placed across the top of the board to give you a head start.
        Reshuffle up to 3 times for a different draw.
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          padding: "12px 0 16px",
          flexWrap: "wrap",
        }}
      >
        {atoms.map((a, i) => (
          <ElementBall key={i} atomicNumber={a} size={56} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onReshuffle}
          disabled={shufflesLeft <= 0}
          style={{
            ...modalBtn,
            background: "var(--surface-high)",
            color: "var(--foreground)",
            opacity: shufflesLeft <= 0 ? 0.5 : 1,
            cursor: shufflesLeft <= 0 ? "not-allowed" : "pointer",
          }}
        >
          🔀 Reshuffle ({shufflesLeft})
        </button>
        <button onClick={onStart} style={modalBtn}>
          Start
        </button>
      </div>
    </Modal>
  );
}

function MergeHistoryModal({
  entries,
  onClose,
}: {
  entries: { id: number; ts: number; atom: number; depth: number; chainSize: number }[];
  onClose: () => void;
}) {
  const t0 = entries[0]?.ts ?? Date.now();
  return (
    <Modal>
      <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", marginBottom: 8 }}>
        MERGE HISTORY
      </div>
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 900 }}>This run, step by step</h2>
      {entries.length === 0 ? (
        <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          No merges yet — make a fusion to see it logged here.
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
            .map((e) => {
              const el = ELEMENTS[e.atom - 1];
              const dt = (e.ts - t0) / 1000;
              const mm = Math.floor(dt / 60);
              const ss = Math.floor(dt % 60).toString().padStart(2, "0");
              return (
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
                  <ElementBall atomicNumber={e.atom} size={36} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {el?.name ?? "?"} ({el?.symbol ?? "?"})
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {e.chainSize >= 2 ? `Chain ×${e.chainSize}` : "Single merge"}
                      {e.depth > 0 ? ` • depth ${e.depth}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                    }}
                  >
                    +{mm}:{ss}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <button onClick={onClose} style={modalBtn}>
        Close
      </button>
    </Modal>
  );
}

function ContinueChoiceModal({
  level,
  score,
  shots,
  bestCombo,
  stars,
  isContinuing = false,
  onClaim,
  onContinue,
}: {
  level: (typeof LEVELS)[0];
  score: number;
  shots: number;
  bestCombo: number;
  stars: number;
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
          : `${ELEMENTS[level.targetElement - 1]?.name ?? "?"} unlocked!`}
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
          margin: "0 0 14px",
        }}
      >
        {isContinuing
          ? "You can finish the level now, or close this popup and keep chasing a higher score. The danger zone will keep rising every 30 seconds."
          : "Claim your stars now, or keep playing to chase a higher score. The level is already complete either way."}
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
          {isContinuing ? "Continue" : "Keep Playing"}
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
  onDiscoveryClick?: (atomicNumber: number) => void;
  onMain: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <Modal>
      <div
        style={{ fontSize: 12, letterSpacing: 3, color: accent, fontWeight: 800, marginBottom: 8 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{level.name}</div>
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
      {newDiscoveries.length > 0 && (
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
      {level.scoreGoal && (
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

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
        backdropFilter: "blur(4px)",
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
