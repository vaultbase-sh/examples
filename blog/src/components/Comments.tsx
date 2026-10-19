import { useState, type FormEvent } from "react";
import { useComments } from "../hooks/useComments.ts";
import { href } from "../lib/router.ts";
import { authorName, errorMessage, formatDate, type User } from "../lib/vaultbase.ts";

export function Comments({ postId, user }: { postId: string; user: User | null }) {
  const { comments, loading, error, add, remove } = useComments(postId);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !user) return;
    setBusy(true);
    setActionError("");
    try {
      await add(text, user.id);
      setBody("");
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="comments">
      <h2>Comments{comments.length > 0 && <span className="muted"> {comments.length}</span>}</h2>

      {(error || actionError) && <p className="error" role="alert">{actionError || errorMessage(error)}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && comments.length === 0 && <p className="muted">No comments yet.</p>}

      <ul>
        {comments.map((c) => (
          <li key={c.id}>
            <p className="meta">
              <strong>{authorName(c)}</strong> <span className="muted">{formatDate(c.created)}</span>
              {user?.id === c.author && (
                <button type="button" className="link" aria-label="Delete your comment"
                  onClick={() => remove(c).catch((e) => setActionError(errorMessage(e)))}>Delete</button>
              )}
            </p>
            <p className="comment-body">{c.body}</p>
          </li>
        ))}
      </ul>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <textarea required maxLength={2000} rows={3} placeholder="Add a comment" aria-label="Comment"
            value={body} onChange={(e) => setBody(e.target.value)} />
          <button type="submit" className="primary" disabled={busy || !body.trim()}>Comment</button>
        </form>
      ) : (
        <p className="muted"><a href={href({ page: "signin" })}>Sign in</a> to comment.</p>
      )}
    </section>
  );
}
