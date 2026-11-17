// ============================================================================
// 🪢 엮거리 작업 — 엑셀 '엮거리작업현황'을 웹으로: 원료 → 이모들이 품명별 두름 엮기 → 박스·라벨 · 원가·마진율 · 이모 정산(미수)
//   /main/Yk = { set:{rate{굴비,부세}(두름당), string{price,per}(끈 다발값·다발당 두름), salt{pct,price}, freeze{mode,val}, pack{val}(박스당), misc{mode,val}, lblPer(박스당 라벨 장수)},
//               items:{정품}, mats:{원료}, people:{이모:{on}}, works:{id:작업}, pays:{id:{dt,w,amt,note}} }
//   작업 = { dt, mats:[{nm,qty(짝),price(짝당)}], ws:[이모 이름], rows:[{item,kind(굴비|부세),c:{이름:두름}}], actual(실제 마리수), labor(우리 인건비 금액), misc(잡비 직접), origin, boxMat, note }
//   로트 = 년도 앞자리 + 월 + 일(십·일 자리 1~9 → A~I, 0 → 0) + 년도 끝자리  (엑셀과 같음: 2022-10-10 → 210A02)
//   buse.js 도우미(_bsN·_bsW·_bsDH·_bsMD·_bsToday·_bsB·_bsCan) 같이 씀
// ============================================================================
var YK = { D: null, loading: false, cur: "", ed: null, ym: "" };
var YK_DEF = { rate: { 굴비: 600, 부세: 700 }, string: { price: 0, per: 0 }, salt: { pct: 7, price: 0 }, freeze: { mode: "kg", val: 0 }, pack: { val: 0 }, misc: { mode: "amt", val: 0 }, lblPer: 3 };
function _ykS(){ return YK.D || {}; }
function _ykSet(){ var s = _ykS().set || {}, o = JSON.parse(JSON.stringify(YK_DEF)); Object.keys(s).forEach(function(k){ o[k] = typeof s[k] === "object" && s[k] ? Object.assign({}, o[k], s[k]) : s[k]; }); return o; }
function _ykRef(p){ return fbDb.ref("/main/Yk" + (p ? "/" + p : "")); }
function _ykKey(s){ return String(s || "").trim().replace(/[.#$\[\]\/]/g, "_"); }
function _ykCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _ykWon(n){ return Math.round(_bsN(n)).toLocaleString("ko-KR"); }
function _ykLoad(){
  if(YK.loading) return; YK.loading = true;
  fbDb.ref("/main/Yk").once("value").then(function(s){ YK.loading = false; YK.D = s.val() || {}; if(/^yk/.test(CTAB)) draw(); })
    .catch(function(e){ YK.loading = false; toast("엮거리 불러오기 실패: " + e.message, true); });
}
function _ykGate(){ if(!YK.D){ _ykLoad(); return '<div class="card"><div class="mut">📡 엮거리 작업 불러오는 중...</div></div>'; } return ""; }
function _ykLot(dt){
  if(!dt) return ""; var y = dt.slice(2, 4), m = dt.slice(5, 7), d = dt.slice(8, 10), L = function(ch){ return ch === "0" ? "0" : String.fromCharCode(64 + (+ch)); };
  return y[0] + m + L(d[0]) + L(d[1]) + y[1];
}
function _ykItem(nm){ var I = _ykS().items || {}; return I[_ykKey(nm)] || null; }
function _ykMat(nm){ var M = _ykS().mats || {}; return M[_ykKey(nm)] || null; }
function _ykKindOf(w){ return (w.mats || []).some(function(m){ return /부세/.test(m.nm); }) ? "부세" : "굴비"; }

// ── 계산 ──
function _ykCalc(w){
  var st = _ykSet(), o = { matMi: 0, matKg: 0, matCost: 0, rows: [], doo: 0, mi: 0, boxes: 0, workers: {}, weave: 0 };
  (w.mats || []).forEach(function(m){ var M = _ykMat(m.nm) || {}, q = _bsN(m.qty); o.matMi += q * _bsN(M.mi); o.matKg += q * _bsN(M.kg); o.matCost += q * (m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price)); });
  (w.ws || []).forEach(function(n){ o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }; });
  (w.rows || []).forEach(function(r){
    var I = _ykItem(r.item) || {}, doo = 0, kind = r.kind || "굴비";
    Object.keys(r.c || {}).forEach(function(n){ var v = _bsN(r.c[n]); if(!v) return; doo += v; var W = o.workers[n] || (o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }); W[kind] += v; W.amt += v * _bsN(st.rate[kind]); });
    var box = _bsN(I.box), mi = doo * _bsN(I.mi || 20);
    var x = { item: r.item, kind: kind, doo: doo, mi: mi, box: box, boxes: box ? Math.floor(doo / box) : 0, rest: box ? doo % box : doo, I: I };
    o.rows.push(x); o.doo += doo; o.mi += mi; o.boxes += x.boxes;
  });
  Object.keys(o.workers).forEach(function(n){ o.weave += o.workers[n].amt; });
  o.actual = w.actual !== "" && w.actual != null ? _bsN(w.actual) : o.mi;
  o.diff = o.actual - o.matMi;
  o.saltKg = o.matKg * _bsN(st.salt.pct) / 100;
  var c = { mat: o.matCost, weave: o.weave, labor: _bsN(w.labor), string: _bsN(st.string.per) ? o.doo * _bsN(st.string.price) / _bsN(st.string.per) : 0, salt: o.saltKg * _bsN(st.salt.price),
    freeze: st.freeze.mode === "kg" ? o.matKg * _bsN(st.freeze.val) : st.freeze.mode === "box" ? o.boxes * _bsN(st.freeze.val) : st.freeze.mode === "doo" ? o.doo * _bsN(st.freeze.val) : _bsN(st.freeze.val),
    pack: o.boxes * _bsN(st.pack.val) };
  var sub = Object.keys(c).reduce(function(s, k){ return s + c[k]; }, 0);
  c.misc = w.misc !== "" && w.misc != null ? _bsN(w.misc) : st.misc.mode === "pct" ? sub * _bsN(st.misc.val) / 100 : _bsN(st.misc.val);
  o.cost = c; o.total = sub + c.misc;
  o.rev = { sale: 0, whole: 0, cost: 0 };
  o.rows.forEach(function(x){ ["sale", "whole", "cost"].forEach(function(k){ x[k] = x.doo * _bsN(x.I[k]); o.rev[k] += x[k]; }); x.alloc = o.mi ? o.total * x.mi / o.mi : 0; x.unit = x.doo ? x.alloc / x.doo : 0; });
  return o;
}
function _ykPayInfo(){
  var S = _ykS(), m = {};
  Object.keys(S.works || {}).forEach(function(id){ var w = S.works[id], c = _ykCalc(w); Object.keys(c.workers).forEach(function(n){ var x = m[n] || (m[n] = { 굴비: 0, 부세: 0, earn: 0, paid: 0, last: "" }); x.굴비 += c.workers[n].굴비; x.부세 += c.workers[n].부세; x.earn += c.workers[n].amt; if(c.workers[n].amt && w.dt > x.last) x.last = w.dt; }); });
  Object.keys(S.pays || {}).forEach(function(id){ var p = S.pays[id], x = m[p.w] || (m[p.w] = { 굴비: 0, 부세: 0, earn: 0, paid: 0, last: "" }); x.paid += _bsN(p.amt); });
  Object.keys(m).forEach(function(n){ m[n].due = m[n].earn - m[n].paid; });
  return m;
}
function _ykHead(t, sub, btns){ return '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><strong style="font-size:18px">' + t + '</strong> <span class="mut" style="font-size:12px;margin-left:6px">' + sub + '</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">' + (btns || "") + '</div></div></div>'; }

