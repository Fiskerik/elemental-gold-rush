import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/game/GameApp";

export const Route = createFileRoute("/game")({
  head: () => ({
    meta: [
      { title: "Atomic Fusion Rush - Game" },
      {
        name: "description",
        content:
          "Play Atomic Fusion Rush, a periodic table merge puzzle game about fusing atoms and discovering elements.",
      },
      { property: "og:title", content: "Play Atomic Fusion Rush" },
      {
        property: "og:description",
        content:
          "Play Atomic Fusion Rush in your browser: fuse atoms, discover compounds, and climb the periodic table.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://atomic-fusion.lovable.app/game" },
    ],
    links: [{ rel: "canonical", href: "https://atomic-fusion.lovable.app/game" }],
  }),
  component: GamePage,
});

function GamePage() {
  return <GameApp />;
}
