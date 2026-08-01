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

const CRYSTAL_SHARD_LAYOUTS = [
  [
    ["50,3 67,39 51,57 34,38", "var(--atom-glow-color)", 0.86],
    ["51,57 73,75 51,96 39,66", "var(--atom-dark-color)", 0.76],
    ["34,38 51,57 39,66 22,57", "var(--atom-color)", 0.7],
    ["50,3 51,57 67,39", "white", 0.7],
  ],
  [
    ["39,6 58,34 49,62 27,42", "var(--atom-color)", 0.82],
    ["58,34 84,52 57,95 49,62", "var(--atom-glow-color)", 0.78],
    ["27,42 49,62 31,76 16,58", "var(--atom-dark-color)", 0.68],
    ["39,6 49,62 58,34", "white", 0.62],
  ],
  [
    ["53,4 76,31 60,51 38,36", "var(--atom-glow-color)", 0.84],
    ["60,51 82,70 53,95 43,65", "var(--atom-color)", 0.76],
    ["38,36 60,51 43,65 19,58", "var(--atom-dark-color)", 0.72],
    ["53,4 60,51 76,31", "white", 0.68],
  ],
  [
    ["45,5 64,28 53,53 28,34", "var(--atom-color)", 0.82],
    ["53,53 79,65 55,94 38,69", "var(--atom-glow-color)", 0.78],
    ["28,34 53,53 38,69 17,53", "var(--atom-dark-color)", 0.7],
    ["45,5 53,53 64,28", "white", 0.64],
  ],
] as const;

type CrystalShard = readonly [string, string, number];

