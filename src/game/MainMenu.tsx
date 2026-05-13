import { useEffect } from "react";
import { LEVELS } from "./levels";
import { useProgress } from "./store";
import { formatScore } from "./logic";
import { ELEMENTS } from "./elements";

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onSettings: () => void;
  onShop: () => void;
}

export function MainMenu({ onPlay, onLevels, onCollection, onSettings, onShop }: Props) {
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    dailyQuests,
    dailyStreak,
    claimedDailyReward,
    bestCombo,
    hasProPack,
    refreshDailyLab,
    claimDailyReward,
  } = useProgress();
  const highestEl = ELEMENTS[highestElement - 1];
  const nextLevel = LEVELS[Math.min(unlockedLevel - 1, LEVELS.length - 1)];
  const completedDailyQuests = dailyQuests.filter((quest) => quest.completed).length;
  const dailyComplete = dailyQuests.length > 0 && completedDailyQuests === dailyQuests.length;

  useEffect(() => {
    refreshDailyLab();
  }, [refreshDailyLab]);

  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          minHeight: "100dvh",
          paddingBottom: 24,
        }}
      >
        <header style={{ textAlign: "center", marginTop: 24 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 4,
              color: "var(--muted-foreground)",
              marginBottom: 6,
            }}
          >
            ATOMIC FUSION • LV {unlockedLevel}
          </div>
          <h1
            className="gold-text"
            style={{
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: -1,
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Elemental
            <br />
            Gold Rush
          </h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: 10, fontSize: 13 }}>
            Fuse atoms. Forge the periodic table. Reach gold.
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Stat label="Highest" value={highestEl?.symbol ?? "H"} sub={`#${highestElement}`} />
          <Stat label="Score" value={formatScore(totalScore)} sub="total" />
          <Stat label="Combo" value={`${bestCombo}`} sub="best" />
        </div>

        <section
          style={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", fontWeight: 800 }}
              >
                DAILY LAB
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Streak: {dailyStreak} • {completedDailyQuests}/{dailyQuests.length} quests
              </div>
            </div>
            <button
              onClick={claimDailyReward}
              disabled={!dailyComplete || claimedDailyReward}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "8px 10px",
                background:
                  dailyComplete && !claimedDailyReward
                    ? "linear-gradient(135deg, var(--accent), var(--primary))"
                    : "var(--surface-high)",
                color:
                  dailyComplete && !claimedDailyReward
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
                fontSize: 11,
                fontWeight: 800,
                cursor: dailyComplete && !claimedDailyReward ? "pointer" : "not-allowed",
              }}
            >
              {claimedDailyReward ? "Claimed" : "Claim"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dailyQuests.map((quest) => (
              <div
                key={quest.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "20px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <span>{quest.completed ? "✅" : "⚗️"}</span>
                <span>{quest.title}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                  {quest.progress}/{quest.target}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <BigButton primary onClick={onPlay}>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 2 }}>CONTINUE</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Level {unlockedLevel} — {nextLevel?.name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {nextLevel?.description}
            </div>
          </BigButton>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BigButton onClick={onLevels}>Levels</BigButton>
            <BigButton onClick={onCollection}>Collection</BigButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BigButton onClick={onShop}>{hasProPack ? "Pro Lab Active" : "Shop"}</BigButton>
            <BigButton onClick={onSettings}>Settings</BigButton>
          </div>
        </div>

        <footer
          style={{
            marginTop: "auto",
            textAlign: "center",
            color: "var(--muted-foreground)",
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          Tap a column to drop your element. Match neighbors to fuse.
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 10, letterSpacing: 1.5, color: "var(--muted-foreground)" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)", marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{sub}</div>}
    </div>
  );
}

function BigButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "16px 18px",
        borderRadius: 14,
        border: "1px solid " + (primary ? "transparent" : "var(--border)"),
        background: primary
          ? "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))"
          : "var(--surface)",
        color: primary ? "var(--primary-foreground)" : "var(--foreground)",
        boxShadow: primary ? "0 8px 24px var(--primary-glow)" : "0 2px 8px rgba(0,0,0,0.3)",
        cursor: "pointer",
        fontSize: 16,
        fontWeight: 700,
        transition: "transform 0.1s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}
