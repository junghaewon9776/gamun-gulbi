// ============================================================================
// 🐟 부세 작업 — 시즌(년도)별 건조 작업 일정 · 원료 입고·재고 · 건조장 자리
//   (엑셀 '부세입출고작업현황표' 작업순서표·현황·전개도를 웹으로)
//   /main/Buse/{시즌} = { work:{id:{thaw,dry,item,qty,dur,loc,note, qtyA(실제 작업 수량), walkA(실제 걷은 날), hold(널기 보류·얼려 둠)}}, inb:{id:{dt,item,qty,note}},
//                         ord:{id:{dt,item,qty,note}}(발주), items:{품목:{nm,kg,order(엑셀에서 온 발주),real}}, zones:[{nm,cap}] }
//   품목 = 미수 + 상자 kg (같은 미수라도 kg 다르면 따로: '27미' 8.8kg / '27미·8_2kg' — DB 칸 이름에 점(.) 못 써서 _ · 화면엔 '27미 · 8.2kg') · 품명은 작업마다(건조 일수·kg 따라 달라짐 — 전에 쓴 품명 자동 채움)
//   부산 입고 양식(buse-in.html, 로그인 없음): /busePub/{시즌}/{id} 보내기만 → 직원이 확인하면 입고로 · 양식용 품목 목록 /busePubCfg
//   계산: 두름 = 수량×미수÷10 · 걷는 날 = 건조일+건조기간 · 냉장고 재고 = 입고−작업(해동) · 부산 남은 = 발주−입고
//   작업(해동) = 원료 출고 → 일정만 적으면 재고에서 저절로 빠짐 (엑셀처럼 두 번 안 적음)
// ============================================================================
var BS = { ALL: null, cur: "", loading: false, view: "thaw", zdt: "", zsel: "", item: "" };
var BS_DUR = [13, 30, 45];
var BS_ZONES = [["마당1", 1800], ["사무실입구", 1800], ["마당2", 1800], ["마당3", 1800], ["식당입구", 667], ["용탑앞", 800], ["용탑", 1800], ["4냉옆", 1000], ["4냉옆2", 1200], ["4냉옆3", 1200], ["테라스앞1", 320], ["테라스앞2", 320], ["테라스앞3", 320], ["저온창고1층", 1500], ["저온창고2층", 2000]];
// 건조장 배치도 (엑셀 전개도 모양) — [이름, 구역, 줄, 칸, 줄수, 칸수]
var BS_MAP = [["작업장", "", 1, 1, 1, 3], ["파 건조장", "", 2, 1, 1, 3], ["3냉", "", 3, 1, 1, 3], ["4냉", "", 3, 4, 1, 3], ["4냉옆", "4냉옆", 3, 7, 1, 1], ["4냉옆2", "4냉옆2", 3, 8, 1, 1], ["4냉옆3", "4냉옆3", 3, 9, 1, 1],
  ["테라스앞1", "테라스앞1", 4, 7, 1, 1], ["테라스앞2", "테라스앞2", 4, 8, 1, 1], ["테라스앞3", "테라스앞3", 4, 9, 1, 1], ["식당마당 좌", "", 5, 7, 1, 1], ["식당마당 우", "", 5, 9, 1, 1], ["사무실", "", 5, 1, 1, 2],
  ["저온 2층", "저온창고2층", 6, 1, 2, 1], ["저온 1층", "저온창고1층", 6, 2, 2, 1], ["마당1", "마당1", 6, 3, 3, 1], ["사무실입구", "사무실입구", 6, 4, 3, 1], ["마당2", "마당2", 6, 5, 3, 1], ["마당3", "마당3", 6, 6, 3, 1],
  ["식당입구", "식당입구", 6, 7, 3, 2], ["용탑앞", "용탑앞", 6, 9, 2, 1], ["용탑", "용탑", 8, 9, 1, 1], ["법성 ←　도 로　→ 영광", "", 9, 1, 1, 9]];

