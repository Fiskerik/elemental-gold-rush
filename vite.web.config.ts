import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(__dirname, "src/web-entry.tsx"),
      output: {
        format: "es",
        entryFileNames: "assets/web-entry.js",
        chunkFileNames: "assets/web-[name]-[hash].js",
        assetFileNames: "assets/web-[name]-[hash][extname]",
      },
    },
  },
});
