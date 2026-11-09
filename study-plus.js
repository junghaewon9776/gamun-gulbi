// ============================================================================
// 📚 받아쓰기 앱 더하기 (2026-11-03) — dictation.html 본문 스크립트 다음, dict-cloud.js 앞에 붙음
//   ① 🔢 수학 3~6학년: 나눗셈(나머지)·큰 곱셈·분수·소수·혼합계산·약수배수·비율·비례식
//   ② 🈶 한자: 급수별(9급 처음 → 8급 → 7급Ⅱ → 7급 → 6급Ⅱ → 6급 → 준4급) 보기·뜻 고르기·한자 찾기·쓰기·시험
//      + ✍️ 내 이름 한자 쓰기 (NAME_HANJA — 부모님이 알려 준 한자)
//   ③ 🔤 영어: 학년별 단어 보기·뜻 고르기·철자 쓰기·시험
//   기록 키: 수학 "수·{id}" (기존) / 한자 "漢·{id}" / 영어 "英·{id}" — DB.rec 에 같이 쌓여서 서버·👦 아이들 탭에도 그대로 나옴
// ============================================================================

// ── 내 이름 한자 (부모님이 알려 주면 여기에) — [한자, "뜻 소리"] ──
var NAME_HANJA = {
  // "다원": [["鄭","나라 정"],["多","많을 다"],["元","으뜸 원"]],
};

// ───────────────────────── ① 🔢 수학 더하기 ─────────────────────────
function _gcd(a, b){ a = Math.abs(a); b = Math.abs(b); while(b){ var t = a % b; a = b; b = t; } return a || 1; }
function _fr(n, d){ var g = _gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + "/" + d; }
function _dec(x){ return String(Math.round(x * 1000) / 1000); }
function _pick(a){ return a[RN(0, a.length - 1)]; }
// 나눗셈
function genDiv1(){ var d = RN(2, 9), q = RN(2, 9); return MP((d * q) + " ÷ " + d, q); }
function genDiv21r(){ var d = RN(2, 9), a = RN(10, 99), q = Math.floor(a / d), r = a % d; return MP(a + " ÷ " + d, r ? q + "…" + r : q); }
function genDiv31(){ var d = RN(2, 9), q = RN(Math.ceil(100 / d), Math.floor(999 / d)); return MP((d * q) + " ÷ " + d, q); }
function genDiv31r(){ var d = RN(2, 9), a = RN(100, 999), q = Math.floor(a / d), r = a % d; return MP(a + " ÷ " + d, r ? q + "…" + r : q); }
function genDiv32(){ var d = RN(11, 49), q = RN(Math.max(3, Math.ceil(100 / d)), Math.floor(999 / d)); return MP((d * q) + " ÷ " + d, q); }
function genDiv32r(){ var d = RN(11, 49), a = RN(Math.max(100, d * 3), 999), q = Math.floor(a / d), r = a % d; return MP(a + " ÷ " + d, r ? q + "…" + r : q); }
function genMul32(){ var a = RN(101, 999), b = RN(11, 99); return MP(a + " × " + b, a * b); }
// 분수·소수 (4학년)
function genFAdd1(){ var d = RN(3, 12), a = RN(1, d - 1), b = RN(1, d - 1); return MP(a + "/" + d + " + " + b + "/" + d, (a + b) + "/" + d); }
function genFSub1(){ var d = RN(3, 12), a = RN(2, d - 1), b = RN(1, a - 1); return MP(a + "/" + d + " − " + b + "/" + d, (a - b) + "/" + d); }
function genDAdd(){ var a = RN(1, 99) / 10, b = RN(1, 99) / 10; return MP(_dec(a) + " + " + _dec(b), _dec(a + b)); }
function genDSub(){ var a = RN(20, 99) / 10, b = RN(1, Math.round(a * 10) - 1) / 10; return MP(_dec(a) + " − " + _dec(b), _dec(a - b)); }
function genDAdd2(){ var a = RN(101, 999) / 100, b = RN(11, 99) / 100; return MP(_dec(a) + " + " + _dec(b), _dec(a + b)); }
// 5학년
function genMix(){
  var t = RN(0, 3), a = RN(2, 20), b = RN(2, 9), c = RN(2, 9);
  if(t === 0) return MP(a + " + " + b + " × " + c, a + b * c);
  if(t === 1) return MP("(" + a + " + " + b + ") × " + c, (a + b) * c);
  if(t === 2){ var p = b * c; return MP(a + p + " − " + p + " ÷ " + c, a + p - b); }
  return MP(a + b * c + " − " + b + " × " + c, a);
}
function genGcd(){ var g = _pick([2, 3, 4, 5, 6, 7, 8, 9, 12]), x = RN(1, 6), y = RN(1, 6); while(_gcd(x, y) !== 1 || x === y) { x = RN(1, 6); y = RN(1, 6); } return MP((g * x) + "와 " + (g * y) + "의 최대공약수", g); }
function genLcm(){ var a = RN(2, 12), b = RN(2, 12); while(a === b) b = RN(2, 12); return MP(a + "와 " + b + "의 최소공배수", a * b / _gcd(a, b)); }
function genReduce(){ var n = RN(1, 9), d = RN(n + 1, 12); while(_gcd(n, d) !== 1) { n = RN(1, 9); d = RN(n + 1, 12); } var k = RN(2, 6); var o = MP((n * k) + "/" + (d * k) + " 을 약분하면", n + "/" + d); o.eq = "str"; return o; }
function genFAdd2(){ var D = [2, 3, 4, 5, 6, 8, 10, 12], a = _pick(D), b = _pick(D); while(a === b) b = _pick(D); var x = RN(1, a - 1), y = RN(1, b - 1); return MP(x + "/" + a + " + " + y + "/" + b, _fr(x * b + y * a, a * b)); }
function genFSub2(){ var D = [2, 3, 4, 5, 6, 8, 10, 12], a = _pick(D), b = _pick(D); while(a === b) b = _pick(D); var x = RN(1, a - 1), y = RN(1, b - 1); if(x / a < y / b){ var t = a; a = b; b = t; t = x; x = y; y = t; } return MP(x + "/" + a + " − " + y + "/" + b, _fr(x * b - y * a, a * b)); }
function genFMul(){ var d = RN(2, 12), n = RN(1, d - 1), k = RN(2, 9); return MP(n + "/" + d + " × " + k, _fr(n * k, d)); }
function genDMul(){ var a = RN(11, 99) / 10, k = RN(2, 9); return MP(_dec(a) + " × " + k, _dec(a * k)); }
// 6학년
function genFDiv(){ var d = RN(2, 9), n = RN(1, 9), k = RN(2, 6); return MP(n + "/" + d + " ÷ " + k, _fr(n, d * k)); }
function genDDiv(){ var q = RN(11, 99) / 10, k = RN(2, 9); return MP(_dec(q * k) + " ÷ " + k, _dec(q)); }
function genPct(){ var b = _pick([20, 40, 50, 60, 80, 100, 200, 300, 400, 500]), p = _pick([10, 20, 25, 50, 75]); if(b * p % 100) p = 50; return MP(b + "의 " + p + "%는", b * p / 100); }
function genProp(){ var a = RN(2, 9), b = RN(2, 9), k = RN(2, 6); return MP(a + " : " + b + " = " + (a * k) + " : □", b * k); }
function genFDivF(){ var a = RN(2, 9), b = RN(1, a - 1), c = RN(2, 9), d = RN(1, c - 1); return MP(b + "/" + a + " ÷ " + d + "/" + c, _fr(b * c, a * d)); }

