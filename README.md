# Vaultbase examples

Small, complete apps built on [Vaultbase](https://vaultbase.dev) and the
[TypeScript SDK](https://docs.vaultbase.dev/sdk/quick-start/). Each one is a folder with
its own README, a `schema.json` you apply to your Vaultbase, and nothing else to set up.

| Example | Shows |
|---|---|
| [todo](./todo) | Sign-up and sign-in, rules that keep each user's data private, realtime sync across tabs, a typed client, batch deletes |
| [blog](./blog) | Relations and `expand`, a view collection for public author profiles, cover uploads with thumbnails, full-text search, a settings singleton, drafts, live comments |

A live chat is on the way.

## Running an example

1. Run Vaultbase ([installation](https://docs.vaultbase.dev/getting-started/installation/)).
2. Apply the example's `schema.json` in the admin under **Settings → Migrations → Apply
   snapshot**.
3. In the example's folder: `bun install && bun run dev`.

Each README has the details.

## License

MIT. Copy anything you like into your own projects.
