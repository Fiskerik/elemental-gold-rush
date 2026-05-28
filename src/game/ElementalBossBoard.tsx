import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eye, Shield, Sparkles, Swords, Zap } from "lucide-react";
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
import { BOSSES } from "./bosses";
import { GameModeId } from "./challenges";
import { ELEMENTS } from "./elements";
import { ElementBall } from "./ElementBall";
import { getLevelById, getNextLevel } from "./levels";
import { useIsTabletLayout } from "./responsive";
import { useProgress } from "./store";

interface Props {
  levelId: number;
  onExit: () => void;
  onWin: (nextId: number | null) => void;
  onMap?: () => void;
  mode?: GameModeId;
}

type BossFlash = "hit" | "charge" | null;
type BossResult = { won: boolean; stars: number; nextLevelId: number | null } | null;
type OuterEyeId = (typeof BOSSES)["elemental-boss"]["outerEyes"][number]["id"];

const BOSS = BOSSES["elemental-boss"];
const QUEUE_SIZE = 4;
const HIT_SCORE = 2_400;
const BLANK_SCORE = 1_200;
const CHARGE_SCORE = 250;
const OUTER_EYE_IDS = BOSS.outerEyes.map((eye) => eye.id) as OuterEyeId[];

function pickEyeAtom(): number {
  return 1 + Math.floor(Math.random() * BOSS.maxEyeElement);
}

function createEyeAtoms(): Record<OuterEyeId, number> {
  const assigned = new Set<number>();
  const atoms = {} as Record<OuterEyeId, number>;
  for (const eyeId of OUTER_EYE_IDS) {
    let candidate = pickEyeAtom();
    let guard = 0;
    while (assigned.has(candidate) && guard < 24) {
      candidate = pickEyeAtom();
      guard += 1;
    }
    assigned.add(candidate);
    atoms[eyeId] = candidate;
  }
  return atoms;
}

function randomOpenEyes(): OuterEyeId[] {
  const shuffled = [...OUTER_EYE_IDS].sort(() => Math.random() - 0.5);
  const count = Math.random() < 0.52 ? 1 : 2;
  return shuffled.slice(0, count);
}

function rollQueuedShot(eyeAtoms: Record<OuterEyeId, number>): { atom: number; shimmer: boolean } {
  const eyePool = Object.values(eyeAtoms);
  const usePool = Math.random() < 0.78;
  const atom = usePool
    ? eyePool[Math.floor(Math.random() * eyePool.length)]
    : 1 + Math.floor(Math.random() * BOSS.maxEyeElement);
  return {
    atom,
    shimmer: Math.random() < 0.1,
  };
}

function createInitialQueue(eyeAtoms: Record<OuterEyeId, number>) {
  const queue: number[] = [];
  const shimmerQueue: boolean[] = [];
  for (let index = 0; index < QUEUE_SIZE; index += 1) {
    const shot = rollQueuedShot(eyeAtoms);
    queue.push(shot.atom);
    shimmerQueue.push(shot.shimmer);
  }
  return { queue, shimmerQueue };
}

function calculateBossStars(shotsUsed: number): number {
  if (shotsUsed <= 40) return 3;
  if (shotsUsed <= 70) return 2;
  return 1;
}

function formatCountdown(msRemaining: number): string {
  return `${Math.max(0, Math.ceil(msRemaining / 1000))}s`;
}

