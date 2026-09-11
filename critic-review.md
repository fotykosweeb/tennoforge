# TennoForge v15 — Critic Review (2 rounds x 4 pairs)

## Diagnosis being reviewed
P0 Script crash: builds.js / farm.js / dps.js each redeclare a top-level `esc`
identifier that already exists as `const esc` in app.js. Since every page loads
app.js first, this throws `SyntaxError: Identifier 'esc' has already been
declared` the instant the second script starts — confirmed empirically by
replaying the exact script pairs in a JS VM. Effect: 100% of builds.js/farm.js/
dps.js is dead on those 3 pages (no fetch, no render, no click handlers).
This is the primary reason items "aren't clickable" — the catalog never renders
at all on those pages.

P1 Route bugs (confirmed against live schemas): action=items calls an undefined
function; progression.js's route=catalog and farm.js's route=drops don't exist
server-side; dps.js sends q= but the server only reads slug/name, and reads
j.item when the server returns j.data.

P2 Click-through gaps: builds.js/recommendations.js render item cards as
non-interactive <article>; progression.js rows are plain <div>s.

P3 Shape bugs: normalizeWarframeStat() drops weapon stat fields DPS needs;
farm.js expects rollChance/effectiveChance/rotation fields the real WFCD
/drops/search/{q} endpoint (confirmed: {item,chance,place,rarity}) doesn't have.

## Round 1

Pair 1 (Runtime correctness). A: does every page load app.js before its own
script, so the fix (delete the duplicate esc, keep app.js's) resolves at the
right time? — Verified yes in all 5 HTML files. A': does any page-script also
collide on `$`? — No, app.js never declares `$`; only page scripts do, no
conflict there, leave `$` alone.

Pair 2 (API contract). B: should the new catalog/items action merge in WFCD's
full item dump for broader (non-tradable) coverage? B': No — that's the exact
56MB-download timeout this codebase's own API-FIX-V11.md already diagnosed and
reverted once. Re-adding it would reintroduce a known regression. Ship the WFM
tradable catalogue only; note the gap instead of hiding it.

Pair 3 (External data accuracy). C: is criticalChance/procChance a 0-1 fraction
or already 0-100? Evidence is mixed. C': don't hardcode a guess (that's how the
prior 14 versions kept breaking) — self-detect scale at render time and say so.

Pair 4 (UI preservation). D: does turning <article class="card"> into <a> risk
a visible regression? D': yes — default <a> is inline and underlined; .card's
CSS never resets that. Add one small additive class (mirroring the
.resultCard pattern already used on the homepage) instead of touching .card.

## Round 2 (reviewing round 1's conclusions)

Pair 1 recheck: are the duplicate esc() implementations byte-for-byte
identical to app.js's, so deleting them changes no behavior? — Confirmed
identical in all three files.

Pair 2 recheck: does anything currently call action=items expecting today's
(broken) shape? — Grepped: nothing does. Zero regression risk to redefine it.

Pair 3 recheck (catches a real issue): criticalMultiplier is a raw multiplier
(e.g. 2.5x), never a chance — it must be excluded from any percent-scaling
logic, or a correct crit-chance fix would silently corrupt crit-multiplier
display. Scope the scale-detecting formatter to criticalChance/procChance only.

Pair 4 recheck (catches a real issue): builds.js's card already contains real
<a> tags (Wiki/Market/farm links). Wrapping the whole card in another <a> is
invalid nested-anchor HTML and produces unreliable clicks — worse than the bug
being fixed. Fix: keep the card a non-anchor container + one delegated click
handler on the grid that ignores clicks inside a real inner <a>. Recommendation
and progression cards have no inner links, so they can use plain <a> wrappers
directly.
