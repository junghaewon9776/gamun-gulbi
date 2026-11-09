// ============================================================================
// 🔤 알파벳 기초 — 영어를 처음 하는 아이용 (study-plus.js 다음에 붙음)
//   ABC 단계(A~I · J~R · S~Z · 전체): ① 보기(이름·소리·예시 단어) ② 🔊 소리 고르기 ③ 👂 듣고 고르기 ④ ✍️ 쓰기(대·소문자 따라 쓰기) ⑤ 📝 시험
//   소리는 한글로 비슷하게 (b = 브(ㅂ) 소리) — 짧은 모음 소리 기준 (a=애, e=에, i=이, o=아, u=어)
//   기록 키 "ABC·{id}" — 다른 공부처럼 DB.rec·경험치·알림·👦 아이들 탭에 쌓임
// ============================================================================
var ABC = [
  ["A", "에이", "애", "ㅐ", "apple", "사과", "🍎"], ["B", "비", "브", "ㅂ", "ball", "공", "⚽"], ["C", "씨", "크", "ㅋ", "cat", "고양이", "🐱"],
  ["D", "디", "드", "ㄷ", "dog", "개", "🐶"], ["E", "이", "에", "ㅔ", "egg", "달걀", "🥚"], ["F", "에프", "프", "ㅍ (윗니로 아랫입술)", "fish", "물고기", "🐟"],
  ["G", "지", "그", "ㄱ", "goat", "염소", "🐐"], ["H", "에이치", "흐", "ㅎ", "hat", "모자", "🎩"], ["I", "아이", "이", "ㅣ", "igloo", "이글루", "🧊"],
  ["J", "제이", "즈", "ㅈ", "jam", "잼", "🍓"], ["K", "케이", "크", "ㅋ", "kite", "연", "🪁"], ["L", "엘", "르", "ㄹ (혀끝을 윗니 뒤에)", "lion", "사자", "🦁"],
  ["M", "엠", "므", "ㅁ", "milk", "우유", "🥛"], ["N", "엔", "느", "ㄴ", "nose", "코", "👃"], ["O", "오", "아", "ㅏ", "octopus", "문어", "🐙"],
  ["P", "피", "프", "ㅍ", "pig", "돼지", "🐷"], ["Q", "큐", "쿠", "ㅋ+ㅜ", "queen", "여왕", "👑"], ["R", "알", "르", "ㄹ (혀를 말아서)", "rabbit", "토끼", "🐰"],
  ["S", "에스", "스", "ㅅ", "sun", "해", "☀️"], ["T", "티", "트", "ㅌ", "tiger", "호랑이", "🐯"], ["U", "유", "어", "ㅓ", "umbrella", "우산", "☂️"],
  ["V", "브이", "브", "ㅂ (윗니로 아랫입술)", "van", "승합차", "🚐"], ["W", "더블유", "워", "ㅜ+ㅓ", "water", "물", "💧"], ["X", "엑스", "크스", "ㅋ+ㅅ", "box", "상자", "📦"],
  ["Y", "와이", "이", "ㅣ", "yo-yo", "요요", "🪀"], ["Z", "지", "즈", "ㅈ (벌 소리처럼)", "zebra", "얼룩말", "🦓"]
].map(function(r){ return { L: r[0], l: r[0].toLowerCase(), nm: r[1], snd: r[2], jamo: r[3], ex: r[4], exK: r[5], em: r[6] }; });
var ABC_SND = {}; ABC.forEach(function(x){ ABC_SND[x.l] = x.snd; });
var ABC_LV = [
  // 🅰 대·소문자만 — 글자 모양과 이름만 (소리·단어 없이)
  { id: "u1", t: "대·소문자만 A ~ M", from: 0, to: 13, only: true }, { id: "u2", t: "대·소문자만 N ~ Z", from: 13, to: 26, only: true }, { id: "u3", t: "대·소문자만 A ~ Z 전체", from: 0, to: 26, only: true },
  // 🔤 소리까지 — 이름 · 소리(b = 브) · 예시 단어
  { id: "a1", t: "A ~ I", from: 0, to: 9 }, { id: "a2", t: "J ~ R", from: 9, to: 18 }, { id: "a3", t: "S ~ Z", from: 18, to: 26 }, { id: "a4", t: "A ~ Z 전체", from: 0, to: 26 }
];
var AB = { lv: null };
function abcItems(){ return ABC.slice(AB.lv.from, AB.lv.to); }
function abcKey(){ return "ABC·" + AB.lv.id; }
// 단어를 소리 하나씩: cat → 크·애·트
function abcBlend(w){ return String(w).toLowerCase().split("").filter(function(c){ return ABC_SND[c]; }).map(function(c){ return ABC_SND[c]; }).join("·"); }

