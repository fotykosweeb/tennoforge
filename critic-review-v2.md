# Critic review v2 — search revamp (3 rounds × 4 pairs)

Each pair reviews a distinct angle, then reviews its own round-1 conclusion
in round 2/3 rather than just producing fresh takes. Only findings that
changed something are listed in detail; agreements that needed no action are
noted briefly for completeness.

## Round 1

**Pair 1 — race/concurrency correctness.** Does `makeLiveFetcher`'s abort
signal reliably stop a stale response from rendering, or could a response
already be in hand before the abort takes effect? Counter-check: yes, this
edge case is real in principle, which is exactly why the sequence-number
check exists as a second, independent guard — confirmed it runs before
`r.json()` is even parsed, so a stale response is never even parsed, let
alone rendered. No fix needed. Flagged for later: what does the UI show if a
filter is touched before the very first fetch has returned?

**Pair 2 — API/data correctness.** The WFM/WFCD merge dedup key relies on
`uniqueName`/`gameRef` first, slug/name as fallback. Counter-check: those two
fields are different per-source ID systems that can never equal each other —
prioritizing them as primary keys means the fallback (slug/name) rarely even
gets exercised, and even then WFM's underscored slug vs. WFCD's hyphenated
slug wouldn't match. **Real bug — fixed** (see FIX-V16.md).

**Pair 3 — UI/UX & taxonomy.** Should a 5th "Other" filter option be added
for items that don't fit the four existing buckets? Counter-check: that's
scope creep beyond the reported bug (zero results on every specific filter);
the reported bug is fixed without it. **No change — correct to decline.**

**Pair 4 — removal completeness.** Sidebar links were removed from every
HTML file, but were script tags, CSS, and doc files checked too? Counter-
check: ran a project-wide case-insensitive grep for "dps"/"recommend" outside
just the sidebar markup. **Verified clean** (only historical changelog
mentions and one unrelated sentence using the word "recommend").

## Round 2

**Pair 1 — performance.** `action=catalog` returns the full tradable
catalogue (thousands of items) with no cap, unlike `action=search`'s
`.slice(0,40)`. Counter-check: confirmed no render limit existed client-side
either — browsing the catalog could push thousands of DOM nodes at once.
**Real bug — fixed** (60-item render cap with a "showing X of Y" notice).

**Pair 2 — empty/loading states.** Following up on Round 1 Pair 1: filter
changes before the first fetch completes show "no items match those
filters," which is misleading (no data has loaded at all yet). Counter-
check: agreed, cheap and correct fix. **Fixed** (`hasLoaded` guard).

**Pair 3 — cross-file consistency.** Now that `builds.js`/`progression.js`
use the shared fetcher, does `farm.js`'s search have the same gap? Counter-
check: farm.js's search is button-triggered, not type-ahead, so the race
window is much narrower — but applying the shared fetcher is a one-line,
zero-risk consistency win regardless. **Applied.**

**Pair 4 — content accuracy.** Given progression.js's fake "0 recent orders"
line was dropped, does anything else make an unverified claim, especially
anything indirectly referencing the removed pages? Counter-check: re-read
`sources.html` in full and re-grepped — nothing found beyond what Round 1
Pair 4 already caught.

## Round 3

**Pair 1 — edge cases.** What happens if `AbortSignal.any` isn't available in
the user's browser? Counter-check: falls back to plain cancellation with no
combined timeout — degrades gracefully, doesn't crash; not a realistic
concern on a current Chromium-based browser (Brave) in any case. **No change
needed.** Separately: `enrichDetail` deliberately keeps the search result's
`kind` rather than the detail endpoint's — confirmed intentional (avoids an
item's filter bucket visibly changing mid-view between two live calls).

**Pair 2 — visual/CSS regression.** Does renaming "Market activity" → "Best
match" break any layout (option-width auto-sizing) or leave a dangling
reference to the old `activity` value string anywhere (URL params, storage)?
Counter-check: grepped for literal `activity` as a sort value across the
project. **Verified clean** — no dangling references found.

**Pair 3 — maintainability.** Should the small `const $=...` helper each
file declares separately be consolidated into `app.js` now that other shared
helpers live there? Counter-check: no behavior changes on the table, no bug
being fixed — just added diff surface for a scoped, time-boxed pass.
**Declined — correct scope discipline.**

**Pair 4 — final acceptance walkthrough.** Re-ran the user's exact reported
symptoms end to end: rapid typing (debounce + cancel + sequence guard all
hold), a specific type filter with mixed-source results (canonicalType
unit-tested, 18/18), and the previously-dead quick-access links (now backed
by the real catalog-browse path). All three confirmed working through the
full chain, not just at the unit level.
