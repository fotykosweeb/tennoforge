# Cloudflare Pages port

This is the same fixed app as the Netlify build (see `FIX-V15.md`) — every
fix, no regressions reintroduced — retargeted at Cloudflare Pages. Only the
serverless-function boundary changed; the HTML/CSS/app logic is untouched.

## What actually changed (3 things, all mechanical)

1. **`netlify/functions/api.mjs` → `functions/api.js`.** Netlify's Edge
   Function signature is `export default async (req) => {...}`; Cloudflare
   Pages Functions use file-based routing with
   `export async function onRequest(context) { const req = context.request; }`.
   All request-handling logic inside is identical — only the wrapper changed.

2. **Upstream edge caching.** The Netlify version cached WFM/WFCD subrequests
   with `next: { revalidate: ttl }` — that's a Next.js-style cache directive.
   Cloudflare Workers/Pages use a different mechanism: `cf: { cacheTtl: ttl,
   cacheEverything: true }` on the `fetch()` call. Swapped like-for-like.

3. **Frontend fetch path.** Every `fetch('/.netlify/functions/api?route=...')`
   became `fetch('/api?route=...')`, since `/functions/api.js` maps to the
   route `/api` on Cloudflare. This is the one place the frontend JS itself
   was touched, and it's a literal string swap — no logic changed.

I deliberately did **not** try to keep the old `/.netlify/functions/api` path
alive via a Cloudflare `_redirects` rule. Cloudflare's own docs are explicit
that `_redirects` rules are not applied to requests that resolve to a Pages
Function — so a rewrite into `/api` wouldn't reliably reach the function.
Repointing the six fetch calls is a few-line, unambiguous fix; relying on
undocumented redirect-to-Function behavior is exactly the kind of guess that
put this project through 14 rounds of "fixes" before this one.

## Deploying this

**Drag-and-drop into the Cloudflare Pages dashboard will not pick up the
`/functions` folder** — Cloudflare's own docs say direct-upload deploys don't
compile Pages Functions; only Wrangler (CLI) or a Git-connected build do.

Recommended path:
```
npm install -g wrangler      # if you don't already have it
wrangler login
wrangler pages deploy . --project-name=tennoforge
```
Or connect this as a Git repo to Cloudflare Pages (Dashboard → Workers &
Pages → Create → Pages → Connect to Git) with build command left empty and
output directory set to `/` — Pages will detect `/functions` automatically.

No environment variables or bindings are required; the app only calls public,
unauthenticated Warframe Market / WarframeStat endpoints.
