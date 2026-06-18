import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { MainMenu } from "@/game/MainMenu";
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
import { MOLECULE_CHALLENGE_BY_LEVEL, getCompoundChallengeKind, getLevelById } from "@/game/levels";
import { DEFAULT_PLAYER_DISPLAY_NAME, normalizePlayerDisplayName, useProgress } from "@/game/store";
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
  const refreshDailyFeatures = useProgress((s) => s.refreshDailyFeatures);
  const setPlayerDisplayName = useProgress((s) => s.setPlayerDisplayName);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [gameRunNonce, setGameRunNonce] = useState(0);
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const [resumePrompt, setResumePrompt] = useState<ReturnType<typeof getSavedRunSummary>>(null);
  const [dailyNamePromptOpen, setDailyNamePromptOpen] = useState(false);
  const [dailyNameDraft, setDailyNameDraft] = useState("");

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
    if (!useProgress.getState().playerDisplayName) {
      setDailyNameDraft("");
      setDailyNamePromptOpen(true);
      return;
    }
    const dailyChallenge = useProgress.getState().dailyChallenge;
    setScreen({ name: "game", levelId: dailyChallenge.levelId, mode: "daily-challenge" });
  }

  function startDailyChallengeAfterName() {
    const normalizedName = normalizePlayerDisplayName(dailyNameDraft);
    if (!normalizedName) return;
    setPlayerDisplayName(normalizedName);
    setDailyNamePromptOpen(false);
    refreshDailyFeatures();
    const dailyChallenge = useProgress.getState().dailyChallenge;
    setScreen({ name: "game", levelId: dailyChallenge.levelId, mode: "daily-challenge" });
  }

  function startSecretCompound() {
    refreshDailyFeatures();
    const { secretCompound, revealSecretCompound } = useProgress.getState();
    revealSecretCompound();
    setScreen({
      name: "game",
      levelId: getLevelById(unlockedLevel)?.id ?? 1,
      mode: "campaign",
      secretCompoundId: secretCompound.compoundId,
    });
  }

  function startCampaignLevel(levelId: number) {
    const compoundId = MOLECULE_CHALLENGE_BY_LEVEL[levelId];
    setScreen({
      name: "game",
      levelId,
      mode: "campaign",
      secretCompoundId:
        compoundId && getCompoundChallengeKind(levelId) === "search-find" ? compoundId : undefined,
    });
  }

  switch (screen.name) {
    case "menu":
      return (
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
                setScreen({
                  name: "game",
                  levelId: resumePrompt.levelId,
                  mode: resumePrompt.mode,
                  resumeSavedRun: true,
                });
                setResumePrompt(null);
              }}
              onStartOver={() => {
                clearSavedRun();
                setScreen({
                  name: "game",
                  levelId: getLevelById(unlockedLevel)?.id ?? 1,
                  mode: "campaign",
                });
                setResumePrompt(null);
              }}
              onCancel={() => setResumePrompt(null)}
            />
          )}
          {dailyNamePromptOpen && (
            <DailyBoardNamePrompt
              value={dailyNameDraft}
              onChange={setDailyNameDraft}
              onCancel={() => setDailyNamePromptOpen(false)}
              onStart={startDailyChallengeAfterName}
            />
          )}
        </>
      );
    case "levels":
      return <LevelSelect onPick={startCampaignLevel} onBack={() => setScreen({ name: "menu" })} />;
    case "game":
      return (
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
            setScreen({
              name: "game",
              levelId: nextId,
              mode: screen.mode ?? "campaign",
              secretCompoundId: nextId === screen.levelId ? screen.secretCompoundId : undefined,
            });
          }}
        />
      );
    case "collection":
      return <Collection onBack={() => setScreen({ name: "menu" })} />;
    case "shop":
      return <Shop onBack={() => setScreen({ name: "menu" })} />;
    case "lab":
      return (
        <LabModes
          onBack={() => setScreen({ name: "menu" })}
          onStart={(mode, levelId, options) =>
            setScreen({ name: "game", levelId, mode, secretCompoundId: options?.secretCompoundId })
          }
        />
      );
    case "library":
      return <GameLibrary onBack={() => setScreen({ name: "menu" })} />;
    case "profile":
      return <Profile onBack={() => setScreen({ name: "menu" })} />;
    case "leaderboard":
      return <Leaderboard onBack={() => setScreen({ name: "menu" })} />;
    case "settings":
      return <Settings onBack={() => setScreen({ name: "menu" })} />;
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

function DailyBoardNamePrompt({
  value,
  onChange,
  onCancel,
  onStart,
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const hasName = value.trim().length > 0;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose display name"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "grid",
        placeItems: "center",
        padding: 20,
        background: "rgba(0,0,0,0.72)",
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStart();
        }}
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
          DAILY BOARD
        </div>
        <h2 style={{ margin: "6px 0 12px", fontSize: 23 }}>Display name</h2>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={18}
          placeholder={DEFAULT_PLAYER_DISPLAY_NAME}
          aria-label="Display name"
          data-no-localize="true"
          autoCapitalize="words"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="done"
          spellCheck={false}
          style={promptNameInput}
        />
        <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
          <button
            type="submit"
            disabled={!hasName}
            style={{
              ...promptPrimaryBtn,
              opacity: hasName ? 1 : 0.55,
              cursor: hasName ? "pointer" : "not-allowed",
            }}
          >
            Start Daily Board
          </button>
          <button type="button" onClick={onCancel} style={promptGhostBtn}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const promptNameInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "12px 14px",
  background: "var(--surface)",
  color: "var(--foreground)",
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: 850,
  lineHeight: 1.2,
  textAlign: "center",
};

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
