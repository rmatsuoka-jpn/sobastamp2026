const EVENT={start:"2026-10-01",end:"2027-02-28",total:43};
let stores=[],visits=[],schedule=[];
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const visitedMap=()=>new Map(visits.map(v=>[v.storeId,v]));
const fmtDate=d=>{if(!d)return"日程未確定";const x=new Date(d+"T00:00:00");return `${x.getMonth()+1}/${x.getDate()}`;};
const storeById=id=>stores.find(s=>s.id===id);

async function init(){
  [stores,visits,schedule]=await Promise.all([
    fetch("./data/stores.json").then(r=>r.json()),
    fetch("./data/visits.json").then(r=>r.json()),
    fetch("./data/schedule.json").then(r=>r.json())
  ]);
  renderAll();
}
function renderAll(){
  const vm=visitedMap(),done=visits.length,remaining=EVENT.total-done,pct=Math.round(done/EVENT.total*100);
  $("#ring").style.setProperty("--p",pct);$("#ringPct").textContent=pct+"%";
  $("#doneCount").textContent=done;$("#remainingCount").textContent=remaining;$("#heroCount").textContent=done;
  $("#progressText").textContent=done===EVENT.total?"全43店舗制覇！":`あと ${remaining} 店で全制覇`;
  renderSchedule(vm);renderAreas(vm);renderStores(vm);renderRecent();renderTiming();
}
function renderTiming(){
  const now=new Date(),start=new Date(EVENT.start+"T00:00:00"),end=new Date(EVENT.end+"T23:59:59");
  let text="";
  if(now<start) text=`開始まで ${Math.ceil((start-now)/86400000)} 日`;
  else if(now<=end) text=`終了まで ${Math.ceil((end-now)/86400000)} 日`;
  else text="開催期間終了";
  $("#timeStatus").textContent=text;
}
function routeDone(r,vm){return r.storeIds.every(id=>vm.has(id))}
function renderSchedule(vm){
  const items=[...schedule].sort((a,b)=>a.order-b.order);
  const next=items.find(r=>!routeDone(r,vm));
  if(next){
    $("#nextTitle").textContent=next.title;
    $("#nextStores").textContent=next.storeIds.map(id=>storeById(id)?.name).filter(Boolean).join(" → ");
    $("#nextDate").textContent=next.date?fmtDate(next.date):next.window+"・日程未確定";
  }else{$("#nextTitle").textContent="全ルート完了";$("#nextStores").textContent="おつかれさまでした！";$("#nextDate").textContent="COMPLETE"}
  $("#scheduleList").innerHTML=items.map(r=>{
    const done=routeDone(r,vm),names=r.storeIds.map(id=>storeById(id)?.name).filter(Boolean).join(" / ");
    return `<div class="schedule-item ${done?"done":""}" data-route-id="${r.id}" tabindex="0" role="button" aria-label="${r.title}の店舗を表示">
      <div class="route-no">${r.id}</div><div><div class="route-title">${r.title}</div><div class="route-stores">${names}</div></div>
      <div class="route-date"><b>${done?"完了":r.window}</b>${done?"訪問済み":(r.date?fmtDate(r.date):r.type)}</div>
    </div>`;
  }).join("");
}
function renderAreas(vm){
  const order=["今帰仁村","本部町","名護市","宜野座村","うるま市","沖縄市","嘉手納町","北谷町","北中城村","宜野湾市","浦添市","西原町","那覇市","南風原町","豊見城市","南城市","八重瀬町","糸満市"];
  $("#areaMap").innerHTML=order.map(m=>{
    const group=stores.filter(s=>s.municipality===m),done=group.filter(s=>vm.has(s.id)).length,pct=group.length?done/group.length*100:0;
    return `<div class="area-row"><div class="area-name">${m}</div><div class="area-track"><div class="area-fill" style="width:${pct}%"></div></div><div class="area-count">${done}/${group.length}</div></div>`;
  }).join("");
}
let currentFilter="all";
let currentRouteStoreIds=null;
function renderStores(vm){
  const q=($("#storeSearch")?.value||"").trim().toLowerCase();
  let list=stores.filter(s=>!q||[s.name,s.municipality,s.area].join(" ").toLowerCase().includes(q));
  if(currentRouteStoreIds) list=list.filter(s=>currentRouteStoreIds.includes(s.id));
  if(currentFilter==="visited")list=list.filter(s=>vm.has(s.id));
  if(currentFilter==="unvisited")list=list.filter(s=>!vm.has(s.id));
  $("#storeGrid").innerHTML=list.map(s=>{
    const v=vm.get(s.id);
    return `<article class="store-card ${v?"visited":""}" data-id="${s.id}">
      <div class="store-top"><span class="store-no">#${String(s.id).padStart(2,"0")} · ${s.municipality}</span><span class="check">${v?"✓":"○"}</span></div>
      <div class="store-name">${s.name}</div><div class="store-meta">${s.address}</div>
      ${v?`<div class="visited-date">訪問：${fmtDate(v.visitedDate)}</div>`:""}
    </article>`;
  }).join("");
  $$(".store-card").forEach(el=>el.addEventListener("click",()=>selectStore(Number(el.dataset.id))));
}
function selectStore(id){
  const s=storeById(id);if(!s)return;
  $("#mapTitle").textContent=s.name;
  $("#mapSub").textContent=s.address;
  $("#mapFrame").src="https://www.google.com/maps?q="+encodeURIComponent(s.name+" "+s.address)+"&output=embed";
  $("#mapOpen").href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(s.name+" "+s.address);
  $("#mapPanel").scrollIntoView({behavior:"smooth",block:"center"});
}
function showRouteFocus(r){
  const vm=visitedMap();
  $("#routeFocus").hidden=false;
  $("#routeFocusTitle").textContent=r.id+" "+r.title;
  $("#routeFocusMeta").textContent=(r.date?fmtDate(r.date):r.window+"・日程未確定")+" / "+r.type;
  $("#routeStopList").innerHTML=r.storeIds.map((id,idx)=>{
    const s=storeById(id),v=vm.get(id);
    if(!s)return "";
    return `<div class="route-stop ${v?"visited":""}" data-stop-id="${s.id}">
      <div class="stop-order">${idx+1}店目</div>
      <div><div class="stop-name">${s.name}</div><div class="stop-meta">${s.municipality} · ${s.address}</div></div>
      <div class="stop-action">${v?"訪問済み ✓":"地図を見る →"}</div>
    </div>`;
  }).join("");
  $("#routeStopList [data-stop-id]").forEach(el=>el.addEventListener("click",()=>selectStore(Number(el.dataset.stopId))));
}