var MATH_GRP = [
  ["➕➖ 덧셈·뺄셈 (1~3학년)", function(x){ return "asm".indexOf(x.id[0]) >= 0 && !x.grp; }],
  ["✖️ 구구단 (2학년)", function(x){ return x.id[0] === "g"; }],
  ["✖️ 곱셈 (3~4학년)", function(x){ return x.id[0] === "x"; }],
  ["➗ 나눗셈 (3~4학년)", function(x){ return x.grp === "div"; }],
  ["🍕 분수·소수 (3~4학년)", function(x){ return x.grp === "fd4"; }],
  ["🧮 5학년", function(x){ return x.grp === "g5"; }],
  ["🧮 6학년", function(x){ return x.grp === "g6"; }]
];
var KEY_R = "…", KEY_F = "/", KEY_D = ".";
[
  { id:"v1",  grp:"div", t:"나눗셈 (구구단 거꾸로)", d:"56 ÷ 7", gen:genDiv1 },
  { id:"v21r",grp:"div", t:"두 자리 ÷ 한 자리 (나머지)", d:"47 ÷ 5 = 9…2", gen:genDiv21r, keys:[KEY_R] },
  { id:"v31", grp:"div", t:"세 자리 ÷ 한 자리", d:"672 ÷ 4", gen:genDiv31 },
  { id:"v31r",grp:"div", t:"세 자리 ÷ 한 자리 (나머지)", d:"523 ÷ 6 = 87…1", gen:genDiv31r, keys:[KEY_R] },
  { id:"x32", grp:null,  t:"곱셈 세 자리 × 두 자리", d:"235 × 43", gen:genMul32 },
  { id:"v32", grp:"div", t:"세 자리 ÷ 두 자리", d:"864 ÷ 24", gen:genDiv32 },
  { id:"v32r",grp:"div", t:"세 자리 ÷ 두 자리 (나머지)", d:"500 ÷ 23 = 21…17", gen:genDiv32r, keys:[KEY_R] },
  { id:"f4a", grp:"fd4", t:"분모가 같은 분수 덧셈", d:"2/7 + 3/7", gen:genFAdd1, keys:[KEY_F] },
  { id:"f4s", grp:"fd4", t:"분모가 같은 분수 뺄셈", d:"5/8 − 2/8", gen:genFSub1, keys:[KEY_F] },
  { id:"c4a", grp:"fd4", t:"소수 덧셈 (0.1)", d:"1.4 + 2.7", gen:genDAdd, keys:[KEY_D] },
  { id:"c4s", grp:"fd4", t:"소수 뺄셈 (0.1)", d:"5.2 − 1.8", gen:genDSub, keys:[KEY_D] },
  { id:"c4b", grp:"fd4", t:"소수 덧셈 (0.01)", d:"3.45 + 0.68", gen:genDAdd2, keys:[KEY_D] },
  { id:"k5m", grp:"g5",  t:"혼합 계산 (곱셈 먼저·괄호)", d:"(4 + 5) × 3", gen:genMix },
  { id:"k5g", grp:"g5",  t:"최대공약수", d:"12와 18 → 6", gen:genGcd },
  { id:"k5l", grp:"g5",  t:"최소공배수", d:"4와 6 → 12", gen:genLcm },
  { id:"k5r", grp:"g5",  t:"약분 (기약분수로)", d:"6/8 → 3/4", gen:genReduce, keys:[KEY_F] },
  { id:"k5a", grp:"g5",  t:"분모가 다른 분수 덧셈", d:"1/2 + 1/3", gen:genFAdd2, keys:[KEY_F] },
  { id:"k5s", grp:"g5",  t:"분모가 다른 분수 뺄셈", d:"3/4 − 1/6", gen:genFSub2, keys:[KEY_F] },
  { id:"k5x", grp:"g5",  t:"분수 × 자연수", d:"2/5 × 3", gen:genFMul, keys:[KEY_F] },
  { id:"k5d", grp:"g5",  t:"소수 × 자연수", d:"2.4 × 3", gen:genDMul, keys:[KEY_D] },
  { id:"k6f", grp:"g6",  t:"분수 ÷ 자연수", d:"3/4 ÷ 3", gen:genFDiv, keys:[KEY_F] },
  { id:"k6F", grp:"g6",  t:"분수 ÷ 분수", d:"2/3 ÷ 1/4", gen:genFDivF, keys:[KEY_F] },
  { id:"k6d", grp:"g6",  t:"소수 ÷ 자연수", d:"4.8 ÷ 4", gen:genDDiv, keys:[KEY_D] },
  { id:"k6p", grp:"g6",  t:"백분율 (%)", d:"200의 25% → 50", gen:genPct },
  { id:"k6r", grp:"g6",  t:"비례식", d:"3 : 4 = 9 : □", gen:genProp }
].forEach(function(x){ MATH.push(x); });
MREC["다원"] = (MREC["다원"] || []).concat(["v1", "v21r", "v31", "v31r"]);

// 답 맞추기: 나머지(…)는 글자 그대로, 분수·소수는 값이 같으면 정답 (약분 문제는 기약분수만)
function _ratio(s){
  s = String(s).trim(); if(!s || s.indexOf("…") >= 0) return null;
  if(s.indexOf("/") >= 0){ var p = s.split("/"); if(p.length !== 2 || p[0] === "" || p[1] === "" || Number(p[1]) === 0) return null; return Number(p[0]) / Number(p[1]); }
  var v = Number(s); return isNaN(v) ? null : v;
}
function mEq(inp, q){
  var a = String(q.a), s = String(inp).trim();
  if(q.eq === "str" || a.indexOf("…") >= 0) return s === a;
  var x = _ratio(s), y = _ratio(a);
  return x != null && y != null && Math.abs(x - y) < 1e-9;
}
// 문제 화면: □ 있는 문제는 "=" 안 붙임
mShow = function(){ var q = MQ.cur.q; $("mqQ").textContent = /□|의 |하면/.test(q) ? q + (/□/.test(q) ? "" : " ?") : q + " ="; $("mqQ").style.fontSize = q.length > 14 ? "34px" : "52px"; $("mqAns").textContent = MQ.input || " "; $("mqFb").textContent = ""; mInfo(); };
// 숫자판에 나머지(…)·분수(/)·소수(.) 단추 더하기
var _mStart0 = mStart;
mStart = function(mode){
  _mStart0(mode);
  var ks = (MQ && MQ.x && MQ.x.keys) || [];
  if(ks.length){
    var lab = { "…": "나머지 …", "/": "분수 /", ".": "소수점 ." };
    $("mqPad").innerHTML += ks.map(function(k){ return '<button style="grid-column:1/-1;background:#0e7490;font-size:24px;padding:12px 0" onclick="mKey_(\'' + k + '\')">' + lab[k] + '</button>'; }).join("");
    $("mqFb").innerHTML = '<span style="font-size:15px;color:#64748b">' + ({ "…": "나머지가 있으면 몫 → 「나머지 …」 → 나머지 순서로 눌러요", "/": "분수는 분자 → 「분수 /」 → 분모 순서로 (예: 3/4)", ".": "소수점은 「소수점 .」 단추로" }[ks[0]]) + '</span>';
  }
};
var _mKey0 = mKey_;
mKey_ = function(k){
  if(!MQ || MQ.busy) return;
  if(k === "…" || k === "/" || k === "."){ if(MQ.input.length < 9 && MQ.input.indexOf(k) < 0){ MQ.input += k; $("mqAns").textContent = MQ.input; } return; }
  if(/^[0-9]$/.test(k) && MQ.input.length >= 6){ if(MQ.input.length < 9){ MQ.input += k; $("mqAns").textContent = MQ.input; } return; }
  _mKey0(k);
};
document.addEventListener("keydown", function(e){
  if(!MQ || $("vMQuiz").classList.contains("hidden")) return;
  if(e.key === "." || e.key === "/") mKey_(e.key);
});
// 급 고르기 화면 — 학년별 묶음
mRenderLevels = function(){
  $("mWho").textContent = whoLabel(ME); $("mRankBox").innerHTML = rankCard(ME);
  var rec = MREC[ME] || [], cols = { a:"#15803d", s:"#b45309", m:"#0e7490", g:"#6d28d9", x:"#be123c", d:"#6d28d9", v:"#0369a1", f:"#c2410c", c:"#a16207", k:"#4338ca" };
  var tile = function(x){
    var k = "수·" + x.id, b = best(ME, k), sp = ((DB.speed || {})[ME] || {})[x.id], st = stepsOf(ME, k);
    var badge = b == null ? "" : (b >= passScore() ? '<span class="badge">✅ ' + b + '점</span>' : '<span class="badge no">' + b + '점</span>');
    var dots = (x.dans ? (st.s1 ? "●" : "○") : "") + (st.s2 ? "●" : "○") + (st.s3 ? "●" : "○") + (b != null && b >= passScore() ? "●" : "○");
    return '<button class="lv" style="background:' + (cols[x.id[0]] || "#1d4ed8") + (rec.indexOf(x.id) >= 0 ? ';outline:4px solid #facc15;outline-offset:1px' : '') + '" onclick="mPick(\'' + x.id + '\')">' + badge + (rec.indexOf(x.id) >= 0 ? '👍 ' : '') + esc(x.t) + '<small>예) ' + esc(x.d) + (sp ? ' · ⚡' + sp + '개' : '') + '</small><span class="dots">' + dots + '</span></button>';
  };
  $("mLevels").innerHTML = MATH_GRP.map(function(gp){
    var L = MATH.filter(function(x){ return !x.dan && gp[1](x); }); if(!L.length) return "";
    return '<div style="font-weight:800;margin:12px 0 6px">' + gp[0] + '</div><div class="grid g2">' + L.map(tile).join("") + '</div>';
  }).join("");
  $("mDans").innerHTML = MATH.filter(function(x){ return x.dan; }).map(function(x){ var b = best(ME, "수·" + x.id);
    return '<button style="background:#6d28d9;font-size:20px;padding:14px 4px" onclick="mPick(\'' + x.id + '\')">' + x.dans[0] + '단' + (b != null && b >= passScore() ? ' ✅' : '') + '</button>'; }).join("");
};
// "곱셈 세 자리 × 두 자리"는 곱셈 묶음에 (id 가 x 로 시작)

