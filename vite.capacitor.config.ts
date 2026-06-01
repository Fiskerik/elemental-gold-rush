import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const revenueCatIosKey =
    env.VITE_REVENUECAT_IOS_API_KEY ||
    env.REVENUECAT_IOS_API_KEY ||
    env.VITE_REVENUECAT_API_KEY ||
    env.VITE_RC_IOS_API_KEY ||
    "";
  const revenueCatEntitlement =
    env.VITE_REVENUECAT_ENTITLEMENT_ID ||
    env.REVENUECAT_ENTITLEMENT_ID ||
    "atomic_fusion_lifetime";
  const revenueCatOffering =
    env.VITE_REVENUECAT_OFFERING_ID ||
    env.REVENUECAT_OFFERING_ID ||
    "default";

  return {
    plugins: [react(), tsconfigPaths()],
    define: {
      "import.meta.env.VITE_REVENUECAT_IOS_API_KEY": JSON.stringify(revenueCatIosKey),
      "import.meta.env.VITE_REVENUECAT_API_KEY": JSON.stringify(revenueCatIosKey),
      "import.meta.env.VITE_RC_IOS_API_KEY": JSON.stringify(revenueCatIosKey),
      "import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID": JSON.stringify(revenueCatEntitlement),
      "import.meta.env.VITE_REVENUECAT_OFFERING_ID": JSON.stringify(revenueCatOffering),
    },
    build: {
      outDir: "dist/client",
      emptyOutDir: false,
      sourcemap: true,
      rollupOptions: {
        input: resolve(__dirname, "src/capacitor-entry.tsx"),
        output: {
          format: "es",
          entryFileNames: "assets/capacitor-entry.js",
          chunkFileNames: "assets/capacitor-[name]-[hash].js",
          assetFileNames: "assets/capacitor-[name]-[hash][extname]",
        },
      },
    },
  };
});
