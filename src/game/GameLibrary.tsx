import { useState } from "react";
import { Atom, Clock, FlaskConical, LockKeyhole, Map, RotateCcw, Shield, type LucideIcon } from "lucide-react";
import { GAME_MODES } from "./challenges";
import { PowerUpBadge } from "./PowerUpLibrary";
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
                  <div style={iconWrap}>
                    <ChallengeIcon id={mode.id} />
                  </div>
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
                  <PowerUpBadge icon={powerUp.icon} size={46} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>{powerUp.name}</h2>
                  </div>
                  <p style={{ ...description, marginBottom: 0 }}>{powerUp.description}</p>
                  <div style={{ color: "var(--accent)", fontSize: 11, fontWeight: 900 }}>
                    Obtained: {powerUp.unlock}
                  </div>
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

const CHALLENGE_ICONS: Record<string, LucideIcon> = {
  campaign: Map,
  survival: Shield,
  "unstable-isotopes": Atom,
  "gravity-surge": RotateCcw,
  "pure-hydrogen": FlaskConical,
  "noble-gas-lock": LockKeyhole,
  "gold-rush-timer": Clock,
  "isotope-decay": Atom,
};

const CHALLENGE_ICON_STYLES: Record<string, { color: string; background: string; glow: string }> = {
  survival: {
    color: "oklch(0.88 0.18 150)",
    background: "radial-gradient(circle at 30% 22%, oklch(0.9 0.19 150), transparent 34%), linear-gradient(135deg, oklch(0.46 0.18 155), oklch(0.3 0.12 200))",
    glow: "oklch(0.72 0.16 155 / 0.5)",
  },
  "unstable-isotopes": {
    color: "oklch(0.9 0.19 55)",
    background: "radial-gradient(circle at 30% 24%, oklch(0.95 0.2 65), transparent 35%), linear-gradient(135deg, oklch(0.58 0.21 35), oklch(0.36 0.16 330))",
    glow: "oklch(0.76 0.18 42 / 0.52)",
  },
  "gravity-surge": {
    color: "oklch(0.9 0.15 255)",
    background: "radial-gradient(circle at 70% 22%, oklch(0.86 0.16 245), transparent 34%), linear-gradient(135deg, oklch(0.5 0.17 260), oklch(0.34 0.14 300))",
    glow: "oklch(0.68 0.16 260 / 0.52)",
  },
  "pure-hydrogen": {
    color: "oklch(0.95 0.13 205)",
    background: "radial-gradient(circle at 28% 22%, white, transparent 32%), linear-gradient(135deg, oklch(0.7 0.14 205), oklch(0.38 0.12 230))",
    glow: "oklch(0.78 0.14 210 / 0.52)",
  },
  "noble-gas-lock": {
    color: "oklch(0.91 0.13 305)",
    background: "radial-gradient(circle at 32% 20%, oklch(0.88 0.18 315), transparent 33%), linear-gradient(135deg, oklch(0.48 0.16 305), oklch(0.3 0.1 255))",
    glow: "oklch(0.7 0.15 305 / 0.5)",
  },
  "gold-rush-timer": {
    color: "oklch(0.92 0.18 88)",
    background: "radial-gradient(circle at 72% 22%, oklch(0.98 0.18 95), transparent 35%), linear-gradient(135deg, oklch(0.68 0.18 75), oklch(0.45 0.16 35))",
    glow: "oklch(0.78 0.18 80 / 0.55)",
  },
  "isotope-decay": {
    color: "oklch(0.9 0.18 135)",
    background: "radial-gradient(circle at 32% 26%, oklch(0.9 0.19 135), transparent 34%), linear-gradient(135deg, oklch(0.5 0.17 135), oklch(0.34 0.14 175))",
    glow: "oklch(0.72 0.17 140 / 0.52)",
  },
};

function ChallengeIcon({ id }: { id: string }) {
  const Icon = CHALLENGE_ICONS[id] ?? FlaskConical;
  const style = CHALLENGE_ICON_STYLES[id] ?? CHALLENGE_ICON_STYLES.survival;
  return (
    <div
      aria-hidden="true"
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: style.background,
        boxShadow: `0 8px 20px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.24)`,
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <Icon size={25} color={style.color} strokeWidth={2.7} />
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
