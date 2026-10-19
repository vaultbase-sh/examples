import { Vaultbase, isVaultbaseError } from "@vaultbase/sdk";
import type { Schema } from "./vaultbase-schema.gen.ts";

export type Todo = Schema["todos"]["record"];
export type User = Schema["users"]["record"];

/**
 * One client for the whole app.
 *
 * In development, Vite proxies /api and /realtime to Vaultbase (see
 * vite.config.ts), so the base URL is the page's own origin. In production,
 * serve the app from the same origin as Vaultbase, or set VITE_VAULTBASE_URL
 * and allow the app's origin in the admin under Settings → CORS.
 *
 * The session lives in localStorage: it survives reloads, and every tab
 * shares it.
 */
export const vb = new Vaultbase<Schema>({
  baseUrl: import.meta.env.VITE_VAULTBASE_URL ?? window.location.origin,
});

/** A message to show for anything the SDK throws. */
export function errorMessage(e: unknown): string {
  if (isVaultbaseError(e) && e.data.kind === "validation") {
    const fields = Object.values(e.data.details);
    if (fields.length) return fields.join(" ");
  }
  return e instanceof Error ? e.message : String(e);
}
