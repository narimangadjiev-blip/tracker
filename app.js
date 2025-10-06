const $ = s=>document.querySelector(s); const $$=s=>Array.from(document.querySelectorAll(s));

// Store
const store={ key:"habitPWA.v1",
  defaultHabits:[
    {id:"sleep_2330",name:"Заснул до 23:30",type:"good",active:true},
    {id:"pills",name:"Пил таблетки",type:"good",active:true},
    {id:"nails",name:"Не трогал ногти",type:"good",active:true},
    {id:"red_meat",name:"Ел красное мясо",type:"bad",active:true},
    {id:"sugar_pm",name:"Сладкое вечером",type:"bad",active:true},
    {id:"water2l",name:"Выпил ≥2 л воды",type:"good",active:true},
    {id:"no_phone_bed",name:"Без телефона в кровати",type:"good",active:true},
    {id:"coffee_pm",name:"Кофе после 16:00",type:"bad",active:true},
    {id:"stretch",name:"10 мин растяжки",type:"good",active:true},
    {id:"cardio",name:"20 мин кардио",type:"good",active:true},
    {id:"bread",name:"Белый хлеб",type:"bad",active:true},
    {id:"late_eat",name:"Еда после 22:00",type:"bad",active:true},
    {id:"reading",name:"15 мин чтения",type:"good",active:true},
    {id:"no_alcohol",name:"Алкоголь",type:"bad",active:true},
    {id:"gratitude",name:"3 благодарности",type:"good",active:true},
  ],
  load(){ try{const raw=localStorage.getItem(this.key); if(raw) return JSON.parse(raw);}catch(e){};
    const d={habits:this.defaultHabits, logs:{}}; localStorage.setItem(this.key, JSON.stringify(d)); return d; },
  save(d){ localStorage.setItem(this.key, JSON.stringify(d)); }
};
let db=store.load();

// Utils
function fmtDate(d){return d.toISOString().slice(0,10)}
function yest(){ const d=new Date(); d.setDate(d.getDate()-1); return d; }
function yestStr(){ return fmtDate(yest()); }
function getRangeDays(n){ const a=[]; for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); a.push(fmtDate(d)); } return a; }
function scoreForDay(ds){ const log=db.logs[ds]||{}; const active=db.habits.filter(h=>h.active); let ok=0,bad=0,total=0;
  for(const h of active){ const v=log[h.id]; if(v===undefined||v===null) continue; total++; if((h.type==="good"&&v===true)||(h.type==="bad"&&v===false)) ok++; if((h.type==="good"&&v===false)||(h.type==="bad"&&v===true)) bad++; }
  const pct=total?Math.round(ok/total*100):0; return {ok,bad,total,pct}; }

// Date label
(function(){ const d=yest(); const el=document.getElementById("dateLabel"); if(el) el.textContent = d.toLocaleDateString(undefined,{weekday:"short", day:"2-digit", month:"2-digit"}); })();

// Deck
const deck=document.getElementById("deck"); let swipeStack=[];
function createCard(h){ const el=document.createElement("div"); el.className="card-swipe"; el.dataset.id=h.id;
  el.innerHTML=`<div class="hint good">✔️</div><div class="hint bad">✖️</div><div class="name" style="font-weight:700;font-size:18px;margin-bottom:6px">${h.name}</div><div class="type" style="font-size:12px;color:#9fb2e2">${h.type==="good"?"Хорошая привычка":"Плохая привычка"}</div>`; attachSwipe(el); return el; }
function buildDeck(){ deck.innerHTML=""; const active=db.habits.filter(h=>h.active); const log=db.logs[yestStr()]||{};
  const order=[...active].sort((a,b)=> (log[a.id]===undefined)===(log[b.id]===undefined)?0:(log[a.id]===undefined?-1:1));
  for(const h of order){ deck.appendChild(createCard(h)); } updateRing(); checkDone(); }
