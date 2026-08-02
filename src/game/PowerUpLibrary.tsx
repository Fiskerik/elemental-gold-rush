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
import { POWER_UPS } from "./powerUps";
import { INVENTORY_POWER_UPS, useProgress, type InventoryPowerUpId } from "./store";

interface Props {
  onBack: () => void;
}

export function ShimmerAtomIcon({ size = 42 }: { size?: number }) {
  const orbitSize = size + 18;
  return (
    <div
      style={{
        width: orbitSize,
        height: orbitSize,
        position: "relative",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 0 10px rgba(86, 210, 255, 0.62))",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 72 72"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <ellipse
          cx="36"
          cy="36"
          rx="30"
          ry="12"
          fill="none"
          stroke="rgba(255, 222, 102, 0.95)"
          strokeWidth="2.5"
          transform="rotate(-24 36 36)"
        />
        <ellipse
          cx="36"
          cy="36"
          rx="30"
          ry="12"
          fill="none"
          stroke="rgba(88, 220, 255, 0.9)"
          strokeWidth="2.5"
          transform="rotate(52 36 36)"
        />
        <circle cx="11" cy="28" r="3" fill="#fff5a8" />
        <circle cx="57" cy="48" r="3" fill="#8ef3ff" />
      </svg>
      <ElementBall atomicNumber={1} size={size * 0.72} atomSkin="hologram" glow />
    </div>
  );
}

function CompoundPowerUpIcon({ size = 42 }: { size?: number }) {
  const nodeSize = Math.max(12, size * 0.28);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size + 8,
        height: size + 8,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 0 10px rgba(83, 232, 171, 0.58))",
      }}
    >
      <svg viewBox="0 0 72 72" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M22 22 L50 27 L36 53 Z" fill="none" stroke="rgba(180, 255, 219, 0.82)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 22 L50 27 L36 53 Z" fill="none" stroke="rgba(20, 118, 103, 0.62)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <PowerUpAtomNode symbol="C" color="#8ee9ff" size={nodeSize} style={{ left: "16%", top: "16%" }} />
      <PowerUpAtomNode symbol="O" color="#ff9c8d" size={nodeSize} style={{ right: "13%", top: "23%" }} />
      <PowerUpAtomNode symbol="H" color="#f5f7ff" size={nodeSize * 0.86} style={{ left: "41%", bottom: "8%" }} />
    </div>
  );
}

function PowerUpAtomNode({
  symbol,
  color,
  size,
  style,
}: {
  symbol: string;
  color: string;
  size: number;
  style: React.CSSProperties;
}) {
  return (
    <span
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(circle at 30% 24%, white, ${color} 28%, color-mix(in oklch, ${color} 62%, #102131))`,
        border: "1px solid rgba(255,255,255,0.78)",
        color: "#102131",
        fontSize: Math.max(8, size * 0.42),
        fontWeight: 1000,
        textShadow: "0 1px 0 rgba(255,255,255,0.55)",
        boxShadow: `0 0 10px ${color}99, inset 0 -3px 5px rgba(0,0,0,0.28)`,
        ...style,
      }}
    >
      {symbol}
    </span>
  );
}

export function PowerUpIcon({ icon, size = 42 }: { icon: string; size?: number }) {
  if (icon === "shimmer") return <ShimmerAtomIcon size={size} />;
  if (icon === "H") return <ElementBall atomicNumber={1} size={size} />;
  if (icon === "molecule") return <CompoundPowerUpIcon size={size} />;
  const entry = POWER_UP_GLYPHS[icon];
  if (entry) return <PowerUpIllustratedIcon {...entry} size={size} />;
  return <>{icon}</>;
}

type PowerUpMotif = "hand" | "bolt" | "orbit" | "rays" | "shuffle" | "jump" | "flask" | "facet" | "burst" | "warning" | "blank" | "recycle";

const POWER_UP_GLYPHS: Record<
  string,
  { Icon: LucideIcon; color: string; motif: PowerUpMotif }
> = {
  grab: { Icon: Hand, color: "oklch(0.78 0.16 50)", motif: "hand" },
  egun: { Icon: Zap, color: "oklch(0.85 0.18 95)", motif: "bolt" },
  gravity: { Icon: Magnet, color: "oklch(0.7 0.18 260)", motif: "orbit" },
  emission: { Icon: Radiation, color: "oklch(0.78 0.2 55)", motif: "rays" },
  transmute: { Icon: Shuffle, color: "oklch(0.78 0.18 320)", motif: "shuffle" },
  "fusion-jump": { Icon: SkipForward, color: "oklch(0.8 0.18 145)", motif: "jump" },
  catalyst: { Icon: FlaskConical, color: "oklch(0.78 0.18 115)", motif: "flask" },
  stone: { Icon: Mountain, color: "oklch(0.7 0.04 60)", motif: "facet" },
  gamma: { Icon: Bomb, color: "oklch(0.65 0.2 145)", motif: "burst" },
  unstable: { Icon: Radiation, color: "oklch(0.86 0.2 58)", motif: "warning" },
  blank: { Icon: HelpCircle, color: "oklch(0.78 0.04 250)", motif: "blank" },
  "queue-shuffle": { Icon: Recycle, color: "oklch(0.78 0.16 175)", motif: "recycle" },
};

