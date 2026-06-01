import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Orbit, Zap } from "lucide-react";
import { ElementBall } from "./ElementBall";
import { BOSSES } from "./bosses";
import { getLevelById, getNextLevel } from "./levels";
import { trackGameOver, trackGameStart, trackLevelWin, trackShot } from "./analytics";
import { playMergeSound, playShootSound, playWinSound, primeAudio, startAmbientMusic, stopAmbientMusic, vibrate } from "./audio";
import { useProgress } from "./store";
import { useIsTabletLayout } from "./responsive";
import type { GameModeId } from "./challenges";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
  onMap?: () => void;
  mode?: GameModeId;
}

interface CoreAtom {
  id: string;
  atom: number;
  baseAngle: number;
}

interface Point {
  x: number;
  y: number;
}

interface OrbitPose extends Point {
  id: string;
  atom: number;
  radius: number;
}

interface AttackAnim {
  id: string;
  atom: number;
  startedAt: number;
  durationMs: number;
}

interface ProjectileAnim {
  atom: number;
  path: Point[];
  durationMs: number;
  startedAt: number;
  index: number;
  hit:
    | null
    | { type: "orbit"; id: string; atom: number }
    | { type: "black-hole" }
    | { type: "eye" };
}

interface VictorySummary {
  clearTimeMs: number;
  shotBonus: number;
  speedBonus: number;
  finalScore: number;
  newBest: boolean;
}

