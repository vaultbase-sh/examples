import { useState } from "react";
import { usePost } from "../hooks/usePost.ts";
import { href, navigate } from "../lib/router.ts";
import { authorName, coverUrl, errorMessage, formatDate, vb, type User } from "../lib/vaultbase.ts";
import { Comments } from "./Comments.tsx";

export function PostPage({ id, user }: { id: string; user: User | null }) {
  const { post, state, error } = usePost(id);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (state === "loading" && !post) return <p className="muted center">Loading…</p>;
  if (state === "missing") {
    return (
      <section className="card center">
        <h1>Post not found</h1>
        <p className="muted">It may have been deleted, or it's a draft only its author can see.</p>
        <a href={href({ page: "home" })}>Back to all posts</a>
      </section>
    );
  }
  if (state === "error" || !post) return <p className="error" role="alert">{errorMessage(error)}</p>;

  const mine = user?.id === post.author;

  async function remove() {
    try {
      // The post's comments go with it: `comments.post` cascades on delete.
      await vb.collection("posts").delete(post!.id);
      navigate({ page: mine ? "mine" : "home" });
    } catch (e) {
      setDeleteError(errorMessage(e));
    }
  }

  return (
    <article className="post">
      {post.cover && <img className="hero" src={coverUrl(post.cover, "hero")} alt="" width={1200} height={630} />}
      <h1>{post.title}</h1>
      <p className="meta muted">
        {authorName(post)} · {formatDate(post.created)}
        {post.updated - post.created > 60 && <> · edited {formatDate(post.updated)}</>}
        {!post.published && <span className="badge">Draft</span>}
      </p>

      {mine && (
        <div className="row actions">
          <a className="button" href={href({ page: "edit", id: post.id })}>Edit</a>
          {confirming ? (
            <>
              <button type="button" className="danger" onClick={() => void remove()}>Delete for good</button>
              <button type="button" className="link" onClick={() => setConfirming(false)}>Keep it</button>
            </>
          ) : (
            <button type="button" className="link" onClick={() => setConfirming(true)}>Delete</button>
          )}
          {deleteError && <span className="error" role="alert">{deleteError}</span>}
        </div>
      )}

      <div className="body">
        {post.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
      </div>

      {post.published ? <Comments postId={post.id} user={user} /> : (
        <p className="muted note">Comments open once the post is published.</p>
      )}
    </article>
  );
}