function attachSwipe(el){ let sx=0,cx=0,drag=false; const g=el.querySelector(".hint.good"), b=el.querySelector(".hint.bad");
  const reset=()=>{ el.style.transform=""; el.style.opacity="1"; g.style.opacity=0; b.style.opacity=0; };
  el.addEventListener("touchstart",e=>{ drag=true; sx=e.touches[0].clientX; },{passive:true});
  el.addEventListener("touchmove",e=>{ if(!drag)return; cx=e.touches[0].clientX-sx; el.style.transform=`translateX(${cx}px) rotate(${cx/20}deg)`; const p=Math.min(1,Math.abs(cx)/120); if(cx>0){g.style.opacity=p; b.style.opacity=0;} else {b.style.opacity=p; g.style.opacity=0;} },{passive:true});
  el.addEventListener("touchend",e=>{ drag=false; if(cx>120){ choose(el.dataset.id,true); el.remove(); checkDone(); } else if(cx<-120){ choose(el.dataset.id,false); el.remove(); checkDone(); } else reset(); });
}
function choose(id, success){ const ds=yestStr(); db.logs[ds]=db.logs[ds]||{}; const prev=db.logs[ds][id]; swipeStack.push({date:ds,habitId:id,prev});
  const type=db.habits.find(h=>h.id===id)?.type; db.logs[ds][id]= success? true:false; store.save(db); updateRing(); }
["yesBtn","noBtn","naBtn"].forEach((btnId,i)=>{ const map=[true,false,null]; const el=document.getElementById(btnId); el.addEventListener("click",()=>actTop(map[i])); });
function actTop(val){ const top=deck.querySelector(".card-swipe"); if(!top) return;
  const id=top.dataset.id; const ds=yestStr(); db.logs[ds]=db.logs[ds]||{}; const prev=db.logs[ds][id]; swipeStack.push({date:ds,habitId:id,prev});
  db.logs[ds][id]=val; store.save(db); top.remove(); updateRing(); checkDone(); }
document.getElementById("undoBtn").addEventListener("click",()=>{ const last=swipeStack.pop(); if(!last) return;
  if(!db.logs[last.date]) db.logs[last.date]={}; if(last.prev===undefined) delete db.logs[last.date][last.habitId]; else db.logs[last.date][last.habitId]=last.prev;
  store.save(db); const h=db.habits.find(x=>x.id===last.habitId); if(h){ const exists=deck.querySelector(`.card-swipe[data-id="${h.id}"]`); if(!exists) deck.prepend(createCard(h)); } updateRing(); checkDone(); });

function checkDone(){ const has=!!deck.querySelector(".card-swipe"); document.getElementById("actionRow").classList.toggle("hidden", !has); document.getElementById("donePanel").style.display= has? "none":"flex"; }

// Ring
function drawRing(c, ok, bad, total){ const ctx=c.getContext("2d"), W=c.width,H=c.height,R=(W/2)-8,cx=W/2,cy=H/2;
  ctx.clearRect(0,0,W,H); ctx.lineWidth=16; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--ring"); ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
  let s=-Math.PI/2; const seg= total? (ok/total)*Math.PI*2:0; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--good").trim(); ctx.beginPath(); ctx.arc(cx,cy,R,s,s+seg); ctx.stroke();
  s+=seg; const segBad= total? (bad/total)*Math.PI*2:0; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue("--bad").trim(); ctx.beginPath(); ctx.arc(cx,cy,R,s,s+segBad); ctx.stroke();
  ctx.fillStyle="#e7ecff"; ctx.font="700 20px system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle"; const pct= total? Math.round(ok/total*100):0; ctx.fillText(pct+"%", cx, cy);
}
function updateRing(){ const s=scoreForDay(yestStr()); document.getElementById("statTotal").textContent=s.total; document.getElementById("statGood").textContent=s.ok; document.getElementById("statBad").textContent=s.bad; document.getElementById("scorePill").textContent=s.pct+"%"; drawRing(document.getElementById("ring"), s.ok, s.bad, s.total); }

