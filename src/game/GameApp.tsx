import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Coins } from "lucide-react";
import { MainMenu } from "@/game/MainMenu";
import { openAppStoreReview } from "@/game/appReview";
import { startCloudProgressSync } from "@/game/cloudSync";
import { clearSavedRun, GameBoard, getSavedRunSummary } from "@/game/GameBoard";
import { setMusicVolume, setSfxVolume } from "@/game/audio";
import { LevelSelect } from "@/game/LevelSelect";
import { Collection } from "@/game/Collection";
import { Settings } from "@/game/Settings";
import { Shop } from "@/game/Shop";
import { LabModes } from "@/game/LabModes";
import { GameLibrary } from "@/game/GameLibrary";
import { Profile } from "@/game/Profile";
import { Leaderboard } from "@/game/DailyCompoundLeaderboard";
import { settleDailyLeaderboardRewards } from "@/game/leaderboard";
import { getTodayQuestDate } from "@/game/quests";
import { GameModeId } from "@/game/challenges";
import { MOLECULE_CHALLENGE_BY_LEVEL, getCompoundChallengeKind, getLevelById } from "@/game/levels";
import type { HowToPlayMode } from "@/game/HowToPlay";
import { APP_STORE_URL, checkForRequiredAppUpdate, type RequiredAppUpdate } from "@/game/appUpdate";
import { consumePendingPushRoute, recordPushActivity } from "@/game/pushNotifications";
import { useProgress } from "@/game/store";
import { useDomLocalization } from "@/game/useDomLocalization";
import { t, type AppLanguage } from "@/game/localization";
import { getCurrentGameCenterPlayer } from "@/game/gameCenter";
import {
  REFERRAL_REWARD_COINS,
  isReferralAvailable,
  settleCompletedReferral,
} from "@/game/referrals";

const FIRST_ENTRY_TUTORIAL_TIP_IDS: Record<HowToPlayMode, string> = {
  normal: "onboarding-normal-game",
  "daily-board": "onboarding-daily-board-1.1.2",
  compound: "onboarding-compound-level-1.1.2",
  "daily-compound": "onboarding-daily-compound-1.1.2",
};

type Screen =
  | { name: "menu" }
  | { name: "levels" }
  | {
      name: "game";
      levelId: number;
      mode?: GameModeId;
      resumeSavedRun?: boolean;
      secretCompoundId?: string;
      initialHowToPlay?: HowToPlayMode;
    }
  | { name: "collection" }
  | { name: "shop"; section?: "themes" }
  | { name: "lab" }
  | { name: "library" }
  | { name: "profile" }
  | { name: "leaderboard" }
  | { name: "settings" };

