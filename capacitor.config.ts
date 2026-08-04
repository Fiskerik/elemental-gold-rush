import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.eaconsulting.atomicfusion",
  appName: "Atomic Fusion Rush",
  webDir: "dist",
  server: {
    iosScheme: "https",
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Default,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0A0A1A",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#0A0A1A",
    },
    FirebaseMessaging: {
      presentationOptions: ["alert", "badge", "sound"],
    },
  },
};

export default config;
