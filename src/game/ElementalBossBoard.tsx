import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, HeartCrack } from "lucide-react";
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

type OuterEyeId = (typeof BOSSES)["elemental-boss"]["outerEyes"][number]["id"];

interface EyePose {
  id: OuterEyeId;
  atom: number;
  x: number;
  y: number;
  radius: number;
  open: boolean;
  closedMs: number;
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
  atom: number;
  shimmer: boolean;
  blank: boolean;
  outcome:
    | { type: "miss" }
    | { type: "center" }
    | { type: "outer"; eyeId: OuterEyeId };
}

const OUTER_COOLDOWN_MS = 10_000;
const CENTER_COOLDOWN_MS = 5_000;
const PROJECTILE_SPEED = 930;
const QUEUE_SIZE = 4;
const SHIMMER_CHANCE = 0.13;
const CLEAR_SCORE = 20_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickDistinctAtoms(max: number, count: number): number[] {
  const pool = Array.from({ length: max }, (_, index) => index + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function generateBossAtom(eyeAtoms: number[]): number {
  if (Math.random() < 0.76) {
    return eyeAtoms[Math.floor(Math.random() * eyeAtoms.length)] ?? 1;
  }
  return 1 + Math.floor(Math.random() * 10);
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
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

function makeEyeAssignments(): Record<OuterEyeId, number> {
  const ids = BOSSES["elemental-boss"].outerEyes.map((eye) => eye.id as OuterEyeId);
  const atoms = pickDistinctAtoms(BOSSES["elemental-boss"].maxEyeElement, ids.length);
  return ids.reduce<Record<OuterEyeId, number>>((acc, id, index) => {
    acc[id] = atoms[index] ?? 1;
    return acc;
  }, {} as Record<OuterEyeId, number>);
}

function makeInitialQueue(eyeAtoms: Record<OuterEyeId, number>): { queue: number[]; shimmer: boolean[] } {
  const atomValues = Object.values(eyeAtoms);
  return {
    queue: Array.from({ length: QUEUE_SIZE }, () => generateBossAtom(atomValues)),
    shimmer: Array.from({ length: QUEUE_SIZE }, (_, index) => index > 0 && Math.random() < SHIMMER_CHANCE),
  };
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

export function ElementalBossBoard({ levelId, onExit, onWin, onMap = onExit, mode = "elemental-boss" }: Props) {
  const config = BOSSES["elemental-boss"];
  const level = getLevelById(levelId) ?? getLevelById(config.levelId);
  const nextLevel = getNextLevel(levelId);
  const isTabletLayout = useIsTabletLayout();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const projectileRef = useRef<ProjectileAnim | null>(null);
  const outerClosedUntilRef = useRef<Record<OuterEyeId, number>>({
    "north-west": 0,
    "north-east": 0,
    "south-west": 0,
    "south-east": 0,
  });
  const centerClosedUntilRef = useRef(0);
  const clockRef = useRef(Date.now());
  const runRecordedRef = useRef(false);
  const [clock, setClock] = useState(() => Date.now());
  const [arenaSize, setArenaSize] = useState({ width: isTabletLayout ? 860 : 380, height: isTabletLayout ? 710 : 600 });
  const [aimPoint, setAimPoint] = useState({ x: arenaSize.width / 2, y: 120 });
  const [eyeAtoms] = useState<Record<OuterEyeId, number>>(() => makeEyeAssignments());
  const [queueState, setQueueState] = useState(() => makeInitialQueue(eyeAtoms));
  const [blankCharges, setBlankCharges] = useState(0);
  const [bossHealth, setBossHealth] = useState(config.maxHealth);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [centerCharge, setCenterCharge] = useState(0);
  const [projectile, setProjectile] = useState<ProjectileAnim | null>(null);
  const [bossFlash, setBossFlash] = useState<"hit" | "charge" | null>(null);
  const [result, setResult] = useState<null | "win" | "lose">(null);
  const [score, setScore] = useState(0);
  const [damageHits, setDamageHits] = useState(0);
  const {
    addScore,
    hasProPack,
    incrementLevelAttempt,
    recordLevelRun,
    setChallengeBestScore,
    setLevelStars,
    unlockLevel,
  } = useProgress();

  const launcher = useMemo(
    () => ({
      x: arenaSize.width * 0.5,
      y: arenaSize.height - (isTabletLayout ? 78 : 70),
    }),
    [arenaSize.height, arenaSize.width, isTabletLayout],
  );

  const currentShot = blankCharges > 0 ? 0 : queueState.queue[0] ?? 1;
  const currentShimmer = blankCharges > 0 ? false : queueState.shimmer[0] ?? false;
  const shotsLeft = Math.max(0, config.maxShots - shotsUsed);
  const healthPct = clamp(bossHealth / config.maxHealth, 0, 1);
  const chargePct = clamp(centerCharge / config.centerChargeGoal, 0, 1);

  const outerEyes = useMemo(() => {
    return config.outerEyes.map<EyePose>((layout) => {
      const phase = clock / 760 + layout.swayPhase;
      const x = (layout.xPct / 100) * arenaSize.width + Math.sin(phase) * layout.swayX;
      const y = (layout.yPct / 100) * arenaSize.height + Math.cos(phase * 1.15) * layout.swayY;
      const closedUntil = outerClosedUntilRef.current[layout.id as OuterEyeId] ?? 0;
      return {
        id: layout.id as OuterEyeId,
        atom: eyeAtoms[layout.id as OuterEyeId],
        x,
        y,
        radius: layout.size * (isTabletLayout ? 0.62 : 0.58),
        open: clock >= closedUntil,
        closedMs: Math.max(0, closedUntil - clock),
      };
    });
  }, [arenaSize.height, arenaSize.width, clock, config.outerEyes, eyeAtoms, isTabletLayout]);

  const centerEye = useMemo(() => {
    const x = (config.centerEye.xPct / 100) * arenaSize.width;
    const y = (config.centerEye.yPct / 100) * arenaSize.height;
    const closedMs = Math.max(0, centerClosedUntilRef.current - clock);
    return {
      x,
      y,
      radius: config.centerEye.size * (isTabletLayout ? 0.36 : 0.34),
      open: clock >= centerClosedUntilRef.current,
      closedMs,
    };
  }, [arenaSize.height, arenaSize.width, clock, config.centerEye, isTabletLayout]);

  const consumeQueuedShot = useCallback(() => {
    setQueueState((prev) => {
      const eyePool = Object.values(eyeAtoms);
      if (blankCharges > 0) {
        return {
          queue: [...prev.queue.slice(1), generateBossAtom(eyePool)],
          shimmer: [...prev.shimmer.slice(1), Math.random() < SHIMMER_CHANCE],
        };
      }
      return {
        queue: [...prev.queue.slice(1), generateBossAtom(eyePool)],
        shimmer: [...prev.shimmer.slice(1), Math.random() < SHIMMER_CHANCE],
      };
    });
    if (blankCharges > 0) {
      setBlankCharges((value) => Math.max(0, value - 1));
    }
  }, [blankCharges, eyeAtoms]);

  const finishRun = useCallback(
    (didWin: boolean, finalScore: number, successfulHits: number, finalShotsUsed: number) => {
      if (runRecordedRef.current) return;
      runRecordedRef.current = true;
      const stars = didWin ? (finalShotsUsed <= 40 ? 3 : finalShotsUsed <= 70 ? 2 : 1) : 0;
      recordLevelRun(levelId, {
        score: finalScore,
        shots: finalShotsUsed,
        powerUpsUsed: 0,
        won: didWin,
      });
      if (didWin) {
        setLevelStars(levelId, stars);
        unlockLevel(getNextLevel(levelId)?.id ?? levelId + 1);
        setChallengeBestScore(mode, finalScore);
        trackLevelWin(levelId, finalScore, finalShotsUsed, Math.min(10, successfulHits), mode);
      } else {
        trackGameOver(levelId, finalScore, finalShotsUsed, Math.min(10, successfulHits), mode);
      }
    },
    [levelId, mode, recordLevelRun, setChallengeBestScore, setLevelStars, unlockLevel],
  );

  const triggerFlash = useCallback((kind: "hit" | "charge") => {
    setBossFlash(kind);
    window.setTimeout(() => setBossFlash((current) => (current === kind ? null : current)), 220);
  }, []);

  const handleWin = useCallback(
    (nextBossHealth: number, nextShotsUsed: number, successfulHits: number, nextScore: number) => {
      if (nextBossHealth > 0) return;
      const finalScore = nextScore + CLEAR_SCORE;
      setScore(finalScore);
      addScore(CLEAR_SCORE);
      setResult("win");
      playWinSound();
      vibrate([40, 40, 80]);
      finishRun(true, finalScore, successfulHits, nextShotsUsed);
    },
    [addScore, finishRun],
  );

  const handleLoss = useCallback(
    (nextShotsUsed: number, successfulHits: number) => {
      if (result) return;
      setResult("lose");
      finishRun(false, score, successfulHits, nextShotsUsed);
    },
    [finishRun, result, score],
  );

  const resolveOutcome = useCallback(
    (anim: ProjectileAnim) => {
      const baseShotsUsed = shotsUsed + 1;
      setShotsUsed(baseShotsUsed);
      consumeQueuedShot();

      if (anim.outcome.type === "miss") {
        if (baseShotsUsed >= config.maxShots && bossHealth > 0) {
          handleLoss(baseShotsUsed, damageHits);
        }
        return;
      }

      if (anim.outcome.type === "center") {
        centerClosedUntilRef.current = Date.now() + CENTER_COOLDOWN_MS;
        triggerFlash("charge");
        setCenterCharge((value) => {
          const next = value + 1;
          if (next >= config.centerChargeGoal) {
            setBlankCharges((current) => current + 1);
            return 0;
          }
          return next;
        });
        if (baseShotsUsed >= config.maxShots && bossHealth > 0) {
          handleLoss(baseShotsUsed, damageHits);
        }
        return;
      }

      const eyeId = anim.outcome.eyeId;
      outerClosedUntilRef.current[eyeId] = Date.now() + OUTER_COOLDOWN_MS;
      const matchedEye = eyeAtoms[eyeId] === anim.atom || anim.blank;
      if (matchedEye) {
        const hitDamage = anim.shimmer ? 2 : 1;
        const nextHealth = Math.max(0, bossHealth - hitDamage);
        const nextHits = damageHits + hitDamage;
        const nextScore = score + hitDamage * 1000;
        setDamageHits(nextHits);
        setBossHealth(nextHealth);
        setScore(nextScore);
        triggerFlash("hit");
        playMergeSound(hitDamage);
        vibrate([20, 24, 20]);
        handleWin(nextHealth, baseShotsUsed, nextHits, nextScore);
        return;
      }

      if (baseShotsUsed >= config.maxShots && bossHealth > 0) {
        handleLoss(baseShotsUsed, damageHits);
      }
    },
    [
      bossHealth,
      config.maxHealth,
      config.maxShots,
      config.centerChargeGoal,
      consumeQueuedShot,
      damageHits,
      eyeAtoms,
      handleLoss,
      handleWin,
      score,
      shotsUsed,
      triggerFlash,
    ],
  );

  const animateProjectile = useCallback(
    (anim: ProjectileAnim) => {
      projectileRef.current = anim;
      setProjectile(anim);
      const startedAt = performance.now();

      function step(now: number) {
        const live = projectileRef.current;
        if (!live) return;
        const progress = clamp((now - startedAt) / live.durationMs, 0, 1);
        const next = {
          ...live,
          x: live.startX + (live.endX - live.startX) * progress,
          y: live.startY + (live.endY - live.startY) * progress,
        };
        projectileRef.current = next;
        setProjectile(next);
        if (progress >= 1) {
          projectileRef.current = null;
          setProjectile(null);
          resolveOutcome(live);
          return;
        }
        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    },
    [resolveOutcome],
  );

  const fireShot = useCallback(
    (targetX: number, targetY: number) => {
      if (projectileRef.current || result) return;
      const dir = normalize(targetX - launcher.x, targetY - launcher.y);
      const exit = rayExitPoint(launcher.x, launcher.y, dir.x, dir.y, arenaSize.width, arenaSize.height);

      const hitCandidates: Array<{
        t: number;
        outcome: ProjectileAnim["outcome"];
        endX: number;
        endY: number;
      }> = [];

      for (const eye of outerEyes) {
        if (!eye.open) continue;
        const t = rayCircleHit(launcher.x, launcher.y, dir.x, dir.y, eye.x, eye.y, eye.radius);
        if (t != null && t <= exit.t) {
          hitCandidates.push({
            t,
            outcome: { type: "outer", eyeId: eye.id },
            endX: launcher.x + dir.x * t,
            endY: launcher.y + dir.y * t,
          });
        }
      }

      if (centerEye.open) {
        const t = rayCircleHit(launcher.x, launcher.y, dir.x, dir.y, centerEye.x, centerEye.y, centerEye.radius);
        if (t != null && t <= exit.t) {
          hitCandidates.push({
            t,
            outcome: { type: "center" },
            endX: launcher.x + dir.x * t,
            endY: launcher.y + dir.y * t,
          });
        }
      }

      const bestHit = hitCandidates.sort((a, b) => a.t - b.t)[0];
      const endX = bestHit?.endX ?? exit.x;
      const endY = bestHit?.endY ?? exit.y;
      const travel = Math.max(120, distance(launcher.x, launcher.y, endX, endY));
      const atom = currentShot === 0 ? eyeAtoms[outerEyes[0]?.id ?? "north-west"] : currentShot;

      trackShot(levelId, currentShot === 0 ? -1 : atom, Math.atan2(targetY - launcher.y, targetX - launcher.x) * (180 / Math.PI), mode);
      playShootSound();

      animateProjectile({
        startX: launcher.x,
        startY: launcher.y,
        endX,
        endY,
        x: launcher.x,
        y: launcher.y,
        startedAt: performance.now(),
        durationMs: (travel / PROJECTILE_SPEED) * 1000,
        atom,
        shimmer: currentShimmer,
        blank: currentShot === 0,
        outcome: bestHit?.outcome ?? { type: "miss" },
      });
    },
    [
      animateProjectile,
      arenaSize.height,
      arenaSize.width,
      centerEye.open,
      centerEye.radius,
      centerEye.x,
      centerEye.y,
      currentShimmer,
      currentShot,
      eyeAtoms,
      launcher.x,
      launcher.y,
      levelId,
      mode,
      outerEyes,
      result,
    ],
  );

  const handleArenaPointer = useCallback(
    (clientX: number, clientY: number, shouldFire: boolean) => {
      const arena = arenaRef.current;
      if (!arena) return;
      const rect = arena.getBoundingClientRect();
      const nextX = clamp(clientX - rect.left, 24, rect.width - 24);
      const nextY = clamp(clientY - rect.top, 36, rect.height - 24);
      setAimPoint({ x: nextX, y: nextY });
      if (shouldFire) {
        fireShot(nextX, nextY);
      }
    },
    [fireShot],
  );

  useEffect(() => {
    function measure() {
      const arena = arenaRef.current;
      if (!arena) return;
      const rect = arena.getBoundingClientRect();
      setArenaSize({
        width: Math.max(320, rect.width),
        height: Math.max(isTabletLayout ? 600 : 520, rect.height),
      });
      setAimPoint((current) => ({
        x: clamp(current.x, 24, Math.max(24, rect.width - 24)),
        y: clamp(current.y, 36, Math.max(36, rect.height - 24)),
      }));
    }

    measure();
    const observer = new ResizeObserver(measure);
    if (arenaRef.current) observer.observe(arenaRef.current);
    const raf = window.requestAnimationFrame(measure);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [isTabletLayout]);

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 80);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    primeAudio();
    startAmbientMusic();
    incrementLevelAttempt(levelId);
    trackGameStart(levelId, mode);
    return () => {
      stopAmbientMusic();
    };
  }, [incrementLevelAttempt, levelId, mode]);

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 24 : 14 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 980 : 560,
          margin: "0 auto",
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onMap}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: 12,
              padding: "8px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {"<- Back"}
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: "var(--accent)",
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              Special Encounter
            </div>
            <div style={{ fontSize: isTabletLayout ? 22 : 18, fontWeight: 900 }}>{level?.name ?? config.name}</div>
          </div>
          <div
            style={{
              minWidth: isTabletLayout ? 112 : 96,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "7px 10px",
            }}
          >
            <HeartCrack size={16} color="var(--accent)" />
            <span style={{ fontWeight: 900, fontSize: 13 }}>{shotsLeft}</span>
            {hasProPack && (
              <span style={{ color: "var(--accent)", fontSize: 10, fontWeight: 900 }}>PRO</span>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            background: "color-mix(in oklch, var(--surface-elevated) 94%, black)",
            border: "1px solid var(--border)",
            borderRadius: 18,
            padding: isTabletLayout ? 12 : 10,
            boxShadow: "0 16px 36px rgba(0,0,0,0.34)",
          }}
        >
          <div
            ref={arenaRef}
            onPointerMove={(event) => handleArenaPointer(event.clientX, event.clientY, false)}
            onPointerDown={(event) => handleArenaPointer(event.clientX, event.clientY, true)}
            style={{
              position: "relative",
              minHeight: isTabletLayout ? 620 : 540,
              borderRadius: 18,
              overflow: "hidden",
              background:
                "radial-gradient(circle at 50% 12%, rgba(92,113,255,0.18), transparent 18%)," +
                "linear-gradient(180deg, rgba(11,14,34,0.98), rgba(7,10,28,1))",
              border: "1px solid rgba(255,255,255,0.08)",
              touchAction: "none",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                backgroundSize: isTabletLayout ? "36px 36px" : "28px 28px",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                right: 10,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 7,
                  minWidth: isTabletLayout ? 250 : 184,
                  padding: isTabletLayout ? "9px 10px" : "8px 9px",
                  borderRadius: 14,
                  background: "rgba(10,14,34,0.84)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <CompactBar
                  label="Boss"
                  value={`${bossHealth}/${config.maxHealth}`}
                  fillPercent={healthPct}
                  fill={
                    bossFlash === "hit"
                      ? "linear-gradient(90deg, #ff7d7d, #ff3b3b)"
                      : "linear-gradient(90deg, var(--accent), #ff7f50)"
                  }
                  shadow={bossFlash === "hit" ? "0 0 18px rgba(255,70,70,0.6)" : "0 0 16px var(--accent-glow)"}
                />
                <CompactBar
                  label="Blank"
                  value={`${centerCharge}/${config.centerChargeGoal}${blankCharges > 0 ? ` | x${blankCharges}` : ""}`}
                  fillPercent={chargePct}
                  fill={
                    bossFlash === "charge"
                      ? "linear-gradient(90deg, rgba(230,230,230,0.7), rgba(168,168,168,0.9))"
                      : "linear-gradient(90deg, #7be1ff, #64b6ff)"
                  }
                  shadow={
                    bossFlash === "charge"
                      ? "0 0 18px rgba(235,235,235,0.35)"
                      : "0 0 16px rgba(100,182,255,0.5)"
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 7,
                  justifyItems: "end",
                  padding: isTabletLayout ? "9px 10px" : "8px 9px",
                  borderRadius: 14,
                  background: "rgba(10,14,34,0.84)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(8px)",
                  minWidth: isTabletLayout ? 220 : 170,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.8, color: "var(--muted-foreground)", fontWeight: 800 }}>
                    CURRENT SHOT
                  </div>
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontWeight: 800 }}>
                    {currentShot === 0 ? "Blank" : `${shotsLeft} left`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {currentShot === 0 ? (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.98), rgba(210,226,255,0.88) 55%, rgba(120,136,200,0.82))",
                        color: "#11162d",
                        fontWeight: 900,
                        boxShadow: "0 0 18px rgba(187,226,255,0.48)",
                      }}
                    >
                      ?
                    </div>
                  ) : (
                    <ElementBall atomicNumber={currentShot} size={40} glow={currentShimmer} />
                  )}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {queueState.queue.slice(1).map((atom, index) => (
                      <ElementBall
                        key={`${atom}-${index}-${queueState.shimmer[index + 1] ? "s" : "n"}`}
                        atomicNumber={atom}
                        size={isTabletLayout ? 24 : 22}
                        glow={queueState.shimmer[index + 1]}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--muted-foreground)", fontWeight: 800 }}>
                  <span>Hits {damageHits}/20</span>
                  <span>Score {score}</span>
                </div>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${arenaSize.width} ${arenaSize.height}`}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              {outerEyes.map((eye) => (
                <path
                  key={`arm-${eye.id}`}
                  d={`M ${arenaSize.width * 0.5} ${arenaSize.height * 0.24}
                      C ${arenaSize.width * 0.52} ${arenaSize.height * 0.2},
                        ${eye.x} ${eye.y - eye.radius * 0.8},
                        ${eye.x} ${eye.y}`}
                  fill="none"
                  stroke="rgba(138,149,255,0.26)"
                  strokeWidth={isTabletLayout ? 16 : 12}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "11%",
                width: isTabletLayout ? 318 : 238,
                height: isTabletLayout ? 198 : 150,
                transform: "translateX(-50%)",
                borderRadius: "44% 44% 38% 38% / 50% 50% 34% 34%",
                background:
                  bossFlash === "hit"
                    ? "radial-gradient(circle at 50% 38%, rgba(255,110,110,0.45), transparent 35%), linear-gradient(180deg, rgba(40,16,22,0.92), rgba(24,10,18,0.96))"
                    : bossFlash === "charge"
                      ? "radial-gradient(circle at 50% 38%, rgba(220,220,220,0.18), transparent 32%), linear-gradient(180deg, rgba(28,32,50,0.96), rgba(18,20,36,0.98))"
                      : "radial-gradient(circle at 50% 38%, rgba(255,190,90,0.1), transparent 34%), linear-gradient(180deg, rgba(31,34,60,0.96), rgba(18,20,38,0.98))",
                boxShadow: "0 22px 48px rgba(0,0,0,0.46)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "13%",
                width: isTabletLayout ? 300 : 220,
                height: isTabletLayout ? 50 : 40,
                transform: "translateX(-50%)",
                borderRadius: "50% 50% 42% 42%",
                background: "linear-gradient(180deg, rgba(7,10,27,0.92), rgba(27,31,58,0.45))",
                boxShadow: "0 10px 20px rgba(0,0,0,0.28)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "31%",
                width: isTabletLayout ? 180 : 136,
                height: isTabletLayout ? 40 : 28,
                transform: "translateX(-50%)",
                borderRadius: "0 0 999px 999px",
                background: "linear-gradient(180deg, rgba(11, 7, 20, 0.98), rgba(44, 14, 22, 0.92))",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 8% auto 8%",
                  height: "55%",
                  background:
                    "repeating-linear-gradient(90deg, rgba(255,255,255,0.82) 0 9%, transparent 9% 16%)",
                  clipPath: "polygon(0 0, 100% 0, 94% 100%, 6% 100%)",
                  opacity: 0.72,
                }}
              />
            </div>

            {outerEyes.map((eye) => (
              <div
                key={eye.id}
                style={{
                  position: "absolute",
                  left: eye.x - eye.radius,
                  top: eye.y - eye.radius,
                  width: eye.radius * 2,
                  height: eye.radius * 2,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: eye.open
                    ? "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.92), rgba(180,185,220,0.5) 62%, rgba(25,28,50,0.9) 100%)"
                    : "linear-gradient(180deg, rgba(34,38,70,0.95), rgba(10,12,26,0.95))",
                  border: eye.open ? "2px solid rgba(255,255,255,0.25)" : "2px solid rgba(110,120,170,0.22)",
                  boxShadow: eye.open
                    ? "0 0 22px rgba(125,147,255,0.22)"
                    : "inset 0 0 18px rgba(0,0,0,0.45)",
                  transform: `rotate(${Math.sin(clock / 950 + eye.x * 0.01) * 5}deg)`,
                  transition: "background 160ms ease, box-shadow 160ms ease",
                }}
              >
                {eye.open ? (
                  <div style={{ display: "grid", gap: 4, justifyItems: "center" }}>
                    <ElementBall atomicNumber={eye.atom} size={eye.radius * 1.1} glow />
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      justifyItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: eye.radius * 1.25,
                        height: Math.max(8, eye.radius * 0.22),
                        borderRadius: 999,
                        background: "linear-gradient(180deg, rgba(154,165,214,0.72), rgba(60,70,110,0.68))",
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)" }}>
                      {formatSeconds(eye.closedMs)}
                    </span>
                  </div>
                )}
              </div>
            ))}

            <div
              style={{
                position: "absolute",
                left: centerEye.x - centerEye.radius,
                top: centerEye.y - centerEye.radius,
                width: centerEye.radius * 2,
                height: centerEye.radius * 2,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: centerEye.open
                  ? "radial-gradient(circle at 50% 44%, rgba(255,255,255,0.98), rgba(210,220,250,0.7) 50%, rgba(26,29,52,0.95) 100%)"
                  : "linear-gradient(180deg, rgba(46,49,76,0.95), rgba(10,12,26,0.95))",
                border: "2px solid rgba(255,255,255,0.24)",
                boxShadow: centerEye.open
                  ? "0 0 28px rgba(122,214,255,0.24)"
                  : "inset 0 0 18px rgba(0,0,0,0.48)",
                transform: `scale(${centerEye.open ? 1 + Math.sin(clock / 260) * 0.03 : 0.96})`,
                transition: "background 150ms ease, transform 100ms linear",
              }}
            >
              {centerEye.open ? (
                <div
                  style={{
                    width: centerEye.radius * 0.9,
                    height: centerEye.radius * 0.9,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "radial-gradient(circle at 45% 40%, rgba(135,209,255,0.95), rgba(35,77,140,0.95) 65%, rgba(8,16,33,0.95))",
                    color: "white",
                    fontSize: isTabletLayout ? 30 : 24,
                    fontWeight: 900,
                  }}
                >
                  <Eye size={isTabletLayout ? 34 : 28} />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
                  <div
                    style={{
                      width: centerEye.radius * 1.2,
                      height: Math.max(10, centerEye.radius * 0.22),
                      borderRadius: 999,
                      background: "linear-gradient(180deg, rgba(188,193,220,0.7), rgba(62,68,98,0.68))",
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--muted-foreground)" }}>
                    {formatSeconds(centerEye.closedMs)}
                  </span>
                </div>
              )}
            </div>

            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: launcher.x,
                top: launcher.y,
                width: 4,
                height: projectile ? 0 : distance(launcher.x, launcher.y, aimPoint.x, aimPoint.y),
                background:
                  "linear-gradient(180deg, rgba(123,225,255,0), rgba(123,225,255,0.82), rgba(255,220,120,0.96))",
                transformOrigin: "top center",
                transform: `translateX(-50%) rotate(${Math.atan2(aimPoint.y - launcher.y, aimPoint.x - launcher.x) * (180 / Math.PI) + 90}deg)`,
                opacity: projectile ? 0 : 0.95,
                borderRadius: 999,
                boxShadow: "0 0 18px rgba(123,225,255,0.42), 0 0 26px rgba(255,220,120,0.18)",
                pointerEvents: "none",
              }}
            />
            {!projectile && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: aimPoint.x - 7,
                  top: aimPoint.y - 7,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: "2px solid rgba(123,225,255,0.82)",
                  boxShadow: "0 0 14px rgba(123,225,255,0.36)",
                  pointerEvents: "none",
                }}
              />
            )}

            {projectile && (
              <div
                style={{
                  position: "absolute",
                  left: projectile.x - 18,
                  top: projectile.y - 18,
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  pointerEvents: "none",
                  transform: projectile.blank ? "scale(0.92)" : undefined,
                }}
              >
                {projectile.blank ? (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.98), rgba(200,216,255,0.9) 55%, rgba(120,136,200,0.85))",
                      color: "#10162a",
                      fontWeight: 900,
                    }}
                  >
                    ?
                  </div>
                ) : (
                  <ElementBall atomicNumber={projectile.atom} size={34} glow={projectile.shimmer} />
                )}
              </div>
            )}

            <div
              style={{
                position: "absolute",
                left: launcher.x - 34,
                top: launcher.y - 34,
                width: 68,
                height: 68,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "radial-gradient(circle at 50% 45%, rgba(18,28,64,0.98), rgba(6,10,26,0.98))",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 0 24px rgba(0,0,0,0.5)",
              }}
            >
              {currentShot === 0 ? (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.98), rgba(210,226,255,0.88) 55%, rgba(120,136,200,0.82))",
                    color: "#11162d",
                    fontWeight: 900,
                    boxShadow: "0 0 18px rgba(187,226,255,0.48)",
                  }}
                  >
                    ?
                  </div>
                ) : (
                  <ElementBall atomicNumber={currentShot} size={48} glow={currentShimmer} />
                )}
              </div>

            {result && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(4,6,16,0.7)",
                  display: "grid",
                  placeItems: "center",
                  padding: 20,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 18,
                    padding: 18,
                    display: "grid",
                    gap: 14,
                    boxShadow: "0 20px 44px rgba(0,0,0,0.42)",
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
                      {result === "win" ? "Boss defeated" : "Experiment failed"}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>
                      {result === "win" ? "The core is shattered." : "Out of atoms."}
                    </div>
                    <div style={{ color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                      {result === "win"
                        ? `You earned ${CLEAR_SCORE} points for clearing the fight.`
                        : "You can jump back in immediately and learn the eye pattern."}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    <MetricCard label="Shots used" value={`${shotsUsed}`} />
                    <MetricCard label="Boss hits" value={`${damageHits}`} />
                    <MetricCard label="Score" value={`${score}`} />
                  </div>
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
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.6, color: "var(--muted-foreground)", fontWeight: 800 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{value}</div>
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
