import {
  Bomb,
  FlaskConical,
  Hand,
  HelpCircle,
  Magnet,
  Mountain,
  Radiation,
  Recycle,
  Shuffle,
  SkipForward,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ElementBall } from "./ElementBall";
import { MoleculeVisual } from "./MoleculeVisual";
import { COMPOUNDS } from "./compounds";
import { POWER_UPS } from "./powerUps";
import { INVENTORY_POWER_UPS, useProgress, type InventoryPowerUpId } from "./store";

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

export function PowerUpIcon({ icon, size = 42 }: { icon: string; size?: number }) {
  if (icon === "shimmer") return <ShimmerAtomIcon size={size} />;
  if (icon === "H") return <ElementBall atomicNumber={1} size={size} />;
  if (icon === "molecule") return <MoleculeVisual compound={COMPOUNDS[0]} size={size} />;
  const map: Record<string, { Icon: LucideIcon; color: string }> = {
    grab: { Icon: Hand, color: "oklch(0.78 0.16 50)" },
    egun: { Icon: Zap, color: "oklch(0.85 0.18 95)" },
    gravity: { Icon: Magnet, color: "oklch(0.7 0.18 260)" },
    emission: { Icon: Radiation, color: "oklch(0.78 0.2 55)" },
    transmute: { Icon: Shuffle, color: "oklch(0.78 0.18 320)" },
    "fusion-jump": { Icon: SkipForward, color: "oklch(0.8 0.18 145)" },
    catalyst: { Icon: FlaskConical, color: "oklch(0.78 0.18 115)" },
    stone: { Icon: Mountain, color: "oklch(0.7 0.04 60)" },
    gamma: { Icon: Bomb, color: "oklch(0.65 0.2 145)" },
    unstable: { Icon: Radiation, color: "oklch(0.86 0.2 58)" },
    blank: { Icon: HelpCircle, color: "oklch(0.78 0.04 250)" },
    "queue-shuffle": { Icon: Recycle, color: "oklch(0.78 0.16 175)" },
  };
  const entry = map[icon];
  if (entry) return <entry.Icon size={Math.round(size * 0.68)} color={entry.color} strokeWidth={2.4} />;
  return <>{icon}</>;
}

export function PowerUpBadge({ icon, size = 42 }: { icon: string; size?: number }) {
  const style = POWER_UP_BADGE_STYLES[icon] ?? POWER_UP_BADGE_STYLES.default;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: style.background,
        border: `1px solid ${style.border}`,
        boxShadow: `${style.shadow}, inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -10px 18px rgba(0,0,0,0.24)`,
        color: "var(--primary-foreground)",
      }}
    >
      <PowerUpIcon icon={icon} size={Math.max(22, size * 0.58)} />
    </div>
  );
}

