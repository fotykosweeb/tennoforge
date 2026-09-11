# TennoForge v13 — item-click fix

Clicking a search result no longer starts a generic catalogue load.

It now opens a dedicated item-detail request:
1. Warframe Market v2 item endpoint.
2. WarframeStat query fallback.
3. One conservative public HTML fallback.
4. If detail retrieval still fails, the page automatically falls back to the normal search query.

A 12-second AbortController timeout prevents an item page from sitting on a loading state indefinitely.

The homepage passes both item slug and display name to the detail page.
