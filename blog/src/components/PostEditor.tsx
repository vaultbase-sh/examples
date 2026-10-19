import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePost } from "../hooks/usePost.ts";
import { href, navigate } from "../lib/router.ts";
import { coverUrl, errorMessage, vb, type Post, type User } from "../lib/vaultbase.ts";

const MAX_COVER_BYTES = 5 * 1024 * 1024; // the `cover` field's maxSize in schema.json
const COVER_TYPES = "image/jpeg,image/png,image/webp,image/gif";

/** Write a new post, or edit one of yours (`id`). */
export function PostEditor({ id, user }: { id?: string; user: User }) {
  if (!id) return <Form user={user} />;
  return <EditExisting id={id} user={user} />;
}

function EditExisting({ id, user }: { id: string; user: User }) {
  const { post, state, error } = usePost(id);
  if (state === "loading" && !post) return <p className="muted center">Loading…</p>;
  if (state === "missing" || (post && post.author !== user.id)) {
    return <p className="card center">You can only edit your own posts. <a href={href({ page: "home" })}>All posts</a></p>;
  }
  if (!post) return <p className="error" role="alert">{errorMessage(error)}</p>;
  // Keyed by post, so the form's fields start from this post's values.
  return <Form key={post.id} user={user} post={post} />;
}

function Form({ user, post }: { user: User; post?: Post }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  // `undefined`: keep the current cover. `null`: remove it. A File: replace it.
  const [cover, setCover] = useState<File | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // A new post created by an earlier Save whose upload then failed: Save
  // again updates it instead of creating a second one.
  const created = useRef<Post | null>(null);

  const preview = useObjectUrl(cover);
  const shownCover = cover === undefined && post?.cover ? coverUrl(post.cover, "hero") : preview;

  function pickCover(file: File | undefined) {
    setError("");
    if (!file) return;
    if (file.size > MAX_COVER_BYTES) { setError("Cover images can be up to 5 MB."); return; }
    setCover(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const fields = { title: title.trim(), body: body.trim(), published };
      // A file is uploaded to a record that already exists, so a new post is
      // created first. The upload stores the image; setting `cover` to the
      // returned filename is what attaches it.
      let saved = post ?? created.current;
      const fresh = !saved;
      if (!saved) saved = created.current = await vb.collection("posts").create({ ...fields, author: user.id });
      let coverField: { cover?: string | null } = {};
      if (cover) {
        const meta = await vb.files.upload("posts", saved.id, "cover", cover);
        coverField = { cover: meta.filename };
      } else if (cover === null) {
        // The old image is deleted by the server's hourly sweep of files no
        // record points at any more.
        coverField = { cover: null };
      }
      if (!fresh || coverField.cover !== undefined) {
        await vb.collection("posts").update(saved.id, { ...fields, ...coverField });
      }
      navigate({ page: "post", id: saved.id });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card editor" onSubmit={submit}>
      <h1>{post ? "Edit post" : "New post"}</h1>

      <label>
        Title
        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!post} />
      </label>

      <div className="cover-field">
        <span>Cover image</span>
        {shownCover && <img src={shownCover} alt="Cover preview" />}
        <div className="row">
          <label className="button">
            {shownCover ? "Replace" : "Add an image"}
            <input type="file" accept={COVER_TYPES} hidden onChange={(e) => pickCover(e.target.files?.[0])} />
          </label>
          {shownCover && <button type="button" className="link" onClick={() => setCover(post?.cover ? null : undefined)}>Remove</button>}
          <span className="muted">JPEG, PNG, WebP or GIF, up to 5 MB.</span>
        </div>
      </div>

      <label>
        Post
        <textarea required maxLength={20000} rows={14} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Write here. A blank line starts a new paragraph." />
      </label>

      <label className="check">
        <input type="checkbox" checked={!!published} onChange={(e) => setPublished(e.target.checked)} />
        Published (unpublished posts are drafts only you can see)
      </label>

      <p className="error" role="alert">{error}</p>
      <div className="row">
        <button type="submit" className="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <a href={post ? href({ page: "post", id: post.id }) : href({ page: "home" })}>Cancel</a>
      </div>
    </form>
  );
}

/** A temporary URL to preview a picked file, released when it changes. */
function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
