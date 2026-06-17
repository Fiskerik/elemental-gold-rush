import type { CapacitorConfig } from '@capacitor/cli';

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
  },
};

export default config;
