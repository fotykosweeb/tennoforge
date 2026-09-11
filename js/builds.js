const $=s=>document.querySelector(s);
// esc() comes from app.js, which every page loads before this script.
let timer, controller;

function kind(x){return x.type||'item'}
function card(x){
  const marketSlug=x.slug||x.url_name||x.urlName||'';
  const openHref=`/builds.html?item=${encodeURIComponent(marketSlug||x.name||'')}&name=${encodeURIComponent(x.name||'')}`;
  return `<article class="card cardLink" data-open="${esc(openHref)}">${x.image?`<img class="cardImg" src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy">`:''}
    <div class="cardtop"><div><div class="type">${esc(kind(x))}</div><h3>${esc(x.name)}</h3></div><span class="badge">${x.mr==null?'MR ?':'MR '+x.mr}</span></div>
    <div class="desc">${esc(x.description||'Live public item data.')} ${x.tradable?'Tradable.':'Catalogued.'}</div>
    <div class="stats"><div class="stat"><b>${x.mr??'—'}</b><small>MR</small></div><div class="stat"><b>LIVE</b><small>source</small></div></div>
    <div class="tip"><b>Source:</b> ${esc(x.source||'Public Warframe data')}</div>
    <div class="cardLinks">${x.wiki?`<a class="sourceLink" href="${esc(x.wiki)}" target="_blank" rel="noopener">Wiki ↗</a>`:''}${marketSlug?`<a class="sourceLink" href="https://warframe.market/items/${encodeURIComponent(marketSlug)}" target="_blank" rel="noopener">Market ↗</a>`:''}</div>
    <a class="sourceLink" href="/farm.html?q=${encodeURIComponent(x.name)}">Find drop sources →</a></article>`;
}
function render(items){
  const m=+$('#mr').value,sort=$('#sort').value;
  let a=items.filter(x=>(!$('#search').value.trim()||String(x.name||'').toLowerCase().includes($('#search').value.trim().toLowerCase()))&&(!$('#type').value||kind(x)===$('#type').value)&&(x.mr==null||x.mr<=m));
  a.sort((x,y)=>sort==='name'?String(x.name).localeCompare(String(y.name)):((x.mr??99)-(y.mr??99)));
  $('#grid').innerHTML=a.length?a.map(card).join(''):'<div class="notice">No live catalog items match those filters.</div>';
}
function status(msg){const n=$('#liveNote');if(n)n.innerHTML=`<span class="liveDot"></span>${msg}`;}
async function fetchJSON(url,timeout=9000){
  const ac=new AbortController();
  const t=setTimeout(()=>ac.abort(),timeout);
  try{
    const r=await fetch(url,{signal:ac.signal,cache:'no-store'});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{clearTimeout(t)}
}
async function searchDetail(name){
  // This endpoint is the same proven path used by the working homepage.
  const j=await fetchJSON('/api?route=search&q='+encodeURIComponent(name),9000);
  const items=j.data||j.items||[];
  const exact=items.find(x=>String(x.name||'').toLowerCase()===String(name||'').toLowerCase());
  return exact||items[0]||null;
}
async function enrichDetail(base,slug,name){
  // Optional enrichment. It NEVER blocks the initial item render.
  try{
    const j=await fetchJSON(`/api?route=item&slug=${encodeURIComponent(slug||'')}&name=${encodeURIComponent(name||slug||'')}`,4500);
    if(j?.data){
      const merged={...base,...j.data,name:j.data.name||base.name,image:j.data.image||base.image};
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
    if(!base)throw Error('No matching live item');
    $('#search').value=base.name||name||slug;
    $('#grid').innerHTML=`<div class="resultHead"><span>ITEM DETAIL</span><b>LIVE</b></div>${card(base)}`;
    status(`${esc(base.name||name)} · live search result loaded`);
    // Enrichment runs independently; a failing detail endpoint cannot blank the page.
    enrichDetail(base,slug||base.slug,name||base.name);
  }catch(e){
    status(e.name==='AbortError'?'Item search timed out.':'Item search failed — '+(e?.message||'unknown error'));
    $('#grid').innerHTML='<div class="notice">The item could not be loaded from the live search service. Return to Home and try again.</div>';
  }
}
async function load(q=''){
  if(!q)q='warframe';
  status('Querying live item APIs…');
  try{
    const j=await fetchJSON('/api?route=search&q='+encodeURIComponent(q));
    render(j.data||j.items||[]);
    status(`${(j.data||j.items||[]).length} live result(s) · ${j.apiWorked===false?'fallback sources':''}`);
  }catch(e){
    status(e.name==='AbortError'?'Search timed out. Try again.':'Live catalog unavailable. Try again.');
    $('#grid').innerHTML='<div class="notice">The live request timed out or failed. No demo data was substituted.</div>';
  }
}
function trigger(){clearTimeout(timer);timer=setTimeout(()=>load($('#search').value.trim()),300)}
$('#search').addEventListener('input',trigger);
$('#type').addEventListener('change',()=>load($('#search').value.trim()||'warframe'));
$('#sort').addEventListener('change',()=>load($('#search').value.trim()||'warframe'));
$('#mr').addEventListener('change',()=>load($('#search').value.trim()||'warframe'));

// Delegated click handler: a click on a card opens its item, unless the click
// landed on one of the card's own real links (Wiki/Market/Farm), which keep
// their normal behavior. This avoids ever nesting an <a> inside an <a>.
$('#grid').addEventListener('click',e=>{
  if(e.target.closest('a'))return;
  const c=e.target.closest('.cardLink');
  if(c&&c.dataset.open)location.href=c.dataset.open;
});

const qs=new URLSearchParams(location.search);
const item=qs.get('item'), name=qs.get('name')||item, q=qs.get('q');
if(item) loadDetail(item,name);
else {if(q)$('#search').value=q; load($('#search').value.trim()||'warframe');}
