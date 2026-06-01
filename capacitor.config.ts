const config = {
  appId: "com.eaconsulting.atomicfusion",
  appName: "Atomic Fusion Rush",
  webDir: "dist/client",
  bundledWebRuntime: false,
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
      style: "LIGHT",
      backgroundColor: "#0A0A1A",
    },
  },
};

export default config;
