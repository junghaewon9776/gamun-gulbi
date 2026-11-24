// ════════ 🥬 김장 — 포기 수만 넣으면 재료 양·비용 자동 · 4일 작업 일정·달력 · 인쇄 ════════
//   (엑셀 '김장김치 담는법 200포기 기준' 을 웹으로 — 부세 작업은 뺌)
//   /main/Kimjang/{해} = { pogi(올해 포기 수), base(재료 양 기준 포기 수 = 200), day3(담는 날 = 3일차), dd:{0~2: 따로 옮긴 날짜 — 없으면 담는 날에서 하루씩 앞},
//                          mat:{id:{nm, q(base 포기일 때 양), u(단위), how(손질), note, price(단위당 단가), cap(솥 하나에 최대 양 → 솥 수 = 양÷cap 올림), div(솥 수 고정 — 예전), potOf(이 재료 양 = 그 재료 솥 수 · 육수), ok(준비됨), ord}},
//                          steps:{id:{d(0~3일차), nm, ok, ord}}, todo:{일차: 할 일 id} }
//   재료 양 = q × 포기 ÷ base (올림·내림·반올림 없이 계산 그대로 — 사용자 요청) · 금액 = 양 × 단가 · 한 포기당 = 총비용 ÷ 포기
//   📅 할 일에 넣기 = /main/Todo/tasks 에 '한 번' 할 일 4개 (분류 김장) → 할 일 달력·텔레그램 알림에 같이 나옴
var KJ = { ALL: null, loading: false, err: "", y: "" };
var KJ_DAY = ["준비", "절이기", "손질", "버무리기"];
var KJ_DC = ["#0369a1", "#b45309", "#7c3aed", "#15803d"];   // 일차별 색
var KJ_UNIT = ["kg", "포기", "개", "단", "줌", "되", "포", "통", "L"];
var KJ_CONT = { kg: 1, g: 1, L: 1, ml: 1 };   // (예전: 이 단위만 소수점 — 지금은 모든 단위 소수 한 자리 그대로)
if(typeof TD_CAT === "object" && !TD_CAT["김장"]) TD_CAT["김장"] = "#15803d";

// 엑셀 그대로 (200포기 기준)
var KJ_MAT0 = [
  ["배추", 200, "포기", "", ""],
  ["고춧가루", 24, "kg", "", "파란 봉지 3봉지 (봉지 무게 재어 볼 것)"],
  ["멸치액젓", 10, "kg", "", "엿통 1통"],
  ["새우젓", 12, "kg", "", "시판 4통 (3kg 통으로 추정 — 통 보고 확인)"],
  ["생새우", 20, "kg", "갈기", ""],
  ["당근", 10, "개", "채칼로 채썰기", ""],
  ["배", 20, "개", "갈기", "10포기당 1개"],
  ["사과", 20, "개", "갈기", "10포기당 1개"],
  ["무", 15, "kg", "갈기", "노란 바구니 1개 (무게 재어 볼 것)"],
  ["미나리", 10, "단", "7cm (손가락 세 마디)", ""],
  ["갓", 2, "단", "2cm (손가락 한 마디)", ""],
  ["쪽파", 6, "단", "머리 쪽은 잘게(기계) · 나머지 1.5cm", ""],
  ["생강", 3, "kg", "갈기", ""],
  ["마늘", 6, "kg", "꼭지 떼고 갈기", ""],
  ["청각", 7, "줌", "말린 고추와 같이 갈기", "한 줌씩 7뭉치"],
  ["말린 고추", 6, "kg", "잘 안 갈리면 씨 빼기", "10근"],
  ["통깨", 1.5, "kg", "", ""],
  ["빻은 깨", 1.5, "kg", "", ""],
  ["찹쌀", 4, "kg", "육수로 풀 쑤기", "엑셀: 3되 · 2솥에 2kg씩 물 가득 (물이 적으면 불지 않고 밥이 됨)", { cap: 2 }],
  ["육수", 2, "솥", "다시마·멸치·디포리 넣고 끓이기 · 물 가득", "찹쌀 솥 수만큼 (솥 하나에 찹쌀 2kg까지)", { potOf: "찹쌀" }],
  ["매실액", 1, "kg", "", "깨 바가지로 한 통"]
];
var KJ_STEP0 = [
  [0, "배추·무 구해 두기"], [0, "배추 절일 통 준비 (노란 물통 3개 · 노란 대형 물통 1개 · 고추장굴비 통 등)"], [0, "배추 절일 통 씻어 두기"], [0, "김치 담을 통 씻어 두기"],
  [0, "육수 끓여서 찹쌀풀 쑤어 두기 (다시마·멸치·디포리 · 솥 수는 재료표)"], [0, "박스·비닐 20개 준비"],
  [1, "배추 다듬기"], [1, "무 다듬기"], [1, "속 재료 준비"], [1, "노란 통 2개에 소금 1포씩 + 물 가득"], [1, "배추 자른 면에 소금 뿌리고 통에 쟁이기"],
  [1, "숨이 죽으면 사이사이 소금 뿌리기"], [1, "소금물에 잠기게 하기"], [1, "16~18시간 절이기"], [1, "다 절면 바구니에 비닐 씌워 눌러 두기"],
  [2, "배추 씻기"], [2, "재료 손질"], [2, "배·사과·무·생강·마늘·청각(+말린 고추) 갈기"], [2, "갓·미나리·쪽파·당근 썰기"], [2, "간 것 + 젓갈 + 고춧가루 섞어 두기 (고춧가루 불리기)"],
  [3, "양념 섞기 마무리"], [3, "담을 통·박스에 비닐 씌워 두기"], [3, "먼저 나갈 것은 굴이랑 버무려 담아 두기"], [3, "다 버무려서 통에 담기"]
];

