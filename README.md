# TennoForge v5 — Warframe Market v2 + live item imagery

This package upgrades the v4 Netlify build to the current public Warframe.market v2 HTTP API, uses WFCD/WarframeStat item and drop datasets, and resolves item images from Warframe.market static assets or the WFCD WarframeStat CDN.

The market API is proxied through Netlify Functions so the browser does not call the marketplace directly. Responses are cached in-process to reduce traffic. Warframe.market currently documents a public 3 requests/second limit and provides `/v2/items`, `/v2/item/{slug}`, and `/v2/orders/item/{slug}`.

No Overframe data is claimed as live. TennoForge uses source links rather than undocumented scraping.
