import { LEVELS } from "./levels";
import { ELEMENTS } from "./elements";
import { useProgress } from "./store";
import { ElementBall } from "./ElementBall";

export function LevelSelect({ onPick, onBack }: { onPick: (id: number) => void; onBack: () => void }) {
  const { unlockedLevel } = useProgress();
  return (
    <div className="app-shell" style={{ padding: 16 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto" }}>
        <Header title="Levels" onBack={onBack} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>
          {LEVELS.map((lvl) => {
            const locked = lvl.id > unlockedLevel;
            const target = ELEMENTS[lvl.targetElement - 1];
            return (
              <button key={lvl.id} disabled={locked} onClick={() => onPick(lvl.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: 12,
                  background: locked ? "var(--surface)" : "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  textAlign: "left",
                  opacity: locked ? 0.45 : 1,
                  cursor: locked ? "not-allowed" : "pointer",
                  color: "var(--foreground)",
                }}>
                <div style={{ filter: locked ? "grayscale(0.8)" : undefined }}>
                  <ElementBall atomicNumber={lvl.targetElement} size={48} glow={!locked} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>LEVEL {lvl.id}</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{lvl.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{lvl.description}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted-foreground)" }}>
                  {locked ? "🔒" : `→ ${target?.symbol}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
      <button onClick={onBack}
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 10, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
      <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>{title}</h1>
    </div>
  );
}