function PowerUpIllustratedIcon({
  Icon,
  color,
  motif,
  size,
}: {
  Icon: LucideIcon;
  color: string;
  motif: PowerUpMotif;
  size: number;
}) {
  const coreSize = Math.max(18, size * 0.78);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size + 8,
        height: size + 8,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: `drop-shadow(0 0 7px color-mix(in oklch, ${color} 58%, transparent))`,
      }}
    >
      <svg viewBox="0 0 72 72" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <circle cx="36" cy="36" r="27" fill="none" stroke={color} strokeOpacity="0.28" strokeWidth="1.4" />
        {motif === "hand" && (
          <>
            <circle cx="36" cy="36" r="21" fill="none" stroke={color} strokeOpacity="0.42" strokeDasharray="2 5" />
            <path d="M14 36h8M50 36h8M36 14v8M36 50v8" stroke={color} strokeOpacity="0.62" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {motif === "bolt" && (
          <>
            <path d="M12 50h14M46 22h14M20 18l-5 5M52 49l6 6" stroke={color} strokeOpacity="0.58" strokeWidth="2" strokeLinecap="round" />
            <circle cx="36" cy="36" r="24" fill="none" stroke={color} strokeOpacity="0.38" strokeDasharray="1 6" />
          </>
        )}
        {motif === "orbit" && (
          <>
            <ellipse cx="36" cy="36" rx="28" ry="11" fill="none" stroke={color} strokeOpacity="0.62" strokeWidth="1.8" transform="rotate(-25 36 36)" />
            <ellipse cx="36" cy="36" rx="28" ry="11" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1.4" transform="rotate(55 36 36)" />
            <circle cx="14" cy="28" r="2.5" fill={color} />
            <circle cx="57" cy="45" r="2.5" fill={color} />
          </>
        )}
        {motif === "rays" && (
          <>
            {Array.from({ length: 8 }, (_, index) => {
              const angle = index * 45;
              return <path key={angle} d="M36 7v8" stroke={color} strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" transform={`rotate(${angle} 36 36)`} />;
            })}
            <circle cx="36" cy="36" r="22" fill="none" stroke={color} strokeOpacity="0.38" strokeDasharray="3 4" />
          </>
        )}
        {motif === "shuffle" && (
          <>
            <path d="M15 23h8c10 0 13 26 24 26h10M15 49h8c4 0 7-5 9-10M47 23h10M51 19l6 4-6 4M51 45l6 4-6 4" fill="none" stroke={color} strokeOpacity="0.68" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {motif === "jump" && (
          <>
            <path d="M15 48h12V36h12V24h18" fill="none" stroke={color} strokeOpacity="0.72" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M50 18l7 6-7 6" fill="none" stroke={color} strokeOpacity="0.72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {motif === "flask" && (
          <>
            <circle cx="19" cy="23" r="3" fill={color} fillOpacity="0.72" />
            <circle cx="53" cy="48" r="4" fill={color} fillOpacity="0.54" />
            <path d="M16 53h40" stroke={color} strokeOpacity="0.46" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {motif === "facet" && (
          <polygon points="36,10 58,24 53,52 36,62 17,50 13,25" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="2" strokeLinejoin="round" />
        )}
        {motif === "burst" && (
          <>
            <circle cx="36" cy="36" r="22" fill="none" stroke={color} strokeOpacity="0.42" strokeWidth="2" strokeDasharray="1 6" />
            <path d="M36 10v10M36 52v10M10 36h10M52 36h10" stroke={color} strokeOpacity="0.72" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
        {motif === "warning" && (
          <>
            <path d="M36 11l25 45H11z" fill="none" stroke={color} strokeOpacity="0.72" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="36" cy="48" r="2" fill={color} />
          </>
        )}
        {motif === "blank" && <circle cx="36" cy="36" r="24" fill="none" stroke={color} strokeOpacity="0.6" strokeWidth="2" strokeDasharray="4 4" />}
        {motif === "recycle" && (
          <>
            <path d="M36 12l7 12h-6M60 42l-14 1 5-10M21 57l7-12 6 10" fill="none" stroke={color} strokeOpacity="0.72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="36" cy="36" r="18" fill="none" stroke={color} strokeOpacity="0.32" strokeWidth="1.4" />
          </>
        )}
      </svg>
      <div
        style={{
          width: coreSize,
          height: coreSize,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: `radial-gradient(circle at 28% 22%, rgba(255,255,255,.86), transparent 20%), radial-gradient(circle at 54% 60%, color-mix(in oklch, ${color} 62%, white), color-mix(in oklch, ${color} 46%, #081126))`,
          border: `1px solid color-mix(in oklch, ${color} 52%, white)`,
          boxShadow: `inset 2px 2px 4px rgba(255,255,255,.32), inset -3px -4px 6px rgba(0,0,0,.28), 0 0 8px color-mix(in oklch, ${color} 62%, transparent)`,
        }}
      >
        <Icon
          size={Math.round(coreSize * 0.52)}
          color="white"
          strokeWidth={2.8}
          style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.96))" }}
        />
      </div>
    </div>
  );
}

export function PowerUpBadge({ icon, size = 42 }: { icon: string; size?: number }) {
  const style = POWER_UP_BADGE_STYLES[icon] ?? POWER_UP_BADGE_STYLES.default;
  const denseArtwork = icon === "molecule" || icon === "shimmer";
  const innerSize = Math.max(22, size * (denseArtwork ? 0.58 : 0.82));
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
      <PowerUpIcon icon={icon} size={innerSize} />
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
                  <div style={unlockDetails}>
                    <span>{`Unlocked at level: ${powerUp.unlock.replace(/^Level /, "").split(" /")[0]}`}</span>
                    <span>{`Obtained by ${powerUp.obtainedBy}`}</span>
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

const unlockDetails: React.CSSProperties = {
  display: "grid",
  gap: 2,
  marginTop: 6,
  color: "var(--accent)",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.25,
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
