import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Atom,
  BookOpen,
  CheckCircle2,
  Clapperboard,
  FlaskConical,
  Layers,
  Library,
  Play,
  ShoppingBag,
  Sparkles,
  Star,
  Settings as SettingsIcon,
  CircleQuestionMark,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { LEVELS, MAX_LEVEL, MOLECULE_CHALLENGE_BY_LEVEL, getLevelById, type PowerUpStageId } from "./levels";
import { useProgress } from "./store";
import { formatScore } from "./logic";
import { ELEMENTS } from "./elements";
import { ElementBall } from "./ElementBall";
import { COMPOUNDS } from "./compounds";
import { MoleculeVisual } from "./MoleculeVisual";
import { PowerUpBadge } from "./PowerUpLibrary";
import { trackMenuAction } from "./analytics";
import { initAds, showRewardedForCoin } from "./ads";
import { getWeeklyPlayBonusView } from "./weeklyBonus";
import { useIsTabletLayout } from "./responsive";
import { DAILY_FEATURE_REWARD_COINS } from "./dailyFeatures";

const POWER_UP_STAGE_LABELS: Record<PowerUpStageId, string> = {
  shimmer: "Merge the shimmering queued atom",
  unstable: "Stabilize the unstable atom",
  grab: "Use Grab to create a merge",
  egun: "Fire the E-Gun through atoms",
  gravity: "Use Gravity to group atoms",
  stone: "Place and crack the Stone",
  transmute: "Transmute, then merge",
  "fusion-jump": "Use Fusion Jump to skip a tier",
  catalyst: "Trigger a Catalyst chain",
  emission: "Boost the waiting queue",
  gamma: "Clear atoms with Gamma",
  blank: "Use a Blank Atom wildcard",
  "queue-shuffle": "Shuffle the queue",
};

interface Props {
  onPlay: () => void;
  onLevels: () => void;
  onCollection: () => void;
  onSettings: () => void;
  onShop: () => void;
  onLab: () => void;
  onLibrary: () => void;
  onProfile: () => void;
  onDailyChallenge: () => void;
  onSecretCompound: () => void;
}

type NextRunGoal =
  | { kind: "atom"; text: string }
  | { kind: "compound"; text: string; compound: (typeof COMPOUNDS)[number] }
  | { kind: "powerup"; text: string; powerUp: PowerUpStageId };