export function PowerUpLibrary({ onBack }: Props) {
  const powerUpInventory = useProgress((s) => s.powerUpInventory);
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
          {POWER_UPS.map((powerUp) => {
            const inventoryId = inventoryPowerUpIdForIcon(powerUp.icon);
            const ownedCount = inventoryId ? powerUpInventory[inventoryId] : null;
            return (
              <article key={powerUp.name} style={card}>
                <div style={iconWrap}>
                  <PowerUpBadge icon={powerUp.icon} size={46} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 16 }}>{powerUp.name}</h2>
                    {ownedCount !== null && <span style={ownedPill}>Owned x{ownedCount}</span>}
                  </div>
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--muted-foreground)",
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    {powerUp.effect}
                  </p>
                  <div
                    style={{ marginTop: 6, color: "var(--accent)", fontSize: 11, fontWeight: 800 }}
                  >
                    {`Obtained: ${powerUp.unlock}`}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function inventoryPowerUpIdForIcon(icon: string): InventoryPowerUpId | null {
  return (INVENTORY_POWER_UPS as readonly string[]).includes(icon)
    ? (icon as InventoryPowerUpId)
    : null;
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

const ownedPill: React.CSSProperties = {
  flexShrink: 0,
  borderRadius: 999,
  border: "1px solid color-mix(in oklch, var(--accent) 55%, var(--border))",
  background: "color-mix(in oklch, var(--accent) 14%, var(--surface))",
  color: "var(--accent)",
  padding: "4px 8px",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const POWER_UP_BADGE_STYLES: Record<string, { background: string; border: string; shadow: string }> = {
  shimmer: {
    background: "linear-gradient(135deg, oklch(0.66 0.22 330), oklch(0.72 0.18 85), oklch(0.62 0.18 185))",
    border: "oklch(0.85 0.16 90)",
    shadow: "0 0 16px oklch(0.75 0.18 320 / 0.45)",
  },
  grab: {
    background: "linear-gradient(135deg, var(--accent), var(--primary))",
    border: "var(--accent)",
    shadow: "0 0 14px var(--accent-glow)",
  },
  egun: {
    background: "linear-gradient(135deg, oklch(0.72 0.18 95), oklch(0.42 0.14 205))",
    border: "oklch(0.85 0.18 95)",
    shadow: "0 0 14px oklch(0.76 0.18 95 / 0.5)",
  },
  gravity: {
    background: "linear-gradient(135deg, oklch(0.55 0.16 260), var(--primary))",
    border: "var(--accent)",
    shadow: "0 0 14px var(--accent-glow)",
  },
  emission: {
    background: "linear-gradient(135deg, oklch(0.72 0.19 55), oklch(0.55 0.16 35))",
    border: "oklch(0.82 0.19 55)",
    shadow: "0 0 14px oklch(0.72 0.19 55 / 0.5)",
  },
  transmute: {
    background: "linear-gradient(135deg, oklch(0.62 0.2 305), oklch(0.5 0.18 255))",
    border: "oklch(0.76 0.18 305)",
    shadow: "0 0 14px oklch(0.66 0.2 305 / 0.5)",
  },
  "fusion-jump": {
    background: "linear-gradient(135deg, oklch(0.62 0.16 150), oklch(0.42 0.14 185))",
    border: "oklch(0.72 0.16 150)",
    shadow: "0 0 14px oklch(0.62 0.16 150 / 0.45)",
  },
  catalyst: {
    background: "linear-gradient(135deg, oklch(0.72 0.18 115), oklch(0.48 0.14 150))",
    border: "oklch(0.78 0.18 115)",
    shadow: "0 0 14px oklch(0.72 0.18 115 / 0.5)",
  },
  stone: {
    background: "linear-gradient(135deg, oklch(0.52 0.035 70), oklch(0.28 0.025 55))",
    border: "oklch(0.68 0.04 70)",
    shadow: "0 0 14px oklch(0.4 0.04 65 / 0.45)",
  },
  gamma: {
    background: "linear-gradient(135deg, oklch(0.6 0.2 145), oklch(0.42 0.16 150))",
    border: "oklch(0.7 0.2 145)",
    shadow: "0 0 14px oklch(0.6 0.2 145 / 0.5)",
  },
  unstable: {
    background: "linear-gradient(135deg, oklch(0.72 0.2 58), oklch(0.42 0.16 28))",
    border: "oklch(0.86 0.2 58)",
    shadow: "0 0 14px oklch(0.76 0.2 58 / 0.52)",
  },
  molecule: {
    background: "linear-gradient(135deg, oklch(0.62 0.16 145), oklch(0.42 0.13 185))",
    border: "oklch(0.75 0.16 145)",
    shadow: "0 0 14px oklch(0.62 0.16 145 / 0.45)",
  },
  blank: {
    background: "linear-gradient(135deg, oklch(0.68 0.05 250), oklch(0.38 0.08 285))",
    border: "oklch(0.78 0.04 250)",
    shadow: "0 0 14px oklch(0.62 0.08 260 / 0.4)",
  },
  "queue-shuffle": {
    background: "linear-gradient(135deg, oklch(0.68 0.16 175), oklch(0.48 0.14 200))",
    border: "oklch(0.78 0.16 175)",
    shadow: "0 0 14px oklch(0.68 0.16 175 / 0.5)",
  },
  default: {
    background: "linear-gradient(135deg, var(--primary), var(--accent))",
    border: "var(--border)",
    shadow: "0 0 14px var(--primary-glow)",
  },
};
