import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "./index";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Atomic Fusion Rush - Game" },
      {
        name: "description",
        content:
          "Play Atomic Fusion Rush, a periodic table merge puzzle game about fusing atoms and discovering elements.",
      },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return <GameApp />;
}
