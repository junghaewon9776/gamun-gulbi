// ============================================================================
// 🏢 거래처 장부 — 예전 엑셀 '거래처별 장부'(상호·총금액·결제금액·미수금액 / 일자·품명·규격·수량·단가·금액·세액·입출금내역·합계·비고) 그대로
//   두 가지:  bp = 비품 거래 (박스·포장재·아이스팩·화물 …)   raw = 원료 구입 (창해수산·대영물산 — 입고·출고·재고까지)
//   관리번호(no): 비품 거래처 A-01·A-02…, 원료 거래처 C-01·C-02… — 화일철 번호, 목록도 이 순서
//   /main/Vend = { v:{vid:{no, nm, kind:'bp'|'raw', tel, acct, loc, note, ord}},
//                  r:{vid:{rid:{dt, nm, spec, qty, out, price, am, tax, pay, note, at}}} }
//   한 줄 = 산 것(금액·세액) 또는 낸 돈(입출금내역) — 합계(미수) = 앞 합계 + 금액 + 세액 − 입출금내역
//   원료: 입고(가문이 산 수량) · 출고(거래처 창고에서 꺼내 온 수량) → 품명별 재고 = 입고 − 출고
//   엑셀: 📥 양식(거래처마다 시트 하나, 예전 장부 모양) → 적어서 → 📤 올리기(미리 보고 새 줄만 더함)
// ============================================================================
var VD = { D: null, loading: false, kind: "bp", sel: "", y: "", q: "" };
var VD_K = { bp: { nm: "비품 거래", ic: "📦", c: "#0369a1", bg: "#f0f9ff", bd: "#bae6fd" }, raw: { nm: "원료 구입", ic: "🐟", c: "#b45309", bg: "#fffbeb", bd: "#fde68a" } };
function _vdS(){ return VD.D || {}; }
function _vdRef(p){ return fbDb.ref("/main/Vend" + (p ? "/" + p : "")); }
function _vdN(v){ return typeof _bsN === "function" ? _bsN(v) : (Number(String(v == null ? "" : v).replace(/,/g, "")) || 0); }
function _vdW(n){ n = Math.round(_vdN(n)); return n ? n.toLocaleString("ko-KR") : "0"; }
function _vdQ(n){ var v = Math.round(_vdN(n) * 100) / 100; return v.toLocaleString("ko-KR"); }
function _vdToday(){ return typeof todayKST === "function" ? todayKST() : new Date().toISOString().slice(0, 10); }
function _vdCan(){ return !!ME && (ME.r === "super" || ME.r === "admin") && !(typeof _tpRO === "function" && _tpRO()); }
function _vdB(bg, lb, on, ex){ return '<button class="btn" style="background:' + bg + ';color:#fff;' + (ex || "") + '" onclick="' + on + '">' + lb + '</button>'; }
function _vdLoad(){
  if(VD.loading) return; VD.loading = true;
  _vdRef().once("value").then(function(s){ VD.loading = false; VD.D = s.val() || {}; if(/^vd/.test(CTAB)) draw(); })
    .catch(function(e){ VD.loading = false; toast("거래처 장부 불러오기 실패: " + e.message, true); });
}
function _vdPre(kind){ return kind === "raw" ? "C" : "A"; }
function _vdNoN(no){ var m = String(no || "").match(/(\d+)/); return m ? +m[1] : 0; }
function _vdNo(kind, n){ return _vdPre(kind) + "-" + ("0" + n).slice(-2); }
// 적은 번호 정리: a1 · A01 · A-1 · 1 → A-01
function _vdNoFix(no, kind){ no = String(no || "").toUpperCase().replace(/\s/g, ""); var m = no.match(/^([A-Z])?-?(\d+)$/); return m ? (m[1] || _vdPre(kind)) + "-" + ("0" + (+m[2])).slice(-2) : no; }
function _vdNextNo(kind, extra){ var mx = 0, V = _vdS().v || {}; Object.keys(V).forEach(function(k){ if((V[k].kind || "bp") === kind) mx = Math.max(mx, _vdNoN(V[k].no)); }); (extra || []).forEach(function(n){ mx = Math.max(mx, _vdNoN(n)); }); return _vdNo(kind, mx + 1); }
function _vdVs(kind){ var V = _vdS().v || {}; return Object.keys(V).filter(function(k){ return (V[k].kind || "bp") === kind; }).sort(function(a, b){ var x = _vdNoN(V[a].no) || 1e9, y = _vdNoN(V[b].no) || 1e9; return x - y || String(V[a].nm).localeCompare(String(V[b].nm)); }); }
function _vdNoTag(v){ return v.no ? '<span style="background:#1e293b;color:#fff;border-radius:6px;padding:1px 7px;font-size:12px;font-weight:900;margin-right:6px">' + esc(v.no) + '</span>' : ''; }
// 장부 줄 (날짜순) + 합계 누계 + 원료 재고 누계
function _vdRows(vid){
  var R = (_vdS().r || {})[vid] || {}, ids = Object.keys(R).sort(function(a, b){ var x = R[a], y = R[b]; return String(x.dt || "").localeCompare(String(y.dt || "")) || _vdN(x.at) - _vdN(y.at) || (a < b ? -1 : 1); });
  var bal = 0, st = {};
  return ids.map(function(id){ var x = R[id], am = _vdAm(x); bal += am + _vdN(x.tax) - _vdN(x.pay);
    var nm = String(x.nm || "").trim(); if(nm && (_vdN(x.qty) || _vdN(x.out))){ st[nm] = (st[nm] || 0) + _vdN(x.qty) - _vdN(x.out); }
    return { id: id, x: x, am: am, bal: bal, stock: nm && (_vdN(x.qty) || _vdN(x.out)) ? st[nm] : null }; });
}
function _vdAm(x){ return x.am !== undefined && x.am !== "" && x.am !== null ? _vdN(x.am) : _vdN(x.qty) * _vdN(x.price); }
function _vdSum(vid){ var t = 0, p = 0, n = 0, last = ""; _vdRows(vid).forEach(function(o){ t += o.am + _vdN(o.x.tax); p += _vdN(o.x.pay); n++; if(o.x.dt > last) last = o.x.dt; }); return { tot: t, pay: p, rest: t - p, n: n, last: last }; }
// 원료 거래처 품명별 재고현황 (입고·출고·재고·평균단가)
function _vdStock(vid){
  var m = {};
  _vdRows(vid).forEach(function(o){ var x = o.x, nm = String(x.nm || "").trim(); if(!nm || (!_vdN(x.qty) && !_vdN(x.out))) return;
    var s = m[nm] = m[nm] || { nm: nm, inq: 0, out: 0, amt: 0, q4p: 0 }; s.inq += _vdN(x.qty); s.out += _vdN(x.out); if(_vdN(x.qty) && _vdN(x.price)){ s.amt += _vdN(x.qty) * _vdN(x.price); s.q4p += _vdN(x.qty); } });
  return Object.keys(m).map(function(k){ var s = m[k]; s.st = s.inq - s.out; s.avg = s.q4p ? s.amt / s.q4p : 0; return s; });
}

