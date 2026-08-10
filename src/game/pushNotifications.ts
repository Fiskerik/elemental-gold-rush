import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

const FCM_TOKEN_STORAGE_KEY = "atomic-fusion-fcm-token";
const PUSH_INSTALLATION_ID_STORAGE_KEY = "atomic-fusion-push-installation-id";
const PUSH_FUNCTIONS_BASE_URL = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_BASE_URL ?? "").replace(/\/$/, "");
const PENDING_PUSH_ROUTE_STORAGE_KEY = "atomic-fusion-pending-push-route";

let initializationPromise: Promise<void> | null = null;

function rememberToken(token: string): void {
  try {
    window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    // Token persistence is best-effort; notification delivery does not depend on it.
  }

  console.info("[push] FCM registration token received", token);
  void syncPushRegistration(token);
}

function getInstallationId(): string {
  try {
    const existing = window.localStorage.getItem(PUSH_INSTALLATION_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(PUSH_INSTALLATION_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return `anonymous-${Date.now()}`;
  }
}

async function postPushBackend(path: string, payload: Record<string, unknown>): Promise<void> {
  if (!PUSH_FUNCTIONS_BASE_URL) return;
  try {
    await fetch(`${PUSH_FUNCTIONS_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.warn("[push] Backend sync failed", error);
  }
}

async function syncPushRegistration(token: string): Promise<void> {
  await postPushBackend("/registerFcmToken", {
    installationId: getInstallationId(),
    token,
    platform: "ios",
    locale: navigator.language,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notificationsEnabled: true,
    dailyBoardReminders: true,
    dailyCompoundReminders: true,
    streakReminders: true,
    lastSeenAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
  });
}

export function recordPushActivity(): void {
  void postPushBackend("/recordPlayerActivity", {
    installationId: getInstallationId(),
    lastSeenAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
  });
}

export function consumePendingPushRoute(): string | null {
  try {
    const route = window.localStorage.getItem(PENDING_PUSH_ROUTE_STORAGE_KEY);
    if (route) window.localStorage.removeItem(PENDING_PUSH_ROUTE_STORAGE_KEY);
    return route;
  } catch {
    return null;
  }
}

/**
 * Registers the iOS app with APNs/FCM and requests notification permission once.
 * The native Firebase Messaging plugin performs the APNs registration and maps
 * the APNs token to the FCM registration token.
 */
export function initializePushNotifications(): Promise<void> {
  if (Capacitor.getPlatform() !== "ios") {
    return Promise.resolve();
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    let tokenListener: { remove: () => Promise<void> } | null = null;
    try {
      await FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
        const data = notification.data as Record<string, unknown> | undefined;
        const route = typeof data?.route === "string" ? data.route : "";
        if (!route) return;
        try {
          window.localStorage.setItem(PENDING_PUSH_ROUTE_STORAGE_KEY, route);
        } catch {
          // The app still opens; routing is best-effort.
        }
      });
      tokenListener = await FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
        rememberToken(token);
      });

      let permission = await FirebaseMessaging.checkPermissions();

      if (permission.receive === "prompt") {
        permission = await FirebaseMessaging.requestPermissions();
      }

      if (permission.receive !== "granted") {
        return;
      }

      const { token } = await FirebaseMessaging.getToken();
      if (token) {
        rememberToken(token);
      }
      recordPushActivity();
    } catch (error) {
      console.warn("[push] Unable to register for Firebase notifications", error);
    } finally {
      await tokenListener?.remove().catch((error) => {
        console.warn("[push] Could not remove token listener", error);
      });
    }
  })();

  return initializationPromise;
}
