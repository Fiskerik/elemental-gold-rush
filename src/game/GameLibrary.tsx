import { useState } from "react";
import { Atom, Clock, Eye, FlaskConical, LockKeyhole, Map, Orbit, RotateCcw, Shield, Sparkles, type LucideIcon } from "lucide-react";
import { GAME_MODES } from "./challenges";
import { BOSSES, type BossId } from "./bosses";
import { PowerUpBadge } from "./PowerUpLibrary";
import { POWER_UPS } from "./powerUps";
import { useProgress } from "./store";
import { useIsTabletLayout } from "./responsive";
import { t } from "./localization";

interface Props {
  onBack: () => void;
}

export function GameLibrary({ onBack }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const levelStats = useProgress((s) => s.levelStats);
  const appLanguage = useProgress((s) => s.appLanguage);
  const [tab, setTab] = useState<"challenges" | "powerups" | "bosses">("powerups");
  const [selectedPowerUpId, setSelectedPowerUpId] = useState(POWER_UPS[0]?.icon ?? "molecule");
  const [selectedChallengeId, setSelectedChallengeId] = useState("daily-board");
  const [selectedBossId, setSelectedBossId] = useState<BossId>("elemental-boss");
  const tr = (text: string) => t(text, appLanguage);
  const powerUpsByOccurrence = [...POWER_UPS].sort(
    (a, b) => POWER_UP_OCCURRENCE[a.icon] - POWER_UP_OCCURRENCE[b.icon],
  );
  const challengeModes = GAME_MODES.filter(
    (mode) => mode.kind !== "campaign" && mode.id !== "daily-challenge",
  );
  const selectedPowerUp =
    powerUpsByOccurrence.find((powerUp) => powerUp.icon === selectedPowerUpId) ??
    powerUpsByOccurrence[0];
  const selectedChallenge = challengeModes.find((mode) => mode.id === selectedChallengeId);
  const selectedBoss = BOSS_LIBRARY.find((boss) => boss.id === selectedBossId) ?? BOSS_LIBRARY[0];
  const selectedBossConfig = selectedBoss ? BOSSES[selectedBoss.id] : null;

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 1020 : 640, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtn}>
          ← {tr("Menu")}
        </button>
        <header style={{ textAlign: "center", margin: "18px 0 20px" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}>
            {tr("GAME LIBRARY")}
          </div>
          <h1 className="gold-text" style={{ margin: "6px 0", fontSize: 34 }}>
            {tr("Challenges & Power-Ups")}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: 0 }}>
            {tr("Browse every challenge rule set and learn what each lab tool does.")}
          </p>
        </header>

        <div style={tabBar}>
          <button
            onClick={() => setTab("powerups")}
            style={{ ...tabBtn, ...(tab === "powerups" ? tabBtnActive : {}) }}
          >
            {tr("Power-Ups")}
          </button>
          <button
            onClick={() => setTab("challenges")}
            style={{ ...tabBtn, ...(tab === "challenges" ? tabBtnActive : {}) }}
          >
            {tr("Challenges")}
          </button>
          <button
            onClick={() => setTab("bosses")}
            style={{ ...tabBtn, ...(tab === "bosses" ? tabBtnActive : {}) }}
          >
            {tr("Bosses")}
          </button>
        </div>

        {tab === "powerups" && selectedPowerUp && (
          <LibrarySplitPane
            label={tr("Select a power-up")}
            tiles={powerUpsByOccurrence.map((powerUp) => ({
              id: powerUp.icon,
              label: tr(powerUp.name),
              active: powerUp.icon === selectedPowerUp.icon,
              icon: <PowerUpBadge icon={powerUp.icon} size={44} />,
              onClick: () => setSelectedPowerUpId(powerUp.icon),
            }))}
            reader={
              <>
                <div style={readerIcon}><PowerUpBadge icon={selectedPowerUp.icon} size={54} /></div>
                <h2 style={readerTitle}>{tr(selectedPowerUp.name)}</h2>
                <p style={description}>{tr(selectedPowerUp.description)}</p>
                <div style={unlockDetails}>
                  <span>{tr("Unlocked at level:")} {selectedPowerUp.unlock.replace(/^Level /, "").split(" /")[0]}</span>
                  <span>{tr("Obtained by")} {tr(selectedPowerUp.obtainedBy)}</span>
                </div>
              </>
            }
            isTabletLayout={isTabletLayout}
          />
        )}

        {tab === "challenges" && (
          <LibrarySplitPane
            label={tr("Select a challenge")}
            tiles={[
              {
                id: "daily-board",
                label: tr("Daily Board"),
                active: selectedChallengeId === "daily-board",
                icon: <ChallengeIcon id="daily-challenge" />,
                onClick: () => setSelectedChallengeId("daily-board"),
              },
              {
                id: "daily-compound",
                label: tr("Daily Compound"),
                active: selectedChallengeId === "daily-compound",
                icon: <ChallengeIcon id="daily-compound" />,
                onClick: () => setSelectedChallengeId("daily-compound"),
              },
              ...challengeModes.map((mode) => ({
                id: mode.id,
                label: tr(mode.name),
                active: selectedChallengeId === mode.id,
                locked: unlockedLevel < mode.unlockedAtLevel,
                icon: <ChallengeIcon id={mode.id} />,
                onClick: () => setSelectedChallengeId(mode.id),
              })),
            ]}
            reader={
              selectedChallengeId === "daily-board" ? (
                <>
                  <div style={readerIcon}><ChallengeIcon id="daily-challenge" /></div>
                  <h2 style={readerTitle}>{tr("Daily Board")}</h2>
                  <p style={description}>{tr("Play today's seeded Round or Compound challenge and replay it for better records.")}</p>
                  <ul style={rulesList}>
                    <li>{tr("Choose today's Round or Compound seed")}</li>
                    <li>{tr("The coin reward pays once; reruns are for records")}</li>
                    <li>{tr("Daily seed resets at midnight")}</li>
                  </ul>
                </>
              ) : selectedChallengeId === "daily-compound" ? (
                <>
                  <div style={readerIcon}><ChallengeIcon id="daily-compound" /></div>
                  <h2 style={readerTitle}>{tr("Daily Compound")}</h2>
                  <p style={description}>{tr("Reveal today's hidden compound by selecting the right atoms from the seeded grid.")}</p>
                  <ul style={rulesList}>
                    <li>{tr("Find the compound formula in the grid")}</li>
                    <li>{tr("Hints unlock after wrong guesses")}</li>
                    <li>{tr("The daily challenge can be replayed for records")}</li>
                  </ul>
                </>
              ) : selectedChallenge ? (
                <>
                  <div style={readerIcon}><ChallengeIcon id={selectedChallenge.id} /></div>
                  <div style={readerHeaderRow}>
                    <h2 style={readerTitle}>{tr(selectedChallenge.name)}</h2>
                    <span style={readerMeta}>{tr(unlockedLevel < selectedChallenge.unlockedAtLevel ? `UNLOCKS LV ${selectedChallenge.unlockedAtLevel}` : selectedChallenge.kind.toUpperCase())}</span>
                  </div>
                  <p style={description}>{tr(selectedChallenge.description)}</p>
                  <ul style={rulesList}>{selectedChallenge.rules.map((rule) => <li key={rule}>{tr(rule)}</li>)}</ul>
                </>
              ) : null
            }
            isTabletLayout={isTabletLayout}
          />
        )}

        {tab === "bosses" && selectedBoss && selectedBossConfig && (
          <LibrarySplitPane
            label={tr("Select a boss")}
            tiles={BOSS_LIBRARY.map((boss) => {
              const config = BOSSES[boss.id];
              const defeated = (levelStats[config.levelId]?.bestShots ?? null) != null;
              return {
                id: boss.id,
                label: tr(defeated ? config.name : "Unknown Boss"),
                active: selectedBossId === boss.id,
                locked: !defeated,
                icon: <BossIcon id={boss.id} defeated={defeated} />,
                onClick: () => setSelectedBossId(boss.id),
              };
            })}
            reader={
              (() => {
                const defeated = (levelStats[selectedBossConfig.levelId]?.bestShots ?? null) != null;
                return (
                  <>
                    <div style={readerIcon}><BossIcon id={selectedBoss.id} defeated={defeated} size={58} /></div>
                    <div style={readerHeaderRow}>
                      <h2 style={readerTitle}>{tr(defeated ? selectedBossConfig.name : "Unknown Boss")}</h2>
                      <span style={readerMeta}>{tr(defeated ? `LEVEL ${selectedBossConfig.levelId}` : `LOCKED LV ${selectedBossConfig.levelId}`)}</span>
                    </div>
                    <p style={description}>{tr(defeated ? selectedBoss.lore : "Defeat this boss in Campaign to archive its field notes.")}</p>
                    {defeated && <ul style={rulesList}>{selectedBoss.mechanics.map((rule) => <li key={rule}>{tr(rule)}</li>)}</ul>}
                  </>
                );
              })()
            }
            isTabletLayout={isTabletLayout}
          />
        )}
      </div>
    </div>
  );
}

