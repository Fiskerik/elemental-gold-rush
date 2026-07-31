import { useState } from "react";
import { ELEMENTS } from "./elements";
import { getLevelById, MAX_LEVEL } from "./levels";
import { useProgress, type CoinTransaction } from "./store";
import { useIsTabletLayout } from "./responsive";
import { SUPPORTED_LANGUAGES, t, toIntlLocale, type AppLanguage } from "./localization";
import { COMPOUNDS } from "./compounds";
import { BOSSES, type BossId } from "./bosses";
import { BoardThemePicker } from "./Settings";
import {
  authenticateGameCenter,
  getCachedGameCenterPlayerName,
  isGameCenterAvailable,
  showGameCenterLeaderboards,
} from "./gameCenter";
import {
  DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS,
  type DailyBoardLeaderboardAchievementId,
} from "./leaderboardAchievements";
import {
  Atom,
  Award,
  BadgeCheck,
  CalendarDays,
  Coins,
  Crown,
  FlaskConical,
  Gamepad2,
  Medal,
  Orbit,
  Percent,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Props {
  onBack: () => void;
  onOpenShop?: () => void;
}

export function Profile({ onBack, onOpenShop }: Props) {
  const isTabletLayout = useIsTabletLayout();
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [gameCenterBusy, setGameCenterBusy] = useState(false);
  const [gameCenterStatus, setGameCenterStatus] = useState<string | null>(null);
  const [gameCenterName, setGameCenterName] = useState(() => getCachedGameCenterPlayerName());
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    highestSingleShotScore,
    highestSingleShotScoreDate,
    goldCoins,
    coinTransactions,
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
    challengeBestScoreDates,
    hasProPack,
    dailyBoardRuns,
    dailyBoardBestScore,
    dailyCompoundRuns,
    dailyCompoundBestScore,
    dailyBoardLeaderboardAchievementCounts,
    appTheme,
    boardTheme,
    ownedThemeProducts,
    appLanguage,
    setAppTheme,
    setBoardTheme,
    setAppLanguage,
  } = useProgress();
  const tr = (text: string) => t(text, appLanguage);
  const intlLocale = toIntlLocale(appLanguage);
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const highestEl = ELEMENTS[highestElement - 1];
  const totalStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);
  const perfectLevels = Object.values(levelStars).filter((stars) => stars >= 3).length;
  const bestChallengeEntry = Object.entries(challengeBestScores).reduce<{
    mode: string;
    score: number;
    date: string | null;
  } | null>((best, [mode, score]) => {
    const safeScore = score ?? 0;
    if (!best || safeScore > best.score) {
      return {
        mode,
        score: safeScore,
        date: challengeBestScoreDates[mode as keyof typeof challengeBestScoreDates] ?? null,
      };
    }
    return best;
  }, null);
  const bestLevelScoreEntry = Object.entries(levelStats).reduce<{
    levelId: number;
    score: number;
  } | null>((best, [levelId, stats]) => {
    if (!best || stats.maxScore > best.score)
      return { levelId: Number(levelId), score: stats.maxScore };
    return best;
  }, null);
  const bestLevelScoreLevel = bestLevelScoreEntry
    ? getLevelById(bestLevelScoreEntry.levelId)
    : null;
  const completionPercent = Math.round((discoveredElements.length / ELEMENTS.length) * 100);
  const compoundPercent = Math.round(
    (discoveredCompounds.length / Math.max(1, COMPOUNDS.length)) * 100,
  );
  const bossIds = Object.keys(BOSSES) as BossId[];
  const unlockedBossCount = bossIds.filter((id) => unlockedLevel >= BOSSES[id].levelId).length;
  const defeatedBossCount = bossIds.filter(
    (id) => (levelStats[BOSSES[id].levelId]?.bestShots ?? null) != null,
  ).length;
  const exactScore = (score: number) => numberFormatter.format(Math.max(0, Math.floor(score)));
  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(intlLocale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : tr("no record yet");
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  async function handleGameCenterSignIn() {
    if (gameCenterBusy) return;
    if (!isGameCenterAvailable()) {
      setGameCenterStatus(tr("Game Center is available on iOS devices."));
      return;
    }
    setGameCenterBusy(true);
    setGameCenterStatus(tr("Opening Game Center..."));
    try {
      const player = await authenticateGameCenter();
      const authenticatedName = player.displayName?.trim() || player.alias?.trim() || "";
      setGameCenterName(authenticatedName || getCachedGameCenterPlayerName());
      setGameCenterStatus(
        player.authenticated
          ? `${tr("Signed in as")} ${player.displayName || player.alias || tr("Player")}`
          : tr("Game Center sign-in was not completed."),
      );
    } catch (error) {
      setGameCenterStatus(
        error instanceof Error ? error.message : tr("Game Center sign-in failed."),
      );
    } finally {
      setGameCenterBusy(false);
    }
  }

  async function handleOpenGameCenter() {
    if (gameCenterBusy) return;
    if (!isGameCenterAvailable()) {
      setGameCenterStatus(tr("Game Center is available on iOS devices."));
      return;
    }
    setGameCenterBusy(true);
    setGameCenterStatus(tr("Opening Game Center..."));
    try {
      const shown = await showGameCenterLeaderboards();
      setGameCenterStatus(shown ? tr("Game Center opened.") : tr("Game Center did not open."));
    } catch (error) {
      setGameCenterStatus(
        error instanceof Error ? error.message : tr("Game Center sign-in failed."),
      );
    } finally {
      setGameCenterBusy(false);
    }
  }

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
            {gameCenterName && (
              <h1
                className="gold-text"
                style={{ margin: "4px 0", fontSize: 34 }}
                data-no-localize="true"
              >
                {gameCenterName}
              </h1>
            )}
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
          <HeroMetric
            icon={Atom}
            label={tr("Highest Atom")}
            value={`${highestEl?.symbol ?? "H"} #${highestElement}`}
          />
          <HeroMetric icon={BadgeCheck} label={tr("Badges")} value={`${earnedBadges.length}`} />
          <HeroMetric icon={Trophy} label={tr("Stars")} value={`${totalStars}`} />
        </section>
        {isGameCenterAvailable() && (
          <section style={gameCenterCard}>
            <div style={{ minWidth: 0 }}>
              <div style={sectionHeading}>{tr("Game Center")}</div>
              <div style={gameCenterCopy}>
                {gameCenterStatus ??
                  tr("Sign in once to keep Daily Board and Daily Compound submissions connected.")}
              </div>
            </div>
            <div style={gameCenterActions}>
              <button
                type="button"
                onClick={handleGameCenterSignIn}
                disabled={gameCenterBusy}
                style={{
                  ...gameCenterButton,
                  opacity: gameCenterBusy ? 0.62 : 1,
                  cursor: gameCenterBusy ? "not-allowed" : "pointer",
                }}
              >
                <Gamepad2 size={17} aria-hidden="true" />
                {tr(gameCenterBusy ? "Signing in" : "Sign in")}
              </button>
              <button
                type="button"
                onClick={handleOpenGameCenter}
                disabled={gameCenterBusy}
                style={{
                  ...gameCenterButton,
                  ...gameCenterButtonSecondary,
                  opacity: gameCenterBusy ? 0.62 : 1,
                  cursor: gameCenterBusy ? "not-allowed" : "pointer",
                }}
              >
                {tr("Open")}
              </button>
            </div>
          </section>
        )}
        <section style={card} aria-label="Daily Board placement badges">
          <div style={dailyBoardBadgeHeader}>
            <div>
              <div style={sectionHeading}>{tr("Daily Board Badges")}</div>
              <div style={dailyBoardBadgeTitle}>{tr("Placement counters")}</div>
            </div>
            <span style={dailyBoardBadgeScope}>{tr("Global")}</span>
          </div>
          <div style={dailyBoardBadgeColumns}>
            {[DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS.slice(0, 3), DAILY_BOARD_LEADERBOARD_ACHIEVEMENTS.slice(3)].map(
              (column, columnIndex) => (
                <div key={columnIndex} style={dailyBoardBadgeColumn}>
                  {column.map((achievement, achievementIndex) => {
                    const iconColor = placementIconColors[achievementIndex];
                    return (
                      <div key={achievement.id} style={dailyBoardBadgeCard} title={achievement.description}>
                        <span
                          style={{
                            ...dailyBoardBadgeIcon,
                            color: iconColor,
                            background: `${iconColor}22`,
                            border: `1px solid ${iconColor}88`,
                            boxShadow: `0 0 14px ${iconColor}55`,
                          }}
                        >
                          <DailyBoardBadgeIcon id={achievement.id} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong style={dailyBoardBadgeName}>{tr(achievement.name)}</strong>
                          <small style={dailyBoardBadgeCount}>
                            {`${dailyBoardLeaderboardAchievementCounts[achievement.id] ?? 0}x ${tr("earned")}`}
                          </small>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ),
            )}
          </div>
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
              sub={
                bestChallengeEntry
                  ? formatDate(bestChallengeEntry.date)
                  : tr("no record yet")
              }
            />
            <RecordRow
              icon={Atom}
              label={tr("Atoms unlocked")}
              value={`${discoveredElements.length}/${ELEMENTS.length}`}
              sub={`${completionPercent}%`}
            />
            <RecordRow
              icon={FlaskConical}
              label={tr("Compounds unlocked")}
              value={`${discoveredCompounds.length}/${COMPOUNDS.length}`}
              sub={`${compoundPercent}%`}
            />
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
            <RecordRow
              icon={Orbit}
              label={tr("Bosses unlocked")}
              value={`${unlockedBossCount}/${bossIds.length}`}
              sub={tr(`${defeatedBossCount} defeated`)}
            />
            <RecordRow
              icon={BadgeCheck}
              label={tr("Badges earned")}
              value={`${earnedBadges.length}`}
            />
            <RecordRow
              icon={Medal}
              label={tr("Campaign levels unlocked")}
              value={`${unlockedLevel}/${MAX_LEVEL}`}
            />
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
                      {unlocked
                        ? defeated
                          ? tr("Defeated")
                          : tr("Unlocked")
                        : `${tr("Unlocks at level")} ${boss.levelId}`}
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
          <ProfileStat
            icon={Trophy}
            label={tr("Total Score")}
            value={exactScore(totalScore)}
            sub={tr("career")}
          />
          <ProfileStat
            icon={Zap}
            label={tr("Best Shot")}
            value={exactScore(highestSingleShotScore)}
            sub={formatDate(highestSingleShotScoreDate)}
          />
          <CoinProfileStat
            value={`${goldCoins}`}
            sub={tr("shop currency")}
            onTransactions={() => setTransactionsOpen(true)}
          />
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
          <ProfileStat
            icon={Star}
            label={tr("Stars")}
            value={`${totalStars}`}
            sub={tr(`${perfectLevels} perfect`)}
          />
        </section>

        <section style={card}>
          <div style={sectionHeading}>{tr("Display")}</div>
          <div style={{ marginBottom: 14 }}>
            <BoardThemePicker
              value={boardTheme}
              hasProPack={hasProPack}
              ownedThemeProducts={ownedThemeProducts}
              onChange={setBoardTheme}
              onOpenShop={onOpenShop}
            />
          </div>
          <div style={preferenceRow}>
            <span style={preferenceLabel}>{tr("Theme")}</span>
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
            <span style={preferenceLabel}>{tr("Language")}</span>
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

        {transactionsOpen && (
          <CoinTransactionsModal
            transactions={coinTransactions}
            formatDateTime={formatDateTime}
            onClose={() => setTransactionsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function DailyBoardBadgeIcon({ id }: { id: DailyBoardLeaderboardAchievementId }) {
  switch (id) {
    case "daily-board-gold":
      return <Crown size={18} aria-hidden="true" />;
    case "daily-board-silver":
      return <Medal size={18} aria-hidden="true" />;
    case "daily-board-bronze":
      return <Award size={18} aria-hidden="true" />;
    case "daily-board-top-5":
      return <Trophy size={18} aria-hidden="true" />;
    case "daily-board-top-10":
      return <Star size={18} aria-hidden="true" />;
    case "daily-board-top-20":
      return <Percent size={18} aria-hidden="true" />;
  }
}

function HeroMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div style={heroMetric}>
      <span style={metricIconBubble}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span style={{ minWidth: 0, display: "grid", gap: 1 }}>
        <strong
          style={{ fontSize: 13, lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {value}
        </strong>
        <small style={{ color: "var(--muted-foreground)", fontSize: 10, lineHeight: 1.1 }}>
          {label}
        </small>
      </span>
    </div>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
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

function CoinProfileStat({
  value,
  sub,
  onTransactions,
}: {
  value: string;
  sub: string;
  onTransactions: () => void;
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>
        <Coins size={18} aria-hidden="true" />
      </div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.5,
          color: "var(--muted-foreground)",
          fontWeight: 800,
        }}
      >
        GOLD COINS
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
      <button type="button" onClick={onTransactions} style={transactionButton}>
        Transactions
      </button>
    </div>
  );
}

function CoinTransactionsModal({
  transactions,
  formatDateTime,
  onClose,
}: {
  transactions: CoinTransaction[];
  formatDateTime: (value: string) => string;
  onClose: () => void;
}) {
  const rows = [...transactions].reverse();
  return (
    <div
      style={transactionOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Gold coin transactions"
    >
      <div style={transactionModal}>
        <div style={transactionHeader}>
          <div>
            <div style={sectionHeading}>GOLD COINS</div>
            <h2 style={{ margin: 0, fontSize: 22 }}>Transactions</h2>
          </div>
          <button type="button" onClick={onClose} style={transactionCloseButton}>
            Close
          </button>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {rows.length === 0 ? (
            <div style={emptyTransactions}>No coin transactions recorded yet.</div>
          ) : (
            rows.map((transaction) => (
              <div key={transaction.id} style={transactionRow}>
                <div style={{ minWidth: 0 }}>
                  <strong>{transaction.reason}</strong>
                  <div style={transactionMeta}>{formatDateTime(transaction.at)}</div>
                  <div style={transactionMeta}>{`Balance ${transaction.balanceAfter}`}</div>
                </div>
                <strong
                  style={{
                    ...transactionAmount,
                    color:
                      transaction.amount > 0
                        ? "var(--success, var(--accent))"
                        : "var(--destructive)",
                  }}
                >
                  {transaction.amount > 0 ? `+${transaction.amount}` : transaction.amount}
                </strong>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RecordRow({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  sub?: string;
}) {
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
        {sub && (
          <span
            style={{
              display: "block",
              color: "var(--muted-foreground)",
              fontSize: 11,
              marginTop: 2,
            }}
          >
            {sub}
          </span>
        )}
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

const gameCenterCard: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 16,
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--primary) 18%, var(--surface)), var(--surface-elevated))",
  border: "1px solid color-mix(in oklch, var(--primary) 44%, var(--border))",
  marginBottom: 12,
};

const gameCenterCopy: React.CSSProperties = {
  color: "var(--muted-foreground)",
  fontSize: 12,
  lineHeight: 1.35,
};

const gameCenterActions: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
};

const gameCenterButton: React.CSSProperties = {
  minHeight: 40,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  border: "none",
  borderRadius: 12,
  padding: "9px 12px",
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const gameCenterButtonSecondary: React.CSSProperties = {
  background: "var(--surface-high)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
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

const dailyBoardBadgeHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 10,
};

const dailyBoardBadgeTitle: React.CSSProperties = {
  marginTop: -4,
  fontSize: 15,
  fontWeight: 950,
};

const dailyBoardBadgeScope: React.CSSProperties = {
  flex: "0 0 auto",
  border: "1px solid color-mix(in oklch, var(--accent) 45%, var(--border))",
  borderRadius: 999,
  padding: "5px 8px",
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const dailyBoardBadgeColumns: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};

const dailyBoardBadgeColumn: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const placementIconColors = ["#f4c95d", "#cfd5df", "#cd7f32"];

const dailyBoardBadgeCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  minHeight: 54,
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 9,
  background: "var(--surface)",
};

const dailyBoardBadgeIcon: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  width: 34,
  height: 34,
  borderRadius: 12,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  boxShadow: "0 0 14px var(--primary-glow)",
};

const dailyBoardBadgeName: React.CSSProperties = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 900,
};

const dailyBoardBadgeCount: React.CSSProperties = {
  display: "block",
  marginTop: 2,
  color: "var(--muted-foreground)",
  fontSize: 10,
  fontWeight: 800,
};

const preferenceRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const preferenceLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 850,
  lineHeight: 1.15,
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
  fontSize: 16,
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

const transactionButton: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  minHeight: 32,
  border: "1px solid color-mix(in oklch, var(--accent) 48%, var(--border))",
  borderRadius: 10,
  background: "color-mix(in oklch, var(--accent) 18%, var(--surface))",
  color: "var(--foreground)",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
};

const transactionOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 50,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(0, 0, 0, 0.58)",
  backdropFilter: "blur(10px)",
};

const transactionModal: React.CSSProperties = {
  width: "min(520px, 100%)",
  maxHeight: "min(680px, 86dvh)",
  overflowY: "auto",
  border: "1px solid var(--border)",
  borderRadius: 18,
  background: "var(--surface-elevated)",
  padding: 16,
  boxShadow: "0 24px 70px rgba(0,0,0,0.48)",
};

const transactionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const transactionCloseButton: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "8px 10px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontWeight: 850,
  cursor: "pointer",
};

const emptyTransactions: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 14,
  color: "var(--muted-foreground)",
  fontSize: 13,
  textAlign: "center",
};

const transactionRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 12,
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface)",
  padding: "10px 12px",
};

const transactionMeta: React.CSSProperties = {
  marginTop: 3,
  color: "var(--muted-foreground)",
  fontSize: 11,
};

const transactionAmount: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
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
