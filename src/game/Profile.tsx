import { ELEMENTS } from "./elements";
import { getLevelById, MAX_LEVEL } from "./levels";
import { useProgress } from "./store";
import { useIsTabletLayout } from "./responsive";
import { SUPPORTED_LANGUAGES, t, toIntlLocale, type AppLanguage } from "./localization";
import { COMPOUNDS } from "./compounds";
import { BOSSES, type BossId } from "./bosses";
import {
  Atom,
  BadgeCheck,
  CalendarDays,
  Coins,
  Crown,
  FlaskConical,
  Medal,
  Orbit,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Props {
  onBack: () => void;
}

export function Profile({ onBack }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    goldCoins,
    discoveredElements,
    dailyStreak,
    claimedDailyReward,
    discoveredCompounds,
    bestCombo,
    bestComboDate,
    earnedBadges,
    levelStars,
    levelStats,
    challengeBestScores,
    hasProPack,
    dailyBoardRuns,
    dailyBoardBestScore,
    dailyCompoundRuns,
    dailyCompoundBestScore,
    appTheme,
    appLanguage,
    setAppTheme,
    setAppLanguage,
  } = useProgress();
  const tr = (text: string) => t(text, appLanguage);
  const intlLocale = toIntlLocale(appLanguage);
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const highestEl = ELEMENTS[highestElement - 1];
  const totalStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
  const perfectLevels = Object.values(levelStars).filter((stars) => stars >= 3).length;
  const bestChallengeEntry = Object.entries(challengeBestScores).reduce<{ mode: string; score: number } | null>(
    (best, [mode, score]) => {
      const safeScore = score ?? 0;
      if (!best || safeScore > best.score) return { mode, score: safeScore };
      return best;
    },
    null,
  );
  const bestLevelScoreEntry = Object.entries(levelStats).reduce<{ levelId: number; score: number } | null>(
    (best, [levelId, stats]) => {
      if (!best || stats.maxScore > best.score) return { levelId: Number(levelId), score: stats.maxScore };
      return best;
    },
    null,
  );
  const bestLevelScoreLevel = bestLevelScoreEntry ? getLevelById(bestLevelScoreEntry.levelId) : null;
  const completionPercent = Math.round((discoveredElements.length / ELEMENTS.length) * 100);
  const compoundPercent = Math.round((discoveredCompounds.length / Math.max(1, COMPOUNDS.length)) * 100);
  const bossIds = Object.keys(BOSSES) as BossId[];
  const unlockedBossCount = bossIds.filter((id) => unlockedLevel >= BOSSES[id].levelId).length;
  const defeatedBossCount = bossIds.filter((id) => (levelStats[BOSSES[id].levelId]?.bestShots ?? null) != null).length;
  const exactScore = (score: number) => numberFormatter.format(Math.max(0, Math.floor(score)));

  return (
    <div
      className="app-shell"
      style={{
        padding: isTabletLayout ? 28 : 20,
        paddingTop: isTabletLayout ? 36 : 32,
        minHeight: "100dvh",
      }}
    >
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 980 : 620,
          margin: "0 auto",
        }}
      >
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
              Fusion Rush Chemist
            </h1>
            <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 13 }}>
              {`${tr(hasProPack ? "Pro Lab active" : "Free Lab")} • ${tr("Level")} ${unlockedLevel} / ${MAX_LEVEL}`}
            </p>
            {hasProPack && <div style={proBadge}>PRO LAB PACK ACTIVE</div>}
          </div>
          <div style={heroIconStack} aria-hidden="true">
            <Crown size={20} />
            <span>{completionPercent}%</span>
          </div>
        </header>
        <section style={heroMetricGrid}>
          <HeroMetric icon={Atom} label={tr("Highest Atom")} value={`${highestEl?.symbol ?? "H"} #${highestElement}`} />
          <HeroMetric icon={BadgeCheck} label={tr("Badges")} value={`${earnedBadges.length}`} />
          <HeroMetric icon={Trophy} label={tr("Stars")} value={`${totalStars}`} />
        </section>
        <section style={card}>
          <div style={sectionHeading}>{tr("Records")}</div>
          <div style={{ display: "grid", gap: 10 }}>
            <RecordRow
              icon={Trophy}
              label={tr("Best level score")}
              value={bestLevelScoreEntry ? exactScore(bestLevelScoreEntry.score) : "0"}
              sub={
                bestLevelScoreEntry
                  ? `${tr("Level")} ${bestLevelScoreEntry.levelId}${bestLevelScoreLevel ? ` - ${bestLevelScoreLevel.name}` : ""}`
                  : tr("no record yet")
              }
            />
            <RecordRow
              icon={Zap}
              label={tr("Best challenge score")}
              value={bestChallengeEntry ? exactScore(bestChallengeEntry.score) : "0"}
              sub={bestChallengeEntry ? bestChallengeEntry.mode.replaceAll("-", " ") : tr("no record yet")}
            />
            <RecordRow icon={Atom} label={tr("Atoms unlocked")} value={`${discoveredElements.length}/${ELEMENTS.length}`} sub={`${completionPercent}%`} />
            <RecordRow icon={FlaskConical} label={tr("Compounds unlocked")} value={`${discoveredCompounds.length}/${COMPOUNDS.length}`} sub={`${compoundPercent}%`} />
            <RecordRow
              icon={CalendarDays}
              label={tr("Daily Board")}
              value={exactScore(dailyBoardBestScore)}
              sub={`${dailyBoardRuns} ${tr("played all time")}`}
            />
            <RecordRow
              icon={FlaskConical}
              label={tr("Daily Compound")}
              value={exactScore(dailyCompoundBestScore)}
              sub={`${dailyCompoundRuns} ${tr("played all time")}`}
            />
            <RecordRow icon={Orbit} label={tr("Bosses unlocked")} value={`${unlockedBossCount}/${bossIds.length}`} sub={`${defeatedBossCount} defeated`} />
            <RecordRow icon={BadgeCheck} label={tr("Badges earned")} value={`${earnedBadges.length}`} />
            <RecordRow icon={Medal} label={tr("Campaign levels unlocked")} value={`${unlockedLevel}/${MAX_LEVEL}`} />
          </div>
        </section>

        <section style={card}>
          <div style={sectionHeading}>{tr("Boss Stats")}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {bossIds.map((id) => {
              const boss = BOSSES[id];
              const stats = levelStats[boss.levelId];
              const unlocked = unlockedLevel >= boss.levelId;
              const defeated = (stats?.bestShots ?? null) != null;
              return (
                <div key={id} style={bossRow}>
                  <div>
                    <strong>{boss.name}</strong>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
                      {unlocked ? (defeated ? tr("Defeated") : tr("Unlocked")) : `${tr("Unlocks at level")} ${boss.levelId}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    <div>{`${tr("Best")}: ${exactScore(stats?.maxScore ?? 0)}`}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>
                      {`${tr("Shots")}: ${stats?.bestShots ?? "-"} / ${tr("Attempts")}: ${stats?.attempts ?? 0}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          style={{
            ...grid,
            gridTemplateColumns: isTabletLayout
              ? "repeat(4, minmax(0, 1fr))"
              : grid.gridTemplateColumns,
          }}
        >
          <ProfileStat icon={Trophy} label={tr("Total Score")} value={exactScore(totalScore)} sub={tr("career")} />
          <ProfileStat icon={Coins} label={tr("Gold Coins")} value={`${goldCoins}`} sub={tr("shop currency")} />
          <ProfileStat
            icon={CalendarDays}
            label={tr("Daily Streak")}
            value={`${dailyStreak}`}
            sub={tr(claimedDailyReward ? "claimed" : "active")}
          />
          <ProfileStat
            icon={Zap}
            label={tr("Best Combo")}
            value={`${bestCombo}×`}
            sub={
              bestComboDate
                ? new Date(bestComboDate).toLocaleDateString(intlLocale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : tr("no record yet")
            }
          />
          <ProfileStat
            icon={Atom}
            label={tr("Highest Atom")}
            value={tr(highestEl?.name ?? "Hydrogen")}
            sub={`${highestEl?.symbol ?? "H"} • #${highestElement}`}
          />
          <ProfileStat
            icon={FlaskConical}
            label={tr("Elements")}
            value={`${discoveredElements.length}`}
            sub={tr(`${completionPercent}% found`)}
          />
          <ProfileStat icon={Star} label={tr("Stars")} value={`${totalStars}`} sub={tr(`${perfectLevels} perfect`)} />
        </section>

        <section style={card}>
          <div style={sectionHeading}>{tr("Display")}</div>
          <div style={preferenceRow}>
            <span style={{ fontSize: 13, fontWeight: 850 }}>{tr("Theme")}</span>
            <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {(["dark", "light"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setAppTheme(theme)}
                  style={{
                    ...themeChoiceButton,
                    background: appTheme === theme ? "var(--primary)" : "var(--surface)",
                    color: appTheme === theme ? "var(--primary-foreground)" : "var(--foreground)",
                    borderColor: appTheme === theme ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {theme === "dark" ? tr("Dark") : tr("Light")}
                </button>
              ))}
            </div>
          </div>
          <label style={{ ...preferenceRow, marginTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 850 }}>{tr("Language")}</span>
            <select
              value={appLanguage}
              onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}
              style={languageSelect}
              aria-label={tr("Language")}
              data-no-localize="true"
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.nativeName} - {language.name}
                </option>
              ))}
            </select>
          </label>
        </section>

      </div>
    </div>
  );
}

