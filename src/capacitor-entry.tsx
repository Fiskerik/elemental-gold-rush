import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { initializePushNotifications } from "./game/pushNotifications";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

declare global {
  interface Window {
    __bootReady?: () => void;
  }
}

type StartupBoundaryState = { error: Error | null };

function normalizeStartupError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : JSON.stringify(error));
}

class StartupErrorBoundary extends Component<{ children: ReactNode }, StartupBoundaryState> {
  state: StartupBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): StartupBoundaryState {
    return { error: normalizeStartupError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const entry = {
      at: new Date().toISOString(),
      kind: "react-error-boundary",
      message: `${error.message}\n${error.stack ?? ""}\n${info.componentStack}`,
    };
    try {
      const key = "atomic-fusion-native-diagnostics";
      const previous = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      window.localStorage.setItem(key, JSON.stringify([...previous.slice(-9), entry]));
    } catch {
      // Diagnostics must never prevent the fallback UI from rendering.
    }
    console.error("[native-diagnostic:react-error-boundary]", entry.message);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const error = this.state.error;

    return (
      <main
        role="alert"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#0A0A1A",
          color: "#F4F7FF",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <section style={{ width: "100%", maxWidth: 620 }}>
          <p style={{ color: "#FFD45A", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>
            ATOMIC FUSION RUSH
          </p>
          <h1 style={{ margin: "8px 0", fontSize: 24 }}>Startup error</h1>
          <p style={{ color: "#C7D1E6", lineHeight: 1.5 }}>
            The app loaded its native shell, but the game interface failed to render.
          </p>
          <pre
            style={{
              maxHeight: 300,
              overflow: "auto",
              padding: 14,
              borderRadius: 12,
              background: "#151A2D",
              color: "#FFB4B4",
              whiteSpace: "pre-wrap",
              fontSize: 12,
            }}
          >
            {error.stack || error.message}
          </pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem("elemental-gold-rush");
                window.location.reload();
              }}
              style={{
                border: "1px solid #66728A",
                borderRadius: 10,
                padding: "12px 18px",
                background: "transparent",
                color: "#F4F7FF",
                fontWeight: 700,
              }}
            >
              Reset local save and reload
            </button>
          </div>
        </section>
      </main>
    );
  }
}

function installNativeDiagnostics() {
  const writeDiagnostic = (kind: string, detail: unknown) => {
    try {
      const message =
        detail instanceof Error
          ? `${detail.name}: ${detail.message}\n${detail.stack ?? ""}`
          : typeof detail === "string"
            ? detail
            : JSON.stringify(detail);
      const entry = {
        at: new Date().toISOString(),
        kind,
        message,
      };
      const key = "atomic-fusion-native-diagnostics";
      const previous = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      window.localStorage.setItem(key, JSON.stringify([...previous.slice(-9), entry]));
      console.error(`[native-diagnostic:${kind}]`, message);
    } catch {
      console.error(`[native-diagnostic:${kind}]`, detail);
    }
  };

  window.addEventListener("error", (event) => {
    writeDiagnostic("error", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    writeDiagnostic("unhandledrejection", event.reason);
  });
}

function getStoredTheme(): "dark" | "light" {
  try {
    const raw = window.localStorage.getItem("elemental-gold-rush");
    const state = raw ? (JSON.parse(raw) as { state?: { appTheme?: unknown } }) : null;
    return state?.state?.appTheme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const storedTheme = getStoredTheme();
document.documentElement.classList.add(storedTheme === "light" ? "theme-light" : "theme-dark");
document.documentElement.classList.add("platform-native");
document.documentElement.style.colorScheme = storedTheme;
installNativeDiagnostics();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Capacitor root element "#root" was not found.');
}

const router = getRouter();

createRoot(rootElement).render(
  <StartupErrorBoundary>
    <RouterProvider router={router} />
  </StartupErrorBoundary>,
);

if (Capacitor.getPlatform() === "ios") {
  void Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {});
  void Keyboard.setStyle({ style: KeyboardStyle.Default }).catch(() => {});
  void Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  void Keyboard.setScroll({ isDisabled: false }).catch(() => {});
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  void StatusBar.setStyle({ style: storedTheme === "light" ? Style.Light : Style.Dark }).catch(
    () => {},
  );
  void StatusBar.setBackgroundColor({
    color: storedTheme === "light" ? "#f7f5ef" : "#0A0A1A",
  }).catch(() => {});
  // Keep optional push setup out of the first render. APNs/Firebase can reject
  // while the native plugin is still being configured.
  window.setTimeout(() => {
    void initializePushNotifications().catch((error) => {
      console.warn("[push] Startup registration failed", error);
    });
  }, 1500);
}
