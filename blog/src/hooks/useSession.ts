import { useSyncExternalStore } from "react";
import { vb, type User } from "../lib/vaultbase.ts";

/**
 * The signed-in user, or null.
 *
 * Follows the SDK's auth store, which changes on sign-in, sign-out and token
 * refresh, in this tab and in others (it's backed by localStorage).
 */
export function useSession(): User | null {
  const token = useSyncExternalStore(subscribe, () => vb.client.authStore.get()?.token ?? "");
  return token ? ((vb.client.authStore.get()?.record as User | undefined) ?? null) : null;
}

function subscribe(onChange: () => void): () => void {
  return vb.client.authStore.onChange?.(onChange) ?? (() => {});
}
