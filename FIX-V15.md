# FIX-V15 — script crash, dead routes, and item clickability

Reviewed with a 2-round / 4-critic-pair pass before implementation (see
`critic-review.md`). Root causes below were confirmed empirically or against
live upstream schemas — nothing here is a guess.

## P0 — the real reason nothing worked (found first, mattered most)
`builds.js`, `farm.js`, and `dps.js` each declared their own top-level `esc`
(as `const` or `function`) — but `app.js`, which every page loads first,
already declares `const esc`. Redeclaring a global `let`/`const`/`function`
identifier across separate `<script>` tags on the same page throws
`SyntaxError: Identifier 'esc' has already been declared` the moment the
second script starts. That happens during global declaration instantiation,
*before any statement in the script runs* — so 100% of builds.js/farm.js/
dps.js was dead: no fetch calls, no rendering, no click handlers, on all
three pages. Verified by replaying the exact script pairs in a JS VM.
**Fix:** removed the duplicate declarations; each page now uses app.js's
single global `esc()`.

## P1 — broken/missing API routes
- `action=items` called an undefined function `getMergedCatalogue()` → always
  502. Replaced with a real handler backed by WFM's tradable catalogue.
- `progression.js` (`route=catalog`) and `farm.js` (`route=drops`) called
  actions that were never implemented server-side. Both now exist.
- `dps.js` sent `q=` but the server only read `slug`/`name`; the server now
  also accepts `q` as a fallback, and `dps.js` was switched to send `name=`.
- `dps.js` read `j.item` from the response; the `item` action returns
  `{data: ...}`. Fixed the read.

## P2 — items weren't clickable
- Build Explorer catalog cards were `<article class="card">` — no link.
  Cards already contain real Wiki/Market/Farm `<a>` links, so wrapping the
  whole card in another `<a>` would be invalid nested-anchor HTML with
  unreliable clicks. Used a `data-open` attribute + one delegated click
  handler on the grid instead (ignores clicks that land on a real inner link).
- Recommendations cards and MR Progression rows had no inner links, so those
  became direct `<a class="cardLink">` / `<a class="mrLink">` wrappers.
- One small additive CSS rule (`.cardLink`, `.mrLink`) — `.card` itself is
  untouched, so nothing else changes visually.

## P3 — data shape correctness (checked against live schemas, not assumed)
- `normalizeWarframeStat()` discarded weapon stats (`criticalChance`,
  `criticalMultiplier`, `procChance`, `totalDamage`, `fireRate`,
  `magazineSize`) into `_raw` instead of surfacing them — confirmed these are
  real top-level fields on the live `@wfcd/items` weapon schema
  (api.warframestat.us). Now passed through.
- Chance-like fields (`criticalChance`, `procChance`) may come back as a 0–1
  fraction or an already-scaled percent depending on the item — genuinely
  ambiguous in the public dataset. `dps.js` now auto-detects scale rather
  than assuming one. `criticalMultiplier` is a raw multiplier (e.g. `2.5x`),
  never a chance, and is deliberately excluded from that scaling logic.
- `farm.js`'s drop-table renderer expected `rollChance`/`effectiveChance`/
  `rotation` fields that don't exist on the real WFCD `/drops/search/{q}`
  response (confirmed shape: `{item, chance, place, rarity}`), and never
  showed which item a row was even for. Rewrote the table to the real
  columns and added the item name.

## Known, deliberately deferred
- MR Progression's "recent orders" activity sort has no real backing data
  source in this API surface (`activity` is always 0) — cosmetic only, not a
  crash, left as-is rather than fabricating a number.
- `action=items`/`catalog` returns WFM's tradable catalogue only, not
  WFCD's full item dump — merging that in is what caused the 502 timeout
  documented in `API-FIX-V11.md`. Not reintroducing that regression.
