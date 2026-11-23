/* 函數歌牌：畫面與遊戲流程 */
{
const {R,pick,LV,LEVELS,lvInfo,makeQ,pack,unpack,orderFor,cardSVG}=K;
const $app=document.getElementById('app');
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- 設定 ---------- */
const S={level:1,speed:1,hint:true,ref:true,slow:false,name:''};
try{Object.assign(S,JSON.parse(localStorage.getItem('fkaruta')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('fkaruta',JSON.stringify(S))}catch(e){}};
const SPEEDS=[{n:'烏龜',t:16000,acc:.7},{n:'兔子',t:9000,acc:.85},{n:'獵豹',t:5000,acc:.93}];
const CLASS_LIMIT={1:20,2:30,3:60,4:30,5:45}; /* 全班模式每題秒數；一般式要配方，給 60 秒 */
const TOTAL=10;
const NAME_MAX=8; /* 暱稱最多 8 個字 */
const cleanName=v=>Array.from(String(v||'').replace(/\s+/g,' ').trim()).slice(0,NAME_MAX).join('');
/* 輸入框：超過字數自動截掉，旁邊顯示 3/8 */
function bindNameInput(inp,counter){const f=()=>{const a=Array.from(inp.value);if(a.length>NAME_MAX)inp.value=a.slice(0,NAME_MAX).join('');if(counter)counter.textContent=`${Array.from(inp.value.trim()).length}/${NAME_MAX}`};inp.addEventListener('input',f);f()}
let G=null,timers=[],ticker=null;
const later=(fn,ms)=>timers.push(setTimeout(fn,ms));
const clearT=()=>{timers.forEach(clearTimeout);timers=[];if(ticker){clearInterval(ticker);ticker=null}};
let toastT;
function toast(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}
document.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- 牌桌共用 ---------- */
function fit(){
 document.querySelectorAll('.gridwrap').forEach(w=>{const g=w.querySelector('.grid');if(!g)return;
  const W=w.clientWidth-16,H=w.clientHeight-16,opts=w.closest('.half')?[[3,2]]:[[3,2],[2,3]];let best=[0,3];
  for(const [c,r] of opts){const v=Math.floor(Math.min((W-8*(c-1))/c,(H-8*(r-1))/r));if(v>best[0])best=[v,c]}
  g.style.setProperty('--cs',Math.max(56,best[0])+'px');g.style.gridTemplateColumns=`repeat(${best[1]},var(--cs))`});
}
const ro=new ResizeObserver(fit);ro.observe($app);
const refit=()=>requestAnimationFrame(fit);

/* 輕點＝搶牌；長按＝放大看清楚（放開後不算搶） */
function attachGrab(grid,cb){
 grid.addEventListener('pointerdown',e=>{
  const b=e.target.closest('.card');if(!b)return;
  const id=e.pointerId,ci=+b.dataset.c;let zoomed=false;b.classList.add('press');
  const t=setTimeout(()=>{zoomed=true;b.classList.remove('press');showZoom(b,!!b.closest('.flip'))},420);
  const up=ev=>{if(ev.pointerId!==id)return;clearTimeout(t);b.classList.remove('press');removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
   if(zoomed)hideZoom();else if(ev.type==='pointerup')cb(ci)};
  addEventListener('pointerup',up);addEventListener('pointercancel',up);
 });
}
function showZoom(b,flip){const z=$('zoom');z.innerHTML=`<div class="card" style="${flip?'transform:rotate(180deg)':''}">${b.querySelector('svg').outerHTML}</div>`;z.hidden=false}
function hideZoom(){$('zoom').hidden=true}
$('zoom').addEventListener('pointerup',hideZoom);

function cardHTML(q,ci,{cls='',tag=''}={}){return`<button class="card ${cls}" data-c="${ci}" aria-label="圖形牌">${cardSVG(q.lv,q.cards[ci].P,S.ref)}${tag}</button>`}
const X=(t='✗',st='color:var(--bad)')=>`<div class="tag" style="${st}">${t}</div>`;
function checklist(q){return q.feats.map(f=>`<span class="chip">✔ ${f.t}</span>`).join('')}
function wrongText(q,ci){return q.cards[ci].d.map(d=>`這張是「${d.mine}」，題目是「${d.want}」`).join('<br>')}
function tally(obj,q,ci){q.cards[ci].d.forEach(d=>obj[d.l]=(obj[d.l]||0)+1)}
function errList(e){const a=Object.entries(e||{}).sort((x,y)=>y[1]-x[1]);return a.length?'<ul style="padding-left:18px;margin:4px 0;text-align:left">'+a.map(([k,v])=>`<li>${esc(k)} × ${v}</li>`).join('')+'</ul>':'<div>全部一次就判斷對！</div>'}
const vibrate=ms=>{try{navigator.vibrate&&navigator.vibrate(ms)}catch(e){}};

/* ---------- 首頁 ---------- */
function home(){
 clearT();leaveOnline(true);G=null;document.body.classList.remove('wide');
 const fan=[[1,{a:2,b:-1},-14,-96],[2,{a:-1,h:1,k:3},0,-59],[5,{a:1,p:-3,h:0,k:0},14,-22]];
 const online=!!Net.mode;
 $app.innerHTML=`<div class="scrollable">
 <h1>函數歌牌</h1><p class="sub">看函數，搶下對應的圖形牌</p>
 <div class="fan">${fan.map(([lv,P,r,dx])=>`<div class="card" style="transform:translateX(${dx}px) rotate(${r}deg)">${cardSVG(lv,P,false)}</div>`).join('')}</div>
 <div class="lbl">關卡</div>
 <div class="levels" id="lvs">${LEVELS.map(n=>{const I=lvInfo(n);return`<button class="lv" data-v="${n}"><i style="background:${I.color}"></i><span><b>${n===6?'綜合':'第 '+n+' 關'}・${I.name}</b><small>${I.form}</small></span></button>`}).join('')}</div>
 <div class="lbl">離線玩（不用網路）</div>
 <div class="seg two"><button id="mSolo">單人挑戰電腦</button><button id="mLocal">同機雙人<small>手機平放面對面</small></button></div>
 <div class="lbl">電腦速度</div><div class="seg" id="speed">${SPEEDS.map((s,i)=>`<button data-v="${i}">${s.n}</button>`).join('')}</div>
 <div class="lbl">線上玩${Net.mode==='mock'?'（本機測試模式）':''}</div>
 <div class="seg two"><button id="mDuel" ${online?'':'disabled'}>線上 1 對 1<small>開房間給對手代碼</small></button><button id="mClass" ${online?'':'disabled'}>全班搶牌<small>老師投影開房</small></button></div>
 <button class="go alt" id="mJoin" ${online?'':'disabled'} style="margin-top:6px">加入房間（輸入代碼）</button>
 ${online?'':`<div class="note">${Net.error?'Firebase 連線失敗：'+esc(Net.error):'線上模式需要先在 config.js 填入 Firebase 設定（見 README）。'}</div>`}
 <div class="lbl">輔助</div>
 <button class="tg" id="tHint"><span>顯示判斷步驟提示</span><span></span></button>
 <button class="tg" id="tRef"><span>一次函數牌面加 y = ±x 虛線</span><span></span></button>
 <button class="tg" id="tSlow"><span>全班搶牌：作答時間寬鬆 ×1.5</span><span></span></button>
 <p class="rules">輕點牌＝搶牌；長按牌＝放大看清楚，放開不算搶。搶錯（お手つき）這題就不能再搶。</p>
 <footer class="foot"><a href="guide.html">給老師的使用說明</a><br>製作：新北市立樹林高中 田育澤<br>聯絡：<a href="mailto:t1072@slsh.ntpc.edu.tw">t1072@slsh.ntpc.edu.tw</a><br>授權：<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hant" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>（可自由使用與改作，請註明出處、不可商用）</footer></div>`;
 const paint=()=>{
  document.querySelectorAll('#lvs .lv').forEach(b=>b.classList.toggle('on',+b.dataset.v===S.level));
  document.querySelectorAll('#speed button').forEach(b=>b.classList.toggle('on',+b.dataset.v===S.speed));
  $('tHint').classList.toggle('on',S.hint);$('tRef').classList.toggle('on',S.ref);$('tSlow').classList.toggle('on',S.slow);save()};
 $('lvs').onclick=e=>{const v=e.target.closest('button')?.dataset.v;if(v){S.level=+v;paint()}};
 $('speed').onclick=e=>{const v=e.target.closest('button')?.dataset.v;if(v!=null){S.speed=+v;paint()}};
 $('tHint').onclick=()=>{S.hint=!S.hint;paint()};$('tRef').onclick=()=>{S.ref=!S.ref;paint()};$('tSlow').onclick=()=>{S.slow=!S.slow;paint()};
 $('mSolo').onclick=()=>startLocal('solo');$('mLocal').onclick=()=>startLocal('duel');
 $('mDuel').onclick=()=>nameScreen('duel');$('mClass').onclick=createClass;$('mJoin').onclick=()=>nameScreen('join');
 paint();
}

/* =====================================================
   離線：單人挑戰電腦／同機雙人
   ===================================================== */
function startLocal(mode){
 clearT();
 G={mode,level:S.level,qn:0,score:[0,0],errs:[{},{}],phase:'ready',ready:[false,false],q:null,locked:[false,false],wrong:[null,null]};
 if(mode==='solo'){renderSolo();nextLocal()}else{renderLocalDuel();showReady()}
}
function nextLocal(){
 clearT();
 if(G.qn>=TOTAL)return endLocal();
 G.qn++;const q=makeQ(G.level);q.order=[orderFor(Math.random()+''),orderFor(Math.random()+'')];
 G.q=q;G.locked=[false,false];G.wrong=[null,null];G.phase='play';G.winner=null;
 if(G.mode==='solo'){drawSolo();startAI()}else drawLocalDuel();
}
function tapLocal(p,ci){
 if(!G||G.phase!=='play'||G.locked[p])return;
 const c=G.q.cards[ci];
 if(c.ans){G.score[p]++;return revealLocal(p)}
 G.locked[p]=true;G.wrong[p]=ci;tally(G.errs[p],G.q,ci);vibrate(120);
 if(G.locked[0]&&G.locked[1])return revealLocal(null);
 G.mode==='solo'?drawSolo():drawLocalDuel();
}
function revealLocal(p){clearT();G.phase='reveal';G.winner=p;if(G.mode==='solo')drawSolo();else{drawLocalDuel();later(nextLocal,3800)}}
function localGrid(q,order,p){
 return order.map(ci=>{const c=q.cards[ci];let cls='',tag='';
  if(G.phase==='reveal')cls=c.ans?'win':'dim';
  if(G.wrong[p]===ci)tag=X();
  if(G.mode==='solo'&&G.wrong[1]===ci)tag=X('電腦✗','font-size:18px;color:var(--B)');
  return cardHTML(q,ci,{cls,tag})}).join('');
}
function renderSolo(){
 $app.innerHTML=`<div class="bar"><span id="sq"></span><span id="ss"></span><button class="x-btn" id="quit">離開</button></div>
 <div class="qbox"><div class="eq" id="eq"></div><div class="hint" id="hint"></div></div>
 <div class="ai"><i id="aib"></i><span id="ait"></span></div>
 <div class="gridwrap"><div class="grid" id="grid"></div></div><div class="fb" id="fb"></div>`;
 $('quit').onclick=home;attachGrab($('grid'),ci=>tapLocal(0,ci));
}
function drawSolo(){
 const q=G.q;
 $('sq').innerHTML=`第 <b>${G.qn}</b> / ${TOTAL} 題`;
 $('ss').innerHTML=`你 <b style="color:var(--A)">${G.score[0]}</b> : <b style="color:var(--B)">${G.score[1]}</b> 電腦`;
 $('eq').textContent=q.eq;$('hint').textContent=S.hint?q.L.hint:'';
 $('grid').innerHTML=localGrid(q,q.order[0],0);
 let h='';
 if(G.phase==='play')h=G.locked[0]?`<div class="t bad">搶錯了！這題不能再搶</div>${wrongText(q,G.wrong[0])}`:`<span style="color:var(--muted)">${q.L.name}：找出 ${esc(q.eq)} 的圖形</span>`;
 else{const who=G.winner===0?'<span class="ok">你搶到了！</span>':G.winner===1?'<span class="bad">被電腦搶走了</span>':'<span class="bad">雙方都搶錯</span>';
  h=`<div class="t">${who}</div>${G.wrong[0]!=null?wrongText(q,G.wrong[0])+'<br>':''}正確答案：${checklist(q)}<button class="next" id="nx">${G.qn>=TOTAL?'看結果':'下一題'} ▶</button>`}
 $('fb').innerHTML=h;const nx=$('nx');if(nx)nx.onclick=nextLocal;refit();
}
function startAI(){
 const sp=SPEEDS[S.speed],tm=G.q.L.tm||1,t=sp.t*tm*(0.75+Math.random()*0.5);
 const bar=$('aib'),txt=$('ait');
 bar.style.transition='none';bar.style.width='0';bar.style.background='var(--B)';txt.textContent=`電腦（${sp.n}）正在找牌…`+(tm>1?`　一般式時間 ×${tm}`:'');
 requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.transition=`width ${t}ms linear`;bar.style.width='100%'}));
 later(()=>{
  if(G.phase!=='play')return;
  if(Math.random()<sp.acc){txt.textContent='電腦搶到了';G.score[1]++;revealLocal(1)}
  else{const wrongs=G.q.cards.map((c,i)=>i).filter(i=>!G.q.cards[i].ans);G.locked[1]=true;G.wrong[1]=pick(wrongs);txt.textContent='電腦搶錯了！慢慢找';bar.style.background='#777';
   if(G.locked[0])revealLocal(null);else drawSolo()}
 },t);
}
function halfHTML(p){
 return`<div class="half ${p?'flip pB':'pA'}" id="h${p}">
 <div class="bar"><span id="q${p}"></span><span id="s${p}"></span></div>
 <div class="qbox"><div class="eq small" id="e${p}"></div><div class="hint" id="i${p}"></div></div>
 <div class="gridwrap"><div class="grid" id="g${p}"></div></div>
 <div class="fb" id="f${p}"></div><div id="c${p}"></div></div>`;
}
function renderLocalDuel(){
 $app.innerHTML=`<div class="duel">${halfHTML(1)}<div class="mid"><button id="quit" aria-label="離開">✕</button></div>${halfHTML(0)}</div>`;
 $('quit').onclick=home;[0,1].forEach(p=>attachGrab($('g'+p),ci=>tapLocal(p,ci)));
}
function cover(p,html){$('c'+p).innerHTML=html?`<div class="cover">${html}</div>`:''}
function showReady(){
 G.phase='ready';
 [0,1].forEach(p=>{cover(p,`<div style="font-size:20px;font-weight:800">${p?'玩家 B':'玩家 A'}</div><div class="res">${lvInfo(G.level).name}・${TOTAL} 題</div><button class="rb" id="r${p}">${G.ready[p]?'等對手…':'準備好了'}</button>`);
  $('r'+p).onclick=()=>{G.ready[p]=true;if(G.ready[0]&&G.ready[1])countdown(3);else showReady()}});
}
function countdown(n){
 if(n===0){cover(0);cover(1);return nextLocal()}
 [0,1].forEach(p=>cover(p,`<div class="big">${n}</div>`));later(()=>countdown(n-1),700);
}
function drawLocalDuel(){
 const q=G.q;
 [0,1].forEach(p=>{
  $('q'+p).innerHTML=`第 <b>${G.qn}</b>/${TOTAL}`;
  $('s'+p).innerHTML=`你 <b class="me">${G.score[p]}</b> : <b>${G.score[1-p]}</b> 對手`;
  $('e'+p).textContent=q.eq;$('i'+p).textContent=S.hint?q.L.hint:'';
  $('g'+p).innerHTML=localGrid(q,q.order[p],p);
  let h;
  if(G.phase==='play')h=G.locked[p]?`<b class="bad">搶錯！這題鎖住</b><br>${wrongText(q,G.wrong[p])}`:'<span style="color:var(--muted)">找出圖形，快搶！</span>';
  else h=`${G.winner===p?'<b class="ok">你搶到了！</b>':G.winner===null?'<b class="bad">雙方都搶錯</b>':'<b class="bad">對手搶走了</b>'}　${checklist(q)}`;
  $('f'+p).innerHTML=h;
 });
 refit();
}
function endLocal(){
 clearT();G.phase='end';const [a,b]=G.score;
 if(G.mode==='solo'){
  $app.innerHTML=`<div class="scrollable" style="text-align:center"><h1 style="margin-top:30px">${a>b?'你贏了！':a<b?'電腦贏了':'平手'}</h1>
  <div style="font-size:48px;font-weight:800;margin:10px 0"><span style="color:var(--A)">${a}</span> : <span style="color:var(--B)">${b}</span></div>
  <div class="res">${lvInfo(G.level).name}・電腦 ${SPEEDS[S.speed].n}</div>
  <div class="fb" style="margin:18px 0;text-align:left"><div class="t">搶錯時判斷錯的地方</div>${errList(G.errs[0])}</div>
  <button class="go" id="again">再來一局</button><button class="go alt" id="back">回首頁</button></div>`;
  $('again').onclick=()=>startLocal('solo');$('back').onclick=home;
 }else{
  [0,1].forEach(p=>{$('g'+p).innerHTML='';const me=G.score[p],op=G.score[1-p];
   cover(p,`<div class="big" style="font-size:40px">${me>op?'你贏了！':me<op?'你輸了':'平手'}</div><div style="font-size:30px;font-weight:800">${me} : ${op}</div><div class="res">搶錯時判斷錯的地方${errList(G.errs[p])}</div><div style="display:flex;gap:8px"><button class="rb" data-a="again">再來一局</button><button class="rb" data-a="back" style="background:var(--paper)">回首頁</button></div>`)});
  document.querySelectorAll('[data-a=again]').forEach(b=>b.onclick=()=>startLocal('duel'));
  document.querySelectorAll('[data-a=back]').forEach(b=>b.onclick=home);
 }
}

