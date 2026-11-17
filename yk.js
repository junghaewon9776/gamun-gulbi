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
// 엮거리 단가: 작업마다 저장할 때 단가를 같이 적어 둠(w.rate) → 나중에 설정 단가 올려도 지난 작업 금액은 그대로
function _ykRate(w){ var st = _ykSet().rate, r = (w && w.rate) || {}; return { 굴비: r.굴비 != null && r.굴비 !== "" ? _bsN(r.굴비) : _bsN(st.굴비), 부세: r.부세 != null && r.부세 !== "" ? _bsN(r.부세) : _bsN(st.부세) }; }
function _ykCalc(w){
  var st = _ykSet(), o = { matMi: 0, matKg: 0, matCost: 0, rows: [], doo: 0, mi: 0, boxes: 0, workers: {}, weave: 0 };
  (w.mats || []).forEach(function(m){ var M = _ykMat(m.nm) || {}, q = _bsN(m.qty); o.matMi += q * _bsN(M.mi); o.matKg += q * _bsN(M.kg); o.matCost += q * (m.price !== "" && m.price != null ? _bsN(m.price) : _bsN(M.price)); });
  (w.ws || []).forEach(function(n){ o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }; });
  (w.rows || []).forEach(function(r){
    var I = _ykItem(r.item) || {}, doo = 0, kind = r.kind || "굴비";
    Object.keys(r.c || {}).forEach(function(n){ var v = _bsN(r.c[n]); if(!v) return; doo += v; var W = o.workers[n] || (o.workers[n] = { 굴비: 0, 부세: 0, amt: 0 }); W[kind] += v; W.amt += v * _bsN(_ykRate(w)[kind]); });
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
  var fix = _ykFixed();
  YK.ed = { id: "", w: { dt: _bsToday(), mats: _ykLastMats(lw), ws: fix.length ? fix : (lw ? (lw.ws || []).slice() : []), rows: _ykLastRows(lw), rate: JSON.parse(JSON.stringify(_ykSet().rate)), actual: "", labor: "", misc: "", origin: lw && lw.origin || "국산", boxMat: lw && lw.boxMat || "", note: "" } };
  draw();
}
// 📌 고정 체크한 이모 (이모 명단에서 체크) — 새 작업에 저절로 들어감
function _ykFixed(){ var P = _ykS().people || {}; return Object.keys(P).filter(function(n){ return P[n].on !== false; }).sort(); }
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
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">' + _bsB("#0e7490", "🖨 전표", "ykPrintSlip()") + _bsB("#7c3aed", "🏷 라벨", "ykPrintLabel()") + _bsB("#475569", "🖨 작업현황표", "ykPrintSheet()") + _bsB("#475569", "🖨 생산작업일지", "ykPrintProd()") + (can ? _bsB("#16a34a", "💾 저장", "ykSave()", "padding:8px 20px") : "") + '</div></div></div>';
  // 기본 · 원료
  h += '<div class="card" style="margin-bottom:10px"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;font-size:13px">';
  h += '<label>작업일<input type="date" value="' + esc(w.dt) + '" onchange="YK.ed.w.dt=this.value;document.getElementById(\'ykLot\').textContent=_ykLot(this.value);_ykRecalc()" style="width:100%;padding:5px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>';
  h += '<label>원산지' + _ykIn(w.origin, "YK.ed.w.origin=this.value") + '</label><label>상자 재질' + _ykIn(w.boxMat, "YK.ed.w.boxMat=this.value", 'placeholder="박스/스티로폼/팩"') + '</label><label>비고' + _ykIn(w.note, "YK.ed.w.note=this.value") + '</label></div>';
  var rt = _ykRate(w), st0 = _ykSet().rate, same = rt.굴비 === _bsN(st0.굴비) && rt.부세 === _bsN(st0.부세);
  h += '<div style="margin-top:8px;font-size:13px;background:' + (same ? "#f8fafc" : "#fff7ed") + ';border:1px solid ' + (same ? "#e2e8f0" : "#fdba74") + ';border-radius:8px;padding:6px 10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center"><b>이 작업 엮거리 단가 (두름당)</b> 굴비 <input type="number" value="' + rt.굴비 + '" oninput="YK.ed.w.rate=YK.ed.w.rate||{};YK.ed.w.rate.굴비=this.value;_ykRecalc()" style="width:80px;padding:4px;border:1px solid #cbd5e1;border-radius:5px"> 부세 <input type="number" value="' + rt.부세 + '" oninput="YK.ed.w.rate=YK.ed.w.rate||{};YK.ed.w.rate.부세=this.value;_ykRecalc()" style="width:80px;padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + (same ? '<span class="mut" style="font-size:12px">— 지금 설정 단가와 같아요. 저장하면 이 단가로 고정돼서 나중에 설정을 올려도 이 작업은 안 바뀌어요</span>' : '<span style="font-size:12px;color:#c2410c;font-weight:700">— 지금 설정 단가(굴비 ' + _ykWon(st0.굴비) + ' · 부세 ' + _ykWon(st0.부세) + ')와 달라요</span> ' + _bsB("#ea580c", "지금 단가로 바꾸기", "YK.ed.w.rate=JSON.parse(JSON.stringify(_ykSet().rate));draw()", "padding:3px 9px")) + '</div>';
  h += '<div style="font-weight:800;margin:10px 0 4px">🐟 원료 <span class="mut" style="font-weight:400;font-size:12px">— 짝 수와 짝당 가격 (비우면 설정의 원료값)</span></div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f8fafc"><th style="text-align:left;padding:4px">원료명</th><th style="width:90px">짝 수</th><th style="width:130px">짝당 가격</th><th style="width:90px;text-align:right">마리수</th><th style="width:90px;text-align:right">kg</th><th style="width:120px;text-align:right">원료 금액</th><th style="width:36px"></th></tr>';
  w.mats.forEach(function(m, i){ var M = _ykMat(m.nm) || {};
    h += '<tr><td style="padding:3px">' + _ykPick("mat", i, m.nm) + '</td><td style="padding:3px">' + _ykIn(m.qty, "YK.ed.w.mats[" + i + "].qty=this.value;_ykRecalc()", 'type="number" step="any"') + '</td><td style="padding:3px">' + _ykIn(m.price, "YK.ed.w.mats[" + i + "].price=this.value;_ykRecalc()", 'type="number" placeholder="' + (M.price ? _ykWon(M.price) : "짝당") + '"') + '</td>';
    h += '<td id="ykMm' + i + '" style="text-align:right;padding:3px"></td><td id="ykMk' + i + '" style="text-align:right;padding:3px"></td><td id="ykMc' + i + '" style="text-align:right;padding:3px;font-weight:700"></td><td><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="YK.ed.w.mats.splice(' + i + ',1);draw()">✕</button></td></tr>'; });
  h += '</table>' + _bsB("#b45309", "+ 원료 줄", "YK.ed.w.mats.push({nm:'',qty:'',price:''});draw()", "padding:4px 10px;margin-top:4px") + ' ' + _bsB("#475569", "↩ 원료·품명 지난 작업 그대로", "ykLastNames()", "padding:4px 10px;margin-top:4px") + '</div>';
  // 이모 × 품명 표
  h += '<div class="card" style="margin-bottom:10px;padding:10px 0 0"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:0 12px 8px"><b>👵 이모들 × 품명 (두름)</b><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><select onchange="ykAddWorker(this)" style="min-width:150px;padding:7px 8px;font-size:14px;font-weight:700;border:2px solid #0e7490;border-radius:8px;background:#ecfeff;color:#0e7490;cursor:pointer"><option value="">👵 이모 넣기 ▾</option>' + people.map(function(n){ return '<option value="' + esc(n) + '">' + ((S.people[n] || {}).on !== false ? "📌 " : "") + esc(n) + '</option>'; }).join("") + '<option value="__new">➕ 새 이모 추가…</option></select>' + _bsB("#7c3aed", "📌 고정 이모로", "ykWsSet('fix')", "padding:5px 10px") + _bsB("#475569", "↩ 지난 작업 이모", "ykWsSet('last')", "padding:5px 10px") + '</div></div>';
  h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;min-width:100%"><thead><tr style="background:#fff7ed"><th style="padding:5px;text-align:left;min-width:120px;position:sticky;left:0;background:#fff7ed;z-index:1">품명</th><th style="padding:5px">굴비/부세</th>';
  w.ws.forEach(function(n, j){ h += '<th style="padding:5px;min-width:70px;white-space:nowrap">' + esc(n) + ' <a href="javascript:void 0" onclick="ykDelWorker(' + j + ')" style="color:#dc2626;text-decoration:none">✕</a></th>'; });
  h += '<th style="padding:5px;background:#fde68a">합계</th><th style="padding:5px">마리수</th><th style="padding:5px">박스</th><th style="padding:5px">잔량</th><th></th></tr></thead><tbody>';
  w.rows.forEach(function(r, i){
    h += '<tr><td style="padding:3px;position:sticky;left:0;background:#fff;z-index:1">' + _ykPick("item", i, r.item) + '</td>';
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
function ykAddWorker(el){ var n = (el.value || "").trim(); el.value = ""; if(!n) return; if(n === "__new"){ n = (prompt("새 이모 이름 (별명)") || "").trim(); if(!n) return; } if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); if(YK.ed.w.ws.indexOf(n) >= 0) return toast("이미 있어요", true); YK.ed.w.ws.push(n); draw(); }
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
  w.rate = _ykRate(w);
  w.mats = w.mats.filter(function(m){ return String(m.nm).trim() || _bsN(m.qty); }).map(function(m){ return { nm: String(m.nm).trim(), qty: _bsN(m.qty), price: m.price === "" || m.price == null ? "" : _bsN(m.price) }; });
  w.rows = w.rows.filter(function(r){ return String(r.item).trim() || Object.keys(r.c || {}).length; }).map(function(r){ return { item: String(r.item).trim(), kind: r.kind || "굴비", c: r.c || {} }; });
  if(w.rows.some(function(r){ return !r.item; })) return toast("품명이 빈 줄이 있어요", true);
  if(_ykUnregPop(w)) return;
  w.upAt = new Date().toISOString(); w.upBy = CID || "";
  var ref = E.id ? _ykRef("works/" + E.id) : _ykRef("works").push(), key = E.id || ref.key, up = {}; up["works/" + key] = w;
  w.ws.forEach(function(n){ if(!((_ykS().people || {})[n])) up["people/" + n] = { on: false }; });
  showLoading("저장 중...");
  _ykRef().update(_bsClean ? _bsClean(up) : up).then(function(){ hideLoading(); YK.D.works = YK.D.works || {}; YK.D.works[key] = w; YK.D.people = YK.D.people || {}; Object.keys(up).forEach(function(p){ var a = p.split("/"); if(a[0] === "people") YK.D.people[a[1]] = up[p]; }); YK.ed.id = key; toast("저장했어요 — " + _ykLot(w.dt)); draw(); })
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
function _ykPerTxt(f, t){ return (f ? _bsDH(f) : "처음") + " ~ " + (t ? _bsDH(t) : "지금"); }
function _ykPerBar(f, t){
  var S = _ykS(), ys = {}, y0 = _bsToday().slice(0, 4), m0 = _bsToday().slice(0, 7);
  Object.keys(S.works || {}).forEach(function(id){ var d = String(S.works[id].dt || ""); if(d) ys[d.slice(0, 4)] = 1; }); ys[y0] = 1;
  var B = function(lb, a, b){ var on = (a || "") === f && (b || "") === t; return '<button class="btn" style="padding:5px 11px;font-size:12.5px;background:' + (on ? "#ea580c" : "#fff") + ';color:' + (on ? "#fff" : "#9a3412") + ';border:1px solid #fdba74" onclick="ykPer(\'' + (a || "") + '\',\'' + (b || "") + '\')">' + lb + '</button>'; };
  var h = '<div class="card" style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:13px"><b>📅 기간</b>' + B("전체", "", "");
  Object.keys(ys).sort().reverse().forEach(function(y){ h += B(y + "년", y + "-01-01", y + "-12-31"); });
  var lm = new Date(m0 + "-01T00:00:00"); lm.setMonth(lm.getMonth() - 1); var pm = lm.getFullYear() + "-" + ("0" + (lm.getMonth() + 1)).slice(-2);
  h += B("이번 달", m0 + "-01", m0 + "-31") + B("지난 달", pm + "-01", pm + "-31");
  h += '<span style="margin-left:6px">직접:</span><input id="yk_pf" type="date" value="' + esc(f) + '" onchange="ykPer(this.value,document.getElementById(\'yk_pt\').value)" style="width:150px;display:inline-block;padding:5px;border:1px solid #cbd5e1;border-radius:6px"> ~ <input id="yk_pt" type="date" value="' + esc(t) + '" onchange="ykPer(document.getElementById(\'yk_pf\').value,this.value)" style="width:150px;display:inline-block;padding:5px;border:1px solid #cbd5e1;border-radius:6px">';
  return h + '<span class="mut" style="font-size:12px;width:100%">' + (CTAB === "ykCost" ? '작업 날짜 기준으로 그 기간 작업들을 모아 품명별 평균을 내요 (두름 많이 한 작업일수록 더 크게 반영).' : '작업 날짜 기준으로 그 기간 엮은 두름·번 돈을 모아요. 지급도 그 기간에 준 것만 빼요.') + '</span></div>';
}
// ════════ 📊 품명별 평균 원가표 (기간) ════════
//   작업마다 총원가를 품명별 마리수 비율로 나눈 값(_ykCalc 의 alloc)을 기간 동안 더해서 ÷ 두름 = 가중 평균 원가
function _ykCostAgg(f, t){
  var S = _ykS(), m = {}, n = 0;
  Object.keys(S.works || {}).forEach(function(id){ var w = S.works[id]; if(!_ykInPer(w.dt, f, t)) return; var c = _ykCalc(w); if(!c.doo) return; n++;
    c.rows.forEach(function(x){ if(!x.doo) return; var k = x.item || "(품명 없음)", g = m[k] || (m[k] = { item: k, kind: x.kind, I: x.I, works: 0, doo: 0, mi: 0, boxes: 0, cost: 0, mat: 0, weave: 0, lo: null, hi: null, last: "", lastU: 0 });
      var share = c.mi ? x.mi / c.mi : 0, mat = c.cost.mat * share, wv = x.doo * _bsN(_ykRate(w)[x.kind || "굴비"]);
      g.works++; g.doo += x.doo; g.mi += x.mi; g.boxes += x.boxes; g.cost += x.alloc; g.mat += mat; g.weave += wv;
      if(g.lo == null || x.unit < g.lo) g.lo = x.unit; if(g.hi == null || x.unit > g.hi) g.hi = x.unit; if(w.dt >= g.last){ g.last = w.dt; g.lastU = x.unit; } }); });
  return { n: n, list: Object.keys(m).map(function(k){ var g = m[k]; g.avg = g.doo ? g.cost / g.doo : 0; g.matU = g.doo ? g.mat / g.doo : 0; g.weaveU = g.doo ? g.weave / g.doo : 0; g.etcU = g.avg - g.matU - g.weaveU; g.whole = _bsN(g.I.whole); g.sale = _bsN(g.I.sale); g.tbl = _bsN(g.I.cost); g.mr = g.whole ? (g.whole - g.avg) / g.whole : null; return g; })
    .sort(function(a, b){ return b.doo - a.doo; }) };
}
function _ykCostTable(A, pr){
  var td = 'style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right"', P = function(v){ return v == null ? "-" : '<b style="color:' + (v < 0 ? "#dc2626" : v < 0.15 ? "#ea580c" : "#16a34a") + '">' + (Math.round(v * 1000) / 10) + '%</b>'; };
  var h = '<table class="ct" style="width:100%;border-collapse:collapse;font-size:13px;min-width:1100px"><thead><tr style="background:#fff7ed">';
  ["품명", "구분", "작업", "두름", "박스", "원물값 /두름", "엮거리 /두름", "그 밖 /두름", "평균 원가 /두름", "낮음 ~ 높음", "최근", "원가표", "도매가", "마진율 (도매)", "판매가"].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #fed7aa;white-space:nowrap;text-align:' + (i >= 2 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!A.list.length) h += '<tr><td colspan="15" style="padding:30px;text-align:center;color:#94a3b8">이 기간에 작업이 없어요</td></tr>';
  var T = { doo: 0, boxes: 0, cost: 0, mat: 0, weave: 0, whole: 0, wc: 0 };
  A.list.forEach(function(g){ T.doo += g.doo; T.boxes += g.boxes; T.cost += g.cost; T.mat += g.mat; T.weave += g.weave; T.whole += g.doo * g.whole; if(g.whole) T.wc += g.cost;
    var dif = g.tbl ? g.avg - g.tbl : 0;
    h += '<tr><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800;white-space:nowrap">' + esc(g.item) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + esc(g.kind) + '</td><td ' + td + '>' + g.works + '번</td><td ' + td + '><b>' + _bsW(g.doo) + '</b></td><td ' + td + '>' + _bsW(g.boxes) + '</td>';
    h += '<td ' + td + '>' + _ykWon(g.matU) + '</td><td ' + td + '>' + _ykWon(g.weaveU) + '</td><td ' + td + '>' + _ykWon(g.etcU) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;font-size:14.5px;background:#fffbeb">' + _ykWon(g.avg) + '</td>';
    h += '<td ' + td + '><span style="font-size:12px;color:#475569">' + (g.works > 1 ? _ykWon(g.lo) + ' ~ ' + _ykWon(g.hi) : '-') + '</span></td><td ' + td + '><span style="font-size:12px">' + _ykWon(g.lastU) + '<br><span style="color:#94a3b8">' + _bsMD(g.last) + '</span></span></td>';
    h += '<td ' + td + '>' + (g.tbl ? _ykWon(g.tbl) + (dif ? '<br><span style="font-size:11.5px;color:' + (dif > 0 ? "#dc2626" : "#16a34a") + '">' + (dif > 0 ? "▲ " : "▼ ") + _ykWon(Math.abs(dif)) + '</span>' : '') : '-') + '</td><td ' + td + '>' + (g.whole ? _ykWon(g.whole) : '-') + '</td><td ' + td + '>' + P(g.mr) + '</td><td ' + td + '>' + (g.sale ? _ykWon(g.sale) : '-') + '</td></tr>'; });
  if(A.list.length > 1) h += '<tr style="background:#fff7ed;font-weight:800"><td style="padding:6px" colspan="3">전체</td><td style="padding:6px;text-align:right">' + _bsW(T.doo) + '</td><td style="padding:6px;text-align:right">' + _bsW(T.boxes) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.mat / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.weave / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? (T.cost - T.mat - T.weave) / T.doo : 0) + '</td><td style="padding:6px;text-align:right">' + _ykWon(T.doo ? T.cost / T.doo : 0) + '</td><td colspan="4" style="padding:6px;text-align:right;font-size:12px">총원가 ' + _ykWon(T.cost) + '원' + (T.whole ? ' · 도매 마진 ' + P((T.whole - T.wc) / T.whole) + (T.wc < T.cost ? ' <span style="font-weight:400">(도매가 있는 품명만)</span>' : '') : '') + '</td><td></td></tr>';
  return h + '</tbody></table>';
}
function dYkCost(){
  var g = _ykGate(); if(g) return g;
  var f = YK.pf || "", t = YK.pt || "", A = _ykCostAgg(f, t);
  var h = _ykHead("📊 품명별 평균 원가표", "작업한 것들로 품명마다 두름당 원가 평균 · 원물값 따로", _bsB("#475569", "🖨 인쇄", "ykPrintCost()", "padding:8px 16px"));
  h += _ykPerBar(f, t);
  h += '<div class="card" style="margin-bottom:10px;font-size:13.5px"><b>' + _ykPerTxt(f, t) + '</b> · 작업 ' + A.n + '번 · 품명 ' + A.list.length + '개 <span class="mut" style="font-size:12px">— 한 작업의 총원가(원료·엮거리·인건비·끈·소금·냉동·포장·잡비)를 품명별 마리수 비율로 나눠서 더함. 원가표 칸의 ▲는 실제 평균이 원가표보다 비쌈</span></div>';
  return h + '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto">' + _ykCostTable(A) + '</div></div>';
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
  var h = _ykHead("⚙️ 엮거리 설정", "원가 단가 · 정품 · 원료 · 이모 명단 · 라벨 모양", can ? _bsB("#7c3aed", "🏷 라벨 모양 고치기", "ykLblEdit()", "padding:9px 14px") + " " + _bsB("#16a34a", "💾 원가 설정 저장", "ykSetSave()", "padding:9px 18px") : "");
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
  h += '<div class="card" style="margin-bottom:10px"><b>👵 이모 명단</b> <span class="mut" style="font-size:12px">— <b style="color:#7c3aed">체크 = 📌 고정</b>: 새 작업을 만들면 체크한 이모가 저절로 들어가요 · 작업 표에 처음 넣은 이모는 명단에만 추가돼요(고정 안 됨)</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
  pe.forEach(function(n){ var on = S.people[n].on !== false; h += '<label style="border:1px solid ' + (on ? "#b45309" : "#cbd5e1") + ';background:' + (on ? "#fff7ed" : "#f1f5f9") + ';border-radius:14px;padding:3px 10px;font-size:13px;cursor:pointer"><input type="checkbox" ' + (on ? "checked" : "") + (can ? '' : ' disabled') + ' onchange="ykPerson(\'' + esc(n) + '\',this.checked)"> ' + esc(n) + '</label>'; });
  h += (can ? '<input id="ykNewP" placeholder="이름" style="width:90px;padding:4px;border:1px solid #cbd5e1;border-radius:5px">' + _bsB("#b45309", "+", "var v=document.getElementById('ykNewP').value.trim();if(v)ykPerson(v,true)", "padding:3px 10px") : "") + '</div>' + _ykInfoBox() + '</div>';
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
function ykPerson(n, on){ if(/[.#$\[\]\/]/.test(n)) return toast("이름에 . # $ [ ] / 는 못 써요", true); _ykRef("people/" + n).set({ on: !!on }).then(function(){ YK.D.people = YK.D.people || {}; YK.D.people[n] = { on: !!on }; draw(); }); }
function ykItemEdit(k, pre){
  var x = k ? _ykS().items[k] : { nm: pre || "", box: 10, mi: 10, sale: "", whole: "", cost: "", wt: "", color: "", noLbl: false, under: "", code: "", msg: "" };
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
  _ykRef().update(up).then(function(){ YK.D.items = YK.D.items || {}; if(k && k !== key) delete YK.D.items[k]; YK.D.items[key] = v; closePopup(); toast("저장 — " + v.nm); _ykAfter("item", v.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// ── 품명·원료 고르기: 정품표·원료표 순서 그대로 · 등록 안 된 이름은 빨갛게 + 바로 추가 ──
function _ykItemKeys(){ var I = _ykS().items || {}; return Object.keys(I).sort(function(a, b){ return String(I[a].code || "z").localeCompare(String(I[b].code || "z")) || a.localeCompare(b); }); }
function _ykMatKeys(){ return Object.keys(_ykS().mats || {}).sort(); }
function _ykPick(t, i, v){
  var isI = t === "item", L = isI ? _ykItemKeys() : _ykMatKeys(), T = isI ? _ykS().items || {} : _ykS().mats || {}, ok = !v || !!(isI ? _ykItem(v) : _ykMat(v));
  var h = '<div style="display:flex;gap:4px;align-items:center"><select onchange="_ykPicked(\'' + t + '\',' + i + ',this)" style="flex:1;min-width:' + (isI ? 140 : 160) + 'px;padding:7px 8px;font-size:14px;font-weight:700;border:2px solid ' + (ok ? (v ? "#b45309" : "#cbd5e1") : "#dc2626") + ';border-radius:8px;background:' + (ok ? (v ? "#fff7ed" : "#fff") : "#fef2f2") + ';color:' + (ok ? "#111" : "#b91c1c") + ';cursor:pointer">';
  h += '<option value="">' + (isI ? "— 품명 고르기 —" : "— 원료 고르기 —") + '</option>';
  if(!ok) h += '<option value="' + esc(v) + '" selected>⚠ ' + esc(v) + ' (등록 안 됨)</option>';
  L.forEach(function(k){ var x = T[k], nm = x.nm || k, lb = isI ? nm + (x.mi ? " · " + x.mi + "미" : "") + (x.box ? " · " + x.box + "두름/박스" : "") : nm + (x.mi ? " · " + x.mi + "마리/짝" : ""); h += '<option value="' + esc(nm) + '"' + (ok && nm === v ? " selected" : "") + '>' + esc(lb) + '</option>'; });
  h += '<option value="__new">➕ 새 ' + (isI ? "품명" : "원료") + ' 추가…</option></select>';
  h += '<button class="btn" title="새 ' + (isI ? "품명" : "원료") + ' 추가" style="background:#16a34a;color:#fff;padding:5px 9px;font-weight:900" onclick="_ykAddNew(\'' + t + '\',' + i + ',\'' + (ok ? "" : esc(v)) + '\')">+</button></div>';
  return h;
}
function _ykPicked(t, i, el){
  if(el.value === "__new"){ var cur = t === "item" ? YK.ed.w.rows[i].item : YK.ed.w.mats[i].nm; el.value = cur || ""; return _ykAddNew(t, i, ""); }
  if(t === "item") YK.ed.w.rows[i].item = el.value; else YK.ed.w.mats[i].nm = el.value;
  draw();
}
function _ykAddNew(t, i, pre){ YK.after = { t: t, i: i }; if(t === "item") ykItemEdit("", pre); else ykMatEdit("", pre); }
function _ykAfter(t, nm){ var a = YK.after; YK.after = null; if(!a || a.t !== t || !YK.ed) return; if(t === "item" && YK.ed.w.rows[a.i]) YK.ed.w.rows[a.i].item = nm; if(t === "mat" && YK.ed.w.mats[a.i]) YK.ed.w.mats[a.i].nm = nm; }
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
  var x = k ? _ykS().mats[k] : { nm: pre || "", mi: "", kg: "", price: "" }, F = function(lb, f, t){ return '<label style="font-size:13px">' + lb + '<input id="ym_' + f + '" type="' + (t || "text") + '" value="' + esc(x[f] == null ? "" : x[f]) + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">🐟 ' + (k ? "원료 고치기" : "원료 추가") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + F("원료명", "nm") + F("짝당 마리수", "mi", "number") + F("짝당 무게 (kg)", "kg", "number") + F("짝당 값 (원)", "price", "number") + '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (k ? _bsB("#dc2626", "🗑 삭제", "ykMatDel('" + esc(k) + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "ykMatSave('" + esc(k || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 460);
}
function ykMatSave(k){
  var g = function(f){ return (document.getElementById("ym_" + f) || {}).value; }, v = { nm: (g("nm") || "").trim(), mi: _bsN(g("mi")), kg: _bsN(g("kg")), price: _bsN(g("price")) };
  if(!v.nm || !v.mi) return toast("원료명과 짝당 마리수를 넣어 주세요", true);
  var key = _ykKey(v.nm), up = {}; up["mats/" + key] = v; if(k && k !== key) up["mats/" + k] = null;
  _ykRef().update(up).then(function(){ YK.D.mats = YK.D.mats || {}; if(k && k !== key) delete YK.D.mats[k]; YK.D.mats[key] = v; closePopup(); toast("저장 — " + v.nm); _ykAfter("mat", v.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function ykMatDel(k){ if(!confirm(_ykS().mats[k].nm + " 원료를 지울까요?")) return; _ykRef("mats/" + k).remove().then(function(){ delete YK.D.mats[k]; closePopup(); draw(); }); }

// ════════ 🖨 인쇄: 전표 · 라벨 · 작업현황표 · 생산작업일지 ════════
function _ykWin(title, css, body){
  var w = window.open("", "_blank", "width=920,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111}table{border-collapse:collapse}.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}}' + css + '</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + body + '</body></html>');
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
// ── 라벨: 프리셋(모양) 마음대로 — 칸마다 위치·크기·글자 크기 바꾸기. 기본 = 예전 엑셀 라벨메일머지(품명 크게 · QR + 로트(색) (몇/총) · QR 내용) ──
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
      qtxt: { on: true, x: 9.5, y: 25.3, w: g.w - 10, fs: 6, b: false, al: "center" },
      bc: { on: false, x: 10, y: 18, w: 43, h: 6 },
      code: { on: false, x: 0, y: 25, w: g.w, fs: 7, b: false, al: "center" } } },
    roll: { nm: "60×30 라벨 프린터 (엑셀 모양)", paper: "roll", w: 60, h: 30, els: {
      nm: { on: true, x: 0, y: 0.5, w: 60, fs: 26, b: true, al: "center" },
      lot: { on: true, x: 11.5, y: 13.8, w: 48, fs: 10, b: true, al: "center" },
      qr: { on: true, x: 1, y: 13.6, s: 10 },
      qtxt: { on: true, x: 11.5, y: 20.5, w: 48, fs: 6.5, b: true, al: "center" },
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
    var css = '@page{size:A4;margin:0}body{' + PC + '}.sheet{width:210mm;height:297mm;padding:' + P.top + 'mm 0 0 ' + P.left + 'mm;display:grid;grid-template-columns:repeat(' + P.cols + ',' + P.w + 'mm);grid-auto-rows:' + P.h + 'mm;column-gap:' + P.gx + 'mm;row-gap:' + P.gy + 'mm;break-after:page;overflow:hidden;margin:0 auto;box-sizing:border-box}.sheet:last-child{break-after:auto}.cell{width:' + P.w + 'mm;height:' + P.h + 'mm;outline:1px dashed #bbb}@media screen{.sheet{box-shadow:0 0 0 1px #94a3b8;margin:10px auto}}@media print{.cell{outline:none}}';
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
  var css2 = '@page{size:' + P.w + 'mm ' + P.h + 'mm;margin:0}.pg{width:' + P.w + 'mm;height:' + P.h + 'mm;break-after:page;overflow:hidden}.pg:last-child{break-after:auto}@media screen{.pg{outline:1px dashed #999;margin:6px auto}}';
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
