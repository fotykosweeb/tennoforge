# TennoForge v10 search feedback

The homepage now provides explicit live search feedback:
- Connecting to live data
- Live catalogue received / filtering
- Number of matching items found
- Error state with the actual failure message
- Animated status indicator while requests are active
- Accessible `role=status` + `aria-live=polite`

This prevents the old "Loading..." ambiguity where users could not tell whether the API was working or the page was stuck.