function getNextRunGoal(level: (typeof LEVELS)[number]): NextRunGoal {
  if (level.powerUpStage) {
    return {
      kind: "powerup",
      text: `${level.name} - ${POWER_UP_STAGE_LABELS[level.powerUpStage]}`,
      powerUp: level.powerUpStage,
    };
  }
  const compound = COMPOUNDS.find((item) => item.id === MOLECULE_CHALLENGE_BY_LEVEL[level.id]);
  if (compound) {
    return {
      kind: "compound",
      text: `${level.name} - form ${compound.name}`,
      compound,
    };
  }
  const targetEl = ELEMENTS[(level.targetElement ?? 1) - 1];
  return { kind: "atom", text: `${level.name} - reach ${targetEl?.symbol ?? "H"}` };
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
  onDailyChallenge,
  onSecretCompound,
}: Props) {
  const isTabletLayout = useIsTabletLayout();
  const {
    unlockedLevel,
    highestElement,
    totalScore,
    goldCoins,
    dailyQuests,
    dailyStreak,
    claimedDailyReward,
    weeklyPlayBonus,
    dailyChallenge,
    secretCompound,
    bestCombo,
    hasProPack,
    refreshDailyLab,
    refreshDailyFeatures,
    claimDailyReward,
    claimWeeklyPlayBonus,
    grantGoldCoins,
    reportQuestProgress,
    revealSecretCompound,
  } = useProgress();
  const highestEl = ELEMENTS[highestElement - 1];
  const nextLevel = getLevelById(unlockedLevel) ?? LEVELS[LEVELS.length - 1];
  const nextRunGoal = getNextRunGoal(nextLevel);
  const completedDailyQuests = dailyQuests.filter((quest) => quest.completed).length;
  const dailyComplete = dailyQuests.length > 0 && completedDailyQuests >= 4;
  const dailyRewardAmount = hasProPack ? 5 : 3;
  const campaignProgress = Math.round((Math.min(unlockedLevel, MAX_LEVEL) / MAX_LEVEL) * 100);
  const weeklyBonus = getWeeklyPlayBonusView(weeklyPlayBonus);
  const [dailyRewardToast, setDailyRewardToast] = useState<{ id: number; text: string } | null>(
    null,
  );
  const dailyRewardToastTimeoutRef = useRef<number | null>(null);
  const [resetCountdown, setResetCountdown] = useState<string>(() => formatResetCountdown());
  const [rewardedAdBusy, setRewardedAdBusy] = useState(false);
  const [rewardedAdMessage, setRewardedAdMessage] = useState<string | null>(null);
  const rewardedAdMessageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      setResetCountdown(formatResetCountdown());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    refreshDailyLab();
    refreshDailyFeatures();
  }, [refreshDailyFeatures, refreshDailyLab]);

  useEffect(() => {
    if (hasProPack) return;
    void initAds(false);
  }, [hasProPack]);

  useEffect(
    () => () => {
      if (dailyRewardToastTimeoutRef.current !== null) {
        window.clearTimeout(dailyRewardToastTimeoutRef.current);
      }
      if (rewardedAdMessageTimeoutRef.current !== null) {
        window.clearTimeout(rewardedAdMessageTimeoutRef.current);
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

  function showRewardedAdMessage(text: string, autoHide = true) {
    if (rewardedAdMessageTimeoutRef.current !== null) {
      window.clearTimeout(rewardedAdMessageTimeoutRef.current);
      rewardedAdMessageTimeoutRef.current = null;
    }
    setRewardedAdMessage(text);
    if (!autoHide) return;
    rewardedAdMessageTimeoutRef.current = window.setTimeout(() => {
      setRewardedAdMessage(null);
      rewardedAdMessageTimeoutRef.current = null;
    }, 3200);
  }

  function handleDailyRewardClaim() {
    if (!dailyComplete || claimedDailyReward) return;
    claimDailyReward();
    showDailyRewardToast(`+${dailyRewardAmount} gold coins claimed`);
  }



  function handleSecretCompoundPress() {
    revealSecretCompound();
    if (secretCompound.completed) {
      showDailyRewardToast("Secret Compound complete");
      return;
    }
    onSecretCompound();
  }
  async function handleRewardedCoin() {
    if (rewardedAdBusy || hasProPack) return;
    setRewardedAdBusy(true);
    showRewardedAdMessage("Loading ad...", false);
    try {
      const result = await showRewardedForCoin(hasProPack);
      if (result.rewarded) {
        grantGoldCoins(1);
        reportQuestProgress({ adsWatched: 1 });
        showRewardedAdMessage("+1 gold coin");
        return;
      }
      showRewardedAdMessage("Loading failed - please try again in a moment");
    } catch (error) {
      showRewardedAdMessage("Loading failed - please try again in a moment");
    } finally {
      setRewardedAdBusy(false);
    }
  }

  function handleWeeklyDayClaim() {
    if (weeklyBonus.todayClaimed) return;
    const result = claimWeeklyPlayBonus();
    if (!result) return;
    const bonusText = result.bonusAwarded > 0 ? ` (+${result.bonusAwarded} streak bonus)` : "";
    showDailyRewardToast(`+${result.coinsAwarded} gold coin${result.coinsAwarded === 1 ? "" : "s"}${bonusText}`);
  }

  return (
    <div className="app-shell" style={{ padding: isTabletLayout ? 28 : 20, paddingTop: isTabletLayout ? 30 : 26 }}>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: isTabletLayout ? 980 : 560,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: isTabletLayout ? 22 : 18,
          minHeight: "100dvh",
          paddingBottom: isTabletLayout ? 36 : 28,
        }}
      >
        <header style={topBar}>
          <button
            onClick={() => {
              trackMenuAction("settings");
              onSettings();
            }}
            style={iconButton}
            aria-label="Open settings"
          >
            <SettingsIcon size={18} aria-hidden="true" />
          </button>
          <div style={{ textAlign: "center", minWidth: 0 }}>
            <div className="gold-text" style={brandTitle}>Atomic Fusion Rush</div>
            <div style={brandSubline}>{`Level ${unlockedLevel} of ${MAX_LEVEL}`}</div>
            {hasProPack && <div style={proActiveChip}>PRO LAB ACTIVE</div>}
          </div>
          <button
            onClick={() => {
              trackMenuAction("profile");
              onProfile();
            }}
            style={profileCoinButton}
            aria-label="Open profile"
          >
            <GoldCoinIcon size={13} />
            <span>{goldCoins}</span>
            <User size={17} aria-hidden="true" />
          </button>
        </header>

        <section style={{ ...playPanel, padding: isTabletLayout ? 22 : playPanel.padding }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={eyebrow}>NEXT RUN</div>
              <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
                Level {unlockedLevel}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
                {nextRunGoal.text}
              </div>
            </div>
            <button
              onClick={() => {
                trackMenuAction("levels");
                onLevels();
              }}
              style={chooseLevelBtn}
            >
              <Layers size={16} aria-hidden="true" />
              Map
            </button>
          </div>
          <button
            onClick={() => {
              trackMenuAction("continue");
              onPlay();
            }}
            style={heroPlayBtn}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Play size={20} fill="currentColor" aria-hidden="true" />
              Continue
            </span>
            {nextRunGoal.kind === "compound" ? (
              <MoleculeVisual compound={nextRunGoal.compound} size={54} />
            ) : nextRunGoal.kind === "powerup" ? (
              <PowerUpBadge icon={nextRunGoal.powerUp} size={54} />
            ) : (
              <ElementBall atomicNumber={nextLevel?.targetElement ?? 1} size={54} glow />
            )}
          </button>
          <div style={dailyFeatureGrid}>
            <button type="button" onClick={onDailyChallenge} style={dailyFeatureBtn}>
              <span style={dailyFeatureIcon}><Trophy size={18} aria-hidden="true" /></span>
              <span style={dailyFeatureText}>
                <strong>Daily Challenge</strong>
                <small>{dailyChallenge.completed ? "Cleared today" : `Reward +${DAILY_FEATURE_REWARD_COINS}`}</small>
              </span>
              <span style={dailyFeatureReward}>
                {dailyChallenge.completed ? <CheckCircle2 size={18} aria-label="Completed" /> : <DailyGoldReward />}
              </span>
            </button>
            <button type="button" onClick={handleSecretCompoundPress} style={dailyFeatureBtn}>
              <span style={dailyFeatureIcon}><CircleQuestionMark size={18} aria-hidden="true" /></span>
              <span style={dailyFeatureText}>
                <strong>Secret Compound</strong>
                <small>
                  {secretCompound.completed
                    ? "Synthesized"
                    : secretCompound.revealed
                      ? "Clue unlocked"
                      : `Reveal clue +${DAILY_FEATURE_REWARD_COINS}`}
                </small>
              </span>
              <span style={dailyFeatureReward}>
                {secretCompound.completed ? <CheckCircle2 size={18} aria-label="Completed" /> : <DailyGoldReward />}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleRewardedCoin}
            disabled={hasProPack || rewardedAdBusy}
            style={{
              ...rewardedAdBtn,
              opacity: hasProPack || rewardedAdBusy ? 0.58 : 1,
              cursor: hasProPack || rewardedAdBusy ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Clapperboard size={17} aria-hidden="true" />
              {rewardedAdBusy ? "Loading ad..." : "Free coins"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <GoldCoinIcon size={14} />+1
            </span>
          </button>
          {rewardedAdMessage && (
            <div style={rewardedAdMessageStyle} role="status" aria-live="polite">
              {rewardedAdMessage}
            </div>
          )}
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${campaignProgress}%` }} />
          </div>
          <div style={compactStatRow}>
            <span>{`Highest ${highestEl?.symbol ?? "H"} #${highestElement}`}</span>
            <span>{`${formatScore(totalScore)} score`}</span>
            <span>{`${campaignProgress}% campaign`}</span>
          </div>
        </section>

        <nav
          style={{
            ...subpageRow,
            gap: isTabletLayout ? 14 : subpageRow.gap,
          }}
          aria-label="Main game sections"
        >
          <NavPill
            icon={Atom}
            label="Collection"
            tone="collection"
            onClick={() => {
              trackMenuAction("collection");
              onCollection();
            }}
          />
          <NavPill
            icon={FlaskConical}
            label="Lab"
            tone="lab"
            onClick={() => {
              trackMenuAction("lab");
              onLab();
            }}
          />
          <NavPill
            icon={Library}
            label="Library"
            tone="library"
            onClick={() => {
              trackMenuAction("library");
              onLibrary();
            }}
          />
          <NavPill
            icon={hasProPack ? BookOpen : ShoppingBag}
            label={hasProPack ? "Pro" : "Shop"}
            tone="shop"
            onClick={() => {
              trackMenuAction("shop");
              onShop();
            }}
          />
        </nav>

        <section style={weeklyBonusCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={sectionLabel}>PLAY A GAME A DAY</div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {`Streak ${weeklyBonus.currentStreak} - ${weeklyBonus.cycleProgress}/7 toward +5`}
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
                <button
                  key={day.index}
                  type="button"
                  onClick={day.isToday && !weeklyBonus.todayClaimed ? handleWeeklyDayClaim : undefined}
                  disabled={!(day.isToday && !weeklyBonus.todayClaimed)}
                  style={{
                    ...weeklyDayCell,
                    borderColor: day.claimed
                      ? "var(--accent)"
                      : day.isToday
                        ? "var(--primary)"
                        : "var(--border)",
                    color: day.claimed ? "var(--foreground)" : "var(--muted-foreground)",
                    cursor: day.isToday && !weeklyBonus.todayClaimed ? "pointer" : "default",
                    background:
                      day.isToday && !weeklyBonus.todayClaimed
                        ? "linear-gradient(135deg, color-mix(in oklch, var(--primary) 30%, var(--surface)), var(--surface))"
                        : "var(--surface)",
                    boxShadow:
                      day.isToday && !weeklyBonus.todayClaimed
                        ? "0 0 14px color-mix(in oklch, var(--primary) 50%, transparent)"
                        : undefined,
                    fontFamily: "inherit",
                  }}
                >
                  <span>{day.label}</span>
                  <strong style={weeklyReward}>
                    <GoldCoinIcon size={12} />
                    {day.index === 7 && <span>x5</span>}
                  </strong>
                  <small>
                    {day.claimed
                      ? "Claimed"
                      : day.isToday
                        ? weeklyBonus.todayClaimed
                          ? "Today"
                          : "Claim"
                        : "Next"}
                  </small>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)", lineHeight: 1.35 }}>
              {`1 coin each day you play. ${weeklyBonus.nextRewardText}.`}
            </div>
        </section>

        <section style={{ ...dailyPanel, padding: isTabletLayout ? 18 : dailyPanel.padding }}>
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
                {`Streak ${dailyStreak} - ${completedDailyQuests}/${dailyQuests.length} quests`}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                {hasProPack ? "Pro daily quests include bonus gold." : "Complete 4 daily tasks to claim +3."}
              </div>
              <div style={{ fontSize: 10, color: "var(--accent)", marginTop: 4, fontWeight: 800, letterSpacing: 0.6 }}>
                {`Resets in ${resetCountdown}`}
              </div>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
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
              <div style={weeklyBonusPill}>
                {weeklyBonus.todayClaimed ? `Today +${weeklyBonus.coinsEarnedToday}` : "Play today +1"}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...dailyPanel, padding: isTabletLayout ? 18 : dailyPanel.padding }}>
          <div style={dailyQuestClaimTrack} aria-label={`${Math.min(completedDailyQuests, 4)} of 4 daily quest completions`}>
            {Array.from({ length: 4 }, (_, index) => (
              <span
                key={index}
                style={{
                  ...dailyQuestClaimStep,
                  background:
                    index < Math.min(completedDailyQuests, 4)
                      ? "linear-gradient(90deg, var(--primary), var(--accent))"
                      : "var(--surface-high)",
                }}
              />
            ))}
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
    watch_ad: Clapperboard,
    use_unique_powerups: Sparkles,
    destroy_stone: Layers,
    merge_unstable: FlaskConical,
    single_game_score: Trophy,
    combo_reactions: Layers,
  };
  const Icon = completed ? CheckCircle2 : iconMap[type] ?? FlaskConical;
  return <Icon size={15} strokeWidth={2.4} aria-hidden="true" />;
}

const topBar: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: "8px 0 2px",
};

