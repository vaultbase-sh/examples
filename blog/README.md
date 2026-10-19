# Blog

A small multi-author blog on [Vaultbase](https://vaultbase.dev). Anyone can read. Signed-in
people write posts with a cover image, keep drafts, and comment. Comments and edits show up
live, and an admin can rename the site from the Vaultbase admin while readers have it open.

What it shows:

- **Relations and `expand`**: posts and comments point at their author, and every read asks
  for `expand: "author"`, so the author's name arrives with the record in one request.
- **A view collection for public profiles**: `users` is private (each user reads only their
  own account, email included). Authors are a view over it, `SELECT id, name FROM vb_users`,
  that anyone can read by id. Relations point at the view, so expanding an author gives a
  name and never an email address. Its ids are the users' ids, so the rules can still say
  `author = @request.auth.id`.
- **Files and thumbnails**: covers are uploaded to the post with `vb.files.upload`, then
  attached by setting the `cover` field to the stored filename. Cards and the post page ask
  for `480x270` and `1200x630` cropped thumbnails, as WebP where the browser takes it. The
  field only allows those two sizes, so nobody can make the server render endless variants.
- **Full-text search**: `title` and `body` are marked searchable, and the search box passes
  what you type straight to `list({ search })`. Words are ANDed, the last one matches as a
  prefix, and results come back by relevance.
- **A singleton**: the site's title and tagline live in `site`, a collection with exactly
  one record, read with `vb.singleton("site").get()`. Only admins can change it.
- **Rules do the access control**: the app never hides anything itself.

  | Collection | Rule | Expression |
  |---|---|---|
  | `posts` | list, view | `published = true \|\| author = @request.auth.id` |
  | | create | `@request.auth.id != "" && @request.body.author = @request.auth.id` |
  | | update, delete | `author = @request.auth.id` |
  | `comments` | list, view | public |
  | | create | `@request.auth.id != "" && @request.body.author = @request.auth.id` |
  | | delete | `author = @request.auth.id` |
  | `site` | view | public |
  | | update | admins only |

  Drafts are invisible to everyone but their author, and so is commenting on them: a
  relation can only point at a record the caller can see, so a comment on someone else's
  draft is refused. An update rule also has to hold for the record after the change, so an
  author can't hand a post to someone else. Deleting a post deletes its comments
  (`cascade` on `comments.post`).
- **Realtime**: the post page follows its one record (`vb.subscribe("posts", id, …)`), the
  comments follow the `comments` collection, and the header follows the `site` record.

The Vaultbase code is in [`src/lib/vaultbase.ts`](./src/lib/vaultbase.ts) and
[`src/hooks/`](./src/hooks):

| File | What it does |
|---|---|
| [`src/lib/vaultbase.ts`](./src/lib/vaultbase.ts) | The client, record types with their expanded author, cover URLs, error messages |
| [`src/hooks/usePosts.ts`](./src/hooks/usePosts.ts) | A page of posts, with search and "load more" |
| [`src/hooks/usePost.ts`](./src/hooks/usePost.ts) | One post, kept live |
| [`src/hooks/useComments.ts`](./src/hooks/useComments.ts) | A post's comments, kept live; adding and deleting |
| [`src/hooks/useSite.ts`](./src/hooks/useSite.ts) | The site singleton, kept live |
| [`src/hooks/useSession.ts`](./src/hooks/useSession.ts) | The signed-in user |
| [`src/components/PostEditor.tsx`](./src/components/PostEditor.tsx) | Creating and editing a post, and uploading its cover |

Pages use hash URLs (`#/posts/<id>`), so there's no router to install and any static host
can serve the build.

## Run it

You need [Bun](https://bun.sh) (or Node 20+) and a Vaultbase server, 0.26.1 or later.

**1. Start Vaultbase** if you don't have one running. The
[installation guide](https://docs.vaultbase.dev/getting-started/installation/) covers every
platform; on Linux or macOS:

```bash
curl -fsSL https://get.vaultbase.dev | sudo sh
vaultbase   # on macOS; on Linux the installer already started the service
```

Open `http://localhost:8091/_/` and create the admin account with the setup key the server
printed.

**2. Create the collections.** In the admin, go to **Settings → Migrations → Apply snapshot**,
choose [`schema.json`](./schema.json) and apply it in **Additive** mode. It adds `users`,
`authors`, `posts`, `comments` and `site`. Or from the command line, with an admin token:

```bash
bun install
bunx vb-migrate apply --url=http://localhost:8091 --admin-token=$ADMIN_TOKEN --schema=./schema.json --yes
```

Use a Vaultbase of its own, or one without a `users` collection yet: this example's `users`
rules and `name` field are its own.

**3. Name the site.** In the admin, open **Collections → site** and set a title and a
tagline. Without them the header says "A Vaultbase blog".

**4. Run the app:**

```bash
bun run dev
```

Open `http://localhost:5173`, create an account and write a post. Open the post in a private
window, sign up a second account there and leave a comment: it shows up in the first window
without a reload. Change the site's title in the admin and watch both headers follow.

The dev server proxies `/api` and `/realtime` to Vaultbase, so the browser sees one origin
and Vaultbase needs no CORS settings. For a server somewhere else:

```bash
VAULTBASE_URL=https://your-vaultbase.example.com bun run dev
```

## Try the rules

- Save a post unpublished, copy its URL, and open it signed out or as the second account:
  it isn't found.
- Search for a word from the draft on the home page as the second account: nothing.
- In the admin's **API preview**, send `GET /api/v1/authors/<a user id>` with no auth: you
  get a name and nothing else. `GET /api/v1/users/<the same id>` is refused.

## Deploy

`bun run build` writes a static site to `dist/`. Either:

- serve `dist/` from the same origin as Vaultbase, for example behind the same reverse proxy,
  so `/api` and `/realtime` reach the server; or
- host it anywhere, build with `VITE_VAULTBASE_URL=https://your-vaultbase.example.com`, and
  add the app's origin in Vaultbase under **Settings → CORS**.

Covers are stored wherever the server keeps files: its data directory by default, or S3 /
R2 set up under **Settings → File storage**. A replaced or removed cover is deleted by the
server's hourly sweep of files no record points at any more.

## Change the schema

Edit the collections in the admin, then save the new schema and regenerate the types:

```bash
bunx vb-migrate pull --url=http://localhost:8091 --admin-token=$ADMIN_TOKEN --out=./schema.json
bun run types
```
