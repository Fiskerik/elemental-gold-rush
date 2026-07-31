import { memo } from "react";
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
  patternSeed?: number;
}

function isotopeChargeCapacity(period: number): number {
  if (period <= 1) return 2;
  if (period === 2) return 8;
  return 16;
}

export const ElementBall = memo(function ElementBall({
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
  patternSeed,
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
  const patternValue = Number.isFinite(patternSeed)
    ? Math.abs(Math.floor(patternSeed!))
    : atomicNumber;
  const patternIndex = (patternValue * 17 + atomicNumber * 31) % 4;
  const useTextStroke = atomSkin === "chrome" || atomSkin === "mineral" || atomSkin === "toxic";
  const baseBackground = `radial-gradient(circle at 30% 28%, ${el.glowColor}, ${el.color} 65%, oklch(0 0 0 / 0.35))`;
  const skinBackground: Record<AtomSkin, string> = {
    classic: baseBackground,
    chrome: `radial-gradient(circle at 27% 22%, color-mix(in oklch, ${el.glowColor} 78%, white) 0 7%, transparent 24%), radial-gradient(circle at 35% 30%, ${el.glowColor}, ${el.color} 68%, color-mix(in oklch, ${el.color} 62%, black))`,
    hologram: `radial-gradient(circle at 31% 24%, color-mix(in oklch, ${el.glowColor} 70%, white), transparent 32%), radial-gradient(circle at 56% 59%, color-mix(in oklch, ${el.color} 78%, white), ${el.color} 64%, color-mix(in oklch, ${el.color} 64%, #5c6295))`,
    crystal: `radial-gradient(circle at 31% 24%, color-mix(in oklch, ${el.glowColor} 74%, white), transparent 30%), radial-gradient(circle at 50% 52%, color-mix(in oklch, ${el.color} 70%, white), ${el.color} 62%, color-mix(in oklch, ${el.color} 56%, #10152f))`,
    mineral: "transparent",
    toxic: `radial-gradient(circle at 30% 24%, ${el.glowColor}, ${el.color} 58%, color-mix(in oklch, ${el.color} 55%, #12220c))`,
  };
  const materialVariables = {
    "--atom-color": el.color,
    "--atom-glow-color": el.glowColor,
    "--atom-dark-color": `color-mix(in oklch, ${el.color} 58%, black)`,
  } as React.CSSProperties;
  return (
    <div
      onClick={onClick}
      className={[
        className,
        shimmer ? "shimmer-atom" : "",
        atomSkin !== "classic" ? `atom-skin-${atomSkin}` : "",
        `atom-pattern-${patternIndex}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        background: skinBackground[atomSkin],
        boxShadow: glow
          ? `0 0 ${size * 0.45}px ${el.glowColor}99, inset 0 -${size * 0.12}px ${size * 0.12}px oklch(0 0 0 / 0.35)`
          : atomSkin === "mineral"
            ? "none"
            : `0 ${size * 0.06}px ${size * 0.12}px oklch(0 0 0 / 0.45), inset 0 -${size * 0.1}px ${size * 0.12}px oklch(0 0 0 / 0.3), inset 0 ${size * 0.08}px ${size * 0.1}px oklch(1 0 0 / 0.18)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: atomSkin === "mineral" ? "#fff8e8" : "#0A0A1A",
        fontWeight: 800,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        textShadow:
          atomSkin === "mineral" ? "0 1px 2px rgba(0,0,0,0.9)" : "0 1px 0 rgba(255,255,255,0.4)",
        animation: wiggle
          ? "wiggle 360ms ease-in-out"
          : highlight
            ? "pop-in 320ms ease-out, pulse-glow 1.6s ease-in-out infinite 320ms"
            : undefined,
        ...materialVariables,
        ...style,
      }}
    >
      {atomSkin === "mineral" && (
        <>
          <div aria-hidden="true" className="atom-mineral-shadow" />
          <div aria-hidden="true" className="atom-mineral-surface" />
        </>
      )}
      {atomSkin === "crystal" && <div aria-hidden="true" className="atom-crystal-core" />}
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
      <div
        className="atom-ball-label"
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: numberSize,
          lineHeight: 1,
          opacity: 0.85,
          WebkitTextStroke: useTextStroke
            ? `${Math.max(0.7, size * 0.035)}px ${atomSkin === "mineral" ? "rgba(18,10,3,0.92)" : "rgba(255,255,255,0.9)"}`
            : undefined,
          paintOrder: useTextStroke ? "stroke fill" : undefined,
        }}
      >
        {el.atomicNumber}
      </div>
      <div
        className="atom-ball-label"
        style={{
          position: "relative",
          zIndex: 2,
          fontSize: symbolSize,
          lineHeight: 1,
          fontWeight: 900,
          WebkitTextStroke: useTextStroke
            ? `${Math.max(0.8, size * 0.04)}px ${atomSkin === "mineral" ? "rgba(18,10,3,0.92)" : "rgba(255,255,255,0.9)"}`
            : undefined,
          paintOrder: useTextStroke ? "stroke fill" : undefined,
        }}
      >
        {el.symbol}
      </div>
      {showMass && (
        <div
          className="atom-ball-label"
          style={{
            position: "relative",
            zIndex: 2,
            fontSize: numberSize * 0.85,
            lineHeight: 1,
            opacity: 0.7,
            WebkitTextStroke: useTextStroke
              ? `${Math.max(0.6, size * 0.03)}px ${atomSkin === "mineral" ? "rgba(18,10,3,0.92)" : "rgba(255,255,255,0.9)"}`
              : undefined,
            paintOrder: useTextStroke ? "stroke fill" : undefined,
          }}
        >
          {el.atomicMass}
        </div>
      )}
    </div>
  );
});
