# TennoForge v9 merged catalogue

The main search now merges two complementary public datasets:

1. Warframe Market v2 `/v2/items` — tradeable catalogue and later order/price lookups.
2. WFCD `Warframe-Items` `All.json` — broad game item catalogue, including non-tradeable Warframes, weapons, mods, companions and other content.

Search operates against the merged, de-duplicated catalogue. WFM records overlay WFCD records when both sources share a slug, preserving the broader WFCD entry while adding WFM-specific tradeability fields.

Current order/price calls remain WFM-only and should only occur when a user opens a tradable item, so catalogue search does not generate market-order traffic.
