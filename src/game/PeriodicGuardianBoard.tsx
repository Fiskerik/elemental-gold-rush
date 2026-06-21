import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { ELEMENTS } from "./elements";
import { BOSSES } from "./bosses";
import { getLevelById, getNextLevel } from "./levels";
import { trackGameOver, trackGameStart, trackLevelWin, trackShot } from "./analytics";
import {
  playMergeSound,
  playShootSound,
  playWinSound,
  primeAudio,
  startAmbientMusic,
  stopAmbientMusic,
  vibrate,
} from "./audio";
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

type GuardianGroup = "metals" | "halogens" | "noble-gases";

interface QueueAtom {
  atom: number;
  group: GuardianGroup;
}

interface WeakSpotPose {
  group: GuardianGroup;
  x: number;
  y: number;
  radius: number;
}

interface ProjectileAnim {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  x: number;
  y: number;
  startedAt: number;
  durationMs: number;
  atom: QueueAtom;
  success: boolean;
  targetGroup: GuardianGroup | null;
}

interface BeamAnim {
  until: number;
  atom: QueueAtom;
}

interface VictorySummary {
  clearTimeMs: number;
  shotBonus: number;
  speedBonus: number;
  finalScore: number;
  newBest: boolean;
}

const PHASE_MS = 3_000;
const IDLE_BEAM_MS = 5_000;
const PROJECTILE_SPEED = 960;
const QUEUE_SIZE = 4;
const SUCCESS_TARGET = 20;
const CLEAR_SCORE = 20_000;
const SPOT_BLINK_MS = 2_400;
const SPOT_BLINK_CYCLE_MS = 4_200;

const GROUP_CONFIG: Record<
  GuardianGroup,
  {
    label: string;
    tint: string;
    glow: string;
    bg: string;
    atoms: number[];
    marker: string;
  }
> = {
  metals: {
    label: "Metals",
    tint: "#ffbe55",
    glow: "rgba(255, 196, 88, 0.42)",
    bg: "linear-gradient(135deg, rgba(255,208,120,0.94), rgba(212,129,44,0.92))",
    atoms: [3, 4, 11, 12],
    marker: "Fe",
  },
  halogens: {
    label: "Halogens",
    tint: "#68f0d8",
    glow: "rgba(104, 240, 216, 0.36)",
    bg: "linear-gradient(135deg, rgba(124,255,224,0.96), rgba(44,176,144,0.9))",
    atoms: [9, 17, 35, 53],
    marker: "F",
  },
  "noble-gases": {
    label: "Noble Gases",
    tint: "#d693ff",
    glow: "rgba(214, 147, 255, 0.34)",
    bg: "linear-gradient(135deg, rgba(232,176,255,0.96), rgba(126,93,232,0.9))",
    atoms: [2, 10, 18],
    marker: "Ne",
  },
};

