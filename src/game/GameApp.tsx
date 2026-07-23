import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Coins } from "lucide-react";
import { MainMenu } from "@/game/MainMenu";
import { openAppStoreReview } from "@/game/appReview";
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
import { GameModeId } from "@/game/challenges";
import { COMPOUNDS } from "@/game/compounds";
import { ElementBall } from "@/game/ElementBall";
import { MOLECULE_CHALLENGE_BY_LEVEL, getCompoundChallengeKind, getLevelById } from "@/game/levels";
import { MoleculeVisual } from "@/game/MoleculeVisual";
import { useProgress } from "@/game/store";
import { useDomLocalization } from "@/game/useDomLocalization";

type Screen =
  | { name: "menu" }
  | { name: "levels" }
  | {
      name: "game";
      levelId: number;
      mode?: GameModeId;
      resumeSavedRun?: boolean;
      secretCompoundId?: string;
    }
  | { name: "collection" }
  | { name: "shop" }
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
  const onboardingSeen = useProgress((s) => s.onboardingSeen);
  const appReviewMilestonePromptSeen = useProgress((s) => s.appReviewMilestonePromptSeen);
  const appReviewMilestoneRewardClaimed = useProgress((s) => s.appReviewMilestoneRewardClaimed);
  const refreshDailyFeatures = useProgress((s) => s.refreshDailyFeatures);
  const markOnboardingSeen = useProgress((s) => s.markOnboardingSeen);
  const markAppReviewMilestonePromptSeen = useProgress((s) => s.markAppReviewMilestonePromptSeen);
  const claimAppReviewMilestoneReward = useProgress((s) => s.claimAppReviewMilestoneReward);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [gameRunNonce, setGameRunNonce] = useState(0);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [resumePrompt, setResumePrompt] = useState<ReturnType<typeof getSavedRunSummary>>(null);
  const [appReviewMilestonePromptOpen, setAppReviewMilestonePromptOpen] = useState(false);
  const [appReviewRequested, setAppReviewRequested] = useState(false);
  const pendingGameStartRef = useRef<(() => void) | null>(null);
  const isNativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

  useDomLocalization(appLanguage);

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

  if (showLaunchScreen) return <LaunchScreen />;

  const shouldShowAppReviewMilestone =
    completedGameCount >= 4 && !appReviewMilestonePromptSeen && !appReviewMilestoneRewardClaimed;

  const onboardingPrompt = !onboardingSeen ? (
    <FirstInstallOnboarding
      stepIndex={onboardingStep}
      onBack={() => setOnboardingStep((step) => Math.max(0, step - 1))}
      onNext={() => {
        if (onboardingStep < ONBOARDING_STEPS.length - 1) {
          setOnboardingStep((step) => Math.min(ONBOARDING_STEPS.length - 1, step + 1));
          return;
        }
        markOnboardingSeen();
      }}
    />
  ) : null;

  const appReviewMilestonePrompt = appReviewMilestonePromptOpen ? (
    <AppReviewMilestonePrompt
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
        {onboardingPrompt}
        {appReviewMilestonePrompt}
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
    startGameWithAppReviewMilestone(() =>
      setScreen({ name: "game", levelId: dailyChallenge.levelId, mode: "daily-challenge" }),
    );
  }

  function startSecretCompound() {
    refreshDailyFeatures();
    startGameWithAppReviewMilestone(() => {
      const { secretCompound, revealSecretCompound } = useProgress.getState();
      revealSecretCompound();
      setScreen({
        name: "game",
        levelId: getLevelById(unlockedLevel)?.id ?? 1,
        mode: "campaign",
        secretCompoundId: secretCompound.compoundId,
      });
    });
  }

  function startCampaignLevel(levelId: number) {
    startGameWithAppReviewMilestone(() => {
      const compoundId = MOLECULE_CHALLENGE_BY_LEVEL[levelId];
      setScreen({
        name: "game",
        levelId,
        mode: "campaign",
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
            onShop={() => setScreen({ name: "shop" })}
            onLab={() => setScreen({ name: "lab" })}
            onLibrary={() => setScreen({ name: "library" })}
            onProfile={() => setScreen({ name: "profile" })}
            onLeaderboard={() => setScreen({ name: "leaderboard" })}
            onDailyChallenge={startDailyChallenge}
            onSecretCompound={startSecretCompound}
          />
          {resumePrompt && (
            <ResumeRunPrompt
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
      return withGlobalModals(<Shop onBack={() => setScreen({ name: "menu" })} />);
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
      return withGlobalModals(<Profile onBack={() => setScreen({ name: "menu" })} />);
    case "leaderboard":
      return withGlobalModals(<Leaderboard onBack={() => setScreen({ name: "menu" })} />);
    case "settings":
      return withGlobalModals(<Settings onBack={() => setScreen({ name: "menu" })} />);
  }
}

const ONBOARDING_STEPS = [
  {
    title: "Reach the target atom",
    copy: "Merge atoms upward until the board creates the target element for the stage.",
    visual: "target",
  },
  {
    title: "Build chain reactions",
    copy: "Drop matching atoms together. Every merge can trigger the next one in line.",
    visual: "chain",
  },
  {
    title: "Complete the table",
    copy: "Discover every atom, synthesize common molecules, and push your best score higher.",
    visual: "collection",
  },
] as const;

function FirstInstallOnboarding({
  stepIndex,
  onBack,
  onNext,
}: {
  stepIndex: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-install-onboarding-title"
      style={onboardingBackdrop}
    >
      <section style={onboardingModal}>
        <div style={onboardingEyebrow}>{`STEP ${stepIndex + 1} OF ${ONBOARDING_STEPS.length}`}</div>
        <OnboardingVisual kind={step.visual} />
        <h2 id="first-install-onboarding-title" style={onboardingTitle}>
          {step.title}
        </h2>
        <p style={onboardingCopy}>{step.copy}</p>
        <div style={onboardingDots} aria-label={`Onboarding step ${stepIndex + 1}`}>
          {ONBOARDING_STEPS.map((item, index) => (
            <span
              key={item.title}
              style={{
                ...onboardingDot,
                width: index === stepIndex ? 24 : 8,
                background:
                  index === stepIndex
                    ? "linear-gradient(90deg, var(--accent), var(--primary))"
                    : "var(--surface-high)",
              }}
            />
          ))}
        </div>
        <div style={onboardingActions}>
          <button
            type="button"
            onClick={onBack}
            disabled={stepIndex === 0}
            style={{
              ...promptSecondaryBtn,
              opacity: stepIndex === 0 ? 0.42 : 1,
              cursor: stepIndex === 0 ? "default" : "pointer",
            }}
          >
            Back
          </button>
          <button type="button" onClick={onNext} style={promptPrimaryBtn}>
            {isLast ? "Start discovering" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}

function OnboardingVisual({ kind }: { kind: (typeof ONBOARDING_STEPS)[number]["visual"] }) {
  if (kind === "target") return <TargetOnboardingVisual />;
  if (kind === "chain") return <ChainOnboardingVisual />;
  return <CollectionOnboardingVisual />;
}

function TargetOnboardingVisual() {
  return (
    <div style={onboardingVisualFrame} aria-hidden="true">
      <div style={onboardingMiniBoard}>
        <span style={{ ...onboardingGridCell, gridColumn: "2", gridRow: "2" }}>
          <ElementBall atomicNumber={1} size={34} glow />
        </span>
        <span style={{ ...onboardingGridCell, gridColumn: "3", gridRow: "2" }}>
          <ElementBall atomicNumber={1} size={34} glow />
        </span>
        <span style={{ ...onboardingGridCell, gridColumn: "3", gridRow: "1" }}>
          <ElementBall atomicNumber={2} size={34} glow />
        </span>
        <span style={onboardingTargetBadge}>TARGET</span>
        <span style={{ position: "absolute", right: 18, top: 34 }}>
          <ElementBall atomicNumber={3} size={50} glow />
        </span>
      </div>
    </div>
  );
}

function ChainOnboardingVisual() {
  return (
    <div style={onboardingVisualFrame} aria-hidden="true">
      <div style={chainLane}>
        <span style={{ ...chainAtomSlot, left: "9%", top: "48%" }}>
          <ElementBall atomicNumber={1} size={30} glow />
        </span>
        <span style={{ ...chainAtomSlot, left: "24%", top: "48%" }}>
          <ElementBall atomicNumber={1} size={30} glow />
        </span>
        <span style={{ ...chainAtomSlot, left: "40%", top: "32%" }}>
          <ElementBall atomicNumber={2} size={34} glow />
        </span>
        <span style={{ ...chainAtomSlot, left: "56%", top: "32%" }}>
          <ElementBall atomicNumber={2} size={34} glow />
        </span>
        <span style={{ ...chainAtomSlot, left: "73%", top: "18%" }}>
          <ElementBall atomicNumber={3} size={42} glow />
        </span>
        <span style={{ ...chainSpark, left: "31%", top: "55%" }} />
        <span style={{ ...chainSpark, left: "63%", top: "39%" }} />
      </div>
    </div>
  );
}

function CollectionOnboardingVisual() {
  const water = COMPOUNDS.find((compound) => compound.id === "water") ?? COMPOUNDS[0];
  return (
    <div style={onboardingVisualFrame} aria-hidden="true">
      <div style={tableVisualGrid}>
        {Array.from({ length: 28 }, (_, index) => (
          <span
            key={index}
            style={{
              ...tableVisualCell,
              background:
                index < 14
                  ? "linear-gradient(135deg, color-mix(in oklch, var(--primary) 42%, var(--surface-high)), var(--surface-high))"
                  : "var(--surface)",
              borderColor: index < 14 ? "var(--primary)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <span style={moleculeBadge}>
        <MoleculeVisual compound={water} size={70} />
      </span>
      <span style={scoreBadge}>HIGH SCORE</span>
    </div>
  );
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
  onContinue,
  onStartOver,
  onCancel,
}: {
  saved: NonNullable<ReturnType<typeof getSavedRunSummary>>;
  onContinue: () => void;
  onStartOver: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Resume saved run"
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
          SAVED RUN
        </div>
        <h2 style={{ margin: "6px 0 4px", fontSize: 23 }}>Continue previous run?</h2>
        <p style={{ margin: "0 0 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
          Level {saved.levelId} · {saved.shots} shots · {saved.score.toLocaleString()} score
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" onClick={onContinue} style={promptPrimaryBtn}>
            Continue Run
          </button>
          <button type="button" onClick={onStartOver} style={promptSecondaryBtn}>
            Start Over
          </button>
          <button type="button" onClick={onCancel} style={promptGhostBtn}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AppReviewMilestonePrompt({
  showRating,
  reviewRequested,
  onRate,
  onClaim,
  onSkip,
}: {
  showRating: boolean;
  reviewRequested: boolean;
  onRate: () => void;
  onClaim: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Game 5 bonus"
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
          MILESTONE BONUS
        </div>
        <h2 style={{ margin: "6px 0 8px", fontSize: 23 }}>
          <CoinAmount amount={5} suffix="coins unlocked" />
        </h2>
        <p style={{ margin: "0 0 16px", color: "var(--muted-foreground)", fontSize: 13 }}>
          {showRating
            ? "Your milestone bonus is in your wallet. If Atomic Fusion Rush is hitting the spot, a quick App Store rating helps a lot."
            : "Your milestone bonus is in your wallet. Keep building cleaner chains and pushing the next element."}
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {showRating && (
            <button type="button" onClick={onRate} style={promptSecondaryBtn}>
              {reviewRequested ? "App Store opened" : "Rate App"}
            </button>
          )}
          <button type="button" onClick={onClaim} style={promptPrimaryBtn}>
            Continue
          </button>
          <button type="button" onClick={onSkip} style={promptGhostBtn}>
            Not now
          </button>
        </div>
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

const onboardingBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2300,
  display: "grid",
  placeItems: "center",
  padding: 20,
  background: "rgba(0,0,0,0.74)",
  backdropFilter: "blur(7px)",
};

const onboardingModal: CSSProperties = {
  width: "100%",
  maxWidth: 370,
  display: "grid",
  justifyItems: "center",
  gap: 12,
  padding: 20,
  borderRadius: 18,
  border: "1px solid color-mix(in oklch, var(--accent) 48%, var(--border))",
  background:
    "linear-gradient(150deg, color-mix(in oklch, var(--primary) 10%, var(--surface-elevated)), var(--surface))",
  boxShadow: "0 24px 70px rgba(0,0,0,0.58), 0 0 36px var(--primary-glow)",
  textAlign: "center",
};

const onboardingEyebrow: CSSProperties = {
  fontSize: 10,
  letterSpacing: 2.4,
  color: "var(--accent)",
  fontWeight: 900,
};

const onboardingTitle: CSSProperties = {
  margin: "2px 0 0",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 950,
};

const onboardingCopy: CSSProperties = {
  margin: 0,
  color: "var(--muted-foreground)",
  fontSize: 14,
  lineHeight: 1.45,
};

const onboardingVisualFrame: CSSProperties = {
  position: "relative",
  width: "min(100%, 270px)",
  aspectRatio: "1.55",
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background:
    "radial-gradient(circle at 50% 52%, color-mix(in oklch, var(--primary) 24%, transparent), transparent 58%), linear-gradient(180deg, var(--surface-high), var(--surface))",
  boxShadow: "inset 0 0 24px color-mix(in oklch, var(--primary) 18%, transparent)",
};

const onboardingMiniBoard: CSSProperties = {
  position: "absolute",
  inset: 12,
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gridTemplateRows: "repeat(3, 1fr)",
  gap: 6,
  borderRadius: 12,
  backgroundImage:
    "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
};

const onboardingGridCell: CSSProperties = {
  display: "grid",
  placeItems: "center",
};

const onboardingTargetBadge: CSSProperties = {
  position: "absolute",
  right: 14,
  top: 12,
  padding: "5px 8px",
  borderRadius: 999,
  background: "linear-gradient(135deg, var(--accent), var(--primary))",
  color: "var(--primary-foreground)",
  fontSize: 9,
  fontWeight: 950,
};

const chainLane: CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(110deg, transparent 0 17%, color-mix(in oklch, var(--accent) 44%, transparent) 18% 21%, transparent 22% 49%, color-mix(in oklch, var(--primary) 48%, transparent) 50% 53%, transparent 54%)",
};

const chainAtomSlot: CSSProperties = {
  position: "absolute",
  display: "grid",
  placeItems: "center",
};

const chainSpark: CSSProperties = {
  position: "absolute",
  width: 24,
  height: 24,
  borderRadius: 999,
  background: "radial-gradient(circle, var(--accent), transparent 65%)",
  boxShadow: "0 0 20px var(--accent-glow)",
};

const tableVisualGrid: CSSProperties = {
  position: "absolute",
  left: 14,
  top: 14,
  width: 150,
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 4,
};

const tableVisualCell: CSSProperties = {
  aspectRatio: "1",
  borderRadius: 4,
  border: "1px solid var(--border)",
  boxShadow: "0 0 8px color-mix(in oklch, var(--primary) 20%, transparent)",
};

const moleculeBadge: CSSProperties = {
  position: "absolute",
  right: 18,
  top: 28,
};

const scoreBadge: CSSProperties = {
  position: "absolute",
  right: 18,
  bottom: 18,
  padding: "7px 10px",
  borderRadius: 10,
  background: "var(--surface-elevated)",
  border: "1px solid color-mix(in oklch, var(--accent) 60%, var(--border))",
  color: "var(--accent)",
  fontSize: 10,
  fontWeight: 950,
  boxShadow: "0 0 16px var(--accent-glow)",
};

const onboardingDots: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 6,
  marginTop: 2,
};

const onboardingDot: CSSProperties = {
  height: 8,
  borderRadius: 999,
  transition: "width 180ms ease, background 180ms ease",
};

const onboardingActions: CSSProperties = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "0.8fr 1.2fr",
  gap: 10,
  marginTop: 2,
};
