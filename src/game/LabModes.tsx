import { Atom, Clock, Eye, FlaskConical, LockKeyhole, Map, Orbit, RotateCcw, Shield, Sparkles, type LucideIcon } from "lucide-react";
import { MAX_LEVEL } from "./levels";
import { GAME_MODES, GameModeId, getUnlockedGameModes } from "./challenges";
import { BOSSES, type BossId } from "./bosses";
import { useProgress } from "./store";
import { useIsTabletLayout } from "./responsive";

interface Props {
  onBack: () => void;
  onStart: (mode: GameModeId, levelId: number) => void;
}

export function LabModes({ onBack, onStart }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const levelStats = useProgress((s) => s.levelStats);
  const unlockedModes = new Set(getUnlockedGameModes(unlockedLevel).map((mode) => mode.id));
  const levelId = Math.min(unlockedLevel, MAX_LEVEL);
  const defeatedBosses = new Set(
    (["elemental-boss", "periodic-guardian", "nucleus-core"] as BossId[]).filter(
      (id) => (levelStats[BOSSES[id].levelId]?.bestShots ?? null) != null,
    ),
  );

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
                  <button
                    disabled={locked}
                    onClick={() =>
                      onStart(
                        mode.id,
                        bossId ? BOSSES[bossId].levelId : levelId,
                      )
                    }
                    style={startBtn}
                  >
                    {locked ? "Locked" : mode.id === "campaign" ? "Play Campaign" : bossId ? "Boss Battle" : "Start Mode"}
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
};

const CHALLENGE_ICON_STYLES: Record<string, { color: string; background: string; glow: string }> = {
  campaign: {
    color: "oklch(0.88 0.18 90)",
    background: "radial-gradient(circle at 28% 24%, oklch(0.95 0.16 95), transparent 36%), linear-gradient(135deg, oklch(0.62 0.18 78), oklch(0.38 0.13 42))",
    glow: "oklch(0.78 0.16 80 / 0.5)",
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
