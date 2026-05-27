import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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
});
