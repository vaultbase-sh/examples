# Vaultbase examples

Small, complete apps built on [Vaultbase](https://vaultbase.dev) and the
[TypeScript SDK](https://docs.vaultbase.dev/sdk/quick-start/). Each one is a folder with
its own README, a `schema.json` you apply to your Vaultbase, and nothing else to set up.

| Example | Shows |
|---|---|
| [todo](./todo) | Sign-up and sign-in, rules that keep each user's data private, realtime sync across tabs, a typed client, batch deletes |

More are on the way: a blog with relations, file uploads, search and a settings singleton;
and a live chat.

## Running an example

1. Run Vaultbase ([installation](https://docs.vaultbase.dev/getting-started/installation/)).
2. Apply the example's `schema.json` in the admin under **Settings → Migrations → Apply
   snapshot**.
3. In the example's folder: `bun install && bun run dev`.

Each README has the details.

## License

MIT. Copy anything you like into your own projects.
