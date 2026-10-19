import { defineConfig } from "vite";

declare const process: { env: Record<string, string | undefined> };

// The app talks to Vaultbase through this dev server, so the browser sees
// one origin and the server needs no CORS settings. Point VAULTBASE_URL at
// your instance (default: a local one on the standard port).
const target = process.env.VAULTBASE_URL ?? "http://localhost:8091";

export default defineConfig({
  server: {
    proxy: {
      "/api": { target, changeOrigin: true },
      // The realtime WebSocket.
      "/realtime": { target, changeOrigin: true, ws: true },
    },
  },
});
