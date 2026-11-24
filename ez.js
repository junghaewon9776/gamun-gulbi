// ════════ 📒 이지판매 자료 — 이지판매에서 뽑은 엑셀(매출명세서·매입명세서·수금·지급)을 올려서 어디서든 보기 ════════
//   입력은 이지판매에서만. 여기는 '올리기 + 보기' 전용 (super/admin)
//   /main/Ez/r/{kind}/{YYYY-MM}/{줄키} = { d 날짜, c 거래처, i 품목, s 규격, s2 상세규격, u 단위, g 구분, q 수량, p 단가, a 공급가액, t 세액, m 합계(수금·지급은 금액), n 전표번호, mo 메모, jm 전표메모 }
//   /main/Ez/s/{kind}/{YYYY-MM}/{거래처키} = { c, n 줄 수, m 합계, q 수량 }   ← 거래처 목록·원장에서 어느 달을 불러올지
//   /main/Ez/si/{kind}/{YYYY-MM}/{품목키} = { i, s, q, m }                    ← 품목 수량(재고 맞추기)
//   /main/Ez/meta/{kind} = { from, to, at, by, rows, file }                    ← 올린 자료 범위 → '다음엔 ○일부터' 안내
//   kind: sale 매출 · buy 매입 · col 수금 · pay 지급
//   올리기 = 그 엑셀의 '검색기간' 안에 있는 줄을 통째로 이지판매 최신으로 바꿔 씀 (겹치게 올려도 두 번 안 잡힘)
//   ⚠ 공개 코드 — 고객 이름·금액은 DB에만
var EZ = { s: null, si: null, meta: null, R: {}, loading: 0, kind: "sale", y: "", q: "", sel: "", sort: "m" };
var EZ_K = {
  sale: { nm: "매출", who: "매출처", amt: "매출합계", money: "col", ic: "📤", c: "#1d4ed8" },
  buy:  { nm: "매입", who: "매입처", amt: "매입합계", money: "pay", ic: "📥", c: "#b45309" },
  col:  { nm: "수금", who: "매출처", ic: "💵", c: "#16a34a" },
  pay:  { nm: "지급", who: "매입처", ic: "💸", c: "#dc2626" }
};
function _ezRef(p){ return fbDb.ref("/main/Ez" + (p ? "/" + p : "")); }
function _ezCan(){ return !!ME && (ME.r === "super" || ME.r === "admin"); }
function _ezN(v){ var n = Number(String(v == null ? "" : v).replace(/[,원\s]/g, "")); return isFinite(n) ? n : 0; }
function _ezW(n){ return Math.round(n).toLocaleString("ko-KR"); }
function _ezKey(s){ return String(s == null || s === "" ? "(없음)" : s).replace(/[.#$\[\]\/\x00-\x1f\x7f]/g, "_").slice(0, 200); }   // DB 칸 이름에 못 쓰는 글자만 바꿈
function _ezToday(){ return typeof _bsToday === "function" ? _bsToday() : new Date().toISOString().slice(0, 10); }
function _ezB(bg, lb, on, ex){ return '<button class="btn" style="background:' + bg + ';color:#fff;font-weight:800;' + (ex || "") + '" onclick="' + on + '">' + lb + '</button>'; }
function _ezAddDay(dt, n){ var d = new Date(dt + "T00:00:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function _ezLoad(){
  if(EZ.loading) return; EZ.loading = 1;
  Promise.all(["s", "si", "meta"].map(function(p){ return _ezRef(p).once("value"); })).then(function(a){ EZ.s = a[0].val() || {}; EZ.si = a[1].val() || {}; EZ.meta = a[2].val() || {}; EZ.loading = 0; if(/^ez/.test(CTAB)) draw(); })
    .catch(function(e){ EZ.loading = 0; toast("이지판매 자료 불러오기 실패: " + e.message, true); });
}
function _ezWait(){ if(EZ.s) return ""; _ezLoad(); return '<div class="card"><div class="mut">📡 이지판매 자료 불러오는 중...</div></div>'; }
// 한 달 줄 불러오기 (캐시)
function _ezMonth(kind, ym){
  EZ.R[kind] = EZ.R[kind] || {}; if(EZ.R[kind][ym]) return Promise.resolve(EZ.R[kind][ym]);
  return _ezRef("r/" + kind + "/" + ym).once("value").then(function(s){ return (EZ.R[kind][ym] = s.val() || {}); });
}

// ── 올린 범위 · 다음 안내 ──
function _ezNextTxt(kind){
  var m = (EZ.meta || {})[kind];
  var yd = _ezAddDay(_ezToday(), -1), md = function(d){ return esc(d.slice(5).replace("-", "/")) + '(' + "일월화수목금토"[new Date(d + "T00:00:00").getDay()] + ')'; };   // 오늘 것은 아직 입력 중 → 어제까지
  if(!m) return '<span style="color:#b91c1c;font-weight:800">아직 안 올림 — 처음엔 기간을 <b>2000-01-01 ~ ' + md(yd) + '(어제)</b>로 뽑아서 올리세요</span>';
  var nx = _ezAddDay(m.to, 1);
  var top = '올린 자료 <b>' + esc(m.from) + ' ~ ' + esc(m.to) + '</b> <span class="mut">(' + esc(String(m.at || "").slice(5, 16)) + ' ' + esc(m.by || "") + ')</span><br>';
  if(nx > yd) return top + '<span style="color:#16a34a;font-weight:800">✔ 어제까지 다 올라와 있어요</span> <span class="mut">(내일 ' + md(nx) + '부터 올리면 돼요)</span>';
  return top + '👉 다음엔 <b style="color:#b91c1c;font-size:15px">' + md(nx) + '부터 ' + md(yd) + '(어제)까지</b> 뽑아서 올리세요';
}

// ════════ 화면 ① 올리기 ════════
function dEzUp(){
  var w = _ezWait(); if(w) return w;
  var h = '<div class="card" style="margin-bottom:10px;background:#eff6ff;border:1px solid #bfdbfe"><b style="font-size:18px;color:#1d4ed8">📒 이지판매 자료 올리기</b><div class="mut" style="font-size:12.5px;margin-top:2px">이지판매에서 [출 력] → 엑셀로 뽑은 파일을 그대로 올려요 · 엑셀에 적힌 <b>검색기간</b> 안의 자료는 이지판매 최신으로 통째로 바뀌어요 (겹쳐 올려도 두 번 안 잡힘)</div>';
  h += '<div style="margin-top:10px">' + _ezB("#1d4ed8", "📤 엑셀 올리기", "ezPick()", "padding:9px 18px;font-size:15px") + ' <span class="mut" style="font-size:12px">여러 개 한꺼번에 골라도 돼요 · 무슨 자료인지 저절로 알아봐요</span></div></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px">';
  [["sale", "매출명세서"], ["buy", "매입명세서"], ["col", "수금현황"], ["pay", "지급현황"]].forEach(function(x){ var K = EZ_K[x[0]];
    h += '<div class="card" style="margin:0;border-left:5px solid ' + K.c + '"><b style="font-size:15px;color:' + K.c + '">' + K.ic + ' ' + K.nm + '</b> <span class="mut" style="font-size:12px">이지판매 「' + x[1] + '」</span><div style="font-size:13px;margin-top:6px;line-height:1.6">' + _ezNextTxt(x[0]) + '</div></div>'; });
  h += '</div><div class="card mut" style="font-size:12.5px;margin-top:10px;line-height:1.7">· 뽑는 법: 이지판매 → 해당 화면 → 기간 고르기 (거래처는 <b>모든 거래처</b>) → [출 력] → 엑셀 저장<br>· <b>오늘 것은 빼고 어제까지</b> — 오늘 전표는 아직 다 안 넣었을 수 있어서 재고가 틀어져요<br>· 지난 날 전표를 나중에 고쳤으면 그 날부터 다시 뽑아 올리면 그 기간이 새로 바뀌어요</div>';
  return h;
}
function ezPick(){ var i = document.createElement("input"); i.type = "file"; i.accept = ".xlsx"; i.multiple = true; i.onchange = function(){ if(i.files.length) ezRead(Array.prototype.slice.call(i.files)); }; i.click(); }
function _ezCell(c){ var v = c && c.value; if(v && typeof v === "object" && !(v instanceof Date)){ if(v.richText) v = v.richText.map(function(x){ return x.text; }).join(""); else if(v.result !== undefined) v = v.result; else if(v.text != null) v = v.text; else v = ""; } return v == null ? "" : v; }
function _ezDt(v){ if(v instanceof Date) return new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10); var m = String(v).trim().match(/^(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/); return m ? m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2) : ""; }
// 머리줄 → 종류·칸
function _ezHead(H){
  var f = function(re){ for(var i = 0; i < H.length; i++) if(re.test(H[i])) return i; return -1; };
  var o = { d: f(/^(매출|매입|수금|지급)?일자$|^날짜$/), c: f(/^(매출처|매입처|거래처)|고객/), i: f(/^품목명$/), s: f(/^규격$/), s2: f(/^상세규격$/), u: f(/^단위$/), g: f(/^구분$/), q: f(/^수량$/), p: f(/^단가$/), a: f(/^공급가액$/), t: f(/^세액$/), n: f(/^전표번호$/), mo: f(/^메모$/), jm: f(/^전표메모$/) };
  var hs = H.join("|"), kind = "";
  if(/매출일자/.test(hs) && o.i >= 0){ kind = "sale"; o.m = f(/^매출합계$/); }
  else if(/매입일자/.test(hs) && o.i >= 0){ kind = "buy"; o.m = f(/^매입합계$/); }
  else if(/수금/.test(hs)){ kind = "col"; o.m = f(/^수금액$|^수금합계$|^금액$|^합계$/); }
  else if(/지급/.test(hs)){ kind = "pay"; o.m = f(/^지급액$|^지급합계$|^금액$|^합계$/); }
  if(o.d < 0 || o.c < 0 || o.m < 0) kind = "";
  return { kind: kind, col: o };
}
async function ezRead(files){
  var EJ; showLoading("엑셀 읽는 중... (큰 파일은 1분쯤)"); try { EJ = await _loadExcelJS(); } catch(e){ hideLoading(); return toast(e.message, true); }
  var out = [], bad = [];
  for(var fi = 0; fi < files.length; fi++){
    var wb = new EJ.Workbook(); try { await wb.xlsx.load(await files[fi].arrayBuffer()); } catch(e){ bad.push(files[fi].name + ": 못 읽음"); continue; }
    var ws = wb.worksheets[0], hr = 0, HD = null, from = "", to = "";
    for(var r = 1; r <= Math.min(10, ws.rowCount) && !hr; r++){ var row = ws.getRow(r), H = [];
      row.eachCell({ includeEmpty: true }, function(c, n){ H[n - 1] = String(_ezCell(c)).replace(/\s+/g, ""); });
      var pm = H.join(" ").match(/검색기간:?(\d{4}-\d{2}-\d{2})부터(\d{4}-\d{2}-\d{2})까지/); if(pm){ from = pm[1]; to = pm[2]; }
      var hd = _ezHead(H); if(hd.kind){ hr = r; HD = hd; } }
    if(!HD){ bad.push(files[fi].name + ": 무슨 자료인지 모르겠어요 (매출명세서·매입명세서·수금·지급 현황만)"); continue; }
    var C = HD.col, rows = [], seq = {}, mn = "", mx = "";
    for(var r2 = hr + 1; r2 <= ws.rowCount; r2++){ var R = ws.getRow(r2), g = function(k){ return C[k] >= 0 ? _ezCell(R.getCell(C[k] + 1)) : ""; };
      var d = _ezDt(g("d")); if(!d) continue;   // (누계)·빈 줄 건너뜀
      var x = { d: d, c: String(g("c")).trim() };
      ["i", "s", "s2", "u", "g", "mo", "jm", "n"].forEach(function(k){ var v = String(g(k)).trim(); if(v) x[k] = v; });
      ["q", "p", "a", "t", "m"].forEach(function(k){ var v = _ezN(g(k)); if(v) x[k] = v; });
      var nk = x.n || d.replace(/-/g, ""); seq[nk] = (seq[nk] || 0) + 1; x._k = _ezKey(nk) + "_" + ("00" + seq[nk]).slice(-3);
      rows.push(x); if(!mn || d < mn) mn = d; if(!mx || d > mx) mx = d; }
    if(!from){ from = mn; to = mx; }
    out.push({ file: files[fi].name, kind: HD.kind, from: from, to: to, rows: rows });
  }
  hideLoading(); EZ.up = out;
  if(!out.length) return toast("올릴 자료를 못 찾았어요" + (bad.length ? " — " + bad[0] : ""), true);
  var h = '<h3 style="margin:0 0 8px">📤 이지판매 자료 — 미리 보기</h3><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f1f5f9"><th style="padding:6px;text-align:left">파일</th><th style="padding:6px">종류</th><th style="padding:6px">기간 (이 안은 새로 바꿈)</th><th style="padding:6px;text-align:right">줄</th><th style="padding:6px;text-align:right">거래처</th><th style="padding:6px;text-align:right">합계</th></tr>';
  out.forEach(function(o){ var K = EZ_K[o.kind], cs = {}, sm = 0; o.rows.forEach(function(x){ cs[x.c] = 1; sm += x.m || 0; });
    h += '<tr><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;font-size:12px">' + esc(o.file) + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:800;color:' + K.c + '">' + K.ic + ' ' + K.nm + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:center">' + esc(o.from) + ' ~ ' + esc(o.to) + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800">' + _ezW(o.rows.length) + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ezW(Object.keys(cs).length) + '</td><td style="padding:5px 6px;border-bottom:1px solid #f1f5f9;text-align:right">' + _ezW(sm) + '</td></tr>'; });
  h += '</table>' + (bad.length ? '<div style="color:#b91c1c;font-size:12px;margin-top:6px">' + bad.map(esc).join("<br>") + '</div>' : '');
  if(out.some(function(o){ return o.to >= _ezToday(); })) h += '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:6px 10px;font-size:12.5px;margin-top:8px">⚠ <b>오늘 날짜까지</b> 들어 있어요 — 오늘 전표를 아직 다 안 넣었으면 재고가 틀어질 수 있어요. 다 넣은 뒤 다시 올리면 오늘 것도 새로 바뀌어요.</div>';
  h += '<div class="mut" style="font-size:12px;margin-top:8px">기간 안에 이미 있던 자료는 지우고 이 엑셀로 바꿔요 · 기간 밖은 그대로</div><div style="display:flex;gap:6px;justify-content:flex-end;margin-top:12px">' + _ezB("#475569", "닫기", "closePopup()") + _ezB("#16a34a", "올리기", "ezSave()", "padding:8px 18px") + '</div>';
  openPopup(h, 680);
}
// 달마다: 기간 밖 기존 줄 + 새 줄 → 그 달 통째로 다시 씀, 요약도 다시 계산
async function ezSave(){
  var L = EZ.up || []; if(!L.length) return; closePopup(); showLoading("올리는 중...");
  try {
    for(var li = 0; li < L.length; li++){ var o = L[li], k = o.kind, byM = {};
      o.rows.forEach(function(x){ var ym = x.d.slice(0, 7); (byM[ym] = byM[ym] || []).push(x); });
      var have = Object.keys((EZ.s || {})[k] || {}), months = {};   // 이미 자료 있는 달 중 기간에 걸친 달 + 새 줄 있는 달
      have.forEach(function(ym){ if(ym >= o.from.slice(0, 7) && ym <= o.to.slice(0, 7)) months[ym] = 1; }); Object.keys(byM).forEach(function(ym){ months[ym] = 1; });
      var ms = Object.keys(months).sort();
      for(var bi = 0; bi < ms.length; bi += 12){ var up = {}, part = ms.slice(bi, bi + 12);   // 1년치씩
        for(var mi = 0; mi < part.length; mi++){ var ym = part[mi], old = (EZ.s[k] || {})[ym] ? await _ezMonth(k, ym) : {}, M = {};
          Object.keys(old).forEach(function(rk){ var x = old[rk]; if(x.d < o.from || x.d > o.to) M[rk] = x; });
          (byM[ym] || []).forEach(function(x){ var y = Object.assign({}, x); delete y._k; M[x._k] = y; });
          var S = {}, SI = {}; Object.keys(M).forEach(function(rk){ var x = M[rk], ck = _ezKey(x.c), s0 = S[ck] = S[ck] || { c: x.c, n: 0, m: 0, q: 0 }; s0.n++; s0.m += x.m || 0; s0.q += x.q || 0;
            if(x.i){ var ik = _ezKey(x.i + (x.s ? "|" + x.s : "")), t0 = SI[ik] = SI[ik] || { i: x.i, s: x.s || "", q: 0, m: 0 }; t0.q += x.q || 0; t0.m += x.m || 0; } });
          var e = !Object.keys(M).length; up["r/" + k + "/" + ym] = e ? null : M; up["s/" + k + "/" + ym] = e ? null : S; up["si/" + k + "/" + ym] = e || !Object.keys(SI).length ? null : SI;
          EZ.R[k] = EZ.R[k] || {}; EZ.R[k][ym] = M; }
        showLoading("올리는 중... " + EZ_K[k].nm + " " + part[0] + "~"); await _ezRef().update(up); }
      var m0 = (EZ.meta || {})[k] || {}, from = m0.from && m0.from < o.from ? m0.from : o.from, to = m0.to && m0.to > o.to ? m0.to : o.to;
      var meta = { from: from, to: to, at: new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16), by: (ME && (ME.nm || ME.id)) || "", rows: o.rows.length, file: o.file, last: o.from + "~" + o.to };
      await _ezRef("meta/" + k).set(meta); await _ezRef("log").push(meta);
    }
    hideLoading(); EZ.s = null; EZ.up = null; toast("📒 이지판매 자료 올렸어요"); _ezLoad();
  } catch(e){ hideLoading(); toast("올리기 실패: " + e.message, true); }
}

// ════════ 화면 ② 거래처 (매출처 / 매입처) ════════
function _ezYears(){ var ys = {}; ["sale", "buy"].forEach(function(k){ Object.keys((EZ.s || {})[k] || {}).forEach(function(ym){ ys[ym.slice(0, 4)] = 1; }); }); return Object.keys(ys).sort().reverse(); }
function _ezCust(kind){   // 거래처별 합계 {ck: {c, n, m, pay, last}}
  var K = EZ_K[kind], o = {}, yy = EZ.y;
  Object.keys((EZ.s || {})[kind] || {}).forEach(function(ym){ if(yy && ym.slice(0, 4) !== yy) return; var S = EZ.s[kind][ym]; Object.keys(S).forEach(function(ck){ var x = S[ck], t = o[ck] = o[ck] || { c: x.c, n: 0, m: 0, pay: 0, last: "" }; t.n += x.n; t.m += x.m; if(ym > t.last) t.last = ym; }); });
  Object.keys((EZ.s || {})[K.money] || {}).forEach(function(ym){ if(yy && ym.slice(0, 4) !== yy) return; var S = EZ.s[K.money][ym]; Object.keys(S).forEach(function(ck){ var x = S[ck], t = o[ck] = o[ck] || { c: x.c, n: 0, m: 0, pay: 0, last: "" }; t.pay += x.m; if(ym > t.last) t.last = ym; }); });
  return o;
}
function dEzSale(){ return _ezList("sale"); }
function dEzBuy(){ return _ezList("buy"); }
function _ezList(kind){
  var w = _ezWait(); if(w) return w;
  var K = EZ_K[kind], MK = EZ_K[K.money], mob = window.innerWidth < 760;
  if(EZ.sel && EZ.kind === kind) return _ezLedger(kind, EZ.sel);
  EZ.kind = kind;
  var h = '<div class="card" style="margin-bottom:10px;border-left:5px solid ' + K.c + '"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><b style="font-size:18px;color:' + K.c + '">' + K.ic + ' ' + K.who + ' (이지판매)</b><div class="mut" style="font-size:12px">' + (EZ.meta && EZ.meta[kind] ? esc(EZ.meta[kind].from) + ' ~ ' + esc(EZ.meta[kind].to) + ' 올린 자료 기준' : '아직 안 올림') + (EZ.meta && !EZ.meta[K.money] ? ' · ' + MK.nm + ' 자료 아직 없음 (잔액은 ' + MK.nm + '현황 올리면 나와요)' : '') + '</div></div>' + _ezB("#475569", "📤 올리기", "CTAB='ezUp';draw()", "padding:5px 12px") + '</div>';
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px">' + [""].concat(_ezYears()).map(function(y){ var on = (EZ.y || "") === y; return '<button class="btn" onclick="EZ.y=\'' + y + '\';draw()" style="padding:4px 11px;font-size:13px;font-weight:800;background:' + (on ? K.c : "#fff") + ';color:' + (on ? "#fff" : K.c) + ';border:1.5px solid ' + K.c + '">' + (y ? y + "년" : "전체") + '</button>'; }).join("") + '</div></div>';
  var O = _ezCust(kind), q = String(EZ.q || "").replace(/\s/g, "").toLowerCase(), ks = Object.keys(O);
  var tot = { m: 0, pay: 0 }; ks.forEach(function(k){ tot.m += O[k].m; tot.pay += O[k].pay; });
  if(q) ks = ks.filter(function(k){ return O[k].c.replace(/\s/g, "").toLowerCase().indexOf(q) >= 0; });
  var so = EZ.sort; ks.sort(function(a, b){ var x = O[a], y = O[b]; return so === "nm" ? x.c.localeCompare(y.c) : so === "bal" ? (y.m - y.pay) - (x.m - x.pay) : so === "last" ? y.last.localeCompare(x.last) : y.m - x.m; });
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + [[K.nm + " 합계", tot.m, K.c], [MK.nm + " 합계", tot.pay, MK.c], [kind === "sale" ? "받을 돈" : "줄 돈", tot.m - tot.pay, "#b91c1c"]].map(function(b){ return '<div style="flex:1;min-width:130px;background:#fff;border:1.5px solid ' + b[2] + ';border-radius:10px;padding:7px 10px"><div style="font-size:12px;color:#475569;font-weight:700">' + b[0] + '</div><div style="font-size:' + (mob ? 17 : 20) + 'px;font-weight:900;color:' + b[2] + '">' + _ezW(b[1]) + '</div></div>'; }).join("") + '</div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><input type="search" id="ezQ" placeholder="🔍 거래처 이름" value="' + esc(EZ.q || "") + '" oninput="EZ.q=this.value;clearTimeout(EZ.qT);EZ.qT=setTimeout(function(){draw();var e=document.getElementById(\'ezQ\');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}},300)" style="flex:1;min-width:180px;max-width:320px;padding:7px 10px;font-size:15px;border:2px solid #cbd5e1;border-radius:8px">';
  h += [["m", K.nm + " 많은 순"], ["bal", "잔액 많은 순"], ["last", "최근 거래 순"], ["nm", "이름 순"]].map(function(x){ var on = so === x[0]; return '<button class="btn" onclick="EZ.sort=\'' + x[0] + '\';draw()" style="padding:4px 9px;font-size:12px;font-weight:800;background:' + (on ? "#334155" : "#fff") + ';color:' + (on ? "#fff" : "#334155") + ';border:1px solid #334155">' + x[1] + '</button>'; }).join("") + '<span class="mut" style="font-size:12px">' + _ezW(ks.length) + '곳</span></div>';
  if(!ks.length) return h + '<div class="card mut" style="text-align:center;padding:20px">' + (Object.keys(O).length ? '찾는 거래처가 없어요' : '아직 자료가 없어요 — 📤 올리기에서 이지판매 엑셀을 올려 주세요') + '</div>';
  var lim = EZ.lim || 200, more = ks.length > lim; ks = ks.slice(0, lim);
  h += '<div class="card" style="padding:0;overflow:hidden">' + ks.map(function(k){ var x = O[k], bal = x.m - x.pay;
    return '<div onclick="EZ.sel=\'' + esc(k).replace(/'/g, "\\'") + '\';EZ.kind=\'' + kind + '\';draw();scrollTo(0,0)" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;flex-wrap:wrap"><b style="flex:1;min-width:140px;font-size:15px">' + esc(x.c) + '</b><span class="mut" style="font-size:11.5px">' + x.n + '줄 · 최근 ' + esc(x.last.replace("-", ".")) + '</span><span style="min-width:110px;text-align:right;font-size:13px">' + K.nm + ' <b>' + _ezW(x.m) + '</b></span>' + (x.pay ? '<span style="min-width:100px;text-align:right;font-size:12.5px;color:' + MK.c + '">' + MK.nm + ' ' + _ezW(x.pay) + '</span>' : '') + '<b style="min-width:100px;text-align:right;color:' + (bal > 0 ? "#b91c1c" : "#475569") + '">' + _ezW(bal) + '</b></div>'; }).join("") + '</div>';
  if(more) h += '<div style="text-align:center;margin-top:8px">' + _ezB("#475569", "더 보기 (" + _ezW(Object.keys(O).length - lim) + "곳 더)", "EZ.lim=(EZ.lim||200)+300;draw()") + '</div>';
  return h;
}
// 원장 — 그 거래처가 나오는 달만 불러옴
function _ezLedger(kind, ck){
  var K = EZ_K[kind], MK = EZ_K[K.money], ms = {}, nm = "";
  [kind, K.money].forEach(function(k){ Object.keys((EZ.s || {})[k] || {}).forEach(function(ym){ var x = EZ.s[k][ym][ck]; if(x){ ms[k + "|" + ym] = 1; nm = x.c; } }); });
  var need = Object.keys(ms).filter(function(p){ var a = p.split("|"); return !(EZ.R[a[0]] || {})[a[1]]; });
  var head = '<div class="card" style="margin-bottom:10px;border-left:5px solid ' + K.c + '"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap"><div>' + _ezB("#475569", "← 목록", "EZ.sel='';draw()", "padding:4px 10px;font-size:12.5px") + ' <b style="font-size:18px;margin-left:6px">' + esc(nm || ck) + '</b> <span class="mut" style="font-size:12px">' + K.who + ' 원장 (이지판매)</span></div>' + _ezB("#334155", "🖨 인쇄", "ezPrint('" + kind + "')", "padding:4px 10px;font-size:12.5px") + '</div></div>';
  if(need.length){ if(!EZ.ldg){ EZ.ldg = 1; Promise.all(need.map(function(p){ var a = p.split("|"); return _ezMonth(a[0], a[1]); })).then(function(){ EZ.ldg = 0; draw(); }).catch(function(e){ EZ.ldg = 0; toast(e.message, true); }); }
    return head + '<div class="card mut">📡 ' + need.length + '달치 불러오는 중...</div>'; }
  var L = [];
  Object.keys(ms).forEach(function(p){ var a = p.split("|"), M = EZ.R[a[0]][a[1]] || {}; Object.keys(M).forEach(function(rk){ var x = M[rk]; if(_ezKey(x.c) === ck) L.push({ k: a[0], rk: rk, x: x }); }); });
  L.sort(function(a, b){ return a.x.d.localeCompare(b.x.d) || (a.k === kind ? 0 : 1) - (b.k === kind ? 0 : 1) || String(a.rk).localeCompare(String(b.rk), "ko", { numeric: true }); });
  if(EZ.y) L = L.filter(function(o){ return o.x.d.slice(0, 4) === EZ.y; });
  EZ.L = { kind: kind, nm: nm || ck, L: L };
  var bal = 0, sm = 0, pm = 0, mob = window.innerWidth < 760, lastN = "", h = head;
  if(EZ.y) h += '<div class="mut" style="font-size:12px;margin:-4px 0 8px">' + esc(EZ.y) + '년만 보는 중 — 잔액은 이 해 안에서만 계산 · ' + '<a href="javascript:void 0" onclick="EZ.y=\'\';draw()">전체 보기</a></div>';
  var rowsH = L.map(function(o){ var x = o.x, isM = o.k !== kind, am = isM ? 0 : (x.m || 0), py = isM ? (x.m || 0) : 0; bal += am - py; sm += am; pm += py;
    var first = isM || (x.n || "") !== lastN; lastN = isM ? "" : (x.n || "");
    if(mob) return '<div style="padding:6px 10px;border-bottom:1px solid #f1f5f9;' + (isM ? "background:#f0fdf4" : "") + '"><div style="display:flex;gap:6px;align-items:baseline"><b style="font-size:12.5px;min-width:78px;color:' + (first ? "#0f172a" : "#cbd5e1") + '">' + esc(x.d.slice(2).replace(/-/g, ".")) + '</b><span style="flex:1;font-size:14px;font-weight:700">' + (isM ? '<span style="color:' + MK.c + '">' + MK.ic + ' ' + MK.nm + '</span>' : esc(x.i || "") + (x.s ? ' <span class="mut" style="font-size:11.5px">' + esc(x.s) + '</span>' : '')) + '</span><b style="font-size:13px;color:#b91c1c">' + _ezW(bal) + '</b></div><div style="font-size:12px;color:#475569;margin-left:84px">' + (isM ? '<b style="color:' + MK.c + '">' + _ezW(py) + '</b>' : (x.q ? _ezW(x.q) + ' × ' + _ezW(x.p || 0) + ' = ' : '') + '<b>' + _ezW(am) + '</b>' + (x.t ? ' (세 ' + _ezW(x.t) + ')' : '')) + (x.mo || x.jm ? ' · ' + esc([x.mo, x.jm].filter(Boolean).join(" ")) : '') + '</div></div>';
    var td = function(v, a, ex){ return '<td style="padding:4px 7px;border-bottom:1px solid #f1f5f9;text-align:' + (a || "left") + ';white-space:nowrap;' + (ex || "") + '">' + v + '</td>'; };
    return '<tr style="' + (isM ? "background:#f0fdf4" : first ? "border-top:2px solid #e2e8f0" : "") + '">' + td(first ? esc(x.d) : '', '', "color:#334155") + td(isM ? '' : esc(x.n || ""), "center", "color:#94a3b8;font-size:11.5px") + td(isM ? '<b style="color:' + MK.c + '">' + MK.ic + ' ' + MK.nm + '</b>' : '<b>' + esc(x.i || "") + '</b>', '', "white-space:normal") + td(esc([x.s, x.s2].filter(Boolean).join(" ")), '', "font-size:12px;color:#64748b") + td(x.q ? _ezW(x.q) : '', "right") + td(x.p ? _ezW(x.p) : '', "right") + td(x.a ? _ezW(x.a) : '', "right") + td(x.t ? _ezW(x.t) : '', "right") + td(am ? '<b>' + _ezW(am) + '</b>' : '', "right") + td(py ? '<b style="color:' + MK.c + '">' + _ezW(py) + '</b>' : '', "right") + td('<b style="color:' + (bal > 0 ? "#b91c1c" : "#475569") + '">' + _ezW(bal) + '</b>', "right") + td(esc([x.g && x.g !== "매출" && x.g !== "매입" ? "[" + x.g + "]" : "", x.mo, x.jm].filter(Boolean).join(" ")), '', "font-size:12px;color:#64748b;white-space:normal") + '</tr>'; }).join("");
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + [[K.nm, sm, K.c], [MK.nm, pm, MK.c], [kind === "sale" ? "받을 돈" : "줄 돈", sm - pm, "#b91c1c"]].map(function(b){ return '<div style="flex:1;min-width:120px;background:#fff;border:1.5px solid ' + b[2] + ';border-radius:10px;padding:6px 10px"><div style="font-size:12px;color:#475569;font-weight:700">' + b[0] + '</div><div style="font-size:18px;font-weight:900;color:' + b[2] + '">' + _ezW(b[1]) + '</div></div>'; }).join("") + '</div>';
  if(!L.length) return h + '<div class="card mut">자료가 없어요</div>';
  if(mob) return h + '<div class="card" style="padding:0;overflow:hidden">' + rowsH + '</div>';
  var th = function(t, a){ return '<th style="padding:6px 7px;background:' + K.c + ';color:#fff;font-size:12.5px;white-space:nowrap;text-align:' + (a || "left") + '">' + t + '</th>'; };
  return h + '<div class="card" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>' + th("날짜") + th("전표", "center") + th("품목") + th("규격") + th("수량", "right") + th("단가", "right") + th("공급가액", "right") + th("세액", "right") + th(K.nm, "right") + th(MK.nm, "right") + th("잔액", "right") + th("메모") + '</tr></thead><tbody>' + rowsH + '</tbody></table></div>';
}
function ezPrint(kind){
  var o = EZ.L; if(!o || !o.L.length) return toast("인쇄할 줄이 없어요", true);
  var K = EZ_K[kind], MK = EZ_K[K.money], cs = "border:1px solid #333;padding:3px 5px;font-size:9.5pt;", hs = cs + "background:#e5e7eb;font-weight:bold;text-align:center;", bal = 0, lastN = "";
  var h = '<div style="font-family:\'Malgun Gothic\',sans-serif;color:#000"><h2 style="text-align:center;margin:0 0 4px;font-size:16pt">' + esc(o.nm) + ' — ' + K.who + ' 원장</h2><div style="text-align:center;font-size:9.5pt;margin-bottom:8px">이지판매 자료 · ' + esc(o.L[0].x.d) + ' ~ ' + esc(o.L[o.L.length - 1].x.d) + '</div>';
  h += '<table style="width:100%;border-collapse:collapse"><tr>' + ["날짜", "품목", "규격", "수량", "단가", K.nm, MK.nm, "잔액"].map(function(t){ return '<th style="' + hs + '">' + t + '</th>'; }).join("") + '</tr>';
  o.L.forEach(function(r){ var x = r.x, isM = r.k !== kind, am = isM ? 0 : (x.m || 0), py = isM ? (x.m || 0) : 0, first = isM || (x.n || "") !== lastN; lastN = isM ? "" : (x.n || ""); bal += am - py;
    h += '<tr><td style="' + cs + 'white-space:nowrap">' + (first ? esc(x.d) : '') + '</td><td style="' + cs + '">' + (isM ? MK.nm : esc(x.i || "")) + '</td><td style="' + cs + '">' + esc(x.s || "") + '</td><td style="' + cs + 'text-align:right">' + (x.q ? _ezW(x.q) : '') + '</td><td style="' + cs + 'text-align:right">' + (x.p ? _ezW(x.p) : '') + '</td><td style="' + cs + 'text-align:right">' + (am ? _ezW(am) : '') + '</td><td style="' + cs + 'text-align:right">' + (py ? _ezW(py) : '') + '</td><td style="' + cs + 'text-align:right;font-weight:bold">' + _ezW(bal) + '</td></tr>'; });
  h += '</table></div>';
  if(typeof _docPrint === "function") _docPrint({ title: o.nm + " " + K.who + " 원장", html: h, key: "gm_ezPrint" });
}

// ════════ 화면 ③ 품목 수량 — 매입 − 매출 = 계산 재고 (이지판매 재고현황과 맞춰 보기) ════════
function dEzItem(){
  var w = _ezWait(); if(w) return w;
  var O = {}, yy = EZ.y, add = function(k, f){ Object.keys((EZ.si || {})[k] || {}).forEach(function(ym){ if(yy && ym.slice(0, 4) !== yy) return; var S = EZ.si[k][ym]; Object.keys(S).forEach(function(ik){ var x = S[ik], t = O[ik] = O[ik] || { i: x.i, s: x.s, buy: 0, sale: 0, bm: 0, sm: 0 }; t[f] += x.q; t[f === "buy" ? "bm" : "sm"] += x.m; }); }); };
  add("buy", "buy"); add("sale", "sale");
  var q = String(EZ.q || "").replace(/\s/g, "").toLowerCase(), ks = Object.keys(O).filter(function(k){ return !q || (O[k].i + O[k].s).replace(/\s/g, "").toLowerCase().indexOf(q) >= 0; }).sort(function(a, b){ return O[b].sale + O[b].buy - O[a].sale - O[a].buy; });
  var h = '<div class="card" style="margin-bottom:10px;border-left:5px solid #7c3aed"><b style="font-size:18px;color:#7c3aed">📦 품목 수량 (이지판매)</b><div class="mut" style="font-size:12px">들어온 수량(매입) − 나간 수량(매출·출고사용·원료사용 포함) = 계산 재고 · <b>올린 날(' + esc(((EZ.meta || {}).sale || {}).to || "-") + ')까지 기준</b> · 이지판매 재고현황과 다르면 빠진 전표·재고조정 확인' + (EZ.meta && !EZ.meta.buy ? ' · <b style="color:#b91c1c">매입명세서 아직 없음</b>' : '') + '</div>';
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;align-items:center">' + [""].concat(_ezYears()).map(function(y){ var on = (EZ.y || "") === y; return '<button class="btn" onclick="EZ.y=\'' + y + '\';draw()" style="padding:4px 11px;font-size:13px;font-weight:800;background:' + (on ? "#7c3aed" : "#fff") + ';color:' + (on ? "#fff" : "#7c3aed") + ';border:1.5px solid #7c3aed">' + (y ? y + "년" : "전체") + '</button>'; }).join("") + '<input type="search" id="ezQ" placeholder="🔍 품목" value="' + esc(EZ.q || "") + '" oninput="EZ.q=this.value;clearTimeout(EZ.qT);EZ.qT=setTimeout(function(){draw();var e=document.getElementById(\'ezQ\');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}},300)" style="margin-left:6px;padding:5px 9px;font-size:14px;border:2px solid #cbd5e1;border-radius:8px;min-width:150px"></div></div>';
  if(!ks.length) return h + '<div class="card mut" style="text-align:center;padding:20px">자료가 없어요</div>';
  var th = function(t, a){ return '<th style="padding:6px 8px;background:#7c3aed;color:#fff;font-size:12.5px;text-align:' + (a || "left") + '">' + t + '</th>'; }, td = function(v, a, ex){ return '<td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:' + (a || "left") + ';' + (ex || "") + '">' + v + '</td>'; };
  return h + '<div class="card" style="padding:0;overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:13.5px"><thead><tr>' + th("품목") + th("규격") + th("들어옴(매입)", "right") + th("나감(매출)", "right") + th("계산 재고", "right") + th("매출 금액", "right") + '</tr></thead><tbody>' + ks.map(function(k){ var x = O[k], st = x.buy - x.sale; return '<tr>' + td('<b>' + esc(x.i) + '</b>') + td(esc(x.s || ""), "", "color:#64748b;font-size:12.5px") + td(x.buy ? _ezW(x.buy) : '-', "right") + td(x.sale ? _ezW(x.sale) : '-', "right") + td('<b style="color:' + (st < 0 ? "#b91c1c" : "#0f172a") + '">' + _ezW(st) + '</b>', "right") + td(x.sm ? _ezW(x.sm) : '', "right", "color:#64748b") + '</tr>'; }).join("") + '</tbody></table></div>';
}
