import {
  ATOM_SKINS,
  BOARD_THEME_BY_ATOM_SKIN,
  BOARD_THEMES,
  isAtomSkinUnlocked,
  isBoardThemeUnlocked,
  type AtomSkin,
  type BoardTheme,
  useProgress,
} from "./store";
import type { ProductId } from "./products";
import { setMusicVolume, setSfxVolume, startAmbientMusic, stopAmbientMusic } from "./audio";
import { useIsTabletLayout } from "./responsive";
import { t } from "./localization";

export type ShopSection = "themes";

export function Settings({ onBack }: { onBack: () => void; onOpenShop?: (section?: ShopSection) => void }) {
  const isTabletLayout = useIsTabletLayout();
  const {
    soundEnabled,
    musicEnabled,
    hapticsEnabled,
    soundVolume,
    musicVolume,
    appTheme,
    appLanguage,
    shootingStyle,
    toggleSound,
    toggleMusic,
    toggleHaptics,
    setSoundVolume,
    setMusicVolume: setMusicVolumeStore,
    toggleAppTheme,
    setShootingStyle,
    reset,
  } = useProgress();
  const tr = (text: string) => t(text, appLanguage);
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
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800 }}>{tr("Settings")}</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Row label={tr("Music")} value={musicEnabled} onToggle={handleMusicToggle} />
          {musicEnabled && (
            <VolumeRow
              label={tr("Music volume")}
              value={musicVolume}
              onChange={handleMusicVolumeChange}
            />
          )}
          <Row label={tr("Sound effects")} value={soundEnabled} onToggle={toggleSound} />
          {soundEnabled && (
            <VolumeRow
              label={tr("Sound volume")}
              value={soundVolume}
              onChange={handleSoundVolumeChange}
            />
          )}
          <Row label={tr("Haptics")} value={hapticsEnabled} onToggle={toggleHaptics} />
          <Row
            label={`${tr("Theme")}: ${tr(appTheme === "dark" ? "Dark" : "Light")}`}
            value={appTheme === "light"}
            onToggle={toggleAppTheme}
          />
          <Row
            label={`${tr("Play style")}: ${tr(shootingStyle === "hold" ? "Hold" : "Press")}`}
            value={shootingStyle === "press"}
            onToggle={() => setShootingStyle(shootingStyle === "hold" ? "press" : "hold")}
          />
          <button
            onClick={() => {
              if (!confirm(tr("Reset all progress? This cannot be undone."))) return;
              if (
                !confirm(
                  tr("Only your unspent gold coins will be saved. Levels, discoveries, upgrades, inventory, and records will be reset."),
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
            {tr("Reset Progress")}
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
  goldLab: "Gummy Lab",
  neonPeriodic: "Cloud Nine",
  quantumVoid: "Crystal Cove",
  verdantCrystal: "Verdant Crystal",
  biohazard: "Radioactive",
  mossHollow: "Moss Hollow",
};

const BOARD_THEME_UNLOCK_KIND: Record<BoardTheme, "free" | "pro" | "buy"> = {
  reactor: "free",
  cryo: "pro",
  forge: "pro",
  goldLab: "buy",
  neonPeriodic: "buy",
  quantumVoid: "buy",
  verdantCrystal: "buy",
  biohazard: "buy",
  mossHollow: "buy",
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
  onOpenShop?: (section?: ShopSection) => void;
}) {
  const appLanguage = useProgress((state) => state.appLanguage);
  const tr = (text: string) => t(text, appLanguage);
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
      aria-label={tr("Board theme")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong>{tr("Board theme")}</strong>
        {anyLocked && onOpenShop && (
          <button
            type="button"
            onClick={() => onOpenShop("themes")}
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
            {tr("Buy in Shop")} →
          </button>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {BOARD_THEMES.map((theme) => {
          const locked = !isBoardThemeUnlocked(theme, { hasProPack, ownedThemeProducts });
          const active = value === theme;
          const label = tr(BOARD_THEME_LABELS[theme]);
          const unlockKind = BOARD_THEME_UNLOCK_KIND[theme];
          const badge = unlockKind === "pro" ? tr("Pro") : unlockKind === "buy" ? tr("Buy") : null;
          return (
            <button
              key={theme}
              type="button"
              aria-disabled={locked}
              onClick={() => (locked ? onOpenShop?.("themes") : onChange(theme))}
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
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{label}</span>
                {locked && badge && (
                  <span
                    style={{
                      flex: "0 0 auto",
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
  chrome: "Gummy",
  hologram: "Cloud Glass",
  crystal: "Crystal Core",
  mineral: "Mineral",
  verdantCrystal: "Verdant Glass",
  toxic: "Irradiated",
  moss: "Moss Velvet",
};

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
  onOpenShop?: (section?: ShopSection) => void;
}) {
  const appLanguage = useProgress((state) => state.appLanguage);
  const tr = (text: string) => t(text, appLanguage);
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
      aria-label={tr("Atom skin")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <strong>{tr("Atom skin")}</strong>
        {onOpenShop &&
          ATOM_SKINS.some(
            (skin) => !isAtomSkinUnlocked(skin, { hasProPack, ownedThemeProducts }),
          ) && (
            <button
              type="button"
              onClick={() => onOpenShop("themes")}
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
              {tr("Buy in Shop")} →
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
              onClick={() => (locked ? onOpenShop?.("themes") : onChange(skin))}
              title={
                locked && bundleTheme
                  ? `${tr("Included with the")} ${tr(BOARD_THEME_LABELS[bundleTheme])} ${tr("theme")}`
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
                <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{tr(ATOM_SKIN_LABELS[skin])}</span>
                {locked && (
                  <span
                    style={{
                      flex: "0 0 auto",
                      fontSize: 8,
                      letterSpacing: 0.6,
                      color: "var(--accent)",
                      textTransform: "uppercase",
                    }}
                  >
                    {tr("Buy")}
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
    chrome:
      "radial-gradient(circle at 68% 68%, rgba(255,255,255,.36) 0 9%, transparent 10%), linear-gradient(145deg, rgba(255,255,255,.58), transparent 30%), radial-gradient(circle at 32% 28%, #ffe9a8, #d68a2c 65%, #241505)",
    hologram:
      "radial-gradient(ellipse at 32% 30%, rgba(255,255,255,.62), transparent 30%), linear-gradient(165deg, rgba(117,220,255,.3), transparent 42%, rgba(255,148,222,.28)), radial-gradient(circle at 32% 28%, #ffe9a8, #d68a2c 65%, #241505)",
    crystal:
      "linear-gradient(55deg, transparent 46%, rgba(255,255,255,.5) 48% 50%, transparent 52%), conic-gradient(from 25deg, transparent, rgba(255,255,255,.38), transparent 28% 62%, rgba(120,225,255,.22), transparent 78%), radial-gradient(circle at 32% 28%, #ffe9a8, #d68a2c 65%, #241505)",
    mineral:
      "linear-gradient(125deg, rgba(255,255,255,.45) 0 17%, transparent 18% 54%, rgba(75,34,8,.28) 55%), conic-gradient(from 12deg, #ffd775, #b86b24, #ffe6a5, #8f4c17, #ffd775)",
    verdantCrystal:
      "linear-gradient(55deg, transparent 42%, rgba(255,255,255,.72) 44% 48%, transparent 50%), linear-gradient(140deg, rgba(255,255,255,.54), transparent 28% 56%, rgba(34,119,101,.3)), radial-gradient(circle at 32% 28%, #edfff7, #62c7a5 64%, #1e5a55)",
    toxic:
      "radial-gradient(circle at 67% 68%, rgba(14,30,10,.55) 0 7%, transparent 9%), radial-gradient(circle at 42% 72%, rgba(205,255,105,.42) 0 6%, transparent 8%), linear-gradient(145deg, rgba(184,255,76,.3), transparent 42%), radial-gradient(circle at 32% 28%, #ffe9a8, #d68a2c 65%, #241505)",
    moss:
      "radial-gradient(circle at 27% 22%, rgba(226,255,176,.72) 0 6%, transparent 17%), radial-gradient(circle at 72% 68%, rgba(176,224,101,.4) 0 10%, transparent 13%), radial-gradient(circle at 32% 28%, #d9f4a2, #6f9c42 62%, #17351f)",
  };
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        borderRadius: skin === "mineral" ? 3 : "50%",
        clipPath:
          skin === "mineral"
            ? "polygon(50% 0%, 82% 12%, 100% 42%, 88% 78%, 58% 100%, 22% 91%, 0% 58%, 12% 23%)"
            : undefined,
        background: gradients[skin],
        boxShadow: "inset 2px 2px 4px rgba(255,255,255,0.2), inset -2px -2px 4px rgba(0,0,0,0.18)",
      }}
    />
  );
}

function ThemeSwatch({ theme }: { theme: BoardTheme }) {
  const gradients: Record<BoardTheme, string> = {
    reactor: "linear-gradient(135deg, #10252a, #0c1116 52%, #c27638)",
    cryo: "linear-gradient(135deg, #d7f5ff, #183040 52%, #4ca7d8)",
    forge: "linear-gradient(135deg, #ffce72, #2a1511 52%, #db5c32)",
    goldLab: "url('/themes/gummy-lab.webp') center 58% / cover no-repeat",
    neonPeriodic: "url('/themes/cloud-nine.webp') center 46% / cover no-repeat",
    quantumVoid: "url('/themes/crystal-cove.webp') center 58% / cover no-repeat",
    verdantCrystal:
      "radial-gradient(circle at 15% 20%, #ffffff 0 4%, transparent 19%), linear-gradient(135deg, #f2fff8, #b8f1d7 45%, #4d9f8c 78%, #183d45)",
    biohazard: "url('/themes/radioactive-reactor.webp') center 58% / cover no-repeat",
    mossHollow: "url('/themes/moss-hollow.png') center 50% / cover no-repeat",
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
