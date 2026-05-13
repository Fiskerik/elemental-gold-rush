import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
} from "./logic";
import { ElementBall } from "./ElementBall";
import { useProgress } from "./store";
import { playMergeSound, playShootSound, playWinSound, vibrate } from "./audio";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
}

const QUEUE_SIZE = 4;
const MAX_AIM_DEG = 75;
const SHIMMER_MIN_LEVEL = 5;
const GRAB_MIN_LEVEL = 4;
const EGUN_MIN_LEVEL = 6;
const BLANK_MIN_LEVEL = 10;
const BLANK_ATOM_CHANCE = 0.01;
const POWER_UP_CHANCE = 0.05;
const EGUN_MIN_SHOT_GAP = 10;
const EMISSION_UNLOCK_INTERVAL_MS = 5 * 60 * 1000;
const STONE_MAX_HP = 8;

function StoneVisual({ size, hp }: { size: number; hp: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 28%, oklch(0.55 0.02 60), oklch(0.32 0.02 60) 60%, oklch(0.18 0.02 60))",
        boxShadow:
          "0 6px 14px rgba(0,0,0,0.55), inset 0 -8px 14px rgba(0,0,0,0.45), inset 0 6px 12px rgba(255,255,255,0.12)",
        border: "2px solid oklch(0.25 0.02 60)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "oklch(0.95 0.02 60)",
        fontWeight: 900,
        textShadow: "0 1px 2px rgba(0,0,0,0.7)",
      }}
    >
      <div style={{ fontSize: Math.max(10, size * 0.16), opacity: 0.85, lineHeight: 1 }}>⛰</div>
      <div style={{ fontSize: Math.max(14, size * 0.32), lineHeight: 1.05 }}>{hp}</div>
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
  const par = level.parShots ?? 30;
  if (level.id <= 4) return par;
  const lateLevelRelief = 1 + Math.min(0.9, (level.id - 4) * 0.055);
  return Math.round(par * lateLevelRelief);
}

