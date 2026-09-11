# TennoForge v12 fallback strategy

Search uses a three-level resilience model:

1. **Live APIs:** Warframe Market v2 + WarframeStat.
2. **Read-only HTML fallback:** if APIs return no usable result, TennoForge attempts one exact Warframe Market public item page and extracts basic title/image metadata. This is intentionally low-volume and does not bypass bot protection, authentication, or access controls.
3. **Direct-source links:** if the page cannot be read, the UI offers direct links to Warframe Market, Warframe Wiki search, and the WarframeStat public item endpoint.

The site never substitutes fabricated/demo data. A fallback result is explicitly marked as fallback, and direct links are shown when live retrieval is unavailable.

WFM's public API is rate-limited to 3 requests/sec, and restrictions can be applied to clients or networks, so the fallback is deliberately conservative.