type LibraryTile = {
  id: string;
  label: string;
  active: boolean;
  locked?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
};

function LibrarySplitPane({
  label,
  tiles,
  reader,
  isTabletLayout,
}: {
  label: string;
  tiles: LibraryTile[];
  reader: React.ReactNode;
  isTabletLayout: boolean;
}) {
  return (
    <section style={sectionCard}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTabletLayout ? "minmax(0, 1.08fr) minmax(260px, 0.92fr)" : "1fr",
          gap: 14,
        }}
      >
        <div>
          <div style={paneLabel}>{label}</div>
          <div style={iconGrid}>
            {tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={tile.onClick}
                aria-label={tile.label}
                title={tile.label}
                style={{
                  ...iconTile,
                  ...(tile.active ? iconTileActive : {}),
                  opacity: tile.locked ? 0.48 : 1,
                  filter: tile.locked ? "grayscale(0.35)" : undefined,
                }}
              >
                {tile.icon}
              </button>
            ))}
          </div>
        </div>
        <aside style={readerPane} aria-live="polite">
          {reader}
        </aside>
      </div>
    </section>
  );
}

const BOSS_LIBRARY: Array<{ id: BossId; lore: string; mechanics: string[] }> = [
  {
    id: "elemental-boss",
    lore: "The first lab guardian is a stitched-together watcher grown from low-period atoms. It opens only a few eyes at once, forcing clean recognition instead of brute force.",
    mechanics: ["Match the open eye element to deal damage", "Shimmer shots hit harder", "Charge the center eye to earn Blank atoms"],
  },
  {
    id: "periodic-guardian",
    lore: "The archive built this sentinel to test whether you understand families, not just symbols. Its core cycles through metals, halogens, and noble gases like a living table.",
    mechanics: ["Only the active family can damage the core", "Closed weak spots briefly reject shots", "Idle too long and the E-beam vaporizes your queued atom"],
  },
  {
    id: "nucleus-core",
    lore: "A singularity-bound core that hides its eye behind orbiting atoms. It does not guard a table; it bends the arena until straight-line thinking falls apart.",
    mechanics: ["The black hole bends live shots", "Removed orbit atoms no longer fire back", "Clear the orbit, then hit the exposed eye three times"],
  },
];

