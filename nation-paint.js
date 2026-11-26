// ============================================================================
// 🎨 국기 외우기 — 💡 연상 힌트 · 🎨 색칠하기 · ✏️ 기억해서 그리기 (nation.js 다음에 붙음)
// ============================================================================
// 💡 국기를 보고 떠올리는 말 (ISO 코드)
var NAT_TIP = {
  KR: "가운데 빨강·파랑 태극, 네 귀퉁이에 검은 막대 4개(건곤감리 — 하늘·땅·물·불)", KP: "위아래 파란 줄, 가운데 빨간 띠 + 흰 동그라미 안에 빨간 별",
  JP: "흰 바탕에 빨간 해 하나 — 「해가 뜨는 나라」", CN: "빨간 바탕에 노란 별 5개 (큰 별 1 + 작은 별 4)", MN: "빨강·파랑·빨강 세로, 왼쪽에 노란 무늬",
  VN: "빨간 바탕에 큰 노란 별 1개 — 중국은 별 5개, 베트남은 1개!", TH: "빨강·하양·파랑·하양·빨강 가로 — 가운데 파랑이 제일 두꺼워요",
  PH: "위 파랑·아래 빨강, 왼쪽 흰 세모 안에 노란 해", ID: "위 빨강·아래 하양 — 폴란드는 거꾸로(하양이 위)!", MY: "빨강·하양 줄무늬 + 파란 칸에 노란 초승달과 별 — 미국 국기랑 닮았어요",
  SG: "위 빨강·아래 하양, 빨강에 흰 초승달과 별 5개", IN: "주황·하양·초록 가로 + 가운데 파란 바퀴", SA: "초록 바탕에 흰 글씨와 칼", IR: "초록·하양·빨강 가로 + 가운데 빨간 무늬",
  TR: "빨간 바탕에 흰 초승달과 별", GB: "빨간 십자 + 흰 X + 빨간 X를 겹친 모양 — 호주·뉴질랜드 국기 귀퉁이에도 있어요",
  FR: "파랑·하양·빨강 세로 세 줄", DE: "검정·빨강·노랑 가로 세 줄 — 「검·빨·노」", IT: "초록·하양·빨강 세로 — 🍕 피자 색(바질·모차렐라·토마토)",
  ES: "빨강·노랑·빨강 가로 — 가운데 노랑이 두꺼워요, 왼쪽에 방패 그림", RU: "하양·파랑·빨강 가로 — 네덜란드는 빨강부터!", GR: "파랑·하양 줄무늬 + 왼쪽 위 흰 십자 — 파란 바다와 하얀 집",
  PT: "초록(좁게)·빨강 세로 + 가운데 노란 지구 그림과 방패", NL: "빨강·하양·파랑 가로 — 러시아는 하양부터", BE: "독일 색을 세로로 세운 것 (검정·노랑·빨강)",
  CH: "정사각형! 빨간 바탕에 흰 십자 — 구급상자 적십자는 이 국기 색을 뒤집은 것", AT: "빨강·하양·빨강 가로 — 빨간 빵 사이에 흰 크림",
  SE: "파란 바탕에 노란 십자 — 옆으로 치우친 북유럽 십자", NO: "빨간 바탕에 흰 테두리 파란 십자 — 아이슬란드는 색이 반대", FI: "흰 바탕에 파란 십자 — 하얀 눈과 파란 호수",
  DK: "빨간 바탕에 흰 십자 — 북유럽 십자의 원조", PL: "위 하양·아래 빨강 — 인도네시아는 거꾸로!", UA: "위 파랑·아래 노랑 — 파란 하늘 아래 노란 밀밭",
  IE: "초록·하양·주황 세로 — 초록이 깃대 쪽 (코트디부아르는 주황이 깃대 쪽)", US: "별 50개(주가 50개) + 빨강·하양 줄 13개", CA: "가운데 빨간 단풍잎 🍁, 양쪽에 빨간 띠",
  MX: "이탈리아 색(초록·하양·빨강) + 가운데 뱀을 문 독수리", BR: "초록 바탕 + 노란 마름모 + 파란 동그라미 — ⚽ 축구 유니폼 색", AR: "하늘색·하양·하늘색 가로 + 가운데 노란 해 ☀",
  CL: "위 하양·아래 빨강, 왼쪽 위 파란 칸에 흰 별 하나", PE: "빨강·하양·빨강 세로", CO: "노랑·파랑·빨강 가로 — 노랑이 두 배로 두꺼워요",
  EG: "빨강·하양·검정 가로 + 가운데 금색 독수리", ZA: "옆으로 누운 Y자 초록 띠 — 여섯 가지 색", KE: "검정·빨강·초록 가로 + 가운데 방패와 창 두 개",
  NG: "초록·하양·초록 세로 — 가운데만 하양", MA: "빨간 바탕에 초록 별(선으로 그린 별)", AU: "파란 바탕 + 영국 국기 + 흰 별들(남십자성)", NZ: "호주랑 비슷한데 별이 빨간색 4개!",
  RO: "파랑·노랑·빨강 세로 — 차드 국기와 거의 똑같아요", TD: "파랑·노랑·빨강 세로 — 루마니아 국기와 거의 똑같아요", HU: "빨강·하양·초록 가로 — 이탈리아 색을 눕힌 것",
  BG: "하양·초록·빨강 가로", LT: "노랑·초록·빨강 가로", EE: "파랑·검정·하양 가로", LU: "네덜란드랑 비슷한데 아래가 하늘색", CI: "주황·하양·초록 세로 — 아일랜드와 반대로 주황이 깃대 쪽",
  ML: "초록·노랑·빨강 세로 — 기니는 거꾸로(빨강부터)", GN: "빨강·노랑·초록 세로 — 말리는 거꾸로(초록부터)", BD: "초록 바탕에 빨간 동그라미 — 조금 왼쪽에 있어요",
  PW: "하늘색 바탕에 노란 보름달 🌕", LA: "빨강·파랑·빨강 가로 + 가운데 흰 보름달", MC: "인도네시아랑 똑같은 위 빨강·아래 하양", IS: "파란 바탕에 흰 테두리 빨간 십자 — 노르웨이와 색이 반대",
  NP: "세계에서 하나뿐인 네모가 아닌 국기 — 세모 두 개를 겹친 모양", KH: "가운데 하얀 사원(앙코르와트) 그림", LB: "가운데 초록 나무(삼나무) 🌲", CY: "국기에 노란 섬 모양이 그려져 있어요",
  JM: "노란 X자 + 초록·검정 세모", GH: "빨강·노랑·초록 가로 + 가운데 검은 별", AM: "빨강·파랑·주황 가로", YE: "빨강·하양·검정 가로 — 이집트 국기에서 독수리를 뺀 모양",
  SL: "초록·하양·파랑 가로", GA: "초록·노랑·파랑 가로", BO: "빨강·노랑·초록 가로", MU: "빨강·파랑·노랑·초록 가로 네 줄", AE: "왼쪽 빨간 세로 띠 + 초록·하양·검정 가로"
};
function natTip(x){ return NAT_TIP[x[0]] || ""; }

