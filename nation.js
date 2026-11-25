// ============================================================================
// 🌍 나라 공부 — 국기 · 나라 · 수도 (abc.js 다음에 붙음, 자료는 nation-data.js)
//   단계: 주요 국가(대륙별·전체) · 덜 알려진 나라(대륙별·전체) · 세계 전체
//   ① 📖 보기 ② 🏳 국기 보고 나라 ③ 🏙 나라 보고 수도 ④ 🔁 수도 보고 나라 ⑤ 📝 시험 (+ ❌ 틀린 것 다시)
//   기록 키 "NAT·{id}" — 다른 공부처럼 DB.rec·경험치·알림·👦 아이들 탭에 쌓임
// ============================================================================
var NAT_LV = [
  { id: "m-as", t: "주요 국가 · 아시아", tier: 1, ct: ["아시아"] }, { id: "m-eu", t: "주요 국가 · 유럽", tier: 1, ct: ["유럽"] },
  { id: "m-am", t: "주요 국가 · 아메리카", tier: 1, ct: ["북아메리카", "남아메리카"] }, { id: "m-af", t: "주요 국가 · 아프리카·오세아니아", tier: 1, ct: ["아프리카", "오세아니아"] },
  { id: "m-all", t: "주요 국가 전체", tier: 1, big: 1 },
  { id: "o-as", t: "덜 알려진 나라 · 아시아", tier: 2, ct: ["아시아"] }, { id: "o-eu", t: "덜 알려진 나라 · 유럽", tier: 2, ct: ["유럽"] },
  { id: "o-am", t: "덜 알려진 나라 · 아메리카", tier: 2, ct: ["북아메리카", "남아메리카"] }, { id: "o-af", t: "덜 알려진 나라 · 아프리카", tier: 2, ct: ["아프리카"] },
  { id: "o-oc", t: "덜 알려진 나라 · 오세아니아", tier: 2, ct: ["오세아니아"] }, { id: "o-all", t: "덜 알려진 나라 전체", tier: 2, big: 1 },
  { id: "all", t: "🌏 세계 전체", big: 1 }
];
var NA = { lv: null };
function natItems(lv){ lv = lv || NA.lv; return NAT.filter(function(x){ return (!lv.tier || x[4] === lv.tier) && (!lv.ct || lv.ct.indexOf(x[3]) >= 0); }); }
function natKey(){ return "NAT·" + NA.lv.id; }
function natImg(x, h){ return '<img src="' + natFlag(x[0], h > 60 ? 320 : 160) + '" alt="" style="height:' + h + 'px;border:1px solid #cbd5e1;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.15);vertical-align:middle;background:#fff">'; }
function natJo(w){ var c = String(w).charCodeAt(String(w).length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 ? "은" : "는"; }

(function(){
  var css = document.createElement("style");
  css.textContent = ".ncard{background:#f0fdf4;border:3px solid #bbf7d0;border-radius:14px;padding:8px 4px;text-align:center;cursor:pointer}"
    + ".ncard .nn{font-size:17px;font-weight:900;color:#14532d;margin-top:4px}.ncard .nc{font-size:14px;font-weight:800;color:#b45309}.ncard .nt{font-size:11.5px;color:#64748b}";
  document.head.appendChild(css);
  var W = document.querySelector(".wrap") || document.body, before = document.getElementById("vSet");
  var html = ''
    + '<section id="vNat" class="hidden"><div class="row" style="margin-bottom:10px"><button class="back" onclick="go(\'vLevel\')">◀ 처음</button><div class="who"><b id="naWho"></b></div></div>'
    + '<div class="card"><h2>🌍 나라 · 국기 · 수도</h2><div class="hint" style="margin-bottom:10px">세계 여러 나라의 <b>국기</b>와 <b>수도</b>를 알아봐요. 주요 국가부터 시작해서, 다 하면 덜 알려진 나라에 도전해요!</div><div id="naLevels" class="grid g2"></div></div></section>'
    + '<section id="vNatMode" class="hidden"><div class="card"><div class="row" style="margin-bottom:12px"><button class="back" onclick="go(\'vNat\')">◀ 단계</button><div class="who"><b id="naModeTitle"></b></div></div><div id="naSteps"></div><div class="hint" id="naHint"></div></div></section>'
    + '<section id="vNatCard" class="hidden"><div class="card"><div class="row" style="margin-bottom:8px"><button class="back" onclick="stopAll();go(\'vNatMode\')">◀ 단계</button><div class="who"><b id="ncTitle"></b></div></div>'
    + '<div class="row" style="margin-bottom:6px"><button class="b-ok" onclick="naReadAll()">🔊 다 읽어주기</button></div><div class="hint">카드를 누르면 <b>나라 → 수도</b>를 읽어 줘요. 「다 읽어주기」를 끝까지 들으면 ① 완료!</div><div class="grid g3" id="ncList" style="margin-top:10px"></div>'
    + '<button class="big" style="margin-top:12px" onclick="stopAll();naStart(\'flag\')">🏳 ② 국기 보고 나라 고르기 ▶</button></div></section>'
    + '<section id="vNatQuiz" class="hidden"><div class="card"><div class="row" style="margin-bottom:6px"><button class="back" onclick="naQuit()">■ 그만</button><div class="who"><b id="nqTitle"></b></div></div>'
    + '<div class="num"><span id="nqInfo"></span></div><div class="bar"><i id="nqBar"></i></div><div id="nqAsk" style="text-align:center;color:#64748b;font-size:17px;margin-top:10px"></div><div id="nqQ" style="text-align:center;margin:12px 0 6px"></div>'
    + '<div class="grid g2" id="nqOpts" style="margin-top:10px"></div><div class="feedback" id="nqFb"></div></div></section>'
    + '<section id="vNatRes" class="hidden"><div class="card"><h2 id="nrTitle" style="text-align:center"></h2><div class="score" id="nrScore"></div><ol class="res" id="nrList" style="padding:0"></ol>'
    + '<div class="row" style="margin-top:12px"><button class="b-dark" onclick="go(\'vNatMode\')">🪜 단계로</button><button class="b-dark" onclick="go(\'vNat\')">🌍 다른 단계</button></div></div></section>';
  var box = document.createElement("div"); box.innerHTML = html;
  while(box.firstChild){ if(before) W.insertBefore(box.firstChild, before); else W.appendChild(box.firstChild); }
  ["vNat", "vNatMode", "vNatCard", "vNatQuiz", "vNatRes"].forEach(function(v){ VIEWS.push(v); });
})();
// 과목 단추줄에 🌍 나라 단추
var NA_BTN = '<button class="naBtn" style="font-size:19px;background:#15803d" onclick="go(\'vNat\')">🌍 나라</button>';
(function(){
  ["vLevel", "vMath"].forEach(function(v){ var row = document.querySelector("#" + v + " .card .row"); if(row && !row.querySelector(".naBtn")) row.insertAdjacentHTML("beforeend", NA_BTN); });
})();
var _goNat0 = go;
go = function(id){
  _goNat0(id);
  if(id === "vWs"){ var r = document.getElementById("wsSubRow"); if(r && !r.querySelector(".naBtn")) r.insertAdjacentHTML("beforeend", NA_BTN); }
  if(id === "vAbc"){ var a = document.querySelector("#vAbc .row"); if(a && !a.querySelector(".naBtn")) a.insertAdjacentHTML("beforeend", NA_BTN); }
  if(id === "vNat") naRenderLevels(); if(id === "vNatMode") naRenderSteps();
};

function naRenderLevels(){
  $("naWho").textContent = whoLabel(ME);
  var tile = function(x){
    var k = "NAT·" + x.id, b = best(ME, k), st = stepsOf(ME, k), L = natItems(x);
    var badge = b == null ? "" : (b >= passScore() ? '<span class="badge">✅ ' + b + '점</span>' : '<span class="badge no">' + b + '점</span>');
    var dots = (st.s1 ? "●" : "○") + (st.s2 ? "●" : "○") + (st.s3 ? "●" : "○") + (st.s4 ? "●" : "○") + (b != null && b >= passScore() ? "●" : "○");
    var bg = x.tier === 1 ? "#15803d" : x.tier === 2 ? "#0e7490" : "#7c3aed";
    return '<button class="lv" style="background:' + bg + '" onclick="NA.lv=NAT_LV[' + NAT_LV.indexOf(x) + '];go(\'vNatMode\')">' + badge + '🌍 ' + x.t + '<small style="font-size:14px">' + L.length + '나라 · ' + L.slice(0, 4).map(function(n){ return n[1]; }).join(" ") + (L.length > 4 ? " …" : "") + '</small><span class="dots">' + dots + '</span></button>';
  };
  $("naLevels").innerHTML = '<div style="grid-column:1/-1;font-weight:800;margin:4px 0 2px">⭐ 주요 국가 <span style="font-weight:600;color:#64748b;font-size:13px">— 뉴스·여행에서 자주 나오는 나라</span></div>'
    + NAT_LV.filter(function(x){ return x.tier === 1; }).map(tile).join("")
    + '<div style="grid-column:1/-1;font-weight:800;margin:12px 0 2px">🧭 덜 알려진 나라 <span style="font-weight:600;color:#64748b;font-size:13px">— 주요 국가를 다 했으면 도전!</span></div>'
    + NAT_LV.filter(function(x){ return x.tier === 2; }).map(tile).join("")
    + '<div style="grid-column:1/-1;font-weight:800;margin:12px 0 2px">🏆 끝판왕</div>' + NAT_LV.filter(function(x){ return !x.tier; }).map(tile).join("");
}
function naRenderSteps(){
  var k = natKey(), st = stepsOf(ME, k), b = best(ME, k), passed = b != null && b >= passScore(), n = natItems().length;
  $("naModeTitle").textContent = ME + " · 🌍 " + NA.lv.t;
  var steps = [
    { done: st.s1, t: "📖 보기", d: "국기 · 나라 · 수도 카드 (" + n + "나라)", c: "#15803d", f: "naCards()" },
    { done: st.s2, t: "🏳 국기 보고 나라", d: "국기를 보고 어느 나라인지 — 10개 맞히면 완료", c: "#0891b2", f: "naStart('flag')" },
    { done: st.s3, t: "🏙 나라 보고 수도", d: "나라의 수도 고르기 — 10개 맞히면 완료", c: "#7c3aed", f: "naStart('cap')" },
    { done: st.s4, t: "🔁 수도 보고 나라", d: "수도가 어느 나라 것인지 — 10개 맞히면 완료", c: "#b45309", f: "naStart('rev')" },
    { done: passed, t: "📝 시험", d: (b == null ? Math.min(15, n) + "문제 (섞어서)" : "최고 " + b + "점") + (passed ? " ✅ 통과" : ""), c: "#1d4ed8", f: "naStart('test')" }
  ];
  var wr = naWrongItems();
  if(wr.length) steps.push({ done: false, opt: true, t: "❌ 틀린 것 다시 풀기 (" + wr.length + "개)", d: wr.slice(0, 6).map(function(a){ return a[1]; }).join(" · ") + (wr.length > 6 ? " …" : ""), c: "#b91c1c", f: "naStart('wrong')" });
  var nextI = steps.findIndex(function(s){ return !s.done && !s.opt; });
  $("naSteps").innerHTML = steps.map(function(s, i){
    return '<button class="step' + (i === nextI ? ' next' : '') + '" style="background:' + s.c + '" onclick="' + s.f + '"><span class="n">' + (i + 1) + '</span><span class="t">' + s.t + '<small>' + esc(s.d) + '</small></span><span class="ck">' + (s.done ? '✅' : (i === nextI ? '👈' : '')) + '</span></button>';
  }).join("");
  $("naHint").textContent = nextI < 0 ? "🎉 이 단계는 다 했어요! 다음 단계에 도전해요." : "노란 테두리가 지금 할 차례예요.";
}
// 읽어 주기: "프랑스, 수도는 파리"
function naSay(x){ stopAll(); return speak(x[1] + ", 수도는 " + x[2], 0.9); }
function naCards(){
  $("ncTitle").textContent = ME + " · " + NA.lv.t;
  $("ncList").innerHTML = natItems().map(function(x, i){
    return '<div class="ncard" onclick="naSay(natItems()[' + i + '])">' + natImg(x, 54) + '<div class="nn">' + esc(x[1]) + '</div><div class="nc">🏙 ' + esc(x[2]) + '</div><div class="nt">' + esc(x[3]) + (NAT_NOTE[x[1]] ? ' · 💡' : '') + '</div>' + (NAT_NOTE[x[1]] ? '<div class="nt" style="color:#0e7490">' + esc(NAT_NOTE[x[1]]) + '</div>' : '') + '</div>';
  }).join("");
  go("vNatCard");
}
async function naReadAll(){
  stopAll(); var my = runId, cs = document.querySelectorAll("#ncList .ncard"), L = natItems();
  for(var i = 0; i < cs.length; i++){
    if(my !== runId) return;
    [].forEach.call(cs, function(c, j){ c.style.outline = j === i ? "4px solid #facc15" : "none"; });
    try { cs[i].scrollIntoView({ block: "nearest" }); } catch(e){}
    await naSay(L[i]); my = runId; await wait(300);
  }
  [].forEach.call(cs, function(c){ c.style.outline = "none"; });
  var st = stepsOf(ME, natKey()); if(!st.s1){ st.s1 = true; save(); }
  gainXp(XP.listenAll, "나라 " + NA.lv.t + " 끝까지 들었어요!", natKey() + "|listen");
}

// ②③④⑤ 문제 — flag: 국기 → 나라 · cap: 나라 → 수도 · rev: 수도 → 나라 · test: 섞어서
var NQ = null;
function naWrongItems(){
  var arr = ((DB.rec[ME] || {})[natKey()]) || [], seen = {}, out = [];
  (Array.isArray(arr) ? arr : []).forEach(function(r){ (r && r.wrong || []).forEach(function(w){
    var nm = String(w).replace(/^q:/, "").split(" ")[0], x = NAT.filter(function(z){ return z[1] === nm || z[1].replace(/\s/g, "") === nm; })[0];
    if(x && !seen[x[0]]){ seen[x[0]] = 1; out.push(x); }
  }); });
  return out;
}
function naStart(mode){
  var L = natItems(), qs = [], K = ["flag", "cap", "rev"];
  if(mode === "wrong"){
    var wr = naWrongItems(); if(!wr.length){ alert("틀린 게 없어요! 👍"); return; }
    qs = shuffle(wr).map(function(x, i){ return { x: x, kind: K[i % 3] }; });
    NQ = { mode: "test", qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now(), retry: true };
    $("nqTitle").textContent = ME + " · " + NA.lv.t + " · ❌ 틀린 것 다시 풀기";
    go("vNatQuiz"); naNext(); return;
  }
  if(mode === "test") qs = shuffle(L).slice(0, Math.min(15, L.length)).map(function(x, i){ return { x: x, kind: K[i % 3] }; });
  NQ = { mode: mode, qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now() };
  $("nqTitle").textContent = ME + " · " + NA.lv.t + " · " + ({ flag: "🏳 국기 보고 나라", cap: "🏙 나라 보고 수도", rev: "🔁 수도 보고 나라", test: "📝 시험" }[mode]);
  go("vNatQuiz"); naNext();
}
function naNext(){
  var m = NQ, L = natItems(), x, kind;
  if(m.mode === "test"){ x = m.qs[m.idx].x; kind = m.qs[m.idx].kind; }
  else { x = L[RN(0, L.length - 1)]; if(m.cur && L.length > 1) while(x === m.cur) x = L[RN(0, L.length - 1)]; kind = m.mode; }
  m.cur = x; m.kind = kind; m.miss = 0; m.busy = false; $("nqFb").textContent = "";
  var pool = L.length >= 4 ? L : NAT, others = shuffle(pool.filter(function(z){ return z !== x && z[2] !== x[2]; })).slice(0, 3), opts = shuffle(others.concat([x]));
  var col = kind === "cap" ? 2 : 1;
  if(kind === "flag"){ $("nqAsk").textContent = "이 국기는 어느 나라일까요?"; $("nqQ").innerHTML = natImg(x, 120); }
  else if(kind === "cap"){ $("nqAsk").textContent = "이 나라의 수도는?"; $("nqQ").innerHTML = natImg(x, 70) + '<div style="font-size:40px;font-weight:900;color:#14532d;margin-top:6px">' + esc(x[1]) + '</div>'; speak(x[1] + "의 수도는?", 0.9); }
  else { $("nqAsk").textContent = "이 도시는 어느 나라의 수도일까요?"; $("nqQ").innerHTML = '<div style="font-size:' + (x[2].length > 8 ? 30 : 42) + 'px;font-weight:900;color:#b45309">🏙 ' + esc(x[2]) + '</div>'; speak(x[2] + natJo(x[2]) + " 어느 나라 수도일까요?", 0.9); }
  $("nqOpts").innerHTML = opts.map(function(o){ var t = o[col]; return '<button class="wopt" style="font-size:' + (t.length > 9 ? 17 : 22) + 'px" data-v="' + o[0] + '" onclick="naPick(this)">' + esc(t) + '</button>'; }).join("");
  naInfo();
}
function naInfo(){
  var m = NQ;
  if(m.mode === "test"){ $("nqInfo").innerHTML = '<b style="font-size:30px;color:#1d4ed8">' + (m.idx + 1) + '</b> / ' + m.qs.length + '문제'; $("nqBar").style.width = (m.idx / m.qs.length * 100) + "%"; }
  else { $("nqInfo").innerHTML = '⭕ <b style="font-size:26px;color:#15803d">' + m.right + '</b> / 10 맞히기 · ❌ ' + m.wrong; $("nqBar").style.width = Math.min(100, m.right * 10) + "%"; }
}
function naPick(btn){
  var m = NQ; if(!m || m.busy) return;
  var v = btn.getAttribute("data-v"), x = m.cur, ok = v === x[0];
  if(m.mode === "test"){
    var got = NAT.filter(function(z){ return z[0] === v; })[0];
    m.ok[m.idx] = ok; m.ans[m.idx] = got ? got[m.kind === "cap" ? 2 : 1] : v;
    if(m.idx < m.qs.length - 1){ m.idx++; naNext(); } else naFinish();
    return;
  }
  if(ok){
    m.right++; m.busy = true; btn.style.background = "#15803d";
    $("nqFb").innerHTML = '<span style="color:#15803d">⭕ 딩동댕! ' + natImg(x, 26) + ' <b>' + esc(x[1]) + '</b> — 수도 <b>' + esc(x[2]) + '</b></span>' + (NAT_NOTE[x[1]] ? '<div style="font-size:14px;color:#0e7490">💡 ' + esc(NAT_NOTE[x[1]]) + '</div>' : '');
    speak(x[1] + ", 수도는 " + x[2], 0.95);
    gainXp(2, "연습", natKey() + "|prac");
    setTimeout(function(){
      if(m.right >= 10 && !m.doneShown){ m.doneShown = true; var st = stepsOf(ME, natKey()), s = { flag: "s2", cap: "s3", rev: "s4" }[m.mode]; if(!st[s]){ st[s] = true; save(); } alert(({ flag: "🏳 국기 보고 나라", cap: "🏙 나라 보고 수도", rev: "🔁 수도 보고 나라" }[m.mode]) + " 10개 성공! (계속해도 돼요)"); }
      naNext();
    }, 1300);
  } else {
    m.wrong++; m.miss++; btn.style.background = "#b91c1c";
    $("nqFb").innerHTML = m.miss >= 2 ? '<span style="color:#b91c1c">❌ 정답은 ' + natImg(x, 24) + ' <b>' + esc(x[1]) + '</b> — 수도 <b>' + esc(x[2]) + '</b></span>' : '<span style="color:#b91c1c">❌ 다시 해 봐요!</span>';
    naInfo();
  }
}
function naQuit(){ stopAll(); if(NQ && NQ.mode === "test" && NQ.idx > 0 && !confirm("시험을 그만할까요? (점수는 안 남아요)")) return; NQ = null; go("vNatMode"); }
function naFinish(){
  var m = NQ, k = natKey(), n = m.qs.length, ok = m.ok.filter(Boolean).length, sc = Math.round(ok / n * 100), sec = Math.round((Date.now() - m.t0) / 1000);
  var lab = { flag: "국기→나라", cap: "나라→수도", rev: "수도→나라" };
  var li = function(q, i){ return '<li>' + (m.ok[i] ? "⭕" : "❌") + ' <span style="color:#64748b;font-size:13px">' + lab[q.kind] + '</span> ' + natImg(q.x, 22) + ' <b>' + esc(q.x[1]) + '</b> · ' + esc(q.x[2]) + (m.ok[i] ? '' : ' <span style="color:#b91c1c">(고른 것 ' + esc(m.ans[i]) + ')</span>') + '</li>'; };
  if(m.retry){
    $("nrTitle").textContent = "❌ 틀린 것 다시 풀기 끝!";
    $("nrScore").innerHTML = '<b style="color:#1d4ed8">' + ok + ' / ' + n + '</b>' + (ok === n ? "이제 다 맞혀요! 👍" : "한 번 더 해 봐요");
    $("nrList").innerHTML = m.qs.map(li).join("");
    go("vNatRes"); gainXp(ok * 2, "다시 풀기", k + "|prac"); return;
  }
  var wasPassed = best(ME, k) != null && best(ME, k) >= passScore();
  var r = DB.rec[ME] = DB.rec[ME] || {}, arr = (r[k] = r[k] || []);
  var wrongTxt = m.qs.filter(function(q, i){ return !m.ok[i]; }).map(function(q){ return q.x[1].replace(/\s/g, "") + " (" + q.x[2] + ")"; });
  arr.push({ no: arr.length + 1, d: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    score: sc, n: n, ok: ok, diff: "normal", where: "screen", sheet: ME, sec: sec, wrong: wrongTxt.map(function(t){ return "q:" + t; }),
    res: m.qs.map(function(q, i){ return [0, i + 1, m.ok[i] ? 1 : 0, lab[q.kind] + " " + q.x[1] + " · " + q.x[2] + (m.ok[i] ? "" : " (고른 것 " + m.ans[i] + ")")]; }) });
  save();
  $("nrTitle").textContent = "🎉 끝! " + arr.length + "회차";
  $("nrScore").innerHTML = '<b style="color:' + (sc >= passScore() ? "#15803d" : "#b91c1c") + '">' + sc + '점</b>⭕ ' + ok + ' ❌ ' + (n - ok) + (sc === 100 ? " · 💯" : sc >= passScore() ? " · ✅ 통과!" : "");
  $("nrList").innerHTML = m.qs.map(li).join("");
  go("vNatRes"); speak(sc === 100 ? "백 점! 정말 잘했어요!" : "끝! " + sc + "점이에요!", 1);
  var xp = xpTest(ok, sc, XP.perfect, 1), why = "나라 " + NA.lv.t + " " + arr.length + "회차 " + sc + "점" + (sc === 100 ? " 💯" : "");
  if(!wasPassed && sc >= passScore()){ xp += XP.firstPass * (xpEarly() ? XP_RULE.early : 1); why += " · 첫 통과!"; }
  gainXp(xp, why, null);
  if(typeof kLog === "function") kLog("test", "🌍 나라 " + NA.lv.t + " " + arr.length + "회차 " + sc + "점 (" + ok + "/" + n + ")" + (wrongTxt.length ? "\n❌ " + wrongTxt.slice(0, 5).join(" / ") : " 💯"), { key: k, no: arr.length, score: sc, ok: ok, n: n, wrongTxt: wrongTxt });
}
// 기록 이름 (📈 내 기록 · 계급판)
var _lvNameNat0 = lvName;
lvName = function(k){ k = k == null ? lvKey() : String(k); if(k.indexOf("NAT·") === 0){ var x = NAT_LV.filter(function(v){ return v.id === k.slice(4); })[0]; return "🌍 나라 " + (x ? x.t : k.slice(4)); } return _lvNameNat0(k); };
