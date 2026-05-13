import { ELEMENTS } from "./elements";

interface Props {
  atomicNumber: number;
  size?: number;
  glow?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  showMass?: boolean;
  highlight?: boolean;
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
}: Props) {
  const el = ELEMENTS[atomicNumber - 1];
  if (!el) return null;
  const symbolSize = Math.max(10, size * 0.42);
  const numberSize = Math.max(8, size * 0.22);
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        background: `radial-gradient(circle at 30% 28%, ${el.glowColor}, ${el.color} 65%, oklch(0 0 0 / 0.35))`,
        boxShadow: glow
          ? `0 0 ${size * 0.45}px ${el.glowColor}99, inset 0 -${size * 0.12}px ${size * 0.12}px oklch(0 0 0 / 0.35)`
          : `0 ${size * 0.06}px ${size * 0.12}px oklch(0 0 0 / 0.45), inset 0 -${size * 0.1}px ${size * 0.12}px oklch(0 0 0 / 0.3), inset 0 ${size * 0.08}px ${size * 0.1}px oklch(1 0 0 / 0.18)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#0A0A1A",
        fontWeight: 800,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        textShadow: "0 1px 0 rgba(255,255,255,0.4)",
        animation: highlight ? "pop-in 320ms ease-out, pulse-glow 1.6s ease-in-out infinite 320ms" : undefined,
        ...style,
      }}
    >
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