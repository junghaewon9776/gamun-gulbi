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
function _ykSaltPct(st, kind){ var b = st.salt.pctB; return kind === "부세" && b !== "" && b != null ? _bsN(b) : _bsN(st.salt.pct); }
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
function _ykRK(r){ var I = _ykItem(r && r.item); return (I && I.kind) || (r && r.kind) || "굴비"; }   // 정품에 굴비/부세 정해 두면 그걸로, 아니면 줄마다 고른 것
function _ykKindBtn(i, r, sty){ var k = _ykRK(r), fx = !!((_ykItem(r.item) || {}).kind), col = k === "부세" ? "#0e7490" : "#b45309";
  if(sty === "tiny") return '<span' + (fx ? ' title="정품에 정해 둔 구분"' : ' title="누르면 굴비↔부세" onclick="YK.ed.w.rows[' + i + '].kind=(_ykRK(YK.ed.w.rows[' + i + '])===\'부세\'?\'굴비\':\'부세\');draw()"') + ' style="display:inline-block;font-size:10px;font-weight:800;line-height:1.3;color:' + (fx ? col : "#fff") + ';background:' + (fx ? "#fff" : col) + ';border:1px solid ' + col + ';border-radius:4px;padding:0 3px;white-space:nowrap;' + (fx ? "" : "cursor:pointer") + '">' + k + (fx ? "" : "⇄") + '</span>';
  if(fx) return '<span title="정품에 정해 둔 구분 (⚙️ 설정 정품에서 바꿔요)" style="display:inline-block;font-size:11.5px;font-weight:800;color:' + col + ';border:1px solid ' + col + ';border-radius:5px;padding:1px 5px;white-space:nowrap">' + k + '</span>';
  return '<button class="btn" title="누르면 굴비↔부세 (정품에 정해 두면 저절로)" style="background:' + col + ';color:#fff;' + (sty || "padding:3px 9px;min-width:46px") + '" onclick="YK.ed.w.rows[' + i + '].kind=(_ykRK(YK.ed.w.rows[' + i + '])===\'부세\'?\'굴비\':\'부세\');draw()">' + k + '</button>'; }
function _ykItem(nm){ var I = _ykS().items || {}; return I[_ykKey(nm)] || null; }
function _ykMat(nm){ var M = _ykS().mats || {}; return M[_ykKey(nm)] || null; }
function _ykKindOf(w){ return (w.mats || []).some(function(m){ return /부세/.test(m.nm); }) ? "부세" : "굴비"; }

