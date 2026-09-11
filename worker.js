const WFM_BASE = "https://api.warframe.market/v2";
const WFM_ASSET = "https://warframe.market/static/assets";
const WFM_UA = "TennoForge/1.0 (+https://tennoforge.netlify.app/)";
const WFCD_BASE = "https://api.warframestat.us";

const TTL = {
  versions: 6 * 60 * 60,
  items: 12 * 60 * 60,
  item: 60 * 60,
  orders: 60,
};

function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      ...extra,
    }
  });
}

async function upstream(url, ttl, ctx) {
  // Netlify CDN edge cache: repeat visitors don't hit WFM.
  const cached = await fetch(url, {
    headers: { "User-Agent": WFM_UA, "Accept": "application/json" },
    cf: { cacheTtl: ttl, cacheEverything: true }
  }).catch(() => null);

  if (!cached || !cached.ok) throw new Error(`Upstream ${cached?.status || "network"}: ${url}`);
  return cached;
}

function normalizeSlug(q) {
  return q.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}


function normalizeWarframeStat(x) {
  const name = x.name || x.itemName || x.displayName || "";
  const imageName = x.imageName || null;
  return {
    name,
    slug: (x.slug || x.urlName || name).toLowerCase().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),
    image: x.image || (imageName ? `https://cdn.warframestat.us/img/${encodeURIComponent(imageName)}` : null),
    mr: x.masteryReq ?? x.masteryRank ?? x.reqMasteryRank ?? null,
    type: x.category || x.type || "item",
    category: x.category || x.type || null,
    source: "WFCD / WarframeStat",
    tradable: x.tradable === true,
    uniqueName: x.uniqueName || null,
    description: x.description || "",
    // Weapon stat fields per the live @wfcd/items schema (api.warframestat.us/weapons).
    // Passed through as-is (not all items have these — e.g. Warframes won't).
    totalDamage: x.totalDamage ?? null,
    criticalChance: x.criticalChance ?? null,
    criticalMultiplier: x.criticalMultiplier ?? null,
    procChance: x.procChance ?? null,
    fireRate: x.fireRate ?? null,
    magazineSize: x.magazineSize ?? null,
    accuracy: x.accuracy ?? null,
    _raw: x
  };
}

function normalizeWfm(x) {
  const i18n=x.i18n?.en || x.i18n?.["en-us"] || Object.values(x.i18n||{})[0] || {};
  return {
    ...x,
    slug:x.slug||x.url_name||x.urlName||null,
    name:x.name||x.itemName||i18n.name||x.slug?.replaceAll("_"," "),
    image:x.thumb||x.icon||x.image||i18n.thumb||i18n.icon||null,
    mr:x.reqMasteryRank??x.masteryRank??x.mr??null,
    type:x.type||x.group||x.tags?.[0]||"item",
    source:"Warframe Market",
    tradable:true
  };
}


function slugify(q){
  return q.toLowerCase().trim().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function fallbackLinks(q){
  const slug=slugify(q);
  return [
    {label:"Warframe Market", url:`https://warframe.market/items/${slug}`, reason:"Open the marketplace page directly"},
    {label:"Warframe Wiki", url:`https://wiki.warframe.com/w/Special:Search?search=${encodeURIComponent(q)}`, reason:"Search the community wiki directly"},
    {label:"WarframeStat", url:`https://api.warframestat.us/items/search/${encodeURIComponent(q)}?language=en`, reason:"Open the public item-data endpoint"}
  ];
}

async function scrapePublicFallback(q){
  // Last-resort, read-only HTML fallback. We only parse metadata from a public page;
  // no login, bypass, bot evasion, or high-volume crawling.
  const slug=slugify(q);
  const url=`https://warframe.market/items/${slug}`;
  try{
    const r=await fetch(url,{headers:{"User-Agent":WFM_UA,"Accept":"text/html"}});
    if(!r.ok) return null;
    const html=await r.text();
    const title=(html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]||"").replace(/<[^>]+>/g,"").trim();
    const image=html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/i)?.[1]||null;
    if(!title && !image) return null;
    return {name:title.replace(/\s*\|\s*Warframe Market.*$/i,"").trim()||q,image,slug,source:"Warframe Market HTML fallback",fallback:true};
  }catch{return null;}
}

