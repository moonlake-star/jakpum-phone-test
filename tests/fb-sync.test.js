// 보내기로 고른 하이라이트가 바뀌면 카톡 문구 '좋았던 부분'만 다시 맞춤(2026-10-28 사용자) — 다른 문단은 그대로
const fs=require('fs'),assert=require('assert');
const src=fs.readFileSync(__dirname + '/../teacher/index.html','utf8');
const code=src.match(/function goodLines[\s\S]*?\nfunction draftCheck/)[0].replace(/\nfunction draftCheck$/,'');
let fbv="홍길동님, 오늘 레슨 수고 많으셨어요!\n\n오늘 특히 좋았던 부분 보내드려요.\n· 8:24 '오' 발음\n· 11:16 언젠가는\n· 15:24 마지막\n\n오늘 중요한 포인트\n· 복압\n\n이번 주 연습\n· 천천히";
const el={get value(){return fbv},set value(v){fbv=v}};
const sent=[{id:"C004",start:760,note:"숨 표현"},{id:"C001",start:439,note:""}];
const f=new Function('$','cur','sendList','fmt','updateFeedbackDraft','toast','hlList',code+';return syncGood;');
const sg=f(()=>el,{review:{notes:{}}},()=>sent,(t)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`,(v)=>{fbv=v},()=>{},[{cand:"C004",start:767.3}]);
sg();
assert(fbv.includes("· 12:47 숨 표현") && fbv.includes("· 7:19 부근") && !fbv.includes("8:24") && fbv.includes("오늘 중요한 포인트\n· 복압"));
sent.length=0; sg(); assert(!fbv.includes("좋았던 부분") && fbv.includes("수고 많으셨어요!\n\n오늘 중요한")); console.log("fb-sync ok");
