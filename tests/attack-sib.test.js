// (11/24 · 멜로다인 Attack Speed · Sibilant Range) 보정창 '어택' 칸 · 🌬 창 '이 구간 = ㅅ·ㅊ/숨/아님'
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), A = fs.readFileSync(__dirname + "/../adv.js", "utf8");
assert.ok(T.includes('<i data-slot="gain"></i><i data-slot="atk"></i>') && T.includes('put_("atk", sc("어택", P(b, "attack"), { step: 0.25, min: -1, max: 1, def: 0, vert: true'), "어택 칸(게인 옆)");
assert.ok(A.includes("formant: 0, attack: 0 };") && A.includes("attack: (v) =>"), "기본값·아이콘");
assert.ok(A.includes('<button type="button" data-mk="s">= ㅅ·ㅊ</button>') && A.includes("const g = A.ne.global, L = (g.uv_fix || []).filter(f => f.t1 <= a || f.t0 >= b); L.push({ t0: r2(a), t1: r2(b), kind: k });"), "치찰음 경계");
console.log("attack-sib ok");