// 화면 만들기
(function(){
  var css = document.createElement("style");
  css.textContent = ".abig{font-family:'Comic Sans MS','Segoe Print','Malgun Gothic',sans-serif;font-weight:800}"
    + ".acard{background:#eff6ff;border:3px solid #bfdbfe;border-radius:14px;padding:10px 6px;text-align:center;cursor:pointer}"
    + ".acard .abig{font-size:46px;color:#1d4ed8;line-height:1.1;display:block}.acard .nm{font-size:15px;font-weight:800;color:#334155}"
    + ".acard .sd{font-size:15px;font-weight:800;color:#b45309}.acard .ex{font-size:13px;color:#475569}";
  document.head.appendChild(css);
  var W = document.querySelector(".wrap") || document.body, before = document.getElementById("vSet");
  var html = ''
    + '<section id="vAbc" class="hidden"><div class="row" style="margin-bottom:10px"><button class="back" onclick="wsGo(\'eng\')">◀ 영어</button><div class="who"><b id="abWho"></b></div></div>'
    + '<div class="card"><h2>🔤 알파벳 기초</h2><div class="hint" style="margin-bottom:10px">알파벳마다 <b>이름</b>(비)과 <b>소리</b>(브 = ㅂ 소리)가 달라요. 소리를 알면 처음 보는 단어도 읽을 수 있어요!</div><div id="abLevels" class="grid g2"></div>'
    + '<button class="big" style="margin-top:12px;background:#0f766e" onclick="wsGo(\'eng\');setTimeout(function(){var e=document.querySelector(\'#wsLevels\');if(e)e.scrollIntoView();},50)">🧩 다음: 파닉스 — 소리 합쳐서 단어 읽기 ▶</button></div></section>'
    + '<section id="vAbcMode" class="hidden"><div class="card"><div class="row" style="margin-bottom:12px"><button class="back" onclick="go(\'vAbc\')">◀ 단계</button><div class="who"><b id="abModeTitle"></b></div></div><div id="abSteps"></div><div class="hint" id="abHint"></div></div></section>'
    + '<section id="vAbcCard" class="hidden"><div class="card"><div class="row" style="margin-bottom:8px"><button class="back" onclick="stopAll();go(\'vAbcMode\')">◀ 단계</button><div class="who"><b id="acTitle"></b></div></div>'
    + '<div class="row" style="margin-bottom:6px"><button class="b-ok" onclick="abReadAll()">🔊 다 읽어주기</button></div><div class="hint">카드를 누르면 <b>이름 → 소리 → 단어</b>를 읽어 줘요. 「다 읽어주기」를 끝까지 들으면 ① 완료!</div><div class="grid g3" id="acList" style="margin-top:10px"></div>'
    + '<button class="big" style="margin-top:12px" onclick="stopAll();abStart(\'snd\')">🔊 ② 소리 고르기 하러 가기 ▶</button></div></section>'
    + '<section id="vAbcQuiz" class="hidden"><div class="card"><div class="row" style="margin-bottom:6px"><button class="back" onclick="abQuit()">■ 그만</button><div class="who"><b id="aqTitle"></b></div></div>'
    + '<div class="num"><span id="aqInfo"></span></div><div class="bar"><i id="aqBar"></i></div><div id="aqAsk" style="text-align:center;color:#64748b;font-size:17px;margin-top:10px"></div><div id="aqQ" style="text-align:center;margin:12px 0 6px"></div>'
    + '<div class="grid g2" id="aqOpts" style="margin-top:10px"></div><div class="feedback" id="aqFb"></div></div></section>'
    + '<section id="vAbcWrite" class="hidden"><div class="card"><div class="row" style="margin-bottom:6px"><button class="back" onclick="go(\'vAbcMode\')">◀ 단계</button><div class="who"><b id="awTitle"></b></div></div>'
    + '<div style="text-align:center"><div id="awInfo" style="font-size:20px;font-weight:900;color:#1d4ed8;margin:4px 0"></div></div><div id="awPad"></div>'
    + '<div class="row" style="margin-top:8px"><button class="b-dark" onclick="abWriteSay()">🔊 듣기</button><button class="b-ok" onclick="abWriteNext()">다음 ▶</button></div><div class="hint">회색 글자 위를 따라 써요. 대문자 다음엔 소문자예요. <b>위에서 아래로, 왼쪽에서 오른쪽으로</b> 써요.</div></div></section>'
    + '<section id="vAbcRes" class="hidden"><div class="card"><h2 id="arTitle" style="text-align:center"></h2><div class="score" id="arScore"></div><ol class="res" id="arList" style="padding:0"></ol>'
    + '<div class="row" style="margin-top:12px"><button class="b-dark" onclick="go(\'vAbcMode\')">🪜 단계로</button><button class="b-dark" onclick="go(\'vAbc\')">🔤 다른 단계</button></div></div></section>';
  var box = document.createElement("div"); box.innerHTML = html;
  while(box.firstChild){ if(before) W.insertBefore(box.firstChild, before); else W.appendChild(box.firstChild); }
  ["vAbc", "vAbcMode", "vAbcCard", "vAbcQuiz", "vAbcWrite", "vAbcRes"].forEach(function(v){ VIEWS.push(v); });
})();
// 과목 단추줄(받아쓰기·수학·한자·영어)에 🔤 ABC 단추 — 어디서든 바로 알파벳으로
var AB_BTN = '<button class="abBtn" style="font-size:19px;background:#1d4ed8" onclick="go(\'vAbc\')">🔤 ABC</button>';
(function(){
  ["vLevel", "vMath"].forEach(function(v){ var row = document.querySelector("#" + v + " .card .row"); if(row && !row.querySelector(".abBtn")) row.insertAdjacentHTML("beforeend", AB_BTN); });
})();
var _goAbc0 = go;
go = function(id){
  _goAbc0(id);
  if(id === "vWs"){ var r = document.getElementById("wsSubRow"); if(r && !r.querySelector(".abBtn")) r.insertAdjacentHTML("beforeend", AB_BTN); }
  if(id === "vAbc") abRenderLevels(); if(id === "vAbcMode") abRenderSteps();
};

