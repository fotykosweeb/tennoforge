# TennoForge v6 cache strategy

- WFM `/v2/versions`: 6 hours
- WFM `/v2/items`: 12 hours (catalogue is cached; search filters locally)
- WFM `/v2/item/{slug}`: 1 hour
- WFM `/v2/orders/item/{slug}`: 60 seconds
- Browser cache mirrors these TTLs where practical.
- Stale-while-revalidate is used so users receive cached data immediately while a background refresh updates it.
- `/v2/versions` can be used by a scheduled updater to invalidate/rebuild the catalogue cache when WFM publishes a new collection version.

This avoids one upstream request per keystroke and keeps market traffic within public API limits.
