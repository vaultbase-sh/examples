import { useEffect, useState } from "react";
import { vb, type Post } from "../lib/vaultbase.ts";

const PER_PAGE = 12;

/**
 * A page-by-page list of posts with the author expanded.
 *
 * `search` runs Vaultbase's full-text search over the fields marked
 * searchable in schema.json (title and body). Results then come back by
 * relevance; without a search, newest first.
 *
 * The `posts` list rule decides what anyone sees at all: published posts,
 * plus the caller's own drafts. `filter` only narrows that down.
 */
export function usePosts({ filter, search }: { filter: string; search: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // The page belongs to one query: a new filter or search starts at page 1.
  const query = `${filter}\n${search}`;
  const [paging, setPaging] = useState({ query, page: 1 });
  const page = paging.query === query ? paging.page : 1;

  useEffect(() => {
    // Typing in the search box changes `search` on every key; abort the
    // request for the previous value so a slow answer can't land last.
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    vb.collection("posts").list({
      filter,
      search: search.trim() || undefined,
      sort: search.trim() ? undefined : "-created",
      expand: "author",
      page,
      perPage: PER_PAGE,
      signal: abort.signal,
    }).then((res) => {
      setPosts((list) => (page === 1 ? res.data : [...list, ...res.data]));
      setHasMore(res.page < res.totalPages);
      setLoading(false);
    }).catch((e) => {
      if (abort.signal.aborted) return;
      setError(e);
      setLoading(false);
    });
    return () => abort.abort();
  }, [filter, search, page]);

  return { posts, loading, error, hasMore, loadMore: () => setPaging({ query, page: page + 1 }) };
}
