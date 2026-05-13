import { useState } from "react";
import { ELEMENTS, CATEGORY_COLORS } from "./elements";
import { useProgress } from "./store";
import { ElementBall } from "./ElementBall";

export function Collection({ onBack }: { onBack: () => void }) {
  const { discoveredElements } = useProgress();
  const [selected, setSelected] = useState<number | null>(null);
  const found = new Set(discoveredElements);
  const el = selected ? ELEMENTS[selected - 1] : null;

  return (
    <div className="app-shell" style={{ padding: 16, paddingBottom: 32 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <button onClick={onBack} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 10, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Collection</h1>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {discoveredElements.length} / 118 elements discovered
            </div>
          </div>
        </div>

        {/* Periodic-ish grid (8 cols, scrollable rows) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gap: 4,
        }}>
          {ELEMENTS.map((e) => {
            const isFound = found.has(e.atomicNumber);
            return (
              <button key={e.atomicNumber} onClick={() => setSelected(e.atomicNumber)}
                style={{
                  aspectRatio: "1 / 1",
                  border: `1px solid ${isFound ? e.color : "var(--border)"}`,
                  borderRadius: 6,
                  background: isFound ? `${e.color}33` : "var(--surface)",
                  color: isFound ? "var(--foreground)" : "var(--muted-foreground)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 10,
                  padding: 0,
                }}>
                <div style={{ fontSize: 8, opacity: 0.7 }}>{e.atomicNumber}</div>
                <div style={{ fontSize: 12, fontWeight: 800 }}>{isFound ? e.symbol : "?"}</div>
              </button>
            );
          })}
        </div>

        {/* Category legend */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: "var(--muted-foreground)", marginBottom: 8 }}>CATEGORIES</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(CATEGORY_COLORS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--muted-foreground)" }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: v.color }} />
                {k}
              </div>
            ))}
          </div>
        </div>
      </div>

      {el && (
        <div onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 100, backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, maxWidth: 380, width: "100%", animation: "pop-in 240ms ease-out" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <ElementBall atomicNumber={el.atomicNumber} size={96} glow={found.has(el.atomicNumber)} />
            </div>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted-foreground)", textAlign: "center" }}>
              {el.category.toUpperCase().replace("-", " ")}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, textAlign: "center", marginTop: 4 }}>{el.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", textAlign: "center", marginBottom: 14 }}>
              {el.symbol} • #{el.atomicNumber} • {el.atomicMass}
            </div>
            {found.has(el.atomicNumber) ? (
              <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{el.fact}</p>
            ) : (
              <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "var(--muted-foreground)", fontStyle: "italic" }}>
                Locked. Discover this element through fusion to unlock its facts.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}