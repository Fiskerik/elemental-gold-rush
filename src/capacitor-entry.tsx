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

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Capacitor root element "#root" was not found.');
}

const router = getRouter();

createRoot(rootElement).render(<RouterProvider router={router} />);

if (Capacitor.getPlatform() === "ios") {
  void StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

window.requestAnimationFrame(() => {
  window.__bootReady?.();
});