/* =====================================================
   線上共用
   ===================================================== */
let O=null;
const room=p=>`rooms/${O.code}${p?'/'+p:''}`;
function leaveOnline(silent){
 if(!O)return;const o=O;O=null;clearT();closePMenu();
 o.unsubs.forEach(u=>u());
 if(o.host)Net.remove(`rooms/${o.code}`).catch(()=>{});
 else Net.remove(`rooms/${o.code}/players/${Net.uid}`).catch(()=>{});
 if(!silent)home();
}
async function newCode(){for(let i=0;i<30;i++){const c=String(R(1000,9999));if(!(await Net.get(`rooms/${c}/meta`)))return c}throw new Error('找不到空的房間代碼')}
function subscribe(code,host,type,render){
 O={code,host,type,render,unsubs:[],meta:null,game:null,players:{},scores:{},grabs:{},stats:{},rename:{},sig:''};
 ['kicked','rename','meta','game','players','scores','grabs','stats'].forEach(k=>O.unsubs.push(Net.on(`rooms/${code}/${k}`,v=>{
  if(!O)return;
  if(k==='kicked'&&v&&v[Net.uid]&&!O.host){O.unsubs.forEach(u=>u());O=null;clearT();toast('你已被老師移出房間');return home()}
  if(k==='meta'&&v===null&&O.meta&&!O.host){O.unsubs.forEach(u=>u());O=null;toast('房間已經關閉');return home()}
  O[k]=v||(k==='meta'||k==='game'?null:{});
  O.render();
  if(O&&O.host&&O.hostCheck)O.hostCheck();
 })));
}
const playerName=pid=>O.players?.[pid]?.name||'（已離開）';
function rankList(){return Object.keys(O.players||{}).map(pid=>({pid,name:playerName(pid),score:O.scores?.[pid]||0})).sort((a,b)=>b.score-a.score)}
const curQ=()=>{if(!O.game||!O.game.q)return null;if(O.qCache&&O.qCache.qn===O.game.qn)return O.qCache.q;const q=unpack(O.game.q);O.qCache={qn:O.game.qn,q};return q};
const myGrab=()=>O.grabs?.[O.game?.qn]?.[Net.uid];
function grabOnline(ci){
 if(!O||!O.game||O.game.state!=='play'||myGrab()||O.pending)return;
 O.pending=true;
 Net.set(room(`grabs/${O.game.qn}/${Net.uid}`),{ci,t:Net.TS}).catch(e=>toast('送出失敗：'+(e.message||e))).finally(()=>{if(O)O.pending=false});
 const q=curQ();if(O.type==='duel'&&q&&!q.cards[ci].ans)vibrate(120);
}
function signature(extra){return JSON.stringify([O.game,O.players,O.scores,O.grabs?.[O.game?.qn],O.rename?.[Net.uid],extra])}

