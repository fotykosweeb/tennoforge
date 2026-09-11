# TennoForge v14 — item opening fix

The item page no longer depends on the item-detail API to render.

Previously:
- click result
- call `/route=item`
- if that endpoint hung/failed, the entire item page looked stuck

Now:
1. Click result.
2. Call the same `/route=search` endpoint that is already proven to work.
3. Render the matching item immediately.
4. Run `/route=item` separately as optional enrichment with a 4.5s timeout.
5. If enrichment fails, the already-rendered item stays visible.

Also preserves WFM's stable `slug` / `url_name` / `urlName` when available, so Market links and later order lookups use the correct identifier.

This deliberately separates **item discovery** from **item enrichment** so a secondary API failure cannot break the primary user experience.
