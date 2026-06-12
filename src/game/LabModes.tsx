import { useState } from "react";
import { Atom, CalendarDays, Clock, Eye, FlaskConical, LockKeyhole, Map, Orbit, RotateCcw, Shield, Sparkles, type LucideIcon } from "lucide-react";
import { LEVELS, MAX_LEVEL } from "./levels";
import { GAME_MODES, GameModeId, getUnlockedGameModes } from "./challenges";
import { BOSSES, type BossId } from "./bosses";
import {
  LAB_UPGRADE_COSTS,
  LAB_UPGRADE_IDS,
  type LabUpgradeId,
  getLabUpgradeLevelCap,
  useProgress,
} from "./store";
import { useIsTabletLayout } from "./responsive";
import { PowerUpBadge } from "./PowerUpLibrary";
import { POWER_UP_UNLOCK_LEVELS } from "./powerUps";

interface Props {
  onBack: () => void;
  onStart: (mode: GameModeId, levelId: number, options?: { secretCompoundId?: string }) => void;
}

export function LabModes({ onBack, onStart }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const levelStats = useProgress((s) => s.levelStats);
  const goldCoins = useProgress((s) => s.goldCoins);
  const labUpgradeLevels = useProgress((s) => s.labUpgradeLevels);
  const labUpgradeEnabled = useProgress((s) => s.labUpgradeEnabled);
  const refreshDailyFeatures = useProgress((s) => s.refreshDailyFeatures);
  const revealSecretCompound = useProgress((s) => s.revealSecretCompound);
  const upgradeLabPowerUp = useProgress((s) => s.upgradeLabPowerUp);
  const toggleLabUpgrade = useProgress((s) => s.toggleLabUpgrade);
  const labLevelCap = getLabUpgradeLevelCap(unlockedLevel);
  const unlockedModes = new Set(getUnlockedGameModes(unlockedLevel).map((mode) => mode.id));
  const levelId = Math.min(unlockedLevel, MAX_LEVEL);
  const latestStandardLevel =
    [...LEVELS]
      .reverse()
      .find((level) => level.id <= levelId && !level.specialStage && !level.powerUpStage) ?? LEVELS[0];
  const challengeLevelId = latestStandardLevel?.id ?? 1;
  const discoveredUpgradeIds = LAB_UPGRADE_IDS.filter((id) => unlockedLevel >= POWER_UP_UNLOCK_LEVELS[id]);
  const defeatedBosses = new Set(
    (["elemental-boss", "periodic-guardian", "nucleus-core"] as BossId[]).filter(
      (id) => (levelStats[BOSSES[id].levelId]?.bestShots ?? null) != null,
    ),
  );
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<LabUpgradeId | null>(null);
  const activeUpgradeId = selectedUpgradeId && discoveredUpgradeIds.includes(selectedUpgradeId) ? selectedUpgradeId : discoveredUpgradeIds[0] ?? null;

  function startDailyRound() {
    refreshDailyFeatures();
    const refreshed = useProgress.getState().dailyChallenge;
    onStart("daily-challenge", refreshed.levelId);
  }

  function startDailyCompound() {
    refreshDailyFeatures();
    const { dailyChallenge: refreshedChallenge, secretCompound: refreshedCompound } = useProgress.getState();
    revealSecretCompound();
    onStart("campaign", refreshedChallenge.levelId, { secretCompoundId: refreshedCompound.compoundId });
  }

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 920 : 560, margin: "0 auto" }}>
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
        <section style={upgradePanel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--accent)", fontWeight: 900 }}>LAB UPGRADES</div>
              <h2 style={{ margin: "4px 0 0", fontSize: 22 }}>Permanent Power-Up Research</h2>
            </div>
            <div style={coinBalanceChip}>{goldCoins} coins</div>
          </div>
          <p style={{ margin: "0 0 12px", color: "var(--muted-foreground)", fontSize: 12, lineHeight: 1.45 }}>
            Upgrade levels unlock at campaign levels 5, 10, 20, 35, and 50. Toggle a researched power-up off to disable its bonus effects.
          </p>
          {activeUpgradeId && (() => {
            const id = activeUpgradeId;
            const meta = LAB_UPGRADE_META[id];
            const level = labUpgradeLevels[id] ?? 0;
            const active = labUpgradeEnabled[id] ?? true;
            const nextCost = LAB_UPGRADE_COSTS[level];
            const canUpgrade = labLevelCap > level && nextCost != null && goldCoins >= nextCost;
            const activeBonuses = meta.bonuses.slice(0, Math.max(1, level));
            const futureBonuses = meta.bonuses.slice(Math.max(1, level));
            return (
              <article style={selectedUpgradeCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <PowerUpBadge icon={id} size={42} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16 }}>{meta.name}</h3>
                      <div style={{ marginTop: 3, color: "var(--muted-foreground)", fontSize: 11 }}>
                        Level {level}/5 {labLevelCap <= level && level < 5 ? "- unlock next tier at campaign milestone" : ""}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => toggleLabUpgrade(id)} style={{ ...toggleBtn, color: active ? "var(--accent)" : "var(--muted-foreground)" }}>
                    {active ? "Active" : "Off"}
                  </button>
                </div>
                <div style={upgradeProgressTrack}>
                  <span style={{ ...upgradeProgressFill, width: `${(level / 5) * 100}%` }} />
                </div>
                <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                  {activeBonuses.map((bonus, index) => (
                    <div key={bonus} style={{ color: index < level ? "var(--success, var(--accent))" : "var(--muted-foreground)", fontSize: 11, lineHeight: 1.25 }}>
                      L{index + 1}: {bonus}
                    </div>
                  ))}
                  {futureBonuses.length > 0 && (
                    <details style={futureBonusDetails}>
                      <summary style={futureBonusSummary}>Locked perks L{Math.max(2, level + 1)}-5</summary>
                      <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
                        {futureBonuses.map((bonus, index) => {
                          const bonusLevel = Math.max(1, level) + index + 1;
                          return (
                            <div key={bonus} style={{ color: "var(--muted-foreground)", fontSize: 11, lineHeight: 1.25 }}>
                              L{bonusLevel}: {bonus}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </div>
                <button type="button" disabled={!canUpgrade} onClick={() => upgradeLabPowerUp(id)} style={{ ...startBtn, marginTop: 10, opacity: canUpgrade ? 1 : 0.55 }}>
                  {level >= 5 ? "Maxed" : nextCost == null ? "Locked" : `Upgrade - ${nextCost} coins`}
                </button>
              </article>
            );
          })()}
          <div style={upgradePickerGrid}>
            {discoveredUpgradeIds.map((id) => {
              const meta = LAB_UPGRADE_META[id];
              const level = labUpgradeLevels[id] ?? 0;
              const active = activeUpgradeId === id;
              const levelLabel = level >= 5 ? "Lvl 5 - Max" : `Lvl ${level}/5`;
              return (
                <button key={id} type="button" onClick={() => setSelectedUpgradeId(id)} style={{ ...upgradePickerTile, ...(active ? upgradePickerTileActive : null) }}>
                  <PowerUpBadge icon={id} size={30} />
                  <span style={{ marginTop: 6, fontWeight: 900, fontSize: 11, lineHeight: 1.1 }}>{meta.name}</span>
                  <span
                    style={{
                      marginTop: 3,
                      color:
                        level >= 5
                          ? "var(--accent)"
                          : level > 0
                            ? "var(--success, oklch(0.78 0.16 145))"
                            : "var(--muted-foreground)",
                      fontSize: 10,
                      fontWeight: level > 0 ? 900 : 700,
                    }}
                  >
                    {levelLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
        <div style={{ display: "grid", gridTemplateColumns: isTabletLayout ? "1fr 1fr" : "1fr", gap: isTabletLayout ? 16 : 12 }}>
          {GAME_MODES.map((mode) => {
            const bossId = isBossMode(mode.id) ? mode.id : null;
            const locked = bossId ? !defeatedBosses.has(bossId) : !unlockedModes.has(mode.id);
            return (
              <article key={mode.id} style={{ ...card, opacity: locked ? 0.55 : 1 }}>
                <div style={iconWrap}>
                  <ChallengeIcon id={mode.id} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 16 }}>{mode.name}</h2>
                    <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 800 }}>
                      {locked ? `Defeat Lv ${mode.unlockedAtLevel - 1}` : bossId ? "BOSS BATTLE" : mode.kind.toUpperCase()}
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
                  {mode.id === "daily-challenge" && !locked ? (
                    <div style={dailyChoiceGrid}>
                      <button type="button" onClick={startDailyRound} style={startBtn}>
                        Round Challenge
                      </button>
                      <button type="button" onClick={startDailyCompound} style={{ ...startBtn, ...secondaryStartBtn }}>
                        Compound Challenge
                      </button>
                      <span style={dailyChoiceHint}>
                        Reruns are allowed for records. The daily coin reward still pays only once.
                      </span>
                    </div>
                  ) : (
                    <button
                      disabled={locked}
                      onClick={() =>
                        onStart(
                          mode.id,
                          bossId ? BOSSES[bossId].levelId : mode.id === "campaign" ? levelId : challengeLevelId,
                        )
                      }
                      style={startBtn}
                    >
                      {locked ? "Locked" : mode.id === "campaign" ? "Play Campaign" : bossId ? "Boss Battle" : "Start Mode"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}


const LAB_UPGRADE_META: Record<LabUpgradeId, { name: string; bonuses: string[] }> = {
  molecule: { name: "Compound", bonuses: ["Double compound score", "First compound grants +1 charge", "Triple compound score", "Compound timer -1 minute", "Hints cost 50% less"] },
  shimmer: { name: "Shimmer Atom", bonuses: ["Spawn 7%", "Shimmer score 3x", "Grab progress +3", "Spawn 10%", "Chain shimmer persists"] },
  unstable: { name: "Unstable Atom", bonuses: ["Stabilize score 3x", "+2 decay shields", "Spawn +5%", "Stabilize adds Grab progress", "Shockwave damages Stones"] },
  grab: { name: "Grab", bonuses: ["Start with 1 charge", "Requirement 7 merges", "Grab drop scores 2x", "Requirement 6 merges", "Larger drop shockwave"] },
  egun: { name: "E-Gun", bonuses: ["Spawn 2%", "Beam width +25%", "Cooldown 7 shots", "Upgraded atoms score 2x", "Overcharge damages Stones"] },
  gravity: { name: "Gravity", bonuses: ["Requirement 25 merges", "Gravity merges score 1.5x", "Start with 1 charge", "Requirement 20 merges", "Crush Stones on activate"] },
  stone: { name: "Stone", bonuses: ["Destroy bonus +50%", "Hit shockwave +20%", "Grace period 25 shots", "Destroy bonus +100%", "Drops 2 Fusion Jump"] },
  transmute: { name: "Transmute Shot", bonuses: ["Requirement 25 shots", "25% skip tier", "Start with 1 charge", "Requirement 20 shots", "Transmuted atom shimmers"] },
  "fusion-jump": { name: "Fusion Jump", bonuses: ["Start with 1 charge", "Fusion score 2x", "Arming applies Catalyst", "Fusion score 3x", "Skips two tiers"] },
  catalyst: { name: "Catalyst Aura", bonuses: ["Duration 7 shots", "Start with 1 charge", "Radius +20%", "Duration 10 shots", "Unlocks on 3x chain"] },
  emission: { name: "Emission", bonuses: ["Cooldown 4.5 minutes", "Start with 1 charge", "Next 5 shots score 2x", "Cooldown 4 minutes", "Raises queue by two tiers"] },
  gamma: { name: "Gamma Bomb", bonuses: ["Requirement 35 shots", "Radius +15%", "Start with 1 charge", "Requirement 30 shots", "Damages Stones"] },
  blank: { name: "Blank Atom", bonuses: ["Spawn 2%", "Blank merge scores 2x", "Stone hit grants Fusion Jump", "Spawn 3%", "Always shimmers"] },
  "queue-shuffle": { name: "Queue Shuffle", bonuses: ["Requirement 12 stone hits", "Start with 1 charge", "Next shot shimmers", "Requirement 10 stone hits", "Resets no-merge streak"] },
};
function isBossMode(id: GameModeId): id is BossId {
  return id === "elemental-boss" || id === "periodic-guardian" || id === "nucleus-core";
}

const CHALLENGE_ICONS: Record<string, LucideIcon> = {
  campaign: Map,
  survival: Shield,
  "elemental-boss": Eye,
  "periodic-guardian": Sparkles,
  "nucleus-core": Orbit,
  "unstable-isotopes": Atom,
  "gravity-surge": RotateCcw,
  "pure-hydrogen": FlaskConical,
  "noble-gas-lock": LockKeyhole,
  "gold-rush-timer": Clock,
  "isotope-decay": Atom,
  "daily-challenge": CalendarDays,
};

const CHALLENGE_ICON_STYLES: Record<string, { color: string; background: string; glow: string }> = {
  campaign: {
    color: "oklch(0.88 0.18 90)",
    background: "radial-gradient(circle at 28% 24%, oklch(0.95 0.16 95), transparent 36%), linear-gradient(135deg, oklch(0.62 0.18 78), oklch(0.38 0.13 42))",
    glow: "oklch(0.78 0.16 80 / 0.5)",
  },
  "daily-challenge": {
    color: "oklch(0.9 0.18 90)",
    background: "radial-gradient(circle at 30% 24%, oklch(0.96 0.16 95), transparent 34%), linear-gradient(135deg, oklch(0.54 0.16 82), oklch(0.32 0.12 230))",
    glow: "oklch(0.78 0.16 90 / 0.5)",
  },
  survival: {
    color: "oklch(0.88 0.18 150)",
    background: "radial-gradient(circle at 30% 22%, oklch(0.9 0.19 150), transparent 34%), linear-gradient(135deg, oklch(0.46 0.18 155), oklch(0.3 0.12 200))",
    glow: "oklch(0.72 0.16 155 / 0.5)",
  },
  "elemental-boss": {
    color: "oklch(0.95 0.14 10)",
    background: "radial-gradient(circle at 50% 30%, oklch(0.98 0.12 20), transparent 25%), linear-gradient(135deg, oklch(0.48 0.16 8), oklch(0.22 0.11 280))",
    glow: "oklch(0.74 0.16 12 / 0.52)",
  },
  "periodic-guardian": {
    color: "oklch(0.96 0.14 85)",
    background:
      "radial-gradient(circle at 50% 22%, oklch(0.98 0.16 100), transparent 28%), linear-gradient(135deg, oklch(0.44 0.13 190), oklch(0.3 0.11 280))",
    glow: "oklch(0.8 0.15 92 / 0.52)",
  },
  "nucleus-core": {
    color: "oklch(0.96 0.08 250)",
    background:
      "radial-gradient(circle at 50% 26%, oklch(0.96 0.09 255), transparent 26%), linear-gradient(135deg, oklch(0.4 0.13 250), oklch(0.12 0.04 265))",
    glow: "oklch(0.72 0.12 252 / 0.5)",
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
  const style = CHALLENGE_ICON_STYLES[id] ?? CHALLENGE_ICON_STYLES.campaign;
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


const upgradePanel: React.CSSProperties = {
  marginBottom: 18,
  padding: 14,
  borderRadius: 16,
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
};

const upgradeCard: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
};

const selectedUpgradeCard: React.CSSProperties = {
  ...upgradeCard,
  marginBottom: 10,
};

const upgradePickerGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
};

const upgradePickerTile: React.CSSProperties = {
  minWidth: 0,
  minHeight: 86,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 6px",
  borderRadius: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  cursor: "pointer",
};

const upgradePickerTileActive: React.CSSProperties = {
  border: "1px solid var(--accent)",
  boxShadow: "0 0 16px var(--accent-glow)",
};
const coinBalanceChip: React.CSSProperties = {
  position: "sticky",
  top: 8,
  zIndex: 3,
  color: "var(--accent)",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
  padding: "7px 10px",
  borderRadius: 999,
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
  boxShadow: "0 8px 18px rgba(0,0,0,0.16)",
};

const toggleBtn: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  background: "var(--surface-high)",
  padding: "5px 8px",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
};

const upgradeProgressTrack: React.CSSProperties = {
  height: 7,
  borderRadius: 999,
  background: "var(--surface-high)",
  overflow: "hidden",
  marginTop: 9,
};

const upgradeProgressFill: React.CSSProperties = {
  display: "block",
  height: "100%",
  background: "linear-gradient(90deg, var(--primary), var(--accent))",
};

const futureBonusDetails: React.CSSProperties = {
  marginTop: 2,
  padding: "6px 8px",
  borderRadius: 9,
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
};

const futureBonusSummary: React.CSSProperties = {
  cursor: "pointer",
  color: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 800,
};

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

const secondaryStartBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 42%, var(--surface)), var(--surface-high))",
  color: "var(--foreground)",
  border: "1px solid color-mix(in oklch, var(--accent) 55%, var(--border))",
};

const dailyChoiceGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const dailyChoiceHint: React.CSSProperties = {
  gridColumn: "1 / -1",
  color: "var(--muted-foreground)",
  fontSize: 11,
  lineHeight: 1.35,
};
