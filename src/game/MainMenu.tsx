import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Atom,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Layers,
  Library,
  Play,
  ShoppingBag,
  Sparkles,
  Star,
  Settings as SettingsIcon,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { LEVELS, MAX_LEVEL, getLevelById } from "./levels";
import { useProgress } from "./store";
import { formatScore } from "./logic";
import { ELEMENTS } from "./elements";
import { ElementBall } from "./ElementBall";
import { trackMenuAction } from "./analytics";
import { getWeeklyPlayBonusView } from "./weeklyBonus";

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onSettings: () => void;
  onShop: () => void;
  onLab: () => void;
  onLibrary: () => void;
  onProfile: () => void;
}

export function MainMenu({
  onPlay,
  onLevels,
  onCollection,
  onSettings,
  onShop,
  onLab,
  onLibrary,
  onProfile,
}: Props) {
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    goldCoins,
    dailyQuests,
    dailyStreak,
    claimedDailyReward,
    weeklyPlayBonus,
    bestCombo,
    hasProPack,
    refreshDailyLab,
    claimDailyReward,
    claimWeeklyPlayBonus,
  } = useProgress();
  const highestEl = ELEMENTS[highestElement - 1];
  const nextLevel = getLevelById(unlockedLevel) ?? LEVELS[LEVELS.length - 1];
  const targetEl = ELEMENTS[(nextLevel?.targetElement ?? 1) - 1];
  const completedDailyQuests = dailyQuests.filter((quest) => quest.completed).length;
  const dailyComplete = dailyQuests.length > 0 && completedDailyQuests >= 4;
  const campaignProgress = Math.round((Math.min(unlockedLevel, MAX_LEVEL) / MAX_LEVEL) * 100);
  const weeklyBonus = getWeeklyPlayBonusView(weeklyPlayBonus);
  const [dailyRewardToast, setDailyRewardToast] = useState<{ id: number; text: string } | null>(
    null,
  );
  const dailyRewardToastTimeoutRef = useRef<number | null>(null);
  const [resetCountdown, setResetCountdown] = useState<string>(() => formatResetCountdown());

  useEffect(() => {
    const id = window.setInterval(() => {
      setResetCountdown(formatResetCountdown());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    refreshDailyLab();
  }, [refreshDailyLab]);

  useEffect(
    () => () => {
      if (dailyRewardToastTimeoutRef.current !== null) {
        window.clearTimeout(dailyRewardToastTimeoutRef.current);
      }
    },
    [],
  );

  function showDailyRewardToast(text: string) {
    const id = Date.now();
    if (dailyRewardToastTimeoutRef.current !== null) {
      window.clearTimeout(dailyRewardToastTimeoutRef.current);
    }
    setDailyRewardToast({ id, text });
    dailyRewardToastTimeoutRef.current = window.setTimeout(() => {
      setDailyRewardToast((current) => (current?.id === id ? null : current));
      dailyRewardToastTimeoutRef.current = null;
    }, 1800);
  }

  function handleDailyRewardClaim() {
    if (!dailyComplete || claimedDailyReward) return;
    claimDailyReward();
    showDailyRewardToast("+2 gold coins claimed");
  }

  function handleWeeklyDayClaim() {
    if (weeklyBonus.todayClaimed) return;
    const result = claimWeeklyPlayBonus();
    if (!result) return;
    const bonusText = result.bonusAwarded > 0 ? ` (+${result.bonusAwarded} streak bonus)` : "";
    showDailyRewardToast(`+${result.coinsAwarded} gold coin${result.coinsAwarded === 1 ? "" : "s"}${bonusText}`);
  }

  return (
    <div className="app-shell" style={{ padding: 18, paddingTop: 26 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minHeight: "100dvh",
          paddingBottom: 24,
        }}
      >
        <header style={heroPanel}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={eyebrow}>LEVEL {unlockedLevel} OF {MAX_LEVEL}</div>
            <h1 className="gold-text" style={titleStyle}>
              Elemental Gold Rush
            </h1>
            <p style={subtitleStyle}>
              Fuse atoms, discover the periodic table, and push toward {targetEl?.name ?? "Gold"}.
            </p>
            <div style={heroActions}>
              <button
                onClick={() => {
                  trackMenuAction("continue");
                  onPlay();
                }}
                style={heroPlayBtn}
              >
                <Play size={18} fill="currentColor" aria-hidden="true" />
                Continue
              </button>
              <button
                onClick={() => {
                  trackMenuAction("levels");
                  onLevels();
                }}
                style={secondaryBtn}
              >
                <Layers size={17} aria-hidden="true" />
                Map
              </button>
            </div>
          </div>
          <div style={targetOrb}>
            <ElementBall atomicNumber={nextLevel?.targetElement ?? 1} size={94} glow />
            <div style={targetLabel}>
              <span>{targetEl?.symbol ?? "H"}</span>
              <small>Target</small>
            </div>
          </div>
        </header>

        <section style={progressPanel}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={sectionLabel}>NEXT RUN</div>
              <div style={{ fontSize: 17, fontWeight: 900 }}>
                Level {unlockedLevel}: {nextLevel?.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                {nextLevel?.description}
              </div>
            </div>
            <button
              onClick={() => {
                trackMenuAction("profile");
                onProfile();
              }}
              style={profileBtn}
              aria-label="Open profile"
            >
              <User size={19} aria-hidden="true" />
            </button>
          </div>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${campaignProgress}%` }} />
          </div>
          <div style={statGrid}>
            <Stat label="Highest" value={highestEl?.symbol ?? "H"} sub={`#${highestElement}`} />
            <Stat label="Score" value={formatScore(totalScore)} sub="total" />
            <Stat label="Coins" value={`${goldCoins}`} sub="gold" />
          </div>
        </section>

        <nav style={actionGrid} aria-label="Main game sections">
          <BigButton
            icon={Atom}
            iconColor="oklch(0.78 0.18 145)"
            onClick={() => {
              trackMenuAction("collection");
              onCollection();
            }}
          >
            Collection
          </BigButton>
          <BigButton
            icon={FlaskConical}
            iconColor="oklch(0.78 0.2 320)"
            onClick={() => {
              trackMenuAction("lab");
              onLab();
            }}
          >
            Lab Modes
          </BigButton>
          <BigButton
            icon={Library}
            iconColor="oklch(0.78 0.16 50)"
            onClick={() => {
              trackMenuAction("library");
              onLibrary();
            }}
          >
            Library
          </BigButton>
          <BigButton
            icon={hasProPack ? BookOpen : ShoppingBag}
            iconColor="oklch(0.78 0.18 25)"
            onClick={() => {
              trackMenuAction("shop");
              onShop();
            }}
          >
            {hasProPack ? "Pro Pack" : "Shop"}
          </BigButton>
        </nav>

        <section style={dailyPanel}>
          {dailyRewardToast && (
            <div style={dailyToast} role="status" aria-live="polite">
              <Sparkles size={15} aria-hidden="true" />
              <span>{dailyRewardToast.text}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={sectionLabel}>DAILY LAB</div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Streak {dailyStreak} - {completedDailyQuests}/{dailyQuests.length} quests
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                Complete 4 of 6 quests to claim 2 gold coins.
              </div>
              <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 4, fontWeight: 800, letterSpacing: 0.6 }}>
                Resets in {resetCountdown}
              </div>
            </div>
            <button
              onClick={handleDailyRewardClaim}
              disabled={!dailyComplete || claimedDailyReward}
              style={{
                ...claimBtn,
                background:
                  dailyComplete && !claimedDailyReward
                    ? "linear-gradient(135deg, var(--accent), var(--primary))"
                    : "var(--surface-high)",
                color:
                  dailyComplete && !claimedDailyReward
                    ? "var(--primary-foreground)"
                    : "var(--muted-foreground)",
                cursor: dailyComplete && !claimedDailyReward ? "pointer" : "not-allowed",
              }}
            >
              {claimedDailyReward ? "Claimed" : "Claim"}
            </button>
          </div>
          <div style={weeklyBonusCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={sectionLabel}>PLAY A GAME A DAY</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  Streak {weeklyBonus.currentStreak} - {weeklyBonus.cycleProgress}/7 toward +5
                </div>
              </div>
              <div style={weeklyBonusPill}>
                {weeklyBonus.todayClaimed
                  ? `Today +${weeklyBonus.coinsEarnedToday}`
                  : "Play today +1"}
              </div>
            </div>
            <div style={weeklyBonusTrack} aria-label={`${weeklyBonus.cycleProgress} of 7 streak days claimed`}>
              <span
                style={{
                  ...weeklyBonusFill,
                  width: `${Math.max(4, (weeklyBonus.cycleProgress / 7) * 100)}%`,
                }}
              />
            </div>
            <div style={weeklyDayGrid}>
              {weeklyBonus.days.map((day) => (
                <div
                  key={day.index}
                  style={{
                    ...weeklyDayCell,
                    borderColor: day.claimed
                      ? "var(--accent)"
                      : day.isToday
                        ? "var(--primary)"
                        : "var(--border)",
                    color: day.claimed ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  <span>{day.label}</span>
                  <strong style={weeklyReward}>
                    <GoldCoinIcon size={12} />
                    {day.index === 7 && <span>x5</span>}
                  </strong>
                  <small>{day.claimed ? "Claimed" : day.isToday ? "Today" : "Next"}</small>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.35 }}>
              1 coin each day you play. {weeklyBonus.nextRewardText}.
            </div>
          </div>
          <div style={questGrid}>
            {dailyQuests.map((quest) => (
              <div key={quest.id} style={questRow}>
                <span
                  style={{
                    ...questIconWrap,
                    color: quest.completed ? "var(--accent)" : "var(--muted-foreground)",
                  }}
                >
                  <QuestIcon type={quest.type} completed={quest.completed} />
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {quest.title}
                </span>
                <span style={questProgressWrap} aria-label={`${quest.progress} of ${quest.target}`}>
                  {quest.completed ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <span style={questProgressTrack}>
                      <span
                        style={{
                          ...questProgressFill,
                          width: `${Math.max(8, Math.min(100, (quest.progress / quest.target) * 100))}%`,
                        }}
                      />
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <BigButton
            icon={User}
            iconColor="oklch(0.8 0.16 85)"
            onClick={() => {
              trackMenuAction("profile");
              onProfile();
            }}
          >
            Profile
          </BigButton>
          <BigButton
            icon={SettingsIcon}
            iconColor="oklch(0.78 0.04 250)"
            onClick={() => {
              trackMenuAction("settings");
              onSettings();
            }}
          >
            Settings
          </BigButton>
        </div>
      </div>
    </div>
  );
}

function QuestIcon({ type, completed }: { type: string; completed: boolean }) {
  const iconMap: Record<string, LucideIcon> = {
    clear_level: Trophy,
    discover_elements: Sparkles,
    earn_stars: Star,
    chain_merge: Layers,
    merge_atoms: Atom,
    purchase_item: ShoppingBag,
  };
  const Icon = completed ? CheckCircle2 : iconMap[type] ?? FlaskConical;
  return <Icon size={15} strokeWidth={2.4} aria-hidden="true" />;
}

const heroPanel: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 18,
  padding: "24px 18px",
  borderRadius: 20,
  background:
    "radial-gradient(circle at 82% 18%, oklch(0.75 0.16 85 / 0.24), transparent 32%), linear-gradient(145deg, var(--surface-elevated), var(--surface))",
  border: "1px solid var(--border)",
  boxShadow: "0 16px 42px rgba(0,0,0,0.32)",
};

const eyebrow: CSSProperties = {
  fontSize: 11,
  letterSpacing: 2,
  color: "var(--accent)",
  fontWeight: 900,
};

const titleStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1,
  margin: "7px 0 0",
};

const subtitleStyle: CSSProperties = {
  color: "var(--muted-foreground)",
  margin: "10px 0 0",
  fontSize: 13,
  lineHeight: 1.45,
};

const heroActions: CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 18,
  flexWrap: "wrap",
};

const heroPlayBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  border: "none",
  borderRadius: 14,
  padding: "13px 18px",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  boxShadow: "0 10px 26px var(--primary-glow)",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "12px 14px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontWeight: 800,
  cursor: "pointer",
};

const targetOrb: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 6,
  minWidth: 110,
};

const targetLabel: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 1,
  fontWeight: 900,
  color: "var(--foreground)",
};

const progressPanel: CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "color-mix(in oklch, var(--surface-elevated) 88%, transparent)",
  border: "1px solid var(--border)",
};

const sectionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.8,
  color: "var(--accent)",
  fontWeight: 900,
  marginBottom: 4,
};

const profileBtn: CSSProperties = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface)",
  color: "var(--foreground)",
  cursor: "pointer",
};

