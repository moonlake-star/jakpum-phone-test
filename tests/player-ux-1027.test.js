// 2026-10-27 사용자 요청: 처음·끝 글자 없이 아이콘만 / 클립 시간은 '듣기'와 '메이크업' 사이 / 재생바는 아래로 펼침 / 이어 듣기에도 재생바
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const tpHTML = new Function(src.match(/function tpHTML\([\s\S]*?\n\}\n/)[0] + "; return tpHTML;")();
for (const h of [tpHTML(), tpHTML(true, false), tpHTML(false)]) {
  const labels = [...h.matchAll(/data-tp="[a-z]+"[^>]*>([^<]*)</g)].map(m => m[1]);
  assert.deepStrictEqual(labels, ["⏮", "-5", "▶", "+5", "⏭"], labels);          // 글자 '처음'·'끝' 없음
}
assert.ok(!tpHTML(true, false).includes("tpTime"));                           // 카드용은 시간 줄을 따로
const card = src.match(/<button class="small ghost" data-tpopen=[\s\S]*?\$\{mkButton\(c\.id\)\}/)[0];
assert.ok(/data-tpopen[\s\S]*tpTimeMid[\s\S]*mkButton/.test(card), "시간이 듣기와 메이크업 사이");
assert.ok(/\.tpslot \{[^}]*transition:max-height/.test(src) && /\.tpslot\.open \{/.test(src), "펼침 애니메이션");
assert.ok(["prev", "-5", "+5", "next"].every(k => src.includes(`data-mini="${k}"`)) && /id="miniSeek"/.test(src), "이어 듣기도 아래 고정 플레이어(⏮ -5 ▶ +5 ⏭ + 재생바)");
console.log("player-ux-1027 ok");
