import {
  ATOM_SKINS,
  ATOM_SKIN_BY_BOARD_THEME,
  BOARD_THEMES,
  isAtomSkinUnlocked,
  isBoardThemeUnlocked,
  type AtomSkin,
  type BoardTheme,
  useProgress,
} from "./store";
import type { ProductId } from "./products";
import { setMusicVolume, setSfxVolume, startAmbientMusic, stopAmbientMusic } from "./audio";
import { isNativePlatform, useIsTabletLayout } from "./responsive";

export function Settings({ onBack, onOpenShop }: { onBack: () => void; onOpenShop?: () => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    soundVolume,
    musicVolume,
    appTheme,
    boardTheme,
    atomSkin,
    ownedThemeProducts,
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
    setAtomSkin,
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
            value={boardTheme}
            hasProPack={hasProPack}
            ownedThemeProducts={ownedThemeProducts}
            onChange={setBoardTheme}
            onOpenShop={onOpenShop}
          />
          <AtomSkinPicker
            value={atomSkin}
            hasProPack={hasProPack}
            ownedThemeProducts={ownedThemeProducts}
            onChange={setAtomSkin}
            onOpenShop={onOpenShop}
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
  goldLab: "Gold Lab",
  neonPeriodic: "Neon Periodic",
  quantumVoid: "Quantum Void",
  biohazard: "Biohazard",
};

const BOARD_THEME_UNLOCK_KIND: Record<BoardTheme, "free" | "pro" | "buy"> = {
  reactor: "free",
  cryo: "pro",
  forge: "pro",
  goldLab: "buy",
  neonPeriodic: "buy",
  quantumVoid: "buy",
  biohazard: "buy",
};

export function BoardThemePicker({
  value,
  hasProPack,
  ownedThemeProducts,
  onChange,
  onOpenShop,
}: {
  value: BoardTheme;
  hasProPack: boolean;
  ownedThemeProducts: ProductId[];
  onChange: (theme: BoardTheme) => void;
  onOpenShop?: () => void;
}) {
  const anyLocked = BOARD_THEMES.some(
    (theme) => !isBoardThemeUnlocked(theme, { hasProPack, ownedThemeProducts }),
  );
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
        {anyLocked && onOpenShop && (
          <button
            type="button"
            onClick={onOpenShop}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Buy in Shop →
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {BOARD_THEMES.map((theme) => {
          const locked = !isBoardThemeUnlocked(theme, { hasProPack, ownedThemeProducts });
          const active = value === theme;
          const label = BOARD_THEME_LABELS[theme];
          const unlockKind = BOARD_THEME_UNLOCK_KIND[theme];
          const badge = unlockKind === "pro" ? "Pro" : unlockKind === "buy" ? "Buy" : null;
          return (
            <button
              key={theme}
              type="button"
              aria-disabled={locked}
              onClick={() => (locked ? onOpenShop?.() : onChange(theme))}
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
                cursor: locked ? (onOpenShop ? "pointer" : "not-allowed") : "pointer",
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
                {locked && badge && (
                  <span
                    style={{
                      fontSize: 8,
                      letterSpacing: 0.6,
                      color: "var(--accent)",
                      textTransform: "uppercase",
                    }}
                  >
                    {badge}
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

const ATOM_SKIN_LABELS: Record<AtomSkin, string> = {
  classic: "Classic",
  chrome: "Chrome",
  hologram: "Hologram",
  crystal: "Crystal",
  toxic: "Toxic",
};

const BOARD_THEME_BY_ATOM_SKIN = Object.fromEntries(
  Object.entries(ATOM_SKIN_BY_BOARD_THEME).map(([theme, skin]) => [skin, theme as BoardTheme]),
) as Partial<Record<AtomSkin, BoardTheme>>;

export function AtomSkinPicker({
  value,
  hasProPack,
  ownedThemeProducts,
  onChange,
  onOpenShop,
}: {
  value: AtomSkin;
  hasProPack: boolean;
  ownedThemeProducts: ProductId[];
  onChange: (skin: AtomSkin) => void;
  onOpenShop?: () => void;
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
      aria-label="Atom skin"
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong>Atom skin</strong>
        {onOpenShop &&
          ATOM_SKINS.some(
            (skin) => !isAtomSkinUnlocked(skin, { hasProPack, ownedThemeProducts }),
          ) && (
            <button
              type="button"
              onClick={onOpenShop}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Buy in Shop →
            </button>
          )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {ATOM_SKINS.map((skin) => {
          const locked = !isAtomSkinUnlocked(skin, { hasProPack, ownedThemeProducts });
          const active = value === skin;
          const bundleTheme = BOARD_THEME_BY_ATOM_SKIN[skin];
          return (
            <button
              key={skin}
              type="button"
              aria-disabled={locked}
              onClick={() => (locked ? onOpenShop?.() : onChange(skin))}
              title={
                locked && bundleTheme
                  ? `Included with the ${BOARD_THEME_LABELS[bundleTheme]} theme`
                  : undefined
              }
              style={{
                minHeight: 60,
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
                cursor: locked ? (onOpenShop ? "pointer" : "not-allowed") : "pointer",
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
                {ATOM_SKIN_LABELS[skin]}
                {locked && (
                  <span
                    style={{
                      fontSize: 8,
                      letterSpacing: 0.6,
                      color: "var(--accent)",
                      textTransform: "uppercase",
                    }}
                  >
                    Buy
                  </span>
                )}
              </span>
              <AtomSkinSwatch skin={skin} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function AtomSkinSwatch({ skin }: { skin: AtomSkin }) {
  const gradients: Record<AtomSkin, string> = {
    classic: "radial-gradient(circle at 32% 28%, #ffe9a8, #d68a2c 65%, #241505)",
    chrome: "radial-gradient(circle at 32% 28%, #ffffff, #b9c2c9 55%, #4a5157)",
    hologram: "radial-gradient(circle at 32% 28%, #d6fbff, #35c7e6 55%, #0c3a47)",
    crystal: "radial-gradient(circle at 32% 28%, #f1e6ff, #9a6fe0 55%, #2c1355)",
    toxic: "radial-gradient(circle at 32% 28%, #ecffb0, #7ed321 55%, #1e3b06)",
  };
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: gradients[skin],
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.22)",
      }}
    />
  );
}

function ThemeSwatch({ theme }: { theme: BoardTheme }) {
  const gradients: Record<BoardTheme, string> = {
    reactor: "linear-gradient(135deg, #10252a, #0c1116 52%, #c27638)",
    cryo: "linear-gradient(135deg, #d7f5ff, #183040 52%, #4ca7d8)",
    forge: "linear-gradient(135deg, #ffce72, #2a1511 52%, #db5c32)",
    goldLab: "linear-gradient(135deg, #ffe9a8, #241505 52%, #c9902c)",
    neonPeriodic: "linear-gradient(135deg, #7af6ff, #120a24 52%, #ea5cff)",
    quantumVoid: "linear-gradient(135deg, #b79bff, #07040f 52%, #4a2fa8)",
    biohazard: "linear-gradient(135deg, #e4ff7a, #131c06 52%, #63c92c)",
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