/* 名字與代碼 */
function nameScreen(kind,code=''){
 clearT();
 $app.innerHTML=`<div class="scrollable"><button class="x-btn" id="back">← 返回</button>
 <h2 style="margin-top:18px">${kind==='duel'?'開一個 1 對 1 房間':'加入房間'}</h2>
 ${kind==='join'?`<div class="lbl">房間代碼（4 位數）</div><input id="code" inputmode="numeric" maxlength="4" value="${esc(code)}" autocomplete="off">`:''}
 <div class="lbl">你的暱稱（最多 ${NAME_MAX} 個字，請勿輸入真實全名）<span id="ncnt" style="float:right"></span></div><input id="name" maxlength="${NAME_MAX*2}" value="${esc(cleanName(S.name))}" autocomplete="off">
 ${kind==='duel'?`<p class="rules">關卡：${lvInfo(S.level).name}。開好房間後，把代碼給對手。</p>`:''}
 <button class="go" id="ok">${kind==='duel'?'開房間':'加入'}</button><p class="note" id="err" hidden></p></div>`;
 $('back').onclick=home;bindNameInput($('name'),$('ncnt'));
 const err=m=>{$('err').hidden=false;$('err').textContent=m};
 $('ok').onclick=async()=>{
  const name=cleanName($('name').value);if(!name)return err('請先輸入暱稱');
  S.name=name;save();$('ok').disabled=true;
  try{
   if(kind==='duel')await createDuel(name);
   else{const c=$('code').value.trim();if(!/^\d{4}$/.test(c)){$('ok').disabled=false;return err('代碼是 4 位數字')}await joinRoom(c,name)}
  }catch(e){$('ok').disabled=false;err(e.message||String(e))}
 };
}
async function joinRoom(code,name){
 const meta=await Net.get(`rooms/${code}/meta`);
 if(!meta)throw new Error('找不到這個房間，請確認代碼');
 if(await Net.get(`rooms/${code}/kicked/${Net.uid}`))throw new Error('你已被老師移出這個房間');
 if(meta.type==='duel'){
  const ps=await Net.get(`rooms/${code}/players`)||{};
  if(Object.keys(ps).length>=2&&!ps[Net.uid])throw new Error('這個房間已經滿了');
 }
 await Net.set(`rooms/${code}/players/${Net.uid}`,{name,ready:false,joinedAt:Net.TS});
 Net.onDisconnectRemove(`rooms/${code}/players/${Net.uid}`);
 history.replaceState(null,'',location.pathname+(Net.mode==='mock'?'?mock=1':''));
 if(meta.type==='duel')enterDuel(code,false);else enterStudent(code);
}

