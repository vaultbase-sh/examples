import { Vaultbase } from "@vaultbase/sdk";
import type { Schema } from "./vaultbase-schema.gen.ts";

/**
 * One client for the whole app. In development Vite proxies /api and
 * /realtime to your Vaultbase (see vite.config.ts), so the base URL is this
 * page's own origin. In production, serve the built app from the same
 * origin as Vaultbase, or set VITE_VAULTBASE_URL and allow the app's origin
 * in Settings → CORS.
 *
 * The session is kept in localStorage, so it survives reloads and is shared
 * by every tab: signing out in one signs out the others.
 */
export const vb = new Vaultbase<Schema>({
  baseUrl: import.meta.env.VITE_VAULTBASE_URL ?? window.location.origin,
});

export type Todo = Schema["todos"]["record"];