// 🎨 색칠 판 — 간단한 국기만 (줄무늬·동그라미·십자)
var NAT_PAL = { R: ["빨강", "#d52b1e"], B: ["파랑", "#0039a6"], S: ["하늘", "#6cace4"], G: ["초록", "#009b48"], Y: ["노랑", "#fcd116"], O: ["주황", "#ff8200"], W: ["하양", "#ffffff"], K: ["검정", "#111111"] };
var NAT_PAINT = { FR: "v:BWR", IT: "v:GWR", IE: "v:GWO", CI: "v:OWG", BE: "v:KYR", RO: "v:BYR", TD: "v:BYR", ML: "v:GYR", GN: "v:RYG", NG: "v:GWG", PE: "v:RWR",
  DE: "h:KRY", NL: "h:RWB", RU: "h:WBR", AT: "h:RWR", HU: "h:RWG", BG: "h:WGR", LT: "h:YGR", EE: "h:BKW", YE: "h:RWK", SL: "h:GWB", GA: "h:GYB", AM: "h:RBO", BO: "h:RYG", LU: "h:RWS",
  CO: "h:YBR:2,1,1", UA: "h:BY", PL: "h:WR", ID: "h:RW", MC: "h:RW", TH: "h:RWBWR:1,1,2,1,1", MU: "h:RBYG",
  JP: "o:W:R:50", BD: "o:G:R:45", PW: "o:S:Y:42", LA: "ho:RBR:1,2,1:W", SE: "x:B:Y", DK: "x:R:W", FI: "x:W:B", NO: "x:R:W:B", IS: "x:B:W:R", CH: "+:R:W" };
