import {
  Atom,
  CheckCircle2,
  FlaskConical,
  Layers,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { ELEMENTS } from "./elements";
import { MAX_LEVEL } from "./levels";
import { formatScore } from "./logic";
import { useProgress } from "./store";
import { useIsTabletLayout } from "./responsive";

interface Props {
  onBack: () => void;
}

const PURCHASE_GUARD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: number | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timeoutId) window.clearTimeout(timeoutId);
    }),
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}


export function Profile({ onBack }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    goldCoins,
    discoveredElements,
    dailyQuests,
    dailyStreak,
    claimedDailyReward,
    bestCombo,
    bestComboDate,
    earnedBadges,
    levelStars,
    challengeBestScores,
    hasProPack,
    appTheme,
    setUnlockedLevel,
    setAppTheme,
  } = useProgress();
  const highestEl = ELEMENTS[highestElement - 1];
  const completedDailyQuests = dailyQuests.filter((quest) => quest.completed).length;
  const dailyRewardAmount = hasProPack ? 4 : 2;
  const totalStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
  const perfectLevels = Object.values(levelStars).filter((stars) => stars >= 3).length;
  const bestChallengeScore = Math.max(
    0,
    ...Object.values(challengeBestScores).map((score) => score ?? 0),
  );
  const completionPercent = Math.round((discoveredElements.length / ELEMENTS.length) * 100);

  function handleUnlockAllStages() {
    if (unlockedLevel >= MAX_LEVEL) {
      setUnlockedLevel(1);
      return;
    }
    const entered = window.prompt("Enter unlock password");
    if (entered == null) return;
    if (entered === "MussePigg14!") {
      setUnlockedLevel(MAX_LEVEL);
      return;
    }
    window.alert("Wrong password.");
  }

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 36 : 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: isTabletLayout ? 980 : 620, margin: "0 auto" }}>
        <button onClick={onBack} style={backBtn}>
          ← Menu
        </button>

        <header style={heroCard}>
          <div style={avatar}>{highestEl?.symbol ?? "H"}</div>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: 12, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}
            >
              PLAYER PROFILE
            </div>
            <h1 className="gold-text" style={{ margin: "4px 0", fontSize: 34 }}>
              Gold Rush Chemist
            </h1>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 13 }}>
              {hasProPack ? "Pro Lab active" : "Free Lab"} • Level {unlockedLevel} / {MAX_LEVEL}
            </p>
            {hasProPack && <div style={proBadge}>PRO LAB PACK ACTIVE</div>}
          </div>
        </header>

        <section style={{ ...grid, gridTemplateColumns: isTabletLayout ? "repeat(4, minmax(0, 1fr))" : grid.gridTemplateColumns }}>
          <ProfileStat label="Total Score" value={formatScore(totalScore)} sub="career" />
          <ProfileStat label="Gold Coins" value={`${goldCoins}`} sub="shop currency" />
          <ProfileStat
            label="Daily Streak"
            value={`${dailyStreak}`}
            sub={claimedDailyReward ? "claimed" : "active"}
          />
          <ProfileStat
            label="Best Combo"
            value={`${bestCombo}×`}
            sub={
              bestComboDate
                ? new Date(bestComboDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "no record yet"
            }
          />
          <ProfileStat
            label="Highest Atom"
            value={highestEl?.name ?? "Hydrogen"}
            sub={`${highestEl?.symbol ?? "H"} • #${highestElement}`}
          />
          <ProfileStat
            label="Elements"
            value={`${discoveredElements.length}`}
            sub={`${completionPercent}% found`}
          />
          <ProfileStat label="Stars" value={`${totalStars}`} sub={`${perfectLevels} perfect`} />
        </section>

        <section style={card}>
          <div style={sectionHeading}>Display</div>
          <div style={themeToggle}>
            <span style={{ fontSize: 13, fontWeight: 850 }}>Theme</span>
            <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(["dark", "light"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setAppTheme(theme)}
                  style={{
                    ...themeChoiceButton,
                    background: appTheme === theme ? "var(--primary)" : "var(--surface)",
                    color:
                      appTheme === theme ? "var(--primary-foreground)" : "var(--foreground)",
                    borderColor: appTheme === theme ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {theme === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section style={card}>
          <div style={sectionHeading}>Daily Lab</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 12 }}>
            {completedDailyQuests}/{dailyQuests.length} quests complete today.
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Complete 4 of 6 quests to claim the daily prize of {dailyRewardAmount} gold coins.
              {hasProPack ? " (includes +2 Pro bonus)" : ""}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
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
                <span>{quest.title}</span>
                <span style={questProgressWrap} aria-label={`${quest.progress} of ${quest.target}`}>
                  {quest.completed ? (
                    <CheckCircle2 size={16} aria-hidden="true" />
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

        <section style={card}>
          <div style={sectionHeading}>Records</div>
          <div style={{ display: "grid", gap: 10 }}>
            <RecordRow label="Best challenge score" value={formatScore(bestChallengeScore)} />
            <RecordRow label="Badges earned" value={`${earnedBadges.length}`} />
            <RecordRow
              label="Campaign levels unlocked"
              value={`${unlockedLevel}/${MAX_LEVEL}`}
            />
            <RecordRow
              label="Periodic table progress"
              value={`${discoveredElements.length}/${ELEMENTS.length}`}
            />
            <button
              type="button"
              onClick={handleUnlockAllStages}
              style={profileActionButton}
            >
              {unlockedLevel >= MAX_LEVEL ? "Lock stages" : "Unlock all stages"}
            </button>
          </div>
        </section>
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

function ProfileStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={statCard}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: "var(--muted-foreground)",
          fontWeight: 800,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: value.length > 9 ? 16 : value.length > 6 ? 20 : 24,
          color: "var(--primary)",
          fontWeight: 900,
          marginTop: 3,
          lineHeight: 1.1,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{sub}</div>
    </div>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--muted-foreground)" }}>{label}</span>
      <strong>{value}</strong>
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

const heroCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  margin: "18px 0 16px",
  padding: 18,
  borderRadius: 22,
  background: "linear-gradient(135deg, var(--surface-elevated), var(--surface))",
  border: "1px solid var(--border)",
  boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
};

const avatar: React.CSSProperties = {
  width: 76,
  height: 76,
  borderRadius: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(circle at 30% 25%, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 30,
  fontWeight: 1000,
  boxShadow: "0 0 24px var(--primary-glow)",
};

const proBadge: React.CSSProperties = {
  marginTop: 8,
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--accent) 45%, transparent), color-mix(in oklch, var(--primary) 30%, transparent))",
  border: "1px solid color-mix(in oklch, var(--accent) 70%, var(--border))",
  color: "var(--foreground)",
  fontSize: 10,
  letterSpacing: 1.4,
  fontWeight: 900,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  marginBottom: 12,
};

const statCard: React.CSSProperties = {
  padding: 14,
  borderRadius: 16,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  textAlign: "center",
};

const card: React.CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background: "var(--surface-elevated)",
  border: "1px solid var(--border)",
  marginBottom: 12,
};

const themeToggle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const themeChoiceButton: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
};

const profileActionButton: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 16px",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 4px 16px var(--primary-glow)",
};

const sectionHeading: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 2,
  color: "var(--accent)",
  fontWeight: 900,
  marginBottom: 8,
};

const questRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "24px 1fr 48px",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
};

const questIconWrap: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
};

const questProgressWrap: React.CSSProperties = {
  width: 48,
  display: "flex",
  justifyContent: "flex-end",
  color: "var(--accent)",
};

const questProgressTrack: React.CSSProperties = {
  width: 40,
  height: 7,
  borderRadius: 999,
  overflow: "hidden",
  background: "var(--surface-high)",
  border: "1px solid var(--border)",
};

const questProgressFill: React.CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, var(--primary), var(--accent))",
};
