# TennoForge v11 API fix

The screenshot's HTTP 502 was caused by v9/v10 trying to download WFCD's enormous `All.json` (~56 MB) inside the Netlify function for each cold catalogue refresh. If either upstream request failed/timed out, the function returned 502.

v11 removes that bottleneck.

Search now uses:
- Warframe Market v2 `/v2/items` (cached market catalogue)
- WarframeStat `/items/search/{query}` for broad item matches
- WarframeStat `/mods/search/{query}` for mod matches

These are query-specific responses rather than the 56 MB WFCD dump.

Additional correction:
- WFM item detail endpoint is now `/v2/items/{slug}` (plural), matching the current public API contract.
- Orders remain `/v2/orders/item/{slug}`.

If WarframeStat is temporarily unavailable, WFM results still render instead of converting the entire search into HTTP 502. If WFM is temporarily unavailable, WFCD/WarframeStat results can still render.