function calculateStars(
  level: (typeof LEVELS)[0],
  score: number,
  shots: number,
  bestCombo: number,
  timeSec: number,
): number {
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

export function GameBoard({ levelId, onExit, onWin }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
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
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [wiggleIds, setWiggleIds] = useState<Set<number>>(new Set());
  const [projectile, setProjectile] = useState<{ x: number; y: number } | null>(null);
  const [gravityFxId, setGravityFxId] = useState<number | null>(null);
  const popupId = useRef(0);
  const eGunCooldownSlots = useRef(0);

  // === Grab power-up ===
  // Earned by making 10 merges in a row.
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
  // count +2). A missed shot resets progress, so Grab requires 10 merges in
  // a row.
  const GRAB_THRESHOLD = 10;
  const [grabProgress, setGrabProgress] = useState(0);

  // === Gravity and Emission power-ups ===
  // Gravity is awarded by 4× combos. Emission is awarded every 5 minutes and
  // raises atoms without creating the level target.
  const [gravityCharges, setGravityCharges] = useState(0);
  const [emissionCharges, setEmissionCharges] = useState(0);
  const [emissionUnlockIndex, setEmissionUnlockIndex] = useState(0);
  const [emissionBoost, setEmissionBoost] = useState(0);

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

  // === Run timer ===
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

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

  useEffect(() => {
    setBalls(createEmptyBoard());
    const initialQueue = generateInitialQueue(level.maxQueueElement, QUEUE_SIZE, level.queueDecay);
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
        initialShimmer[i] ? randomAvailableElement(level.maxQueueElement) : atom,
      ),
    );
    setShimmerQueue(initialShimmer);
    setEGunQueue(initialEGun);
    setBlankQueue(initialBlank);
    setScore(0);
    setHighest(1);
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
    setNoMergeStreak(0);
    setStoneHitIds(new Set());
    setPendingStone(false);
    setStoneSpawnCount(0);
    setGravityCharges(0);
    setEmissionCharges(0);
    setEmissionUnlockIndex(0);
    setEmissionBoost(0);
    eGunCooldownSlots.current = 0;
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    // Per-level intro tooltips for newly unlocked features.
    if (level.id >= SHIMMER_MIN_LEVEL) {
      showTip(
        "feature-shimmer-unlock",
        "✦ Shimmering atoms unlocked",
        "Some atoms in your queue now shimmer with a rainbow halo. Land a successful merge with one to score 2× points and fill the Grab combo bar twice as fast.",
      );
    }
    if (level.id >= GRAB_MIN_LEVEL) {
      showTip(
        "feature-grab-unlock",
        "🤚 Grab power-up unlocked!",
        "Build the Grab combo bar by making 10 merges in a row. When it fills, tap the Grab button (bottom-right), then drag any atom on the board to a new position — surrounding atoms slide out of the way to make room. Use it to set up huge merge chains.",
      );
    }
    if (level.id >= EGUN_MIN_LEVEL) {
      showTip(
        "feature-egun-unlock",
        "⚡ E-gun unlocked!",
        "Rare E-gun shots fire a straight beam to the far edge without bouncing. Every non-Hydrogen atom in the beam drops by 1 tier.",
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
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement]);

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

  // Tick the run timer every second while the level is active.
  useEffect(() => {
    if (gameOver || won) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [gameOver, won, levelId]);

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
      "Emission unlocks every 5 minutes. Tap it to raise all atoms by 1 tier without creating the level target; future launcher atoms also start 1 tier higher.",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, gameOver, won, emissionUnlockIndex]);

  // Dynamic queue cap: as the board fills, unlock higher-tier atoms in the
  // shooting queue. Adds +1 tier at 15 atoms on board, +2 at 25, etc.
  // Capped at target-1 so we never spawn the literal target element.
  function dynamicMaxQueue(boardCount: number): number {
    const tierBonus = Math.max(0, Math.floor((boardCount - 5) / 10));
    const cap = Math.max(level.maxQueueElement, target - 1);
    return Math.min(level.maxQueueElement + tierBonus, cap);
  }

  function randomAvailableElement(maxElement: number): number {
    return Math.max(1, Math.min(118, Math.floor(Math.random() * maxElement) + 1));
  }

  function raiseAtomForEmission(atom: number): number {
    if (atom < 1) return atom;
    const raised = Math.min(118, atom + 1);
    return raised === target ? atom : raised;
  }

  function applyEmissionBoost(atom: number): number {
    let boosted = atom;
    for (let i = 0; i < emissionBoost; i++) {
      boosted = raiseAtomForEmission(boosted);
    }
    return boosted;
  }

  function grantGravityForCombo(mergeCount: number) {
    if (mergeCount < 4) return;
    setGravityCharges((g) => g + 1);
    spawnPopup("🌀 GRAVITY READY");
    showTip(
      "feature-gravity-powerup",
      "🌀 Gravity power-up ready!",
      "A 4× combo unlocks Gravity. Tap the Gravity button to make every atom fall upward; any combinations formed still count toward Grab progress and quest progress.",
    );
  }

  function makeNextQueueSlot(maxElement: number): {
    atom: number;
    shimmer: boolean;
    eGun: boolean;
    blank: boolean;
  } {
    const eGunEligible = eGunEnabled && eGunCooldownSlots.current <= 0;
    const eGun = eGunEligible && Math.random() < POWER_UP_CHANCE;
    if (eGun) eGunCooldownSlots.current = EGUN_MIN_SHOT_GAP;
    else if (eGunCooldownSlots.current > 0) eGunCooldownSlots.current -= 1;
    const blank = !eGun && blankEnabled && Math.random() < BLANK_ATOM_CHANCE;
    const shimmer = !eGun && !blank && shimmerEnabled && Math.random() < POWER_UP_CHANCE;
    const atom = shimmer
      ? randomAvailableElement(maxElement)
      : generateQueueElement(maxElement, level.queueDecay);
    return {
      atom: applyEmissionBoost(atom),
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
  const launcherX = boardW / 2;
  const launcherY = boardH - 8; // near bottom of board
  const TOP_PAD = 6;
  const SIDE_PAD = 4;

  const continuePressureSteps =
    continuingPastTarget && continueStartedElapsedMs != null
      ? Math.max(0, Math.floor((elapsedMs - continueStartedElapsedMs) / 30_000))
      : 0;
  const dangerZonePct = Math.min(0.85, 0.2 + stoneSpawnCount * 0.1 + continuePressureSteps * 0.03);
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

      // collision with existing balls
      let hitIdx = -1;
      let bestT = Infinity;
      for (let b = 0; b < balls.length; b++) {
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
  ): { balls: Board; bonus: number; hitIds: Set<number> } {
    if (damageById.size === 0) return { balls: source, bonus: 0, hitIds: new Set() };
    const hitIds = new Set<number>();
    let bonus = 0;
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
          bonus += Math.floor(maxHp * 250 * level.scoreMultiplier);
          return null;
        }
        return { ...b, stoneHp: newHp, r: Math.max(initialR * 0.35, initialR * (newHp / maxHp)) };
      })
      .filter((b): b is Ball => b !== null);
    return { balls: ballsAfterDamage, bonus, hitIds };
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
    if (busy || gameOver || won) return;
    if (currentIsEGun && !pendingStone) {
      const beam = castStraightRay(aimDeg);
      if (!beam) return;
      setBusy(true);
      sfx(playShootSound);
      haptic(15);
      setProjectile(beam.path[0]);
      const totalMs = Math.min(220, 50 + beam.path.length * 3);
      const stepMs = totalMs / beam.path.length;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        if (i >= beam.path.length) {
          clearInterval(interval);
          setProjectile(null);
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
    const reducedAtoms = new Set<number>();
    const updated = balls.map((b) => {
      if (b.stoneHp != null || b.atom <= 1) return b;
      if (distanceToSegment(b.x, b.y, start.x, start.y, end.x, end.y) > b.r + eGunR * 0.35)
        return b;
      hitIds.add(b.id);
      const atom = Math.max(1, b.atom - 1);
      reducedAtoms.add(atom);
      return { ...b, atom, r: radiusFor(atom) };
    });
    const nextShots = shots + 1;
    setShots(nextShots);
    setBalls(updated);
    setWiggleIds(hitIds);
    setTimeout(() => setWiggleIds(new Set()), 380);
    setNoMergeStreak(0);
    if (reducedAtoms.size > 0)
      reportQuestProgress({ reachedAtomicNumbers: Array.from(reducedAtoms) });
    spawnPopup(hitIds.size > 0 ? `⚡ E-GUN −${hitIds.size}` : "⚡ E-GUN");
    haptic(hitIds.size > 0 ? [20, 40, 20] : 20);
    const nextSlot = makeNextQueueSlot(dynamicMaxQueue(updated.length));
    setQueue((q) => [...q.slice(1), nextSlot.atom]);
    setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
    setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
    setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
    if (checkGameOver(updated, geo)) {
      setGameOver(true);
      haptic([50, 80, 50, 80, 200]);
    }
    setBusy(false);
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
        return [...others, stone];
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
        setBalls(updated);
        setStoneHitIds(new Set([blankStone.id]));
        setTimeout(() => setStoneHitIds(new Set()), 380);
        setNoMergeStreak(0);
        spawnPopup("✦ STONE ERASED");
        haptic([30, 60, 30, 90]);
        const nextSlot = makeNextQueueSlot(dynamicMaxQueue(updated.length));
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
    let result = placeAndMerge(currentBalls, newBall, geo, target, 118);
    const nextShots = shots + 1;
    setShots(nextShots);

    const newAtoms = new Set<number>([atomOverride]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

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
        mergeStoneBonus = mergeStoneDamage.bonus;
        addScore(mergeStoneDamage.bonus);
      }
      haptic([20, 30, 30]);
    }

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
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
          },
          80 + i * 120,
        );
      });
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
            "You earned Grab by chaining 10 merges in a row. Tap the Grab button (bottom-right), then drag any atom to reposition it and set up your next big reaction chain.",
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
          reportQuestProgress({ levelCleared: true });
          unlockLevel(levelId + 1);
          sfx(playWinSound);
          haptic([30, 60, 30, 60, 80]);
          // Offer a choice — claim the win or keep playing for score.
          setWinChoice({
            stars,
            score: nextScore,
            shots: nextShots,
            bestCombo: nextBestCombo,
          });
          // Advance the queue so play can resume if the user keeps going.
          const nextSlot = makeNextQueueSlot(dynamicMaxQueue(result.balls.length));
          setQueue((q) => [...q.slice(1), nextSlot.atom]);
          setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
          setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
          setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
          setBusy(false);
          return;
        }
        if (firstDiscovery && firstDiscovery > 1) {
          setDiscoveryEl(firstDiscovery);
        }
        // Advance queue (functional update — guarantees fresh state)
        const nextSlot = makeNextQueueSlot(dynamicMaxQueue(result.balls.length));
        setQueue((q) => [...q.slice(1), nextSlot.atom]);
        setShimmerQueue((s) => [...s.slice(1), nextSlot.shimmer]);
        setEGunQueue((e) => [...e.slice(1), nextSlot.eGun]);
        setBlankQueue((b) => [...b.slice(1), nextSlot.blank]);
        if (checkGameOver(result.balls, geo)) {
          setGameOver(true);
          haptic([50, 80, 50, 80, 200]);
        }
        setBusy(false);
      },
      200 + result.merges.length * 120,
    );
  }

  function triggerEmissionPowerUp() {
    if (busy || gameOver || won || emissionCharges <= 0) return;
    setBusy(true);
    setEmissionCharges((g) => Math.max(0, g - 1));
    setEmissionBoost((boost) => boost + 1);

    const raisedBalls = balls.map((b) => {
      if (b.stoneHp != null) return b;
      const atom = raiseAtomForEmission(b.atom);
      return atom === b.atom ? b : { ...b, atom, r: radiusFor(atom) };
    });
    const raisedQueue = queue.map((atom, i) => (eGunQueue[i] ? atom : raiseAtomForEmission(atom)));
    const reachedAtoms = new Set<number>();
    raisedBalls.forEach((b) => {
      if (b.stoneHp == null) reachedAtoms.add(b.atom);
    });
    raisedQueue.forEach((atom, i) => {
      if (!eGunQueue[i]) reachedAtoms.add(atom);
    });
    const discoveries = Array.from(reachedAtoms).filter((n) => !discoveredElements.includes(n));
    if (discoveries.length > 0) recordDiscovery(discoveries);

    setBalls(raisedBalls);
    setQueue(raisedQueue);
    spawnPopup("☢ EMISSION +1");
    reportQuestProgress({ discoveries, reachedAtomicNumbers: Array.from(reachedAtoms) });
    haptic([25, 45, 25]);
    setTimeout(() => {
      if (checkGameOver(raisedBalls, geo)) {
        setGameOver(true);
        haptic([50, 80, 50, 80, 200]);
      }
      setBusy(false);
    }, 180);
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
      setStoneHitIds(mergeStoneDamage.hitIds);
      setTimeout(() => setStoneHitIds(new Set()), 380);
    }

    const newAtoms = new Set<number>();
    result.balls.forEach((b) => {
      if (b.stoneHp == null) newAtoms.add(b.atom);
    });
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

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
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
          },
          80 + i * 120,
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
          reportQuestProgress({ levelCleared: true });
          unlockLevel(levelId + 1);
          setWinChoice({
            stars,
            score: score + gained,
            shots,
            bestCombo: Math.max(runBestCombo, result.merges.length),
          });
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
    let result = placeAndMerge(others, placed, geo, target, 118);

    const newAtoms = new Set<number>([grabbed.atom]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

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
      result.merges.forEach((m, i) => {
        setTimeout(
          () => {
            sfx(() => playMergeSound(m.chainDepth));
            haptic([10, 20, 10]);
            spawnPopup(`+${ELEMENTS[m.resultAtomicNumber - 1]?.symbol ?? "?"}`);
          },
          80 + i * 120,
        );
      });
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
      reportQuestProgress({ levelCleared: true });
      unlockLevel(levelId + 1);
      sfx(playWinSound);
      haptic([30, 60, 30, 60, 80]);
      setWinChoice({
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
    const r = castRay(aimDeg);
    return r?.path ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aimDeg, balls, busy, gameOver, won, boardW, boardH, cellSize]);

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
          <button onClick={onExit} style={iconBtn}>
            ← Menu
          </button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: "var(--muted-foreground)" }}>
              LEVEL {level.id}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{level.name}</div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--accent)",
                marginTop: 2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ⏱ {formatTime(elapsedMs)}
            </div>
          </div>
          <div style={{ ...iconBtn, cursor: "default", minWidth: 74, textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>SCORE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>
              {formatScore(score)}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{shots} shots</div>
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
            style={{
              position: "absolute",
              left: 4,
              right: 4,
              top: geo.dangerY,
              bottom: 4,
              background: "linear-gradient(0deg, var(--danger-glow), transparent)",
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
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle at 30% 28%, oklch(0.55 0.02 60), oklch(0.32 0.02 60) 60%, oklch(0.18 0.02 60))",
                      boxShadow:
                        "0 6px 14px rgba(0,0,0,0.55), inset 0 -8px 14px rgba(0,0,0,0.45), inset 0 6px 12px rgba(255,255,255,0.12)",
                      border: "2px solid oklch(0.25 0.02 60)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "oklch(0.95 0.02 60)",
                      fontWeight: 900,
                      transition: isHit
                        ? "left 180ms ease-out, top 180ms ease-out, width 220ms ease-out, height 220ms ease-out"
                        : "left 180ms ease-out, top 180ms ease-out, width 220ms ease-out, height 220ms ease-out",
                      textShadow: "0 1px 2px rgba(0,0,0,0.7)",
                    }}
                  >
                    <div
                      style={{ fontSize: Math.max(10, size * 0.16), opacity: 0.85, lineHeight: 1 }}
                    >
                      ⛰
                    </div>
                    <div style={{ fontSize: Math.max(14, size * 0.32), lineHeight: 1.05 }}>
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
                    filter: isDrag ? "drop-shadow(0 6px 12px rgba(0,0,0,0.5))" : undefined,
                  }}
                >
                  <ElementBall
                    atomicNumber={b.atom}
                    size={ballSize}
                    highlight={highlightId === b.id}
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

          {/* AIM TRAJECTORY (dotted line) */}
          {!busy && !gameOver && !won && previewPath.length > 1 && (
            <svg
              style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
              width={boardW}
              height={boardH}
            >
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
            }}
          >
            {emissionCharges > 0 && (
              <button
                type="button"
                title="Emission: raise all atoms by 1 tier without creating the level target. Future launcher atoms also start higher."
                aria-label={`Use Emission power-up (${emissionCharges} available)`}
                onClick={triggerEmissionPowerUp}
                disabled={busy}
                style={{
                  ...powerUpIconBtn,
                  border: "1px solid oklch(0.82 0.19 55)",
                  background: "linear-gradient(135deg, oklch(0.72 0.19 55), oklch(0.55 0.16 35))",
                  color: "var(--primary-foreground)",
                  boxShadow: "0 0 14px oklch(0.72 0.19 55 / 0.5)",
                  opacity: busy ? 0.65 : 1,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                <span aria-hidden="true">☢</span>
                <span style={powerUpCount}>{emissionCharges}</span>
              </button>
            )}
            {gravityCharges > 0 && (
              <button
                type="button"
                title="Gravity: make all atoms fall upward. Combos count toward Grab progress."
                aria-label={`Use Gravity power-up (${gravityCharges} available)`}
                onClick={triggerGravityPowerUp}
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