const brandTitle: CSSProperties = {
  fontSize: 22,
  fontWeight: 1000,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const brandSubline: CSSProperties = {
  marginTop: 3,
  fontSize: 11,
  color: "var(--muted-foreground)",
  fontWeight: 800,
};

const proActiveChip: CSSProperties = {
  marginTop: 6,
  display: "inline-block",
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid color-mix(in oklch, var(--accent) 70%, var(--border))",
  background:
    "linear-gradient(135deg, color-mix(in oklch, var(--accent) 45%, transparent), color-mix(in oklch, var(--primary) 30%, transparent))",
  color: "var(--foreground)",
  fontSize: 9,
  letterSpacing: 1.3,
  fontWeight: 900,
};

const iconButton: CSSProperties = {
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

const profileCoinButton: CSSProperties = {
  minWidth: 74,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--border)",
  borderRadius: 12,
  background: "var(--surface)",
  color: "var(--foreground)",
  fontWeight: 900,
  cursor: "pointer",
};

const playPanel: CSSProperties = {
  padding: 16,
  borderRadius: 18,
  background:
    "radial-gradient(circle at 86% 18%, oklch(0.75 0.16 85 / 0.2), transparent 32%), linear-gradient(145deg, var(--surface-elevated), var(--surface))",
  border: "1px solid var(--border)",
  boxShadow: "0 16px 42px rgba(0,0,0,0.32)",
};

const eyebrow: CSSProperties = {
  fontSize: 11,
  letterSpacing: 2,
  color: "var(--accent)",
  fontWeight: 900,
};

const heroPlayBtn: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: "none",
  borderRadius: 14,
  padding: "14px 14px 14px 18px",
  background: "linear-gradient(135deg, var(--primary), oklch(0.55 0.15 230))",
  color: "var(--primary-foreground)",
  boxShadow: "0 10px 26px var(--primary-glow)",
  fontWeight: 900,
  fontSize: 20,
  cursor: "pointer",
  marginTop: 16,
};

const chooseLevelBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid color-mix(in oklch, var(--primary) 45%, var(--border))",
  borderRadius: 12,
  padding: "9px 10px",
  background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 35%, var(--surface)), color-mix(in oklch, var(--accent) 25%, var(--surface)))",
  color: "var(--foreground)",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 0 16px color-mix(in oklch, var(--primary) 35%, transparent)",
};

const sectionLabel: CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.8,
  color: "var(--accent)",
  fontWeight: 900,
  marginBottom: 4,
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



const dailyFeatureGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
  marginTop: 10,
};

const dailyFeatureBtn: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  border: "1px solid color-mix(in oklch, var(--primary) 45%, var(--border))",
  borderRadius: 13,
  padding: "10px 9px",
  background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 24%, var(--surface)), var(--surface))",
  color: "var(--foreground)",
  cursor: "pointer",
  textAlign: "left",
};

const dailyFeatureIcon: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "var(--surface-high)",
  color: "var(--accent)",
};

const dailyFeatureText: CSSProperties = {
  minWidth: 0,
  display: "grid",
  gap: 2,
  fontSize: 11,
  lineHeight: 1.1,
};

const dailyFeatureReward: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--success, oklch(0.78 0.16 145))",
  fontWeight: 1000,
  fontSize: 13,
};
const rewardedAdBtn: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  border: "1px solid color-mix(in oklch, var(--accent) 55%, var(--border))",
  borderRadius: 13,
  padding: "10px 12px",
  marginTop: 10,
  background: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 22%, var(--surface)), var(--surface))",
  color: "var(--foreground)",
  fontWeight: 900,
  fontSize: 12,
};

