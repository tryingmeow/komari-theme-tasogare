import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "127.0.0.1",
    port: 5180,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:25774",
        changeOrigin: true,
        // Komari rejects cross-origin POSTs (403); dev-only Origin rewrite
        headers: { Origin: "http://127.0.0.1:25774" },
      },
    },
  },
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
