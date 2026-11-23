/* 函數歌牌：關卡、出題、牌面 */
(function(){
const R=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const M='−';
const fmt=m=>{const s=m<0?M:'';m=Math.abs(m);if(m===0.5)return s+'½';if(Number.isInteger(m))return s+m;return s+(Math.round(m*100)/100)};
const coefBody=(m,body)=>body===''?fmt(m):m===1?body:fmt(m)+body;
const expr=terms=>{const t=terms.filter(x=>x.c!==0);if(!t.length)return '0';return t.map((x,i)=>{const m=Math.abs(x.c);const s=i===0?(x.c<0?M:''):(x.c<0?' '+M+' ':' + ');return s+coefBody(m,x.body)}).join('')};
const inner=h=>h===0?'x':`(x ${h>0?M:'+'} ${Math.abs(h)})`;
const pt=(x,y)=>`(${fmt(x)}, ${fmt(y)})`;

/* ---------- 關卡定義 ---------- */
const LV={
1:{name:'一次函數',form:'y = ax + b',color:'var(--t1)',
 gen(){return{a:pick([-3,-2,-1,-0.5,0.5,1,2,3]),b:R(-3,3)}},
 f:P=>x=>P.a*x+P.b,
 eq:P=>'y = '+expr([{c:P.a,body:'x'},{c:P.b,body:''}]),
 feats:P=>[{l:'斜率正負',t:P.a>0?'往右上（斜率正）':'往右下（斜率負）'},{l:'陡或緩',t:Math.abs(P.a)>1?'比虛線陡':Math.abs(P.a)<1?'比虛線平緩':'和虛線一樣斜'},{l:'y 截距',t:'y 截距 '+fmt(P.b)}],
 muts(P){const s=Math.sign(P.a),m=Math.abs(P.a);const alts=m>1?[0.5,1]:m<1?[2,1,3]:[2,0.5,3];return[{a:-P.a,b:P.b},{a:P.a,b:-P.b},{a:s*pick(alts),b:P.b},{a:-P.a,b:-P.b},{a:P.a,b:P.b+(P.b>0?-2:2)},{a:s*pick(alts),b:P.b+pick([-1,1])}]},
 hint:'① 往右上還是右下　② 跟虛線比陡或緩　③ y 截距',ok:()=>true},
2:{name:'二次函數・標準式',form:'y = a(x − h)² + k',color:'var(--t2)',
 gen(){return{a:pick([1,-1,2,-2,0.5,-0.5]),h:R(-3,3),k:R(-3,3)}},
 f:P=>x=>P.a*(x-P.h)**2+P.k,
 eq:P=>'y = '+expr([{c:P.a,body:inner(P.h)+'²'},{c:P.k,body:''}]),
 feats:P=>[{l:'開口方向',t:P.a>0?'開口向上':'開口向下'},{l:'頂點左右 (h)',t:'頂點 x = '+fmt(P.h)},{l:'頂點上下 (k)',t:'頂點 y = '+fmt(P.k)}],
 muts:P=>[{a:-P.a,h:P.h,k:P.k},{a:P.a,h:-P.h,k:P.k},{a:P.a,h:P.h,k:-P.k},{a:P.a,h:-P.h,k:-P.k},{a:P.a,h:P.k,k:P.h},{a:-P.a,h:P.h,k:-P.k},{a:P.a,h:P.h+(P.h>0?-2:2),k:P.k},{a:P.a,h:P.h,k:P.k+(P.k>0?-2:2)}],
 hint:'① a 的正負 → 開口　② 頂點 (h, k)，小心 x − h 的正負號',ok:P=>Math.abs(P.h)<=4&&Math.abs(P.k)<=4},
3:{name:'二次函數・一般式',form:'y = ax² + bx + c',color:'var(--t2)',tm:2,
 gen(){for(;;){const a=pick([1,-1,1,-1,2,-2]);const h=Math.abs(a)===2?R(-1,1):R(-3,3);const k=R(-4,4);const c=a*h*h+k;if(Math.abs(c)<=4)return{a,b:-2*a*h,c}}},
 f:P=>x=>P.a*x*x+P.b*x+P.c,
 eq:P=>'y = '+expr([{c:P.a,body:'x²'},{c:P.b,body:'x'},{c:P.c,body:''}]),
 feats:P=>[{l:'開口方向',t:P.a>0?'開口向上':'開口向下'},{l:'y 截距 (c)',t:'y 截距 '+fmt(P.c)},{l:'對稱軸',t:'對稱軸 x = '+fmt(-P.b/(2*P.a))}],
 muts(P){const h=-P.b/(2*P.a);return[{a:-P.a,b:-P.b,c:P.c},{a:P.a,b:-P.b,c:P.c},{a:P.a,b:P.b,c:P.c+pick([-3,-2,2,3])},{a:P.a,b:-2*P.a*(h+pick([-2,-1,1,2])),c:P.c},{a:-P.a,b:-P.b,c:-P.c},{a:-P.a,b:P.b,c:P.c}]},
 hint:'① a → 開口　② c → y 截距　③ 對稱軸 x = −b ÷ 2a',
 ok:P=>{const vx=-P.b/(2*P.a),vy=P.c-P.b*P.b/(4*P.a);return Math.abs(vx)<=4&&Math.abs(vy)<=6&&Number.isInteger(vx)}},
4:{name:'三次函數・基本',form:'y = a(x − h)³ + k',color:'var(--t3)',
 gen(){return{a:pick([1,-1,0.5,-0.5]),h:R(-2,2),k:R(-2,2)}},
 f:P=>x=>P.a*(x-P.h)**3+P.k,
 eq:P=>'y = '+expr([{c:P.a,body:inner(P.h)+'³'},{c:P.k,body:''}]),
 feats:P=>[{l:'走向',t:P.a>0?'左下 → 右上':'左上 → 右下'},{l:'中心左右 (h)',t:'對稱中心 x = '+fmt(P.h)},{l:'中心上下 (k)',t:'對稱中心 y = '+fmt(P.k)}],
 muts:P=>[{a:-P.a,h:P.h,k:P.k},{a:P.a,h:-P.h,k:P.k},{a:P.a,h:P.h,k:-P.k},{a:P.a,h:P.k,k:P.h},{a:-P.a,h:-P.h,k:-P.k},{a:P.a,h:P.h+(P.h>0?-2:2),k:P.k},{a:P.a,h:P.h,k:P.k+(P.k>0?-2:2)}],
 hint:'① a 的正負 → 走向　② 對稱中心 (h, k)',ok:P=>Math.abs(P.h)<=3&&Math.abs(P.k)<=3},
5:{name:'三次函數・魔王',form:'y = a(x − h)³ + p(x − h) + k',color:'var(--t3)',
 gen(){return{a:pick([1,-1,0.5,-0.5]),p:pick([-3,-3,0,3]),h:R(-2,2),k:R(-2,2)}},
 f:P=>x=>P.a*(x-P.h)**3+P.p*(x-P.h)+P.k,
 eq:P=>'y = '+expr([{c:P.a,body:inner(P.h)+'³'},{c:P.p,body:P.h===0?'x':inner(P.h)},{c:P.k,body:''}]),
 feats:P=>[{l:'走向',t:P.a>0?'左下 → 右上':'左上 → 右下'},{l:'峰谷 (a、p)',t:P.p===0?'中心平緩、沒有峰谷':P.a*P.p<0?'有峰有谷':'沒有峰谷，一路到底'},{l:'中心左右 (h)',t:'對稱中心 x = '+fmt(P.h)},{l:'中心上下 (k)',t:'對稱中心 y = '+fmt(P.k)}],
 muts(P){const L=[{a:P.a,p:-P.p,h:P.h,k:P.k},{a:-P.a,p:-P.p,h:P.h,k:P.k},{a:P.a,p:P.h===0?P.p:P.p,h:-P.h,k:P.k},{a:P.a,p:P.p,h:P.h,k:-P.k},{a:-P.a,p:P.p,h:P.h,k:P.k},{a:P.a,p:P.p,h:P.k,k:P.h}];if(P.p!==0)L.unshift({a:P.a,p:0,h:P.h,k:P.k});else L.unshift({a:P.a,p:-3*Math.sign(P.a),h:P.h,k:P.k});return L},
 hint:'① a → 走向　② a、p 異號 → 有峰谷　③ 對稱中心 (h, k)',ok:P=>Math.abs(P.h)<=3&&Math.abs(P.k)<=3}
};
const LEVELS=[1,2,3,4,5,6];
const lvInfo=n=>n===6?{name:'綜合挑戰',form:'五關隨機混合',color:'var(--A)'}:LV[n];

/* ---------- 出題 ---------- */
const XS=[];for(let x=-4.5;x<=4.5;x+=0.5)XS.push(x);
function same(L,P,Q){const f=L.f(P),g=L.f(Q);return XS.every(x=>Math.abs(f(x)-g(x))<0.25)}
function diffs(L,P,Q){const a=L.feats(P),b=L.feats(Q);return a.map((x,i)=>({l:x.l,mine:b[i].t,want:x.t})).filter(d=>d.mine!==d.want)}
function makeQ(n){
 const lv=n===6?R(1,5):n;const L=LV[lv];let P;do{P=L.gen()}while(!L.ok(P));
 const cards=[{P,ans:true}];
 const tryAdd=Q=>{if(cards.length>=6||!L.ok(Q))return;if(cards.some(c=>same(L,c.P,Q)))return;if(!diffs(L,P,Q).length)return;cards.push({P:Q,ans:false})};
 const m=L.muts(P);m.slice(0,3).forEach(tryAdd);shuffle(m.slice(3)).forEach(tryAdd);
 let guard=0;while(cards.length<6&&guard++<400)tryAdd(L.gen());
 cards.forEach(c=>c.d=c.ans?[]:diffs(L,P,c.P));
 return{lv,L,P,cards,eq:L.eq(P),feats:L.feats(P),order:[shuffle([0,1,2,3,4,5]),shuffle([0,1,2,3,4,5])]};
}

/* 線上用：把題目轉成可存進資料庫的資料，再還原 */
function pack(q){return{lv:q.lv,cards:q.cards.map(c=>({P:c.P,ans:!!c.ans}))}}
function unpack(d){const L=LV[d.lv],P=d.cards.find(c=>c.ans).P;const cards=d.cards.map(c=>({P:c.P,ans:!!c.ans,d:c.ans?[]:diffs(L,P,c.P)}));return{lv:d.lv,L,P,cards,eq:L.eq(P),feats:L.feats(P)}}
/* 依種子洗牌：每位玩家看到的牌位置不同 */
function seeded(str){let h=2166136261;for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h=Math.imul(h^(h>>>15),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return(h>>>0)/4294967296}}
function orderFor(key){const r=seeded(key),a=[0,1,2,3,4,5];for(let i=5;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

/* 牌面：線條加粗、數字放大 */
function cardSVG(lv,P,ref){
 const L=LV[lv],f=L.f(P),col=lv===1?'#178066':lv<=3?'#2160cf':'#d24a20';
 let s='<svg viewBox="-5.6 -5.6 11.2 11.2" aria-hidden="true">';
 for(let i=-5;i<=5;i++){if(!i)continue;const w=i%2?'.045':'.07';s+=`<line x1="${i}" y1="-5.6" x2="${i}" y2="5.6" stroke="#d6cfb8" stroke-width="${w}"/><line x1="-5.6" y1="${i}" x2="5.6" y2="${i}" stroke="#d6cfb8" stroke-width="${w}"/>`}
 s+='<line x1="-5.6" y1="0" x2="5.6" y2="0" stroke="#3f3b31" stroke-width=".12"/><line x1="0" y1="-5.6" x2="0" y2="5.6" stroke="#3f3b31" stroke-width=".12"/>';
 for(const v of[-4,-2,2,4]){const t=v<0?M+(-v):v;s+=`<text x="${v}" y="1.3" font-size="1.3" font-weight="700" text-anchor="middle" fill="#5f594a" font-family="sans-serif" paint-order="stroke" stroke="#fbf7ec" stroke-width=".35">${t}</text><text x="-.3" y="${-v+.45}" font-size="1.3" font-weight="700" text-anchor="end" fill="#5f594a" font-family="sans-serif" paint-order="stroke" stroke="#fbf7ec" stroke-width=".35">${t}</text>`}
 if(ref&&lv===1)s+='<line x1="-5.6" y1="5.6" x2="5.6" y2="-5.6" stroke="#9a937e" stroke-width=".14" stroke-dasharray=".45 .3"/><line x1="-5.6" y1="-5.6" x2="5.6" y2="5.6" stroke="#9a937e" stroke-width=".14" stroke-dasharray=".45 .3"/>';
 let d='';for(let x=-5.6;x<=5.61;x+=0.04){let y=f(x);y=Math.max(-40,Math.min(40,y));d+=(d?'L':'M')+x.toFixed(2)+' '+(-y).toFixed(2)}
 s+=`<path d="${d}" fill="none" stroke="${col}" stroke-width=".36" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
 return s;
}

window.K={R,pick,shuffle,LV,LEVELS,lvInfo,makeQ,pack,unpack,orderFor,cardSVG,fmt};
})();
