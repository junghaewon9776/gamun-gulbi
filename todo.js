// ════════ 📅 해야 할 일 — 매일·매주·매월·매년·한 번 · 언제 뭐 해야 하는지 + 알림 ════════
//   /main/Todo = { tasks:{id:{nm, cat, freq:'day'|'week'|'month'|'year'|'once', wd(0=월~6=일), md(1~31, 0=말일), mon, day, dt(한 번), lead(며칠 전부터 알림), note, off, ord}},
//                  done:{id:{기간키:{at, by}}} }   기간키: 매일 YYYY-MM-DD · 매주 그 주 월요일 · 매월 YYYY-MM · 매년 YYYY · 한 번 "1"
//   알림: ① 홈페이지 — 로그인해 있으면 왼쪽 아래 📅 버튼(할 일 수) + 하루 한 번 브라우저 알림
//         ② 텔레그램 — PC 파일봇이 아침 8시·저녁 6시에 보냄 (같은 계산, 텔레그램파일봇\todo_notify.py)
//   ⚠ 공개 코드 — 사람 이름·전화 같은 건 넣지 말 것 (할 일 내용은 DB에만)
var TD = { D: null, loading: false, f: "" };
function _tdS(){ return TD.D || {}; }
function _tdRef(p){ return fbDb.ref("/main/Todo" + (p ? "/" + p : "")); }
function _tdCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _tdLoad(cb){
  if(TD.loading) return; TD.loading = true;
  _tdRef().once("value").then(function(s){ TD.loading = false; TD.D = s.val() || {}; if(CTAB === "todo") draw(); _tdBadge(); if(cb) cb(); })
    .catch(function(e){ TD.loading = false; });
}
var TD_FREQ = { day: "매일", week: "매주", month: "매월", year: "매년", once: "한 번" };
var TD_WD = ["월", "화", "수", "목", "금", "토", "일"];
var TD_CAT = { "소방": "#dc2626", "위생": "#2563eb", "해썹": "#0f766e", "서류": "#7c2d12", "세금": "#b45309", "기타": "#475569" };
function _tdD(s){ return new Date(s + "T00:00:00"); }
function _tdS2(d){ return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function _tdToday(){ return typeof _bsToday === "function" ? _bsToday() : _tdS2(new Date()); }
function _tdLast(y, m){ return new Date(y, m, 0).getDate(); }   // m = 1~12
// 이번 기간의 {pk 기간키, due 해야 할 날}
function _tdDue(t, today){
  var d = _tdD(today), y = d.getFullYear(), m = d.getMonth() + 1;
  if(t.freq === "day") return { pk: today, due: today };
  if(t.freq === "week"){ var w = (d.getDay() + 6) % 7, mon = new Date(d); mon.setDate(d.getDate() - w); var due = new Date(mon); due.setDate(mon.getDate() + (+t.wd || 0)); return { pk: _tdS2(mon), due: _tdS2(due) }; }
  if(t.freq === "month"){ var em = Math.max(1, +t.every || 1), md = +t.md || 0, idx = y * 12 + m - 1, fb = String(t.from || t.since || "").match(/^(\d{4})-(\d{2})/), bi = fb ? (+fb[1]) * 12 + (+fb[2]) - 1 : idx;
    var ci = idx - (((idx - bi) % em) + em) % em, mkm = function(i){ var yy = Math.floor(i / 12), mm = i % 12 + 1, L = _tdLast(yy, mm); return { pk: yy + "-" + ("0" + mm).slice(-2), due: yy + "-" + ("0" + mm).slice(-2) + "-" + ("0" + (md && md <= L ? md : L)).slice(-2) }; };
    var c = mkm(ci); if(ci !== idx && ((_tdS().done || {})[t._id] || {})[c.pk]) c = mkm(ci + em); return c; }   // 안 한 건 다음 차례까지 '지남'
  if(t.freq === "year"){ var ev = Math.max(1, +t.every || 1), base = +t.from || +String(t.since || "").slice(0, 4) || y, cy = y - (((y - base) % ev) + ev) % ev;   // 그 해(cy)가 이번 차례
    var mk = function(yy){ var mo = +t.mon || 12, L2 = _tdLast(yy, mo), dd = Math.min(+t.day || L2, L2); return yy + "-" + ("0" + mo).slice(-2) + "-" + ("0" + dd).slice(-2); };
    if(cy !== y){ var done0 = ((_tdS().done || {})[t._id] || {})[String(cy)]; if(done0) cy += ev; }   // 안 한 건 다음 차례까지 '지남'   // 차례가 아닌 해 → 다음 차례
    return { pk: String(cy), due: mk(cy) }; }
  return { pk: "1", due: t.dt || today };
}
function _tdLead(t){ return t.lead !== undefined && t.lead !== "" ? +t.lead : ({ day: 0, week: 0, month: 3, year: 30, once: 7 })[t.freq] || 0; }
function _tdDays(a, b){ return Math.round((_tdD(b) - _tdD(a)) / 864e5); }   // b - a
// 상태: done | over(지남) | today | soon(곧) | later
function _tdStat(id, t, today){
  t._id = id; var x = _tdDue(t, today), dn = ((_tdS().done || {})[id] || {})[x.pk], n = _tdDays(today, x.due);
  if(!dn && t.since && x.due < t.since) dn = { at: "", by: "(넣기 전)", skip: 1 };   // 넣기 전에 지난 차례는 안 따짐
  var st = dn ? "done" : n < 0 ? "over" : n === 0 ? "today" : n <= _tdLead(t) ? "soon" : "later";
  return { st: st, pk: x.pk, due: x.due, n: n, dn: dn };
}
function _tdList(today){
  var T = _tdS().tasks || {};
  return Object.keys(T).filter(function(k){ return !T[k].off; }).map(function(k){ var t = T[k], s = _tdStat(k, t, today); return { id: k, t: t, s: s }; });
}
function _tdNow(today){ var o = { over: 0, today: 1, soon: 2 }; return _tdList(today || _tdToday()).filter(function(x){ return x.s.st in o; }).sort(function(a, b){ return o[a.s.st] - o[b.s.st] || a.s.due.localeCompare(b.s.due); }); }
function _tdFreqTxt(t){
  if(t.freq === "week") return "매주 " + TD_WD[+t.wd || 0] + "요일";
  if(t.freq === "month") return (+t.every > 1 ? t.every + "개월마다" + (t.from ? " (" + String(t.from).replace("-", ".") + "부터)" : "") : "매월") + " " + (+t.md ? t.md + "일" : "말일");
  if(t.freq === "year") return (+t.every > 1 ? t.every + "년마다" + (t.from ? " (" + t.from + "년부터)" : "") : "매년") + " " + (+t.mon || 12) + "월 " + (+t.day || "말") + "일";
  if(t.freq === "once") return "한 번 · " + String(t.dt || "").replace(/-/g, ".");
  return "매일";
}
function _tdDueTxt(s){ return s.st === "done" ? (s.dn && s.dn.skip ? "다음 차례부터" : "✔ 했음") : s.n < 0 ? (-s.n) + "일 지남" : s.n === 0 ? "오늘" : "D-" + s.n + " (" + s.due.slice(5).replace("-", "/") + ")"; }
function _tdCatTag(c){ c = c || "기타"; var col = TD_CAT[c] || "#475569"; return '<span style="background:' + col + ';color:#fff;border-radius:5px;padding:1px 7px;font-size:11.5px;font-weight:800;white-space:nowrap">' + esc(c) + '</span>'; }

// ════════ 화면 ════════
function dTodo(){
  if(!TD.D){ _tdLoad(); return '<div class="card"><div class="mut">📡 할 일 불러오는 중...</div></div>'; }
  var today = _tdToday(), can = _tdCan(), T = _tdS().tasks || {}, N = _tdNow(today);
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><strong style="font-size:18px">📅 해야 할 일</strong> <span class="mut" style="font-size:12px;margin-left:6px">매일·매주·매월·매년 할 일 — 했으면 ✅ · 텔레그램으로 아침 8시·저녁 6시 알림</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += (can ? _bsB("#0f766e", "📋 기본 할 일 넣기", "tdSeedPop()") + _bsB("#16a34a", "+ 할 일", "tdEdit('')") : "") + (typeof Notification !== "undefined" && Notification.permission !== "granted" ? _bsB("#7c3aed", "🔔 이 기기 알림 켜기", "tdNotiOn()") : "") + '</div></div></div>';
  // 오늘 볼 것
  var D = _tdList(today).filter(function(x){ return x.s.st === "done" && !x.s.dn.skip && (x.t.freq === "day" || x.s.dn && String(x.s.dn.at || "").slice(0, 10) === today); });
  h += '<div class="card" style="margin-bottom:10px;border:2px solid ' + (N.some(function(x){ return x.s.st === "over"; }) ? "#fca5a5" : "#bbf7d0") + '"><b style="font-size:16px">오늘 ' + today.slice(5).replace("-", "/") + ' — 할 일 ' + N.length + '개</b>';
  if(!N.length) h += '<div style="font-size:14px;color:#16a34a;font-weight:800;margin-top:6px">🎉 지금 할 일이 없어요</div>';
  N.forEach(function(x){ var c = x.s.st === "over" ? "#dc2626" : x.s.st === "today" ? "#ea580c" : "#2563eb";
    h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap"><div style="flex:1;min-width:180px">' + _tdCatTag(x.t.cat) + ' <b style="font-size:15px">' + esc(x.t.nm) + '</b><div style="font-size:12px;color:#64748b">' + _tdFreqTxt(x.t) + (x.t.note ? ' · ' + esc(x.t.note) : '') + '</div></div><span style="font-weight:900;color:' + c + ';font-size:13px;white-space:nowrap">' + _tdDueTxt(x.s) + '</span>' + (can ? _bsB("#16a34a", "✅ 했어요", "tdDone('" + x.id + "')", window.innerWidth < 760 ? "padding:3px 8px;font-size:12px;font-weight:800" : "padding:6px 12px;font-weight:800") : "") + '</div>'; });
  if(D.length) h += '<div style="margin-top:8px;font-size:12.5px;color:#64748b">✔ 오늘 한 것: ' + D.map(function(x){ return esc(x.t.nm) + ' <span style="font-size:11px">(' + esc(x.s.dn.by || "") + ' ' + String(x.s.dn.at || "").slice(11, 16) + ')</span>' + (can ? ' <a href="javascript:void 0" onclick="tdUndo(\'' + x.id + '\')" style="font-size:11px;color:#dc2626">취소</a>' : ''); }).join(" · ") + '</div>';
  h += '</div>';
  // 📅 달력 / 📋 목록
  var vw = _tdView(), vb = function(v, lb){ var on = vw === v; return '<button class="btn" onclick="tdViewSet(\'' + v + '\')" style="padding:6px 14px;font-weight:900;font-size:14px;background:' + (on ? "#1d4ed8" : "#fff") + ';color:' + (on ? "#fff" : "#1d4ed8") + ';border:1.5px solid #1d4ed8">' + lb + '</button>'; };
  h += '<div style="display:flex;gap:6px;margin-bottom:8px">' + vb("cal", "📅 달력") + vb("list", "📋 목록") + '</div>';
  if(vw === "cal") return h + _tdCal(today, can);
  // 전체 목록 (주기별)
  var cats = {}; Object.keys(T).forEach(function(k){ cats[T[k].cat || "기타"] = 1; });
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' + [""].concat(Object.keys(cats).sort()).map(function(c){ var on = TD.f === c; return '<button class="btn" onclick="TD.f=\'' + esc(c) + '\';draw()" style="padding:5px 12px;font-size:13px;font-weight:800;background:' + (on ? "#334155" : "#fff") + ';color:' + (on ? "#fff" : "#334155") + ';border:1.5px solid #334155">' + (c ? esc(c) : "전체") + '</button>'; }).join("") + '</div>';
  ["day", "week", "month", "year", "once"].forEach(function(fq){
    var ks = Object.keys(T).filter(function(k){ return T[k].freq === fq && (!TD.f || (T[k].cat || "기타") === TD.f); }).sort(function(a, b){ return _tdDue(T[a], today).due.localeCompare(_tdDue(T[b], today).due) || String(T[a].nm).localeCompare(String(T[b].nm)); });
    if(!ks.length) return;
    h += '<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px"><div style="padding:8px 12px;background:#f8fafc;border-bottom:2px solid #e2e8f0;font-weight:900;font-size:15px">' + TD_FREQ[fq] + ' <span style="font-weight:400;font-size:12.5px;color:#64748b">' + ks.length + '개</span></div>';
    ks.forEach(function(k){ var t = T[k], s = _tdStat(k, t, today), last = _tdLastDone(k);
      h += '<div onclick="' + (can ? "tdEdit('" + k + "')" : "") + '" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;' + (can ? "cursor:pointer;" : "") + (t.off ? "opacity:.5" : "") + '"><div style="flex:1;min-width:180px">' + _tdCatTag(t.cat) + ' <b>' + esc(t.nm) + '</b>' + (t.off ? ' <span class="mut" style="font-size:11px">(안 씀)</span>' : '') + '<div style="font-size:12px;color:#64748b">' + _tdFreqTxt(t) + ' · ' + _tdLead(t) + '일 전부터 알림' + (last ? ' · 최근 ' + last.pk.replace(/-/g, ".") + ' (' + esc(last.by || "") + ')' : '') + '</div></div>';
      h += '<span style="font-size:12.5px;font-weight:800;color:' + (s.st === "done" ? "#16a34a" : s.st === "over" ? "#dc2626" : s.st === "today" ? "#ea580c" : "#64748b") + '">' + _tdDueTxt(s) + '</span>' + _bsB("#475569", "기록", "event.stopPropagation();tdHist('" + k + "')", "padding:3px 8px;font-size:12px") + '</div>'; });
    h += '</div>'; });
  if(!Object.keys(T).length) h += '<div class="card" style="text-align:center;color:#94a3b8;padding:24px">아직 할 일이 없어요 — [📋 기본 할 일 넣기]로 소방·해썹 할 일을 골라 넣거나 [+ 할 일]</div>';
  return h;
}
function _tdLastDone(id){ var D = (_tdS().done || {})[id] || {}, ks = Object.keys(D).sort(function(a, b){ return String(D[a].at).localeCompare(String(D[b].at)); }); var k = ks[ks.length - 1]; return k ? Object.assign({ pk: k }, D[k]) : null; }
function _tdWho(){ return (ME && (ME.nm || ME.id)) || ""; }
function tdDone(id){
  var t = (_tdS().tasks || {})[id]; if(!t) return; var s = _tdStat(id, t, _tdToday()), v = { at: new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16), by: _tdWho() };
  _tdRef("done/" + id + "/" + s.pk).set(v).then(function(){ TD.D.done = TD.D.done || {}; TD.D.done[id] = TD.D.done[id] || {}; TD.D.done[id][s.pk] = v; toast("✅ " + t.nm); draw(); _tdBadge(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function tdUndo(id){ var t = (_tdS().tasks || {})[id]; if(!t) return; var s = _tdStat(id, t, _tdToday()); if(!confirm(t.nm + " — 했음 표시를 취소할까요?")) return; _tdRef("done/" + id + "/" + s.pk).remove().then(function(){ delete TD.D.done[id][s.pk]; draw(); _tdBadge(); }); }
function tdHist(id){ var t = (_tdS().tasks || {})[id] || {}, D = (_tdS().done || {})[id] || {}, ks = Object.keys(D).sort().reverse();
  openPopup('<h3 style="margin:0 0 8px">📜 ' + esc(t.nm || "") + ' — 한 기록 <button class="btn" style="background:#475569;color:#fff;float:right;padding:4px 10px" onclick="closePopup()">닫기</button></h3><div class="mut" style="font-size:12.5px;margin-bottom:6px">' + _tdFreqTxt(t) + ' · ' + ks.length + '번</div>' + (ks.length ? '<div style="max-height:60vh;overflow:auto">' + ks.slice(0, 200).map(function(k){ return '<div style="display:flex;justify-content:space-between;padding:5px 2px;border-bottom:1px solid #f1f5f9;font-size:13.5px"><b>' + k.replace(/-/g, ".") + '</b><span>' + esc(D[k].by || "") + ' · ' + esc(D[k].at || "") + '</span></div>'; }).join("") + '</div>' : '<div class="mut">아직 기록이 없어요</div>'), 440); }
// ✏ 할 일 만들기·고치기
function tdEdit(id){
  var t = id ? JSON.parse(JSON.stringify((_tdS().tasks || {})[id])) : null; if(t) delete t._id; t = t || { nm: "", cat: TD.f || "소방", freq: "day", wd: 0, md: 0, mon: 12, day: 31, dt: _tdToday(), note: "" };
  TD.e = { id: id || "", t: t }; _tdEdDraw();
}
function _tdEdDraw(){
  var t = TD.e.t, I = function(k, ex){ return 'value="' + esc(t[k] == null ? "" : t[k]) + '" oninput="TD.e.t.' + k + '=this.value" ' + (ex || "") + ' style="padding:7px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"'; };
  var h = '<h3 style="margin:0 0 10px">' + (TD.e.id ? "할 일 고치기" : "+ 할 일") + '</h3>';
  h += '<label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">할 일<input ' + I("nm", 'placeholder="예: 소화기 외관점검"') + ' style="width:100%;padding:8px;font-size:16px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-weight:400"></label>';
  h += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">분류</div><div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' + Object.keys(TD_CAT).map(function(c){ var on = t.cat === c; return '<button type="button" class="btn" onclick="TD.e.t.cat=\'' + c + '\';_tdEdDraw()" style="padding:5px 12px;font-weight:800;background:' + (on ? TD_CAT[c] : "#fff") + ';color:' + (on ? "#fff" : TD_CAT[c]) + ';border:1.5px solid ' + TD_CAT[c] + '">' + c + '</button>'; }).join("") + '</div>';
  h += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">언제</div><div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' + Object.keys(TD_FREQ).map(function(f){ var on = t.freq === f; return '<button type="button" class="btn" onclick="TD.e.t.freq=\'' + f + '\';_tdEdDraw()" style="padding:5px 12px;font-weight:800;background:' + (on ? "#334155" : "#fff") + ';color:' + (on ? "#fff" : "#334155") + ';border:1.5px solid #334155">' + TD_FREQ[f] + '</button>'; }).join("") + '</div>';
  if(t.freq === "week") h += '<div style="display:flex;gap:4px;margin-bottom:8px">' + TD_WD.map(function(w, i){ var on = +t.wd === i; return '<button type="button" class="btn" onclick="TD.e.t.wd=' + i + ';_tdEdDraw()" style="padding:5px 10px;font-weight:800;background:' + (on ? "#2563eb" : "#fff") + ';color:' + (on ? "#fff" : "#2563eb") + ';border:1.5px solid #2563eb">' + w + '</button>'; }).join("") + '</div>';
  if(t.freq === "month") h += '<div style="margin-bottom:8px;font-size:14px">매월 <select onchange="TD.e.t.md=+this.value" style="padding:6px;font-size:15px">' + ['<option value="0"' + (+t.md ? "" : " selected") + '>말일</option>'].concat(Array.apply(null, Array(31)).map(function(_, i){ return '<option value="' + (i + 1) + '"' + (+t.md === i + 1 ? " selected" : "") + '>' + (i + 1) + '일</option>'; })).join("") + '</select> · <input type="number" min="1" value="' + esc(t.every || 1) + '" oninput="TD.e.t.every=this.value;if(+this.value>1&&!TD.e.t.from)TD.e.t.from=_tdToday().slice(0,7)" style="width:58px;padding:6px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px">개월마다' + (+t.every > 1 ? ' · <input type="month" value="' + esc(t.from || _tdToday().slice(0, 7)) + '" oninput="TD.e.t.from=this.value" style="padding:5px;font-size:14px;border:1px solid #cbd5e1;border-radius:6px">부터' : '') + '</div>';
  if(t.freq === "year") h += '<div style="margin-bottom:8px;font-size:14px">매년 <select onchange="TD.e.t.mon=+this.value" style="padding:6px;font-size:15px">' + Array.apply(null, Array(12)).map(function(_, i){ return '<option value="' + (i + 1) + '"' + (+t.mon === i + 1 ? " selected" : "") + '>' + (i + 1) + '월</option>'; }).join("") + '</select> <select onchange="TD.e.t.day=+this.value" style="padding:6px;font-size:15px">' + Array.apply(null, Array(31)).map(function(_, i){ return '<option value="' + (i + 1) + '"' + (+t.day === i + 1 ? " selected" : "") + '>' + (i + 1) + '일</option>'; }).join("") + '</select> · <input type="number" min="1" value="' + esc(t.every || 1) + '" oninput="TD.e.t.every=this.value" style="width:58px;padding:6px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px">년마다' + (+t.every > 1 ? ' · <input type="number" value="' + esc(t.from || new Date().getFullYear()) + '" oninput="TD.e.t.from=this.value" style="width:78px;padding:6px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px">년부터' : ' <a href="javascript:void 0" onclick="TD.e.t.every=2;TD.e.t.from=TD.e.t.from||new Date().getFullYear();_tdEdDraw()" style="font-size:12px">몇 년마다?</a>') + '</div>';
  if(t.freq === "once") h += '<div style="margin-bottom:8px"><input type="date" ' + I("dt") + '></div>';
  h += '<label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">며칠 전부터 알릴까요 <input type="number" min="0" ' + I("lead", 'placeholder="' + _tdLead({ freq: t.freq }) + '"') + ' style="width:80px;padding:6px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px"> <span class="mut" style="font-weight:400;font-size:12px">비우면 ' + _tdLead({ freq: t.freq }) + '일 전</span></label>';
  h += '<label style="display:block;font-size:13px;font-weight:700;margin-bottom:8px">메모 (어떻게·어디서)<input ' + I("note") + ' style="width:100%;padding:8px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-weight:400"></label>';
  h += '<label style="font-size:13px"><input type="checkbox" ' + (t.off ? "checked" : "") + ' onchange="TD.e.t.off=this.checked"> 안 씀 (목록·알림에서 빼기, 기록은 남음)</label>';
  h += '<div style="display:flex;justify-content:space-between;gap:6px;margin-top:12px"><span>' + (TD.e.id ? _bsB("#dc2626", "🗑 지우기", "tdDel()") : "") + '</span><span style="display:flex;gap:6px">' + _bsB("#475569", "취소", "closePopup()") + _bsB("#16a34a", "💾 저장", "tdSave()", "padding:8px 20px") + '</span></div>';
  openPopup(h, 480);
}
function tdSave(){
  var E = TD.e, t = E.t; t.nm = String(t.nm || "").trim(); if(!t.nm) return toast("할 일을 적어 주세요", true);
  var o = { nm: t.nm, cat: t.cat || "기타", freq: t.freq || "day", note: String(t.note || "").trim() };
  if(o.freq === "week") o.wd = +t.wd || 0; if(o.freq === "month"){ o.md = +t.md || 0; if(+t.every > 1){ o.every = +t.every; o.from = t.from || _tdToday().slice(0, 7); } } if(o.freq === "year"){ o.mon = +t.mon || 12; o.day = +t.day || 31; if(+t.every > 1){ o.every = +t.every; o.from = +t.from || new Date().getFullYear(); } } if(o.freq === "once"){ if(!t.dt) return toast("날짜를 골라 주세요", true); o.dt = t.dt; }
  if(t.lead !== undefined && String(t.lead).trim() !== "") o.lead = +t.lead; if(t.off) o.off = true;
  o.since = E.id ? (((_tdS().tasks || {})[E.id] || {}).since || "") : _tdToday(); if(!o.since) delete o.since;
  var ref = E.id ? _tdRef("tasks/" + E.id) : _tdRef("tasks").push(), id = E.id || ref.key;
  ref.set(o).then(function(){ TD.D.tasks = TD.D.tasks || {}; TD.D.tasks[id] = o; closePopup(); toast("💾 " + o.nm); draw(); _tdBadge(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function tdDel(){ var E = TD.e; if(!confirm(E.t.nm + " — 지울까요? (한 기록도 같이 지워져요 · 잠깐 빼려면 '안 씀')")) return; var up = {}; up["tasks/" + E.id] = null; up["done/" + E.id] = null; _tdRef().update(up).then(function(){ delete TD.D.tasks[E.id]; if(TD.D.done) delete TD.D.done[E.id]; closePopup(); draw(); _tdBadge(); }); }
// 📋 기본 할 일 — 소방계획서·해썹에서 정한 것들 (체크해서 넣기, 이미 있는 이름은 건너뜀)
var TD_SEED = [
  // 🔥 소방 (소방계획서)
  { nm: "소화기 외관점검", cat: "소방", freq: "day", note: "소방계획서 8.0 일상적 안전관리 (오전)" },
  { nm: "수신기 점검", cat: "소방", freq: "month", md: 0, note: "소방계획서 8.0 — 매월 말일" },
  { nm: "소방 작동기능점검 (외주 업체)", cat: "소방", freq: "year", mon: 9, day: 30, lead: 30, note: "업체와 날짜 잡기 · 끝나면 결과 보관 + 소방계획서 자체점검 날짜 적기" },
  { nm: "소방 교육·훈련 하고 기록 남기기", cat: "소방", freq: "year", mon: 12, day: 15, lead: 30, note: "🔥 소방 > 교육·훈련 실시 기록에 사진까지" },
  { nm: "다음 해 소방계획서 만들기", cat: "소방", freq: "year", mon: 12, day: 31, lead: 31, note: "🔥 소방 > ＋ 다음 해 만들기 → 바뀐 칸 고치고 인쇄·결재" },
  { nm: "화재보험 갱신 확인", cat: "소방", freq: "year", mon: 3, day: 31, lead: 30, note: "갱신하면 소방계획서 화재보험 칸도 고치기" },
  { nm: "소방 홍보 (영상물 상영 등)", cat: "소방", freq: "year", mon: 8, day: 31, lead: 30, note: "소방계획서 9.0 — 7~8월" },
  // 🧼 위생
  { nm: "위생교육 듣기", cat: "위생", freq: "year", mon: 12, day: 31, lead: 30, note: "식품 영업자 위생교육 — 들은 뒤 수료증 서류철에" },
  { nm: "보건증 갱신", cat: "위생", freq: "year", mon: 11, day: 30, lead: 30, note: "1년마다 — 보건소 (직원 모두)" },
  // 📄 서류·보고
  { nm: "생산실적 보고 (지난해 것)", cat: "서류", freq: "year", mon: 1, day: 31, lead: 20, note: "식품 생산실적 보고 — 기한은 보통 2월 말까지로 알려져 있어요, 확인해서 날짜 고치기" },
  { nm: "시험검사성적서 확인", cat: "서류", freq: "month", md: 1, lead: 0, note: "🧪 원료수불부 > 시험검사성적서 — 다음 검사일 다가오는 것" },
  // 🛡 해썹
  { nm: "해썹 오늘 기록 적기", cat: "해썹", freq: "day", note: "🛡 해썹 > 오늘 기록" },
  { nm: "해썹 한 달 서류 출력·결재", cat: "해썹", freq: "month", md: 0, lead: 2, note: "🛡 해썹 > 기록·출력 > 한 달 서류" },
  // 🚚 차량 · 📋 등록
  { nm: "차량 정기검사", cat: "기타", freq: "year", every: 2, from: 2026, mon: 12, day: 31, lead: 30, note: "자동차등록증의 검사 유효기간 보고 날짜·주기 맞추기 (화물차는 1년마다일 수 있음) · 차가 여러 대면 복사해서 차량번호 붙이기" },
  { nm: "어업경영체 등록정보 변경·갱신 (법인)", cat: "서류", freq: "year", every: 2, from: 2026, mon: 12, day: 31, lead: 30, note: "개인과 법인 따로 — 주기·기한 확인해서 고치기 (수협·시군 수산과)" },
  { nm: "어업경영체 등록정보 변경·갱신 (개인)", cat: "서류", freq: "year", mon: 12, day: 31, lead: 30, note: "주기·기한 확인해서 고치기" },
  // 🏭 시설·장비
  { nm: "지게차 배터리 증류수 보충", cat: "기타", freq: "month", md: 0, lead: 3, note: "전해액 높이 확인 → 증류수 (충전 끝난 뒤)" },
  { nm: "지게차 작업 전 점검", cat: "기타", freq: "day", note: "브레이크·포크·타이어·경적·누유" },
  { nm: "정수기 필터 교체", cat: "위생", freq: "month", every: 3, md: 0, lead: 7, note: "주기는 필터에 맞게 고치기 (업체 관리면 방문일 확인)" },
  { nm: "포충등 끈끈이 교체 · 방충·방서 점검", cat: "해썹", freq: "month", md: 0, lead: 3, note: "잡힌 벌레 기록 → 해썹 방충방서 일지" },
  { nm: "냉동고 성에·청소 점검", cat: "위생", freq: "month", md: 15, lead: 3, note: "🧊 냉동고마다 · 온도 기록부와 같이" },
  { nm: "소독(방역) 하기 · 소독증명서 보관", cat: "위생", freq: "month", every: 2, md: 0, lead: 7, note: "식품 제조 시설 소독 의무 — 해당 여부·주기 확인 (업체 맡기면 증명서 서류철에)" },
  { nm: "자가품질검사", cat: "서류", freq: "month", every: 3, md: 0, lead: 14, note: "품목마다 주기 다름 — 확인해서 고치기 · 결과는 시험검사성적서에 올리기" },
  { nm: "저울 정기검사 (상거래용)", cat: "서류", freq: "year", every: 2, from: 2026, mon: 12, day: 31, lead: 30, note: "판매용 저울 — 시·군에서 검사 날짜 안내 · 날짜 맞추기" },
  { nm: "가스(LPG) 안전점검", cat: "소방", freq: "year", mon: 6, day: 30, lead: 30, note: "가스 공급업체·가스안전공사 점검 받기" },
  { nm: "정화조 청소", cat: "기타", freq: "year", mon: 6, day: 30, lead: 30, note: "해마다 — 날짜는 업체 맞춰 고치기" },
  { nm: "산업안전보건교육 (직원)", cat: "위생", freq: "month", every: 3, md: 0, lead: 14, note: "근로자 정기교육 — 해당 여부·시간 확인, 한 기록 남기기" },
  { nm: "차량 보험 갱신", cat: "기타", freq: "year", mon: 12, day: 31, lead: 30, note: "만기일로 날짜 고치기 · 차가 여러 대면 복사" },
  // 💰 세금·신고 (흔히 알려진 기한 — 해마다·법인 사정에 따라 다를 수 있어요, 세무사 확인)
  { nm: "원천세 신고·납부 (직원 급여)", cat: "세금", freq: "month", md: 10, lead: 3, note: "매월 10일 (반기 납부 승인받았으면 1월·7월로 바꾸기)" },
  { nm: "부가세 확정신고 (지난해 하반기)", cat: "세금", freq: "year", mon: 1, day: 25, lead: 15, note: "자료: 매출·매입 세금계산서, 카드 매입" },
  { nm: "부가세 예정신고 (1~3월)", cat: "세금", freq: "year", mon: 4, day: 25, lead: 15, note: "법인 — 예정 신고" },
  { nm: "부가세 확정신고 (상반기)", cat: "세금", freq: "year", mon: 7, day: 25, lead: 15, note: "" },
  { nm: "부가세 예정신고 (7~9월)", cat: "세금", freq: "year", mon: 10, day: 25, lead: 15, note: "법인 — 예정 신고" },
  { nm: "직원 연말정산", cat: "세금", freq: "year", mon: 2, day: 28, lead: 30, note: "직원 공제자료 받기 (간소화 자료) — 2월 급여 때 정산" },
  { nm: "근로소득 지급명세서 제출", cat: "세금", freq: "year", mon: 3, day: 10, lead: 15, note: "연말정산 끝난 것 제출" },
  { nm: "4대보험 보수총액 신고", cat: "세금", freq: "year", mon: 3, day: 15, lead: 15, note: "고용·산재 3월 15일 · 건강보험은 3월 10일쯤" },
  { nm: "법인세 신고·납부", cat: "세금", freq: "year", mon: 3, day: 31, lead: 30, note: "12월 결산 법인 — 결산 자료(장부·재고·통장) 세무사에게" },
  { nm: "법인 지방소득세 신고", cat: "세금", freq: "year", mon: 4, day: 30, lead: 15, note: "법인세 다음 달" },
  { nm: "종합소득세 신고 (개인)", cat: "세금", freq: "year", mon: 5, day: 31, lead: 20, note: "개인 사업소득이 있거나, 직원이 급여 말고 다른 소득이 있으면 — 근로소득만 있으면 연말정산으로 끝" }
];
function tdSeedPop(){
  var have = {}, T = _tdS().tasks || {}; Object.keys(T).forEach(function(k){ have[T[k].nm] = 1; });
  var L = TD_SEED.filter(function(x){ return !have[x.nm]; }); if(!L.length) return toast("기본 할 일은 이미 다 넣었어요");
  TD.seed = L;
  var h = '<h3 style="margin:0 0 8px">📋 기본 할 일 넣기</h3><div class="mut" style="font-size:12.5px;margin-bottom:8px">소방·위생·해썹·세금 — 날짜는 넣은 뒤 ✏ 고쳐서 맞춰 주세요 · 세금 기한은 흔히 알려진 날짜라 세무사와 한 번 확인</div><div style="max-height:55vh;overflow:auto;border:1px solid #e2e8f0;border-radius:8px">' + L.map(function(x, i){ return '<label style="display:flex;gap:8px;align-items:center;padding:7px 10px;border-bottom:1px solid #f1f5f9"><input type="checkbox" class="tdSd" data-i="' + i + '" checked>' + _tdCatTag(x.cat) + ' <span style="flex:1"><b>' + esc(x.nm) + '</b><div style="font-size:11.5px;color:#64748b">' + _tdFreqTxt(x) + '</div></span></label>'; }).join("") + '</div><div class="mut" style="font-size:11.5px;margin-top:4px">Shift 누르고 체크하면 사이 것 다 골라져요</div>';
  h += '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px">' + _bsB("#475569", "취소", "closePopup()") + _bsB("#0f766e", "넣기", "tdSeedGo()", "padding:8px 20px") + '</div>';
  openPopup(h, 480);
}
function tdSeedGo(){ var up = {}, n = 0; Array.prototype.forEach.call(document.querySelectorAll(".tdSd"), function(c){ if(!c.checked) return; var x = JSON.parse(JSON.stringify(TD.seed[+c.dataset.i])); x.since = _tdToday(); up["tasks/" + _tdRef("tasks").push().key] = x; n++; }); if(!n) return toast("골라 주세요", true);
  _tdRef().update(up).then(function(){ TD.D.tasks = TD.D.tasks || {}; Object.keys(up).forEach(function(p){ TD.D.tasks[p.split("/")[1]] = up[p]; }); closePopup(); toast("📋 " + n + "개 넣었어요"); draw(); _tdBadge(); }).catch(function(e){ toast("저장 실패: " + e.message, true); }); }

// ════════ 🔔 홈페이지 알림 — 왼쪽 아래 버튼 + 하루 한 번 브라우저 알림 ════════
function _tdBadge(){
  if(!ME || ME.r === "kid" || !TD.D) return;
  var N = _tdNow(), over = N.filter(function(x){ return x.s.st === "over"; }).length, tod = N.filter(function(x){ return x.s.st !== "soon"; }).length;
  var b = document.getElementById("tdBadge");
  if(!b){ b = document.createElement("button"); b.id = "tdBadge"; b.onclick = function(){ if(typeof switchTab === "function") switchTab("todo"); else { CTAB = "todo"; draw(); } scrollTo(0, 0); }; b.style.cssText = "position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:70;border:none;border-radius:22px;padding:8px 14px;font-size:14px;font-weight:900;color:#fff;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,.3)"; document.body.appendChild(b); }
  if(!N.length || CTAB === "todo"){ b.style.display = "none"; return; }
  b.style.display = ""; b.style.background = over ? "#dc2626" : tod ? "#ea580c" : "#2563eb"; b.textContent = "📅 할 일 " + N.length + (over ? " · 지남 " + over : "");
  // 하루 한 번 브라우저 알림
  try { var key = "gm_tdNoti_" + _tdToday(); if(tod && typeof Notification !== "undefined" && Notification.permission === "granted" && !localStorage.getItem(key)){ localStorage.setItem(key, "1"); new Notification("📅 오늘 할 일 " + N.length + "개", { body: N.slice(0, 5).map(function(x){ return (x.s.st === "over" ? "⚠ " : "• ") + x.t.nm; }).join("\n") }); } } catch(e){}
}
function tdNotiOn(){ if(typeof Notification === "undefined") return toast("이 브라우저는 알림을 못 써요", true); Notification.requestPermission().then(function(p){ toast(p === "granted" ? "🔔 이 기기에서 하루 한 번 알려요" : "알림이 막혀 있어요 — 브라우저 설정에서 허용해 주세요", p !== "granted"); draw(); }); }
// 로그인해 있으면 처음 한 번 불러오고, 10분마다 다시 확인
setInterval(function(){ try { if(!ME || ME.r === "kid") return; if(!TD.D){ if(!TD.loading && typeof fbDb !== "undefined") _tdLoad(); return; } if(Date.now() - (TD.at || 0) > 10 * 60e3){ TD.at = Date.now(); TD.D = null; _tdLoad(); } else _tdBadge(); } catch(e){} }, 15000);

// ════════ 📅 달력 (플래너) — 그달 해야 할 날에 할 일 표시 · 날짜 누르면 그날 할 일 · ✅ ════════
function _tdView(){ try { return localStorage.getItem("gm_tdView") || "cal"; } catch(e){ return "cal"; } }
function tdViewSet(v){ try { localStorage.setItem("gm_tdView", v); } catch(e){} draw(); }
// 그달(ym)에 이 할 일이 해야 하는 날들 [{d 날짜, pk 기간키}] — 매일은 빼고(위에 따로)
function _tdOcc(id, t, ym){
  var y = +ym.slice(0, 4), m = +ym.slice(5, 7), L = _tdLast(y, m), out = [], f = t.freq, p2 = function(n){ return ("0" + n).slice(-2); };
  if(f === "week"){ for(var d = 1; d <= L; d++){ var D = new Date(y, m - 1, d); if((D.getDay() + 6) % 7 === (+t.wd || 0)){ var mon = new Date(D); mon.setDate(d - (+t.wd || 0)); out.push({ d: ym + "-" + p2(d), pk: _tdS2(mon) }); } } }
  else if(f === "month"){ var em = Math.max(1, +t.every || 1), idx = y * 12 + m - 1, fb = String(t.from || t.since || "").match(/^(\d{4})-(\d{2})/), bi = fb ? (+fb[1]) * 12 + (+fb[2]) - 1 : idx;
    if((((idx - bi) % em) + em) % em === 0){ var md = +t.md || 0; out.push({ d: ym + "-" + p2(md && md <= L ? md : L), pk: ym }); } }
  else if(f === "year"){ var ev = Math.max(1, +t.every || 1), base = +t.from || +String(t.since || "").slice(0, 4) || y;
    if((+t.mon || 12) === m && (((y - base) % ev) + ev) % ev === 0) out.push({ d: ym + "-" + p2(Math.min(+t.day || L, L)), pk: String(y) }); }
  else if(f === "once"){ if(String(t.dt || "").slice(0, 7) === ym) out.push({ d: t.dt, pk: "1" }); }
  return out;
}
function _tdCalMap(ym, today){
  var T = _tdS().tasks || {}, DN = _tdS().done || {}, M = {}, daily = [];
  Object.keys(T).forEach(function(k){ var t = T[k]; if(t.off || (TD.f && (t.cat || "기타") !== TD.f)) return; if(t.freq === "day"){ daily.push(k); return; }
    _tdOcc(k, t, ym).forEach(function(o){ var dn = (DN[k] || {})[o.pk], skip = !dn && t.since && o.d < t.since;
      var st = dn || skip ? "done" : o.d < today ? "over" : o.d === today ? "today" : "later";
      (M[o.d] = M[o.d] || []).push({ id: k, t: t, pk: o.pk, st: st, dn: dn, skip: skip }); }); });
  return { M: M, daily: daily };
}
function _tdCal(today, can){
  var ym = TD.ym || today.slice(0, 7), y = +ym.slice(0, 4), m = +ym.slice(5, 7), L = _tdLast(y, m), first = new Date(y, m - 1, 1).getDay(), mob = window.innerWidth < 760;
  var C = _tdCalMap(ym, today), M = C.M, mv = function(n){ var i = y * 12 + m - 1 + n; return Math.floor(i / 12) + "-" + ("0" + (i % 12 + 1)).slice(-2); };
  var nb = function(lb, v){ return '<button class="btn" onclick="TD.ym=\'' + v + '\';TD.day=\'\';draw()" style="padding:5px 12px;font-weight:900;background:#fff;border:1.5px solid #334155;color:#334155">' + lb + '</button>'; };
  var h = '<div class="card" style="padding:10px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:8px">' + nb("◀", mv(-1)) + '<b style="font-size:19px">' + y + '년 ' + m + '월</b><span style="display:flex;gap:4px">' + (ym !== today.slice(0, 7) ? nb("오늘", today.slice(0, 7)) : '') + nb("▶", mv(1)) + '</span></div>';
  // 분류 고르기
  var cats = {}; Object.keys(_tdS().tasks || {}).forEach(function(k){ cats[(_tdS().tasks[k].cat) || "기타"] = 1; });
  h += '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">' + [""].concat(Object.keys(cats).sort()).map(function(c){ var on = TD.f === c, col = TD_CAT[c] || "#334155"; return '<button class="btn" onclick="TD.f=\'' + esc(c) + '\';draw()" style="padding:3px 10px;font-size:12.5px;font-weight:800;background:' + (on ? col : "#fff") + ';color:' + (on ? "#fff" : col) + ';border:1.5px solid ' + col + '">' + (c ? esc(c) : "전체") + '</button>'; }).join("") + '</div>';
  if(C.daily.length) h += '<div style="font-size:12.5px;color:#475569;margin-bottom:6px">🔁 매일 ' + C.daily.length + '개 — ' + C.daily.map(function(k){ return esc(_tdS().tasks[k].nm); }).join(" · ") + ' <span class="mut">(달력엔 안 넣음 · 위 오늘 할 일에서 ✅)</span></div>';
  h += '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;font-size:12px">' + ["일", "월", "화", "수", "목", "금", "토"].map(function(w, i){ return '<div style="text-align:center;font-weight:900;padding:4px 0;color:' + (i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#334155") + '">' + w + '</div>'; }).join("");
  for(var b = 0; b < first; b++) h += '<div></div>';
  for(var d = 1; d <= L; d++){
    var ds = ym + "-" + ("0" + d).slice(-2), its = M[ds] || [], wd = (first + d - 1) % 7, isT = ds === today, sel = TD.day === ds;
    var bad = its.some(function(x){ return x.st === "over"; }), all = its.length && its.every(function(x){ return x.st === "done"; });
    h += '<div onclick="TD.day=(TD.day===\'' + ds + '\'?\'\':\'' + ds + '\');draw()" style="min-height:' + (mob ? 52 : 84) + 'px;border:' + (sel ? "2px solid #1d4ed8" : isT ? "2px solid #f59e0b" : "1px solid #e2e8f0") + ';border-radius:7px;padding:3px;cursor:pointer;background:' + (isT ? "#fffbeb" : bad ? "#fef2f2" : all ? "#f0fdf4" : "#fff") + ';overflow:hidden">';
    h += '<div style="font-weight:900;font-size:12.5px;color:' + (wd === 0 ? "#dc2626" : wd === 6 ? "#2563eb" : "#0f172a") + '">' + d + (isT ? ' <span style="font-size:10px;color:#b45309">오늘</span>' : '') + '</div>';
    if(mob){ if(its.length) h += '<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">' + its.slice(0, 6).map(function(x){ return '<span style="width:9px;height:9px;border-radius:50%;background:' + (x.st === "done" ? "#cbd5e1" : TD_CAT[x.t.cat] || "#475569") + ';' + (x.st === "over" ? "outline:2px solid #dc2626" : "") + '"></span>'; }).join("") + (its.length > 6 ? '<b style="font-size:9px">+' + (its.length - 6) + '</b>' : '') + '</div>'; }
    else { h += its.slice(0, 3).map(function(x){ var col = TD_CAT[x.t.cat] || "#475569", dn = x.st === "done"; return '<div title="' + esc(x.t.nm) + '" style="margin-top:2px;font-size:11px;line-height:1.35;padding:1px 4px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:' + (dn ? "#f1f5f9" : col) + ';color:' + (dn ? "#94a3b8" : "#fff") + ';' + (dn ? "text-decoration:line-through;" : "") + (x.st === "over" ? "box-shadow:inset 0 0 0 2px #7f1d1d;" : "") + '">' + (x.st === "over" ? "⚠ " : dn ? "✔ " : "") + esc(x.t.nm) + '</div>'; }).join("") + (its.length > 3 ? '<div style="font-size:10.5px;color:#475569;font-weight:800">+' + (its.length - 3) + '개</div>' : ''); }
    h += '</div>'; }
  h += '</div><div class="mut" style="font-size:11.5px;margin-top:6px">날짜를 누르면 그날 할 일 · 빨간 칸 = 안 하고 지난 것 · 초록 칸 = 다 함 · 노란 테두리 = 오늘</div></div>';
  // 고른 날
  var sd = TD.day && TD.day.slice(0, 7) === ym ? TD.day : "";
  if(sd){ var its2 = M[sd] || [], D2 = _tdD(sd);
    h += '<div class="card" style="margin-bottom:10px;border:2px solid #1d4ed8"><b style="font-size:15px">' + (+sd.slice(5, 7)) + '월 ' + (+sd.slice(8, 10)) + '일 (' + ["일", "월", "화", "수", "목", "금", "토"][D2.getDay()] + ') — ' + its2.length + '개</b>' + (can ? ' ' + _bsB("#16a34a", "+ 이날 할 일", "tdEdit('');TD.e.t.freq='once';TD.e.t.dt='" + sd + "';_tdEdDraw()", "padding:3px 10px;font-size:12.5px") : '');
    if(!its2.length) h += '<div class="mut" style="margin-top:6px">이날은 할 일이 없어요</div>';
    its2.forEach(function(x){ h += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;flex-wrap:wrap"><div style="flex:1;min-width:170px">' + _tdCatTag(x.t.cat) + ' <b>' + esc(x.t.nm) + '</b><div style="font-size:12px;color:#64748b">' + _tdFreqTxt(x.t) + (x.t.note ? ' · ' + esc(x.t.note) : '') + '</div></div>';
      h += x.st === "done" ? '<span style="color:#16a34a;font-weight:800;font-size:12.5px">' + (x.skip ? "넣기 전" : "✔ " + esc((x.dn || {}).by || "") + " " + esc(String((x.dn || {}).at || "").slice(5, 16))) + '</span>' + (can && !x.skip ? ' <a href="javascript:void 0" onclick="tdUndoAt(\'' + x.id + '\',\'' + x.pk + '\')" style="font-size:11.5px;color:#dc2626">취소</a>' : '')
        : (can ? _bsB(x.st === "over" ? "#dc2626" : "#16a34a", "✅ 했어요", "tdDoneAt('" + x.id + "','" + x.pk + "')", window.innerWidth < 760 ? "padding:3px 8px;font-size:12px;font-weight:800" : "padding:5px 12px;font-weight:800") : '');
      h += (can ? ' ' + _bsB("#475569", "✏", "tdEdit('" + x.id + "')", "padding:4px 8px") : '') + '</div>'; });
    h += '</div>'; }
  // 이달 할 일 한눈에 (날짜순)
  var ks = Object.keys(M).sort(), n = 0; ks.forEach(function(k){ n += M[k].length; });
  if(n){ h += '<div class="card" style="margin-bottom:10px"><b>' + m + '월 할 일 ' + n + '개</b>' + ks.map(function(k){ return M[k].map(function(x){ return '<div style="display:flex;gap:8px;align-items:center;padding:4px 0;font-size:13px;border-bottom:1px solid #f8fafc;' + (x.st === "done" ? "opacity:.5" : "") + '"><b style="min-width:52px;color:' + (x.st === "over" ? "#dc2626" : k === today ? "#b45309" : "#334155") + '">' + (+k.slice(5, 7)) + '/' + (+k.slice(8, 10)) + '</b>' + _tdCatTag(x.t.cat) + '<span style="flex:1">' + (x.st === "done" ? "✔ " : x.st === "over" ? "⚠ " : "") + esc(x.t.nm) + '</span></div>'; }).join(""); }).join("") + '</div>'; }
  return h;
}
function tdDoneAt(id, pk){ var t = (_tdS().tasks || {})[id]; if(!t) return; var v = { at: new Date(Date.now() + 9 * 3600e3).toISOString().replace("T", " ").slice(0, 16), by: _tdWho() };
  _tdRef("done/" + id + "/" + pk).set(v).then(function(){ TD.D.done = TD.D.done || {}; TD.D.done[id] = TD.D.done[id] || {}; TD.D.done[id][pk] = v; toast("✅ " + t.nm); draw(); _tdBadge(); }).catch(function(e){ toast("저장 실패: " + e.message, true); }); }
function tdUndoAt(id, pk){ var t = (_tdS().tasks || {})[id] || {}; if(!confirm((t.nm || "") + " — 했음 표시를 취소할까요?")) return; _tdRef("done/" + id + "/" + pk).remove().then(function(){ if(TD.D.done && TD.D.done[id]) delete TD.D.done[id][pk]; draw(); _tdBadge(); }); }
