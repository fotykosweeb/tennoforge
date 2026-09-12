# FIX-V16 — search revamp, DPS Lab / Recommendations removed

Triggered by: "search sometimes works, filtering stopped working altogether."
Both root causes confirmed before writing any fix — see below. Reviewed with
a 3-round / 4-critic-pair pass (`critic-review-v2.md`); several of the fixes
listed here only exist because that process caught them.

## Root cause 1 — "sometimes" search failures
No request had cancellation anywhere. Typing, or changing a filter, fired a
new fetch without cancelling whatever was already in flight. Whichever
response landed *last* won — even if it was slower and answering an older,
already-superseded query. `builds.js` even had a leftover `let timer,
controller` where `controller` was declared and never once used.

**Fix:** added `makeLiveFetcher()` to `app.js` (shared by every page) — each
call aborts the previous in-flight request, and independently tags every
request with a sequence number so a stale response is recognized and ignored
even in the edge case where the abort signal doesn't land before a response
is already in hand. Also added a hard timeout so a stalled upstream can't
hang the UI forever. Wired into the homepage search, Build Explorer, Farm
Planner, and MR Progression.

## Root cause 2 — filtering broken entirely, not intermittently
The type dropdown (`warframe`/`weapon`/`companion`/`mod`) was compared
against a raw field built from whichever tag WFM listed first (could be
`"prime"`, `"vaulted"`, anything) or WFCD's capitalized, slot-specific
categories (`"Primary"`, `"Arch-Gun"`, `"Warframes"`). Neither vocabulary
ever equals the dropdown's literal lowercase strings, so selecting *any*
specific type filter returned zero results, deterministically, for everyone.

**Fix:** added `canonicalType()` server-side (`worker.js` /
`netlify/functions/api.mjs`) — maps both sources' vocabulary onto the same
fixed set (`warframe`/`weapon`/`companion`/`mod`/`other`), unit-tested against
18 realistic tag/category combinations before shipping. The original
descriptive label (`"Primary"`, `"Warframes"`, etc.) is kept separately for
display — filtering got fixed without losing the more specific on-card label.

## Also found and fixed while revamping
- **Filter changes re-hit the network on every change**, which multiplied how
  often the race condition in root cause 1 could trigger. Filter/sort/MR
  changes now re-render the already-fetched result set locally — zero network
  calls, and one less way to race.
- **The sidebar/homepage "Warframes/Weapons/Companions" quick-links never
  worked at all** — the `type` URL param was never read, and Build Explorer
  had no way to "browse everything" without a search string, so it silently
  defaulted to a hardcoded text search for the word "warframe" regardless of
  which link was clicked. Added a real catalog-browse path (`action=catalog`,
  no search text required) that the quick-links and the default Build
  Explorer view now use.
- **"Market activity" sort never sorted by activity** — there's no such data
  source anywhere in this app; it silently sorted by MR instead. Renamed to
  "Best match" and it now genuinely does that: preserves the server's own
  relevance ranking instead of re-sorting by an unrelated field.
- **The WFM/WFCD merge almost never actually merged** — it keyed on
  source-specific opaque IDs (WFCD's `uniqueName`, WFM's `gameRef`) that can
  never equal each other by definition, only falling back to slug/name when
  one side's ID was missing — and even that fallback compared WFM's raw
  underscored slug (`braton_prime`) against WFCD's hyphenated one
  (`braton-prime`), which never matched either. Rewrote the merge key to
  normalize slug format on both sides first; verified the fix collapses a
  same-item pair from both sources into one entry.
- **Browsing the full catalog had no result cap** — could try to push
  thousands of DOM nodes into the grid at once. Capped rendering at 60 with a
  "showing X of Y" notice.
- **Filter changes before the first fetch completed showed a misleading "no
  items match those filters"** instead of a loading state. Added a
  `hasLoaded` guard.
- Applied the same shared fetcher to Farm Planner and MR Progression for
  consistency, and switched MR Progression's own separate (less rigorous)
  type-tagging heuristic to the same tested `canonicalType()` result the
  server now provides. Also dropped a fake "0 recent orders" line that had no
  real backing data source.

## Removed
- **DPS Lab** and **Build Recommender** — both pages, their scripts, and
  every nav reference across all remaining pages, deleted per request.
  Verified with a project-wide grep afterward (only false positives found:
  historical changelog mentions, and an unrelated sentence using the word
  "recommend").

## Considered and deliberately left alone
- Consolidating the small `const $=...` helper that several files each
  declare separately into one shared copy in `app.js` — no functional
  benefit (nothing collides today), and would add diff surface for a purely
  stylistic change. Not worth the risk in this pass.
- A 5th "Other" type-filter option for items that don't fit the four existing
  buckets (relics, resources, blueprints) — out of scope for what was asked;
  they remain visible under "All types," just not under any single specific
  filter, matching how a player would think about "buildable equipment" vs.
  everything else in the game.
