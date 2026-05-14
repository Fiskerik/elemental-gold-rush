import { ElementBall } from "./ElementBall";
import { POWER_UPS } from "./powerUps";

interface Props {
  onBack: () => void;
}

export function ShimmerAtomIcon({ size = 42 }: { size?: number }) {
  return (
    <div
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: "50%",
        padding: 4,
        background:
          "conic-gradient(from 20deg, #ff4d6d, #ffd166, #06d6a0, #4cc9f0, #9b5de5, #ff4d6d)",
        boxShadow: "0 0 18px rgba(155, 93, 229, 0.55)",
      }}
    >
      <ElementBall atomicNumber={1} size={size} />
    </div>
  );
}

export function PowerUpIcon({ icon }: { icon: string }) {
  if (icon === "shimmer") return <ShimmerAtomIcon />;
  if (icon === "H") return <ElementBall atomicNumber={1} size={42} />;
  return <>{icon}</>;
}

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
                <PowerUpIcon icon={powerUp.icon} />
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
