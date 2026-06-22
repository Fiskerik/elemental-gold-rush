import { BOARD_THEMES, type BoardTheme, useProgress } from "./store";
import { setMusicVolume, setSfxVolume, startAmbientMusic, stopAmbientMusic } from "./audio";
import { isNativePlatform, useIsTabletLayout } from "./responsive";

export function Settings({ onBack }: { onBack: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    soundVolume,
    musicVolume,
    appTheme,
    boardTheme,
    hasProPack,
    shootingStyle,
    webBoardWide,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    setSoundVolume,
    setMusicVolume: setMusicVolumeStore,
    toggleAppTheme,
    setBoardTheme,
    setShootingStyle,
    setWebBoardWide,
    reset,
  } = useProgress();
  const isWeb = !isNativePlatform();
  const handleMusicToggle = () => {
    if (!musicEnabled) startAmbientMusic();
    else stopAmbientMusic();
    toggleMusic();
  };
  const handleMusicVolumeChange = (value: number) => {
    setMusicVolumeStore(value);
    setMusicVolume(value / 100);
  };
  const handleSoundVolumeChange = (value: number) => {
    setSoundVolume(value);
    setSfxVolume(value / 100);
  };
  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 24 : 16 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 760 : 480,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <button
            onClick={onBack}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
              borderRadius: 10,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ← Back
          </button>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>Settings</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label="Music" value={musicEnabled} onToggle={handleMusicToggle} />
          {musicEnabled && (
            <VolumeRow
              label="Music volume"
              value={musicVolume}
              onChange={handleMusicVolumeChange}
            />
          )}
          <Row label="Sound effects" value={soundEnabled} onToggle={toggleSound} />
          {soundEnabled && (
            <VolumeRow
              label="Sound volume"
              value={soundVolume}
              onChange={handleSoundVolumeChange}
            />
          )}
          <Row label="Haptics" value={hapticsEnabled} onToggle={toggleHaptics} />
          <Row
            label={`Theme: ${appTheme === "dark" ? "Dark" : "Light"}`}
            value={appTheme === "light"}
            onToggle={toggleAppTheme}
          />
          <BoardThemePicker
            value={hasProPack ? boardTheme : "reactor"}
            hasProPack={hasProPack}
            onChange={setBoardTheme}
          />
          <Row
            label={`Play style: ${shootingStyle === "hold" ? "Hold" : "Press"}`}
            value={shootingStyle === "press"}
            onToggle={() => setShootingStyle(shootingStyle === "hold" ? "press" : "hold")}
          />
          {isWeb && (
            <Row
              label={`Board view: ${webBoardWide ? "Broad" : "Mobile"}`}
              value={webBoardWide}
              onToggle={() => setWebBoardWide(!webBoardWide)}
            />
          )}
          <button
            onClick={() => {
              if (!confirm("Reset all progress? This cannot be undone.")) return;
              if (
                !confirm(
                  "Only your unspent gold coins will be saved. Levels, discoveries, upgrades, inventory, and records will be reset.",
                )
              )
                return;
              reset();
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
          >
            Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}

const BOARD_THEME_LABELS: Record<BoardTheme, string> = {
  reactor: "Reactor",
  cryo: "Cryo Core",
  forge: "Solar Forge",
};

function BoardThemePicker({
  value,
  hasProPack,
  onChange,
}: {
  value: BoardTheme;
  hasProPack: boolean;
  onChange: (theme: BoardTheme) => void;
}) {
  return (
    <section
      style={{
        display: "grid",
        gap: 8,
        padding: "14px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
      aria-label="Board theme"
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong>Board theme</strong>
        {!hasProPack && (
          <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 900 }}>Pro skins</span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {BOARD_THEMES.map((theme) => {
          const locked = theme !== "reactor" && !hasProPack;
          const active = value === theme;
          const label = BOARD_THEME_LABELS[theme];
          return (
            <button
              key={theme}
              type="button"
              disabled={locked}
              onClick={() => onChange(theme)}
              style={{
                minHeight: 72,
                display: "grid",
                alignContent: "space-between",
                gap: 6,
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                background: active
                  ? "color-mix(in oklch, var(--accent) 16%, var(--surface-high))"
                  : "var(--surface-high)",
                color: locked ? "var(--muted-foreground)" : "var(--foreground)",
                opacity: locked ? 0.56 : 1,
                cursor: locked ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {label}
                {locked && (
                  <span
                    style={{
                      fontSize: 8,
                      letterSpacing: 0.6,
                      color: "var(--accent)",
                      textTransform: "uppercase",
                    }}
                  >
                    Pro
                  </span>
                )}
              </span>
              <ThemeSwatch theme={theme} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ThemeSwatch({ theme }: { theme: BoardTheme }) {
  const gradients: Record<BoardTheme, string> = {
    reactor: "linear-gradient(135deg, #10252a, #0c1116 52%, #c27638)",
    cryo: "linear-gradient(135deg, #d7f5ff, #183040 52%, #4ca7d8)",
    forge: "linear-gradient(135deg, #ffce72, #2a1511 52%, #db5c32)",
  };
  return (
    <span
      aria-hidden="true"
      style={{
        height: 8,
        borderRadius: 999,
        background: gradients[theme],
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
      }}
    />
  );
}

function Row({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        color: "var(--foreground)",
        cursor: "pointer",
        fontSize: 15,
        fontWeight: 600,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? "var(--primary)" : "var(--surface-high)",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            transition: "left 0.2s",
          }}
        />
      </span>
    </button>
  );
}

function VolumeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        color: "var(--foreground)",
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <span style={{ minWidth: 110 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        style={{ flex: 1, accentColor: "var(--primary)", cursor: "pointer" }}
      />
      <span style={{ minWidth: 42, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {value}%
      </span>
    </div>
  );
}