const CLEAR_SCORE = 20_000;
const EYE_HEALTH = 3;
const PROJECTILE_SPEED = 780;
const QUEUE_SIZE = 4;
const CORE_ATTACK_MS = 4_200;
const EYE_DODGE_INTERVAL_MIN_MS = 3_000;
const EYE_DODGE_INTERVAL_MAX_MS = 5_000;
const EYE_CLOSE_MS = 1_200;
const BLACK_HOLE_STRENGTH = 62_000;
const PROJECTILE_RADIUS = 18;
const BLACK_HOLE_SWALLOW_RADIUS = 34;
const MAX_TRAJECTORY_STEPS = 720;
const DT = 1 / 60;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function normalize(dx: number, dy: number): Point {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function pickDistinctAtoms(max: number, count: number): number[] {
  return shuffle(Array.from({ length: max }, (_, index) => index + 1)).slice(0, count);
}

function formatDurationShort(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function computeBossBattleScore({
  maxShots,
  shotsUsed,
  elapsedMs,
  clearScore,
  hitScore,
}: {
  maxShots: number;
  shotsUsed: number;
  elapsedMs: number;
  clearScore: number;
  hitScore: number;
}) {
  const shotBonus = Math.max(0, maxShots - shotsUsed) * 320;
  const speedBonus = Math.max(0, Math.round((100_000 - elapsedMs) / 1000)) * 180;
  return {
    shotBonus,
    speedBonus,
    finalScore: hitScore + clearScore + shotBonus + speedBonus,
  };
}

function makeInitialCoreAtoms(): CoreAtom[] {
  return pickDistinctAtoms(10, 10).map((atom, index) => ({
    id: `core-${atom}-${index}`,
    atom,
    baseAngle: (Math.PI * 2 * index) / 10,
  }));
}

function drawQueueAtom(pool: number[]): number {
  const source = pool.length ? pool : Array.from({ length: 10 }, (_, index) => index + 1);
  return source[Math.floor(Math.random() * source.length)] ?? 1;
}

function makeInitialQueue(pool: number[]): number[] {
  return Array.from({ length: QUEUE_SIZE }, () => drawQueueAtom(pool));
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lenSq, 0, 1);
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

function reflectIfNeeded(
  x: number,
  y: number,
  vx: number,
  vy: number,
  width: number,
  height: number,
  radius: number,
) {
  let nextX = x;
  let nextY = y;
  let nextVx = vx;
  let nextVy = vy;

  if (nextX <= radius) {
    nextX = radius;
    nextVx = Math.abs(nextVx) * 0.96;
  } else if (nextX >= width - radius) {
    nextX = width - radius;
    nextVx = -Math.abs(nextVx) * 0.96;
  }

  if (nextY <= radius) {
    nextY = radius;
    nextVy = Math.abs(nextVy) * 0.96;
  } else if (nextY >= height - radius) {
    nextY = height - radius;
    nextVy = -Math.abs(nextVy) * 0.96;
  }

  return { x: nextX, y: nextY, vx: nextVx, vy: nextVy };
}

function simulateTrajectory({
  start,
  aim,
  width,
  height,
  blackHole,
  orbitAtoms,
  eye,
}: {
  start: Point;
  aim: Point;
  width: number;
  height: number;
  blackHole: Point;
  orbitAtoms: OrbitPose[];
  eye: { open: boolean; center: Point; radius: number; exposed: boolean };
}): { path: Point[]; hit: ProjectileAnim["hit"] } {
  const dir = normalize(aim.x - start.x, aim.y - start.y);
  let x = start.x;
  let y = start.y;
  let vx = dir.x * PROJECTILE_SPEED;
  let vy = dir.y * PROJECTILE_SPEED;
  const path: Point[] = [{ x, y }];

  for (let step = 0; step < MAX_TRAJECTORY_STEPS; step += 1) {
    const previous = { x, y };
    const toHoleX = blackHole.x - x;
    const toHoleY = blackHole.y - y;
    const holeDist = Math.max(48, Math.hypot(toHoleX, toHoleY));
    const pull = BLACK_HOLE_STRENGTH / (holeDist * holeDist);
    vx += (toHoleX / holeDist) * pull;
    vy += (toHoleY / holeDist) * pull;

    x += vx * DT;
    y += vy * DT;

    const reflected = reflectIfNeeded(x, y, vx, vy, width, height, PROJECTILE_RADIUS);
    x = reflected.x;
    y = reflected.y;
    vx = reflected.vx;
    vy = reflected.vy;

    if (step % 3 === 0) {
      path.push({ x, y });
    }

    if (distanceToSegment(blackHole, previous, { x, y }) <= BLACK_HOLE_SWALLOW_RADIUS) {
      path.push({ x: blackHole.x, y: blackHole.y });
      return { path, hit: { type: "black-hole" } };
    }

    for (const orbitAtom of orbitAtoms) {
      if (distanceToSegment(orbitAtom, previous, { x, y }) <= orbitAtom.radius + PROJECTILE_RADIUS) {
        path.push({ x: orbitAtom.x, y: orbitAtom.y });
        return { path, hit: { type: "orbit", id: orbitAtom.id, atom: orbitAtom.atom } };
      }
    }

    if (eye.exposed && eye.open && distanceToSegment(eye.center, previous, { x, y }) <= eye.radius + PROJECTILE_RADIUS) {
      path.push({ x: eye.center.x, y: eye.center.y });
      return { path, hit: { type: "eye" } };
    }
  }

  return { path, hit: null };
}

export function NucleusCoreBoard({ levelId, onExit, onWin, onMap = onExit, mode = "nucleus-core" }: Props) {
  const config = BOSSES["nucleus-core"];
  const level = getLevelById(levelId) ?? getLevelById(config.levelId);
  const nextLevel = getNextLevel(levelId);
  const isTabletLayout = useIsTabletLayout();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const projectileRef = useRef<ProjectileAnim | null>(null);
  const runStartRef = useRef(Date.now());
  const lastBossAttackRef = useRef(Date.now());
  const eyeClosedUntilRef = useRef(0);
  const nextEyeDodgeRef = useRef(Date.now() + EYE_DODGE_INTERVAL_MIN_MS);
  const [clock, setClock] = useState(() => Date.now());
  const [arenaSize, setArenaSize] = useState({ width: isTabletLayout ? 860 : 380, height: isTabletLayout ? 700 : 580 });
  const [aimPoint, setAimPoint] = useState({ x: arenaSize.width * 0.5, y: 150 });
  const [coreAtoms, setCoreAtoms] = useState<CoreAtom[]>(() => makeInitialCoreAtoms());
  const [queue, setQueue] = useState<number[]>(() => makeInitialQueue(Array.from({ length: 10 }, (_, index) => index + 1)));
  const [shotsUsed, setShotsUsed] = useState(0);
  const [eyeHealth, setEyeHealth] = useState(EYE_HEALTH);
  const [projectile, setProjectile] = useState<ProjectileAnim | null>(null);
  const [attackAnim, setAttackAnim] = useState<AttackAnim | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<null | "win" | "lose">(null);
  const [bossFlash, setBossFlash] = useState<"hit" | "beam" | null>(null);
  const [victorySummary, setVictorySummary] = useState<VictorySummary | null>(null);
  const {
    addScore,
    challengeBestScores,
    incrementLevelAttempt,
    recordLevelRun,
    setChallengeBestScore,
    setLevelStars,
    shootingStyle,
    unlockLevel,
  } = useProgress();

  const launcher = useMemo(
    () => ({
      x: arenaSize.width * 0.5,
      y: arenaSize.height - (isTabletLayout ? 84 : 74),
    }),
    [arenaSize.height, arenaSize.width, isTabletLayout],
  );

  const shotsLeft = Math.max(0, config.maxShots - shotsUsed);
  const remainingHealth = coreAtoms.length + eyeHealth;
  const healthPct = clamp(remainingHealth / config.maxHealth, 0, 1);
  const currentShot = queue[0] ?? 1;

  const bossCenter = useMemo(() => {
    const exposed = coreAtoms.length === 0;
    return {
      x: arenaSize.width * 0.5 + Math.sin(clock / 2500) * arenaSize.width * 0.12,
      y:
        arenaSize.height * (exposed ? 0.34 : 0.32) +
        (exposed ? Math.cos(clock / 2600) * 12 : 0),
    };
  }, [arenaSize.height, arenaSize.width, clock, coreAtoms.length]);

  const blackHole = useMemo(
    () => ({
      x: arenaSize.width * 0.5,
      y: arenaSize.height * 0.54,
    }),
    [arenaSize.height, arenaSize.width],
  );

  const orbitAtoms = useMemo<OrbitPose[]>(() => {
    const orbitRadius = coreAtoms.length > 6 ? (isTabletLayout ? 116 : 86) : coreAtoms.length > 3 ? (isTabletLayout ? 94 : 72) : (isTabletLayout ? 74 : 58);
    return coreAtoms.map((item, index) => {
      const visibleIndex = Math.max(1, coreAtoms.length);
      const angle = (Math.PI * 2 * index) / visibleIndex + clock / 1240;
      return {
        id: item.id,
        atom: item.atom,
        x: bossCenter.x + Math.cos(angle) * orbitRadius,
        y: bossCenter.y + Math.sin(angle) * orbitRadius,
        radius: isTabletLayout ? 23 : 18,
      };
    });
  }, [bossCenter.x, bossCenter.y, clock, coreAtoms, isTabletLayout]);

  const eyeState = useMemo(() => {
    const exposed = coreAtoms.length === 0;
    const open = exposed && clock >= eyeClosedUntilRef.current;
    return {
      exposed,
      open,
      center: bossCenter,
      radius: isTabletLayout ? 28 : 24,
    };
  }, [bossCenter, clock, coreAtoms.length, isTabletLayout]);

  const visibleOrbitAtoms = useMemo(
    () => orbitAtoms.filter((atom) => atom.id !== attackAnim?.id),
    [attackAnim?.id, orbitAtoms],
  );

  const finishRun = useCallback(
    (won: boolean, finalScore: number, finalShotsUsed: number) => {
      if (!level) return;
      const stars = won ? (finalShotsUsed <= 18 ? 3 : finalShotsUsed <= 25 ? 2 : 1) : 0;
      if (won) {
        addScore(finalScore);
        setChallengeBestScore(mode, finalScore);
        setLevelStars(level.id, stars);
        if (nextLevel) unlockLevel(nextLevel.id);
        recordLevelRun(level.id, { score: finalScore, shots: finalShotsUsed, powerUpsUsed: 0, won: true });
        trackLevelWin(level.id, finalScore, finalShotsUsed, level.targetElement, mode);
      } else {
        setChallengeBestScore(mode, finalScore);
        recordLevelRun(level.id, { score: finalScore, shots: finalShotsUsed, powerUpsUsed: 0, won: false });
        trackGameOver(level.id, finalScore, finalShotsUsed, level.targetElement, mode);
      }
    },
    [addScore, level, mode, nextLevel, recordLevelRun, setChallengeBestScore, setLevelStars, unlockLevel],
  );

  const consumeQueue = useCallback(
    (pool: number[]) => {
      setQueue((current) => {
        const [, ...rest] = current;
        return [...rest, drawQueueAtom(pool)];
      });
    },
    [],
  );

  useEffect(() => {
    primeAudio();
    startAmbientMusic("boss");
    if (level) {
      incrementLevelAttempt(level.id);
      trackGameStart(level.id, mode);
    }
    return () => stopAmbientMusic();
  }, [incrementLevelAttempt, level, mode]);

  useEffect(() => {
    const tick = window.setInterval(() => setClock(Date.now()), 50);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const measure = () => {
      const rect = arena.getBoundingClientRect();
      const width = Math.max(320, rect.width || (isTabletLayout ? 860 : 380));
      const height = Math.max(520, rect.height || (isTabletLayout ? 700 : 580));
      setArenaSize({ width, height });
      setAimPoint((prev) => ({
        x: clamp(prev.x, 24, width - 24),
        y: clamp(prev.y, 40, height - 60),
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    const rafId = window.requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(rafId);
    };
  }, [isTabletLayout]);

  useEffect(() => {
    if (!eyeState.exposed || result) return;
    if (clock < nextEyeDodgeRef.current) return;
    eyeClosedUntilRef.current = clock + EYE_CLOSE_MS;
    nextEyeDodgeRef.current =
      clock +
      EYE_DODGE_INTERVAL_MIN_MS +
      Math.floor(Math.random() * (EYE_DODGE_INTERVAL_MAX_MS - EYE_DODGE_INTERVAL_MIN_MS));
  }, [clock, eyeState.exposed, result]);

  useEffect(() => {
    if (result || projectileRef.current || attackAnim) return;
    if (coreAtoms.length === 0) return;
    if (clock - lastBossAttackRef.current < CORE_ATTACK_MS) return;
    lastBossAttackRef.current = clock;
    setBossFlash("beam");
    const attackAtom = coreAtoms[Math.floor(Math.random() * coreAtoms.length)] ?? coreAtoms[0];
    if (!attackAtom) return;
    setAttackAnim({
      id: attackAtom.id,
      atom: attackAtom.atom,
      startedAt: clock,
      durationMs: 520,
    });
    vibrate(22);
    const timeoutId = window.setTimeout(() => setBossFlash(null), 240);
    return () => window.clearTimeout(timeoutId);
  }, [attackAnim, clock, coreAtoms, result]);

  useEffect(() => {
    if (!attackAnim) return;
    if (clock >= attackAnim.startedAt + attackAnim.durationMs) {
      setAttackAnim(null);
    }
  }, [attackAnim, clock]);

  useEffect(() => {
    if (result || projectileRef.current || !level) return;
    if (shotsUsed >= config.maxShots && remainingHealth > 0) {
      setResult("lose");
      finishRun(false, score, shotsUsed);
    }
  }, [config.maxShots, finishRun, level, projectileRef, remainingHealth, result, score, shotsUsed]);

  const handleWin = useCallback(
    (finalShotsUsed: number, finalScoreSeed: number) => {
      const elapsedMs = Date.now() - runStartRef.current;
      const { shotBonus, speedBonus, finalScore } = computeBossBattleScore({
        maxShots: config.maxShots,
        shotsUsed: finalShotsUsed,
        elapsedMs,
        clearScore: CLEAR_SCORE,
        hitScore: finalScoreSeed,
      });
      const previousBest = challengeBestScores[mode] ?? 0;
      setVictorySummary({
        clearTimeMs: elapsedMs,
        shotBonus,
        speedBonus,
        finalScore,
        newBest: finalScore > previousBest,
      });
      setScore(finalScore);
      setResult("win");
      playWinSound();
      vibrate([40, 40, 80]);
      finishRun(true, finalScore, finalShotsUsed);
    },
    [challengeBestScores, config.maxShots, finishRun, mode],
  );

  const resolveProjectile = useCallback(
    (active: ProjectileAnim) => {
      setProjectile(null);
      projectileRef.current = null;
      const nextShotsUsed = shotsUsed + 1;
      setShotsUsed(nextShotsUsed);
      consumeQueue(coreAtoms.map((item) => item.atom));

      if (active.hit?.type === "orbit") {
        if (active.atom === active.hit.atom) {
          const hitId = active.hit.id;
          setCoreAtoms((current) => current.filter((item) => item.id !== hitId));
          setScore((current) => current + 2_500);
          setBossFlash("hit");
          playMergeSound(1);
          vibrate(26);
          window.setTimeout(() => setBossFlash(null), 220);
        }
        return;
      }

      if (active.hit?.type === "eye" && coreAtoms.length === 0 && eyeState.open) {
        const nextEye = Math.max(0, eyeHealth - 1);
        setEyeHealth(nextEye);
        setScore((current) => current + 3_000);
        setBossFlash("hit");
        playMergeSound(2);
        vibrate(30);
        window.setTimeout(() => setBossFlash(null), 220);
        if (nextEye <= 0) {
          handleWin(nextShotsUsed, score + 3_000);
        }
      }
    },
    [consumeQueue, coreAtoms, eyeHealth, eyeState.open, handleWin, score, shotsUsed],
  );

  useEffect(() => {
    if (!projectile) return;
    let rafId = 0;
    const step = () => {
      const active = projectileRef.current;
      if (!active) return;
      const elapsed = Date.now() - active.startedAt;
      const progress = clamp(elapsed / active.durationMs, 0, 1);
      const index = Math.min(active.path.length - 1, Math.floor(progress * (active.path.length - 1)));
      const next = { ...active, index };
      projectileRef.current = next;
      setProjectile(next);
      if (progress >= 1) {
        resolveProjectile(active);
        return;
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [projectile, resolveProjectile]);

  const fireShot = useCallback(
    (nextPoint: Point) => {
      if (result || projectileRef.current || shotsUsed >= config.maxShots) return;
      const simulation = simulateTrajectory({
        start: launcher,
        aim: nextPoint,
        width: arenaSize.width,
        height: arenaSize.height,
        blackHole,
        orbitAtoms: visibleOrbitAtoms,
        eye: eyeState,
      });

      projectileRef.current = {
        atom: currentShot,
        path: simulation.path,
        durationMs: Math.max(260, Math.min(1100, (simulation.path.length * 14_000) / PROJECTILE_SPEED)),
        startedAt: Date.now(),
        index: 0,
        hit: simulation.hit,
      };
      setProjectile(projectileRef.current);
      playShootSound();
      trackShot(level?.id ?? config.levelId, currentShot, Math.atan2(nextPoint.y - launcher.y, nextPoint.x - launcher.x) * (180 / Math.PI), mode);
    },
    [arenaSize.height, arenaSize.width, blackHole, config.levelId, config.maxShots, currentShot, eyeState, launcher, level?.id, mode, result, shotsUsed, visibleOrbitAtoms],
  );

  const handleArenaPointer = useCallback(
    (clientX: number, clientY: number, fire: boolean) => {
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextPoint = {
        x: clamp(clientX - rect.left, 22, rect.width - 22),
        y: clamp(clientY - rect.top, 40, rect.height - 40),
      };
      setAimPoint(nextPoint);
      if (fire) fireShot(nextPoint);
    },
    [fireShot],
  );

  if (!level) return null;

  const bestScore = Math.max(victorySummary?.finalScore ?? 0, challengeBestScores[mode] ?? 0);
  const attackAtomPosition = attackAnim
    ? (() => {
        const phase = clamp((clock - attackAnim.startedAt) / attackAnim.durationMs, 0, 1);
        return {
          x: bossCenter.x + (launcher.x - bossCenter.x) * phase,
          y: bossCenter.y + (launcher.y - bossCenter.y) * phase,
        };
      })()
    : null;

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? "32px 26px" : "22px 16px 26px", minHeight: "100dvh", touchAction: "none" }}>
      <div style={{ width: "100%", maxWidth: isTabletLayout ? 980 : 520, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
          <button
            type="button"
            onClick={onMap}
            style={{
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface-elevated)",
              color: "var(--foreground)",
              padding: isTabletLayout ? "12px 18px" : "10px 14px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {"<- Map"}
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}>BOSS EXPERIMENT</div>
            <div className="gold-text" style={{ fontSize: isTabletLayout ? 28 : 23, fontWeight: 900, marginTop: 2 }}>
              {config.name}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 2 }}>{level.name}</div>
          </div>
          <div
            style={{
              minWidth: 86,
              padding: "8px 10px",
              borderRadius: 14,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: 1.4, fontWeight: 800 }}>SHOTS</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{shotsLeft}</div>
          </div>
        </div>

        <div
          ref={arenaRef}
          onPointerMove={(event) => handleArenaPointer(event.clientX, event.clientY, false)}
          onPointerDown={(event) => {
            (event.target as Element).setPointerCapture?.(event.pointerId);
            handleArenaPointer(event.clientX, event.clientY, false);
          }}
          onPointerUp={(event) => {
            handleArenaPointer(event.clientX, event.clientY, shootingStyle === "hold");
          }}
          style={{
            position: "relative",
            minHeight: isTabletLayout ? 650 : 560,
            borderRadius: 20,
            overflow: "hidden",
            background:
              "radial-gradient(circle at 50% 16%, rgba(114,123,255,0.18), transparent 20%), linear-gradient(180deg, rgba(10,14,34,0.98), rgba(5,8,24,1))",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 18px 46px rgba(0,0,0,0.38)",
            touchAction: "none",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: isTabletLayout ? "38px 38px" : "30px 30px",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              right: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: 8,
              zIndex: 3,
            }}
          >
            <div
              style={{
                display: "grid",
                gap: 6,
                padding: isTabletLayout ? "7px 9px" : "6px 8px",
                borderRadius: 12,
                background: "rgba(10,14,34,0.82)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              <CompactBar label="Nucleus" value={`${remainingHealth}/${config.maxHealth}`} fillPercent={healthPct} fill="linear-gradient(90deg, var(--accent), #ff8b56)" shadow="0 0 16px var(--accent-glow)" />
            </div>

            <div
              style={{
                display: "grid",
                gap: 5,
                justifyItems: "end",
                padding: isTabletLayout ? "7px 9px" : "6px 8px",
                borderRadius: 12,
                background: "rgba(10,14,34,0.82)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(8px)",
                minWidth: isTabletLayout ? 180 : 142,
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: 1.6, color: "var(--muted-foreground)", fontWeight: 900 }}>
                CURRENT SHOT
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ElementBall atomicNumber={currentShot} size={isTabletLayout ? 48 : 42} glow />
                <div style={{ display: "flex", gap: 6 }}>
                  {queue.slice(1).map((atom, index) => (
                    <ElementBall key={`${atom}-${index}`} atomicNumber={atom} size={isTabletLayout ? 26 : 24} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="nucleus-black-hole"
            style={{
              position: "absolute",
              left: blackHole.x - (isTabletLayout ? 52 : 43),
              top: blackHole.y - (isTabletLayout ? 52 : 43),
              width: isTabletLayout ? 104 : 86,
              height: isTabletLayout ? 104 : 86,
              borderRadius: "50%",
              background: "radial-gradient(circle at 45% 40%, rgba(72,86,165,0.78), rgba(7,10,27,1) 52%, rgba(0,0,0,1) 76%)",
              boxShadow: "0 0 42px rgba(113,130,255,0.38), 0 0 18px rgba(255,173,72,0.12), inset 0 0 22px rgba(255,255,255,0.16)",
              zIndex: 1,
            }}
          >
            <span className="nucleus-suction-ring nucleus-suction-ring-a" />
            <span className="nucleus-suction-ring nucleus-suction-ring-b" />
            <span className="nucleus-suction-stream nucleus-suction-stream-a" />
            <span className="nucleus-suction-stream nucleus-suction-stream-b" />
            <span className="nucleus-suction-stream nucleus-suction-stream-c" />
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: bossCenter.x - (isTabletLayout ? 88 : 70),
              top: bossCenter.y - (isTabletLayout ? 88 : 70),
              width: isTabletLayout ? 176 : 140,
              height: isTabletLayout ? 176 : 140,
              borderRadius: "50%",
              background:
                bossFlash === "hit"
                  ? "radial-gradient(circle at 50% 45%, rgba(255,95,95,0.42), transparent 30%), linear-gradient(180deg, rgba(45,17,25,0.96), rgba(20,10,18,0.98))"
                  : bossFlash === "beam"
                    ? "radial-gradient(circle at 50% 24%, rgba(153,220,255,0.22), transparent 24%), linear-gradient(180deg, rgba(26,40,62,0.96), rgba(14,18,34,0.98))"
                    : "radial-gradient(circle at 50% 30%, rgba(255,212,87,0.1), transparent 28%), linear-gradient(180deg, rgba(28,34,70,0.98), rgba(16,20,40,0.99))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 26px 56px rgba(0,0,0,0.48)",
              zIndex: 2,
            }}
          />

          {visibleOrbitAtoms.map((atom) => (
            <div
              key={atom.id}
              style={{
                position: "absolute",
                left: atom.x - atom.radius,
                top: atom.y - atom.radius,
                width: atom.radius * 2,
                height: atom.radius * 2,
                zIndex: 4,
              }}
            >
              <ElementBall atomicNumber={atom.atom} size={atom.radius * 2} glow />
            </div>
          ))}

          {eyeState.exposed && (
            <div
              style={{
                position: "absolute",
                left: eyeState.center.x - eyeState.radius - 6,
                top: eyeState.center.y - eyeState.radius - 6,
                width: (eyeState.radius + 6) * 2,
                height: (eyeState.radius + 6) * 2,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background:
                  eyeState.open
                    ? "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.98), rgba(210,220,250,0.7) 50%, rgba(26,29,52,0.95) 100%)"
                    : "linear-gradient(180deg, rgba(46,49,76,0.95), rgba(10,12,26,0.95))",
                border: "2px solid rgba(255,255,255,0.24)",
                boxShadow: eyeState.open ? "0 0 24px rgba(122,214,255,0.24)" : "inset 0 0 18px rgba(0,0,0,0.48)",
                zIndex: 5,
              }}
            >
              {eyeState.open ? (
                <div
                  style={{
                    width: eyeState.radius * 1.5,
                    height: eyeState.radius * 1.5,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "radial-gradient(circle at 45% 40%, rgba(135,209,255,0.95), rgba(35,77,140,0.95) 65%, rgba(8,16,33,0.95))",
                    color: "white",
                  }}
                >
                  <Eye size={isTabletLayout ? 30 : 24} />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div
                    style={{
                      width: eyeState.radius * 1.4,
                      height: Math.max(10, eyeState.radius * 0.26),
                      borderRadius: 999,
                      background: "linear-gradient(180deg, rgba(188,193,220,0.7), rgba(62,68,98,0.68))",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {attackAnim && (
            <>
              <svg
                viewBox={`0 0 ${arenaSize.width} ${arenaSize.height}`}
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 5 }}
              >
                <defs>
                  <linearGradient id="nucleusBeam" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,236,170,0.98)" />
                    <stop offset="55%" stopColor="rgba(255,140,54,0.92)" />
                    <stop offset="100%" stopColor="rgba(255,91,28,0.04)" />
                  </linearGradient>
                </defs>
                <line
                  x1={bossCenter.x}
                  y1={bossCenter.y}
                  x2={attackAtomPosition?.x ?? launcher.x}
                  y2={attackAtomPosition?.y ?? launcher.y}
                  stroke="url(#nucleusBeam)"
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              </svg>
              {attackAtomPosition && (
                <div
                  style={{
                    position: "absolute",
                    left: attackAtomPosition.x - 18,
                    top: attackAtomPosition.y - 18,
                    zIndex: 6,
                    pointerEvents: "none",
                  }}
                >
                  <ElementBall atomicNumber={attackAnim.atom} size={36} glow />
                </div>
              )}
            </>
          )}

          {projectile && (
            <div
              style={{
                position: "absolute",
                left: (projectile.path[projectile.index]?.x ?? launcher.x) - 18,
                top: (projectile.path[projectile.index]?.y ?? launcher.y) - 18,
                zIndex: 6,
                pointerEvents: "none",
              }}
            >
              <ElementBall atomicNumber={projectile.atom} size={36} glow />
            </div>
          )}

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
              fireShot(aimPoint);
            }}
            onKeyDown={(event) => {
              if (shootingStyle !== "press") return;
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              fireShot(aimPoint);
            }}
            style={{
              position: "absolute",
              left: launcher.x - (isTabletLayout ? 34 : 30),
              top: launcher.y - (isTabletLayout ? 34 : 30),
              width: isTabletLayout ? 68 : 60,
              height: isTabletLayout ? 68 : 60,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.12)",
              background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(14,18,36,0.96))",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 18px rgba(0,0,0,0.35)",
              zIndex: 3,
              cursor: shootingStyle === "press" ? "pointer" : undefined,
            }}
          >
            <ElementBall atomicNumber={currentShot} size={isTabletLayout ? 48 : 42} glow />
          </div>

          {result && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.62)",
                display: "grid",
                placeItems: "center",
                zIndex: 7,
                padding: 18,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 440,
                  borderRadius: 18,
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 18px 44px rgba(0,0,0,0.46)",
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 3,
                      color: result === "win" ? "var(--accent)" : "var(--muted-foreground)",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  >
                    {result === "win" ? "Nucleus broken" : "Core remains"}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                    {result === "win" ? "The eye collapses." : "Out of shots."}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                    {result === "win"
                      ? `You earned ${CLEAR_SCORE} points for collapsing the core.`
                      : "The black hole still owns the field. Reset, bank your angles, and cut the orbit down one atom at a time."}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <MetricCard label="Shots used" value={`${shotsUsed}`} />
                  <MetricCard label="Kill time" value={victorySummary ? formatDurationShort(victorySummary.clearTimeMs) : "--"} />
                  <MetricCard label="Score" value={`${score}`} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                  <MetricCard label="Core left" value={`${coreAtoms.length}`} />
                  <MetricCard label="Shot bonus" value={victorySummary ? `${victorySummary.shotBonus}` : "--"} />
                  <MetricCard label={victorySummary?.newBest ? "New best" : "Best score"} value={`${bestScore}`} />
                </div>
                {victorySummary && (
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13, fontWeight: 700 }}>
                    Speed bonus: {victorySummary.speedBonus}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={onExit}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--foreground)",
                      padding: "12px 14px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Menu
                  </button>
                  {result === "lose" ? (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      style={{
                        flex: 1.2,
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(135deg, var(--primary), oklch(0.58 0.17 230))",
                        color: "var(--primary-foreground)",
                        padding: "12px 14px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onWin(nextLevel?.id ?? null)}
                      style={{
                        flex: 1.2,
                        borderRadius: 12,
                        border: "none",
                        background: "linear-gradient(135deg, var(--accent), var(--primary))",
                        color: "var(--primary-foreground)",
                        padding: "12px 14px",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {nextLevel ? "Continue" : "Finish"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 12,
        textAlign: "center",
        minHeight: 96,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.6, color: "var(--muted-foreground)", fontWeight: 800 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}

function CompactBar({
  label,
  value,
  fillPercent,
  fill,
  shadow,
}: {
  label: string;
  value: string;
  fillPercent: number;
  fill: string;
  shadow: string;
}) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.5,
          color: "var(--muted-foreground)",
        }}
      >
        <span>{label.toUpperCase()}</span>
        <span>{value}</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${Math.max(0, Math.min(100, fillPercent * 100))}%`,
            background: fill,
            boxShadow: shadow,
          }}
        />
      </div>
    </div>
  );
}
