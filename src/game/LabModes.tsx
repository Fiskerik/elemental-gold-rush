import { LEVELS } from "./levels";
import { GAME_MODES, GameModeId, getUnlockedGameModes } from "./challenges";
import { useProgress } from "./store";

interface Props {
  onBack: () => void;
  onStart: (mode: GameModeId, levelId: number) => void;
}

export function LabModes({ onBack, onStart }: Props) {
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const unlockedModes = new Set(getUnlockedGameModes(unlockedLevel).map((mode) => mode.id));
  const levelId = Math.min(unlockedLevel, LEVELS.length);

  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtn}>
          ← Menu
        </button>
        <header style={{ textAlign: "center", margin: "18px 0 20px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "var(--accent)", fontWeight: 800 }}>
            LAB EXPERIMENTS
          </div>
          <h1 className="gold-text" style={{ margin: "6px 0", fontSize: 34 }}>
            Game Modes
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: 0 }}>
            Try campaign variants, challenge rules, and Survival.
          </p>
        </header>
        <div style={{ display: "grid", gap: 12 }}>
          {GAME_MODES.map((mode) => {
            const locked = !unlockedModes.has(mode.id);
            return (
              <article key={mode.id} style={{ ...card, opacity: locked ? 0.55 : 1 }}>
                <div style={iconWrap}>{mode.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>{mode.name}</h2>
                    <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 800 }}>
                      {locked ? `Unlocks Lv ${mode.unlockedAtLevel}` : mode.kind.toUpperCase()}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "6px 0",
                      color: "var(--muted-foreground)",
                      fontSize: 13,
                      lineHeight: 1.45,
                    }}
                  >
                    {mode.description}
                  </p>
                  <ul
                    style={{
                      margin: "0 0 10px 16px",
                      padding: 0,
                      color: "var(--muted-foreground)",
                      fontSize: 12,
                    }}
                  >
                    {mode.rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                  <button
                    disabled={locked}
                    onClick={() => onStart(mode.id, levelId)}
                    style={startBtn}
                  >
                    {locked ? "Locked" : mode.id === "campaign" ? "Play Campaign" : "Start Mode"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
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
  alignItems: "flex-start",
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
const startBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "9px 12px",
  background: "linear-gradient(135deg, var(--primary), var(--accent))",
  color: "var(--primary-foreground)",
  fontWeight: 800,
  cursor: "pointer",
};
