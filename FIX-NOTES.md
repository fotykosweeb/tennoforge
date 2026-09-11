# TennoForge v7 search fix

The v6 deployment had a response-contract mismatch:
- the browser requested `?route=search`
- the function read `?action=...` only
- the function returned `items`
- the browser rendered `data`

v7 accepts both `route` and `action`, and returns both `data` and `items`. It also normalizes image and mastery-rank fields for search cards.

This is the direct fix for the perpetual "Loading live catalogue" behavior.