export function GameApp() {
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const appTheme = useProgress((s) => s.appTheme);
  const appLanguage = useProgress((s) => s.appLanguage);
  const soundVolume = useProgress((s) => s.soundVolume);
  const musicVolume = useProgress((s) => s.musicVolume);
  const completedGameCount = useProgress((s) => s.completedGameCount);
  const appReviewMilestonePromptSeen = useProgress((s) => s.appReviewMilestonePromptSeen);
  const appReviewMilestoneRewardClaimed = useProgress((s) => s.appReviewMilestoneRewardClaimed);
  const refreshDailyFeatures = useProgress((s) => s.refreshDailyFeatures);
  const grantGoldCoins = useProgress((s) => s.grantGoldCoins);
  const markAppReviewMilestonePromptSeen = useProgress((s) => s.markAppReviewMilestonePromptSeen);
  const claimAppReviewMilestoneReward = useProgress((s) => s.claimAppReviewMilestoneReward);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [gameRunNonce, setGameRunNonce] = useState(0);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [appUpdateCheckComplete, setAppUpdateCheckComplete] = useState(false);
  const [requiredAppUpdate, setRequiredAppUpdate] = useState<RequiredAppUpdate | null>(null);
  const [resumePrompt, setResumePrompt] = useState<ReturnType<typeof getSavedRunSummary>>(null);
  const [appReviewMilestonePromptOpen, setAppReviewMilestonePromptOpen] = useState(false);
  const [appReviewRequested, setAppReviewRequested] = useState(false);
  const pendingGameStartRef = useRef<(() => void) | null>(null);
  const isNativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

  useDomLocalization(appLanguage);

  useEffect(() => {
    if (!isReferralAvailable() || completedGameCount <= 0) return;
    let active = true;
    void (async () => {
      const player = await getCurrentGameCenterPlayer();
      if (!player.authenticated || !player.gamePlayerId) return;
      const result = await settleCompletedReferral(player.gamePlayerId);
      if (!active) return;
      if (result.referredAwarded) {
        grantGoldCoins(REFERRAL_REWARD_COINS, "Referral reward");
      } else if (result.referrerCoins > 0) {
        grantGoldCoins(result.referrerCoins, "Referral reward");
      }
    })().catch((error) => console.warn("[referral] Could not settle reward", error));
    return () => {
      active = false;
    };
  }, [completedGameCount, grantGoldCoins]);

  useEffect(() => {
    if (!isNativeIos) return;
    return startCloudProgressSync();
  }, [isNativeIos]);

  useEffect(() => {
    if (!isNativeIos) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") recordPushActivity();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isNativeIos]);

  useEffect(() => {
    if (!isNativeIos) {
      setAppUpdateCheckComplete(true);
      return;
    }

    let active = true;
    const safetyTimeoutId = window.setTimeout(() => {
      if (active) {
        console.warn(
          "[app-update] Store version check timed out; continuing with the current build.",
        );
        setAppUpdateCheckComplete(true);
      }
    }, 6500);
    const refreshAppUpdate = async () => {
      const update = await checkForRequiredAppUpdate();
      if (!active) return;
      setRequiredAppUpdate(update);
      setAppUpdateCheckComplete(true);
      window.clearTimeout(safetyTimeoutId);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshAppUpdate();
    };

    void refreshAppUpdate();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(safetyTimeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isNativeIos]);

  useEffect(() => {
    setSfxVolume(soundVolume / 100);
  }, [soundVolume]);

  useEffect(() => {
    setMusicVolume(musicVolume / 100);
  }, [musicVolume]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", appTheme === "light");
    root.classList.toggle("theme-dark", appTheme === "dark");
    root.style.colorScheme = appTheme;
    if (Capacitor.getPlatform() === "ios") {
      void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      void StatusBar.setStyle({ style: appTheme === "light" ? Style.Light : Style.Dark }).catch(
        () => {},
      );
      void StatusBar.setBackgroundColor({
        color: appTheme === "light" ? "#f7f5ef" : "#0A0A1A",
      }).catch(() => {});
    }
  }, [appTheme]);

  useEffect(() => {
    if (!showLaunchScreen) return;
    const timeoutId = window.setTimeout(() => setShowLaunchScreen(false), 1100);
    return () => window.clearTimeout(timeoutId);
  }, [showLaunchScreen]);

  useEffect(() => {
    const now = new Date();
    const settlement = new Date(now);
    settlement.setHours(23, 59, 0, 0);
    if (settlement.getTime() <= now.getTime()) settlement.setDate(settlement.getDate() + 1);
    const timer = window.setTimeout(
      () => {
        void settleDailyLeaderboardRewards(getTodayQuestDate());
      },
      Math.max(1000, settlement.getTime() - now.getTime()),
    );
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const route = consumePendingPushRoute();
    if (route === "daily-board") startDailyChallenge();
    if (route === "daily-compound") startSecretCompound();
  }, []);

  if (showLaunchScreen || !appUpdateCheckComplete) return <LaunchScreen />;

  const shouldShowAppReviewMilestone =
    completedGameCount >= 4 && !appReviewMilestonePromptSeen && !appReviewMilestoneRewardClaimed;

  const appReviewMilestonePrompt = appReviewMilestonePromptOpen ? (
    <AppReviewMilestonePrompt
      language={appLanguage}
      showRating={isNativeIos}
      reviewRequested={appReviewRequested}
      onRate={() => {
        setAppReviewRequested(true);
        void openAppStoreReview();
      }}
      onClaim={() => {
        continuePendingGameStart();
      }}
      onSkip={() => {
        markAppReviewMilestonePromptSeen();
        continuePendingGameStart();
      }}
    />
  ) : null;

  function withGlobalModals(content: ReactNode) {
    return (
      <>
        {content}
        {appReviewMilestonePrompt}
        {requiredAppUpdate && (
          <RequiredAppUpdatePrompt
            language={appLanguage}
            update={requiredAppUpdate}
            onUpdate={() => {
              window.location.href = requiredAppUpdate.storeUrl || APP_STORE_URL;
            }}
          />
        )}
      </>
    );
  }

  function continuePendingGameStart() {
    const pendingGameStart = pendingGameStartRef.current;
    pendingGameStartRef.current = null;
    setAppReviewMilestonePromptOpen(false);
    setAppReviewRequested(false);
    pendingGameStart?.();
  }

  function startGameWithAppReviewMilestone(startGame: () => void) {
    if (!shouldShowAppReviewMilestone) {
      startGame();
      return;
    }
    pendingGameStartRef.current = startGame;
    setAppReviewRequested(false);
    claimAppReviewMilestoneReward();
    setAppReviewMilestonePromptOpen(true);
  }

  function startGameWithFirstTutorial(
    tutorialMode: HowToPlayMode | undefined,
    startGame: (initialHowToPlay?: HowToPlayMode) => void,
  ) {
    startGameWithAppReviewMilestone(() => {
      if (tutorialMode) {
        const tipId = FIRST_ENTRY_TUTORIAL_TIP_IDS[tutorialMode];
        const progress = useProgress.getState();
        if (!progress.seenTips.includes(tipId)) {
          progress.markTipSeen(tipId);
          startGame(tutorialMode);
          return;
        }
      }
      startGame();
    });
  }

  function startCampaign() {
    const saved = getSavedRunSummary();
    if (saved) {
      setResumePrompt(saved);
      return;
    }
    startCampaignLevel(getLevelById(unlockedLevel)?.id ?? 1);
  }

  function startDailyChallenge() {
    refreshDailyFeatures();
    const dailyChallenge = useProgress.getState().dailyChallenge;
    startGameWithFirstTutorial("daily-board", (initialHowToPlay) =>
      setScreen({
        name: "game",
        levelId: dailyChallenge.levelId,
        mode: "daily-challenge",
        initialHowToPlay,
      }),
    );
  }

  function startSecretCompound() {
    refreshDailyFeatures();
    startGameWithFirstTutorial("daily-compound", (initialHowToPlay) => {
      const { secretCompound, revealSecretCompound } = useProgress.getState();
      revealSecretCompound();
      setScreen({
        name: "game",
        levelId: getLevelById(unlockedLevel)?.id ?? 1,
        mode: "campaign",
        secretCompoundId: secretCompound.compoundId,
        initialHowToPlay,
      });
    });
  }

  function startCampaignLevel(levelId: number) {
    const compoundId = MOLECULE_CHALLENGE_BY_LEVEL[levelId];
    const tutorialMode = levelId === 1 ? "normal" : compoundId ? "compound" : undefined;
    startGameWithFirstTutorial(tutorialMode, (initialHowToPlay) => {
      setScreen({
        name: "game",
        levelId,
        mode: "campaign",
        initialHowToPlay,
        secretCompoundId:
          compoundId && getCompoundChallengeKind(levelId) === "search-find"
            ? compoundId
            : undefined,
      });
    });
  }

  switch (screen.name) {
    case "menu":
      return withGlobalModals(
        <>
          <MainMenu
            onPlay={startCampaign}
            onLevels={() => setScreen({ name: "levels" })}
            onCollection={() => setScreen({ name: "collection" })}
            onSettings={() => setScreen({ name: "settings" })}
            onShop={(section) => setScreen({ name: "shop", section })}
            onLab={() => setScreen({ name: "lab" })}
            onLibrary={() => setScreen({ name: "library" })}
            onProfile={() => setScreen({ name: "profile" })}
            onLeaderboard={() => setScreen({ name: "leaderboard" })}
            onDailyChallenge={startDailyChallenge}
            onSecretCompound={startSecretCompound}
          />
          {resumePrompt && (
            <ResumeRunPrompt
              language={appLanguage}
              saved={resumePrompt}
              onContinue={() => {
                const savedRun = resumePrompt;
                setResumePrompt(null);
                startGameWithAppReviewMilestone(() => {
                  setScreen({
                    name: "game",
                    levelId: savedRun.levelId,
                    mode: savedRun.mode,
                    resumeSavedRun: true,
                  });
                });
              }}
              onStartOver={() => {
                clearSavedRun();
                setResumePrompt(null);
                startGameWithAppReviewMilestone(() => {
                  setScreen({
                    name: "game",
                    levelId: getLevelById(unlockedLevel)?.id ?? 1,
                    mode: "campaign",
                  });
                });
              }}
              onCancel={() => setResumePrompt(null)}
            />
          )}
        </>,
      );
    case "levels":
      return withGlobalModals(
        <LevelSelect onPick={startCampaignLevel} onBack={() => setScreen({ name: "menu" })} />,
      );
    case "game":
      return withGlobalModals(
        <GameBoard
          key={`${screen.mode ?? "campaign"}-${screen.levelId}-${screen.secretCompoundId ?? "standard"}-${screen.resumeSavedRun ? "resume" : "new"}-${gameRunNonce}`}
          levelId={screen.levelId}
          mode={screen.mode}
          resumeSavedRun={screen.resumeSavedRun}
          secretCompoundId={screen.secretCompoundId}
          initialHowToPlay={screen.initialHowToPlay}
          onExit={() => setScreen({ name: "menu" })}
          onMap={() => setScreen({ name: "levels" })}
          onWin={(nextId) => {
            setGameRunNonce((nonce) => nonce + 1);
            if (!nextId) {
              setScreen({ name: "menu" });
              return;
            }
            if ((screen.mode ?? "campaign") === "campaign") {
              startCampaignLevel(nextId);
              return;
            }
            startGameWithAppReviewMilestone(() => {
              setScreen({
                name: "game",
                levelId: nextId,
                mode: screen.mode ?? "campaign",
                secretCompoundId: nextId === screen.levelId ? screen.secretCompoundId : undefined,
              });
            });
          }}
        />,
      );
    case "collection":
      return withGlobalModals(<Collection onBack={() => setScreen({ name: "menu" })} />);
    case "shop":
      return withGlobalModals(
        <Shop initialSection={screen.section} onBack={() => setScreen({ name: "menu" })} />,
      );
    case "lab":
      return withGlobalModals(
        <LabModes
          onBack={() => setScreen({ name: "menu" })}
          onStart={(mode, levelId, options) =>
            startGameWithAppReviewMilestone(() =>
              setScreen({
                name: "game",
                levelId,
                mode,
                secretCompoundId: options?.secretCompoundId,
              }),
            )
          }
        />,
      );
    case "library":
      return withGlobalModals(<GameLibrary onBack={() => setScreen({ name: "menu" })} />);
    case "profile":
      return withGlobalModals(
        <Profile
          onBack={() => setScreen({ name: "menu" })}
          onOpenShop={(section) => setScreen({ name: "shop", section })}
        />,
      );
    case "leaderboard":
      return withGlobalModals(<Leaderboard onBack={() => setScreen({ name: "menu" })} />);
    case "settings":
      return withGlobalModals(
        <Settings
          onBack={() => setScreen({ name: "menu" })}
          onOpenShop={(section) => setScreen({ name: "shop", section })}
        />,
      );
  }
}

function LaunchScreen() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 25% 18%, oklch(0.36 0.07 250 / 0.28), transparent 45%), radial-gradient(circle at 75% 82%, oklch(0.48 0.08 55 / 0.2), transparent 50%), oklch(0.16 0.02 255)",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
        <img
          src="/game-icon.png"
          alt="Atomic Fusion Rush"
          style={{
            width: 110,
            height: 110,
            borderRadius: 28,
            boxShadow: "0 18px 46px rgba(0,0,0,0.46), 0 0 24px rgba(255, 205, 80, 0.18)",
          }}
        />
        <div className="gold-text" style={{ fontSize: 24, fontWeight: 900 }}>
          Atomic Fusion Rush
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Loading compounds...
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 120,
            height: 6,
            borderRadius: 999,
            overflow: "hidden",
            background: "rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              width: "55%",
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, var(--accent), var(--primary))",
              boxShadow: "0 0 16px rgba(255, 214, 84, 0.35)",
              animation: "shimmer-wave 1.3s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ResumeRunPrompt({
  saved,
  language,
  onContinue,
  onStartOver,
  onCancel,
}: {
  saved: NonNullable<ReturnType<typeof getSavedRunSummary>>;
  language: AppLanguage;
  onContinue: () => void;
  onStartOver: () => void;
  onCancel: () => void;
}) {
  const tr = (text: string) => t(text, language);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("Resume saved run")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          padding: 20,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 800 }}>
          {tr("SAVED RUN")}
        </div>
        <h2 style={{ margin: "6px 0 4px", fontSize: 23 }}>{tr("Continue previous run?")}</h2>
        <p style={{ margin: "0 0 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
          Level {saved.levelId} · {saved.shots} shots · {saved.score.toLocaleString()} score
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" onClick={onContinue} style={promptPrimaryBtn}>
            {tr("Continue Run")}
          </button>
          <button type="button" onClick={onStartOver} style={promptSecondaryBtn}>
            {tr("Start Over")}
          </button>
          <button type="button" onClick={onCancel} style={promptGhostBtn}>
            {tr("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppReviewMilestonePrompt({
  language,
  showRating,
  reviewRequested,
  onRate,
  onClaim,
  onSkip,
}: {
  language: AppLanguage;
  showRating: boolean;
  reviewRequested: boolean;
  onRate: () => void;
  onClaim: () => void;
  onSkip: () => void;
}) {
  const tr = (text: string) => t(text, language);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("Game 5 bonus")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          padding: 20,
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 800 }}>
          {tr("MILESTONE BONUS")}
        </div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 23 }}>
          <CoinAmount amount={5} suffix={tr("coins unlocked")} />
        </h2>
        <p style={{ margin: "0 0 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
          {showRating
            ? tr("Your milestone bonus is in your wallet. If Atomic Fusion Rush is hitting the spot, a quick App Store rating helps a lot.")
            : tr("Your milestone bonus is in your wallet. Keep building cleaner chains and pushing the next element.")}
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {showRating && (
            <button type="button" onClick={onRate} style={promptSecondaryBtn}>
              {reviewRequested ? tr("App Store opened") : tr("Rate App")}
            </button>
          )}
          <button type="button" onClick={onClaim} style={promptPrimaryBtn}>
            {tr("Continue")}
          </button>
          <button type="button" onClick={onSkip} style={promptGhostBtn}>
            {tr("Not now")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequiredAppUpdatePrompt({
  update,
  language,
  onUpdate,
}: {
  update: RequiredAppUpdate;
  language: AppLanguage;
  onUpdate: () => void;
}) {
  const tr = (text: string) => t(text, language);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("App update required")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2400,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.78)",
        backdropFilter: "blur(7px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          padding: 22,
          borderRadius: 18,
          border: "1px solid var(--accent)",
          background: "var(--surface-elevated)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 28px var(--accent-glow)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--accent)", fontWeight: 900 }}>
          {tr("UPDATE REQUIRED")}
        </div>
        <h2 style={{ margin: "7px 0 8px", fontSize: 23 }}>{tr("New version available")}</h2>
        <p style={{ margin: "0 0 8px", color: "var(--foreground)", fontSize: 14, fontWeight: 750 }}>
          {tr("Update the app to continue playing.")}
        </p>
        <p style={{ margin: "0 0 18px", color: "var(--muted-foreground)", fontSize: 12 }}>
          {tr("Version")} {update.storeVersion} {tr("is available in the App Store.")}
        </p>
        <button type="button" onClick={onUpdate} style={{ ...promptPrimaryBtn, width: "100%" }}>
          {tr("Update in App Store")}
        </button>
      </div>
    </div>
  );
}

function CoinAmount({ amount, suffix }: { amount: number; suffix: string }) {
  return (
    <span style={coinAmount}>
      <Coins size={23} aria-hidden="true" />
      <span>{`+${amount} ${suffix}`}</span>
    </span>
  );
}

const promptPrimaryBtn: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "12px 14px",
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontWeight: 800,
  cursor: "pointer",
};

const promptSecondaryBtn: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "10px 14px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontWeight: 750,
  cursor: "pointer",
};

const promptGhostBtn: CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "8px 14px",
  background: "transparent",
  color: "var(--muted-foreground)",
  fontWeight: 700,
  cursor: "pointer",
};

const coinAmount: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
};