function renderRecent(){
  const list=[...visits].filter(v=>v.visitedDate).sort((a,b)=>b.visitedDate.localeCompare(a.visitedDate)).slice(0,4);
  $("#recent").innerHTML=list.length?list.map(v=>{const s=storeById(v.storeId);return `<div class="recent-item"><b>${s?.name||"店舗"}</b><span>${fmtDate(v.visitedDate)} · ${s?.municipality||""}</span></div>`;}).join(""):'<div class="recent-empty">まだ訪問記録はありません。訪問後にChatGPTへ「○○に行った」と伝えると、ここに反映します。</div>';
}
document.addEventListener("input",e=>{if(e.target.id==="storeSearch")renderStores(visitedMap())});
document.addEventListener("click",e=>{
  const route=e.target.closest("[data-route-id]");
  if(route){
    const r=schedule.find(x=>x.id===route.dataset.routeId);
    if(r){
      currentRouteStoreIds=[...r.storeIds];
      currentFilter="all";
      $("[data-filter]").forEach(x=>x.classList.toggle("active",x.dataset.filter==="all"));
      renderStores(visitedMap());
      $("#storeSearch").value="";
      const first=storeById(r.storeIds[0]);
      if(first) selectStore(first.id);
      showRouteFocus(r);
      $("#storeListTitle").textContent=r.id+" "+r.title+" の店舗";
      $("#clearRoute").hidden=false;
      $("#routeFocus").scrollIntoView({behavior:"smooth",block:"center"});
    }
    return;
  }
  const close=e.target.closest("#closeRouteFocus");
  if(close){
    $("#routeFocus").hidden=true;
    return;
  }
  const clear=e.target.closest("#clearRoute");
  if(clear){
    currentRouteStoreIds=null;
    $("#storeListTitle").textContent="43店舗一覧";
    clear.hidden=true;
    renderStores(visitedMap());
    return;
  }
  const b=e.target.closest("[data-filter]");if(!b)return;
  currentFilter=b.dataset.filter;$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderStores(visitedMap());
});

document.addEventListener("keydown",e=>{
  const route=e.target.closest?.("[data-route-id]");
  if(route && (e.key==="Enter"||e.key===" ")) { e.preventDefault(); route.click(); }
});
init().catch(err=>{console.error(err);document.body.insertAdjacentHTML("beforeend",'<p style="padding:20px">データの読み込みに失敗しました。</p>')});
