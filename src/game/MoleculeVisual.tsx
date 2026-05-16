import { type CompoundDefinition, getCompoundStructure } from "./compounds";

interface MoleculeVisualProps {
  compound: CompoundDefinition;
  size?: number;
  locked?: boolean;
}

const ATOM_COLORS: Record<string, string> = {
  H: "oklch(0.95 0.03 95)",
  C: "oklch(0.34 0.04 250)",
  N: "oklch(0.58 0.17 260)",
  O: "oklch(0.62 0.22 25)",
  Na: "oklch(0.64 0.17 285)",
  Cl: "oklch(0.74 0.18 145)",
  Ca: "oklch(0.78 0.13 80)",
  Si: "oklch(0.65 0.09 225)",
  S: "oklch(0.84 0.16 92)",
  Mg: "oklch(0.78 0.11 150)",
  Fe: "oklch(0.58 0.16 45)",
};

function bondOffsets(order: number, dx: number, dy: number): number[] {
  if (order <= 1) return [0];
  if (order === 2) return [-0.55, 0.55];
  return [-0.85, 0, 0.85];
}

export function MoleculeVisual({ compound, size = 86, locked = false }: MoleculeVisualProps) {
  if (locked) {
    return (
      <span
        style={{
          width: size,
          height: size,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          border: "1px solid var(--border)",
          background: "var(--surface-high)",
          color: "var(--muted-foreground)",
          fontSize: Math.max(14, size * 0.34),
          fontWeight: 900,
          flex: "0 0 auto",
          filter: "grayscale(1)",
        }}
        aria-hidden="true"
      >
        ?
      </span>
    );
  }

  const structure = getCompoundStructure(compound);
  const center = size / 2;
  const scale = size * 0.42;
  const atomSize = Math.max(15, size * 0.24);
  const nodes = structure.atoms.map((atom) => ({
    ...atom,
    cx: center + atom.x * scale,
    cy: center + atom.y * scale,
  }));

  return (
    <span
      style={{
        width: size,
        height: size,
        position: "relative",
        flex: "0 0 auto",
        display: "inline-block",
        filter: "drop-shadow(0 0 12px var(--accent-glow))",
      }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        {structure.bonds.flatMap((bond, bondIndex) => {
          const from = nodes[bond.from];
          const to = nodes[bond.to];
          if (!from || !to) return [];
          const dx = to.cx - from.cx;
          const dy = to.cy - from.cy;
          const length = Math.hypot(dx, dy) || 1;
          const px = (-dy / length) * 4;
          const py = (dx / length) * 4;
          return bondOffsets(bond.order ?? 1, dx, dy).map((offset, offsetIndex) => (
            <line
              key={`${bondIndex}-${offsetIndex}`}
              x1={from.cx + px * offset}
              y1={from.cy + py * offset}
              x2={to.cx + px * offset}
              y2={to.cy + py * offset}
              stroke="color-mix(in oklch, var(--foreground) 62%, var(--accent))"
              strokeWidth={Math.max(2, size * 0.035)}
              strokeLinecap="round"
              opacity={0.78}
            />
          ));
        })}
      </svg>
      {nodes.map((atom, index) => {
        const fill = ATOM_COLORS[atom.symbol] ?? "var(--accent)";
        const textColor = atom.symbol === "H" || atom.symbol === "S" || atom.symbol === "Ca" ? "#162018" : "#fff";
        return (
          <span
            key={`${atom.symbol}-${index}`}
            style={{
              position: "absolute",
              left: atom.cx - atomSize / 2,
              top: atom.cy - atomSize / 2,
              width: atomSize,
              height: atomSize,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: `radial-gradient(circle at 32% 28%, color-mix(in oklch, ${fill} 72%, white), ${fill})`,
              color: textColor,
              fontSize: Math.max(8, atomSize * 0.36),
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.42)",
              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
            }}
          >
            {atom.symbol}
          </span>
        );
      })}
    </span>
  );
}
