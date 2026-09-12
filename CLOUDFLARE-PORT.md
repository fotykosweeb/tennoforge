# Cloudflare port — v2 (Workers + Static Assets)

## What changed from v1
The first version of this port targeted classic Cloudflare **Pages** (a
`/functions` folder, file-based routing, `onRequest(context)`). That's now
Cloudflare's maintenance-mode product — their dashboard's Git-import flow
defaults to their newer **Workers + Static Assets** model instead, which uses
a completely different config. We confirmed this from the live deploy
(`*.workers.dev`, not `*.pages.dev`, and every `/api` request 404ing while
static files served fine — meaning no Worker script was ever wired up at all).

## The actual files that matter now
- **`wrangler.jsonc`** — declares `main: worker.js` (the entry point) and an
  `assets` block pointing at the repo root, so Cloudflare serves every static
  file directly and only invokes `worker.js` for `/api`.
- **`worker.js`** — single Worker entry point. Same request-handling logic as
  before; it now also owns falling back to `env.ASSETS.fetch(request)` for
  every path that isn't `/api` (Workers doesn't auto-serve static assets the
  way Pages did — the Worker script is responsible for that hand-off).
- **`.assetsignore`** — keeps `wrangler.jsonc`, `worker.js`, the old
  `functions/` folder, and the markdown docs from being uploaded as
  publicly-servable static files.
- `functions/api.js` and `netlify/` are left in the repo as inert history —
  neither is read by this deployment model. Safe to delete later if you want
  a cleaner repo.

## Deploying this
Since the repo is already Git-connected to a Cloudflare Workers project
(confirmed by the live `*.workers.dev` URL), you don't need to reconnect
anything. Just add these three files to the repo and push — Cloudflare
Workers Builds (their CI/CD for Git-imported Workers) rebuilds on every push
to the connected branch automatically.