// 판 만들기 → { w, h, shapes:[{i, tag, attrs}], ans:[색 글자] }
function natPaintSpec(iso){
  var d = NAT_PAINT[iso]; if(!d) return null;
  var p = d.split(":"), t = p[0], W = 300, H = 200, S = [], A = [];
  var rect = function(i, x, y, w, h){ S.push({ i: i, tag: "rect", a: 'x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' }); };
  if(t === "v" || t === "h" || t === "ho"){
    var cs = p[1].split(""), ws = (p[2] || "").split(",").map(Number); if(ws.length !== cs.length || !ws[0]) ws = cs.map(function(){ return 1; });
    var tot = ws.reduce(function(a, b){ return a + b; }, 0), at = 0;
    cs.forEach(function(c, i){ var len = (t === "v" ? W : H) * ws[i] / tot; if(t === "v") rect(i, at, 0, len, H); else rect(i, 0, at, W, len); A.push(c); at += len; });
    if(t === "ho"){ S.push({ i: cs.length, tag: "circle", a: 'cx="150" cy="100" r="40"' }); A.push(p[3]); }
  } else if(t === "o"){ rect(0, 0, 0, W, H); A.push(p[1]); S.push({ i: 1, tag: "circle", a: 'cx="' + (W * Number(p[3]) / 100) + '" cy="100" r="60"' }); A.push(p[2]); }
  else if(t === "x"){ rect(0, 0, 0, W, H); A.push(p[1]); rect(1, 84, 0, 36, H); rect(1, 0, 80, W, 40); A.push(p[2]);
    if(p[3]){ rect(2, 93, 0, 18, H); rect(2, 0, 89, W, 22); A.push(p[3]); } }
  else if(t === "+"){ W = 200; rect(0, 0, 0, 200, 200); A.push(p[1]); rect(1, 80, 38, 40, 124); rect(1, 38, 80, 124, 40); A.push(p[2]); }
  return { w: W, h: H, S: S, ans: A };
}
function natPaintSvg(sp, fills, click){
  return '<svg viewBox="0 0 ' + sp.w + ' ' + sp.h + '" style="width:100%;max-width:' + (sp.w === 200 ? 240 : 340) + 'px;display:block;margin:0 auto;border:2px solid #334155;border-radius:4px;background:#fff;touch-action:manipulation">'
    + sp.S.map(function(s){ var f = fills[s.i] ? NAT_PAL[fills[s.i]][1] : "#f1f5f9"; return '<' + s.tag + ' ' + s.a + ' fill="' + f + '" stroke="#64748b" stroke-width="1.5"' + (click ? ' style="cursor:pointer" onclick="' + click + '(' + s.i + ')"' : '') + '/>'; }).join("") + '</svg>';
}
function natHex(c){ return NAT_PAL[c] ? NAT_PAL[c][1] : c; }
function natPaintable(lv){ return natItems(lv).filter(function(x){ return NAT_PAINT[x[0]]; }); }