/* =====================================================
   線上 1 對 1
   ===================================================== */
async function createDuel(name){
 const code=await newCode();
 await Net.set(`rooms/${code}/meta`,{hostId:Net.uid,type:'duel',level:S.level,total:TOTAL,createdAt:Net.TS});
 await Net.set(`rooms/${code}/game`,{state:'lobby',qn:0});
 await Net.set(`rooms/${code}/players/${Net.uid}`,{name,ready:false,joinedAt:Net.TS});
 enterDuel(code,true);
}
function enterDuel(code,host){subscribe(code,host,'duel',renderDuel);if(host)O.hostCheck=duelHostCheck}
const opp=()=>Object.keys(O.players||{}).find(p=>p!==Net.uid);
function renderDuel(){
 if(!O||!O.game||!O.meta)return;
 const st=O.game.state,sig=signature();if(sig===O.sig)return;O.sig=sig;
 const me=O.players?.[Net.uid],o=opp(),op=o?O.players[o]:null;
 if(st==='lobby'){
  $app.innerHTML=`<div class="scrollable"><div class="bar" style="padding:0"><span>線上 1 對 1・${lvInfo(O.meta.level).name}</span><button class="x-btn" id="quit">離開</button></div>
  <div class="lbl" style="text-align:center">房間代碼</div><div class="code">${O.code}</div>
  <p class="rules" style="text-align:center">請對手打開函數歌牌 →「加入房間」輸入這個代碼</p>
  <div class="vs"><div class="p ${me?.ready?'rdy':''}">${esc(me?.name||'')}<small>${me?.ready?'準備好了':'你'}</small></div><b>VS</b><div class="p ${op?.ready?'rdy':''}">${op?esc(op.name):'等待中…'}<small>${op?(op.ready?'準備好了':'對手'):'還沒有人加入'}</small></div></div>
  <button class="go" id="rdy" ${me?.ready?'disabled':''}>${me?.ready?'等對手準備…':'準備好了'}</button></div>`;
  $('quit').onclick=()=>leaveOnline();
  $('rdy').onclick=()=>Net.set(room(`players/${Net.uid}/ready`),true);
  return;
 }
 if(st==='end'){
  const a=O.scores?.[Net.uid]||0,b=o?(O.scores?.[o]||0):0;
  $app.innerHTML=`<div class="scrollable" style="text-align:center"><h1 style="margin-top:30px">${a>b?'你贏了！':a<b?'你輸了':'平手'}</h1>
  <div style="font-size:48px;font-weight:800;margin:10px 0"><span style="color:var(--A)">${a}</span> : <span style="color:var(--B)">${b}</span></div>
  <div class="res">對手：${esc(op?.name||'（已離開）')}</div>
  <div class="fb" style="margin:18px 0;text-align:left"><div class="t">搶錯時判斷錯的地方</div>${errList(O.stats?.[Net.uid])}</div>
  ${O.host?'<button class="go" id="again">再來一局</button>':'<p class="rules">等房主決定要不要再來一局</p>'}<button class="go alt" id="quit">離開房間</button></div>`;
  $('quit').onclick=()=>leaveOnline();if(O.host)$('again').onclick=duelReset;
  return;
 }
 const q=curQ(),qn=O.game.qn,mine=myGrab(),og=o?O.grabs?.[qn]?.[o]:null,order=orderFor(Net.uid+':'+qn);
 const reveal=st==='reveal';
 $app.innerHTML=`<div class="bar"><span>第 <b>${qn}</b> / ${O.meta.total} 題</span><span>你 <b style="color:var(--A)">${O.scores?.[Net.uid]||0}</b> : <b style="color:var(--B)">${o?(O.scores?.[o]||0):0}</b> ${esc(op?.name||'對手')}</span><button class="x-btn" id="quit">離開</button></div>
 <div class="qbox"><div class="eq">${esc(q.eq)}</div><div class="hint">${S.hint?q.L.hint:''}</div></div>
 <div class="ai"><span>${!op?'對手離開了':og?(q.cards[og.ci].ans?'對手出手了！':'對手搶錯了！慢慢找'):'對手正在找牌…'}</span></div>
 <div class="gridwrap"><div class="grid" id="grid">${order.map(ci=>{let cls='',tag='';const c=q.cards[ci];
  if(reveal)cls=c.ans?'win':'dim';
  if(mine&&mine.ci===ci&&!c.ans)tag=X();
  if(reveal&&og&&og.ci===ci&&!c.ans)tag+=X('對手✗','font-size:18px;color:var(--B);background:none');
  return cardHTML(q,ci,{cls,tag})}).join('')}</div></div><div class="fb" id="fb"></div>`;
 let h;
 if(!reveal)h=mine?(q.cards[mine.ci].ans?'<div class="t">判定中…</div>':`<div class="t bad">搶錯了！這題不能再搶</div>${wrongText(q,mine.ci)}`):`<span style="color:var(--muted)">找出 ${esc(q.eq)} 的圖形，快搶！</span>`;
 else{const w=O.game.winner;h=`<div class="t">${w===Net.uid?'<span class="ok">你搶到了！</span>':w?'<span class="bad">被對手搶走了</span>':'<span class="bad">雙方都搶錯</span>'}</div>${mine&&!q.cards[mine.ci].ans?wrongText(q,mine.ci)+'<br>':''}正確答案：${checklist(q)}`}
 $('fb').innerHTML=h;$('quit').onclick=()=>leaveOnline();attachGrab($('grid'),grabOnline);refit();
}
function duelHostCheck(){
 const g=O.game;if(!g)return;
 const ids=Object.keys(O.players||{});
 if(g.state==='lobby'){if(ids.length===2&&ids.every(p=>O.players[p].ready)&&!O.starting){O.starting=true;hostNextQ()}return}
 if(g.state!=='play'||O.decided===g.qn)return;
 const q=curQ(),gr=O.grabs?.[g.qn]||{},arr=Object.entries(gr).map(([pid,v])=>({pid,...v}));
 const anyOk=arr.some(x=>q.cards[x.ci].ans);
 if(!anyOk&&arr.length<Math.max(2,ids.length))return;
 if(O.waitQ===g.qn)return;O.waitQ=g.qn;
 /* 等 0.5 秒收齊幾乎同時送出的搶牌，再依伺服器時間判定先後 */
 later(()=>{
  if(!O||O.game.qn!==g.qn||O.game.state!=='play')return;O.decided=g.qn;
  const all=Object.entries(O.grabs?.[g.qn]||{}).map(([pid,v])=>({pid,...v})).sort((a,b)=>a.t-b.t);
  const win=all.find(x=>q.cards[x.ci].ans);
  const up={};
  all.filter(x=>!q.cards[x.ci].ans).forEach(x=>q.cards[x.ci].d.forEach(d=>{up[`stats/${x.pid}/${d.l}`]=(O.stats?.[x.pid]?.[d.l]||0)+1}));
  if(win)up[`scores/${win.pid}`]=(O.scores?.[win.pid]||0)+1;
  up['game/winner']=win?win.pid:null;up['game/state']='reveal';
  Net.update(room(),up);
  later(hostNextQ,3800);
 },500);
}
function hostNextQ(){
 if(!O)return;const qn=(O.game?.qn||0)+1;
 if(qn>O.meta.total){Net.update(room('game'),{state:'end'});return}
 const q=makeQ(O.meta.level);
 const g={state:'play',qn,q:pack(q),startAt:Net.TS,winner:null};
 if(O.type==='class'){const lim=CLASS_LIMIT[q.lv]*(O.meta.slow?1.5:1);g.limit=Math.round(lim*1000);g.base=g.limit;g.extra=0}
 Net.set(room('game'),g);
}
async function duelReset(){
 const up={grabs:null,scores:null,stats:null,game:{state:'lobby',qn:0}};
 Object.keys(O.players||{}).forEach(p=>up[`players/${p}/ready`]=false);
 O.starting=false;O.decided=null;O.waitQ=null;
 await Net.update(room(),up);
}

