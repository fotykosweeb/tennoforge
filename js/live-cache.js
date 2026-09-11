// TennoForge client cache: stale-while-revalidate for public data.
const TF_CACHE_TTL = { search: 30_000, items: 12*60*60_000, item: 60*60_000, orders: 60_000 };
async function tfFetch(url, kind="search") {
  const key = "tf:"+url, now = Date.now();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const x = JSON.parse(raw);
      if (now-x.t < (TF_CACHE_TTL[kind] || 60_000)) return x.v;
      // stale value can be returned only after background refresh below
      fetch(url).then(r=>r.json()).then(v=>localStorage.setItem(key,JSON.stringify({t:Date.now(),v}))).catch(()=>{});
      return x.v;
    }
  } catch {}
  const r = await fetch(url);
  const v = await r.json();
  try { localStorage.setItem(key, JSON.stringify({t:now,v})); } catch {}
  return v;
}
