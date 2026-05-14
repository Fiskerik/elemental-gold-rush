import { useEffect } from "react";
import { LEVELS } from "./levels";
import { useProgress } from "./store";
import { formatScore } from "./logic";
import { ELEMENTS } from "./elements";
import { trackMenuAction } from "./analytics";

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onSettings: () => void;
  onShop: () => void;
  onLab: () => void;
  onLibrary: () => void;
  onProfile: () => void;
}

export function MainMenu({
  onPlay,
  onLevels,
  onCollection,
  onSettings,
  onShop,
  onLab,
  onLibrary,
  onProfile,
}: Props) {
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
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          minHeight: "100dvh",
          paddingBottom: 24,
        }}
      >
        <header
          style={{
            textAlign: "center",
            marginTop: 18,
            padding: "20px 16px",
            borderRadius: 26,
            background:
              "radial-gradient(circle at top, oklch(0.72 0.14 85 / 0.18), transparent 58%), linear-gradient(135deg, var(--surface-elevated), var(--surface))",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
          }}
        >
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => {
                trackMenuAction("continue");
                onPlay();
              }}
              style={heroPlayBtn}
            >
              ▶ Continue Level {unlockedLevel}
            </button>
            <button
              onClick={() => {
                trackMenuAction("profile");
                onProfile();
              }}
              style={profileBtn}
              aria-label="Open profile"
            >
              👤
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Stat label="Highest" value={highestEl?.symbol ?? "H"} sub={`#${highestElement}`} />
          <Stat label="Score" value={formatScore(totalScore)} sub="total" />
          <Stat label="Combo" value={`${bestCombo}`} sub="best" />
        </div>

        <section
          style={{
            background: "linear-gradient(135deg, var(--surface-elevated), var(--surface))",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2,
              color: "var(--accent)",
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            MISSION BRIEFING
          </div>
          <div
            style={{
              display: "grid",
              gap: 8,
              fontSize: 12,
              color: "var(--muted-foreground)",
              lineHeight: 1.45,
            }}
          >
            <div>🎯 Aim from the launcher, release to shoot, and bounce shots off walls.</div>
            <div>⚛️ Match touching atoms with the same element to fuse into the next element.</div>
            <div>
              🚧 Keep atoms above the red danger zone and use power-ups to rescue crowded boards.
            </div>
          </div>
        </section>

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
          <section style={nextRunCard}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 2, fontWeight: 900 }}>
                NEXT RUN
              </div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>
                Level {unlockedLevel} — {nextLevel?.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {nextLevel?.description}
              </div>
            </div>
            <button
              onClick={() => {
                trackMenuAction("continue");
                onPlay();
              }}
              style={smallPlayBtn}
            >
              Play
            </button>
          </section>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BigButton
              onClick={() => {
                trackMenuAction("levels");
                onLevels();
              }}
            >
              Levels
            </BigButton>
            <BigButton
              onClick={() => {
                trackMenuAction("collection");
                onCollection();
              }}
            >
              Collection
            </BigButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <BigButton
              onClick={() => {
                trackMenuAction("lab");
                onLab();
              }}
            >
              Lab Modes
            </BigButton>
            <BigButton
              onClick={() => {
                trackMenuAction("library");
                onLibrary();
              }}
            >
              Game Library
            </BigButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <BigButton
              onClick={() => {
                trackMenuAction("profile");
                onProfile();
              }}
            >
              Profile
            </BigButton>
            <BigButton
              onClick={() => {
                trackMenuAction("shop");
                onShop();
              }}
            >
              {hasProPack ? "Pro" : "Shop"}
            </BigButton>
            <BigButton
              onClick={() => {
                trackMenuAction("settings");
                onSettings();
              }}
            >
              Settings
            </BigButton>
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

const heroPlayBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 16,
  padding: "13px 16px",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  boxShadow: "0 10px 26px var(--primary-glow)",
  fontWeight: 900,
  cursor: "pointer",
};

const profileBtn: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "0 14px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontSize: 20,
  cursor: "pointer",
};

const nextRunCard: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: 14,
  padding: 16,
  borderRadius: 18,
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  boxShadow: "0 10px 30px var(--primary-glow)",
};

const smallPlayBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "10px 14px",
  background: "rgba(255,255,255,0.22)",
  color: "var(--primary-foreground)",
  fontWeight: 900,
  cursor: "pointer",
};

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
