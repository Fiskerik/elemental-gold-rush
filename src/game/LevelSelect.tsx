import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { LEVELS, MOLECULE_CHALLENGE_BY_LEVEL } from "./levels";
import { ELEMENTS } from "./elements";
import { useProgress, type LevelStats } from "./store";
import { ElementBall } from "./ElementBall";
import { formatScore } from "./logic";
import { COMPOUNDS, type CompoundDefinition } from "./compounds";
import { MoleculeVisual } from "./MoleculeVisual";
import { PowerUpBadge } from "./PowerUpLibrary";
import { useIsTabletLayout } from "./responsive";

function getMoleculeChallenge(levelId: number): CompoundDefinition | null {
  const id = MOLECULE_CHALLENGE_BY_LEVEL[levelId];
  return id ? (COMPOUNDS.find((compound) => compound.id === id) ?? null) : null;
}

export function LevelSelect({
  onPick,
  onBack,
}: {
  onPick: (id: number) => void;
  onBack: () => void;
}) {
  const isTabletLayout = useIsTabletLayout();
  const { unlockedLevel, levelStars, levelStats, goldCoins, skipLevelForCoins } = useProgress();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  const MAP_W = isTabletLayout ? 700 : 360;
  const ROW_H = isTabletLayout ? 110 : 86;
  const COLS = [0.16, 0.39, 0.61, 0.84];
  const nodes = useMemo(
    () =>
      LEVELS.map((lvl, i) => {
        const row = Math.floor(i / COLS.length);
        const colInRow = i % COLS.length;
        const colIdx = row % 2 === 0 ? colInRow : COLS.length - 1 - colInRow;
        return {
          lvl,
          x: COLS[colIdx] * MAP_W,
          y: 58 + row * ROW_H,
        };
      }),
    [MAP_W, ROW_H],
  );
  const mapRows = Math.ceil(LEVELS.length / COLS.length);
  const mapH = 112 + (mapRows - 1) * ROW_H;

  const pathD = useMemo(() => {
    if (nodes.length === 0) return "";
    let d = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const cur = nodes[i];
      const midY = (prev.y + cur.y) / 2;
      d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
    }
    return d;
  }, [nodes]);

  const selected = selectedId != null ? LEVELS.find((l) => l.id === selectedId) : null;
  const selectedChallenge = selected ? getMoleculeChallenge(selected.id) : null;
  const selectedStats = selectedId != null ? levelStats[selectedId] : undefined;
  const selectedStars = selectedId != null ? (levelStars[selectedId] ?? 0) : 0;
  const canSkipLevel =
    Boolean(selected) &&
    selected.id === unlockedLevel &&
    selectedStars === 0 &&
    (selectedStats?.fails ?? 0) > 0;

  function closeModal() {
    setSelectedId(null);
    setStatsOpen(false);
    setModalMessage("");
  }

  function handleSkipLevel() {
    if (!selected) return;
    if (!canSkipLevel) {
      setModalMessage("Skip unlocks after at least one failed attempt on this current stage.");
      return;
    }
    const skipped = skipLevelForCoins(selected.id, 5);
    if (!skipped) {
      setModalMessage("You need 5 gold coins to skip this stage.");
      return;
    }
    closeModal();
  }

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 24 : 16 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 920 : 480, margin: "0 auto" }}>
        <Header title="Campaign Map" onBack={onBack} />
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: 24,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: `${MAP_W} / ${mapH}`,
              background:
                "radial-gradient(circle at 20% 18%, oklch(0.78 0.16 85 / 0.22), transparent 16%)," +
                "radial-gradient(circle at 84% 24%, oklch(0.68 0.18 210 / 0.18), transparent 15%)," +
                "radial-gradient(circle at 72% 84%, oklch(0.72 0.18 145 / 0.16), transparent 18%)," +
                "linear-gradient(155deg, oklch(0.18 0.04 245), oklch(0.12 0.03 260) 48%, oklch(0.18 0.05 70))",
              border: "1px solid var(--border)",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                maskImage: "linear-gradient(180deg, transparent, black 12%, black 88%, transparent)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "5% 8%",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                transform: "rotate(-12deg)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "16% 14%",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 999,
                transform: "rotate(18deg)",
              }}
            />
            <svg
              viewBox={`0 0 ${MAP_W} ${mapH}`}
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <defs>
                <linearGradient id="mapPathBg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.18 230)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="oklch(0.72 0.18 85)" stopOpacity="0.6" />
                </linearGradient>
              </defs>
              <path
                d={pathD}
                fill="none"
                stroke="oklch(0.09 0.02 250 / 0.75)"
                strokeWidth={9}
                strokeLinecap="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke="url(#mapPathBg)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="6 6"
              />
            </svg>
            {nodes.map(({ lvl, x, y }) => {
              const locked = lvl.id > unlockedLevel;
              const stars = levelStars[lvl.id] ?? 0;
              const isCurrent = lvl.id === unlockedLevel && !locked;
              const challenge = getMoleculeChallenge(lvl.id);
              const isChallenge = challenge != null;
              const isPowerUpStage = lvl.powerUpStage != null;
              const isBossStage = lvl.specialStage === "elemental-boss";
              return (
                <button
                  key={lvl.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setSelectedId(lvl.id)}
                  style={{
                    position: "absolute",
                    left: `${(x / MAP_W) * 100}%`,
                    top: `${(y / mapH) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: locked ? "not-allowed" : "pointer",
                    filter: locked ? "grayscale(0.85) brightness(0.65)" : undefined,
                  }}
                  aria-label={`Level ${lvl.id} ${lvl.name}`}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 50,
                      height: 50,
                      borderRadius: isChallenge || isPowerUpStage || isBossStage ? 13 : "50%",
                      background: "var(--surface)",
                      border: `2px solid ${
                        isCurrent
                          ? "var(--accent)"
                          : locked
                            ? "var(--border)"
                            : "var(--primary)"
                      }`,
                      boxShadow: isCurrent
                        ? "0 0 18px var(--accent)"
                        : locked
                          ? "0 4px 10px rgba(0,0,0,0.45)"
                          : "0 6px 14px var(--primary-glow)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      animation: isCurrent ? "decay-warn-flash 1.6s ease-in-out infinite" : undefined,
                    }}
                  >
                    {isBossStage ? (
                      <BossMapNode />
                    ) : isPowerUpStage && lvl.powerUpStage ? (
                      <PowerUpMapNode powerUp={lvl.powerUpStage} />
                    ) : isChallenge && challenge ? (
                      <ChallengeMapNode compound={challenge} />
                    ) : locked ? (
                      <div style={{ fontSize: 22 }}>🔒</div>
                    ) : (
                      <ElementBall atomicNumber={lvl.targetElement} size={38} glow />
                    )}
                    {locked && (isChallenge || isPowerUpStage || isBossStage) && (
                      <div
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          right: -5,
                          bottom: -5,
                          width: 20,
                          height: 20,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          fontSize: 11,
                          fontWeight: 900,
                        }}
                      >
                        🔒
                      </div>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        top: -10,
                        right: -8,
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 999,
                        padding: "2px 6px",
                        fontSize: 10,
                        fontWeight: 900,
                        color: "var(--foreground)",
                      }}
                    >
                      {lvl.id}
                    </div>
                  </div>
                  {!locked && (
                    <div
                      style={{
                        marginTop: 4,
                        textAlign: "center",
                        fontSize: 11,
                        letterSpacing: 1,
                        color: stars > 0 ? "var(--accent)" : "var(--muted-foreground)",
                        fontWeight: 800,
                      }}
                    >
                      {Array.from({ length: 3 }, (_, i) => (i < stars ? "★" : "☆")).join("")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selected && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              zIndex: 50,
              padding: 16,
            }}
            onClick={closeModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: isTabletLayout ? 560 : 440,
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 18,
                color: "var(--foreground)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {selected.specialStage === "elemental-boss" ? (
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--surface)",
                      border: "2px solid var(--accent)",
                      boxShadow: "0 0 18px var(--accent-glow)",
                    }}
                  >
                    <Eye size={34} color="var(--accent)" />
                  </div>
                ) : selected.powerUpStage ? (
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--surface)",
                      border: "2px solid var(--accent)",
                      boxShadow: "0 0 18px var(--accent-glow)",
                    }}
                  >
                    <PowerUpBadge icon={selected.powerUpStage} size={42} />
                  </div>
                ) : selectedChallenge ? (
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--surface)",
                      border: "2px solid var(--accent)",
                      boxShadow: "0 0 18px var(--accent-glow)",
                    }}
                  >
                    <MoleculeVisual compound={selectedChallenge} size={46} />
                  </div>
                ) : (
                  <ElementBall atomicNumber={selected.targetElement} size={56} glow />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", letterSpacing: 1 }}>
                    LEVEL {selected.id} {"→"} {selected.specialStage === "elemental-boss" ? "BOSS" : ELEMENTS[selected.targetElement - 1]?.symbol}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{selected.name}</div>
                  <div
                    style={{
                      color: selectedStars > 0 ? "var(--accent)" : "var(--muted-foreground)",
                      letterSpacing: 2,
                      fontWeight: 800,
                    }}
                  >
                    {Array.from({ length: 3 }, (_, i) => (i < selectedStars ? "★" : "☆")).join("")}
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted-foreground)",
                  margin: "10px 0 14px",
                  lineHeight: 1.4,
                }}
              >
                {selected.description}
              </p>

              {!selected.powerUpStage && selectedStats && selectedStats.attempts > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStatsOpen((v) => !v)}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--muted-foreground)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      marginBottom: 10,
                    }}
                  >
                    {statsOpen ? "Hide stats ▲" : "Show stats ▼"}
                  </button>
                  {statsOpen && <StatsGrid stats={selectedStats} />}
                </>
              )}

              {modalMessage && (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted-foreground)" }}>
                  {modalMessage}
                </p>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    flex: 1,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMessage("");
                    onPick(selected.id);
                  }}
                  style={{
                    flex: 1.2,
                    background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
                    color: "var(--primary-foreground)",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Play ▶
                </button>
                <button
                  type="button"
                  onClick={handleSkipLevel}
                  disabled={!canSkipLevel || goldCoins < 5}
                  style={{
                    flex: 1,
                    background:
                      canSkipLevel && goldCoins >= 5
                        ? "linear-gradient(135deg, var(--accent), var(--primary))"
                        : "var(--surface-high)",
                    color:
                      canSkipLevel && goldCoins >= 5
                        ? "var(--primary-foreground)"
                        : "var(--muted-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "12px 10px",
                    fontWeight: 900,
                    cursor: canSkipLevel && goldCoins >= 5 ? "pointer" : "not-allowed",
                  }}
                  title="Skip this stage with 0 stars"
                >
                  Skip 5 coins
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengeMapNode({ compound }: { compound: CompoundDefinition }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--accent) 28%, var(--surface)), var(--surface-high))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)",
      }}
    >
      <MoleculeVisual compound={compound} size={34} />
    </div>
  );
}

function PowerUpMapNode({ powerUp }: { powerUp: NonNullable<(typeof LEVELS)[0]["powerUpStage"]> }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--primary) 28%, var(--surface)), var(--surface-high))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 12px var(--accent-glow)",
      }}
    >
      <PowerUpBadge icon={powerUp} size={32} />
    </div>
  );
}

function BossMapNode() {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        display: "grid",
        placeItems: "center",
        background:
          "linear-gradient(135deg, color-mix(in oklch, var(--accent) 24%, var(--surface)), color-mix(in oklch, var(--primary) 22%, var(--surface-high)))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 14px var(--accent-glow)",
      }}
    >
      <Eye size={24} color="var(--foreground)" />
    </div>
  );
}

function StatsGrid({ stats }: { stats: LevelStats }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 6,
        width: "100%",
        paddingTop: 8,
        borderTop: "1px solid var(--border)",
      }}
    >
      <StatCell label="Attempts" value={`${stats.attempts}`} />
      <StatCell label="Max Score" value={formatScore(stats.maxScore)} />
      <StatCell label="Best Run" value={stats.bestShots != null ? `${stats.bestShots} shots` : "—"} />
      <StatCell label="Fails" value={`${stats.fails}`} />
      <StatCell label="Power-ups" value={`${stats.powerUpsUsed}`} />
      <StatCell label="Total Score" value={formatScore(stats.totalScore)} />
      <StatCell label="Stars" value={`${stats.stars}/3`} />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "6px 8px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 1,
          color: "var(--muted-foreground)",
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--foreground)", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
      <button
        onClick={onBack}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
          borderRadius: 10,
          padding: "6px 12px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ← Back
      </button>
      <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>{title}</h1>
    </div>
  );
}
