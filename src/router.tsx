import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { routeTree } from "./routeTree.gen";

const routerErrorPanelStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background: "#0A0A1A",
  color: "#F4F7FF",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function RouterErrorPanel({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  return (
    <main style={routerErrorPanelStyle} role="alert">
      <section style={{ width: "100%", maxWidth: 620 }}>
        <p style={{ color: "#FFD45A", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>
          ATOMIC FUSION RUSH
        </p>
        <h1 style={{ margin: "8px 0", fontSize: 24 }}>The game could not load</h1>
        <p style={{ color: "#C7D1E6", lineHeight: 1.5 }}>
          Please reload the app. The technical details below are included so this startup issue can
          be diagnosed from the TestFlight build.
        </p>
        <pre
          style={{
            maxHeight: 260,
            overflow: "auto",
            padding: 14,
            borderRadius: 12,
            background: "#151A2D",
            color: "#FFB4B4",
            whiteSpace: "pre-wrap",
            fontSize: 12,
          }}
        >
          {stack || message}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            border: 0,
            borderRadius: 10,
            padding: "12px 18px",
            background: "#FFD45A",
            color: "#131722",
            fontWeight: 800,
          }}
        >
          Reload game
        </button>
      </section>
    </main>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ({ error }) => {
      console.error(error);
      return <RouterErrorPanel error={error} />;
    },
  });

  return router;
};