// ───────────────────────── ②③ 🈶 한자 · 🔤 영어 ─────────────────────────
var HAN_GRADES = [["9", "9급 (처음 한자)", 10], ["8", "8급", 10], ["7.5", "7급Ⅱ", 10], ["7", "7급", 10], ["6.5", "6급Ⅱ", 15], ["6", "6급", 15], ["4.5", "준4급", 25]];
var ENG_GRADES = [["p", 10], ["0", 10], ["3", 10], ["4", 10], ["5", 10], ["6", 10]];
var CIRC = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
function _circ(i){ return i < CIRC.length ? CIRC[i] : "(" + (i + 1) + ")"; }
var WSL = { han: [], eng: [] };
(function(){
  if(typeof HANJA !== "undefined") HAN_GRADES.forEach(function(g){
    var L = HANJA[g[0]] || [], n = g[2];
    for(var i = 0; i * n < L.length; i++) WSL.han.push({ id: "h" + g[0] + "-" + (i + 1), grade: g[0], gname: g[1], t: g[1] + " " + _circ(i), items: L.slice(i * n, i * n + n).map(function(r){ return { q: r[0], a: r[1] }; }) });
  });
  if(typeof ENGLISH !== "undefined") ENG_GRADES.forEach(function(g){
    var E = ENGLISH[g[0]]; if(!E) return; var L = E.w, n = g[1];
    for(var i = 0; i * n < L.length; i++) WSL.eng.push({ id: "e" + g[0] + "-" + (i + 1), grade: g[0], gname: E.t, t: E.t + " " + _circ(i), items: L.slice(i * n, i * n + n).map(function(r){ return { q: r[0], a: r[1], kr: r[2] || "" }; }) });
  });
  // 🏆 급 전체 — 단계가 여러 개인 급은 그 급 전부를 한 번에 (시험도 전부)
  ["han", "eng"].forEach(function(sub){
    var out = [], seen = {};
    WSL[sub].forEach(function(x){
      out.push(x);
      var same = WSL[sub].filter(function(y){ return y.grade === x.grade; });
      if(same.length > 1 && x === same[same.length - 1] && !seen[x.grade]){
        seen[x.grade] = 1;
        var all = []; same.forEach(function(y){ all = all.concat(y.items); });
        out.push({ id: x.id.charAt(0) + x.grade + "-all", grade: x.grade, gname: x.gname, t: "🏆 " + x.gname + " 전체 (" + all.length + ")", items: all, whole: true });
      }
    });
    WSL[sub] = out;
  });
})();
var WS_SUB = { han: { icon: "🈶", name: "한자", pre: "漢·", col: "#9a3412", rec: { "다원": ["8", "7.5"], "라온": ["9", "8"], "은우": ["9"] } },
               eng: { icon: "🔤", name: "영어", pre: "英·", col: "#0f766e", rec: { "다원": ["p", "3"], "라온": ["p", "0"], "은우": ["p", "0"] } } };
var WS = { sub: "han", lv: null };
function wsLv(id){ var s = id.charAt(0) === "h" ? "han" : "eng"; return WSL[s].filter(function(x){ return x.id === id; })[0]; }
function wsKey(){ return WS_SUB[WS.sub].pre + WS.lv.id; }

// 소리: 한자는 "날 일" 한국어로, 영어는 영어 목소리로
function speakEn(text, rate){
  return new Promise(function(res){
    if(!synth){ res(); return; }
    var u = new SpeechSynthesisUtterance(String(text)); u.lang = "en-US"; u.rate = rate || 0.8;
    var v = (voices || []).filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf("en") === 0; })[0]; if(v) u.voice = v;
    var done = false, fin = function(){ if(!done){ done = true; res(); } };
    u.onend = fin; u.onerror = fin; setTimeout(fin, 10000); synth.speak(u);
  });
}
function wsSay(it){ stopAll(); if(WS.sub !== "han" && it.kr && typeof abcBlend === "function") return speak(abcBlend(it.q).split("·").join(", "), 0.8).then(function(){ return wait(250); }).then(function(){ return speakEn(it.q); }).then(function(){ return wait(250); }).then(function(){ return speak(it.a, 0.9); });
  return WS.sub === "han" ? speak(it.a, 0.85) : speakEn(it.q).then(function(){ return wait(250); }).then(function(){ return speak(it.a, 0.9); }); }