// Charts
window.drawCharts = function(){ const c1=document.getElementById("chart7"), c2=document.getElementById("chart30");
  const ctx1=c1.getContext("2d"), ctx2=c2.getContext("2d");
  function drawBar(ctx, W,H, arr){ ctx.clearRect(0,0,W,H); ctx.strokeStyle="#203158"; for(let i=0;i<=5;i++){ const y=H-(i*(H-30)/5)-20; ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(W-10,y); ctx.stroke(); } const n=arr.length, barW=(W-60)/n*0.6, step=(W-60)/n; arr.forEach((v,i)=>{ const x=40+i*step, h=(H-40)*(v/100); ctx.fillStyle="#6ea8fe"; ctx.fillRect(x,H-20-h,barW,h); ctx.fillStyle="#9fb2e2"; ctx.font="11px system-ui"; ctx.textAlign="center"; ctx.fillText(String(v), x+barW/2, H-6); }); }
  const last7 = (function(){ const a=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); a.push(scoreForDay(d.toISOString().slice(0,10)).pct); } return a; })();
  drawBar(ctx1, c1.width, c1.height, last7);
  const s7=new Date(); s7.setDate(s7.getDate()-6); document.getElementById("weekSpan").textContent=s7.toLocaleDateString()+" — "+new Date().toLocaleDateString();
  const last30 = (function(){ const a=[]; for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); a.push(scoreForDay(d.toISOString().slice(0,10)).pct); } return a; })();
  drawBar(ctx2, c2.width, c2.height, last30);
  const s30=new Date(); s30.setDate(s30.getDate()-29); document.getElementById("monthSpan").textContent=s30.toLocaleDateString()+" — "+new Date().toLocaleDateString();
};

// Settings
function renderHabits(){ const box=document.getElementById("habitList"); box.innerHTML=""; for(const h of db.habits){ const row=document.createElement("div"); row.className="habit-item"; row.style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#101a31;border:1px solid #1f2d52;border-radius:14px;margin-bottom:10px";
  row.innerHTML=`<div class="label" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ${h.active?"checked":""}><input type="text" value="${h.name}" style="min-width:200px;background:#0e1730;border:1px solid #24345c;color:white;border-radius:12px;padding:8px 10px"><select style="background:#0e1730;border:1px solid #24345c;color:white;border-radius:12px;padding:8px 10px"><option value="good" ${h.type==="good"?"selected":""}>Хорошая</option><option value="bad" ${h.type==="bad"?"selected":""}>Плохая</option></select></div><div class="toolbar" style="display:flex;gap:8px"><button class="btn small" data-act="save">Сохранить</button><button class="btn small" data-act="del">Удалить</button></div>`;
  const [chk,nameInput,typeSel]=row.querySelectorAll("input, select"); row.querySelector("[data-act='save']").addEventListener("click",()=>{ h.active=chk.checked; h.name=nameInput.value.trim()||h.name; h.type=typeSel.value; store.save(db); buildDeck(); renderHabits(); }); row.querySelector("[data-act='del']").addEventListener("click",()=>{ db.habits=db.habits.filter(x=>x!==h); store.save(db); buildDeck(); renderHabits(); }); box.appendChild(row); } }
document.getElementById("addBtn").addEventListener("click",()=>{ const name=document.getElementById("newName").value.trim(); if(!name){ document.getElementById("newName").focus(); return; } const type=document.getElementById("newType").value; const id=name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi,"_")+"_"+Math.random().toString(36).slice(2,6); db.habits.push({id,name,type,active:true}); store.save(db); document.getElementById("newName").value=""; renderHabits(); buildDeck(); });

// Export/Import
document.getElementById("exportBtn").addEventListener("click",()=>{ const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="habit-data.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); });
document.getElementById("importBtn").addEventListener("click",()=>document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change",(e)=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ db=JSON.parse(r.result); store.save(db); renderHabits(); buildDeck(); alert("Импортировано"); }catch{ alert("Ошибка импорта"); } }; r.readAsText(f); });

// Init
buildDeck(); renderHabits(); updateRing();