const progressTrack: CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: "var(--surface-high)",
  overflow: "hidden",
  marginTop: 14,
};

const progressFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, var(--primary), var(--accent))",
};

const statGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginTop: 12,
};

const actionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const dailyPanel: CSSProperties = {
  position: "relative",
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 14,
};

const dailyToast: CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 2,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 11,
  fontWeight: 900,
  boxShadow: "0 10px 26px var(--accent-glow)",
  animation: "coin-toast-rise 1800ms ease-out forwards",
};

const claimBtn: CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 900,
};

const weeklyBonusCard: CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 14,
  border: "1px solid color-mix(in oklch, var(--accent) 38%, var(--border))",
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--accent) 13%, transparent), var(--surface))",
  boxShadow: "inset 0 0 18px oklch(0.86 0.18 95 / 0.08)",
};

const weeklyBonusPill: CSSProperties = {
  alignSelf: "start",
  padding: "5px 8px",
  borderRadius: 999,
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const weeklyBonusTrack: CSSProperties = {
  position: "relative",
  height: 8,
  borderRadius: 999,
  overflow: "hidden",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
  margin: "10px 0",
};

const weeklyBonusFill: CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, var(--accent), var(--primary))",
  boxShadow: "0 0 16px var(--accent-glow)",
  transition: "width 260ms ease",
};

const weeklyDayGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  gap: 5,
  marginBottom: 9,
};

const weeklyDayCell: CSSProperties = {
  display: "grid",
  gap: 2,
  justifyItems: "center",
  minWidth: 0,
  padding: "6px 3px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  fontSize: 9,
  lineHeight: 1.1,
};

const weeklyReward: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  color: "oklch(0.86 0.17 84)",
};

function GoldCoinIcon({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-block",
        background:
          "radial-gradient(circle at 32% 24%, oklch(0.98 0.11 95), oklch(0.82 0.17 82) 48%, oklch(0.55 0.14 70))",
        border: "1px solid oklch(0.94 0.13 90)",
        boxShadow: "0 0 8px oklch(0.84 0.16 85 / 0.4), inset 0 -2px 4px rgba(0,0,0,0.25)",
      }}
    />
  );
}

const questGrid: CSSProperties = {
  display: "grid",
  gap: 7,
  marginTop: 12,
};

const questRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "22px minmax(0, 1fr) 42px",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
};

const questIconWrap: CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 999,
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
};

const questProgressWrap: CSSProperties = {
  width: 42,
  display: "flex",
  justifyContent: "flex-end",
  color: "var(--accent)",
};

const questProgressTrack: CSSProperties = {
  width: 34,
  height: 6,
  borderRadius: 999,
  overflow: "hidden",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
};

const questProgressFill: CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, var(--primary), var(--accent))",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 8px",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.3, color: "var(--muted-foreground)" }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--primary)", marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{sub}</div>}
    </div>
  );
}

function BigButton({
  children,
  onClick,
  icon: Icon,
  iconColor,
}: {
  children: ReactNode;
  onClick: () => void;
  icon?: LucideIcon;
  iconColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 15px",
        borderRadius: 13,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        color: "var(--foreground)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
        cursor: "pointer",
        fontSize: 15,
        fontWeight: 800,
        transition: "transform 0.1s ease",
        minWidth: 0,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {Icon && <Icon size={19} color={iconColor} aria-hidden="true" />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
    </button>
  );
}