// ════════ 화면 ════════
function dVdBp(){ VD.kind = "bp"; return _vdPage(); }
function dVdRaw(){ VD.kind = "raw"; return _vdPage(); }
function _vdPage(){
  if(!VD.D){ _vdLoad(); return '<div class="card"><div class="mut">📡 거래처 장부 불러오는 중...</div></div>'; }
  var K = VD_K[VD.kind], ks = _vdVs(VD.kind), V = _vdS().v || {}, can = _vdCan();
  if(VD.sel && (!V[VD.sel] || (V[VD.sel].kind || "bp") !== VD.kind)) VD.sel = "";
  var h = '<div class="card" style="margin-bottom:10px;background:' + K.bg + ';border:1px solid ' + K.bd + '"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><div><b style="font-size:18px;color:' + K.c + '">' + K.ic + ' ' + K.nm + ' — 거래처 장부</b><div class="mut" style="font-size:12.5px">' + (VD.kind === "raw" ? "산 원료(입고) · 가져온 것(출고) · 거래처에 남은 재고 · 미수금" : "산 물건 · 낸 돈 · 미수금") + ' — 예전 엑셀 장부 모양 그대로</div></div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += _vdB("#334155", "📥 엑셀 양식", "vdXlTpl()") + (can ? _vdB("#7c3aed", "📤 엑셀 올리기", "vdXlPick()") + _vdB("#16a34a", "+ 거래처", "vdVEdit('')") : "") + '</div></div></div>';
  if(VD.sel) return h + _vdLedger(VD.sel);
  // 거래처 목록 — 관리번호 순 · 검색(번호·상호·전화·메모)
  var T = { tot: 0, pay: 0, rest: 0 }, vq = String(VD.vq || "").trim().toLowerCase().replace(/\s/g, "");
  if(vq) ks = ks.filter(function(k){ var v = V[k]; return [v.no, v.nm, v.tel, v.note, v.loc].join("").toLowerCase().replace(/\s/g, "").indexOf(vq) >= 0; });
  h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap"><input type="search" id="vdVq" placeholder="🔍 관리번호(' + _vdPre(VD.kind) + '01) 또는 상호로 찾기" value="' + esc(VD.vq || "") + '" oninput="VD.vq=this.value;clearTimeout(VD.vqT);VD.vqT=setTimeout(function(){draw();var e=document.getElementById(\'vdVq\');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length);}},250)" onkeydown="if(event.key===\'Enter\'){var f=document.querySelector(\'#vdList tr[data-k]\');if(f)f.click();}" style="flex:1 1 260px;max-width:420px;padding:8px 10px;border:2px solid ' + K.bd + ';border-radius:8px;font-size:14px"><span class="mut" style="font-size:12px">줄을 누르면 그 업체 장부로 들어가요 (내역 보기·적기)' + (vq ? ' · 찾은 곳 ' + ks.length : '') + '</span></div>';
  h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="overflow-x:auto"><table id="vdList" style="width:100%;border-collapse:collapse;font-size:13.5px;min-width:640px"><thead><tr style="background:#f1f5f9">' + ["관리번호", "거래처", "줄", "마지막 거래", "총금액", "결제금액", "미수금액", ""].map(function(x, i){ return '<th style="padding:8px;text-align:' + (i >= 4 && i <= 6 ? "right" : "left") + ';white-space:nowrap">' + x + '</th>'; }).join("") + '</tr></thead><tbody>';
  if(!ks.length) h += '<tr><td colspan="8" style="padding:24px;text-align:center;color:#94a3b8">아직 거래처가 없어요 — ' + (can ? '[+ 거래처] 로 만들거나 엑셀을 올려 주세요' : '관리자가 등록하면 보여요') + '</td></tr>';
  ks.forEach(function(k){ var v = V[k], s = _vdSum(k), on = false; T.tot += s.tot; T.pay += s.pay; T.rest += s.rest;
    h += '<tr data-k="' + k + '" style="cursor:pointer" onmouseover="this.style.background=\'' + K.bg + '\'" onmouseout="this.style.background=\'\'" onclick="VD.sel=\'' + k + '\';VD.y=\'\';VD.q=\'\';VD.edit=\'\';VD.toEnd=1;draw();scrollTo(0,0)"><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-weight:900;white-space:nowrap">' + esc(v.no || "") + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;font-weight:800;color:' + (on ? K.c : "#0f172a") + '">' + esc(v.nm) + (v.tel ? ' <span class="mut" style="font-size:11.5px;font-weight:400">' + esc(v.tel) + '</span>' : '') + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9">' + s.n + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;white-space:nowrap">' + esc(String(s.last || "").replace(/-/g, ".")) + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right">' + _vdW(s.tot) + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;color:#16a34a">' + _vdW(s.pay) + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;color:' + (s.rest > 0 ? "#dc2626" : "#475569") + '">' + _vdW(s.rest) + '</td><td style="padding:7px 8px;border-bottom:1px solid #f1f5f9;text-align:right;white-space:nowrap">' + (can ? '<button class="btn" style="background:#475569;color:#fff;padding:3px 9px;font-size:12px" onclick="event.stopPropagation();vdVEdit(\'' + k + '\')">수정</button>' : '') + '</td></tr>'; });
  if(ks.length) h += '<tr style="background:#f8fafc;font-weight:900"><td style="padding:8px" colspan="4">합계 (' + ks.length + '곳)</td><td style="padding:8px;text-align:right">' + _vdW(T.tot) + '</td><td style="padding:8px;text-align:right;color:#16a34a">' + _vdW(T.pay) + '</td><td style="padding:8px;text-align:right;color:#dc2626">' + _vdW(T.rest) + '</td><td></td></tr>';
  h += '</tbody></table></div></div>';
  return h;
}
function _vdLedger(vid){
  var v = (_vdS().v || {})[vid], K = VD_K[v.kind || "bp"], raw = v.kind === "raw", can = _vdCan(), all = _vdRows(vid), s = _vdSum(vid);
  var ys = {}; all.forEach(function(o){ if(o.x.dt) ys[String(o.x.dt).slice(0, 4)] = 1; });
  var q = String(VD.q || "").trim().toLowerCase(), list = all.filter(function(o){ return (!VD.y || String(o.x.dt).slice(0, 4) === VD.y) && (!q || [o.x.nm, o.x.spec, o.x.note].join(" ").toLowerCase().indexOf(q) >= 0); });
  var ks = _vdVs(v.kind || "bp"), ix = ks.indexOf(vid), pv = ks[ix - 1], nx = ks[ix + 1], V = _vdS().v;
  var h = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap">' + _vdB("#1e293b", "◀ 거래처 목록", "VD.sel='';draw()", "padding:7px 14px;font-weight:800") + (pv ? _vdB("#64748b", "‹ " + esc(V[pv].no || "") + " " + esc(V[pv].nm), "VD.sel='" + pv + "';draw()", "padding:6px 10px;font-size:12.5px") : "") + (nx ? _vdB("#64748b", esc(V[nx].no || "") + " " + esc(V[nx].nm) + " ›", "VD.sel='" + nx + "';draw()", "padding:6px 10px;font-size:12.5px") : "") + (can ? _vdB("#475569", "업체 정보 수정", "vdVEdit('" + vid + "')", "padding:6px 10px;font-size:12.5px;margin-left:auto") : "") + '</div>';
  h += '<div class="card" style="border:2px solid ' + K.bd + '"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px"><div><b style="font-size:17px">' + _vdNoTag(v) + esc(v.nm) + '</b>';
  h += '<div class="mut" style="font-size:12.5px">' + [v.tel ? "☎ " + esc(v.tel) : "", v.acct ? "🏦 " + esc(v.acct) : "", v.loc ? "📍 " + esc(v.loc) : "", v.note ? esc(v.note) : ""].filter(Boolean).join(" · ") + '</div></div>';
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:13px"><span>총금액 <b>' + _vdW(s.tot) + '</b></span><span style="color:#16a34a">결제금액 <b>' + _vdW(s.pay) + '</b></span><span style="color:#dc2626">미수금액 <b style="font-size:16px">' + _vdW(s.rest) + '</b></span></div></div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0"><select onchange="VD.y=this.value;draw()" style="width:auto;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px"><option value="">전체 기간</option>' + Object.keys(ys).sort().reverse().map(function(y){ return '<option value="' + y + '"' + (VD.y === y ? " selected" : "") + '>' + y + '년</option>'; }).join("") + '</select>';
  h += '<input type="search" placeholder="🔍 품명·규격·비고" value="' + esc(VD.q || "") + '" onchange="VD.q=this.value;draw()" style="width:180px;padding:6px;border:1px solid #cbd5e1;border-radius:6px">';
  if(can) h += _vdB("#16a34a", "+ " + (raw ? "원료 입고·출고" : "산 것") + " 적기", "" + (_vdPc() ? "VD.focus='vn_nm';VD.toEnd=1;_vdAfter()" : "vdREdit('" + vid + "','','buy')") + "") + _vdB("#2563eb", "💵 결제(낸 돈) 적기", "vdREdit('" + vid + "','','pay')");
  h += _vdB("#475569", "🖨 장부 인쇄", "vdPrint('" + vid + "')") + '</div>';
  var cols = raw ? ["일자", "품명", "규격", "입고", "단가", "출고", "금액", "입출금내역", "합계", "비고", "재고", ""] : ["일자", "품명", "규격", "수량", "단가", "금액", "세액", "입출금내역", "합계", "비고", ""];
  var R = { 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }; if(raw) R[10] = 1;
  h += '<div id="vdScr" style="overflow-x:auto;max-height:620px"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:' + (raw ? 1080 : 1000) + 'px"><thead><tr style="background:' + K.bg + ';position:sticky;top:0">' + cols.map(function(x, i){ return '<th style="padding:6px;white-space:nowrap;text-align:' + (R[i] ? "right" : "left") + ';border-bottom:2px solid ' + K.bd + '">' + x + '</th>'; }).join("") + '</tr></thead><tbody>';
  if(!list.length) h += '<tr><td colspan="' + cols.length + '" style="padding:20px;text-align:center;color:#94a3b8">적힌 줄이 없어요' + (_vdPc() && can ? ' — 아래 파란 줄에 바로 적으세요' : '') + '</td></tr>';
  h += '<datalist id="vdNms">' + _vdNmList(vid).map(function(nm){ var f = _vdPriceOf(vid, nm); return '<option value="' + esc(nm) + '">' + (f ? esc(_vdW(f.price) + "원") : "") + '</option>'; }).join("") + '</datalist>';
  var td = function(v, st){ return '<td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;' + (st || "") + '">' + v + '</td>'; }, n = function(v){ return _vdN(v) ? _vdQ(v) : ""; }, pc = _vdPc() && can;
  list.forEach(function(o){ var x = o.x, pay = _vdN(x.pay), isPay = pay && !o.am && !_vdN(x.qty) && !_vdN(x.out);
    if(pc && VD.edit === o.id){ h += _vdInRow(vid, o.id, x, raw); return; }
    h += '<tr style="' + (isPay ? "background:#f0fdf4;" : "") + (can ? "cursor:pointer" : "") + '"' + (can ? ' title="' + (pc ? "누르면 이 줄을 바로 고쳐요" : "누르면 고쳐요") + '" onclick="' + (pc ? "VD.edit='" + o.id + "';VD.focus='ve_nm';draw()" : "vdREdit('" + vid + "','" + o.id + "')") + '"' : '') + '>' + td(esc(String(x.dt || "").replace(/-/g, ".")), "white-space:nowrap") + td(esc(x.nm || ""), "font-weight:700") + td(esc(x.spec || ""), "color:#475569");
    if(raw) h += td(n(x.qty), "text-align:right") + td(n(x.price), "text-align:right") + td(n(x.out), "text-align:right;color:#7c3aed") + td(o.am ? _vdW(o.am) : "", "text-align:right");
    else h += td(n(x.qty), "text-align:right") + td(n(x.price), "text-align:right") + td(o.am ? _vdW(o.am) : "", "text-align:right") + td(n(x.tax), "text-align:right;color:#64748b");
    h += td(pay ? _vdW(pay) : "", "text-align:right;color:#16a34a;font-weight:800") + td(_vdW(o.bal), "text-align:right;font-weight:800;color:" + (o.bal > 0 ? "#b91c1c" : "#475569")) + td(esc(x.note || ""), "font-size:12px;color:#475569");
    if(raw) h += td(o.stock == null ? "" : _vdQ(o.stock), "text-align:right;color:#0369a1");
    h += td(can ? '<span style="color:#94a3b8;font-size:12px">수정</span>' : "", "text-align:right") + '</tr>'; });
  if(_vdPc() && can){ h += _vdInRow(vid, "", { dt: VD.lastDt || _vdToday() }, raw) + '<tr><td colspan="' + cols.length + '" style="padding:4px 6px;font-size:12px;color:#475569"><span id="vn_hint"></span> <span class="mut">⌨ 파란 줄에 바로 적고 <b>Enter</b> = 넣기 · Tab = 다음 칸 · 품명 고르면 단가 불러옴 · 줄 누르면 그 자리에서 고치기(Esc 취소)' + (raw ? '' : ' · 세액 칸에서 F9 = 금액의 10%') + '</span></td></tr>'; }
  h += '</tbody></table></div>';
  setTimeout(_vdAfter, 0);
  if(raw){ var st = _vdStock(vid);
    if(st.length){ h += '<div style="margin-top:12px"><b>📦 ' + esc(v.nm) + ' 재고 현황</b> <span class="mut" style="font-size:12px">— 입고 − 출고 = 거래처 창고에 남은 것</span><div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:13px;margin-top:6px;min-width:480px"><thead><tr style="background:#fffbeb">' + ["품목", "입고", "출고", "재고", "평균단가"].map(function(x, i){ return '<th style="padding:6px 10px;text-align:' + (i ? "right" : "left") + '">' + x + '</th>'; }).join("") + '</tr></thead><tbody>';
      st.forEach(function(s){ h += '<tr' + (s.st ? "" : ' style="color:#94a3b8"') + '><td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;font-weight:700">' + esc(s.nm) + '</td><td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;text-align:right">' + _vdQ(s.inq) + '</td><td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;text-align:right">' + _vdQ(s.out) + '</td><td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;color:' + (s.st ? "#0369a1" : "inherit") + '">' + _vdQ(s.st) + '</td><td style="padding:4px 10px;border-bottom:1px solid #f1f5f9;text-align:right">' + (s.avg ? _vdW(s.avg) : "") + '</td></tr>'; });
      h += '</tbody></table></div></div>'; } }
  return h + '</div>';
}

// ════════ 거래처 추가·수정 ════════
function vdVEdit(vid){
  var v = vid ? (_vdS().v || {})[vid] : { kind: VD.kind }, F = function(lb, id, val, ph){ return '<label style="font-size:13px;display:block;margin-bottom:8px">' + lb + '<input id="' + id + '" value="' + esc(val || "") + '" placeholder="' + (ph || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>'; };
  var h = '<h3 style="margin:0 0 10px">' + (vid ? "거래처 수정" : "+ 거래처") + '</h3>' + F("관리번호 (화일철 번호 · 비품 A-01~ · 원료 C-01~)", "vd_no", vid ? v.no : _vdNextNo(v.kind), "예: A01") + F("상호 *", "vd_nm", v.nm, "예: 현대포장상사");
  h += '<label style="font-size:13px;display:block;margin-bottom:8px">어느 장부<select id="vd_kind" onchange="var n=document.getElementById(\'vd_no\');if(n&&!n.dataset.hand)n.value=_vdNextNo(this.value)" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px"><option value="bp"' + (v.kind !== "raw" ? " selected" : "") + '>📦 비품 거래 (수량·단가·금액·세액)</option><option value="raw"' + (v.kind === "raw" ? " selected" : "") + '>🐟 원료 구입 (입고·출고·재고)</option></select></label>';
  h += F("전화번호 및 담당", "vd_tel", v.tel) + F("계좌번호", "vd_acct", v.acct) + F("위치", "vd_loc", v.loc) + F("메모", "vd_note", v.note);
  h += '<div style="display:flex;gap:6px;justify-content:space-between;margin-top:10px"><span>' + (vid ? _vdB("#dc2626", "거래처 지우기", "vdVDel('" + vid + "')") : "") + '</span><span style="display:flex;gap:6px">' + _vdB("#475569", "닫기", "closePopup()") + _vdB("#16a34a", "저장", "vdVSave('" + vid + "')", "padding:8px 18px") + '</span></div>';
  openPopup(h, 440); var ne = document.getElementById("vd_no"); if(ne) ne.oninput = function(){ ne.dataset.hand = 1; };
}
function vdVSave(vid){
  var g = function(id){ return String((document.getElementById(id) || {}).value || "").trim(); }, nm = g("vd_nm");
  if(!nm) return toast("상호를 적어 주세요", true);
  var V = _vdS().v || {}, dup = Object.keys(V).filter(function(k){ return k !== vid && V[k].nm === nm; });
  if(dup.length) return toast("같은 이름 거래처가 이미 있어요", true);
  var kd = g("vd_kind") || "bp", no = _vdNoFix(g("vd_no"), kd);
  var dn = Object.keys(V).filter(function(k){ return k !== vid && no && V[k].no === no; }); if(dn.length && !confirm("관리번호 " + no + " 는 「" + V[dn[0]].nm + "」 도 쓰고 있어요. 그래도 저장할까요?")) return;
  var id = vid || "v" + Date.now().toString(36), o = Object.assign({}, V[vid] || {}, { no: no, nm: nm, kind: kd, tel: g("vd_tel"), acct: g("vd_acct"), loc: g("vd_loc"), note: g("vd_note") });
  _vdRef("v/" + id).set(o).then(function(){ VD.D.v = VD.D.v || {}; VD.D.v[id] = o; closePopup(); VD.kind = o.kind; VD.sel = id; toast("저장했어요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function vdVDel(vid){
  var v = _vdS().v[vid], n = Object.keys(((_vdS().r || {})[vid]) || {}).length;
  if(!confirm("「" + v.nm + "」 거래처" + (n ? "와 장부 " + n + "줄을 모두" : "를") + " 지울까요?\n(되돌릴 수 없어요)")) return;
  var up = {}; up["v/" + vid] = null; up["r/" + vid] = null;
  _vdRef().update(up).then(function(){ delete VD.D.v[vid]; if(VD.D.r) delete VD.D.r[vid]; VD.sel = ""; closePopup(); toast("지웠어요"); draw(); }).catch(function(e){ toast("실패: " + e.message, true); });
}

// ════════ 장부 한 줄 적기·고치기 ════════
function _vdPc(){ return (window.innerWidth || 1200) >= 760; }
// PC 표 안 입력 줄 — P: "vn_"(새 줄) / "ve_"(고치는 줄)
function _vdInRow(vid, rid, x, raw){
  if(rid && (x.am === undefined || x.am === null || x.am === "") && _vdN(x.qty) && _vdN(x.price)) x = Object.assign({}, x, { am: Math.round(_vdN(x.qty) * _vdN(x.price)) });
  var P = rid ? "ve_" : "vn_", st = 'width:100%;padding:5px 5px;border:1px solid #93c5fd;border-radius:4px;font-size:13px;box-sizing:border-box;background:#fff';
  var I = function(f, t, ex, w){ var v = x[f]; return '<td style="padding:3px 2px;border-bottom:1px solid #bfdbfe">' + '<input id="' + P + f + '" type="' + (t || "text") + '" value="' + esc(v == null ? "" : v) + '" ' + (ex || "") + ' style="' + st + (t === "number" ? ";text-align:right" : "") + (w ? ";min-width:" + w + "px" : "") + '"></td>'; };
  var num = 'step="any" oninput="_vdRCalc(\'' + P + '\')"', hand = x.am !== undefined && x.am !== "" && x.am !== null && _vdN(x.am) !== _vdN(x.qty) * _vdN(x.price) ? ' data-hand="1"' : '';
  var key = ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();' + (P === "vn_" ? "_vdNmPick('" + vid + "','vn_');" : "") + 'vdRSave(\'' + vid + '\',\'' + (rid || "") + '\',\'buy\',\'' + P + '\')}' + (rid ? 'else if(event.key===\'Escape\'){VD.edit=\'\';draw()}' : '') + '"';
  var h = '<tr' + key + ' style="background:' + (rid ? "#eff6ff" : "#f0f9ff") + '">' + I("dt", "date", "", 128) + I("nm", "text", 'list="vdNms" autocomplete="off" placeholder="' + (rid ? "" : "품명 (결제는 \'결제\')") + '" onchange="_vdNmPick(\'' + vid + '\',\'' + P + '\')"', 130) + I("spec", "text", "", 60) + I("qty", "number", num, 60) + I("price", "number", num.replace('oninput="', 'oninput="delete this.dataset.auto;'), 80);
  if(raw) h += I("out", "number", 'step="any"', 55) + I("am", "number", 'step="any" oninput="this.dataset.hand=1"' + hand, 90);
  else h += I("am", "number", 'step="any" oninput="this.dataset.hand=1"' + hand, 90) + I("tax", "number", 'step="any" placeholder="F9=10%" onkeydown="if(event.key===\'F9\'){event.preventDefault();this.value=Math.round(_vdN(document.getElementById(\'' + P + 'am\').value)*0.1)}"', 70);
  h += I("pay", "number", 'step="any"', 80) + '<td style="border-bottom:1px solid #bfdbfe"></td>' + I("note", "text", "", 80) + (raw ? '<td style="border-bottom:1px solid #bfdbfe"></td>' : '');
  h += '<td style="padding:3px 2px;border-bottom:1px solid #bfdbfe;white-space:nowrap">' + (rid ? _vdB("#16a34a", "저장", "vdRSave('" + vid + "','" + rid + "','buy','ve_')", "padding:4px 8px;font-size:12px") + _vdB("#94a3b8", "취소", "VD.edit='';draw()", "padding:4px 7px;font-size:12px;margin-left:2px") + _vdB("#dc2626", "🗑", "vdRDel('" + vid + "','" + rid + "')", "padding:4px 6px;font-size:12px;margin-left:2px") : _vdB("#16a34a", "＋ 넣기", "vdRSave('" + vid + "','','buy','vn_')", "padding:5px 10px;font-size:12.5px")) + '</td></tr>';
  return h;
}
function _vdAfter(){
  var sc = document.getElementById("vdScr"); if(sc && VD.toEnd){ sc.scrollTop = sc.scrollHeight; VD.toEnd = 0; }
  if(VD.focus){ var f = document.getElementById(VD.focus); VD.focus = ""; if(f){ f.focus(); if(f.select) f.select(); } }
}
// 등록된 단가 찾기: ① 이 거래처 최근 줄 ② 다른 거래처 최근 줄 ③ 엮거리 원료(짝당 값) ④ 원료수불부(kg당 단가)
function _vdPriceOf(vid, nm){
  nm = String(nm || "").trim(); if(!nm) return null;
  var R = _vdS().r || {}, V = _vdS().v || {}, best = null, mine = null;
  Object.keys(R).forEach(function(v){ Object.keys(R[v] || {}).forEach(function(k){ var x = R[v][k]; if(String(x.nm || "").trim() !== nm || !_vdN(x.price)) return;
    var o = { price: _vdN(x.price), spec: x.spec || "", dt: x.dt || "", from: (V[v] || {}).nm || "", at: _vdN(x.at) };
    var newer = function(a){ return !a || o.dt > a.dt || (o.dt === a.dt && o.at > a.at); };
    if(v === vid){ if(newer(mine)) mine = o; } else if(newer(best)) best = o; }); });
  if(mine) return Object.assign(mine, { src: "이 거래처 최근" });
  if(best) return Object.assign(best, { src: best.from + " 최근" });
  try { var ym = typeof YK !== "undefined" && YK.D && YK.D.mats ? YK.D.mats[_ykKey(nm)] : null; if(ym && _vdN(ym.price)) return { price: _vdN(ym.price), spec: ym.kg ? String(ym.kg) : "", src: "엮거리 원료 (짝당 값)" }; } catch(e){}
  try { var rm = typeof RW !== "undefined" && RW.D && RW.D.mats ? RW.D.mats[nm] : null; if(rm && _vdN(rm.price)) return { price: _vdN(rm.price), spec: "", src: "원료수불부 (kg당)" }; } catch(e){}
  return null;
}
function _vdNmList(vid){ var m = {}, R = _vdS().r || {}, kind = ((_vdS().v || {})[vid] || {}).kind;
  Object.keys(R).forEach(function(v){ if((((_vdS().v || {})[v] || {}).kind || "bp") !== (kind || "bp")) return; Object.keys(R[v] || {}).forEach(function(k){ var n = String(R[v][k].nm || "").trim(); if(n && !/^(결제|입금|송금)/.test(n)) m[n] = 1; }); });
  if(kind === "raw"){ try { if(YK.D && YK.D.mats) Object.keys(YK.D.mats).forEach(function(k){ if(YK.D.mats[k].nm) m[YK.D.mats[k].nm] = 1; }); } catch(e){} }
  return Object.keys(m).sort(); }
function _vdNmPick(vid, P){ P = P || "vr_";
  var n = document.getElementById(P + "nm"), p = document.getElementById(P + "price"), sp = document.getElementById(P + "spec"), hint = document.getElementById(P + "hint"); if(!n || !p) return;
  var f = _vdPriceOf(vid, n.value);
  if(!f){ if(hint) hint.innerHTML = n.value.trim() ? '<span style="color:#94a3b8">처음 적는 품명 — 단가를 넣어 주세요</span>' : ''; return; }
  if(!p.value || p.dataset.auto){ p.value = f.price; p.dataset.auto = 1; }
  if(sp && !sp.value && f.spec){ sp.value = f.spec; }
  if(hint) hint.innerHTML = '💡 단가 <b>' + _vdW(f.price) + '원</b> 불러옴 <span style="color:#64748b">(' + esc(f.src) + (f.dt ? " · " + esc(String(f.dt).replace(/-/g, ".")) : "") + ')</span>';
  _vdRCalc(P);
}

function vdREdit(vid, rid, mode){
  var v = _vdS().v[vid], raw = v.kind === "raw", x = rid ? ((_vdS().r || {})[vid] || {})[rid] : { dt: _vdToday() };
  if(rid) mode = _vdN(x.pay) && !_vdAm(x) && !_vdN(x.qty) && !_vdN(x.out) ? "pay" : "buy";
  var nms = _vdNmList(vid);
  var mob = !_vdPc(), F = function(lb, id, val, t, ex){ return '<label style="font-size:' + (mob ? 14 : 13) + 'px;display:flex;flex-direction:column;gap:2px">' + lb + '<input id="' + id + '" type="' + (t || "text") + '" value="' + esc(val == null ? "" : val) + '" ' + (ex || "") + ' style="padding:' + (mob ? "10px" : "7px") + ';font-size:' + (mob ? 16 : 14) + 'px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;width:100%"></label>'; };
  var num = 'step="any" inputmode="decimal" oninput="_vdRCalc()"';
  var h = '<h3 style="margin:0 0 4px">' + esc(v.nm) + ' — ' + (mode === "pay" ? "💵 결제(낸 돈)" : raw ? "원료 입고·출고" : "산 것") + (rid ? " 고치기" : " 적기") + '</h3><div class="mut" style="font-size:12px;margin-bottom:10px">' + (mode === "pay" ? "거래처에 보낸 돈 — 미수금에서 빠져요" : raw ? "입고 = 산 수량(금액 생김) · 출고 = 거래처 창고에서 가져온 수량(재고만 줄어요)" : "금액은 수량×단가로 저절로 — 다르면 직접 고치세요") + '</div>';
  h += '<datalist id="vdNms">' + nms.map(function(n){ var f = _vdPriceOf(vid, n); return '<option value="' + esc(n) + '">' + (f ? esc(_vdW(f.price) + "원") : "") + '</option>'; }).join("") + '</datalist>';
  h += '<div style="display:grid;grid-template-columns:' + (mob ? "1fr" : "1fr 1fr") + ';gap:' + (mob ? 10 : 8) + 'px">' + F("일자", "vr_dt", x.dt || VD.lastDt || _vdToday(), "date");
  if(mode === "pay") h += F("품명 (보통 '결제')", "vr_nm", rid ? x.nm : "결제") + F("입출금내역 (낸 돈)", "vr_pay", x.pay, "number", 'step="any" inputmode="numeric"') + F("비고", "vr_note", x.note);
  else { h += F("품명 (고르면 단가 불러와요)", "vr_nm", x.nm, "text", 'list="vdNms" autocomplete="off" onchange="_vdNmPick(\'' + vid + '\')"') + F("규격", "vr_spec", x.spec) + F(raw ? "입고 (산 수량)" : "수량", "vr_qty", x.qty, "number", num) + F("단가", "vr_price", x.price, "number", num.replace('oninput="', 'oninput="delete this.dataset.auto;'));
    if(raw) h += F("출고 (가져온 수량)", "vr_out", x.out, "number", 'step="any" inputmode="decimal"');
    h += F("금액", "vr_am", x.am, "number", 'step="any" inputmode="numeric" oninput="this.dataset.hand=1;_vdRCalc()"' + (x.am !== undefined && x.am !== "" && _vdN(x.am) !== _vdN(x.qty) * _vdN(x.price) ? ' data-hand="1"' : ''));
    if(!raw) h += '<label style="font-size:13px;display:flex;flex-direction:column;gap:2px">세액<span style="display:flex;gap:4px"><input id="vr_tax" type="number" step="any" value="' + esc(x.tax == null ? "" : x.tax) + '" style="flex:1;padding:7px;border:1px solid #cbd5e1;border-radius:6px;min-width:0"><button class="btn" style="background:#0369a1;color:#fff;padding:4px 8px;font-size:12px" onclick="var a=document.getElementById(\'vr_am\');document.getElementById(\'vr_tax\').value=Math.round(_vdN(a.value)*0.1)">10%</button></span></label>';
    h += F("같이 낸 돈 (입출금내역)", "vr_pay", x.pay, "number", 'step="any" inputmode="numeric"') + F("비고", "vr_note", x.note); }
  h += '</div><div id="vr_hint" style="font-size:12.5px;margin-top:8px;min-height:16px"></div><div style="display:flex;gap:6px;justify-content:space-between;margin-top:12px"><span>' + (rid ? _vdB("#dc2626", "이 줄 지우기", "vdRDel('" + vid + "','" + rid + "')") : "") + '</span><span style="display:flex;gap:6px">' + _vdB("#475569", "닫기", "closePopup()") + _vdB("#16a34a", "저장", "vdRSave('" + vid + "','" + rid + "','" + mode + "')", mob ? "padding:12px 26px;font-size:16px" : "padding:8px 18px") + '</span></div>';
  openPopup(h, mob ? 380 : 520);
}
function _vdRCalc(P){ P = P || "vr_"; var a = document.getElementById(P + "am"); if(!a || a.dataset.hand) return; var q = _vdN((document.getElementById(P + "qty") || {}).value), p = _vdN((document.getElementById(P + "price") || {}).value); a.value = q && p ? Math.round(q * p) : ""; }
function vdRSave(vid, rid, mode, P){ P = P || "vr_";
  var g = function(id){ var e = document.getElementById(id); return e ? String(e.value).trim() : ""; }, nb = function(id){ var s = g(id); return s === "" ? null : _vdN(s); };
  var o = { dt: g(P + "dt"), nm: g(P + "nm"), note: g(P + "note"), pay: nb(P + "pay") };
  if(mode !== "pay"){ o.spec = g(P + "spec"); o.qty = nb(P + "qty"); o.price = nb(P + "price"); o.out = nb(P + "out"); o.am = nb(P + "am"); o.tax = nb(P + "tax"); }
  if(!o.dt) return toast("일자를 넣어 주세요", true);
  if(!o.pay && !o.am && !o.qty && !o.out) return toast(mode === "pay" ? "낸 돈을 적어 주세요" : "수량이나 금액을 적어 주세요", true);
  Object.keys(o).forEach(function(k){ if(o[k] === null || o[k] === "") delete o[k]; });
  var old = rid ? ((_vdS().r || {})[vid] || {})[rid] : null; o.at = old && old.at ? old.at : Date.now(); o.by = ME ? ME.n || ME.id || "" : "";
  var id = rid || "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  _vdRef("r/" + vid + "/" + id).set(o).then(function(){ VD.D.r = VD.D.r || {}; VD.D.r[vid] = VD.D.r[vid] || {}; VD.D.r[vid][id] = o; closePopup(); toast("저장했어요"); if(P === "vn_"){ VD.lastDt = o.dt; VD.focus = "vn_nm"; VD.toEnd = 1; } if(P === "ve_") VD.edit = ""; draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function vdRDel(vid, rid){
  if(!confirm("이 줄을 지울까요?")) return;
  _vdRef("r/" + vid + "/" + rid).remove().then(function(){ delete VD.D.r[vid][rid]; closePopup(); toast("지웠어요"); draw(); }).catch(function(e){ toast("실패: " + e.message, true); });
}

// ════════ 장부 인쇄 (예전 엑셀 모양) ════════
function vdPrint(vid){
  var v = _vdS().v[vid], raw = v.kind === "raw", s = _vdSum(vid), rows = _vdRows(vid).filter(function(o){ return !VD.y || String(o.x.dt).slice(0, 4) === VD.y; });
  var cols = raw ? ["일자", "품명", "규격", "입고", "단가", "출고", "금액", "입출금내역", "합계", "비고", "재고"] : ["일자", "품명", "규격", "수량", "단가", "금액", "세액", "입출금내역", "합계", "비고"];
  var n = function(x){ return _vdN(x) ? _vdQ(x) : ""; }, h = '<html><head><meta charset="utf-8"><title>' + esc(v.nm) + ' 장부</title><style>body{font-family:sans-serif;font-size:11px;margin:12mm}table{border-collapse:collapse;width:100%}td,th{border:1px solid #555;padding:3px 4px}th{background:#eee}.r{text-align:right}.top td{border:1px solid #555;font-size:12px}</style></head><body>';
  h += '<table class="top" style="margin-bottom:8px"><tr><td rowspan="3" style="font-size:20px;font-weight:bold;width:45%">' + (v.no ? esc(v.no) + ' ' : '') + esc(v.nm) + (VD.y ? ' <span style="font-size:12px">(' + VD.y + '년)</span>' : '') + '</td><td>전화번호및담당</td><td>' + esc(v.tel || "") + '</td><td>총금액</td><td class="r">' + _vdW(s.tot) + '</td></tr><tr><td>계좌번호</td><td>' + esc(v.acct || "") + '</td><td>결제금액</td><td class="r">' + _vdW(s.pay) + '</td></tr><tr><td>위 치</td><td>' + esc(v.loc || "") + '</td><td>미수금액</td><td class="r"><b>' + _vdW(s.rest) + '</b></td></tr></table>';
  h += '<table><tr>' + cols.map(function(c){ return '<th>' + c + '</th>'; }).join("") + '</tr>';
  rows.forEach(function(o){ var x = o.x; h += '<tr><td>' + esc(String(x.dt || "").replace(/-/g, ".")) + '</td><td>' + esc(x.nm || "") + '</td><td>' + esc(x.spec || "") + '</td>';
    if(raw) h += '<td class="r">' + n(x.qty) + '</td><td class="r">' + n(x.price) + '</td><td class="r">' + n(x.out) + '</td><td class="r">' + (o.am ? _vdW(o.am) : "") + '</td>';
    else h += '<td class="r">' + n(x.qty) + '</td><td class="r">' + n(x.price) + '</td><td class="r">' + (o.am ? _vdW(o.am) : "") + '</td><td class="r">' + n(x.tax) + '</td>';
    h += '<td class="r">' + (_vdN(x.pay) ? _vdW(x.pay) : "") + '</td><td class="r">' + _vdW(o.bal) + '</td><td>' + esc(x.note || "") + '</td>' + (raw ? '<td class="r">' + (o.stock == null ? "" : _vdQ(o.stock)) + '</td>' : '') + '</tr>'; });
  h += '</table><script>onload=function(){print()}<\/script></body></html>';
  var w = window.open("", "_blank"); if(!w) return toast("팝업이 막혀 있어요 — 허용해 주세요", true); w.document.write(h); w.document.close();
}

// ════════ 엑셀 양식 · 올리기 ════════
//   시트 하나 = 거래처 하나 (시트 이름 또는 '상호' 칸 = 거래처 이름) · 6번째 줄 = 칸 이름 (예전 장부 모양) · 합계·재고 칸은 안 읽음(계산함)
var VD_XC = { bp: [["dt", "일자"], ["nm", "품명"], ["spec", "규격"], ["qty", "수량"], ["price", "단가"], ["am", "금액"], ["tax", "세액"], ["pay", "입출금내역"], ["bal", "합계"], ["note", "비고"]],
              raw: [["dt", "일자"], ["nm", "품명"], ["spec", "규격"], ["qty", "입고"], ["price", "단가"], ["out", "출고"], ["am", "금액"], ["pay", "입출금내역"], ["bal", "합계"], ["note", "비고"], ["st", "재고"]] };
var VD_XA = { "운송지": "nm", "차량": "spec", "입금": "pay", "결제": "pay", "입출금": "pay", "날짜": "dt" };
async function vdXlTpl(){
  var kind = VD.kind, K = VD_K[kind], EJ; showLoading("엑셀 만드는 중..."); try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var wb = new EJ.Workbook(), C = VD_XC[kind], V = _vdS().v || {}, ks = VD.sel && (V[VD.sel] || {}).kind === kind ? [VD.sel] : _vdVs(kind);
  if(!ks.length) ks = [""];
  ks.forEach(function(vid){ var v = vid ? V[vid] : { nm: "거래처이름" }, ws = wb.addWorksheet(((vid ? v.no : _vdNextNo(kind)) ? (vid ? v.no : _vdNextNo(kind)) + " " : "") + String(v.nm).replace(/[\\\/\?\*\[\]:]/g, "_").slice(0, 31));
    ws.getCell("A1").value = v.nm; ws.getCell("A1").font = { bold: true, size: 18 }; ws.mergeCells("A1:G3");
    ws.getCell("H1").value = "상호"; ws.getCell("I1").value = v.nm; ws.getCell("H2").value = "관리번호"; ws.getCell("I2").value = vid ? v.no || "" : _vdNextNo(kind); ws.getCell("H3").value = "전화번호및담당"; ws.getCell("I3").value = v.tel || ""; ws.getCell("H4").value = "계좌번호"; ws.getCell("I4").value = v.acct || ""; ws.getCell("H5").value = "위 치"; ws.getCell("I5").value = v.loc || "";
    var hr = ws.getRow(6); C.forEach(function(c, i){ var cell = hr.getCell(i + 1); cell.value = c[1]; cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c[0] === "bal" || c[0] === "st" ? "FF94A3B8" : c[0] === "pay" ? "FF16A34A" : "FF334155" } }; cell.alignment = { horizontal: "center" }; });
    var r = 7, rows = vid ? _vdRows(vid) : [];
    rows.forEach(function(o){ var x = o.x, row = ws.getRow(r++); C.forEach(function(c, i){ var val = c[0] === "bal" ? o.bal : c[0] === "st" ? (o.stock == null ? "" : o.stock) : c[0] === "am" ? (o.am || "") : c[0] === "dt" ? (x.dt ? new Date(x.dt + "T00:00:00Z") : "") : x[c[0]]; row.getCell(i + 1).value = val == null ? "" : val; }); });
    if(!vid) ws.getRow(7).values = kind === "raw" ? [new Date(_vdToday() + "T00:00:00Z"), "부세19미(8.8)", "", 100, 68000, "", 6800000, "", "", "예시 줄 — 지우고 쓰세요"] : [new Date(_vdToday() + "T00:00:00Z"), "박스 3kg", "", 500, 900, 450000, 45000, "", "", "예시 줄 — 지우고 쓰세요"];
    C.forEach(function(c, i){ var col = ws.getColumn(i + 1); col.width = c[0] === "nm" ? 22 : c[0] === "note" ? 24 : c[0] === "dt" ? 12 : 13; if(c[0] === "dt") col.numFmt = "yyyy-mm-dd"; else if(!/^(nm|spec|note)$/.test(c[0])) col.numFmt = "#,##0.##"; });
    ws.views = [{ state: "frozen", ySplit: 6 }]; });
  var g = wb.addWorksheet("쓰는 법");
  ["· 시트 하나 = 거래처 하나 — I1 '상호' 칸이 거래처 이름, I2 '관리번호' 칸이 화일철 번호 (비품 A-01~ · 원료 C-01~). 거래처 늘리려면 시트를 복사해서 상호·번호만 바꾸세요",
   "· 관리번호를 비우면 다음 번호를 저절로 붙여요",
   "· 6번째 줄(칸 이름)은 그대로 두고, 7번째 줄부터 적어요 — 일자는 꼭 넣기",
   kind === "raw" ? "· 입고 = 산 수량(금액이 생김) · 출고 = 거래처 창고에서 가져온 수량 · 입출금내역 = 거래처에 보낸 돈" : "· 금액 비우면 수량×단가로 계산 · 세액은 있는 만큼 · 입출금내역 = 거래처에 보낸 돈",
   "· 회색 칸(합계" + (kind === "raw" ? "·재고" : "") + ")은 안 읽어요 — 시스템이 다시 계산해요",
   "· 올리면 이미 있는 줄(일자·품명·수량·금액·낸 돈이 같은 줄)은 건너뛰고 새 줄만 더해요 — 지우지 않아요",
   "· 예전 장부 엑셀(같은 모양)도 그대로 올릴 수 있어요"].forEach(function(t, i){ g.getCell(i + 1, 1).value = t; });
  g.getColumn(1).width = 100;
  var buf = await wb.xlsx.writeBuffer(), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = "거래처장부_" + K.nm.replace(/\s/g, "") + (ks.length === 1 && ks[0] ? "_" + V[ks[0]].nm : "") + "_" + _vdToday() + ".xlsx"; document.body.appendChild(a); a.click(); a.remove(); hideLoading();
  toast("📥 " + K.nm + " 양식 (" + (ks[0] ? ks.length + "곳" : "빈 양식") + ")");
}
function vdXlPick(){ var i = document.createElement("input"); i.type = "file"; i.accept = ".xlsx,.xlsm"; i.multiple = true; i.onchange = function(){ if(i.files.length) vdXlRead(Array.prototype.slice.call(i.files)); }; i.click(); }
function _vdCell(c){ var v = c && c.value; if(v && typeof v === "object" && !(v instanceof Date)){ if(v.richText) v = v.richText.map(function(x){ return x.text; }).join(""); else if(v.result !== undefined) v = v.result; else if(v.text != null) v = v.text; else if(v.error) v = ""; } return v == null ? "" : v; }
function _vdDt(v){ if(v instanceof Date) return new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10);   // UTC 자정·한국 자정 둘 다 맞게 if(typeof v === "number" && v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  var m = String(v).trim().match(/^(\d{2,4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/); if(!m) return ""; var y = +m[1]; if(y < 100) y += 2000; return y + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2); }
function _vdSig(x){ return [x.dt, String(x.nm || "").trim(), _vdN(x.qty), _vdN(x.out), _vdAm(x), _vdN(x.pay)].join("|"); }
async function vdXlRead(files){
  var EJ; showLoading("엑셀 읽는 중..."); try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var V = _vdS().v || {}, byNm = {}, out = [], bad = []; Object.keys(V).forEach(function(k){ byNm[V[k].nm] = k; });
  for(var fi = 0; fi < files.length; fi++){ var wb = new EJ.Workbook();
    try { await wb.xlsx.load(await files[fi].arrayBuffer()); } catch(e){ bad.push(files[fi].name + ": 못 읽음 (" + e.message + ")"); continue; }
    wb.worksheets.forEach(function(ws){ if(/쓰는 ?법|재고현황|검색/.test(ws.name)) return;
      var hr = 0, col = {}, kind = "bp";
      for(var r = 1; r <= Math.min(12, ws.rowCount) && !hr; r++){ var row = ws.getRow(r), c = {}; row.eachCell(function(cell, n){ var t = String(_vdCell(cell)).replace(/\s+/g, ""); if(t === "일자" || t === "날짜") c.dt = n; }); if(c.dt){ hr = r;
        row.eachCell(function(cell, n){ var t = String(_vdCell(cell)).replace(/\s+/g, ""), k = null; VD_XC.raw.concat(VD_XC.bp).forEach(function(x){ if(x[1] === t) k = x[0]; }); if(!k) k = VD_XA[t]; if(k && !col[k]) col[k] = n; if(t === "입고" || t === "출고") kind = "raw"; }); } }
      if(!hr) return bad.push(files[fi].name + " › " + ws.name + ": '일자' 칸 이름 줄을 못 찾았어요");
      var nm = "", i1 = ws.getCell("I1"), h1 = String(_vdCell(ws.getCell("H1"))).replace(/\s/g, ""); if(h1 === "상호") nm = String(_vdCell(i1)).trim(); if(!nm) nm = String(_vdCell(ws.getCell("A1"))).trim() || ws.name.replace(/^[A-Z]-?\d+\s+/, "");
      var no = String(_vdCell(ws.getCell("H2"))).replace(/\s/g, "") === "관리번호" ? String(_vdCell(ws.getCell("I2"))).trim().toUpperCase() : ""; if(!no){ var fm = String(files[fi].name).match(/^(\d+)\./) || ws.name.match(/^([A-Z]-?\d+)\s/); if(fm) no = fm[1]; } if(/^sheet\d*$|^기본양식$|^어대금$/i.test(nm)) nm = String(files[fi].name).replace(/\.(xlsx|xlsm)$/i, "").replace(/^\d+\./, "");
      var info = {}; [["H3", "tel"], ["H4", "acct"], ["H5", "loc"]].forEach(function(p){ var r = +p[0].slice(1), v = String(_vdCell(ws.getCell("I" + r)) || _vdCell(ws.getCell("J" + r)) || "").trim(); if(v) info[p[1]] = v; });
      var rows = [], last = "";
      for(var r2 = hr + 1; r2 <= ws.rowCount; r2++){ var R = ws.getRow(r2), x = {};
        Object.keys(col).forEach(function(k){ if(k === "bal" || k === "st") return; var v = _vdCell(R.getCell(col[k])); if(v === "" || v === null) return;
          if(k === "dt") x.dt = _vdDt(v); else if(/^(nm|spec|note)$/.test(k)) x[k] = String(v).trim(); else { var n = _vdN(String(v).replace(/[원\s]/g, "")); if(n) x[k] = n; } });
        if(!x.dt && last && (x.nm || x.qty || x.am || x.pay)) x.dt = last;   // 날짜 빈 줄 = 위 줄과 같은 날
        if(!x.dt || !(x.qty || x.out || x.am || x.pay || x.tax)) continue; last = x.dt;
        if(x.am == null && x.qty && x.price) x.am = Math.round(x.qty * x.price);
        if(/^(결제|입금|송금)/.test(x.nm || "") && x.am && !x.pay && !x.qty){ x.pay = x.am; delete x.am; }
        rows.push(x); }
      var vid = byNm[nm], have = {}; if(vid) Object.keys(((_vdS().r || {})[vid]) || {}).forEach(function(k){ var g = _vdSig(_vdS().r[vid][k]); have[g] = (have[g] || 0) + 1; });
      var neu = rows.filter(function(x){ var s = _vdSig(x); if(have[s] > 0){ have[s]--; return false; } return true; });
      out.push({ nm: nm, no: no, vid: vid || "", kind: vid ? V[vid].kind || "bp" : kind, info: info, all: rows.length, rows: neu }); }); }
  // 관리번호 정리: 숫자만 있으면 앞글자(A·C) 붙이고, 없으면 다음 번호
  var used = []; out.forEach(function(o){ if(o.vid){ o.no = V[o.vid].no || o.no; } });
  out.forEach(function(o){ if(o.vid) return; if(o.no) o.no = _vdNoFix(o.no, o.kind); if(o.no) used.push(o.no); });
  out.forEach(function(o){ if(!o.vid && !o.no){ o.no = _vdNextNo(o.kind, used.filter(function(n){ return n[0] === _vdPre(o.kind); })); used.push(o.no); } });
  hideLoading(); VD.xl = out;
  if(!out.length) return toast("올릴 장부를 못 찾았어요" + (bad.length ? " — " + bad[0] : ""), true);
  var h = '<h3 style="margin:0 0 8px">📤 엑셀 올리기 — 미리 보기</h3><div class="mut" style="font-size:12.5px;margin-bottom:8px">이미 있는 줄은 건너뛰고 <b>새 줄만</b> 더해요 (지우는 건 없어요)</div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f1f5f9"><th style="padding:6px;text-align:left">관리번호</th><th style="padding:6px;text-align:left">거래처</th><th style="padding:6px;text-align:left">장부</th><th style="padding:6px;text-align:right">엑셀 줄</th><th style="padding:6px;text-align:right">새 줄</th><th style="padding:6px;text-align:right">새 줄 금액</th></tr>';
  out.forEach(function(o, i){ var am = o.rows.reduce(function(s, x){ return s + _vdAm(x) + _vdN(x.tax); }, 0), pay = o.rows.reduce(function(s, x){ return s + _vdN(x.pay); }, 0);
    h += '<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-weight:900">' + (o.vid ? esc(o.no || "") : '<input value="' + esc(o.no || "") + '" onchange="this.value=_vdNoFix(this.value,VD.xl[' + i + '].kind);VD.xl[' + i + '].no=this.value" style="width:56px;padding:3px">') + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(o.nm) + (o.vid ? '' : ' <span style="background:#dcfce7;color:#166534;border-radius:8px;padding:0 6px;font-size:11px">새 거래처</span>') + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9">' + (o.vid ? VD_K[o.kind].ic + " " + VD_K[o.kind].nm : '<select onchange="VD.xl[' + i + '].kind=this.value;var r=this.closest(\'tr\').querySelector(\'input\');if(r&&/^[AC]-?\\d+$/.test(r.value)){r.value=(this.value===\'raw\'?\'C\':\'A\')+r.value.slice(1);VD.xl[' + i + '].no=r.value;}" style="padding:3px"><option value="bp"' + (o.kind === "bp" ? " selected" : "") + '>📦 비품 거래</option><option value="raw"' + (o.kind === "raw" ? " selected" : "") + '>🐟 원료 구입</option></select>') + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">' + o.all + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:900;color:' + (o.rows.length ? "#16a34a" : "#94a3b8") + '">' + o.rows.length + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px">' + _vdW(am) + (pay ? '<br><span style="color:#16a34a">낸 돈 ' + _vdW(pay) + '</span>' : '') + '</td></tr>'; });
  h += '</table>' + (bad.length ? '<div style="color:#b91c1c;font-size:12px;margin-top:6px">' + bad.map(esc).join("<br>") + '</div>' : '');
  var tot = out.reduce(function(s, o){ return s + o.rows.length; }, 0);
  h += '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:12px">' + _vdB("#475569", "닫기", "closePopup()") + (tot ? _vdB("#16a34a", "새 줄 " + tot + "개 올리기", "vdXlSave()", "padding:8px 18px") : '') + '</div>';
  openPopup(h, 620);
}
function vdXlSave(){
  var L = VD.xl || [], up = {}, V = _vdS().v || {}, t0 = Date.now(), n = 0, first = "";
  L.forEach(function(o, i){ if(!o.rows.length && o.vid) return;
    var vid = o.vid || "v" + (t0 + i).toString(36); if(!first) first = vid;
    if(!o.vid){ up["v/" + vid] = Object.assign({ no: o.no || "", nm: o.nm, kind: o.kind }, o.info); }
    else Object.keys(o.info).forEach(function(k){ if(!V[vid][k]) up["v/" + vid + "/" + k] = o.info[k]; });
    o.rows.forEach(function(x, j){ var id = "x" + (t0 + i).toString(36) + "_" + ("000" + j).slice(-4); up["r/" + vid + "/" + id] = Object.assign({}, x, { at: t0 + j, by: "엑셀" }); n++; }); });
  if(!Object.keys(up).length) return toast("올릴 게 없어요");
  showLoading("올리는 중...");
  _vdRef().update(up).then(function(){ hideLoading(); closePopup(); VD.D = null; VD.xl = null; if(first && L.length === 1){ VD.sel = first; VD.kind = L[0].kind; } toast("장부 " + n + "줄 올렸어요"); _vdLoad(); draw(); })
    .catch(function(e){ hideLoading(); toast("올리기 실패: " + e.message, true); });
}
