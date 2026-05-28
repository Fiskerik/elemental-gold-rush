import { createFileRoute } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { MainMenu } from "@/game/MainMenu";
import { clearSavedRun, GameBoard, getSavedRunSummary } from "@/game/GameBoard";
import { LevelSelect } from "@/game/LevelSelect";
import { Collection } from "@/game/Collection";
import { Settings } from "@/game/Settings";
import { Shop } from "@/game/Shop";
import { LabModes } from "@/game/LabModes";
import { GameLibrary } from "@/game/GameLibrary";
import { Profile } from "@/game/Profile";
import { GameModeId } from "@/game/challenges";
import { getLevelById } from "@/game/levels";
import { useProgress } from "@/game/store";
import {
  syncCustomerInfoEntitlement,
} from "@/game/purchases";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elemental Gold Rush — Periodic Table Merge Puzzle" },
      {
        name: "description",
        content:
          "Fuse atoms, climb the periodic table, and chase Gold in this addictive merge puzzle game. 118 elements with real chemistry facts.",
      },
      { property: "og:title", content: "Elemental Gold Rush" },
      {
        property: "og:description",
        content:
          "Merge hydrogen into helium, helium into lithium... all the way to gold and beyond.",
      },
    ],
  }),
  component: Index,
});

type Screen =
  | { name: "menu" }
  | { name: "levels" }
  | { name: "game"; levelId: number; mode?: GameModeId; resumeSavedRun?: boolean }
  | { name: "collection" }
  | { name: "shop" }
  | { name: "lab" }
  | { name: "library" }
  | { name: "profile" }
  | { name: "settings" };

function Index() {
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const hasProPack = useProgress((s) => s.hasProPack);
  const grantProPack = useProgress((s) => s.grantProPack);
  const appTheme = useProgress((s) => s.appTheme);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });
  const [showLaunchScreen, setShowLaunchScreen] = useState(() => Capacitor.isNativePlatform());
  const [resumePrompt, setResumePrompt] = useState<ReturnType<typeof getSavedRunSummary>>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-light", appTheme === "light");
    root.classList.toggle("theme-dark", appTheme === "dark");
    root.style.colorScheme = appTheme;
    if (Capacitor.getPlatform() === "ios") {
      void StatusBar.setStyle({ style: appTheme === "light" ? Style.Dark : Style.Light }).catch(
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
    let cancelled = false;
    // Delay native purchase SDK access to avoid launch-time native SDK crashes on some iOS builds.
    const timeoutId = window.setTimeout(() => {
      void syncCustomerInfoEntitlement()
        .then((hasProEntitlement) => {
          if (!cancelled && hasProEntitlement) grantProPack();
        })
        .catch(() => {
          // Keep launch resilient even if native billing SDK has runtime issues.
        });
    }, 4000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [grantProPack]);

  if (showLaunchScreen) return <NativeLaunchScreen />;

  function startCampaign() {
    const saved = getSavedRunSummary();
    if (saved) {
      setResumePrompt(saved);
      return;
    }
    setScreen({ name: "game", levelId: getLevelById(unlockedLevel)?.id ?? 1, mode: "campaign" });
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
                setScreen({ name: "game", levelId: getLevelById(unlockedLevel)?.id ?? 1, mode: "campaign" });
                setResumePrompt(null);
              }}
              onCancel={() => setResumePrompt(null)}
            />
          )}
        </>
      );
    case "levels":
      return (
        <LevelSelect
          onPick={(id) => setScreen({ name: "game", levelId: id, mode: "campaign" })}
          onBack={() => setScreen({ name: "menu" })}
        />
      );
    case "game":
      return (
        <GameBoard
          key={`${screen.mode ?? "campaign"}-${screen.levelId}-${screen.resumeSavedRun ? "resume" : "new"}`}
          levelId={screen.levelId}
          mode={screen.mode}
          resumeSavedRun={screen.resumeSavedRun}
          onExit={() => setScreen({ name: "menu" })}
          onMap={() => setScreen({ name: "levels" })}
          onWin={(nextId) => {
            if (nextId) setScreen({ name: "game", levelId: nextId, mode: screen.mode ?? "campaign" });
            else setScreen({ name: "menu" });
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
          onStart={(mode, levelId) => setScreen({ name: "game", levelId, mode })}
        />
      );
    case "library":
      return <GameLibrary onBack={() => setScreen({ name: "menu" })} />;
    case "profile":
      return <Profile onBack={() => setScreen({ name: "menu" })} />;
    case "settings":
      return <Settings onBack={() => setScreen({ name: "menu" })} />;
  }
}

function NativeLaunchScreen() {
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
          alt="Elemental Gold Rush"
          style={{
            width: 98,
            height: 98,
            borderRadius: 24,
            boxShadow: "0 18px 46px rgba(0,0,0,0.46)",
          }}
        />
        <div className="gold-text" style={{ fontSize: 22, fontWeight: 900 }}>
          Elemental Gold Rush
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)", letterSpacing: 0.4 }}>
          Loading compounds...
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