/* =====================================================
   全班搶牌：老師端（投影）
   ===================================================== */
async function createClass(){
 try{
  const code=await newCode();
  await Net.set(`rooms/${code}/meta`,{hostId:Net.uid,type:'class',level:S.level,total:TOTAL,slow:!!S.slow,createdAt:Net.TS});
  await Net.set(`rooms/${code}/game`,{state:'lobby',qn:0});
  document.body.classList.add('wide');
  subscribe(code,true,'class',renderHost);O.hostCheck=classHostCheck;
  ticker=setInterval(hostTick,250);
 }catch(e){toast('開房失敗：'+(e.message||e))}
}
const joinURL=()=>location.origin+location.pathname+'?'+(Net.mode==='mock'?'mock=1&':'')+'room='+O.code;
function boardHTML(n=8){const r=rankList();return r.length?`<ol class="board">${r.slice(0,n).map(x=>`<li data-kick="${x.pid}"><span>${esc(x.name)}</span>${x.score}</li>`).join('')}</ol><p class="res" style="font-size:13px">點名字可以請他改名或移出</p>`:'<p class="res">還沒有人加入</p>'}
/* 老師點學生名字：跳出選單，可以「請改名」（改完可以回來，分數保留）或「移出」（這個房間不能再進來） */
function closePMenu(){const m=$('pmenu');if(m)m.remove()}
function bindKick(){
 $app.querySelectorAll('[data-kick]').forEach(el=>el.onclick=()=>openPMenu(el.dataset.kick));
}
function openPMenu(pid){
 closePMenu();const name=playerName(pid),d=document.createElement('div');d.id='pmenu';
 d.innerHTML=`<div class="pm-box"><div class="pm-name">${esc(name)}</div>
 <button class="go" id="pmRename">✏️ 請改名<small>他換好名字就能回來，分數保留</small></button>
 <button class="go bad" id="pmKick">🚫 移出<small>這個房間不能再進來</small></button>
 <button class="go alt" id="pmCancel">取消</button></div>`;
 document.body.appendChild(d);
 d.onclick=e=>{if(e.target===d)closePMenu()};
 $('pmCancel').onclick=closePMenu;
 $('pmRename').onclick=()=>{closePMenu();if(!O)return;Net.update(room(),{[`rename/${pid}`]:Net.TS,[`players/${pid}`]:null});toast('已請 '+name+' 改名')};
 $('pmKick').onclick=()=>{closePMenu();if(!O)return;Net.update(room(),{[`kicked/${pid}`]:true,[`players/${pid}`]:null});toast('已移出 '+name)};
}
function renderHost(){
 if(!O||!O.game||!O.meta)return;
 const st=O.game.state,sig=signature(st==='play'?Object.keys(O.grabs?.[O.game.qn]||{}).length:0);if(sig===O.sig)return;O.sig=sig;
 const names=Object.values(O.players||{});
 if(st==='lobby'){
  $app.innerHTML=`<div class="lobby-host"><div style="text-align:center"><div class="stat">用手機加入全班搶牌</div><div class="code">${O.code}</div><div id="qr"></div><div class="url">${esc(joinURL())}</div></div>
  <div><div class="stat">${lvInfo(O.meta.level).name}・${O.meta.total} 題${O.meta.slow?'・時間寬鬆':''}</div><div class="res" style="margin:6px 0">已加入 ${names.length} 人</div>
  <div class="plist">${Object.entries(O.players||{}).map(([pid,p])=>`<span data-kick="${pid}">${esc(p.name)}</span>`).join('')}</div>${names.length?'<p class="res" style="font-size:13px">點名字可以請他改名或移出</p>':''}
  <button class="go" id="start" ${names.length?'':'disabled'}>開始</button><button class="go alt" id="quit">關閉房間</button></div></div>`;
  try{if(window.QRCode)new QRCode($('qr'),{text:joinURL(),width:220,height:220});else $('qr').remove()}catch(e){$('qr').remove()}
  $('start').onclick=hostNextQ;$('quit').onclick=()=>leaveOnline();bindKick();return;
 }
 if(st==='end'){
  const r=rankList(),agg={};Object.values(O.stats||{}).forEach(s=>Object.entries(s).forEach(([k,v])=>agg[k]=(agg[k]||0)+v));
  const ag=Object.entries(agg).sort((a,b)=>b[1]-a[1]),mx=ag[0]?.[1]||1;
  $app.innerHTML=`<div class="host"><div class="left" style="overflow:auto"><h1>最終排名</h1>
  <div class="vs" style="grid-template-columns:repeat(3,minmax(0,1fr))">${[1,0,2].map(i=>r[i]?`<div class="p" style="padding:${i===0?28:16}px 8px;font-size:${i===0?30:22}px"><span style="color:var(--A)">第 ${i+1} 名</span><br>${esc(r[i].name)}<small>${r[i].score} 分</small></div>`:'<div></div>').join('')}</div>
  <div class="stat" style="margin-top:10px">全班最常判斷錯的地方</div><div class="bars">${ag.length?ag.map(([k,v])=>`<div><b>${esc(k)}</b><i style="width:${Math.round(v/mx*60)}%"></i>${v}</div>`).join(''):'<p class="res">沒有人搶錯！</p>'}</div></div>
  <div class="right"><div class="stat">完整排名</div><ol class="board">${r.map(x=>`<li><span>${esc(x.name)}</span>${x.score}</li>`).join('')}</ol>
  <button class="go" id="again">再來一局</button><button class="go alt" id="quit">關閉房間</button></div></div>`;
  $('again').onclick=classReset;$('quit').onclick=()=>leaveOnline();return;
 }
 const q=curQ(),qn=O.game.qn,gr=O.grabs?.[qn]||{},n=Object.keys(gr).length,total=names.length;
 if(st==='play'){
  $app.innerHTML=`<div class="host"><div class="left"><div class="bar" style="padding:0 0 8px"><span>第 <b>${qn}</b> / ${O.meta.total} 題・${q.L.name}</span><span>房間 <b>${O.code}</b></span></div>
  <div class="qbox"><div class="eq">${esc(q.eq)}</div><div class="hint" style="font-size:18px">${S.hint?q.L.hint:''}</div></div>
  <div class="timer"><i id="tbar"></i></div><div class="stat" id="tleft"></div>
  <div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="text-align:center"><div style="font-size:clamp(60px,9vw,120px);font-weight:800;line-height:1">${n}<span style="font-size:.4em;color:var(--muted)"> / ${total}</span></div><div class="stat">已出手</div></div></div>
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="go" id="more" style="max-width:260px;margin-top:0">＋15 秒</button><button class="go alt" id="early" style="max-width:260px;margin-top:0">提早結束這題</button></div></div>
  <div class="right"><div class="stat">排行榜</div>${boardHTML()}</div></div>`;
  $('early').onclick=classReveal;$('more').onclick=addTime;bindKick();hostTick();return;
 }
 /* reveal */
 const cnt=O.game.counts||[],first=O.game.first;
 const topWrong=q.cards.map((c,i)=>({i,c,n:cnt[i]||0})).filter(x=>!x.c.ans&&x.n).sort((a,b)=>b.n-a.n)[0];
 $app.innerHTML=`<div class="host"><div class="left"><div class="bar" style="padding:0 0 8px"><span>第 <b>${qn}</b> / ${O.meta.total} 題</span><span>${first?`最快搶到：<b>${esc(first)}</b>`:'沒有人答對'}</span></div>
 <div class="qbox"><div class="eq">${esc(q.eq)}</div><div class="hint" style="font-size:18px">${checklist(q)}</div></div>
 <div class="gridwrap"><div class="grid">${[0,1,2,3,4,5].map(ci=>cardHTML(q,ci,{cls:q.cards[ci].ans?'win':'',tag:`<div class="cnt">${cnt[ci]||0} 人</div>`})).join('')}</div></div>
 <div class="fb" style="font-size:18px">${topWrong?`最多人錯選的牌（${topWrong.n} 人）：${topWrong.c.d.map(d=>`「${d.mine}」，正確是「${d.want}」`).join('；')}`:'沒有人選錯！'}</div></div>
 <div class="right"><div class="stat">排行榜</div>${boardHTML()}<button class="go" id="nx">${qn>=O.meta.total?'看最終結果':'下一題'} ▶</button></div></div>`;
 $('nx').onclick=hostNextQ;bindKick();refit();
}
function hostTick(){
 if(!O||O.type!=='class'||!O.host||!O.game||O.game.state!=='play'||typeof O.game.startAt!=='number')return;
 const left=Math.max(0,O.game.startAt+O.game.limit-Net.now()),b=$('tbar'),t=$('tleft');
 if(b)b.style.width=(left/O.game.limit*100)+'%';if(t)t.textContent=`剩 ${Math.ceil(left/1000)} 秒`+(O.game.extra?`（已加時 ${O.game.extra*15} 秒）`:'');
 if(left<=0)classReveal();
}
/* 老師加時：每按一次 +15 秒。計分仍以原本的時間為準，加時後才答對的人拿基本分 500，不會因為等比較久而扣更多 */
function addTime(){
 if(!O||!O.host||!O.game||O.game.state!=='play')return;
 if(O.game.startAt+O.game.limit-Net.now()<=0)return;
 Net.update(room('game'),{limit:O.game.limit+15000,extra:(O.game.extra||0)+1});
 toast('已加時 15 秒');
}
document.addEventListener('keydown',e=>{if((e.key==='+'||e.key==='=')&&O&&O.host&&O.type==='class')addTime()});
function classHostCheck(){
 const g=O.game;if(!g||g.state!=='play')return;
 const ids=Object.keys(O.players||{}),gr=O.grabs?.[g.qn]||{};
 if(ids.length&&ids.every(p=>gr[p]))later(classReveal,500);
}
function classReveal(){
 if(!O||!O.game||O.game.state!=='play'||O.decided===O.game.qn)return;
 const g=O.game,q=curQ();O.decided=g.qn;
 const all=Object.entries(O.grabs?.[g.qn]||{}).map(([pid,v])=>({pid,...v})).sort((a,b)=>a.t-b.t);
 const up={},results={},counts=[0,0,0,0,0,0];let first=null;
 all.forEach(x=>{
  counts[x.ci]++;const ok=q.cards[x.ci].ans;let pts=0;
  if(ok){const frac=Math.max(0,1-(x.t-g.startAt)/(g.base||g.limit));pts=Math.round((500+500*frac)/10)*10;if(!first){first=x.pid;pts+=100}}
  else q.cards[x.ci].d.forEach(d=>{up[`stats/${x.pid}/${d.l}`]=(O.stats?.[x.pid]?.[d.l]||0)+1});
  results[x.pid]={ok,pts,ci:x.ci,first:first===x.pid};
  if(pts)up[`scores/${x.pid}`]=(O.scores?.[x.pid]||0)+pts;
 });
 up['game/results']=results;up['game/counts']=counts;up['game/first']=first?playerName(first):null;up['game/state']='reveal';
 Net.update(room(),up);
}
async function classReset(){O.decided=null;await Net.update(room(),{grabs:null,scores:null,stats:null,game:{state:'lobby',qn:0}})}