// ════════ 🪢 작업 목록 ════════
function dYkWork(){
  var g = _ykGate(); if(g) return g;
  if(YK.ed) return _ykEditor();
  var S = _ykS(), W = S.works || {}, ids = Object.keys(W).sort(function(a, b){ return String(W[b].dt).localeCompare(String(W[a].dt)); }), can = _ykCan();
  var yms = {}; ids.forEach(function(k){ yms[String(W[k].dt).slice(0, 7)] = 1; });
  var list = ids.filter(function(k){ return !YK.ym || String(W[k].dt).slice(0, 7) === YK.ym; });
  var h = _ykHead("🪢 엮거리 작업", "원료 → 이모들 두름 → 박스·라벨 · 원가·마진율", can ? _bsB("#b45309", "+ 새 작업", "ykNew()", "padding:9px 18px") : "");
  if(!Object.keys(S.items || {}).length) h += '<div class="card" style="margin-bottom:10px;background:#fef3c7;color:#92400e;font-size:13px">⚠️ <b>⚙️ 엮거리 설정</b>에서 정품(품명·박스당 두름·가격)과 원료(짝당 마리수·무게)를 먼저 넣어 주세요.</div>';
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>보기</b><select onchange="YK.ym=this.value;draw()" style="width:auto;padding:6px;border:1px solid #cbd5e1;border-radius:6px"><option value="">전체 기간</option>' + Object.keys(yms).sort().reverse().map(function(y){ return '<option value="' + y + '"' + (YK.ym === y ? " selected" : "") + '>' + y.replace("-", "년 ") + '월</option>'; }).join("") + '</select><span class="mut" style="font-size:12px">' + list.length + '건</span></div>';
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px"><thead><tr style="background:#fff7ed">';
  ["작업일", "로트", "원료", "두름", "박스", "이모", "엮거리 값", "총원가", "마진율 (도매가)", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;text-align:' + (i >= 3 && i <= 8 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!list.length) h += '<tr><td colspan="10" style="padding:30px;text-align:center;color:#94a3b8">작업이 없어요' + (can ? ' — <b>+ 새 작업</b>' : '') + '</td></tr>';
  list.forEach(function(k){ var w = W[k], c = _ykCalc(w), mr = c.rev.whole ? (c.rev.whole - c.total) / c.rev.whole : null;
    h += '<tr style="cursor:pointer" onclick="ykOpen(\'' + k + '\')" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'"><td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsDH(w.dt) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(_ykLot(w.dt)) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' + (w.mats || []).map(function(m){ return esc(m.nm) + ' ' + _bsW(m.qty) + '짝'; }).join(", ") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800">' + _bsW(c.doo) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(c.boxes) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + (w.ws || []).length + '명</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(c.weave) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(c.total) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;color:' + (mr == null ? "#94a3b8" : mr < 0 ? "#dc2626" : "#16a34a") + '">' + (mr == null ? '-' : Math.round(mr * 1000) / 10 + '%') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + _bsB("#b45309", "열기", "event.stopPropagation();ykOpen('" + k + "')", "padding:3px 10px") + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function ykNew(){
  var S = _ykS(), W = S.works || {}, last = Object.keys(W).sort(function(a, b){ return String(W[b].dt).localeCompare(String(W[a].dt)); })[0], lw = last ? W[last] : null;
  var people = Object.keys(S.people || {}).filter(function(n){ return S.people[n].on !== false; });
  YK.ed = { id: "", w: { dt: _bsToday(), mats: [{ nm: "", qty: "", price: "" }], ws: lw ? (lw.ws || []).slice() : people.slice(0, 8), rows: [{ item: "", kind: "굴비", c: {} }], actual: "", labor: "", misc: "", origin: "국산", boxMat: "", note: "" } };
  draw();
}
function ykOpen(id){ YK.ed = { id: id, w: JSON.parse(JSON.stringify(_ykS().works[id])) }; YK.ed.w.mats = YK.ed.w.mats || []; YK.ed.w.ws = YK.ed.w.ws || []; YK.ed.w.rows = YK.ed.w.rows || []; draw(); }

// ── 작업 편집 화면 ──
function _ykIn(v, on, ex){ return '<input value="' + esc(v == null ? "" : v) + '" oninput="' + on + '" ' + (ex || "") + ' style="width:100%;padding:5px 6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box">'; }
function _ykEditor(){
  var E = YK.ed, w = E.w, S = _ykS(), can = _ykCan(), items = Object.keys(S.items || {}).map(function(k){ return S.items[k].nm; }), mats = Object.keys(S.mats || {}).map(function(k){ return S.mats[k].nm; });
  var people = Object.keys(S.people || {}).filter(function(n){ return S.people[n].on !== false && w.ws.indexOf(n) < 0; });
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div>' + _bsB("#475569", "← 목록", "if(confirm('저장 안 한 내용은 사라져요. 목록으로 갈까요?')){YK.ed=null;draw()}") + ' <strong style="font-size:17px;margin-left:6px">🪢 ' + (E.id ? "엮거리 작업" : "새 엮거리 작업") + '</strong> <span style="font-size:15px;font-weight:900;color:#b45309;margin-left:6px" id="ykLot">' + esc(_ykLot(w.dt)) + '</span></div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">' + _bsB("#0e7490", "🖨 전표", "ykPrintSlip()") + _bsB("#7c3aed", "🏷 라벨", "ykPrintLabel()") + _bsB("#475569", "🖨 작업현황표", "ykPrintSheet()") + _bsB("#475569", "🖨 생산작업일지", "ykPrintProd()") + (can ? _bsB("#16a34a", "💾 저장", "ykSave()", "padding:8px 20px") : "") + '</div></div></div>';
  // 기본 · 원료
  h += '<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:13px">';
  h += '<label>작업일<input type="date" value="' + esc(w.dt) + '" onchange="YK.ed.w.dt=this.value;document.getElementById(\'ykLot\').textContent=_ykLot(this.value);_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>원산지' + _ykIn(w.origin, "YK.ed.w.origin=this.value") + '</label><label>상자 재질' + _ykIn(w.boxMat, "YK.ed.w.boxMat=this.value", 'placeholder="박스/스티로폼/팩"') + '</label><label>비고' + _ykIn(w.note, "YK.ed.w.note=this.value") + '</label></div>';
  h += '<div style="font-weight:800;margin:10px 0 4px">🐟 원료 <span class="mut" style="font-weight:400;font-size:12px">— 짝 수와 짝당 가격 (비우면 설정의 원료값)</span></div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f8fafc"><th style="text-align:left;padding:4px">원료명</th><th style="width:90px">짝 수</th><th style="width:130px">짝당 가격</th><th style="width:90px;text-align:right">마리수</th><th style="width:90px;text-align:right">kg</th><th style="width:120px;text-align:right">원료 금액</th><th style="width:36px"></th></tr>';
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {};
    h += '<tr><td style="padding:3px">' + _ykIn(m.nm, "YK.ed.w.mats[" + i + "].nm=this.value;_ykRecalc()", 'list="ykMats" placeholder="예: 부세30미"') + '</td><td style="padding:3px">' + _ykIn(m.qty, "YK.ed.w.mats[" + i + "].qty=this.value;_ykRecalc()", 'type="number" step="any"') + '</td><td style="padding:3px">' + _ykIn(m.price, "YK.ed.w.mats[" + i + "].price=this.value;_ykRecalc()", 'type="number" placeholder="' + (M.price ? _ykWon(M.price) : "짝당") + '"') + '</td>';
    h += '<td id="ykMm' + i + '" style="text-align:right;padding:3px"></td><td id="ykMk' + i + '" style="text-align:right;padding:3px"></td><td id="ykMc' + i + '" style="text-align:right;padding:3px;font-weight:700"></td><td><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="YK.ed.w.mats.splice(' + i + ',1);draw()">✕</button></td></tr>'; });
  h += '</table>' + _bsB("#b45309", "+ 원료 줄", "YK.ed.w.mats.push({nm:'',qty:'',price:''});draw()", "padding:4px 10px;margin-top:4px") + '</div>';
  h += '<datalist id="ykMats">' + mats.map(function(n){ return '<option value="' + esc(n) + '">'; }).join("") + '</datalist><datalist id="ykItems">' + items.map(function(n){ return '<option value="' + esc(n) + '">'; }).join("") + '</datalist>';
  // 이모 × 품명 표
  h += '<div class="card" style="margin-bottom:10px;padding:10px 0 0"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:0 12px 8px"><b>👵 이모들 × 품명 (두름)</b><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><input id="ykAddW" list="ykPeople" placeholder="이모 이름" style="width:110px;padding:5px;border:1px solid #cbd5e1;border-radius:5px">' + _bsB("#0e7490", "+ 이모", "ykAddWorker()", "padding:5px 10px") + '<datalist id="ykPeople">' + people.map(function(n){ return '<option value="' + esc(n) + '">'; }).join("") + '</datalist></div></div>';
  h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:100%"><thead><tr style="background:#fff7ed"><th style="padding:5px;text-align:left;min-width:120px;position:sticky;left:0;background:#fff7ed;z-index:1">품명</th><th style="padding:5px">굴비/부세</th>';
  w.ws.forEach(function(n, j){ h += '<th style="padding:5px;min-width:70px;white-space:nowrap">' + esc(n) + ' <a href="javascript:void 0" onclick="ykDelWorker(' + j + ')" style="color:#dc2626;text-decoration:none">✕</a></th>'; });
  h += '<th style="padding:5px;background:#fde68a">합계</th><th style="padding:5px">마리수</th><th style="padding:5px">박스</th><th style="padding:5px">잔량</th><th></th></tr></thead><tbody>';
  w.rows.forEach(function(r, i){
    h += '<tr><td style="padding:3px;position:sticky;left:0;background:#fff;z-index:1">' + _ykIn(r.item, "YK.ed.w.rows[" + i + "].item=this.value;_ykRecalc()", 'list="ykItems" placeholder="품명"') + '</td>';
    h += '<td style="padding:3px;text-align:center"><button class="btn" style="background:' + (r.kind === "부세" ? "#0e7490" : "#b45309") + ';color:#fff;padding:3px 9px;min-width:46px" onclick="YK.ed.w.rows[' + i + '].kind=(YK.ed.w.rows[' + i + '].kind===\'부세\'?\'굴비\':\'부세\');draw()">' + (r.kind || "굴비") + '</button></td>';
    w.ws.forEach(function(n, j){ h += '<td style="padding:3px"><input type="number" inputmode="numeric" value="' + esc((r.c || {})[n] || "") + '" oninput="_ykCell(' + i + ',' + j + ',this.value)" style="width:64px;padding:5px;border:1px solid #cbd5e1;border-radius:5px;text-align:right"></td>'; });
    h += '<td id="ykRd' + i + '" style="padding:3px 6px;text-align:right;font-weight:900;background:#fef9c3"></td><td id="ykRm' + i + '" style="padding:3px 6px;text-align:right"></td><td id="ykRb' + i + '" style="padding:3px 6px;text-align:right;font-weight:800"></td><td id="ykRr' + i + '" style="padding:3px 6px;text-align:right"></td><td><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="YK.ed.w.rows.splice(' + i + ',1);draw()">✕</button></td></tr>'; });
  h += '</tbody><tfoot><tr style="background:#f1f5f9"><td style="padding:5px;font-weight:800;position:sticky;left:0;background:#f1f5f9">이모별 두름</td><td></td>';
  w.ws.forEach(function(n, j){ h += '<td id="ykWd' + j + '" style="padding:4px;text-align:center;font-size:12px;line-height:1.4"></td>'; });
  h += '<td id="ykTd" style="padding:4px 6px;text-align:right;font-weight:900;background:#fde68a"></td><td id="ykTm" style="padding:4px 6px;text-align:right;font-weight:800"></td><td id="ykTb" style="padding:4px 6px;text-align:right;font-weight:900"></td><td></td><td></td></tr><tr style="background:#fff7ed"><td style="padding:5px;font-weight:800;position:sticky;left:0;background:#fff7ed">이모별 금액</td><td></td>';
  w.ws.forEach(function(n, j){ h += '<td id="ykWa' + j + '" style="padding:4px;text-align:center;font-weight:800;color:#b45309"></td>'; });
  h += '<td id="ykTa" style="padding:4px 6px;text-align:right;font-weight:900;color:#b45309"></td><td colspan="4"></td></tr></tfoot></table></div><div style="padding:8px 12px">' + _bsB("#b45309", "+ 품명 줄", "YK.ed.w.rows.push({item:'',kind:_ykKindOf(YK.ed.w),c:{}});draw()", "padding:4px 10px") + ' <span class="mut" style="font-size:12px">굴비/부세 버튼을 누르면 바뀌어요 — 엮거리 단가가 달라요</span></div></div>';
  // 마리수 · 원가
  h += '<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-size:13px"><label>실제 마리수 <span class="mut" style="font-size:11px">(비우면 작업 마리수)</span><input type="number" value="' + esc(w.actual) + '" oninput="YK.ed.w.actual=this.value;_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>우리 인건비 (원)<input type="number" value="' + esc(w.labor) + '" oninput="YK.ed.w.labor=this.value;_ykRecalc()" placeholder="예: 300000" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>잡비 (원) <span class="mut" style="font-size:11px">(비우면 설정대로)</span><input type="number" value="' + esc(w.misc) + '" oninput="YK.ed.w.misc=this.value;_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label></div>';
  h += '<div id="ykCalc" style="margin-top:10px"></div></div>';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:20px">' + (E.id && can ? _bsB("#dc2626", "🗑 이 작업 삭제", "ykDel()") : "<span></span>") + (can ? _bsB("#16a34a", "💾 저장", "ykSave()", "padding:10px 26px;font-size:14px") : "") + '</div>';
  setTimeout(_ykRecalc, 0);
  return h;
}
function _ykCell(i, j, v){ var r = YK.ed.w.rows[i], n = YK.ed.w.ws[j]; r.c = r.c || {}; if(v === "" || !_bsN(v)) delete r.c[n]; else r.c[n] = _bsN(v); _ykRecalc(); }
function ykAddWorker(){ var el = document.getElementById("ykAddW"), n = (el.value || "").trim(); if(!n) return toast("이모 이름을 적어 주세요", true); if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if(YK.ed.w.ws.indexOf(n) >= 0) return toast("이미 있어요", true); YK.ed.w.ws.push(n); draw(); }
function ykDelWorker(j){ var n = YK.ed.w.ws[j], has = YK.ed.w.rows.some(function(r){ return (r.c || {})[n]; }); if(has && !confirm(n + " 칸에 적은 두름이 있어요. 빼면 같이 지워져요. 뺄까요?")) return; YK.ed.w.ws.splice(j, 1); YK.ed.w.rows.forEach(function(r){ if(r.c) delete r.c[n]; }); draw(); }
function _ykRecalc(){
  if(!YK.ed) return; var w = YK.ed.w, c = _ykCalc(w), $ = function(id){ return document.getElementById(id); }, T = function(id, v){ var e = $(id); if(e) e.innerHTML = v; };
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {}, q = _bsN(m.qty); T("ykMm" + i, M.mi ? _bsW(q * M.mi) : (m.nm ? '<span style="color:#dc2626;font-size:11px">원료 목록에 없음</span>' : "")); T("ykMk" + i, M.kg ? _bsW(q * M.kg) : ""); T("ykMc" + i, _ykWon(q * (m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price)))); });
  c.rows.forEach(function(x, i){ T("ykRd" + i, x.doo ? _bsW(x.doo) : ""); T("ykRm" + i, x.mi ? _bsW(x.mi) : ""); T("ykRb" + i, x.box ? _bsW(x.boxes) : (x.item ? '<span style="color:#dc2626;font-size:11px">정품 없음</span>' : "")); T("ykRr" + i, x.box ? _bsW(x.rest) : ""); });
  w.ws.forEach(function(n, j){ var W = c.workers[n] || { 굴비: 0, 부세: 0, amt: 0 }; T("ykWd" + j, (W.굴비 ? '<span style="color:#b45309">굴비 ' + _bsW(W.굴비) + '</span><br>' : '') + (W.부세 ? '<span style="color:#0e7490">부세 ' + _bsW(W.부세) + '</span>' : '') || '-'); T("ykWa" + j, W.amt ? _ykWon(W.amt) : '-'); });
  T("ykTd", _bsW(c.doo)); T("ykTm", _bsW(c.mi)); T("ykTb", _bsW(c.boxes)); T("ykTa", _ykWon(c.weave));
  var el = $("ykCalc"); if(el) el.innerHTML = _ykCalcHtml(c);
}
function _ykCalcHtml(c){
  var st = _ykSet(), dcol = c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569";
  var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:10px">';
  [["원료 마리수", _bsW(c.matMi)], ["작업 마리수", _bsW(c.mi)], ["실제 마리수", _bsW(c.actual)], ["오차", '<span style="color:' + dcol + '">' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + ' ' + (c.diff > 0 ? "더 나옴" : c.diff < 0 ? "덜 나옴" : "맞음") + '</span>'], ["원료 kg", _bsW(c.matKg)], ["소금 (" + st.salt.pct + "%)", _bsW(Math.round(c.saltKg * 10) / 10) + 'kg']].forEach(function(b){ h += '<div style="background:#f8fafc;border-radius:8px;padding:7px 9px"><div style="font-size:11.5px;color:#64748b">' + b[0] + '</div><div style="font-size:16px;font-weight:900">' + b[1] + '</div></div>'; });
  h += '</div><div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px"><div><b>💰 원가</b><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px">';
  [["원료", c.cost.mat], ["이모 엮거리 값", c.cost.weave], ["우리 인건비", c.cost.labor], ["엮거리 끈", c.cost.string], ["소금", c.cost.salt], ["냉동비", c.cost.freeze], ["포장비", c.cost.pack], ["잡비", c.cost.misc]].forEach(function(r){ h += '<tr><td style="padding:3px 0;color:#475569">' + r[0] + '</td><td style="text-align:right">' + _ykWon(r[1]) + '</td><td style="text-align:right;color:#94a3b8;font-size:11px;width:44px">' + (c.total ? Math.round(r[1] / c.total * 100) : 0) + '%</td></tr>'; });
  h += '<tr style="font-weight:900;border-top:2px solid #cbd5e1"><td style="padding:5px 0">총원가</td><td style="text-align:right;font-size:16px">' + _ykWon(c.total) + '</td><td></td></tr><tr><td style="color:#475569;font-size:12px">두름당 원가</td><td style="text-align:right;font-size:12px">' + (c.doo ? _ykWon(c.total / c.doo) : '-') + '</td><td></td></tr></table></div>';
  h += '<div><b>📈 마진</b><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px"><tr style="background:#f8fafc"><th style="text-align:left;padding:3px">기준</th><th style="text-align:right">생산금액</th><th style="text-align:right">마진</th><th style="text-align:right">마진율</th></tr>';
  [["판매가", c.rev.sale], ["도매가", c.rev.whole], ["원가표(기준가)", c.rev.cost]].forEach(function(r){ var m = r[1] - c.total, p = r[1] ? m / r[1] : null; h += '<tr><td style="padding:4px 3px">' + r[0] + '</td><td style="text-align:right">' + _ykWon(r[1]) + '</td><td style="text-align:right;font-weight:800;color:' + (m < 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon(m) + '</td><td style="text-align:right;font-weight:900;font-size:15px;color:' + (p == null ? "#94a3b8" : p < 0 ? "#dc2626" : "#16a34a") + '">' + (p == null ? '-' : Math.round(p * 1000) / 10 + '%') + '</td></tr>'; });
  h += '</table><div style="font-size:12px;font-weight:700;margin-top:8px">품명별 (원가는 마리수 비율로 나눔)</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#f8fafc"><th style="text-align:left;padding:2px">품명</th><th style="text-align:right">두름</th><th style="text-align:right">두름당 원가</th><th style="text-align:right">도매가</th><th style="text-align:right">마진율</th></tr>';
  c.rows.filter(function(x){ return x.doo; }).forEach(function(x){ var wd = _bsN(x.I.whole), p = wd ? (wd - x.unit) / wd : null; h += '<tr><td style="padding:2px">' + esc(x.item) + ' <span style="font-size:10.5px;color:#64748b">' + x.kind + '</span>' + (x.I.msg ? ' <span style="font-size:10.5px;color:#7c3aed">' + esc(x.I.msg) + '</span>' : '') + '</td><td style="text-align:right">' + _bsW(x.doo) + '</td><td style="text-align:right">' + _ykWon(x.unit) + '</td><td style="text-align:right">' + (wd ? _ykWon(wd) : '-') + '</td><td style="text-align:right;font-weight:800;color:' + (p == null ? "#94a3b8" : p < 0 ? "#dc2626" : "#16a34a") + '">' + (p == null ? '-' : Math.round(p * 1000) / 10 + '%') + '</td></tr>'; });
  return h + '</table></div></div>';
}
function ykSave(){
  var E = YK.ed, w = JSON.parse(JSON.stringify(E.w));
  if(!w.dt) return toast("작업일을 넣어 주세요", true);
  w.mats = w.mats.filter(function(m){ return String(m.nm).trim() || _bsN(m.qty); }).map(function(m){ return { nm: String(m.nm).trim(), qty: _bsN(m.qty), price: m.price === "" || m.price == null ? "" : _bsN(m.price) }; });
  w.rows = w.rows.filter(function(r){ return String(r.item).trim() || Object.keys(r.c || {}).length; }).map(function(r){ return { item: String(r.item).trim(), kind: r.kind || "굴비", c: r.c || {} }; });
  if(w.rows.some(function(r){ return !r.item; })) return toast("품명이 빈 줄이 있어요", true);
  w.upAt = new Date().toISOString(); w.upBy = CID || "";
  var ref = E.id ? _ykRef("works/" + E.id) : _ykRef("works").push(), key = E.id || ref.key, up = {}; up["works/" + key] = w;
  w.ws.forEach(function(n){ if(!((_ykS().people || {})[n])) up["people/" + n] = { on: true }; });
  showLoading("저장 중...");
  _ykRef().update(_bsClean ? _bsClean(up) : up).then(function(){ hideLoading(); YK.D.works = YK.D.works || {}; YK.D.works[key] = w; YK.D.people = YK.D.people || {}; Object.keys(up).forEach(function(p){ var a = p.split("/"); if(a[0] === "people") YK.D.people[a[1]] = up[p]; }); YK.ed.id = key; toast("저장했어요 — " + _ykLot(w.dt)); draw(); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
function ykDel(){ var E = YK.ed; if(!confirm(E.w.dt + " 작업을 지울까요? (이모 정산 금액도 같이 빠져요)")) return; _ykRef("works/" + E.id).remove().then(function(){ delete YK.D.works[E.id]; YK.ed = null; toast("지웠어요"); draw(); }); }

// ════════ 👵 이모 정산 (번 돈 − 준 돈 = 미수) ════════
function dYkPay(){
  var g = _ykGate(); if(g) return g;
  var P = _ykPayInfo(), S = _ykS(), can = _ykCan(), names = Object.keys(P).sort(function(a, b){ return P[b].due - P[a].due || a.localeCompare(b); });
  var tot = names.reduce(function(a, n){ return a + P[n].due; }, 0);
  var h = _ykHead("👵 이모 정산", "엮은 두름 × 단가 = 번 돈 · 돈 주면 미수에서 빠짐", can ? _bsB("#16a34a", "💵 지급 넣기", "ykPayEdit('')", "padding:9px 18px") : "");
  h += '<div class="card" style="margin-bottom:10px;font-size:14px">남은 미수 합계 <b style="font-size:20px;color:' + (tot > 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon(tot) + '원</b> <span class="mut" style="font-size:12px">· 엮거리 단가: 굴비 ' + _ykWon(_ykSet().rate.굴비) + ' · 부세 ' + _ykWon(_ykSet().rate.부세) + ' (두름당)</span></div>';
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px"><thead><tr style="background:#fff7ed">';
  ["이모", "굴비 두름", "부세 두름", "번 돈", "준 돈", "미수 (남은 돈)", "마지막 작업", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;text-align:' + (i >= 1 && i <= 5 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!names.length) h += '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8">아직 없어요</td></tr>';
  names.forEach(function(n){ var x = P[n];
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(n) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(x.굴비) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(x.부세) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(x.earn) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(x.paid) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;font-size:15px;color:' + (x.due > 0 ? "#dc2626" : x.due < 0 ? "#7c3aed" : "#16a34a") + '">' + _ykWon(x.due) + (x.due < 0 ? ' <span style="font-size:11px">(더 줌)</span>' : '') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + (x.last ? _bsDH(x.last) : '-') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + (can && x.due > 0 ? _bsB("#16a34a", "💵 지급", "ykPayEdit('','" + esc(n) + "')", "padding:3px 9px") : "") + '</td></tr>'; });
  h += '</tbody></table></div></div>';
  var pays = S.pays || {}, pk = Object.keys(pays).sort(function(a, b){ return String(pays[b].dt).localeCompare(String(pays[a].dt)); });
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px"><b>지급 기록</b></div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f0fdf4"><th style="padding:6px;text-align:left">날짜</th><th style="text-align:left">이모</th><th style="text-align:right">금액</th><th style="text-align:left;padding-left:10px">비고</th><th></th></tr>';
  if(!pk.length) h += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">없음</td></tr>';
  pk.forEach(function(k){ var p = pays[k]; h += '<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">' + _bsDH(p.dt) + '</td><td style="border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(p.w) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:800">' + _ykWon(p.amt) + '</td><td style="padding-left:10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + esc(p.note || "") + '</td><td style="border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "ykPayEdit('" + k + "')", "padding:2px 8px") : "") + '</td></tr>'; });
  return h + '</table></div>';
}
function ykPayEdit(id, who){
  var P = _ykPayInfo(), p = id ? _ykS().pays[id] : { dt: _bsToday(), w: who || "", amt: who && P[who] ? Math.max(0, Math.round(P[who].due)) : "", note: "" };
  var h = '<h3 style="margin:0 0 10px">💵 ' + (id ? "지급 고치기" : "지급 넣기") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">';
  h += '<label>날짜<input id="yp_dt" type="date" value="' + esc(p.dt) + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label>이모<select id="yp_w" onchange="var x=_ykPayInfo()[this.value];document.getElementById(\'yp_due\').textContent=x?_ykWon(x.due)+\'원\':\'-\'" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px">' + Object.keys(P).sort().map(function(n){ return '<option' + (n === p.w ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("") + '</select></label>';
  h += '<label>금액 (원)<input id="yp_amt" type="number" value="' + esc(p.amt) + '" style="width:100%;padding:7px;border:2px solid #16a34a;border-radius:6px;box-sizing:border-box;font-size:16px;font-weight:800"></label><div>지금 미수<div id="yp_due" style="font-size:18px;font-weight:900;color:#dc2626;margin-top:6px">' + (P[p.w] ? _ykWon(P[p.w].due) + '원' : '-') + '</div></div></div>';
  h += '<label style="font-size:13px;display:block;margin-top:8px">비고<input id="yp_note" value="' + esc(p.note || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "ykPayDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "ykPaySave('" + (id || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 480);
}
function ykPaySave(id){
  var g = function(k){ return (document.getElementById("yp_" + k) || {}).value; }, v = { dt: g("dt"), w: g("w"), amt: _bsN(g("amt")), note: (g("note") || "").trim() };
  if(!v.dt || !v.w || !(v.amt > 0)) return toast("날짜·이모·금액을 넣어 주세요", true);
  var ref = id ? _ykRef("pays/" + id) : _ykRef("pays").push(), key = id || ref.key;
  ref.set(v).then(function(){ YK.D.pays = YK.D.pays || {}; YK.D.pays[key] = v; closePopup(); toast(v.w + " " + _ykWon(v.amt) + "원 지급 — 미수 " + _ykWon(_ykPayInfo()[v.w].due) + "원"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykPayDel(id){ if(!confirm("이 지급 기록을 지울까요?")) return; _ykRef("pays/" + id).remove().then(function(){ delete YK.D.pays[id]; closePopup(); draw(); }); }

// ════════ ⚙️ 엮거리 설정 (원가 단가 · 정품 · 원료 · 이모 명단) ════════
function dYkSet(){
  var g = _ykGate(); if(g) return g;
  var st = _ykSet(), S = _ykS(), can = _ykCan(), N = function(lb, path, v, ex){ return '<label style="font-size:13px">' + lb + '<input ' + (can ? '' : 'disabled ') + 'type="number" step="any" value="' + esc(v) + '" data-p="' + path + '" class="ykSetIn" ' + (ex || "") + ' style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var Sel = function(path, v, opts){ return '<select ' + (can ? '' : 'disabled ') + 'data-p="' + path + '" class="ykSetIn" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px">' + opts.map(function(o){ return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>'; };
  var h = _ykHead("⚙️ 엮거리 설정", "원가 단가 · 정품 · 원료 · 이모 명단", can ? _bsB("#16a34a", "💾 원가 설정 저장", "ykSetSave()", "padding:9px 18px") : "");
  h += '<div class="card" style="margin-bottom:10px"><b>💰 원가 단가</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:8px">';
  h += N("엮거리 값 · 굴비 (두름당)", "rate.굴비", st.rate.굴비) + N("엮거리 값 · 부세 (두름당)", "rate.부세", st.rate.부세);
  h += N("엮거리 끈 한 다발 값 (원)", "string.price", st.string.price) + N("한 다발로 엮는 두름 수", "string.per", st.string.per);
  h += N("소금 비율 (%)", "salt.pct", st.salt.pct) + N("소금 kg당 값 (원)", "salt.price", st.salt.price);
  h += '<label style="font-size:13px">냉동비 기준' + Sel("freeze.mode", st.freeze.mode, [["kg", "원료 kg당"], ["box", "박스당"], ["doo", "두름당"], ["amt", "한 작업에 얼마"]]) + '</label>' + N("냉동비 (원)", "freeze.val", st.freeze.val);
  h += N("포장비 · 박스당 (박스·트레이·비닐·라벨)", "pack.val", st.pack.val);
  h += '<label style="font-size:13px">잡비 기준' + Sel("misc.mode", st.misc.mode, [["amt", "한 작업에 얼마 (원)"], ["pct", "원가의 % "]]) + '</label>' + N("잡비 (원 또는 %)", "misc.val", st.misc.val) + N("박스당 라벨 장수", "lblPer", st.lblPer);
  h += '</div><div class="mut" style="font-size:12px;margin-top:6px">우리 인건비는 작업마다 금액으로 넣어요 · 잡비도 작업에서 직접 고칠 수 있어요</div></div>';
  // 이모 명단
  var pe = Object.keys(S.people || {}).sort();
  h += '<div class="card" style="margin-bottom:10px"><b>👵 이모 명단</b> <span class="mut" style="font-size:12px">— 작업 표에 넣으면 저절로 추가돼요. 끄면 새 작업 기본 목록에서 빠져요</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
  pe.forEach(function(n){ var on = S.people[n].on !== false; h += '<label style="border:1px solid ' + (on ? "#b45309" : "#cbd5e1") + ';background:' + (on ? "#fff7ed" : "#f1f5f9") + ';border-radius:14px;padding:3px 10px;font-size:13px;cursor:pointer"><input type="checkbox" ' + (on ? "checked" : "") + (can ? '' : ' disabled') + ' onchange="ykPerson(\'' + esc(n) + '\',this.checked)"> ' + esc(n) + '</label>'; });
  h += (can ? '<input id="ykNewP" placeholder="이름" style="width:90px;padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + _bsB("#b45309", "+", "var v=document.getElementById('ykNewP').value.trim();if(v)ykPerson(v,true)", "padding:3px 10px") : "") + '</div></div>';
  // 정품
  var I = S.items || {}, ik = Object.keys(I).sort(function(a, b){ return String(I[a].code || "z").localeCompare(String(I[b].code || "z")) || a.localeCompare(b); });
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><b>📦 정품 (품명 · 가격 · 라벨) ' + ik.length + '개</b>' + (can ? _bsB("#b45309", "+ 정품", "ykItemEdit('')") : "") + '</div><div style="overflow-x:auto;max-height:420px"><table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:900px"><thead><tr style="background:#fff7ed;position:sticky;top:0">';
  ["품명", "박스당 두름", "두름 마리수", "판매가", "도매가", "원가표", "무게(g)", "라벨 색", "라벨", "바코드", "메모", ""].forEach(function(x, i){ h += '<th style="padding:5px;text-align:' + (i >= 1 && i <= 6 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  ik.forEach(function(k){ var x = I[k]; h += '<tr><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(x.nm) + '</td>' + ["box", "mi", "sale", "whole", "cost", "wt"].map(function(f){ return '<td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;text-align:right">' + (x[f] ? _ykWon(x[f]) : '') + '</td>'; }).join("") + '<td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + esc(x.color || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px">' + (x.noLbl ? '<span style="color:#dc2626">안 뽑음</span>' : x.under ? x.under + '박스 이하 안 뽑음' : '뽑음') + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px">' + esc(x.code || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#7c3aed">' + esc(x.msg || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "ykItemEdit('" + esc(k) + "')", "padding:2px 8px") : "") + '</td></tr>'; });
  h += '</tbody></table></div></div>';
  // 원료
  var M = S.mats || {}, mk = Object.keys(M).sort();
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><b>🐟 원료 (짝당 마리수 · 무게 · 값) ' + mk.length + '개</b>' + (can ? _bsB("#b45309", "+ 원료", "ykMatEdit('')") : "") + '</div><div style="overflow-x:auto;max-height:360px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#fff7ed;position:sticky;top:0"><th style="padding:5px;text-align:left">원료명</th><th style="text-align:right">짝당 마리수</th><th style="text-align:right">짝당 무게(kg)</th><th style="text-align:right">짝당 값</th><th></th></tr></thead><tbody>';
  mk.forEach(function(k){ var x = M[k]; h += '<tr><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(x.nm) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + _bsW(x.mi) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + (x.kg ? _bsW(x.kg) : '') + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + (x.price ? _ykWon(x.price) : '') + '</td><td style="border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "ykMatEdit('" + esc(k) + "')", "padding:2px 8px") : "") + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function ykSetSave(){
  var o = {}; Array.prototype.forEach.call(document.querySelectorAll(".ykSetIn"), function(el){ var p = el.getAttribute("data-p").split("."), v = el.tagName === "SELECT" ? el.value : _bsN(el.value); if(p.length === 2){ o[p[0]] = o[p[0]] || {}; o[p[0]][p[1]] = v; } else o[p[0]] = v; });
  _ykRef("set").set(o).then(function(){ YK.D.set = o; toast("원가 설정 저장했어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykPerson(n, on){ if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); _ykRef("people/" + n).set({ on: !!on }).then(function(){ YK.D.people = YK.D.people || {}; YK.D.people[n] = { on: !!on }; draw(); }); }
function ykItemEdit(k){
  var x = k ? _ykS().items[k] : { nm: "", box: 10, mi: 10, sale: "", whole: "", cost: "", wt: "", color: "", noLbl: false, under: "", code: "", msg: "" };
  var F = function(lb, f, t){ return '<label style="font-size:13px">' + lb + '<input id="yi_' + f + '" type="' + (t || "text") + '" value="' + esc(x[f] == null ? "" : x[f]) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">📦 ' + (k ? "정품 고치기" : "정품 추가") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">';
  h += F("품명", "nm") + F("박스당 두름", "box", "number") + F("두름 마리수 (20미/10미)", "mi", "number") + F("판매가 (두름당)", "sale", "number") + F("도매가 (두름당)", "whole", "number") + F("원가표 (두름당)", "cost", "number") + F("무게 (g)", "wt", "number") + F("라벨 색", "color") + F("바코드 (예: GA0005)", "code") + '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' + F("N박스 이하면 라벨 안 뽑음 (비우면 다 뽑음)", "under", "number") + F("메모 (예: 고추장만드세요)", "msg") + '</div><label style="font-size:13px;display:block;margin-top:8px"><input type="checkbox" id="yi_noLbl" ' + (x.noLbl ? "checked" : "") + '> 라벨 안 뽑음</label>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (k ? _bsB("#dc2626", "🗑 삭제", "ykItemDel('" + esc(k) + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "ykItemSave('" + esc(k || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 620);
}
function ykItemSave(k){
  var g = function(f){ return (document.getElementById("yi_" + f) || {}).value; }, v = { nm: (g("nm") || "").trim(), box: _bsN(g("box")), mi: _bsN(g("mi")) || 10, sale: _bsN(g("sale")), whole: _bsN(g("whole")), cost: _bsN(g("cost")), wt: _bsN(g("wt")), color: (g("color") || "").trim(), noLbl: document.getElementById("yi_noLbl").checked, under: _bsN(g("under")) || "", code: (g("code") || "").trim(), msg: (g("msg") || "").trim() };
  if(!v.nm) return toast("품명을 넣어 주세요", true);
  var key = _ykKey(v.nm), up = {}; up["items/" + key] = v; if(k && k !== key) up["items/" + k] = null;
  _ykRef().update(up).then(function(){ YK.D.items = YK.D.items || {}; if(k && k !== key) delete YK.D.items[k]; YK.D.items[key] = v; closePopup(); toast("저장 — " + v.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykItemDel(k){ if(!confirm(_ykS().items[k].nm + " 정품을 지울까요?")) return; _ykRef("items/" + k).remove().then(function(){ delete YK.D.items[k]; closePopup(); draw(); }); }
function ykMatEdit(k){
  var x = k ? _ykS().mats[k] : { nm: "", mi: "", kg: "", price: "" }, F = function(lb, f, t){ return '<label style="font-size:13px">' + lb + '<input id="ym_' + f + '" type="' + (t || "text") + '" value="' + esc(x[f] == null ? "" : x[f]) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">🐟 ' + (k ? "원료 고치기" : "원료 추가") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + F("원료명", "nm") + F("짝당 마리수", "mi", "number") + F("짝당 무게 (kg)", "kg", "number") + F("짝당 값 (원)", "price", "number") + '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (k ? _bsB("#dc2626", "🗑 삭제", "ykMatDel('" + esc(k) + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "ykMatSave('" + esc(k || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 460);
}
function ykMatSave(k){
  var g = function(f){ return (document.getElementById("ym_" + f) || {}).value; }, v = { nm: (g("nm") || "").trim(), mi: _bsN(g("mi")), kg: _bsN(g("kg")), price: _bsN(g("price")) };
  if(!v.nm || !v.mi) return toast("원료명과 짝당 마리수를 넣어 주세요", true);
  var key = _ykKey(v.nm), up = {}; up["mats/" + key] = v; if(k && k !== key) up["mats/" + k] = null;
  _ykRef().update(up).then(function(){ YK.D.mats = YK.D.mats || {}; if(k && k !== key) delete YK.D.mats[k]; YK.D.mats[key] = v; closePopup(); toast("저장 — " + v.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykMatDel(k){ if(!confirm(_ykS().mats[k].nm + " 원료를 지울까요?")) return; _ykRef("mats/" + k).remove().then(function(){ delete YK.D.mats[k]; closePopup(); draw(); }); }

// ════════ 🖨 인쇄: 전표 · 라벨 · 작업현황표 · 생산작업일지 ════════
function _ykWin(title, css, body){
  var w = window.open("", "_blank", "width=920,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111}table{border-collapse:collapse}.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}}' + css + '</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + body + '</body></html>');
  w.document.close();
}
function ykPrintSlip(){
  var w = YK.ed.w, c = _ykCalc(w), st = _ykSet(), PI = _ykPayInfo(), names = w.ws.filter(function(n){ return (c.workers[n] || {}).amt; });
  if(!names.length) return toast("두름을 적은 이모가 없어요", true);
  var one = function(n, who){ var W = c.workers[n], due = PI[n] ? PI[n].due : 0;
    return '<div class="slip"><div class="t">엮거리 전표 <span>(' + who + ')</span></div><div>날 짜 : <b>' + _bsMD(w.dt) + '</b> · 로트 ' + esc(_ykLot(w.dt)) + '</div><div>작업자 : <b style="font-size:17px">' + esc(n) + '</b></div><div class="sm">작업마리수 ' + _bsW(c.mi) + ' · 실제마리수 ' + _bsW(c.actual) + ' · ' + (c.diff > 0 ? _bsW(c.diff) + '마리 더 나옴' : c.diff < 0 ? _bsW(-c.diff) + '마리 덜 나옴' : '맞음') + '</div>' +
      '<table><tr><th></th><th>엮은 두름</th><th>단가</th><th>금액</th></tr><tr><td>굴비</td><td class="r">' + _bsW(W.굴비) + '</td><td class="r">' + _ykWon(st.rate.굴비) + '</td><td class="r">' + _ykWon(W.굴비 * st.rate.굴비) + '</td></tr><tr><td>부세</td><td class="r">' + _bsW(W.부세) + '</td><td class="r">' + _ykWon(st.rate.부세) + '</td><td class="r">' + _ykWon(W.부세 * st.rate.부세) + '</td></tr><tr class="b"><td>합계</td><td class="r">' + _bsW(W.굴비 + W.부세) + '</td><td></td><td class="r">' + _ykWon(W.amt) + '원</td></tr></table>' +
      '<div class="sm">결제 금액 <b style="font-size:15px">' + _ykWon(W.amt) + '원</b>' + (YK.ed.id ? ' · 지금까지 남은 미수 ' + _ykWon(due) + '원' : '') + '</div><div class="sig">확인 : ____________ (인)</div></div>'; };
  var b = '<div class="pg">' + names.map(function(n){ return '<div class="pair">' + one(n, "이모들") + one(n, "우리") + '</div>'; }).join("") + '</div>';
  _ykWin("엮거리 전표 " + w.dt, '@page{size:A4;margin:8mm}.pg{width:194mm;margin:0 auto}.pair{display:flex;gap:4mm;margin-bottom:4mm;break-inside:avoid}.slip{flex:1;border:2px solid #111;border-radius:3mm;padding:3mm;font-size:12.5px;line-height:1.7}.t{font-size:18px;font-weight:900;text-align:center;letter-spacing:4px;border-bottom:1px solid #111;margin-bottom:2mm}.t span{font-size:11px;letter-spacing:0;font-weight:400}.sm{font-size:11.5px}table{width:100%;margin:2mm 0}td,th{border:1px solid #333;padding:2px 4px;font-size:12px}th{background:#eee}.r{text-align:right}.b td{font-weight:900}.sig{text-align:right;margin-top:2mm}', b);
}
// Code39 바코드 (SVG)
var YK_C39 = { "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn", A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn", F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn", K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn", P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn", U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn", Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn" };
function _ykC39(txt, hpx){
  var s = "*" + String(txt || "").toUpperCase().replace(/[^0-9A-Z\-. ]/g, "") + "*", x = 0, bars = "", N = 1.3, Wd = 3.3;
  for(var i = 0; i < s.length; i++){ var p = YK_C39[s[i]]; if(!p) continue; for(var k = 0; k < 9; k++){ var w = p[k] === "w" ? Wd : N; if(k % 2 === 0) bars += '<rect x="' + x.toFixed(2) + '" y="0" width="' + w + '" height="' + hpx + '"/>'; x += w; } x += N; }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + x.toFixed(1) + ' ' + hpx + '" preserveAspectRatio="none" style="width:100%;height:' + hpx + 'px">' + bars + '</svg>';
}
function _ykLabels(w){
  var c = _ykCalc(w), st = _ykSet(), lot = _ykLot(w.dt), out = [], skip = [];
  c.rows.forEach(function(x){ var I = x.I || {}; if(!x.boxes) return;
    if(I.noLbl){ skip.push(x.item + " (라벨 안 뽑음)"); return; } if(I.under && x.boxes <= _bsN(I.under)){ skip.push(x.item + " " + x.boxes + "박스 (" + I.under + "박스 이하)"); return; }
    for(var b = 1; b <= x.boxes; b++) for(var k = 0; k < Math.max(1, _bsN(st.lblPer)); k++) out.push({ nm: x.item + x.box, lot: lot + (I.color ? "(" + I.color + ")" : ""), n: b + "/" + x.boxes, code: I.code || "", txt: x.item + "/" + x.box + "/" + lot }); });
  return { list: out, skip: skip };
}
function ykPrintLabel(){
  var L = _ykLabels(YK.ed.w);
  if(!L.list.length) return toast("뽑을 라벨이 없어요" + (L.skip.length ? " — " + L.skip.join(", ") : ""), true);
  var b = (L.skip.length ? '<div class="note">라벨 안 뽑은 품명: ' + L.skip.map(esc).join(" · ") + '</div>' : '') + '<div class="sheet">' + L.list.map(function(l){ return '<div class="lb"><div class="a">' + esc(l.nm) + '</div><div class="b">' + esc(l.lot) + ' <span>(' + l.n + ')</span></div>' + (l.code ? '<div class="bc">' + _ykC39(l.code, 34) + '</div><div class="c">' + esc(l.code) + ' · ' + esc(l.txt) + '</div>' : '') + '</div>'; }).join("") + '</div>';
  _ykWin("라벨 " + YK.ed.w.dt + " (" + L.list.length + "장)", '@page{size:A4;margin:10mm 6mm}.note{font-size:12px;color:#92400e;padding:4px 8px}.sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;width:198mm;margin:0 auto}.lb{border:1px dashed #999;height:36mm;padding:2mm 3mm;display:flex;flex-direction:column;justify-content:center;break-inside:avoid;text-align:center}.a{font-size:20px;font-weight:900}.b{font-size:13px;font-weight:700}.b span{font-weight:400;font-size:11px}.bc{margin:1mm 0}.c{font-size:9.5px;color:#333}@media print{.lb{border-color:#ddd}}', b);
}
function ykPrintSheet(){
  var w = YK.ed.w, c = _ykCalc(w), names = w.ws;
  var b = '<div class="pg"><h1>작 업 현 황</h1><table class="w"><tr><th>원료명</th><td>' + (w.mats || []).map(function(m){ return esc(m.nm); }).join(", ") + '</td><th>원료 수량</th><td>' + (w.mats || []).map(function(m){ return _bsW(m.qty) + '짝'; }).join(", ") + '</td><th>원산지</th><td>' + esc(w.origin || "") + '</td><th>상자재질</th><td>' + esc(w.boxMat || "") + '</td></tr></table>';
  b += '<div style="text-align:right;margin:2mm 0">' + _bsMD(w.dt) + ' · 로트 <b>' + esc(_ykLot(w.dt)) + '</b>' + (w.note ? ' · 비고: ' + esc(w.note) : '') + '</div><table class="w"><tr><th>작업자</th>' + names.map(function(n){ return '<th colspan="1">' + esc(n) + '</th>'; }).join("") + '<th>합계</th><th>마리수</th><th>박스 수량</th><th>잔량</th></tr>';
  (w.rows || []).forEach(function(r, i){ var x = c.rows[i]; b += '<tr><th style="text-align:left">' + esc(r.item) + ' <span style="font-weight:400;font-size:10px">' + (r.kind || "") + '</span></th>' + names.map(function(n){ return '<td class="r">' + ((r.c || {})[n] || "") + '</td>'; }).join("") + '<td class="r"><b>' + _bsW(x.doo) + '</b></td><td class="r">' + _bsW(x.mi) + '</td><td class="r">' + _bsW(x.boxes) + '</td><td class="r">' + _bsW(x.rest) + '</td></tr>'; });
  b += '<tr><th>당일 작업 수량</th>' + names.map(function(n){ var W = c.workers[n] || {}; return '<td class="r"><b>' + _bsW((W.굴비 || 0) + (W.부세 || 0)) + '</b></td>'; }).join("") + '<td class="r"><b>' + _bsW(c.doo) + '</b></td><td class="r">' + _bsW(c.mi) + '</td><td class="r"><b>' + _bsW(c.boxes) + '</b></td><td></td></tr>';
  b += '<tr><th>당일 금액</th>' + names.map(function(n){ return '<td class="r">' + _ykWon((c.workers[n] || {}).amt) + '</td>'; }).join("") + '<td class="r"><b>' + _ykWon(c.weave) + '</b></td><td colspan="3"></td></tr></table>';
  b += '<table class="w" style="margin-top:3mm"><tr><th>원료 마리수</th><td class="r">' + _bsW(c.matMi) + '</td><th>작업 마리수</th><td class="r">' + _bsW(c.mi) + '</td><th>실제 마리수</th><td class="r">' + _bsW(c.actual) + '</td><th>수량 오차</th><td class="r"><b>' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + '</b></td></tr><tr><th>원료 kg</th><td class="r">' + _bsW(c.matKg) + '</td><th>소금 kg</th><td class="r">' + _bsW(Math.round(c.saltKg * 10) / 10) + '</td><th>총원가</th><td class="r">' + _ykWon(c.total) + '</td><th>도매가 마진율</th><td class="r">' + (c.rev.whole ? Math.round((c.rev.whole - c.total) / c.rev.whole * 1000) / 10 + '%' : '-') + '</td></tr></table></div>';
  _ykWin("작업현황 " + w.dt, '@page{size:A4 landscape;margin:8mm}.pg{width:280mm;margin:0 auto}h1{text-align:center;letter-spacing:10px;font-size:22px;margin:2mm 0 4mm}.w{width:100%}.w td,.w th{border:1px solid #333;padding:3px 5px;font-size:12px}.w th{background:#eef2f7}.r{text-align:right}', b);
}
function ykPrintProd(){
  var w = YK.ed.w, c = _ykCalc(w), st = _ykSet(), sp = _bsN(st.salt.pct);
  var b = '<div class="pg"><h1>생 산 작 업 일 지</h1><table class="w"><tr><th>생산일자</th><td>' + _bsMD(w.dt) + '</td><th>제품명</th><td><b>' + esc(_ykKindOf(w)) + '</b></td></tr></table><div style="margin:4mm 0 2mm;font-weight:800">원재료명 또는 성분 및 투입량</div><table class="w"><tr><th>원재료명 또는 성분명</th><th>배합비율(%)</th><th>투입량(kg)</th><th>비고</th></tr>';
  b += '<tr><td>' + esc((w.mats || []).map(function(m){ return m.nm; }).join(", ") || "조기") + '</td><td class="r">' + (100 - sp) + '</td><td class="r">' + _bsW(c.matKg) + '</td><td></td></tr><tr><td>소금</td><td class="r">' + sp + '</td><td class="r">' + _bsW(Math.round(c.saltKg * 10) / 10) + '</td><td></td></tr></table>';
  b += '<table class="w" style="margin-top:4mm"><tr><th>기 타</th><td colspan="3" style="height:14mm">' + esc(w.note || "") + '</td></tr><tr><th>포장방법 및 단위</th><td>' + esc(w.boxMat || "박스/스티로폼/팩") + '</td><th>생산량(두름)</th><td>' + _bsW(c.doo) + '</td></tr><tr><th>작 업 자</th><td>공장장</td><th>유통기한</th><td>작업일자로부터 2년</td></tr></table></div>';
  _ykWin("생산작업일지 " + w.dt, '@page{size:A4;margin:12mm}.pg{width:186mm;margin:0 auto}h1{text-align:center;letter-spacing:10px;font-size:24px;margin:2mm 0 6mm}.w{width:100%}.w td,.w th{border:1px solid #333;padding:5px 7px;font-size:13px}.w th{background:#eef2f7}.r{text-align:right}', b);
}
