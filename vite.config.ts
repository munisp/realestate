import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import { createHash } from "node:crypto";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";


const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  define: {
    // Inject build version for cache-busting in service worker
    __BUILD_VERSION__: JSON.stringify(
      createHash("sha256")
        .update(Date.now().toString())
        .digest("hex")
        .slice(0, 8)
    ),
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      // The host will be automatically detected from the browser's location
      // This ensures WebSocket works correctly in proxied environments
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