function _bsToday(){ return typeof todayKST === "function" ? todayKST() : new Date().toISOString().slice(0, 10); }
function _bsN(v){ var n = Number(String(v == null ? "" : v).replace(/,/g, "")); return isFinite(n) ? n : 0; }
function _bsW(n){ return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
function _bsMi(item){ var m = /^(\d+)/.exec(String(item || "")); return m ? +m[1] : 0; }
function _bsDoo(item, qty){ return _bsN(qty) * _bsMi(item) / 10; }   // 두름 = 수량 × 미수 ÷ 10
function _bsAdd(dt, n){ if(!dt) return ""; var d = new Date(dt + "T00:00:00"); d.setDate(d.getDate() + (+n || 0)); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function _bsDiff(a, b){ return Math.round((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000); }
var BS_WD = "일월화수목금토";
function _bsWd(dt){ return BS_WD[new Date(dt + "T00:00:00").getDay()] || ""; }
function _bsMS(dt){ return dt ? (+dt.slice(5, 7)) + "/" + (+dt.slice(8, 10)) + "(" + _bsWd(dt) + ")" : ""; }   // 좁은 곳: 12/12(토)
function _bsMD(dt){ return dt ? dt.replace(/-/g, ".") + "(" + _bsWd(dt) + ")" : ""; }                       // 2026.12.12(토)
function _bsDH(dt){ if(!dt) return ""; var w = _bsWd(dt), c = w === "토" ? "#2563eb" : w === "일" ? "#dc2626" : ""; return '<span style="white-space:nowrap">' + dt.replace(/-/g, ".") + '<span style="' + (c ? "color:" + c + ";font-weight:800" : "") + '">(' + w + ')</span></span>'; }
function _bsZK(s){ s = String(s || "").replace(/\s/g, ""); return ({ "저온2층": "저온창고2층", "저온1층": "저온창고1층", "4냉옆1": "4냉옆" })[s] || s; }
function _bsKg(k){ var it = (_bsS().items || {})[k]; return it ? _bsN(it.kg) : 0; }
function _bsBase(k){ return String(k || "").replace(/·[\d_]+kg$/, ""); }
function _bsLbl(k){ var kg = _bsKg(k); return _bsBase(k) + (kg ? " · " + kg + "kg" : ""); }
// 미수 + kg 로 품목 찾기 — 같은 미수에 kg 이 다르면 '27미 8.2kg' 처럼 새 품목
function _bsItemKey(base, kg){
  base = String(base || "").trim(); kg = _bsN(kg); var it = _bsS().items || {};
  if(it[base] && (!kg || _bsN(it[base].kg) === kg)) return base;
  var b = _bsBase(base), alt = b + "·" + String(kg).replace(".", "_") + "kg";
  if(it[alt]) return alt;
  var same = Object.keys(it).filter(function(k){ return _bsBase(k) === b && _bsN(it[k].kg) === kg; })[0];
  if(same) return same;
  return it[b] || !kg ? (it[b] ? alt : b) : b;
}
// 작업 품명 자동: 같은 품목·같은 건조 일수 → 같은 미수·같은 일수 → 원료 품명
function _bsNmGuess(item, dur, skip){
  var W = _bsS().work || {}, ids = Object.keys(W).filter(function(i){ return i !== skip && W[i].nm; }), mi = _bsMi(item);
  var f = ids.filter(function(i){ return W[i].item === item && _bsN(W[i].dur) === _bsN(dur); }).pop() || ids.filter(function(i){ return _bsMi(W[i].item) === mi && _bsN(W[i].dur) === _bsN(dur); }).pop();
  return f ? W[f].nm : "";
}
function _bsS(){ return (BS.ALL && BS.ALL[BS.cur]) || {}; }
function _bsRef(p){ return fbDb.ref("/main/Buse/" + BS.cur + (p ? "/" + p : "")); }
function _bsCan(){ return !!ME && ME.r !== "kid" && !(typeof _tpRO === "function" && _tpRO()); }
function _bsSeasons(){ return Object.keys(BS.ALL || {}).sort(); }

function _bsNms(){ var m = {}, W = _bsS().work || {}; Object.keys(W).forEach(function(i){ if(W[i].nm) m[W[i].nm] = 1; }); Object.keys(_bsS().items || {}).forEach(function(k){ var n = _bsS().items[k].nm; if(n) m[n] = 1; }); return Object.keys(m).sort(); }
function _bsLoad(){
  if(BS.loading) return; BS.loading = true;
  fbDb.ref("/main/Buse").once("value").then(function(s){
    BS.loading = false; BS.ALL = s.val() || {};
    var ss = _bsSeasons();
    if(!BS.cur || ss.indexOf(BS.cur) < 0){ try { BS.cur = localStorage.getItem("gm_buse_season") || ""; } catch(e){} if(ss.indexOf(BS.cur) < 0) BS.cur = ss[ss.length - 1] || ""; }
    if(/^bs/.test(CTAB)) draw();
  }).catch(function(e){ BS.loading = false; toast("부세 작업 불러오기 실패: " + e.message, true); });
}

// ── 계산 ──
function _bsQE(w){ return (w.qtyA === "" || w.qtyA == null) ? _bsN(w.qty) : _bsN(w.qtyA); }   // 실제 작업 수량이 있으면 그걸로
function _bsWork(){
  var W = _bsS().work || {}, rows = Object.keys(W).map(function(id){ var w = W[id], q = _bsQE(w), wp = w.dry ? _bsAdd(w.dry, w.dur) : "";
    return Object.assign({ id: id }, w, { qp: _bsN(w.qty), qty: q, doo: _bsDoo(w.item, q), walkP: wp, walk: w.hold ? "" : (w.walkA || wp), days: w.walkA && w.dry ? _bsDiff(w.walkA, w.dry) : _bsN(w.dur) }); });
  rows.sort(function(a, b){ return String(a.thaw).localeCompare(String(b.thaw)) || String(a.dry).localeCompare(String(b.dry)) || String(a.id).localeCompare(String(b.id)); });
  rows.forEach(function(r, i){ r._o = i; });
  rows.slice().sort(function(a, b){ return String(a.walk || "9").localeCompare(String(b.walk || "9")) || a._o - b._o; }).forEach(function(r, i){ r.seq = i + 1; });   // 걷는 순번
  return rows;
}
function _bsState(r, t){
  if(r.hold) return ["널기 보류", "#7c3aed"];
  if(r.walk && t >= r.walk) return ["걷음", "#64748b"];
  if(r.dry && t >= r.dry) return ["건조 중", "#16a34a"];
  if(r.thaw && t >= r.thaw) return ["해동 중", "#2563eb"];
  return ["예정", "#a16207"];
}
// 날짜순 원료 장부 (입고 + 작업) — 품목별 냉장고 재고·부산 남은 누계
function _bsOrd(){ var S = _bsS(), m = {}; Object.keys(S.items || {}).forEach(function(k){ m[k] = _bsN(S.items[k].order); }); Object.keys(S.ord || {}).forEach(function(id){ var o = S.ord[id]; m[o.item] = (m[o.item] || 0) + _bsN(o.qty); }); return m; }
function _bsLedger(){
  var S = _bsS(), ordM = _bsOrd(), ev = [];
  Object.keys(S.inb || {}).forEach(function(id){ var x = S.inb[id]; ev.push({ id: id, t: "in", dt: x.dt || "", item: x.item, qty: _bsN(x.qty), note: x.note || "" }); });
  _bsWork().forEach(function(r){ ev.push({ id: r.id, t: "work", dt: r.thaw || "", item: r.item, qty: _bsN(r.qty), note: (r.seq ? r.seq + "번 · " : "") + _bsW(r.doo) + "두름" + (r.loc ? " · " + r.loc : ""), seq: r.seq }); });
  ev.sort(function(a, b){ return a.dt.localeCompare(b.dt) || (a.t === b.t ? 0 : a.t === "in" ? -1 : 1); });
  var fr = {}, cin = {};
  ev.forEach(function(e){
    if(e.t === "in"){ cin[e.item] = (cin[e.item] || 0) + e.qty; fr[e.item] = (fr[e.item] || 0) + e.qty; }
    else fr[e.item] = (fr[e.item] || 0) - e.qty;
    e.fridge = fr[e.item]; e.busan = (ordM[e.item] || 0) - (cin[e.item] || 0);
  });
  return ev;
}
// 해동할 때 냉장고 재고가 모자란 작업 { id: {short, busan, dt, item} }
function _bsShort(){ var m = {}; _bsLedger().forEach(function(e){ if(e.t === "work" && e.fridge < 0) m[e.id] = { short: Math.min(e.qty, -e.fridge), busan: e.busan, dt: e.dt, item: e.item }; }); return m; }
function _bsShortBox(){
  var sh = _bsShort(), ks = Object.keys(sh); if(!ks.length) return "";
  var h = '<div class="card" style="margin-bottom:10px;border:2px solid #dc2626;background:#fef2f2"><div style="font-weight:800;color:#b91c1c;margin-bottom:4px">🔴 원료가 모자란 작업 ' + ks.length + '건 — 냉장고 재고보다 많이 해동하게 잡혀 있어요</div><div style="font-size:13px;line-height:1.8">';
  ks.sort(function(a, b){ return sh[a].dt.localeCompare(sh[b].dt); }).forEach(function(k){ var x = sh[k];
    h += _bsMS(x.dt) + ' <b>' + esc(_bsLbl(x.item)) + '</b> 해동 → <b style="color:#dc2626">' + _bsW(x.short) + '개 모자람</b> · ' + (x.busan > 0 ? '부산에 ' + _bsW(x.busan) + '개 남음 → <b>그 전에 입고 필요</b>' : '<b>부산에도 없음 → 발주·계획 확인</b>') + '<br>'; });
  return h + '</div></div>';
}
function _bsSummary(){
  var S = _bsS(), it = S.items || {}, m = {}, ordM = _bsOrd();
  Object.keys(it).forEach(function(k){ m[k] = { k: k, nm: it[k].nm || "", kg: _bsN(it[k].kg), order: ordM[k] || 0, real: it[k].real, inq: 0, work: 0 }; });
  var g = function(k){ return m[k] || (m[k] = { k: k, nm: "", kg: 0, order: 0, real: null, inq: 0, work: 0 }); };
  Object.keys(S.inb || {}).forEach(function(id){ var x = S.inb[id]; g(x.item).inq += _bsN(x.qty); });
  Object.keys(S.work || {}).forEach(function(id){ var x = S.work[id]; g(x.item).work += _bsQE(x); });
  Object.keys(S.ord || {}).forEach(function(id){ var x = S.ord[id]; if(!m[x.item]) g(x.item).order = ordM[x.item] || 0; });
  return Object.keys(m).sort(function(a, b){ var c = /가문|대호/.test(a) - /가문|대호/.test(b); return c || _bsMi(a) - _bsMi(b) || a.localeCompare(b); }).map(function(k){
    var r = m[k]; r.busan = r.order - r.inq; r.fridge = r.inq - r.work; r.left = r.order - r.work; r.doo = _bsDoo(k, r.order); r.kgTot = r.order * r.kg; r.gram = _bsMi(k) ? 8000 / _bsMi(k) : 0;
    r.diff = (r.real === "" || r.real == null) ? null : _bsN(r.real) - r.fridge; return r; });
}
// 그 날 그 구역에 걸린 두름 (건조일 ≤ 날짜 < 걷는 날)
function _bsOcc(zone, dt, skip, rows){
  var z = _bsZK(zone), list = (rows || _bsWork()).filter(function(r){ return r.id !== skip && r.loc && _bsZK(r.loc) === z && r.dry && r.dry <= dt && dt < r.walk; });
  return { doo: list.reduce(function(s, r){ return s + r.doo; }, 0), list: list };
}
// 이 구역에 이 두름을 dur 일 동안 널 수 있는 가장 빠른 날 (from 부터 150일 안)
function _bsFit(zone, doo, from, dur, skip){
  var cap = _bsCap(zone); if(!cap || !from) return null; if(doo > cap) return "over";
  var rows = _bsWork(), n = Math.max(1, +dur || 1);
  for(var i = 0; i < 150; i++){ var d = _bsAdd(from, i), ok = true;
    for(var j = 0; j < n; j++){ if(_bsOcc(zone, _bsAdd(d, j), skip, rows).doo + doo > cap){ ok = false; i += j; break; } }
    if(ok) return d; }
  return null;
}
function _bsZones(){ var z = _bsS().zones; return (z && z.length ? z : BS_ZONES.map(function(a){ return { nm: a[0], cap: a[1] }; })); }
function _bsCap(zone){ var z = _bsZK(zone), f = _bsZones().filter(function(x){ return _bsZK(x.nm) === z; })[0]; return f ? _bsN(f.cap) : 0; }

// ── 공통 머리 ──
function _bsHead(title, sub){
  var ss = _bsSeasons(), h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
  h += '<div><strong style="font-size:18px">' + title + '</strong> <span class="mut" style="font-size:12px;margin-left:6px">' + sub + '</span></div><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
  h += '<select onchange="bsSeason(this.value)" style="width:auto;padding:7px 10px;border:2px solid #0e7490;border-radius:6px;font-weight:800;font-size:14px">';
  ss.forEach(function(s){ h += '<option value="' + s + '"' + (s === BS.cur ? " selected" : "") + '>' + s + ' 시즌</option>'; });
  h += '</select>' + (_bsCan() ? _bsB("#0e7490", "+ 새 시즌", "bsNewSeason()") : "") + _bsB("#15803d", "📥 엑셀로 받기", "bsExcel()") + '</div></div>';
  if(!_bsCan()) h += '<div style="margin-top:6px;font-size:12px;color:#854d0e">👁 보기만 할 수 있어요</div>';
  return h + '</div>';
}
function _bsB(bg, label, on, ex){ return '<button class="btn" style="background:' + bg + ';color:#fff;' + (ex || "") + '" onclick="' + on + '">' + label + '</button>'; }
function bsSeason(s){ BS.cur = s; try { localStorage.setItem("gm_buse_season", s); } catch(e){} draw(); }
function _bsGate(){
  if(!BS.ALL){ _bsLoad(); return '<div class="card"><div class="mut">📡 부세 작업 불러오는 중...</div></div>'; }
  if(!BS.cur) return '<div class="card" style="text-align:center;padding:30px"><div style="font-size:15px;margin-bottom:10px">아직 시즌이 없어요</div>' + (_bsCan() ? _bsB("#0e7490", "+ 첫 시즌 만들기", "bsNewSeason()", "padding:10px 20px") : "") + '</div>';
  return "";
}

// ════════ 📅 건조 작업 일정 ════════
function dBsWork(){
  var g = _bsGate(); if(g) return g;
  var t = _bsToday(), rows = _bsWork(), can = _bsCan(), sh = _bsShort();
  var h = _bsHead("🐟 건조 작업 일정", "해동 → 건조(걸기) → 걷기 · " + rows.length + "건") + _bsShortBox();
  // 오늘 할 일
  var td = function(f){ return rows.filter(f); }, chip = function(r, c){ return '<span style="display:inline-block;background:#fff;border:1px solid ' + c + ';border-radius:12px;padding:2px 9px;margin:2px;font-size:12.5px"><b>' + esc(_bsLbl(r.item)) + '</b> ' + _bsW(r.qty) + '개' + (r.loc ? ' · ' + esc(r.loc) : '') + '</span>'; };
  var box = function(lb, c, list, extra){ return '<div style="flex:1;min-width:200px;border-left:5px solid ' + c + ';background:#f8fafc;border-radius:6px;padding:8px 10px"><div style="font-weight:800;color:' + c + ';margin-bottom:4px">' + lb + ' <span style="font-size:13px">' + list.length + '건</span></div>' + (list.length ? list.map(function(r){ return chip(r, c) + (extra ? extra(r) : ""); }).join("") : '<span class="mut" style="font-size:12px">없음</span>') + '</div>'; };
  h += '<div class="card" style="margin-bottom:10px"><div style="font-weight:800;margin-bottom:8px">📌 오늘 ' + _bsDH(t) + ' 할 일</div><div style="display:flex;gap:8px;flex-wrap:wrap">';
  h += box("🧊 해동", "#2563eb", td(function(r){ return r.thaw === t; }));
  h += box("🪝 건조(걸기)", "#16a34a", td(function(r){ return r.dry === t; }));
  h += box("🧺 걷기", "#dc2626", td(function(r){ return r.walk === t; }));
  h += box("⏰ 3일 안에 걷기", "#d97706", td(function(r){ return r.walk > t && _bsDiff(r.walk, t) <= 3; }), function(r){ return '<span style="font-size:11px;color:#d97706;font-weight:700">' + _bsMS(r.walk) + '</span> '; });
  h += '</div></div>';
  // 표
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:10px 12px">';
  h += '<div style="display:flex;gap:6px">' + _bsB(BS.view === "thaw" ? "#0e7490" : "#94a3b8", "해동 순", "BS.view='thaw';draw()") + _bsB(BS.view === "walk" ? "#0e7490" : "#94a3b8", "걷는 순", "BS.view='walk';draw()") + '</div>';
  if(can) h += _bsB("#2563eb", "+ 작업 추가", "bsWorkEdit('')", "padding:8px 16px");
  h += '</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:1150px"><thead><tr style="background:#ecfeff">';
  ["걷는<br>순번", "해동일", "건조일", "품목", "수량", "두름", "건조<br>기간", "걷는 날", "D-Day", "작업 위치", "상태", "비고", ""].forEach(function(x){ h += '<th style="padding:7px 6px;text-align:center;border-bottom:2px solid #a5f3fc;white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  var list = BS.view === "walk" ? rows.slice().sort(function(a, b){ return a.seq - b.seq; }) : rows, tq = 0, tdoo = 0;
  if(!list.length) h += '<tr><td colspan="13" style="padding:30px;text-align:center;color:#94a3b8">작업이 없어요' + (can ? ' — <b>+ 작업 추가</b>' : '') + '</td></tr>';
  list.forEach(function(r){
    var st = _bsState(r, t), dd = r.walk ? _bsDiff(r.walk, t) : null, past = st[0] === "걷음";
    tq += _bsN(r.qty); tdoo += r.doo;
    var C = 'style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:center;white-space:nowrap' + (past ? ';color:#94a3b8' : '') + '"';
    h += '<tr' + (r.walk === t ? ' style="background:#fef2f2"' : r.dry === t || r.thaw === t ? ' style="background:#f0fdf4"' : '') + '>';
    h += '<td ' + C + '><b>' + (r.seq || "") + '</b></td><td ' + C + '>' + _bsDH(r.thaw) + '</td><td ' + C + '>' + _bsDH(r.dry) + '</td><td ' + C + '><b>' + esc(_bsBase(r.item)) + '</b>' + (_bsKg(r.item) ? '<span style="font-size:11px;color:#475569"> · ' + _bsKg(r.item) + 'kg</span>' : '') + (r.nm ? '<div style="font-size:11.5px;color:#0e7490">' + esc(r.nm) + '</div>' : '') + '</td>';
    h += '<td ' + C + '>' + _bsW(r.qty) + (r.qty !== r.qp ? '<div style="font-size:10.5px;color:#7c3aed">계획 ' + _bsW(r.qp) + '</div>' : '') + (sh[r.id] ? '<div style="font-size:11px;color:#fff;background:#dc2626;border-radius:8px;padding:0 5px;margin-top:2px">재고 ' + _bsW(sh[r.id].short) + ' 모자람</div>' : '') + '</td>';
    h += '<td ' + C + '>' + _bsW(r.doo) + '</td><td ' + C + '>' + (r.days ? r.days + "일" : "-") + (r.walkA && r.days !== _bsN(r.dur) ? '<div style="font-size:10.5px;color:#7c3aed">예정 ' + r.dur + '일</div>' : '') + '</td>';
    h += '<td ' + C + '><b>' + (r.hold ? '<span style="color:#7c3aed">보류</span>' : _bsDH(r.walk)) + '</b>' + (r.walkA ? '<div style="font-size:10.5px;color:#16a34a">실제</div>' : '') + '</td>';
    h += '<td ' + C + '>' + (dd == null ? "" : dd === 0 ? '<b style="color:#dc2626">오늘</b>' : dd > 0 ? '<b style="color:' + (dd <= 3 ? "#d97706" : "#0e7490") + '">D-' + dd + '</b>' : '<span style="font-size:11px">지남</span>') + '</td>';
    h += '<td ' + C + '>' + esc(r.loc || "") + '</td><td ' + C + '><span style="background:' + st[1] + ';color:#fff;border-radius:9px;padding:1px 8px;font-size:11.5px;font-weight:700">' + st[0] + '</span></td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px;max-width:160px">' + esc(r.note || "") + '</td><td ' + C + '>' + (can ? _bsActs(r, t) : "") + '</td></tr>';
  });
  if(list.length) h += '<tr style="background:#f1f5f9;font-weight:800"><td colspan="4" style="padding:7px;text-align:center">합계</td><td style="text-align:center">' + _bsW(tq) + '</td><td style="text-align:center">' + _bsW(tdoo) + '</td><td colspan="7"></td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}
// 줄마다 빠른 버튼: 널기 미루기 · 보류(얼려 둠) · 걷음 · 수정
function _bsActs(r, t){
  var b = function(bg, l, on){ return '<button class="btn" style="background:' + bg + ';color:#fff;padding:3px 7px;margin:1px;font-size:11.5px" onclick="' + on + '">' + l + '</button>'; }, h = '';
  if(!(r.walk && t >= r.walk)){
    if(!r.dry || t <= r.dry || r.hold) h += b("#0e7490", "📅 미루기", "bsDelay('" + r.id + "')");
    h += r.hold ? b("#16a34a", "🪝 널기", "bsDelay('" + r.id + "')") : (!r.dry || t < r.dry ? b("#7c3aed", "🧊 보류", "bsHold('" + r.id + "')") : "");
    if(r.dry && t >= r.dry && !r.hold) h += b("#dc2626", "🧺 걷음", "bsWalkNow('" + r.id + "')");
  }
  return '<div style="white-space:normal;min-width:120px">' + h + b("#2563eb", "수정", "bsWorkEdit('" + r.id + "')") + '</div>';
}
function _bsPatch(id, o, msg){
  var S = BS.ALL[BS.cur], w = Object.assign({}, S.work[id], o);
  Object.keys(o).forEach(function(k){ if(o[k] === null) delete w[k]; });
  return _bsRef("work/" + id).set(w).then(function(){ S.work[id] = w; closePopup(); toast(msg); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function bsDelay(id){
  var w = _bsS().work[id], cur = w.dry || _bsToday(), nd = prompt("새로 너는 날 (날씨 때문에 미룸 · YYYY-MM-DD)\n지금: " + (w.dry || "-") + (w.hold ? " · 보류 중" : ""), w.hold ? _bsToday() : _bsAdd(cur, 1));
  if(nd == null) return; nd = nd.trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(nd)) return toast("날짜를 2026-12-20 처럼 넣어 주세요", true);
  if(w.thaw && nd < w.thaw) return toast("해동일보다 빠를 수 없어요", true);
  var note = w.dry && w.dry !== nd ? ((w.note ? w.note + " / " : "") + "널기 " + _bsMS(w.dry) + "→" + _bsMS(nd)) : w.note;
  _bsPatch(id, { dry: nd, hold: null, note: note || "" }, "널는 날 " + _bsMS(nd) + " · 걷는 날 " + _bsMS(_bsAdd(nd, w.dur)));
}
function bsHold(id){
  if(!confirm("이 작업을 '널기 보류(얼려 둠)'로 할까요?\n날씨가 좋아지면 🪝 널기 를 눌러 너는 날을 정하면 돼요. 보류 중엔 건조장 자리 계산에서 빠져요.")) return;
  var w = _bsS().work[id]; _bsPatch(id, { hold: true, note: (w.note ? w.note + " / " : "") + "보류 " + _bsMS(_bsToday()) }, "🧊 보류했어요");
}
function bsWalkNow(id){
  var w = _bsS().work[id], wp = _bsAdd(w.dry, w.dur), d = prompt("실제 걷은 날 (예정 " + wp + " · " + w.dur + "일)", _bsToday()); if(d == null) return; d = d.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast("날짜를 2026-12-20 처럼 넣어 주세요", true);
  if(d < w.dry) return toast("너는 날보다 빠를 수 없어요", true);
  _bsPatch(id, { walkA: d }, "🧺 걷음 — " + _bsDiff(d, w.dry) + "일 말림" + (d !== wp ? " (예정 " + w.dur + "일)" : ""));
}
function bsWorkEdit(id){
  var w = id ? (_bsS().work || {})[id] : null, last = _bsWork().slice(-1)[0];
  var d = w ? Object.assign({}, w) : { thaw: _bsToday(), dry: _bsAdd(_bsToday(), 2), item: last ? last.item : "", qty: "", dur: 13, loc: "", note: "" };
  var items = _bsSummary().map(function(r){ return r.k; }), zones = _bsZones();
  var I = function(lb, k, typ, ex){ return '<label style="font-size:13px">' + lb + '<input id="bw_' + k + '" type="' + (typ || "text") + '" value="' + esc(d[k] == null ? "" : d[k]) + '" oninput="_bsWorkCalc(\'' + (id || "") + '\')" ' + (ex || "") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-size:14px"></label>'; };
  var h = '<h3 style="margin:0 0 10px">🐟 ' + (id ? "작업 고치기" : "작업 추가") + ' <span class="mut" style="font-size:12px">' + BS.cur + ' 시즌</span><button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + I("🧊 해동일", "thaw", "date") + I("🪝 건조일 (걸기)", "dry", "date");
  h += I("품목 (미수 · kg)", "item", "text", 'list="bwItems"') + I("계획 수량 (개)", "qty", "number", 'inputmode="numeric"');
  h += I("실제 작업 수량 <span class=mut style=font-size:11px>(다르면 · 비우면 계획대로)</span>", "qtyA", "number", 'inputmode="numeric"') + I("실제 걷은 날 <span class=mut style=font-size:11px>(일찍·늦게 걷었으면)</span>", "walkA", "date") + '</div>';
  h += '<label style="font-size:13px;display:block;margin-top:8px"><input type="checkbox" id="bw_hold"' + (d.hold ? " checked" : "") + ' onchange="_bsWorkCalc(\'' + (id || "") + '\')"> 🧊 널기 보류 (날씨 때문에 얼려 둠 — 건조장 자리 계산에서 빠짐)</label>';
  h += '<datalist id="bwItems">' + items.map(function(x){ return '<option value="' + esc(x) + '">' + esc(_bsLbl(x)) + '</option>'; }).join("") + '</datalist><datalist id="bwNms">' + _bsNms().map(function(x){ return '<option value="' + esc(x) + '">'; }).join("") + '</datalist>';
  h += '<label style="font-size:13px;display:block;margin-top:10px">품명 <span class="mut" style="font-size:11px">(건조 일수·kg 따라 달라져요 — 전에 쓴 품명 자동)</span><input id="bw_nm" list="bwNms" value="' + esc(d.nm || "") + '" oninput="this.dataset.manual=1" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-size:14px"></label>';
  h += '<div style="margin-top:10px;font-size:13px">건조 기간 ';
  BS_DUR.forEach(function(n){ h += '<button class="btn" style="background:#0e7490;color:#fff;padding:5px 12px;margin-right:4px" onclick="document.getElementById(\'bw_dur\').value=' + n + ';_bsWorkCalc(\'' + (id || "") + '\')">' + n + '일</button>'; });
  h += '<input id="bw_dur" type="number" value="' + esc(d.dur == null ? "" : d.dur) + '" oninput="_bsWorkCalc(\'' + (id || "") + '\')" style="width:70px;padding:6px;border:1px solid #cbd5e1;border-radius:6px"> 일 <span class="mut" style="font-size:11.5px">(0 = 건조 안 함)</span></div>';
  h += '<label style="font-size:13px;display:block;margin-top:10px">작업 위치 <select id="bw_loc" onchange="_bsWorkCalc(\'' + (id || "") + '\')" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px"><option value="">(정하지 않음)</option>';
  var hasLoc = !d.loc;
  zones.forEach(function(z){ var on = _bsZK(z.nm) === _bsZK(d.loc); if(on) hasLoc = true; h += '<option value="' + esc(z.nm) + '"' + (on ? " selected" : "") + '>' + esc(z.nm) + ' (최대 ' + _bsW(z.cap) + '두름)</option>'; });
  if(!hasLoc) h += '<option value="' + esc(d.loc) + '" selected>' + esc(d.loc) + ' (구역 목록에 없음)</option>';
  h += '</select></label>' + '<label style="font-size:13px;display:block;margin-top:10px">비고<input id="bw_note" value="' + esc(d.note || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<div id="bwCalc" style="margin-top:12px"></div><div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "bsWorkDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "bsWorkSave('" + (id || "") + "')", "padding:9px 24px;font-size:14px") + '</div>';
  openPopup(h, 560); _bsWorkCalc(id || "");
}
function _bsWorkVal(){
  var g = function(k){ var e = document.getElementById("bw_" + k); return e ? e.value.trim() : ""; };
  var v = { thaw: g("thaw"), dry: g("dry"), item: g("item"), qty: _bsN(g("qty")), dur: Math.max(0, Math.round(_bsN(g("dur")))), loc: g("loc"), note: g("note"), nm: g("nm") };
  if(g("qtyA") !== "") v.qtyA = _bsN(g("qtyA"));
  if(g("walkA")) v.walkA = g("walkA");
  var hb = document.getElementById("bw_hold"); if(hb && hb.checked) v.hold = true;
  return v;
}
function _bsWorkCalc(id){
  var v = _bsWorkVal(), el = document.getElementById("bwCalc"); if(!el) return;
  var ne = document.getElementById("bw_nm");   // 품명 자동 (직접 고치지 않았으면)
  if(ne && !ne.dataset.manual && v.item){ var gs = _bsNmGuess(v.item, v.dur, id) || ((_bsS().items || {})[v.item] || {}).nm || ""; if(gs && ne.value !== gs){ ne.value = gs; v.nm = gs; } }
  var q = v.qtyA != null ? v.qtyA : v.qty, walk = v.hold ? "" : (v.walkA || (v.dry ? _bsAdd(v.dry, v.dur) : "")), doo = _bsDoo(v.item, q), warn = [];
  if(v.walkA && v.dry && v.walkA < v.dry) warn.push("실제 걷은 날이 너는 날보다 빨라요");
  if(v.item && !_bsMi(v.item)) warn.push("품목 이름은 숫자(미수)로 시작해야 두름이 계산돼요 (예: 27미)");
  if(v.item && !(_bsS().items || {})[v.item]) warn.push(esc(v.item) + " 은(는) 품목 목록에 없어요 — 발주에서 미수·kg 으로 먼저 넣어 주세요");
  if(v.thaw && v.dry && v.dry < v.thaw) warn.push("건조일이 해동일보다 빨라요");
  // 냉장고 재고: 해동일까지 들어온 것 − 그날까지 작업(이 작업 빼고)
  if(v.item && v.qty && v.thaw){
    var stock = 0; _bsLedger().forEach(function(e){ if(e.item === v.item && e.dt <= v.thaw && !(e.t === "work" && e.id === id)) stock += e.t === "in" ? e.qty : -e.qty; });
    var bus = (_bsOrd()[v.item] || 0) - _bsLedger().filter(function(e){ return e.t === "in" && e.item === v.item; }).reduce(function(a, e){ return a + e.qty; }, 0);
    if(stock - q < 0) warn.push("냉장고 재고가 모자라요 — " + _bsMS(v.thaw) + " 기준 " + esc(v.item) + " " + _bsW(stock) + "개 남음 (" + _bsW(q - stock) + "개 부족)" + (bus > 0 ? " · 부산에 " + _bsW(bus) + "개 있음 → 그 전에 입고 필요" : " · 부산에도 없음"));
  }
  // 구역 자리: 건조 기간 동안 가장 많이 찬 날
  var capTxt = "", fit = "";
  if(v.loc && v.dry && v.dur && !v.hold){
    var cap = _bsCap(v.loc), mx = 0, mxd = v.dry;
    for(var i = 0; i < v.dur; i++){ var dd = _bsAdd(v.dry, i), o = _bsOcc(v.loc, dd, id).doo; if(o > mx){ mx = o; mxd = dd; } }
    capTxt = esc(v.loc) + ": 다른 작업 최대 " + _bsW(mx) + "두름(" + _bsMS(mxd) + ") + 이번 " + _bsW(doo) + " = <b>" + _bsW(mx + doo) + "</b>" + (cap ? " / " + _bsW(cap) + "두름" : "");
    if(cap && mx + doo > cap){
      warn.push(esc(v.loc) + " 자리가 넘쳐요 (" + _bsW(mx + doo) + " / " + _bsW(cap) + "두름)");
      var f = _bsFit(v.loc, doo, v.dry, v.dur, id);
      fit += f === "over" ? '<div>📌 ' + esc(v.loc) + '은(는) 최대 ' + _bsW(cap) + '두름이라 한 번에 못 널어요 — 나눠서 널기</div>' : f ? '<div>📌 <b>' + esc(v.loc) + '은(는) ' + _bsMS(f) + '부터 널 수 있어요</b> <button class="btn" style="background:#0e7490;color:#fff;padding:2px 8px" onclick="document.getElementById(\'bw_dry\').value=\'' + f + '\';_bsWorkCalc(\'' + (id || "") + '\')">그 날로</button></div>' : '';
    }
  }
  // 그 날 바로 널 수 있는 다른 구역
  if(v.dry && doo && !v.hold && (!v.loc || warn.some(function(x){ return /넘쳐요/.test(x); }))){
    var free = _bsZones().filter(function(z){ return _bsZK(z.nm) !== _bsZK(v.loc) && _bsFit(z.nm, doo, v.dry, v.dur || 1, id) === v.dry; });
    if(free.length) fit += '<div>🟢 ' + _bsMS(v.dry) + '에 바로 널 수 있는 곳: ' + free.map(function(z){ return '<a href="javascript:void 0" onclick="document.getElementById(\'bw_loc\').value=\'' + esc(z.nm) + '\';_bsWorkCalc(\'' + (id || "") + '\')"><b>' + esc(z.nm) + '</b></a>'; }).join(", ") + '</div>';
  }
  el.innerHTML = '<div style="background:#ecfeff;border-radius:8px;padding:9px 12px;font-size:13.5px;line-height:1.8">두름 <b style="font-size:16px">' + _bsW(doo) + '</b> · 걷는 날 <b style="font-size:16px;color:#dc2626">' + (walk ? _bsMD(walk) : "-") + '</b>' + (walk ? ' (D-' + _bsDiff(walk, _bsToday()) + ')' : '') + (capTxt ? '<br><span style="font-size:12.5px">' + capTxt + '</span>' : '') + (v.hold ? '<br><b style="color:#7c3aed">🧊 보류 중 — 자리 계산에서 빠짐</b>' : '') + '</div>' + (fit ? '<div style="background:#f0fdf4;border-radius:8px;padding:8px 12px;margin-top:6px;font-size:13px;line-height:1.8">' + fit + '</div>' : '') +
    (warn.length ? '<div style="background:#fef3c7;border-radius:8px;padding:8px 12px;margin-top:6px;font-size:13px;color:#92400e">⚠️ ' + warn.join("<br>⚠️ ") + '</div>' : '');
}
function bsWorkSave(id){
  var v = _bsWorkVal();
  if(!v.thaw || !v.dry) return toast("해동일과 건조일을 넣어 주세요", true);
  if(!v.item || !v.qty) return toast("품목과 수량을 넣어 주세요", true);
  if(v.walkA && v.walkA < v.dry) return toast("실제 걷은 날이 너는 날보다 빨라요", true);
  var ref = id ? _bsRef("work/" + id) : _bsRef("work").push(), key = id || ref.key;
  showLoading("저장 중...");
  ref.set(v).then(function(){ hideLoading(); var S = BS.ALL[BS.cur]; S.work = S.work || {}; S.work[key] = v; closePopup(); toast(v.hold ? "저장했어요 — 🧊 보류" : "저장했어요 — 걷는 날 " + _bsMD(v.walkA || _bsAdd(v.dry, v.dur))); draw(); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
function bsWorkDel(id){
  var w = _bsS().work[id]; if(!confirm(_bsMS(w.thaw) + " 해동 " + w.item + " " + w.qty + "개 작업을 지울까요?")) return;
  _bsRef("work/" + id).remove().then(function(){ delete BS.ALL[BS.cur].work[id]; closePopup(); toast("지웠어요"); draw(); });
}

// ════════ 📦 원료 입고·재고 ════════
function dBsStock(){
  var g = _bsGate(); if(g) return g;
  var can = _bsCan(), sm = _bsSummary(), led = _bsLedger();
  var h = _bsHead("📦 원료 입고·재고", "발주 → 부산에서 입고 → 작업(해동)은 작업 일정에서 저절로 빠져요") + _bsShortBox() + _bsPubBox() + _bsOrdBox();
  // 품목별 요약
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;flex-wrap:wrap;gap:6px"><b>품목별 현황</b>' + (can ? _bsB("#0e7490", "+ 품목 추가", "bsItemEdit('')") : "") + '</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:1000px"><thead><tr style="background:#ecfeff">';
  ["품목", "원료 품명 / 작업 품명", "상자 kg", "마리당 g", "총 발주", "입고", "부산 남은", "작업(해동)", "작업 남은", "냉장고 재고", "실재고", "오차", "총 두름", "키로수", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #a5f3fc;white-space:nowrap;text-align:' + (i < 2 ? "left" : i === 14 ? "center" : "right") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  var T = { order: 0, inq: 0, busan: 0, work: 0, left: 0, fridge: 0, doo: 0, kgTot: 0 };
  sm.forEach(function(r){
    Object.keys(T).forEach(function(k){ T[k] += r[k]; });
    var C = 'style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap"';
    var byD = {}; Object.keys(_bsS().work || {}).forEach(function(i){ var w = _bsS().work[i]; if(w.item === r.k && w.nm) (byD[w.nm] = byD[w.nm] || {})[_bsN(w.dur)] = 1; });
    var nmTxt = Object.keys(byD).map(function(n){ return Object.keys(byD[n]).sort(function(a, b){ return a - b; }).map(function(d){ return d + "일"; }).join("·") + " " + n; }).join("<br>");
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800;white-space:nowrap"><a href="javascript:void 0" onclick="BS.item=(BS.item===\'' + esc(r.k) + '\'?\'\':\'' + esc(r.k) + '\');draw()" style="color:#0e7490">' + esc(_bsBase(r.k)) + '</a></td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' + (esc(r.nm) || '<span class="mut">-</span>') + (nmTxt ? '<div style="font-size:11.5px;color:#0e7490">' + nmTxt + '</div>' : '') + '</td>';
    h += '<td ' + C + '><b>' + (r.kg || "") + '</b></td><td ' + C + '>' + (r.gram ? Math.round(r.gram) : "") + '</td><td ' + C + '><b>' + _bsW(r.order) + '</b></td><td ' + C + '>' + _bsW(r.inq) + '</td>';
    h += '<td ' + C + '><span style="color:' + (r.busan < 0 ? "#dc2626" : r.busan ? "#a16207" : "#94a3b8") + '">' + _bsW(r.busan) + '</span></td><td ' + C + '>' + _bsW(r.work) + '</td><td ' + C + '><span style="color:' + (r.left < 0 ? "#dc2626" : r.left ? "#7c3aed" : "#94a3b8") + '">' + _bsW(r.left) + '</span></td>';
    h += '<td ' + C + '><b style="color:' + (r.fridge < 0 ? "#dc2626" : r.fridge ? "#0e7490" : "#94a3b8") + '">' + _bsW(r.fridge) + '</b></td><td ' + C + '>' + (r.real === "" || r.real == null ? '<span class="mut">-</span>' : _bsW(_bsN(r.real))) + '</td>';
    h += '<td ' + C + '>' + (r.diff == null ? "" : '<b style="color:' + (r.diff ? "#dc2626" : "#16a34a") + '">' + (r.diff > 0 ? "+" : "") + _bsW(r.diff) + '</b>') + '</td><td ' + C + '>' + _bsW(r.doo) + '</td><td ' + C + '>' + _bsW(r.kgTot) + '</td>';
    h += '<td ' + C + '>' + (can ? _bsB("#2563eb", "수정", "bsItemEdit('" + esc(r.k) + "')", "padding:3px 9px") : "") + '</td></tr>';
  });
  h += '<tr style="background:#f1f5f9;font-weight:800;text-align:right"><td colspan="4" style="padding:7px;text-align:center">합계</td><td style="padding:6px">' + _bsW(T.order) + '</td><td style="padding:6px">' + _bsW(T.inq) + '</td><td style="padding:6px">' + _bsW(T.busan) + '</td><td style="padding:6px">' + _bsW(T.work) + '</td><td style="padding:6px">' + _bsW(T.left) + '</td><td style="padding:6px">' + _bsW(T.fridge) + '</td><td colspan="2"></td><td style="padding:6px">' + _bsW(T.doo) + '</td><td style="padding:6px">' + _bsW(T.kgTot) + '<div style="font-size:11px;color:#64748b">' + _bsW(T.kgTot / 1000) + ' 톤</div></td><td></td></tr>';
  h += '</tbody></table></div><div class="mut" style="font-size:11.5px;padding:6px 12px">마리당 g = 8,000 ÷ 미수 (엑셀과 같게) · 총 두름 = 발주 × 미수 ÷ 10 · 키로수 = 발주 × 상자 kg · 작업 남은 = 발주 − 작업 · 냉장고 재고 = 입고 − 작업 · 오차 = 실재고 − 냉장고 재고</div></div>';
  // 날짜별 장부
  var L = BS.item ? led.filter(function(e){ return e.item === BS.item; }) : led;
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;flex-wrap:wrap;gap:6px"><div><b>날짜별 입고·작업</b> ' + (BS.item ? '<span style="background:#0e7490;color:#fff;border-radius:10px;padding:2px 9px;font-size:12px">' + esc(_bsLbl(BS.item)) + ' 만</span> <a href="javascript:void 0" onclick="BS.item=\'\';draw()" style="font-size:12px">전체 보기</a>' : '<span class="mut" style="font-size:12px">— 위 품목 이름을 누르면 그 품목만</span>') + '</div>';
  if(can) h += '<div style="display:flex;gap:6px;flex-wrap:wrap">' + _bsB("#7c3aed", "📨 부산 입고 양식 (링크·QR)", "bsPubLink()") + _bsB("#16a34a", "+ 입고 등록", "bsInEdit('')", "padding:8px 16px") + '</div>';
  h += '</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:720px"><thead><tr style="background:#ecfeff">';
  ["날짜", "품목", "가문 입고", "작업(해동)", "냉장고 재고", "부산 남은", "내용", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #a5f3fc;white-space:nowrap;text-align:' + (i >= 2 && i <= 5 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!L.length) h += '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8">아직 없어요</td></tr>';
  L.forEach(function(e){
    var isIn = e.t === "in", C = 'style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap"';
    h += '<tr style="background:' + (isIn ? "#f0fdf4" : "#fff") + '"><td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsDH(e.dt) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(_bsLbl(e.item)) + '</td>';
    h += '<td ' + C + '>' + (isIn ? '<b style="color:#16a34a">+' + _bsW(e.qty) + '</b>' : '') + '</td><td ' + C + '>' + (!isIn ? '<b style="color:#2563eb">−' + _bsW(e.qty) + '</b>' : '') + '</td>';
    h += '<td ' + C + '><b style="color:' + (e.fridge < 0 ? "#dc2626" : "#0f172a") + '">' + _bsW(e.fridge) + '</b></td><td ' + C + '>' + (isIn ? _bsW(e.busan) : '') + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + (isIn ? "🚚 입고" : "🧊 해동 ") + esc(e.note) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:center">' + (can ? (isIn ? _bsB("#2563eb", "수정", "bsInEdit('" + e.id + "')", "padding:3px 9px") : _bsB("#0e7490", "작업", "bsWorkEdit('" + e.id + "')", "padding:3px 9px")) : "") + '</td></tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}
function bsInEdit(id){
  var x = id ? _bsS().inb[id] : { dt: _bsToday(), item: BS.item || "", qty: "", note: "" }, items = _bsSummary().map(function(r){ return r.k; });
  var h = '<h3 style="margin:0 0 10px">🚚 ' + (id ? "입고 고치기" : "입고 등록") + '<button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<label style="font-size:13px">날짜<input id="bi_dt" type="date" value="' + esc(x.dt) + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label style="font-size:13px">품목<input id="bi_item" value="' + esc(x.item) + '" list="biItems" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label style="font-size:13px">가문 입고 수량 (개)<input id="bi_qty" type="number" inputmode="numeric" value="' + esc(x.qty) + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label style="font-size:13px">비고<input id="bi_note" value="' + esc(x.note || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label></div>';
  h += '<datalist id="biItems">' + items.map(function(k){ return '<option value="' + esc(k) + '">' + esc(_bsLbl(k)) + '</option>'; }).join("") + '</datalist>';
  h += '<div class="mut" style="font-size:12px;margin-top:8px">부산 남은 재고 = 그 품목 총 발주 − 지금까지 입고 (품목별 현황에서 발주 수량을 넣어 두세요)</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "bsInDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "bsInSave('" + (id || "") + "')", "padding:9px 24px") + '</div>';
  openPopup(h, 520);
}
function bsInSave(id){
  var g = function(k){ return document.getElementById("bi_" + k).value.trim(); }, v = { dt: g("dt"), item: g("item"), qty: _bsN(g("qty")), note: g("note") };
  if(!v.dt || !v.item || !v.qty) return toast("날짜·품목·수량을 넣어 주세요", true);
  var ref = id ? _bsRef("inb/" + id) : _bsRef("inb").push(), key = id || ref.key, S = BS.ALL[BS.cur], newItem = !(S.items || {})[v.item];
  var up = {}; up["inb/" + key] = v; if(newItem) up["items/" + v.item] = { nm: "", kg: 8.8, order: 0, real: "" };
  _bsRef().update(up).then(function(){ S.inb = S.inb || {}; S.inb[key] = v; if(newItem){ S.items = S.items || {}; S.items[v.item] = up["items/" + v.item]; } closePopup(); toast("입고 저장했어요" + (newItem ? " (새 품목 " + v.item + " 추가됨 — 발주 수량을 넣어 주세요)" : "")); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function bsInDel(id){ if(!confirm("이 입고 기록을 지울까요?")) return; _bsRef("inb/" + id).remove().then(function(){ delete BS.ALL[BS.cur].inb[id]; closePopup(); toast("지웠어요"); draw(); }); }
function bsItemEdit(k){
  var it = k ? ((_bsS().items || {})[k] || {}) : { nm: "", kg: 8.8, order: "", real: "" };
  var F = function(lb, id, v, typ, ph){ return '<label style="font-size:13px">' + lb + '<input id="bt_' + id + '" type="' + (typ || "text") + '" value="' + esc(v == null ? "" : v) + '" placeholder="' + (ph || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">🐟 ' + (k ? esc(k) + " 품목" : "품목 추가") + '<button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += (k ? '<div style="font-size:13px">품목<div style="font-size:18px;font-weight:800">' + esc(_bsLbl(k)) + '</div></div>' : F("품목 (예: 27미, 24미가문)", "k", "", "text", "27미")) + F("품명", "nm", it.nm, "text", "마오가, 생마소오가...");
  h += F("상자 kg", "kg", it.kg, "number") + F("실재고 (센 숫자 · 비우면 안 씀)", "real", it.real, "number") + '</div>';
  h += '<div class="mut" style="font-size:12px;margin-top:8px">발주 수량은 위 <b>📝 발주</b>에서 넣어요' + (_bsN(it.order) ? ' (엑셀에서 온 발주 ' + _bsW(it.order) + '개 포함)' : '') + '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (k ? _bsB("#dc2626", "🗑 품목 삭제", "bsItemDel('" + esc(k) + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "bsItemSave('" + esc(k || "") + "')", "padding:9px 24px") + '</div>';
  openPopup(h, 500);
}
function bsItemSave(k){
  var g = function(id){ var e = document.getElementById("bt_" + id); return e ? e.value.trim() : ""; };
  var key = k || g("k"); if(!key) return toast("품목 이름을 넣어 주세요", true);
  if(/[.#$\[\]\/]/.test(key)) return toast("품목 이름에 . # $ [ ] / 는 못 써요", true);
  if(!k && (_bsS().items || {})[key]) return toast("이미 있는 품목이에요", true);
  var v = { nm: g("nm"), kg: _bsN(g("kg")), order: k ? _bsN(((_bsS().items || {})[k] || {}).order) : 0, real: g("real") === "" ? "" : _bsN(g("real")) };
  _bsRef("items/" + key).set(v).then(function(){ var S = BS.ALL[BS.cur]; S.items = S.items || {}; S.items[key] = v; closePopup(); toast("저장했어요"); _bsPubSync(); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function bsItemDel(k){
  var used = ["work", "inb", "ord"].some(function(n){ var o = _bsS()[n] || {}; return Object.keys(o).some(function(i){ return o[i].item === k; }); });
  if(used) return toast("이 품목으로 된 발주·입고·작업이 있어서 못 지워요", true);
  if(!confirm(k + " 품목을 지울까요?")) return;
  _bsRef("items/" + k).remove().then(function(){ delete BS.ALL[BS.cur].items[k]; closePopup(); draw(); });
}

// ════════ 🗺 건조장 자리 ════════
function dBsZone(){
  var g = _bsGate(); if(g) return g;
  var dt = BS.zdt || _bsToday(), can = _bsCan(), zones = _bsZones(), tot = 0, used = 0;
  var h = _bsHead("🗺 건조장 자리", "그 날 어느 구역에 몇 두름 걸려 있는지");
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>날짜</b><input type="date" value="' + dt + '" onchange="BS.zdt=this.value;draw()" style="width:auto;padding:7px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px">';
  h += _bsB("#475569", "◀ 하루 전", "BS.zdt=_bsAdd('" + dt + "',-1);draw()") + _bsB("#0e7490", "오늘", "BS.zdt='';draw()") + _bsB("#475569", "하루 뒤 ▶", "BS.zdt=_bsAdd('" + dt + "',1);draw()");
  if(can) h += '<span style="margin-left:auto">' + _bsB("#7c3aed", "⚙️ 구역·최대 두름 고치기", "bsZoneEdit()") + '</span>';
  h += '</div>';
  var occ = {}; zones.forEach(function(z){ var o = _bsOcc(z.nm, dt); occ[_bsZK(z.nm)] = o; tot += _bsN(z.cap); used += o.doo; });
  var col = function(p){ return p >= 1 ? "#dc2626" : p >= .7 ? "#f59e0b" : p > 0 ? "#16a34a" : "#e2e8f0"; };
  h += _bsGantt(dt);
  // 배치도
  h += '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px"><b>건조장 배치도</b><span style="font-size:13px">전체 <b>' + _bsW(used) + '</b> / ' + _bsW(tot) + '두름 (' + (tot ? Math.round(used / tot * 100) : 0) + '%)</span></div>';
  h += '<div style="overflow-x:auto"><div style="display:grid;grid-template-columns:repeat(9,minmax(78px,1fr));grid-auto-rows:minmax(52px,auto);gap:4px;min-width:720px">';
  BS_MAP.forEach(function(m){
    var st = 'grid-row:' + m[2] + '/span ' + m[4] + ';grid-column:' + m[3] + '/span ' + m[5] + ';border-radius:6px;padding:4px;font-size:12px;text-align:center;display:flex;flex-direction:column;justify-content:center;';
    if(!m[1]){ h += '<div style="' + st + 'background:' + (/도 로/.test(m[0]) ? "#475569;color:#fff;font-weight:700" : "#f1f5f9;color:#64748b;border:1px dashed #cbd5e1") + '">' + esc(m[0]) + '</div>'; return; }
    var k = _bsZK(m[1]), cap = _bsCap(m[1]), o = occ[k] || { doo: 0, list: [] }, p = cap ? o.doo / cap : (o.doo ? 1 : 0), sel = BS.zsel === k;
    h += '<div onclick="BS.zsel=(BS.zsel===\'' + k + '\'?\'\':\'' + k + '\');draw()" style="' + st + 'cursor:pointer;background:linear-gradient(to top,' + col(p) + '33 ' + Math.min(100, Math.round(p * 100)) + '%,#fff 0);border:2px solid ' + (sel ? "#0f172a" : col(p)) + '"><b>' + esc(m[0]) + '</b><span style="font-size:11.5px">' + _bsW(o.doo) + ' / ' + _bsW(cap) + '</span>' + (o.list.length ? '<span style="font-size:10.5px;color:#475569">' + o.list.map(function(r){ return esc(_bsBase(r.item)); }).join(", ") + '</span>' : '') + '</div>';
  });
  h += '</div></div><div class="mut" style="font-size:11.5px;margin-top:6px">칸 색: <span style="color:#16a34a">● 여유</span> <span style="color:#f59e0b">● 70% 넘음</span> <span style="color:#dc2626">● 꽉 참·넘침</span> · 칸을 누르면 아래에 그 구역 작업이 나와요</div></div>';
  // 구역별 표
  h += '<div class="card" style="padding:0;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#ecfeff"><th style="padding:7px">구역</th><th>걸린 두름 / 최대</th><th style="width:40%">걸린 작업 (걷는 날)</th></tr></thead><tbody>';
  var rows = zones.filter(function(z){ return !BS.zsel || _bsZK(z.nm) === BS.zsel; });
  rows.forEach(function(z){ var o = occ[_bsZK(z.nm)], cap = _bsN(z.cap), p = cap ? o.doo / cap : 0;
    h += '<tr><td style="padding:7px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(z.nm) + '</td><td style="padding:7px;border-bottom:1px solid #f1f5f9"><div style="background:#e2e8f0;border-radius:6px;height:16px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, Math.round(p * 100)) + '%;background:' + col(p) + '"></div></div><div style="font-size:12px;margin-top:2px">' + _bsW(o.doo) + ' / ' + _bsW(cap) + '두름 (' + Math.round(p * 100) + '%)</div></td>';
    h += '<td style="padding:7px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' + (o.list.length ? o.list.map(function(r){ return '<b>' + esc(_bsLbl(r.item)) + '</b> ' + _bsW(r.doo) + '두름 <span style="color:#dc2626">(' + _bsMS(r.walk) + ')</span>'; }).join("<br>") : '<span class="mut">비어 있음</span>') + '</td></tr>'; });
  // 구역 목록에 없는 위치
  var known = {}; zones.forEach(function(z){ known[_bsZK(z.nm)] = 1; });
  var other = _bsWork().filter(function(r){ return r.loc && !known[_bsZK(r.loc)] && r.dry && r.dry <= dt && dt < r.walk; });
  if(other.length && !BS.zsel) h += '<tr><td style="padding:7px;font-weight:700;color:#a16207">구역 목록에 없는 위치</td><td colspan="2" style="padding:7px;font-size:12.5px">' + other.map(function(r){ return esc(r.loc) + ': <b>' + esc(_bsLbl(r.item)) + '</b> ' + _bsW(r.doo) + '두름'; }).join("<br>") + '</td></tr>';
  h += '</tbody></table></div>';
  return h;
}
function bsZoneEdit(){
  var z = _bsZones(), h = '<h3 style="margin:0 0 6px">⚙️ 구역 · 최대 두름 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div class="mut" style="font-size:12px;margin-bottom:8px">' + BS.cur + ' 시즌 구역. 이름은 작업 위치와 같게 (띄어쓰기는 상관없어요)</div><div id="bzList">';
  z.forEach(function(x){ h += _bsZoneRow(x.nm, x.cap); });
  h += '</div>' + _bsB("#0e7490", "+ 구역 추가", "document.getElementById('bzList').insertAdjacentHTML('beforeend',_bsZoneRow('',0))") + '<div style="text-align:right;margin-top:12px">' + _bsB("#16a34a", "💾 저장", "bsZoneSave()", "padding:9px 24px") + '</div>';
  openPopup('<div style="max-height:80vh;overflow:auto">' + h + '</div>', 460);
}
function _bsZoneRow(nm, cap){ return '<div class="bzRow" style="display:flex;gap:6px;margin-bottom:5px"><input class="bzN" value="' + esc(nm) + '" placeholder="구역 이름" style="flex:2;padding:6px;border:1px solid #cbd5e1;border-radius:5px"><input class="bzC" type="number" value="' + esc(cap) + '" placeholder="최대 두름" style="flex:1;padding:6px;border:1px solid #cbd5e1;border-radius:5px"><button class="btn" style="background:#dc2626;color:#fff" onclick="this.parentNode.remove()">✕</button></div>'; }
function bsZoneSave(){
  var z = Array.prototype.map.call(document.querySelectorAll(".bzRow"), function(r){ return { nm: r.querySelector(".bzN").value.trim(), cap: _bsN(r.querySelector(".bzC").value) }; }).filter(function(x){ return x.nm; });
  _bsRef("zones").set(z).then(function(){ BS.ALL[BS.cur].zones = z; closePopup(); toast("구역 저장했어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ── 새 시즌 ──
function bsNewSeason(){
  var ss = _bsSeasons(), last = ss[ss.length - 1], nx = String(last ? +last + 1 : new Date().getFullYear() + 1);
  var s = prompt("새 시즌 이름 (년도, 예: " + nx + ")\n" + (last ? last + " 시즌의 품목(품명·상자 kg)과 건조장 구역을 그대로 가져와요 — 발주·입고·작업은 비어서 시작" : ""), nx);
  if(s == null) return; s = s.trim();
  if(!/^\d{4}$/.test(s)) return toast("년도 4자리로 넣어 주세요 (예: " + nx + ")", true);
  if(ss.indexOf(s) >= 0) return toast(s + " 시즌은 이미 있어요", true);
  var P = last ? BS.ALL[last] : {}, items = {};
  Object.keys(P.items || {}).forEach(function(k){ items[k] = { nm: P.items[k].nm || "", kg: _bsN(P.items[k].kg) || 8.8, order: 0, real: "" }; });
  var v = { items: items, zones: P.zones && P.zones.length ? P.zones : BS_ZONES.map(function(a){ return { nm: a[0], cap: a[1] }; }), mkAt: new Date().toISOString(), mkBy: CID || "" };
  fbDb.ref("/main/Buse/" + s).set(v).then(function(){ BS.ALL[s] = v; bsSeason(s); toast(s + " 시즌을 만들었어요"); }).catch(function(e){ toast("만들기 실패: " + e.message, true); });
}

// ── 📥 엑셀 (작업순서표 · 현황 · 품목 · 구역) ──
async function bsExcel(){
  showLoading("엑셀 만드는 중...");
  var EJ; try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); toast(e.message, true); return; }
  var wb = new EJ.Workbook(), thin = { style: "thin" }, BOX = { top: thin, left: thin, bottom: thin, right: thin }, t = _bsToday();
  var sheet = function(nm, title, head, rows, widths, numCols){
    var ws = wb.addWorksheet(nm); ws.mergeCells(1, 1, 1, head.length); ws.getCell(1, 1).value = title; ws.getCell(1, 1).font = { size: 15, bold: true }; ws.getRow(1).height = 26;
    ws.getRow(2).values = head; ws.getRow(2).font = { bold: true }; ws.getRow(2).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    rows.forEach(function(r, i){ ws.getRow(3 + i).values = r; });
    ws.columns.forEach(function(c, i){ c.width = widths[i] || 10; });
    for(var r = 2; r < 3 + rows.length; r++) for(var c = 1; c <= head.length; c++){ var cl = ws.getCell(r, c); cl.border = BOX; if(r === 2) cl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCFFAFE" } }; if((numCols || []).indexOf(c) >= 0) cl.numFmt = "#,##0.##"; }
    ws.views = [{ state: "frozen", ySplit: 2 }];
    return ws;
  };
  var W = _bsWork();
  sheet("작업순서표", BS.cur + " 시즌 건조 작업 현황 (" + t + ")", ["해동일자", "건조일자", "품목", "상자kg", "품명", "수량", "두름수", "걷는일자", "걷는 순번", "건조기간", "D-Day", "작업라인(위치)", "비고"],
    W.map(function(r){ return [_bsMD(r.thaw), _bsMD(r.dry), _bsBase(r.item), _bsKg(r.item) || "", r.nm || "", _bsN(r.qty), r.doo, _bsMD(r.walk), r.seq, r.days, r.walk ? _bsDiff(r.walk, t) : "", r.loc || "", r.note || ""]; }), [15, 15, 10, 7, 12, 8, 9, 15, 8, 8, 7, 14, 20], [6, 7]);
  sheet("걷는순서", BS.cur + " 시즌 걷는 순번 순 (" + t + ")", ["걷는 순번", "걷는일자", "품목", "수량", "두름수", "해동일자", "건조일자", "건조기간", "작업라인(위치)"],
    W.slice().sort(function(a, b){ return a.seq - b.seq; }).map(function(r){ return [r.seq, r.walk, r.item, _bsN(r.qty), r.doo, r.thaw, r.dry, r.dur, r.loc || ""]; }), [8, 12, 10, 8, 9, 12, 12, 8, 14], [4, 5]);
  sheet("현황", BS.cur + " 시즌 원료 입출고 현황", ["일자", "품목", "가문 입고수량", "작업수량", "냉장고 재고수량", "부산 남은 재고수량", "내용"],
    _bsLedger().map(function(e){ return [e.dt, e.item, e.t === "in" ? e.qty : "", e.t === "work" ? e.qty : "", e.fridge, e.t === "in" ? e.busan : "", (e.t === "in" ? "입고 " : "해동 ") + (e.note || "")]; }), [12, 10, 12, 10, 13, 15, 30], [3, 4, 5, 6]);
  sheet("품목", BS.cur + " 시즌 품목별 현황", ["품목", "품명", "상자 kg", "마리당 g", "총 발주", "입고", "부산 남은", "작업", "작업 남은", "냉장고 재고", "실재고", "오차", "총 두름", "키로수"],
    _bsSummary().map(function(r){ return [r.k, r.nm, r.kg, Math.round(r.gram), r.order, r.inq, r.busan, r.work, r.left, r.fridge, r.real === "" || r.real == null ? "" : _bsN(r.real), r.diff == null ? "" : r.diff, r.doo, r.kgTot]; }), [10, 12, 8, 9, 9, 9, 10, 9, 9, 11, 9, 8, 10, 11], [5, 6, 7, 8, 9, 10, 13, 14]);
  sheet("구역", BS.cur + " 시즌 건조장 구역 (" + t + " 기준)", ["구역", "두름 가능 수", "오늘 걸린 두름"], _bsZones().map(function(z){ return [z.nm, _bsN(z.cap), _bsOcc(z.nm, t).doo]; }), [16, 14, 14], [2, 3]);
  var buf = await wb.xlsx.writeBuffer(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = BS.cur + "년 부세입출고작업현황표_" + t + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove(); hideLoading(); toast("엑셀 받았어요");
}

// ════════ 📊 구역별 기간표 — 구역마다 '널은 날 ~ 걷는 날' 막대 + 날마다 찬 정도 ════════
//   막대가 끝나는 날 = 자리가 비는 날 → 그 다음 작업을 거기 널 수 있는지 한눈에
var BS_GW = 24;   // 하루 칸 너비(px)
function _bsGantt(sel){
  var rows = _bsWork(), t = _bsToday(), zones = _bsZones(), can = _bsCan();
  var live = rows.filter(function(r){ return r.dry && r.walk; });
  if(!live.length) return "";
  var st = live.reduce(function(a, r){ return r.dry < a ? r.dry : a; }, live[0].dry), en = live.reduce(function(a, r){ return r.walk > a ? r.walk : a; }, live[0].walk);
  st = _bsAdd(st, -2); en = _bsAdd(en, 3);
  var N = _bsDiff(en, st) + 1, W = BS_GW, LW = 118, X = function(d){ return _bsDiff(d, st) * W; };
  var col = function(p){ return p > 1 ? "#dc2626" : p >= .7 ? "#f59e0b" : p > 0 ? "#86efac" : "#f1f5f9"; };
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;align-items:center"><b style="font-size:15px">📊 구역별 기간표 — 언제 널고, 언제 비나</b>';
  h += '<span class="mut" style="font-size:12px">막대 = 널은 날 ~ 걷는 날 (끝나는 날부터 자리가 빔) · 막대 위 칸 색 = 그 날 찬 정도' + (can ? ' · 막대를 누르면 고치기' : '') + '</span></div>';
  h += '<div id="bsGanttBox" style="overflow-x:auto;margin-top:8px;border:1px solid #e2e8f0;border-radius:8px"><div style="position:relative;width:' + (LW + N * W) + 'px">';
  // 날짜 머리
  h += '<div style="display:flex;position:sticky;top:0;background:#fff;z-index:3;border-bottom:1px solid #cbd5e1"><div style="width:' + LW + 'px;flex:none;position:sticky;left:0;background:#fff;z-index:4;font-size:11px;padding:3px 6px;font-weight:700">구역 / 날짜</div>';
  for(var i = 0; i < N; i++){ var d = _bsAdd(st, i), dd = +d.slice(8), wk = new Date(d + "T00:00:00").getDay();
    h += '<div style="width:' + W + 'px;flex:none;text-align:center;font-size:10px;line-height:1.25;padding:2px 0;' + (d === t ? "background:#dc2626;color:#fff;font-weight:800;" : d === sel ? "background:#0e7490;color:#fff;" : wk === 0 ? "color:#dc2626;font-weight:700;" : wk === 6 ? "color:#2563eb;font-weight:700;" : "") + '">' + (dd === 1 || i === 0 ? '<b>' + (+d.slice(5, 7)) + '월</b><br>' : '<br>') + dd + '<br>' + _bsWd(d) + '</div>'; }
  h += '</div>';
  zones.forEach(function(z){
    var zk = _bsZK(z.nm), cap = _bsN(z.cap), mine = live.filter(function(r){ return r.loc && _bsZK(r.loc) === zk; }).sort(function(a, b){ return a.dry.localeCompare(b.dry); });
    // 줄(레인) 나누기 — 겹치는 막대는 아래 줄로
    var lanes = []; mine.forEach(function(r){ for(var L = 0; L < lanes.length; L++){ if(lanes[L] <= r.dry){ lanes[L] = r.walk; r._ln = L; return; } } r._ln = lanes.length; lanes.push(r.walk); });
    var nl = Math.max(1, lanes.length), H = Math.max(64, 16 + nl * 22 + 4);
    // 지금 여유 · 다음 비는 날
    var oNow = _bsOcc(z.nm, t, null, rows).doo, nxt = mine.filter(function(r){ return r.walk > t && r.dry <= t; }).sort(function(a, b){ return a.walk.localeCompare(b.walk); })[0];
    h += '<div style="display:flex;border-bottom:1px solid #e2e8f0;position:relative;height:' + H + 'px">';
    h += '<div style="width:' + LW + 'px;flex:none;position:sticky;left:0;background:#f8fafc;z-index:2;padding:3px 6px;border-right:1px solid #cbd5e1;font-size:12px;line-height:1.35"><b>' + esc(z.nm) + '</b><div style="font-size:10.5px;color:#475569">최대 ' + _bsW(cap) + '</div><div style="font-size:10.5px;color:' + (cap - oNow > 0 ? "#16a34a" : "#dc2626") + '">오늘 여유 ' + _bsW(Math.max(0, cap - oNow)) + '</div>' + (nxt ? '<div style="font-size:10.5px;color:#0e7490">' + _bsMS(nxt.walk) + ' +' + _bsW(nxt.doo) + ' 빔</div>' : '') + '</div>';
    h += '<div style="position:relative;flex:none;width:' + (N * W) + 'px">';
    // 날마다 찬 정도 띠
    for(var i2 = 0; i2 < N; i2++){ var d2 = _bsAdd(st, i2), o = _bsOcc(z.nm, d2, null, rows).doo, p = cap ? o / cap : (o ? 2 : 0);
      h += '<div title="' + _bsMD(d2) + ' · ' + _bsW(o) + ' / ' + _bsW(cap) + '두름 · 여유 ' + _bsW(cap - o) + '" style="position:absolute;left:' + (i2 * W) + 'px;top:0;width:' + (W - 1) + 'px;height:12px;background:' + col(p) + '"></div>'; }
    // 오늘 선
    if(t >= st && t <= en) h += '<div style="position:absolute;left:' + (X(t) + W / 2) + 'px;top:0;bottom:0;border-left:2px dashed #dc2626;z-index:1"></div>';
    mine.forEach(function(r){ var s2 = _bsState(r, t), left = X(r.dry), w = Math.max(W, X(r.walk) - left);
      h += '<div' + (can ? ' onclick="bsWorkEdit(\'' + r.id + '\')"' : '') + ' title="' + esc(_bsLbl(r.item)) + ' ' + _bsW(r.qty) + '개 · ' + _bsW(r.doo) + '두름\n' + _bsMD(r.dry) + ' 널기 → ' + _bsMD(r.walk) + ' 걷기 (' + r.days + '일)" style="position:absolute;left:' + left + 'px;top:' + (15 + r._ln * 22) + 'px;width:' + (w - 2) + 'px;height:19px;background:' + s2[1] + ';color:#fff;border-radius:5px;font-size:11px;line-height:19px;padding:0 5px;overflow:hidden;white-space:nowrap;' + (can ? "cursor:pointer;" : "") + 'box-shadow:0 1px 2px rgba(0,0,0,.2)"><b>' + esc(_bsBase(r.item)) + '</b> ' + _bsW(r.doo) + ' · ' + _bsMS(r.dry) + '~' + _bsMS(r.walk) + '</div>'; });
    h += '</div></div>';
  });
  // 구역 목록에 없는 위치 · 보류
  var known = {}; zones.forEach(function(z){ known[_bsZK(z.nm)] = 1; });
  var other = live.filter(function(r){ !r.loc && 0; return !r.loc || !known[_bsZK(r.loc)]; }), hold = rows.filter(function(r){ return r.hold; });
  h += '</div></div>';
  if(other.length) h += '<div style="font-size:12px;margin-top:6px;color:#a16207">구역이 없거나 목록에 없는 위치: ' + other.map(function(r){ return esc(r.loc || "위치 없음") + ' ' + esc(_bsLbl(r.item)) + ' ' + _bsMS(r.dry) + '~' + _bsMS(r.walk); }).join(" · ") + '</div>';
  if(hold.length) h += '<div style="font-size:12px;margin-top:4px;color:#7c3aed">🧊 널기 보류(얼려 둠): ' + hold.map(function(r){ return esc(_bsLbl(r.item)) + ' ' + _bsW(r.qty) + '개' + (r.loc ? ' (' + esc(r.loc) + ')' : ''); }).join(" · ") + '</div>';
  h += '<div class="mut" style="font-size:11.5px;margin-top:6px">띠 색: <span style="color:#16a34a">■ 여유</span> <span style="color:#f59e0b">■ 70% 넘음</span> <span style="color:#dc2626">■ 넘침</span> · 막대 색: <span style="color:#a16207">예정</span> · <span style="color:#16a34a">건조 중</span> · <span style="color:#64748b">걷음</span> · 빨간 점선 = 오늘</div></div>';
  setTimeout(function(){ var b = document.getElementById("bsGanttBox"); if(b && t >= st) b.scrollLeft = Math.max(0, X(sel || t) - 220); }, 0);
  return h;
}

// ════════ 📝 발주 ════════
function _bsOrdBox(){
  var S = _bsS(), O = S.ord || {}, ids = Object.keys(O).sort(function(a, b){ return String(O[b].dt).localeCompare(String(O[a].dt)); }), can = _bsCan();
  var legacy = Object.keys(S.items || {}).filter(function(k){ return _bsN(S.items[k].order); });
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><b>📝 발주</b> <span class="mut" style="font-size:12px">몇 미를 몇 개 시켰는지 — 품목별 총 발주·부산 남은에 바로 반영</span>' + (can ? _bsB("#7c3aed", "+ 발주 넣기", "bsOrdEdit('')", "padding:8px 16px") : "") + '</div>';
  if(!ids.length && !legacy.length) return h + '<div class="mut" style="padding:12px;text-align:center">아직 발주가 없어요</div></div>';
  h += '<div style="overflow-x:auto;margin-top:8px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:520px"><thead><tr style="background:#f5f3ff"><th style="padding:6px;text-align:left">발주일</th><th style="text-align:left">품목</th><th style="text-align:left">품명</th><th style="text-align:right">발주 수량</th><th style="text-align:left">메모</th><th></th></tr></thead><tbody>';
  ids.forEach(function(id){ var o = O[id], it = (S.items || {})[o.item] || {};
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + _bsDH(o.dt || "") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(_bsLbl(o.item)) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + esc(it.nm || "") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right"><b>' + _bsW(o.qty) + '</b></td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + esc(o.note || "") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:center">' + (can ? _bsB("#2563eb", "수정", "bsOrdEdit('" + id + "')", "padding:3px 9px") : "") + '</td></tr>'; });
  legacy.forEach(function(k){ h += '<tr style="color:#64748b"><td style="padding:6px;border-bottom:1px solid #f1f5f9">(엑셀)</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(k) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + esc(S.items[k].nm || "") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(S.items[k].order) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px">엑셀에서 가져온 발주</td><td></td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function bsOrdEdit(id){
  var S = _bsS(), o = id ? S.ord[id] : { dt: _bsToday(), item: "", qty: "", note: "" }, it = (S.items || {})[o.item] || {};
  var items = _bsSummary().map(function(r){ return r.k; });
  var F = function(lb, k, v, typ, ex){ return '<label style="font-size:13px">' + lb + '<input id="bo_' + k + '" type="' + (typ || "text") + '" value="' + esc(v == null ? "" : v) + '" ' + (ex || "") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-size:14px"></label>'; };
  var h = '<h3 style="margin:0 0 10px">📝 ' + (id ? "발주 고치기" : "발주 넣기") + ' <span class="mut" style="font-size:12px">' + BS.cur + ' 시즌</span><button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += F("발주일", "dt", o.dt, "date") + F("미수 (예: 27미, 24미가문)", "item", o.item ? _bsBase(o.item) : "", "text", 'list="boItems" oninput="_bsOrdItem()"');
  h += F("상자 kg (같은 미수라도 kg 다르면 따로 셈)", "kg", o.item ? _bsKg(o.item) : "", "number", 'step="0.1" inputmode="decimal" oninput="_bsOrdItem()"') + F("발주 수량 (개)", "qty", o.qty, "number", 'inputmode="numeric"') + F("메모", "note", o.note);
  h += '</div><div id="boKey" style="margin-top:8px;font-size:13px"></div>';
  var bases = {}; items.forEach(function(k){ bases[_bsBase(k)] = 1; });
  h += '<datalist id="boItems">' + Object.keys(bases).map(function(k){ return '<option value="' + esc(k) + '">'; }).join("") + '</datalist>';
  h += '<div id="boNew" style="display:none;margin-top:10px;background:#f5f3ff;border-radius:8px;padding:8px 10px"><div style="font-size:12.5px;font-weight:700;color:#6d28d9;margin-bottom:6px">새 품목이에요 — 원료 품명도 넣어 두면 좋아요 (선택)</div>' + F("원료 품명", "nm", it.nm || "", "text", 'placeholder="마오가, 생마소오가..."') + '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "bsOrdDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "bsOrdSave('" + (id || "") + "')", "padding:9px 24px") + '</div>';
  openPopup(h, 520); _bsOrdItem();
}
function _bsOrdItem(){
  var i = document.getElementById("bo_item"), g = document.getElementById("bo_kg"), b = document.getElementById("boNew"), t = document.getElementById("boKey"); if(!i) return;
  var base = i.value.trim(), kg = _bsN(g && g.value);
  if(g && !g.value && base){ var ex = (_bsS().items || {})[base]; if(ex && ex.kg){ g.value = ex.kg; kg = _bsN(ex.kg); } }
  var key = base ? _bsItemKey(base, kg) : "", isNew = key && !(_bsS().items || {})[key];
  if(b) b.style.display = isNew ? "" : "none";
  if(t) t.innerHTML = key ? (isNew ? '🆕 새 품목 <b>' + esc(_bsBase(key)) + (kg ? ' · ' + kg + 'kg' : '') + '</b> 로 따로 세요' : '→ <b>' + esc(_bsLbl(key)) + '</b> 에 더해요') : '';
}
function bsOrdSave(id){
  var g = function(k){ var e = document.getElementById("bo_" + k); return e ? e.value.trim() : ""; }, kg = _bsN(g("kg"));
  var v = { dt: g("dt"), item: g("item") ? _bsItemKey(g("item"), kg) : "", qty: _bsN(g("qty")), note: g("note") };
  if(!v.dt || !v.item || !v.qty) return toast("발주일·미수·수량을 넣어 주세요", true);
  if(!kg) return toast("상자 kg 을 넣어 주세요 (같은 미수라도 kg 따라 따로 세요)", true);
  if(!_bsMi(v.item)) return toast("품목은 숫자(미수)로 시작해야 해요 (예: 27미)", true);
  if(/[.#$\[\]\/]/.test(v.item)) return toast("품목 이름에 . # $ [ ] / 는 못 써요", true);
  var S = BS.ALL[BS.cur], key = id || _bsRef("ord").push().key, up = {}, newItem = !(S.items || {})[v.item];
  up["ord/" + key] = v; if(newItem) up["items/" + v.item] = { nm: g("nm"), kg: kg, order: 0, real: "" };
  _bsRef().update(up).then(function(){ S.ord = S.ord || {}; S.ord[key] = v; if(newItem){ S.items = S.items || {}; S.items[v.item] = up["items/" + v.item]; } closePopup(); toast("발주 저장했어요 — " + _bsBase(v.item) + " · " + kg + "kg " + _bsW(v.qty) + "개"); _bsPubSync(); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function bsOrdDel(id){ var o = _bsS().ord[id]; if(!confirm(o.dt + " " + o.item + " " + _bsW(o.qty) + "개 발주를 지울까요?")) return; _bsRef("ord/" + id).remove().then(function(){ delete BS.ALL[BS.cur].ord[id]; closePopup(); toast("지웠어요"); draw(); }); }

// ════════ 📨 부산 입고 양식 (로그인 없이 링크로) ════════
var BS_PUB = null, BS_PUB_S = "";
function _bsPubUrl(){ try { return location.href.split("?")[0].split("#")[0].replace(/[^\/]*$/, "") + "buse-in.html"; } catch(e){ return "buse-in.html"; } }
// 양식에 보여 줄 시즌·품목 목록 (누구나 읽는 칸)
function _bsPubSync(){
  if(!_bsCan() || !BS.cur || typeof fbDb === "undefined") return;
  var cfg = { season: BS.cur, items: _bsSummary().map(function(r){ return { k: r.k, nm: r.nm, kg: r.kg }; }), at: new Date().toISOString() };
  fbDb.ref("/busePubCfg").set(cfg).catch(function(){});
}
function _bsPubLoad(){
  if(BS_PUB_S === BS.cur || typeof fbDb === "undefined") return; BS_PUB_S = BS.cur;
  fbDb.ref("/busePub/" + BS.cur).once("value").then(function(s){ BS_PUB = s.val() || {}; if(CTAB === "bsStock") draw(); }).catch(function(){ BS_PUB = {}; });
  _bsPubSync();
}
function _bsPubBox(){
  _bsPubLoad(); if(!BS_PUB) return "";
  var ids = Object.keys(BS_PUB).filter(function(k){ return !BS_PUB[k].done; }).sort(function(a, b){ return String(BS_PUB[a].at).localeCompare(String(BS_PUB[b].at)); });
  if(!ids.length) return "";
  var can = _bsCan(), h = '<div class="card" style="margin-bottom:10px;border:2px solid #7c3aed;background:#faf5ff"><div style="font-weight:800;color:#6d28d9;margin-bottom:6px">📨 부산에서 보낸 입고 ' + ids.length + '건 — 실제 들어온 수량을 확인하고 넣어 주세요</div>';
  ids.forEach(function(k){ var x = BS_PUB[k];
    h += '<div style="background:#fff;border:1px solid #ddd6fe;border-radius:8px;padding:8px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-size:13px"><b>' + _bsDH(x.dt) + '</b> · ' + esc(x.from || "") + (x.car ? ' · 🚚 ' + esc(x.car) : '') + '<div>' + (x.lines || []).map(function(l){ return '<b>' + esc(_bsLbl(l.item)) + '</b> ' + _bsW(l.qty) + '개'; }).join(" · ") + '</div>' + (x.memo ? '<div class="mut" style="font-size:12px">' + esc(x.memo) + '</div>' : '') + '</div>';
    h += '<div style="display:flex;gap:4px">' + (x.photo ? _bsB("#475569", "📷 사진", "bsPubPhoto('" + k + "')") : "") + (can ? _bsB("#16a34a", "✅ 확인하고 입고", "bsPubOk('" + k + "')") + _bsB("#dc2626", "✕", "bsPubDel('" + k + "')") : "") + '</div></div>'; });
  return h + '</div>';
}
function bsPubPhoto(k){ openPopup('<div style="text-align:right"><button class="btn" style="background:#475569" onclick="closePopup()">닫기</button></div><img src="' + BS_PUB[k].photo + '" style="max-width:100%;max-height:75vh;display:block;margin:8px auto">', 720); }
function bsPubOk(k){
  var x = BS_PUB[k], h = '<h3 style="margin:0 0 6px">✅ 입고 확인 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="font-size:13px;margin-bottom:8px">' + _bsDH(x.dt) + ' · ' + esc(x.from || "") + (x.car ? ' · 🚚 ' + esc(x.car) : '') + '</div>';
  h += '<label style="font-size:13px">입고일 <input id="bp_dt" type="date" value="' + esc(x.dt) + '" style="padding:6px;border:1px solid #cbd5e1;border-radius:6px"></label><table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px"><tr style="background:#f5f3ff"><th style="padding:6px;text-align:left">품목</th><th style="text-align:right">부산이 보낸 수량</th><th style="text-align:right">실제 받은 수량</th></tr>';
  (x.lines || []).forEach(function(l, i){ h += '<tr><td style="padding:6px"><input class="bpI" value="' + esc(l.item) + '" list="bpItems" style="width:110px;padding:5px;border:1px solid #cbd5e1;border-radius:5px;font-weight:700"></td><td style="text-align:right">' + _bsW(l.qty) + '</td><td style="text-align:right"><input class="bpQ" data-sent="' + _bsN(l.qty) + '" type="number" value="' + _bsN(l.qty) + '" style="width:100px;padding:5px;border:1px solid #cbd5e1;border-radius:5px;text-align:right"></td></tr>'; });
  h += '</table><datalist id="bpItems">' + _bsSummary().map(function(r){ return '<option value="' + esc(r.k) + '">' + esc(_bsLbl(r.k)) + '</option>'; }).join("") + '</datalist><div class="mut" style="font-size:12px;margin-top:6px">실제로 센 수량이 다르면 고쳐서 넣으세요 (차이는 비고에 남아요)</div>';
  h += '<div style="text-align:right;margin-top:12px">' + _bsB("#16a34a", "💾 입고로 넣기", "bsPubSave('" + k + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 520);
}
function bsPubSave(k){
  var x = BS_PUB[k], dt = document.getElementById("bp_dt").value || x.dt, S = BS.ALL[BS.cur], up = {}, made = [], diffs = [];
  var I = document.querySelectorAll(".bpI"), Q = document.querySelectorAll(".bpQ");
  for(var i = 0; i < Q.length; i++){
    var item = I[i].value.trim(), q = _bsN(Q[i].value), sent = _bsN(Q[i].getAttribute("data-sent")); if(!item || !q) continue;
    if(/[.#$\[\]\/]/.test(item)) return toast("품목 이름에 . # $ [ ] / 는 못 써요", true);
    var key = _bsRef("inb").push().key, note = "부산 신고 " + (x.from || "") + (x.car ? " · " + x.car : "") + (q !== sent ? " · 보낸 " + _bsW(sent) + " → 받은 " + _bsW(q) : "");
    if(q !== sent) diffs.push(item + " " + _bsW(q - sent));
    up["inb/" + key] = { dt: dt, item: item, qty: q, note: note.trim(), pub: k }; made.push(key);
    if(!(S.items || {})[item] && !up["items/" + item]) up["items/" + item] = { nm: "", kg: 8.8, order: 0, real: "" };
  }
  if(!made.length) return toast("넣을 수량이 없어요", true);
  showLoading("저장 중...");
  _bsRef().update(up).then(function(){
    return fbDb.ref("/busePub/" + BS.cur + "/" + k).update({ done: true, doneAt: new Date().toISOString(), doneBy: CID || "", inb: made.join(",") });
  }).then(function(){
    hideLoading(); S.inb = S.inb || {}; S.items = S.items || {};
    Object.keys(up).forEach(function(p){ var a = p.split("/"); S[a[0]][a[1]] = up[p]; });
    x.done = true; closePopup(); toast("입고 " + made.length + "줄 넣었어요" + (diffs.length ? " · 차이: " + diffs.join(", ") : "")); draw();
  }).catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
function bsPubDel(k){ if(!confirm("이 신고를 지울까요? (입고로 안 넣고 버림)")) return; fbDb.ref("/busePub/" + BS.cur + "/" + k).remove().then(function(){ delete BS_PUB[k]; toast("지웠어요"); draw(); }); }
function bsPubLink(){
  _bsPubSync();
  var u = _bsPubUrl(), qr = "";
  try { if(typeof qrcode === "function"){ var q = qrcode(0, "M"); q.addData(u); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 2 }); } } catch(e){}
  var h = '<h3 style="margin:0 0 6px">📨 부산 입고 양식 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="font-size:13px;color:#475569;margin-bottom:10px">부산(보내는 쪽)에서 <b>로그인 없이</b> 이 링크로 열어 보낸 날짜·품목·수량을 적어요. 들어온 신고는 <b>원료 입고·재고</b> 위에 뜨고, 직원이 실제 받은 수량을 확인해서 넣어요.</div>';
  h += '<div style="text-align:center">' + (qr || '<div class="mut">QR 을 못 만들었어요 (인터넷 확인)</div>') + '</div><div style="background:#f1f5f9;border-radius:6px;padding:8px;font-size:12.5px;word-break:break-all;margin-top:8px">' + esc(u) + '</div>';
  h += '<div style="display:flex;gap:6px;justify-content:center;margin-top:10px">' + _bsB("#2563eb", "📋 링크 복사", "navigator.clipboard&&navigator.clipboard.writeText('" + esc(u) + "').then(function(){toast('복사했어요')})") + _bsB("#0e7490", "🔗 열어 보기", "window.open('" + esc(u) + "','_blank')") + '</div><div class="mut" style="font-size:11.5px;margin-top:8px;text-align:center">양식에는 지금 시즌(' + BS.cur + ') 품목 목록만 보여요. 보낸 사람은 기록을 볼 수도 고칠 수도 없어요(보내기만).</div>';
  openPopup(h, 460);
}
