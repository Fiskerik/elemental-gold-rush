import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

declare global {
  interface Window {
    __bootReady?: () => void;
  }
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

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Capacitor root element "#root" was not found.');
}

const router = getRouter();

createRoot(rootElement).render(<RouterProvider router={router} />);

if (Capacitor.getPlatform() === "ios") {
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  void StatusBar.setStyle({ style: storedTheme === "light" ? Style.Light : Style.Dark }).catch(
    () => {},
  );
  void StatusBar.setBackgroundColor({
    color: storedTheme === "light" ? "#f7f5ef" : "#0A0A1A",
  }).catch(() => {});
}

window.requestAnimationFrame(() => {
  window.__bootReady?.();
});
