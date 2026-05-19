import { useProgress } from "./store";

export function Settings({ onBack }: { onBack: () => void }) {
  const { soundEnabled, musicEnabled, hapticsEnabled, toggleSound, toggleMusic, toggleHaptics, reset } =
    useProgress();
  return (
    <div className="app-shell" style={{ padding: 16 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <button onClick={onBack} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 10, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Settings</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Music" value={musicEnabled} onToggle={toggleMusic} />
          <Row label="Sound effects" value={soundEnabled} onToggle={toggleSound} />
          <Row label="Haptics" value={hapticsEnabled} onToggle={toggleHaptics} />
          <button
            onClick={() => {
              if (confirm("Reset all progress? This cannot be undone.")) reset();
            }}
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "transparent",
              border: "1px solid var(--destructive)",
              color: "var(--destructive)",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >Reset Progress</button>
        </div>
        <div style={{ marginTop: 28, padding: 14, background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--muted-foreground)", marginBottom: 6 }}>HOW TO PLAY</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
            <li>Tap a column to drop your current element.</li>
            <li>Two identical neighbors fuse into the next element.</li>
            <li>Cascades multiply your score.</li>
            <li>Reach the level's target element to win.</li>
            <li>If a column reaches the top, the level ends.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, color: "var(--foreground)", cursor: "pointer", fontSize: 15, fontWeight: 600,
      }}>
      <span>{label}</span>
      <span style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? "var(--primary)" : "var(--surface-high)",
        position: "relative", transition: "background 0.2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%", background: "white",
          transition: "left 0.2s",
        }} />
      </span>
    </button>
  );
}
