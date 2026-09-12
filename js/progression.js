
const $=s=>document.querySelector(s);let items=[];
const fetchCatalog=makeLiveFetcher(9000); // shared helper from app.js
async function load(){
  try{
    const res=await fetchCatalog('/api?route=catalog');
    if(res.stale)return;
    items=res.data.data||[];render();
  }catch{document.querySelector('#progressGrid').innerHTML='<div class="notice">Live catalog unavailable.</div>'}
}
function render(){const mr=+$('#mrRange').value;$('#mrVal').textContent=mr;const groups=[['warframe','WARFRAME'],['weapon','WEAPON'],['companion','COMPANION']];$('#progressGrid').innerHTML=groups.map(([k,label])=>{const a=items.filter(x=>(x.kind||'other')===k&&(x.mr==null||x.mr<=mr)).sort((a,b)=>(b.activity||0)-(a.activity||0)).slice(0,5);return `<div class="panel"><div class="eyebrow">${label}</div><h3>Accessible now</h3>${a.map(x=>{const marketSlug=x.slug||x.url_name||x.urlName||'';const href=`/builds.html?item=${encodeURIComponent(marketSlug||x.name||'')}&name=${encodeURIComponent(x.name||'')}`;return `<a class="mrLink" href="${esc(href)}" style="display:block;padding:9px 0;border-bottom:1px solid var(--line)"><b>${esc(x.name)}</b><small style="display:block;color:var(--muted)">${x.mr==null?'MR ?':'MR '+x.mr}</small></a>`}).join('')||'<p class="sub">No live matches.</p>'}</div>`}).join('')}
$('#mrRange').addEventListener('input',render);load();