// 화면 만들기 (본문에 섹션 더하기)
(function(){
  var css = document.createElement("style");
  css.textContent = ".hz{font-family:'Batang','바탕','Noto Serif KR','Noto Serif CJK KR',serif}"
    + ".wcard{background:#fff7ed;border:3px solid #fed7aa;border-radius:14px;padding:10px 6px;text-align:center;cursor:pointer}"
    + ".wcard .big{font-size:54px;line-height:1.15;font-weight:700;color:#7c2d12;display:block}"
    + ".wcard.en{background:#f0fdfa;border-color:#99f6e4}.wcard.en .big{font-size:26px;color:#0f766e;padding:10px 0}"
    + ".wcard .m{font-size:17px;font-weight:800;color:#334155}.wcover .wcard .m{color:transparent;background:#e2e8f0;border-radius:6px}"
    + ".wopt{font-size:22px;padding:16px 8px;background:#334155}.wopt.hz{font-size:40px}"
    + "#wqQ{text-align:center;font-weight:900;margin:14px 0 6px}";
  document.head.appendChild(css);
  var W = document.querySelector(".wrap") || document.body, before = document.getElementById("vSet");
  var html = ''
    + '<section id="vWs" class="hidden"><div class="row" style="margin-bottom:10px"><button class="back" onclick="go(\'vName\')">◀ 이름</button><div class="who"><b id="wsWho"></b></div></div><div id="wsRankBox"></div>'
    + '<div class="card"><div class="row" style="margin-bottom:12px" id="wsSubRow"></div><div id="wsName"></div><h2 id="wsH"></h2><div id="wsLevels"></div></div>'
    + '<div class="row"><button class="b-dark" onclick="go(\'vMine\')">📈 내 기록</button><button class="b-army" onclick="go(\'vRanks\')">🎖 계급표</button></div></section>'
    + '<section id="vWsMode" class="hidden"><div class="card"><div class="row" style="margin-bottom:12px"><button class="back" onclick="go(\'vWs\')">◀ 단계</button><div class="who"><b id="wsModeTitle"></b></div></div><div id="wsSteps"></div><div class="hint" id="wsModeHint"></div></div></section>'
    + '<section id="vWsCard" class="hidden"><div class="card"><div class="row" style="margin-bottom:8px"><button class="back" onclick="stopAll();go(\'vWsMode\')">◀ 단계</button><div class="who"><b id="wcTitle"></b></div></div>'
    + '<div class="row" style="margin-bottom:6px"><button class="b-ok" onclick="wsReadAll()">🔊 다 읽어주기</button><button class="b-dark" id="wcCoverBtn" onclick="wsCover()">🙈 뜻 가리기</button></div><div class="hint">카드를 누르면 읽어 줘요. 「다 읽어주기」를 끝까지 들으면 ① 완료!</div><div class="grid g3" id="wcList" style="margin-top:10px"></div>'
    + '<button class="big" style="margin-top:12px" onclick="stopAll();wsStart(\'prac\')">✏️ ② 연습하러 가기 ▶</button></div></section>'
    + '<section id="vWsQuiz" class="hidden"><div class="card"><div class="row" style="margin-bottom:6px"><button class="back" onclick="wsQuit()">■ 그만</button><div class="who"><b id="wqTitle"></b></div></div>'
    + '<div class="num"><span id="wqInfo"></span></div><div class="bar"><i id="wqBar"></i></div><div id="wqAsk" style="text-align:center;color:#64748b;font-size:16px;margin-top:10px"></div><div id="wqQ"></div>'
    + '<div id="wqType" class="hidden"><input id="wqIn" class="ans" autocomplete="off" autocapitalize="off" spellcheck="false" onkeydown="if(event.key===\'Enter\')wsTyped()"><div class="row" style="margin-top:8px"><button class="b-dark" onclick="wsSay(WQ.cur)">🔊 다시 듣기</button><button class="b-ok" onclick="wsTyped()">✔ 확인</button></div></div>'
    + '<div class="grid g2" id="wqOpts" style="margin-top:10px"></div><div class="feedback" id="wqFb"></div></div></section>'
    + '<section id="vWsWrite" class="hidden"><div class="card"><div class="row" style="margin-bottom:6px"><button class="back" onclick="stopAll();go(WW.back)">◀ 뒤로</button><div class="who"><b id="wwTitle"></b></div></div>'
    + '<div style="text-align:center"><div id="wwMean" style="font-size:22px;font-weight:900;color:#7c2d12;margin:6px 0"></div><div id="wwBox" style="width:280px;height:280px;margin:0 auto;background:#fffef5;border:3px solid #fbbf24;border-radius:12px"></div><div class="feedback" id="wwFb"></div></div>'
    + '<div class="row" style="margin-top:8px"><button class="b-dark" onclick="wwShow()">👀 순서 보기</button><button class="b-warn" onclick="wwQuiz()">✍️ 다시 쓰기</button><button class="b-ok" onclick="wwNext()">다음 ▶</button></div><div class="hint">회색 글자 위에 획 순서대로 따라 써요. 틀리면 맞는 획을 보여 줘요.</div></div></section>'
    + '<section id="vWsRes" class="hidden"><div class="card"><h2 id="wrTitle" style="text-align:center"></h2><div class="score" id="wrScore"></div><ol class="res" id="wrList" style="padding:0"></ol>'
    + '<div class="row" style="margin-top:12px"><button onclick="wsRetry()" id="wrRetry">🔁 틀린 것만 다시</button><button class="b-dark" onclick="go(\'vWsMode\')">🪜 단계로</button><button class="b-dark" onclick="go(\'vWs\')">📚 다른 단계</button></div></div></section>';
  var box = document.createElement("div"); box.innerHTML = html;
  while(box.firstChild){ if(before) W.insertBefore(box.firstChild, before); else W.appendChild(box.firstChild); }
  ["vWs", "vWsMode", "vWsCard", "vWsQuiz", "vWsWrite", "vWsRes"].forEach(function(v){ VIEWS.push(v); });
  // 받아쓰기·수학 화면 위 과목 단추에 한자·영어 더하기
  ["vLevel", "vMath"].forEach(function(v){
    var row = document.querySelector("#" + v + " .card .row"); if(!row) return;
    row.insertAdjacentHTML("beforeend", '<button style="font-size:19px;background:#9a3412" onclick="wsGo(\'han\')">🈶 한자</button><button style="font-size:19px;background:#0f766e" onclick="wsGo(\'eng\')">🔤 영어</button>');
  });
})();
var _go0 = go;
go = function(id){
  _go0(id);
  if(id === "vWs") wsRenderLevels();
  if(id === "vWsMode") wsRenderSteps();
};
function wsGo(sub){ WS.sub = sub; go("vWs"); }
function wsRenderLevels(){
  var S = WS_SUB[WS.sub], rec = S.rec[ME] || [];
  $("wsWho").textContent = whoLabel(ME); $("wsRankBox").innerHTML = rankCard(ME);
  $("wsSubRow").innerHTML = '<button class="b-ok" style="font-size:19px" onclick="go(\'vLevel\')">✏️ 받아쓰기</button><button class="b-purple" style="font-size:19px" onclick="go(\'vMath\')">🔢 수학</button>'
    + '<button style="font-size:19px;background:#9a3412"' + (WS.sub === "han" ? " disabled" : "") + ' onclick="wsGo(\'han\')">🈶 한자</button><button style="font-size:19px;background:#0f766e"' + (WS.sub === "eng" ? " disabled" : "") + ' onclick="wsGo(\'eng\')">🔤 영어</button>';
  var nm = NAME_HANJA[ME];
  $("wsName").innerHTML = WS.sub !== "han" ? (typeof ABC !== "undefined" ? '<button class="big" style="background:#1d4ed8;margin-bottom:12px" onclick="go(\'vAbc\')">🔤 알파벳 기초부터 <small style="display:block;font-size:14px;font-weight:600">A a 읽기 · 소리(b = 브) · 쓰기 — 영어 처음이면 여기부터!</small></button>' : "") : nm && nm.length
    ? '<button class="big" style="background:#7c2d12;margin-bottom:12px" onclick="wwName()">✍️ 내 이름 한자 쓰기 <span class="hz" style="font-size:30px">' + esc(nm.map(function(r){ return r[0]; }).join("")) + '</span></button>'
    : '<div class="hint" style="margin-bottom:10px">✍️ 내 이름 한자 쓰기는 엄마·아빠가 이름 한자를 알려 주면 생겨요.</div>';
  $("wsH").innerHTML = S.icon + " 어느 단계를 할까요? <span style=\"font-size:13px;color:#64748b;font-weight:600\">👍 = 추천</span>";
  var groups = [], gi = {};
  WSL[WS.sub].forEach(function(x){ if(!(x.grade in gi)){ gi[x.grade] = groups.length; groups.push({ name: x.gname, L: [] }); } groups[gi[x.grade]].L.push(x); });
  $("wsLevels").innerHTML = groups.map(function(g){
    return '<div style="font-weight:800;margin:12px 0 6px">' + esc(g.name) + ' <span style="font-weight:600;color:#64748b;font-size:13px">' + g.L.reduce(function(s, x){ return s + x.items.length; }, 0) + (WS.sub === "han" ? "자" : "단어") + '</span></div><div class="grid g2">' + g.L.map(function(x){
      var k = S.pre + x.id, b = best(ME, k), st = stepsOf(ME, k), r = rec.indexOf(x.grade) >= 0;
      var badge = b == null ? "" : (b >= passScore() ? '<span class="badge">✅ ' + b + '점</span>' : '<span class="badge no">' + b + '점</span>');
      var dots = (st.s1 ? "●" : "○") + (st.s2 ? "●" : "○") + (st.s3 ? "●" : "○") + (b != null && b >= passScore() ? "●" : "○");
      var pv = x.items.slice(0, WS.sub === "han" ? 5 : 3).map(function(it){ return it.q; }).join(WS.sub === "han" ? " " : ", ");
      return '<button class="lv" style="background:' + S.col + (r ? ';outline:4px solid #facc15;outline-offset:1px' : '') + '" onclick="wsPick(\'' + x.id + '\')">' + badge + (r ? '👍 ' : '') + esc(x.t) + '<small class="' + (WS.sub === "han" ? "hz" : "") + '" style="font-size:' + (WS.sub === "han" ? 19 : 13) + 'px">' + esc(pv) + ' …</small><span class="dots">' + dots + '</span></button>';
    }).join("") + '</div>';
  }).join("");
}
function wsPick(id){ WS.lv = wsLv(id); go("vWsMode"); }
function wsRenderSteps(){
  var x = WS.lv, k = wsKey(), st = stepsOf(ME, k), b = best(ME, k), passed = b != null && b >= passScore(), han = WS.sub === "han";
  $("wsModeTitle").textContent = ME + " · " + WS_SUB[WS.sub].icon + " " + x.t;
  var steps = [
    { done: st.s1, t: "📖 보기", d: han ? "한자·뜻·소리 보고 듣기" : "단어 듣고 뜻 보기", c: "#15803d", f: "wsCards()" },
    { done: st.s2, t: han ? "✏️ 뜻·소리 고르기" : "✏️ 뜻 고르기", d: "4개 중에 골라요 — 10개 맞히면 완료", c: "#0891b2", f: "wsStart('prac')" },
    { done: st.s3, t: han ? "🔎 한자 찾기" : "⌨️ 철자 쓰기", d: han ? "뜻·소리 보고 한자 고르기 — 10개 맞히면 완료" : "듣고 영어로 쳐요 — 10개 맞히면 완료", c: "#7c3aed", f: "wsStart('rev')" }
  ];
  if(han) steps.push({ done: st.s4, t: "✍️ 쓰기", d: "획 순서대로 따라 쓰기", c: "#9a3412", f: "wwLevel()", opt: true });
  steps.push({ done: passed, t: "📝 시험", d: (b == null ? "" : "최고 " + b + "점" + (passed ? " ✅ 통과" : "") + " · ") + "전부 " + x.items.length + "문제", c: "#1d4ed8", f: "wsStart('test')" });
  var wr = wsWrongItems();
  if(wr.length) steps.push({ done: false, t: "❌ 틀린 것 다시 풀기 (" + wr.length + "개)", d: wr.slice(0, 8).map(function(it){ return it.q; }).join(" · ") + (wr.length > 8 ? " …" : ""), c: "#b91c1c", f: "wsStart('wrong')", opt: true });
  var nextI = steps.findIndex(function(s){ return !s.done && !s.opt; });
  $("wsSteps").innerHTML = steps.map(function(s, i){
    return '<button class="step' + (i === nextI ? ' next' : '') + '" style="background:' + s.c + '" onclick="' + s.f + '"><span class="n">' + (i + 1) + '</span><span class="t">' + s.t + '<small>' + esc(s.d) + '</small></span><span class="ck">' + (s.done ? '✅' : (i === nextI ? '👈' : '')) + '</span></button>';
  }).join("");
  $("wsModeHint").textContent = nextI < 0 ? "🎉 이 단계는 다 했어요! 다음 단계에 도전해요." : "노란 테두리가 지금 할 차례예요.";
}
// ① 보기
var WCOVER = false;
function wsCards(){
  var x = WS.lv, han = WS.sub === "han"; WCOVER = false; $("wcCoverBtn").textContent = "🙈 뜻 가리기"; $("wcList").parentNode.classList.remove("wcover");
  $("wcTitle").textContent = ME + " · " + x.t;
  $("wcList").className = "grid " + (han ? "g3" : "g2");
  $("wcList").innerHTML = x.items.map(function(it, i){
    return '<div class="wcard' + (han ? "" : " en") + '" data-i="' + i + '" onclick="wsSay(WS.lv.items[' + i + ']);this.querySelector(\'.m\').style.color=\'\'"><span class="big' + (han ? " hz" : "") + '">' + esc(it.q) + '</span>' + (!han && it.kr && typeof abcBlend === "function" ? '<span style="display:block;font-size:14px;color:#b45309;font-weight:800">' + esc(abcBlend(it.q)) + ' → ' + esc(it.kr) + '</span>' : '') + '<span class="m">' + esc(it.a) + '</span></div>';
  }).join("");
  go("vWsCard");
}
function wsCover(){ WCOVER = !WCOVER; $("wcCoverBtn").textContent = WCOVER ? "👀 뜻 보이기" : "🙈 뜻 가리기"; $("wcList").parentNode.classList.toggle("wcover", WCOVER); }
async function wsReadAll(){
  stopAll(); var my = runId, cs = document.querySelectorAll("#wcList .wcard");
  for(var i = 0; i < cs.length; i++){
    if(my !== runId) return;
    [].forEach.call(cs, function(c, j){ c.style.outline = j === i ? "4px solid #facc15" : "none"; });
    await wsSay(WS.lv.items[i]); my = runId; await wait(350);
  }
  [].forEach.call(cs, function(c){ c.style.outline = "none"; });
  var st = stepsOf(ME, wsKey()); if(!st.s1){ st.s1 = true; save(); }
  gainXp(XP.listenAll, WS.lv.t + " 끝까지 들었어요!", wsKey() + "|listen");
}
// ②③ 연습 · 시험 (고르기 / 철자 쓰기)
var WQ = null;
function _wsOpts(it, field, pool){
  var others = shuffle(pool.filter(function(o){ return o[field] !== it[field]; })).slice(0, 3);
  return shuffle(others.concat([it])).map(function(o){ return o[field]; });
}
// 이 단계 지난 시험들에서 틀린 것 (기록의 wrong: "q:日 날 일" → 日)
function wsWrongItems(){
  var arr = ((DB.rec[ME] || {})[wsKey()]) || [], seen = {}, out = [];
  (Array.isArray(arr) ? arr : []).forEach(function(r){ (r && r.wrong || []).forEach(function(w){
    var q = String(w).replace(/^q:/, "").split(" ")[0];
    var it = WS.lv.items.filter(function(x){ return x.q === q; })[0];
    if(it && !seen[q]){ seen[q] = 1; out.push(it); }
  }); });
  return out;
}
function wsStart(mode){
  var x = WS.lv, items = x.items, qs;
  if(mode === "wrong"){
    var wr = wsWrongItems(); if(!wr.length){ alert("틀린 게 없어요! 👍"); return; }
    qs = shuffle(wr).map(function(it, i){ return { it: it, dir: WS.sub === "eng" ? (i % 2 ? "spell" : "fwd") : (i % 2 ? "rev" : "fwd") }; });
    WQ = { mode: "test", qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now(), retry: true };
    $("wqTitle").textContent = ME + " · " + x.t + " · ❌ 틀린 것 다시 풀기";
    go("vWsQuiz"); wsNextQ(); return;
  }
  if(mode === "test"){
    var n = items.length;   // 전부 다 (예전엔 15개까지만)
    qs = shuffle(items).slice(0, n).map(function(it, i){ return { it: it, dir: WS.sub === "eng" ? (i % 2 ? "spell" : "fwd") : (i % 2 ? "rev" : "fwd") }; });
  } else qs = [];
  WQ = { mode: mode, qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now() };
  $("wqTitle").textContent = ME + " · " + x.t + " · " + ({ prac: "✏️ 연습", rev: WS.sub === "han" ? "🔎 한자 찾기" : "⌨️ 철자 쓰기", test: "📝 시험" }[mode]);
  go("vWsQuiz"); wsNextQ();
}
function _wsPoolFor(it){
  // 보기 4개는 같은 급(단계 너무 작으면 급 전체) 안에서
  var g = WSL[WS.sub].filter(function(x){ return x.grade === WS.lv.grade; }), pool = [];
  g.forEach(function(x){ pool = pool.concat(x.items); });
  return pool.length >= 4 ? pool : WS.lv.items;
}
function wsNextQ(){
  var m = WQ, it, dir;
  if(m.mode === "test"){ it = m.qs[m.idx].it; dir = m.qs[m.idx].dir; }
  else { var L = WS.lv.items; it = L[RN(0, L.length - 1)]; if(m.cur && L.length > 1) while(it === m.cur) it = L[RN(0, L.length - 1)]; dir = m.mode === "prac" ? "fwd" : (WS.sub === "han" ? "rev" : "spell"); }
  m.cur = it; m.dir = dir; m.miss = 0; m.busy = false;
  var han = WS.sub === "han", pool = _wsPoolFor(it);
  $("wqFb").textContent = "";
  $("wqType").classList.toggle("hidden", dir !== "spell");
  if(dir === "spell"){
    $("wqAsk").textContent = "🔊 듣고 영어로 쳐요"; $("wqQ").innerHTML = '<span style="font-size:30px">' + esc(it.a) + '</span>'; $("wqOpts").innerHTML = ""; $("wqIn").value = ""; setTimeout(function(){ $("wqIn").focus(); }, 50); speakEn(it.q);
  } else {
    var fwd = dir === "fwd";
    $("wqAsk").textContent = fwd ? (han ? "이 한자의 뜻과 소리는?" : "이 단어의 뜻은?") : (han ? "이 뜻·소리의 한자는?" : "");
    $("wqQ").innerHTML = fwd ? '<span class="' + (han ? "hz" : "") + '" style="font-size:' + (han ? 96 : 44) + 'px;color:' + (han ? "#7c2d12" : "#0f766e") + '">' + esc(it.q) + '</span>' : '<span style="font-size:34px">' + esc(it.a) + '</span>';
    var opts = _wsOpts(it, fwd ? "a" : "q", pool);
    $("wqOpts").innerHTML = opts.map(function(o){ return '<button class="wopt' + (!fwd && han ? " hz" : "") + '" onclick="wsPickOpt(this)" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join("");
    if(fwd && !han) speakEn(it.q);
  }
  wsInfo();
}
function wsInfo(){
  var m = WQ;
  if(m.mode === "test"){ $("wqInfo").innerHTML = '<b style="font-size:30px;color:#1d4ed8">' + (m.idx + 1) + '</b> / ' + m.qs.length + '문제'; $("wqBar").style.width = (m.idx / m.qs.length * 100) + "%"; }
  else { $("wqInfo").innerHTML = '⭕ <b style="font-size:26px;color:#15803d">' + m.right + '</b> / 10 맞히기 · ❌ ' + m.wrong; $("wqBar").style.width = Math.min(100, m.right * 10) + "%"; }
}
function wsPickOpt(btn){ wsAnswer(btn.getAttribute("data-v"), btn); }
function wsTyped(){ var v = $("wqIn").value.trim(); if(!v) return; wsAnswer(v, null); }
function wsAnswer(v, btn){
  var m = WQ; if(!m || m.busy) return;
  var it = m.cur, fwd = m.dir === "fwd", want = m.dir === "spell" ? it.q : fwd ? it.a : it.q;
  var ok = m.dir === "spell" ? v.toLowerCase().replace(/\s+/g, " ") === want.toLowerCase() : v === want;
  if(m.mode === "test"){
    m.ok[m.idx] = ok; m.ans[m.idx] = v;
    if(m.idx < m.qs.length - 1){ m.idx++; wsNextQ(); } else wsFinish();
    return;
  }
  if(ok){
    m.right++; m.busy = true;
    if(btn) btn.style.background = "#15803d";
    $("wqFb").innerHTML = '<span style="color:#15803d">⭕ 딩동댕!' + (WS.sub === "han" ? ' <span class="hz">' + esc(it.q) + '</span> ' + esc(it.a) : '') + '</span>';
    if(WS.sub === "han") speak(it.a, 0.9); else speakEn(it.q);
    gainXp(2, "연습", wsKey() + "|prac");
    setTimeout(function(){
      if(m.right >= 10 && !m.doneShown){ m.doneShown = true; var st = stepsOf(ME, wsKey()), s = m.mode === "prac" ? "s2" : "s3"; if(!st[s]){ st[s] = true; save(); } alert((m.mode === "prac" ? "✏️ 연습" : WS.sub === "han" ? "🔎 한자 찾기" : "⌨️ 철자 쓰기") + " 10개 성공! (계속해도 돼요)"); }
      wsNextQ();
    }, 900);
  } else {
    m.wrong++; m.miss++;
    if(btn) btn.style.background = "#b91c1c";
    if(m.dir === "spell") $("wqIn").value = "";
    $("wqFb").innerHTML = m.miss >= 2 ? '<span style="color:#b91c1c">❌ 정답은 <b class="' + (WS.sub === "han" && !fwd ? "hz" : "") + '">' + esc(want) + '</b></span>' : '<span style="color:#b91c1c">❌ 다시 해 봐요!</span>';
    wsInfo();
  }
}
function wsQuit(){ stopAll(); if(WQ && WQ.mode === "test" && WQ.idx > 0 && !confirm("시험을 그만할까요? (점수는 안 남아요)")) return; WQ = null; go("vWsMode"); }
function _wsLine(q, i, m){
  var it = q.it, han = WS.sub === "han";
  return (han ? '<b class="hz" style="font-size:26px">' + esc(it.q) + '</b> ' + esc(it.a) : '<b>' + esc(it.q) + '</b> ' + esc(it.a)) + (m.ok[i] ? '' : ' <span style="color:#b91c1c">(내 답 ' + esc(m.ans[i]) + ')</span>');
}
function wsFinish(){
  var m = WQ, k = wsKey(), n = m.qs.length, ok = m.ok.filter(Boolean).length, sc = Math.round(ok / n * 100), sec = Math.round((Date.now() - m.t0) / 1000);
  if(m.retry){
    $("wrTitle").textContent = "🔁 틀린 것 다시 풀기 끝!"; $("wrScore").innerHTML = '<b style="color:#1d4ed8">' + ok + ' / ' + n + '</b>' + (ok === n ? "이제 다 맞혀요! 👍" : "한 번 더 해 봐요");
    $("wrList").innerHTML = m.qs.map(function(q, i){ return '<li>' + (m.ok[i] ? "⭕" : "❌") + ' ' + _wsLine(q, i, m) + '</li>'; }).join("");
    $("wrRetry").disabled = ok === n; go("vWsRes"); gainXp(ok * 2, "다시 풀기", k + "|prac"); return;
  }
  var wasPassed = best(ME, k) != null && best(ME, k) >= passScore();
  var r = DB.rec[ME] = DB.rec[ME] || {}, arr = (r[k] = r[k] || []);
  var wrongTxt = m.qs.filter(function(q, i){ return !m.ok[i]; }).map(function(q){ return q.it.q + " " + q.it.a; });
  arr.push({ no: arr.length + 1, d: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    score: sc, n: n, ok: ok, diff: "normal", where: "screen", sheet: ME, sec: sec, wrong: wrongTxt.map(function(t){ return "q:" + t; }),
    res: m.qs.map(function(q, i){ return [0, i + 1, m.ok[i] ? 1 : 0, q.it.q + " " + q.it.a + (m.ok[i] ? "" : " (내 답 " + m.ans[i] + ")")]; }) });
  save();
  $("wrTitle").textContent = "🎉 끝! " + arr.length + "회차";
  $("wrScore").innerHTML = '<b style="color:' + (sc >= passScore() ? "#15803d" : "#b91c1c") + '">' + sc + '점</b>⭕ ' + ok + ' ❌ ' + (n - ok) + ' · ⏱ ' + sec + '초' + (sc === 100 ? " · 💯" : sc >= passScore() ? " · ✅ 통과!" : "");
  $("wrList").innerHTML = m.qs.map(function(q, i){ return '<li><span class="mark"><b style="font-size:24px;color:' + (m.ok[i] ? "#15803d" : "#b91c1c") + '">' + (m.ok[i] ? "⭕" : "❌") + '</b></span><span style="color:#64748b;font-size:15px">' + (i + 1) + '번</span> ' + _wsLine(q, i, m) + '</li>'; }).join("");
  $("wrRetry").disabled = ok === n;
  go("vWsRes"); speak(sc === 100 ? "백 점! 정말 잘했어요!" : "끝! " + sc + "점이에요!", 1);
  var xp = xpTest(ok, sc, XP.perfect, 1), why = WS_SUB[WS.sub].name + " " + arr.length + "회차 " + sc + "점" + (sc === 100 ? " 💯" : "");
  if(!wasPassed && sc >= passScore()){ xp += XP.firstPass * (xpEarly() ? XP_RULE.early : 1); why += " · 첫 통과!"; }
  gainXp(xp, why, null);
  if(typeof kLog === "function") kLog("test", WS_SUB[WS.sub].icon + " " + WS.lv.t + " " + arr.length + "회차 " + sc + "점 (" + ok + "/" + n + ")" + (wrongTxt.length ? "\n❌ " + wrongTxt.slice(0, 5).join(" / ") + (wrongTxt.length > 5 ? " 외 " + (wrongTxt.length - 5) + "개" : "") : " 💯"),
    { key: k, no: arr.length, score: sc, ok: ok, n: n, wrongTxt: wrongTxt });
}
function wsRetry(){
  var m = WQ; if(!m) return;
  var w = m.qs.filter(function(q, i){ return !m.ok[i]; }); if(!w.length) return;
  WQ = { mode: "test", qs: w, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now(), retry: true };
  go("vWsQuiz"); wsNextQ();
}

// ④ ✍️ 한자 쓰기 — Hanzi Writer (획 순서 데이터는 인터넷에서 받아 옴)
var WW = { list: [], i: 0, w: null, back: "vWsMode", name: false };
function _wwLoad(){
  if(window.HanziWriter) return Promise.resolve();
  return new Promise(function(res, rej){ var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.0/dist/hanzi-writer.min.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function wwLevel(){ WW.list = WS.lv.items.slice(); WW.i = 0; WW.back = "vWsMode"; WW.name = false; wwOpen(); }
function wwName(){ WW.list = (NAME_HANJA[ME] || []).map(function(r){ return { q: r[0], a: r[1] }; }); WW.i = 0; WW.back = "vWs"; WW.name = true; wwOpen(); }
function wwOpen(){
  if(!WW.list.length) return;
  go("vWsWrite"); $("wwFb").textContent = "📡 글자 불러오는 중..."; $("wwBox").innerHTML = "";
  _wwLoad().then(wwDraw, function(){ $("wwFb").textContent = "인터넷이 안 돼서 쓰기 연습을 못 열었어요"; });
}
function wwDraw(){
  var it = WW.list[WW.i];
  $("wwTitle").textContent = ME + " · ✍️ " + (WW.name ? "내 이름 한자" : WS.lv.t) + " (" + (WW.i + 1) + "/" + WW.list.length + ")";
  $("wwMean").innerHTML = esc(it.a); $("wwBox").innerHTML = ""; $("wwFb").textContent = "";
  try {
    WW.w = HanziWriter.create("wwBox", it.q, { width: 280, height: 280, padding: 14, showOutline: true, showCharacter: false, strokeColor: "#7c2d12", outlineColor: "#e7d8c9", drawingColor: "#111827", drawingWidth: 26, highlightColor: "#facc15",
      onLoadCharDataError: function(){ $("wwBox").innerHTML = '<div class="hz" style="font-size:200px;line-height:280px;color:#e7d8c9;text-align:center">' + esc(it.q) + '</div>'; $("wwFb").textContent = "이 글자는 획 순서 자료가 없어요 — 보고 따라 써 봐요"; } });
    speak(it.a, 0.9); wwQuiz();
  } catch(e){ $("wwFb").textContent = "쓰기 연습을 못 열었어요"; }
}
function wwQuiz(){
  if(!WW.w) return; $("wwFb").textContent = "";
  WW.w.quiz({ leniency: 1.3, showHintAfterMisses: 2, onComplete: function(d){
    $("wwFb").innerHTML = '<span style="color:#15803d">⭕ 잘 썼어요!' + (d.totalMistakes ? " (틀린 획 " + d.totalMistakes + "번)" : " 💯") + '</span>';
    gainXp(d.totalMistakes ? 2 : 4, "한자 쓰기", (WW.name ? "漢·name" : wsKey()) + "|write");
    if(!WW.name && WW.i === WW.list.length - 1){ var st = stepsOf(ME, wsKey()); if(!st.s4){ st.s4 = true; save(); } }
  } });
}
function wwShow(){ if(WW.w){ WW.w.cancelQuiz(); WW.w.showCharacter(); WW.w.animateCharacter({ onComplete: function(){ setTimeout(wwQuiz, 600); } }); } }
function wwNext(){ if(WW.i < WW.list.length - 1){ WW.i++; wwDraw(); } else { alert(WW.name ? "✍️ 내 이름 한자 다 썼어요! 👏" : "✍️ 이 단계 한자를 다 썼어요! 👏"); go(WW.back); } }

// 기록 이름 (📈 내 기록 · 계급판)
var _lvName0 = lvName;
lvName = function(k){
  k = k == null ? lvKey() : String(k);
  if(k.indexOf("漢·") === 0 || k.indexOf("英·") === 0){ var x = wsLv(k.slice(2)); return (k.charAt(0) === "漢" ? "🈶 " : "🔤 ") + (x ? x.t : k.slice(2)); }
  return _lvName0(k);
};

// ❌ 수학 틀린 것 다시 풀기 — 기록의 wrong: "q:23 × 4 = 92" → 문제·답
function mWrongItems(){
  var arr = ((DB.rec[ME] || {})[mKey()]) || [], seen = {}, out = [];
  (Array.isArray(arr) ? arr : []).forEach(function(r){ (r && r.wrong || []).forEach(function(w){
    var m = String(w).replace(/^q:/, "").match(/^(.+) = (.+)$/); if(!m || seen[m[1]]) return;
    seen[m[1]] = 1; var a = m[2].trim(); out.push({ q: m[1].trim(), a: (/^-?\d+$/.test(a) ? Number(a) : a) });
  }); });
  return out;
}
function mRetryWrongAll(){
  var w = shuffle(mWrongItems()); if(!w.length){ alert("틀린 게 없어요! 👍"); return; }
  MQ = { mode: "test", x: mLv(MLV), qs: w, idx: 0, ans: [], ok: [], cur: w[0], input: "", right: 0, wrong: 0, miss: 0, t0: Date.now(), end: 0, retry: true };
  $("mqTitle").textContent = ME + " · " + mLv(MLV).t + " · ❌ 틀린 것 다시 풀기";
  go("vMQuiz"); mShow();
  clearInterval(_mqT); _mqT = setInterval(function(){ if(!MQ || $("vMQuiz").classList.contains("hidden")){ clearInterval(_mqT); return; } mInfo(); }, 250);
}
var _mRenderSteps0 = mRenderSteps;
mRenderSteps = function(){
  _mRenderSteps0();
  var w = mWrongItems(); if(!w.length) return;
  $("mSteps").insertAdjacentHTML("beforeend", '<button class="step" style="background:#b91c1c" onclick="mRetryWrongAll()"><span class="n">❌</span><span class="t">틀린 것 다시 풀기 (' + w.length + '개)<small>' + esc(w.slice(0, 5).map(function(x){ return x.q; }).join(" · ") + (w.length > 5 ? " …" : "")) + '</small></span><span class="ck"></span></button>');
};

// ───────── 🧩 구구단은 「몇 번 더하기」 (2026-11-09) ─────────
//   3 × 5 = 3 × 4 + 3 — 앞의 답에 한 번 더 더하면 다음 답
//   ① 구구단 급에 「🧩 더하기로 알아보기」 단계 (3×1부터 차례로, 힌트 보며 풀기)
//   ② 외우기 표 각 줄 밑에 「12 + 3」 처럼 앞의 답 + 단
//   ③ 연습에서 구구단 틀리면 「3 × 4 = 12 이니까 12 + 3 = ?」 힌트
function _guDots(d, n, hi){   // 3×5 → ●●● ●●● ●●● ●●● ●●● (마지막 묶음은 노랑)
  if(d * n > 45) return "";
  var h = "";
  for(var i = 0; i < n; i++) h += '<span style="display:inline-block;margin:0 4px 2px 0;padding:1px 3px;border-radius:6px;background:' + (hi && i === n - 1 ? "#fde68a" : "#ede9fe") + '">' + new Array(d + 1).join("●") + '</span>';
  return '<div style="font-size:11px;line-height:1.6;color:#6d28d9;letter-spacing:-1px">' + h + '</div>';
}
// 풀이 힌트 — 답은 안 알려 주고, 틀릴 때마다 한 걸음씩 더 자세히
//   1번째: 「3 × 5」는 3을 5번 더한 것
//   2번째: 3 × 4 = 12 는 알죠? 3을 한 번 더 더하면?
//   3번째부터: 12에서 3칸 세어 봐요 → 13, 14, ?
function _guHint(q, step){
  var m = String(q || "").match(/^(\d) × (\d)$/); if(!m) return "";
  var d = +m[1], n = +m[2], p = d * (n - 1); step = step || 1;
  if(n === 1) return "💡 " + d + " × 1 은 " + d + "을 딱 1번 — 그대로예요";
  if(step <= 1) return "💡 " + d + " × " + n + " 은 " + d + "을 " + n + "번 더한 거예요 (" + new Array(n + 1).join(d + " + ").slice(0, -3) + ")";
  if(step === 2) return "💡 " + d + " × " + (n - 1) + " = " + p + " 는 알죠? 거기에 " + d + "을 한 번 더 더하면 " + d + " × " + n + " 이에요. " + p + " + " + d + " 는?";
  var c = []; for(var i = 1; i < d; i++) c.push(p + i);
  return "💡 " + p + "에서 " + d + "칸 더 세어 봐요 → " + p + (c.length ? ", " + c.join(", ") : "") + ", ? (손가락 " + d + "개 펴고 하나씩)";
}
// ② 외우기 표: 각 줄 밑에 앞의 답 + 단
var _mStudy0 = mStudy;
mStudy = function(){
  _mStudy0();
  [].forEach.call(document.querySelectorAll("#mTable .mrow"), function(r){
    var m = String(r.getAttribute("data-t") || "").match(/^(\d) 곱하기 (\d)은/); if(!m) return;
    var d = +m[1], n = +m[2];
    r.insertAdjacentHTML("beforeend", '<div style="font-size:12px;font-weight:600;color:#64748b">' + (n === 1 ? d + "을 1번" : d * (n - 1) + " + " + d + " <span style=\"color:#94a3b8\">(" + d + "을 " + n + "번)</span>") + '</div>');
  });
};
// ③ 연습에서 틀리면 힌트
var _mCheck0 = mCheck;
mCheck = function(){
  var m = MQ, q = m && m.cur && m.cur.q, a = m && m.cur && m.cur.a, w0 = m ? m.wrong : 0;
  _mCheck0();
  if(!m || m.mode === "test" || m.mode === "speed" || m.wrong === w0) return;
  if(!_guHint(q)) return;
  var x = String(q).match(/^(\d) × (\d)$/);
  $("mqFb").innerHTML = '<span style="color:#b91c1c">❌ 다시 생각해 봐요!</span><div style="font-size:17px;color:#6d28d9;margin-top:6px">' + esc(_guHint(q, m.miss)) + '</div>' + _guDots(+x[1], +x[2], true);
};
// ① 🧩 더하기로 알아보기 — 단마다 1번부터 9번까지 차례로
var GU = null;
function guStart(){
  var x = mLv(MLV); if(!x.dans) return;
  GU = { dans: x.dans, di: 0, n: 1, input: "", miss: 0 };
  var box = $("guBox");
  if(!box){
    box = document.createElement("div"); box.id = "guBox";
    box.style.cssText = "position:fixed;inset:0;z-index:9000;background:#faf5ff;overflow:auto;padding:16px;font-family:inherit";
    document.body.appendChild(box);
  }
  box.style.display = "block"; guDraw();
}
function guClose(){ GU = null; var b = $("guBox"); if(b) b.style.display = "none"; mRenderSteps(); }
function guDraw(){
  var g = GU, d = g.dans[g.di], n = g.n, h = "";
  h += '<div style="max-width:560px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:20px">🧩 ' + d + '단 — 더하기로 알아보기</b><button onclick="guClose()" style="background:#475569;color:#fff;border:0;border-radius:10px;padding:8px 14px;font-weight:800">닫기</button></div>';
  h += '<div style="margin:8px 0 12px;color:#475569">' + d + ' × 몇 = ' + d + '을 몇 번 더한 것. 앞의 답에 <b>' + d + '만 더하면</b> 다음 답!</div>';
  for(var i = 1; i < n; i++) h += '<div style="background:#fff;border-radius:10px;padding:6px 10px;margin-bottom:4px;font-size:18px;font-weight:800">' + d + ' × ' + i + ' = <span style="color:#6d28d9">' + d * i + '</span> <span style="font-size:13px;color:#94a3b8;font-weight:600">' + (i === 1 ? "" : d * (i - 1) + " + " + d) + '</span></div>';
  h += '<div style="background:#fff;border:3px solid #facc15;border-radius:12px;padding:12px;margin-top:8px;text-align:center">';
  h += '<div style="font-size:34px;font-weight:900">' + d + ' × ' + n + ' = <span style="color:#1d4ed8;border-bottom:3px solid #1d4ed8;padding:0 10px">' + (g.input || "?") + '</span></div>';
  h += '<div style="font-size:17px;color:#6d28d9;margin:6px 0">' + esc(_guHint(d + " × " + n, n > 1 ? Math.max(2, g.miss + 1) : 1)) + '</div>' + _guDots(d, n, true);
  h += '<div id="guFb" style="min-height:26px;font-weight:800;font-size:18px"></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:300px;margin:6px auto 0">' + ["1","2","3","4","5","6","7","8","9","⌫","0","✔"].map(function(k){ return '<button onclick="guKey(\'' + k + '\')" style="font-size:24px;font-weight:900;padding:12px 0;border:0;border-radius:10px;color:#fff;background:' + (k === "✔" ? "#15803d" : k === "⌫" ? "#b91c1c" : "#1e3a8a") + '">' + k + '</button>'; }).join("") + '</div>';
  h += '</div></div>';
  $("guBox").innerHTML = h;
}
function guKey(k){
  var g = GU; if(!g || g.busy) return;
  if(k === "⌫"){ g.input = g.input.slice(0, -1); guDraw(); return; }
  if(k !== "✔"){ if(g.input.length < 3){ g.input += k; guDraw(); } return; }
  if(g.input === "") return;
  var d = g.dans[g.di], n = g.n;
  if(+g.input === d * n){
    g.busy = true; $("guFb").innerHTML = '<span style="color:#15803d">⭕ 맞아요! ' + (n > 1 ? d + " × " + (n - 1) + " 에 " + d + " 더해서 " + d * n : "") + '</span>';
    gainXp(1, "더하기로 구구단", mKey() + "|prac");
    setTimeout(function(){
      g.busy = false; g.input = ""; g.miss = 0;
      if(n < 9) g.n++;
      else if(g.di < g.dans.length - 1){ g.di++; g.n = 1; alert("🎉 " + d + "단 끝! 다음은 " + g.dans[g.di] + "단이에요."); }
      else { alert("🎉 다 했어요! 이제 ✏️ 연습이나 📝 시험을 해 봐요."); guClose(); return; }
      guDraw();
    }, 700);
  } else {
    g.miss++; g.input = ""; guDraw();
    $("guFb").innerHTML = '<span style="color:#b91c1c">❌ 아까워요! 아래 힌트대로 다시 세어 봐요</span>';
  }
}
// 단계 화면에 넣기 (외우기 다음)
var _mRenderSteps1 = mRenderSteps;
mRenderSteps = function(){
  _mRenderSteps1();
  var x = mLv(MLV); if(!x.dans) return;
  var first = $("mSteps").querySelector(".step");
  var html = '<button class="step" style="background:#7c3aed" onclick="guStart()"><span class="n">🧩</span><span class="t">더하기로 알아보기<small>' + x.dans[0] + ' × 5 = ' + x.dans[0] + ' × 4 + ' + x.dans[0] + ' — 앞의 답에 한 번 더!</small></span><span class="ck"></span></button>';
  if(first) first.insertAdjacentHTML("afterend", html); else $("mSteps").insertAdjacentHTML("afterbegin", html);
};
document.addEventListener("keydown", function(e){
  if(!GU || !$("guBox") || $("guBox").style.display === "none") return;
  if(/^[0-9]$/.test(e.key)) guKey(e.key); else if(e.key === "Backspace") guKey("⌫"); else if(e.key === "Enter"){ e.preventDefault(); guKey("✔"); } else if(e.key === "Escape") guClose();
});