// ── 계산 ──
// 엮거리 단가: 작업마다 저장할 때 단가를 같이 적어 둠(w.rate) → 나중에 설정 단가 올려도 지난 작업 금액은 그대로
function _ykRate(w){ var st = _ykSet().rate, r = (w && w.rate) || {}; return { 굴비: r.굴비 != null && r.굴비 !== "" ? _bsN(r.굴비) : _bsN(st.굴비), 부세: r.부세 != null && r.부세 !== "" ? _bsN(r.부세) : _bsN(st.부세) }; }
function _ykCalc(w){
  var st = _ykSet(), o = { matMi: 0, matKg: 0, matCost: 0, rows: [], doo: 0, mi: 0, boxes: 0, workers: {}, weave: 0 };
  o.saltKg = 0; (w.mats || []).forEach(function(m){ var M = _ykMat(m.nm) || {}, q = _bsN(m.qty); o.matMi += q * _bsN(M.mi); o.matKg += q * _bsN(M.kg); o.saltKg += q * _bsN(M.kg) * _ykSaltPct(st, /부세/.test(m.nm || "") ? "부세" : "굴비") / 100; o.matCost += q * (m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price)); });
  (w.ws || []).forEach(function(n){ o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }; });
  (w.rows || []).forEach(function(r){
    var I = _ykItem(r.item) || {}, doo = 0, kind = _ykRK(r);
    Object.keys(r.c || {}).forEach(function(n){ var v = _bsN(r.c[n]); if(!v) return; doo += v; var W = o.workers[n] || (o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }); W[kind] += v; W.amt += v * _bsN(_ykRate(w)[kind]); });
    var box = _bsN(I.box), mi = doo * _bsN(I.mi || 20), rv = String(r.real == null ? "" : r.real).trim(), hasReal = rv !== "" && rv !== "+" && rv !== "-", pd = !hasReal ? doo : /^[+-]/.test(rv) ? doo + _bsN(rv) : _bsN(rv), pmi = pd * _bsN(I.mi || 20);
    var x = { item: r.item, kind: kind, doo: doo, mi: mi, real: hasReal ? pd : null, pd: pd, pmi: pmi, box: box, boxes: box ? Math.floor(pd / box) : 0, rest: box ? pd % box : pd, I: I };
    o.rows.push(x); o.doo += doo; o.mi += mi; o.boxes += x.boxes; o.pd = (o.pd || 0) + pd; o.pmi = (o.pmi || 0) + pmi; if(hasReal) o.hasReal = true;
  });
  Object.keys(o.workers).forEach(function(n){ o.weave += o.workers[n].amt; });
  o.pd = o.pd || 0; o.pmi = o.pmi || 0;
  o.actual = w.actual !== "" && w.actual != null ? _bsN(w.actual) : (o.hasReal ? o.pmi : o.mi);
  o.diff = o.actual - o.matMi;
  var c = { mat: o.matCost, weave: o.weave, labor: _bsN(w.labor), string: _bsN(st.string.per) ? o.doo * _bsN(st.string.price) / _bsN(st.string.per) : 0, salt: o.saltKg * _bsN(st.salt.price),
    freeze: st.freeze.mode === "kg" ? o.matKg * _bsN(st.freeze.val) : st.freeze.mode === "box" ? o.boxes * _bsN(st.freeze.val) : st.freeze.mode === "doo" ? o.doo * _bsN(st.freeze.val) : _bsN(st.freeze.val),
    pack: o.boxes * _bsN(st.pack.val) };
  var sub = Object.keys(c).reduce(function(s, k){ return s + c[k]; }, 0);
  c.misc = w.misc !== "" && w.misc != null ? _bsN(w.misc) : st.misc.mode === "pct" ? sub * _bsN(st.misc.val) / 100 : _bsN(st.misc.val);
  o.cost = c; o.total = sub + c.misc;
  o.rev = { sale: 0, whole: 0, cost: 0, adj: 0 };
  o.rows.forEach(function(x){ x.P = _ykPx(x.I, w.pxDt || w.dt); /* pxDt = '지금 가격으로' 누른 날 (없으면 작업일 가격) */ ["sale", "whole", "cost", "adj"].forEach(function(k){ x[k] = x.pd * x.P[k]; o.rev[k] += x[k]; }); });
  // 총원가 나누기 = 원가표 금액 비율 (비싼 품목이 원가를 더 가져감) · 원가표 빈 품목은 원가표 있는 품목들의 마리당 평균으로 셈 · 원가표가 하나도 없으면 마리수 비율
  var S1 = 0, M1 = 0, D1 = 0; o.rows.forEach(function(x){ if(x.pd && x.P.cost){ S1 += x.pd * x.P.cost; M1 += x.pmi; D1 += x.pd; } });
  o.tblCover = o.pd ? D1 / o.pd : 0;   // 원가표 있는 품목이 차지하는 두름 비율 — 80% 안 되면 원가표 판단 안 함
  var perMi = M1 ? S1 / M1 : 0, SW = 0; o.rows.forEach(function(x){ x.wgt = !x.pd ? 0 : x.P.cost ? x.pd * x.P.cost : perMi ? x.pmi * perMi : x.pmi; SW += x.wgt; });
  o.rows.forEach(function(x){ x.alloc = SW ? o.total * x.wgt / SW : 0; x.unit = x.pd ? x.alloc / x.pd : 0; });
  o.tblSum = SW; o.tblRatio = perMi && SW ? o.total / SW : 0;   // 원가표를 이 배수로 바꾸면 본전 (1.06 = 6% 올려야)
  return o;
}
function _ykInPer(dt, f, t){ dt = String(dt || ""); return (!f || dt >= f) && (!t || dt <= t); }
function _ykPayInfo(f, t){
  var S = _ykS(), m = {};
  Object.keys(S.works || {}).forEach(function(id){ var w = S.works[id]; if(!_ykInPer(w.dt, f, t)) return; var c = _ykCalc(w); Object.keys(c.workers).forEach(function(n){ var x = m[n] || (m[n] = { 굴비: 0, 부세: 0, earn: 0, paid: 0, last: "" }); x.굴비 += c.workers[n].굴비; x.부세 += c.workers[n].부세; x.earn += c.workers[n].amt; if(c.workers[n].amt && w.dt > x.last) x.last = w.dt; }); });
  Object.keys(S.pays || {}).forEach(function(id){ var p = S.pays[id], x; if(!_ykInPer(p.dt, f, t)) return; x = m[p.w] || (m[p.w] = { 굴비: 0, 부세: 0, earn: 0, paid: 0, last: "" }); x.paid += _bsN(p.amt); });
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
  var WP = _ykWPer(), list = ids.filter(function(k){ return _ykInPer(W[k].dt, WP[0], WP[1]); });
  var h = _ykHead("🪢 엮거리 작업", "원료 → 이모들 두름 → 박스·라벨 · 원가·마진율", can ? _bsB("#b45309", "+ 새 작업", "ykNew()", "padding:9px 18px") : "");
  if(!Object.keys(S.items || {}).length) h += '<div class="card" style="margin-bottom:10px;background:#fef3c7;color:#92400e;font-size:13px">⚠️ <b>⚙️ 엮거리 설정</b>에서 정품(품명·박스당 두름·가격)과 원료(짝당 마리수·무게)를 먼저 넣어 주세요.</div>';
  h += _ykRangeBar(WP[0], WP[1], "ykWPer", "ykWPerYm", '<b style="color:#9a3412">' + _ykPerTxt(WP[0], WP[1]) + ' · ' + list.length + '건</b>' + (list.length ? '' : ' — 이 기간엔 작업이 없어요. ◀ 로 지난달을 보거나 [전체]를 누르세요'));
  YK.sel = YK.sel || {}; Object.keys(YK.sel).forEach(function(k){ if(!W[k]) delete YK.sel[k]; });
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#f5f3ff;border:1px solid #ddd6fe"><b style="color:#5b21b6">☑ 고른 작업 <span id="ykSelN">' + Object.keys(YK.sel).length + '</span>건</b>' + _bsB("#7c3aed", "🖨 생산작업일지 한번에", "ykPrintSel('prod')", _ykSB()) + _bsB("#0e7490", "🖨 작업현황표 한번에", "ykPrintSel('sheet')", _ykSB()) + _bsB("#b45309", "📊 원가분석표 한번에", "ykPrintSel('anal')", _ykSB()) + _bsB("#64748b", "선택 풀기", "YK.sel={};draw()", _ykSB() || "padding:6px 10px") + '<span class="mut" style="font-size:12px">왼쪽 칸 체크 · Shift 누르고 체크하면 사이 것 다 골라져요</span></div>';
  YK.selVis = list.slice();
  if(_ykMob()) return h + _ykWorkMob(list, W);
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px"><thead><tr style="background:#fff7ed"><th style="padding:7px 6px;border-bottom:2px solid #fed7aa;width:30px"><input type="checkbox" title="보이는 것 모두" ' + (list.length && list.every(function(k){ return YK.sel[k]; }) ? "checked" : "") + ' onclick="ykSelAll(this.checked)" style="width:17px;height:17px;cursor:pointer"></th>';
  ["작업일", "원료", "두름", "박스", "이모", "엮거리 값", "총원가", "마진율 (도매가)", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;text-align:' + (i >= 2 && i <= 7 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!list.length) h += '<tr><td colspan="11" style="padding:30px;text-align:center;color:#94a3b8">작업이 없어요' + (can ? ' — <b>+ 새 작업</b>' : '') + '</td></tr>';
  list.forEach(function(k){ var w = W[k], c = _ykCalc(w), mr = c.rev.whole ? (c.rev.whole - c.total) / c.rev.whole : null;
    h += '<tr style="cursor:pointer" onclick="if(event.target.closest(\'.ykSelTd\'))return;ykOpen(\'' + k + '\')" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'"><td class="ykSelTd" style="padding:6px;border-bottom:1px solid #f1f5f9"><input type="checkbox" class="ykSelC" ' + (YK.sel[k] ? "checked" : "") + ' onchange="ykSelSet(\'' + k + '\',this.checked)" style="width:17px;height:17px;cursor:pointer"></td><td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsDH(w.dt) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' + (w.mats || []).map(function(m){ return esc(m.nm) + ' ' + _bsW(m.qty) + '짝'; }).join(", ") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800">' + _bsW(c.doo) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(c.boxes) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + (w.ws || []).length + '명</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(c.weave) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(c.total) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;color:' + (mr == null ? "#94a3b8" : mr < 0 ? "#dc2626" : "#16a34a") + '">' + (mr == null ? '-' : Math.round(mr * 1000) / 10 + '%') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + _bsB("#b45309", "열기", "event.stopPropagation();ykOpen('" + k + "')", "padding:3px 10px") + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function ykSelSet(k, on){ YK.sel = YK.sel || {}; if(on) YK.sel[k] = 1; else delete YK.sel[k]; var e = document.getElementById("ykSelN"); if(e) e.textContent = Object.keys(YK.sel).length; }
function ykSelAll(on){ (YK.selVis || []).forEach(function(k){ if(on) YK.sel[k] = 1; else delete YK.sel[k]; }); draw(); }
function ykPrintSel(t){
  var W = _ykS().works || {}, L = Object.keys(YK.sel || {}).filter(function(k){ return W[k]; }).map(function(k){ return W[k]; }).sort(function(a, b){ return String(a.dt).localeCompare(String(b.dt)); });
  if(!L.length) return toast("인쇄할 작업을 먼저 체크해 주세요", true);
  if(t === "prod") ykPrintProd(L); else if(t === "anal") ykPrintAnal(L); else ykPrintSheet(L);
}
function ykNew(){
  var S = _ykS(), W = S.works || {}, last = Object.keys(W).sort(function(a, b){ return String(W[b].dt).localeCompare(String(W[a].dt)); })[0], lw = last ? W[last] : null;
  var fix = _ykFixed();
  YK.ed = { id: "", w: { dt: _bsToday(), mats: _ykLastMats(lw), ws: fix.length ? fix : (lw ? (lw.ws || []).slice() : []), rows: _ykLastRows(lw), rate: JSON.parse(JSON.stringify(_ykSet().rate)), actual: "", labor: "", misc: "", origin: lw && lw.origin || "국산", boxMat: lw && lw.boxMat || "", note: "" } };
  draw();
}
// 📌 고정 체크한 이모 (이모 명단에서 체크) — 새 작업에 저절로 들어감
function _ykFixed(){ var P = _ykS().people || {}; return Object.keys(P).filter(function(n){ return P[n].on !== false; }).sort(function(a, b){ return _ykOrd(P[a]) - _ykOrd(P[b]) || a.localeCompare(b); }); }
function _ykOrd(p){ var o = p && p.ord; return o === "" || o == null || isNaN(+o) ? 9999 : +o; }
function _ykLastWork(){ var W = _ykS().works || {}, k = Object.keys(W).filter(function(k){ return !YK.ed || k !== YK.ed.id; }).sort(function(a, b){ return String(W[b].dt).localeCompare(String(W[a].dt)); })[0]; return k ? W[k] : null; }
function _ykLastMats(lw){ var a = ((lw && lw.mats) || []).filter(function(m){ return m.nm; }).map(function(m){ return { nm: m.nm, qty: "", price: "" }; }); return a.length ? a : [{ nm: "", qty: "", price: "" }]; }
function _ykLastRows(lw){ var a = ((lw && lw.rows) || []).filter(function(r){ return r.item; }).map(function(r){ return { item: r.item, kind: r.kind || "굴비", c: {} }; }); return a.length ? a : [{ item: "", kind: "굴비", c: {} }]; }
// 편집 중에 이모 목록 바꾸기 — 적어 둔 두름이 있는 이모는 안 빼요
function ykWsSet(how){
  var w = YK.ed.w, lw = _ykLastWork(), src = how === "fix" ? _ykFixed() : ((lw && lw.ws) || []);
  if(!src.length) return toast(how === "fix" ? "📌 고정한 이모가 없어요 — 엮거리 설정 > 이모 명단에서 체크하세요" : "지난 작업이 없어요", true);
  var keep = w.ws.filter(function(n){ return w.rows.some(function(r){ return (r.c || {})[n]; }); });
  w.ws = src.slice(); keep.forEach(function(n){ if(w.ws.indexOf(n) < 0) w.ws.push(n); }); draw();
}
function ykLastNames(){
  var lw = _ykLastWork(); if(!lw) return toast("지난 작업이 없어요", true);
  var w = YK.ed.w, has = w.rows.some(function(r){ return Object.keys(r.c || {}).some(function(n){ return r.c[n]; }); }) || w.mats.some(function(m){ return m.qty; });
  if(has && !confirm("지금 적은 원료·품명을 지난 작업(" + lw.dt + ") 것으로 바꿀까요? 적은 수량은 지워져요")) return;
  w.mats = _ykLastMats(lw); w.rows = _ykLastRows(lw); draw();
}
function ykOpen(id){ YK.ed = { id: id, w: JSON.parse(JSON.stringify(_ykS().works[id])) }; YK.ed.w.mats = YK.ed.w.mats || []; YK.ed.w.ws = YK.ed.w.ws || []; YK.ed.w.rows = YK.ed.w.rows || []; draw(); }

// ── 작업 편집 화면 ──
function _ykIn(v, on, ex){ return '<input value="' + esc(v == null ? "" : v) + '" oninput="' + on + '" ' + (ex || "") + ' style="width:100%;padding:5px 6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box">'; }
function _ykEditor(){
  var E = YK.ed, w = E.w, S = _ykS(), can = _ykCan(), items = Object.keys(S.items || {}).map(function(k){ return S.items[k].nm; }), mats = Object.keys(S.mats || {}).map(function(k){ return S.mats[k].nm; });
  var people = Object.keys(S.people || {}).filter(function(n){ return w.ws.indexOf(n) < 0; }).sort(function(a, b){ return ((S.people[a].on !== false) ? 0 : 1) - ((S.people[b].on !== false) ? 0 : 1) || a.localeCompare(b); });
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div>' + _bsB("#475569", "← 목록", "if(confirm('저장 안 한 내용은 사라져요. 목록으로 갈까요?')){YK.ed=null;draw()}") + ' <strong style="font-size:17px;margin-left:6px">🪢 ' + (E.id ? "엮거리 작업" : "새 엮거리 작업") + '</strong> <span style="font-size:15px;font-weight:900;color:#b45309;margin-left:6px" id="ykLot">' + esc(_ykLot(w.dt)) + '</span></div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">' + _bsB("#0e7490", "🖨 전표", "ykPrintSlip()", _ykSB()) + _bsB("#7c3aed", "🏷 라벨", "ykPrintLabel()", _ykSB()) + _bsB("#475569", "🖨 작업현황표", "ykPrintSheet()", _ykSB()) + _bsB("#b45309", "📊 원가분석표", "ykPrintAnal()", _ykSB()) + _bsB("#475569", "🖨 생산작업일지", "ykPrintProd()", _ykSB()) + (YK.ed && YK.ed.id ? _ykPxBtn(YK.ed.id, YK.ed.w) : "") + (can ? _bsB("#16a34a", "💾 저장", "ykSave()", "padding:8px 20px") : "") + '</div></div></div>';
  if(!E.id && can) h += '<div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:-4px 0 10px;font-size:12.5px"><span style="color:#64748b;font-weight:700">🧹 비우기</span>' + [["all", "전체 초기화"]].map(function(o){ return '<button class="btn" onclick="ykReset(\'' + o[0] + '\')" style="padding:3px 9px;font-size:12px;font-weight:800;background:' + (o[0] === "all" ? "#dc2626" : "#475569") + ';color:#fff">' + o[1] + '</button>'; }).join("") + '<span class="mut" style="font-size:11.5px">지난 작업에서 불러온 걸 지워요</span></div>';
  // 기본 · 원료
  h += '<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:13px">';
  h += '<label>작업일<input type="date" value="' + esc(w.dt) + '" onchange="YK.ed.w.dt=this.value;document.getElementById(\'ykLot\').textContent=_ykLot(this.value);_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>원산지' + _ykIn(w.origin, "YK.ed.w.origin=this.value") + '</label><label>상자 재질' + _ykIn(w.boxMat, "YK.ed.w.boxMat=this.value", 'placeholder="박스/스티로폼/팩"') + '</label><label>비고' + _ykIn(w.note, "YK.ed.w.note=this.value") + '</label></div>';
  var rt = _ykRate(w), st0 = _ykSet().rate, same = rt.굴비 === _bsN(st0.굴비) && rt.부세 === _bsN(st0.부세);
  h += '<div style="margin-top:8px;font-size:13px;background:' + (same ? "#f8fafc" : "#fff7ed") + ';border:1px solid ' + (same ? "#e2e8f0" : "#fdba74") + ';border-radius:8px;padding:6px 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>이 작업 엮거리 단가 (두름당)</b> 굴비 <input type="number" value="' + rt.굴비 + '" oninput="YK.ed.w.rate=YK.ed.w.rate||{};YK.ed.w.rate.굴비=this.value;_ykRecalc()" style="width:80px;padding:4px;border:1px solid #cbd5e1;border-radius:5px"> 부세 <input type="number" value="' + rt.부세 + '" oninput="YK.ed.w.rate=YK.ed.w.rate||{};YK.ed.w.rate.부세=this.value;_ykRecalc()" style="width:80px;padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + (same ? '<span class="mut" style="font-size:12px">— 지금 설정 단가와 같아요. 저장하면 이 단가로 고정돼서 나중에 설정을 올려도 이 작업은 안 바뀌어요</span>' : '<span style="font-size:12px;color:#c2410c;font-weight:700">— 지금 설정 단가(굴비 ' + _ykWon(st0.굴비) + ' · 부세 ' + _ykWon(st0.부세) + ')와 달라요</span> ' + _bsB("#ea580c", "지금 단가로 바꾸기", "YK.ed.w.rate=JSON.parse(JSON.stringify(_ykSet().rate));draw()", "padding:3px 9px")) + '</div>';
  if(_ykMob()) h += _ykEdMobMats(w); else {
  h += '<div style="font-weight:800;margin:10px 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">🐟 원료 <span class="mut" style="font-weight:400;font-size:12px">— 짝 수와 짝당 가격 (비우면 설정의 원료값)</span>' + _ykRsB("mat") + '</div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f8fafc"><th style="text-align:left;padding:4px">원료명</th><th style="width:90px">짝 수</th><th style="width:130px">짝당 가격</th><th style="width:90px;text-align:right">마리수</th><th style="width:90px;text-align:right">kg</th><th style="width:120px;text-align:right">원료 금액</th><th style="width:36px"></th></tr>';
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {};
    h += '<tr><td style="padding:3px">' + _ykPick("mat", i, m.nm) + '</td><td style="padding:3px">' + _ykIn(m.qty, "YK.ed.w.mats[" + i + "].qty=this.value;_ykRecalc()", 'type="number" step="any"') + '</td><td style="padding:3px">' + _ykIn(_wonFmt(m.price), "YK.ed.w.mats[" + i + "].price=this.value;_ykRecalc()", 'type="text" inputmode="numeric" data-won placeholder="' + (M.price ? _ykWon(M.price) : "짝당") + '"') + '</td>';
    h += '<td id="ykMm' + i + '" style="text-align:right;padding:3px"></td><td id="ykMk' + i + '" style="text-align:right;padding:3px"></td><td id="ykMc' + i + '" style="text-align:right;padding:3px;font-weight:700"></td><td><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="YK.ed.w.mats.splice(' + i + ',1);draw()">✕</button></td></tr>'; });
  h += '</table>' + _bsB("#b45309", "+ 원료 줄", "YK.ed.w.mats.push({nm:'',qty:'',price:''});draw()", "padding:4px 10px;margin-top:4px") + ' ' + _bsB("#475569", "↩ 원료·품명 지난 작업 그대로", "ykLastNames()", "padding:4px 10px;margin-top:4px") + '</div>';
  }
  // 이모 × 품명 표
  h += '<div class="card" style="margin-bottom:10px;padding:10px 0 0"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:0 12px 8px"><span style="display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap"><b>👵 이모들 × 품명 (두름)</b>' + _ykRsB("item") + _ykRsB("ws") + '</span><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><select onchange="ykAddWorker(this)" style="min-width:150px;padding:7px 8px;font-size:14px;font-weight:700;border:2px solid #0e7490;border-radius:8px;background:#ecfeff;color:#0e7490;cursor:pointer"><option value="">👵 이모 넣기 ▾</option>' + people.map(function(n){ return '<option value="' + esc(n) + '">' + ((S.people[n] || {}).on !== false ? "📌 " : "") + esc(n) + '</option>'; }).join("") + '<option value="__new">➕ 새 이모 추가…</option></select>' + _bsB("#7c3aed", "📌 고정 이모로", "ykWsSet('fix')", "padding:5px 10px") + _bsB("#475569", "↩ 지난 작업 이모", "ykWsSet('last')", "padding:5px 10px") + '</div></div>';
  if(!_ykMob()) h += _ykPcTog();
  if(_ykMob()) h += _ykEdMob2(w); else if(_ykPcSheet()) h += (_ykCan() ? _ykQBar(w, true) : "") + _ykQGrid(w, true); else {
  h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:100%"><thead><tr style="background:#fff7ed"><th style="padding:5px;text-align:left;min-width:120px;position:sticky;left:0;background:#fff7ed;z-index:1">품명</th><th style="padding:5px">굴비/부세</th>';
  w.ws.forEach(function(n, j){ h += '<th style="padding:5px;min-width:70px;white-space:nowrap">' + _ykWsHd(j, n) + '</th>'; });
  h += '<th style="padding:5px;background:#fde68a">합계</th><th style="padding:5px;background:#dcfce7;white-space:nowrap" title="포장하면서 센 두름 · +3 / -2 처럼 오차만 적어도 돼요 · 비우면 합계와 같게">실제 (포장)<div style="font-weight:400;font-size:10.5px">숫자 또는 ±오차</div></th><th style="padding:5px">마리수</th><th style="padding:5px">박스</th><th style="padding:5px">잔량</th><th></th></tr></thead><tbody>';
  w.rows.forEach(function(r, i){
    h += '<tr><td style="padding:3px;position:sticky;left:0;background:#fff;z-index:1">' + _ykPick("item", i, r.item) + '</td>';
    h += '<td style="padding:3px;text-align:center">' + _ykKindBtn(i, r) + '</td>';
    w.ws.forEach(function(n, j){ h += '<td style="padding:3px"><input type="number" inputmode="numeric" value="' + esc((r.c || {})[n] || "") + '" oninput="_ykCell(' + i + ',' + j + ',this.value)" style="width:64px;padding:5px;border:1px solid #cbd5e1;border-radius:5px;text-align:right"></td>'; });
    h += '<td id="ykRd' + i + '" style="padding:3px 6px;text-align:right;font-weight:900;background:#fef9c3"></td><td style="padding:3px;background:#f0fdf4"><input inputmode="text" value="' + esc(r.real == null ? "" : r.real) + '" oninput="YK.ed.w.rows[' + i + '].real=this.value;_ykRecalc()" id="ykRx' + i + '" style="width:70px;padding:5px;border:2px solid #86efac;border-radius:5px;text-align:right;font-weight:800"></td><td id="ykRm' + i + '" style="padding:3px 6px;text-align:right"></td><td id="ykRb' + i + '" style="padding:3px 6px;text-align:right;font-weight:800"></td><td id="ykRr' + i + '" style="padding:3px 6px;text-align:right"></td><td><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="YK.ed.w.rows.splice(' + i + ',1);draw()">✕</button></td></tr>'; });
  h += '</tbody><tfoot><tr style="background:#f1f5f9"><td style="padding:5px;font-weight:800;position:sticky;left:0;background:#f1f5f9">이모별 두름</td><td></td>';
  w.ws.forEach(function(n, j){ h += '<td id="ykWd' + j + '" style="padding:4px;text-align:center;font-size:12px;line-height:1.4"></td>'; });
  h += '<td id="ykTd" style="padding:4px 6px;text-align:right;font-weight:900;background:#fde68a"></td><td id="ykTx" style="padding:4px 6px;text-align:right;font-weight:900;background:#dcfce7"></td><td id="ykTm" style="padding:4px 6px;text-align:right;font-weight:800"></td><td id="ykTb" style="padding:4px 6px;text-align:right;font-weight:900"></td><td></td><td></td></tr><tr style="background:#fff7ed"><td style="padding:5px;font-weight:800;position:sticky;left:0;background:#fff7ed">이모별 금액</td><td></td>';
  w.ws.forEach(function(n, j){ h += '<td id="ykWa' + j + '" style="padding:4px;text-align:center;font-weight:800;color:#b45309"></td>'; });
  h += '<td id="ykTa" style="padding:4px 6px;text-align:right;font-weight:900;color:#b45309"></td><td colspan="5"></td></tr></tfoot></table></div><div style="padding:8px 12px">' + _bsB("#b45309", "+ 품명 줄", "YK.ed.w.rows.push({item:'',kind:_ykKindOf(YK.ed.w),c:{}});draw()", "padding:4px 10px") + ' <span class="mut" style="font-size:12px">굴비/부세 버튼을 누르면 바뀌어요 — 엮거리 단가가 달라요</span></div></div>';
  }
  // 마리수 · 원가
  h += '<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;font-size:13px"><label>실제 마리수 <span class="mut" style="font-size:11px">(비우면 작업 마리수)</span><input type="number" value="' + esc(w.actual) + '" oninput="YK.ed.w.actual=this.value;_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>우리 인건비 (원)<input type="text" inputmode="numeric" data-won value="' + esc(_wonFmt(w.labor)) + '" oninput="YK.ed.w.labor=this.value;_ykRecalc()" placeholder="예: 300000" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>잡비 (원) <span class="mut" style="font-size:11px">(비우면 설정대로)</span><input type="text" inputmode="numeric" data-won value="' + esc(_wonFmt(w.misc)) + '" oninput="YK.ed.w.misc=this.value;_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label></div>';
  h += '<div id="ykCalc" style="margin-top:10px"></div></div>';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:20px">' + (E.id && can ? _bsB("#dc2626", "🗑 이 작업 삭제", "ykDel()") : "<span></span>") + (can ? _bsB("#16a34a", "💾 저장", "ykSave()", "padding:10px 26px;font-size:14px") : "") + '</div>';
  setTimeout(_ykRecalc, 0);
  return h;
}
function _ykCell(i, j, v){ var r = YK.ed.w.rows[i], n = YK.ed.w.ws[j]; r.c = r.c || {}; if(v === "" || !_bsN(v)) delete r.c[n]; else r.c[n] = _bsN(v); _ykRecalc(); }
function ykAddWorker(el){ var n = (el.value || "").trim(); el.value = ""; if(!n) return; if(n === "__new"){ n = (prompt("새 이모 이름 (별명)") || "").trim(); if(!n) return; } if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if(YK.ed.w.ws.indexOf(n) >= 0) return toast("이미 있어요", true); YK.ed.w.ws.push(n); draw(); }
function ykDelWorker(j){ var n = YK.ed.w.ws[j], has = YK.ed.w.rows.some(function(r){ return (r.c || {})[n]; }); if(has && !confirm(n + " 칸에 적은 두름이 있어요. 빼면 같이 지워져요. 뺄까요?")) return; YK.ed.w.ws.splice(j, 1); YK.ed.w.rows.forEach(function(r){ if(r.c) delete r.c[n]; }); draw(); }
function _ykRecalc(){
  if(!YK.ed) return; var w = YK.ed.w, c = _ykCalc(w), $ = function(id){ return document.getElementById(id); }, T = function(id, v){ var e = $(id); if(e) e.innerHTML = v; };
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {}, q = _bsN(m.qty); T("ykMm" + i, M.mi ? _bsW(q * M.mi) : (m.nm ? '<span style="color:#dc2626;font-size:11px">원료 목록에 없음</span>' : "")); T("ykMk" + i, M.kg ? _bsW(q * M.kg) : ""); T("ykMc" + i, _ykWon(q * (m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price)))); });
  c.rows.forEach(function(x, i){ T("ykRd" + i, x.doo ? _bsW(x.doo) : ""); var rx = $("ykRx" + i); if(rx){ rx.placeholder = x.doo ? _bsW(x.doo) : ""; rx.style.color = x.real != null && x.real !== x.doo ? "#c2410c" : "#111"; rx.title = x.real != null ? "실제 " + _bsW(x.pd) + "두름 (합계보다 " + (x.pd - x.doo >= 0 ? "+" : "") + _bsW(x.pd - x.doo) + ")" : ""; } T("ykRm" + i, x.pmi ? _bsW(x.pmi) : ""); T("ykRb" + i, x.box ? _bsW(x.boxes) : (x.item ? '<span style="color:#dc2626;font-size:11px">정품 없음</span>' : "")); T("ykRr" + i, x.box ? _bsW(x.rest) : ""); });
  w.ws.forEach(function(n, j){ var W = c.workers[n] || { 굴비: 0, 부세: 0, amt: 0 }; T("ykWd" + j, (W.굴비 ? '<span style="color:#b45309">굴비 ' + _bsW(W.굴비) + '</span><br>' : '') + (W.부세 ? '<span style="color:#0e7490">부세 ' + _bsW(W.부세) + '</span>' : '') || '-'); T("ykWa" + j, W.amt ? _ykWon(W.amt) : '-'); });
  T("ykTd", _bsW(c.doo)); T("ykTx", _bsW(c.pd) + (c.pd !== c.doo ? '<div style="font-size:11px;color:' + (c.pd > c.doo ? "#16a34a" : "#dc2626") + '">' + (c.pd > c.doo ? "+" : "") + _bsW(c.pd - c.doo) + '</div>' : '')); T("ykTm", _bsW(c.pmi)); T("ykTb", _bsW(c.boxes)); T("ykTa", _ykWon(c.weave));
  var el = $("ykCalc"); if(el) el.innerHTML = _ykCalcHtml(c);
  T("ykQSum", _ykQSum(w)); _ykQGTot(w);
}
function _ykCalcHtml(c){
  var st = _ykSet(), dcol = c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569";
  var h = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:10px">';
  [["원료 마리수", _bsW(c.matMi)], ["작업 마리수", _bsW(c.mi)], ["실제 마리수", _bsW(c.actual)], ["오차", '<span style="color:' + dcol + '">' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + ' ' + (c.diff > 0 ? "더 나옴" : c.diff < 0 ? "덜 나옴" : "맞음") + '</span>'], ["원료 kg", _bsW(c.matKg)], ["소금 (" + st.salt.pct + "%)", _bsW(Math.round(c.saltKg * 10) / 10) + 'kg']].forEach(function(b){ h += '<div style="background:#f8fafc;border-radius:8px;padding:7px 9px"><div style="font-size:11.5px;color:#64748b">' + b[0] + '</div><div style="font-size:16px;font-weight:900">' + b[1] + '</div></div>'; });
  h += '</div><div style="display:grid;grid-template-columns:' + (_ykMob() ? "1fr" : "1fr 1.4fr") + ';gap:10px"><div><b>💰 원가</b><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px">';
  [["원료", c.cost.mat], ["이모 엮거리 값", c.cost.weave], ["우리 인건비", c.cost.labor], ["엮거리 끈", c.cost.string], ["소금", c.cost.salt], ["냉동비", c.cost.freeze], ["포장비", c.cost.pack], ["잡비", c.cost.misc]].forEach(function(r){ h += '<tr><td style="padding:3px 0;color:#475569">' + r[0] + '</td><td style="text-align:right">' + _ykWon(r[1]) + '</td><td style="text-align:right;color:#94a3b8;font-size:11px;width:44px">' + (c.total ? Math.round(r[1] / c.total * 100) : 0) + '%</td></tr>'; });
  h += '<tr style="font-weight:900;border-top:2px solid #cbd5e1"><td style="padding:5px 0">총원가</td><td style="text-align:right;font-size:16px">' + _ykWon(c.total) + '</td><td></td></tr><tr><td style="color:#475569;font-size:12px">두름당 원가</td><td style="text-align:right;font-size:12px">' + (c.doo ? _ykWon(c.total / c.doo) : '-') + '</td><td></td></tr></table></div>';
  h += '<div style="overflow-x:auto;min-width:0"><b>📈 마진</b><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px"><tr style="background:#f8fafc"><th style="text-align:left;padding:3px">기준</th><th style="text-align:right;background:#fffbeb">두름당<br><span style="font-weight:400;font-size:11px">평균 값</span></th><th style="text-align:right;background:#fffbeb">두름당<br><span style="font-weight:400;font-size:11px">남는 돈</span></th><th style="text-align:right">생산금액<br><span style="font-weight:400;font-size:11px">합계</span></th><th style="text-align:right">마진<br><span style="font-weight:400;font-size:11px">합계</span></th><th style="text-align:right">마진율</th></tr>';
  var PD = c.pd || c.doo;
  h += '<tr style="color:#475569"><td style="padding:4px 3px">총원가</td><td style="text-align:right;font-weight:800;background:#fffbeb">' + (PD ? _ykWon(c.total / PD) : '-') + '</td><td style="background:#fffbeb"></td><td style="text-align:right">' + _ykWon(c.total) + '</td><td></td><td></td></tr>';
  [["판매가", c.rev.sale], ["도매가", c.rev.whole], ["원가표(기준가)", c.rev.cost], ["조절도매가", c.rev.adj]].forEach(function(r){ if(r[0] === "조절도매가" && !r[1]) return; var m = r[1] - c.total, p = r[1] ? m / r[1] : null; h += '<tr><td style="padding:4px 3px">' + r[0] + '</td><td style="text-align:right;font-weight:900;font-size:14px;background:#fffbeb">' + (PD && r[1] ? _ykWon(r[1] / PD) : '-') + '</td><td style="text-align:right;font-weight:800;background:#fffbeb;color:' + (m < 0 ? "#dc2626" : "#16a34a") + '">' + (PD && r[1] ? (m > 0 ? "+" : "") + _ykWon(m / PD) : '-') + '</td><td style="text-align:right;font-size:12px;color:#475569">' + _ykWon(r[1]) + '</td><td style="text-align:right;font-size:12px;color:' + (m < 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon(m) + '</td><td style="text-align:right;font-weight:900;font-size:15px;color:' + (p == null ? "#94a3b8" : p < 0 ? "#dc2626" : "#16a34a") + '">' + (p == null ? '-' : Math.round(p * 1000) / 10 + '%') + '</td></tr>'; });
  h += '</table><div style="font-size:12px;font-weight:700;margin-top:8px">품명별 — 모두 두름당 값 (원가는 원가표 금액 비율로 나눔)</div>' + _ykRatioMsg(c) + '<table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr style="background:#f8fafc"><th style="text-align:left;padding:2px">품명</th><th style="text-align:right">두름</th><th style="text-align:right">원가</th><th style="text-align:right">판매가</th><th style="text-align:right">도매가</th><th style="text-align:right">남는 돈<br><span style="font-weight:400;font-size:10.5px">도매−원가</span></th><th style="text-align:right">마진율</th></tr>';
  c.rows.filter(function(x){ return x.doo; }).forEach(function(x){ var wd = x.P.whole, p = wd ? (wd - x.unit) / wd : null; h += '<tr><td style="padding:2px">' + esc(x.item) + ' <span style="font-size:10.5px;color:#64748b">' + x.kind + '</span>' + (x.I.msg ? ' <span style="font-size:10.5px;color:#7c3aed">' + esc(x.I.msg) + '</span>' : '') + '</td><td style="text-align:right">' + _bsW(x.pd) + '</td><td style="text-align:right">' + _ykWon(x.unit) + _ykVsTbl(x.unit, x.P.cost, c.cost.mat > 0 && c.tblCover >= 0.8) + '</td><td style="text-align:right">' + (x.P.sale ? _ykWon(x.P.sale) : '-') + '</td><td style="text-align:right;font-weight:800">' + (wd ? _ykWon(wd) : '-') + '</td><td style="text-align:right;font-weight:800;color:' + (wd - x.unit < 0 ? "#dc2626" : "#16a34a") + '">' + (wd ? (wd - x.unit > 0 ? "+" : "") + _ykWon(wd - x.unit) : '-') + '</td><td style="text-align:right;font-weight:800;color:' + (p == null ? "#94a3b8" : p < 0 ? "#dc2626" : "#16a34a") + '">' + (p == null ? '-' : Math.round(p * 1000) / 10 + '%') + '</td></tr>'; });
  return h + '</table></div></div>';
}
function ykSave(){
  var E = YK.ed, w = JSON.parse(JSON.stringify(E.w));
  if(!w.dt) return toast("작업일을 넣어 주세요", true);
  w.rate = _ykRate(w);
  ["labor", "misc"].forEach(function(k){ if(w[k] !== "" && w[k] != null) w[k] = _bsN(w[k]); });   // 콤마 붙은 글자 → 숫자로 저장
  w.mats = w.mats.filter(function(m){ return String(m.nm).trim() || _bsN(m.qty); }).map(function(m){ return { nm: String(m.nm).trim(), qty: _bsN(m.qty), price: m.price === "" || m.price == null ? "" : _bsN(m.price) }; });
  w.rows = w.rows.filter(function(r){ return String(r.item).trim() || Object.keys(r.c || {}).length; }).map(function(r){ return { item: String(r.item).trim(), kind: _ykRK(r), c: r.c || {} }; });
  if(w.rows.some(function(r){ return !r.item; })) return toast("품명이 빈 줄이 있어요", true);
  if(_ykUnregPop(w)) return;
  w.upAt = new Date().toISOString(); w.upBy = CID || "";
  var ref = E.id ? _ykRef("works/" + E.id) : _ykRef("works").push(), key = E.id || ref.key, up = {}; up["works/" + key] = w;
  w.ws.forEach(function(n, i){ if(!((_ykS().people || {})[n])) up["people/" + n] = { on: false, ord: i }; else up["people/" + n + "/ord"] = i; });
  showLoading("저장 중...");
  _ykRef().update(_bsClean ? _bsClean(up) : up).then(function(){ hideLoading(); YK.D.works = YK.D.works || {}; YK.D.works[key] = w; YK.D.people = YK.D.people || {}; Object.keys(up).forEach(function(p){ var a = p.split("/"); if(a[0] !== "people") return; if(a[2] === "ord"){ YK.D.people[a[1]] = YK.D.people[a[1]] || {}; YK.D.people[a[1]].ord = up[p]; } else YK.D.people[a[1]] = up[p]; }); YK.ed.id = key; toast("저장했어요 — " + _ykLot(w.dt)); draw(); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
function ykDel(){ var E = YK.ed; if(!confirm(E.w.dt + " 작업을 지울까요? (이모 정산 금액도 같이 빠져요)")) return; _ykRef("works/" + E.id).remove().then(function(){ delete YK.D.works[E.id]; YK.ed = null; toast("지웠어요"); draw(); }); }

// ════════ 👵 이모 정산 (번 돈 − 준 돈 = 미수) ════════
function dYkPay(){
  var g = _ykGate(); if(g) return g;
  var f = YK.pf || "", t = YK.pt || "", per = !!(f || t), A = _ykPayInfo(), P = per ? _ykPayInfo(f, t) : A, S = _ykS(), can = _ykCan();
  var names = Object.keys(P).sort(function(a, b){ return P[b].due - P[a].due || a.localeCompare(b); });
  var tot = names.reduce(function(a, n){ return a + P[n].due; }, 0), totA = Object.keys(A).reduce(function(a, n){ return a + A[n].due; }, 0);
  var h = _ykHead("👵 이모 정산", "엮은 두름 × 단가 = 번 돈 · 돈 주면 미수에서 빠짐", can ? _bsB("#16a34a", "💵 지급 넣기", "ykPayEdit('')", "padding:9px 18px") : "");
  h += _ykPerBar(f, t);
  if(_ykBoss()) h += '<div style="margin:-4px 0 10px;text-align:right">' + _bsB("#1d4ed8", "🏦 다건이체 엑셀 만들기", "ykBulkPay()", "padding:8px 16px") + '</div>';
  h += '<div class="card" style="margin-bottom:10px;font-size:14px">' + (per ? '<b>' + _ykPerTxt(f, t) + '</b> 남은 돈 <b style="font-size:20px;color:' + (tot > 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon(tot) + '원</b> <span class="mut" style="font-size:12px">(이 기간 작업 번 돈 − 이 기간에 준 돈)</span> · ' : '') + '전체 미수 합계 <b style="font-size:' + (per ? 15 : 20) + 'px;color:' + (totA > 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon(totA) + '원</b> <span class="mut" style="font-size:12px">· 엮거리 단가: 굴비 ' + _ykWon(_ykSet().rate.굴비) + ' · 부세 ' + _ykWon(_ykSet().rate.부세) + ' (두름당)</span></div>';
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px"><thead><tr style="background:#fff7ed">';
  (per ? ["이모", "굴비 두름", "부세 두름", "기간 번 돈", "기간에 준 돈", "기간 남은 돈", "마지막 작업", "", "전체 미수"] : ["이모", "굴비 두름", "부세 두름", "번 돈", "준 돈", "미수 (남은 돈)", "마지막 작업", ""]).forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;text-align:' + (i >= 1 && i <= 5 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!names.length) h += '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8">아직 없어요</td></tr>';
  names.forEach(function(n){ var x = P[n];
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(n) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(x.굴비) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _bsW(x.부세) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(x.earn) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ykWon(x.paid) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;font-size:15px;color:' + (x.due > 0 ? "#dc2626" : x.due < 0 ? "#7c3aed" : "#16a34a") + '">' + _ykWon(x.due) + (x.due < 0 ? ' <span style="font-size:11px">(더 줌)</span>' : '') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + (x.last ? _bsDH(x.last) : '-') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + (can && x.due > 0 ? _bsB("#16a34a", "💵 지급", "ykPayEdit('','" + esc(n) + "')", "padding:3px 9px") : "") + '</td>' + (per ? '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;color:#475569">' + _ykWon(A[n] ? A[n].due : 0) + '</td>' : '') + '</tr>'; });
  if(per && names.length){ var sm = function(k){ return names.reduce(function(a, n){ return a + P[n][k]; }, 0); }; h += '<tr style="background:#fff7ed;font-weight:800"><td style="padding:6px">합계</td><td style="padding:6px;text-align:right">' + _bsW(sm("굴비")) + '</td><td style="padding:6px;text-align:right">' + _bsW(sm("부세")) + '</td><td style="padding:6px;text-align:right">' + _ykWon(sm("earn")) + '</td><td style="padding:6px;text-align:right">' + _ykWon(sm("paid")) + '</td><td style="padding:6px;text-align:right;color:#dc2626">' + _ykWon(tot) + '</td><td></td><td></td><td style="padding:6px;text-align:right">' + _ykWon(totA) + '</td></tr>'; }
  h += '</tbody></table></div></div>';
  var pays = S.pays || {}, pk = Object.keys(pays).filter(function(k){ return _ykInPer(pays[k].dt, f, t); }).sort(function(a, b){ return String(pays[b].dt).localeCompare(String(pays[a].dt)); });
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px"><b>지급 기록</b>' + (per ? ' <span class="mut" style="font-size:12px">(' + _ykPerTxt(f, t) + ')</span>' : '') + '</div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f0fdf4"><th style="padding:6px;text-align:left">날짜</th><th style="text-align:left">이모</th><th style="text-align:right">금액</th><th style="text-align:left;padding-left:10px">비고</th><th></th></tr>';
  if(!pk.length) h += '<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">없음</td></tr>';
  pk.forEach(function(k){ var p = pays[k]; h += '<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">' + _bsDH(p.dt) + '</td><td style="border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(p.w) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:800">' + _ykWon(p.amt) + '</td><td style="padding-left:10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + esc(p.note || "") + '</td><td style="border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "ykPayEdit('" + k + "')", "padding:2px 8px") : "") + '</td></tr>'; });
  return h + '</table></div>';
}
function _ykYmAdd(ym, d){ var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + d; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + "-" + ("0" + (m + 1)).slice(-2); }
function _ykYmLast(ym){ return ym + "-" + ("0" + new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate()).slice(-2); }
function _ykYmPick(cur, fn, has){
  var m0 = _bsToday().slice(0, 7), ms = {}; Object.keys(has || {}).forEach(function(k){ ms[k] = 1; }); ms[m0] = 1; if(cur && cur.length === 7) ms[cur] = 1;
  var ys = {}; Object.keys(ms).forEach(function(k){ ys[k.slice(0, 4)] = 1; }); if(cur && cur.length === 4) ys[cur] = 1;
  var nav = function(d){ if(cur && cur.length === 7) return _ykYmAdd(cur, d); if(cur && cur.length === 4) return String(+cur + d); return _ykYmAdd(m0, d < 0 ? -1 : 1); };
  var btn = function(lb, v, on, st, tt){ return '<button class="btn" title="' + (tt || "") + '" style="padding:6px 12px;font-size:13px;background:' + (on ? "#ea580c" : "#fff") + ';color:' + (on ? "#fff" : "#9a3412") + ';border:1px solid #fdba74;' + (st || "") + '" onclick="' + fn + '(\'' + v + '\')">' + lb + '</button>'; };
  var h = btn("전체", "", cur === "") + btn("◀", nav(-1), false, "font-weight:900;padding:6px 10px", cur && cur.length === 4 ? "지난해" : "지난달");
  h += '<select onchange="' + fn + '(this.value)" style="width:auto;min-width:150px;padding:7px 10px;font-size:14.5px;font-weight:900;border:2px solid #ea580c;border-radius:8px;color:#9a3412;background:#fff7ed;cursor:pointer">';
  if(cur === "") h += '<option value="" selected>전체 기간</option>';
  if(cur === null) h += '<option value="" selected disabled>직접 고른 기간</option>';
  Object.keys(ys).sort().reverse().forEach(function(y){
    h += '<optgroup label="' + y + '년"><option value="' + y + '"' + (cur === y ? " selected" : "") + '>' + y + '년 전체</option>';
    Object.keys(ms).filter(function(k){ return k.slice(0, 4) === y; }).sort().reverse().forEach(function(k){ h += '<option value="' + k + '"' + (cur === k ? " selected" : "") + '>' + y + '년 ' + (+k.slice(5)) + '월' + (k === m0 ? " (이번 달)" : has && has[k] ? "" : " ·") + '</option>'; });
    h += '</optgroup>'; });
  h += '</select>' + btn("▶", nav(1), false, "font-weight:900;padding:6px 10px", cur && cur.length === 4 ? "다음해" : "다음달");
  return h + (cur === m0 ? "" : btn("이번 달", m0, false, "font-size:12px;padding:5px 9px"));
}
// 기간 막대 (월 고르기 + 직접 날짜 ~ 날짜) — fnR(f,t) 로 기간 바꿈
function _ykRangeBar(f, t, fnR, fnYm, note){
  var h = '<div class="card" style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px"><b>📅 기간</b>' + _ykYmPick(_ykPerCur(f, t), fnYm, _ykWorkYms());
  h += '<span style="margin-left:8px;color:#475569">직접:</span><input id="yk_rf" type="date" value="' + esc(f) + '" onchange="' + fnR + '(this.value,document.getElementById(\'yk_rt\').value)" style="width:150px;display:inline-block;padding:6px;border:1px solid #cbd5e1;border-radius:6px"> ~ <input id="yk_rt" type="date" value="' + esc(t) + '" onchange="' + fnR + '(document.getElementById(\'yk_rf\').value,this.value)" style="width:150px;display:inline-block;padding:6px;border:1px solid #cbd5e1;border-radius:6px">';
  return h + (note ? '<span class="mut" style="font-size:12px;width:100%">' + note + '</span>' : '') + '</div>';
}
// 작업 목록 기간 (처음 열면 이번 달)
function _ykWPer(){ if(YK.wf === undefined){ var m0 = _bsToday().slice(0, 7); YK.wf = m0 + "-01"; YK.wt = _ykYmLast(m0); } return [YK.wf || "", YK.wt || ""]; }
function ykWPer(f, t){ YK.wf = f || ""; YK.wt = t || ""; if(YK.wf && YK.wt && YK.wf > YK.wt){ var x = YK.wf; YK.wf = YK.wt; YK.wt = x; } draw(); }
function ykWPerYm(v){ if(!v) return ykWPer("", ""); if(v.length === 4) return ykWPer(v + "-01-01", v + "-12-31"); ykWPer(v + "-01", _ykYmLast(v)); }
function _ykPerCur(f, t){ if(!f && !t) return ""; if(f && t && f.slice(5) === "01-01" && t.slice(5) === "12-31" && f.slice(0, 4) === t.slice(0, 4)) return f.slice(0, 4); if(f && t && f.slice(8) === "01" && f.slice(0, 7) === t.slice(0, 7) && (t === _ykYmLast(f.slice(0, 7)) || t.slice(8) === "31")) return f.slice(0, 7); return null; }
function ykPerYm(v){ if(!v) return ykPer("", ""); if(v.length === 4) return ykPer(v + "-01-01", v + "-12-31"); ykPer(v + "-01", _ykYmLast(v)); }
function ykYm(v){ YK.ym = v || ""; draw(); }
function _ykWorkYms(){ var S = _ykS(), m = {}; Object.keys(S.works || {}).forEach(function(id){ var d = String(S.works[id].dt || ""); if(d) m[d.slice(0, 7)] = 1; }); return m; }
function _ykPerTxt(f, t){ return (f ? _bsDH(f) : "처음") + " ~ " + (t ? _bsDH(t) : "지금"); }
function _ykPerBar(f, t){
  return _ykRangeBar(f, t, "ykPer", "ykPerYm", CTAB === "ykCost" ? '작업 날짜 기준으로 그 기간 작업들을 모아 품명별 평균을 내요 (두름 많이 한 작업일수록 더 크게 반영).' : CTAB === "ykAnal" ? '작업 날짜 기준으로 그 기간 작업들을 비교해요.' : '작업 날짜 기준으로 그 기간 엮은 두름·번 돈을 모아요. 지급도 그 기간에 준 것만 빼요.');
}
// ════════ 📊 품명별 평균 원가표 (기간) ════════
//   작업마다 총원가를 품명별 원가표 금액 비율로 나눈 값(_ykCalc 의 alloc)을 기간 동안 더해서 ÷ 두름 = 가중 평균 원가
function _ykCostAgg(f, t){
  var S = _ykS(), m = {}, n = 0;
  Object.keys(S.works || {}).forEach(function(id){ var w = S.works[id]; if(!_ykInPer(w.dt, f, t)) return; var c = _ykCalc(w); if(!c.doo) return; n++;
    c.rows.forEach(function(x){ if(!x.pd) return; var k = x.item || "(품명 없음)", g = m[k] || (m[k] = { item: k, kind: x.kind, I: x.I, works: 0, doo: 0, mi: 0, boxes: 0, cost: 0, mat: 0, weave: 0, lo: null, hi: null, last: "", lastU: 0 });
      var share = c.total ? x.alloc / c.total : 0, mat = c.cost.mat * share, wv = x.doo * _bsN(_ykRate(w)[x.kind || "굴비"]);
      g.works++; g.doo += x.pd; g.mi += x.pmi; g.boxes += x.boxes; g.cost += x.alloc; if(c.cost.mat > 0 && c.tblCover >= 0.8){ g.costP = (g.costP || 0) + x.alloc; g.dooP = (g.dooP || 0) + x.pd; g.worksP = (g.worksP || 0) + 1; } g.mat += mat; g.weave += wv;
      if(g.lo == null || x.unit < g.lo) g.lo = x.unit; if(g.hi == null || x.unit > g.hi) g.hi = x.unit; if(w.dt >= g.last){ g.last = w.dt; g.lastU = x.unit; } }); });
  return { n: n, list: Object.keys(m).map(function(k){ var g = m[k]; g.avg = g.doo ? g.cost / g.doo : 0; g.matU = g.doo ? g.mat / g.doo : 0; g.weaveU = g.doo ? g.weave / g.doo : 0; g.etcU = g.avg - g.matU - g.weaveU; g.whole = _bsN(g.I.whole); g.sale = _bsN(g.I.sale); g.tbl = _bsN(g.I.cost); g.mr = g.whole ? (g.whole - g.avg) / g.whole : null; return g; })
    .sort(function(a, b){ return b.doo - a.doo; }) };
}
// 맞출 원가 = 그 기간 실제 평균 원가(두름당)를 100원 단위로 반올림 — 원가표가 이 값이면 '원가 = 본전(마진 0%)'
function _ykRecU(g){ return g.dooP ? Math.round(g.costP / g.dooP / 100) * 100 : 0; }   // 원료값 들어간 작업만
function _ykRecCell(g, pr){
  var key = _ykKey(g.item), has = !!(_ykS().items || {})[key], rec = _ykRecU(g), d = rec - g.tbl;
  if(!g.dooP) return '<span style="font-size:11px;color:#94a3b8">원료값 넣은 작업이 없어서 계산 못 해요</span>';
  if(Math.abs(d) < 100) return '<span style="color:#16a34a;font-weight:800">✓ 맞음</span>';
  var h = '<b style="font-size:14px">' + _ykWon(rec) + '</b>' + (g.worksP < g.works ? '<div style="font-size:10.5px;color:#64748b">원료값 있는 ' + g.worksP + '번 기준</div>' : '') + '<div style="font-size:11px;color:' + (d > 0 ? "#dc2626" : "#2563eb") + '">' + (g.tbl ? (d > 0 ? "▲ " : "▼ ") + _ykWon(Math.abs(d)) + (d > 0 ? " 올려야" : " 내려도 됨") : "원가표 비어 있음") + '</div>';
  if(!pr && has && _ykCan()) h += '<button class="btn" style="margin-top:3px;background:#16a34a;color:#fff;padding:2px 8px;font-size:11.5px" onclick="ykRecSet([\'' + esc(key) + '\'])">바꾸기</button>';
  return h;
}
function ykRecSet(keys){
  var A = _ykCostAgg(YK.pf || "", YK.pt || ""), by = {}; A.list.forEach(function(g){ by[_ykKey(g.item)] = g; });
  var I = _ykS().items || {}, up = {}, lines = [];
  keys.forEach(function(k){ var g = by[k]; if(!g || !I[k] || !g.dooP) return; var rec = _ykRecU(g); if(Math.abs(rec - _bsN(I[k].cost)) < 100) return; up["items/" + k + "/cost"] = rec; var ph = _ykPxHist(I[k], Object.assign({}, I[k], { cost: rec }), _bsToday()); if(ph) up["items/" + k + "/ph"] = ph; lines.push(I[k].nm + " : " + _ykWon(I[k].cost || 0) + " → " + _ykWon(rec)); });
  if(!lines.length) return toast("바꿀 원가가 없어요 — 이미 맞아요");
  if(!confirm("원가표(두름당)를 실제 평균 원가로 바꿀까요? (" + _ykPerTxt(YK.pf || "", YK.pt || "").replace(/<[^>]+>/g, "") + " 작업 기준)\n\n" + lines.slice(0, 30).join("\n") + (lines.length > 30 ? "\n… 외 " + (lines.length - 30) + "개" : ""))) return;
  _ykRef().update(up).then(function(){ Object.keys(up).forEach(function(p){ var a = p.split("/"); I[a[1]][a[2]] = up[p]; }); toast("원가표 " + lines.length + "개 바꿨어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function _ykCostTable(A, pr){
  var td = 'style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right"', P = function(v){ return v == null ? "-" : '<b style="color:' + (v < 0 ? "#dc2626" : v < 0.15 ? "#ea580c" : "#16a34a") + '">' + (Math.round(v * 1000) / 10) + '%</b>'; };
  var h = '<table class="ct" style="width:100%;border-collapse:collapse;font-size:13px;min-width:1100px"><thead><tr style="background:#fff7ed">';
  ["품명", "구분", "작업", "두름", "박스", "원물값 /두름", "엮거리 /두름", "그 밖 /두름", "평균 원가 /두름", "낮음 ~ 높음", "최근", "원가표", "→ 맞출 원가", "도매가", "마진율 (도매)", "판매가"].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;white-space:nowrap;text-align:' + (i >= 2 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!A.list.length) h += '<tr><td colspan="16" style="padding:30px;text-align:center;color:#94a3b8">이 기간에 작업이 없어요</td></tr>';
  var T = { doo: 0, boxes: 0, cost: 0, mat: 0, weave: 0, whole: 0, wc: 0 };
  A.list.forEach(function(g){ T.doo += g.doo; T.boxes += g.boxes; T.cost += g.cost; T.mat += g.mat; T.weave += g.weave; T.whole += g.doo * g.whole; if(g.whole) T.wc += g.cost;
    var dif = g.tbl ? g.avg - g.tbl : 0;
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800;white-space:nowrap">' + esc(g.item) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + esc(g.kind) + '</td><td ' + td + '>' + g.works + '번</td><td ' + td + '><b>' + _bsW(g.doo) + '</b></td><td ' + td + '>' + _bsW(g.boxes) + '</td>';
    h += '<td ' + td + '>' + _ykWon(g.matU) + '</td><td ' + td + '>' + _ykWon(g.weaveU) + '</td><td ' + td + '>' + _ykWon(g.etcU) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;font-size:14.5px;background:#fffbeb">' + _ykWon(g.avg) + '</td>';
    h += '<td ' + td + '><span style="font-size:12px;color:#475569">' + (g.works > 1 ? _ykWon(g.lo) + ' ~ ' + _ykWon(g.hi) : '-') + '</span></td><td ' + td + '><span style="font-size:12px">' + _ykWon(g.lastU) + '<br><span style="color:#94a3b8">' + _bsMD(g.last) + '</span></span></td>';
    h += '<td ' + td + '>' + (g.tbl ? _ykWon(g.tbl) + (dif ? '<br><span style="font-size:11.5px;color:' + (dif > 0 ? "#dc2626" : "#16a34a") + '">' + (dif > 0 ? "▲ " : "▼ ") + _ykWon(Math.abs(dif)) + '</span>' : '') : '-') + '</td><td ' + td.replace('text-align:right"', 'text-align:right;background:#f0fdf4"') + '>' + _ykRecCell(g, pr) + '</td><td ' + td + '>' + (g.whole ? _ykWon(g.whole) : '-') + '</td><td ' + td + '>' + P(g.mr) + '</td><td ' + td + '>' + (g.sale ? _ykWon(g.sale) : '-') + '</td></tr>'; });
  if(A.list.length > 1) h += '<tr style="background:#fff7ed;font-weight:800"><td style="padding:6px" colspan="3">전체</td><td style="padding:6px;text-align:right">' + _bsW(T.doo) + '</td><td style="padding:6px;text-align:right">' + _bsW(T.boxes) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.mat / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.weave / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? (T.cost - T.mat - T.weave) / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.cost / T.doo : 0) + '</td><td colspan="4" style="padding:6px;text-align:right;font-size:12px">총원가 ' + _ykWon(T.cost) + '원' + (T.whole ? ' · 도매 마진 ' + P((T.whole - T.wc) / T.whole) + (T.wc < T.cost ? ' <span style="font-weight:400">(도매가 있는 품명만)</span>' : '') : '') + '</td><td></td><td></td></tr>';
  return h + '</tbody></table>';
}
function dYkCost(){
  var g = _ykGate(); if(g) return g;
  var f = YK.pf || "", t = YK.pt || "", A = _ykCostAgg(f, t);
  var h = _ykHead("📊 품명별 평균 원가표", "작업한 것들로 품명마다 두름당 원가 평균 · 원물값 따로", _bsB("#475569", "🖨 인쇄", "ykPrintCost()", "padding:8px 16px"));
  h += _ykPerBar(f, t);
  h += '<div class="card" style="margin-bottom:10px;font-size:13.5px"><b>' + _ykPerTxt(f, t) + '</b> · 작업 ' + A.n + '번 · 품명 ' + A.list.length + '개 <span class="mut" style="font-size:12px">— 한 작업의 총원가(원료·엮거리·인건비·끈·소금·냉동·포장·잡비)를 품명별 원가표 금액 비율로 나눠서 더함. 원가표 칸의 ▲는 실제 평균이 원가표보다 비쌈</span></div>';
  var miss = A.list.filter(function(g){ return g.dooP && (_ykS().items || {})[_ykKey(g.item)] && Math.abs(_ykRecU(g) - g.tbl) >= 100; });
  if(miss.length) h += '<div class="card" style="margin-bottom:10px;background:#fff7ed;border:2px solid #fdba74;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-size:13.5px"><b style="color:#c2410c">📝 원가표가 실제 원가와 다른 품명 ' + miss.length + '개</b><div class="mut" style="font-size:12px">초록 칸 <b>→ 맞출 원가</b> = 이 기간 실제 평균 원가(두름당, 100원 단위, <b>원료값 넣고 품명이 정품표에 있는 작업만</b>, 총원가는 원가표 금액 비율로 나눔). 원가표를 이 값으로 바꾸면 원가표 기준 마진 0% = 본전이 돼요. 기간을 먼저 이번 시즌으로 골라 주세요.</div></div>' + (_ykCan() ? _bsB("#16a34a", "원가표 " + miss.length + "개 한번에 맞추기", "ykRecSet(" + JSON.stringify(miss.map(function(g){ return _ykKey(g.item); })).replace(/"/g, "&quot;") + ")", "padding:9px 16px;font-weight:800") : '') + '</div>';
  return h + '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto">' + _ykCostTable(A) + '</div></div>' + _ykGochuCard();
}
function ykPrintCost(){
  var f = YK.pf || "", t = YK.pt || "", A = _ykCostAgg(f, t), w = window.open("", "_blank"); if(!w) return toast("팝업이 막혔어요", true);
  w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>품명별 평균 원가표</title><style>body{font-family:"Malgun Gothic",sans-serif;margin:14mm}h2{margin:0 0 4px}table{font-size:11px!important;min-width:0!important}th,td{border:1px solid #999!important;padding:4px!important}@page{size:A4 landscape}</style></head><body><h2>품명별 평균 원가표</h2><div style="font-size:12px;margin-bottom:8px">' + _ykPerTxt(f, t) + ' · 작업 ' + A.n + '번 · 뽑은 날 ' + _bsDH(_bsToday()) + '</div>' + _ykCostTable(A) + '<script>setTimeout(function(){print()},300)<\/script></body></html>');
  w.document.close();
}
function ykPer(f, t){ YK.pf = f || ""; YK.pt = t || ""; if(YK.pf && YK.pt && YK.pf > YK.pt){ var x = YK.pf; YK.pf = YK.pt; YK.pt = x; } draw(); }
function ykPayEdit(id, who){
  var per = !!(YK.pf || YK.pt), P = per && !id ? _ykPayInfo(YK.pf, YK.pt) : _ykPayInfo(), p = id ? _ykS().pays[id] : { dt: _bsToday(), w: who || "", amt: who && P[who] ? Math.max(0, Math.round(P[who].due)) : "", note: per && who ? _ykPerTxt(YK.pf, YK.pt) + " 엮거리값" : "" };
  var h = '<h3 style="margin:0 0 10px">💵 ' + (id ? "지급 고치기" : "지급 넣기") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">';
  h += '<label>날짜<input id="yp_dt" type="date" value="' + esc(p.dt) + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label>이모<select id="yp_w" onchange="var x=_ykPayInfo()[this.value];document.getElementById(\'yp_due\').textContent=x?_ykWon(x.due)+\'원\':\'-\'" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px">' + Object.keys(P).sort().map(function(n){ return '<option' + (n === p.w ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("") + '</select></label>';
  h += '<label>금액 (원)<input id="yp_amt" type="text" inputmode="numeric" data-won value="' + esc(_wonFmt(p.amt)) + '" style="width:100%;padding:7px;border:2px solid #16a34a;border-radius:6px;box-sizing:border-box;font-size:16px;font-weight:800"></label><div>지금 미수<div id="yp_due" style="font-size:18px;font-weight:900;color:#dc2626;margin-top:6px">' + (P[p.w] ? _ykWon(P[p.w].due) + '원' : '-') + '</div></div></div>';
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
  var st = _ykSet(), S = _ykS(), can = _ykCan(), N = function(lb, path, v, ex){ var won = /^(rate\.|string\.price|salt\.price|freeze\.val|pack\.val)/.test(path); return '<label style="font-size:13px">' + lb + '<input ' + (can ? '' : 'disabled ') + (won ? 'type="text" inputmode="numeric" data-won' : 'type="number" step="any"') + ' value="' + esc(won ? _wonFmt(v) : v) + '" data-p="' + path + '" class="ykSetIn" ' + (ex || "") + ' style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var Sel = function(path, v, opts){ return '<select ' + (can ? '' : 'disabled ') + 'data-p="' + path + '" class="ykSetIn" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px">' + opts.map(function(o){ return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>'; };
  var h = _ykHead("⚙️ 엮거리 설정", "원가 단가 · 정품 · 원료 · 이모 명단 · 라벨 모양", can ? _bsB("#7c3aed", "🏷 라벨 모양 고치기", "ykLblEdit()", "padding:9px 14px") + " " + _bsB("#16a34a", "💾 원가 설정 저장", "ykSetSave()", "padding:9px 18px") : "");
  h += '<div class="card" style="margin-bottom:10px"><b>💰 원가 단가</b><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:8px">';
  h += N("엮거리 값 · 굴비 (두름당)", "rate.굴비", st.rate.굴비) + N("엮거리 값 · 부세 (두름당)", "rate.부세", st.rate.부세);
  h += N("엮거리 끈 한 다발 값 (원)", "string.price", st.string.price) + N("한 다발로 엮는 두름 수", "string.per", st.string.per);
  h += N("굴비 소금 비율 (%)", "salt.pct", st.salt.pct) + N("부세 소금 비율 (%)", "salt.pctB", st.salt.pctB != null && st.salt.pctB !== "" ? st.salt.pctB : st.salt.pct) + N("소금 kg당 값 (원)", "salt.price", st.salt.price);
  h += '<label style="font-size:13px">냉동비 기준' + Sel("freeze.mode", st.freeze.mode, [["kg", "원료 kg당"], ["box", "박스당"], ["doo", "두름당"], ["amt", "한 작업에 얼마"]]) + '</label>' + N("냉동비 (원)", "freeze.val", st.freeze.val);
  h += N("포장비 · 박스당 (박스·트레이·비닐·라벨)", "pack.val", st.pack.val);
  h += '<label style="font-size:13px">잡비 기준' + Sel("misc.mode", st.misc.mode, [["amt", "한 작업에 얼마 (원)"], ["pct", "원가의 % "]]) + '</label>' + N("잡비 (원 또는 %)", "misc.val", st.misc.val) + N("박스당 라벨 장수", "lblPer", st.lblPer);
  h += '</div><div class="mut" style="font-size:12px;margin-top:6px">우리 인건비는 작업마다 금액으로 넣어요 · 잡비도 작업에서 직접 고칠 수 있어요</div></div>';
  // 이모 명단
  var pe = Object.keys(S.people || {}).sort();
  h += '<div class="card" style="margin-bottom:10px"><b>👵 이모 명단</b>' + (can ? ' <span style="display:inline-flex;gap:4px">' + _bsB("#15803d", "📥 엑셀 양식", "ykXlTpl('people')", "padding:5px 9px") + _bsB("#0e7490", "📤 엑셀로 등록", "ykXlPick('people')", "padding:5px 9px") + '</span>' : '') + ' <span class="mut" style="font-size:12px">— <b style="color:#7c3aed">체크 = 📌 고정</b>: 새 작업을 만들면 체크한 이모가 저절로 들어가요 · 작업 표에 처음 넣은 이모는 명단에만 추가돼요(고정 안 됨)</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
  pe.forEach(function(n){ var on = S.people[n].on !== false; h += '<label style="border:1px solid ' + (on ? "#b45309" : "#cbd5e1") + ';background:' + (on ? "#fff7ed" : "#f1f5f9") + ';border-radius:14px;padding:3px 10px;font-size:13px;cursor:pointer"><input type="checkbox" ' + (on ? "checked" : "") + (can ? '' : ' disabled') + ' onchange="ykPerson(\'' + esc(n) + '\',this.checked)"> ' + esc(n) + (can ? ' <a href="javascript:void 0" title="명단에서 지우기" onclick="event.preventDefault();event.stopPropagation();ykPersonDel(\'' + esc(n) + '\')" style="color:#dc2626;text-decoration:none;font-weight:900;margin-left:2px">✕</a>' : '') + '</label>'; });
  h += (can ? '<input id="ykNewP" placeholder="이름" style="width:90px;padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + _bsB("#b45309", "+", "var v=document.getElementById('ykNewP').value.trim();if(v)ykPerson(v,true)", "padding:3px 10px") : "") + '</div>' + _ykInfoBox() + '</div>';
  // 정품
  var I = S.items || {}, ik = _ykItemKeys();
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px"><b>📦 정품 (품명 · 가격 · 라벨) ' + ik.length + '개</b><span>' + (can ? ' <span style="display:inline-flex;gap:4px">' + _bsB("#15803d", "📥 엑셀 양식", "ykXlTpl('item')", "padding:5px 9px") + _bsB("#0e7490", "📤 엑셀로 등록", "ykXlPick('item')", "padding:5px 9px") + '</span>' : '') + '' + (can ? (_ykGridOn() ? '<span style="display:inline-flex;border:2px solid #334155;border-radius:8px;overflow:hidden;margin:0 6px;vertical-align:middle">' + [["reg", "📝 기존 방식"], ["xl", "⌨ 엑셀 방식"]].map(function(o){ var on = _ykIMode() === o[0]; return '<button class="btn" onclick="_ykSetIMode(\'' + o[0] + '\')" style="border-radius:0;padding:5px 10px;font-size:12.5px;font-weight:800;background:' + (on ? "#334155" : "#fff") + ';color:' + (on ? "#fff" : "#334155") + '">' + o[1] + '</button>'; }).join("") + '</span>' : '') + _bsB("#b45309", "+ 정품", "ykItemEdit('')") : "") + '</span></div><div id="ykScr1" data-keepscroll style="overflow-x:auto;max-height:420px"><table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:900px"><thead><tr style="background:#fff7ed;position:sticky;top:0">';
  ["품명", "구분", "박스당 두름", "두름 마리수", "판매가", "도매가", "원가표", "조절도매가", "무게(g)", "라벨 색", "라벨", "바코드", "메모", ""].forEach(function(x, i){ h += '<th style="padding:5px;text-align:' + (i >= 2 && i <= 8 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(_ykGridOn() && _ykIMode() === "xl") h += _ykGrid("item", ik); else ik.forEach(function(k){ var x = I[k]; h += '<tr' + _ykDragTr("item", k) + '><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-weight:700;white-space:nowrap">' + _ykGrip() + esc(x.nm) + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + _ykKindCell(k, x, can) + '</td>' + ["box", "mi", "sale", "whole", "cost", "adj", "wt"].map(function(f){ return '<td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;text-align:right">' + (x[f] ? _ykWon(x[f]) : '') + '</td>'; }).join("") + '<td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + esc(x.color || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px">' + (x.noLbl ? '<span style="color:#dc2626">안 뽑음</span>' : x.under ? x.under + '박스 이하 안 뽑음' : '뽑음') + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px">' + esc(x.code || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-size:11.5px;color:#7c3aed">' + esc(x.msg || "") + '</td><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "ykItemEdit('" + esc(k) + "')", "padding:2px 8px") : "") + '</td></tr>'; });
  h += '</tbody></table></div></div>';
  // 원료
  var M = S.mats || {}, mk = _ykMatKeys();
  var thS = 'style="padding:8px 10px;border-bottom:2px solid #fed7aa;white-space:nowrap;text-align:right"', tdS = 'style="padding:7px 10px;border-bottom:1px solid #f1f5f9;text-align:right"';
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;flex-wrap:wrap;gap:6px"><b>🐟 원료 (짝당 마리수 · 무게 · 값) ' + mk.length + '개</b><span style="display:inline-flex;gap:4px;flex-wrap:wrap">' + (can ? _bsB("#15803d", "📥 엑셀 양식", "ykXlTpl('mat')", "padding:5px 9px") + _bsB("#0e7490", "📤 엑셀로 등록", "ykXlPick('mat')", "padding:5px 9px") + _bsB("#b45309", "+ 원료 등록", "ykMatEdit('')", "padding:6px 14px;font-weight:800") : "") + '</span></div>' + (can ? '<div class="mut" style="font-size:12px;padding:0 12px 6px">줄을 누르면 고치는 창이 떠요 · ⠿ 잡고 끌면 순서 바꾸기</div>' : '') + '<div id="ykScr2" data-keepscroll style="overflow-x:auto;max-height:520px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:640px;table-layout:fixed"><colgroup><col style="width:30%"><col><col><col><col><col></colgroup><thead><tr style="background:#fff7ed;position:sticky;top:0"><th style="padding:8px 10px;border-bottom:2px solid #fed7aa;text-align:left">원료명</th><th ' + thS + '>짝당 마리수</th><th ' + thS + '>짝당 무게(kg)</th><th ' + thS + '>짝당 값</th><th ' + thS + '>마리당 무게</th><th ' + thS + '>마리당 값</th></tr></thead><tbody>';
  mk.forEach(function(k){ var x = M[k], mi = _bsN(x.mi); h += '<tr' + _ykDragTr("mat", k) + (can ? ' style="cursor:pointer" title="눌러서 고치기" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'" onclick="if(!event.target.closest(\'.ykGripS\'))ykMatEdit(\'' + esc(k) + '\')"' : '') + '><td style="padding:7px 10px;border-bottom:1px solid #f1f5f9;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span class="ykGripS">' + _ykGrip() + '</span>' + esc(x.nm) + '</td><td ' + tdS + '>' + _bsW(mi) + '</td><td ' + tdS + '>' + (x.kg ? _bsW(x.kg) : '<span style="color:#cbd5e1">-</span>') + '</td><td ' + tdS + '>' + (x.price ? _ykWon(x.price) : '<span style="color:#cbd5e1">-</span>') + '</td><td ' + tdS.replace('text-align:right', 'text-align:right;color:#64748b') + '>' + (x.kg && mi ? Math.round(_bsN(x.kg) * 1000 / mi) + 'g' : '') + '</td><td ' + tdS.replace('text-align:right', 'text-align:right;color:#64748b') + '>' + (x.price && mi ? _ykWon(_bsN(x.price) / mi) : '') + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function ykSetSave(){
  var o = {}; Array.prototype.forEach.call(document.querySelectorAll(".ykSetIn"), function(el){ var p = el.getAttribute("data-p").split("."), v = el.tagName === "SELECT" ? el.value : _bsN(el.value); if(p.length === 2){ o[p[0]] = o[p[0]] || {}; o[p[0]][p[1]] = v; } else o[p[0]] = v; });
  _ykRef("set").update(o).then(function(){ YK.D.set = Object.assign({}, YK.D.set || {}, o); toast("원가 설정 저장했어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// ── 이모 개인정보 (신고용) — 맨 위 /YkInfo/{닉네임} 에 따로 둠: 규칙으로 super·admin 만 읽고 씀 (작업 데이터와 같이 안 불러옴)
var YK_INFO_F = [["name", "실명"], ["phone", "연락처"], ["addr", "주소"], ["rrn", "주민번호"], ["bank", "은행"], ["acct", "계좌번호"], ["holder", "예금주"], ["memo", "메모"]];
function _ykBoss(){ return !!ME && (ME.r === "super" || ME.r === "admin"); }
function _ykInfoLoad(){
  if(YK.infoLoading) return; YK.infoLoading = true;
  fbDb.ref("/YkInfo").once("value").then(function(s){ YK.infoLoading = false; YK.info = s.val() || {}; if(/^yk/.test(CTAB)) draw(); })
    .catch(function(e){ YK.infoLoading = false; YK.info = { __err: e.message }; if(/^yk/.test(CTAB)) draw(); });
}
function _ykRrn(v){ v = String(v || ""); if(YK.showRrn) return esc(v); var m = /^(\d{6})-?(\d)/.exec(v); return m ? m[1] + "-" + m[2] + "******" : (v ? "******" : ""); }
function _ykInfoBox(){
  if(!_ykBoss()) return '<div class="mut" style="font-size:12px;margin-top:8px">🔒 이모 실명·주민번호·계좌는 관리자만 볼 수 있어요</div>';
  if(!YK.info){ _ykInfoLoad(); return '<div class="mut" style="font-size:12px;margin-top:8px">📡 이모 정보 불러오는 중...</div>'; }
  if(YK.info.__err) return '<div style="font-size:12.5px;margin-top:8px;color:#dc2626">이모 정보를 못 읽었어요 (' + esc(YK.info.__err) + ') — 보안 규칙(YkInfo) 게시가 필요해요</div>';
  var S = _ykS(), I = YK.info, names = {}; Object.keys(S.people || {}).forEach(function(n){ names[n] = 1; }); Object.keys(I).forEach(function(n){ names[n] = 1; });
  var nk = Object.keys(names).sort(), miss = nk.filter(function(n){ var x = I[n] || {}; return !x.name || !x.rrn || !x.acct; }).length;
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-top:12px"><div><b>🪪 이모 정보 (신고용)</b> <span class="mut" style="font-size:12px">— 작업표엔 닉네임만 · 줄을 <b>두 번 눌러</b> 고쳐요' + (miss ? ' · <span style="color:#dc2626;font-weight:700">빈 칸 있는 이모 ' + miss + '명</span>' : '') + '</span></div><div style="display:flex;gap:6px">';
  h += _bsB("#475569", YK.showRrn ? "🙈 주민번호 가리기" : "👁 주민번호 보기", "YK.showRrn=!YK.showRrn;draw()", "padding:4px 10px") + _bsB("#15803d", "📋 신고용 명단 엑셀", "ykInfoCsv()", "padding:4px 10px") + '</div></div>';
  h += '<div style="overflow-x:auto;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px;min-width:900px"><thead><tr style="background:#fff7ed"><th style="padding:5px;text-align:left">닉네임</th>' + YK_INFO_F.map(function(f){ return '<th style="padding:5px;text-align:left">' + f[1] + '</th>'; }).join("") + '</tr></thead><tbody>';
  nk.forEach(function(n){ var x = I[n] || {};
    h += '<tr ondblclick="ykInfoEdit(\'' + esc(n) + '\')" title="두 번 눌러 고치기" style="cursor:pointer"><td style="padding:5px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(n) + '</td>' + YK_INFO_F.map(function(f){ var v = f[0] === "rrn" ? _ykRrn(x.rrn) : esc(x[f[0]] || ""); return '<td style="padding:5px;border-bottom:1px solid #f1f5f9;' + (!x[f[0]] && /name|rrn|acct/.test(f[0]) ? 'background:#fef2f2' : '') + '">' + v + '</td>'; }).join("") + '</tr>'; });
  return h + '</tbody></table></div>';
}
function ykInfoEdit(n){
  if(!_ykBoss()) return toast("관리자만 고칠 수 있어요", true);
  var x = (YK.info || {})[n] || {};
  var h = '<h3 style="margin:0 0 10px">🪪 ' + esc(n) + ' 정보 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">';
  YK_INFO_F.forEach(function(f){ h += '<label style="' + (f[0] === "addr" || f[0] === "memo" ? "grid-column:1/-1" : "") + '">' + f[1] + '<input id="yi_' + f[0] + '" value="' + esc(x[f[0]] || "") + '"' + (f[0] === "rrn" ? ' placeholder="900101-2345678"' : f[0] === "phone" ? ' placeholder="010-0000-0000" inputmode="tel"' : "") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>'; });
  h += '</div><div style="display:flex;justify-content:flex-end;margin-top:12px">' + _bsB("#16a34a", "💾 저장", "ykInfoSave('" + esc(n) + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 560);
}
function ykInfoSave(n){
  var o = {}; YK_INFO_F.forEach(function(f){ var e = document.getElementById("yi_" + f[0]), v = e ? e.value.trim() : ""; if(v) o[f[0]] = v; });
  if(o.rrn && !/^\d{6}-?\d{7}$/.test(o.rrn) && !confirm("주민번호가 13자리 숫자가 아닌 것 같아요. 그래도 저장할까요?")) return;
  if(o.rrn && /^\d{13}$/.test(o.rrn)) o.rrn = o.rrn.slice(0, 6) + "-" + o.rrn.slice(6);
  fbDb.ref("/YkInfo/" + n).set(Object.keys(o).length ? o : null).then(function(){ YK.info = YK.info || {}; if(Object.keys(o).length) YK.info[n] = o; else delete YK.info[n];
    if(!((_ykS().people || {})[n])) ykPerson(n, false); closePopup(); toast("저장했어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykInfoCsv(){
  var I = YK.info || {}, S = _ykS(), nk = {}; Object.keys(S.people || {}).forEach(function(n){ nk[n] = 1; }); Object.keys(I).forEach(function(n){ if(n !== "__err") nk[n] = 1; });
  var q = function(v, t){ v = String(v == null ? "" : v).replace(/"/g, '""'); return t && v ? '="' + v + '"' : '"' + v + '"'; };
  var rows = [["닉네임"].concat(YK_INFO_F.map(function(f){ return f[1]; })).map(function(v){ return q(v); }).join(",")];
  Object.keys(nk).sort().forEach(function(n){ var x = I[n] || {}; rows.push([q(n)].concat(YK_INFO_F.map(function(f){ return q(x[f[0]], /phone|rrn|acct/.test(f[0])); })).join(",")); });
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" })); a.download = "엮거리_이모명단_" + _bsToday() + ".csv"; document.body.appendChild(a); a.click(); a.remove();
}
// ════════ 🏦 다건이체 — 은행 기업뱅킹 '다건이체 엑셀 업로드' 양식(은행코드/은행명 · 입금계좌번호 · 이체금액 · 입금통장표시 · 출금통장표시 · 이체메모) ════════
var YK_BANKS = [["NH농협", 11, "농협"], ["국민", 4, "국민"], ["부산", 32, "부산"], ["새마을금고", 45, "새마을"], ["신협", 48, "신협"], ["우체국", 71, "우체국"], ["제주", 35, "제주"], ["중국은행(BOC)", 63, "중국은행(BOC)"], ["K뱅크", 89, "케이뱅크"], ["뱅크 오브 아메리카", 60, "뱅크 오브 아메리카"], ["JP모간", 57, "JP모간"], ["교보증권", 261, "교보증권"], ["메리츠증권", 287, "메리츠증권"], ["삼성증권", 240, "삼성증권"], ["신한투자증권", 278, "신한투자증권"], ["카카오페이증권", 288, "카카오페이증권"], ["토스증권", 271, "토스증권"], ["한국투자증권", 243, "한국투자증권"], ["현대차증권", 263, "현대차증권"], ["IBK투자증권", 225, "IBK투자증권"], ["SK증권", 266, "SK증권"], ["경남", 39, "경남"], ["기업", 3, "기업"], ["산업", 2, "산업"], ["수협", 7, "수협"], ["SC제일", 23, "SC제일"], ["전북", 37, "전북"], ["중국건설은행(CCB)", 67, "중국건설은행(CCB)"], ["하나", 81, "하나"], ["카카오뱅크", 90, "카뱅"], ["BNP파리바", 61, "BNP파리바"], ["홍콩(HSBC은행)", 54, "홍콩(HSBC은행)"], ["다올투자증권", 227, "다올투자증권"], ["미래에셋증권", 238, "미래에셋증권"], ["상상인증권", 221, "상상인증권"], ["유안타증권", 209, "유안타증권"], ["케이프투자증권", 292, "케이프투자증권"], ["하나증권", 270, "하나증권"], ["한국포스증권", 294, "한국포스증권"], ["BNK투자증권", 224, "BNK투자증권"], ["KB증권", 218, "KB증권"], ["광주", 34, "광주"], ["아이엠 (구)대구", 31, "아이엠 (구)대구"], ["산림조합", 64, "산림조합"], ["신한", 88, "신한"], ["우리", 20, "우리"], ["저축은행", 50, "저축은행"], ["중국공상(ICBC)", 62, "중국공상(ICBC)"], ["한국씨티", 27, "한국씨티"], ["토스뱅크", 92, "토스뱅크"], ["도이치", 55, "도이치"], ["NH투자증권", 247, "NH투자증권"], ["대신증권", 267, "대신증권"], ["부국증권", 290, "부국증권"], ["신영증권", 291, "신영증권"], ["유진투자증권", 280, "유진투자증권"], ["키움증권", 264, "키움증권"], ["하이투자증권", 262, "하이투자증권"], ["한화투자증권", 269, "한화투자증권"], ["DB증권", 279, "DB증권"], ["LS증권", 265, "LS증권"]];   // [은행, 코드, 포함단어] — 엑셀 '은행코드' 시트
function _ykBankCd(b){ b = String(b || "").replace(/\s/g, ""); if(!b) return null; var best = null, bl = 0;
  YK_BANKS.forEach(function(x){ [x[0], x[2]].forEach(function(w){ w = String(w).replace(/\s/g, ""); if(w && b.indexOf(w) >= 0 && w.length > bl){ best = x; bl = w.length; } }); }); return best; }
function _ykAcctNo(a){ return String(a || "").replace(/[^0-9]/g, ""); }
function ykBulkPay(){
  if(!_ykBoss()) return toast("관리자만 쓸 수 있어요", true);
  if(!YK.info){ _ykInfoLoad(); return toast("이모 정보 불러오는 중 — 잠깐 뒤 다시 눌러 주세요", true); }
  if(YK.info.__err) return toast("이모 정보를 못 읽었어요: " + YK.info.__err, true);
  var f = YK.pf || "", t = YK.pt || "", per = !!(f || t), P = per ? _ykPayInfo(f, t) : _ykPayInfo(), st = _ykSet().bulk || {};
  var names = Object.keys(P).filter(function(n){ return P[n].due > 0; }).sort(function(a, b){ return P[b].due - P[a].due; });
  if(!names.length) return toast((per ? _ykPerTxt(f, t) + " 기간에 " : "") + "줄 돈이 남은 이모가 없어요", true);
  YK.bulk = names.map(function(n){ var x = YK.info[n] || {}, bk = _ykBankCd(x.bank); return { n: n, on: true, amt: Math.round(P[n].due), x: x, bk: bk, acct: _ykAcctNo(x.acct) }; });
  var memo = per ? _ykPerTxt(f, t).replace(/\([^)]*\)/g, "") + " 엮거리" : "엮거리값";
  var h = '<h3 style="margin:0 0 6px">🏦 다건이체 엑셀 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div class="mut" style="font-size:12px;margin-bottom:8px">' + (per ? '<b>' + _ykPerTxt(f, t) + '</b> 남은 돈' : '전체 미수') + ' 기준 · 금액은 고칠 수 있어요 · 받은 엑셀을 은행 기업뱅킹 <b>다건이체 → 엑셀 올리기</b>에 그대로 올리면 돼요</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12.5px;margin-bottom:8px"><label>입금통장 표시 (받는 분 통장)<input id="yb_in" value="' + esc(st.inShow || "가문굴비영어조합법인") + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label><label>출금통장 표시 (우리 통장) <span class="mut">— 비우면 실명</span><input id="yb_out" value="' + esc(st.outShow || "") + '" placeholder="예: 엮거리" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label><label>이체 메모<input id="yb_memo" value="' + esc(memo) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label></div>';
  h += '<div style="max-height:52vh;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#eff6ff;position:sticky;top:0"><th style="padding:5px"><input type="checkbox" checked onchange="YK.bulk.forEach(function(b,i){b.on=this.checked;var e=document.getElementById(\'yb_c\'+i);if(e)e.checked=this.checked},this);_ykBulkSum()"></th><th style="text-align:left">닉네임</th><th style="text-align:left">실명</th><th style="text-align:left">은행 (코드)</th><th style="text-align:left">계좌</th><th style="text-align:right">이체 금액</th></tr>';
  YK.bulk.forEach(function(b, i){ var bad = !b.acct ? "계좌 없음" : !b.bk ? "은행코드 모름" : "";
    h += '<tr style="' + (bad ? "background:#fef2f2" : "") + '"><td style="padding:4px;text-align:center;border-bottom:1px solid #f1f5f9"><input id="yb_c' + i + '" type="checkbox" ' + (bad ? "" : "checked") + ' onchange="YK.bulk[' + i + '].on=this.checked;_ykBulkSum()"></td><td style="border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(b.n) + '</td><td style="border-bottom:1px solid #f1f5f9">' + esc(b.x.name || "") + '</td><td style="border-bottom:1px solid #f1f5f9">' + (b.bk ? esc(b.bk[0]) + ' <span class="mut">(' + b.bk[1] + ')</span>' : '<span style="color:#dc2626;font-weight:700">' + esc(b.x.bank || "없음") + '</span>') + '</td><td style="border-bottom:1px solid #f1f5f9;font-family:monospace">' + (b.acct ? esc(b.x.acct) : '<span style="color:#dc2626;font-weight:700">계좌 없음</span>') + (bad ? ' <a href="javascript:void 0" onclick="closePopup();CTAB=\'ykSet\';draw();setTimeout(function(){ykInfoEdit(\'' + esc(b.n) + '\')},50)" style="font-size:11.5px">정보 넣기</a>' : '') + '</td><td style="border-bottom:1px solid #f1f5f9;text-align:right"><input type="number" value="' + b.amt + '" oninput="YK.bulk[' + i + '].amt=_bsN(this.value);_ykBulkSum()" style="width:110px;padding:4px;border:1px solid #cbd5e1;border-radius:5px;text-align:right;font-weight:800"></td></tr>';
    if(bad) b.on = false; });
  h += '</table></div><div id="ybSum" style="margin-top:8px;font-size:14px;font-weight:800;text-align:right"></div>';
  h += '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:10px;flex-wrap:wrap">' + _bsB("#16a34a", "✅ 이체했어요 — 지급 기록 넣기", "ykBulkPaid()", "padding:9px 16px") + _bsB("#1d4ed8", "📥 다건이체 엑셀 받기", "ykBulkXlsx()", "padding:9px 22px;font-size:14px") + '</div><div class="mut" style="font-size:11.5px;margin-top:6px">은행에서 이체가 끝나면 <b>이체했어요</b>를 눌러야 미수에서 빠져요 (체크된 이모·금액 그대로 지급 기록)</div>';
  openPopup(h, 820); _ykBulkSum();
}
function _ykBulkSum(){ var el = document.getElementById("ybSum"); if(!el) return; var on = YK.bulk.filter(function(b){ return b.on && b.amt > 0; }); el.innerHTML = '체크 ' + on.length + '명 · 합계 <span style="color:#1d4ed8;font-size:17px">' + _ykWon(on.reduce(function(a, b){ return a + b.amt; }, 0)) + '원</span>'; }
function _ykBulkRows(){ var bad = YK.bulk.filter(function(b){ return b.on && (!b.acct || !b.bk || !(b.amt > 0)); }); if(bad.length){ toast(bad.map(function(b){ return b.n; }).join(", ") + " — 계좌·은행·금액을 확인해 주세요", true); return null; } var L = YK.bulk.filter(function(b){ return b.on; }); if(!L.length){ toast("체크된 이모가 없어요", true); return null; } return L; }
async function ykBulkXlsx(){
  var L = _ykBulkRows(); if(!L) return;
  var g = function(k){ return ((document.getElementById("yb_" + k) || {}).value || "").trim(); }, inS = g("in"), outS = g("out"), memo = g("memo");
  _ykRef("set/bulk").set({ inShow: inS, outShow: outS }).catch(function(){}); YK.D.set = YK.D.set || {}; YK.D.set.bulk = { inShow: inS, outShow: outS };
  showLoading("엑셀 만드는 중...");
  var EJ; try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var wb = new EJ.Workbook(), ws = wb.addWorksheet("은행양식");
  ws.columns = [{ width: 16 }, { width: 20 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 22 }];
  ws.addRow(["은행코드/은행명", "입금계좌번호", "이체금액", "입금통장표시내용", "출금통장표시내용", "이체메모"]); ws.getRow(1).font = { bold: true };
  L.forEach(function(b){ var r = ws.addRow([b.bk[1], b.acct, Math.round(b.amt), inS, outS || b.x.name || b.n, memo]); r.getCell(2).numFmt = "@"; r.getCell(2).value = String(b.acct); r.getCell(3).numFmt = "#,##0"; });
  var buf = await wb.xlsx.writeBuffer(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = "엮거리_다건이체_" + _bsToday() + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove(); hideLoading(); toast(L.length + "명 다건이체 엑셀 받았어요 — 이체 끝나면 '이체했어요'를 눌러 주세요");
}
function ykBulkPaid(){
  var L = _ykBulkRows(); if(!L) return;
  var tot = L.reduce(function(a, b){ return a + b.amt; }, 0), memo = ((document.getElementById("yb_memo") || {}).value || "").trim();
  if(!confirm(L.length + "명 · " + _ykWon(tot) + "원을 오늘 날짜 지급으로 기록할까요?\n(은행 이체가 끝났을 때만 눌러 주세요)")) return;
  var up = {}, dt = _bsToday(); L.forEach(function(b){ up["pays/" + _ykRef("pays").push().key] = { dt: dt, w: b.n, amt: Math.round(b.amt), note: "다건이체 · " + memo }; });
  _ykRef().update(up).then(function(){ YK.D.pays = YK.D.pays || {}; Object.keys(up).forEach(function(p){ YK.D.pays[p.split("/")[1]] = up[p]; }); closePopup(); toast(L.length + "명 지급 기록 — 미수에서 빠졌어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykPersonDel(n){
  var S = _ykS(), nW = Object.keys(S.works || {}).filter(function(k){ return (S.works[k].ws || []).indexOf(n) >= 0; }).length, P = _ykPayInfo()[n] || {}, due = (P.earn || 0) - (P.paid || 0), hasInfo = !!(YK.info || {})[n];
  var msg = n + " 이모를 명단에서 지울까요?" + (nW ? "\n\n· 지난 작업 " + nW + "건에 이름이 있어요 — 작업 기록·정산·지급은 그대로 남아요 (명단·새 작업 고르기에서만 빠짐)" : "") + (Math.round(due) ? "\n· 아직 정산할 돈 " + _ykWon(due) + "원이 있어요" : "");
  if(!confirm(msg)) return;
  var info = hasInfo && _ykBoss() && confirm(n + " 이모 신고 정보(실명·주민번호·계좌)도 같이 지울까요?\n(취소 = 신고 정보는 남김)");
  _ykRef("people/" + n).remove().then(function(){ if(YK.D.people) delete YK.D.people[n]; return info ? fbDb.ref("/YkInfo/" + n).remove().then(function(){ delete YK.info[n]; }) : null; })
    .then(function(){ toast(n + " 이모 지웠어요" + (info ? " (신고 정보도)" : "")); draw(); }).catch(function(e){ toast("지우기 실패: " + e.message, true); });
}
function ykPerson(n, on){ if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); _ykRef("people/" + n).set({ on: !!on }).then(function(){ YK.D.people = YK.D.people || {}; YK.D.people[n] = { on: !!on }; draw(); }); }
// 💲 정품 가격 기록 — 가격(판매·도매·원가·조절도매)이 바뀌면 items/{k}/ph/{적용날짜} = 그날부터 가격
//   작업은 '작업 날짜'의 가격으로 계산 → 오늘 천원 올려도 예전 작업은 예전 가격 그대로
//   처음 바꿀 때 예전 가격을 ph/0000-00-00 (처음부터) 으로 남김 · 비어 있던(0) 칸을 처음 채우는 건 '바뀜'이 아니라 예전 작업에도 그 값
var YK_PF = ["sale", "whole", "cost", "adj"], YK_PFN = { sale: "판매가", whole: "도매가", cost: "원가", adj: "조절도매가" };
function _ykPxOf(o){ var r = {}; YK_PF.forEach(function(k){ r[k] = _bsN((o || {})[k]); }); return r; }
function _ykPx(I, dt){
  var ph = I && I.ph, ks = ph ? Object.keys(ph).sort() : []; if(!ks.length) return _ykPxOf(I);
  var d = String(dt || "9999-99-99"), best = null; ks.forEach(function(k){ if(k <= d) best = k; }); if(!best) best = ks[0];
  if(best === ks[ks.length - 1]) return _ykPxOf(I);   // 마지막 기록 = 지금 가격
  var r = _ykPxOf(ph[best]), cur = _ykPxOf(I); YK_PF.forEach(function(k){ if(!r[k]) r[k] = cur[k]; }); return r;
}
function _ykPxHist(oldI, newV, from){   // → 저장할 ph (없으면 null)
  var ph = Object.assign({}, (oldI || {}).ph || {}), o = _ykPxOf(oldI), n = _ykPxOf(newV);
  var ch = YK_PF.some(function(k){ return o[k] && o[k] !== n[k]; });
  if(!ch) return Object.keys(ph).length ? ph : null;
  from = from || _bsToday();
  if(!Object.keys(ph).length){ var b = {}; YK_PF.forEach(function(k){ b[k] = o[k] || n[k]; }); ph["0000-00-00"] = b; }
  Object.keys(ph).forEach(function(d){ if(d > from) delete ph[d]; });
  ph[from] = n; return ph;
}
// 이 작업 하나로 보면 원가표를 전부 몇 % 올려야(내려도) 본전인지
function _ykRatioMsg(c){
  if(!(c.cost.mat > 0)) return '<div style="font-size:12px;color:#94a3b8;margin:4px 0">원료값이 없어서 원가표가 맞는지 판단 못 해요</div>';
  if(!c.tblRatio || c.tblCover < 0.8) return '<div style="font-size:12px;color:#94a3b8;margin:4px 0">원가표 없는 품목이 많아서(두름의 ' + Math.round((1 - (c.tblCover || 0)) * 100) + '%) 원가표가 맞는지 판단 못 해요 — 품명을 정품표에 있는 이름으로 고치거나 원가표를 넣어 주세요</div>';
  var p = (c.tblRatio - 1) * 100, up = p > 0;
  if(Math.abs(p) < 1) return '<div style="font-size:12.5px;margin:4px 0;padding:5px 8px;border-radius:6px;background:#f0fdf4;color:#15803d;font-weight:800">✓ 이 작업 기준 원가표가 실제 원가와 맞아요 (차이 ' + (Math.round(p * 10) / 10) + '%)</div>';
  return '<div style="font-size:12.5px;margin:4px 0;padding:5px 8px;border-radius:6px;background:' + (up ? "#fef2f2" : "#eff6ff") + ';color:' + (up ? "#b91c1c" : "#1d4ed8") + ';font-weight:800">' + (up ? "▲ 이 작업 기준으로 원가표를 전부 " + (Math.round(p * 10) / 10) + "% 올려야 본전" : "▼ 이 작업 기준으로 원가표를 " + (Math.round(-p * 10) / 10) + "% 내려도 본전") + ' <span style="font-weight:400;font-size:11.5px">(원가표 합계 ' + _ykWon(c.tblSum) + ' · 실제 총원가 ' + _ykWon(c.total) + ')</span></div>';
}
function _ykVsTbl(unit, tbl, hasMat){
  if(!hasMat) return '';
  var rec = Math.round(unit / 100) * 100, d = rec - _bsN(tbl);
  if(!_bsN(tbl)) return '<div style="font-size:10.5px;color:#c2410c;white-space:nowrap">원가표 비어 있음 → ' + _ykWon(rec) + '</div>';
  if(Math.abs(d) < 100) return '<div style="font-size:10.5px;color:#16a34a;white-space:nowrap">✓ 원가표와 맞음</div>';
  return '<div style="font-size:10.5px;white-space:nowrap;color:' + (d > 0 ? "#dc2626" : "#2563eb") + '">원가표 ' + _ykWon(tbl) + (d > 0 ? ' ▲ ' + _ykWon(d) + ' 올려야' : ' ▼ ' + _ykWon(-d) + ' 내려도 됨') + '</div>';
}
function _ykPhHtml(x){
  var ph = x && x.ph; if(!ph || !Object.keys(ph).length) return '';
  var ks = Object.keys(ph).sort(), h = '<div style="margin-top:10px;font-size:12.5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px"><b>💲 가격 바뀐 기록</b> <span class="mut" style="font-size:11.5px">— 작업은 그 작업 날짜의 가격으로 계산돼요</span><table style="width:100%;border-collapse:collapse;margin-top:4px">';
  h += '<tr style="color:#64748b"><td style="padding:2px">적용</td>' + YK_PF.map(function(k){ return '<td style="text-align:right;padding:2px">' + YK_PFN[k] + '</td>'; }).join("") + '</tr>';
  ks.forEach(function(d, i){ var p = _ykPxOf(ph[d]), nx = ks[i + 1]; h += '<tr' + (i === ks.length - 1 ? ' style="font-weight:800"' : '') + '><td style="padding:2px;white-space:nowrap">' + (d === "0000-00-00" ? "처음" : d.replace(/-/g, ".")) + ' ~ ' + (nx ? _bsAdd ? _bsAdd(nx, -1).replace(/-/g, ".") : nx : "지금") + '</td>' + YK_PF.map(function(k){ return '<td style="text-align:right;padding:2px">' + (p[k] ? _ykWon(p[k]) : '-') + '</td>'; }).join("") + '</tr>'; });
  return h + '</table></div>';
}
function ykItemEdit(k, pre){
  var x = k ? _ykS().items[k] : { nm: pre || "", box: 10, mi: 10, sale: "", whole: "", cost: "", adj: "", wt: "", color: "", noLbl: false, under: "", code: "", msg: "" };
  var F = function(lb, f, t){ var won = /^(sale|whole|cost|adj)$/.test(f); return '<label style="font-size:13px">' + lb + '<input id="yi_' + f + '" ' + (won ? 'type="text" inputmode="numeric" data-won' : 'type="' + (t || "text") + '"') + ' value="' + esc(x[f] == null ? "" : won ? _wonFmt(x[f]) : x[f]) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">📦 ' + (k ? "정품 고치기" : "정품 추가") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">';
  h += F("품명", "nm") + '<label style="font-size:13px">굴비 / 부세<select id="yi_kind" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box">' + [["", "작업마다 고름"], ["굴비", "굴비"], ["부세", "부세"]].map(function(o){ return '<option value="' + o[0] + '"' + ((x.kind || "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select></label>' + F("박스당 두름", "box", "number") + F("두름 마리수 (20미/10미)", "mi", "number") + F("판매가 (두름당)", "sale", "number") + F("도매가 (두름당)", "whole", "number") + F("원가표 (두름당)", "cost", "number") + F("조절도매가 (두름당)", "adj", "number") + F("무게 (g)", "wt", "number") + F("라벨 색", "color") + F("바코드 (예: GA0005)", "code") + '</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">' + F("N박스 이하면 라벨 안 뽑음 (비우면 다 뽑음)", "under", "number") + F("메모 (예: 고추장만드세요)", "msg") + '</div><label style="font-size:13px;display:block;margin-top:8px"><input type="checkbox" id="yi_noLbl" ' + (x.noLbl ? "checked" : "") + '> 라벨 안 뽑음</label>';
  if(k) h += '<div style="margin-top:10px;font-size:13px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:8px 10px">💲 가격을 바꾸면 <input id="yi_from" type="date" value="' + _bsToday() + '" style="width:auto;display:inline-block;padding:4px;border:1px solid #cbd5e1;border-radius:5px"> 부터 새 가격 <span class="mut" style="font-size:11.5px">— 그 전 작업은 예전 가격 그대로 계산돼요</span></div>' + _ykPhHtml(x);
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (k ? _bsB("#dc2626", "🗑 삭제", "ykItemDel('" + esc(k) + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "ykItemSave('" + esc(k || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 620);
}
function ykItemSave(k){
  var g = function(f){ return (document.getElementById("yi_" + f) || {}).value; }, v = { nm: (g("nm") || "").trim(), box: _bsN(g("box")), mi: _bsN(g("mi")) || 10, sale: _bsN(g("sale")), whole: _bsN(g("whole")), cost: _bsN(g("cost")), adj: _bsN(g("adj")), wt: _bsN(g("wt")), color: (g("color") || "").trim(), noLbl: document.getElementById("yi_noLbl").checked, under: _bsN(g("under")) || "", code: (g("code") || "").trim(), msg: (g("msg") || "").trim() };
  if(g("kind")) v.kind = g("kind");
  if(!v.nm) return toast("품명을 넣어 주세요", true);
  var o0 = k ? (_ykS().items || {})[k] : null; if(o0 && o0.ord != null) v.ord = o0.ord;
  if(o0){ var ph = _ykPxHist(o0, v, g("from") || _bsToday()); if(ph) v.ph = ph; }
  var key = _ykKey(v.nm), up = {}; up["items/" + key] = v; if(k && k !== key) up["items/" + k] = null;
  _ykRef().update(up).then(function(){ YK.D.items = YK.D.items || {}; if(k && k !== key) delete YK.D.items[k]; YK.D.items[key] = v; closePopup(); toast("저장 — " + v.nm); _ykAfter("item", v.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// ── 📋 PC: 정품·원료 표를 엑셀처럼 칸에서 바로 고치기 (칸 바꾸면 바로 저장 · Enter = 아래 칸 · 맨 아래 초록 줄 = 새로 넣기) ──
var YK_GF = { item: [["nm", "s", 150], ["kind", "k", 70], ["box", "n", 60], ["mi", "n", 60], ["sale", "n", 80], ["whole", "n", 80], ["cost", "n", 80], ["adj", "n", 80], ["wt", "n", 60], ["color", "s", 60], ["lbl", "l", 110], ["code", "s", 80], ["msg", "s", 120]],
              mat: [["nm", "s", 160], ["mi", "n", 70], ["kg", "n", 70], ["price", "n", 90]] };
function _ykIMode(){ try { return localStorage.getItem("gm_ykItemMode") || "reg"; } catch(e){ return "reg"; } }
function _ykSetIMode(m){ try { localStorage.setItem("gm_ykItemMode", m); } catch(e){} draw(); }
function _ykGridOn(){ return _ykCan() && (window.innerWidth || 1200) >= 760; }
function _ykGIn(t, k, f, ty, w, v, r){
  if(ty === "n" && !_bsN(v)) v = "";   // 0 은 빈칸으로 (엑셀처럼)
  var st = "width:100%;min-width:" + w + "px;padding:4px 5px;border:1px solid transparent;border-radius:4px;font-size:12.5px;box-sizing:border-box;background:transparent;" + (ty === "n" ? "text-align:right;" : "") + (f === "nm" ? "font-weight:700;" : "");
  return '<input class="ykG" data-t="' + t + '" data-k="' + esc(k) + '" data-f="' + f + '" data-r="' + r + '" ' + (/^(sale|whole|cost|adj|price)$/.test(f) ? 'type="text" inputmode="numeric" data-won' : ty === "n" ? 'type="number" step="any"' : 'type="text"') + ' value="' + esc(v == null ? "" : /^(sale|whole|cost|adj|price)$/.test(f) ? _wonFmt(v) : v) + '" onfocus="this.style.borderColor=\'#f59e0b\';this.style.background=\'#fff\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'" onchange="_ykGSet(this)" onkeydown="_ykGKey(event,this)" style="' + st + '">';
}
function _ykGrid(t, keys){
  var T = t === "item" ? _ykS().items || {} : _ykS().mats || {}, F = YK_GF[t], h = "", td = 'style="padding:1px 2px;border-bottom:1px solid #f1f5f9"';
  keys.forEach(function(k, r){ var x = T[k];
    h += '<tr' + _ykDragTr(t, k).replace('draggable="true"', 'draggable="false"').replace('ondragend="this.style.opacity=\'\'"', 'ondragend="this.style.opacity=\'\';this.draggable=false"') + ' onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'">';
    F.forEach(function(c, ci){ h += '<td ' + td + (ci === 0 ? ' ><div style="display:flex;align-items:center"><span onmousedown="this.closest(\'tr\').draggable=true" onmouseup="this.closest(\'tr\').draggable=false" title="잡고 끌어서 순서 바꾸기" style="cursor:grab;color:#94a3b8;font-size:15px;padding:0 4px;user-select:none">⠿</span>' : '>');
      if(c[1] === "l") h += '<label style="font-size:11.5px;white-space:nowrap;display:flex;align-items:center;gap:3px"><input type="checkbox" ' + (x.noLbl ? "checked" : "") + ' onchange="_ykGSet(this)" class="ykG" data-t="' + t + '" data-k="' + esc(k) + '" data-f="noLbl">안 뽑음 ' + '<input class="ykG" type="number" data-t="' + t + '" data-k="' + esc(k) + '" data-f="under" data-r="' + r + '" value="' + esc(x.under || "") + '" placeholder="N" title="N박스 이하면 안 뽑음" onchange="_ykGSet(this)" onkeydown="_ykGKey(event,this)" style="width:38px;padding:2px;border:1px solid #e5e7eb;border-radius:4px;font-size:11.5px">박스↓</label>';
      else if(c[1] === "k") h += '<select class="ykG" data-t="' + t + '" data-k="' + esc(k) + '" data-f="kind" data-r="' + r + '" onchange="_ykGSet(this)" style="padding:3px;font-size:12.5px;border:1px solid #e5e7eb;border-radius:4px;font-weight:700;color:' + (x.kind === "부세" ? "#0e7490" : x.kind ? "#b45309" : "#94a3b8") + '">' + _ykKindOpts(x.kind) + '</select>';
      else h += _ykGIn(t, k, c[0], c[1], c[2], x[c[0]], r);
      h += (ci === 0 ? '</div>' : '') + '</td>'; });
    h += '<td ' + td + '><button class="btn" title="지우기" style="background:#fff;color:#dc2626;border:1px solid #fecaca;padding:2px 7px;font-size:12px" onclick="' + (t === "item" ? "ykItemDel" : "ykMatDel") + '(\'' + esc(k) + '\')">✕</button></td></tr>'; });
  // 새로 넣는 줄
  h += '<tr style="background:#f0fdf4" onkeydown="if(event.key===\'Enter\'){event.preventDefault();_ykGAdd(\'' + t + '\')}">';
  F.forEach(function(c, ci){ var id = "ykN_" + t + "_" + c[0], ph = ci === 0 ? (t === "item" ? "+ 새 정품 이름" : "+ 새 원료 이름") : "";
    if(c[1] === "l") h += '<td style="padding:2px;font-size:11.5px"><label><input type="checkbox" id="ykN_' + t + '_noLbl">안 뽑음</label></td>';
    else if(c[1] === "k") h += '<td style="padding:2px"><select id="' + id + '" style="padding:4px;font-size:12.5px;border:1px solid #86efac;border-radius:4px">' + _ykKindOpts("") + '</select></td>';
    else h += '<td style="padding:2px"><input id="' + id + '" ' + (/^(sale|whole|cost|adj|price)$/.test(c[0]) ? 'type="text" inputmode="numeric" data-won' : c[1] === "n" ? 'type="number" step="any"' : 'type="text"') + ' placeholder="' + ph + '" value="' + (t === "item" && (c[0] === "box" || c[0] === "mi") ? 10 : "") + '" style="width:100%;min-width:' + c[2] + 'px;padding:5px;border:1px solid #86efac;border-radius:4px;font-size:12.5px;box-sizing:border-box;' + (c[1] === "n" ? "text-align:right;" : "") + '"></td>'; });
  h += '<td style="padding:2px">' + _bsB("#16a34a", "＋", "_ykGAdd('" + t + "')", "padding:4px 9px") + '</td></tr>';
  h += '<tr><td colspan="' + (F.length + 1) + '" style="padding:4px 8px;font-size:11.5px;color:#64748b">⌨ 칸을 눌러 바로 고치면 저장돼요 · Enter = 아래 칸 · 초록 줄에 적고 Enter = 새로 넣기 · ⠿ 잡고 끌면 순서 바꾸기</td></tr>';
  setTimeout(function(){ if(YK.gFocus){ var e = document.getElementById(YK.gFocus); YK.gFocus = ""; if(e) e.focus(); } }, 0);
  return h;
}
function _ykGKey(ev, el){
  if(ev.key !== "Enter" && ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
  if((ev.key === "ArrowDown" || ev.key === "ArrowUp") && el.type !== "text") return;   // 숫자칸 ↑↓ 는 숫자 바꾸기 그대로
  ev.preventDefault(); var r = +el.dataset.r + (ev.key === "ArrowUp" ? -1 : 1), f = el.dataset.f, t = el.dataset.t;
  YK.gNext = { t: t, f: f, r: r }; el.blur();
  setTimeout(function(){ var n = YK.gNext; if(!n) return; YK.gNext = null; _ykGFocusAt(n); }, 30);
}
function _ykGFocusAt(n){ var e = document.querySelector('.ykG[data-t="' + n.t + '"][data-f="' + n.f + '"][data-r="' + n.r + '"]') || document.getElementById("ykN_" + n.t + "_" + n.f); if(e){ e.focus(); if(e.select) e.select(); } }
function _ykGSet(el){
  var t = el.dataset.t, k = el.dataset.k, f = el.dataset.f, path = t === "item" ? "items" : "mats", T = YK.D[path] || {}, x = T[k]; if(!x) return;
  var ty = ((YK_GF[t].filter(function(c){ return c[0] === f; })[0]) || [f, f === "under" ? "n" : "s"])[1];
  var v = el.type === "checkbox" ? el.checked : ty === "n" ? (String(el.value).trim() === "" ? "" : _bsN(el.value)) : String(el.value).trim();
  if(f === "under" && !v) v = "";
  var ok = function(){ el.style.boxShadow = "0 0 0 2px #22c55e"; setTimeout(function(){ el.style.boxShadow = ""; }, 700); }, fail = function(e){ toast("저장 실패: " + e.message, true); };
  if(f === "nm"){
    if(!v){ el.value = x.nm; return toast("이름은 비울 수 없어요", true); }
    var key = _ykKey(v); if(key === k){ x.nm = v; return _ykRef(path + "/" + k + "/nm").set(v).then(ok, fail); }
    if(T[key]){ el.value = x.nm; return toast("「" + v + "」 는 이미 있어요", true); }
    var nv = Object.assign({}, x, { nm: v }), up = {}; up[path + "/" + key] = nv; up[path + "/" + k] = null;
    return _ykRef().update(up).then(function(){ delete T[k]; T[key] = nv; toast("이름 바꿨어요 — " + v + " (예전 작업 기록의 이름은 그대로)"); var n = YK.gNext; YK.gNext = null; draw(); if(n) setTimeout(function(){ _ykGFocusAt(n); }, 0); }, fail);
  }
  if(t === "mat" && f === "mi" && !v){ el.value = x.mi; return toast("짝당 마리수는 꼭 있어야 해요", true); }
  if(t === "item" && YK_PF.indexOf(f) >= 0){ var nv2 = Object.assign({}, x); nv2[f] = v; var ph2 = _ykPxHist(x, nv2, _bsToday()), up2 = {}; up2[f] = v === "" ? null : v; if(ph2) up2.ph = ph2;
    x[f] = v; if(ph2) x.ph = ph2; return _ykRef(path + "/" + k).update(up2).then(function(){ ok(); if(ph2 && Object.keys(ph2).length) toast(YK_PFN[f] + " 바뀜 — 오늘부터 새 가격, 예전 작업은 예전 가격"); }, fail); }
  x[f] = v; _ykRef(path + "/" + k + "/" + f).set(v === "" ? null : v).then(ok, fail);
}
function _ykGAdd(t){
  var g = function(f){ var e = document.getElementById("ykN_" + t + "_" + f); return e ? String(e.value).trim() : ""; }, nm = g("nm");
  if(!nm) return toast("이름을 적어 주세요", true);
  var path = t === "item" ? "items" : "mats", T = YK.D[path] = YK.D[path] || {}, key = _ykKey(nm); if(T[key]) return toast("「" + nm + "」 는 이미 있어요", true);
  var v = { nm: nm }; YK_GF[t].forEach(function(c){ if(c[0] === "nm" || c[1] === "l") return; var s2 = g(c[0]); if(s2 !== "") v[c[0]] = c[1] === "n" ? _bsN(s2) : s2; });
  if(t === "item"){ v.mi = v.mi || 10; v.box = v.box || 0; var nl = document.getElementById("ykN_item_noLbl"); v.noLbl = !!(nl && nl.checked); }
  if(t === "mat" && !v.mi) return toast("짝당 마리수를 넣어 주세요", true);
  var mx = 0; Object.keys(T).forEach(function(q){ mx = Math.max(mx, _bsN(T[q].ord)); }); v.ord = mx + 10;
  _ykRef(path + "/" + key).set(v).then(function(){ T[key] = v; toast("넣었어요 — " + nm); YK.gFocus = "ykN_" + t + "_nm"; draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// ── 품명·원료 고르기: 정품표·원료표 순서 그대로 · 등록 안 된 이름은 빨갛게 + 바로 추가 ──
function _ykOrd(x){ return x && x.ord != null && x.ord !== "" ? _bsN(x.ord) : 1e9; }
function _ykItemKeys(){ var I = _ykS().items || {}; return Object.keys(I).sort(function(a, b){ return _ykOrd(I[a]) - _ykOrd(I[b]) || String(I[a].code || "z").localeCompare(String(I[b].code || "z")) || a.localeCompare(b); }); }
function _ykMatKeys(){ var M = _ykS().mats || {}; return Object.keys(M).sort(function(a, b){ return _ykOrd(M[a]) - _ykOrd(M[b]) || a.localeCompare(b); }); }
// ✋ 줄 잡고 끌어서 순서 바꾸기 (정품·원료) — 바꾼 순서는 작업 화면 품명·원료 고르기 순서에도 그대로
function _ykDragTr(t, k){ return _ykCan() ? ' draggable="true" ondragstart="_ykDS(event,\'' + t + '\',\'' + esc(k) + '\')" ondragover="_ykDO(event)" ondragleave="this.style.boxShadow=\'\'" ondrop="_ykDP(event,\'' + t + '\',\'' + esc(k) + '\')" ondragend="this.style.opacity=\'\'"' : ''; }
function _ykGrip(){ return _ykCan() ? '<span title="잡고 위아래로 끌어서 순서 바꾸기" style="cursor:grab;color:#94a3b8;font-size:15px;padding:0 6px 0 2px;user-select:none">⠿</span>' : ''; }
function _ykDS(ev, t, k){ YK.drag = { t: t, k: k }; ev.dataTransfer.effectAllowed = "move"; try{ ev.dataTransfer.setData("text/plain", k); }catch(e){} ev.currentTarget.style.opacity = ".4"; }
function _ykDO(ev){ if(!YK.drag) return; ev.preventDefault(); var tr = ev.currentTarget, r = tr.getBoundingClientRect(), up = ev.clientY < r.top + r.height / 2; tr.style.boxShadow = up ? "inset 0 3px 0 #7c3aed" : "inset 0 -3px 0 #7c3aed"; tr.dataset.up = up ? "1" : ""; }
function _ykDP(ev, t, k){
  ev.preventDefault(); var tr = ev.currentTarget, up = tr.dataset.up === "1"; tr.style.boxShadow = ""; var D = YK.drag; YK.drag = null;
  if(!D || D.t !== t || D.k === k) return;
  var keys = (t === "item" ? _ykItemKeys() : _ykMatKeys()).filter(function(x){ return x !== D.k; }), i = keys.indexOf(k); keys.splice(up ? i : i + 1, 0, D.k);
  var path = t === "item" ? "items" : "mats", up2 = {}; keys.forEach(function(x, j){ up2[path + "/" + x + "/ord"] = (j + 1) * 10; });
  _ykRef().update(up2).then(function(){ keys.forEach(function(x, j){ if(YK.D[path][x]) YK.D[path][x].ord = (j + 1) * 10; }); toast("순서 바꿨어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function _ykPick(t, i, v){
  var isI = t === "item", ok = !v || !!(isI ? _ykItem(v) : _ykMat(v));
  var h = '<div style="display:flex;gap:4px;align-items:center">' + _ykCb(isI ? "item" : "mat", v, "_ykPicked2('" + t + "'," + i + ",V)", isI ? "품명 쳐서 찾기" : "원료 쳐서 찾기", "flex:1;min-width:" + (isI ? 130 : 150) + "px;padding:7px 8px;font-size:" + (_ykMob() ? 16 : 14) + "px;font-weight:700;border:2px solid " + (ok ? (v ? "#b45309" : "#cbd5e1") : "#dc2626") + ";border-radius:8px;background:" + (ok ? (v ? "#fff7ed" : "#fff") : "#fef2f2") + ";color:" + (ok ? "#111" : "#b91c1c"));
  if(ok && v && _ykCan()) h += '<button class="btn" title="이 ' + (isI ? "정품" : "원료") + ' 고치기 (가격·박스·무게 등) — 작업 화면 그대로" style="background:#2563eb;color:#fff;padding:5px 7px;font-size:12px;white-space:nowrap" onclick="YK.after={t:\'' + t + '\',i:' + i + ',old:\'' + esc(v) + '\'};' + (isI ? 'ykItemEdit' : 'ykMatEdit') + '(\'' + esc(_ykKey(v)) + '\')">수정</button>';
  h += '<button class="btn" title="새 ' + (isI ? "품명" : "원료") + ' 추가" style="background:#16a34a;color:#fff;padding:5px 9px;font-weight:900" onclick="_ykAddNew(\'' + t + '\',' + i + ',\'' + (ok ? "" : esc(v)) + '\')">+</button></div>';
  return h;
}
function _ykPicked2(t, i, v){
  if(v === "__new"){ return _ykAddNew(t, i, ""); }
  if(t === "item") YK.ed.w.rows[i].item = v; else YK.ed.w.mats[i].nm = v;
  draw();
}
function _ykPicked(t, i, el){
  if(el.value === "__new"){ var cur = t === "item" ? YK.ed.w.rows[i].item : YK.ed.w.mats[i].nm; el.value = cur || ""; return _ykAddNew(t, i, ""); }
  if(t === "item") YK.ed.w.rows[i].item = el.value; else YK.ed.w.mats[i].nm = el.value;
  draw();
}
function _ykAddNew(t, i, pre){ YK.after = { t: t, i: i, old: YK.ed ? (t === "item" ? (YK.ed.w.rows[i] || {}).item : (YK.ed.w.mats[i] || {}).nm) || "" : "" }; if(t === "item") ykItemEdit("", pre); else ykMatEdit("", pre); }
function _ykAfter(t, nm){ var a = YK.after; if(a && a.q && t === "item"){ YK.after = null; if(YK.ed) YK.ed.qi = nm; return; } YK.after = null; if(!a || a.t !== t || !YK.ed) return; var cur = t === "item" ? (YK.ed.w.rows[a.i] || {}).item : (YK.ed.w.mats[a.i] || {}).nm; if(a.old != null && (cur || "") !== a.old) return;
  // 이름을 바꿨으면 이 작업에서 같은 이름 쓰는 줄 모두 새 이름으로
  if(a.old && a.old !== nm){ if(t === "item") YK.ed.w.rows.forEach(function(r){ if(r.item === a.old) r.item = nm; }); else YK.ed.w.mats.forEach(function(m){ if(m.nm === a.old) m.nm = nm; }); } if(t === "item" && YK.ed.w.rows[a.i]) YK.ed.w.rows[a.i].item = nm; if(t === "mat" && YK.ed.w.mats[a.i]) YK.ed.w.mats[a.i].nm = nm; }
function _ykUnregPop(w){
  var bi = [], bm = [];
  w.rows.forEach(function(r, i){ if(r.item && !_ykItem(r.item)) bi.push([i, r.item]); });
  w.mats.forEach(function(m, i){ if(m.nm && !_ykMat(m.nm)) bm.push([i, m.nm]); });
  if(!bi.length && !bm.length) return false;
  var h = '<h3 style="margin:0 0 10px;color:#b91c1c">⚠ 등록 안 된 이름이 있어요 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="font-size:13px;margin-bottom:8px">정품표·원료표에 없는 이름이라 가격·박스·마리수를 몰라서 계산이 틀려요. 추가하거나 목록에서 골라 주세요.</div>';
  var row = function(t, x){ return '<div style="display:flex;justify-content:space-between;align-items:center;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;padding:7px 10px;margin-bottom:6px"><span><b style="color:#b91c1c">' + esc(x[1]) + '</b> <span class="mut" style="font-size:12px">' + (t === "item" ? "품명" : "원료") + '</span></span>' + _bsB("#16a34a", "+ " + (t === "item" ? "정품으로" : "원료로") + " 추가", "_ykAddNew('" + t + "'," + x[0] + ",'" + esc(x[1]) + "')", "padding:4px 10px") + '</div>'; };
  bi.forEach(function(x){ h += row("item", x); }); bm.forEach(function(x){ h += row("mat", x); });
  openPopup(h, 460); return true;
}
function ykItemDel(k){ if(!confirm(_ykS().items[k].nm + " 정품을 지울까요?")) return; _ykRef("items/" + k).remove().then(function(){ delete YK.D.items[k]; closePopup(); draw(); }); }
function ykMatEdit(k, pre){
  var x = k ? Object.assign({}, _ykS().mats[k]) : { nm: pre || "", mi: "", kg: "", price: "" }; ["mi", "kg", "price"].forEach(function(f){ if(!_bsN(x[f])) x[f] = ""; }); if(x.price) x.price = _wonFmt(x.price);
  var F = function(lb, f, t, ph){ return '<label style="font-size:13.5px;font-weight:700;display:flex;flex-direction:column;gap:3px">' + lb + '<input id="ym_' + f + '" ' + (f === "price" ? 'type="text" inputmode="numeric" data-won' : 'type="' + (t || "text") + '"') + (t === "number" && f !== "price" ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(x[f] == null ? "" : x[f]) + '" placeholder="' + (ph || "") + '" oninput="_ymHint()" style="width:100%;padding:10px;font-size:16px;font-weight:400;border:1px solid #cbd5e1;border-radius:7px;box-sizing:border-box' + (t === "number" ? ';text-align:right' : '') + '"></label>'; };
  var h = '<div onkeydown="if(event.key===\'Enter\'){event.preventDefault();ykMatSave(\'' + esc(k || "") + '\')}"><h3 style="margin:0 0 4px">🐟 ' + (k ? "원료 고치기" : "원료 등록") + '</h3><div class="mut" style="font-size:12px;margin-bottom:12px">짝 = 원료 한 상자(한 짝) · Enter = 저장</div>';
  h += '<div style="display:grid;grid-template-columns:1fr;gap:10px">' + F("원료명", "nm", "text", "예: 부세30미") + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">' + F("짝당 마리수 *", "mi", "number", "예: 30") + F("짝당 무게 (kg)", "kg", "number", "예: 8.8") + F("짝당 값 (원)", "price", "number", "예: 105000") + '</div></div>';
  h += '<div id="ym_hint" style="font-size:12.5px;color:#475569;margin-top:8px;min-height:18px"></div>';
  h += '<div style="display:flex;justify-content:space-between;gap:6px;margin-top:12px;flex-wrap:wrap"><span>' + (k ? _bsB("#dc2626", "🗑 삭제", "ykMatDel('" + esc(k) + "')") : "") + '</span><span style="display:flex;gap:6px;flex-wrap:wrap">' + _bsB("#475569", "닫기", "closePopup()") + (k ? "" : _bsB("#0e7490", "저장하고 하나 더", "YK.matMore=1;ykMatSave('')")) + _bsB("#16a34a", "💾 저장", "ykMatSave('" + esc(k || "") + "')", "padding:9px 22px") + '</span></div></div>';
  openPopup(h, 520); _ymHint(); setTimeout(function(){ var e = document.getElementById(k ? "ym_price" : "ym_nm"); if(e){ e.focus(); if(e.select) e.select(); } }, 30);
}
function _ymHint(){ var g = function(f){ return _bsN((document.getElementById("ym_" + f) || {}).value); }, mi = g("mi"), kg = g("kg"), pr = g("price"), el = document.getElementById("ym_hint"); if(!el) return;
  el.innerHTML = mi ? '마리당 ' + (kg ? '<b>' + Math.round(kg * 1000 / mi) + 'g</b>' : '무게 ?') + ' · ' + (pr ? '<b>' + _ykWon(pr / mi) + '원</b>' : '값 ?') + (kg && pr ? ' · kg당 ' + _ykWon(pr / kg) + '원' : '') : '짝당 마리수를 넣으면 마리당 무게·값이 보여요'; }
function ykMatSave(k){
  var g = function(f){ return (document.getElementById("ym_" + f) || {}).value; }, v = { nm: (g("nm") || "").trim(), mi: _bsN(g("mi")), kg: _bsN(g("kg")), price: _bsN(g("price")) };
  if(!v.nm || !v.mi){ YK.matMore = 0; return toast("원료명과 짝당 마리수를 넣어 주세요", true); }
  var o0 = k ? (_ykS().mats || {})[k] : null; if(o0 && o0.ord != null) v.ord = o0.ord;
  var key = _ykKey(v.nm), up = {}; up["mats/" + key] = v; if(k && k !== key) up["mats/" + k] = null;
  _ykRef().update(up).then(function(){ YK.D.mats = YK.D.mats || {}; if(k && k !== key) delete YK.D.mats[k]; YK.D.mats[key] = v; closePopup(); toast("저장 — " + v.nm); _ykAfter("mat", v.nm); draw(); if(YK.matMore){ YK.matMore = 0; ykMatEdit(""); } }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykMatDel(k){ if(!confirm(_ykS().mats[k].nm + " 원료를 지울까요?")) return; _ykRef("mats/" + k).remove().then(function(){ delete YK.D.mats[k]; closePopup(); draw(); }); }

// ════════ 🖨 인쇄: 전표 · 라벨 · 작업현황표 · 생산작업일지 ════════
function _ykWin(title, css, body){
  var w = window.open("", "_blank", "width=920,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111}table{border-collapse:collapse}.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}}' + css + '@media print{html,body{height:auto!important}.pg:last-child,.sheet:last-child{break-after:auto!important;page-break-after:auto!important}}</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + body + '</body></html>');
  w.document.close();
}
function ykPrintSlip(){
  var w = YK.ed.w, c = _ykCalc(w), st = { rate: _ykRate(YK.ed.w) }, PI = _ykPayInfo(), names = w.ws.filter(function(n){ return (c.workers[n] || {}).amt; });
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
// ── 라벨: 프리셋(모양) 마음대로 — 칸마다 위치·크기·글자 크기 바꾸기. 기본 = 품명 크게 · QR + 로트(색) (몇/총) · QR 내용 ──
var YK_LCOL = { "노랑": "#fde047", "분홍": "#f9a8d4", "빨강": "#f87171", "초록": "#86efac", "파랑": "#93c5fd", "주황": "#fdba74", "보라": "#c4b5fd", "하늘": "#bae6fd", "연두": "#d9f99d", "회색": "#d1d5db" };
var YK_LDEF = { paper: "a4", cols: 3, rows: 9, w: 63.5, h: 29.6, top: 15.3, left: 7.25, gx: 2.5, gy: 0 };
function _ykLset(){ return Object.assign({}, YK_LDEF, (_ykS().set || {}).lbl || {}); }
// 라벨에 들어가는 칸들
var YK_LEL = [
  { k: "nm", t: "txt", lb: "품명 (왕장8)" },
  { k: "lot", t: "txt", lb: "로트(색) (몇/총)" },
  { k: "qr", t: "qr", lb: "QR 코드" },
  { k: "qtxt", t: "txt", lb: "QR 내용 글자" },
  { k: "bc", t: "bc", lb: "바코드 (Code39)" },
  { k: "code", t: "txt", lb: "바코드 번호 (GA0006)" }
];
// 기본 프리셋 2개 — 엑셀 라벨메일머지(A4 3×9, 68% 축소 인쇄) · 롤라벨메일머지를 60×30에 맞춘 것
function _ykLpre(){
  var g = _ykLset();
  return {
    a4: { nm: "A4 27칸 (엑셀 모양)", paper: "a4", w: g.w, h: g.h, cols: g.cols, rows: g.rows, top: g.top, left: g.left, gx: g.gx, gy: g.gy, els: {
      nm: { on: true, x: 0, y: 0.6, w: g.w, fs: 40, b: true, al: "center" },
      lot: { on: true, x: 9.5, y: 18.2, w: g.w - 10, fs: 13.5, b: true, al: "center" },
      qr: { on: true, x: 0.8, y: 18.4, s: 8.6 },
      qtxt: { on: false, x: 9.5, y: 25.3, w: g.w - 10, fs: 6, b: false, al: "center" },
      bc: { on: false, x: 10, y: 18, w: 43, h: 6 },
      code: { on: false, x: 0, y: 25, w: g.w, fs: 7, b: false, al: "center" } } },
    roll: { nm: "60×30 라벨 프린터 (엑셀 모양)", paper: "roll", w: 60, h: 30, els: {
      nm: { on: true, x: 0, y: 0.5, w: 60, fs: 26, b: true, al: "center" },
      lot: { on: true, x: 11.5, y: 13.8, w: 48, fs: 10, b: true, al: "center" },
      qr: { on: true, x: 1, y: 13.6, s: 10 },
      qtxt: { on: false, x: 11.5, y: 20.5, w: 48, fs: 6.5, b: true, al: "center" },
      bc: { on: false, x: 12, y: 21, w: 46, h: 7 },
      code: { on: false, x: 0, y: 26, w: 60, fs: 7, b: false, al: "center" } } }
  };
}
function _ykLps(){ var d = _ykLpre(), s = (_ykS().set || {}).lblP || {}, o = {}; Object.keys(d).forEach(function(k){ o[k] = d[k]; }); Object.keys(s).forEach(function(k){ if(s[k]) o[k] = s[k]; }); return o; }
function _ykLp(id){ var L = _ykLps(); var p = JSON.parse(JSON.stringify(L[id] || L.a4)); var d = _ykLpre()[p.paper === "roll" ? "roll" : "a4"]; p.els = p.els || {}; YK_LEL.forEach(function(e){ p.els[e.k] = Object.assign({}, d.els[e.k], p.els[e.k] || {}); }); return p; }
function _ykStamp(){ var d = new Date(), z = function(n){ return String(n).padStart(2, "0"); }; return String(d.getFullYear()).slice(2) + "." + z(d.getMonth() + 1) + "." + z(d.getDate()) + " " + z(d.getHours()) + "_" + z(d.getMinutes()); }
function _ykLabels(w){
  var c = _ykCalc(w), st = _ykSet(), lot = _ykLot(w.dt), out = [], skip = [], stamp = _ykStamp();
  c.rows.forEach(function(x){ var I = x.I || {}; if(!x.boxes) return;
    if(I.noLbl){ skip.push(x.item + " (라벨 안 뽑음)"); return; } if(I.under && x.boxes <= _bsN(I.under)){ skip.push(x.item + " " + x.boxes + "박스 (" + I.under + "박스 이하)"); return; }
    for(var b = 1; b <= x.boxes; b++) for(var k = 0; k < Math.max(1, _bsN(st.lblPer)); k++) out.push({ item: x.item, col: I.color || "", nm: x.item + x.box, lot: lot + (I.color ? "(" + I.color + ")" : ""), n: b + "/" + x.boxes, code: I.code || "", qr: (I.code ? "*" + I.code + "*" : "") + x.item + "/" + x.box + "/" + lot + "///" + stamp }); });
  return { list: out, skip: skip };
}
function _ykLsample(){ return { item: "왕장", col: "빨강", nm: "왕장8", lot: "210A02(빨강)", n: "1/19", code: "GA0006", qr: "*GA0006*왕장/8/210A02///24.12.25 11_48" }; }
function _ykQrImg(txt){ if(typeof qrcode === "undefined") return ""; try{ var q = qrcode(0, "M"); q.addData(unescape(encodeURIComponent(txt))); q.make(); return q.createDataURL(6, 0); }catch(e){ return ""; } }
function _ykLtxt(k, l){ return k === "nm" ? l.nm : k === "lot" ? l.lot + (l.n ? " (" + l.n + ")" : "") : k === "qtxt" ? l.qr : k === "code" ? l.code : ""; }
// 라벨 한 장 HTML (mm 단위) — sel: 편집 중 고른 칸 표시
function _ykLblHtml(P, l, bg, sel){
  var h = '<div class="ylb" style="position:relative;width:' + P.w + 'mm;height:' + P.h + 'mm;overflow:hidden;box-sizing:border-box;background:' + (bg || "#fff") + ';color:#000;font-family:\'Malgun Gothic\',\'맑은 고딕\',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact">';
  YK_LEL.forEach(function(d){ var e = P.els[d.k]; if(!e || !e.on) return;
    var pos = 'position:absolute;left:' + e.x + 'mm;top:' + e.y + 'mm;' + (sel ? 'cursor:move;' + (sel === d.k ? 'outline:1.5px solid #7c3aed;background:rgba(124,58,237,.08);' : 'outline:1px dashed rgba(100,116,139,.5);') : '');
    var at = sel ? ' data-k="' + d.k + '" onmousedown="_ylpDown(event,\'' + d.k + '\')" ontouchstart="_ylpDown(event,\'' + d.k + '\')"' : '';
    if(d.t === "txt"){ var tx = _ykLtxt(d.k, l) || "", fs = e.fs; if(e.fit !== false && tx){ var em = 0; for(var ci = 0; ci < tx.length; ci++) em += tx.charCodeAt(ci) > 0x2000 ? 1 : (/[A-Z0-9]/.test(tx[ci]) ? 0.62 : 0.5); fs = Math.min(fs, Math.floor(e.w * 2.835 / (em * 1.03) * 10) / 10); }
      h += '<div' + at + ' style="' + pos + 'width:' + e.w + 'mm;font-size:' + fs + 'pt;font-weight:' + (e.b ? 900 : 400) + ';text-align:' + (e.al || "center") + ';line-height:1.12;white-space:nowrap;overflow:hidden">' + esc(tx || (sel ? "(빈칸)" : "")) + '</div>'; }
    else if(d.t === "qr"){ var src = _ykQrImg(l.qr); h += '<div' + at + ' style="' + pos + 'width:' + e.s + 'mm;height:' + e.s + 'mm">' + (src ? '<img src="' + src + '" style="width:100%;height:100%;display:block;image-rendering:pixelated" draggable="false">' : '<div style="width:100%;height:100%;border:1px solid #000;font-size:6pt;display:flex;align-items:center;justify-content:center">QR</div>') + '</div>'; }
    else if(d.t === "bc") h += '<div' + at + ' style="' + pos + 'width:' + e.w + 'mm;height:' + e.h + 'mm;line-height:0">' + (l.code ? _ykC39(l.code, 40).replace('style="width:100%;height:40px"', 'style="width:100%;height:100%"') : '') + '</div>';
  });
  return h + '</div>';
}

// ── 🏷 라벨 뽑기 창: 프리셋 고르기 · 색 · 시작 칸 · QZ ──
function ykPrintLabel(){
  var L = _ykLabels(YK.ed.w);
  if(!L.list.length) return toast("뽑을 라벨이 없어요" + (L.skip.length ? " — " + L.skip.join(", ") : ""), true);
  var S = _ykLset(), Ps = _ykLps(), pid = YK.lpid && Ps[YK.lpid] ? YK.lpid : (S.pid && Ps[S.pid] ? S.pid : "a4"), P = _ykLp(pid), items = {};
  YK.lpid = pid;
  L.list.forEach(function(l){ if(!items[l.item]) items[l.item] = { n: 0, col: l.col }; items[l.item].n++; });
  if(!YK.lc) YK.lc = {}; Object.keys(items).forEach(function(k){ if(YK.lc[k] == null) YK.lc[k] = items[k].col || ""; });
  var h = '<h3 style="margin:0 0 10px">🏷 라벨 뽑기 · ' + L.list.length + '장 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  if(L.skip.length) h += '<div style="font-size:12px;color:#92400e;background:#fffbeb;border-radius:6px;padding:5px 8px;margin-bottom:8px">안 뽑는 품명: ' + L.skip.map(esc).join(" · ") + '</div>';
  h += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b style="font-size:13px">라벨 모양</b><select onchange="YK.lpid=this.value;ykPrintLabel()" style="flex:1;min-width:220px;padding:8px;font-size:14px;font-weight:700;border:2px solid #7c3aed;border-radius:8px;background:#f5f3ff;color:#5b21b6;cursor:pointer">' + Object.keys(Ps).map(function(k){ return '<option value="' + esc(k) + '"' + (k === pid ? " selected" : "") + '>' + (Ps[k].paper === "roll" ? "🖨 " : "📄 ") + esc(Ps[k].nm || k) + '</option>'; }).join("") + '</select>' + (_ykCan() ? _bsB("#7c3aed", "✏ 모양 고치기", "YK.lpBack=1;ykLblEdit('" + esc(pid) + "')", "padding:7px 12px") : "") + '</div>';
  var s0 = L.list[0];
  h += '<div style="display:flex;justify-content:center;background:#f1f5f9;border-radius:8px;padding:10px;margin:10px 0"><div style="box-shadow:0 1px 4px rgba(0,0,0,.25);overflow:hidden;width:' + (P.w * 1.6) + 'mm;height:' + (P.h * 1.6) + 'mm"><div style="transform:scale(1.6);transform-origin:0 0">' + _ykLblHtml(P, s0, P.paper === "a4" ? (YK_LCOL[YK.lc[s0.item]] || "") : "") + '</div></div></div>';
  if(P.paper === "a4"){
    h += '<div style="font-size:13px;font-weight:700;margin:6px 0 4px">품명별 인쇄 색 <span class="mut" style="font-weight:400;font-size:12px">— 정품표의 라벨 색이 먼저 골라져 있어요</span></div>';
    Object.keys(items).forEach(function(k){ var c = YK.lc[k]; h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span id="ylS_' + _ykKey(k) + '" style="width:26px;height:18px;border-radius:4px;border:1px solid #94a3b8;background:' + (YK_LCOL[c] || "#fff") + '"></span><b style="min-width:110px">' + esc(k) + '</b><span class="mut" style="font-size:12px;min-width:44px">' + items[k].n + '장</span><select onchange="YK.lc[\'' + esc(k) + '\']=this.value;document.getElementById(\'ylS_' + _ykKey(k) + '\').style.background=YK_LCOL[this.value]||\'#fff\'" style="padding:5px;border:1px solid #cbd5e1;border-radius:6px"><option value="">흰색 (색 없음)</option>' + Object.keys(YK_LCOL).map(function(n){ return '<option' + (n === c ? " selected" : "") + '>' + n + '</option>'; }).join("") + '</select></div>'; });
    var per = P.cols * P.rows;
    h += '<div style="display:flex;gap:10px;align-items:center;margin-top:8px;font-size:13px">시작 칸 <input id="yl_start" type="number" min="1" max="' + per + '" value="1" style="width:70px;padding:5px;border:1px solid #cbd5e1;border-radius:6px"> <span class="mut" style="font-size:12px">쓰다 남은 라벨지면 비어 있는 첫 칸 번호 (왼쪽 위부터 1~' + per + ')</span></div>';
    h += '<div style="display:flex;justify-content:flex-end;margin-top:12px">' + _bsB("#7c3aed", "🖨 A4 라벨 인쇄", "ykPrintLabelGo()", "padding:9px 22px") + '</div>';
  } else {
    h += '<div id="ml_qz_box" style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:8px;padding:8px 10px;font-size:13px"></div>';
    h += '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px">' + _bsB("#475569", "브라우저로 인쇄", "ykPrintLabelGo('web')", "padding:9px 14px") + _bsB("#7c3aed", "🖨 라벨 프린터로 출력 (QZ)", "ykPrintLabelGo('qz')", "padding:9px 20px") + '</div>';
  }
  openPopup(h, 620);
  if(P.paper !== "a4" && typeof _qzUpdateUI === "function"){ try{ _qzUpdateUI(); if(typeof qz !== "undefined" && !(qz.websocket && qz.websocket.isActive()) && typeof qzConnect === "function") qzConnect(); else if(typeof _qzScan === "function") _qzScan(); }catch(e){} }
}
function ykPrintLabelGo(how){
  var L = _ykLabels(YK.ed.w), pid = YK.lpid || "a4", P = _ykLp(pid);
  var S = _ykLset(); S.pid = pid; _ykRef("set/lbl").set(S).catch(function(){}); YK.D.set = YK.D.set || {}; YK.D.set.lbl = S;
  var PC = '-webkit-print-color-adjust:exact;print-color-adjust:exact;';
  if(P.paper === "a4"){
    var per = P.cols * P.rows, start = Math.max(1, Math.min(per, Math.round(_bsN((document.getElementById("yl_start") || {}).value)) || 1)), cells = [];
    for(var i = 1; i < start; i++) cells.push('<div class="cell"></div>');
    L.list.forEach(function(l){ cells.push('<div class="cell">' + _ykLblHtml(P, l, YK_LCOL[YK.lc[l.item]] || "") + '</div>'); });
    var pages = []; for(var p = 0; p < cells.length; p += per) pages.push('<div class="sheet">' + cells.slice(p, p + per).join("") + '</div>');
    var css = '@page{size:A4;margin:0}body{' + PC + '}.sheet{width:210mm;height:296mm;padding:' + P.top + 'mm 0 0 ' + P.left + 'mm;display:grid;grid-template-columns:repeat(' + P.cols + ',' + P.w + 'mm);grid-auto-rows:' + P.h + 'mm;column-gap:' + P.gx + 'mm;row-gap:' + P.gy + 'mm;break-after:page;overflow:hidden;margin:0 auto;box-sizing:border-box}.sheet:last-child{break-after:auto}.cell{width:' + P.w + 'mm;height:' + P.h + 'mm;outline:1px dashed #bbb}@media screen{.sheet{box-shadow:0 0 0 1px #94a3b8;margin:10px auto}}@media print{.cell{outline:none}}';
    closePopup(); return _ykWin("라벨 " + YK.ed.w.dt + " (" + L.list.length + "장)", css, pages.join(""));
  }
  if(how === "qz"){
    if(typeof qzIsReady !== "function" || !qzIsReady()) return toast("QZ Tray 연결·프린터 선택을 먼저 해 주세요 (위 칸)", true);
    if(!confirm(L.list.length + "장을 라벨 프린터로 출력할까요?")) return;
    var useBmp = false, useRaw = false; try{ useBmp = localStorage.getItem("_mlBitmap") === "1"; useRaw = localStorage.getItem("_mlRawShare") === "1"; }catch(e){}
    var fn = useRaw ? _qzPrintLabelsRaw : (useBmp ? _qzPrintLabelsBitmap : _qzPrintLabels);
    var def = { key: "yk", columns: [], __html: function(l){ return _ykLblHtml(P, l, ""); } };
    window.__mlCancel = false; toast("🖨 " + L.list.length + "장 보내는 중...");
    return Promise.resolve(fn(def, L.list, { w: P.w, h: P.h, gap: 2 })).then(function(ok){ if(ok && ok !== "cancel") closePopup(); });
  }
  var b = L.list.map(function(l){ return '<div class="pg">' + _ykLblHtml(P, l, "") + '</div>'; }).join("");
  var css2 = '@page{size:' + P.w + 'mm ' + P.h + 'mm;margin:0}.pg{width:' + P.w + 'mm;height:' + (P.h - 0.6) + 'mm;break-after:page;overflow:hidden}.pg:last-child{break-after:auto}@media screen{.pg{outline:1px dashed #999;margin:6px auto}}';
  closePopup(); _ykWin("라벨 " + YK.ed.w.dt + " (" + L.list.length + "장)", css2, b);
}

// ── ✏ 라벨 모양 고치기: 끌어서 옮기기 + 숫자로 정확히 ──
var YK_LK = 2; // 편집 화면 확대 배율
function ykLblEdit(pid){
  if(!_ykCan()) return toast("고칠 권한이 없어요", true);
  YK.lpE = { id: pid || "a4", p: _ykLp(pid || "a4"), sel: "nm" };
  _ylpRender();
}
function _ylpRender(){
  var E = YK.lpE, P = E.p, Ps = _ykLps(), l = YK.ed ? (_ykLabels(YK.ed.w).list[0] || _ykLsample()) : _ykLsample();
  var I = function(lb, f, v, st, w){ return '<label style="font-size:12px;display:inline-flex;flex-direction:column;gap:2px">' + lb + '<input type="number" step="' + (st || 0.1) + '" value="' + v + '" onchange="' + f + '" style="width:' + (w || 70) + 'px;padding:5px;border:1px solid #cbd5e1;border-radius:6px"></label>'; };
  var h = '<h3 style="margin:0 0 10px">✏ 라벨 모양 고치기 <button class="btn" style="background:#475569;float:right" onclick="_ylpClose()">닫기</button></h3>';
  h += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><select onchange="ykLblEdit(this.value)" style="padding:7px;font-weight:700;border:2px solid #7c3aed;border-radius:8px;background:#f5f3ff;color:#5b21b6">' + Object.keys(Ps).map(function(k){ return '<option value="' + esc(k) + '"' + (k === E.id ? " selected" : "") + '>' + (Ps[k].paper === "roll" ? "🖨 " : "📄 ") + esc(Ps[k].nm || k) + '</option>'; }).join("") + '</select>';
  h += '<label style="font-size:12px">이름 <input value="' + esc(P.nm || "") + '" oninput="YK.lpE.p.nm=this.value" style="width:200px;padding:6px;border:1px solid #cbd5e1;border-radius:6px"></label>';
  h += '<select onchange="YK.lpE.p.paper=this.value;_ylpRender()" style="padding:6px;border:1px solid #cbd5e1;border-radius:6px"><option value="a4"' + (P.paper === "a4" ? " selected" : "") + '>📄 A4 여러 칸 (색 인쇄)</option><option value="roll"' + (P.paper === "roll" ? " selected" : "") + '>🖨 라벨 프린터 낱장 (QZ)</option></select></div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' + I("라벨 가로 mm", "YK.lpE.p.w=+this.value;_ylpRender()", P.w) + I("라벨 세로 mm", "YK.lpE.p.h=+this.value;_ylpRender()", P.h);
  if(P.paper === "a4") h += I("가로 칸 수", "YK.lpE.p.cols=+this.value", P.cols || 3, 1, 60) + I("세로 칸 수", "YK.lpE.p.rows=+this.value", P.rows || 9, 1, 60) + I("위 여백", "YK.lpE.p.top=+this.value", P.top || 0) + I("왼쪽 여백", "YK.lpE.p.left=+this.value", P.left || 0) + I("가로 간격", "YK.lpE.p.gx=+this.value", P.gx || 0) + I("세로 간격", "YK.lpE.p.gy=+this.value", P.gy || 0);
  h += '</div>';
  // 칸 고르기
  h += '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' + YK_LEL.map(function(d){ var e = P.els[d.k], on = E.sel === d.k; return '<span style="display:inline-flex;align-items:center;gap:4px;border:2px solid ' + (on ? "#7c3aed" : "#e2e8f0") + ';background:' + (on ? "#f5f3ff" : "#fff") + ';border-radius:14px;padding:3px 9px;font-size:12.5px;cursor:pointer" onclick="YK.lpE.sel=\'' + d.k + '\';_ylpRender()"><input type="checkbox" ' + (e.on ? "checked" : "") + ' onclick="event.stopPropagation()" onchange="YK.lpE.p.els.' + d.k + '.on=this.checked;YK.lpE.sel=\'' + d.k + '\';_ylpRender()" title="보이기"><b style="color:' + (e.on ? "#111" : "#94a3b8") + '">' + d.lb + '</b></span>'; }).join("") + '</div>';
  // 미리보기 (끌어서 옮기기)
  h += '<div style="background:#e2e8f0;border-radius:8px;padding:14px;overflow:auto;display:flex;justify-content:center"><div id="ylpCv" style="overflow:hidden;width:' + (P.w * YK_LK) + 'mm;height:' + (P.h * YK_LK) + 'mm;box-shadow:0 2px 8px rgba(0,0,0,.3)"><div style="transform:scale(' + YK_LK + ');transform-origin:0 0">' + _ykLblHtml(P, l, P.paper === "a4" ? (YK_LCOL[l.col] || "") : "", E.sel) + '</div></div></div>';
  h += '<div class="mut" style="font-size:12px;margin:4px 0 8px;text-align:center">칸을 마우스로 끌어서 옮기세요 · 아래 숫자로 정확히 맞출 수 있어요 (단위 mm, 글자는 pt)</div>';
  // 고른 칸 설정
  var d = YK_LEL.filter(function(x){ return x.k === E.sel; })[0], e = P.els[E.sel], F = function(f){ return "YK.lpE.p.els." + E.sel + "." + f + "=+this.value;_ylpRender()"; };
  h += '<div style="border:1px solid #ddd6fe;background:#faf5ff;border-radius:8px;padding:8px 10px;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end"><b style="font-size:13px;color:#5b21b6;align-self:center">' + d.lb + '</b>' + I("왼쪽 x", F("x"), e.x) + I("위 y", F("y"), e.y);
  if(d.t === "txt") h += I("가로폭", F("w"), e.w) + I("글자 크기 pt", F("fs"), e.fs, 0.5) + '<label style="font-size:12px"><input type="checkbox" ' + (e.b ? "checked" : "") + ' onchange="YK.lpE.p.els.' + E.sel + '.b=this.checked;_ylpRender()"> 굵게</label><label style="font-size:12px"><input type="checkbox" ' + (e.fit !== false ? "checked" : "") + ' onchange="YK.lpE.p.els.' + E.sel + '.fit=this.checked;_ylpRender()"> 넘치면 글자 줄이기</label><select onchange="YK.lpE.p.els.' + E.sel + '.al=this.value;_ylpRender()" style="padding:5px;border:1px solid #cbd5e1;border-radius:6px">' + [["left", "왼쪽 맞춤"], ["center", "가운데"], ["right", "오른쪽 맞춤"]].map(function(o){ return '<option value="' + o[0] + '"' + ((e.al || "center") === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>';
  else if(d.t === "qr") h += I("크기 (정사각)", F("s"), e.s);
  else h += I("가로폭", F("w"), e.w) + I("높이", F("h"), e.h);
  h += '</div>';
  h += '<div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap;margin-top:12px"><div style="display:flex;gap:6px">' + _bsB("#64748b", "↺ 엑셀 기본 모양", "_ylpReset()", "padding:8px 12px") + (_ykLpre()[E.id] ? "" : _bsB("#dc2626", "🗑 이 모양 지우기", "_ylpDel()", "padding:8px 12px")) + '</div><div style="display:flex;gap:6px">' + _bsB("#0e7490", "📄 새 모양으로 저장", "_ylpSave(true)", "padding:8px 14px") + _bsB("#16a34a", "💾 저장", "_ylpSave(false)", "padding:8px 22px") + '</div></div>';
  openPopup(h, 760);
}
function _ylpDown(ev, k){
  ev.preventDefault(); ev.stopPropagation();
  var E = YK.lpE, e = E.p.els[k], pt = ev.touches ? ev.touches[0] : ev, sx = pt.clientX, sy = pt.clientY, x0 = e.x, y0 = e.y, pxmm = 96 / 25.4 * YK_LK, moved = false;
  if(E.sel !== k){ E.sel = k; }
  var el = document.querySelector('#ylpCv [data-k="' + k + '"]');
  var mv = function(m){ var q = m.touches ? m.touches[0] : m; e.x = Math.round((x0 + (q.clientX - sx) / pxmm) * 10) / 10; e.y = Math.round((y0 + (q.clientY - sy) / pxmm) * 10) / 10; moved = true; if(el){ el.style.left = e.x + "mm"; el.style.top = e.y + "mm"; } if(m.cancelable) m.preventDefault(); };
  var up = function(){ document.removeEventListener("mousemove", mv); document.removeEventListener("mouseup", up); document.removeEventListener("touchmove", mv); document.removeEventListener("touchend", up); _ylpRender(); };
  document.addEventListener("mousemove", mv); document.addEventListener("mouseup", up); document.addEventListener("touchmove", mv, { passive: false }); document.addEventListener("touchend", up);
}
function _ylpReset(){ var E = YK.lpE, d = _ykLpre()[E.p.paper === "roll" ? "roll" : "a4"]; if(!confirm("이 모양을 엑셀 기본 모양으로 되돌릴까요? (저장해야 반영돼요)")) return; var nm = E.p.nm; E.p = JSON.parse(JSON.stringify(d)); if(!_ykLpre()[E.id]) E.p.nm = nm; _ylpRender(); }
function _ylpSave(asNew){
  var E = YK.lpE, P = JSON.parse(JSON.stringify(E.p)), id = E.id;
  if(!(P.w > 0 && P.h > 0)) return toast("라벨 가로·세로를 넣어 주세요", true);
  if(asNew){ var nm = prompt("새 모양 이름", (P.nm || "") + " 복사"); if(!nm) return; P.nm = nm.trim(); id = "p" + Date.now().toString(36); }
  _ykRef("set/lblP/" + id).set(P).then(function(){ YK.D.set = YK.D.set || {}; YK.D.set.lblP = YK.D.set.lblP || {}; YK.D.set.lblP[id] = P; YK.lpid = id; toast("라벨 모양 저장 — " + (P.nm || id)); if(asNew){ E.id = id; } _ylpClose(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function _ylpDel(){ var E = YK.lpE; if(!confirm((E.p.nm || E.id) + " 모양을 지울까요?")) return; _ykRef("set/lblP/" + E.id).remove().then(function(){ if(YK.D.set && YK.D.set.lblP) delete YK.D.set.lblP[E.id]; if(YK.lpid === E.id) YK.lpid = "a4"; toast("지웠어요"); _ylpClose(); }); }
function _ylpClose(){ var back = YK.lpBack && YK.ed; YK.lpBack = 0; YK.lpE = null; closePopup(); if(back) ykPrintLabel(); }
function ykPrintSheet(L){
  L = L || [YK.ed.w]; var T = L.length === 1 ? L[0].dt : L.length + "건";
  var b = L.map(function(w){ var c = _ykCalc(w), names = w.ws;
  var b = '<div class="pg"><h1>작 업 현 황</h1><table class="w"><tr><th>원료명</th><td>' + (w.mats || []).map(function(m){ return esc(m.nm); }).join(", ") + '</td><th>원료 수량</th><td>' + (w.mats || []).map(function(m){ return _bsW(m.qty) + '짝'; }).join(", ") + '</td><th>원산지</th><td>' + esc(w.origin || "") + '</td><th>상자재질</th><td>' + esc(w.boxMat || "") + '</td></tr></table>';
  b += '<div style="text-align:right;margin:2mm 0">' + _bsMD(w.dt) + ' · 로트 <b>' + esc(_ykLot(w.dt)) + '</b>' + (w.note ? ' · 비고: ' + esc(w.note) : '') + '</div><table class="w"><tr><th>작업자</th>' + names.map(function(n){ return '<th colspan="1">' + esc(n) + '</th>'; }).join("") + '<th>합계</th><th>실제</th><th>마리수</th><th>박스 수량</th><th>잔량</th></tr>';
  (w.rows || []).forEach(function(r, i){ var x = c.rows[i]; b += '<tr><th style="text-align:left">' + esc(r.item) + ' <span style="font-weight:400;font-size:10px">' + _ykRK(r) + '</span></th>' + names.map(function(n){ return '<td class="r">' + ((r.c || {})[n] || "") + '</td>'; }).join("") + '<td class="r"><b>' + _bsW(x.doo) + '</b></td><td class="r"><b>' + _bsW(x.pd) + '</b></td><td class="r">' + _bsW(x.pmi) + '</td><td class="r">' + _bsW(x.boxes) + '</td><td class="r">' + _bsW(x.rest) + '</td></tr>'; });
  b += '<tr><th>당일 작업 수량</th>' + names.map(function(n){ var W = c.workers[n] || {}; return '<td class="r"><b>' + _bsW((W.굴비 || 0) + (W.부세 || 0)) + '</b></td>'; }).join("") + '<td class="r"><b>' + _bsW(c.doo) + '</b></td><td class="r">' + _bsW(c.mi) + '</td><td class="r"><b>' + _bsW(c.boxes) + '</b></td><td></td></tr>';
  b += '<tr><th>당일 금액</th>' + names.map(function(n){ return '<td class="r">' + _ykWon((c.workers[n] || {}).amt) + '</td>'; }).join("") + '<td class="r"><b>' + _ykWon(c.weave) + '</b></td><td colspan="3"></td></tr></table>';
  b += '<table class="w" style="margin-top:3mm"><tr><th>원료 마리수</th><td class="r">' + _bsW(c.matMi) + '</td><th>작업 마리수</th><td class="r">' + _bsW(c.mi) + '</td><th>실제 마리수</th><td class="r">' + _bsW(c.actual) + '</td><th>수량 오차</th><td class="r"><b>' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + '</b></td></tr><tr><th>원료 kg</th><td class="r">' + _bsW(c.matKg) + '</td><th>소금 kg</th><td class="r">' + _bsW(Math.round(c.saltKg * 10) / 10) + '</td><th>총원가</th><td class="r">' + _ykWon(c.total) + '</td><th>도매가 마진율</th><td class="r">' + (c.rev.whole ? Math.round((c.rev.whole - c.total) / c.rev.whole * 1000) / 10 + '%' : '-') + '</td></tr></table></div>';
  return b; }).join("");
  _ykWin("작업현황 " + T, '@page{size:A4 landscape;margin:0}html,body{margin:0}.pg{box-sizing:border-box;width:297mm;padding:9mm 9mm 0;margin:0 auto;break-after:page}.pg:last-child{break-after:auto}h1{text-align:center;letter-spacing:10px;font-size:22px;margin:2mm 0 4mm}.w{width:100%}.w td,.w th{border:1px solid #333;padding:3px 5px;font-size:12px}.w th{background:#eef2f7}.r{text-align:right}', b);
}
function ykPrintProd(L){
  L = L || [YK.ed.w]; var st = _ykSet(), pages = [];
  // 원재료명 = 부세 / 참조기 (+원산지) · 크기 이름(부세30미 600짝)은 비고 · 굴비·부세 섞인 작업은 한 장씩 따로
  L.forEach(function(w){ var c = _ykCalc(w), G = {}, ord = [];
    var g = function(k){ if(!G[k]){ G[k] = { kg: 0, doo: 0, mats: [] }; ord.push(k); } return G[k]; };
    (w.mats || []).forEach(function(m){ if(!m.nm) return; var k = /부세/.test(m.nm) ? "부세" : "굴비", M = _ykMat(m.nm) || {}, x = g(k); x.kg += _bsN(m.qty) * _bsN(M.kg); x.mats.push(m.nm + (_bsN(m.qty) ? " " + _bsW(m.qty) + "짝" : "")); });
    c.rows.forEach(function(r){ if(r.pd) g(r.kind || "굴비").doo += r.pd; });
    if(!ord.length) g(_ykKindOf(w));
    ord.forEach(function(k){ var sp = _ykSaltPct(st, k), x = G[k], raw = (k === "부세" ? "부세" : "참조기") + (w.origin ? " (" + w.origin + ")" : ""), salt = Math.round(x.kg * sp / 100 * 10) / 10;
      var b = '<div class="pg"><h1>생 산 작 업 일 지</h1><table class="w"><tr><th>생산일자</th><td>' + _bsMD(w.dt) + '</td><th>제품명</th><td><b>' + esc(k) + '</b>' + (ord.length > 1 ? ' <span style="font-size:11px">(' + (ord.indexOf(k) + 1) + '/' + ord.length + ')</span>' : '') + '</td></tr></table><div style="margin:4mm 0 2mm;font-weight:800">원재료명 또는 성분 및 투입량</div><table class="w"><tr><th>원재료명 또는 성분명</th><th>배합비율(%)</th><th>투입량(kg)</th><th>비고</th></tr>';
      b += '<tr><td>' + esc(raw) + '</td><td class="r">' + (100 - sp) + '</td><td class="r">' + (x.kg ? _bsW(Math.round(x.kg * 10) / 10) : '') + '</td><td></td></tr><tr><td>소금</td><td class="r">' + sp + '</td><td class="r">' + (x.kg ? _bsW(salt) : '') + '</td><td></td></tr></table>';
      b += '<table class="w" style="margin-top:4mm"><tr><th>기 타</th><td colspan="3" style="height:14mm">' + esc(w.note || "") + '</td></tr><tr><th>포장방법 및 단위</th><td>' + esc(w.boxMat || "박스/스티로폼/팩") + '</td><th>생산량(두름)</th><td>' + _bsW(x.doo) + '</td></tr><tr><th>작 업 자</th><td>공장장</td><th>유통기한</th><td>작업일자로부터 2년</td></tr></table></div>';
      pages.push(b); }); });
  var T = pages.length === 1 ? L[0].dt : pages.length + "장";
  _ykWin("생산작업일지 " + T, '@page{size:A4;margin:0}html,body{margin:0}.pg{box-sizing:border-box;width:210mm;padding:12mm 12mm 0;margin:0 auto;break-after:page}.pg:last-child{break-after:auto}h1{text-align:center;letter-spacing:10px;font-size:24px;margin:2mm 0 6mm}.w{width:100%}.w td,.w th{border:1px solid #333;padding:5px 7px;font-size:13px}.w th{background:#eef2f7}.r{text-align:right}', pages.join(""));
}

// ════════ 📥📤 엑셀로 한꺼번에 등록 — 정품 · 원료 · 이모(명단 + 신고 정보) ════════
//   양식 = 지금 목록이 들어 있는 엑셀 → 고치거나 줄 더해서 올리면 이름(첫 칸) 기준으로 새로 추가·고침. 빈 칸은 안 지움, 목록에서 빼도 안 지움
var YK_XL = {
  item: { nm: "정품", path: "items", cols: [["nm", "품명", "s", 1], ["kind", "굴비/부세", "s"], ["box", "박스당 두름", "n"], ["mi", "두름 마리수 (10미/20미)", "n"], ["sale", "판매가 (두름당)", "n"], ["whole", "도매가 (두름당)", "n"], ["cost", "원가표 (두름당)", "n"], ["adj", "조절도매가 (두름당)", "n"], ["wt", "무게 (g)", "n"], ["color", "라벨 색", "s"], ["code", "바코드 (GA0005)", "s"], ["under", "N박스 이하 라벨 안 뽑음", "n"], ["noLbl", "라벨 안 뽑음 (O/X)", "b"], ["msg", "메모", "s"]] },
  mat: { nm: "원료", path: "mats", cols: [["nm", "원료명", "s", 1], ["mi", "짝당 마리수", "n"], ["kg", "짝당 무게 (kg)", "n"], ["price", "짝당 값 (원)", "n"]] },
  people: { nm: "이모", cols: [["nick", "이모 이름 (별명)", "s", 1], ["on", "📌 고정 (O/X)", "b"]] }
};
function _ykXlCols(t){ var c = YK_XL[t].cols.slice(); if(t === "people" && _ykBoss()) YK_INFO_F.forEach(function(f){ c.push([f[0], f[1], "s", 0, 1]); }); return c; }
async function ykXlTpl(t){
  var D = YK_XL[t], C = _ykXlCols(t), S = _ykS(), EJ;
  if(t === "people" && _ykBoss() && (!YK.info || YK.info.__err)){ try{ YK.info = (await fbDb.ref("/YkInfo").once("value")).val() || {}; }catch(e){ return toast("이모 신고 정보를 못 읽었어요: " + e.message, true); } }
  showLoading("엑셀 만드는 중..."); try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var wb = new EJ.Workbook(), ws = wb.addWorksheet(D.nm), rows = [];
  if(t === "item") _ykItemKeys().forEach(function(k){ rows.push(S.items[k]); });
  else if(t === "mat") _ykMatKeys().forEach(function(k){ rows.push(S.mats[k]); });
  else { var P = S.people || {}, I = YK.info || {}, nk = {}; Object.keys(P).forEach(function(n){ nk[n] = 1; }); Object.keys(I).forEach(function(n){ if(n !== "__err") nk[n] = 1; });
    Object.keys(nk).sort().forEach(function(n){ rows.push(Object.assign({ nick: n, on: (P[n] || {}).on !== false && !!P[n] }, I[n] || {})); }); }
  ws.columns = C.map(function(c){ return { header: c[1], key: c[0], width: c[3] ? 18 : c[2] === "n" ? 13 : c[0] === "addr" ? 30 : 15 }; });
  rows.forEach(function(r){ var o = {}; C.forEach(function(c){ var v = r[c[0]]; o[c[0]] = c[2] === "b" ? (v ? "O" : "") : (v == null ? "" : v); }); ws.addRow(o); });
  var hr = ws.getRow(1); hr.font = { bold: true, color: { argb: "FFFFFFFF" } }; hr.height = 22;
  C.forEach(function(c, i){ var cell = hr.getCell(i + 1); cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c[3] ? "FFB45309" : c[4] ? "FF7C3AED" : "FF334155" } }; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; if(c[2] !== "n") ws.getColumn(i + 1).numFmt = "@"; });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  var g = wb.addWorksheet("쓰는 법");
  ["· 첫 번째 칸(" + C[0][1] + ")이 같으면 그 줄을 고치고, 없는 이름이면 새로 추가해요", "· 빈 칸은 그대로 둬요 (지우지 않아요) · 목록에서 줄을 빼도 지워지지 않아요", "· O/X 칸은 O 또는 1 이면 켜짐", "· 줄 머리(1번째 줄) 이름은 바꾸지 마세요 — 칸 순서는 바꿔도 돼요"].concat(t === "people" && _ykBoss() ? ["· 보라색 칸(실명·주민번호·계좌 등)은 신고용 정보 — 사장님·관리자만 보고 올릴 수 있어요"] : []).forEach(function(x){ g.addRow([x]); });
  g.getColumn(1).width = 90;
  var buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = "엮거리_" + D.nm + "_양식_" + _bsToday() + ".xlsx"; document.body.appendChild(a); a.click(); a.remove(); hideLoading();
  toast("📥 " + D.nm + " 양식 (지금 목록 " + rows.length + "줄)");
}
function ykXlPick(t){ var i = document.createElement("input"); i.type = "file"; i.accept = ".xlsx"; i.onchange = function(){ if(i.files[0]) ykXlRead(t, i.files[0]); }; i.click(); }
async function ykXlRead(t, file){
  var D = YK_XL[t], C = _ykXlCols(t), S = _ykS(), EJ;
  if(t === "people" && _ykBoss() && (!YK.info || YK.info.__err)){ try{ YK.info = (await fbDb.ref("/YkInfo").once("value")).val() || {}; }catch(e){ return toast("이모 신고 정보를 못 읽었어요: " + e.message, true); } }
  showLoading("엑셀 읽는 중..."); try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var wb = new EJ.Workbook(); try { await wb.xlsx.load(await file.arrayBuffer()); } catch(e){ hideLoading(); return toast("엑셀(.xlsx)을 못 읽었어요: " + e.message, true); }
  var ws = wb.worksheets[0], col = {}, val = function(c){ var v = c && c.value; if(v && typeof v === "object"){ if(v.richText) v = v.richText.map(function(x){ return x.text; }).join(""); else if(v.result != null) v = v.result; else if(v.text != null) v = v.text; } return v == null ? "" : String(v).trim(); };
  ws.getRow(1).eachCell(function(c, n){ var h = val(c).replace(/\s+/g, ""); C.forEach(function(x){ if(h === x[1].replace(/\s+/g, "")) col[x[0]] = n; }); });
  hideLoading();
  if(!col[C[0][0]]) return toast("첫 줄에 「" + C[0][1] + "」 칸이 없어요 — 📥 엑셀 양식으로 받은 파일에 적어 주세요", true);
  var list = [], bad = [];
  for(var r = 2; r <= ws.rowCount; r++){ var row = ws.getRow(r), o = {}, any = false;
    C.forEach(function(x){ if(!col[x[0]]) return; var v = val(row.getCell(col[x[0]])); if(v === "") return; any = true;
      if(x[2] === "n"){ var n = _bsN(String(v).replace(/[,원\s]/g, "")); o[x[0]] = n; } else if(x[2] === "b") o[x[0]] = /^(o|ㅇ|1|y|yes|true|예|네|켬)$/i.test(v); else o[x[0]] = v; });
    if(!any) continue; var key = o[C[0][0]];
    if(!key){ bad.push(r + "번째 줄: " + C[0][1] + " 비어 있음"); continue; }
    if(t === "people" && /[.#$\[\]\/]/.test(key)){ bad.push(r + "번째 줄: 이름에 . # $ [ ] / 못 씀 (" + key + ")"); continue; }
    if(t === "mat" && !o.mi && !(S.mats || {})[_ykKey(key)]){ bad.push(r + "번째 줄: 새 원료는 짝당 마리수 필요 (" + key + ")"); continue; }
    list.push(o); }
  var cur = t === "item" ? S.items || {} : t === "mat" ? S.mats || {} : S.people || {}, isNew = function(o){ return t === "people" ? !cur[o.nick] && !(YK.info || {})[o.nick] : !cur[_ykKey(o.nm)]; };
  // 바뀐 게 없는 줄은 '그대로' — 등록에서 빼요
  var curOf = function(o){ return t === "people" ? Object.assign({ nick: o.nick, on: !!cur[o.nick] && cur[o.nick].on !== false }, (YK.info || {})[o.nick] || {}) : cur[_ykKey(o.nm)] || {}; };
  var same = function(o){ if(isNew(o)) return false; var c = curOf(o); return Object.keys(o).every(function(k){ var a = o[k], b = c[k]; return typeof a === "boolean" ? a === !!b : String(a) === String(b == null ? "" : b); }); };
  list.forEach(function(o){ o.__st = isNew(o) ? "new" : same(o) ? "same" : "chg"; });
  var nN = list.filter(function(o){ return o.__st === "new"; }).length, nC = list.filter(function(o){ return o.__st === "chg"; }).length, nS = list.length - nN - nC;
  list.sort(function(a, b){ var r = { new: 0, chg: 1, same: 2 }; return r[a.__st] - r[b.__st]; });
  YK.xl = { t: t, list: list.filter(function(o){ return o.__st !== "same"; }) };
  var h = '<h3 style="margin:0 0 10px">📤 ' + D.nm + ' 엑셀로 등록 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="display:flex;gap:8px;margin-bottom:8px"><div style="flex:1;background:#ecfdf5;border-radius:8px;padding:8px;text-align:center"><div class="mut" style="font-size:12px">새로 추가</div><b style="font-size:20px;color:#15803d">' + nN + '</b></div><div style="flex:1;background:#eff6ff;border-radius:8px;padding:8px;text-align:center"><div class="mut" style="font-size:12px">바뀜</div><b style="font-size:20px;color:#1d4ed8">' + nC + '</b></div><div style="flex:1;background:#f8fafc;border-radius:8px;padding:8px;text-align:center"><div class="mut" style="font-size:12px">그대로 (안 바뀜)</div><b style="font-size:20px;color:#64748b">' + nS + '</b></div>' + (bad.length ? '<div style="flex:1;background:#fef2f2;border-radius:8px;padding:8px;text-align:center"><div class="mut" style="font-size:12px">못 넣는 줄</div><b style="font-size:20px;color:#dc2626">' + bad.length + '</b></div>' : '') + '</div>';
  if(bad.length) h += '<div style="font-size:12px;color:#b91c1c;background:#fef2f2;border-radius:6px;padding:6px 8px;margin-bottom:8px;max-height:90px;overflow:auto">' + bad.map(esc).join("<br>") + '</div>';
  var shown = C.filter(function(x){ return list.some(function(o){ return o[x[0]] != null; }); });
  h += '<div style="max-height:46vh;overflow:auto;border:1px solid #e2e8f0;border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="background:#f8fafc;position:sticky;top:0"><th></th>' + shown.map(function(x){ return '<th style="padding:5px;text-align:left;white-space:nowrap">' + esc(x[1]) + '</th>'; }).join("") + '</tr></thead><tbody>';
  list.forEach(function(o){ var st = o.__st, oc = st === "chg" ? curOf(o) : {}; h += '<tr style="border-top:1px solid #f1f5f9' + (st === "same" ? ';color:#94a3b8' : '') + '"><td style="padding:4px;white-space:nowrap"><span style="font-size:11px;font-weight:800;padding:1px 6px;border-radius:8px;background:' + (st === "new" ? "#dcfce7;color:#15803d" : st === "chg" ? "#dbeafe;color:#1d4ed8" : "#f1f5f9;color:#94a3b8") + '">' + (st === "new" ? "새로" : st === "chg" ? "바뀜" : "그대로") + '</span></td>' + shown.map(function(x){ var v = o[x[0]], ch = st === "chg" && v != null && (typeof v === "boolean" ? v !== !!oc[x[0]] : String(v) !== String(oc[x[0]] == null ? "" : oc[x[0]])); return '<td style="padding:4px;white-space:nowrap' + (ch ? ';background:#fef9c3;font-weight:800" title="지금: ' + esc(oc[x[0]] == null ? "" : oc[x[0]]) : '') + '">' + (v == null ? '<span style="color:#cbd5e1">-</span>' : x[2] === "b" ? (v ? "O" : "X") : x[0] === "rrn" ? esc(String(v).slice(0, 8) + "******") : esc(v)) + '</td>'; }).join("") + '</tr>'; });
  h += '</tbody></table></div><div class="mut" style="font-size:12px;margin-top:6px">빈 칸은 지금 값 그대로 · 엑셀에 없는 ' + D.nm + '은 안 지워요</div>';
  h += '<div style="display:flex;justify-content:flex-end;margin-top:10px">' + (YK.xl.list.length ? _bsB("#16a34a", "💾 " + YK.xl.list.length + "개 등록 (새로 " + nN + " · 바뀜 " + nC + ")", "ykXlSave()", "padding:9px 22px") : '<span class="mut">바뀐 게 없어요</span>') + '</div>';
  openPopup(h, 760);
}
function ykXlSave(){
  var X = YK.xl; if(!X) return; var t = X.t, S = _ykS(), up = {}, info = {};
  X.list.forEach(function(o){
    if(t === "people"){ var n = o.nick, p = (S.people || {})[n]; up["people/" + n] = { on: o.on != null ? !!o.on : (p ? p.on !== false : false) };
      var f = {}; YK_INFO_F.forEach(function(x){ if(o[x[0]] != null && o[x[0]] !== "") f[x[0]] = String(o[x[0]]); }); if(f.rrn && /^\d{13}$/.test(f.rrn)) f.rrn = f.rrn.slice(0, 6) + "-" + f.rrn.slice(6); if(Object.keys(f).length && _ykBoss()) info[n] = f; return; }
    var path = YK_XL[t].path, key = _ykKey(o.nm), old = (S[path] || {})[key] || (t === "item" ? { box: 10, mi: 10 } : {}), v = Object.assign({}, old);
    Object.keys(o).forEach(function(k){ if(k !== "__st") v[k] = o[k]; }); if(t === "item"){ var ph = _ykPxHist(old, v, _bsToday()); if(ph) v.ph = ph; } up[path + "/" + key] = v; });
  showLoading("등록 중...");
  _ykRef().update(up).then(function(){ var ps = Object.keys(info).map(function(n){ return fbDb.ref("/YkInfo/" + n).update(info[n]).then(function(){ YK.info = YK.info || {}; YK.info[n] = Object.assign({}, YK.info[n] || {}, info[n]); }); }); return Promise.all(ps); })
    .then(function(){ Object.keys(up).forEach(function(p){ var a = p.split("/"); YK.D[a[0]] = YK.D[a[0]] || {}; YK.D[a[0]][a[1]] = up[p]; }); hideLoading(); closePopup(); YK.xl = null; toast("📤 " + YK_XL[t].nm + " " + X.list.length + "개 등록했어요"); draw(); })
    .catch(function(e){ hideLoading(); toast("등록 실패: " + e.message, true); });
}

// ════════ 🌶 고추장굴비로 만들까, 그냥 팔까 — 정품 두름 무게 → 말리면 15% → 굴비포 → 고추장굴비(굴비포 50% 배합) 300g 몇 개 ════════
var YK_GOCHU = { dry: 15, po: 50, pack: 300, whole: 19000, retail: 25000, sub: 0, dryCost: 0 };
function _ykGset(){ return Object.assign({}, YK_GOCHU, (_ykS().set || {}).gochu || {}); }
function _ykGochu(I, G){
  var wt = _bsN(I.wt); if(!wt) return null;
  var po = wt * _bsN(G.dry) / 100, prod = _bsN(G.po) ? po / (_bsN(G.po) / 100) : 0, packs = _bsN(G.pack) ? prod / _bsN(G.pack) : 0;
  var cost = packs * _bsN(G.sub) + _bsN(G.dryCost);
  return { po: po, prod: prod, packs: packs, gW: packs * _bsN(G.whole) - cost, gR: packs * _bsN(G.retail) - cost, sW: _bsN(I.whole), sR: _bsN(I.sale), cost: cost };
}
function ykGset(k, v){ var G = _ykGset(); G[k] = _bsN(v); _ykRef("set/gochu").set(G).then(function(){ YK.D.set = YK.D.set || {}; YK.D.set.gochu = G; draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); }); }
function _ykGochuCard(){
  var G = _ykGset(), S = _ykS(), can = _ykCan(), basis = YK.gB || "W";
  var In = function(lb, k, unit, w){ return '<label style="font-size:12.5px;display:inline-flex;flex-direction:column;gap:2px">' + lb + '<span><input ' + (/^(whole|retail|sub|dryCost)$/.test(k) ? 'type="text" inputmode="numeric" data-won' : 'type="number" step="any"') + ' value="' + (/^(whole|retail|sub|dryCost)$/.test(k) ? _wonFmt(G[k]) : G[k]) + '" ' + (can ? '' : 'disabled ') + 'onchange="ykGset(\'' + k + '\',this.value)" style="width:' + (w || 80) + 'px;padding:5px;border:1px solid #cbd5e1;border-radius:6px;text-align:right"> ' + unit + '</span></label>'; };
  var h = '<div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><b style="font-size:16px">🌶 고추장굴비로 만들까, 그냥 팔까</b><span style="display:flex;gap:4px">' + [["W", "도매가로 비교"], ["R", "소매가로 비교"]].map(function(o){ var on = basis === o[0]; return '<button class="btn" onclick="YK.gB=\'' + o[0] + '\';draw()" style="padding:5px 11px;background:' + (on ? "#dc2626" : "#fff") + ';color:' + (on ? "#fff" : "#991b1b") + ';border:1px solid #fca5a5">' + o[1] + '</button>'; }).join("") + '</span></div>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0;padding:8px 10px;background:#fef2f2;border-radius:8px">' + In("말리면 남는 무게", "dry", "%", 60) + In("굴비포 비율 (배합)", "po", "%", 60) + In("포장 한 개", "pack", "g", 70) + In("고추장굴비 도매가", "whole", "원/개", 90) + In("고추장굴비 소매가", "retail", "원/개", 90) + In("부원료·포장값", "sub", "원/개", 80) + In("말리는 비용", "dryCost", "원/두름", 80) + '</div>';
  h += '<div class="mut" style="font-size:12px;margin-bottom:6px">두름 무게(정품표 무게 g) × ' + G.dry + '% = 굴비포 → ÷ ' + G.po + '% = 고추장굴비 무게 → ÷ ' + G.pack + 'g = 몇 개 · 고추장굴비 돈 = 개수 × ' + (basis === "W" ? "도매가" : "소매가") + ' − 부원료·포장값 − 말리는 비용' + (_bsN(G.sub) ? '' : ' <b style="color:#c2410c">(부원료·포장값 0원 — 넣으면 더 정확해요)</b>') + '</div>';
  var rows = _ykItemKeys().map(function(k){ var I = S.items[k], x = _ykGochu(I, G); return { I: I, x: x }; });
  h += '<div id="ykScr3" data-keepscroll style="overflow-x:auto;max-height:520px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:820px"><thead><tr style="background:#fef2f2;position:sticky;top:0">' + ["품명", "두름 무게", "굴비포", "고추장굴비", "몇 개", "그냥 팔면 (두름당)", "고추장굴비로 (두름당)", "차이", "추천", "지금 메모"].map(function(x, i){ return '<th style="padding:6px;text-align:' + (i >= 1 && i <= 7 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; }).join("") + '</tr></thead><tbody>';
  var nG = 0, nS = 0;
  rows.forEach(function(r){ var I = r.I, x = r.x, td = function(v, st){ return '<td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;' + (st || "") + '">' + v + '</td>'; };
    if(!x){ h += '<tr style="color:#94a3b8"><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(I.nm) + '</td><td colspan="9" style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-size:12px">정품표에 두름 무게(g)가 없어서 계산 못 해요</td></tr>'; return; }
    var sell = basis === "W" ? x.sW : x.sR, go = basis === "W" ? x.gW : x.gR, d = go - sell, rec = !sell ? (go > 0 ? "gochu" : "") : d > 0 ? "gochu" : "sell";
    if(rec === "gochu") nG++; else if(rec === "sell") nS++;
    h += '<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-weight:800;white-space:nowrap">' + esc(I.nm) + '</td>' + td(_bsW(I.wt) + 'g') + td(_bsW(Math.round(x.po)) + 'g') + td(_bsW(Math.round(x.prod)) + 'g') + td((Math.round(x.packs * 100) / 100) + '개', 'font-weight:800') + td(sell ? _ykWon(sell) : '<span style="color:#cbd5e1">가격 없음</span>') + td(_ykWon(go), 'font-weight:800;color:#b91c1c') + td(sell ? (d > 0 ? '+' : '') + _ykWon(d) : '-', 'font-weight:900;color:' + (d > 0 ? '#16a34a' : '#475569'));
    h += '<td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + (rec === "gochu" ? '<span style="background:#fee2e2;color:#b91c1c;font-weight:900;padding:2px 8px;border-radius:10px">🌶 고추장굴비</span>' : rec === "sell" ? '<span style="background:#dbeafe;color:#1d4ed8;font-weight:900;padding:2px 8px;border-radius:10px">💰 팔기</span>' : '-') + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#7c3aed">' + esc(I.msg || "") + '</td></tr>'; });
  h += '</tbody></table></div><div style="font-size:13px;margin-top:8px"><b style="color:#b91c1c">🌶 고추장굴비 ' + nG + '개</b> · <b style="color:#1d4ed8">💰 팔기 ' + nS + '개</b>' + (can ? ' ' + _bsB("#7c3aed", "📝 추천대로 메모 바꾸기", "ykGochuMemo()", "padding:5px 11px;margin-left:8px") : '') + '</div></div>';
  return h;
}
function ykGochuMemo(){
  var G = _ykGset(), S = _ykS(), basis = YK.gB || "W", up = {}, n = 0;
  _ykItemKeys().forEach(function(k){ var I = S.items[k], x = _ykGochu(I, G); if(!x) return; var sell = basis === "W" ? x.sW : x.sR, go = basis === "W" ? x.gW : x.gR; if(!sell && !(go > 0)) return;
    var m = !sell || go > sell ? "고추장만드세요" : "팔아야해요"; if(I.msg !== m){ up["items/" + k + "/msg"] = m; n++; } });
  if(!n) return toast("바꿀 메모가 없어요 — 이미 추천대로예요");
  if(!confirm("정품 " + n + "개의 메모를 추천대로(팔아야해요 / 고추장만드세요) 바꿀까요?\n(" + (basis === "W" ? "도매가" : "소매가") + " 기준)")) return;
  _ykRef().update(up).then(function(){ Object.keys(up).forEach(function(p){ var a = p.split("/"); YK.D.items[a[1]].msg = up[p]; }); toast("메모 " + n + "개 바꿨어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ════════ 📊 원가분석표 — 예전 엑셀 '데이터자료' 시트 모양: 작업 하나마다 원물 · 마리수 오차 · 품목별 생산수량·비율·판매가/도매가/원가/조절도매가 · 이윤(%) ════════
//   비율 = 그 품목 실제 마리수 ÷ 전체 실제 마리수 (엑셀 AH칸과 같음) · 이윤(%) = 1 − 원물 총합계 ÷ 그 가격 합계 (엑셀과 같음)
//   + 엑셀에 없던 것: 총원가(원료+엮거리+인건비+끈+소금+냉동+포장+잡비) 기준 마진
function _ykAnal(w){
  var c = _ykCalc(w), mats = (w.mats || []).filter(function(m){ return m.nm || _bsN(m.qty); }).map(function(m){ var M = _ykMat(m.nm) || {}, pr = m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price), q = _bsN(m.qty); return { nm: m.nm, qty: q, price: pr, amt: q * pr, kg: q * _bsN(M.kg), mi: q * _bsN(M.mi) }; });
  var matAmt = mats.reduce(function(a, m){ return a + m.amt; }, 0), rows = c.rows.filter(function(x){ return x.pd; });
  rows.forEach(function(x){ x.pct = c.pmi ? x.pmi / c.pmi : 0; });
  var mg = function(v){ return v ? 1 - matAmt / v : null; }, mt = function(v){ return v ? (v - c.total) / v : null; };
  return { w: w, c: c, mats: mats, matAmt: matAmt, rows: rows, doo: rows.reduce(function(a, x){ return a + x.pd; }, 0), rev: c.rev, mg: { sale: mg(c.rev.sale), whole: mg(c.rev.whole), cost: mg(c.rev.cost), adj: mg(c.rev.adj) }, mt: { sale: mt(c.rev.sale), whole: mt(c.rev.whole), cost: mt(c.rev.cost), adj: mt(c.rev.adj) } };
}
function _ykPct(v, d){ return v == null || !isFinite(v) ? "-" : (Math.round(v * 1000) / 10).toFixed(d == null ? 1 : d) + "%"; }
function _ykPctC(v){ return v == null ? "#94a3b8" : v < 0 ? "#dc2626" : v < 0.15 ? "#ea580c" : "#16a34a"; }
function _ykAnalHtml(w, pr){
  if(!pr && _ykMob()) return _ykAnalMob(w);
  var A = _ykAnal(w), c = A.c, b = pr ? "1px solid #555" : "1px solid #e2e8f0", th = 'style="border:' + b + ';padding:5px 6px;background:' + (pr ? "#eee" : "#fff7ed") + ';white-space:nowrap"', td = function(v, st){ return '<td style="border:' + b + ';padding:4px 6px;' + (st || "") + '">' + v + '</td>'; }, R = "text-align:right;";
  var h = '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap;margin-bottom:6px"><div style="font-size:' + (pr ? 20 : 17) + 'px;font-weight:900">📊 원가분석표 <span style="font-size:14px;font-weight:700">' + esc(_bsMD(w.dt)) + (w.lot ? ' · ' + esc(w.lot) : '') + '</span></div><div style="font-size:12px;color:#475569">' + (w.origin ? '원산지 ' + esc(w.origin) + ' · ' : '') + '이모 ' + (w.ws || []).length + '명</div></div>';
  // 원물
  h += '<table style="border-collapse:collapse;width:100%;font-size:12.5px;margin-bottom:8px"><tr><th ' + th + '>원료명</th><th ' + th + '>원료수량</th><th ' + th + '>원물 단가</th><th ' + th + '>원물 합계</th><th ' + th + '>마리수</th><th ' + th + '>원물사용량(kg)</th></tr>';
  A.mats.forEach(function(m){ h += '<tr>' + td(esc(m.nm), "font-weight:700") + td(_bsW(m.qty), R) + td(m.price ? _ykWon(m.price) : '<span style="color:#dc2626">값 없음</span>', R) + td(_ykWon(m.amt), R) + td(_bsW(m.mi), R) + td(_bsW(Math.round(m.kg * 10) / 10), R) + '</tr>'; });
  h += '<tr style="font-weight:900">' + td("원물 총합계") + td("") + td("") + td(_ykWon(A.matAmt), R + "font-size:14px") + td(_bsW(c.matMi), R) + td(_bsW(Math.round(c.matKg * 10) / 10) + ' <span style="font-weight:400;font-size:11px">소금 ' + _bsW(Math.round(c.saltKg * 10) / 10) + 'kg</span>', R) + '</tr></table>';
  var dcol = c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569";
  h += '<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin-bottom:8px;padding:6px 10px;border:' + b + ';border-radius:' + (pr ? 0 : 8) + 'px"><span>원물 마리수 <b>' + _bsW(c.matMi) + '</b></span><span>실제 마리수 <b>' + _bsW(c.actual) + '</b></span><span>마리수 오차 <b style="color:' + dcol + '">' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + '마리 ' + (c.diff > 0 ? "더 나옴" : c.diff < 0 ? "부족" : "맞음") + '</b>' + (c.matMi ? ' <span style="color:#64748b">(' + _ykPct(c.diff / c.matMi) + ')</span>' : '') + '</span><span>생산 <b>' + _bsW(A.doo) + '두름</b> · ' + _bsW(c.boxes) + '박스</span></div>';
  // 품목
  h += _ykRatioMsg(c) + '<table style="border-collapse:collapse;width:100%;font-size:12.5px"><tr><th ' + th + '>품목</th><th ' + th + '>생산수량<br>(두름)</th><th ' + th + '>비율</th><th ' + th + '>판매가<br><span style="font-weight:400;font-size:10.5px">두름당 · 합계</span></th><th ' + th + '>도매가<br><span style="font-weight:400;font-size:10.5px">두름당 · 합계</span></th><th ' + th + '>원가<br><span style="font-weight:400;font-size:10.5px">두름당 · 합계</span></th><th ' + th + '>조절도매가<br><span style="font-weight:400;font-size:10.5px">두름당 · 합계</span></th><th ' + th + '>두름당 원가<br>(원가표 비율로 나눔)</th><th ' + th + '>두름당 남는 돈<br>(도매가 − 원가)</th></tr>';
  A.rows.forEach(function(x){ var U = function(k){ var u = x.P[k]; return td(u ? '<b>' + _ykWon(u) + '</b><div style="font-size:10.5px;color:#64748b;white-space:nowrap">× ' + _bsW(x.pd) + ' = ' + _ykWon(x[k]) + '</div>' : '<span style="color:#cbd5e1">-</span>', R); };
    h += '<tr>' + td(esc(x.item) + ' <span style="font-size:10.5px;color:#64748b">' + x.kind + '</span>', "font-weight:700;white-space:nowrap") + td(_bsW(x.pd) + (x.real != null && x.real !== x.doo ? ' <span style="font-size:10.5px;color:#7c3aed">(엮음 ' + _bsW(x.doo) + ')</span>' : ''), R) + td('<b>' + _ykPct(x.pct) + '</b>' + (pr ? '' : '<div style="height:4px;background:#fed7aa;border-radius:2px;margin-top:2px"><div style="height:4px;width:' + Math.round(x.pct * 100) + '%;background:#ea580c;border-radius:2px"></div></div>'), R + "min-width:70px") + U("sale") + U("whole") + U("cost") + U("adj") + td('<b>' + _ykWon(x.unit) + '</b>' + _ykVsTbl(x.unit, x.P.cost, A.matAmt > 0 && c.tblCover >= 0.8), R) + (function(){ var wd = x.P.whole, d = wd - x.unit; return td(wd ? '<b style="color:' + (d < 0 ? "#dc2626" : "#16a34a") + '">' + (d > 0 ? "+" : "") + _ykWon(d) + '</b><div style="font-size:10.5px;color:#64748b">' + _ykPct(d / wd) + '</div>' : "-", R); })() + '</tr>'; });
  h += '<tr style="font-weight:900;background:' + (pr ? "#f5f5f5" : "#fffbeb") + '">' + td("합계") + td(_bsW(A.doo), R) + td(_ykPct(A.rows.length ? 1 : 0, 0), R) + td(_ykWon(A.rev.sale), R) + td(_ykWon(A.rev.whole), R) + td(_ykWon(A.rev.cost), R) + td(_ykWon(A.rev.adj), R) + td(A.doo ? _ykWon(c.total / A.doo) : "-", R) + td(A.rev.whole ? _ykWon((A.rev.whole - c.total) / A.doo) : "-", R) + '</tr>';
  var P = function(v){ return '<b style="color:' + _ykPctC(v) + '">' + _ykPct(v) + '</b>'; };
  h += '<tr>' + td("회전 가능 금액 <span style='font-size:10.5px;color:#64748b'>원료값만 뺌</span>", "font-weight:800") + td("") + td("") + ["sale", "whole", "cost", "adj"].map(function(k){ return td(P(A.mg[k]) + '<div style="font-size:10.5px;color:#64748b">' + (A.rev[k] ? _ykWon(A.rev[k] - A.matAmt) : "") + '</div>', R); }).join("") + td("") + td("") + '</tr>';
  h += '<tr>' + td("마진 <span style='font-size:10.5px;color:#64748b'>다 뺌 · 총원가 " + _ykWon(c.total) + "</span>", "font-weight:800") + td("") + td("") + ["sale", "whole", "cost", "adj"].map(function(k){ return td(P(A.mt[k]) + '<div style="font-size:10.5px;color:#64748b">' + (A.rev[k] ? _ykWon(A.rev[k] - c.total) : "") + '</div>', R); }).join("") + td("") + td("") + '</tr></table>';
  h += '<div style="font-size:11px;color:#64748b;margin-top:5px">비율 = 품목 실제 마리수 ÷ 전체 실제 마리수 · 회전 가능 금액 = 가격 합계 − 원료값 (다음 원료 살 돈으로 돌릴 수 있는 돈) · 마진 = 총원가(원료·엮거리 ' + _ykWon(c.cost.weave) + '·인건비·끈·소금·냉동·포장·잡비) 빼고 남는 비율</div>';
  return h;
}
function ykPrintAnal(L){
  L = L || (YK.ed ? [YK.ed.w] : []); if(!L.length) return;
  _ykWin("원가분석표", "@page{size:A4 portrait;margin:10mm}.pg{padding:8mm 6mm;page-break-after:always}.pg:last-child{page-break-after:auto}", L.map(function(w){ return '<div class="pg">' + _ykAnalHtml(w, true) + '</div>'; }).join(""));
}
function ykOpenGo(id){ closePopup(); YK.ed = { id: id, w: JSON.parse(JSON.stringify(_ykS().works[id])) }; YK.ed.w.mats = YK.ed.w.mats || []; YK.ed.w.ws = YK.ed.w.ws || []; YK.ed.w.rows = YK.ed.w.rows || []; if(typeof switchTab === "function") switchTab("ykWork"); else { CTAB = "ykWork"; draw(); } scrollTo(0, 0); }
function ykAnalPop(id){ var w = (_ykS().works || {})[id]; if(!w) return; YK.anPop = id; openPopup('<div style="max-height:84vh;overflow:auto">' + _ykAnalHtml(w) + '</div><div style="display:flex;gap:6px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap">' + _ykPxBtn(id, w) + _bsB("#475569", "닫기", "closePopup()") + _bsB("#b45309", "🖨 인쇄", "ykPrintAnal([_ykS().works['" + id + "']])") + _bsB("#2563eb", "작업 열기", "ykOpenGo('" + id + "')") + '</div>', 1020); }

// ── 📊 원가분석 화면: 기간 안 작업들을 한 표로 비교 + 품목별 비율 비교 ──
function dYkAnal(){
  var g = _ykGate(); if(g) return g;
  var f = YK.pf || "", t = YK.pt || "", W = _ykS().works || {}, ids = Object.keys(W).filter(function(k){ return _ykInPer(W[k].dt, f, t); }).sort(function(a, b){ return String(W[b].dt).localeCompare(String(W[a].dt)); });
  var kind = YK.anK || "", basis = YK.anB || "whole", BL = { sale: "판매가", whole: "도매가", cost: "원가", adj: "조절도매가" };
  var L = ids.map(function(k){ var A = _ykAnal(W[k]); A.id = k; A.kind = A.rows.some(function(x){ return x.kind === "부세"; }) ? (A.rows.some(function(x){ return x.kind === "굴비"; }) ? "섞임" : "부세") : "굴비"; return A; }).filter(function(A){ return !kind || A.kind === kind; });
  var h = _ykHead("📊 원가분석표", "작업마다 품목이 몇 % 나왔고, 금액·이윤이 얼마인지 — 줄을 누르면 그 작업 원가분석표", _bsB("#b45309", "🖨 이 목록 원가분석표 전부", "ykPrintAnal(YK.anL)", "padding:8px 14px"));
  h += _ykPerBar(f, t);
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px"><b>구분</b>' + [["", "전체"], ["굴비", "굴비"], ["부세", "부세"], ["섞임", "섞임"]].map(function(o){ var on = kind === o[0]; return '<button class="btn" onclick="YK.anK=\'' + o[0] + '\';draw()" style="padding:5px 11px;background:' + (on ? "#b45309" : "#fff") + ';color:' + (on ? "#fff" : "#92400e") + ';border:1px solid #fcd34d">' + o[1] + '</button>'; }).join("");
  h += '<b style="margin-left:10px">가격 기준</b>' + Object.keys(BL).map(function(k){ var on = basis === k; return '<button class="btn" onclick="YK.anB=\'' + k + '\';draw()" style="padding:5px 11px;background:' + (on ? "#2563eb" : "#fff") + ';color:' + (on ? "#fff" : "#1d4ed8") + ';border:1px solid #93c5fd">' + BL[k] + '</button>'; }).join("") + '<span class="mut" style="font-size:12px">' + L.length + '건</span></div>';
  YK.anL = L.slice().reverse().map(function(A){ return A.w; });
  if(_ykMob()) return h + _ykAnalMobList(L, basis, BL);
  // 작업별 한 줄
  var T = { mat: 0, matMi: 0, act: 0, doo: 0, rev: 0, tot: 0 }, th = function(x, r){ return '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;white-space:nowrap;text-align:' + (r ? "right" : "left") + '">' + x + '</th>'; };
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div id="ykScr4" data-keepscroll style="overflow-x:auto;max-height:560px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:1100px"><thead><tr style="background:#fff7ed;position:sticky;top:0">' + th("날짜") + th("원료") + th("원물 총합계", 1) + th("원물 마리", 1) + th("실제 마리", 1) + th("오차", 1) + th("두름", 1) + th(BL[basis] + " 합계", 1) + th("회전 가능<br><span style=\"font-weight:400;font-size:11px\">원료값만 뺌</span>", 1) + th("총원가", 1) + th("마진<br><span style=\"font-weight:400;font-size:11px\">다 뺌</span>", 1) + th("많이 나온 품목") + '</tr></thead><tbody>';
  if(!L.length) h += '<tr><td colspan="12" style="padding:30px;text-align:center;color:#94a3b8">이 기간에 작업이 없어요</td></tr>';
  L.forEach(function(A){ var c = A.c, td = function(v, st){ return '<td style="padding:6px;border-bottom:1px solid #f1f5f9;' + (st || "") + '">' + v + '</td>'; }, R = "text-align:right;", rv = A.rev[basis];
    T.mat += A.matAmt; T.matMi += c.matMi; T.act += c.actual; T.doo += A.doo; T.rev += rv; T.tot += c.total;
    var top = A.rows.slice().sort(function(a, b){ return b.pct - a.pct; }).slice(0, 3).map(function(x){ return esc(x.item) + ' <b>' + _ykPct(x.pct, 0) + '</b>'; }).join(" · ");
    h += '<tr style="cursor:pointer" onmouseover="this.style.background=\'#fffbeb\'" onmouseout="this.style.background=\'\'" onclick="ykAnalPop(\'' + A.id + '\')">' + td(esc(_bsMD(A.w.dt)), "white-space:nowrap;font-weight:700") + td(A.mats.map(function(m){ return esc(m.nm) + ' ' + _bsW(m.qty); }).join(", "), "font-size:12px") + td(_ykWon(A.matAmt), R + (A.matAmt ? "" : "color:#dc2626")) + td(_bsW(c.matMi), R) + td(_bsW(c.actual), R) + td((c.diff > 0 ? "+" : "") + _bsW(c.diff), R + "color:" + (c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569")) + td(_bsW(A.doo), R + "font-weight:800") + td(_ykWon(rv), R) + td('<b style="color:' + _ykPctC(A.mg[basis]) + '">' + _ykPct(A.mg[basis]) + '</b>', R) + td(_ykWon(c.total), R) + td('<b style="color:' + _ykPctC(A.mt[basis]) + '">' + _ykPct(A.mt[basis]) + '</b>', R) + td(top, "font-size:12px;white-space:nowrap") + '</tr>'; });
  if(L.length > 1) h += '<tr style="background:#fff7ed;font-weight:900"><td style="padding:7px" colspan="2">합계 · 평균</td><td style="padding:7px;text-align:right">' + _ykWon(T.mat) + '</td><td style="padding:7px;text-align:right">' + _bsW(T.matMi) + '</td><td style="padding:7px;text-align:right">' + _bsW(T.act) + '</td><td style="padding:7px;text-align:right">' + (T.act - T.matMi > 0 ? "+" : "") + _bsW(T.act - T.matMi) + '</td><td style="padding:7px;text-align:right">' + _bsW(T.doo) + '</td><td style="padding:7px;text-align:right">' + _ykWon(T.rev) + '</td><td style="padding:7px;text-align:right;color:' + _ykPctC(T.rev ? 1 - T.mat / T.rev : null) + '">' + _ykPct(T.rev ? 1 - T.mat / T.rev : null) + '</td><td style="padding:7px;text-align:right">' + _ykWon(T.tot) + '</td><td style="padding:7px;text-align:right;color:' + _ykPctC(T.rev ? (T.rev - T.tot) / T.rev : null) + '">' + _ykPct(T.rev ? (T.rev - T.tot) / T.rev : null) + '</td><td></td></tr>';
  h += '</tbody></table></div></div>';
  // 품목별 비율 비교 (줄 = 품목, 칸 = 작업)
  if(L.length){ var it = {}, order = _ykItemKeys().map(function(k){ return (_ykS().items[k] || {}).nm; });
    L.forEach(function(A, j){ A.rows.forEach(function(x){ var o = it[x.item] = it[x.item] || { nm: x.item, p: {}, doo: 0, mi: 0 }; o.p[j] = x.pct; o.doo += x.pd; o.mi += x.pmi; }); });
    var allMi = L.reduce(function(a, A){ return a + (A.c.pmi || 0); }, 0), names = Object.keys(it).sort(function(a, b){ var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 1e9 : x) - (y < 0 ? 1e9 : y) || a.localeCompare(b); });
    var cols = L.slice(0, 24);
    h += '<div class="card" style="padding:0;overflow:hidden"><div style="padding:10px 12px"><b>📈 품목별 비율 비교</b> <span class="mut" style="font-size:12px">— 작업마다 그 품목이 몇 % 나왔는지 (마리수 기준) · 평균 = 기간 전체' + (L.length > 24 ? ' · 최근 24작업만 칸으로' : '') + '</span></div><div id="ykScr5" data-keepscroll style="overflow-x:auto;max-height:560px"><table style="border-collapse:collapse;font-size:12px;min-width:100%"><thead><tr style="background:#f8fafc;position:sticky;top:0"><th style="padding:6px;text-align:left;position:sticky;left:0;background:#f8fafc;z-index:1">품목</th><th style="padding:6px;text-align:right;background:#fff7ed">평균</th><th style="padding:6px;text-align:right;background:#fff7ed">두름</th>' + cols.map(function(A){ return '<th style="padding:6px;text-align:right;white-space:nowrap;cursor:pointer" onclick="ykAnalPop(\'' + A.id + '\')">' + esc(String(A.w.dt || "").slice(5).replace("-", "/")) + '</th>'; }).join("") + '</tr></thead><tbody>';
    names.forEach(function(n){ var o = it[n], avg = allMi ? o.mi / allMi : 0;
      h += '<tr><td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;font-weight:700;white-space:nowrap;position:sticky;left:0;background:#fff">' + esc(n) + '</td><td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;background:#fffbeb">' + _ykPct(avg) + '</td><td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:right;background:#fffbeb">' + _bsW(o.doo) + '</td>';
      cols.forEach(function(A, j){ var p = o.p[j]; h += '<td style="padding:4px 6px;border-bottom:1px solid #f1f5f9;text-align:right;' + (p == null ? "color:#e2e8f0" : "background:rgba(234,88,12," + Math.min(0.55, p * 1.6).toFixed(2) + ")") + '">' + (p == null ? "·" : _ykPct(p)) + '</td>'; });
      h += '</tr>'; });
    h += '</tbody></table></div></div>'; }
  return h;
}

// ════════ 📱 모바일 화면 (폭 760 미만) — 넓은 표 대신 카드 · 보조 버튼은 작게 ════════
function _ykMob(){ return (window.innerWidth || 1200) < 760; }
function _ykSB(){ return _ykMob() ? "padding:4px 8px;font-size:12px" : ""; }
function _ykPctTag(v){ return '<b style="color:' + _ykPctC(v) + '">' + _ykPct(v) + '</b>'; }
// 작업 목록 카드
function _ykWorkMob(list, W){
  if(!list.length) return '<div class="card" style="padding:26px;text-align:center;color:#94a3b8">작업이 없어요</div>';
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin:0 2px 6px;font-size:12.5px"><label style="display:flex;align-items:center;gap:5px"><input type="checkbox" ' + (list.every(function(k){ return YK.sel[k]; }) ? "checked" : "") + ' onclick="ykSelAll(this.checked)" style="width:17px;height:17px">보이는 것 모두</label><span class="mut">눌러서 열기</span></div>';
  list.forEach(function(k){ var w = W[k], c = _ykCalc(w), mr = c.rev.whole ? (c.rev.whole - c.total) / c.rev.whole : null;
    h += '<div class="card" style="padding:10px 12px;margin-bottom:8px;cursor:pointer" onclick="if(event.target.closest(\'.ykSelTd\'))return;ykOpen(\'' + k + '\')">';
    h += '<div style="display:flex;align-items:center;gap:8px"><span class="ykSelTd"><input type="checkbox" class="ykSelC" ' + (YK.sel[k] ? "checked" : "") + ' onchange="ykSelSet(\'' + k + '\',this.checked)" style="width:19px;height:19px"></span><b style="font-size:15px">' + _bsDH(w.dt) + '</b><span style="margin-left:auto;font-size:12px;color:#64748b">마진 </span>' + (mr == null ? '<span style="color:#94a3b8">-</span>' : _ykPctTag(mr)) + '</div>';
    h += '<div style="font-size:12.5px;color:#475569;margin:4px 0 6px 27px">' + ((w.mats || []).map(function(m){ return esc(m.nm) + ' ' + _bsW(m.qty) + '짝'; }).join(", ") || '원료 없음') + '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-left:27px;font-size:12px;color:#64748b">' + [["두름", _bsW(c.pd || c.doo)], ["박스", _bsW(c.boxes)], ["이모", (w.ws || []).length + "명"], ["총원가", _ykMan(c.total)]].map(function(x){ return '<div>' + x[0] + '<div style="font-size:14.5px;font-weight:800;color:#111">' + x[1] + '</div></div>'; }).join("") + '</div></div>'; });
  return h;
}
function _ykMan(n){ n = _bsN(n); return Math.abs(n) >= 10000 ? (Math.round(n / 1000) / 10).toLocaleString("ko-KR") + '만' : _ykWon(n); }
// 작업 화면 — 원료 카드
function _ykEdMobMats(w){
  var In = function(v, on, ex){ return '<input value="' + esc(v == null ? "" : v) + '" oninput="' + on + '" ' + (ex || "") + ' style="width:100%;padding:8px;font-size:16px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;text-align:right">'; };
  var h = '<div style="font-weight:800;margin:10px 0 6px;display:flex;align-items:center;gap:8px">🐟 원료 ' + _ykRsB("mat") + '</div>';
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {};
    h += '<div style="border:1px solid #fed7aa;border-radius:10px;padding:8px;margin-bottom:8px;background:#fffbf5"><div style="display:flex;gap:6px;align-items:center"><div style="flex:1;min-width:0">' + _ykPick("mat", i, m.nm) + '</div><button class="btn" style="background:#fff;color:#dc2626;border:1px solid #fecaca;padding:3px 8px;font-size:12px" onclick="YK.ed.w.mats.splice(' + i + ',1);draw()">✕</button></div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:6px;margin-top:6px;font-size:12px;color:#64748b"><label>짝 수' + In(m.qty, "YK.ed.w.mats[" + i + "].qty=this.value;_ykRecalc()", 'type="number" step="any" inputmode="decimal"') + '</label><label>짝당 가격' + In(_wonFmt(m.price), "YK.ed.w.mats[" + i + "].price=this.value;_ykRecalc()", 'type="text" inputmode="numeric" data-won placeholder="' + (M.price ? _ykWon(M.price) : "짝당") + '"') + '</label></div>';
    h += '<div style="display:flex;gap:10px;justify-content:flex-end;font-size:12.5px;margin-top:5px;color:#475569"><span>마리 <b id="ykMm' + i + '"></b></span><span>kg <b id="ykMk' + i + '"></b></span><span>금액 <b id="ykMc' + i + '" style="color:#111"></b></span></div></div>'; });
  return h + _bsB("#b45309", "+ 원료 줄", "YK.ed.w.mats.push({nm:'',qty:'',price:''});draw()", "padding:4px 10px;font-size:12.5px") + ' ' + _bsB("#475569", "↩ 지난 작업 그대로", "ykLastNames()", "padding:4px 10px;font-size:12.5px") + '</div>';
}
// 작업 화면 — 품명마다 카드 (이모별 두름 칸이 2~3개씩 줄 바꿈)
function _ykEdMobRows(w){
  var h = '<div style="padding:0 10px">';
  if(!w.ws.length) h += '<div class="mut" style="font-size:12.5px;padding:6px 2px">위에서 이모를 먼저 넣어 주세요</div>';
  w.rows.forEach(function(r, i){
    h += '<div style="border:1px solid #fde68a;border-radius:10px;padding:8px;margin-bottom:10px;background:#fffdf7"><div style="display:flex;gap:6px;align-items:center"><div style="flex:1;min-width:0">' + _ykPick("item", i, r.item) + '</div>' + _ykKindBtn(i, r, "padding:5px 8px;font-size:12.5px") + '<button class="btn" style="background:#fff;color:#dc2626;border:1px solid #fecaca;padding:3px 8px;font-size:12px" onclick="YK.ed.w.rows.splice(' + i + ',1);draw()">✕</button></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin-top:8px">';
    w.ws.forEach(function(n, j){ h += '<label style="font-size:12px;color:#475569;font-weight:700">' + esc(n) + '<input type="number" inputmode="numeric" value="' + esc((r.c || {})[n] || "") + '" oninput="_ykCell(' + i + ',' + j + ',this.value)" style="width:100%;padding:8px 6px;font-size:16px;border:1px solid #cbd5e1;border-radius:6px;text-align:right;box-sizing:border-box"></label>'; });
    h += '</div><div style="display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-top:8px;font-size:12.5px;color:#475569"><span>합계 <b id="ykRd' + i + '" style="font-size:15px;color:#111;background:#fef9c3;padding:1px 6px;border-radius:5px"></b></span><label style="display:flex;align-items:center;gap:4px">실제<input inputmode="text" value="' + esc(r.real == null ? "" : r.real) + '" oninput="YK.ed.w.rows[' + i + '].real=this.value;_ykRecalc()" id="ykRx' + i + '" placeholder="±" style="width:70px;padding:6px;font-size:16px;border:2px solid #86efac;border-radius:6px;text-align:right;font-weight:800"></label><span>박스 <b id="ykRb' + i + '"></b></span><span>잔량 <b id="ykRr' + i + '"></b></span><span>마리 <b id="ykRm' + i + '"></b></span></div></div>'; });
  h += _bsB("#b45309", "+ 품명 줄", "YK.ed.w.rows.push({item:'',kind:_ykKindOf(YK.ed.w),c:{}});draw()", "padding:4px 10px;font-size:12.5px");
  // 이모별 합계
  if(w.ws.length){ h += '<div style="margin-top:12px;border-top:2px solid #fde68a;padding-top:8px"><b style="font-size:13.5px">👵 이모별</b><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:6px;margin-top:6px">';
    w.ws.forEach(function(n, j){ h += '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:6px;font-size:12px"><div style="display:flex;justify-content:space-between"><b>' + esc(n) + '</b><a href="javascript:void 0" onclick="ykDelWorker(' + j + ')" style="color:#dc2626;text-decoration:none">✕</a></div><div id="ykWd' + j + '" style="line-height:1.4"></div><div id="ykWa' + j + '" style="font-weight:800;color:#b45309"></div></div>'; });
    h += '</div><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;font-size:13px"><span>두름 합계 <b id="ykTd"></b></span><span>실제 <b id="ykTx"></b></span><span>박스 <b id="ykTb"></b></span><span>마리 <b id="ykTm"></b></span><span>엮거리 값 <b id="ykTa" style="color:#b45309"></b></span></div></div>'; }
  return h + '</div><div style="height:10px"></div></div>';
}
// 원가분석 목록 카드
function _ykAnalMobList(L, basis, BL){
  if(!L.length) return '<div class="card" style="padding:26px;text-align:center;color:#94a3b8">이 기간에 작업이 없어요</div>';
  var h = '<div class="mut" style="font-size:12px;margin:0 2px 6px">' + BL[basis] + ' 기준 · 눌러서 자세히</div>';
  L.forEach(function(A){ var c = A.c, rv = A.rev[basis];
    var top = A.rows.slice().sort(function(a, b){ return b.pct - a.pct; }).slice(0, 3).map(function(x){ return esc(x.item) + ' <b>' + _ykPct(x.pct, 0) + '</b>'; }).join(" · ");
    h += '<div class="card" style="padding:10px 12px;margin-bottom:8px;cursor:pointer" onclick="ykAnalPop(\'' + A.id + '\')"><div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:15px">' + _bsDH(A.w.dt) + '</b><span style="font-size:12px;color:#64748b">' + _bsW(A.doo) + '두름</span><span style="margin-left:auto;font-size:12px;color:#64748b">마진</span><span style="font-size:17px">' + _ykPctTag(A.mt[basis]) + '</span></div>';
    h += '<div style="font-size:12px;color:#475569;margin:3px 0 6px">' + A.mats.map(function(m){ return esc(m.nm) + ' ' + _bsW(m.qty); }).join(", ") + '</div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:11.5px;color:#64748b">' + [["원물", A.matAmt ? _ykMan(A.matAmt) : '<span style="color:#dc2626">값 없음</span>'], [BL[basis], _ykMan(rv)], ["총원가", _ykMan(c.total)], ["회전 가능", _ykPctTag(A.mg[basis])], ["두름당 남음", A.doo && rv ? '<span style="color:' + (rv - c.total < 0 ? "#dc2626" : "#16a34a") + '">' + _ykWon((rv - c.total) / A.doo) + '</span>' : "-"], ["마리 오차", '<span style="color:' + (c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569") + '">' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + '</span>']].map(function(x){ return '<div>' + x[0] + '<div style="font-size:14px;font-weight:800;color:#111">' + x[1] + '</div></div>'; }).join("") + '</div>';
    if(top) h += '<div style="font-size:11.5px;color:#64748b;margin-top:6px;border-top:1px dashed #e2e8f0;padding-top:5px">' + top + '</div>';
    h += '</div>'; });
  return h;
}
// 원가분석 작업 하나 — 모바일 카드
function _ykAnalMob(w){
  var A = _ykAnal(w), c = A.c, dcol = c.diff > 0 ? "#16a34a" : c.diff < 0 ? "#dc2626" : "#475569", PD = A.doo;
  var h = '<div style="font-size:16px;font-weight:900;margin-bottom:6px">📊 ' + esc(_bsMD(w.dt)) + ' <span style="font-size:12px;font-weight:400;color:#64748b">이모 ' + (w.ws || []).length + '명' + (w.origin ? ' · ' + esc(w.origin) : '') + '</span></div>';
  // 원물
  h += '<div style="border:1px solid #fed7aa;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12.5px">';
  A.mats.forEach(function(m){ h += '<div style="display:flex;justify-content:space-between;gap:6px;padding:2px 0"><span><b>' + esc(m.nm) + '</b> ' + _bsW(m.qty) + '짝 × ' + (m.price ? _ykWon(m.price) : '<span style="color:#dc2626">값 없음</span>') + '</span><b>' + _ykWon(m.amt) + '</b></div>'; });
  h += '<div style="display:flex;justify-content:space-between;border-top:1px solid #fed7aa;margin-top:4px;padding-top:4px;font-weight:900"><span>원물 총합계</span><span>' + _ykWon(A.matAmt) + '</span></div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;color:#475569">원물 ' + _bsW(c.matMi) + '마리 → 실제 ' + _bsW(c.actual) + '마리 <b style="color:' + dcol + '">' + (c.diff > 0 ? "+" : "") + _bsW(c.diff) + '</b> · ' + _bsW(PD) + '두름 · ' + _bsW(c.boxes) + '박스</div></div>';
  // 요약
  h += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">' + [["총원가 /두름", PD ? _ykWon(c.total / PD) : "-", "#111"], ["도매 /두름", PD && A.rev.whole ? _ykWon(A.rev.whole / PD) : "-", "#111"], ["마진 (도매)", _ykPct(A.mt.whole), _ykPctC(A.mt.whole)]].map(function(x){ return '<div style="background:#fffbeb;border-radius:8px;padding:6px 8px;font-size:11.5px;color:#64748b">' + x[0] + '<div style="font-size:16px;font-weight:900;color:' + x[2] + '">' + x[1] + '</div></div>'; }).join("") + '</div>';
  h += _ykRatioMsg(c);
  // 품목 카드
  A.rows.forEach(function(x){ var wd = x.P.whole, d = wd - x.unit;
    h += '<div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px;margin-bottom:6px"><div style="display:flex;align-items:baseline;gap:6px"><b style="font-size:14px">' + esc(x.item) + '</b><span style="font-size:11px;color:#64748b">' + x.kind + '</span><span style="margin-left:auto;font-size:13px"><b>' + _bsW(x.pd) + '</b>두름 · <b>' + _ykPct(x.pct) + '</b></span></div>';
    h += '<div style="height:4px;background:#fed7aa;border-radius:2px;margin:4px 0 6px"><div style="height:4px;width:' + Math.round(x.pct * 100) + '%;background:#ea580c;border-radius:2px"></div></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;font-size:11px;color:#64748b">' + [["원가", _ykWon(x.unit), "#111"], ["판매가", x.P.sale ? _ykWon(x.P.sale) : "-", "#111"], ["도매가", wd ? _ykWon(wd) : "-", "#111"], ["남는 돈", wd ? (d > 0 ? "+" : "") + _ykWon(d) : "-", d < 0 ? "#dc2626" : "#16a34a"]].map(function(y){ return '<div>' + y[0] + '<div style="font-size:13.5px;font-weight:800;color:' + y[2] + '">' + y[1] + '</div></div>'; }).join("") + '</div>';
    h += '<div style="font-size:10.5px;color:#94a3b8;margin-top:3px">모두 두름당 · 도매 합계 ' + (wd ? _ykWon(x.whole) : "-") + '</div></div>'; });
  // 합계
  h += '<div style="border:2px solid #fde68a;border-radius:10px;padding:8px 10px;margin-top:8px;font-size:12.5px"><table style="width:100%;border-collapse:collapse"><tr style="color:#64748b;font-size:11.5px"><td></td><td style="text-align:right">가격 합계</td><td style="text-align:right">회전 가능</td><td style="text-align:right">마진</td></tr>';
  [["판매가", "sale"], ["도매가", "whole"], ["원가표", "cost"], ["조절도매가", "adj"]].forEach(function(r){ if(!A.rev[r[1]]) return; h += '<tr><td style="padding:3px 0;font-weight:700">' + r[0] + '</td><td style="text-align:right">' + _ykMan(A.rev[r[1]]) + '</td><td style="text-align:right">' + _ykPctTag(A.mg[r[1]]) + '</td><td style="text-align:right">' + _ykPctTag(A.mt[r[1]]) + '</td></tr>'; });
  h += '</table><div style="font-size:11px;color:#64748b;margin-top:4px">총원가 ' + _ykWon(c.total) + ' · 회전 가능 = 원료값만 뺌 · 마진 = 다 뺌</div></div>';
  return h;
}

// ════════ ⚡ 한 줄로 넣기 — 이모 고르고 · 품명 고르고 · 두름 적고 Enter → 표에 더해지고 품명별로 바로 합계 ════════
function _ykQBar(w, inTbl){
  var S = _ykS(), E = YK.ed, P = S.people || {};
  var ppl = Object.keys(P).sort(function(a, b){ return ((P[a].on !== false) ? 0 : 1) - ((P[b].on !== false) ? 0 : 1) || a.localeCompare(b); });
  w.ws.forEach(function(n){ if(ppl.indexOf(n) < 0) ppl.unshift(n); });
  var I = S.items || {}, sel = 'padding:' + (_ykMob() ? '6px 4px' : '8px') + ';font-size:' + (_ykMob() ? 16 : 15) + 'px;font-weight:700;border:2px solid #0e7490;border-radius:8px;background:#fff;box-sizing:border-box';
  var mob = _ykMob();
  var h = '<div style="margin:0 12px 10px;border:2px solid #0e7490;border-radius:10px;background:#ecfeff;padding:8px 10px">';
  h += '<div style="font-weight:900;font-size:13.5px;color:#0e7490;margin-bottom:6px">⚡ 한 줄로 넣기 <span style="font-weight:400;font-size:' + (mob ? 11 : 12) + 'px;color:#475569">— 이모 → 품명 → 두름 → 넣기' + (mob ? '' : ' (Enter)') + ' · 표에 더해져요 · 빼려면 -3</span></div>';
  h += '<div style="display:' + (mob ? "grid;grid-template-columns:1fr 1.2fr 58px auto" : "flex;flex-wrap:wrap") + ';gap:6px;align-items:center">';
  h += _ykCb("ppl", E.qn || "", "_ykQPick('n',V)", "👵 이모", sel + ';' + (mob ? "width:100%" : "width:150px"), "ykQn");
  h += _ykCb("item", E.qi || "", "_ykQPick('i',V)", "🐟 품명", sel + ';' + (mob ? "width:100%" : "width:210px"), "ykQi");
  h += '<input id="ykQq" type="number" inputmode="numeric" step="any" placeholder="두름" onkeydown="if(event.key===\'Enter\'){event.preventDefault();ykQAdd()}" style="' + sel + ';' + (mob ? "width:100%" : "width:90px") + ';text-align:right">';
  h += '<button class="btn" onclick="ykQAdd()" style="background:#0e7490;color:#fff;font-weight:900;padding:' + (mob ? '8px 10px;font-size:14px' : '9px 16px;font-size:15px') + '">' + (mob ? '넣기' : '➕ 넣기') + '</button></div>';
  var L = E.log || [];
  if(L.length){ h += '<div style="margin-top:7px;font-size:12.5px;color:#334155;display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center"><span style="color:#64748b">방금 넣은 것</span>';
    L.slice(-8).reverse().forEach(function(x, k){ var idx = L.length - 1 - k; h += '<span style="background:#fff;border:1px solid #a5f3fc;border-radius:6px;padding:2px 6px">' + esc(x.n) + ' · ' + esc(x.item) + ' <b>' + (x.q > 0 ? "" : "") + _bsW(x.q) + '</b> <a href="javascript:void 0" title="되돌리기" onclick="ykQUndo(' + idx + ')" style="color:#dc2626;text-decoration:none;font-weight:900">↩</a></span>'; });
    h += '</div>'; }
  if(!inTbl) h += '<div id="ykQSum" style="margin-top:8px">' + _ykQSum(w) + '</div>';
  return h + '</div>';
  return h;
}
// 품명별 집계 (표에 적힌 두름 전부)
function _ykQSum(w){
  var m = {}, ord = [], tot = 0;
  (w.rows || []).forEach(function(r){ var q = 0; Object.keys(r.c || {}).forEach(function(n){ q += _bsN(r.c[n]); }); if(!r.item && !q) return; var k = (r.item || "(품명 없음)") + (_ykRK(r) === "부세" ? " (부세)" : ""); if(!(k in m)){ m[k] = 0; ord.push(k); } m[k] += q; tot += q; });
  ord = ord.filter(function(k){ return m[k]; });
  if(!ord.length) return '<span class="mut" style="font-size:12px">아직 넣은 두름이 없어요</span>';
  return '<div style="font-size:12px;font-weight:800;color:#0e7490;margin-bottom:3px">📋 품명별 합계</div><div style="display:flex;flex-wrap:wrap;gap:5px">' + ord.map(function(k){ return '<span style="background:#fff;border:1px solid #cbd5e1;border-radius:7px;padding:3px 9px;font-size:13.5px">' + esc(k) + ' <b style="font-size:15px">' + _bsW(m[k]) + '</b></span>'; }).join("") + '<span style="background:#fde68a;border-radius:7px;padding:3px 10px;font-size:13.5px;font-weight:900">합계 ' + _bsW(tot) + '두름</span></div>';
}
function ykQAdd(){
  var E = YK.ed, w = E.w, g = function(id){ return document.getElementById(id); };
  var n = (g("ykQn") || {}).value || "", nm = (g("ykQi") || {}).value || "", q = _bsN((g("ykQq") || {}).value);
  n = String(n).trim(); nm = String(nm).trim();
  if(!n) return toast("이모를 골라 주세요", true);
  if(!nm) return toast("품명을 골라 주세요", true);
  if(!_ykItem(nm)) return toast("「" + nm + "」 품명이 등록 안 돼 있어요 — 목록 맨 아래 ➕ 새 품명", true);
  if(w.ws.indexOf(n) < 0 && !(_ykS().people || {})[n]){ if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if(!confirm("「" + n + "」 새 이모로 넣을까요?")) return; }
  if(!q) return toast("두름을 적어 주세요", true);
  if(w.ws.indexOf(n) < 0) w.ws.push(n);
  var r = w.rows.filter(function(x){ return x.item === nm; })[0];
  if(!r){ r = w.rows.filter(function(x){ return !x.item && !Object.keys(x.c || {}).length; })[0];
    if(r) r.item = nm; else { r = { item: nm, kind: _ykKindOf(w), c: {} }; w.rows.push(r); } }
  r.c = r.c || {}; var v = Math.round((_bsN(r.c[n]) + q) * 100) / 100;
  if(v <= 0) delete r.c[n]; else r.c[n] = v;
  E.log = E.log || []; E.log.push({ n: n, item: nm, q: q });
  E.qn = n; E.qi = nm;
  var y = window.scrollY; draw(); scrollTo(0, y);
  setTimeout(function(){ var e = g("ykQq"); if(e){ e.value = ""; e.focus({ preventScroll: true }); } }, 30);
}
function ykQUndo(idx){
  var E = YK.ed, x = (E.log || [])[idx]; if(!x) return;
  var r = E.w.rows.filter(function(z){ return z.item === x.item; })[0];
  if(r && r.c){ var v = Math.round((_bsN(r.c[x.n]) - x.q) * 100) / 100; if(v <= 0) delete r.c[x.n]; else r.c[x.n] = v; }
  E.log.splice(idx, 1);
  var y = window.scrollY; draw(); scrollTo(0, y);
}

// 📱 폰 입력 방식 고르기 (기억): ⚡ 한 줄로 넣기 / ▦ 표로 넣기 (박스·마리·잔량 없이 숫자만)
function _ykQMode(){ try { return localStorage.getItem("gm_ykQMode") || "line"; } catch(e){ return "line"; } }
function ykQModeSet(m){ try { localStorage.setItem("gm_ykQMode", m); } catch(e){} var y = window.scrollY; draw(); scrollTo(0, y); }
function _ykEdMob2(w){
  return (_ykCan() ? _ykQBar(w, true) : "") + _ykQGrid(w);
  var md = _ykQMode(), tb = function(k, lb){ var on = md === k; return '<button class="btn" onclick="ykQModeSet(\'' + k + '\')" style="padding:5px 12px;font-size:13px;font-weight:800;background:' + (on ? "#0e7490" : "#fff") + ';color:' + (on ? "#fff" : "#0e7490") + ';border:1.5px solid #0e7490">' + lb + '</button>'; };
  var h = '<div style="display:flex;gap:6px;padding:0 12px 8px">' + tb("line", "⚡ 한 줄로 넣기") + tb("grid", "▦ 표로 넣기") + '</div>';
  if(md === "grid") return h + _ykQGrid(w);
  if(_ykCan()) h += _ykQBar(w);
  // 이모별 합계 (작게)
  if(w.ws.length){ h += '<div style="padding:0 12px 10px"><div style="font-size:12px;font-weight:800;color:#475569;margin-bottom:4px">👵 이모별</div><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:5px">';
    w.ws.forEach(function(n, j){ h += '<div style="border:1px solid #e2e8f0;border-radius:7px;padding:4px 6px;font-size:11.5px"><div style="display:flex;justify-content:space-between"><b>' + esc(n) + '</b><a href="javascript:void 0" onclick="ykDelWorker(' + j + ')" style="color:#dc2626;text-decoration:none">✕</a></div><div id="ykWd' + j + '" style="line-height:1.35"></div><div id="ykWa' + j + '" style="font-weight:800;color:#b45309"></div></div>'; });
    h += '</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:6px;font-size:12.5px"><span>두름 <b id="ykTd"></b></span><span>엮거리 값 <b id="ykTa" style="color:#b45309"></b></span></div></div>'; }
  return h;
}
// ▦ 표: 줄=품명, 칸=이모 — 칸 누르면 숫자 자판, Enter 누르면 아래 칸으로
function _ykQGrid(w, pc){
  var can = _ykCan(), I = _ykS().items || {}, nc = w.ws.length;
  var th = 'style="padding:4px 3px;font-size:' + (pc ? 12.5 : 11.5) + 'px;white-space:nowrap;background:' + (pc ? "#eef2f7" : "#ecfeff") + ';border:1px solid ' + (pc ? "#64748b" : "#cbd5e1") + '"';
  var bd = pc ? "#94a3b8" : "#e2e8f0";
  var h = '<div style="padding:0 6px 10px"><div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="border-collapse:collapse;font-size:12px"><thead><tr><th ' + th.replace('style="', 'style="position:sticky;left:0;z-index:2;text-align:left;min-width:' + (pc ? 130 : 78) + 'px;') + '>' + (pc ? '작업자 →<br>품명 ↓' : '품명') + '</th>';
  w.ws.forEach(function(n, j){ h += '<th ' + th + '>' + (can ? _ykWsHd(j, n) : esc(n)) + '</th>'; });
  h += '<th ' + th.replace(/#ecfeff|#eef2f7/, "#fde68a") + '>합계</th>' + (pc ? '<th ' + th.replace("#eef2f7", "#dcfce7") + ' title="포장하면서 센 두름 · +3 / -2 처럼 오차만 적어도 돼요 · 비우면 합계와 같게">실제<div style="font-weight:400;font-size:10px">숫자 또는 ±</div></th><th ' + th + '>마리수</th><th ' + th + '>박스</th><th ' + th + '>잔량</th>' : '') + '</tr></thead><tbody>';
  w.rows.forEach(function(r, i){
    h += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff;border:1px solid #e2e8f0;padding:2px 4px;white-space:nowrap;font-weight:700;font-size:12px">' + (can ? _ykCb("item", r.item || "", "var y=window.scrollY;_ykPicked2('item'," + i + ",V);scrollTo(0,y)", "품명", "width:" + (pc ? 130 : 92) + "px;padding:3px 4px;font-size:" + (pc ? 13 : 16) + "px;font-weight:700;border:1px solid " + (r.item && !_ykItem(r.item) ? "#dc2626" : "#e2e8f0") + ";border-radius:5px;background:" + (r.item && !_ykItem(r.item) ? "#fef2f2" : "#fff") + ";box-sizing:border-box;vertical-align:middle") + _ykItemEdBtn(i, r.item) : (esc(r.item) || '<span style="color:#dc2626">품명?</span>')) + ' ' + _ykKindBtn(i, r, "tiny") + (can ? ' <a href="javascript:void 0" onclick="if(confirm(\'이 줄을 지울까요?\')){YK.ed.w.rows.splice(' + i + ',1);draw()}" style="color:#dc2626;text-decoration:none;font-size:11px">✕</a>' : '') + '</td>';
    w.ws.forEach(function(n, j){ var v = (r.c || {})[n]; h += '<td style="border:1px solid #e2e8f0;padding:0">' + (can ? '<input class="ykQC" data-r="' + i + '" data-c="' + j + '" type="text" inputmode="decimal" enterkeyhint="next" value="' + esc(v || "") + '" oninput="_ykCell(' + i + ',' + j + ',this.value)" onkeydown="_ykQKey(event,this)" onfocus="this.select()" style="width:' + (pc ? 52 : 42) + 'px;padding:5px 3px;font-size:16px;border:none;text-align:right;background:' + (v ? "#fffbeb" : "#fff") + ';box-sizing:border-box">' : '<div style="width:44px;text-align:right;padding:4px">' + (v ? _bsW(v) : "") + '</div>') + '</td>'; });
    h += '<td id="ykQR' + i + '" style="border:1px solid ' + bd + ';padding:3px 5px;text-align:right;font-weight:900;background:#fef9c3;min-width:44px"></td>';
    if(pc) h += '<td style="border:1px solid ' + bd + ';padding:0;background:#f0fdf4">' + (can ? '<input class="ykQC" data-r="' + i + '" data-c="' + nc + '" id="ykRx' + i + '" type="text" inputmode="decimal" value="' + esc(r.real == null ? "" : r.real) + '" oninput="YK.ed.w.rows[' + i + '].real=this.value;_ykRecalc()" onkeydown="_ykQKey(event,this)" onfocus="this.select()" style="width:60px;padding:5px 4px;font-size:14px;border:none;text-align:right;font-weight:800;background:transparent;box-sizing:border-box">' : esc(r.real == null ? "" : r.real)) + '</td><td id="ykRm' + i + '" style="border:1px solid ' + bd + ';padding:3px 6px;text-align:right"></td><td id="ykRb' + i + '" style="border:1px solid ' + bd + ';padding:3px 6px;text-align:right;font-weight:800"></td><td id="ykRr' + i + '" style="border:1px solid ' + bd + ';padding:3px 6px;text-align:right"></td>';
    h += '</tr>'; });
  h += '</tbody><tfoot><tr><td style="position:sticky;left:0;z-index:1;background:#f1f5f9;border:1px solid #cbd5e1;padding:3px 4px;font-weight:800;font-size:11.5px">이모 합계</td>';
  w.ws.forEach(function(n, j){ h += '<td id="ykQW' + j + '" style="border:1px solid #cbd5e1;background:#f1f5f9;padding:3px;text-align:right;font-weight:800"></td>'; });
  h += '<td id="ykQT" style="border:1px solid #cbd5e1;background:#fde68a;padding:3px 5px;text-align:right;font-weight:900"></td>' + (pc ? '<td id="ykTx" style="border:1px solid #cbd5e1;background:#dcfce7;padding:3px 5px;text-align:right;font-weight:900"></td><td id="ykTm" style="border:1px solid #cbd5e1;background:#f1f5f9;padding:3px 5px;text-align:right;font-weight:800"></td><td id="ykTb" style="border:1px solid #cbd5e1;background:#f1f5f9;padding:3px 5px;text-align:right;font-weight:900"></td><td style="border:1px solid #cbd5e1;background:#f1f5f9"></td>' : '') + '</tr>';
  { h += '<tr><td style="position:sticky;left:0;z-index:1;background:#fff7ed;border:1px solid #cbd5e1;padding:3px 4px;font-weight:800;font-size:12px">당일 금액</td>';
    w.ws.forEach(function(n, j){ h += '<td id="ykWa' + j + '" style="border:1px solid #cbd5e1;background:#fff7ed;padding:3px;text-align:right;font-weight:800;color:#b45309;font-size:12px"></td>'; });
    h += '<td id="ykTa" style="border:1px solid #cbd5e1;background:#fff7ed;padding:3px 5px;text-align:right;font-weight:900;color:#b45309"></td>' + (pc ? '<td colspan="4" style="border:1px solid #cbd5e1;background:#fff7ed"></td>' : '') + '</tr>'; }
  h += '</tfoot></table></div>';
  if(can){ var have = {}; w.rows.forEach(function(r){ have[r.item] = 1; });
    h += '<div style="display:flex;gap:6px;margin-top:6px;align-items:center"><select onchange="if(this.value){YK.ed.w.rows.push({item:this.value,kind:_ykKindOf(YK.ed.w),c:{}});draw()}" style="padding:6px;font-size:14px;border:1.5px solid #b45309;border-radius:7px;background:#fff7ed;font-weight:700;width:auto;max-width:240px"><option value="">+ 품명 줄 넣기</option>' + _ykItemKeys().filter(function(k){ return !have[I[k].nm || k]; }).map(function(k){ var nm = I[k].nm || k; return '<option value="' + esc(nm) + '">' + esc(nm) + '</option>'; }).join("") + '</select>' + (w.ws.length ? '' : '<span class="mut" style="font-size:12px">위 「👵 이모 넣기」로 이모 칸부터</span>') + '</div>'; }
  h += '<div class="mut" style="font-size:11.5px;margin-top:5px">' + (pc ? '⌨ 엑셀처럼: Enter·↓ = 아래 칸 · ↑ = 위 칸 · Tab·→ = 옆 칸 · 숫자 바로 치면 덮어써요' : '칸 누르면 숫자 자판 · 다음(Enter) 누르면 아래 칸 · 박스·잔량·실제(포장)는 PC 화면에서') + '</div></div>';
  return h;
}
function _ykQKey(ev, el){
  var K = ev.key, r = +el.getAttribute("data-r"), c = +el.getAttribute("data-c");
  if(K === "ArrowLeft" || K === "ArrowRight"){ var all = el.selectionStart === 0 && el.selectionEnd === el.value.length, edge = K === "ArrowLeft" ? el.selectionStart === 0 : el.selectionEnd === el.value.length; if(!all && !edge) return;
    var sx = document.querySelector('.ykQC[data-r="' + r + '"][data-c="' + (c + (K === "ArrowLeft" ? -1 : 1)) + '"]'); if(sx){ ev.preventDefault(); sx.focus(); sx.select(); } return; }
  if(K !== "Enter" && K !== "ArrowDown" && K !== "ArrowUp") return;
  ev.preventDefault(); var nr = r + (K === "ArrowUp" ? -1 : 1), nc = c;
  var nx = document.querySelector('.ykQC[data-r="' + nr + '"][data-c="' + nc + '"]');
  if(!nx && ev.key === "Enter"){ nx = document.querySelector('.ykQC[data-r="0"][data-c="' + (c + 1) + '"]'); }   // 맨 아래면 다음 이모 맨 위로
  if(nx){ nx.focus(); nx.select(); } else el.blur();
}
function _ykQGTot(w){
  var T = function(id, v){ var e = document.getElementById(id); if(e) e.innerHTML = v; };
  if(!document.getElementById("ykQT")) return;
  var tot = 0, cw = w.ws.map(function(){ return 0; });
  w.rows.forEach(function(r, i){ var q = 0; w.ws.forEach(function(n, j){ var v = _bsN((r.c || {})[n]); q += v; cw[j] += v; }); tot += q; T("ykQR" + i, q ? _bsW(q) : ""); });
  cw.forEach(function(v, j){ T("ykQW" + j, v ? _bsW(v) : ""); }); T("ykQT", _bsW(tot));
}

function _ykKindOpts(v){ return [["", "작업마다"], ["굴비", "굴비"], ["부세", "부세"]].map(function(o){ return '<option value="' + o[0] + '"' + ((v || "") === o[0] ? " selected" : "") + '>' + o[1] + '</option>'; }).join(""); }
function _ykKindCell(k, x, can){
  var col = x.kind === "부세" ? "#0e7490" : x.kind ? "#b45309" : "#94a3b8";
  if(!can) return '<span style="font-weight:800;color:' + col + '">' + (x.kind || "-") + '</span>';
  return '<select onchange="ykItemKind(\'' + esc(k) + '\',this.value)" style="padding:2px 3px;font-size:12px;font-weight:800;border:1px solid #e2e8f0;border-radius:5px;color:' + col + '">' + _ykKindOpts(x.kind) + '</select>';
}
function ykItemKind(k, v){ var x = (YK.D.items || {})[k]; if(!x) return; _ykRef("items/" + k + "/kind").set(v || null).then(function(){ if(v) x.kind = v; else delete x.kind; toast(x.nm + " → " + (v || "작업마다 고름")); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); }); }
// PC 입력 모양: ▦ 작업현황표 모양(엑셀처럼) / 📝 예전 방식 (기억)
function _ykPcSheet(){ try { return localStorage.getItem("gm_ykPcSheet") !== "0"; } catch(e){ return true; } }
function ykPcSheetSet(on){ try { localStorage.setItem("gm_ykPcSheet", on ? "1" : "0"); } catch(e){} var y = window.scrollY; draw(); scrollTo(0, y); }
function _ykPcTog(){ var on = _ykPcSheet(), b = function(v, lb){ var a = on === v; return '<button class="btn" onclick="ykPcSheetSet(' + v + ')" style="border-radius:0;padding:4px 10px;font-size:12.5px;font-weight:800;background:' + (a ? "#334155" : "#fff") + ';color:' + (a ? "#fff" : "#334155") + '">' + lb + '</button>'; };
  return '<div style="padding:0 12px 8px"><span style="display:inline-flex;border:2px solid #334155;border-radius:8px;overflow:hidden">' + b(true, "▦ 작업현황표 모양") + b(false, "📝 예전 방식") + '</span></div>'; }

// 한 줄 넣기에서 ➕ 새 이모 / ➕ 새 품명
function _ykQNew(el){
  var E = YK.ed;
  if(el.value !== "__new"){ if(el.id === "ykQn") E.qn = el.value; else E.qi = el.value; return; }
  if(el.id === "ykQn"){ el.value = E.qn || ""; var n = (prompt("새 이모 이름 (별명)") || "").trim(); if(!n) return;
    if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true);
    if(E.w.ws.indexOf(n) < 0) E.w.ws.push(n); E.qn = n; var y = window.scrollY; draw(); scrollTo(0, y); setTimeout(function(){ var q = document.getElementById("ykQi"); if(q) q.focus(); }, 30); return; }
  el.value = E.qi || ""; E.qn = (document.getElementById("ykQn") || {}).value || E.qn; YK.after = { t: "item", q: 1 }; ykItemEdit("", "");
}

// 🧹 새 작업 비우기 (지난 작업에서 불러온 것)
function ykReset(what){
  var E = YK.ed; if(!E || E.id) return; var w = E.w, has = w.rows.some(function(r){ return Object.keys(r.c || {}).length; });
  var nm = { all: "전체", mat: "원료", item: "품명", ws: "이모" }[what];
  if(!confirm(nm + " 초기화할까요?" + (has && what !== "mat" ? "\n(적어 둔 두름도 같이 지워져요)" : ""))) return;
  if(what === "mat" || what === "all") w.mats = [{ nm: "", qty: "", price: "" }];
  if(what === "item" || what === "all") w.rows = [];
  if(what === "ws" || what === "all"){ w.ws = []; w.rows.forEach(function(r){ r.c = {}; }); }
  if(what === "all"){ w.origin = ""; w.boxMat = ""; w.note = ""; w.labor = ""; w.misc = ""; w.actual = ""; E.log = []; E.qn = ""; E.qi = ""; }
  draw(); toast("🧹 " + nm + " 초기화했어요");
}
function _ykQPick(f, v){
  var E = YK.ed, g = function(id){ return document.getElementById(id); };
  if(f === "n"){ if(v === "__new"){ var n = (prompt("새 이모 이름 (별명)") || "").trim(); if(!n) return; if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if(E.w.ws.indexOf(n) < 0) E.w.ws.push(n); E.qn = n; var y = window.scrollY; draw(); scrollTo(0, y); } else E.qn = v;
    setTimeout(function(){ var q = g("ykQi"); if(q){ q.focus(); q.select(); } }, 30); return; }
  if(v === "__new"){ E.qn = (g("ykQn") || {}).value || E.qn; YK.after = { t: "item", q: 1 }; return ykItemEdit("", ""); }
  E.qi = v; setTimeout(function(){ var q = g("ykQq"); if(q) q.focus(); }, 30);
}
// ════════ 🔎 쳐서 고르기 (원료·품명·이모) — 글자 일부·초성(ㄷㅈ)으로 찾기 · ↑↓ Enter ════════
var _YK_CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
function _ykCho(s){ var o = ""; s = String(s || ""); for(var i = 0; i < s.length; i++){ var c = s.charCodeAt(i) - 44032; o += c >= 0 && c < 11172 ? _YK_CHO[Math.floor(c / 588)] : s[i]; } return o; }
function _ykCbOpts(kind){
  var S = _ykS(), L = [];
  if(kind === "ppl"){ var P = S.people || {}, ws = (YK.ed && YK.ed.w.ws) || [];
    var ks = Object.keys(P); ws.forEach(function(n){ if(ks.indexOf(n) < 0) ks.push(n); });
    ks.sort(function(a, b){ var fa = ws.indexOf(a) >= 0 ? 0 : (P[a] && P[a].on !== false) ? 1 : 2, fb = ws.indexOf(b) >= 0 ? 0 : (P[b] && P[b].on !== false) ? 1 : 2; return fa - fb || a.localeCompare(b); });
    ks.forEach(function(n){ L.push({ v: n, lb: (ws.indexOf(n) >= 0 ? "✔ " : "") + n }); }); L.push({ v: "__new", lb: "➕ 새 이모 추가…" }); return L; }
  var isI = kind === "item", T = isI ? S.items || {} : S.mats || {};
  (isI ? _ykItemKeys() : _ykMatKeys()).forEach(function(k){ var x = T[k], nm = x.nm || k; L.push({ v: nm, lb: nm, sub: isI ? (x.kind ? x.kind + " · " : "") + (x.mi ? x.mi + "미" : "") + (x.box ? " · " + x.box + "두름/박스" : "") : (x.mi ? x.mi + "마리/짝" : "") }); });
  L.push({ v: "__new", lb: isI ? "➕ 새 품명 추가…" : "➕ 새 원료 추가…" }); return L;
}
function _ykCb(kind, v, on, ph, sty, id){
  return '<input type="text" autocomplete="off" ' + (id ? 'id="' + id + '" ' : '') + 'data-cbk="' + kind + '" data-cbon="' + esc(on) + '" data-cb0="' + esc(v || "") + '" value="' + esc(v || "") + '" placeholder="' + esc(ph) + '" onfocus="this.select();_ykCbOpen(this,1)" onclick="_ykCbOpen(this,1)" oninput="_ykCbOpen(this)" onkeydown="_ykCbKey(event,this)" onblur="_ykCbBlur(this)" style="box-sizing:border-box;' + sty + '">';
}
var _YKCB = null;
function _ykCbBox(){ var d = document.getElementById("ykCbL"); if(!d){ d = document.createElement("div"); d.id = "ykCbL"; d.style.cssText = "position:fixed;z-index:9500;background:#fff;border:2px solid #b45309;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.2);overflow-y:auto;-webkit-overflow-scrolling:touch;display:none"; document.body.appendChild(d);
  window.addEventListener("scroll", function(e){ if(_YKCB && !(e.target && e.target.id === "ykCbL")) _ykCbPlace(); }, true); window.addEventListener("resize", function(){ if(_YKCB) _ykCbPlace(); }); } return d; }
function _ykCbPlace(){ var el = _YKCB && _YKCB.el, d = _ykCbBox(); if(!el || !document.body.contains(el)){ d.style.display = "none"; _YKCB = null; return; }
  var r = el.getBoundingClientRect(), vh = window.innerHeight, below = vh - r.bottom - 8, above = r.top - 8, up = below < 180 && above > below;
  d.style.left = Math.max(4, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 4)) + "px"; d.style.width = Math.max(r.width, 220) + "px";
  d.style.maxHeight = Math.max(120, Math.min(300, up ? above : below)) + "px";
  if(up){ d.style.top = ""; d.style.bottom = (vh - r.top + 2) + "px"; } else { d.style.bottom = ""; d.style.top = (r.bottom + 2) + "px"; } }
function _ykCbOpen(el, all){
  var q = all ? "" : String(el.value || "").trim(), L = _ykCbOpts(el.getAttribute("data-cbk")), qc = q.replace(/\s/g, "");
  var M = !q ? L : L.filter(function(o){ if(o.v === "__new") return true; var n = o.v.replace(/\s/g, ""); return n.indexOf(qc) >= 0 || _ykCho(n).indexOf(qc) >= 0; });
  _YKCB = { el: el, L: M, hi: q && M.length > 1 ? 0 : -1 }; _ykCbDraw(); _ykCbPlace(); _ykCbBox().style.display = "block";
}
function _ykCbDraw(){ var C = _YKCB, d = _ykCbBox(); if(!C) return;
  d.innerHTML = C.L.length ? C.L.map(function(o, i){ var nw = o.v === "__new"; return '<div data-i="' + i + '" onmousedown="event.preventDefault()" onclick="_ykCbPick(' + i + ')" style="padding:9px 10px;cursor:pointer;font-size:15px;border-bottom:1px solid #f1f5f9;' + (i === C.hi ? "background:#fde68a;" : "") + (nw ? "color:#16a34a;font-weight:800;" : "font-weight:700;") + '">' + esc(o.lb) + (o.sub ? ' <span style="font-size:11.5px;color:#64748b;font-weight:400">' + esc(o.sub) + '</span>' : '') + '</div>'; }).join("") : '<div style="padding:9px;color:#94a3b8">없어요</div>';
  var hi = d.querySelector('[data-i="' + C.hi + '"]'); if(hi && hi.scrollIntoView) hi.scrollIntoView({ block: "nearest" }); }
function _ykCbKey(ev, el){
  var C = _YKCB; if(!C || C.el !== el){ if(ev.key === "ArrowDown"){ _ykCbOpen(el, 1); ev.preventDefault(); } return; }
  if(ev.key === "ArrowDown" || ev.key === "ArrowUp"){ ev.preventDefault(); var n = C.L.length; if(!n) return; C.hi = ((C.hi < 0 ? (ev.key === "ArrowDown" ? -1 : 0) : C.hi) + (ev.key === "ArrowDown" ? 1 : -1) + n) % n; _ykCbDraw(); }
  else if(ev.key === "Enter"){ ev.preventDefault(); var i = C.hi >= 0 ? C.hi : 0, q = String(el.value || "").trim(), ex = C.L.filter(function(o){ return o.v === q; })[0];
    if(ex) return _ykCbPick(C.L.indexOf(ex)); if(C.L.length && (C.hi >= 0 || C.L[0].v !== "__new")) return _ykCbPick(i);
    if(el.getAttribute("data-cbk") === "ppl" && q) return _ykCbDo(el, q); }
  else if(ev.key === "Escape"){ el.value = el.getAttribute("data-cb0") || ""; _ykCbClose(); el.blur(); }
}
function _ykCbPick(i){ var C = _YKCB; if(!C) return; var o = C.L[i], el = C.el; if(!o) return; _ykCbClose(); if(o.v !== "__new") el.value = o.v; _ykCbDo(el, o.v); }
function _ykCbDo(el, v){ el.setAttribute("data-cb0", v === "__new" ? (el.getAttribute("data-cb0") || "") : v); try { (new Function("V", el.getAttribute("data-cbon")))(v); } catch(e){ console.warn("cb", e); } }
function _ykCbClose(){ var d = document.getElementById("ykCbL"); if(d) d.style.display = "none"; _YKCB = null; }
function _ykCbBlur(el){ setTimeout(function(){ if(_YKCB && _YKCB.el === el) _ykCbClose();
  var v = String(el.value || "").trim(), v0 = el.getAttribute("data-cb0") || "", k = el.getAttribute("data-cbk");
  if(v === v0) return;
  if(k === "ppl"){ if(YK.ed) YK.ed.qn = v; return; }   // 이모는 새 이름도 OK (넣을 때 확인)
  var hit = _ykCbOpts(k).filter(function(o){ return o.v !== "__new" && o.v === v; })[0];
  if(hit) return _ykCbDo(el, v);
  if(el.id === "ykQi"){ if(YK.ed) YK.ed.qi = v; return; }
  el.value = v0; if(v) toast("목록에서 골라 주세요 (없으면 맨 아래 ➕ 새로 추가)", true); }, 220); }

// 🧹 칸 옆 작은 초기화 버튼 (새 작업 등록에서만)
function _ykRsB(what){ var E = YK.ed; if(!E || E.id || !_ykCan()) return ""; var nm = { mat: "원료", item: "품명", ws: "이모" }[what];
  return '<button class="btn" onclick="ykReset(\'' + what + '\')" title="' + nm + ' 비우기" style="padding:3px 8px;font-size:11.5px;font-weight:800;background:#475569;color:#fff;white-space:nowrap">🧹 ' + nm + ' 초기화</button>'; }

// 👵 이모 칸 머리: 이름 누르면 바꾸기 · ◀ ▶ 순서 · ✕ 빼기 (적은 두름은 그대로 따라감)
function _ykWsHd(j, n){
  var L = YK.ed.w.ws.length, b = 'border:1px solid #94a3b8;background:#fff;color:#334155;border-radius:4px;width:20px;height:18px;font-size:9px;cursor:pointer;padding:0;line-height:1';
  return '<span onclick="ykRenWorker(' + j + ')" title="눌러서 다른 이모로 바꾸기" style="cursor:pointer;border-bottom:1px dashed #64748b">' + esc(n) + '</span> <a href="javascript:void 0" onclick="ykDelWorker(' + j + ')" title="이 이모 빼기" style="color:#dc2626;text-decoration:none">✕</a>'
    + '<div style="display:flex;gap:2px;justify-content:center;margin-top:2px">' + (j > 0 ? '<button title="왼쪽으로" onclick="ykMoveWorker(' + j + ',-1)" style="' + b + '">◀</button>' : '') + (j < L - 1 ? '<button title="오른쪽으로" onclick="ykMoveWorker(' + j + ',1)" style="' + b + '">▶</button>' : '') + '</div>';
}
function ykMoveWorker(j, d){ var a = YK.ed.w.ws, k = j + d; if(k < 0 || k >= a.length) return; var t = a[j]; a[j] = a[k]; a[k] = t; var y = window.scrollY; draw(); scrollTo(0, y); }
function ykRenWorker(j){
  var w = YK.ed.w, o = w.ws[j], P = _ykS().people || {};
  var L = Object.keys(P).filter(function(n){ return w.ws.indexOf(n) < 0; }).sort(function(a, b){ return ((P[a].on !== false) ? 0 : 1) - ((P[b].on !== false) ? 0 : 1) || _ykOrd(P[a]) - _ykOrd(P[b]) || a.localeCompare(b); });
  var h = '<h3 style="margin:0 0 8px">👵 「' + esc(o) + '」 → 누구로 바꿀까요? <button class="btn" style="background:#475569;color:#fff;float:right;padding:4px 10px" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="font-size:12.5px;color:#475569;margin-bottom:8px">이모 명단에 등록된 사람만 나와요 · 적어 둔 두름은 그대로 옮겨져요</div>';
  h += '<input id="ykRenQ" placeholder="🔍 이름 찾기 (초성도 돼요)" oninput="_ykRenF(this.value)" style="width:100%;padding:8px;font-size:16px;border:2px solid #0e7490;border-radius:8px;box-sizing:border-box;margin-bottom:8px">';
  h += '<div id="ykRenL" style="display:flex;flex-wrap:wrap;gap:6px;max-height:50vh;overflow:auto">' + (L.length ? L.map(function(n){ var fx = P[n].on !== false; return '<button class="btn ykRenB" data-n="' + esc(n) + '" onclick="_ykRenDo(' + j + ',this.getAttribute(\'data-n\'))" style="padding:8px 14px;font-size:15px;font-weight:800;background:' + (fx ? "#7c3aed" : "#0e7490") + ';color:#fff">' + (fx ? "📌 " : "") + esc(n) + '</button>'; }).join("") : '<span class="mut">표에 없는 등록 이모가 없어요</span>') + '</div>';
  h += '<div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:12.5px">명단에 없는 분이면 <button class="btn" style="background:#16a34a;color:#fff;padding:4px 10px;font-size:12.5px" onclick="_ykRenNew(' + j + ')">➕ 새 이모 등록해서 바꾸기</button></div>';
  openPopup(h, 460);
  setTimeout(function(){ var q = document.getElementById("ykRenQ"); if(q && !_ykMob()) q.focus(); }, 50);
}
function _ykRenF(q){ q = String(q || "").replace(/\s/g, ""); document.querySelectorAll(".ykRenB").forEach(function(b){ var n = b.getAttribute("data-n").replace(/\s/g, ""); b.style.display = !q || n.indexOf(q) >= 0 || _ykCho(n).indexOf(q) >= 0 ? "" : "none"; }); }
function _ykRenNew(j){ var n = (prompt("새 이모 이름 (별명) — 저장하면 이모 명단에 들어가요") || "").trim(); if(!n) return; if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if((_ykS().people || {})[n] && !confirm("「" + n + "」은 이미 명단에 있어요. 그분으로 바꿀까요?")) return; _ykRenDo(j, n); }
function _ykRenDo(j, n){
  var w = YK.ed.w, o = w.ws[j];
  if(!n || n === o) return closePopup();
  if(w.ws.indexOf(n) >= 0) return toast("「" + n + "」은 이미 표에 있어요", true);
  w.ws[j] = n;
  w.rows.forEach(function(r){ if(r.c && o in r.c){ r.c[n] = r.c[o]; delete r.c[o]; } });
  if(YK.ed.qn === o) YK.ed.qn = n;
  closePopup(); var y = window.scrollY; draw(); scrollTo(0, y); toast("👵 " + o + " → " + n);
}

// 💲 작업마다 정품 가격 기준일 — 예전 작업도 지금 정품 가격(판매·도매·원가·조절도매)으로 다시 계산 · 되돌리기 가능
function _ykPxDiff(w){ return (w.rows || []).some(function(r){ var I = _ykItem(r.item); if(!I || !I.ph) return false; var a = _ykPx(I, w.dt), b = _ykPxOf(I); return YK_PF.some(function(k){ return a[k] !== b[k]; }); }); }
function _ykPxBtn(id, w){
  if(!_ykCan()) return "";
  if(w.pxDt) return '<span style="display:inline-flex;gap:4px;align-items:center;background:#f0fdfa;border:1px solid #5eead4;border-radius:7px;padding:2px 4px 2px 8px;font-size:12.5px;color:#0f766e;font-weight:800">💲 ' + esc(String(w.pxDt).replace(/-/g, ".")) + ' 가격' + _bsB("#64748b", "↩ 그때 가격", "ykPxSet(['" + id + "'],0)", "padding:3px 8px;font-size:12px") + '</span>';
  return _ykPxDiff(w) ? _bsB("#0f766e", "💲 지금 가격으로", "ykPxSet(['" + id + "'],1)", _ykSB ? _ykSB() : "") : "";
}
function ykPxSet(ids, on){
  var W = _ykS().works || {}, t = _bsToday(), up = {};
  ids.forEach(function(k){ if(W[k]) up["works/" + k + "/pxDt"] = on ? t : null; });
  if(!Object.keys(up).length) return;
  if(ids.length > 1 && !confirm(ids.length + "건을 " + (on ? "지금 정품 가격(" + t.replace(/-/g, ".") + ")으로" : "작업한 날 가격으로") + " 다시 계산할까요?")) return;
  _ykRef().update(up).then(function(){ ids.forEach(function(k){ if(!W[k]) return; if(on) W[k].pxDt = t; else delete W[k].pxDt; if(YK.ed && YK.ed.id === k){ if(on) YK.ed.w.pxDt = t; else delete YK.ed.w.pxDt; } });
    toast(on ? "💲 지금 정품 가격으로 계산해요" : "↩ 작업한 날 가격으로 계산해요"); if(YK.anPop && ids.indexOf(YK.anPop) >= 0 && ids.length === 1) ykAnalPop(YK.anPop); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// 표 품명 칸 옆 작은 [수정] — 원료처럼 그 정품(가격·박스·마리수 등) 고치기 · 없는 이름이면 [+] 새로 추가
function _ykItemEdBtn(i, nm){
  var st = "padding:1px 5px;font-size:11px;margin-left:2px;vertical-align:middle;border-radius:5px;color:#fff;border:none;cursor:pointer";
  if(nm && _ykItem(nm)) return '<button class="btn" title="이 정품 고치기 (가격·박스·마리수 등)" onclick="YK.after={t:\'item\',i:' + i + ',old:\'' + esc(nm).replace(/'/g, "\\'") + '\'};ykItemEdit(\'' + esc(_ykKey(nm)).replace(/'/g, "\\'") + '\')" style="background:#2563eb;' + st + '">수정</button>';
  return '<button class="btn" title="새 정품으로 추가" onclick="_ykAddNew(\'item\',' + i + ',\'' + esc(nm || "").replace(/'/g, "\\'") + '\')" style="background:#16a34a;' + st + '">+</button>';
}