export function ElementalBossBoard({
  levelId,
  onExit,
  onWin,
  onMap = onExit,
  mode = "elemental-boss",
}: Props) {
  const isTabletLayout = useIsTabletLayout();
  const level = getLevelById(levelId) ?? getLevelById(BOSS.levelId)!;
  const nextLevel = getNextLevel(level.id)?.id ?? null;
  const fireLockRef = useRef(false);
  const {
    musicEnabled,
    incrementLevelAttempt,
    recordLevelRun,
    reportQuestProgress,
    setChallengeBestScore,
    setLevelStars,
    unlockLevel,
  } = useProgress();
  const [eyeAtoms] = useState<Record<OuterEyeId, number>>(() => createEyeAtoms());
  const [startingQueue] = useState(() => createInitialQueue(eyeAtoms));
  const [queue, setQueue] = useState<number[]>(startingQueue.queue);
  const [shimmerQueue, setShimmerQueue] = useState<boolean[]>(startingQueue.shimmerQueue);
  const [bossHealth, setBossHealth] = useState(BOSS.maxHealth);
  const [shotsUsed, setShotsUsed] = useState(0);
  const [centerCharge, setCenterCharge] = useState(0);
  const [blankCharges, setBlankCharges] = useState(0);
  const [blankArmed, setBlankArmed] = useState(false);
  const [openEyes, setOpenEyes] = useState<OuterEyeId[]>(() => randomOpenEyes());
  const [nextEyeShiftAt, setNextEyeShiftAt] = useState(() => Date.now() + BOSS.openDurationMs);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<BossFlash>(null);
  const [statusText, setStatusText] = useState(
    "Watch the open eyes, charge the core eye, and finish the boss in 100 shots.",
  );
  const [result, setResult] = useState<BossResult>(null);

  const currentAtom = queue[0];
  const currentShimmer = shimmerQueue[0];
  const shotsLeft = Math.max(0, BOSS.maxShots - shotsUsed);
  const healthPct = (bossHealth / BOSS.maxHealth) * 100;
  const chargePct = (centerCharge / BOSS.centerChargeGoal) * 100;
  const openWindowMs = Math.max(0, nextEyeShiftAt - clockNow);
  const matchingOpenEyes = useMemo(
    () => openEyes.filter((eyeId) => eyeAtoms[eyeId] === currentAtom),
    [currentAtom, eyeAtoms, openEyes],
  );

  useEffect(() => {
    incrementLevelAttempt(level.id);
    trackGameStart(level.id, mode);
    primeAudio();
  }, [incrementLevelAttempt, level.id, mode]);

  useEffect(() => {
    if (!musicEnabled) return;
    startAmbientMusic();
    return () => stopAmbientMusic();
  }, [musicEnabled]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (result || clockNow < nextEyeShiftAt) return;
    setOpenEyes(randomOpenEyes());
    setNextEyeShiftAt(clockNow + BOSS.openDurationMs);
  }, [clockNow, nextEyeShiftAt, result]);

  useEffect(() => {
    if (!flash) return;
    const timeoutId = window.setTimeout(() => setFlash(null), flash === "hit" ? 260 : 180);
    return () => window.clearTimeout(timeoutId);
  }, [flash]);

  const consumeQueuedShot = useCallback(() => {
    const nextRoll = rollQueuedShot(eyeAtoms);
    setQueue((current) => [...current.slice(1), nextRoll.atom]);
    setShimmerQueue((current) => [...current.slice(1), nextRoll.shimmer]);
  }, [eyeAtoms]);

  const finishRun = useCallback(
    (won: boolean, finalScore: number, finalShots: number, finalHighest: number) => {
      if (result) return;
      recordLevelRun(level.id, {
        score: finalScore,
        shots: finalShots,
        powerUpsUsed: 0,
        won,
      });
      if (won) {
        const stars = calculateBossStars(finalShots);
        setLevelStars(level.id, stars);
        unlockLevel(nextLevel ?? level.id);
        setChallengeBestScore("elemental-boss", finalScore);
        reportQuestProgress({ levelCleared: true, starsEarned: stars });
        trackLevelWin(level.id, finalScore, finalShots, finalHighest, mode);
        playWinSound();
        vibrate([30, 20, 40, 20, 60]);
        setResult({ won: true, stars, nextLevelId: nextLevel });
        setStatusText("Boss defeated. The lab is safe... for now.");
        return;
      }
      trackGameOver(level.id, finalScore, finalShots, finalHighest, mode);
      vibrate([80, 40, 80]);
      setResult({ won: false, stars: 0, nextLevelId: null });
      setStatusText("The boss outlasted your 100 shots. Regroup and try again.");
    },
    [
      level.id,
      mode,
      nextLevel,
      recordLevelRun,
      reportQuestProgress,
      result,
      setChallengeBestScore,
      setLevelStars,
      unlockLevel,
    ],
  );

  const fireAt = useCallback(
    (target: OuterEyeId | "center") => {
      if (result || shotsUsed >= BOSS.maxShots || fireLockRef.current) return;
      fireLockRef.current = true;
      window.setTimeout(() => {
        fireLockRef.current = false;
      }, 150);

      primeAudio();
      playShootSound();

      const usingBlank = target !== "center" && blankArmed && blankCharges > 0;
      const aimSnapshot = target === "center" ? 0 : OUTER_EYE_IDS.indexOf(target) * 24 - 36;
      trackShot(level.id, usingBlank ? 0 : currentAtom, aimSnapshot, mode);

      let nextHealth = bossHealth;
      let nextCenterCharge = centerCharge;
      let nextBlankCharges = blankCharges;
      let nextBlankArmed = blankArmed;
      let nextScore = score;
      let damage = 0;
      let message = "Missed the weak point.";

      if (target === "center") {
        nextCenterCharge += 1;
        nextScore += CHARGE_SCORE;
        setFlash("charge");
        vibrate(20);
        if (nextCenterCharge >= BOSS.centerChargeGoal) {
          nextCenterCharge = 0;
          nextBlankCharges += 1;
          nextBlankArmed = true;
          message = "Blank atom charged. Your next shot can hit any eye.";
        } else {
          message = `Core charge ${nextCenterCharge}/${BOSS.centerChargeGoal}`;
        }
      } else if (usingBlank) {
        damage = 1;
        nextHealth = Math.max(0, bossHealth - damage);
        nextBlankCharges = Math.max(0, blankCharges - 1);
        nextBlankArmed = false;
        nextScore += BLANK_SCORE;
        message = "Blank atom pierced the boss eye.";
      } else if (openEyes.includes(target) && currentAtom === eyeAtoms[target]) {
        damage = currentShimmer ? 2 : 1;
        nextHealth = Math.max(0, bossHealth - damage);
        nextScore += HIT_SCORE * damage;
        message = currentShimmer ? "Shimmer strike. Two hits landed." : "Direct hit.";
      } else if (openEyes.includes(target)) {
        message = "Wrong atom. Aim for the center eye to charge a Blank shot.";
      } else {
        message = "That eye is closed. Wait for it to open.";
      }

      const nextShots = shotsUsed + 1;
      if (damage > 0) {
        playMergeSound(damage + 1);
        setFlash("hit");
        vibrate(currentShimmer ? [16, 20, 34] : 28);
      }

      if (!usingBlank) consumeQueuedShot();

      setBossHealth(nextHealth);
      setCenterCharge(nextCenterCharge);
      setBlankCharges(nextBlankCharges);
      setBlankArmed(nextBlankArmed);
      setScore(nextScore);
      setShotsUsed(nextShots);
      setStatusText(message);

      if (nextHealth <= 0) {
        finishRun(true, nextScore, nextShots, BOSS.maxEyeElement);
        return;
      }

      if (nextShots >= BOSS.maxShots) {
        finishRun(false, nextScore, nextShots, BOSS.maxEyeElement);
      }
    },
    [
      blankArmed,
      blankCharges,
      bossHealth,
      centerCharge,
      consumeQueuedShot,
      currentAtom,
      currentShimmer,
      eyeAtoms,
      finishRun,
      level.id,
      mode,
      openEyes,
      result,
      score,
      shotsUsed,
    ],
  );

  const actionLabel = blankArmed
    ? "Blank atom armed"
    : matchingOpenEyes.length > 0
      ? `Matching eye ready: ${matchingOpenEyes.length}`
      : "No match. Charge the center eye.";

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100dvh",
        padding: isTabletLayout ? 22 : 14,
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: isTabletLayout ? 940 : 540,
          margin: "0 auto",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={onExit} style={backButton}>
            {"<- Menu"}
          </button>
          <div style={{ flex: 1 }}>
            <div style={eyebrow}>SPECIAL EVENT</div>
            <h1 className="gold-text" style={{ margin: "4px 0 0", fontSize: isTabletLayout ? 34 : 28 }}>
              {BOSS.name}
            </h1>
            <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
              {level.id >= 63 ? `Level ${level.id}` : "Lab event"} - 20 hits to win
            </div>
          </div>
          <div style={counterPill}>
            <Shield size={16} />
            <span>{shotsLeft} shots</span>
          </div>
        </div>

        <section style={bossArenaCard}>
          <div
            style={{
              display: "grid",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 1.1, color: "var(--accent)" }}>
                BOSS VITALS
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                Eyes shift in {formatCountdown(openWindowMs)}
              </div>
            </div>
            <div style={barTrack}>
              <div
                style={{
                  ...barFill,
                  width: `${healthPct}%`,
                  background:
                    "linear-gradient(90deg, oklch(0.67 0.22 24), oklch(0.78 0.18 50))",
                  boxShadow: "0 0 18px var(--danger-glow)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              position: "relative",
              height: isTabletLayout ? 400 : 320,
              borderRadius: 24,
              background:
                flash === "hit"
                  ? "radial-gradient(circle at center, rgba(255,98,98,0.18), transparent 60%), linear-gradient(180deg, rgba(10,10,26,0.96), rgba(15,15,38,0.96))"
                  : flash === "charge"
                    ? "radial-gradient(circle at center, rgba(208,215,224,0.16), transparent 60%), linear-gradient(180deg, rgba(10,10,26,0.96), rgba(15,15,38,0.96))"
                    : "linear-gradient(180deg, rgba(10,10,26,0.96), rgba(15,15,38,0.96))",
              border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "8% 18% 22%",
                borderRadius: "50% 50% 42% 42%",
                background:
                  "radial-gradient(circle at 50% 28%, rgba(84, 115, 255, 0.22), transparent 22%), radial-gradient(circle at 50% 50%, rgba(26, 26, 53, 0.95), rgba(8, 8, 20, 0.98))",
                boxShadow: "inset 0 -22px 40px rgba(0,0,0,0.45), 0 22px 44px rgba(0,0,0,0.32)",
              }}
            />

            {BOSS.outerEyes.map((eye, index) => {
              const swayX = Math.sin(clockNow / 850 + eye.swayPhase) * eye.swayX;
              const swayY = Math.cos(clockNow / 920 + eye.swayPhase) * eye.swayY;
              const isOpen = openEyes.includes(eye.id as OuterEyeId);
              const usingBlankCanHit = blankArmed && blankCharges > 0;
              const enabled = isOpen || usingBlankCanHit;
              const eyeAtom = eyeAtoms[eye.id as OuterEyeId];
              const lineAngle = Math.atan2(
                eye.yPct + swayY / 8 - BOSS.centerEye.yPct,
                eye.xPct + swayX / 8 - BOSS.centerEye.xPct,
              );
              const lineLength = Math.hypot(
                eye.xPct + swayX / 8 - BOSS.centerEye.xPct,
                eye.yPct + swayY / 8 - BOSS.centerEye.yPct,
              );
              return (
                <div key={eye.id}>
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: `${BOSS.centerEye.xPct}%`,
                      top: `${BOSS.centerEye.yPct}%`,
                      width: `${lineLength * 3.2}%`,
                      height: 10,
                      transform: `translate(-2px, -50%) rotate(${lineAngle}rad)`,
                      transformOrigin: "0 50%",
                      borderRadius: 999,
                      background:
                        "linear-gradient(90deg, rgba(100,120,255,0.15), rgba(255,255,255,0.06))",
                      filter: "blur(1px)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fireAt(eye.id as OuterEyeId)}
                    disabled={!enabled}
                    style={{
                      position: "absolute",
                      left: `${eye.xPct}%`,
                      top: `${eye.yPct}%`,
                      transform: `translate(-50%, -50%) translate(${swayX}px, ${swayY}px)`,
                      width: eye.size + 26,
                      height: eye.size + 26,
                      borderRadius: "50%",
                      border: isOpen
                        ? "1px solid rgba(255,214,0,0.65)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: isOpen
                        ? "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.4), rgba(28,28,56,0.96) 66%)"
                        : "radial-gradient(circle at 35% 30%, rgba(210,210,220,0.1), rgba(16,16,38,0.96) 66%)",
                      boxShadow: isOpen
                        ? "0 0 22px rgba(255,214,0,0.22)"
                        : "0 8px 18px rgba(0,0,0,0.26)",
                      display: "grid",
                      placeItems: "center",
                      cursor: enabled ? "pointer" : "default",
                      opacity: enabled ? 1 : 0.74,
                    }}
                  >
                    {isOpen ? (
                      <ElementBall
                        atomicNumber={eyeAtom}
                        size={eye.size}
                        glow
                        shimmer={usingBlankCanHit ? false : currentShimmer && currentAtom === eyeAtom}
                      />
                    ) : (
                      <div
                        style={{
                          width: eye.size,
                          height: eye.size * 0.48,
                          borderRadius: 999,
                          background:
                            "linear-gradient(180deg, rgba(28,28,56,0.9), rgba(6,6,18,0.96))",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      />
                    )}
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => fireAt("center")}
              style={{
                position: "absolute",
                left: `${BOSS.centerEye.xPct}%`,
                top: `${BOSS.centerEye.yPct}%`,
                transform: "translate(-50%, -50%)",
                width: BOSS.centerEye.size + 28,
                height: BOSS.centerEye.size + 28,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.1)",
                background:
                  "radial-gradient(circle at 40% 38%, rgba(255,255,255,0.45), rgba(160,160,176,0.26) 32%, rgba(14,14,30,0.96) 72%)",
                boxShadow:
                  flash === "charge"
                    ? "0 0 30px rgba(208,215,224,0.3)"
                    : "0 16px 34px rgba(0,0,0,0.34)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  width: BOSS.centerEye.size * 0.78,
                  height: BOSS.centerEye.size * 0.78,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 38% 34%, rgba(255,255,255,0.9), rgba(255,255,255,0.6) 16%, rgba(77,105,160,0.85) 17%, rgba(20,20,28,0.98) 58%)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: BOSS.centerEye.size * 0.2,
                    height: BOSS.centerEye.size * 0.46,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.88)",
                  }}
                />
              </div>
            </button>

            <div
              style={{
                position: "absolute",
                left: "50%",
                top: `calc(${BOSS.centerEye.yPct}% + ${BOSS.centerEye.size * 0.56}px)`,
                transform: "translateX(-50%)",
                width: isTabletLayout ? 320 : 240,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)" }}>
                <span>Blank charge</span>
                <span>
                  {centerCharge}/{BOSS.centerChargeGoal}
                </span>
              </div>
              <div style={barTrack}>
                <div
                  style={{
                    ...barFill,
                    width: `${chargePct}%`,
                    background:
                      "linear-gradient(90deg, rgba(196, 205, 220, 0.88), rgba(255,255,255,0.92))",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                insetInline: 18,
                bottom: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTabletLayout ? "1.2fr auto" : "1fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={statusCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Swords size={16} color="var(--accent)" />
                    <div style={{ fontWeight: 800 }}>{actionLabel}</div>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{statusText}</div>
                </div>
                <button
                  type="button"
                  disabled={blankCharges <= 0}
                  onClick={() => setBlankArmed((current) => (blankCharges > 0 ? !current : false))}
                  style={{
                    ...blankButton,
                    opacity: blankCharges > 0 ? 1 : 0.55,
                    background: blankArmed
                      ? "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(176, 205, 255, 0.95))"
                      : blankButton.background,
                    color: blankArmed ? "#09101f" : "var(--foreground)",
                  }}
                >
                  <Sparkles size={18} />
                  <span>{blankArmed ? "Blank armed" : `Use Blank x${blankCharges}`}</span>
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isTabletLayout ? "1.1fr 1fr" : "1fr",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={queueCard}>
                  <div style={{ fontWeight: 850, fontSize: 12, letterSpacing: 1.2, color: "var(--accent)" }}>
                    CURRENT SHOT
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {blankArmed ? (
                        <div style={blankAtomVisual}>
                          <Sparkles size={22} />
                          <span style={{ fontSize: 12, fontWeight: 900 }}>BLANK</span>
                        </div>
                      ) : (
                        <ElementBall
                          atomicNumber={currentAtom}
                          size={62}
                          glow
                          shimmer={currentShimmer}
                        />
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
                        Shoot a matching open eye for damage. Shoot the center eye if you need a Blank atom.
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {queue.slice(1).map((atom, index) => (
                          <div
                            key={`${atom}-${index}`}
                            style={{
                              width: 54,
                              height: 54,
                              display: "grid",
                              placeItems: "center",
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <ElementBall
                              atomicNumber={atom}
                              size={38}
                              shimmer={shimmerQueue[index + 1]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={factCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Eye size={16} color="var(--accent)" />
                    <div style={{ fontWeight: 850, fontSize: 12, letterSpacing: 1.2, color: "var(--accent)" }}>
                      KNOWN WEAK POINTS
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {OUTER_EYE_IDS.map((eyeId) => (
                      <div key={eyeId} style={weakPointRow}>
                        <span style={{ color: openEyes.includes(eyeId) ? "var(--foreground)" : "var(--muted-foreground)" }}>
                          {eyeId.replace("-", " ")}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <ElementBall atomicNumber={eyeAtoms[eyeId]} size={28} />
                          <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                            {ELEMENTS[eyeAtoms[eyeId] - 1]?.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {result && (
          <section style={resultCard}>
            <div style={eyebrow}>{result.won ? "BOSS DOWN" : "RUN FAILED"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: isTabletLayout ? 32 : 28 }}>
              {result.won ? "The Elemental Boss is defeated." : "The lab needs another try."}
            </h2>
            <p style={{ color: "var(--muted-foreground)", margin: "8px 0 0" }}>
              Score {score} - Shots used {shotsUsed} - {result.won ? `${result.stars} stars` : "0 stars"}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              <button type="button" onClick={onExit} style={secondaryButton}>
                Back to menu
              </button>
              <button type="button" onClick={() => onWin(level.id)} style={secondaryButton}>
                Retry
              </button>
              {result.won && result.nextLevelId ? (
                <button type="button" onClick={() => onWin(result.nextLevelId)} style={primaryButton}>
                  Continue
                </button>
              ) : result.won ? (
                <button type="button" onClick={onMap} style={primaryButton}>
                  Open map
                </button>
              ) : null}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const backButton: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(20,20,38,0.9)",
  color: "var(--foreground)",
  borderRadius: 16,
  padding: "12px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const eyebrow: CSSProperties = {
  fontSize: 12,
  letterSpacing: 2.4,
  color: "var(--accent)",
  fontWeight: 900,
};

const counterPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 999,
  background: "rgba(18,18,40,0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  fontWeight: 850,
};

const bossArenaCard: CSSProperties = {
  borderRadius: 28,
  padding: 18,
  background: "linear-gradient(180deg, rgba(24,24,52,0.98), rgba(14,14,30,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 48px rgba(0,0,0,0.32)",
};

const barTrack: CSSProperties = {
  width: "100%",
  height: 12,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  overflow: "hidden",
};

const barFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  transition: "width 180ms ease-out",
};

const statusCard: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(12,12,28,0.76)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const blankButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  minHeight: 54,
  borderRadius: 18,
  padding: "0 18px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "linear-gradient(135deg, rgba(36,40,92,0.96), rgba(16,20,44,0.96))",
  color: "var(--foreground)",
  fontWeight: 850,
  cursor: "pointer",
};

const queueCard: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 16,
  borderRadius: 20,
  background: "rgba(16,16,38,0.82)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const factCard: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 16,
  borderRadius: 20,
  background: "rgba(16,16,38,0.82)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const weakPointRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
};

const blankAtomVisual: CSSProperties = {
  width: 68,
  height: 68,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  gap: 2,
  background:
    "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95), rgba(176,205,255,0.86) 40%, rgba(50,80,160,0.92) 76%)",
  color: "#071322",
  boxShadow: "0 0 24px rgba(180, 214, 255, 0.34)",
};

const resultCard: CSSProperties = {
  borderRadius: 24,
  padding: 20,
  background: "rgba(16,16,38,0.96)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
};

const secondaryButton: CSSProperties = {
  borderRadius: 16,
  padding: "12px 18px",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(28,28,56,0.9)",
  color: "var(--foreground)",
  fontWeight: 850,
  cursor: "pointer",
};

const primaryButton: CSSProperties = {
  ...secondaryButton,
  background: "linear-gradient(135deg, rgba(79,195,247,0.96), rgba(120,225,255,0.92))",
  color: "#07101d",
  border: "none",
};
