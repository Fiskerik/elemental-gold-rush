import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

const FCM_TOKEN_STORAGE_KEY = "atomic-fusion-fcm-token";

let initializationPromise: Promise<void> | null = null;

function rememberToken(token: string): void {
  try {
    window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    // Token persistence is best-effort; notification delivery does not depend on it.
  }

  console.info("[push] FCM registration token received", token);
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
    const tokenListener = await FirebaseMessaging.addListener("tokenReceived", ({ token }) => {
      rememberToken(token);
    });

    try {
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
    } catch (error) {
      console.warn("[push] Unable to register for Firebase notifications", error);
    } finally {
      await tokenListener.remove();
    }
  })();

  return initializationPromise;
}
