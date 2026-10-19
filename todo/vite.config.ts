import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

// The app talks to Vaultbase through this dev server, so the browser sees
// one origin and the server needs no CORS settings. Point VAULTBASE_URL at
// your instance (default: a local one on the standard port).
const target = (process.env.VAULTBASE_URL ?? "http://localhost:8091").replace(/\/+$/, "");

// Vaultbase refuses realtime connections whose Origin isn't its own or on
// its allow-list. Through this proxy the browser's Origin is the dev server
// (http://localhost:5173), so present Vaultbase's own origin instead.
const proxy: ProxyOptions = {
  target,
  changeOrigin: true,
  configure: (p) => {
    const origin = new URL(target).origin;
    p.on("proxyReq", (req) => { if (req.getHeader("origin")) req.setHeader("origin", origin); });
    p.on("proxyReqWs", (req) => { if (req.getHeader("origin")) req.setHeader("origin", origin); });
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": proxy,
      // The realtime WebSocket.
      "/realtime": { ...proxy, ws: true },
    },
  },
});
