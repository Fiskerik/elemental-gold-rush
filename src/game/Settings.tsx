import { useProgress } from "./store";
import { startAmbientMusic, stopAmbientMusic } from "./audio";
import { useIsTabletLayout } from "./responsive";

export function Settings({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const { soundEnabled, musicEnabled, hapticsEnabled, appTheme, shootingStyle, toggleSound, toggleMusic, toggleHaptics, toggleAppTheme, setShootingStyle, reset } =
    useProgress();
  const handleMusicToggle = () => {
    if (!musicEnabled) startAmbientMusic();
    else stopAmbientMusic();
    toggleMusic();
  };
  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 24 : 16 }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 760 : 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <button onClick={onBack} style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)", borderRadius: 10, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>← Back</button>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Settings</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Music" value={musicEnabled} onToggle={handleMusicToggle} />
          <Row label="Sound effects" value={soundEnabled} onToggle={toggleSound} />
          <Row label="Haptics" value={hapticsEnabled} onToggle={toggleHaptics} />
          <Row
            label={`Theme: ${appTheme === "dark" ? "Dark" : "Light"}`}
            value={appTheme === "light"}
            onToggle={toggleAppTheme}
          />
          <Row
            label={`Play style: ${shootingStyle === "hold" ? "Hold" : "Press"}`}
            value={shootingStyle === "press"}
            onToggle={() => setShootingStyle(shootingStyle === "hold" ? "press" : "hold")}
          />
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