const GROUP_ORDER: GuardianGroup[] = ["metals", "halogens", "noble-gases"];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function normalize(dx: number, dy: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function rayExitPoint(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  width: number,
  height: number,
): { x: number; y: number; t: number } {
  const candidates: number[] = [];
  if (dirX > 0.0001) candidates.push((width - startX) / dirX);
  if (dirX < -0.0001) candidates.push((0 - startX) / dirX);
  if (dirY > 0.0001) candidates.push((height - startY) / dirY);
  if (dirY < -0.0001) candidates.push((0 - startY) / dirY);
  const t = Math.min(...candidates.filter((candidate) => candidate > 0));
  return { x: startX + dirX * t, y: startY + dirY * t, t };
}

function rayCircleHit(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const ox = startX - cx;
  const oy = startY - cy;
  const b = 2 * (ox * dirX + oy * dirY);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / 2;
  const t2 = (-b + sqrtDisc) / 2;
  const hits = [t1, t2].filter((value) => value >= 0);
  return hits.length ? Math.min(...hits) : null;
}

function makeGroupBag(): GuardianGroup[] {
  return shuffle([
    "metals",
    "metals",
    "metals",
    "metals",
    "halogens",
    "halogens",
    "halogens",
    "halogens",
    "noble-gases",
    "noble-gases",
    "noble-gases",
    "noble-gases",
  ]);
}

function drawQueueAtom(bagRef: MutableRefObject<GuardianGroup[]>): QueueAtom {
  if (bagRef.current.length === 0) {
    bagRef.current = makeGroupBag();
  }
  const group = bagRef.current.shift() ?? "metals";
  const atoms = GROUP_CONFIG[group].atoms;
  const atom = atoms[Math.floor(Math.random() * atoms.length)] ?? atoms[0] ?? 1;
  return { atom, group };
}

function makeInitialQueue(bagRef: MutableRefObject<GuardianGroup[]>): QueueAtom[] {
  return Array.from({ length: QUEUE_SIZE }, () => drawQueueAtom(bagRef));
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
  const shotBonus = Math.max(0, maxShots - shotsUsed) * 340;
  const speedBonus = Math.max(0, Math.round((75_000 - elapsedMs) / 1000)) * 220;
  return {
    shotBonus,
    speedBonus,
    finalScore: hitScore + clearScore + shotBonus + speedBonus,
  };
}

export function PeriodicGuardianBoard({
  levelId,
  onExit,
  onWin,
  onMap = onExit,
  mode = "periodic-guardian",
}: Props) {
  const config = BOSSES["periodic-guardian"];
  const level = getLevelById(levelId) ?? getLevelById(config.levelId);
  const nextLevel = getNextLevel(levelId);
  const isTabletLayout = useIsTabletLayout();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const projectileRef = useRef<ProjectileAnim | null>(null);
  const groupBagRef = useRef<GuardianGroup[]>(makeGroupBag());
  const closedGroupsRef = useRef<Record<GuardianGroup, number>>({
    metals: 0,
    halogens: 0,
    "noble-gases": 0,
  });
  const clockStartRef = useRef(Date.now());
  const lastPlayerActionRef = useRef(Date.now());
  const runRecordedRef = useRef(false);
  const [clock, setClock] = useState(() => Date.now());
  const [arenaSize, setArenaSize] = useState({
    width: isTabletLayout ? 860 : 380,
    height: isTabletLayout ? 700 : 580,
  });
  const [aimPoint, setAimPoint] = useState({ x: arenaSize.width * 0.5, y: 150 });
  const [queue, setQueue] = useState<QueueAtom[]>(() => makeInitialQueue(groupBagRef));
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [successHits, setSuccessHits] = useState(0);
  const [bossHealth, setBossHealth] = useState(SUCCESS_TARGET);
  const [projectile, setProjectile] = useState<ProjectileAnim | null>(null);
  const [beamAnim, setBeamAnim] = useState<BeamAnim | null>(null);
  const [bossFlash, setBossFlash] = useState<"hit" | "beam" | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<null | "win" | "lose">(null);
  const [victorySummary, setVictorySummary] = useState<VictorySummary | null>(null);
  const {
    addScore,
    challengeBestScores,
    incrementLevelAttempt,
    musicEnabled,
    recordLevelRun,
    reportQuestProgress,
    setChallengeBestScore,
    setLevelStars,
    unlockLevel,
  } = useProgress();

  const launcher = useMemo(
    () => ({
      x: arenaSize.width * 0.5,
      y: arenaSize.height - (isTabletLayout ? 80 : 72),
    }),
    [arenaSize.height, arenaSize.width, isTabletLayout],
  );

  const activeGroup =
    GROUP_ORDER[Math.floor((clock - clockStartRef.current) / PHASE_MS) % GROUP_ORDER.length] ??
    "metals";
  const attemptsLeft = Math.max(0, config.maxShots - attemptsUsed);
  const healthPct = clamp(bossHealth / SUCCESS_TARGET, 0, 1);
  const idleRemainingMs = Math.max(0, IDLE_BEAM_MS - (clock - lastPlayerActionRef.current));
  const queueCurrent = useMemo<QueueAtom>(
    () => queue[0] ?? { atom: GROUP_CONFIG.metals.atoms[0] ?? 3, group: "metals" },
    [queue],
  );
  const idlePct = clamp(idleRemainingMs / IDLE_BEAM_MS, 0, 1);

  const weakSpots = useMemo<WeakSpotPose[]>(() => {
    const width = arenaSize.width;
    const height = arenaSize.height;
    return [
      { group: "metals", x: width * 0.31, y: height * 0.37, radius: isTabletLayout ? 48 : 38 },
      { group: "halogens", x: width * 0.5, y: height * 0.32, radius: isTabletLayout ? 54 : 42 },
      { group: "noble-gases", x: width * 0.69, y: height * 0.37, radius: isTabletLayout ? 48 : 38 },
    ];
  }, [arenaSize.height, arenaSize.width, isTabletLayout]);

  const groupClosedMs = useMemo(
    () =>
      GROUP_ORDER.reduce<Record<GuardianGroup, number>>(
        (acc, group) => {
          acc[group] = Math.max(0, (closedGroupsRef.current[group] ?? 0) - clock);
          return acc;
        },
        {} as Record<GuardianGroup, number>,
      ),
    [clock],
  );

  useEffect(() => {
    primeAudio();
    if (musicEnabled) startAmbientMusic("boss");
    else stopAmbientMusic();
    return () => {
      stopAmbientMusic();
    };
  }, [musicEnabled]);

  useEffect(() => {
    if (!runRecordedRef.current && level) {
      incrementLevelAttempt(level.id);
      trackGameStart(level.id, mode);
      runRecordedRef.current = true;
    }
  }, [incrementLevelAttempt, level, mode]);

  useEffect(() => {
    const tick = window.setInterval(() => setClock(Date.now()), 90);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (result) return;
    const interval = window.setInterval(() => {
      const group = GROUP_ORDER[Math.floor(Math.random() * GROUP_ORDER.length)] ?? "metals";
      closedGroupsRef.current[group] = Date.now() + SPOT_BLINK_MS;
      setClock(Date.now());
    }, SPOT_BLINK_CYCLE_MS);
    return () => window.clearInterval(interval);
  }, [result]);

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
        y: clamp(prev.y, 40, height - 160),
      }));
    };
    measure();
    const rafId = window.requestAnimationFrame(measure);
    const timeoutId = window.setTimeout(measure, 120);
    const observer = new ResizeObserver(measure);
    observer.observe(arena);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [isTabletLayout]);

  useEffect(() => {
    if (result || projectileRef.current || attemptsLeft <= 0) return;
    if (idleRemainingMs > 0) return;
    lastPlayerActionRef.current = Date.now();
    setBossFlash("beam");
    vibrate(20);
    const timeoutId = window.setTimeout(() => setBossFlash(null), 220);
    setBeamAnim({ until: Date.now() + 420, atom: queueCurrent });
    setAttemptsUsed((current) => current + 1);
    setQueue((current) => {
      const [, ...rest] = current;
      return [...rest, drawQueueAtom(groupBagRef)];
    });
    return () => window.clearTimeout(timeoutId);
  }, [attemptsLeft, idleRemainingMs, queueCurrent, result]);

  useEffect(() => {
    if (!beamAnim) return;
    if (clock >= beamAnim.until) {
      setBeamAnim(null);
    }
  }, [beamAnim, clock]);

  const finishRun = useCallback(
    (won: boolean, finalScore: number, finalAttempts: number) => {
      if (!level) return;
      reportQuestProgress({ runScore: finalScore });
      if (won) {
        addScore(finalScore);
        setChallengeBestScore(mode, finalScore);
        const stars = finalAttempts <= 24 ? 3 : finalAttempts <= 34 ? 2 : 1;
        setLevelStars(level.id, stars);
        if (nextLevel) unlockLevel(nextLevel.id);
        reportQuestProgress({ levelCleared: true, runScore: finalScore, starsEarned: stars });
        recordLevelRun(level.id, {
          score: finalScore,
          shots: finalAttempts,
          powerUpsUsed: 0,
          won: true,
        });
        trackLevelWin(level.id, finalScore, finalAttempts, level.targetElement, mode);
      } else {
        setChallengeBestScore(mode, finalScore);
        recordLevelRun(level.id, {
          score: finalScore,
          shots: finalAttempts,
          powerUpsUsed: 0,
          won: false,
        });
        trackGameOver(level.id, finalScore, finalAttempts, level.targetElement, mode);
      }
    },
    [
      addScore,
      level,
      mode,
      nextLevel,
      recordLevelRun,
      reportQuestProgress,
      setChallengeBestScore,
      setLevelStars,
      unlockLevel,
    ],
  );

  useEffect(() => {
    if (result || bossHealth > 0) return;
    const elapsedMs = Date.now() - clockStartRef.current;
    const { shotBonus, speedBonus, finalScore } = computeBossBattleScore({
      maxShots: config.maxShots,
      shotsUsed: attemptsUsed,
      elapsedMs,
      clearScore: CLEAR_SCORE,
      hitScore: score,
    });
    const previousBest = challengeBestScores[mode] ?? 0;
    setVictorySummary({
      clearTimeMs: elapsedMs,
      shotBonus,
      speedBonus,
      finalScore,
      newBest: finalScore > previousBest,
    });
    playWinSound();
    finishRun(true, finalScore, attemptsUsed);
    setScore(finalScore);
    setResult("win");
  }, [
    attemptsUsed,
    bossHealth,
    challengeBestScores,
    config.maxShots,
    finishRun,
    mode,
    result,
    score,
  ]);

  useEffect(() => {
    if (result || attemptsUsed < config.maxShots || successHits >= SUCCESS_TARGET) return;
    finishRun(false, score, attemptsUsed);
    setResult("lose");
  }, [attemptsUsed, config.maxShots, finishRun, result, score, successHits]);

  const handleArenaPointer = useCallback(
    (clientX: number, clientY: number, fire: boolean) => {
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextPoint = {
        x: clamp(clientX - rect.left, 22, rect.width - 22),
        y: clamp(clientY - rect.top, 40, rect.height - 120),
      };
      setAimPoint(nextPoint);
      if (!fire || result || projectileRef.current || attemptsUsed >= config.maxShots) return;

      const currentAtom = queueCurrent;
      lastPlayerActionRef.current = Date.now();
      setBeamAnim(null);
      playShootSound();

      const direction = normalize(nextPoint.x - launcher.x, nextPoint.y - launcher.y);
      const exit = rayExitPoint(
        launcher.x,
        launcher.y,
        direction.x,
        direction.y,
        arenaSize.width,
        arenaSize.height,
      );
      let nearest: { t: number; spot: WeakSpotPose } | null = null;
      for (const spot of weakSpots) {
        if (groupClosedMs[spot.group] > 0) continue;
        const t = rayCircleHit(
          launcher.x,
          launcher.y,
          direction.x,
          direction.y,
          spot.x,
          spot.y,
          spot.radius,
        );
        if (t == null || t > exit.t) continue;
        if (!nearest || t < nearest.t) {
          nearest = { t, spot };
        }
      }

      const hitPoint = nearest
        ? { x: launcher.x + direction.x * nearest.t, y: launcher.y + direction.y * nearest.t }
        : { x: exit.x, y: exit.y };
      const durationMs = Math.max(
        220,
        Math.min(720, ((nearest ? nearest.t : exit.t) * 920) / PROJECTILE_SPEED),
      );
      const success = Boolean(
        nearest && nearest.spot.group === activeGroup && currentAtom.group === activeGroup,
      );
      const targetGroup = nearest?.spot.group ?? null;
      const anim: ProjectileAnim = {
        startX: launcher.x,
        startY: launcher.y,
        endX: hitPoint.x,
        endY: hitPoint.y,
        x: launcher.x,
        y: launcher.y,
        startedAt: Date.now(),
        durationMs,
        atom: currentAtom,
        success,
        targetGroup,
      };
      projectileRef.current = anim;
      setProjectile(anim);
      setAttemptsUsed((current) => current + 1);
      trackShot(
        level?.id ?? config.levelId,
        currentAtom.atom,
        Math.atan2(direction.y, direction.x) * (180 / Math.PI),
        mode,
      );
      setQueue((current) => {
        const [, ...rest] = current;
        return [...rest, drawQueueAtom(groupBagRef)];
      });
    },
    [
      activeGroup,
      arenaSize.height,
      arenaSize.width,
      attemptsUsed,
      config.levelId,
      config.maxShots,
      groupClosedMs,
      launcher.x,
      launcher.y,
      level?.id,
      mode,
      queueCurrent,
      result,
      weakSpots,
    ],
  );

  useEffect(() => {
    if (!projectile) return;
    let rafId = 0;
    const update = () => {
      const active = projectileRef.current;
      if (!active) return;
      const elapsed = Date.now() - active.startedAt;
      const progress = clamp(elapsed / active.durationMs, 0, 1);
      const next = {
        ...active,
        x: active.startX + (active.endX - active.startX) * progress,
        y: active.startY + (active.endY - active.startY) * progress,
      };
      projectileRef.current = next;
      setProjectile(next);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(update);
        return;
      }

      projectileRef.current = null;
      setProjectile(null);
      if (active.success) {
        setSuccessHits((current) => current + 1);
        setBossHealth((current) => Math.max(0, current - 1));
        setScore((current) => current + 3_000);
        setBossFlash("hit");
        playMergeSound(1);
        vibrate(28);
        window.setTimeout(() => setBossFlash(null), 240);
      } else if (active.targetGroup) {
        setBossHealth((current) => Math.min(SUCCESS_TARGET, current + 1));
      }
    };
    rafId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(rafId);
  }, [projectile]);

  const trajectory = useMemo(() => {
    const direction = normalize(aimPoint.x - launcher.x, aimPoint.y - launcher.y);
    const exit = rayExitPoint(
      launcher.x,
      launcher.y,
      direction.x,
      direction.y,
      arenaSize.width,
      arenaSize.height,
    );
    let endX = exit.x;
    let endY = exit.y;
    let hitSpot: WeakSpotPose | null = null;
    let nearestT = Infinity;
    for (const spot of weakSpots) {
      if (groupClosedMs[spot.group] > 0) continue;
      const t = rayCircleHit(
        launcher.x,
        launcher.y,
        direction.x,
        direction.y,
        spot.x,
        spot.y,
        spot.radius,
      );
      if (t == null || t > exit.t || t >= nearestT) continue;
      nearestT = t;
      endX = launcher.x + direction.x * t;
      endY = launcher.y + direction.y * t;
      hitSpot = spot;
    }
    return { endX, endY, hitSpot };
  }, [
    aimPoint.x,
    aimPoint.y,
    arenaSize.height,
    arenaSize.width,
    groupClosedMs,
    launcher.x,
    launcher.y,
    weakSpots,
  ]);

  if (!level) return null;

  return (
    <div
      className="app-shell"
      style={{
        padding: isTabletLayout ? "32px 26px" : "22px 16px 26px",
        minHeight: "100dvh",
        touchAction: "none",
      }}
    >
      <div style={{ width: "100%", maxWidth: isTabletLayout ? 980 : 520, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 14,
          }}
        >
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
            ← Map
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}
            >
              BOSS EXPERIMENT
            </div>
            <div
              className="gold-text"
              style={{ fontSize: isTabletLayout ? 28 : 23, fontWeight: 900, marginTop: 2 }}
            >
              {config.name}
            </div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 2 }}>
              {level.name}
            </div>
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
            <div
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                letterSpacing: 1.4,
                fontWeight: 800,
              }}
            >
              SHOTS
            </div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{attemptsLeft}</div>
          </div>
        </div>

        <div
          ref={arenaRef}
          onPointerMove={(event) => handleArenaPointer(event.clientX, event.clientY, false)}
          onPointerDown={(event) => handleArenaPointer(event.clientX, event.clientY, true)}
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
          <PeriodicBackdrop activeGroup={activeGroup} isTabletLayout={isTabletLayout} />

          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              right: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: 8,
              zIndex: 2,
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
              <CompactBar
                label="Guardian"
                value={`${bossHealth}/${SUCCESS_TARGET}`}
                fillPercent={healthPct}
                fill="linear-gradient(90deg, var(--accent), #ff8b56)"
                shadow="0 0 16px var(--accent-glow)"
              />
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
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.6,
                  color: "var(--muted-foreground)",
                  fontWeight: 900,
                }}
              >
                CURRENT SHOT
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GroupBall
                  atom={queueCurrent.atom}
                  group={queueCurrent.group}
                  size={isTabletLayout ? 48 : 42}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  {queue.slice(1).map((item, index) => (
                    <GroupBall
                      key={`${item.group}-${item.atom}-${index}`}
                      atom={item.atom}
                      group={item.group}
                      size={isTabletLayout ? 26 : 24}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "29%",
              width: isTabletLayout ? 360 : 270,
              height: isTabletLayout ? 240 : 188,
              transform: "translateX(-50%)",
              borderRadius: "46% 46% 38% 38% / 50% 50% 34% 34%",
              background:
                bossFlash === "hit"
                  ? "radial-gradient(circle at 50% 40%, rgba(255,95,95,0.42), transparent 24%), linear-gradient(180deg, rgba(45,17,25,0.96), rgba(20,10,18,0.98))"
                  : bossFlash === "beam"
                    ? "radial-gradient(circle at 50% 24%, rgba(153,220,255,0.22), transparent 24%), linear-gradient(180deg, rgba(26,40,62,0.96), rgba(14,18,34,0.98))"
                    : "radial-gradient(circle at 50% 30%, rgba(255,212,87,0.1), transparent 28%), linear-gradient(180deg, rgba(26,33,64,0.98), rgba(16,20,40,0.99))",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 26px 56px rgba(0,0,0,0.48)",
              zIndex: 1,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "32%",
              width: isTabletLayout ? 286 : 220,
              height: isTabletLayout ? 34 : 28,
              transform: "translateX(-50%)",
              borderRadius: 999,
              background: "linear-gradient(180deg, rgba(8,10,26,0.98), rgba(31,38,72,0.55))",
              boxShadow: "0 8px 18px rgba(0,0,0,0.32)",
              zIndex: 2,
            }}
          />

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "48%",
              width: isTabletLayout ? 180 : 136,
              height: isTabletLayout ? 46 : 34,
              transform: "translateX(-50%)",
              borderRadius: "0 0 999px 999px",
              background: "linear-gradient(180deg, rgba(9, 7, 20, 0.98), rgba(44, 16, 24, 0.92))",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 8% auto 8%",
                height: "58%",
                background:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.82) 0 9%, transparent 9% 16%)",
                clipPath: "polygon(0 0, 100% 0, 94% 100%, 6% 100%)",
                opacity: 0.72,
              }}
            />
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              top: "39%",
              width: isTabletLayout ? 92 : 74,
              height: isTabletLayout ? 92 : 74,
              transform: "translateX(-50%)",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: `conic-gradient(rgba(116, 228, 255, 0.96) ${idlePct * 360}deg, rgba(255,255,255,0.08) 0deg)`,
              boxShadow: "0 0 18px rgba(116, 228, 255, 0.24)",
              zIndex: 3,
            }}
          >
            <div
              style={{
                width: isTabletLayout ? 70 : 56,
                height: isTabletLayout ? 70 : 56,
                borderRadius: "50%",
                background:
                  bossFlash === "beam"
                    ? "radial-gradient(circle at 50% 40%, rgba(214,244,255,0.98), rgba(94,153,248,0.92) 60%, rgba(15,24,51,0.98))"
                    : "radial-gradient(circle at 50% 40%, rgba(250,252,255,0.98), rgba(141,190,255,0.9) 60%, rgba(16,24,51,0.98))",
                display: "grid",
                placeItems: "center",
                color: "#f4fbff",
                fontSize: isTabletLayout ? 26 : 22,
                fontWeight: 900,
              }}
            >
              E
            </div>
          </div>

          {weakSpots.map((spot) => {
            const group = GROUP_CONFIG[spot.group];
            const active = spot.group === activeGroup;
            const closed = groupClosedMs[spot.group] > 0;
            return (
              <div
                key={spot.group}
                style={{
                  position: "absolute",
                  left: spot.x - spot.radius,
                  top: spot.y - spot.radius,
                  width: spot.radius * 2,
                  height: spot.radius * 2,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: closed
                    ? "linear-gradient(180deg, rgba(28,34,62,0.96), rgba(10,12,26,0.98))"
                    : active
                      ? `radial-gradient(circle at 45% 40%, rgba(255,255,255,0.98), ${group.tint} 60%, rgba(18,22,40,0.95) 100%)`
                      : "linear-gradient(180deg, rgba(28,34,62,0.96), rgba(10,12,26,0.98))",
                  border: active
                    ? "2px solid rgba(255,255,255,0.24)"
                    : "2px solid rgba(112,122,168,0.24)",
                  boxShadow:
                    !closed && active ? `0 0 20px ${group.glow}` : "0 8px 18px rgba(0,0,0,0.26)",
                  zIndex: 3,
                }}
              >
                {closed ? (
                  <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                    <div
                      style={{
                        width: "75%",
                        height: Math.max(10, spot.radius * 0.28),
                        borderRadius: 999,
                        background:
                          "linear-gradient(180deg, rgba(188,193,220,0.7), rgba(62,68,98,0.68))",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "68%",
                      height: "68%",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      color: "#101626",
                      fontWeight: 900,
                      fontSize: isTabletLayout ? 13 : 11,
                      textAlign: "center",
                      background: active ? group.bg : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {group.marker}
                  </div>
                )}
              </div>
            );
          })}

          {trajectory && !projectile && !result && (
            <>
              <svg
                viewBox={`0 0 ${arenaSize.width} ${arenaSize.height}`}
                preserveAspectRatio="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              >
                <defs>
                  <linearGradient id="guardianAimLine" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="rgba(105, 230, 255, 0)" />
                    <stop offset="45%" stopColor="rgba(105, 230, 255, 0.58)" />
                    <stop offset="100%" stopColor="rgba(255, 236, 140, 0.92)" />
                  </linearGradient>
                </defs>
                <line
                  x1={launcher.x}
                  y1={launcher.y}
                  x2={trajectory.endX}
                  y2={trajectory.endY}
                  stroke="url(#guardianAimLine)"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray="12 9"
                  opacity={0.95}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  left: trajectory.endX - 9,
                  top: trajectory.endY - 9,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: `2px solid ${trajectory.hitSpot ? GROUP_CONFIG[trajectory.hitSpot.group].tint : "var(--accent)"}`,
                  boxShadow: `0 0 14px ${trajectory.hitSpot ? GROUP_CONFIG[trajectory.hitSpot.group].glow : "var(--accent-glow)"}`,
                  background: "rgba(255,255,255,0.05)",
                  pointerEvents: "none",
                  zIndex: 3,
                }}
              />
            </>
          )}

          {beamAnim && (
            <>
              <svg
                viewBox={`0 0 ${arenaSize.width} ${arenaSize.height}`}
                preserveAspectRatio="none"
                className="guardian-e-beam"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 4,
                }}
              >
                <defs>
                  <linearGradient id="guardianBeam" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.98)" />
                    <stop offset="35%" stopColor="rgba(255,230,130,0.98)" />
                    <stop offset="100%" stopColor="rgba(255,140,42,0.04)" />
                  </linearGradient>
                </defs>
                <line
                  x1={arenaSize.width * 0.5}
                  y1={arenaSize.height * 0.39 + (isTabletLayout ? 46 : 37)}
                  x2={launcher.x}
                  y2={launcher.y}
                  stroke="rgba(255,198,78,0.24)"
                  strokeWidth={30}
                  strokeLinecap="round"
                />
                <line
                  x1={arenaSize.width * 0.5}
                  y1={arenaSize.height * 0.39 + (isTabletLayout ? 46 : 37)}
                  x2={launcher.x}
                  y2={launcher.y}
                  stroke="url(#guardianBeam)"
                  strokeWidth={12}
                  strokeLinecap="round"
                />
                <line
                  x1={arenaSize.width * 0.5}
                  y1={arenaSize.height * 0.39 + (isTabletLayout ? 46 : 37)}
                  x2={launcher.x}
                  y2={launcher.y}
                  stroke="white"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              </svg>
              <div
                className="guardian-vaporized-atom"
                style={{
                  position: "absolute",
                  left: launcher.x - 22,
                  top: launcher.y - 22,
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              >
                <GroupBall atom={beamAnim.atom.atom} group={beamAnim.atom.group} size={44} />
              </div>
            </>
          )}

          {projectile && (
            <div
              style={{
                position: "absolute",
                left: projectile.x - 20,
                top: projectile.y - 20,
                pointerEvents: "none",
                zIndex: 5,
              }}
            >
              <GroupBall atom={projectile.atom.atom} group={projectile.atom.group} size={40} />
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: launcher.x - (isTabletLayout ? 34 : 30),
              top: launcher.y - (isTabletLayout ? 34 : 30),
              width: isTabletLayout ? 68 : 60,
              height: isTabletLayout ? 68 : 60,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.12)",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(14,18,36,0.96))",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 0 18px rgba(0,0,0,0.35)",
              zIndex: 3,
            }}
          >
            <GroupBall
              atom={queueCurrent.atom}
              group={queueCurrent.group}
              size={isTabletLayout ? 48 : 42}
            />
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
                    {result === "win" ? "Guardian broken" : "Guardian endures"}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                    {result === "win" ? "Core shattered." : "Out of attempts."}
                  </div>
                  <div style={{ color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                    {result === "win"
                      ? `You earned ${CLEAR_SCORE} points for breaking the guardian.`
                      : "Watch the phase cycle, keep the queue moving, and punish the active family next run."}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <MetricCard label="Attempts" value={`${attemptsUsed}`} />
                  <MetricCard
                    label="Kill time"
                    value={victorySummary ? formatDurationShort(victorySummary.clearTimeMs) : "--"}
                  />
                  <MetricCard label="Score" value={`${score}`} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  <MetricCard label="Hits" value={`${successHits}`} />
                  <MetricCard
                    label="Shot bonus"
                    value={victorySummary ? `${victorySummary.shotBonus}` : "--"}
                  />
                  <MetricCard
                    label={victorySummary?.newBest ? "New best" : "Best score"}
                    value={`${Math.max(victorySummary?.finalScore ?? 0, challengeBestScores[mode] ?? 0)}`}
                  />
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

function PeriodicBackdrop({
  activeGroup,
  isTabletLayout,
}: {
  activeGroup: GuardianGroup;
  isTabletLayout: boolean;
}) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
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
          top: "30%",
          left: "10%",
          right: "10%",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 18,
        }}
      >
        {GROUP_ORDER.map((group) => {
          const info = GROUP_CONFIG[group];
          const active = group === activeGroup;
          return (
            <div
              key={group}
              style={{
                height: isTabletLayout ? 130 : 102,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.06)",
                background: active
                  ? `linear-gradient(180deg, color-mix(in srgb, ${info.tint} 22%, transparent), rgba(10,14,34,0.18))`
                  : "rgba(255,255,255,0.02)",
                boxShadow: active ? `0 0 28px ${info.glow}` : "none",
                opacity: active ? 1 : 0.45,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroupBall({
  atom,
  group,
  size,
  compact = false,
}: {
  atom: number;
  group: GuardianGroup;
  size: number;
  compact?: boolean;
}) {
  const info = GROUP_CONFIG[group];
  const element = ELEMENTS[atom - 1];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        display: "grid",
        placeItems: "center",
        background: `${info.bg}, radial-gradient(circle at 30% 30%, rgba(255,255,255,0.26), transparent 35%)`,
        boxShadow: `0 0 ${compact ? 12 : 18}px ${info.glow}, inset 0 1px 0 rgba(255,255,255,0.28)`,
        color: "#11162d",
        fontWeight: 900,
      }}
    >
      {!compact && (
        <div
          style={{
            position: "absolute",
            top: size * 0.1,
            fontSize: Math.max(8, size * 0.16),
            lineHeight: 1,
            opacity: 0.82,
          }}
        >
          {atom}
        </div>
      )}
      <div
        style={{
          fontSize: compact ? Math.max(10, size * 0.34) : Math.max(14, size * 0.38),
          lineHeight: 1,
        }}
      >
        {element?.symbol ?? "?"}
      </div>
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
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.6,
          color: "var(--muted-foreground)",
          fontWeight: 800,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, lineHeight: 1.05 }}>{value}</div>
    </div>
  );
}
