const config = {
  appId: "com.eaconsulting.atomicfusion",
  appName: "Atomic Fusion",
  webDir: "dist/client",
  bundledWebRuntime: false,
  server: {
    iosScheme: "https",
  },
  ios: {
    contentInset: "automatic",
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
