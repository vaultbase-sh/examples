import { useCallback, useEffect, useState } from "react";
import { q } from "@vaultbase/sdk";
import { vb, type Comment } from "../lib/vaultbase.ts";

/**
 * A post's comments, oldest first, kept live: comments other readers post
 * or delete show up without a reload.
 */
export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const upsert = useCallback((c: Comment) => setComments((list) =>
    [...list.filter((x) => x.id !== c.id), c].sort((a, b) => a.created - b.created || a.id.localeCompare(b.id))), []);
  const drop = useCallback((id: string) => setComments((list) => list.filter((c) => c.id !== id)), []);

  // Realtime events carry the record without `expand`, so fetch the comment
  // again with its author before showing it.
  const fetchAndShow = useCallback(async (id: string) => {
    upsert(await vb.collection("comments").get(id, { expand: "author" }));
  }, [upsert]);

  useEffect(() => {
    let cancelled = false;
    // Deleted while the list was loading: the loaded page may still have them.
    const deleted = new Set<string>();

    // Subscribe first, so nothing posted while the list loads is missed.
    const unsubscribe = vb.subscribe("comments", "*", (event) => {
      if (cancelled) return;
      if (event.type === "delete") {
        const id = event.id ?? (event.record?.id as string | undefined) ?? "";
        deleted.add(id);
        drop(id);
      } else if (event.type === "create" && (event.record as Comment | undefined)?.post === postId) {
        fetchAndShow(event.record!.id as string).catch(() => { /* deleted again already */ });
      }
    });

    (async () => {
      try {
        const all: Comment[] = [];
        const filter = q`post = ${postId}`;
        for await (const c of vb.collection("comments").iterate({ filter, sort: "created", expand: "author", perPage: 200 })) all.push(c);
        if (!cancelled) setComments((live) => mergeById(all.filter((c) => !deleted.has(c.id)), live));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; unsubscribe(); };
  }, [postId, drop, fetchAndShow]);

  return {
    comments,
    loading,
    error,
    add: async (body: string, authorId: string) => {
      const c = await vb.collection("comments").create({ post: postId, author: authorId, body });
      await fetchAndShow(c.id);
    },
    remove: async (c: Comment) => {
      await vb.collection("comments").delete(c.id);
      drop(c.id);
    },
  };
}

/** The loaded list, plus anything realtime delivered while it loaded. */
function mergeById(loaded: Comment[], live: Comment[]): Comment[] {
  const ids = new Set(loaded.map((c) => c.id));
  return [...loaded, ...live.filter((c) => !ids.has(c.id))].sort((a, b) => a.created - b.created);
}
