import { useState } from "react";
import { LEVELS } from "./levels";
import { ELEMENTS } from "./elements";
import { useProgress, type LevelStats } from "./store";
import { ElementBall } from "./ElementBall";
import { formatScore } from "./logic";

export function LevelSelect({
  onPick,
  onBack,
}: {
  onPick: (id: number) => void;
  onBack: () => void;
}) {
  const { unlockedLevel, levelStars, levelStats } = useProgress();
  const [statsOpenId, setStatsOpenId] = useState<number | null>(null);
  return (
    <div className="app-shell" style={{ padding: 16 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto" }}>
        <Header title="Levels" onBack={onBack} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>
          {LEVELS.map((lvl) => {
            const locked = lvl.id > unlockedLevel;
            const target = ELEMENTS[lvl.targetElement - 1];
            const stars = levelStars[lvl.id] ?? 0;
            const stats = levelStats[lvl.id];
            const hasStats = !!stats && stats.attempts > 0;
            const statsOpen = statsOpenId === lvl.id && hasStats;
            return (
              <div
                key={lvl.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: 12,
                  background: locked ? "var(--surface)" : "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  opacity: locked ? 0.45 : 1,
                  color: "var(--foreground)",
                }}
              >
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onPick(lvl.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    cursor: locked ? "not-allowed" : "pointer",
                    color: "inherit",
                  }}
                >
                  <div style={{ filter: locked ? "grayscale(0.8)" : undefined }}>
                    <ElementBall atomicNumber={lvl.targetElement} size={48} glow={!locked} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      LEVEL {lvl.id}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{lvl.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                      {lvl.description}
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      minWidth: 52,
                    }}
                  >
                    {locked ? (
                      "🔒"
                    ) : (
                      <>
                        <div>{`→ ${target?.symbol}`}</div>
                        <div
                          style={{
                            color: stars > 0 ? "var(--accent)" : "var(--muted-foreground)",
                            letterSpacing: 1,
                          }}
                        >
                          {Array.from({ length: 3 }, (_, i) =>
                            i < stars ? "★" : "☆",
                          ).join("")}
                        </div>
                      </>
                    )}
                  </div>
                </button>
                {!locked && hasStats && (
                  <button
                    type="button"
                    onClick={() => setStatsOpenId(statsOpen ? null : lvl.id)}
                    style={{
                      alignSelf: "flex-start",
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--muted-foreground)",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {statsOpen ? "Hide stats ▴" : "Show stats ▾"}
                  </button>
                )}
                {statsOpen && stats && <StatsGrid stats={stats} />}
              </div>
            );
          })}
        </div>
      </div>
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
      <StatCell
        label="Best Run"
        value={stats.bestShots != null ? `${stats.bestShots} shots` : "—"}
      />
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
