// ============================================================================
// 🧪 원료수불부 · 생산일지 — 제품 배합표대로 생산하면 원료가 저절로 빠지고, 원료 입고 → 수불부(일자·입고·사용·현재고량)
//   /main/Raw = { mats:{원료:{nm,unit,note}}, recipes:{id:{nm,mode,items|base+adds,pack,life,off}}, inb:{id:{dt,mat,qty,from,note}},
//                 prods:{id:{dt,rid,nm,basis:{k,mat,val},base,total,lines:[{mat,qty,pct}],pack,units,worker,note}} }
//   배합표 두 가지
//     · 비율형(pct): 원료마다 총량 대비 % (합 100) — 고추장굴비·매실액기스.  기준 = 아무 원료 kg 또는 총 키로수
//     · 추가형(add): 기본 원료(갈치젓 20kg 통)에 통마다 더하는 kg — 갈치젓.  기준 = 통 수 · 기본 원료 kg · 총 키로수
//   autoIn: 'adds'(더하는 원료) · 'all'(모든 원료) 는 그날 사서 바로 씀 → 생산 때 입고=사용 같이 찍힘(prod.auto=[원료])
//   계산은 '기본 원료 1kg 당 배수(f)'로 하나로: 원료 kg = 기본 kg × f, 총량 = 기본 kg × Σf
//   날짜·숫자 도우미는 buse.js(_bsN·_bsW·_bsDH·_bsMD·_bsMS·_bsAdd·_bsToday·_bsB·_bsCan) 같이 씀
// ============================================================================
var RW = { D: null, loading: false, mat: "", ym: "", rsel: "" };
function _rwS(){ return RW.D || {}; }
function _rwRef(p){ return fbDb.ref("/main/Raw" + (p ? "/" + p : "")); }
function _rwKey(s){ return String(s || "").trim().replace(/[.#$\[\]\/]/g, "_"); }
function _rwCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _rwKg(n){ var v = Math.round(_bsN(n) * 1000) / 1000; return v.toLocaleString("ko-KR", { maximumFractionDigits: 3 }); }
function _rwLoad(){
  if(RW.loading) return; RW.loading = true;
  fbDb.ref("/main/Raw").once("value").then(function(s){ RW.loading = false; RW.D = s.val() || {}; if(/^rw/.test(CTAB)) draw(); })
    .catch(function(e){ RW.loading = false; toast("원료수불부 불러오기 실패: " + e.message, true); });
}
function _rwGate(){ if(!RW.D){ _rwLoad(); return '<div class="card"><div class="mut">📡 원료수불부 불러오는 중...</div></div>'; } return ""; }
function _rwRecipes(all){ var R = _rwS().recipes || {}; return Object.keys(R).filter(function(k){ return all || !R[k].off; }).sort(function(a, b){ return String(R[a].nm).localeCompare(String(R[b].nm)); }); }
function _rwMats(){ var m = {}, S = _rwS(); Object.keys(S.mats || {}).forEach(function(k){ m[k] = 1; }); Object.keys(S.recipes || {}).forEach(function(r){ _rwFac(S.recipes[r]).list.forEach(function(x){ m[x.mat] = 1; }); }); Object.keys(S.inb || {}).forEach(function(i){ m[S.inb[i].mat] = 1; }); return Object.keys(m).sort(); }

// ── 배합 계산 ──
function _rwFac(r){   // { base, unit, list:[{mat,f}], sum }
  r = r || {}; var list = [];
  if(r.mode === "add"){ var u = _bsN((r.base || {}).unit) || 1; if(r.base && r.base.mat) list.push({ mat: r.base.mat, f: 1 }); (r.adds || []).forEach(function(a){ if(a.mat) list.push({ mat: a.mat, f: _bsN(a.per) / u }); }); return { base: (r.base || {}).mat, unit: u, list: list, sum: list.reduce(function(s, x){ return s + x.f; }, 0) }; }
  var it = (r.items || []).filter(function(x){ return x.mat && _bsN(x.pct) > 0; }), p0 = it.length ? _bsN(it[0].pct) : 1;
  it.forEach(function(x){ list.push({ mat: x.mat, f: _bsN(x.pct) / p0 }); });
  return { base: it.length ? it[0].mat : "", unit: 0, list: list, sum: list.reduce(function(s, x){ return s + x.f; }, 0) };
}
function _rwAuto(r){ var F = _rwFac(r); return r.autoIn === "all" ? F.list.map(function(x){ return x.mat; }) : r.autoIn === "adds" ? F.list.slice(1).map(function(x){ return x.mat; }) : []; }
function _rwBases(r){   // 고를 수 있는 기준
  var F = _rwFac(r), b = [];
  if(r.mode === "add"){ b.push({ k: "tong", lb: "통 수 (" + F.base + " " + _rwKg(F.unit) + "kg 한 통)" }); b.push({ k: "mat", mat: F.base, lb: F.base + " kg" }); }
  else F.list.forEach(function(x, i){ b.push({ k: "mat", mat: x.mat, lb: x.mat + " kg" + (i === 0 ? " (주원료)" : "") }); });
  b.push({ k: "total", lb: "총 키로수 (만들 양)" });
  if(r.mode === "add") F.list.slice(1).forEach(function(x){ b.push({ k: "mat", mat: x.mat, lb: x.mat + " kg" }); });
  return b;
}
function _rwCalc(r, bs){   // bs = {k, mat, val} → {base, total, lines}
  var F = _rwFac(r), v = _bsN(bs.val), baseKg = 0;
  if(bs.k === "tong") baseKg = v * F.unit;
  else if(bs.k === "total") baseKg = F.sum ? v / F.sum : 0;
  else { var x = F.list.filter(function(y){ return y.mat === bs.mat; })[0]; baseKg = x && x.f ? v / x.f : 0; }
  var lines = F.list.map(function(y){ return { mat: y.mat, qty: Math.round(baseKg * y.f * 10000) / 10000, pct: F.sum ? y.f / F.sum : 0 }; });
  return { base: baseKg, total: lines.reduce(function(s, l){ return s + l.qty; }, 0), lines: lines };
}
// ── 원료 단가(원/kg): 원료에 적어 둔 값, 없으면 가장 최근 입고 단가 ──
function _rwPrice(mat){ var S = _rwS(), m = (S.mats || {})[mat] || {}; if(_bsN(m.price)) return _bsN(m.price); var best = null; Object.keys(S.inb || {}).forEach(function(i){ var x = S.inb[i]; if(x.mat === mat && _bsN(x.price) && (!best || String(x.dt) >= String(best.dt))) best = x; }); return best ? _bsN(best.price) : 0; }
// ── 완제품 원료 구성: 추가형은 기본 통 안의 원료%(base.comp)까지 풀어서 더함 → 원료별 kg · 총량 대비 % ──
function _rwComp(r, C){
  var m = {}, ord = [], add = function(mat, kg, src){ if(!mat || !kg) return; if(!m[mat]){ m[mat] = { mat: mat, kg: 0, src: {} }; ord.push(mat); } m[mat].kg += kg; m[mat].src[src] = 1; };
  var comp = r && r.mode === "add" ? ((r.base || {}).comp || []).filter(function(x){ return x.mat && _bsN(x.pct) > 0; }) : [], cs = comp.reduce(function(a, x){ return a + _bsN(x.pct); }, 0);
  (C.lines || []).forEach(function(l, i){
    if(i === 0 && comp.length){ comp.forEach(function(x){ add(x.mat, _bsN(l.qty) * _bsN(x.pct) / cs, "base"); }); }
    else add(l.mat, _bsN(l.qty), r && r.mode === "add" && i > 0 ? "add" : "base"); });
  var tot = ord.reduce(function(a, k){ return a + m[k].kg; }, 0);
  // compAll: % 가 더한 원료까지 다 섞은 완제품 기준(예전 엑셀 배합) → 총량 × % 그대로
  if(comp.length && r.base.compAll){ m = {}; ord = []; comp.forEach(function(x){ add(x.mat, tot * _bsN(x.pct) / cs, "all"); }); }
  return { all: !!(comp.length && r.base.compAll), has: comp.length > 0, compSum: cs, total: tot, lines: ord.map(function(k){ var x = m[k]; x.pct = tot ? x.kg / tot : 0; x.both = x.src.base && x.src.add; return x; }).sort(function(a, b){ return b.kg - a.kg; }) };
}
// ── 원가: 사 오는 원료(통·더하는 원료) kg × 단가 ──
function _rwCost(r, C){
  var lines = (C.lines || []).map(function(l){ var pr = _rwPrice(l.mat); return { mat: l.mat, qty: _bsN(l.qty), price: pr, amt: _bsN(l.qty) * pr }; });
  var tot = lines.reduce(function(a, x){ return a + x.amt; }, 0), miss = lines.filter(function(x){ return x.qty && !x.price; }).map(function(x){ return x.mat; });
  return { lines: lines, total: tot, perKg: C.total ? tot / C.total : 0, miss: miss };
}
function _rwWon(n){ return Math.round(_bsN(n)).toLocaleString("ko-KR"); }
function _rwCompHtml(r, C){
  var X = _rwComp(r, C), K = _rwCost(r, C), pack = _bsN(r.pack), F = _rwFac(r), tong = r.mode === "add" ? C.base / (F.unit || 1) : 0, h = "";
  if(r.mode === "add"){
    h += '<div style="margin-top:12px;font-weight:800;font-size:14px">🧾 완제품 원료 구성 <span class="mut" style="font-weight:400;font-size:12px">— ' + (X.all ? '총량 × 완제품 배합 % (더한 원료 포함된 %)' : X.has ? esc(F.base) + ' 통 안의 원료%까지 풀어서 계산' : '<span style="color:#c2410c">' + esc(F.base) + ' 통 안의 원료%를 배합표에 넣으면 풀어서 보여 줘요</span>') + '</span></div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px"><tr style="background:#fff7ed"><th style="padding:5px;text-align:left">원료</th><th style="text-align:right">kg</th><th style="text-align:right">완제품 대비 %</th><th style="text-align:left;padding-left:8px">어디서</th></tr>';
    X.lines.forEach(function(x){ h += '<tr><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(x.mat) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + _rwKg(x.kg) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:800;color:#c2410c">' + (Math.round(x.pct * 10000) / 100) + '%</td><td style="padding-left:8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + (X.all ? '완제품 배합 %' : x.both ? '통 + 더함' : x.src.add ? '우리가 더함' : X.has ? esc(F.base) + ' 통 안' : '사 온 통') + '</td></tr>'; });
    h += '<tr style="font-weight:900;background:#f1f5f9"><td style="padding:5px">합계</td><td style="text-align:right">' + _rwKg(X.total) + '</td><td style="text-align:right">100%</td><td></td></tr></table>';
    if(X.has && Math.abs(X.compSum - 1) > 0.0001) h += '<div style="font-size:12px;color:#dc2626;margin-top:3px">⚠ 통 안 원료% 합이 ' + Math.round(X.compSum * 100000) / 1000 + '% 예요 — 100% 로 맞춰서 나눴어요</div>';
  }
  h += '<div style="margin-top:12px;font-weight:800;font-size:14px">💰 원가 <span class="mut" style="font-weight:400;font-size:12px">— 원료 kg × 단가 (원료 재고 화면에서 단가를 넣어요)</span></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:4px"><tr style="background:#ecfdf5"><th style="padding:5px;text-align:left">원료</th><th style="text-align:right">kg</th><th style="text-align:right">kg당 단가</th><th style="text-align:right">금액 (원)</th></tr>';
  K.lines.forEach(function(x){ h += '<tr><td style="padding:4px 5px;border-bottom:1px solid #f1f5f9">' + esc(x.mat) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + _rwKg(x.qty) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;' + (x.price ? '' : 'color:#dc2626;font-weight:700') + '">' + (x.price ? _rwWon(x.price) : '단가 없음') + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:700">' + _rwWon(x.amt) + '</td></tr>'; });
  h += '<tr style="font-weight:900;background:#f1f5f9"><td style="padding:5px">원료비 합계</td><td style="text-align:right">' + _rwKg(C.total) + 'kg</td><td></td><td style="text-align:right;font-size:15px;color:#047857">' + _rwWon(K.total) + '원</td></tr></table>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;font-size:13px"><span style="background:#ecfdf5;border-radius:6px;padding:4px 9px">kg당 <b>' + _rwWon(K.perKg) + '원</b></span>' + (tong ? '<span style="background:#ecfdf5;border-radius:6px;padding:4px 9px">통당 <b>' + _rwWon(K.total / tong) + '원</b></span>' : '') + (pack ? '<span style="background:#ecfdf5;border-radius:6px;padding:4px 9px">' + pack + 'g 한 개당 <b>' + _rwWon(K.perKg * pack / 1000) + '원</b></span>' : '') + '</div>';
  if(K.miss.length) h += '<div style="font-size:12px;color:#dc2626;margin-top:4px">단가 없는 원료: ' + K.miss.map(esc).join(", ") + ' — 🚚 원료 재고에서 단가를 넣어 주세요 (빠진 만큼 원가가 적게 나와요)</div>';
  return h;
}
// ── 수불부: 원료마다 입고 + 생산 사용 ──
function _rwLedger(mat){
  var S = _rwS(), ev = [];
  Object.keys(S.inb || {}).forEach(function(i){ var x = S.inb[i]; if(!mat || x.mat === mat) ev.push({ id: i, t: "in", dt: x.dt, mat: x.mat, qty: _bsN(x.qty), note: [x.from, x.note].filter(function(y){ return y; }).join(" · ") }); });
  Object.keys(S.prods || {}).forEach(function(i){ var p = S.prods[i], au = p.auto || [];
    (p.lines || []).forEach(function(l){ if((!mat || l.mat === mat) && _bsN(l.qty)){
      if(au.indexOf(l.mat) >= 0) ev.push({ id: i, t: "in", auto: 1, dt: p.dt, mat: l.mat, qty: _bsN(l.qty), note: "생산 때 바로 사서 씀 (" + (p.nm || "") + ")" });
      ev.push({ id: i, t: "use", dt: p.dt, mat: l.mat, qty: _bsN(l.qty), note: p.nm || "" }); } }); });
  ev.sort(function(a, b){ return String(a.dt).localeCompare(String(b.dt)) || (a.t === b.t ? 0 : a.t === "in" ? -1 : 1); });
  var st = {}; ev.forEach(function(e){ st[e.mat] = (st[e.mat] || 0) + (e.t === "in" ? e.qty : -e.qty); e.stock = Math.round(st[e.mat] * 10000) / 10000; });
  return ev;
}
function _rwStockAt(mat, dt, skip){ var s = 0; _rwLedger(mat).forEach(function(e){ if(e.dt <= dt && !(e.t === "use" && e.id === skip)) s += e.t === "in" ? e.qty : -e.qty; }); return Math.round(s * 10000) / 10000; }
function _rwShort(){ var m = {}; _rwLedger().forEach(function(e){ if(e.t === "use" && e.stock < -0.0001){ (m[e.id] = m[e.id] || []).push({ mat: e.mat, short: Math.min(e.qty, -e.stock), dt: e.dt }); } }); return m; }
function _rwHead(t, sub){
  return '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><strong style="font-size:18px">' + t + '</strong> <span class="mut" style="font-size:12px;margin-left:6px">' + sub + '</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">' +
    (_rwCan() ? _bsB("#7c3aed", "🧪 생산 넣기", "rwProdEdit('')") + _bsB("#16a34a", "🚚 원료 입고", "rwInEdit('')") : "") + _bsB("#0e7490", "🖨 수불부 한번에", "rwPrintAllAsk()") + _bsB("#15803d", "📥 엑셀로 받기", "rwExcel()") + '</div></div></div>';
}

// ════════ 🧪 생산일지 ════════
function dRwProd(){
  var g = _rwGate(); if(g) return g;
  var S = _rwS(), P = S.prods || {}, ids = Object.keys(P).sort(function(a, b){ return String(P[b].dt).localeCompare(String(P[a].dt)) || String(b).localeCompare(String(a)); }), sh = _rwShort(), can = _rwCan();
  var yms = {}; ids.forEach(function(k){ yms[String(P[k].dt).slice(0, 7)] = 1; }); var ymL = Object.keys(yms).sort().reverse();
  if(RW.ym && !yms[RW.ym]) RW.ym = "";
  var list = ids.filter(function(k){ return (!RW.ym || String(P[k].dt).slice(0, 7) === RW.ym) && (!RW.rsel || P[k].nm === RW.rsel); });
  var h = _rwHead("🧪 생산일지", "제품과 기준(주원료 kg·총 키로수·통 수)만 넣으면 원료가 배합대로 빠져요");
  if(Object.keys(sh).length) h += '<div class="card" style="margin-bottom:10px;border:3px solid #dc2626;background:#fef2f2"><b style="color:#b91c1c;font-size:15px">🔴 원료가 모자란 생산 ' + Object.keys(sh).length + '건</b><div style="font-size:13px;line-height:1.8;margin-top:4px">' + Object.keys(sh).map(function(k){ return _bsDH(P[k].dt) + ' <b>' + esc(P[k].nm) + '</b> — ' + sh[k].map(function(x){ return esc(x.mat) + ' <b style="color:#dc2626">' + _rwKg(x.short) + 'kg 모자람</b>'; }).join(", "); }).join("<br>") + '</div><div style="font-size:12px;color:#7f1d1d">→ 원료 입고를 먼저 넣거나 생산량을 줄여 주세요</div></div>';
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b>보기</b><select onchange="RW.ym=this.value;draw()" style="width:auto;padding:6px;border:1px solid #cbd5e1;border-radius:6px"><option value="">전체 기간</option>' + ymL.map(function(y){ return '<option value="' + y + '"' + (RW.ym === y ? " selected" : "") + '>' + y.replace("-", "년 ") + '월</option>'; }).join("") + '</select>';
  var pn = {}; ids.forEach(function(k){ pn[P[k].nm] = 1; });
  h += '<select onchange="RW.rsel=this.value;draw()" style="width:auto;padding:6px;border:1px solid #cbd5e1;border-radius:6px"><option value="">모든 제품</option>' + Object.keys(pn).sort().map(function(n){ return '<option value="' + esc(n) + '"' + (RW.rsel === n ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("") + '</select>';
  h += '<span class="mut" style="font-size:12px">' + list.length + '건 · 총 ' + _rwKg(list.reduce(function(s, k){ return s + _bsN(P[k].total); }, 0)) + 'kg</span>' + (list.length ? '<span style="margin-left:auto">' + _bsB("#0e7490", "🖨 보이는 생산일지 모두 인쇄", "rwPrintProd(null)") + '</span>' : '') + '</div>';
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:900px"><thead><tr style="background:#f5f3ff">';
  ["생산일자", "제품", "기준", "총량", "원료 사용 (kg)", "가생산량", "작업자", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #ddd6fe;text-align:' + (i === 3 || i === 5 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  if(!list.length) h += '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8">생산 기록이 없어요' + (can ? ' — <b>🧪 생산 넣기</b>' : '') + '</td></tr>';
  list.forEach(function(k){ var p = P[k], b = p.basis || {}, bad = sh[k];
    h += '<tr style="' + (bad ? "background:#fee2e2;box-shadow:inset 4px 0 0 #dc2626" : "") + '"><td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsDH(p.dt) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(p.nm) + (p.old ? ' <span style="font-size:10.5px;color:#64748b;font-weight:400">(엑셀 기록)</span>' : '') + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12.5px;white-space:nowrap">' + (b.k === "tong" ? _rwKg(b.val) + '통' : b.k === "total" ? '총 ' + _rwKg(b.val) + 'kg' : esc(b.mat || "") + ' ' + _rwKg(b.val) + 'kg') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800">' + _rwKg(p.total) + 'kg</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px;line-height:1.6">' + (p.lines || []).map(function(l){ var s2 = bad && bad.filter(function(x){ return x.mat === l.mat; })[0]; return '<span style="white-space:nowrap;' + (s2 ? "color:#dc2626;font-weight:800" : "") + '">' + esc(l.mat) + ' ' + _rwKg(l.qty) + (s2 ? ' ⚠' : '') + '</span>'; }).join(" · ") + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap">' + (p.units ? _rwKg(p.units) + '개' : '-') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px">' + esc(p.worker || "") + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsB("#0e7490", "🖨", "rwPrintProd('" + k + "')", "padding:3px 8px") + (can ? " " + _bsB("#2563eb", "수정", "rwProdEdit('" + k + "')", "padding:3px 8px") : "") + '</td></tr>'; });
  return h + '</tbody></table></div></div>';
}
function rwProdEdit(id, pick){
  var S = _rwS(), p = id ? JSON.parse(JSON.stringify(S.prods[id])) : null, rl = _rwRecipes(!!id);
  if(!rl.length) return toast("배합표가 없어요 — 📋 배합표에서 제품을 먼저 만들어 주세요", true);
  var rid = p ? p.rid : pick && rl.indexOf(pick) >= 0 ? pick : rl[0], R = S.recipes || {};
  window._rwPE = { id: id || "", rid: rid, basis: p ? p.basis : null };
  var h = '<h3 style="margin:0 0 10px">🧪 ' + (id ? "생산 고치기" : "생산 넣기") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  if(p && p.old) h += '<div style="background:#f1f5f9;border-radius:6px;padding:6px 9px;font-size:12px;color:#475569;margin-bottom:8px">엑셀에서 가져온 기록이에요 — 고쳐서 저장하면 아래 배합 계산으로 바뀌어요</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:10px"><label style="font-size:13px">생산일자<input id="rp_dt" type="date" value="' + esc(p ? p.dt : _bsToday()) + '" onchange="_rwPCalc()" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-size:14px"></label>';
  h += '<label style="font-size:13px">제품<select id="rp_r" onchange="window._rwPE.rid=this.value;window._rwPE.basis=null;_rwPBasis();_rwPCalc()" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;font-weight:700">' + rl.map(function(k){ return '<option value="' + k + '"' + (k === rid ? " selected" : "") + '>' + esc(R[k].nm) + (R[k].off ? " (안 씀)" : "") + '</option>'; }).join("") + '</select></label></div>';
  if(!id) h += '<div style="font-size:12px;color:#475569;margin-top:6px">💡 수량만 넣어 보면 원료·%·원가가 바로 계산돼요 — 저장을 눌러야 원료가 빠져요</div>';
  h += '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:10px;margin-top:10px"><label style="font-size:13px">기준 <span class="mut" style="font-size:11px">— 이것만 넣으면 나머지는 배합대로</span><select id="rp_b" onchange="_rwPCalc()" style="width:100%;padding:7px;border:2px solid #7c3aed;border-radius:6px;font-size:14px"></select></label>';
  h += '<label style="font-size:13px">수량<input id="rp_v" type="number" inputmode="decimal" step="any" value="' + esc(p && p.basis ? p.basis.val : "") + '" oninput="_rwPCalc()" style="width:100%;padding:7px;border:2px solid #7c3aed;border-radius:6px;box-sizing:border-box;font-size:16px;font-weight:800"></label></div>';
  h += '<div id="rpCalc" style="margin-top:10px"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><label style="font-size:13px">작업자<input id="rp_w" value="' + esc(p ? p.worker || "" : "공장장 / 실장") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label><label style="font-size:13px">비고<input id="rp_n" value="' + esc(p ? p.note || "" : "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label></div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "rwProdDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장 (원료 빠짐)", "rwProdSave()", "padding:9px 22px;font-size:14px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 680); _rwPBasis(); _rwPCalc();
}
function _rwPBasis(){
  var E = window._rwPE, r = (_rwS().recipes || {})[E.rid], sel = document.getElementById("rp_b"); if(!r || !sel) return;
  var B = _rwBases(r), cur = E.basis;
  sel.innerHTML = B.map(function(b, i){ var on = cur ? (b.k === cur.k && (b.k !== "mat" || b.mat === cur.mat)) : i === 0; return '<option value="' + i + '"' + (on ? " selected" : "") + '>' + esc(b.lb) + '</option>'; }).join("");
}
function _rwPVal(){
  var E = window._rwPE, r = (_rwS().recipes || {})[E.rid], B = _rwBases(r), b = B[+((document.getElementById("rp_b") || {}).value || 0)] || B[0];
  return { r: r, bs: { k: b.k, mat: b.mat || "", val: _bsN((document.getElementById("rp_v") || {}).value) }, dt: (document.getElementById("rp_dt") || {}).value || "" };
}
function _rwPCalc(){
  var el = document.getElementById("rpCalc"); if(!el) return;
  var V = _rwPVal(), r = V.r; if(!r){ el.innerHTML = ""; return; }
  var C = _rwCalc(r, V.bs), short = 0, h = '<table style="width:100%;border-collapse:collapse;font-size:13.5px"><tr style="background:#f5f3ff"><th style="padding:6px;text-align:left">원료</th><th style="text-align:right">' + (r.mode === "add" ? '<span title="재고에서 빠지는 비율 — 완제품 배합 % 는 아래 완제품 원료 구성 표">통·더함 비율</span>' : '배합') + '</th><th style="text-align:right">투입량</th><th style="text-align:right">그날 재고</th><th style="text-align:right">쓰고 남음</th></tr>';
  var au = _rwAuto(r);
  C.lines.forEach(function(l){ var st = V.dt ? _rwStockAt(l.mat, V.dt, window._rwPE.id) : 0, left = st - l.qty, ai = au.indexOf(l.mat) >= 0, bad = !ai && V.bs.val && left < -0.0001; if(bad) short++;
    h += '<tr style="' + (bad ? "background:#fee2e2" : "") + '"><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9"><b>' + esc(l.mat) + '</b></td><td style="text-align:right;border-bottom:1px solid #f1f5f9;color:#475569">' + (Math.round(l.pct * 10000) / 100) + '%</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:800;font-size:15px">' + _rwKg(l.qty) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9">' + (ai ? '<span style="color:#0e7490;font-size:12px">바로 사서 씀</span>' : _rwKg(st)) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:800;color:' + (bad ? "#dc2626" : "#16a34a") + '">' + (ai ? '<span style="color:#0e7490">입고=사용</span>' : bad ? '⚠ ' + _rwKg(-left) + ' 모자람' : _rwKg(left)) + '</td></tr>'; });
  var pack = _bsN(r.pack), units = pack ? C.total * 1000 / pack : 0;
  h += '<tr style="background:#f1f5f9;font-weight:900"><td style="padding:6px">총량</td><td></td><td style="text-align:right;font-size:16px;color:#7c3aed">' + _rwKg(C.total) + 'kg</td><td colspan="2" style="text-align:right;font-size:12.5px;color:#475569">' + (pack ? '포장 ' + pack + 'g → 가생산량 <b>' + _rwKg(Math.floor(units)) + '개</b>' : '') + (r.mode === "add" ? ' · ' + _rwKg(C.base / (_rwFac(r).unit || 1)) + '통' : '') + '</td></tr></table>';
  if(short) h += '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:7px 10px;margin-top:6px;font-size:13px;color:#b91c1c;font-weight:800">🔴 원료 ' + short + '가지가 모자라요 — 원료 입고를 먼저 넣거나 양을 줄여 주세요 (저장은 돼요)</div>';
  if(V.bs.val) h += _rwCompHtml(r, C);
  el.innerHTML = h;
}
function rwProdSave(){
  var E = window._rwPE, V = _rwPVal(), r = V.r;
  if(!V.dt) return toast("생산일자를 골라 주세요", true);
  if(!(V.bs.val > 0)) return toast("수량을 넣어 주세요", true);
  var C = _rwCalc(r, V.bs), pack = _bsN(r.pack);
  var v = { dt: V.dt, rid: E.rid, nm: r.nm, basis: V.bs, auto: _rwAuto(r), base: Math.round(C.base * 10000) / 10000, total: Math.round(C.total * 10000) / 10000, lines: C.lines, pack: pack || "", units: pack ? Math.floor(C.total * 1000 / pack) : "", life: r.life || "",
    worker: (document.getElementById("rp_w") || {}).value || "", note: (document.getElementById("rp_n") || {}).value || "", upAt: new Date().toISOString(), upBy: CID || "" };
  var ref = E.id ? _rwRef("prods/" + E.id) : _rwRef("prods").push(), key = E.id || ref.key;
  showLoading("저장 중...");
  ref.set(v).then(function(){ hideLoading(); RW.D.prods = RW.D.prods || {}; RW.D.prods[key] = v; closePopup(); toast("생산 저장 — " + r.nm + " " + _rwKg(v.total) + "kg (원료 " + v.lines.length + "가지 빠짐)"); draw(); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
function rwProdDel(id){ var p = _rwS().prods[id]; if(!confirm(p.dt + " " + p.nm + " " + _rwKg(p.total) + "kg 생산을 지울까요?\n(빠졌던 원료가 다시 재고로 돌아가요)")) return; _rwRef("prods/" + id).remove().then(function(){ delete RW.D.prods[id]; closePopup(); toast("지웠어요"); draw(); }); }

// ════════ 🚚 원료 재고 · 수불부 ════════
function dRwStock(){
  var g = _rwGate(); if(g) return g;
  var S = _rwS(), mats = _rwMats(), L = _rwLedger(), can = _rwCan(), sum = {};
  mats.forEach(function(m){ sum[m] = { inq: 0, use: 0, last: "", stock: 0, prods: {} }; });
  L.forEach(function(e){ var x = sum[e.mat] || (sum[e.mat] = { inq: 0, use: 0, last: "", stock: 0, prods: {} }); if(e.t === "in"){ x.inq += e.qty; x.last = e.dt; } else { x.use += e.qty; x.prods[e.note] = 1; } x.stock = e.stock; });
  var h = _rwHead("🚚 원료 재고 · 수불부", "원료 입고 + 생산에서 쓴 양 → 현재고량");
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:720px"><thead><tr style="background:#ecfdf5">';
  ["원료", "현재고 (kg)", "입고 누계", "사용 누계", "kg당 단가", "마지막 입고", "쓰는 제품", ""].forEach(function(x, i){ h += '<th style="padding:7px 6px;border-bottom:2px solid #a7f3d0;text-align:' + (i >= 1 && i <= 4 ? "right" : "left") + '">' + x + '</th>'; });
  h += '</tr></thead><tbody>';
  Object.keys(sum).sort().forEach(function(m){ var x = sum[m], on = RW.mat === m;
    h += '<tr style="cursor:pointer;' + (on ? "background:#ecfdf5;" : x.stock < -0.0001 ? "background:#fee2e2;" : "") + '" onclick="RW.mat=(RW.mat===\'' + esc(m) + '\'?\'\':\'' + esc(m) + '\');draw()"><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + (on ? "▼ " : "▶ ") + esc(m) + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;font-size:14px;color:' + (x.stock < -0.0001 ? "#dc2626" : x.stock > 0 ? "#047857" : "#94a3b8") + '">' + (x.stock < -0.0001 ? '⚠ ' : '') + _rwKg(x.stock) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _rwKg(x.inq) + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _rwKg(x.use) + '</td>';
    var pr = _rwPrice(m); h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9;text-align:right;' + (pr ? '' : 'color:#cbd5e1') + '">' + (pr ? _rwWon(pr) + '원' : '-') + '</td>';
    h += '<td style="padding:6px;border-bottom:1px solid #f1f5f9">' + (x.last ? _bsDH(x.last) : '-') + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#475569">' + Object.keys(x.prods).map(esc).join(", ") + '</td><td style="padding:6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + (can ? _bsB("#16a34a", "+ 입고", "event.stopPropagation();rwInEdit('','" + esc(m) + "')", "padding:3px 8px") + ' ' + _bsB("#2563eb", "단가 수정", "event.stopPropagation();rwMatEdit('" + esc(m) + "')", "padding:3px 8px") : "") + '</td></tr>'; });
  h += '</tbody></table></div><div class="mut" style="font-size:12px;padding:6px 10px">원료 이름을 누르면 아래에 그 원료 수불부가 나와요</div></div>';
  if(RW.mat){
    var LL = L.filter(function(e){ return e.mat === RW.mat; });
    h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;padding:10px 12px"><b style="font-size:15px">📒 원료수불부 — ' + esc(RW.mat) + ' <span class="mut" style="font-size:12px">단위: kg</span></b><div style="display:flex;gap:6px">' + _bsB("#0e7490", "🖨 수불부 인쇄", "rwPrintLedger('" + esc(RW.mat) + "')") + (can ? _bsB("#16a34a", "+ 입고", "rwInEdit('','" + esc(RW.mat) + "')") : "") + '</div></div>';
    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px"><thead><tr style="background:#ecfdf5"><th style="padding:6px;text-align:left">일자</th><th style="text-align:right">입고</th><th style="text-align:right">사용(출고)</th><th style="text-align:right">현재고량</th><th style="text-align:left;padding-left:10px">비고 (구입처 · 생산제품)</th><th></th></tr></thead><tbody>';
    if(!LL.length) h += '<tr><td colspan="6" style="padding:20px;text-align:center;color:#94a3b8">기록 없음</td></tr>';
    LL.forEach(function(e){ var isIn = e.t === "in";
      h += '<tr style="background:' + (e.stock < -0.0001 ? "#fee2e2" : isIn ? "#f0fdf4" : "#fff") + '"><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + _bsDH(e.dt) + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;color:#16a34a;font-weight:700">' + (isIn ? _rwKg(e.qty) : '') + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;color:#7c3aed;font-weight:700">' + (!isIn ? _rwKg(e.qty) : '') + '</td><td style="text-align:right;border-bottom:1px solid #f1f5f9;font-weight:900;color:' + (e.stock < -0.0001 ? "#dc2626" : "") + '">' + _rwKg(e.stock) + '</td><td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12.5px;color:#475569">' + (isIn ? "🚚 " : "🧪 ") + esc(e.note) + '</td>';
      h += '<td style="border-bottom:1px solid #f1f5f9;white-space:nowrap">' + (can ? (isIn && !e.auto ? _bsB("#2563eb", "수정", "rwInEdit('" + e.id + "')", "padding:2px 8px") : _bsB("#7c3aed", "생산", "rwProdEdit('" + e.id + "')", "padding:2px 8px")) : "") + '</td></tr>'; });
    h += '</tbody></table></div></div>';
  }
  return h;
}
function rwMatEdit(m){
  var x = (_rwS().mats || {})[m] || { nm: m, unit: "kg" };
  var h = '<h3 style="margin:0 0 10px">💰 ' + esc(m) + ' 단가 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<label style="font-size:13px">kg당 단가 (원)<input id="rm_price" type="number" step="any" inputmode="decimal" value="' + esc(x.price || "") + '" placeholder="' + (_rwPrice(m) ? "최근 입고 " + _rwWon(_rwPrice(m)) : "") + '" style="width:100%;padding:8px;border:2px solid #16a34a;border-radius:6px;box-sizing:border-box;font-size:16px;font-weight:800"></label>';
  h += '<div class="mut" style="font-size:12px;margin-top:4px">통으로 사면 통값 ÷ 통 kg 으로 넣어요 (예: 20kg 통 10만원 → 5000). 비우면 가장 최근 입고 단가를 써요</div>';
  h += '<label style="font-size:13px;display:block;margin-top:8px">메모 (원산지·규격 등)<input id="rm_note" value="' + esc(x.note || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<div style="display:flex;justify-content:flex-end;margin-top:12px">' + _bsB("#16a34a", "💾 저장", "rwMatSave('" + esc(m) + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 420);
}
function rwMatSave(m){
  var x = JSON.parse(JSON.stringify((_rwS().mats || {})[m] || { nm: m, unit: "kg" })), pr = _bsN((document.getElementById("rm_price") || {}).value), nt = ((document.getElementById("rm_note") || {}).value || "").trim();
  if(pr) x.price = pr; else delete x.price; if(nt) x.note = nt; else delete x.note;
  _rwRef("mats/" + m).set(x).then(function(){ RW.D.mats = RW.D.mats || {}; RW.D.mats[m] = x; closePopup(); toast(m + " 단가 저장"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function rwInEdit(id, mat){
  var x = id ? _rwS().inb[id] : { dt: _bsToday(), mat: mat || "", qty: "", from: "", note: "" }, mats = _rwMats(), fr = {};
  Object.keys(_rwS().inb || {}).forEach(function(i){ var f = _rwS().inb[i].from; if(f) fr[f] = 1; });
  var F = function(lb, k, v, ex){ return '<label style="font-size:13px">' + lb + '<input id="ri_' + k + '" value="' + esc(v == null ? "" : v) + '" ' + (ex || "") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-size:14px"></label>'; };
  var h = '<h3 style="margin:0 0 10px">🚚 ' + (id ? "입고 고치기" : "원료 입고") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += F("입고일", "dt", x.dt, 'type="date"') + F("원료", "mat", x.mat, 'list="riMats" placeholder="예: 고추장"') + F("입고량 (kg)", "qty", x.qty, 'type="number" step="any" inputmode="decimal"') + F("구입처", "from", x.from || "", 'list="riFroms"') + F("kg당 단가 (원, 선택)", "price", x.price || "", 'type="number" step="any" inputmode="decimal" placeholder="넣으면 원료 단가도 바뀜"') + F("비고", "note", x.note || "") + '</div>';
  h += '<datalist id="riMats">' + mats.map(function(m){ return '<option value="' + esc(m) + '">'; }).join("") + '</datalist><datalist id="riFroms">' + Object.keys(fr).map(function(f){ return '<option value="' + esc(f) + '">'; }).join("") + '</datalist>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "rwInDel('" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "rwInSave('" + (id || "") + "')", "padding:9px 22px") + '</div>';
  openPopup(h, 520);
}
function rwInSave(id){
  var g = function(k){ return (document.getElementById("ri_" + k) || {}).value.trim(); }, v = { dt: g("dt"), mat: g("mat"), qty: _bsN(g("qty")), from: g("from"), note: g("note") }; if(_bsN(g("price"))) v.price = _bsN(g("price"));
  if(!v.dt || !v.mat || !(v.qty > 0)) return toast("입고일·원료·입고량을 넣어 주세요", true);
  if(/[.#$\[\]\/]/.test(v.mat)) return toast("원료 이름에 . # $ [ ] / 는 못 써요", true);
  var key = id || _rwRef("inb").push().key, up = {}; up["inb/" + key] = v; if(!((_rwS().mats || {})[v.mat])) up["mats/" + v.mat] = { nm: v.mat, unit: "kg" }; if(v.price){ var mm = JSON.parse(JSON.stringify(up["mats/" + v.mat] || (_rwS().mats || {})[v.mat])); mm.price = v.price; up["mats/" + v.mat] = mm; }
  _rwRef().update(up).then(function(){ RW.D.inb = RW.D.inb || {}; RW.D.inb[key] = v; RW.D.mats = RW.D.mats || {}; if(up["mats/" + v.mat]) RW.D.mats[v.mat] = up["mats/" + v.mat]; closePopup(); toast("입고 — " + v.mat + " " + _rwKg(v.qty) + "kg"); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function rwInDel(id){ if(!confirm("이 입고 기록을 지울까요?")) return; _rwRef("inb/" + id).remove().then(function(){ delete RW.D.inb[id]; closePopup(); toast("지웠어요"); draw(); }); }

// ════════ 📋 배합표 ════════
function dRwRecipe(){
  var g = _rwGate(); if(g) return g;
  var R = _rwS().recipes || {}, can = _rwCan(), h = '<div class="card" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><strong style="font-size:18px">📋 배합표</strong> <span class="mut" style="font-size:12px;margin-left:6px">제품마다 원료와 비율 — 생산 넣을 때 이대로 계산</span></div>' + (can ? _bsB("#7c3aed", "+ 제품 배합표 만들기", "rwRecipeEdit('')") : "") + '</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px">';
  _rwRecipes(true).forEach(function(k){ var r = R[k], F = _rwFac(r);
    h += '<div class="card" style="' + (r.off ? "opacity:.6;" : "") + 'border-top:4px solid ' + (r.mode === "add" ? "#ea580c" : "#7c3aed") + '"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">' + esc(r.nm) + '</b>' + (can ? _bsB("#2563eb", "수정", "rwRecipeEdit('" + k + "')", "padding:3px 9px") : "") + '</div>';
    h += '<div style="font-size:12px;color:#475569;margin:2px 0 6px">' + (r.mode === "add" ? '➕ 추가형 — ' + esc(F.base) + ' ' + _rwKg(F.unit) + 'kg 한 통에 더하기' : '% 비율형 — 총량 대비') + (r.off ? ' · <b>안 씀</b>' : '') + '</div><table style="width:100%;font-size:13px;border-collapse:collapse">';
    if(r.mode === "add"){ var cp = ((r.base || {}).comp || []); h += '<tr><td style="padding:2px 0"><b>' + esc(F.base) + '</b>' + (cp.length ? '<div style="font-size:11.5px;color:#64748b">통 안: ' + cp.map(function(x){ return esc(x.mat) + ' ' + Math.round(_bsN(x.pct) * 100000) / 1000 + '%'; }).join(" · ") + '</div>' : '<div style="font-size:11.5px;color:#c2410c">통 안 원료% 아직 없음</div>') + '</td><td style="text-align:right;vertical-align:top">' + _rwKg(F.unit) + 'kg (기본)</td></tr>'; (r.adds || []).forEach(function(a){ h += '<tr><td style="padding:2px 0">' + esc(a.mat) + '</td><td style="text-align:right">+' + _rwKg(a.per) + 'kg / 통</td></tr>'; }); }
    else (r.items || []).forEach(function(x, i){ h += '<tr><td style="padding:2px 0">' + (i === 0 ? '<b>' : '') + esc(x.mat) + (i === 0 ? '</b> <span style="font-size:11px;color:#7c3aed">주원료</span>' : '') + '</td><td style="text-align:right">' + (Math.round(_bsN(x.pct) * 100000) / 1000) + '%</td></tr>'; });
    h += '</table><div style="font-size:12px;color:#64748b;margin-top:6px">' + (r.autoIn === "adds" ? '<b style="color:#0e7490">더하는 원료는 그날 사서 바로 씀</b> · ' : r.autoIn === "all" ? '<b style="color:#0e7490">모든 원료 그날 사서 바로 씀</b> · ' : '') + (r.pack ? '포장 ' + r.pack + 'g · ' : '') + (r.life ? '유통기한 ' + esc(r.life) : '') + '</div>' + (!r.off && can ? '<div style="margin-top:8px">' + _bsB("#7c3aed", r.mode === "add" ? "🧮 통 수 넣고 계산 · 생산" : "🧮 계산 · 생산 넣기", "rwProdEdit('','" + k + "')", "padding:5px 12px;font-size:12.5px") + '</div>' : '') + '</div>'; });
  return h + '</div>';
}
function rwRecipeEdit(id){
  var r = id ? JSON.parse(JSON.stringify(_rwS().recipes[id])) : { nm: "", mode: "pct", items: [{ mat: "", pct: "" }], base: { mat: "", unit: 20 }, adds: [], pack: "", life: "작업일자로부터 1년", autoIn: "none" };
  r.items = r.items || []; r.adds = r.adds || []; r.base = r.base || { mat: "", unit: 20 };
  window._rwRE = { id: id || "", r: r }; _rwRecipeUI();
}
function _rwRecipeUI(){
  var E = window._rwRE, r = E.r, mats = _rwMats(), I = function(v, on, w, ex){ return '<input value="' + esc(v == null ? "" : v) + '" oninput="' + on + '" ' + (ex || "") + ' style="width:' + (w || "100%") + ';padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box">'; };
  var h = '<h3 style="margin:0 0 10px">📋 ' + (E.id ? "배합표 고치기" : "배합표 만들기") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<label style="font-size:13px">제품 이름' + I(r.nm, "window._rwRE.r.nm=this.value") + '</label>';
  h += '<div style="display:flex;gap:8px;margin:10px 0">' + [["pct", "% 비율형 (총량 대비 %, 합 100)"], ["add", "➕ 추가형 (기본 원료 한 통에 더하기)"]].map(function(o){ var on = r.mode === o[0]; return '<label style="flex:1;border:2px solid ' + (on ? "#7c3aed" : "#e5e7eb") + ';background:' + (on ? "#f5f3ff" : "#fff") + ';border-radius:8px;padding:8px;cursor:pointer;font-size:13px;font-weight:700"><input type="radio" name="rwm" ' + (on ? "checked" : "") + ' onchange="window._rwRE.r.mode=\'' + o[0] + '\';_rwRecipeUI()"> ' + o[1] + '</label>'; }).join("") + '</div>';
  if(r.mode === "add"){
    h += '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;font-size:13px"><label>기본 원료 (예: 갈치젓)' + I(r.base.mat, "window._rwRE.r.base.mat=this.value", "100%", 'list="reMats"') + '</label><label>한 통 kg' + I(r.base.unit, "window._rwRE.r.base.unit=this.value", "100%", 'type="number" step="any"') + '</label></div>';
    r.base.comp = r.base.comp || [];
    var cs = r.base.comp.reduce(function(a, x){ return a + _bsN(x.pct); }, 0);
    h += '<div style="font-size:13px;font-weight:700;margin:10px 0 4px">' + esc(r.base.mat || "기본 원료") + ' 한 통 안의 원료 % <span class="mut" style="font-weight:400;font-size:11.5px">— 사 오는 제품 표시사항(원재료명 및 함량)대로. 완제품 원료 구성·% 계산에 써요 (재고는 통째로 빠짐)</span></div>';
    r.base.comp.forEach(function(x, i){ h += '<div style="display:flex;gap:6px;margin-bottom:5px">' + I(x.mat, "window._rwRE.r.base.comp[" + i + "].mat=this.value", "60%", 'list="reMats" placeholder="원료 (예: 갈치)"') + I(x.pct === "" ? "" : Math.round(_bsN(x.pct) * 100000) / 1000, "window._rwRE.r.base.comp[" + i + "].pct=_bsN(this.value)/100;_rwCompSum()", "30%", 'type="number" step="any" placeholder="%"') + '<button class="btn" style="background:#dc2626;color:#fff" onclick="window._rwRE.r.base.comp.splice(' + i + ',1);_rwRecipeUI()">✕</button></div>'; });
    h += '<label style="display:block;font-size:12.5px;margin:2px 0 6px;color:#7c2d12"><input type="checkbox" ' + (r.base.compAll ? "checked" : "") + ' onchange="window._rwRE.r.base.compAll=this.checked"> 이 % 는 <b>더하는 원료까지 다 섞은 완제품</b> 기준 (예전 엑셀 배합처럼) → 총량에 % 를 그대로 곱해요</label>';
    h += _bsB("#b45309", "+ 통 안 원료 줄", "window._rwRE.r.base.comp.push({mat:'',pct:''});_rwRecipeUI()") + ' <span id="rwCSum" style="font-size:13px;font-weight:800;margin-left:8px;color:' + (!r.base.comp.length ? "#94a3b8" : Math.abs(cs - 1) < 0.0001 ? "#16a34a" : "#dc2626") + '">합 ' + Math.round(cs * 100000) / 1000 + '%</span>';
    h += '<div style="font-size:13px;font-weight:700;margin:12px 0 4px">한 통에 더하는 원료 (kg)</div>';
    r.adds.forEach(function(a, i){ h += '<div style="display:flex;gap:6px;margin-bottom:5px">' + I(a.mat, "window._rwRE.r.adds[" + i + "].mat=this.value", "60%", 'list="reMats" placeholder="원료"') + I(a.per, "window._rwRE.r.adds[" + i + "].per=this.value", "30%", 'type="number" step="any" placeholder="kg"') + '<button class="btn" style="background:#dc2626;color:#fff" onclick="window._rwRE.r.adds.splice(' + i + ',1);_rwRecipeUI()">✕</button></div>'; });
    h += _bsB("#ea580c", "+ 원료 줄", "window._rwRE.r.adds.push({mat:'',per:''});_rwRecipeUI()");
  } else {
    var sum = r.items.reduce(function(s, x){ return s + _bsN(x.pct); }, 0);
    h += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">원료와 배합비율 (%) <span class="mut" style="font-weight:400;font-size:12px">— 맨 위가 주원료</span></div>';
    r.items.forEach(function(x, i){ h += '<div style="display:flex;gap:6px;margin-bottom:5px">' + I(x.mat, "window._rwRE.r.items[" + i + "].mat=this.value", "60%", 'list="reMats" placeholder="원료"') + I(x.pct === "" ? "" : Math.round(_bsN(x.pct) * 100000) / 1000, "window._rwRE.r.items[" + i + "].pct=_bsN(this.value)/100;_rwSumShow()", "30%", 'type="number" step="any" placeholder="%"') + '<button class="btn" style="background:#dc2626;color:#fff" onclick="window._rwRE.r.items.splice(' + i + ',1);_rwRecipeUI()">✕</button></div>'; });
    h += _bsB("#7c3aed", "+ 원료 줄", "window._rwRE.r.items.push({mat:'',pct:''});_rwRecipeUI()") + ' <span id="rwSum" style="font-size:13px;font-weight:800;margin-left:8px;color:' + (Math.abs(sum - 1) < 0.0001 ? "#16a34a" : "#dc2626") + '">합 ' + Math.round(sum * 100000) / 1000 + '%</span>';
  }
  h += '<datalist id="reMats">' + mats.map(function(m){ return '<option value="' + esc(m) + '">'; }).join("") + '</datalist>';
  h += '<div style="display:grid;grid-template-columns:1fr 1.5fr;gap:8px;margin-top:12px;font-size:13px"><label>포장 단위 (g) <span class="mut" style="font-size:11px">가생산량 계산</span>' + I(r.pack, "window._rwRE.r.pack=this.value", "100%", 'type="number" step="any"') + '</label><label>유통기한' + I(r.life, "window._rwRE.r.life=this.value") + '</label></div>';
  h += '<div style="font-size:13px;margin-top:10px"><b>그날 사서 바로 쓰는 원료</b> <span class="mut" style="font-size:11.5px">— 생산 넣으면 수불부에 입고=사용 같이 찍혀요 (재고 안 셈)</span><div style="display:flex;gap:6px;margin-top:4px;flex-wrap:wrap">' + [["none", "없음 (재고에서 빠짐)"], ["adds", r.mode === "add" ? "더하는 원료만 (기본 원료는 재고)" : "주원료 빼고 나머지"], ["all", "모든 원료"]].map(function(o){ var on = (r.autoIn || "none") === o[0]; return '<label style="border:1px solid ' + (on ? "#0e7490" : "#cbd5e1") + ';background:' + (on ? "#ecfeff" : "#fff") + ';border-radius:14px;padding:3px 10px;cursor:pointer;font-size:12.5px"><input type="radio" name="rwai" ' + (on ? "checked" : "") + ' onchange="window._rwRE.r.autoIn=\'' + o[0] + '\'"> ' + o[1] + '</label>'; }).join("") + '</div></div>';
  h += '<label style="font-size:13px;display:block;margin-top:8px"><input type="checkbox" ' + (r.off ? "checked" : "") + ' onchange="window._rwRE.r.off=this.checked"> 안 씀 (생산 넣기 목록에서 숨김)</label>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (window._rwRE.id ? _bsB("#dc2626", "🗑 삭제", "rwRecipeDel()") : "<span></span>") + _bsB("#16a34a", "💾 저장", "rwRecipeSave()", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 560);
}
function _rwCompSum(){ var c = window._rwRE.r.base.comp || [], s = c.reduce(function(a, x){ return a + _bsN(x.pct); }, 0), el = document.getElementById("rwCSum"); if(el){ el.textContent = "합 " + Math.round(s * 100000) / 1000 + "%"; el.style.color = Math.abs(s - 1) < 0.0001 ? "#16a34a" : "#dc2626"; } }
function _rwSumShow(){ var r = window._rwRE.r, s = r.items.reduce(function(a, x){ return a + _bsN(x.pct); }, 0), el = document.getElementById("rwSum"); if(el){ el.textContent = "합 " + Math.round(s * 100000) / 1000 + "%"; el.style.color = Math.abs(s - 1) < 0.0001 ? "#16a34a" : "#dc2626"; } }
function rwRecipeSave(){
  var E = window._rwRE, r = JSON.parse(JSON.stringify(E.r));
  r.nm = String(r.nm || "").trim(); if(!r.nm) return toast("제품 이름을 넣어 주세요", true);
  var bad = function(m){ return /[.#$\[\]\/]/.test(m); };
  if(r.mode === "add"){ r.base.mat = String(r.base.mat || "").trim(); r.base.unit = _bsN(r.base.unit); if(!r.base.mat || !r.base.unit) return toast("기본 원료와 한 통 kg 을 넣어 주세요", true); r.adds = r.adds.filter(function(a){ return String(a.mat).trim() && _bsN(a.per) > 0; }).map(function(a){ return { mat: String(a.mat).trim(), per: _bsN(a.per) }; }); delete r.items;
    r.base.comp = (r.base.comp || []).filter(function(x){ return String(x.mat).trim() && _bsN(x.pct) > 0; }).map(function(x){ return { mat: String(x.mat).trim(), pct: Math.round(_bsN(x.pct) * 1000000) / 1000000 }; }); if(!r.base.comp.length) delete r.base.comp;
    var cs2 = (r.base.comp || []).reduce(function(a, x){ return a + x.pct; }, 0); if(r.base.comp && Math.abs(cs2 - 1) > 0.0001 && !confirm("통 안 원료% 합이 " + Math.round(cs2 * 100000) / 1000 + "% 예요 (100% 아님). 그래도 저장할까요?")) return; if(bad(r.base.mat) || r.adds.some(function(a){ return bad(a.mat); })) return toast("원료 이름에 . # $ [ ] / 는 못 써요", true); }
  else { r.items = r.items.filter(function(x){ return String(x.mat).trim() && _bsN(x.pct) > 0; }).map(function(x){ return { mat: String(x.mat).trim(), pct: Math.round(_bsN(x.pct) * 1000000) / 1000000 }; }); delete r.adds; delete r.base;
    var s = r.items.reduce(function(a, x){ return a + x.pct; }, 0); if(!r.items.length) return toast("원료를 넣어 주세요", true);
    if(r.items.some(function(x){ return bad(x.mat); })) return toast("원료 이름에 . # $ [ ] / 는 못 써요", true);
    if(Math.abs(s - 1) > 0.0001 && !confirm("배합비율 합이 " + Math.round(s * 100000) / 1000 + "% 예요 (100% 아님). 그래도 저장할까요?")) return; }
  r.pack = _bsN(r.pack) || ""; r.off = !!r.off; r.autoIn = r.autoIn || "none";
  var ref = E.id ? _rwRef("recipes/" + E.id) : _rwRef("recipes").push(), key = E.id || ref.key, up = {}; up["recipes/" + key] = r;
  _rwFac(r).list.forEach(function(x){ if(!((_rwS().mats || {})[x.mat])) up["mats/" + x.mat] = { nm: x.mat, unit: "kg" }; });
  if(r.base && r.base.comp && r.base.comp.some(function(x){ return /[.#$\[\]\/]/.test(x.mat); })) return toast("원료 이름에 . # $ [ ] / 는 못 써요", true);
  _rwRef().update(up).then(function(){ RW.D.recipes = RW.D.recipes || {}; RW.D.recipes[key] = r; RW.D.mats = RW.D.mats || {}; Object.keys(up).forEach(function(p){ var a = p.split("/"); if(a[0] === "mats") RW.D.mats[a[1]] = up[p]; }); closePopup(); toast("배합표 저장 — " + r.nm); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function rwRecipeDel(){ var E = window._rwRE, used = Object.keys(_rwS().prods || {}).some(function(k){ return _rwS().prods[k].rid === E.id; }); if(used) return toast("이 배합표로 넣은 생산이 있어서 못 지워요 — '안 씀'으로 해 주세요", true); if(!confirm(E.r.nm + " 배합표를 지울까요?")) return; _rwRef("recipes/" + E.id).remove().then(function(){ delete RW.D.recipes[E.id]; closePopup(); draw(); }); }

// ════════ 🖨 인쇄 · 📥 엑셀 ════════
function _rwWin(title, body){
  var w = window.open("", "_blank", "width=900,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111;font-size:12.5px}.pg{width:186mm;margin:0 auto;break-after:page}.pg:last-child{break-after:auto}h1{text-align:center;font-size:24px;letter-spacing:10px;margin:2mm 0 6mm}table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:5px 7px}th{background:#eef2f7}.r{text-align:right}.c{text-align:center}.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}.pg{width:auto}}</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + body + '</body></html>');
  w.document.close();
}
function rwPrintProd(id){
  var P = _rwS().prods || {}; rwPrintProdIds(id ? [id] : Object.keys(P).filter(function(k){ return (!RW.ym || String(P[k].dt).slice(0, 7) === RW.ym) && (!RW.rsel || P[k].nm === RW.rsel); }));
}
function rwPrintProdIds(ids, ret){
  var P = _rwS().prods || {}; ids = ids.slice().sort(function(a, b){ return String(P[a].dt).localeCompare(String(P[b].dt)); });
  var b = ids.map(function(k){ var p = P[k], tot = _bsN(p.total);
    var h = '<div class="pg"><h1>생 산 작 업 일 지</h1><table><tr><th style="width:18%">생산일자</th><td class="v" style="width:32%">' + _bsMD(p.dt) + '</td><th style="width:18%">제 품 명</th><td><b>' + esc(p.nm) + '</b></td></tr></table>';
    h += '<div style="margin:5mm 0 2mm;font-weight:800">원재료명 또는 성분 및 투입량 (kg)</div><table><tr><th>원재료명 또는 성분명</th><th style="width:20%">배합비율(%)</th><th style="width:22%">투입량(kg)</th><th style="width:18%">비고</th></tr>';
    var rr = (_rwS().recipes || {})[p.rid], X = rr && rr.mode === "add" ? _rwComp(rr, { lines: p.lines || [] }) : null;
    // 위 표 = 실제 넣은 것(사 온 통 + 더한 원료) — 원료수불부 사용량과 같아야 함. 완제품 배합 %는 아래 참고 표
    (p.lines || []).forEach(function(l){ var pc = l.pct != null && l.pct !== "" ? _bsN(l.pct) : (tot ? _bsN(l.qty) / tot : 0); h += '<tr><td>' + esc(l.mat) + '</td><td class="r">' + (Math.round(pc * 10000) / 100) + '</td><td class="r v">' + _rwKg(l.qty) + '</td><td></td></tr>'; });
    h += '<tr style="font-weight:800"><td class="c">합 계</td><td class="r">100</td><td class="r v">' + _rwKg(tot) + '</td><td></td></tr></table>';
    if(X && X.has){ h += '<div style="margin:5mm 0 2mm;font-weight:800">완제품 원재료 배합비율' + (X.all ? ' (참고 · 품목제조보고·표시사항용)' : ' (' + esc((rr.base || {}).mat || "") + ' 통 안 원료 포함)') + '</div><table><tr><th>원재료명</th><th style="width:20%">배합비율(%)</th><th style="width:22%">중량(kg)</th></tr>';
      X.lines.forEach(function(x){ h += '<tr><td>' + esc(x.mat) + '</td><td class="r">' + (Math.round(x.pct * 10000) / 100) + '</td><td class="r v">' + _rwKg(x.kg) + '</td></tr>'; });
      h += '<tr style="font-weight:800"><td class="c">합 계</td><td class="r">100</td><td class="r v">' + _rwKg(X.total) + '</td></tr></table>'; }
    h += '<table style="margin-top:5mm"><tr><th style="width:18%">기 타</th><td class="v" colspan="3" style="height:16mm;vertical-align:top">' + esc(p.note || "") + '</td></tr><tr><th>포장방법 및 단위</th><td style="width:32%">' + (p.pack ? p.pack + 'g' : '') + '</td><th style="width:18%">가생산량(개)</th><td class="v">' + (p.units ? _rwKg(p.units) : '') + '</td></tr><tr><th>작 업 자</th><td class="v">' + esc(p.worker || "") + '</td><th>유통기한</th><td>' + esc(p.life || ((_rwS().recipes || {})[p.rid] || {}).life || "") + '</td></tr></table></div>';
    return h; }).join("");
  if(ret) return b;
  if(!ids.length) return toast("인쇄할 생산이 없어요", true);
  _rwWin("생산작업일지", b);
}
function rwPrintLedger(mat){
  var L = _rwLedger(mat), b = '<div class="pg"><h1>원 료 수 불 부</h1><table style="margin-bottom:3mm"><tr><th style="width:18%">원 료 명</th><td><b>' + esc(mat) + '</b></td><th style="width:14%">단 위</th><td style="width:16%">kg</td></tr></table><table><tr><th style="width:18%">일 자</th><th>입 고</th><th>사용(출고)</th><th>현재고량</th><th style="width:30%">비고 (구입처 및 생산제품)</th></tr>';
  L.forEach(function(e){ b += '<tr><td class="c">' + _bsMD(e.dt) + '</td><td class="r">' + (e.t === "in" ? _rwKg(e.qty) : "") + '</td><td class="r">' + (e.t === "use" ? _rwKg(e.qty) : "") + '</td><td class="r"><b>' + _rwKg(e.stock) + '</b></td><td>' + esc(e.note) + '</td></tr>'; });
  for(var i = L.length; i < 25; i++) b += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
  _rwWin("원료수불부_" + mat, b + '</table></div>');
}
function rwPrintAllAsk(){
  var t = _bsToday(), h = '<h3 style="margin:0 0 10px">🖨 원료수불부 한번에 뽑기 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px">기간 <input id="rpa_f" type="date" value="' + t.slice(0, 4) + '-01-01" style="width:150px;padding:6px;border:1px solid #cbd5e1;border-radius:6px"> ~ <input id="rpa_t" type="date" value="' + t + '" style="width:150px;padding:6px;border:1px solid #cbd5e1;border-radius:6px"></div>';
  h += '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' + [["올해", t.slice(0, 4) + "-01-01", t], ["작년", (+t.slice(0, 4) - 1) + "-01-01", (+t.slice(0, 4) - 1) + "-12-31"], ["이번 달", t.slice(0, 7) + "-01", t], ["전체", "2000-01-01", t]].map(function(o){ return _bsB("#64748b", o[0], "document.getElementById('rpa_f').value='" + o[1] + "';document.getElementById('rpa_t').value='" + o[2] + "'", "padding:4px 10px"); }).join("") + '</div>';
  h += '<label style="display:block;margin-top:10px;font-size:13px"><input type="checkbox" id="rpa_p" checked> 생산작업일지도 같이 (그 기간 생산 전부)</label><label style="display:block;margin-top:4px;font-size:13px"><input type="checkbox" id="rpa_e"> 기록 없는 원료도 빈 장으로</label><div style="margin-top:8px;font-size:13px;font-weight:700;color:#7c2d12">✍ 손으로 쓸 서류면</div><select id="rpa_h" style="width:100%;padding:7px;border:2px solid #fdba74;border-radius:6px;font-size:13px;margin-top:3px"><option value="">전산 그대로 (값이 찍혀 나옴)</option><option value="pair">안내표 + 빈 양식 — 한 장씩 짝지어, 보고 옮겨 적기</option><option value="trace">연한 글씨 따라 쓰기 — 값이 연한 회색으로 찍힌 위에 덧쓰기</option></select>';
  h += '<div class="mut" style="font-size:12px;margin-top:6px">원료마다 한 장씩 — 맨 위에 기간 전 재고(전기 이월)를 적고 그 기간 입고·사용을 이어서 적어요</div>';
  h += '<div style="display:flex;justify-content:flex-end;margin-top:12px">' + _bsB("#0e7490", "🖨 뽑기", "rwPrintAll(document.getElementById('rpa_f').value,document.getElementById('rpa_t').value,document.getElementById('rpa_p').checked,document.getElementById('rpa_e').checked,document.getElementById('rpa_h').value)", "padding:9px 22px") + '</div>';
  openPopup(h, 480);
}
function _rwLedgerPage(mat, f, t){
  var L = _rwLedger(mat), open = 0, rows = L.filter(function(e){ if(f && e.dt < f){ open = e.stock; return false; } return !t || e.dt <= t; });
  var b = '<div class="pg"><h1>원 료 수 불 부</h1><table style="margin-bottom:3mm"><tr><th style="width:16%">원 료 명</th><td><b>' + esc(mat) + '</b></td><th style="width:12%">단 위</th><td style="width:10%">kg</td><th style="width:12%">기 간</th><td style="width:26%">' + _bsMD(f) + ' ~ ' + _bsMD(t) + '</td></tr></table><table><tr><th style="width:18%">일 자</th><th>입 고</th><th>사용(출고)</th><th>현재고량</th><th style="width:30%">비고 (구입처 및 생산제품)</th></tr>';
  if(f) b += '<tr style="background:#f8fafc"><td class="c v">' + _bsMD(f) + '</td><td></td><td></td><td class="r v"><b>' + _rwKg(open) + '</b></td><td class="v">전기 이월</td></tr>';
  rows.forEach(function(e){ b += '<tr><td class="c v">' + _bsMD(e.dt) + '</td><td class="r v">' + (e.t === "in" ? _rwKg(e.qty) : "") + '</td><td class="r v">' + (e.t === "use" ? _rwKg(e.qty) : "") + '</td><td class="r v"><b>' + _rwKg(e.stock) + '</b></td><td class="v">' + esc(e.note) + '</td></tr>'; });
  for(var i = rows.length; i < 24; i++) b += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
  return { html: b + '</table><table style="margin-top:4mm;width:60%;margin-left:auto"><tr><th>작성자</th><td style="height:12mm"></td><th>확인자</th><td></td></tr></table></div>', n: rows.length };
}
// 수기용: 장마다 [옮겨 적을 값 안내] + [값 칸이 빈 양식] 짝 — 값 칸(class v)만 비움, 칸·줄·제목은 그대로
var RW_HAND_CSS = '<style>.hand .v,.hand .v *{color:transparent!important}.gdb{border:2px dashed #7c2d12;background:#fff7ed;color:#7c2d12;font-weight:800;text-align:center;padding:2mm;margin-bottom:3mm;font-size:13px}.gd{opacity:.92}@media print{.gdb{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>';
function _rwHand(html){ return html.split('<div class="pg">').filter(function(x){ return x; }).map(function(x){ return '<div class="pg gd"><div class="gdb">📋 옮겨 적을 값 — 참고용 (이 장은 서류로 보관 안 함) · 다음 장 빈 양식에 손으로 적어요</div>' + x + '<div class="pg hand">' + x; }).join(""); }
function rwPrintAll(f, t, withProd, empty, hand){
  if(f && t && f > t){ var z = f; f = t; t = z; }
  var pages = [], cnt = 0;
  _rwMats().forEach(function(m){ var P = _rwLedgerPage(m, f, t); if(P.n || empty){ pages.push(P.html); cnt++; } });
  if(!cnt && !withProd) return toast("그 기간에 기록이 없어요", true);
  var body = pages.join("");
  if(withProd){ var keep = RW.ym, ks = RW.rsel; RW.ym = ""; RW.rsel = ""; var P = _rwS().prods || {}, ids = Object.keys(P).filter(function(k){ return (!f || P[k].dt >= f) && (!t || P[k].dt <= t); });
    if(ids.length) body += rwPrintProdIds(ids, true); RW.ym = keep; RW.rsel = ks; }
  if(hand === "trace") body = '<style>.v,.v *{color:#d4d4d8!important;font-weight:400!important}</style>' + body;
  else if(hand) body = RW_HAND_CSS + _rwHand(body);
  closePopup(); _rwWin((hand ? "수기용_" : "") + "원료수불부_" + f + "_" + t, body);
}
async function rwExcel(){
  showLoading("엑셀 만드는 중...");
  var EJ; try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); toast(e.message, true); return; }
  var wb = new EJ.Workbook(), thin = { style: "thin" }, BOX = { top: thin, left: thin, bottom: thin, right: thin }, P = _rwS().prods || {};
  var put = function(ws, r, vals, bold, fill){ ws.getRow(r).values = vals; for(var c = 1; c <= vals.length; c++){ var cl = ws.getCell(r, c); cl.border = BOX; if(bold) cl.font = { bold: true }; if(fill) cl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; if(typeof vals[c - 1] === "number") cl.numFmt = "#,##0.###"; } };
  var ws = wb.addWorksheet("생산일지"); ws.columns = [{ width: 16 }, { width: 26 }, { width: 18 }, { width: 12 }, { width: 60 }, { width: 10 }, { width: 14 }];
  put(ws, 1, ["생산일자", "제품명", "기준", "총량(kg)", "원료 사용(kg)", "가생산량", "작업자"], true, "FFEDE9FE");
  Object.keys(P).sort(function(a, b){ return String(P[a].dt).localeCompare(String(P[b].dt)); }).forEach(function(k, i){ var p = P[k], b = p.basis || {}; put(ws, i + 2, [_bsMD(p.dt), p.nm, b.k === "tong" ? b.val + "통" : b.k === "total" ? "총 " + b.val + "kg" : (b.mat || "") + " " + b.val + "kg", _bsN(p.total), (p.lines || []).map(function(l){ return l.mat + " " + _rwKg(l.qty); }).join(", "), p.units || "", p.worker || ""]); });
  _rwMats().forEach(function(m){
    var L = _rwLedger(m); if(!L.length) return;
    var s = wb.addWorksheet(String(m).slice(0, 28).replace(/[\\\/\?\*\[\]:]/g, "_")); s.columns = [{ width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 34 }];
    s.mergeCells(1, 1, 1, 5); s.getCell(1, 1).value = "원료수불부 — " + m + " (단위: kg)"; s.getCell(1, 1).font = { bold: true, size: 14 };
    put(s, 2, ["일자", "입고", "사용(출고)", "현재고량", "비고 (구입처 및 생산제품)"], true, "FFD1FAE5");
    L.forEach(function(e, i){ put(s, i + 3, [_bsMD(e.dt), e.t === "in" ? e.qty : "", e.t === "use" ? e.qty : "", e.stock, e.note]); });
  });
  var buf = await wb.xlsx.writeBuffer(), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); a.download = "원료수불부_생산일지_" + _bsToday() + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove(); hideLoading(); toast("엑셀 받았어요");
}
