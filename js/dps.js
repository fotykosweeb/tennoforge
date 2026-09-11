
const $=s=>document.querySelector(s);
// esc() comes from app.js, which every page loads before this script.
// Percent-like fields (chance values) can come back as a 0-1 fraction or an
// already-scaled percent depending on the upstream item; this is genuinely
// ambiguous across the public dataset, so we detect rather than assume.
function pct(v){ if(v==null) return '—'; const n=Number(v); if(!isFinite(n)) return '—'; return (n<=1?n*100:n).toFixed(1)+'%' }
async function run(){
  const q=$('#dpsSearch').value.trim();if(!q)return;
  $('#dpsResult').innerHTML='<div class="notice">Loading public item data…</div>';
  try{
    const r=await fetch('/api?route=item&name='+encodeURIComponent(q));
    if(!r.ok)throw Error();
    const j=await r.json();
    const x=j.data;
    if(!x)throw Error();
    $('#dpsResult').innerHTML=`<div class="card"><div class="type">${esc(x.category||x.type||'weapon')}</div><h3>${esc(x.name)}</h3><div class="stats"><div class="stat"><b>${x.mr??'—'}</b><small>MR</small></div><div class="stat"><b>${x.totalDamage??'—'}</b><small>Base damage</small></div><div class="stat"><b>${pct(x.criticalChance)}</b><small>Crit chance</small></div></div><div class="stats"><div class="stat"><b>${x.criticalMultiplier??'—'}x</b><small>Crit mult.</small></div><div class="stat"><b>${pct(x.procChance)}</b><small>Status</small></div><div class="stat"><b>${x.fireRate??'—'}</b><small>Fire rate</small></div></div><div class="tip"><b>Important:</b> these are base item stats, not simulated modded DPS. Use the live item stats as the baseline; TennoForge does not claim simulated modded DPS. Source: ${esc(j.source||'public item data')}${j.fallback?' (fallback)':''}.</div></div>`;
  }catch(e){
    $('#dpsResult').innerHTML='<div class="notice">No public item match found or the live data request failed.</div>';
  }
}
$('#dpsGo').onclick=run;$('#dpsSearch').addEventListener('keydown',e=>{if(e.key==='Enter')run()});
