import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { initializePushNotifications } from "./game/pushNotifications";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

declare global {
  interface Window {
    __bootReady?: () => void;
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

createRoot(rootElement).render(<RouterProvider router={router} />);

if (Capacitor.getPlatform() === "ios") {
  void Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
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
  void initializePushNotifications();
}

window.requestAnimationFrame(() => {
  window.__bootReady?.();
});