async function safeJson(url, ttl) {
  try {
    const r = await upstream(url, ttl);
    return r ? await r.json() : null;
  } catch { return null; }
}

async function getFullCatalogue() {
  // Deliberately WFM's tradable catalogue only. Merging in WFCD's full ~56MB
  // All.json here is what caused the 502s fixed in API-FIX-V11 — not repeating that.
  const payload = await safeJson(`${WFM_BASE}/items`, TTL.items);
  const arr = payload?.data || payload?.items || [];
  return arr.map(normalizeWfm);
}

async function getSearchCatalogue(q) {
  // WFM gives marketable matches; WarframeStat gives the broad game catalogue.
  // This avoids downloading WFCD's ~56 MB All.json on every cold Netlify invocation.
  const encoded=encodeURIComponent(q);
  const [wfmPayload, wfPayload, modPayload] = await Promise.all([
    safeJson(`${WFM_BASE}/items`, TTL.items),
    safeJson(`${WFCD_BASE}/items/search/${encoded}?language=en`, TTL.item),
    safeJson(`${WFCD_BASE}/mods/search/${encoded}?language=en`, TTL.item)
  ]);

  const wfm=(wfmPayload?.data || wfmPayload?.items || []).map(normalizeWfm);
  const wfRaw=Array.isArray(wfPayload) ? wfPayload : (wfPayload?.data || wfPayload?.items || []);
  const modsRaw=Array.isArray(modPayload) ? modPayload : (modPayload?.data || modPayload?.items || []);
  const apiWorked=!!(wfmPayload || wfPayload || modPayload);
  const broad=[...wfRaw,...modsRaw].map(normalizeWarframeStat);

  const merged=new Map();
  for(const x of broad) {
    const key=(x.uniqueName||x.slug||x.name).toLowerCase();
    merged.set(key,x);
  }
  for(const x of wfm) {
    const key=(x.gameRef||x.slug||x.name).toString().toLowerCase();
    const prior=merged.get(key);
    merged.set(key, prior ? {...prior,...x,source:"WFCD / WarframeStat + Warframe Market"} : x);
  }
  const results=[...merged.values()];
  if(results.length) return {results, apiWorked, fallback:null};
  const scraped=await scrapePublicFallback(q);
  return {results:scraped?[scraped]:[], apiWorked, fallback:scraped?null:fallbackLinks(q)};
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/api") {
      return env.ASSETS.fetch(request);
    }
    return handleApi(request);
  }
};

