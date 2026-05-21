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
    scrollEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0A0A1A",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0A0A1A",
    },
  },
};

export default config;