function abRenderLevels(){
  $("abWho").textContent = whoLabel(ME);
  var tile = function(x){
    var k = "ABC·" + x.id, b = best(ME, k), st = stepsOf(ME, k);
    var badge = b == null ? "" : (b >= passScore() ? '<span class="badge">✅ ' + b + '점</span>' : '<span class="badge no">' + b + '점</span>');
    var dots = (st.s1 ? "●" : "○") + (st.s2 ? "●" : "○") + (st.s3 ? "●" : "○") + (st.s4 ? "●" : "○") + (b != null && b >= passScore() ? "●" : "○");
    return '<button class="lv" style="background:' + (x.only ? "#7c3aed" : "#1d4ed8") + '" onclick="AB.lv=ABC_LV[' + ABC_LV.indexOf(x) + '];go(\'vAbcMode\')">' + badge + (x.only ? '🅰 ' : '🔤 ') + x.t + '<small class="abig" style="font-size:18px">' + ABC.slice(x.from, Math.min(x.to, x.from + 6)).map(function(a){ return a.L + a.l; }).join(" ") + (x.to - x.from > 6 ? " …" : "") + '</small><span class="dots">' + dots + '</span></button>';
  };
  $("abLevels").innerHTML = '<div style="grid-column:1/-1;font-weight:800;margin:4px 0 2px">🅰 1단계: 대문자·소문자 익히기 <span style="font-weight:600;color:#64748b;font-size:13px">— 글자 모양과 이름만</span></div>'
    + ABC_LV.filter(function(x){ return x.only; }).map(tile).join("")
    + '<div style="grid-column:1/-1;font-weight:800;margin:12px 0 2px">🔤 2단계: 글자 소리 익히기 <span style="font-weight:600;color:#64748b;font-size:13px">— b 는 「브」(ㅂ) 소리</span></div>'
    + ABC_LV.filter(function(x){ return !x.only; }).map(tile).join("");
}
function abRenderSteps(){
  var k = abcKey(), st = stepsOf(ME, k), b = best(ME, k), passed = b != null && b >= passScore();
  $("abModeTitle").textContent = ME + " · 🔤 " + AB.lv.t;
  var only = AB.lv.only;
  var steps = [
    { done: st.s1, t: "📖 보기", d: only ? "대문자 · 소문자 모양과 이름 듣기" : "글자 이름 · 소리 · 단어 듣기", c: "#15803d", f: "abCards()" },
    { done: st.s2, t: only ? "🔁 짝 찾기" : "🔊 소리 고르기", d: only ? "대문자 ↔ 소문자 짝 찾기 — 10개 맞히면 완료" : "글자를 보고 무슨 소리인지 — 10개 맞히면 완료", c: "#0891b2", f: "abStart('snd')" },
    { done: st.s3, t: "👂 듣고 고르기", d: only ? "이름을 듣고 글자 찾기 — 10개 맞히면 완료" : "이름·소리를 듣고 글자 찾기 — 10개 맞히면 완료", c: "#7c3aed", f: "abStart('hear')" },
    { done: st.s4, t: "✍️ 쓰기", d: "대문자 · 소문자 따라 쓰기", c: "#b45309", f: "abWrite()" },
    { done: passed, t: "📝 시험", d: b == null ? "10문제" : "최고 " + b + "점" + (passed ? " ✅ 통과" : ""), c: "#1d4ed8", f: "abStart('test')" }
  ];
  var wr = abWrongItems();
  if(wr.length) steps.push({ done: false, opt: true, t: "❌ 틀린 것 다시 풀기 (" + wr.length + "개)", d: wr.map(function(a){ return a.L + a.l; }).join(" "), c: "#b91c1c", f: "abStart('wrong')" });
  var nextI = steps.findIndex(function(s){ return !s.done && !s.opt; });
  $("abSteps").innerHTML = steps.map(function(s, i){
    return '<button class="step' + (i === nextI ? ' next' : '') + '" style="background:' + s.c + '" onclick="' + s.f + '"><span class="n">' + (i + 1) + '</span><span class="t">' + s.t + '<small>' + esc(s.d) + '</small></span><span class="ck">' + (s.done ? '✅' : (i === nextI ? '👈' : '')) + '</span></button>';
  }).join("");
  $("abHint").textContent = nextI < 0 ? "🎉 이 단계는 다 했어요! 다음 단계에 도전해요." : "노란 테두리가 지금 할 차례예요.";
}
// 한 글자 읽어 주기: 이름(영어) → "브 소리" → 단어(영어) → 뜻
function abSay(a){
  stopAll();
  if(AB.lv && AB.lv.only) return speakEn(a.L, 0.7).then(function(){ return wait(200); }).then(function(){ return speak(a.nm, 0.85); });
  return speakEn(a.L, 0.7).then(function(){ return wait(250); }).then(function(){ return speak(a.snd + " 소리", 0.85); })
    .then(function(){ return wait(250); }).then(function(){ return speakEn(a.ex, 0.75); }).then(function(){ return speak(a.exK, 0.9); });
}
function abCards(){
  $("acTitle").textContent = ME + " · " + AB.lv.t;
  $("acList").innerHTML = abcItems().map(function(a, i){
    if(AB.lv.only) return '<div class="acard" onclick="abSay(abcItems()[' + i + '])"><span class="abig" style="font-size:60px">' + a.L + ' ' + a.l + '</span><span class="nm" style="font-size:18px">「' + a.nm + '」</span></div>';
    return '<div class="acard" onclick="abSay(abcItems()[' + i + '])"><span class="abig">' + a.L + ' ' + a.l + '</span><span class="nm">이름 「' + a.nm + '」</span><br><span class="sd">소리 「' + a.snd + '」 ' + esc(a.jamo) + '</span><br><span class="ex">' + a.em + ' <b>' + a.ex + '</b> ' + a.exK + '</span></div>';
  }).join("");
  go("vAbcCard");
}
async function abReadAll(){
  stopAll(); var my = runId, cs = document.querySelectorAll("#acList .acard"), L = abcItems();
  for(var i = 0; i < cs.length; i++){
    if(my !== runId) return;
    [].forEach.call(cs, function(c, j){ c.style.outline = j === i ? "4px solid #facc15" : "none"; });
    await abSay(L[i]); my = runId; await wait(300);
  }
  [].forEach.call(cs, function(c){ c.style.outline = "none"; });
  var st = stepsOf(ME, abcKey()); if(!st.s1){ st.s1 = true; save(); }
  gainXp(XP.listenAll, "알파벳 " + AB.lv.t + " 끝까지 들었어요!", abcKey() + "|listen");
}

