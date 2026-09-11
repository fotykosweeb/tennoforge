# v8 search fix

Warframe Market v2's Item model stores the English display name and images under `i18n.en`, and MR as `reqMasteryRank`. The previous search assumed top-level `name`, `thumb`, and `mr`, so every WFM item scored zero and the UI showed no results.

v8 normalizes:
- i18n.en.name -> name
- i18n.en.icon/thumb -> image
- reqMasteryRank -> mr
- tags/group -> searchable type/category

This is the root-cause fix for an empty live catalogue.