(function(){
  var W = document.querySelector(".wrap") || document.body, before = document.getElementById("vSet");
  var box = document.createElement("div");
  box.innerHTML = '<section id="vNatPaint" class="hidden"><div class="card"><div class="row" style="margin-bottom:8px"><button class="back" onclick="stopAll();go(\'vNatMode\')">◀ 단계</button><div class="who"><b id="npTitle"></b></div></div><div id="npBody"></div></div></section>';
  while(box.firstChild){ if(before) W.insertBefore(box.firstChild, before); else W.appendChild(box.firstChild); }
  VIEWS.push("vNatPaint");
})();
var NP = null;
// ── 🎨 색칠하기 ──
function naPaint(){
  var L = natPaintable(); if(!L.length){ L = natPaintable({}); alert("이 단계엔 색칠할 수 있는 국기가 없어서, 다른 나라 국기로 해요!"); }
  NP = { mode: "paint", list: shuffle(L), i: 0, ok: 0 }; $("npTitle").textContent = ME + " · 🎨 국기 색칠하기"; go("vNatPaint"); naPaintShow();
}
function naPaintShow(){
  var x = NP.list[NP.i], sp = natPaintSpec(x[0]); NP.x = x; NP.sp = sp; NP.fills = {}; NP.col = NP.col || "R"; NP.tries = 0; NP.done = false;
  naPaintDraw(); speak(x[1] + " 국기를 색칠해 봐요", 0.95);
}
function naPaintDraw(msg){
  var x = NP.x, sp = NP.sp, tip = natTip(x);
  var h = '<div style="text-align:center;font-size:15px;color:#475569">' + (NP.i + 1) + ' / ' + NP.list.length + ' · 맞힌 것 ' + NP.ok + '</div><div style="text-align:center;font-size:28px;font-weight:900;color:#14532d;margin:4px 0">' + esc(x[1]) + ' 국기</div>';
  h += '<div style="text-align:center;margin-bottom:8px">' + (NP.hint ? '<div style="background:#ecfdf5;border-radius:10px;padding:6px 10px;font-size:16px;color:#065f46;font-weight:700">💡 ' + esc(tip || "색을 잘 떠올려 봐요!") + '</div>' : '<button class="b-dark" style="font-size:15px;padding:6px 12px" onclick="NP.hint=1;naPaintDraw()">💡 힌트 보기</button>')
    + (NP.peek && !NP.done && NP.tries < 2 ? '<div style="margin-top:6px">' + natImg(x, 70) + '</div>' : (!NP.done && NP.tries < 2 ? ' <button class="b-dark" style="font-size:15px;padding:6px 12px;margin-top:6px" onclick="NP.peek=1;naPaintDraw()">🏳 국기 보기</button>' : '')) + '</div>';
  h += natPaintSvg(sp, NP.fills, NP.done ? "" : "naPaintFill");
  if(!NP.done) h += '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:10px 0">' + Object.keys(NAT_PAL).map(function(k){ var on = NP.col === k; return '<button onclick="NP.col=\'' + k + '\';naPaintDraw()" style="width:58px;height:58px;border-radius:50%;border:' + (on ? "5px solid #f59e0b" : "2px solid #94a3b8") + ';background:' + NAT_PAL[k][1] + ';font-size:12px;font-weight:900;color:' + (k === "W" || k === "Y" ? "#111" : "#fff") + '">' + NAT_PAL[k][0] + '</button>'; }).join("") + '</div><div style="text-align:center;color:#64748b;font-size:14px">색을 고르고 → 국기 칸을 눌러 칠해요</div>';
  if(msg) h += '<div class="feedback" style="margin-top:6px">' + msg + '</div>';
  if(NP.done || NP.tries >= 2) h += '<div style="text-align:center;margin-top:8px"><div style="font-size:14px;color:#475569">진짜 ' + esc(x[1]) + ' 국기</div>' + natImg(x, 90) + '</div>';
  h += '<div class="row" style="margin-top:10px">' + (NP.done ? '<button class="b-ok" onclick="naPaintNext()">다음 국기 ▶</button>' : '<button class="b-ok" onclick="naPaintCheck()">✅ 다 칠했어요</button><button class="b-dark" onclick="NP.fills={};naPaintDraw()">🔄 지우기</button><button class="b-dark" onclick="naPaintNext()">⏭ 넘기기</button>') + '</div>';
  $("npBody").innerHTML = h;
}
function naPaintFill(i){ if(!NP || NP.done) return; NP.fills[i] = NP.col; naPaintDraw(); }
function naPaintCheck(){
  var a = NP.sp.ans, bad = 0, empty = 0; a.forEach(function(c, i){ if(!NP.fills[i]) empty++; else if(NP.fills[i] !== c) bad++; });
  if(empty){ naPaintDraw('<span style="color:#b45309">아직 안 칠한 칸이 ' + empty + '개 있어요</span>'); return; }
  if(!bad){ NP.done = true; NP.ok++; gainXp(3, "국기 색칠", natKey() + "|paint"); speak("딩동댕! " + NP.x[1] + " 국기예요!", 1); naPaintDraw('<span style="color:#15803d">⭕ 딩동댕! 똑같아요!</span>'); return; }
  NP.tries++; naPaintDraw('<span style="color:#b91c1c">❌ ' + bad + '칸의 색이 달라요' + (NP.tries >= 2 ? ' — 아래 진짜 국기를 보고 고쳐 봐요' : ' — 다시 생각해 봐요') + '</span>');
}
function naPaintNext(){ NP.hint = 0; NP.peek = 0; if(NP.i < NP.list.length - 1){ NP.i++; naPaintShow(); } else { alert("🎨 다 했어요! " + NP.list.length + "개 중 " + NP.ok + "개 맞혔어요 👏"); go("vNatMode"); } }

