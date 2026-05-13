import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MainMenu } from "@/game/MainMenu";
import { GameBoard } from "@/game/GameBoard";
import { LevelSelect } from "@/game/LevelSelect";
import { Collection } from "@/game/Collection";
import { Settings } from "@/game/Settings";
import { Shop } from "@/game/Shop";
import { LabModes } from "@/game/LabModes";
import { PowerUpLibrary } from "@/game/PowerUpLibrary";
import { GameModeId } from "@/game/challenges";
import { useProgress } from "@/game/store";

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
  | { name: "game"; levelId: number; mode?: GameModeId }
  | { name: "collection" }
  | { name: "shop" }
  | { name: "lab" }
  | { name: "library" }
  | { name: "settings" };

function Index() {
  const unlockedLevel = useProgress((s) => s.unlockedLevel);
  const [screen, setScreen] = useState<Screen>({ name: "menu" });

  switch (screen.name) {
    case "menu":
      return (
        <MainMenu
          onPlay={() => setScreen({ name: "game", levelId: unlockedLevel })}
          onLevels={() => setScreen({ name: "levels" })}
          onCollection={() => setScreen({ name: "collection" })}
          onSettings={() => setScreen({ name: "settings" })}
          onShop={() => setScreen({ name: "shop" })}
          onLab={() => setScreen({ name: "lab" })}
          onLibrary={() => setScreen({ name: "library" })}
        />
      );
    case "levels":
      return (
        <LevelSelect
          onPick={(id) => setScreen({ name: "game", levelId: id })}
          onBack={() => setScreen({ name: "menu" })}
        />
      );
    case "game":
      return (
        <GameBoard
          levelId={screen.levelId}
          mode={screen.mode}
          onExit={() => setScreen({ name: "menu" })}
          onWin={(nextId) => {
            if (nextId) setScreen({ name: "game", levelId: nextId });
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
      return <PowerUpLibrary onBack={() => setScreen({ name: "menu" })} />;
    case "settings":
      return <Settings onBack={() => setScreen({ name: "menu" })} />;
  }
}
