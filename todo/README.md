# Todos

A todo list on [Vaultbase](https://vaultbase.dev): sign up, sign in, and keep a private list
that stays in sync across every open tab.

What it shows:

- **Auth**: `vb.auth.users.register` and `.login`, with the session kept in `localStorage`.
  Signing out in one tab signs out the others.
- **Rules do the privacy**: the app never filters by user. The `todos` rules in
  [`schema.json`](./schema.json) only let people read, change and delete their own todos,
  and only create todos they own:

  | Rule | Expression |
  |---|---|
  | list, view, delete | `owner = @request.auth.id` |
  | create | `@request.auth.id != "" && @request.body.owner = @request.auth.id` |
  | update | `owner = @request.auth.id && (@request.body.owner:isset = false \|\| @request.body.owner = @request.auth.id)` |

- **Realtime**: `vb.subscribe("todos", "*", …)` delivers creates, updates and deletes. The
  server checks each event against the same rules, so you only hear about your own todos.
- **Typed client**: `src/vaultbase-schema.gen.ts` is generated from `schema.json` with
  `vb-types`, so `vb.collection("todos")` knows the record's fields.
- **Batch**: "Clear done" deletes every finished todo in one atomic request.

The whole app is [`src/main.ts`](./src/main.ts), plain TypeScript with no framework.

## Run it

You need [Bun](https://bun.sh) (or Node 20+) and a Vaultbase server.

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
choose [`schema.json`](./schema.json) and apply it in **Additive** mode. It adds two
collections: `users` (sign-in) and `todos`. Or from the command line, with an admin token:

```bash
bun install
bunx vb-migrate apply --url=http://localhost:8091 --admin-token=$ADMIN_TOKEN --schema=./schema.json --yes
```

**3. Run the app:**

```bash
bun install
bun run dev
```

Open `http://localhost:5173`, create an account, and add a few todos. Open a second tab to
watch changes arrive live.

The dev server proxies `/api` and `/realtime` to Vaultbase, so the browser sees one origin
and Vaultbase needs no CORS settings. For a server somewhere else:

```bash
VAULTBASE_URL=https://your-vaultbase.example.com bun run dev
```

## Try the rules

Sign up a second account in a private window. Its list is empty, and nothing either account
does shows up for the other. The rules hold for any client, not just this app: try
`GET /api/v1/todos` with the second user's token in the admin's **API preview**.

## Deploy

`bun run build` writes a static site to `dist/`. Either:

- serve `dist/` from the same origin as Vaultbase, for example behind the same reverse proxy,
  so `/api` and `/realtime` reach the server; or
- host it anywhere, build with `VITE_VAULTBASE_URL=https://your-vaultbase.example.com`, and
  add the app's origin in Vaultbase under **Settings → CORS**.

## Change the schema

Edit the collections in the admin, then save the new schema and regenerate the types:

```bash
bunx vb-migrate pull --url=http://localhost:8091 --admin-token=$ADMIN_TOKEN --out=./schema.json
bun run types
```
