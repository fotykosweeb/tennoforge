const $=s=>document.querySelector(s);
// esc() and makeLiveFetcher() come from app.js, which every page loads before this script.
let debounceTimer;
let lastItems=[]; // last successfully fetched result set — filter/sort changes re-render from this, no new network call
let hasLoaded=false; // guards against showing "no items match" before the first fetch has even returned
const RENDER_CAP=60; // browsing the full catalog can be thousands of items; cap what actually hits the DOM
const fetchCatalog=makeLiveFetcher(9000);
const fetchDetail=makeLiveFetcher(9000);
const fetchEnrich=makeLiveFetcher(4500);

function kind(x){return x.kind||'other'} // canonical bucket from the server — matches the filter dropdown exactly
function typeLabel(x){return x.category||x.type||'item'} // more specific label, for display only
function card(x){
  const marketSlug=x.slug||x.url_name||x.urlName||'';
  const openHref=`/builds.html?item=${encodeURIComponent(marketSlug||x.name||'')}&name=${encodeURIComponent(x.name||'')}`;
  return `<article class="card cardLink" data-open="${esc(openHref)}">${x.image?`<img class="cardImg" src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">`:''}
    <div class="cardtop"><div><div class="type">${esc(typeLabel(x))}</div><h3>${esc(x.name)}</h3></div><span class="badge">${x.mr==null?'MR ?':'MR '+x.mr}</span></div>
    <div class="desc">${esc(x.description||'Live public item data.')} ${x.tradable?'Tradable.':'Catalogued.'}</div>
    <div class="stats"><div class="stat"><b>${x.mr??'—'}</b><small>MR</small></div><div class="stat"><b>LIVE</b><small>source</small></div></div>
    <div class="tip"><b>Source:</b> ${esc(x.source||'Public Warframe data')}</div>
    <div class="cardLinks">${x.wiki?`<a class="sourceLink" href="${esc(x.wiki)}" target="_blank" rel="noopener">Wiki ↗</a>`:''}${marketSlug?`<a class="sourceLink" href="https://warframe.market/items/${encodeURIComponent(marketSlug)}" target="_blank" rel="noopener">Market ↗</a>`:''}</div>
    <a class="sourceLink" href="/farm.html?q=${encodeURIComponent(x.name)}">Find drop sources →</a></article>`;
}
function applyFilters(items){
  const m=+$('#mr').value,sort=$('#sort').value,q=$('#search').value.trim().toLowerCase(),t=$('#type').value;
  let a=items.filter(x=>(!q||String(x.name||'').toLowerCase().includes(q))&&(!t||kind(x)===t)&&(x.mr==null||x.mr<=m));
  // 'relevance' (default) keeps the server's own best-match order — Array.sort
  // is a stable sort in every current engine, so a no-op comparator preserves it.
  a.sort((x,y)=>sort==='name'?String(x.name).localeCompare(String(y.name)):sort==='mr'?((x.mr??99)-(y.mr??99)):0);
  return a;
}
function renderFromCache(){
  if(!hasLoaded){$('#grid').innerHTML='<div class="notice">Loading live catalog…</div>';return;}
  const a=applyFilters(lastItems);
  if(!a.length){$('#grid').innerHTML='<div class="notice">No live catalog items match those filters.</div>';return;}
  const shown=a.slice(0,RENDER_CAP);
  $('#grid').innerHTML=shown.map(card).join('')+(a.length>RENDER_CAP?`<div class="notice">Showing ${RENDER_CAP} of ${a.length} matches. Narrow your search or filters to see more specific results.</div>`:'');
}
function status(msg){const n=$('#liveNote');if(n)n.innerHTML=`<span class="liveDot"></span>${msg}`;}
async function searchDetail(name){
  const res=await fetchDetail('/api?route=search&q='+encodeURIComponent(name));
  if(res.stale)return undefined;
  const items=res.data.data||res.data.items||[];
  const exact=items.find(x=>String(x.name||'').toLowerCase()===String(name||'').toLowerCase());
  return exact||items[0]||null;
}
async function enrichDetail(base,slug,name){
  // Optional enrichment. It NEVER blocks the initial item render.
  try{
    const res=await fetchEnrich(`/api?route=item&slug=${encodeURIComponent(slug||'')}&name=${encodeURIComponent(name||slug||'')}`);
    if(res.stale)return;
    const j=res.data;
    if(j?.data){
      const merged={...base,...j.data,name:j.data.name||base.name,image:j.data.image||base.image,kind:base.kind};
      $('#grid').innerHTML=`<div class="resultHead"><span>ITEM DETAIL</span><b>LIVE</b></div>${card(merged)}`;
      status(`${esc(merged.name)} · detail enriched from ${esc(j.source||'live source')}`);
    }
  }catch{
    // Search result remains visible. No endless loading and no error replacement.
    status(`${esc(base.name)} · live search result loaded`);
  }
}
async function loadDetail(slug,name){
  status('Loading item from the live search…');
  try{
    const base=await searchDetail(name||slug);
    if(base===undefined)return; // superseded by a newer request
    if(!base)throw Error('No matching live item');
    $('#search').value=base.name||name||slug;
    $('#grid').innerHTML=`<div class="resultHead"><span>ITEM DETAIL</span><b>LIVE</b></div>${card(base)}`;
    status(`${esc(base.name||name)} · live search result loaded`);
    // Enrichment runs independently; a failing detail endpoint cannot blank the page.
    enrichDetail(base,slug||base.slug,name||base.name);
  }catch(e){
    status('Item search failed — '+(e?.message||'unknown error'));
    $('#grid').innerHTML='<div class="notice">The item could not be loaded from the live search service. Return to Home and try again.</div>';
  }
}
async function load(q=''){
  if(!q)return loadCatalog();
  status('Querying live item APIs…');
  try{
    const res=await fetchCatalog('/api?route=search&q='+encodeURIComponent(q));
    if(res.stale)return; // a newer search/filter change has already superseded this
    const j=res.data;
    lastItems=j.data||j.items||[];
    hasLoaded=true;
    renderFromCache();
    status(`${lastItems.length} live result(s) · ${j.apiWorked===false?'fallback sources':''}`);
  }catch(e){
    status('Live catalog unavailable. Try again.');
    $('#grid').innerHTML='<div class="notice">The live request timed out or failed. No demo data was substituted.</div>';
  }
}
async function loadCatalog(){
  // No search text: browse the full tradable catalogue rather than faking a
  // text query. This is also what makes the "Warframes/Weapons/Companions"
  // quick-links actually work — they just set the type filter and land here.
  status('Loading the full live catalog…');
  try{
    const res=await fetchCatalog('/api?route=catalog');
    if(res.stale)return;
    const j=res.data;
    lastItems=j.data||j.items||[];
    hasLoaded=true;
    renderFromCache();
    status(`${lastItems.length} catalog item(s) loaded`);
  }catch(e){
    status('Live catalog unavailable. Try again.');
    $('#grid').innerHTML='<div class="notice">The live request timed out or failed. No demo data was substituted.</div>';
  }
}
function triggerSearch(){clearTimeout(debounceTimer);debounceTimer=setTimeout(()=>load($('#search').value.trim()),300)}
$('#search').addEventListener('input',triggerSearch);
// Type/sort/MR only change how already-fetched results are displayed — no
// network call, so they can't race a search request or each other.
$('#type').addEventListener('change',renderFromCache);
$('#sort').addEventListener('change',renderFromCache);
$('#mr').addEventListener('change',renderFromCache);

// Delegated click handler: a click on a card opens its item, unless the click
// landed on one of the card's own real links (Wiki/Market/Farm), which keep
// their normal behavior. This avoids ever nesting an <a> inside an <a>.
$('#grid').addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  const c=e.target.closest('.cardLink');
  if(c&&c.dataset.open)location.href=c.dataset.open;
});

const qs=new URLSearchParams(location.search);
const item=qs.get('item'), name=qs.get('name')||item, q=qs.get('q'), type=qs.get('type');
if(type)$('#type').value=type;
if(item) loadDetail(item,name);
else {if(q)$('#search').value=q; load($('#search').value.trim());}
