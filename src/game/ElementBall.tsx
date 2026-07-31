import { ELEMENTS } from "./elements";
import type { AtomSkin } from "./store";

interface Props {
  atomicNumber: number;
  size?: number;
  glow?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  showMass?: boolean;
  highlight?: boolean;
  wiggle?: boolean;
  shimmer?: boolean;
  unstableShots?: number;
  atomSkin?: AtomSkin;
}

const SKIN_RING_COLOR: Partial<Record<AtomSkin, string>> = {
  chrome: "oklch(0.93 0.03 92 / 0.75)",
  hologram: "oklch(0.85 0.19 195 / 0.85)",
  crystal: "oklch(0.82 0.14 290 / 0.8)",
  toxic: "oklch(0.86 0.22 145 / 0.85)",
};

function isotopeChargeCapacity(period: number): number {
  if (period <= 1) return 2;
  if (period === 2) return 8;
  return 16;
}

export function ElementBall({
  atomicNumber,
  size = 44,
  glow = false,
  onClick,
  className,
  style,
  showMass,
  highlight,
  wiggle,
  shimmer,
  unstableShots,
  atomSkin = "classic",
}: Props) {
  const el = ELEMENTS[atomicNumber - 1];
  if (!el) return null;
  // Scale ball slightly based on periodic-table row.
  // Row 4 is the baseline (1.0×); rows above shrink, rows below grow.
  const period = Math.max(1, Math.min(8, el.period ?? 4));
  const periodScale = 1 + (period - 4) * 0.11; // row1=0.67 … row8=1.44
  size = size * periodScale;
  const symbolSize = Math.max(10, size * 0.42);
  const numberSize = Math.max(8, size * 0.22);
  const unstableMaxSegments = isotopeChargeCapacity(period);
  const unstableSegments = Math.max(
    0,
    Math.min(unstableMaxSegments, Math.floor(unstableShots ?? 0)),
  );
  const unstableCircumference = 100;
  const unstableSegment = unstableCircumference / unstableMaxSegments;
  const unstableDash = unstableSegment * (unstableMaxSegments > 8 ? 0.58 : 0.72);
  const unstableGap = unstableSegment - unstableDash;
  const unstableDashArray = Array.from({ length: unstableMaxSegments }, (_, index) =>
    index < unstableSegments ? `${unstableDash} ${unstableGap}` : `0 ${unstableSegment}`,
  ).join(" ");
  const skinRingColor = SKIN_RING_COLOR[atomSkin];
  const skinRing = skinRingColor ? `, 0 0 0 ${Math.max(1.5, size * 0.035)}px ${skinRingColor}` : "";
  return (
    <div
      onClick={onClick}
      className={[
        className,
        shimmer ? "shimmer-atom" : "",
        atomSkin !== "classic" ? `atom-skin-${atomSkin}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        background: `radial-gradient(circle at 30% 28%, ${el.glowColor}, ${el.color} 65%, oklch(0 0 0 / 0.35))`,
        boxShadow:
          (glow
            ? `0 0 ${size * 0.45}px ${el.glowColor}99, inset 0 -${size * 0.12}px ${size * 0.12}px oklch(0 0 0 / 0.35)`
            : `0 ${size * 0.06}px ${size * 0.12}px oklch(0 0 0 / 0.45), inset 0 -${size * 0.1}px ${size * 0.12}px oklch(0 0 0 / 0.3), inset 0 ${size * 0.08}px ${size * 0.1}px oklch(1 0 0 / 0.18)`) +
          skinRing,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#0A0A1A",
        fontWeight: 800,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        textShadow: "0 1px 0 rgba(255,255,255,0.4)",
        animation: wiggle
          ? "wiggle 360ms ease-in-out"
          : highlight
            ? "pop-in 320ms ease-out, pulse-glow 1.6s ease-in-out infinite 320ms"
            : undefined,
        ...style,
      }}
    >
      {atomSkin !== "classic" && (
        <div
          aria-hidden="true"
          className={`atom-skin-overlay atom-skin-overlay-${atomSkin}`}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />
      )}
      {unstableSegments > 0 && (
        <svg
          aria-hidden="true"
          viewBox="0 0 36 36"
          style={{
            position: "absolute",
            inset: -4,
            width: size + 8,
            height: size + 8,
            overflow: "visible",
            pointerEvents: "none",
            transform: "rotate(-90deg)",
            filter: "drop-shadow(0 0 5px oklch(0.78 0.2 55 / 0.8))",
          }}
        >
          <circle
            cx="18"
            cy="18"
            r="15.92"
            fill="none"
            pathLength={unstableCircumference}
            stroke="oklch(0.92 0.2 65)"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={unstableDashArray}
          />
        </svg>
      )}
      <div style={{ fontSize: numberSize, lineHeight: 1, opacity: 0.85 }}>
        {el.atomicNumber}
      </div>
      <div style={{ fontSize: symbolSize, lineHeight: 1, fontWeight: 900 }}>
        {el.symbol}
      </div>
      {showMass && (
        <div style={{ fontSize: numberSize * 0.85, lineHeight: 1, opacity: 0.7 }}>
          {el.atomicMass}
        </div>
      )}
    </div>
  );
}