// ②③⑤ 문제 — snd: 글자 → 소리 고르기 · hear: 듣고 → 글자 고르기 · test: 섞어서
var AQ = null;
// 이 단계 지난 시험에서 틀린 글자 (기록의 wrong: "q:Bb 「브」" → B)
function abWrongItems(){
  var arr = ((DB.rec[ME] || {})[abcKey()]) || [], seen = {}, out = [];
  (Array.isArray(arr) ? arr : []).forEach(function(r){ (r && r.wrong || []).forEach(function(w){
    var c = String(w).replace(/^q:/, "").charAt(0).toUpperCase(), a = ABC.filter(function(x){ return x.L === c; })[0];
    if(a && !seen[c]){ seen[c] = 1; out.push(a); }
  }); });
  return out;
}
function abStart(mode){
  var L = abcItems(), qs = [];
  if(mode === "wrong"){
    var wr = abWrongItems(); if(!wr.length){ alert("틀린 게 없어요! 👍"); return; }
    qs = shuffle(wr).map(function(a, i){ return { a: a, kind: AB.lv.only ? ["low", "up", "hear"][i % 3] : ["snd", "hear", "low"][i % 3] }; });
    AQ = { mode: "test", qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now(), retry: true };
    $("aqTitle").textContent = ME + " · " + AB.lv.t + " · ❌ 틀린 것 다시 풀기";
    go("vAbcQuiz"); abNext(); return;
  }
  if(mode === "test") qs = shuffle(L).map(function(a, i){ return { a: a, kind: AB.lv.only ? ["low", "up", "hear"][i % 3] : ["snd", "hear", "low"][i % 3] }; });
  AQ = { mode: mode, qs: qs, idx: 0, ok: [], ans: [], right: 0, wrong: 0, miss: 0, t0: Date.now() };
  $("aqTitle").textContent = ME + " · " + AB.lv.t + " · " + ({ snd: AB.lv.only ? "🔁 짝 찾기" : "🔊 소리 고르기", hear: "👂 듣고 고르기", test: "📝 시험" }[mode]);
  go("vAbcQuiz"); abNext();
}
function abNext(){
  var m = AQ, L = abcItems(), a, kind;
  if(m.mode === "test"){ a = m.qs[m.idx].a; kind = m.qs[m.idx].kind; }
  else { a = L[RN(0, L.length - 1)]; if(m.cur && L.length > 1) while(a === m.cur) a = L[RN(0, L.length - 1)]; kind = m.mode; if(AB.lv.only && kind === "snd") kind = RN(0, 1) ? "low" : "up"; }
  m.cur = a; m.kind = kind; m.miss = 0; m.busy = false; $("aqFb").textContent = "";
  var pool = L.length >= 4 ? L : ABC, others = shuffle(pool.filter(function(x){ return x !== a; })).slice(0, 3), opts = shuffle(others.concat([a]));
  if(kind === "snd"){
    // 같은 소리가 나는 글자(c·k, i·y …)는 보기에서 빼서 헷갈리지 않게
    opts = shuffle(shuffle(pool.filter(function(x){ return x !== a && x.snd !== a.snd; })).slice(0, 3).concat([a]));
    $("aqAsk").textContent = "이 글자는 무슨 소리가 날까요?";
    $("aqQ").innerHTML = '<span class="abig" style="font-size:96px;color:#1d4ed8">' + a.L + ' ' + a.l + '</span>';
    $("aqOpts").innerHTML = opts.map(function(o){ return '<button class="wopt" data-v="' + o.L + '" onclick="abPick(this)">「' + o.snd + '」 소리<br><small style="font-weight:600;font-size:13px">' + esc(o.jamo) + '</small></button>'; }).join("");
  } else if(kind === "hear"){
    $("aqAsk").innerHTML = '🔊 잘 듣고 글자를 골라요 <button class="b-dark" style="font-size:14px;padding:6px 10px" onclick="abSay(AQ.cur)">다시 듣기</button>';
    $("aqQ").innerHTML = '<span style="font-size:60px">👂</span>';
    $("aqOpts").innerHTML = opts.map(function(o){ return '<button class="wopt abig" style="font-size:40px" data-v="' + o.L + '" onclick="abPick(this)">' + o.L + ' ' + o.l + '</button>'; }).join("");
    abSay(a);
  } else if(kind === "up"){   // up: 소문자 보고 대문자 고르기
    $("aqAsk").textContent = "이 소문자의 대문자는?";
    $("aqQ").innerHTML = '<span class="abig" style="font-size:96px;color:#7c3aed">' + a.l + '</span>';
    $("aqOpts").innerHTML = opts.map(function(o){ return '<button class="wopt abig" style="font-size:44px" data-v="' + o.L + '" onclick="abPick(this)">' + o.L + '</button>'; }).join("");
  } else {   // low: 대문자 보고 소문자 고르기
    $("aqAsk").textContent = "이 대문자의 소문자는?";
    $("aqQ").innerHTML = '<span class="abig" style="font-size:96px;color:#1d4ed8">' + a.L + '</span>';
    $("aqOpts").innerHTML = opts.map(function(o){ return '<button class="wopt abig" style="font-size:44px" data-v="' + o.L + '" onclick="abPick(this)">' + o.l + '</button>'; }).join("");
  }
  abInfo();
}
function abInfo(){
  var m = AQ;
  if(m.mode === "test"){ $("aqInfo").innerHTML = '<b style="font-size:30px;color:#1d4ed8">' + (m.idx + 1) + '</b> / ' + m.qs.length + '문제'; $("aqBar").style.width = (m.idx / m.qs.length * 100) + "%"; }
  else { $("aqInfo").innerHTML = '⭕ <b style="font-size:26px;color:#15803d">' + m.right + '</b> / 10 맞히기 · ❌ ' + m.wrong; $("aqBar").style.width = Math.min(100, m.right * 10) + "%"; }
}
function abPick(btn){
  var m = AQ; if(!m || m.busy) return;
  var v = btn.getAttribute("data-v"), a = m.cur, ok = v === a.L;
  if(m.mode === "test"){
    m.ok[m.idx] = ok; m.ans[m.idx] = v;
    if(m.idx < m.qs.length - 1){ m.idx++; abNext(); } else abFinish();
    return;
  }
  if(ok){
    m.right++; m.busy = true; btn.style.background = "#15803d";
    $("aqFb").innerHTML = '<span style="color:#15803d">⭕ 딩동댕! <span class="abig">' + a.L + ' ' + a.l + '</span> ' + (AB.lv.only ? '「' + a.nm + '」' : '= 「' + a.snd + '」 소리') + '</span>';
    if(AB.lv.only) speakEn(a.L, 0.8); else speak(a.snd + " 소리", 0.9);
    gainXp(2, "연습", abcKey() + "|prac");
    setTimeout(function(){
      if(m.right >= 10 && !m.doneShown){ m.doneShown = true; var st = stepsOf(ME, abcKey()), s = m.mode === "snd" ? "s2" : "s3"; if(!st[s]){ st[s] = true; save(); } alert((m.mode === "snd" ? (AB.lv.only ? "🔁 짝 찾기" : "🔊 소리 고르기") : "👂 듣고 고르기") + " 10개 성공! (계속해도 돼요)"); }
      abNext();
    }, 900);
  } else {
    m.wrong++; m.miss++; btn.style.background = "#b91c1c";
    $("aqFb").innerHTML = m.miss >= 2 ? '<span style="color:#b91c1c">❌ 정답은 <b class="abig">' + a.L + ' ' + a.l + '</b> 「' + a.snd + '」 소리</span>' : '<span style="color:#b91c1c">❌ 다시 해 봐요!</span>';
    abInfo();
  }
}
function abQuit(){ stopAll(); if(AQ && AQ.mode === "test" && AQ.idx > 0 && !confirm("시험을 그만할까요? (점수는 안 남아요)")) return; AQ = null; go("vAbcMode"); }
function abFinish(){
  var m = AQ, k = abcKey(), n = m.qs.length, ok = m.ok.filter(Boolean).length, sc = Math.round(ok / n * 100), sec = Math.round((Date.now() - m.t0) / 1000);
  if(m.retry){   // ❌ 틀린 것 다시 풀기 — 기록엔 안 남기고 결과만
    $("arTitle").textContent = "❌ 틀린 것 다시 풀기 끝!";
    $("arScore").innerHTML = '<b style="color:#1d4ed8">' + ok + ' / ' + n + '</b>' + (ok === n ? "이제 다 맞혀요! 👍" : "한 번 더 해 봐요");
    $("arList").innerHTML = m.qs.map(function(q, i){ return '<li>' + (m.ok[i] ? "⭕" : "❌") + ' <b class="abig" style="font-size:24px">' + q.a.L + ' ' + q.a.l + '</b> 「' + q.a.snd + '」</li>'; }).join("");
    go("vAbcRes"); gainXp(ok * 2, "다시 풀기", k + "|prac"); return;
  }
  var wasPassed = best(ME, k) != null && best(ME, k) >= passScore();
  var r = DB.rec[ME] = DB.rec[ME] || {}, arr = (r[k] = r[k] || []);
  var wrongTxt = m.qs.filter(function(q, i){ return !m.ok[i]; }).map(function(q){ return q.a.L + q.a.l + " 「" + q.a.snd + "」"; });
  arr.push({ no: arr.length + 1, d: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    score: sc, n: n, ok: ok, diff: "normal", where: "screen", sheet: ME, sec: sec, wrong: wrongTxt.map(function(t){ return "q:" + t; }),
    res: m.qs.map(function(q, i){ return [0, i + 1, m.ok[i] ? 1 : 0, q.a.L + q.a.l + " 「" + q.a.snd + "」" + (m.ok[i] ? "" : " (고른 것 " + m.ans[i] + ")")]; }) });
  save();
  var lab = { snd: "소리", hear: "듣기", low: "소문자", up: "대문자" };
  $("arTitle").textContent = "🎉 끝! " + arr.length + "회차";
  $("arScore").innerHTML = '<b style="color:' + (sc >= passScore() ? "#15803d" : "#b91c1c") + '">' + sc + '점</b>⭕ ' + ok + ' ❌ ' + (n - ok) + (sc === 100 ? " · 💯" : sc >= passScore() ? " · ✅ 통과!" : "");
  $("arList").innerHTML = m.qs.map(function(q, i){ return '<li>' + (m.ok[i] ? "⭕" : "❌") + ' <span style="color:#64748b;font-size:14px">' + lab[q.kind] + '</span> <b class="abig" style="font-size:24px">' + q.a.L + ' ' + q.a.l + '</b> 「' + q.a.snd + '」 소리 · ' + q.a.ex + (m.ok[i] ? '' : ' <span style="color:#b91c1c">(고른 것 ' + esc(m.ans[i]) + ')</span>') + '</li>'; }).join("");
  go("vAbcRes"); speak(sc === 100 ? "백 점! 정말 잘했어요!" : "끝! " + sc + "점이에요!", 1);
  var xp = xpTest(ok, sc, XP.perfect, 1), why = "알파벳 " + arr.length + "회차 " + sc + "점" + (sc === 100 ? " 💯" : "");
  if(!wasPassed && sc >= passScore()){ xp += XP.firstPass * (xpEarly() ? XP_RULE.early : 1); why += " · 첫 통과!"; }
  gainXp(xp, why, null);
  if(typeof kLog === "function") kLog("test", "🔤 알파벳 " + AB.lv.t + " " + arr.length + "회차 " + sc + "점 (" + ok + "/" + n + ")" + (wrongTxt.length ? "\n❌ " + wrongTxt.slice(0, 5).join(" / ") : " 💯"), { key: k, no: arr.length, score: sc, ok: ok, n: n, wrongTxt: wrongTxt });
}