function CrystalShardCluster({
  patternIndex,
  verdant = false,
}: {
  patternIndex: number;
  verdant?: boolean;
}) {
  const shards: readonly CrystalShard[] =
    CRYSTAL_SHARD_LAYOUTS[patternIndex] ?? CRYSTAL_SHARD_LAYOUTS[0];
  const verdantShards: readonly CrystalShard[] = verdant
    ? [
        ["50,7 59,43 53,73 47,46", "white", 0.78],
        ["39,29 48,48 42,87 31,58", "var(--atom-glow-color)", 0.8],
        ["60,34 70,59 58,91 52,70", "var(--atom-dark-color)", 0.72],
      ]
    : [];
  return (
    <div aria-hidden="true" className="atom-crystal-core">
      <svg className="atom-crystal-shards" viewBox="0 0 100 100" focusable="false">
        {[...shards, ...verdantShards].map(([points, fill, opacity], index) => (
          <polygon key={`${patternIndex}-${index}`} points={points} fill={fill} opacity={opacity} />
        ))}
      </svg>
    </div>
  );
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
  const useTextStroke =
    atomSkin === "chrome" ||
    atomSkin === "crystal" ||
    atomSkin === "mineral" ||
    atomSkin === "verdantCrystal" ||
    atomSkin === "toxic";
  const textColor =
    atomSkin === "crystal" || atomSkin === "mineral" || atomSkin === "verdantCrystal"
      ? "#fff8e8"
      : "#0A0A1A";
  const textStrokeColor =
    atomSkin === "crystal" || atomSkin === "verdantCrystal"
      ? "rgba(0,0,0,0.96)"
      : atomSkin === "mineral"
        ? "rgba(18,10,3,0.92)"
        : "rgba(255,255,255,0.9)";
  const baseBackground = `radial-gradient(circle at 30% 28%, ${el.glowColor}, ${el.color} 65%, oklch(0 0 0 / 0.35))`;
  const isGummy = atomSkin === "chrome";
  const isCrystal = atomSkin === "crystal" || atomSkin === "verdantCrystal";
  const isMineral = atomSkin === "mineral";
  const skinBackground: Record<AtomSkin, string> = {
    classic: baseBackground,
    chrome: `radial-gradient(circle at 27% 22%, color-mix(in oklch, ${el.glowColor} 78%, white) 0 7%, transparent 24%), radial-gradient(circle at 35% 30%, ${el.glowColor}, ${el.color} 68%, color-mix(in oklch, ${el.color} 62%, black))`,
    hologram: `radial-gradient(circle at 31% 24%, color-mix(in oklch, ${el.glowColor} 70%, white), transparent 32%), radial-gradient(circle at 56% 59%, color-mix(in oklch, ${el.color} 78%, white), ${el.color} 64%, color-mix(in oklch, ${el.color} 64%, #5c6295))`,
    crystal: `radial-gradient(circle at 28% 20%, oklch(1 0 0 / 0.86) 0 5%, transparent 18%), radial-gradient(circle at 31% 25%, color-mix(in oklch, ${el.glowColor} 64%, white) 0 8%, transparent 31%), radial-gradient(circle at 50% 57%, color-mix(in oklch, ${el.color} 56%, white), color-mix(in oklch, ${el.color} 78%, transparent) 54%, color-mix(in oklch, ${el.color} 45%, #102331) 100%)`,
    mineral: "transparent",
    verdantCrystal: `radial-gradient(circle at 26% 18%, oklch(1 0 0 / 0.9) 0 5%, transparent 18%), radial-gradient(circle at 31% 25%, color-mix(in oklch, ${el.glowColor} 70%, white) 0 9%, transparent 30%), radial-gradient(circle at 52% 58%, color-mix(in oklch, ${el.color} 44%, white), color-mix(in oklch, ${el.color} 72%, #7fe0ba) 54%, color-mix(in oklch, ${el.color} 42%, #16463f) 100%)`,
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
        isGummy ? "atom-skin-gummy" : "",
        `atom-pattern-${patternIndex}`,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        width: size,
        height: size,
        borderRadius: isMineral ? "18%" : "50%",
        clipPath: isMineral
          ? "polygon(50% 0%, 82% 12%, 100% 42%, 88% 78%, 58% 100%, 22% 91%, 0% 58%, 12% 23%)"
          : undefined,
        position: "relative",
        background: skinBackground[atomSkin],
        border: isGummy
          ? "1px solid color-mix(in oklch, var(--atom-glow-color) 62%, white)"
          : isCrystal
            ? "1px solid oklch(1 0 0 / 0.72)"
            : undefined,
        boxShadow: glow
          ? `0 0 ${size * 0.45}px ${el.glowColor}99, inset 0 -${size * 0.12}px ${size * 0.12}px oklch(0 0 0 / 0.35)`
          : atomSkin === "mineral"
            ? "none"
            : isCrystal
              ? `0 ${size * 0.06}px ${size * 0.14}px rgba(10, 22, 42, 0.34), inset ${size * 0.08}px ${size * 0.08}px ${size * 0.12}px oklch(1 0 0 / 0.46), inset -${size * 0.1}px -${size * 0.12}px ${size * 0.16}px oklch(0.05 0.08 250 / 0.38), 0 0 ${size * 0.22}px color-mix(in oklch, var(--atom-glow-color) 45%, transparent)`
            : isGummy
              ? `0 ${size * 0.07}px ${size * 0.14}px rgba(18, 8, 32, 0.42), inset 0 -${size * 0.14}px ${size * 0.16}px rgba(30, 5, 35, 0.26), inset 0 ${size * 0.1}px ${size * 0.14}px rgba(255,255,255,0.32), 0 0 ${size * 0.18}px color-mix(in oklch, var(--atom-glow-color) 48%, transparent)`
            : `0 ${size * 0.06}px ${size * 0.12}px oklch(0 0 0 / 0.45), inset 0 -${size * 0.1}px ${size * 0.12}px oklch(0 0 0 / 0.3), inset 0 ${size * 0.08}px ${size * 0.1}px oklch(1 0 0 / 0.18)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: textColor,
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
      {isCrystal && (
        <CrystalShardCluster patternIndex={patternIndex} verdant={atomSkin === "verdantCrystal"} />
      )}
      {atomSkin !== "classic" && (
        <div
          aria-hidden="true"
          className={[
            "atom-skin-overlay",
            `atom-skin-overlay-${atomSkin}`,
            isCrystal ? "atom-skin-overlay-crystal" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        />
      )}
      {isGummy && <div aria-hidden="true" className="atom-gummy-glaze" />}
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
            ? `${Math.max(0.7, size * 0.035)}px ${textStrokeColor}`
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
            ? `${Math.max(0.8, size * 0.04)}px ${textStrokeColor}`
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
              ? `${Math.max(0.6, size * 0.03)}px ${textStrokeColor}`
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
