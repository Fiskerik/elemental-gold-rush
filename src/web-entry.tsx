import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

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
document.documentElement.classList.add("platform-web");
document.documentElement.style.colorScheme = storedTheme;

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Web root element "#root" was not found.');
}

const router = getRouter();

createRoot(rootElement).render(<RouterProvider router={router} />);

window.requestAnimationFrame(() => {
  (window as { __bootReady?: () => void }).__bootReady?.();
});
