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

function getComboLabel(mergeCount: number): string | null {
  if (mergeCount >= 6) return "Nuclear Rush!";
  if (mergeCount >= 4) return "Atomic Cascade!";
  if (mergeCount >= 3) return "Reaction Chain!";
  if (mergeCount >= 2) return "Catalyst!";
  return null;
}

function calculateStars(
  level: (typeof LEVELS)[0],
  score: number,
  shots: number,
  bestCombo: number,
): number {
  const metScore = level.scoreGoal === undefined || score >= level.scoreGoal;
  const metPar = level.parShots === undefined || shots <= level.parShots;
  const metCombo = level.comboGoal === undefined || bestCombo >= level.comboGoal;
  if (metScore && metPar && metCombo) return 3;
  if (metScore || metPar) return 2;
  return 1;
}

export function GameBoard({ levelId, onExit, onWin }: Props) {
  const level = getLevelById(levelId) ?? LEVELS[0];
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
  } = useProgress();

  const [balls, setBalls] = useState<Board>(() => createEmptyBoard());
  const [queue, setQueue] = useState<number[]>(() =>
    generateInitialQueue(level.maxQueueElement, QUEUE_SIZE),
  );
  // Parallel array — true means that queued atom is "shimmering" and will give
  // 2× score and 2× grab-combo progress on a successful merge.
  const [shimmerQueue, setShimmerQueue] = useState<boolean[]>(() =>
    Array.from({ length: QUEUE_SIZE }, () => Math.random() < 0.05),
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
  const popupId = useRef(0);

  // === Grab power-up ===
  // Earned when a single shot triggers a 10+ merge chain.
  const [grabs, setGrabs] = useState(0);
  const [grabMode, setGrabMode] = useState(false);
  const [grabbing, setGrabbing] = useState<{ id: number; x: number; y: number } | null>(null);

  // === Combo bar for Grab power-up ===
  // Every successful merge counts +1 (shimmer atoms count +2). When the bar
  // fills to GRAB_THRESHOLD it grants a Grab and rolls over.
  const GRAB_THRESHOLD = 5;
  const [grabProgress, setGrabProgress] = useState(0);

  // === Continue past target ===
  // When the player reaches the target element, we offer a choice: claim the
  // win, or keep playing for score. While `continuingPastTarget` is true we
  // suppress further win prompts.
  const [continuingPastTarget, setContinuingPastTarget] = useState(false);
  const [winChoice, setWinChoice] = useState<
    | { stars: number; score: number; shots: number; bestCombo: number }
    | null
  >(null);

  // === Run timer ===
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  const target = level.targetElement;
  const targetEl = ELEMENTS[target - 1];
  const current = queue[0];
  const currentIsShimmer = shimmerQueue[0] ?? false;

  const sfx = (fn: () => void) => {
    if (soundEnabled) fn();
  };
  const haptic = (ms: number | number[]) => {
    if (hapticsEnabled) vibrate(ms);
  };

  useEffect(() => {
    setBalls(createEmptyBoard());
    setQueue(generateInitialQueue(level.maxQueueElement, QUEUE_SIZE));
    setShimmerQueue(Array.from({ length: QUEUE_SIZE }, () => Math.random() < 0.05));
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
    setBusy(false);
    setAimDeg(0);
    setGrabs(0);
    setGrabMode(false);
    setGrabbing(null);
    setGrabProgress(0);
    setContinuingPastTarget(false);
    setWinChoice(null);
    startTimeRef.current = Date.now();
    setElapsedMs(0);
  }, [levelId, level.gridRows, level.gridCols, level.maxQueueElement]);

  // Tick the run timer every second while the level is active.
  useEffect(() => {
    if (gameOver || won) return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [gameOver, won, levelId]);

  // Dynamic queue cap: as the board fills, unlock higher-tier atoms in the
  // shooting queue. Adds +1 tier at 15 atoms on board, +2 at 25, etc.
  // Capped at target-1 so we never spawn the literal target element.
  function dynamicMaxQueue(boardCount: number): number {
    const tierBonus = Math.max(0, Math.floor((boardCount - 5) / 10));
    const cap = Math.max(level.maxQueueElement, target - 1);
    return Math.min(level.maxQueueElement + tierBonus, cap);
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
  const launcherX = boardW / 2;
  const launcherY = boardH - 8; // near bottom of board
  const TOP_PAD = 6;
  const SIDE_PAD = 4;

  const geo: Geo = useMemo(
    () => ({
      width: boardW,
      height: boardH,
      radius: R,
      leftPad: SIDE_PAD,
      rightPad: SIDE_PAD,
      topPad: TOP_PAD,
      // danger line: just above launcher row
      dangerY: boardH - 8 - ballSize - 8,
    }),
    [boardW, boardH, R, ballSize],
  );

  /**
   * Ray-cast a projectile from the launcher at `angleDeg`. Walks pixel steps
   * and stops when it hits the ceiling or any existing ball. Resolves the
   * landing position so the new ball just touches whatever it hit.
   */
  function castRay(
    angleDeg: number,
  ): { x: number; y: number; path: { x: number; y: number }[]; hitId: number | null; dx: number; dy: number } | null {
    const rad = (angleDeg * Math.PI) / 180;
    let dx = Math.sin(rad);
    let dy = -Math.cos(rad);
    let x = launcherX;
    let y = launcherY;
    const projR = radiusFor(current);
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
        return { x: lx, y: ceilingY, path, hitId: null, dx, dy };
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
        path.push({ x: lx, y: ly });
        return { x: lx, y: ly, path, hitId: balls[hitIdx].id, dx, dy };
      }
      path.push({ x, y });
    }
    return null;
  }

  function shoot() {
    if (busy || gameOver || won) return;
    const hit = castRay(aimDeg);
    if (!hit) return;
    setBusy(true);
    sfx(playShootSound);
    haptic(15);

    // animate projectile along path
    const path = hit.path;
    const totalMs = Math.min(360, 60 + path.length * 4);
    const stepMs = totalMs / path.length;
    let i = 0;
    setProjectile(path[0]);
    const interval = setInterval(() => {
      i++;
      if (i >= path.length) {
        clearInterval(interval);
        setProjectile(null);
        triggerImpact(hit.x, hit.y, hit.hitId, hit.dx, hit.dy);
      } else {
        setProjectile(path[i]);
      }
    }, stepMs);
  }

  function triggerImpact(x: number, y: number, hitId: number | null, dirX: number, dirY: number) {
    // Wiggle nearby same-type balls before placing.
    const projR = radiusFor(current);
    const ADJ_F = 1.4;
    const matches: number[] = [];
    for (const b of balls) {
      if (b.atom !== current) continue;
      if (Math.hypot(b.x - x, b.y - y) <= (projR + b.r) * ADJ_F) matches.push(b.id);
    }
    // Tactical nudge: if we hit an existing ball that won't fuse with us,
    // push it slightly along the projectile trajectory so it can drift
    // toward a same-type neighbor.
    let nudged = balls;
    if (hitId !== null) {
      const hb = balls.find((b) => b.id === hitId);
      if (hb && hb.atom !== current) {
        // Heavier elements (lower in the periodic table) hit harder.
        const projPeriod = Math.max(1, Math.min(8, ELEMENTS[current - 1]?.period ?? 4));
        const NUDGE = projR * (0.15 + projPeriod * 0.12);
        const minX = SIDE_PAD + hb.r;
        const maxX = boardW - SIDE_PAD - hb.r;
        const ceilingY = TOP_PAD + hb.r;
        let nx = hb.x + dirX * NUDGE;
        let ny = hb.y + dirY * NUDGE;
        // avoid overlapping other balls
        for (const o of balls) {
          if (o.id === hb.id) continue;
          const dd = Math.hypot(nx - o.x, ny - o.y);
          const min = hb.r + o.r;
          if (dd < min && dd > 0.001) {
            const push = (min - dd) + 0.5;
            nx += ((nx - o.x) / dd) * push;
            ny += ((ny - o.y) / dd) * push;
          }
        }
        nx = Math.max(minX, Math.min(maxX, nx));
        ny = Math.max(ceilingY, ny);
        nudged = balls.map((b) => (b.id === hitId ? { ...b, x: nx, y: ny } : b));
      }
    }
    if (matches.length === 0) {
      finalizePlacement(x, y, nudged);
      return;
    }
    setWiggleIds(new Set(matches));
    haptic(20);
    setTimeout(() => {
      setWiggleIds(new Set());
      finalizePlacement(x, y, nudged);
    }, 220);
  }

  function finalizePlacement(x: number, y: number, currentBalls: Board = balls) {
    const newBall: Ball = { id: nextBallId(), x, y, atom: current, r: radiusFor(current) };
    if (currentBalls !== balls) setBalls(currentBalls);
    const result = placeAndMerge(currentBalls, newBall, geo, target, 118);
    const nextShots = shots + 1;
    setShots(nextShots);

    const newAtoms = new Set<number>([current]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

    // Refresh radii on any merged survivors (their atom changed).
    setBalls(result.balls.map((b) => ({ ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    const shimmerHit = currentIsShimmer && result.merges.length > 0;
    const grabAdd = result.merges.length * (shimmerHit ? 2 : 1);
    if (result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
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
        }
        return total % GRAB_THRESHOLD;
      });
    }

    const nextHighest = Math.max(highest, result.highestElement);
    setHighest(nextHighest);
    setHighestElement(nextHighest);
    const gained = Math.floor(
      result.scoreGained * level.scoreMultiplier * (shimmerHit ? 2 : 1),
    );
    const nextScore = score + gained;
    const nextBestCombo = Math.max(runBestCombo, result.merges.length);
    setScore(nextScore);
    addScore(gained);

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
          const stars = calculateStars(level, nextScore, nextShots, nextBestCombo);
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
          setQueue((q) => [
            ...q.slice(1),
            generateQueueElement(dynamicMaxQueue(result.balls.length)),
          ]);
          setShimmerQueue((s) => [...s.slice(1), Math.random() < 0.05]);
          setBusy(false);
          return;
        }
        if (firstDiscovery && firstDiscovery > 1) {
          setDiscoveryEl(firstDiscovery);
        }
        // Advance queue (functional update — guarantees fresh state)
        setQueue((q) => [
          ...q.slice(1),
          generateQueueElement(dynamicMaxQueue(result.balls.length)),
        ]);
        setShimmerQueue((s) => [...s.slice(1), Math.random() < 0.05]);
        if (checkGameOver(result.balls, geo)) {
          setGameOver(true);
          haptic([50, 80, 50, 80, 200]);
        }
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
    const result = placeAndMerge(others, placed, geo, target, 118);

    const newAtoms = new Set<number>([grabbed.atom]);
    result.merges.forEach((m) => newAtoms.add(m.resultAtomicNumber));
    const undiscovered = Array.from(newAtoms).filter((n) => !discoveredElements.includes(n));
    if (undiscovered.length > 0) recordDiscovery(undiscovered);

    setBalls(result.balls.map((b) => ({ ...b, r: radiusFor(b.atom) })));
    setHighlightId(result.finalBallId);
    if (result.merges.length > 0) {
      const comboLabel = getComboLabel(result.merges.length);
      if (comboLabel) spawnPopup(comboLabel);
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
    setScore((s) => s + gained);
    addScore(gained);
    reportQuestProgress({
      merges: result.merges.length,
      discoveries: undiscovered,
      reachedAtomicNumbers: Array.from(newAtoms),
      maxChainDepth: result.merges.length,
    });
    setTimeout(() => setHighlightId(null), 200 + result.merges.length * 120);
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
          <ElementBall atomicNumber={target} size={36} glow />
        </div>

        {/* GRAB COMBO BAR */}
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
              return (
                <div
                  key={b.id}
                  style={{
                    position: "absolute",
                    left: x - b.r,
                    top: y - b.r,
                    transition: isDrag ? "none" : "left 180ms ease-out, top 180ms ease-out",
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

          {/* GRAB BUTTON */}
          {grabs > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setGrabMode((g) => !g);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                zIndex: 6,
                padding: "8px 12px",
                borderRadius: 12,
                border: `1px solid ${grabMode ? "var(--accent)" : "var(--border)"}`,
                background: grabMode
                  ? "linear-gradient(135deg, var(--accent), var(--primary))"
                  : "var(--surface-elevated)",
                color: grabMode ? "var(--primary-foreground)" : "var(--foreground)",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1,
                cursor: "pointer",
                boxShadow: grabMode ? "0 0 16px var(--accent-glow)" : undefined,
              }}
            >
              🤚 GRAB ×{grabs}
            </button>
          )}
          {grabMode && (
            <div
              style={{
                position: "absolute",
                top: 8,
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
                left: projectile.x - sizeFor(current) / 2,
                top: projectile.y - sizeFor(current) / 2,
                pointerEvents: "none",
                zIndex: 4,
              }}
            >
              <ElementBall atomicNumber={current} size={ballSize} glow shimmer={currentIsShimmer} />
            </div>
          )}

          {/* LAUNCHER */}
          <div
            style={{
              position: "absolute",
              left: launcherX - sizeFor(current) / 2,
              top: launcherY - sizeFor(current) / 2,
              zIndex: 2,
              pointerEvents: "none",
              transform: `rotate(${aimDeg}deg)`,
              transformOrigin: "center center",
            }}
          >
            {!projectile && (
              <ElementBall
                atomicNumber={current}
                size={ballSize}
                glow
                shimmer={currentIsShimmer}
              />
            )}
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
            {queue.slice(1).map((n, i) => (
              <ElementBall
                key={i}
                atomicNumber={n}
                size={32 - i * 3}
                shimmer={shimmerQueue[i + 1]}
              />
            ))}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--muted-foreground)",
              textAlign: "right",
              lineHeight: 1.3,
            }}
          >
            Drag to aim
            <br />
            Tap to shoot
          </div>
        </div>

        {discoveryEl !== null && (
          <DiscoveryModal atomicNumber={discoveryEl} onClose={() => setDiscoveryEl(null)} />
        )}
        {winChoice && !won && !gameOver && (
          <ContinueChoiceModal
            level={level}
            score={winChoice.score}
            shots={winChoice.shots}
            bestCombo={winChoice.bestCombo}
            stars={winChoice.stars}
            onClaim={() => {
              setWon(true);
              setWinChoice(null);
            }}
            onContinue={() => {
              setContinuingPastTarget(true);
              setWinChoice(null);
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
  onClaim,
  onContinue,
}: {
  level: (typeof LEVELS)[0];
  score: number;
  shots: number;
  bestCombo: number;
  stars: number;
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
        TARGET REACHED
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        {ELEMENTS[level.targetElement - 1]?.name ?? "?"} unlocked!
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          lineHeight: 1.5,
          margin: "0 0 14px",
        }}
      >
        Claim your stars now, or keep playing to chase a higher score. The level
        is already complete either way.
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
          Keep Playing
        </button>
        <button onClick={onClaim} style={modalBtn}>
          Claim Victory
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
          value={`${shots}${level.parShots ? ` / ${level.parShots}` : ""}`}
          color="var(--foreground)"
        />
        <ResultStat
          label="Best Combo"
          value={`${bestCombo}${level.comboGoal ? ` / ${level.comboGoal}` : ""}`}
          color="var(--foreground)"
        />
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
