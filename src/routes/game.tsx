import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/game/GameApp";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Play Atomic Fusion Rush — Periodic Table Merge Puzzle" },
      {
        name: "description",
        content:
          "Fuse atoms, climb the periodic table, and chase Gold in this addictive merge puzzle game. 118 elements with real chemistry facts.",
      },
      { property: "og:title", content: "Play Atomic Fusion Rush" },
      {
        property: "og:description",
        content:
          "Merge hydrogen into helium, helium into lithium... all the way to gold and beyond.",
      },
    ],
  }),
  component: GamePage,
});

function GamePage() {
  return <GameApp />;
}