
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
function resultKind(x){return x.type||'item'}
function renderHome(items,q){
  if(!homeResults)return;
  homeResults.innerHTML=items.length?`<div class="resultHead"><span>RESULTS</span><b>${items.length}</b></div><div class="homeResultsGrid">${items.map(x=>`<a class="resultCard" href="/builds.html?item=${encodeURIComponent(x.slug||x.url_name||x.urlName||x.name)}&name=${encodeURIComponent(x.name)}">${x.image?`<img class="itemImg" src="${esc(x.image)}" alt="" loading="lazy">`:''}<div class="type">${esc(resultKind(x))}</div><h3>${esc(x.name)}</h3><div class="resultMeta"><span>MR ${x.mr??'?'}</span><span>${esc(x.source||'Live public data')}</span></div><div class="resultArrow">OPEN →</div></a>`).join('')}</div>`:`<div class="notice">No live results for <b>${esc(q)}</b>. Try the full item name or a shorter search.</div>`;
}
async function runHomeSearch(){
  const q=homeSearch?.value.trim(); if(!q)return;
  homeStatus&&(homeStatus.innerHTML='<span class="liveDot"></span>Searching live public sources…');
  if(homeResults)showSearchStatus(); setSearchStatus('loading','Connecting to TennoForge live data…','connect'); homeResults.innerHTML='';
  try{const r=await fetch('/api?route=search&q='+encodeURIComponent(q));setSearchStatus('loading','Live catalogue received. Filtering items…','filter'); if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();renderHome(j.data||j.items||[],q);
const fallbackBox=document.getElementById('fallbackLinks');
if(fallbackBox){
  if(j.fallback?.length){
    fallbackBox.innerHTML='<div class="fallbackTitle">Live sources are unavailable. Try a direct source:</div>'+j.fallback.map(x=>`<a target="_blank" rel="noopener" href="${x.url}">${esc(x.label)} ↗</a>`).join('');
    fallbackBox.classList.remove('hidden');
  }else fallbackBox.classList.add('hidden');
}
setSearchStatus('success', `${(j.data||j.items||[]).length} matching item(s) found${j.fallback?' · fallback sources available':''}`, 'done');homeStatus&&(homeStatus.innerHTML='<span class="liveDot"></span><strong>LIVE</strong> · results refreshed '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));}
  catch(e){if(homeResults)setSearchStatus('error','Live search failed — '+(e?.message||'Unknown error'),'error'); homeResults.innerHTML='<div class="notice">No results could be loaded. Check your connection or try again.</div>';homeStatus&&(homeStatus.textContent='Live data request failed. Try again in a moment.')}
}
goSearch?.addEventListener('click',runHomeSearch);homeSearch?.addEventListener('keydown',e=>{if(e.key==='Enter')runHomeSearch()});
