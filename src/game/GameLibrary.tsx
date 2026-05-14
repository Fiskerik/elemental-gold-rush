import { useState } from "react";
import { GAME_MODES } from "./challenges";
import { PowerUpIcon } from "./PowerUpLibrary";
import { POWER_UPS } from "./powerUps";
import { useProgress } from "./store";

interface Props {
  onBack: () => void;
}

export function GameLibrary({ onBack }: Props) {
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const [tab, setTab] = useState<"challenges" | "powerups">("challenges");

  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtn}>
          ← Menu
        </button>
        <header style={{ textAlign: "center", margin: "18px 0 20px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}>
            GAME LIBRARY
          </div>
          <h1 className="gold-text" style={{ margin: "6px 0", fontSize: 34 }}>
            Challenges & Power-Ups
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: 0 }}>
            Browse every challenge rule set and learn what each lab tool does.
          </p>
        </header>

        <div style={tabBar}>
          <button
            onClick={() => setTab("challenges")}
            style={{ ...tabBtn, ...(tab === "challenges" ? tabBtnActive : {}) }}
          >
            Challenges
          </button>
          <button
            onClick={() => setTab("powerups")}
            style={{ ...tabBtn, ...(tab === "powerups" ? tabBtnActive : {}) }}
          >
            Power-Ups
          </button>
        </div>

        {tab === "challenges" && (
          <section style={sectionCard}>
            <div style={{ display: "grid", gap: 12 }}>
            {GAME_MODES.filter((mode) => mode.kind !== "campaign").map((mode) => {
              const locked = unlockedLevel < mode.unlockedAtLevel;
              return (
                <article key={mode.id} style={{ ...rowCard, opacity: locked ? 0.58 : 1 }}>
                  <div style={iconWrap}>{mode.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 16 }}>{mode.name}</h2>
                      <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 900 }}>
                        {locked ? `UNLOCKS LV ${mode.unlockedAtLevel}` : mode.kind.toUpperCase()}
                      </span>
                    </div>
                    <p style={description}>{mode.description}</p>
                    <ul style={rulesList}>
                      {mode.rules.map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
            </div>
          </section>
        )}

        {tab === "powerups" && (
          <section style={sectionCard}>
            <div style={{ display: "grid", gap: 12 }}>
            {POWER_UPS.map((powerUp) => (
              <article key={powerUp.name} style={rowCard}>
                <div style={iconWrap}>
                  <PowerUpIcon icon={powerUp.icon} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>{powerUp.name}</h2>
                    <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 900 }}>
                      {powerUp.unlock}
                    </span>
                  </div>
                  <p style={{ ...description, marginBottom: 0 }}>{powerUp.description}</p>
                </div>
              </article>
            ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const sectionCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 20,
  background: "linear-gradient(135deg, var(--surface-elevated), var(--surface))",
  border: "1px solid var(--border)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.24)",
  marginBottom: 16,
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  marginBottom: 16,
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  background: "transparent",
  color: "var(--muted-foreground)",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--primary), var(--accent))",
  color: "var(--primary-foreground)",
  boxShadow: "0 4px 14px var(--primary-glow)",
};

const rowCard: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 14,
  borderRadius: 16,
  background: "var(--surface)",
  border: "1px solid var(--border)",
};

const iconWrap: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  fontWeight: 900,
  flex: "0 0 auto",
};

const description: React.CSSProperties = {
  margin: "6px 0",
  color: "var(--muted-foreground)",
  fontSize: 13,
  lineHeight: 1.45,
};

const rulesList: React.CSSProperties = {
  margin: "0 0 0 16px",
  padding: 0,
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.45,
};
