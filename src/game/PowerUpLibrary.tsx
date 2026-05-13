import { ElementBall } from "./ElementBall";

interface Props {
  onBack: () => void;
}

const POWER_UPS = [
  {
    icon: "✦",
    name: "Shimmer Atom",
    unlock: "Level 5",
    description:
      "A glowing atom that gives 2× score and fills the Grab bar twice as fast when it merges.",
  },
  {
    icon: "🤚",
    name: "Grab",
    unlock: "Level 4",
    description:
      "Earned after 8 consecutive merge progress. Drag one atom to reposition it and set up reactions.",
  },
  {
    icon: "⚡",
    name: "E-Gun",
    unlock: "Level 6",
    description:
      "A straight beam that upgrades each atom it touches by 1 tier instead of degrading it.",
  },
  {
    icon: "🌀",
    name: "Gravity",
    unlock: "4× combo",
    description: "Pulls atoms upward and lets any newly touching matches merge immediately.",
  },
  {
    icon: "☢",
    name: "Emission",
    unlock: "Every 5 minutes",
    description:
      "Raises atoms and future queued atoms by 1 tier without directly creating the level target.",
  },
  {
    icon: "⛰",
    name: "Stone",
    unlock: "3 missed shots",
    description:
      "A heavy obstacle projectile that shoves clusters and can be cracked for bonus points.",
  },
  {
    icon: "✦",
    name: "Blank Atom",
    unlock: "Level 10",
    description: "A rare wildcard that copies the atom it hits, or erases a Stone completely.",
  },
];

export function PowerUpLibrary({ onBack }: Props) {
  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtn}>
          ← Menu
        </button>
        <header style={{ textAlign: "center", margin: "18px 0 20px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "var(--accent)", fontWeight: 800 }}>
            POWER-UP LIBRARY
          </div>
          <h1 className="gold-text" style={{ margin: "6px 0", fontSize: 34 }}>
            Lab Tools
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: 0 }}>
            Unlocked icons are explained here so every tool has a clear purpose.
          </p>
        </header>
        <div style={{ display: "grid", gap: 12 }}>
          {POWER_UPS.map((powerUp) => (
            <article key={powerUp.name} style={card}>
              <div style={iconWrap}>
                {powerUp.icon === "H" ? <ElementBall atomicNumber={1} size={42} /> : powerUp.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <h2 style={{ margin: 0, fontSize: 16 }}>{powerUp.name}</h2>
                  <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 800 }}>
                    {powerUp.unlock}
                  </span>
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--muted-foreground)",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  {powerUp.description}
                </p>
              </div>
            </article>
          ))}
        </div>
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

const card: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 14,
  borderRadius: 16,
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
};

const iconWrap: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  fontWeight: 900,
};
