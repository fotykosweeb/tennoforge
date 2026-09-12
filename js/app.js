
function setSearchStatus(state, message, step="") {
  const el=document.getElementById("searchStatus");
  if(!el)return;
  el.className=`searchStatus ${state}`;
  const msg=el.querySelector(".statusMessage");
  if(msg)msg.textContent=message;
  el.querySelectorAll(".statusStep").forEach(x=>x.classList.toggle("on", x.dataset.step===step));
}
function showSearchStatus(){const el=document.getElementById("searchStatus");if(el)el.classList.remove("hidden")}

const menuBtn=document.getElementById('menuBtn'),sidebar=document.getElementById('sidebar'),scrim=document.getElementById('scrim');
function closeMenu(){sidebar?.classList.remove('open');scrim?.classList.remove('open')}
menuBtn?.addEventListener('click',()=>{sidebar?.classList.toggle('open');scrim?.classList.toggle('open')});scrim?.addEventListener('click',closeMenu);document.querySelectorAll('.sideLink').forEach(a=>a.addEventListener('click',closeMenu));

const homeSearch=document.getElementById('homeSearch'),goSearch=document.getElementById('goSearch'),homeResults=document.getElementById('homeResults'),homeStatus=document.getElementById('homeStatus');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// Shared by every page's search/catalog code. Fixes the two bugs behind
// "search sometimes works": (1) no cancellation meant an older, slower
// request could resolve AFTER a newer one and overwrite it on screen; (2) no
// timeout meant a stalled upstream could hang the UI indefinitely. Each
// caller should create its own instance so unrelated searches on the same
// page (e.g. text search vs. a detail lookup) don't cancel each other.
function makeLiveFetcher(timeoutMs = 9000) {
  let seq = 0, controller = null;
  return function liveFetch(url) {
    controller?.abort();
    controller = new AbortController();
    const my = ++seq;
    const signal = typeof AbortSignal.any === "function"
      ? AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)])
      : controller.signal;
    return fetch(url, {signal, cache:"no-store"}).then(
      r => {
        if (my !== seq) return {stale:true};
        if (!r.ok) throw new Error("HTTP "+r.status);
        return r.json().then(data => my===seq ? {stale:false, data} : {stale:true});
      },
      err => { if (my !== seq) return {stale:true}; throw err; }
    );
  };
}
function resultKind(x){return x.type||'item'}
function renderHome(items,q){
  if(!homeResults)return;
  homeResults.innerHTML=items.length?`<div class="resultHead"><span>RESULTS</span><b>${items.length}</b></div><div class="homeResultsGrid">${items.map(x=>`<a class="resultCard" href="/builds.html?item=${encodeURIComponent(x.slug||x.url_name||x.urlName||x.name)}&name=${encodeURIComponent(x.name)}">${x.image?`<img class="itemImg" src="${esc(x.image)}" alt="" loading="lazy">`:''}<div class="type">${esc(resultKind(x))}</div><h3>${esc(x.name)}</h3><div class="resultMeta"><span>MR ${x.mr??'?'}</span><span>${esc(x.source||'Live public data')}</span></div><div class="resultArrow">OPEN →</div></a>`).join('')}</div>`:`<div class="notice">No live results for <b>${esc(q)}</b>. Try the full item name or a shorter search.</div>`;
}
const fetchHomeSearch = makeLiveFetcher(9000);
async function runHomeSearch(){
  const q=homeSearch?.value.trim(); if(!q)return;
  homeStatus&&(homeStatus.innerHTML='<span class="liveDot"></span>Searching live public sources…');
  if(homeResults)showSearchStatus(); setSearchStatus('loading','Connecting to TennoForge live data…','connect'); homeResults.innerHTML='';
  try{
    const res=await fetchHomeSearch('/api?route=search&q='+encodeURIComponent(q));
    if(res.stale)return; // a newer search has already started; this one no longer matters
    setSearchStatus('loading','Live catalogue received. Filtering items…','filter');
    const j=res.data;renderHome(j.data||j.items||[],q);
    const fallbackBox=document.getElementById('fallbackLinks');
    if(fallbackBox){
      if(j.fallback?.length){
        fallbackBox.innerHTML='<div class="fallbackTitle">Live sources are unavailable. Try a direct source:</div>'+j.fallback.map(x=>`<a target="_blank" rel="noopener" href="${x.url}">${esc(x.label)} ↗</a>`).join('');
        fallbackBox.classList.remove('hidden');
      }else fallbackBox.classList.add('hidden');
    }
    setSearchStatus('success', `${(j.data||j.items||[]).length} matching item(s) found${j.fallback?' · fallback sources available':''}`, 'done');homeStatus&&(homeStatus.innerHTML='<span class="liveDot"></span><strong>LIVE</strong> · results refreshed '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  }catch(e){if(homeResults)setSearchStatus('error','Live search failed — '+(e?.message||'Unknown error'),'error'); homeResults.innerHTML='<div class="notice">No results could be loaded. Check your connection or try again.</div>';homeStatus&&(homeStatus.textContent='Live data request failed. Try again in a moment.')}
}
goSearch?.addEventListener('click',runHomeSearch);homeSearch?.addEventListener('keydown',e=>{if(e.key==='Enter')runHomeSearch()});