// ④ ✍️ 쓰기 — 큰 글씨 위에 따라 쓰기 (대문자 → 소문자)
var AW = { list: [], i: 0, pad: null };
function abWrite(){
  AW.list = []; abcItems().forEach(function(a){ AW.list.push({ a: a, ch: a.L }); AW.list.push({ a: a, ch: a.l }); });
  AW.i = 0; $("awTitle").textContent = ME + " · ✍️ " + AB.lv.t;
  go("vAbcWrite");
  if(!AW.pad) AW.pad = makePad($("awPad"), 260);
  setTimeout(function(){ AW.pad.size(); abWriteShow(); }, 30);
}
function abWriteShow(){
  var w = AW.list[AW.i];
  $("awInfo").innerHTML = '<span class="abig">' + w.ch + '</span> <span style="font-size:15px;color:#475569">(' + (w.ch === w.a.L ? "대문자" : "소문자") + ' · 「' + w.a.snd + '」 소리 · ' + (AW.i + 1) + '/' + AW.list.length + ')</span>';
  AW.pad.clear(); AW.pad.guide(w.ch);
  var gd = $("awPad").querySelector(".guide"); if(gd){ gd.style.fontSize = "200px"; gd.style.fontFamily = "'Comic Sans MS','Segoe Print',sans-serif"; gd.style.color = "rgba(100,116,139,.32)"; }
}
function abWriteSay(){ var w = AW.list[AW.i]; abSay(w.a); }
function abWriteNext(){
  if(AW.pad.empty()){ alert("회색 글자 위를 먼저 따라 써 봐요 ✍️"); return; }
  gainXp(1, "알파벳 쓰기", abcKey() + "|write");
  if(AW.i < AW.list.length - 1){ AW.i++; abWriteShow(); return; }
  var st = stepsOf(ME, abcKey()); if(!st.s4){ st.s4 = true; save(); }
  alert("✍️ " + AB.lv.t + " 대문자·소문자를 다 썼어요! 👏"); go("vAbcMode");
}

// 기록 이름 (📈 내 기록 · 계급판)
var _lvNameAbc0 = lvName;
lvName = function(k){ k = k == null ? lvKey() : String(k); if(k.indexOf("ABC·") === 0){ var x = ABC_LV.filter(function(v){ return v.id === k.slice(4); })[0]; return "🔤 알파벳 " + (x ? x.t : k.slice(4)); } return _lvNameAbc0(k); };