// ── ✏️ 기억해서 그리기 — 잠깐 보고, 가리고, 그리고, 비교 ──
var ND_PEEK = 5;
function naDraw(){ NP = { mode: "draw", list: shuffle(natItems()), i: 0, ok: 0, col: "R", size: 8, tool: "pen" }; $("npTitle").textContent = ME + " · ✏️ 기억해서 그리기"; go("vNatPaint"); naDrawPeek(); }
function naDrawPeek(){
  var x = NP.list[NP.i], tip = natTip(x); NP.x = x; NP.phase = "peek";
  $("npBody").innerHTML = '<div style="text-align:center;font-size:15px;color:#475569">' + (NP.i + 1) + ' / ' + NP.list.length + '</div><div style="text-align:center;font-size:28px;font-weight:900;color:#14532d;margin:4px 0">' + esc(x[1]) + '</div>'
    + '<div style="text-align:center;margin:8px 0">' + natImg(x, 150) + '</div>' + (tip ? '<div style="background:#ecfdf5;border-radius:10px;padding:8px 10px;font-size:17px;color:#065f46;font-weight:700;text-align:center">💡 ' + esc(tip) + '</div>' : '')
    + '<div style="text-align:center;font-size:20px;font-weight:900;margin:10px 0">👀 잘 보고 기억해요! <b id="ndCnt" style="color:#b91c1c">' + ND_PEEK + '</b></div><div class="row"><button class="b-ok" onclick="naDrawGo()">기억했어요! 그리기 ▶</button></div>';
  speak(x[1] + " 국기를 잘 보고 기억해요", 0.95);
  clearInterval(NP.tk); var n = ND_PEEK; NP.tk = setInterval(function(){ n--; var e = document.getElementById("ndCnt"); if(e) e.textContent = Math.max(0, n); if(n <= 0){ clearInterval(NP.tk); if(NP && NP.phase === "peek") naDrawGo(); } }, 1000);
}
function naDrawGo(){
  clearInterval(NP.tk); NP.phase = "draw";
  var tb = function(k, lb){ var on = NP.tool === k; return '<button onclick="NP.tool=\'' + k + '\';naDrawTools()" style="padding:8px 10px;border-radius:10px;border:0;font-weight:900;font-size:15px;background:' + (on ? "#1e3a8a" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#111") + '">' + lb + '</button>'; };
  $("npBody").innerHTML = '<div style="text-align:center;font-size:24px;font-weight:900;color:#14532d;margin-bottom:6px">✏️ ' + esc(NP.x[1]) + ' 국기를 그려요</div>'
    + '<div style="position:relative;max-width:360px;margin:0 auto"><canvas id="ndCv" width="600" height="400" style="width:100%;border:2px solid #334155;border-radius:4px;background:#fff;touch-action:none;display:block"></canvas></div>'
    + '<div id="ndTools"></div><div class="row" style="margin-top:8px"><button class="b-ok" onclick="naDrawDone()">🏁 다 그렸어요</button><button class="b-dark" onclick="naDrawClear(1)">🧽 전부 지우기</button></div>';
  NP._tb = tb; NP.hist = []; naDrawTools(); naDrawClear(); naDrawBind();
}
function naDrawTools(){
  var tb = NP._tb, h = '<div style="display:flex;gap:6px;justify-content:center;margin:8px 0 4px;flex-wrap:wrap">' + tb("pen", "✏️ 펜") + tb("line", "📏 직선") + tb("fill", "🪣 통 채우기") + '<button onclick="naDrawUndo()" style="padding:8px 10px;border-radius:10px;border:0;font-weight:900;font-size:15px;background:#b45309;color:#fff">↩ 한 획 지우기</button></div>';
  h += '<div style="display:flex;gap:5px;justify-content:center;margin:4px 0 6px;flex-wrap:wrap;align-items:center"><span style="font-size:13px;color:#475569;font-weight:800">굵기</span>' + [2, 4, 8, 14, 24].map(function(sz){ var on = NP.size === sz; return '<button onclick="NP.size=' + sz + ';if(NP.tool===\'fill\')NP.tool=\'pen\';naDrawTools()" style="width:40px;height:40px;border-radius:10px;border:' + (on ? "3px solid #f59e0b" : "1px solid #cbd5e1") + ';background:#fff"><span style="display:inline-block;width:' + Math.max(3, Math.round(sz / 1.3)) + 'px;height:' + Math.max(3, Math.round(sz / 1.3)) + 'px;border-radius:50%;background:' + natHex(NP.col) + ';border:1px solid #94a3b8"></span></button>'; }).join("") + '</div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;align-items:center">' + Object.keys(NAT_PAL).map(function(k){ var on = NP.col === k; return '<button onclick="NP.col=\'' + k + '\';naDrawTools()" title="' + NAT_PAL[k][0] + '" style="width:42px;height:42px;border-radius:50%;border:' + (on ? "5px solid #f59e0b" : "2px solid #94a3b8") + ';background:' + NAT_PAL[k][1] + '"></button>'; }).join("")
    + '<label title="아무 색이나 고르기" style="display:inline-flex;align-items:center;gap:3px;padding:4px 8px;border-radius:21px;border:' + (NAT_PAL[NP.col] ? "2px solid #94a3b8" : "5px solid #f59e0b") + ';background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);font-weight:900;font-size:13px;color:#fff;text-shadow:0 0 3px #000;cursor:pointer">🌈 다른 색<input type="color" value="' + (NAT_PAL[NP.col] ? "#ff69b4" : NP.col) + '" oninput="NP.col=this.value" onchange="NP.col=this.value;naDrawTools()" style="width:30px;height:30px;border:0;padding:0;background:none"></label></div>';
  var e = document.getElementById("ndTools"); if(e) e.innerHTML = h;
}
// ↩ 한 획 지우기 — 그리기 전 모습을 쌓아 두었다가 하나씩 되돌림
function _ndSnap(){ var c = document.getElementById("ndCv"); if(!c) return; NP.hist = NP.hist || []; NP.hist.push(c.getContext("2d").getImageData(0, 0, c.width, c.height)); if(NP.hist.length > 30) NP.hist.shift(); }
function naDrawUndo(){ var c = document.getElementById("ndCv"); if(!c || !NP.hist || !NP.hist.length){ return; } c.getContext("2d").putImageData(NP.hist.pop(), 0, 0); }
function naDrawClear(keep){ var c = document.getElementById("ndCv"); if(!c) return; if(keep) _ndSnap(); else NP.hist = []; var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
function naDrawBind(){
  var c = document.getElementById("ndCv"), g = c.getContext("2d"), down = false, last = null, st = null, base = null;
  var pos = function(ev){ var r = c.getBoundingClientRect(); return [(ev.clientX - r.left) * c.width / r.width, (ev.clientY - r.top) * c.height / r.height]; };
  c.addEventListener("pointerdown", function(ev){ ev.preventDefault(); var p = pos(ev), col = natHex(NP.col);
    _ndSnap();
    if(NP.tool === "fill"){ natFlood(c, Math.round(p[0]), Math.round(p[1]), col); return; }
    down = true; last = p; st = p;
    if(NP.tool === "line"){ base = g.getImageData(0, 0, c.width, c.height); }
    else { g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], NP.size, 0, 7); g.fill(); }
    try { c.setPointerCapture(ev.pointerId); } catch(e){} });
  c.addEventListener("pointermove", function(ev){ if(!down) return; ev.preventDefault(); var p = pos(ev); g.strokeStyle = natHex(NP.col); g.lineWidth = NP.size * 2; g.lineCap = "round";
    if(NP.tool === "line"){ g.putImageData(base, 0, 0); g.beginPath(); g.moveTo(st[0], st[1]); g.lineTo(p[0], p[1]); g.stroke(); return; }
    g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; });
  var up = function(){ down = false; base = null; }; c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
}
// 🪣 통 채우기 (비슷한 색이 이어진 곳만)
function natFlood(c, x, y, hex){
  var g = c.getContext("2d"), W = c.width, H = c.height; if(x < 0 || y < 0 || x >= W || y >= H) return;
  var im = g.getImageData(0, 0, W, H), d = im.data, o = (y * W + x) * 4, t = [d[o], d[o + 1], d[o + 2]];
  var nc = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  if(Math.abs(t[0] - nc[0]) + Math.abs(t[1] - nc[1]) + Math.abs(t[2] - nc[2]) < 10) return;
  var same = function(i){ return Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) < 90; };
  var st = [[x, y]], seen = new Uint8Array(W * H);
  while(st.length){ var q = st.pop(), px = q[0], py = q[1], k = py * W + px;
    if(px < 0 || py < 0 || px >= W || py >= H || seen[k]) continue; seen[k] = 1; var i = k * 4; if(!same(i)) continue;
    d[i] = nc[0]; d[i + 1] = nc[1]; d[i + 2] = nc[2]; d[i + 3] = 255; st.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]); }
  g.putImageData(im, 0, 0);
}
function naDrawDone(){
  var c = document.getElementById("ndCv"), url = c ? c.toDataURL("image/png") : "", x = NP.x, tip = natTip(x); NP.phase = "cmp";
  $("npBody").innerHTML = '<div style="text-align:center;font-size:24px;font-weight:900;color:#14532d;margin-bottom:8px">' + esc(x[1]) + ' — 비교해 봐요!</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center;text-align:center"><div><div style="font-weight:800;color:#475569">✏️ 내가 그린 것</div><img src="' + url + '" style="width:100%;border:2px solid #334155;border-radius:4px"></div><div><div style="font-weight:800;color:#475569">🏳 진짜 국기</div>' + natImg(x, 110).replace('height:110px', 'width:100%;height:auto') + '</div></div>'
    + (tip ? '<div style="background:#ecfdf5;border-radius:10px;padding:8px 10px;font-size:16px;color:#065f46;font-weight:700;text-align:center;margin-top:8px">💡 ' + esc(tip) + '</div>' : '')
    + '<div class="row" style="margin-top:10px"><button class="b-ok" onclick="naDrawRate(1)">⭕ 비슷하게 그렸어요</button><button class="b-dark" onclick="naDrawRate(0)">🔁 다시 그려 볼래요</button></div>';
  speak(x[1] + " 국기랑 비교해 봐요", 0.95);
}
function naDrawRate(ok){
  if(!ok){ naDrawPeek(); return; }
  NP.ok++; gainXp(3, "국기 그리기", natKey() + "|draw");
  if(NP.i < NP.list.length - 1){ NP.i++; naDrawPeek(); } else { alert("✏️ 다 그렸어요! 👏"); go("vNatMode"); }
}

// 📱 이 화면에선 아래로 끌어 새로고침(당겨서 새로고침) 막기 — 그리다가 실수로 처음으로 돌아가던 것
var _goNatPaint0 = go;
go = function(id){ _goNatPaint0(id); var on = id === "vNatPaint"; try { document.documentElement.style.overscrollBehaviorY = on ? "none" : ""; document.body.style.overscrollBehaviorY = on ? "none" : ""; } catch(e){} };