const CHALLENGE_ICONS: Record<string, LucideIcon> = {
  campaign: Map,
  "elemental-boss": Eye,
  "periodic-guardian": Sparkles,
  "nucleus-core": Orbit,
  survival: Shield,
  "unstable-isotopes": Atom,
  "gravity-surge": RotateCcw,
  "pure-hydrogen": FlaskConical,
  "noble-gas-lock": LockKeyhole,
  "gold-rush-timer": Clock,
  "isotope-decay": Atom,
  "daily-challenge": FlaskConical,
  "daily-compound": Atom,
};

function BossIcon({ id, defeated = true, size = 42 }: { id: BossId; defeated?: boolean; size?: number }) {
  const Icon = id === "periodic-guardian" ? Sparkles : id === "nucleus-core" ? Orbit : Eye;
  const style = BOSS_BADGE_STYLES[id];
  const innerSize = Math.round(size * 0.62);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        background: style.background,
        border: `1px solid ${style.border}`,
        boxShadow: `${style.shadow}, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -10px 18px rgba(0,0,0,0.22)`,
        opacity: defeated ? 1 : 0.58,
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 24%, rgba(255,255,255,.9), transparent 22%), ${style.innerBackground}`,
          border: `1px solid ${style.innerBorder}`,
          boxShadow: `inset 2px 2px 4px rgba(255,255,255,.3), inset -3px -4px 6px rgba(0,0,0,.28), 0 0 8px ${style.glow}`,
        }}
      >
        <Icon size={Math.round(innerSize * 0.54)} color="white" strokeWidth={2.7} style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,.96))" }} />
      </div>
    </div>
  );
}

const BOSS_BADGE_STYLES: Record<BossId, { background: string; border: string; shadow: string; innerBackground: string; innerBorder: string; glow: string }> = {
  "elemental-boss": {
    background: "linear-gradient(135deg, oklch(0.58 0.18 155), oklch(0.34 0.14 205))",
    border: "oklch(0.75 0.18 155)",
    shadow: "0 0 14px oklch(0.68 0.18 155 / 0.52)",
    innerBackground: "linear-gradient(145deg, oklch(0.54 0.18 155), oklch(0.28 0.12 205))",
    innerBorder: "oklch(0.78 0.16 155)",
    glow: "oklch(0.7 0.18 155 / 0.62)",
  },
  "periodic-guardian": {
    background: "linear-gradient(135deg, oklch(0.68 0.2 55), oklch(0.42 0.16 330))",
    border: "oklch(0.85 0.18 60)",
    shadow: "0 0 14px oklch(0.76 0.2 55 / 0.55)",
    innerBackground: "linear-gradient(145deg, oklch(0.64 0.2 55), oklch(0.34 0.15 330))",
    innerBorder: "oklch(0.9 0.17 75)",
    glow: "oklch(0.78 0.2 55 / 0.66)",
  },
  "nucleus-core": {
    background: "linear-gradient(135deg, oklch(0.62 0.19 300), oklch(0.36 0.16 250))",
    border: "oklch(0.8 0.18 300)",
    shadow: "0 0 14px oklch(0.7 0.18 300 / 0.55)",
    innerBackground: "linear-gradient(145deg, oklch(0.56 0.18 300), oklch(0.28 0.13 250))",
    innerBorder: "oklch(0.82 0.16 300)",
    glow: "oklch(0.72 0.18 300 / 0.66)",
  },
};

const POWER_UP_OCCURRENCE: Record<string, number> = {
  molecule: 1,
  shimmer: 3,
  unstable: 6,
  grab: 8,
  egun: 11,
  gravity: 13,
  stone: 17,
  transmute: 19,
  "fusion-jump": 22,
  catalyst: 24,
  emission: 27,
  gamma: 29,
  blank: 32,
  "queue-shuffle": 34,
};

const CHALLENGE_ICON_STYLES: Record<string, { color: string; background: string; glow: string }> = {
  "daily-challenge": {
    color: "oklch(0.9 0.18 90)",
    background: "radial-gradient(circle at 30% 24%, oklch(0.96 0.16 95), transparent 34%), linear-gradient(135deg, oklch(0.54 0.16 82), oklch(0.32 0.12 230))",
    glow: "oklch(0.78 0.16 90 / 0.5)",
  },
  "daily-compound": {
    color: "oklch(0.92 0.16 145)",
    background: "radial-gradient(circle at 30% 22%, oklch(0.9 0.19 150), transparent 34%), linear-gradient(135deg, oklch(0.46 0.18 155), oklch(0.3 0.12 200))",
    glow: "oklch(0.72 0.16 155 / 0.5)",
  },
  survival: {
    color: "oklch(0.88 0.18 150)",
    background: "radial-gradient(circle at 30% 22%, oklch(0.9 0.19 150), transparent 34%), linear-gradient(135deg, oklch(0.46 0.18 155), oklch(0.3 0.12 200))",
    glow: "oklch(0.72 0.16 155 / 0.5)",
  },
  "unstable-isotopes": {
    color: "oklch(0.9 0.19 55)",
    background: "radial-gradient(circle at 30% 24%, oklch(0.95 0.2 65), transparent 35%), linear-gradient(135deg, oklch(0.58 0.21 35), oklch(0.36 0.16 330))",
    glow: "oklch(0.76 0.18 42 / 0.52)",
  },
  "gravity-surge": {
    color: "oklch(0.9 0.15 255)",
    background: "radial-gradient(circle at 70% 22%, oklch(0.86 0.16 245), transparent 34%), linear-gradient(135deg, oklch(0.5 0.17 260), oklch(0.34 0.14 300))",
    glow: "oklch(0.68 0.16 260 / 0.52)",
  },
  "pure-hydrogen": {
    color: "oklch(0.95 0.13 205)",
    background: "radial-gradient(circle at 28% 22%, white, transparent 32%), linear-gradient(135deg, oklch(0.7 0.14 205), oklch(0.38 0.12 230))",
    glow: "oklch(0.78 0.14 210 / 0.52)",
  },
  "noble-gas-lock": {
    color: "oklch(0.91 0.13 305)",
    background: "radial-gradient(circle at 32% 20%, oklch(0.88 0.18 315), transparent 33%), linear-gradient(135deg, oklch(0.48 0.16 305), oklch(0.3 0.1 255))",
    glow: "oklch(0.7 0.15 305 / 0.5)",
  },
  "gold-rush-timer": {
    color: "oklch(0.92 0.18 88)",
    background: "radial-gradient(circle at 72% 22%, oklch(0.98 0.18 95), transparent 35%), linear-gradient(135deg, oklch(0.68 0.18 75), oklch(0.45 0.16 35))",
    glow: "oklch(0.78 0.18 80 / 0.55)",
  },
  "isotope-decay": {
    color: "oklch(0.9 0.18 135)",
    background: "radial-gradient(circle at 32% 26%, oklch(0.9 0.19 135), transparent 34%), linear-gradient(135deg, oklch(0.5 0.17 135), oklch(0.34 0.14 175))",
    glow: "oklch(0.72 0.17 140 / 0.52)",
  },
};

function ChallengeIcon({ id }: { id: string }) {
  const Icon = CHALLENGE_ICONS[id] ?? FlaskConical;
  const style = CHALLENGE_ICON_STYLES[id] ?? CHALLENGE_ICON_STYLES.survival;
  return (
    <div
      aria-hidden="true"
      style={{
        width: 42,
        height: 42,
        borderRadius: 14,
        display: "grid",
        placeItems: "center",
        background: style.background,
        boxShadow: `0 8px 20px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.24)`,
        border: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <Icon size={25} color={style.color} strokeWidth={2.7} />
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

const sectionCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 20,
  background: "linear-gradient(135deg, var(--surface-elevated), var(--surface))",
  border: "1px solid var(--border)",
  boxShadow: "0 12px 28px rgba(0,0,0,0.24)",
  marginBottom: 16,
};

const paneLabel: React.CSSProperties = {
  marginBottom: 10,
  color: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const iconGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
};

const iconTile: React.CSSProperties = {
  minWidth: 0,
  minHeight: 68,
  display: "grid",
  placeItems: "center",
  padding: 8,
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "color-mix(in oklch, var(--surface) 86%, transparent)",
  cursor: "pointer",
};

const iconTileActive: React.CSSProperties = {
  borderColor: "var(--accent)",
  background: "color-mix(in oklch, var(--accent) 14%, var(--surface-high))",
  boxShadow: "0 0 18px var(--accent-glow)",
};

const readerPane: React.CSSProperties = {
  minHeight: 220,
  padding: 16,
  borderRadius: 16,
  background: "color-mix(in oklch, var(--surface) 88%, transparent)",
  border: "1px solid color-mix(in oklch, var(--accent) 36%, var(--border))",
};

const readerIcon: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  minHeight: 56,
  marginBottom: 10,
};

const readerTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 19,
  lineHeight: 1.15,
};

const readerHeaderRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};

const readerMeta: React.CSSProperties = {
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.6,
  textAlign: "right",
};

const unlockDetails: React.CSSProperties = {
  display: "grid",
  gap: 3,
  marginTop: 10,
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 0.35,
  lineHeight: 1.3,
};

const tabBar: React.CSSProperties = {
  display: "flex",
  gap: 6,
  padding: 4,
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  marginBottom: 16,
};

const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 12px",
  borderRadius: 10,
  border: "none",
  background: "transparent",
  color: "var(--muted-foreground)",
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
};

const tabBtnActive: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--primary), var(--accent))",
  color: "var(--primary-foreground)",
  boxShadow: "0 4px 14px var(--primary-glow)",
};

const rowCard: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 14,
  borderRadius: 16,
  background: "var(--surface)",
  border: "1px solid var(--border)",
};

const iconWrap: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 16,
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  fontWeight: 900,
  flex: "0 0 auto",
};

const description: React.CSSProperties = {
  margin: "6px 0",
  color: "var(--muted-foreground)",
  fontSize: 13,
  lineHeight: 1.45,
};

const rulesList: React.CSSProperties = {
  margin: "0 0 0 16px",
  padding: 0,
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.45,
};
