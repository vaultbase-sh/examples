import { useEffect, useState } from "react";
import { isNotFound, vb, type Post } from "../lib/vaultbase.ts";

/**
 * One post with its author, kept live: when the author edits or deletes it,
 * open pages follow.
 *
 * A draft reads as not found to everyone but its author: the `posts` view
 * rule only lets the author see an unpublished post.
 */
export function usePost(id: string) {
  const [post, setPost] = useState<Post | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    const load = async () => {
      try {
        const p = await vb.collection("posts").get(id, { expand: "author" });
        if (!cancelled) { setPost(p); setState("ready"); }
      } catch (e) {
        if (cancelled) return;
        if (isNotFound(e)) setState("missing");
        else { setError(e); setState("error"); }
      }
    };

    // A subscription to one record: only this post's events arrive.
    const unsubscribe = vb.subscribe("posts", id, (event) => {
      if (event.type === "delete") setState("missing");
      else void load();
    });
    void load();

    return () => { cancelled = true; unsubscribe(); };
  }, [id]);

  return { post, state, error };
}