const rewardedAdMessageStyle: CSSProperties = {
  marginTop: 6,
  color: "var(--accent)",
  fontSize: 11,
  fontWeight: 800,
  textAlign: "center",
};

const dailyQuestClaimTrack: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 6,
  marginBottom: 12,
};

const dailyQuestClaimStep: CSSProperties = {
  height: 8,
  borderRadius: 999,
  border: "1px solid var(--border)",
  transition: "background 180ms ease",
};
const compactStatRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
  color: "var(--muted-foreground)",
  fontSize: 11,
  fontWeight: 800,
};

const subpageRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

function formatResetCountdown(now: Date = new Date()): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const diff = Math.max(0, next.getTime() - now.getTime());
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

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

function DailyGoldReward() {
  return (
    <strong style={weeklyReward}>
      <GoldCoinIcon size={12} />
      <span>x{DAILY_FEATURE_REWARD_COINS}</span>
    </strong>
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

function NavPill({
  icon: Icon,
  label,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  tone: "collection" | "lab" | "library" | "shop";
  onClick: () => void;
}) {
  const tones: Record<"collection" | "lab" | "library" | "shop", string> = {
    collection:
      "linear-gradient(135deg, color-mix(in oklch, var(--primary) 32%, var(--surface)), color-mix(in oklch, var(--accent) 18%, var(--surface)))",
    lab: "linear-gradient(135deg, color-mix(in oklch, var(--success) 30%, var(--surface)), color-mix(in oklch, var(--primary) 18%, var(--surface)))",
    library:
      "linear-gradient(135deg, color-mix(in oklch, var(--secondary) 30%, var(--surface)), color-mix(in oklch, var(--primary) 15%, var(--surface)))",
    shop: "linear-gradient(135deg, color-mix(in oklch, var(--accent) 32%, var(--surface)), color-mix(in oklch, var(--primary) 22%, var(--surface)))",
  };
  const shimmerDelay: Record<"collection" | "lab" | "library" | "shop", string> = {
    collection: "0s",
    lab: "0.35s",
    library: "0.7s",
    shop: "1.05s",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 6,
        borderRadius: 13,
        border: "1px solid var(--border)",
        background: tones[tone],
        color: "var(--foreground)",
        padding: "10px 8px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.2), 0 0 12px color-mix(in oklch, var(--primary) 30%, transparent)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          color: "var(--accent)",
          animation: `icon-shimmer 3.4s ease-in-out infinite`,
          animationDelay: shimmerDelay[tone],
        }}
      >
        <Icon size={18} aria-hidden="true" />
      </span>
      <span style={{ fontSize: 11, color: "var(--foreground)", fontWeight: 800 }}>{label}</span>
    </button>
  );
}
