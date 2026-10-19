import { useSyncExternalStore } from "react";

/**
 * The app's pages. Hash URLs (`#/posts/<id>`) keep the example free of a
 * router dependency and of server rewrite rules: any static host serves it.
 */
export type Route =
  | { page: "home" }
  | { page: "post"; id: string }
  | { page: "new" }
  | { page: "edit"; id: string }
  | { page: "mine" }
  | { page: "signin" };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "posts" && parts[1]) return parts[2] === "edit" ? { page: "edit", id: parts[1] } : { page: "post", id: parts[1] };
  if (parts[0] === "new") return { page: "new" };
  if (parts[0] === "mine") return { page: "mine" };
  if (parts[0] === "signin") return { page: "signin" };
  return { page: "home" };
}

export function href(route: Route): string {
  switch (route.page) {
    case "home": return "#/";
    case "post": return `#/posts/${encodeURIComponent(route.id)}`;
    case "edit": return `#/posts/${encodeURIComponent(route.id)}/edit`;
    default: return `#/${route.page}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