function HeroMetric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div style={heroMetric}>
      <span style={metricIconBubble}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span style={{ minWidth: 0, display: "grid", gap: 1 }}>
        <strong style={{ fontSize: 13, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</strong>
        <small style={{ color: "var(--muted-foreground)", fontSize: 10, lineHeight: 1.1 }}>{label}</small>
      </span>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value, sub }: { icon?: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <div style={statCard}>
      {Icon && (
        <div style={statIcon}>
          <Icon size={18} aria-hidden="true" />
        </div>
      )}
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

function RecordRow({ icon: Icon, label, value, sub }: { icon?: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <div style={recordRow}>
      <span style={recordLabel}>
        {Icon && (
          <span style={recordIcon}>
            <Icon size={14} aria-hidden="true" />
          </span>
        )}
        {label}
      </span>
      <span style={{ textAlign: "right" }}>
        <strong>{value}</strong>
        {sub && <span style={{ display: "block", color: "var(--muted-foreground)", fontSize: 11, marginTop: 2 }}>{sub}</span>}
      </span>
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

const heroIconStack: React.CSSProperties = {
  minWidth: 58,
  display: "grid",
  justifyItems: "center",
  gap: 4,
  padding: "10px 8px",
  borderRadius: 16,
  background: "color-mix(in oklch, var(--accent) 16%, var(--surface))",
  border: "1px solid color-mix(in oklch, var(--accent) 55%, var(--border))",
  color: "var(--accent)",
  fontSize: 12,
  fontWeight: 1000,
  boxShadow: "0 0 18px color-mix(in oklch, var(--accent) 26%, transparent)",
};

const heroMetricGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  margin: "-6px 0 12px",
};

const heroMetric: React.CSSProperties = {
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 10px",
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
};

const metricIconBubble: React.CSSProperties = {
  width: 30,
  height: 30,
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--primary), var(--accent))",
  color: "var(--primary-foreground)",
  boxShadow: "0 0 14px var(--primary-glow)",
};

const statIcon: React.CSSProperties = {
  width: 32,
  height: 32,
  margin: "0 auto 8px",
  display: "grid",
  placeItems: "center",
  borderRadius: 12,
  background: "color-mix(in oklch, var(--primary) 18%, var(--surface-high))",
  color: "var(--primary)",
  border: "1px solid color-mix(in oklch, var(--primary) 42%, var(--border))",
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

const preferenceRow: React.CSSProperties = {
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

const languageSelect: React.CSSProperties = {
  minWidth: 190,
  maxWidth: "min(100%, 250px)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "8px 12px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontSize: 13,
  fontWeight: 800,
  fontFamily: "inherit",
  cursor: "pointer",
};

const sectionHeading: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: 2,
  color: "var(--accent)",
  fontWeight: 900,
  marginBottom: 8,
};

const recordRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 13,
  alignItems: "flex-start",
  padding: "8px 0",
};

const recordLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  color: "var(--muted-foreground)",
};

const recordIcon: React.CSSProperties = {
  width: 26,
  height: 26,
  flex: "0 0 auto",
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  color: "var(--accent)",
  background: "color-mix(in oklch, var(--accent) 12%, var(--surface-high))",
  border: "1px solid color-mix(in oklch, var(--accent) 34%, var(--border))",
};

const bossRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: 10,
  borderRadius: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
};