function _kjRef(p){ return fbDb.ref("/main/Kimjang" + (p ? "/" + p : "")); }
function _kjCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _kjN(v){ var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
function _kjToday(){ return typeof _bsToday === "function" ? _bsToday() : new Date().toISOString().slice(0, 10); }
function _kjY(){ return KJ.y || _kjToday().slice(0, 4); }
function _kjS(){ return (KJ.ALL || {})[_kjY()] || {}; }
function _kjB(bg, lb, on, ex){ return '<button class="btn" style="background:' + bg + ';color:#fff;font-weight:800;' + (ex || "") + '" onclick="' + on + '">' + lb + '</button>'; }
function _kjWon(n){ return Math.round(n).toLocaleString("ko-KR") + "원"; }
function _kjNum(n){ return _kjX(n).toLocaleString("ko-KR", { maximumFractionDigits: 3 }); }
function _kjX(n){ return Math.round(n * 1e6) / 1e6; }   // 계산 찌꺼기(0.30000000004)만 지움 — 올림·내림 아님
function _kjLoad(){
  if(KJ.loading) return; KJ.loading = true; KJ.err = "";
  _kjRef().once("value").then(function(s){ KJ.loading = false; KJ.ALL = s.val() || {}; if(/^kj/.test(CTAB)) draw(); })
    .catch(function(e){ KJ.loading = false; KJ.err = e.message; if(/^kj/.test(CTAB)) draw(); });   // 실패하면 ALL 은 비워 두지 않음 (기본 넣기가 덮어쓰지 않게)
}
function _kjWait(){
  if(KJ.ALL) return "";
  if(KJ.err) return '<div class="card"><div style="color:#dc2626;font-weight:800">불러오기 실패: ' + esc(KJ.err) + '</div>' + _kjB("#1d4ed8", "다시 불러오기", "_kjLoad()", "margin-top:8px") + '</div>';
  _kjLoad(); return '<div class="card"><div class="mut">📡 김장 불러오는 중...</div></div>';
}
// 이 해 데이터의 한 칸 저장 (화면 먼저 바꾸고 DB)
function _kjPut(path, val, msg){
  var y = _kjY(), S = KJ.ALL[y] = KJ.ALL[y] || {}, a = path.split("/"), o = S;
  for(var i = 0; i < a.length - 1; i++) o = o[a[i]] = o[a[i]] || {};
  if(val === null) delete o[a[a.length - 1]]; else o[a[a.length - 1]] = val;
  return _kjRef(y + "/" + path).set(val).then(function(){ if(msg) toast(msg); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ── 계산 ──
function _kjBase(S){ return _kjN(S.base) || 200; }
function _kjPogi(S){ return _kjN(S.pogi) || _kjBase(S); }
function _kjQty(m, S){ var lk = m.potOf && (S.mat || {})[m.potOf]; if(lk && lk !== m) return _kjPots(lk, S) || 0;   // 육수 = 찹쌀 솥 수
  var x = _kjN(m.q) * _kjPogi(S) / _kjBase(S); return _kjX(x); }   // 올림·내림 없이 그대로 (350포기 무 26.25kg · 청각 12.25줌)
function _kjPots(m, S){ var c = _kjN(m.cap); if(c > 0){ var raw = _kjN(m.q) * _kjPogi(S) / _kjBase(S); return _kjX(raw / c); } return Math.round(_kjN(m.div)); }   // 솥 수 소수 그대로 (7kg ÷ 2kg = 3.5솥 · 6.6kg = 3.3솥)
function _kjDiv(m, S){ if(m.potOf) return ""; var n = _kjPots(m, S), q = _kjQty(m, S), c = _kjN(m.cap), u = m.u || ""; if(!n || (n < 2 && !c)) return "";
  if(c > 0){ var full = Math.floor(q / c + 1e-9), rest = _kjX(q - full * c);   // 꽉 찬 솥 + 남은 것
    if(rest <= 0) return n + "솥 · 솥마다 " + _kjNum(c) + u;
    return n + "솥 · " + (full ? _kjNum(c) + u + "씩 " + full + "솥 + " : "") + "마지막 솥 " + _kjNum(rest) + u; }
  return n + "솥 · 솥마다 " + _kjNum(q / n) + u; }   // 예: 3.5솥 · 2kg씩 3솥 + 마지막 솥 1kg
function _kjMatKs(S){ var M = S.mat || {}; return Object.keys(M).sort(function(a, b){ return _kjN(M[a].ord) - _kjN(M[b].ord) || (a < b ? -1 : 1); }); }
function _kjIsCab(m){ return String(m.nm || "").replace(/\s/g, "") === "배추"; }
function _kjCost(S){
  var M = S.mat || {}, o = { all: 0, cab: 0, yang: 0, miss: 0, ok: 0, n: 0 };
  _kjMatKs(S).forEach(function(k){ var m = M[k], am = _kjQty(m, S) * _kjN(m.price); o.n++; if(m.ok) o.ok++;
    if(!_kjN(m.price)) o.miss++; o.all += am; if(_kjIsCab(m)) o.cab += am; else o.yang += am; });
  var p = _kjPogi(S); o.per = p ? o.all / p : 0; o.perYang = p ? o.yang / p : 0;
  return o;
}
function _kjAdd(dt, n){ var d = new Date(dt + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function _kjDays(S){ if(!S.day3) return []; var O = S.dd || {}; return [0, 1, 2, 3].map(function(i){ return i < 3 && O[i] ? O[i] : _kjAdd(S.day3, i - 3); }); }   // 날마다 따로 옮길 수 있음 (일이 늘 정해진 게 아니라서)
function _kjMD(dt){ var w = "일월화수목금토"[new Date(dt + "T00:00:00").getDay()]; return (+dt.slice(5, 7)) + "/" + (+dt.slice(8, 10)) + "(" + w + ")"; }
function _kjStepKs(S, d){ var T = S.steps || {}; return Object.keys(T).filter(function(k){ return +T[k].d === d; }).sort(function(a, b){ return _kjN(T[a].ord) - _kjN(T[b].ord) || (a < b ? -1 : 1); }); }

// ── 해 고르기 + 처음 넣기 ──
function _kjYearBar(){
  var ys = {}; ys[_kjToday().slice(0, 4)] = 1; ys[_kjY()] = 1; Object.keys(KJ.ALL || {}).forEach(function(y){ ys[y] = 1; });
  return '<div style="display:flex;gap:4px;flex-wrap:wrap">' + Object.keys(ys).sort().map(function(y){ var on = y === _kjY(); return '<button class="btn" onclick="KJ.y=\'' + y + '\';draw()" style="padding:4px 12px;font-weight:900;font-size:13px;background:' + (on ? "#15803d" : "#fff") + ';color:' + (on ? "#fff" : "#15803d") + ';border:1.5px solid #15803d">' + y + '년</button>'; }).join("") + '</div>';
}
function _kjEmpty(){
  var can = _kjCan(), prev = Object.keys(KJ.ALL || {}).filter(function(y){ return y < _kjY() && (KJ.ALL[y].mat); }).sort().pop();
  var h = '<div class="card" style="text-align:center;padding:22px"><div style="font-size:15px;font-weight:800;margin-bottom:10px">' + _kjY() + '년 김장 자료가 아직 없어요</div>';
  if(!can) return h + '<div class="mut">관리자가 넣으면 보여요</div></div>';
  h += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' + (prev ? _kjB("#7c3aed", "📋 " + prev + "년 것 가져오기 (단가 포함)", "kjSeed('" + prev + "')") : '') + _kjB("#15803d", "🥬 기본 재료·일정 넣기 (엑셀 200포기 기준)", "kjSeed('')") + '</div></div>';
  return h;
}
function kjSeed(from){
  var y = _kjY(); if(!KJ.ALL || (KJ.ALL[y] && KJ.ALL[y].mat)) return toast("이미 자료가 있어요", true);
  var o = { base: 200, pogi: 200, mat: {}, steps: {} };
  if(from){ var P = KJ.ALL[from]; o.base = _kjBase(P); o.pogi = _kjPogi(P);
    Object.keys(P.mat || {}).forEach(function(k){ var m = Object.assign({}, P.mat[k]); delete m.ok; o.mat[k] = m; });
    Object.keys(P.steps || {}).forEach(function(k){ var s = Object.assign({}, P.steps[k]); delete s.ok; o.steps[k] = s; }); }
  else { var ids = {}; KJ_MAT0.forEach(function(r, i){ ids[r[0]] = "m" + ("0" + (i + 1)).slice(-2); });
    KJ_MAT0.forEach(function(r, i){ var m = { nm: r[0], q: r[1], u: r[2], how: r[3], note: r[4], ord: i + 1 }, x = r[5] || {}; if(x.cap) m.cap = x.cap; if(x.potOf) m.potOf = ids[x.potOf]; o.mat[ids[r[0]]] = m; });
    KJ_STEP0.forEach(function(r, i){ o.steps["s" + ("0" + (i + 1)).slice(-2)] = { d: r[0], nm: r[1], ord: i + 1 }; }); }
  _kjRef(y).update(o).then(function(){ KJ.ALL[y] = Object.assign(KJ.ALL[y] || {}, o); toast("🥬 " + y + "년 김장 자료를 넣었어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ════════ 화면 ① 재료·비용 ════════
function dKjMat(){
  var w = _kjWait(); if(w) return w;
  var S = _kjS(), can = _kjCan(), mob = window.innerWidth < 760;
  var h = '<div class="card" style="margin-bottom:10px;background:#f0fdf4;border:1px solid #86efac"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><b style="font-size:18px;color:#15803d">🥬 김장 — 재료·비용</b><div class="mut" style="font-size:12.5px">포기 수만 바꾸면 재료 양·비용이 저절로 계산돼요 · 단가를 넣으면 한 포기당 얼마인지 나와요</div></div>' + _kjYearBar() + '</div></div>';
  if(!S.mat) return h + _kjEmpty();
  var p = _kjPogi(S), C = _kjCost(S);
  // 포기 수
  var st = function(n){ return '<button class="btn" onclick="kjPogi(' + (p + n) + ')" style="padding:6px 10px;font-weight:900;background:#fff;color:#15803d;border:1.5px solid #15803d">' + (n > 0 ? "+" : "") + n + '</button>'; };
  h += '<div class="card" style="margin-bottom:10px;border:2px solid #15803d"><div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b style="font-size:16px">배추</b>' + st(-50) + st(-10)
    + '<input id="kjPogi" type="number" min="1" inputmode="numeric" value="' + p + '" onchange="kjPogi(this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" style="width:96px;padding:6px;font-size:24px;font-weight:900;text-align:center;border:2px solid #15803d;border-radius:8px"><b style="font-size:16px">포기</b>' + st(10) + st(50) + '</div>';
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;align-items:center"><span class="mut" style="font-size:12px">바로 고르기</span>' + [50, 100, 150, 200, 300, 500].map(function(n){ var on = n === p; return '<button class="btn" onclick="kjPogi(' + n + ')" style="padding:3px 11px;font-size:13px;font-weight:800;background:' + (on ? "#15803d" : "#fff") + ';color:' + (on ? "#fff" : "#15803d") + ';border:1.5px solid #15803d">' + n + '</button>'; }).join("") + '<span class="mut" style="font-size:11.5px;margin-left:4px">재료 양 기준: ' + _kjBase(S) + '포기 (엑셀)</span></div></div>';
  // 비용 요약
  var box = function(lb, v, c, sub){ return '<div style="flex:1;min-width:' + (mob ? 130 : 150) + 'px;background:#fff;border:1.5px solid ' + c + ';border-radius:10px;padding:8px 10px"><div style="font-size:12px;color:#475569;font-weight:700">' + lb + '</div><div style="font-size:' + (mob ? 18 : 21) + 'px;font-weight:900;color:' + c + '">' + v + '</div>' + (sub ? '<div style="font-size:11.5px;color:#64748b">' + sub + '</div>' : '') + '</div>'; };
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + box("💰 총비용", _kjWon(C.all), "#b91c1c", "배추 " + _kjWon(C.cab) + " + 양념 " + _kjWon(C.yang)) + box("🥬 한 포기당", _kjWon(C.per), "#15803d", "양념만 " + _kjWon(C.perYang)) + box("✅ 준비", C.ok + " / " + C.n, "#1d4ed8", C.miss ? "⚠ 단가 안 넣은 재료 " + C.miss + "개" : "단가 다 넣음") + '</div>';
  // 버튼
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + _kjB("#334155", "🖨 재료표 인쇄", "kjPrint('mat')") + _kjB("#475569", "🖨 준비표 가로", "kjPrint('stepL')") + _kjB("#475569", "🖨 준비표 세로", "kjPrint('stepP')") + (can ? _kjB("#16a34a", "+ 재료", "kjMatEdit('')") : '') + _kjB("#7c3aed", "📅 일정·달력 보기", "CTAB='kjCal';draw();scrollTo(0,0)") + '</div>';
  // 재료 목록
  var M = S.mat, ks = _kjMatKs(S), pr = function(k, m){ return can ? '<input type="number" min="0" inputmode="numeric" value="' + (_kjN(m.price) || "") + '" placeholder="단가" onchange="kjPrice(\'' + k + '\',this.value)" onkeydown="if(event.key===\'Enter\')this.blur()" style="width:' + (mob ? 88 : 100) + 'px;padding:5px;font-size:14px;text-align:right;border:1px solid #cbd5e1;border-radius:6px">' : (_kjN(m.price) ? _kjNum(_kjN(m.price)) : '-'); };
  var ck = function(k, m){ return '<input type="checkbox" class="kjOk"' + (m.ok ? " checked" : "") + (can ? ' onclick="kjOk(\'' + k + '\',this.checked)"' : " disabled") + ' style="width:19px;height:19px">'; };
  if(mob){
    h += '<div class="card" style="padding:0;overflow:hidden">' + ks.map(function(k){ var m = M[k], q = _kjQty(m, S), am = q * _kjN(m.price);
      return '<div style="padding:8px 10px;border-bottom:1px solid #f1f5f9;' + (m.ok ? "background:#f0fdf4" : "") + '"><div style="display:flex;align-items:center;gap:8px">' + ck(k, m) + '<b style="font-size:15px;flex:1' + (m.ok ? ";color:#94a3b8;text-decoration:line-through" : "") + '">' + esc(m.nm) + '</b><b style="font-size:15px;color:#15803d">' + _kjNum(q) + ' ' + esc(m.u || "") + '</b>' + (can ? _kjB("#475569", "✏", "kjMatEdit('" + k + "')", "padding:2px 7px;font-size:12px") : '') + '</div>'
        + ((m.how || m.note || _kjDiv(m, S)) ? '<div style="font-size:12px;color:#64748b;margin:2px 0 0 27px">' + [_kjDiv(m, S) ? '<b style="color:#b45309">🍲 ' + _kjDiv(m, S) + '</b>' : "", m.how ? "✂ " + esc(m.how) : "", m.note ? esc(m.note) : ""].filter(Boolean).join(" · ") + '</div>' : '')
        + '<div style="display:flex;align-items:center;gap:6px;margin:4px 0 0 27px;font-size:12.5px"><span class="mut">단가</span>' + pr(k, m) + '<span class="mut">원/' + esc(m.u || "") + '</span><b style="margin-left:auto">' + (am ? _kjWon(am) : '') + '</b></div></div>'; }).join("") + '</div>';
  } else {
    var th = function(t, a){ return '<th style="padding:7px 8px;background:#15803d;color:#fff;font-size:13px;white-space:nowrap;text-align:' + (a || "left") + '">' + t + '</th>'; };
    h += '<div class="card" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr>' + th("준비", "center") + th("재료") + th(p + "포기에 필요한 양", "right") + th("손질") + th("메모") + th("단가 (원)", "right") + th("금액", "right") + (can ? th("") : '') + '</tr></thead><tbody>';
    ks.forEach(function(k){ var m = M[k], q = _kjQty(m, S), am = q * _kjN(m.price), td = function(v, a, ex){ return '<td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;text-align:' + (a || "left") + ';' + (ex || "") + '">' + v + '</td>'; };
      h += '<tr style="' + (m.ok ? "background:#f0fdf4" : "") + '">' + td(ck(k, m), "center") + td('<b' + (m.ok ? ' style="color:#94a3b8;text-decoration:line-through"' : '') + '>' + esc(m.nm) + '</b>') + td('<b style="color:#15803d;font-size:15px">' + _kjNum(q) + '</b> ' + esc(m.u || "") + (_kjDiv(m, S) ? '<div style="font-size:11.5px;color:#b45309;font-weight:800">🍲 ' + _kjDiv(m, S) + '</div>' : ''), "right", "white-space:nowrap") + td(esc(m.how || ""), "", "font-size:13px;color:#334155") + td(esc(m.note || ""), "", "font-size:12.5px;color:#64748b")
        + td(pr(k, m) + ' <span class="mut" style="font-size:11.5px">/' + esc(m.u || "") + '</span>', "right", "white-space:nowrap") + td(am ? '<b>' + _kjWon(am) + '</b>' : '<span class="mut">-</span>', "right", "white-space:nowrap") + (can ? td(_kjB("#475569", "✏", "kjMatEdit('" + k + "')", "padding:3px 8px;font-size:12px")) : '') + '</tr>'; });
    h += '<tr style="background:#fef2f2;font-weight:900"><td colspan="6" style="padding:8px;text-align:right">총비용 · 한 포기당 ' + _kjWon(C.per) + '</td><td style="padding:8px;text-align:right;color:#b91c1c;white-space:nowrap">' + _kjWon(C.all) + '</td>' + (can ? '<td></td>' : '') + '</tr></tbody></table></div>';
  }
  return h;
}
function kjPogi(v){
  var n = Math.round(_kjN(v)); if(n < 1) n = 1; var S = _kjS(); if(n === _kjPogi(S)){ draw(); return; }
  if(_kjCan()) _kjPut("pogi", n); else { S.pogi = n; }   // 보기 권한은 이 화면에서만 바꿔 봄
  draw(); var e = document.getElementById("kjPogi"); if(e && document.activeElement !== e) e.blur();
}
function kjPrice(k, v){ var n = _kjN(v); _kjPut("mat/" + k + "/price", n || null).then(function(){ draw(); }); }
function kjOk(k, on){ _kjPut("mat/" + k + "/ok", on ? true : null); var m = (_kjS().mat || {})[k]; clearTimeout(KJ.okT); KJ.okT = setTimeout(draw, 250); }
function kjMatEdit(k){
  var S = _kjS(), m = k ? (S.mat || {})[k] || {} : { u: "kg" }, p = _kjPogi(S), q = k ? _kjQty(m, S) : "";
  var I = function(lb, id, v, ph, ty){ return '<label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">' + lb + '<input id="' + id + '" ' + (ty ? 'type="' + ty + '" inputmode="decimal" ' : '') + 'value="' + esc(v == null ? "" : String(v)) + '" placeholder="' + (ph || "") + '" style="width:100%;padding:8px;font-size:16px;border:1px solid #cbd5e1;border-radius:7px;box-sizing:border-box;font-weight:400"></label>'; };
  var h = '<h3 style="margin:0 0 10px">' + (k ? "재료 고치기" : "+ 재료") + '</h3>' + I("재료 이름", "kjm_nm", m.nm, "예: 굴");
  h += '<div style="display:flex;gap:6px">' + '<div style="flex:1">' + I(p + "포기에 필요한 양", "kjm_q", q, "예: 10", "number") + '</div><div style="flex:1">' + I("단위", "kjm_u", m.u, "kg · 개 · 단") + '</div></div>';
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin:-4px 0 8px">' + KJ_UNIT.map(function(u){ return '<button class="btn" type="button" onclick="document.getElementById(\'kjm_u\').value=\'' + u + '\'" style="padding:3px 9px;font-size:12.5px;background:#f0fdf4;color:#15803d;border:1px solid #86efac">' + u + '</button>'; }).join("") + '</div>';
  h += I("손질 방법", "kjm_how", m.how, "예: 갈기 · 2cm로 썰기") + I("메모", "kjm_note", m.note, "예: 파란 봉지 3봉지") + I("단가 (단위당 원)", "kjm_pr", _kjN(m.price) || "", "예: 25000", "number") + (m.potOf ? '<div class="mut" style="font-size:12.5px;margin-bottom:8px">🍲 이 재료 양은 「' + esc(((S.mat || {})[m.potOf] || {}).nm || "") + '」 솥 수를 저절로 따라가요</div>' : I("솥 하나에 최대 몇 " + esc(m.u || "") + " (넘으면 솥이 늘어요)", "kjm_cap", _kjN(m.cap) || "", "예: 2 — 비우면 안 나눔", "number"));
  h += '<div class="mut" style="font-size:12px;margin-bottom:6px">포기 수를 바꾸면 이 양도 같은 비율로 바뀌어요</div>';
  h += '<div style="display:flex;justify-content:space-between;gap:6px;margin-top:10px"><span>' + (k ? _kjB("#dc2626", "🗑 지우기", "kjMatDel('" + k + "')") : "") + '</span><span style="display:flex;gap:6px">' + _kjB("#475569", "취소", "closePopup()") + _kjB("#16a34a", "💾 저장", "kjMatSave('" + (k || "") + "')", "padding:8px 20px") + '</span></div>';
  openPopup(h, 440);
}
function kjMatSave(k){
  var g = function(id){ return String((document.getElementById(id) || {}).value || "").trim(); }, S = _kjS(), M = S.mat || {};
  var nm = g("kjm_nm"); if(!nm) return toast("재료 이름을 넣어 주세요", true);
  var q = _kjN(g("kjm_q")), o = Object.assign({}, k ? M[k] : {}, { nm: nm, u: g("kjm_u"), how: g("kjm_how"), note: g("kjm_note") });
  o.q = Math.round(q * _kjBase(S) / _kjPogi(S) * 1000) / 1000;   // 기준 포기 수로 바꿔 저장
  var pr = _kjN(g("kjm_pr")); if(pr) o.price = pr; else delete o.price;
  if(document.getElementById("kjm_cap")){ var cp = _kjN(g("kjm_cap")); if(cp > 0) o.cap = cp; else delete o.cap; delete o.div; }
  if(!k){ var mx = 0; Object.keys(M).forEach(function(x){ mx = Math.max(mx, _kjN(M[x].ord)); }); o.ord = mx + 1; }
  var id = k || _kjRef(_kjY() + "/mat").push().key;
  _kjPut("mat/" + id, o, "💾 " + nm).then(function(){ closePopup(); draw(); });
}
function kjMatDel(k){ var m = (_kjS().mat || {})[k] || {}; if(!confirm((m.nm || "") + " 재료를 지울까요?")) return; _kjPut("mat/" + k, null, "지웠어요").then(function(){ closePopup(); draw(); }); }

// ════════ 화면 ② 일정·달력 ════════
function dKjCal(){
  var w = _kjWait(); if(w) return w;
  var S = _kjS(), can = _kjCan(), today = _kjToday();
  var h = '<div class="card" style="margin-bottom:10px;background:#f0fdf4;border:1px solid #86efac"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><b style="font-size:18px;color:#15803d">🥬 김장 — 일정·달력</b><div class="mut" style="font-size:12.5px">담는 날만 고르면 날짜가 저절로 나와요 · 날마다 따로 옮길 수 있고, 할 일은 ⠿ 끌어서 다른 날로</div></div>' + _kjYearBar() + '</div></div>';
  if(!S.mat && !S.steps) return h + _kjEmpty();
  var D = _kjDays(S);
  h += '<div class="card" style="margin-bottom:10px;border:2px solid #15803d"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><b style="font-size:16px">🗓 담는 날 (3일차)</b>'
    + (can ? '<input type="date" value="' + (S.day3 || "") + '" onchange="kjDay(this.value)" style="padding:6px 8px;font-size:16px;font-weight:800;border:2px solid #15803d;border-radius:8px">' : '<b style="font-size:17px">' + (S.day3 ? _kjMD(S.day3) : "아직 안 정함") + '</b>')
    + '<span style="flex:1"></span>' + _kjB("#334155", "🖨 준비표 가로", "kjPrint('stepL')") + _kjB("#334155", "🖨 준비표 세로", "kjPrint('stepP')") + _kjB("#475569", "🖨 재료표 인쇄", "kjPrint('mat')") + _kjB("#15803d", "🥬 재료·비용 보기", "CTAB='kjMat';draw();scrollTo(0,0)") + '</div>';
  if(D.length){
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">' + D.map(function(dt, i){ return '<span style="background:' + KJ_DC[i] + ';color:#fff;border-radius:6px;padding:3px 9px;font-size:13px;font-weight:800">' + i + '일차 ' + KJ_DAY[i] + ' · ' + _kjMD(dt) + '</span>'; }).join("") + '</div>';
    var td = S.todo ? '<span style="color:#15803d;font-weight:800;font-size:12.5px">✔ 📅 할 일 달력에 들어가 있어요 (날짜 바꾸면 같이 바뀜)</span>' : '<span class="mut" style="font-size:12.5px">할 일에 넣으면 할 일 달력과 텔레그램 알림(준비 1주일 전부터)에도 나와요</span>';
    h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">' + (can ? _kjB("#1d4ed8", S.todo ? "📅 할 일 다시 넣기" : "📅 할 일에 넣기", "kjTodo()", "padding:5px 12px;font-size:13px") : '') + td + '</div>';
  } else h += '<div class="mut" style="margin-top:6px;font-size:13px">' + (can ? "담는 날을 고르면 달력과 날짜가 나와요" : "아직 날짜를 안 정했어요") + '</div>';
  h += '</div>';
  if(D.length) h += _kjMonth(D, today);
  // 일차별 할 일
  var T = S.steps || {}, mob = window.innerWidth < 760;
  h += '<div style="display:grid;grid-template-columns:' + (mob ? "1fr" : "repeat(auto-fit,minmax(240px,1fr))") + ';gap:8px">';
  [0, 1, 2, 3].forEach(function(d){ var ks = _kjStepKs(S, d), n = ks.filter(function(k){ return T[k].ok; }).length, c = KJ_DC[d], isT = D[d] === today;
    var mv = d < 3 && (S.dd || {})[d];
    h += '<div class="card"' + (can ? ' ondragover="event.preventDefault();this.style.outline=\'3px dashed ' + c + '\'" ondragleave="this.style.outline=\'\'" ondrop="kjDrop(event,' + d + ',\'\')"' : '') + ' style="padding:0;overflow:hidden;margin:0;border:' + (isT ? "3px solid #f59e0b" : "1px solid " + c) + '"><div style="background:' + c + ';color:#fff;padding:7px 10px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap"><b style="font-size:15px">' + d + '일차 · ' + KJ_DAY[d] + (D[d] && !can ? ' <span style="font-weight:700;font-size:13px">' + _kjMD(D[d]) + '</span>' : '') + (isT ? ' <span style="font-size:12px;background:#f59e0b;border-radius:5px;padding:0 5px">오늘</span>' : '') + (mv ? ' <span style="font-size:11px;background:rgba(255,255,255,.25);border-radius:5px;padding:0 5px">옮김</span>' : '') + '</b><b style="font-size:13px">' + n + '/' + ks.length + '</b></div>';
    if(can && D[d]) h += '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12.5px"><span class="mut">날짜</span><input type="date" value="' + D[d] + '" onchange="kjDayAt(' + d + ',this.value)" style="padding:3px 6px;font-size:14px;font-weight:800;border:1.5px solid ' + c + ';border-radius:6px"><b style="color:' + c + '">' + _kjMD(D[d]).replace(/^[^(]*/, "") + '</b>' + (mv ? '<a href="javascript:void 0" onclick="kjDayAt(' + d + ',\'\')" style="font-size:12px;color:#dc2626;margin-left:auto">↺ 원래대로</a>' : '') + '</div>';
    h += ks.map(function(k){ var s = T[k]; return '<div' + (can ? ' draggable="true" ondragstart="KJ.drag=\'' + k + '\';event.dataTransfer.effectAllowed=\'move\';try{event.dataTransfer.setData(\'text/plain\',\'' + k + '\')}catch(e){}" ondragover="event.preventDefault()" ondrop="event.stopPropagation();kjDrop(event,' + d + ',\'' + k + '\')" title="끌어서 다른 날·순서로 옮겨요"' : '') + ' style="display:flex;align-items:flex-start;gap:7px;padding:6px 10px;border-bottom:1px solid #f1f5f9;' + (can ? "cursor:grab;" : "") + (s.ok ? "background:#f8fafc" : "") + '">' + (can ? '<span style="color:#cbd5e1;font-size:14px;line-height:18px;flex:none">⠿</span>' : '') + '<input type="checkbox" class="kjSt' + d + '"' + (s.ok ? " checked" : "") + (can ? ' onclick="kjStepOk(\'' + k + '\',this.checked)"' : " disabled") + ' style="width:18px;height:18px;margin-top:1px;flex:none"><span style="flex:1;font-size:14px;' + (s.ok ? "color:#94a3b8;text-decoration:line-through" : "") + '">' + esc(s.nm) + '</span>' + (can ? '<a href="javascript:void 0" onclick="kjStepEdit(\'' + k + '\')" style="font-size:12px;color:#475569;text-decoration:none">✏</a>' : '') + '</div>'; }).join("");
    if(can) h += '<div style="padding:6px 10px">' + _kjB(c, "+ " + d + "일차 할 일", "kjStepEdit('', " + d + ")", "padding:3px 10px;font-size:12.5px") + '</div>';
    h += '</div>'; });
  return h + '</div>';
}
// 달력 — 김장 날짜가 걸친 달 (월말에 걸치면 두 달)
function _kjMonth(D, today){
  var map = {}; D.forEach(function(dt, i){ map[dt] = i; });
  var yms = []; D.forEach(function(dt){ var ym = dt.slice(0, 7); if(yms.indexOf(ym) < 0) yms.push(ym); });
  var mob = window.innerWidth < 760, h = '<div style="display:grid;grid-template-columns:' + (mob || yms.length < 2 ? "1fr" : "1fr 1fr") + ';gap:8px;margin-bottom:10px">';
  yms.forEach(function(ym){ var y = +ym.slice(0, 4), m = +ym.slice(5, 7), L = new Date(y, m, 0).getDate(), f = new Date(y, m - 1, 1).getDay();
    h += '<div class="card" style="padding:10px;margin:0"><div style="text-align:center;font-weight:900;font-size:17px;margin-bottom:6px">' + y + '년 ' + m + '월</div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px">';
    h += "일월화수목금토".split("").map(function(w, i){ return '<div style="text-align:center;font-weight:900;font-size:12px;padding:3px 0;color:' + (i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#334155") + '">' + w + '</div>'; }).join("");
    for(var b = 0; b < f; b++) h += '<div></div>';
    for(var d = 1; d <= L; d++){ var ds = ym + "-" + ("0" + d).slice(-2), i = map[ds], wd = (f + d - 1) % 7, on = i !== undefined, isT = ds === today;
      h += '<div style="min-height:' + (mob ? 44 : 58) + 'px;border-radius:7px;padding:3px;border:' + (isT ? "2px solid #f59e0b" : "1px solid #e2e8f0") + ';background:' + (on ? KJ_DC[i] : "#fff") + ';color:' + (on ? "#fff" : wd === 0 ? "#dc2626" : wd === 6 ? "#2563eb" : "#0f172a") + '"><div style="font-weight:900;font-size:12.5px">' + d + '</div>' + (on ? '<div style="font-size:' + (mob ? 10 : 11.5) + 'px;font-weight:800;line-height:1.2">' + i + '일차<br>' + KJ_DAY[i] + '</div>' : '') + '</div>'; }
    h += '</div></div>'; });
  return h + '</div>';
}
function kjDay(v){
  if(!v) return; var S = _kjS(), O = S.dd || {}, ks = Object.keys(O).filter(function(i){ return O[i]; }), p = [];
  if(S.day3 && ks.length && confirm("따로 옮겨 둔 날(" + ks.map(function(i){ return i + "일차"; }).join("·") + ")도 담는 날 바뀐 만큼 같이 옮길까요?\n(취소 = 그 날짜는 그대로)")){
    var n = Math.round((new Date(v + "T00:00:00") - new Date(S.day3 + "T00:00:00")) / 864e5); ks.forEach(function(i){ p.push(_kjPut("dd/" + i, _kjAdd(O[i], n))); }); }
  Promise.all(p).then(function(){ return _kjPut("day3", v, "🗓 담는 날 " + _kjMD(v)); }).then(function(){ if(_kjS().todo) kjTodo(1); draw(); });
}
// 하루만 따로 옮기기 (빈 값 = 원래대로: 담는 날에서 하루씩 앞)
function kjDayAt(d, v){
  if(d === 3) return kjDay(v);
  _kjPut("dd/" + d, v || null, v ? "🗓 " + d + "일차 " + KJ_DAY[d] + " → " + _kjMD(v) : "↺ " + d + "일차 원래 날짜로").then(function(){ if(_kjS().todo) kjTodo(2); draw(); });
}
// 할 일 끌어 놓기 — 다른 날로 · 순서 바꾸기 (before = 이 줄 앞에, 빈 값 = 그날 맨 끝)
function kjDrop(ev, d, before){
  ev.preventDefault(); var el = ev.currentTarget; if(el && el.style) el.style.outline = "";
  var k = KJ.drag; KJ.drag = ""; if(!k || k === before) return;
  var S = _kjS(), T = S.steps || {}; if(!T[k]) return;
  var L = _kjStepKs(S, d).filter(function(x){ return x !== k; }), i = before ? L.indexOf(before) : -1; if(i < 0) i = L.length; L.splice(i, 0, k);
  var up = {}, from = +T[k].d; up[k + "/d"] = d; L.forEach(function(x, j){ up[x + "/ord"] = j + 1; T[x].ord = j + 1; }); T[k].d = d;
  draw(); _kjRef(_kjY() + "/steps").update(up).then(function(){ if(from !== d) toast("↔ " + T[k].nm + " → " + d + "일차 " + KJ_DAY[d]); if(S.todo) kjTodo(2); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function kjStepOk(k, on){ _kjPut("steps/" + k + "/ok", on ? true : null); clearTimeout(KJ.okT); KJ.okT = setTimeout(draw, 250); }
function kjStepEdit(k, d0){
  var S = _kjS(), s = k ? (S.steps || {})[k] || {} : { d: d0 || 0 };
  var h = '<h3 style="margin:0 0 10px">' + (k ? "할 일 고치기" : "+ 할 일") + '</h3><label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">며칠째<select id="kjs_d" style="width:100%;padding:8px;font-size:16px;border:1px solid #cbd5e1;border-radius:7px">' + [0, 1, 2, 3].map(function(d){ return '<option value="' + d + '"' + (+s.d === d ? " selected" : "") + '>' + d + '일차 · ' + KJ_DAY[d] + '</option>'; }).join("") + '</select></label>';
  h += '<label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">할 일<input id="kjs_nm" value="' + esc(s.nm || "") + '" placeholder="예: 굴 사 오기" style="width:100%;padding:8px;font-size:16px;border:1px solid #cbd5e1;border-radius:7px;box-sizing:border-box;font-weight:400"></label>';
  h += '<div style="display:flex;justify-content:space-between;gap:6px;margin-top:10px"><span>' + (k ? _kjB("#dc2626", "🗑 지우기", "kjStepDel('" + k + "')") : "") + '</span><span style="display:flex;gap:6px">' + _kjB("#475569", "취소", "closePopup()") + _kjB("#16a34a", "💾 저장", "kjStepSave('" + (k || "") + "')", "padding:8px 20px") + '</span></div>';
  openPopup(h, 420); setTimeout(function(){ var e = document.getElementById("kjs_nm"); if(e) e.focus(); }, 50);
}
function kjStepSave(k){
  var nm = String((document.getElementById("kjs_nm") || {}).value || "").trim(), d = +(document.getElementById("kjs_d") || {}).value || 0, T = _kjS().steps || {};
  if(!nm) return toast("할 일을 적어 주세요", true);
  var o = Object.assign({}, k ? T[k] : {}, { nm: nm, d: d });
  if(!k){ var mx = 0; Object.keys(T).forEach(function(x){ mx = Math.max(mx, _kjN(T[x].ord)); }); o.ord = mx + 1; }
  var id = k || _kjRef(_kjY() + "/steps").push().key;
  _kjPut("steps/" + id, o, "💾 " + nm).then(function(){ closePopup(); draw(); });
}
function kjStepDel(k){ var s = (_kjS().steps || {})[k] || {}; if(!confirm((s.nm || "") + " — 지울까요?")) return; _kjPut("steps/" + k, null, "지웠어요").then(function(){ closePopup(); draw(); }); }
// 📅 할 일에 넣기 — 일차마다 '한 번' 할 일 (분류 김장) · 다시 누르면 같은 것 고침
function kjTodo(quiet){
  var S = _kjS(), D = _kjDays(S), y = _kjY(); if(!D.length) return toast("담는 날을 먼저 골라 주세요", true);
  var old = S.todo || {}, up = {}, ids = {}, today = _kjToday(), T = S.steps || {};
  D.forEach(function(dt, d){ var id = old[d] || fbDb.ref("/main/Todo/tasks").push().key, nms = _kjStepKs(S, d).map(function(k){ return T[k].nm; }).join(" · ");
    ids[d] = id; up["tasks/" + id] = { nm: "🥬 김장 " + d + "일차 — " + KJ_DAY[d], cat: "김장", freq: "once", dt: dt, lead: d === 0 ? 7 : 1, since: today < dt ? today : dt, note: (d === 0 ? "재료는 🥬 김장 > 재료·비용 · " : "") + nms.slice(0, 300) }; });
  fbDb.ref("/main/Todo").update(up).then(function(){ return _kjRef(y + "/todo").set(ids); }).then(function(){
    KJ.ALL[y].todo = ids; if(typeof TD === "object"){ TD.D = null; if(typeof _tdLoad === "function") _tdLoad(); }
    if(quiet !== 2) toast(quiet ? "📅 할 일 날짜도 같이 바꿨어요" : "📅 할 일에 4개 넣었어요 (분류 김장)"); draw(); }).catch(function(e){ toast("할 일 저장 실패: " + e.message, true); });
}

// ════════ 🖨 인쇄 — 재료표(mat) · 준비표 가로(stepL: 4칸 나란히) · 세로(stepP: 2×2) — 둘 다 A4 한 장 (비우면 재료+준비 같이) ════════
function kjPrint(w){
  var LAND = w === "stepL"; if(w === "step") w = "stepP"; if(w === "stepL" || w === "stepP") w = "step";
  var S = _kjS(), y = _kjY(), p = _kjPogi(S), C = _kjCost(S), D = _kjDays(S), M = S.mat || {}, T = S.steps || {};
  var cs = "border:1px solid #333;padding:4px 6px;font-size:10.5pt;", hs = cs + "background:#e5e7eb;font-weight:bold;text-align:center;";
  var wd = S.day3 ? _kjMD(S.day3).replace(/^.*\(/, "").replace(")", "") : "";
  var ttl = w === "mat" ? "재료표" : w === "step" ? "준비표" : "";
  var h = '<div style="font-family:\'Malgun Gothic\',sans-serif;color:#000"><h2 style="text-align:center;margin:0 0 4px;font-size:18pt">' + y + '년 김장' + (ttl ? ' ' + ttl : '') + ' — 배추 ' + p.toLocaleString("ko-KR") + '포기</h2>';
  h += '<div style="text-align:center;font-size:10.5pt;margin-bottom:10px">' + (S.day3 ? "담는 날 " + S.day3.replace(/-/g, ".") + " (" + wd + ")" : "") + (w !== "step" ? ' &nbsp; 총비용 <b>' + _kjWon(C.all) + '</b> · 한 포기당 <b>' + _kjWon(C.per) + '</b> (양념만 ' + _kjWon(C.perYang) + ')' : '') + '</div>';
  if(w !== "step"){
    h += '<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr><th style="' + hs + 'width:6%">✔</th><th style="' + hs + '">재료</th><th style="' + hs + '">양</th><th style="' + hs + '">손질</th><th style="' + hs + '">메모</th><th style="' + hs + '">단가</th><th style="' + hs + '">금액</th></tr>';
    _kjMatKs(S).forEach(function(k){ var m = M[k], q = _kjQty(m, S), am = q * _kjN(m.price);
      h += '<tr><td style="' + cs + 'text-align:center">' + (m.ok ? "☑" : "☐") + '</td><td style="' + cs + 'font-weight:bold">' + esc(m.nm) + '</td><td style="' + cs + 'text-align:right;white-space:nowrap">' + _kjNum(q) + ' ' + esc(m.u || "") + (_kjDiv(m, S) ? '<br><span style="font-size:9pt">' + _kjDiv(m, S) + '</span>' : '') + '</td><td style="' + cs + '">' + esc(m.how || "") + '</td><td style="' + cs + 'font-size:9.5pt">' + esc(m.note || "") + '</td><td style="' + cs + 'text-align:right;white-space:nowrap">' + (_kjN(m.price) ? _kjNum(_kjN(m.price)) : "") + '</td><td style="' + cs + 'text-align:right;white-space:nowrap">' + (am ? _kjWon(am) : "") + '</td></tr>'; });
    h += '<tr><td colspan="6" style="' + cs + 'text-align:right;font-weight:bold">총비용 (배추 ' + _kjWon(C.cab) + ' + 양념 ' + _kjWon(C.yang) + ')</td><td style="' + cs + 'text-align:right;font-weight:bold;white-space:nowrap">' + _kjWon(C.all) + '</td></tr></table>';
  }
  if(w === "step"){   // 벽에 붙여 두고 체크 — 가로 = 4칸 나란히, 세로 = 2×2 (둘 다 한 장)
    var nMax = Math.max.apply(null, [0, 1, 2, 3].map(function(d){ return _kjStepKs(S, d).length; }).concat([1]));
    var fs = LAND ? (nMax > 12 ? 9.5 : nMax > 9 ? 10.5 : 11.5) : (nMax > 12 ? 9.5 : nMax > 9 ? 10.5 : 11.5);   // 할 일 많으면 글씨 줄여서 한 장
    var box = function(d){ var ks = _kjStepKs(S, d);
      return '<td style="vertical-align:top;border:2px solid #333;padding:0;width:' + (LAND ? 25 : 50) + '%"><div style="background:#e5e7eb;padding:5px 8px;font-size:' + (fs + 2) + 'pt;font-weight:bold;border-bottom:2px solid #333">' + d + '일차 · ' + KJ_DAY[d] + (D[d] ? '<br><span style="font-weight:normal;font-size:' + fs + 'pt">' + D[d].replace(/-/g, ".") + ' (' + _kjMD(D[d]).replace(/^.*\(/, "").replace(")", "") + ')</span>' : '') + '</div>'
        + ks.map(function(k){ return '<div style="padding:4px 8px;font-size:' + fs + 'pt;line-height:1.35;border-bottom:1px solid #bbb">' + (T[k].ok ? "☑ " : "☐ ") + esc(T[k].nm) + '</div>'; }).join("") + (ks.length ? '' : '<div style="padding:4px 8px;color:#666;font-size:' + fs + 'pt">할 일 없음</div>') + '</td>'; };
    h += '<table style="width:100%;border-collapse:collapse;table-layout:fixed;page-break-inside:avoid">' + (LAND ? '<tr>' + [0, 1, 2, 3].map(box).join("") + '</tr>' : '<tr>' + box(0) + box(1) + '</tr><tr>' + box(2) + box(3) + '</tr>') + '</table>';
    var pots = _kjMatKs(S).map(function(k){ return M[k]; }).filter(function(m){ return _kjDiv(m, S) || m.potOf; });
    if(pots.length) h += '<div style="font-size:10.5pt;margin-top:6px"><b>🍲 솥 · 풀</b> — ' + pots.map(function(m){ return esc(m.nm) + ' ' + _kjNum(_kjQty(m, S)) + esc(m.u || "") + (_kjDiv(m, S) ? ' (' + _kjDiv(m, S) + ')' : ''); }).join(" · ") + '</div>';
  } else if(!w){
    h += '<table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>' + [0, 1, 2, 3].map(function(d){ return '<th style="' + hs + '">' + d + '일차 · ' + KJ_DAY[d] + (D[d] ? '<br><span style="font-weight:normal">' + _kjMD(D[d]) + '</span>' : '') + '</th>'; }).join("") + '</tr><tr>';
    h += [0, 1, 2, 3].map(function(d){ return '<td style="' + cs + 'vertical-align:top;font-size:10pt;line-height:1.5">' + _kjStepKs(S, d).map(function(k){ return (T[k].ok ? "☑ " : "☐ ") + esc(T[k].nm); }).join("<br>") + '</td>'; }).join("") + '</tr></table>';
  }
  h += '</div>';
  var tt = y + "년 김장 " + (ttl ? ttl + " " : "") + p + "포기";
  if(typeof _docPrint === "function") _docPrint({ title: tt, html: h, landscape: w === "step" && LAND, key: w === "step" ? (LAND ? "gm_kjStepL" : "gm_kjStepP") : "gm_kjPrint" });
  else { var win = window.open("", "_blank"); if(win){ win.document.write("<title>" + tt + "</title>" + h); win.document.close(); win.print(); } }
}