async function handleApi(req) {
  const u = new URL(req.url);
  const action = u.searchParams.get("action") || u.searchParams.get("route") || "search";

  try {
    if (action === "versions") {
      const r = await upstream(`${WFM_BASE}/versions`, TTL.versions);
      return new Response(r.body, {status:r.status, headers:{"content-type":"application/json","cache-control":"public, max-age=21600"}});
    }

    if (action === "items" || action === "catalog") {
      const all = await getFullCatalogue();
      return json({data:all, items:all, source:"Warframe Market v2", cachedCatalogue:true},200,{"cache-control":"public, max-age=43200, stale-while-revalidate=86400"});
    }

    if (action === "drops") {
      const q = (u.searchParams.get("q") || "").trim();
      if (!q) return json({query:"", data:[], items:[]});
      try {
        const r = await upstream(`${WFCD_BASE}/drops/search/${encodeURIComponent(q)}`, TTL.item);
        const rows = await r.json();
        const arr = Array.isArray(rows) ? rows : [];
        return json({query:q, data:arr, items:arr, source:"WFCD drop data"},
          200,{"cache-control":"public, max-age=3600, stale-while-revalidate=21600"});
      } catch {
        // The upstream drops cache can be temporarily unavailable (404/500).
        // Return an empty, honest result instead of a hard failure.
        return json({query:q, data:[], items:[], source:"WFCD drop data", note:"Drop data temporarily unavailable"});
      }
    }

    if (action === "item") {
      const slug = normalizeSlug(u.searchParams.get("slug") || "");
      const rawName = u.searchParams.get("name") || u.searchParams.get("q") || "";
      const name = rawName || slug.replace(/-/g," ");
      if (!slug && !name) return json({error:"Missing item"},400);

      // Fast detail path: try WFM first, then query-specific WarframeStat.
      if (slug) {
        try {
          const r = await upstream(`${WFM_BASE}/items/${encodeURIComponent(slug)}`, TTL.item);
          if (r.ok) {
            const payload = await r.json();
            return json({data:payload?.data || payload, source:"Warframe Market v2",fallback:false},
              200,{"cache-control":"public, max-age=3600, stale-while-revalidate=21600"});
          }
        } catch {}
      }

      const raw = await safeJson(`${WFCD_BASE}/items/search/${encodeURIComponent(name)}?language=en`, TTL.item);
      const arr = Array.isArray(raw) ? raw : (raw?.data || raw?.items || []);
      if (arr.length) {
        const exact = arr.find(x => (x.name||"").toLowerCase() === name.toLowerCase()) || arr[0];
        return json({data:normalizeWarframeStat(exact),source:"WarframeStat",fallback:true},
          200,{"cache-control":"public, max-age=3600, stale-while-revalidate=21600"});
      }

      const scraped = await scrapePublicFallback(name);
      if (scraped) return json({data:scraped,source:"Warframe Market HTML fallback",fallback:true},
        200,{"cache-control":"public, max-age=900"});
      return json({error:"Item detail unavailable", fallback:fallbackLinks(name)},404);
    }

    if (action === "orders") {
      const slug = normalizeSlug(u.searchParams.get("slug") || "");
      if (!slug) return json({error:"Missing slug"},400);
      const r = await upstream(`${WFM_BASE}/orders/item/${encodeURIComponent(slug)}`, TTL.orders);
      return new Response(r.body, {status:r.status, headers:{"content-type":"application/json","cache-control":"public, max-age=60, stale-while-revalidate=300"}});
    }

    if (action === "asset") {
      // Resolve an upstream icon/thumb path without proxying the image bytes.
      const path = u.searchParams.get("path") || "";
      if (!path || !path.startsWith("/")) return json({error:"Invalid asset path"},400);
      return json({url:`${WFM_ASSET}${path}`},200,{ "cache-control":"public, max-age=86400, stale-while-revalidate=604800" });
    }

    if (action === "search") {
      const q = (u.searchParams.get("q") || "").trim().toLowerCase();
      if (!q) return json({query:"",items:[]});

      // Query-specific upstream calls: no multi-megabyte WFCD download.
      const catalogResult = await getSearchCatalogue(q);
      const all = catalogResult.results;
      const terms = q.split(/\s+/).filter(Boolean);
      const scored = all.map(x => {
        // WFM v2 stores display name/images inside i18n.<language>.
        const i18n = x.i18n?.en || x.i18n?.["en-us"] || Object.values(x.i18n || {})[0] || {};
        const name = x.name || x.itemName || i18n.name || x.slug?.replaceAll("_"," ");
        const image = x.thumb || x.icon || x.image || i18n.thumb || i18n.icon || null;
        const mr = x.reqMasteryRank ?? x.masteryRank ?? x.mr ?? x.masteryRankRequirement ?? null;
        const normalized = {...x, name, image, mr, type: x.type || x.group || x.tags?.[0] || "item"};
        const text = [x.slug,name,x.itemName,x.type,x.group,x.subtype,...(x.tags||[])].filter(Boolean).join(" ").toLowerCase();
        let score = 0;
        if (text.includes(q)) score += 100;
        for (const t of terms) if (text.includes(t)) score += 15;
        if ((x.name||"").toLowerCase() === q) score += 1000;
        return {...normalized,_score:score};
      }).filter(x=>x._score>0).sort((a,b)=>b._score-a._score).slice(0,40)
        .map(({_score,...x})=>x);
      return json({
        query:q,
        data:scored,
        items:scored,
        source:"Warframe Market v2 + WFCD / WarframeStat",
        cachedCatalogue:true,
        apiWorked:catalogResult.apiWorked,
        fallback:catalogResult.fallback
      });
    }

    return json({error:"Unknown action"},404);
  } catch (e) {
    return json({error:e.message, source:"Warframe Market v2"},502);
  }
}
