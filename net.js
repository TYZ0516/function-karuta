/* 函數歌牌：連線層
   - 有填 config.js 的 Firebase 設定 → 用 Firebase 即時資料庫（匿名登入）
   - 網址加 ?mock=1 → 本機測試模式：同一台電腦、同一個瀏覽器開多個分頁就能模擬多人
   - 都沒有 → 只能玩離線模式 */
(function(){
const TS={'.sv':'timestamp'};
const split=p=>p.split('/').filter(Boolean);
const Net={mode:null,uid:null,offset:0,TS};

function loadScript(src){return new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>bad(new Error('無法載入 '+src));document.head.appendChild(s)})}

/* ---------- Firebase ---------- */
async function initFirebase(cfg){
 const V='10.12.2',B=`https://www.gstatic.com/firebasejs/${V}/`;
 await loadScript(B+'firebase-app-compat.js');
 await Promise.all([loadScript(B+'firebase-auth-compat.js'),loadScript(B+'firebase-database-compat.js')]);
 firebase.initializeApp(cfg);
 const cred=await firebase.auth().signInAnonymously();
 const db=firebase.database();
 Net.uid=cred.user.uid;
 db.ref('.info/serverTimeOffset').on('value',s=>Net.offset=s.val()||0);
 Net.get=async p=>(await db.ref(p).get()).val();
 Net.set=(p,v)=>db.ref(p).set(v);
 Net.update=(p,v)=>db.ref(p).update(v);
 Net.remove=p=>db.ref(p).remove();
 Net.on=(p,cb)=>{const r=db.ref(p),h=s=>cb(s.val());r.on('value',h);return()=>r.off('value',h)};
 Net.onDisconnectRemove=p=>db.ref(p).onDisconnect().remove();
 Net.mode='firebase';
}

/* ---------- 本機測試 ---------- */
function initMock(){
 const KEY='karuta-mockdb',bc=new BroadcastChannel('karuta-mockdb');
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}}};
 let uid=sessionStorage.getItem('karuta-mock-uid');
 if(!uid){uid='u'+Math.random().toString(36).slice(2,10);sessionStorage.setItem('karuta-mock-uid',uid)}
 Net.uid=uid;
 const listeners=new Set();
 const read=(tree,p)=>{let n=tree;for(const k of split(p)){if(n==null||typeof n!=='object')return null;n=n[k]}return n===undefined?null:n};
 const fixTS=v=>{if(v&&typeof v==='object'){if(v['.sv']==='timestamp')return Date.now();const o=Array.isArray(v)?[]:{};for(const k in v){const x=fixTS(v[k]);if(x!==null&&x!==undefined)o[k]=x}return o}return v};
 const write=(p,v)=>{const tree=load(),ks=split(p);let n=tree;for(let i=0;i<ks.length-1;i++){if(typeof n[ks[i]]!=='object'||n[ks[i]]===null)n[ks[i]]={};n=n[ks[i]]}const last=ks[ks.length-1];v=fixTS(v);if(v===null||v===undefined)delete n[last];else n[last]=v;localStorage.setItem(KEY,JSON.stringify(tree));notify();bc.postMessage(1)};
 const notify=()=>{const tree=load();listeners.forEach(l=>{const v=read(tree,l.p),j=JSON.stringify(v);if(j!==l.last){l.last=j;l.cb(v===null?null:JSON.parse(j))}})};
 bc.onmessage=notify;
 Net.get=async p=>read(load(),p);
 Net.set=async(p,v)=>write(p,v);
 Net.update=async(p,o)=>{for(const k in o)write(p+'/'+k,o[k])};
 Net.remove=async p=>write(p,null);
 Net.on=(p,cb)=>{const l={p,cb,last:undefined};listeners.add(l);setTimeout(notify,0);return()=>listeners.delete(l)};
 Net.onDisconnectRemove=()=>{};
 Net.mode='mock';
}

Net.init=async function(){
 const q=new URLSearchParams(location.search);
 if(q.has('mock')){initMock();return}
 const cfg=window.FIREBASE_CONFIG;
 if(cfg&&cfg.apiKey&&!/貼上|YOUR/.test(cfg.apiKey)){
  try{await initFirebase(cfg)}catch(e){console.error(e);Net.error=e.message||String(e)}
 }
};
Net.now=()=>Date.now()+Net.offset;
window.Net=Net;
})();