/* =====================================================
   全班搶牌：學生端
   ===================================================== */
function enterStudent(code){subscribe(code,false,'class',renderStudent);ticker=setInterval(studentTick,250)}
/* 老師請改名：記住處理過哪一次，重新整理也不會再跳出來 */
const renamedAt=code=>{try{return Number(sessionStorage.getItem('fk-renamed-'+code))||0}catch(e){return 0}};
function renameScreen(rn){
 O.renaming=true;clearT();const old=cleanName(S.name);
 $app.innerHTML=`<div class="scrollable" style="text-align:center"><div class="bar" style="padding:0"><span>房間 ${O.code}</span><button class="x-btn" id="quit">離開</button></div>
 <h2 style="margin-top:36px">✏️ 老師請你換一個名字</h2>
 <p class="res">原本的名字：${esc(old)||'（無）'}<br>換好就會回到房間，分數會保留</p>
 <div class="lbl" style="text-align:left">新的暱稱（最多 ${NAME_MAX} 個字，請勿輸入真實全名）<span id="ncnt" style="float:right"></span></div>
 <input id="name" maxlength="${NAME_MAX*2}" autocomplete="off">
 <button class="go" id="ok">換好了，回到房間</button><p class="note" id="err" hidden></p></div>`;
 bindNameInput($('name'),$('ncnt'));$('name').focus();
 const err=m=>{$('err').hidden=false;$('err').textContent=m};
 $('quit').onclick=()=>{if(O)O.renaming=false;leaveOnline()};
 $('ok').onclick=async()=>{
  const name=cleanName($('name').value);
  if(!name)return err('請輸入新的暱稱');
  if(name===old)return err('要換一個和原本不一樣的名字');
  if(!O)return;const code=O.code;$('ok').disabled=true;
  try{
   await Net.set(`rooms/${code}/players/${Net.uid}`,{name,ready:false,joinedAt:Net.TS});
   Net.onDisconnectRemove(`rooms/${code}/players/${Net.uid}`);
   try{sessionStorage.setItem('fk-renamed-'+code,String(rn))}catch(e){}
   S.name=name;save();
   if(O&&O.code===code){O.renaming=false;O.sig='';clearT();ticker=setInterval(studentTick,250);O.render()}
  }catch(e){$('ok').disabled=false;err('送出失敗：'+(e.message||e))}
 };
}
function myRank(){const r=rankList(),i=r.findIndex(x=>x.pid===Net.uid);return i<0?'-':i+1}
function renderStudent(){
 if(!O||!O.game||!O.meta)return;
 const st=O.game.state,sig=signature();if(sig===O.sig)return;O.sig=sig;
 const me=O.players?.[Net.uid],score=O.scores?.[Net.uid]||0,total=Object.keys(O.players||{}).length;
 const rn=O.rename?.[Net.uid];
 if(rn&&!me&&rn!==renamedAt(O.code)){if(!O.renaming)renameScreen(rn);return}
 if(!me&&st!=='end'){/* 斷線被清掉後自動重新加入；被老師移出的不重加 */const code=O.code;if(!O.rejoining){O.rejoining=true;Net.get(`rooms/${code}/kicked/${Net.uid}`).then(k=>{if(!k&&O&&O.code===code)Net.set(`rooms/${code}/players/${Net.uid}`,{name:cleanName(S.name)||'玩家',ready:false,joinedAt:Net.TS});if(O)O.rejoining=false})}return}
 if(st==='lobby'){
  $app.innerHTML=`<div class="scrollable" style="text-align:center"><div class="bar" style="padding:0"><span>房間 ${O.code}</span><button class="x-btn" id="quit">離開</button></div>
  <h2 style="margin-top:40px">已加入！</h2><div class="code" style="font-size:40px">${esc(me?.name)}</div>
  <p class="res">${lvInfo(O.meta.level).name}・目前 ${total} 人<br>等老師按開始…</p>
  <p class="rules">輕點牌＝搶牌（只有一次機會）<br>長按牌＝放大看清楚</p></div>`;
  $('quit').onclick=()=>leaveOnline();return;
 }
 if(st==='end'){
  $app.innerHTML=`<div class="scrollable" style="text-align:center"><h2 style="margin-top:30px">第 ${myRank()} 名</h2>
  <div style="font-size:48px;font-weight:800;color:var(--A)">${score} 分</div><div class="res">全班 ${total} 人</div>
  <div class="fb" style="margin:18px 0;text-align:left"><div class="t">搶錯時判斷錯的地方</div>${errList(O.stats?.[Net.uid])}</div>
  <p class="rules">老師可能會再開一局，留在這裡等就好</p><button class="go alt" id="quit">離開房間</button></div>`;
  $('quit').onclick=()=>leaveOnline();return;
 }
 const q=curQ(),qn=O.game.qn,mine=myGrab(),order=orderFor(Net.uid+':'+qn),reveal=st==='reveal',res=O.game.results?.[Net.uid];
 $app.innerHTML=`<div class="bar"><span>第 <b>${qn}</b> / ${O.meta.total} 題</span><span>${esc(me?.name)}・<b style="color:var(--A)">${score}</b> 分</span><button class="x-btn" id="quit">離開</button></div>
 <div class="qbox"><div class="eq">${esc(q.eq)}</div><div class="hint">${S.hint?q.L.hint:''}</div></div>
 <div class="timer" style="margin:8px 12px 0"><i id="sbar"></i></div>
 <div class="gridwrap"><div class="grid" id="grid">${order.map(ci=>{const c=q.cards[ci];let cls='',tag='';
  if(reveal)cls=c.ans?'win':'dim';
  if(mine&&mine.ci===ci){cls+=' mine';if(reveal&&!c.ans)tag=X()}
  return cardHTML(q,ci,{cls,tag})}).join('')}</div>${!reveal&&mine?'<div class="waiting">已出手！<span class="res">等老師公布答案</span></div>':''}</div>
 <div class="fb" id="fb"></div>`;
 let h;
 if(!reveal)h=mine?'<span style="color:var(--muted)">只有一次機會，已經送出囉</span>':`<span style="color:var(--muted)">找出圖形，輕點就搶；長按可以放大</span>`;
 else if(!res)h=`<div class="t bad">這題沒有作答</div>正確答案：${checklist(q)}`;
 else if(res.ok)h=`<div class="t ok">答對了！+${res.pts}${res.first?'（全班最快！）':''}</div>目前第 ${myRank()} 名　${checklist(q)}`;
 else h=`<div class="t bad">搶錯了</div>${wrongText(q,res.ci)}<br>目前第 ${myRank()} 名`;
 $('fb').innerHTML=h;$('quit').onclick=()=>leaveOnline();
 if(!reveal&&!mine)attachGrab($('grid'),grabOnline);
 noticeExtra();studentTick();refit();
}
function noticeExtra(){
 const g=O.game;if(!g||g.state!=='play')return;
 const seen=O.seenExtra&&O.seenExtra.qn===g.qn?O.seenExtra.n:0;
 if((g.extra||0)>seen){if(!myGrab())toast('老師加時 15 秒，慢慢想，不要亂猜！');}
 O.seenExtra={qn:g.qn,n:g.extra||0};
}
function studentTick(){
 if(!O||O.type!=='class'||O.host||!O.game||O.game.state!=='play'||typeof O.game.startAt!=='number')return;
 const left=Math.max(0,O.game.startAt+O.game.limit-Net.now()),b=$('sbar');if(b)b.style.width=(left/O.game.limit*100)+'%';
}

/* ---------- 啟動 ---------- */
(async()=>{
 await Net.init();
 const code=new URLSearchParams(location.search).get('room');
 if(code&&Net.mode)nameScreen('join',code);else home();
})();
}
