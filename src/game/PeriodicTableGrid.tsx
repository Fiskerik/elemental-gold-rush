import type { CSSProperties } from "react";
import { ELEMENTS } from "./elements";

export type PeriodicTableGridMode = "full" | "preview";

interface Props {
  discoveredElements: number[];
  targetAtomicNumber?: number | null;
  newlyDiscovered?: number[];
  mode?: PeriodicTableGridMode;
  onSelect?: (atomicNumber: number) => void;
  overview?: boolean;
}

type Cell = { atomicNumber: number; row: number; col: number };

function cellPosition(atomicNumber: number): { row: number; col: number } {
  const element = ELEMENTS[atomicNumber - 1];
  if (!element) return { row: 1, col: 1 };
  if (element.category === "lanthanide") return { row: 9, col: atomicNumber - 54 };
  if (element.category === "actinide") return { row: 10, col: atomicNumber - 86 };
  return { row: element.period, col: element.group ?? 1 };
}

function cellsFor(mode: PeriodicTableGridMode, targetAtomicNumber: number | null | undefined): { cells: Cell[]; rows: number; cols: number } {
  if (mode === "full" || !targetAtomicNumber) {
    return {
      cells: ELEMENTS.map((element) => {
        const position = cellPosition(element.atomicNumber);
        return { atomicNumber: element.atomicNumber, ...position };
      }),
      rows: 10,
      cols: 18,
    };
  }
  const target = cellPosition(targetAtomicNumber);
  const rowStart = Math.max(1, target.row - 1);
  const colStart = Math.max(1, Math.min(14, target.col - 2));
  const cells: Cell[] = [];
  for (const element of ELEMENTS) {
    const position = cellPosition(element.atomicNumber);
    if (position.row >= rowStart && position.row < rowStart + 3 && position.col >= colStart && position.col < colStart + 5) {
      cells.push({ atomicNumber: element.atomicNumber, row: position.row - rowStart + 1, col: position.col - colStart + 1 });
    }
  }
  return { cells, rows: 3, cols: 5 };
}

export function PeriodicTableGrid({
  discoveredElements,
  targetAtomicNumber,
  newlyDiscovered = [],
  mode = "full",
  onSelect,
  overview = false,
}: Props) {
  const { cells, rows, cols } = cellsFor(mode, targetAtomicNumber);
  const discovered = new Set(discoveredElements);
  const newSet = new Set(newlyDiscovered);
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, minmax(${mode === "full" && !overview ? 42 : 0}px, 1fr))`,
    gridTemplateRows: `repeat(${rows}, ${mode === "full" ? 42 : 38}px)`,
    gap: mode === "full" ? 4 : 5,
    minWidth: mode === "full" && !overview ? 18 * 42 + 17 * 4 : undefined,
  };
  return (
    <div>
      <div style={{ overflowX: mode === "full" && !overview ? "auto" : "visible", paddingBottom: mode === "full" && !overview ? 4 : 0 }}>
        <div style={gridStyle} aria-label="Periodic table">
          {cells.map((cell) => {
            const element = ELEMENTS[cell.atomicNumber - 1];
            const isDiscovered = discovered.has(cell.atomicNumber);
            const isTarget = targetAtomicNumber === cell.atomicNumber;
            const isNew = newSet.has(cell.atomicNumber);
            return (
              <button
                key={cell.atomicNumber}
                type="button"
                onClick={() => onSelect?.(cell.atomicNumber)}
                aria-label={`${element.name}${isDiscovered ? " discovered" : " undiscovered"}`}
                style={{
                  gridRow: cell.row,
                  gridColumn: cell.col,
                  minWidth: mode === "full" && !overview ? 42 : undefined,
                  borderRadius: mode === "full" ? 7 : 8,
                  border: isTarget ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: isTarget
                    ? `radial-gradient(circle, ${element.glowColor}55, var(--surface-high) 70%)`
                    : isDiscovered
                      ? `linear-gradient(145deg, ${element.color}cc, var(--surface-high))`
                      : "color-mix(in oklch, var(--surface) 84%, var(--foreground) 16%)",
                  color: isDiscovered ? "#10131b" : "var(--muted-foreground)",
                  opacity: isTarget ? 1 : isDiscovered ? 0.98 : 0.62,
                  boxShadow: isTarget ? `0 0 18px ${element.glowColor}99` : isNew ? `0 0 14px ${element.glowColor}` : undefined,
                  animation: isTarget ? "periodic-table-target-fill 1.6s ease-in-out infinite" : isNew ? "collection-discovery-glow 1.8s ease-in-out infinite" : undefined,
                  cursor: onSelect ? "pointer" : "default",
                  padding: 3,
                  display: "grid",
                  alignContent: "center",
                  justifyItems: "center",
                  fontFamily: "inherit",
                  position: "relative",
                }}
              >
                <strong style={{ fontSize: mode === "preview" ? 15 : 11, lineHeight: 1 }}>{element.symbol}</strong>
                {mode === "full" && <span style={{ fontSize: 8, marginTop: 2 }}>{element.atomicNumber}</span>}
              </button>
            );
          })}
        </div>
      </div>
      {mode === "full" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, color: "var(--muted-foreground)", fontSize: 11 }}>
          <span>● Discovered</span><span>✦ Next target</span><span>○ Faint / undiscovered</span>
        </div>
      )}
    </div>
  );
}
