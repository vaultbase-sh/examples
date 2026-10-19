import { Vaultbase, isVaultbaseError } from "@vaultbase/sdk";
import type { Schema } from "./vaultbase-schema.gen.ts";

export type User = Schema["users"]["record"];
export type Author = Schema["authors"]["record"];
export type Site = Schema["site"]["record"];

/** A post as the app reads it: with `expand=author`, the author's public profile rides along. */
export type Post = Schema["posts"]["record"] & { expand?: { author?: Author } };
export type Comment = Schema["comments"]["record"] & { expand?: { author?: Author } };

/**
 * One client for the whole app.
 *
 * In development, Vite proxies /api and /realtime to Vaultbase (see
 * vite.config.ts), so the base URL is the page's own origin. In production,
 * serve the app from the same origin as Vaultbase, or set VITE_VAULTBASE_URL
 * and allow the app's origin in the admin under Settings → CORS.
 */
export const vb = new Vaultbase<Schema>({
  baseUrl: import.meta.env.VITE_VAULTBASE_URL ?? window.location.origin,
});

/**
 * A cover image URL. The sizes are the ones `schema.json` allows on the
 * `cover` field (`thumbs`); the server answers any other size with the
 * full image. `format: "auto"` sends WebP to browsers that take it.
 */
export function coverUrl(filename: string, size: "card" | "hero"): string {
  return vb.files.url(filename, { thumb: size === "card" ? "480x270_cover" : "1200x630_cover", format: "auto" });
}

export function authorName(record: Post | Comment): string {
  return record.expand?.author?.name || "Someone";
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** A message to show for anything the SDK throws. */
export function errorMessage(e: unknown): string {
  if (isVaultbaseError(e) && e.data.kind === "validation") {
    const fields = Object.values(e.data.details);
    if (fields.length) return fields.join(" ");
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * True when a record isn't there for this caller: deleted (404), or a draft
 * someone else wrote (403, the view rule refusing it).
 */
export function isNotFound(e: unknown): boolean {
  if (!isVaultbaseError(e)) return false;
  return (e.data.kind === "server" && e.data.status === 404) || (e.data.kind === "auth" && e.data.reason === "forbidden");
}
