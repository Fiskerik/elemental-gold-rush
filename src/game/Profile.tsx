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

interface Props {
  onBack: () => void;
}

export function Profile({ onBack }: Props) {
  const {
    unlockedLevel,
    highestElement,
    totalScore,
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
  } = useProgress();
  const highestEl = ELEMENTS[highestElement - 1];
  const completedDailyQuests = dailyQuests.filter((quest) => quest.completed).length;
  const totalStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
  const perfectLevels = Object.values(levelStars).filter((stars) => stars >= 3).length;
  const bestChallengeScore = Math.max(
    0,
    ...Object.values(challengeBestScores).map((score) => score ?? 0),
  );
  const completionPercent = Math.round((discoveredElements.length / ELEMENTS.length) * 100);

  return (
    <div className="app-shell" style={{ padding: 20, paddingTop: 32, minHeight: "100dvh" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 620, margin: "0 auto" }}>
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
          </div>
        </header>

        <section style={grid}>
          <ProfileStat label="Total Score" value={formatScore(totalScore)} sub="career" />
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
          <div style={sectionHeading}>Daily Lab</div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 12 }}>
            {completedDailyQuests}/{dailyQuests.length} quests complete today.
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
