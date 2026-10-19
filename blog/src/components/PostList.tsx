import { useEffect, useState } from "react";
import { usePosts } from "../hooks/usePosts.ts";
import { href } from "../lib/router.ts";
import { authorName, coverUrl, errorMessage, formatDate, type Post } from "../lib/vaultbase.ts";

/**
 * Posts as cards, with a search box. Used for the home page (published
 * posts) and for "My posts" (the signed-in author's, drafts included).
 */
export function PostList({ title, filter, empty }: { title: string; filter: string; empty: string }) {
  const [search, setSearch] = useState("");
  // Search as you type: wait for a pause in typing before asking the server.
  const debounced = useDebounced(search, 250);
  const { posts, loading, error, hasMore, loadMore } = usePosts({ filter, search: debounced });

  return (
    <section>
      <div className="row list-head">
        <h1 className="grow">{title}</h1>
        <input type="search" className="search" placeholder="Search posts" aria-label="Search posts"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? <p className="error" role="alert">{errorMessage(error)}</p> : null}
      {!loading && !error && posts.length === 0 && (
        <p className="empty muted">{debounced.trim() ? `Nothing matches “${debounced.trim()}”.` : empty}</p>
      )}

      <div className="grid">
        {posts.map((post) => <PostCard key={post.id} post={post} />)}
      </div>

      {loading && <p className="muted center">Loading…</p>}
      {!loading && hasMore && (
        <p className="center"><button type="button" onClick={loadMore}>Load more</button></p>
      )}
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <a className="card post-card" href={href({ page: "post", id: post.id })}>
      {post.cover
        ? <img src={coverUrl(post.cover, "card")} alt="" width={480} height={270} loading="lazy" />
        : <div className="cover-placeholder" aria-hidden="true" />}
      <div className="post-card-body">
        <h2>{post.title}</h2>
        <p className="excerpt">{excerpt(post.body)}</p>
        <p className="meta muted">
          {authorName(post)} · {formatDate(post.created)}
          {!post.published && <span className="badge">Draft</span>}
        </p>
      </div>
    </a>
  );
}

function useDebounced(value: string, ms: number): string {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

function excerpt(body: string): string {
  const text = body.replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
}
