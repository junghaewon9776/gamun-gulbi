// ============================================================================
// 🛡 해썹(HACCP) 일지 — 양식(점검표형·기록형)을 자유롭게 만들고 · 매일 기록 · 한 달치 한 번에 출력
//   /main/Haccp = { set:{co, sign:[결재란]}, forms:{id:양식}, recs:{양식id:{id:기록}} }
//   양식 = { nm, kind:'chk'(점검표: 항목마다 ○/×) | 'log'(기록표: 칸마다 값 한 줄씩), cat:'선행요건'|'CCP'|'기타',
//            freq:'day'|'week'|'month'|'each'(있을 때마다), items:[{t,std}] (chk), cols:[{lb,type:num|text|ok|time|date,min,max,unit}] (log),
//            std(양식 위 기준·방법 설명), land(가로 인쇄), off, ord }
//   기록   chk: recs/{fid}/{날짜} = {dt, v:{항목번호:'O'|'X'}, note, fix, by, at}
//          log: recs/{fid}/{push} = {dt, v:{칸번호:값}, bad, fix, by, at}
//   ⚠ 측정·점검은 실제로 한 것만 적게 — 빈 칸을 시스템이 채우지 않음 ('전부 ○'도 사람이 누를 때만)
//   buse.js 도우미(_bsN·_bsB·_bsDH·_bsMD·_bsToday·_bsCan) 같이 씀 · 원료수불부 묶음 출력은 raw.js 함수 씀
// ============================================================================
var HC = { D: null, loading: false, dt: "", ym: "" };
function _hcS(){ return HC.D || {}; }
function _hcRef(p){ return fbDb.ref("/main/Haccp" + (p ? "/" + p : "")); }
function _hcCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _hcBoss(){ return !!ME && (ME.r === "super" || ME.r === "admin"); }
function _hcLoad(){
  if(HC.loading) return; HC.loading = true;
  fbDb.ref("/main/Haccp").once("value").then(function(s){ HC.loading = false; HC.D = s.val() || {}; if(/^hc/.test(CTAB)) draw(); })
    .catch(function(e){ HC.loading = false; toast("해썹 불러오기 실패: " + e.message, true); });
}
function _hcGate(){ if(!HC.D){ _hcLoad(); return '<div class="card"><div class="mut">📡 해썹 일지 불러오는 중...</div></div>'; } return ""; }
function _hcSet(){ var s = _hcS().set || {}; return { co: s.co || "가문굴비영어조합법인", sign: s.sign && s.sign.length ? s.sign : ["작성", "검토", "승인"] }; }
function _hcForms(all){ var F = _hcS().forms || {}; return Object.keys(F).filter(function(k){ return all || !F[k].off; }).sort(function(a, b){ return (_bsN(F[a].ord) - _bsN(F[b].ord)) || String(F[a].nm).localeCompare(String(F[b].nm)); }); }
var HC_FREQ = { day: "매일", week: "매주", month: "매월", each: "있을 때마다" };
var HC_TYPE = { num: "숫자", text: "글", ok: "적합/부적합", time: "시간", date: "날짜" };

// ── 기본 양식 (해썹 선행요건·CCP 에서 흔히 쓰는 것) — 업체 양식이 오면 고쳐서 씀 ──
var HC_PRESETS = [
  { nm: "일일 위생점검표", kind: "chk", cat: "선행요건", freq: "day", land: true, sig: true, std: "작업 시작 전 점검 · 적합 ○ / 부적합 × (부적합은 개선조치 적기)", items: [
    { t: "작업자 위생복·위생모·마스크·장화 착용", std: "착용" }, { t: "작업 전 손 세척·소독", std: "실시" }, { t: "작업자 건강상태 (설사·발열·손 상처)", std: "이상 없음" },
    { t: "작업장 바닥·벽·배수구 청결", std: "이물·물고임 없음" }, { t: "작업대·칼·도마·도구 세척·소독", std: "실시" }, { t: "원료·제품 바닥 직접 적재 안 함", std: "팔레트 사용" },
    { t: "쓰레기·폐기물 처리", std: "뚜껑 닫힘·당일 처리" }, { t: "출입문·방충망 닫힘", std: "닫힘" }, { t: "화장실·탈의실 청결", std: "청결" }, { t: "세척제·소독제 따로 보관", std: "표시·구분 보관" } ] },
  { nm: "냉동고 온도 기록부", kind: "log", cat: "선행요건", freq: "day", hw: true, sig: true, std: "하루 2번 이상 (작업 전·후) · 냉동 -18℃ 이하", cols: [
    { lb: "측정 시간", type: "time" }, { lb: "냉동고 1", type: "num", max: -18, unit: "℃" }, { lb: "냉동고 2", type: "num", max: -18, unit: "℃" }, { lb: "냉동고 3", type: "num", max: -18, unit: "℃" }, { lb: "냉동고 4", type: "num", max: -18, unit: "℃" } ] },
  { nm: "원료 입고검사 기록", kind: "log", cat: "선행요건", freq: "each", land: true, hw: true, sig: true, std: "원료 들어올 때마다 · 부적합이면 반품·폐기 등 개선조치 적기", cols: [
    { lb: "원료명", type: "text" }, { lb: "공급업체", type: "text" }, { lb: "입고량", type: "num", unit: "kg" }, { lb: "품온", type: "num", unit: "℃" },
    { lb: "외관·냄새", type: "ok" }, { lb: "포장 상태", type: "ok" }, { lb: "표시사항·유통기한", type: "ok" }, { lb: "시험성적서", type: "ok" } ] },
  { nm: "세척·소독 점검표", kind: "chk", cat: "선행요건", freq: "day", land: true, sig: true, std: "작업 끝난 뒤 · 세척(세제) → 헹굼 → 소독(차아염소산 200ppm 등)", items: [
    { t: "작업대", std: "세척·소독" }, { t: "칼·도마·바구니 등 도구", std: "세척·소독" }, { t: "작업장 바닥", std: "세척" }, { t: "배수로·트랩", std: "이물 제거" },
    { t: "운반 용기·대차", std: "세척" }, { t: "손 세척대·소독기", std: "소독제 보충" } ] },
  { nm: "방충·방서 점검표", kind: "chk", cat: "선행요건", freq: "week", land: true, sig: true, std: "주 1회 · 해충·쥐 흔적 있으면 원인 찾고 조치", items: [
    { t: "포충등 작동", std: "정상" }, { t: "포충등 포획 상태 확인·교체", std: "확인" }, { t: "쥐덫·끈끈이 점검", std: "흔적 없음" }, { t: "출입구·창문 방충망 파손", std: "파손 없음" },
    { t: "배수구 트랩·덮개", std: "설치·정상" }, { t: "건물 주변 정리 (잡초·적재물)", std: "정리" } ] },
  { nm: "용수 관리 기록", kind: "log", cat: "선행요건", freq: "month", hw: true, sig: true, std: "매월 · 물탱크 청소 반기 1회 · 지하수는 연 1회 이상 수질검사", cols: [
    { lb: "물탱크 청소", type: "ok" }, { lb: "잔류염소", type: "num", unit: "ppm" }, { lb: "수질검사 (기관·결과)", type: "text" } ] },
  { nm: "CCP 금속검출 모니터링", kind: "log", cat: "CCP", freq: "each", land: true, hw: true, sig: true, std: "작업 시작 전 · 2시간마다 · 작업 끝 · 시험편이 감지되면 적합 · 감지 안 되면 직전 확인 뒤 제품 다시 통과", cols: [
    { lb: "확인 시간", type: "time" }, { lb: "제품명", type: "text" }, { lb: "Fe 시험편 감지", type: "ok" }, { lb: "SUS 시험편 감지", type: "ok" },
    { lb: "통과 수량", type: "num", unit: "개" }, { lb: "검출(배제) 수량", type: "num", unit: "개" } ], off: true },
  { nm: "CCP 가열 (찐굴비)", kind: "log", cat: "CCP", freq: "each", hw: true, sig: true, land: true, std: "찔 때마다 · 한계기준(중심온도·시간)은 해썹 위해요소분석 결과대로 양식 관리에서 최소값 넣기 · 벗어나면 다시 찌거나 폐기", cols: [
    { lb: "제품명·로트", type: "text" }, { lb: "찌기 시작", type: "time" }, { lb: "찌기 끝", type: "time" }, { lb: "증기 온도", type: "num", unit: "℃" }, { lb: "중심 온도", type: "num", unit: "℃" }, { lb: "찐 시간", type: "num", unit: "분" }, { lb: "수량", type: "num", unit: "kg" } ], off: true },
  { nm: "CCP 염도 기록 (젓갈)", kind: "log", cat: "CCP", freq: "each", std: "한계기준은 업체 기준대로 넣기 (양식 관리에서 최소 염도)", cols: [
    { lb: "제품명", type: "text" }, { lb: "로트", type: "text" }, { lb: "염도", type: "num", unit: "%" } ], off: true },
  { nm: "검교정 기록", kind: "log", cat: "선행요건", freq: "each", sig: true, std: "저울·온도계·금속검출기 · 연 1회 이상 (자체 또는 공인기관)", cols: [
    { lb: "기기명", type: "text" }, { lb: "방법 (자체/기관)", type: "text" }, { lb: "결과", type: "ok" }, { lb: "다음 검교정일", type: "date" } ] },
  { nm: "교육훈련 기록", kind: "log", cat: "선행요건", freq: "each", land: true, std: "신규자 교육 · 정기 위생교육 (해썹 교육 포함)", cols: [
    { lb: "교육명", type: "text" }, { lb: "대상·인원", type: "text" }, { lb: "강사", type: "text" }, { lb: "교육 내용", type: "text" }, { lb: "시간", type: "num", unit: "시간" } ] },
  { nm: "제품 출고 기록", kind: "log", cat: "선행요건", freq: "each", land: true, std: "회수할 때 추적용 · 로트·거래처 꼭 적기", cols: [
    { lb: "제품명", type: "text" }, { lb: "로트", type: "text" }, { lb: "수량", type: "num" }, { lb: "거래처", type: "text" } ] },
  { nm: "부적합·개선조치 기록", kind: "log", cat: "기타", freq: "each", land: true, std: "기준을 벗어난 일 · 고객 불만 · 이물 발견 등", cols: [
    { lb: "내용", type: "text" }, { lb: "원인", type: "text" }, { lb: "조치자", type: "text" }, { lb: "재발 방지", type: "text" } ] }
];

// ── ✍ 손글씨 판 (받아쓰기 앱과 같은 방식) — 저장은 줄인 PNG ──
function _hcPad(box, h, ph){
  box.innerHTML = '<div style="position:relative"><canvas style="width:100%;display:block;background:#fffef5;border:2px solid #fbbf24;border-radius:10px;touch-action:none;user-select:none;-webkit-user-select:none"></canvas>' + (ph ? '<div style="position:absolute;left:10px;top:6px;font-size:11px;color:#cbd5e1;pointer-events:none">' + esc(ph) + '</div>' : '') + '</div><div style="display:flex;gap:6px;margin-top:3px"><button type="button" class="btn" style="background:#f59e0b;color:#fff;padding:3px 9px;font-size:12px">🧽 지우기</button><button type="button" class="btn" style="background:#475569;color:#fff;padding:3px 9px;font-size:12px">↩ 한 획</button></div>';
  var cv = box.querySelector("canvas"), bt = box.querySelectorAll("button"), dpr = window.devicePixelRatio || 1, ctx = null, sk = [], cur = null, img = null, W = 300;
  function size(){ W = cv.clientWidth || 300; cv.style.height = h + "px"; cv.width = W * dpr; cv.height = h * dpr; ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redraw(); }
  function pen(){ ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 3.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; }
  function redraw(){ if(!ctx) return; ctx.clearRect(0, 0, W, h); if(img && img.complete) ctx.drawImage(img, 0, 0, W, h); pen(); sk.forEach(function(s){ ctx.beginPath(); s.forEach(function(p, i){ i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); if(s.length === 1) ctx.lineTo(s[0][0] + .1, s[0][1]); ctx.stroke(); }); }
  function pos(e){ var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener("pointerdown", function(e){ e.preventDefault(); if(!ctx) size(); try{ cv.setPointerCapture(e.pointerId); }catch(x){} cur = [pos(e)]; sk.push(cur); pen(); ctx.beginPath(); ctx.moveTo(cur[0][0], cur[0][1]); ctx.lineTo(cur[0][0] + .1, cur[0][1]); ctx.stroke(); });
  cv.addEventListener("pointermove", function(e){ if(!cur) return; e.preventDefault(); var a = cur[cur.length - 1], b = pos(e); cur.push(b); pen(); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach(function(ev){ cv.addEventListener(ev, function(){ cur = null; }); });
  var api = { size: size, empty: function(){ return !sk.length && !img; }, clear: function(){ sk = []; img = null; redraw(); },
    load: function(u){ sk = []; img = new Image(); img.onload = redraw; img.src = u; },
    url: function(){ if(api.empty()) return ""; var o = document.createElement("canvas"), k = Math.min(1, 360 / W); o.width = Math.round(W * k); o.height = Math.round(h * k); var c = o.getContext("2d"); c.drawImage(cv, 0, 0, o.width, o.height); return o.toDataURL("image/png"); } };
  bt[0].onclick = function(){ api.clear(); }; bt[1].onclick = function(){ if(sk.length) sk.pop(); else img = null; redraw(); };
  setTimeout(size, 30); return api;
}
// QR 로 들어왔을 때 (?tab=hcToday&hc=양식id) 그 양식 적는 창을 바로 염
(function(){ try { var m = /[?&]hc=([^&#]+)/.exec(location.search); if(m) HC.qr = decodeURIComponent(m[1]); } catch(e){} })();
function hcQrUrl(fid){ return location.origin + location.pathname + "?tab=hcToday&hc=" + encodeURIComponent(fid); }
function hcQrPrint(fid){
  var f = _hcS().forms[fid], S = _hcSet(); if(typeof qrcode === "undefined") return toast("QR 도구를 불러오는 중이에요 — 잠깐 뒤 다시", true);
  var q = qrcode(0, "M"); q.addData(hcQrUrl(fid)); q.make();
  var one = '<div style="border:2px solid #0f766e;border-radius:6mm;padding:8mm;text-align:center;width:120mm;margin:6mm auto;break-inside:avoid"><div style="font-size:12px;color:#334155">' + esc(S.co) + ' · 해썹</div><div style="font-size:22px;font-weight:900;margin:2mm 0 4mm">' + esc(f.nm) + '</div>' + q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }).replace("<svg ", '<svg style="width:70mm;height:70mm" ') + '<div style="font-size:15px;font-weight:800;margin-top:3mm">📱 폰 카메라로 찍고 바로 적어요</div><div style="font-size:11px;color:#475569;margin-top:1mm">' + esc(f.std || "") + '</div></div>';
  _hcWin("QR " + f.nm, '<div class="pg">' + one + '</div>');
}
// ── 기간·판정 도우미 ──
function _hcWeek(dt){ var d = new Date(dt + "T00:00:00"), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function _hcSamePeriod(f, a, b){ return f.freq === "week" ? _hcWeek(a) === _hcWeek(b) : f.freq === "month" ? String(a).slice(0, 7) === String(b).slice(0, 7) : a === b; }
function _hcRecs(fid){ var R = (_hcS().recs || {})[fid] || {}; return Object.keys(R).map(function(k){ var x = R[k]; x._id = k; return x; }).sort(function(a, b){ return String(a.dt).localeCompare(String(b.dt)) || String((a.v || {})[0] || "").localeCompare(String((b.v || {})[0] || "")); }); }
function _hcBadCol(c, v){ if(v === "" || v == null) return false; if(c.type === "ok") return v === "X"; if(c.type !== "num") return false; var n = _bsN(v); return (c.min !== "" && c.min != null && n < _bsN(c.min)) || (c.max !== "" && c.max != null && n > _bsN(c.max)); }
function _hcStdTxt(c){ var a = []; if(c.min !== "" && c.min != null) a.push(c.min + (c.unit || "") + " 이상"); if(c.max !== "" && c.max != null) a.push(c.max + (c.unit || "") + " 이하"); return a.join(" · "); }
function _hcDone(fid, dt){ var f = (_hcS().forms || {})[fid]; if(!f) return null; var L = _hcRecs(fid).filter(function(r){ return _hcSamePeriod(f, r.dt, dt); }); return L; }
function _hcHead(t, sub){ return '<div class="card" style="margin-bottom:10px"><strong style="font-size:18px">' + t + '</strong> <span class="mut" style="font-size:12px;margin-left:6px">' + sub + '</span></div>'; }
function _hcEmpty(){ return '<div class="card" style="text-align:center;padding:30px"><div style="font-size:15px;font-weight:800;margin-bottom:8px">아직 해썹 양식이 없어요</div><div class="mut" style="font-size:13px;margin-bottom:12px">기본 양식 13개(위생점검·온도·입고검사·세척소독·방충방서·CCP 금속검출 등)를 넣고 업체에 맞게 고쳐 쓰면 돼요</div>' + (_hcBoss() ? _bsB("#0f766e", "📋 기본 양식 넣기", "hcPresetAll()", "padding:10px 22px") : '<div class="mut">관리자가 양식을 넣어야 해요</div>') + '</div>'; }

// ════════ 📝 오늘 기록 ════════
function dHcToday(){
  var g = _hcGate(); if(g) return g;
  var fl = _hcForms(); if(!fl.length) return _hcHead("📝 오늘 기록", "") + _hcEmpty();
  var dt = HC.dt || _bsToday(), F = _hcS().forms, can = _hcCan();
  var due = fl.filter(function(k){ return F[k].freq !== "each"; }), done = due.filter(function(k){ return _hcDone(k, dt).length; });
  var h = _hcHead("📝 해썹 기록", "실제로 점검·측정한 것만 적어요 · 기준을 벗어나면 빨갛게 + 개선조치");
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>날짜</b><input type="date" value="' + dt + '" onchange="HC.dt=this.value;draw()" style="width:160px;padding:6px;border:1px solid #cbd5e1;border-radius:6px">' + (dt !== _bsToday() ? _bsB("#64748b", "오늘로", "HC.dt='';draw()", "padding:4px 10px") : '') +
    '<span style="font-size:14px;font-weight:800;color:' + (done.length === due.length ? "#16a34a" : "#ea580c") + '">해야 할 일지 ' + due.length + '개 중 ' + done.length + '개 함</span></div>';
  h += _hcIotStrip();
  if(can) h += _hcQuick(dt);
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:10px">';
  fl.forEach(function(k){ var f = F[k], L = _hcDone(k, dt), ok = f.freq === "each" || L.length, bad = L.some(function(r){ return r.bad; });
    h += '<div class="card" style="border-top:4px solid ' + (f.cat === "CCP" ? "#dc2626" : "#0f766e") + '"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px"><div><b style="font-size:15px">' + esc(f.nm) + '</b> <span style="font-size:11px;background:' + (f.cat === "CCP" ? "#fee2e2" : "#ccfbf1") + ';border-radius:8px;padding:1px 7px">' + esc(f.cat || "") + '</span> <span class="mut" style="font-size:12px">' + (HC_FREQ[f.freq] || "") + '</span></div>';
    h += '<span style="font-size:12.5px;font-weight:800;white-space:nowrap;color:' + (bad ? "#dc2626" : f.freq === "each" ? "#64748b" : ok ? "#16a34a" : "#ea580c") + '">' + (bad ? "⚠ 부적합 있음" : f.freq === "each" ? (L.length ? L.length + "건" : "") : ok ? "✅ " + (f.freq === "day" ? "오늘" : f.freq === "week" ? "이번 주" : "이번 달") + " 함" : "⏳ 아직") + '</span></div>';
    if(f.std) h += '<div class="mut" style="font-size:11.5px;margin:3px 0 6px">' + esc(f.std) + '</div>';
    if(f.kind === "chk"){ var r = L.filter(function(x){ return x.dt === dt; })[0] || (f.freq !== "day" ? L[L.length - 1] : null);
      if(r && r.dt !== dt) h += '<div style="font-size:12.5px;color:#16a34a">' + _bsDH(r.dt) + ' 에 했어요 · ' + _hcChkSum(f, r) + '</div>' + (can ? '<div style="margin-top:6px">' + _bsB("#0f766e", "오늘도 점검 넣기", "hcChkEdit('" + k + "')", "padding:4px 10px") + '</div>' : '');
      else if(r) h += '<div style="font-size:12.5px">' + _hcChkSum(f, r) + (r.by ? ' <span class="mut">· ' + esc(r.by) + '</span>' : '') + '</div>' + (can ? '<div style="margin-top:6px">' + _bsB("#2563eb", "수정", "hcChkEdit('" + k + "')", "padding:4px 10px") + '</div>' : '');
      else h += can ? _bsB("#0f766e", "✏ 점검하기 (" + (f.items || []).length + "항목)", "hcChkEdit('" + k + "')", "padding:7px 14px") : '<span class="mut">기록 없음</span>';
    } else {
      var today = L.filter(function(x){ return x.dt === dt; });
      if(today.length){ h += '<table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:6px"><tr style="background:#f0fdfa">' + (f.cols || []).map(function(c){ return '<th style="padding:3px 4px;text-align:left;font-weight:700">' + esc(c.lb) + '</th>'; }).join("") + '<th></th></tr>';
        today.forEach(function(x){ h += '<tr style="' + (x.bad ? "background:#fef2f2" : "") + '">' + (f.cols || []).map(function(c, i){ var v = (x.v || {})[i], hi = (x.hw || {})[i]; return '<td style="padding:3px 4px;border-bottom:1px solid #f1f5f9;' + (_hcBadCol(c, v) ? "color:#dc2626;font-weight:800" : "") + '">' + (hi ? '<img src="' + hi + '" style="height:22px;vertical-align:middle">' : _hcVal(c, v)) + '</td>'; }).join("") + '<td style="border-bottom:1px solid #f1f5f9">' + (can ? _bsB("#2563eb", "수정", "hcLogEdit('" + k + "','" + x._id + "')", "padding:2px 7px") : "") + '</td></tr>'; });
        h += '</table>'; }
      else if(f.freq !== "each" && L.length) h += '<div style="font-size:12.5px;color:#16a34a;margin-bottom:6px">' + _bsDH(L[L.length - 1].dt) + ' 에 했어요</div>';
      if(can) h += _bsB("#0f766e", "+ 기록 넣기", "hcLogEdit('" + k + "','')", "padding:6px 14px");
    }
    h += '</div>'; });
  if(HC.qr){ var q = HC.qr; HC.qr = ""; if(F[q] && can) setTimeout(function(){ if(F[q].kind === "chk") hcChkEdit(q); else hcLogEdit(q, ""); }, 80); }
  return h + '</div>';
}
function _hcChkSum(f, r){ var v = r.v || {}, n = (f.items || []).length, o = 0, x = 0; for(var i = 0; i < n; i++){ if(v[i] === "O") o++; else if(v[i] === "X") x++; } return '○ ' + o + ' · <b style="color:' + (x ? "#dc2626" : "#94a3b8") + '">× ' + x + '</b>' + (n - o - x ? ' · <span style="color:#ea580c">빈 칸 ' + (n - o - x) + '</span>' : ''); }
function _hcVal(c, v){ if(v === "" || v == null) return ""; if(c.type === "ok") return v === "O" ? "적합" : v === "X" ? "부적합" : esc(v); if(c.type === "date") return _bsMD(v); return esc(v) + (c.type === "num" && c.unit ? c.unit : ""); }

// ── 점검표 입력 ──
function hcChkEdit(fid){
  var f = _hcS().forms[fid], dt = HC.dt || _bsToday(), r = ((_hcS().recs || {})[fid] || {})[dt] || { dt: dt, v: {}, note: "", fix: "" };
  HC.cv = JSON.parse(JSON.stringify(r.v || {}));
  var h = '<h3 style="margin:0 0 4px">✏ ' + esc(f.nm) + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div class="mut" style="font-size:12px;margin-bottom:8px">' + _bsDH(dt) + (f.std ? ' · ' + esc(f.std) : '') + '</div>';
  h += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px">' + _bsB("#16a34a", "전부 ○ (실제로 다 확인했을 때만)", "hcChkAll()", "padding:4px 10px;font-size:12px") + '</div><table style="width:100%;border-collapse:collapse;font-size:13.5px">';
  (f.items || []).forEach(function(it, i){ h += '<tr><td style="padding:6px 4px;border-bottom:1px solid #f1f5f9"><b>' + esc(it.t) + '</b>' + (it.std ? '<div class="mut" style="font-size:11.5px">기준: ' + esc(it.std) + '</div>' : '') + '</td><td style="border-bottom:1px solid #f1f5f9;white-space:nowrap;text-align:right" id="hcC' + i + '">' + _hcOX(i) + '</td></tr>'; });
  h += '</table><label style="font-size:13px;display:block;margin-top:8px">특이사항<input id="hc_note" value="' + esc(r.note || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<label style="font-size:13px;display:block;margin-top:6px">개선조치 <span class="mut" style="font-size:11.5px">— × 가 있으면 꼭</span><input id="hc_fix" value="' + esc(r.fix || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  if(f.sig) h += '<div style="font-size:13px;margin-top:8px">점검자 서명 ✍</div><div id="hcSig"></div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (r.at ? _bsB("#dc2626", "🗑 삭제", "hcRecDel('" + fid + "','" + dt + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "hcChkSave('" + fid + "')", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 560);
  HC.pads = {}; if(f.sig){ var se = document.getElementById("hcSig"); if(se){ HC.pads.sig = _hcPad(se, 60, "서명"); if(r.sig) HC.pads.sig.load(r.sig); } }
}
function _hcOX(i){ var v = HC.cv[i]; return ['O', 'X'].map(function(o){ var on = v === o; return '<button class="btn" style="min-width:46px;padding:6px 10px;margin-left:4px;font-size:15px;font-weight:900;background:' + (on ? (o === "O" ? "#16a34a" : "#dc2626") : "#fff") + ';color:' + (on ? "#fff" : o === "O" ? "#16a34a" : "#dc2626") + ';border:2px solid ' + (o === "O" ? "#16a34a" : "#dc2626") + '" onclick="HC.cv[' + i + ']=(HC.cv[' + i + ']===\'' + o + '\'?\'\':\'' + o + '\');document.getElementById(\'hcC' + i + '\').innerHTML=_hcOX(' + i + ')">' + (o === "O" ? "○" : "×") + '</button>'; }).join(""); }
function hcChkAll(){ var f = _hcS().forms; Object.keys(f).forEach(function(){}); var n = document.querySelectorAll('[id^="hcC"]').length; for(var i = 0; i < n; i++){ if(HC.cv[i] !== "X") HC.cv[i] = "O"; var e = document.getElementById("hcC" + i); if(e) e.innerHTML = _hcOX(i); } }
function hcChkSave(fid){
  var f = _hcS().forms[fid], dt = HC.dt || _bsToday(), v = {}, n = (f.items || []).length, x = 0, blank = 0;
  for(var i = 0; i < n; i++){ if(HC.cv[i] === "O" || HC.cv[i] === "X"){ v[i] = HC.cv[i]; if(HC.cv[i] === "X") x++; } else blank++; }
  var fix = (document.getElementById("hc_fix") || {}).value.trim(), note = (document.getElementById("hc_note") || {}).value.trim();
  if(x && !fix) return toast("× 가 " + x + "개 있어요 — 개선조치를 적어 주세요", true);
  if(blank && !confirm("아직 안 고른 항목이 " + blank + "개 있어요. 이대로 저장할까요?")) return;
  var r = { dt: dt, v: v, note: note, fix: fix, bad: x > 0, by: (ME && (ME.nm || ME.id)) || CID || "", at: new Date().toISOString() }, sg = HC.pads && HC.pads.sig ? HC.pads.sig.url() : ""; if(sg) r.sig = sg;
  _hcRef("recs/" + fid + "/" + dt).set(r).then(function(){ HC.D.recs = HC.D.recs || {}; HC.D.recs[fid] = HC.D.recs[fid] || {}; HC.D.recs[fid][dt] = r; closePopup(); toast(f.nm + " 저장"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ── 기록표 입력 ──
function hcLogEdit(fid, id){
  var f = _hcS().forms[fid], r = id ? JSON.parse(JSON.stringify(_hcS().recs[fid][id])) : { dt: HC.dt || _bsToday(), v: {}, fix: "" };
  var h = '<h3 style="margin:0 0 4px">✏ ' + esc(f.nm) + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>' + (f.std ? '<div class="mut" style="font-size:12px;margin-bottom:8px">' + esc(f.std) + '</div>' : '');
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px"><label>날짜<input id="hl_dt" type="date" value="' + esc(r.dt) + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  var hw = !!f.hw; HC.pads = {};
  (f.cols || []).forEach(function(c, i){ var v = (r.v || {})[i], sd = _hcStdTxt(c), usePad = hw && c.type !== "ok" && c.type !== "date";
    h += '<label' + (usePad ? ' style="grid-column:1/-1"' : '') + '>' + esc(c.lb) + (c.unit ? ' (' + esc(c.unit) + ')' : '') + (sd ? ' <span style="font-size:11px;color:#0f766e">기준 ' + esc(sd) + '</span>' : '');
    if(usePad){ h += '</label><div style="grid-column:1/-1;display:grid;grid-template-columns:' + (c.type === "num" ? "1fr 110px" : "1fr") + ';gap:6px;align-items:start;margin-top:-4px"><div id="hlP' + i + '"></div>' + (c.type === "num" ? '<label style="font-size:11.5px;color:#475569">숫자 (기준 확인용)<input id="hl_' + i + '" type="number" step="any" inputmode="decimal" value="' + esc(v == null ? "" : v) + '" oninput="_hcLogChk(\'' + fid + '\')" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>' : '') + '</div>'; return; }
    if(c.type === "ok") h += '<select id="hl_' + i + '" onchange="_hcLogChk(\'' + fid + '\')" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px"><option value=""></option><option value="O"' + (v === "O" ? " selected" : "") + '>적합 ○</option><option value="X"' + (v === "X" ? " selected" : "") + '>부적합 ×</option></select>';
    else h += '<input id="hl_' + i + '" type="' + (c.type === "num" ? "number" : c.type === "time" ? "time" : c.type === "date" ? "date" : "text") + '"' + (c.type === "num" ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(v == null ? "" : v) + '" oninput="_hcLogChk(\'' + fid + '\')" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box">';
    h += '</label>'; });
  h += '</div><div id="hlBad" style="margin-top:8px"></div>' + (hw ? '<label style="font-size:13px;display:block;margin-top:6px">판정 <span class="mut" style="font-size:11.5px">— 적은 사람이 기준과 비교해서 골라요 (숫자를 넣으면 기준 벗어날 때 저절로 부적합)</span><select id="hl_judge" style="width:100%;padding:7px;border:2px solid #0f766e;border-radius:6px;font-weight:800"><option value=""></option><option value="O"' + (r.judge === "O" ? " selected" : "") + '>적합 ○</option><option value="X"' + (r.judge === "X" ? " selected" : "") + '>부적합 ×</option></select></label>' : '') + (f.sig ? '<div style="font-size:13px;margin-top:8px">작성자 서명 ✍</div><div id="hlSig"></div>' : '') + '<label style="font-size:13px;display:block;margin-top:6px">개선조치 <span class="mut" style="font-size:11.5px">— 기준을 벗어나면 꼭</span><input id="hl_fix" value="' + esc(r.fix || "") + '" style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (id ? _bsB("#dc2626", "🗑 삭제", "hcRecDel('" + fid + "','" + id + "')") : "<span></span>") + _bsB("#16a34a", "💾 저장", "hcLogSave('" + fid + "','" + (id || "") + "')", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 600); _hcLogChk(fid);
  if(hw) (f.cols || []).forEach(function(c, i){ var el = document.getElementById("hlP" + i); if(el){ HC.pads[i] = _hcPad(el, c.type === "text" ? 70 : 64, c.type === "time" ? "예: 9:30" : c.type === "num" ? "예: -20" : ""); if(r.hw && r.hw[i]) HC.pads[i].load(r.hw[i]); } });
  if(f.sig){ var se = document.getElementById("hlSig"); if(se){ HC.pads.sig = _hcPad(se, 60, "서명"); if(r.sig) HC.pads.sig.load(r.sig); } }
}
function _hcLogVals(f){ var v = {}; (f.cols || []).forEach(function(c, i){ var e = document.getElementById("hl_" + i), x = e ? String(e.value).trim() : ""; if(x !== "") v[i] = c.type === "num" ? _bsN(x) : x; }); return v; }
function _hcLogChk(fid){ var f = _hcS().forms[fid], v = _hcLogVals(f), bad = (f.cols || []).filter(function(c, i){ var b = _hcBadCol(c, v[i]), e = document.getElementById("hl_" + i); if(e){ e.style.borderColor = b ? "#dc2626" : "#cbd5e1"; e.style.background = b ? "#fef2f2" : ""; } return b; });
  var el = document.getElementById("hlBad"); if(el) el.innerHTML = bad.length ? '<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:6px 10px;color:#b91c1c;font-weight:800;font-size:13px">⚠ 기준 벗어남: ' + bad.map(function(c){ return esc(c.lb); }).join(", ") + ' — 개선조치를 적어 주세요</div>' : ''; }
function hcLogSave(fid, id){
  var f = _hcS().forms[fid], v = _hcLogVals(f), dt = (document.getElementById("hl_dt") || {}).value, fix = (document.getElementById("hl_fix") || {}).value.trim();
  var hwv = {}; Object.keys(HC.pads || {}).forEach(function(k){ if(k === "sig") return; var u = HC.pads[k].url(); if(u) hwv[k] = u; }); var sig = HC.pads && HC.pads.sig ? HC.pads.sig.url() : "";
  if(!dt) return toast("날짜를 넣어 주세요", true); if(!Object.keys(v).length && !Object.keys(hwv).length) return toast("값을 하나 이상 넣어 주세요", true);
  var judge = ((document.getElementById("hl_judge") || {}).value || ""), bad = (f.cols || []).some(function(c, i){ return _hcBadCol(c, v[i]); }) || judge === "X";
  if(f.hw && !judge && !(f.cols || []).some(function(c){ return c.type === "num" && (c.min != null || c.max != null); })) return toast("판정(적합/부적합)을 골라 주세요", true);
  if(bad && !fix) return toast("기준을 벗어났어요 — 개선조치를 적어 주세요", true);
  var r = { dt: dt, v: v, fix: fix, bad: bad, by: (ME && (ME.nm || ME.id)) || CID || "", at: new Date().toISOString() }; if(Object.keys(hwv).length) r.hw = hwv; if(sig) r.sig = sig; if(judge) r.judge = judge; var ref = id ? _hcRef("recs/" + fid + "/" + id) : _hcRef("recs/" + fid).push(), key = id || ref.key;
  ref.set(r).then(function(){ HC.D.recs = HC.D.recs || {}; HC.D.recs[fid] = HC.D.recs[fid] || {}; HC.D.recs[fid][key] = r; closePopup(); toast(f.nm + " 저장" + (bad ? " (부적합)" : "")); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function hcRecDel(fid, id){ if(!confirm("이 기록을 지울까요?")) return; _hcRef("recs/" + fid + "/" + id).remove().then(function(){ delete HC.D.recs[fid][id]; closePopup(); draw(); }); }

// ════════ 📚 기록 · 출력 ════════
function dHcView(){
  var g = _hcGate(); if(g) return g;
  var fl = _hcForms(true), F = _hcS().forms || {}, ym = HC.ym || _bsToday().slice(0, 7);
  if(!fl.length) return _hcHead("📚 기록 · 출력", "") + _hcEmpty();
  var h = _hcHead("📚 해썹 기록 · 출력", "달마다 양식별로 뽑거나 한 달 서류를 한 번에");
  h += '<div class="card" style="margin-bottom:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>달</b><input type="month" value="' + ym + '" onchange="HC.ym=this.value;draw()" style="width:170px;padding:6px;border:1px solid #cbd5e1;border-radius:6px">' + _bsB("#0f766e", "🖨 " + ym.replace("-", "년 ") + "월 서류 한번에", "hcPrintMonthAsk()", "padding:8px 16px") + '</div>';
  var days = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  h += '<div class="card" style="padding:0;overflow:hidden"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f0fdfa"><th style="padding:7px;text-align:left">양식</th><th style="text-align:left">구분</th><th style="text-align:left">주기</th><th style="text-align:right">이 달 기록</th><th style="text-align:right">부적합</th><th style="text-align:left;padding-left:10px">빠진 날 (매일 양식)</th><th></th></tr></thead><tbody>';
  fl.forEach(function(k){ var f = F[k], L = _hcRecs(k).filter(function(r){ return String(r.dt).slice(0, 7) === ym; }), bad = L.filter(function(r){ return r.bad; }).length, miss = "";
    if(f.freq === "day"){ var have = {}; L.forEach(function(r){ have[r.dt] = 1; }); var last = ym === _bsToday().slice(0, 7) ? +_bsToday().slice(8) : days, m = []; for(var d = 1; d <= last; d++){ var ds = ym + "-" + ("0" + d).slice(-2); if(!have[ds]) m.push(d); } miss = m.length ? m.length + '일 <span class="mut" style="font-size:11.5px">(' + m.slice(0, 12).join(",") + (m.length > 12 ? "…" : "") + ')</span>' : '<span style="color:#16a34a">없음</span>'; }
    h += '<tr style="' + (f.off ? "opacity:.5" : "") + '"><td style="padding:6px 7px;border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(f.nm) + '</td><td style="border-bottom:1px solid #f1f5f9">' + esc(f.cat || "") + '</td><td style="border-bottom:1px solid #f1f5f9">' + (HC_FREQ[f.freq] || "") + '</td><td style="border-bottom:1px solid #f1f5f9;text-align:right">' + L.length + '</td><td style="border-bottom:1px solid #f1f5f9;text-align:right;font-weight:800;color:' + (bad ? "#dc2626" : "#94a3b8") + '">' + bad + '</td><td style="padding-left:10px;border-bottom:1px solid #f1f5f9;font-size:12.5px">' + miss + '</td><td style="border-bottom:1px solid #f1f5f9;padding:4px">' + _bsB("#475569", "🖨 인쇄", "hcPrint(['" + k + "'],'" + ym + "')", "padding:3px 10px") + '</td></tr>'; });
  return h + '</tbody></table></div>';
}
function _hcSignBox(){ var S = _hcSet(); return '<table class="sg"><tr><th rowspan="2" style="width:7mm;writing-mode:vertical-rl">결재</th>' + S.sign.map(function(s){ return '<th>' + esc(s) + '</th>'; }).join("") + '</tr><tr>' + S.sign.map(function(){ return '<td style="height:13mm;width:19mm"></td>'; }).join("") + '</tr></table>'; }
function _hcPage(f, ym){
  var S = _hcSet(), L = _hcRecs(f._id).filter(function(r){ return String(r.dt).slice(0, 7) === ym; }), days = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  var h = '<div class="pg' + (f.land ? ' land' : '') + '"><div class="hd"><div><div class="co">' + esc(S.co) + '</div><h1>' + esc(f.nm) + '</h1><div class="ym">' + ym.replace("-", "년 ") + '월' + (f.cat === "CCP" ? ' · <b>CCP</b>' : '') + '</div></div>' + _hcSignBox() + '</div>';
  if(f.std) h += '<div class="std">' + esc(f.std) + '</div>';
  if(f.kind === "chk"){
    var cols = f.freq === "day" ? Array.from({ length: days }, function(_, i){ return ym + "-" + ("0" + (i + 1)).slice(-2); }) : L.map(function(r){ return r.dt; }); if(f.freq !== "day") while(cols.length < 5) cols.push("");
    var byDt = {}; L.forEach(function(r){ byDt[r.dt] = r; });
    h += '<table class="t chk"><tr><th style="width:' + (f.freq === "day" ? 46 : 60) + 'mm">점검 항목</th><th style="width:' + (f.freq === "day" ? 22 : 34) + 'mm">기준</th>' + cols.map(function(d){ return '<th>' + (d ? (f.freq === "day" ? +d.slice(8) : _bsMD(d).slice(5)) : "") + '</th>'; }).join("") + '</tr>';
    (f.items || []).forEach(function(it, i){ h += '<tr><td>' + esc(it.t) + '</td><td class="s">' + esc(it.std || "") + '</td>' + cols.map(function(d){ var v = ((byDt[d] || {}).v || {})[i]; return '<td class="c' + (v === "X" ? " x" : "") + '">' + (v === "O" ? "○" : v === "X" ? "×" : "") + '</td>'; }).join("") + '</tr>'; });
    h += '<tr><td colspan="2"><b>' + (f.sig ? "서명" : "작성자") + '</b></td>' + cols.map(function(d){ var r0 = byDt[d] || {}; return '<td class="c s' + (r0.sig ? " hw" : "") + '">' + (r0.sig ? '<img src="' + r0.sig + '">' : esc((r0.by || "").slice(0, 3))) + '</td>'; }).join("") + '</tr></table>';
    var notes = L.filter(function(r){ return r.note || r.fix; }); h += '<table class="t" style="margin-top:3mm"><tr><th style="width:24mm">날짜</th><th>특이사항</th><th>개선조치</th></tr>' + (notes.length ? notes.map(function(r){ return '<tr><td class="c">' + _bsMD(r.dt).slice(5) + '</td><td>' + esc(r.note || "") + '</td><td>' + esc(r.fix || "") + '</td></tr>'; }).join("") : '<tr><td style="height:9mm"></td><td></td><td></td></tr><tr><td style="height:9mm"></td><td></td><td></td></tr>') + '</table>';
  } else {
    var C = f.cols || [];
    h += '<table class="t"><tr><th style="width:22mm">날짜</th>' + C.map(function(c){ var sd = _hcStdTxt(c); return '<th>' + esc(c.lb) + (c.unit && c.type === "num" ? '<br><span class="s">(' + esc(c.unit) + ')</span>' : '') + (sd ? '<br><span class="s">기준 ' + esc(sd) + '</span>' : '') + '</th>'; }).join("") + '<th style="width:14mm">판정</th><th style="width:' + (f.land ? 50 : 34) + 'mm">개선조치</th><th style="width:16mm">작성자</th></tr>';
    L.forEach(function(r){ h += '<tr><td class="c">' + _bsMD(r.dt).slice(5) + '</td>' + C.map(function(c, i){ var v = (r.v || {})[i], hi = (r.hw || {})[i]; return '<td class="' + (hi ? "c hw" : c.type === "num" ? "r" : c.type === "ok" || c.type === "time" ? "c" : "") + (_hcBadCol(c, v) ? " x" : "") + '">' + (hi ? '<img src="' + hi + '">' : c.type === "ok" ? (v === "O" ? "○" : v === "X" ? "×" : "") : c.type === "num" ? esc(v == null ? "" : v) : _hcVal(c, v)) + '</td>'; }).join("") + '<td class="c' + (r.bad ? " x" : "") + '">' + (r.bad ? "부적합" : "적합") + '</td><td>' + esc(r.fix || "") + '</td><td class="c s' + (r.sig ? " hw" : "") + '">' + (r.sig ? '<img src="' + r.sig + '">' : esc(r.by || "")) + '</td></tr>'; });
    for(var i = L.length; i < (f.land ? 14 : 22); i++) h += '<tr><td style="height:7mm"></td>' + C.map(function(){ return '<td></td>'; }).join("") + '<td></td><td></td><td></td></tr>';
    h += '</table>';
  }
  return h + '</div>';
}
var HC_CSS = '@page{size:A4 portrait;margin:10mm}@page land{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111;font-size:11px}.pg{width:190mm;margin:0 auto 6mm;break-after:page}.pg.land{page:land;width:281mm}.pg:last-child{break-after:auto}.hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3mm}.co{font-size:11px;color:#333}h1{font-size:20px;letter-spacing:3px;margin:1mm 0}.ym{font-size:12px}.std{border:1px solid #999;background:#f8fafc;padding:2mm 3mm;margin-bottom:3mm;font-size:10.5px}.sg{border-collapse:collapse}.sg td,.sg th{border:1px solid #333;font-size:10px;text-align:center;padding:1mm}table.t{width:100%;border-collapse:collapse}.t td,.t th{border:1px solid #333;padding:1.2mm 1.5mm;font-size:10.5px}.t th{background:#eef2f7}.chk td,.chk th{padding:1mm .6mm;font-size:9.5px}.c{text-align:center}.r{text-align:right}.s{font-size:9px;color:#333}.x{color:#c00;font-weight:800}.hw{padding:.3mm!important}.hw img{height:7mm;max-width:100%;display:block;margin:0 auto}.chk .hw img{height:5mm}.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}.pg{margin:0 auto}}';
function _hcWin(title, body){
  var w = window.open("", "_blank", "width=1100,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + HC_CSS + '</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + body + '</body></html>');
  w.document.close();
}
function hcPrint(ids, ym){ var F = _hcS().forms || {}; _hcWin("해썹 " + ym, ids.map(function(k){ var f = JSON.parse(JSON.stringify(F[k])); f._id = k; return _hcPage(f, ym); }).join("")); }
function hcPrintMonthAsk(){
  var ym = HC.ym || _bsToday().slice(0, 7), fl = _hcForms(), F = _hcS().forms;
  var h = '<h3 style="margin:0 0 10px">🖨 ' + ym.replace("-", "년 ") + '월 해썹 서류 한번에 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3><div style="font-size:13px">';
  fl.forEach(function(k){ h += '<label style="display:block;margin:3px 0"><input type="checkbox" class="hcPk" value="' + k + '" checked> ' + esc(F[k].nm) + '</label>'; });
  h += '<hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0">' + (typeof rwPrintAll === "function" ? '<label style="display:block;margin:3px 0"><input type="checkbox" id="hcRaw" checked> 🧪 원료수불부 (원료별)</label><label style="display:block;margin:3px 0"><input type="checkbox" id="hcProd" checked> 🧪 생산작업일지</label>' : '') + '</div>';
  h += '<div style="display:flex;justify-content:flex-end;margin-top:12px">' + _bsB("#0f766e", "🖨 뽑기", "hcPrintMonth()", "padding:9px 22px") + '</div>';
  openPopup(h, 460);
}
function hcPrintMonth(){
  var ym = HC.ym || _bsToday().slice(0, 7), ids = [].slice.call(document.querySelectorAll(".hcPk")).filter(function(e){ return e.checked; }).map(function(e){ return e.value; });
  var raw = (document.getElementById("hcRaw") || {}).checked, prod = (document.getElementById("hcProd") || {}).checked, F = _hcS().forms;
  var body = ids.map(function(k){ var f = JSON.parse(JSON.stringify(F[k])); f._id = k; return _hcPage(f, ym); }).join("");
  if(raw || prod){
    if(!RW.D){ _rwLoad(); return toast("원료수불부 불러오는 중 — 잠깐 뒤 다시 눌러 주세요", true); }
    var f0 = ym + "-01", t0 = ym + "-" + ("0" + new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate()).slice(-2);
    var rb = ""; if(raw) _rwMats().forEach(function(m){ var P = _rwLedgerPage(m, f0, t0); if(P.n) rb += P.html; });
    if(prod){ var P2 = _rwS().prods || {}, pid = Object.keys(P2).filter(function(k){ return P2[k].dt >= f0 && P2[k].dt <= t0; }); if(pid.length) rb += rwPrintProdIds(pid, true); }
    if(rb) body += '<style>.pg h1{text-align:center}.pg td,.pg th{border:1px solid #333;padding:4px 6px;font-size:11.5px}.pg th{background:#eef2f7}.pg table{width:100%;border-collapse:collapse}.pg .r{text-align:right}.pg .c{text-align:center}</style>' + rb;
  }
  if(!body) return toast("뽑을 게 없어요", true);
  closePopup(); _hcWin("해썹 서류 " + ym, body);
}

// ════════ ⚙ 양식 관리 ════════
function dHcForm(){
  var g = _hcGate(); if(g) return g;
  var fl = _hcForms(true), F = _hcS().forms || {}, S = _hcSet(), boss = _hcBoss();
  var h = _hcHead("⚙ 해썹 양식 관리", "업체 양식이 오면 여기서 그대로 만들어요 · 줄을 두 번 누르면 수정");
  h += '<div class="card" style="margin-bottom:10px;display:grid;grid-template-columns:2fr 2fr auto;gap:8px;align-items:end;font-size:13px"><label>업체명 (서류 위에 찍힘)<input id="hs_co" value="' + esc(S.co) + '" ' + (boss ? "" : "disabled") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label><label>결재란 (쉼표로)<input id="hs_sign" value="' + esc(S.sign.join(", ")) + '" ' + (boss ? "" : "disabled") + ' style="width:100%;padding:7px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box"></label>' + (boss ? _bsB("#0f766e", "💾 저장", "hcSetSave()", "padding:8px 16px") : "") + '</div>';
  if(!fl.length) return h + _hcEmpty();
  h += '<div class="card" style="padding:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;flex-wrap:wrap;gap:6px"><b>양식 ' + fl.length + '개</b><div style="display:flex;gap:6px">' + (boss ? _bsB("#be123c", "🌡 온도계" + (((_hcS().set || {}).iot || {}).on ? " 켜짐" : ""), "hcIotEdit()") + _bsB("#b45309", "🔔 알림" + (((_hcS().set || {}).tg || {}).on ? " 켜짐" : ""), "hcTgEdit()") + _bsB("#0369a1", "🧊 냉동고 " + (_hcS().set && _hcS().set.frz ? _hcS().set.frz.length + "대" : "관리"), "hcFrzEdit()") + _bsB("#64748b", "📋 기본 양식 더 넣기", "hcPresetPick()") + _bsB("#0f766e", "+ 새 양식", "hcFormEdit('')") : "") + '</div></div><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f0fdfa"><th style="padding:6px;text-align:left">순서</th><th style="text-align:left">양식</th><th style="text-align:left">모양</th><th style="text-align:left">구분</th><th style="text-align:left">주기</th><th style="text-align:right">항목·칸</th><th style="text-align:center">사용</th><th></th></tr></thead><tbody>';
  fl.forEach(function(k){ var f = F[k];
    h += '<tr style="' + (f.off ? "opacity:.55" : "") + '"><td style="padding:6px;border-bottom:1px solid #f1f5f9">' + _bsN(f.ord) + '</td><td style="border-bottom:1px solid #f1f5f9;font-weight:800">' + esc(f.nm) + '</td><td style="border-bottom:1px solid #f1f5f9">' + (f.kind === "chk" ? "☑ 점검표" : "📝 기록표") + '</td><td style="border-bottom:1px solid #f1f5f9">' + esc(f.cat || "") + '</td><td style="border-bottom:1px solid #f1f5f9">' + (HC_FREQ[f.freq] || "") + '</td><td style="border-bottom:1px solid #f1f5f9;text-align:right">' + (f.kind === "chk" ? (f.items || []).length : (f.cols || []).length) + '</td><td style="border-bottom:1px solid #f1f5f9;text-align:center">' + (f.off ? "끔" : "✅") + '</td><td style="border-bottom:1px solid #f1f5f9;padding:4px;white-space:nowrap">' + (boss ? _bsB("#2563eb", "수정", "hcFormEdit('" + k + "')", "padding:3px 9px") + ' ' + _bsB("#7c3aed", "복사", "hcFormCopy('" + k + "')", "padding:3px 9px") : "") + ' ' + _bsB("#475569", "🖨 빈 양식", "hcPrintBlank('" + k + "')", "padding:3px 9px") + ' ' + _bsB("#0f766e", "📱 QR", "hcQrPrint('" + k + "')", "padding:3px 9px") + '</td></tr>'; });
  return h + '</tbody></table></div>';
}
function hcSetSave(){ var co = (document.getElementById("hs_co") || {}).value.trim(), sg = (document.getElementById("hs_sign") || {}).value.split(/[,，]/).map(function(x){ return x.trim(); }).filter(function(x){ return x; }); var v = { co: co, sign: sg }; _hcRef("set").update(v).then(function(){ HC.D.set = Object.assign({}, HC.D.set || {}, v); toast("저장"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); }); }
function hcPrintBlank(k){ var f = JSON.parse(JSON.stringify(_hcS().forms[k])); f._id = "__blank__"; _hcWin(f.nm + " (빈 양식)", _hcPage(f, (HC.ym || _bsToday().slice(0, 7)))); }
function hcPresetAll(){
  if(!_hcBoss()) return; if(_hcForms(true).length && !confirm("기본 양식을 더 넣을까요? (이름 같은 양식은 건너뜀)")) return;
  var have = {}, F = _hcS().forms || {}; Object.keys(F).forEach(function(k){ have[F[k].nm] = 1; });
  var up = {}, n = 0; HC_PRESETS.forEach(function(p, i){ if(have[p.nm]) return; var f = JSON.parse(JSON.stringify(p)); f.ord = (i + 1) * 10; f.off = !!f.off; up["forms/" + _hcRef("forms").push().key] = f; n++; });
  if(!n) return toast("기본 양식이 다 있어요");
  _hcRef().update(up).then(function(){ HC.D.forms = HC.D.forms || {}; Object.keys(up).forEach(function(p){ HC.D.forms[p.split("/")[1]] = up[p]; }); closePopup(); toast("기본 양식 " + n + "개 넣었어요 — 쓰지 않는 건 끄고, 업체에 맞게 고쳐 쓰세요"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function hcPresetPick(){ hcPresetAll(); }
function hcFormCopy(k){ var f = JSON.parse(JSON.stringify(_hcS().forms[k])); f.nm = f.nm + " (복사)"; f.ord = _bsN(f.ord) + 1; HC.fe = { k: "", f: f }; f.items = f.items || []; f.cols = f.cols || []; _hcFormUI(); toast("복사본이에요 — 이름·항목을 바꿔서 저장하세요"); }
function hcFormEdit(k){
  var f = k ? JSON.parse(JSON.stringify(_hcS().forms[k])) : { nm: "", kind: "chk", cat: "선행요건", freq: "day", items: [{ t: "", std: "" }], cols: [{ lb: "", type: "text" }], std: "", land: false, off: false, ord: (_hcForms(true).length + 1) * 10 };
  f.items = f.items || []; f.cols = f.cols || []; HC.fe = { k: k || "", f: f }; _hcFormUI();
}
function _hcFormUI(){
  var E = HC.fe, f = E.f, I = function(v, on, w, ex){ return '<input value="' + esc(v == null ? "" : v) + '" oninput="' + on + '" ' + (ex || "") + ' style="width:' + (w || "100%") + ';padding:6px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box">'; };
  var Sel = function(v, on, opts){ return '<select onchange="' + on + '" style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:5px">' + opts.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === v ? " selected" : "") + '>' + o[1] + '</option>'; }).join("") + '</select>'; };
  var h = '<h3 style="margin:0 0 10px">⚙ ' + (E.k ? "양식 고치기" : "새 양식") + ' <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 70px;gap:8px;font-size:13px"><label>양식 이름' + I(f.nm, "HC.fe.f.nm=this.value") + '</label><label>구분' + Sel(f.cat, "HC.fe.f.cat=this.value", [["선행요건", "선행요건"], ["CCP", "CCP"], ["기타", "기타"]]) + '</label><label>주기' + Sel(f.freq, "HC.fe.f.freq=this.value", Object.keys(HC_FREQ).map(function(x){ return [x, HC_FREQ[x]]; })) + '</label><label>순서' + I(f.ord, "HC.fe.f.ord=_bsN(this.value)", "100%", 'type="number"') + '</label></div>';
  h += '<label style="font-size:13px;display:block;margin-top:8px">기준·방법 (서류 위에 찍힘)' + I(f.std, "HC.fe.f.std=this.value") + '</label>';
  h += '<div style="display:flex;gap:8px;margin:10px 0">' + [["chk", "☑ 점검표 — 항목마다 ○/× (날짜가 가로로)"], ["log", "📝 기록표 — 칸마다 값 (한 번에 한 줄)"]].map(function(o){ var on = f.kind === o[0]; return '<label style="flex:1;border:2px solid ' + (on ? "#0f766e" : "#e5e7eb") + ';background:' + (on ? "#f0fdfa" : "#fff") + ';border-radius:8px;padding:8px;cursor:pointer;font-size:13px;font-weight:700"><input type="radio" name="hck" ' + (on ? "checked" : "") + ' onchange="HC.fe.f.kind=\'' + o[0] + '\';_hcFormUI()"> ' + o[1] + '</label>'; }).join("") + '</div>';
  if(f.kind === "chk"){
    h += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">점검 항목 · 기준</div>';
    f.items.forEach(function(it, i){ h += '<div style="display:flex;gap:6px;margin-bottom:5px">' + I(it.t, "HC.fe.f.items[" + i + "].t=this.value", "58%", 'placeholder="항목"') + I(it.std, "HC.fe.f.items[" + i + "].std=this.value", "32%", 'placeholder="기준"') + _hcMv("items", i) + '</div>'; });
    h += _bsB("#0f766e", "+ 항목", "HC.fe.f.items.push({t:'',std:''});_hcFormUI()", "padding:4px 10px");
  } else {
    h += '<div style="font-size:13px;font-weight:700;margin-bottom:4px">칸 <span class="mut" style="font-weight:400;font-size:12px">— 날짜·판정·개선조치·작성자 칸은 저절로 들어가요 · 숫자 칸에 최소·최대를 넣으면 벗어날 때 빨갛게</span></div>';
    f.cols.forEach(function(c, i){ h += '<div style="display:grid;grid-template-columns:2fr 1.2fr .8fr .8fr .8fr auto;gap:5px;margin-bottom:5px">' + I(c.lb, "HC.fe.f.cols[" + i + "].lb=this.value", "100%", 'placeholder="칸 이름"') + Sel(c.type, "HC.fe.f.cols[" + i + "].type=this.value;_hcFormUI()", Object.keys(HC_TYPE).map(function(x){ return [x, HC_TYPE[x]]; })) +
      (c.type === "num" ? I(c.min, "HC.fe.f.cols[" + i + "].min=this.value", "100%", 'type="number" step="any" placeholder="최소"') + I(c.max, "HC.fe.f.cols[" + i + "].max=this.value", "100%", 'type="number" step="any" placeholder="최대"') + I(c.unit, "HC.fe.f.cols[" + i + "].unit=this.value", "100%", 'placeholder="단위"') : '<span></span><span></span><span></span>') + _hcMv("cols", i) + '</div>'; });
    h += _bsB("#0f766e", "+ 칸", "HC.fe.f.cols.push({lb:'',type:'text'});_hcFormUI()", "padding:4px 10px");
  }
  h += '<div style="display:flex;gap:16px;margin-top:10px;font-size:13px;flex-wrap:wrap">' + (f.kind === "log" ? '<label><input type="checkbox" ' + (f.hw ? "checked" : "") + ' onchange="HC.fe.f.hw=this.checked"> ✍ 손글씨로 적기 (서류에 손글씨 그대로)</label>' : '') + '<label><input type="checkbox" ' + (f.sig ? "checked" : "") + ' onchange="HC.fe.f.sig=this.checked"> ✍ 서명 받기</label><label><input type="checkbox" ' + (f.land ? "checked" : "") + ' onchange="HC.fe.f.land=this.checked"> 가로로 인쇄</label><label><input type="checkbox" ' + (f.off ? "checked" : "") + ' onchange="HC.fe.f.off=this.checked"> 안 씀 (오늘 기록에서 숨김)</label></div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:12px">' + (E.k ? _bsB("#dc2626", "🗑 삭제", "hcFormDel()") : "<span></span>") + _bsB("#16a34a", "💾 저장", "hcFormSave()", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 680);
}
function _hcMv(a, i){ return '<button class="btn" title="위로" style="background:#e2e8f0;padding:2px 6px" onclick="var L=HC.fe.f.' + a + ';if(' + i + '>0){var t=L[' + i + '];L[' + i + ']=L[' + (i - 1) + '];L[' + (i - 1) + ']=t;_hcFormUI()}">▲</button><button class="btn" style="background:#dc2626;color:#fff;padding:2px 7px" onclick="HC.fe.f.' + a + '.splice(' + i + ',1);_hcFormUI()">✕</button>'; }
function hcFormSave(){
  var E = HC.fe, f = JSON.parse(JSON.stringify(E.f)); f.nm = String(f.nm || "").trim(); if(!f.nm) return toast("양식 이름을 넣어 주세요", true);
  f.items = (f.items || []).filter(function(x){ return String(x.t || "").trim(); }).map(function(x){ return { t: String(x.t).trim(), std: String(x.std || "").trim() }; });
  f.cols = (f.cols || []).filter(function(x){ return String(x.lb || "").trim(); }).map(function(x){ var o = { lb: String(x.lb).trim(), type: x.type || "text" }; if(o.type === "num"){ if(x.min !== "" && x.min != null) o.min = _bsN(x.min); if(x.max !== "" && x.max != null) o.max = _bsN(x.max); if(x.unit) o.unit = String(x.unit).trim(); } return o; });
  f.hw = f.kind === "log" && !!f.hw; f.sig = !!f.sig;
  if(f.kind === "chk"){ if(!f.items.length) return toast("점검 항목을 넣어 주세요", true); delete f.cols; } else { if(!f.cols.length) return toast("칸을 넣어 주세요", true); delete f.items; }
  var used = E.k && Object.keys(((_hcS().recs || {})[E.k]) || {}).length; if(used && _hcS().forms[E.k].kind !== f.kind) return toast("기록이 있는 양식은 모양(점검표/기록표)을 못 바꿔요 — 새 양식으로 만들어 주세요", true);
  var ref = E.k ? _hcRef("forms/" + E.k) : _hcRef("forms").push(), key = E.k || ref.key;
  ref.set(f).then(function(){ HC.D.forms = HC.D.forms || {}; HC.D.forms[key] = f; closePopup(); toast("양식 저장 — " + f.nm); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function hcFormDel(){ var E = HC.fe, n = Object.keys(((_hcS().recs || {})[E.k]) || {}).length; if(n) return toast("기록이 " + n + "건 있어서 못 지워요 — '안 씀'으로 해 주세요", true); if(!confirm(E.f.nm + " 양식을 지울까요?")) return; _hcRef("forms/" + E.k).remove().then(function(){ delete HC.D.forms[E.k]; closePopup(); draw(); }); }

// ════════ 🧊 냉동고 여러 대 — 냉동고마다 따로 '온도 기록부' 양식(=일지·QR)을 만들어요 ════════
//   /main/Haccp/set/frz = [{nm, max}] · 양식 f.frz = 냉동고 이름 (이 표시로 짝지음)
//   빼면 그 양식은 '끔'(기록은 그대로) · 예전 한 장짜리 '냉동고 온도 기록부'(칸 4개)는 기록 없으면 끔
function _hcFrzList(){ var a = (_hcS().set || {}).frz; if(a && a.length) return a; return [1, 2, 3, 4].map(function(i){ return { nm: "냉동고 " + i, max: -18 }; }); }
function hcFrzEdit(L){
  HC.fz = L || JSON.parse(JSON.stringify(_hcFrzList()));
  var h = '<h3 style="margin:0 0 6px">🧊 냉동고 관리</h3><div class="mut" style="font-size:12.5px;margin-bottom:10px">냉동고마다 <b>따로 온도 기록부</b>가 생겨요 (오늘 기록·QR·인쇄 다 따로) · QR을 뽑아 냉동고 문에 붙이면 폰으로 바로 적어요</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 110px 34px;gap:6px;align-items:center;font-size:12.5px;font-weight:800;color:#475569;margin-bottom:4px"><span>이름 (예: 1번 냉동고, 창고 냉동고)</span><span>기준 (℃ 이하)</span><span></span></div>';
  HC.fz.forEach(function(z, i){ h += '<div style="display:grid;grid-template-columns:1fr 110px 34px;gap:6px;align-items:center;margin-bottom:5px"><input value="' + esc(z.nm) + '" oninput="HC.fz[' + i + '].nm=this.value" style="padding:8px;font-size:15px;border:1px solid #cbd5e1;border-radius:7px"><input type="number" value="' + esc(z.max) + '" oninput="HC.fz[' + i + '].max=this.value" style="padding:8px;font-size:15px;border:1px solid #cbd5e1;border-radius:7px;text-align:right"><button class="btn" onclick="HC.fz.splice(' + i + ',1);hcFrzEdit(HC.fz)" style="background:#dc2626;color:#fff;padding:6px">✕</button></div>'; });
  h += _bsB("#0369a1", "+ 냉동고 추가", "HC.fz.push({nm:'냉동고 '+(HC.fz.length+1),max:-18});hcFrzEdit(HC.fz)", "padding:5px 12px;margin-top:4px");
  h += '<div class="mut" style="font-size:12px;margin-top:8px">이름을 바꾸면 새 기록부가 생기고, 예전 이름 기록부는 꺼져요 (기록은 그대로 남음)</div>';
  h += '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px">' + _bsB("#475569", "취소", "closePopup()") + _bsB("#16a34a", "💾 저장 · 기록부 만들기", "hcFrzSave()", "padding:8px 18px") + '</div>';
  openPopup(h, 480);
}
function hcFrzSave(){
  var L = HC.fz.map(function(z){ return { nm: String(z.nm || "").trim(), max: z.max === "" || z.max == null ? -18 : _bsN(z.max) }; }).filter(function(z){ return z.nm; });
  var seen = {}; for(var i = 0; i < L.length; i++){ if(seen[L[i].nm]) return toast("이름이 겹쳐요: " + L[i].nm, true); seen[L[i].nm] = 1; }
  var F = _hcS().forms || {}, R = _hcS().recs || {}, up = { "set/frz": L }, mine = {}, base = 0, msg = [];
  Object.keys(F).forEach(function(k){ var f = F[k]; if(f.frz) mine[f.frz] = k; if(/냉동고/.test(f.nm) && !f.frz) base = base || _bsN(f.ord); });
  base = base || (_hcForms(true).length + 1) * 10;
  L.forEach(function(z, i){ var k = mine[z.nm], std = "하루 2번 이상 (작업 전·후) · " + z.nm + " " + z.max + "℃ 이하";
    if(k){ up["forms/" + k + "/off"] = false; up["forms/" + k + "/std"] = std; up["forms/" + k + "/cols/1/max"] = z.max; up["forms/" + k + "/ord"] = base + (i + 1) / 10; }
    else { var nk = _hcRef("forms").push().key; up["forms/" + nk] = { nm: "냉동고 온도 기록부 — " + z.nm, kind: "log", cat: "선행요건", freq: "day", hw: true, sig: true, frz: z.nm, std: std, ord: base + (i + 1) / 10, off: false,
      cols: [{ lb: "측정 시간", type: "time" }, { lb: "온도", type: "num", max: z.max, unit: "℃" }, { lb: "이상 시 조치", type: "text" }] }; msg.push(z.nm); } });
  Object.keys(mine).forEach(function(nm){ if(!seen[nm]) up["forms/" + mine[nm] + "/off"] = true; });
  // 예전 한 장짜리(칸에 냉동고 여러 개) — 기록 없으면 끄기
  Object.keys(F).forEach(function(k){ var f = F[k]; if(f.frz || f.off || !/냉동고/.test(f.nm) || f.kind !== "log") return; var n = (f.cols || []).filter(function(c){ return /냉동고/.test(c.lb); }).length; if(n < 2) return;
    if(!Object.keys(R[k] || {}).length) up["forms/" + k + "/off"] = true; else msg.push("(예전 「" + f.nm + "」은 기록이 있어서 그대로 둠 — 안 쓰면 수정에서 '안 씀')"); });
  _hcRef().update(up).then(function(){ closePopup(); HC.D = null; _hcLoad(); toast("🧊 냉동고 " + L.length + "대 저장" + (msg.length ? " — 새 기록부: " + msg.join(", ") : "")); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}


// ════════ ⚡ 한 번에 적기 — 매일 일지 중 아직 안 한 것만 한 줄씩 (실제로 확인·측정한 값만) ════════
function _hcQuick(dt){
  var F = _hcS().forms || {}, L = _hcForms().filter(function(k){ var f = F[k]; return f.freq === "day" && !_hcDone(k, dt).length; });
  HC.qk = L;
  if(!L.length) return '';
  var now = new Date(), hm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
  var ip = 'padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:15px;box-sizing:border-box';
  var h = '<div class="card" style="margin-bottom:10px;border:2px solid #f59e0b;background:#fffbeb"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px"><b style="font-size:15.5px">⚡ 한 번에 적기 — 오늘 아직 안 한 매일 일지 ' + L.length + '개</b><span class="mut" style="font-size:12px">실제로 확인·측정한 값만 · 기준 벗어나면 빨갛게</span></div>';
  L.forEach(function(k, n){ var f = F[k];
    h += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:7px 0;border-top:1px dashed #fcd34d"><b style="min-width:150px;font-size:14px">' + esc(f.nm) + '</b>';
    if(f.kind === "chk"){
      h += f.sig ? _bsB("#0f766e", "✏ 점검하기 (서명 있음)", "hcChkEdit('" + k + "')", "padding:6px 12px") : _bsB("#16a34a", "✓ 이상 없음 — 확인했어요 (" + (f.items || []).length + "항목)", "hcQuickChk(" + n + ")", "padding:6px 12px") + ' ' + _bsB("#64748b", "하나씩", "hcChkEdit('" + k + "')", "padding:6px 10px");
    } else if(f.hw || (f.cols || []).length > 6){
      h += _bsB("#0f766e", "✏ 적기", "hcLogEdit('" + k + "','')", "padding:6px 12px");
    } else {
      (f.cols || []).forEach(function(c, i){ var id = "hq_" + n + "_" + i, sd = _hcStdTxt(c);
        h += '<label style="font-size:11.5px;color:#475569;display:flex;flex-direction:column">' + esc(c.lb) + (c.unit ? ' (' + esc(c.unit) + ')' : '');
        if(c.type === "ok") h += '<select id="' + id + '" style="' + ip + '"><option value=""></option><option value="O">적합 ○</option><option value="X">부적합 ×</option></select>';
        else h += '<input id="' + id + '" type="' + (c.type === "num" ? "number" : c.type === "time" ? "time" : c.type === "date" ? "date" : "text") + '"' + (c.type === "num" ? ' step="any" inputmode="decimal" placeholder="' + esc(sd) + '" oninput="_hcQChk(' + n + ')"' : '') + ' value="' + (c.type === "time" ? hm : c.type === "date" ? dt : "") + '" style="' + ip + ';width:' + (c.type === "num" ? "96px" : c.type === "text" ? "140px" : "110px") + '">';
        h += '</label>'; });
      h += _bsB("#16a34a", "💾", "hcQuickLog(" + n + ")", "padding:7px 14px;align-self:flex-end");
    }
    h += '</div>'; });
  return h + '</div>';
}
function _hcQChk(n){ var k = HC.qk[n], f = _hcS().forms[k]; (f.cols || []).forEach(function(c, i){ var e = document.getElementById("hq_" + n + "_" + i); if(!e) return; var b = _hcBadCol(c, e.value === "" ? "" : (c.type === "num" ? _bsN(e.value) : e.value)); e.style.borderColor = b ? "#dc2626" : "#cbd5e1"; e.style.background = b ? "#fef2f2" : ""; }); }
function _hcSaveRec(fid, key, r){ var ref = key ? _hcRef("recs/" + fid + "/" + key) : _hcRef("recs/" + fid).push(), id = key || ref.key;
  return ref.set(r).then(function(){ HC.D.recs = HC.D.recs || {}; HC.D.recs[fid] = HC.D.recs[fid] || {}; HC.D.recs[fid][id] = r; }); }
function hcQuickChk(n){
  var k = HC.qk[n], f = _hcS().forms[k], dt = HC.dt || _bsToday(), v = {};
  if(!confirm("「" + f.nm + "」 " + (f.items || []).length + "항목을 지금 실제로 다 확인했나요?\n하나라도 문제가 있으면 「하나씩」으로 적어 주세요.")) return;
  (f.items || []).forEach(function(it, i){ v[i] = "O"; });
  _hcSaveRec(k, dt, { dt: dt, v: v, note: "", fix: "", bad: false, by: (ME && (ME.nm || ME.id)) || CID || "", at: new Date().toISOString(), quick: true }).then(function(){ toast(f.nm + " 저장"); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
function hcQuickLog(n){
  var k = HC.qk[n], f = _hcS().forms[k], dt = HC.dt || _bsToday(), v = {}, bad = [];
  (f.cols || []).forEach(function(c, i){ var e = document.getElementById("hq_" + n + "_" + i), x = e ? String(e.value).trim() : ""; if(x === "") return; v[i] = c.type === "num" ? _bsN(x) : x; if(_hcBadCol(c, v[i])) bad.push(c.lb); });
  var need = (f.cols || []).filter(function(c, i){ return (c.type === "num" || c.type === "ok") && v[i] === undefined; });
  if(need.length) return toast("측정값을 넣어 주세요: " + need.map(function(c){ return c.lb; }).join(", "), true);
  var fix = "";
  if(bad.length){ fix = prompt("⚠ 기준 벗어남: " + bad.join(", ") + "\n개선조치를 적어 주세요 (예: 냉동고 문 닫고 30분 뒤 다시 측정 -19℃)", ""); if(fix === null) return; fix = fix.trim(); if(!fix) return toast("기준을 벗어나면 개선조치를 꼭 적어야 해요", true); }
  _hcSaveRec(k, "", { dt: dt, v: v, fix: fix, bad: bad.length > 0, by: (ME && (ME.nm || ME.id)) || CID || "", at: new Date().toISOString(), quick: true }).then(function(){ toast(f.nm + " 저장" + (bad.length ? " (부적합)" : "")); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ════════ 🔔 알림 (텔레그램) — PC 의 파일봇이 읽어서 보냄: 텔레그램파일봇/haccp_notify.py ════════
//  /main/Haccp/set/tg = { on, am, pm, off:[0~6 (일=0)], since, to:[{nm,id}], boss:true }
function hcTgEdit(){
  if(!_hcBoss()) return toast("관리자만 바꿀 수 있어요", true);
  var T = JSON.parse(JSON.stringify(((_hcS().set || {}).tg) || {})); T.to = T.to || []; if(T.am == null) T.am = 9; if(T.pm == null) T.pm = 17; if(!T.off) T.off = [0]; if(!T.since) T.since = _bsToday(); if(T.boss == null) T.boss = true;
  HC.tg = T; _hcTgDraw();
}
function _hcTgDraw(){
  var T = HC.tg, ip = 'padding:6px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box';
  var h = '<h3 style="margin:0 0 6px">🔔 해썹 일지 알림 <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>'
    + '<div class="mut" style="font-size:12.5px;line-height:1.6;margin-bottom:8px">PC의 텔레그램 파일봇이 보내요 (PC가 켜져 있어야 해요).<br>· <b>아침</b>: 오늘 적을 일지 목록 → 받을 사람에게<br>· <b>저녁</b>: 아직 안 적은 것만 → 받을 사람에게 (다 했으면 안 보냄)<br>· <b>빈 날 2일 이상</b>이면 → 사장님(파일봇 주인)에게</div>'
    + '<label style="display:flex;gap:8px;align-items:center;font-size:15px;font-weight:800;margin-bottom:8px"><input type="checkbox" id="tg_on" style="width:20px;height:20px"' + (T.on ? ' checked' : '') + '>알림 켜기</label>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;font-size:13px"><label>아침 몇 시<input id="tg_am" type="number" min="0" max="23" value="' + T.am + '" style="width:100%;' + ip + '"></label><label>저녁 몇 시<input id="tg_pm" type="number" min="0" max="23" value="' + T.pm + '" style="width:100%;' + ip + '"></label><label>빈 날 따지기 시작일<input id="tg_since" type="date" value="' + esc(T.since) + '" style="width:100%;' + ip + '"></label></div>'
    + '<div style="font-size:13px;margin:8px 0 4px;font-weight:700">쉬는 요일 (알림·빈 날 계산에서 뺌)</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + "일월화수목금토".split("").map(function(w, i){ return '<label style="border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;font-size:14px"><input type="checkbox" id="tg_off' + i + '"' + (T.off.indexOf(i) >= 0 ? ' checked' : '') + '> ' + w + '</label>'; }).join('') + '</div>'
    + '<label style="display:flex;gap:6px;align-items:center;font-size:13.5px;margin-top:8px"><input type="checkbox" id="tg_boss"' + (T.boss ? ' checked' : '') + '>빈 날 2일 이상이면 사장님께 알림</label>'
    + '<div style="font-size:13px;margin:10px 0 4px;font-weight:700">받을 사람 <span class="mut" style="font-weight:400;font-size:12px">— 비우면 사장님께만 가요</span></div>'
    + '<div style="font-size:12px;background:#f1f5f9;border-radius:6px;padding:6px 8px;margin-bottom:6px;line-height:1.6">번호 알아내기: 받을 사람이 폰 텔레그램에서 <b>@jhwphoto_bot</b> (photobot)을 찾아 <b>/start</b> 를 보내면 봇이 「내 번호」를 알려 줘요 → 그 숫자를 아래에 적기</div>';
  T.to.forEach(function(p, i){ h += '<div style="display:flex;gap:6px;margin-bottom:4px"><input id="tg_nm' + i + '" value="' + esc(p.nm || "") + '" placeholder="이름" style="width:120px;' + ip + '"><input id="tg_id' + i + '" value="' + esc(p.id || "") + '" placeholder="텔레그램 번호" inputmode="numeric" style="flex:1;' + ip + '">' + _bsB("#64748b", "✕", "_hcTgSync();HC.tg.to.splice(" + i + ",1);_hcTgDraw()", "padding:4px 10px") + '</div>'; });
  h += _bsB("#0f766e", "+ 받을 사람", "_hcTgSync();HC.tg.to.push({nm:'',id:''});_hcTgDraw()", "padding:5px 12px");
  h += '<div style="text-align:right;margin-top:12px">' + _bsB("#16a34a", "💾 저장", "hcTgSave()", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 560);
}
function _hcTgSync(){ var T = HC.tg, g = function(id){ return document.getElementById(id); };
  if(!g("tg_on")) return; T.on = g("tg_on").checked; T.am = Math.min(23, Math.max(0, _bsN(g("tg_am").value))); T.pm = Math.min(23, Math.max(0, _bsN(g("tg_pm").value))); T.since = g("tg_since").value; T.boss = g("tg_boss").checked;
  T.off = []; for(var i = 0; i < 7; i++) if(g("tg_off" + i).checked) T.off.push(i);
  T.to.forEach(function(p, i){ var a = g("tg_nm" + i), b = g("tg_id" + i); if(a) p.nm = a.value.trim(); if(b) p.id = b.value.replace(/[^\d-]/g, ""); }); }
function hcTgSave(){
  _hcTgSync(); var T = HC.tg; T.to = T.to.filter(function(p){ return p.id; });
  if(T.pm <= T.am) return toast("저녁 시각이 아침보다 늦어야 해요", true);
  _hcRef("set/tg").set(T).then(function(){ HC.D.set = HC.D.set || {}; HC.D.set.tg = T; closePopup(); toast("🔔 알림 설정 저장" + (T.on ? " — 켜짐" : " — 꺼짐")); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}


// ════════ 🌡 온도계 (ESP32 아두이노) — PC 파일봇(텔레그램파일봇/iot_server.py)이 받아서 정한 시각에 일지에 「자동 측정」 ════════
//  /main/Haccp/set/iot = { on, key, times:["09:00","17:00"], devs:[{id, nm, fid, col}] }
//  /main/Haccp/iot/{온도계} = 최신값 {t, at} · /main/Haccp/iot/_srv = {ip, port} · 5분 기록은 /main/HaccpIotLog (무거워서 따로)
function _hcIotStrip(){
  var I = (_hcS().set || {}).iot || {}, L = _hcS().iot || {}; if(!I.on || !(I.devs || []).length) return '';
  var F = _hcS().forms || {}, now = Date.now();
  return '<div class="card" style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b>🌡 온도계</b>' + (I.devs || []).map(function(d){
    var x = L[d.id], c = ((F[d.fid] || {}).cols || [])[d.col] || {}, at = x && x.at ? new Date(String(x.at).replace(" ", "T")).getTime() : 0, old = !at || now - at > 30 * 60000, bad = x && _hcBadCol(c, x.t);
    return '<span style="border:2px solid ' + (bad ? "#dc2626" : old ? "#94a3b8" : "#16a34a") + ';border-radius:8px;padding:3px 10px;font-size:14px;background:' + (bad ? "#fef2f2" : "#fff") + '"><b>' + esc(d.nm || d.id) + '</b> ' + (x ? '<b style="font-size:16px;color:' + (bad ? "#dc2626" : old ? "#64748b" : "#0f172a") + '">' + x.t + '℃</b> <span class="mut" style="font-size:11.5px">' + esc(String(x.at).slice(11, 16)) + (old ? ' · 끊김?' : '') + '</span>' : '<span class="mut">아직 안 들어옴</span>') + '</span>'; }).join('')
    + '<span class="mut" style="font-size:11.5px">' + (I.times || []).join("·") + ' 에 일지 자동 기록 · 화면 새로 열면 최신값</span></div>';
}
function hcIotEdit(){
  if(!_hcBoss()) return toast("관리자만 바꿀 수 있어요", true);
  var I = JSON.parse(JSON.stringify(((_hcS().set || {}).iot) || {}));
  if(!I.key){ var a = new Uint8Array(9); (window.crypto || window.msCrypto).getRandomValues(a); I.key = Array.prototype.map.call(a, function(b){ return ("0" + b.toString(16)).slice(-2); }).join(""); }
  if(!I.times) I.times = ["09:00", "17:00"];
  if(!I.devs){ var fz = Object.keys(_hcS().forms || {}).filter(function(k){ return /온도/.test(_hcS().forms[k].nm); })[0]; I.devs = fz ? (_hcS().forms[fz].cols || []).map(function(c, i){ return c.type === "num" ? { id: "frz" + i, nm: c.lb, fid: fz, col: i } : null; }).filter(Boolean) : []; }
  HC.iot = I; _hcIotDraw();
}
function _hcIotDraw(){
  var I = HC.iot, F = _hcS().forms || {}, L = _hcS().iot || {}, srv = L._srv || {}, ip = 'padding:5px;border:1px solid #cbd5e1;border-radius:6px;font-size:13.5px;box-sizing:border-box';
  var logF = _hcForms().filter(function(k){ return F[k].kind !== "chk"; });
  var h = '<h3 style="margin:0 0 6px">🌡 온도계 (아두이노) <button class="btn" style="background:#475569;float:right" onclick="closePopup()">닫기</button></h3>'
    + '<div class="mut" style="font-size:12.5px;line-height:1.65;margin-bottom:8px">와이파이 아두이노(ESP32)가 5분마다 <b>PC 파일봇</b>으로 온도를 보내요 → 아래 <b>시각</b>에 해썹 일지에 <b>실제 받은 값</b>을 「자동 측정」으로 적어요. 그 시각 30분 안에 받은 값이 없으면 안 적고 텔레그램으로 알려요. 기준을 2번 연달아 벗어나도 바로 알림 (🔔 알림의 받을 사람 + 사장님).<br>PC: <b>' + esc(srv.ip || "아직 모름 — 파일봇 켜지면 나옴") + (srv.port ? ':' + srv.port : '') + '</b> <span style="font-size:11.5px">(PC 주소가 바뀌면 아두이노 코드도 다시 받아야 해요 → 공유기에서 이 PC 주소 고정 권장)</span></div>'
    + '<label style="display:flex;gap:8px;align-items:center;font-size:15px;font-weight:800;margin-bottom:8px"><input type="checkbox" id="io_on" style="width:20px;height:20px"' + (I.on ? ' checked' : '') + '>온도계 받기 켜기</label>'
    + '<label style="font-size:13px">일지에 적을 시각 (쉼표로)<input id="io_times" value="' + esc((I.times || []).join(", ")) + '" style="width:100%;' + ip + '"></label>'
    + '<div style="font-size:13px;font-weight:800;margin:10px 0 4px">온도계 — 하나에 아두이노 한 개</div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="background:#f1f5f9"><th style="padding:4px">이름(영문·숫자)</th><th>표시 이름</th><th>적을 일지</th><th>칸</th><th>지금</th><th></th></tr>';
  (I.devs || []).forEach(function(d, i){
    var cols = ((F[d.fid] || {}).cols || []), x = L[d.id];
    h += '<tr><td style="padding:3px"><input id="io_id' + i + '" value="' + esc(d.id) + '" style="width:80px;' + ip + '"></td><td><input id="io_nm' + i + '" value="' + esc(d.nm || "") + '" style="width:100px;' + ip + '"></td>'
      + '<td><select id="io_f' + i + '" onchange="_hcIotSync();HC.iot.devs[' + i + '].col=-1;_hcIotDraw()" style="' + ip + ';max-width:150px">' + logF.map(function(k){ return '<option value="' + esc(k) + '"' + (k === d.fid ? ' selected' : '') + '>' + esc(F[k].nm) + '</option>'; }).join('') + '</select></td>'
      + '<td><select id="io_c' + i + '" style="' + ip + '">' + cols.map(function(c, j){ return c.type === "num" ? '<option value="' + j + '"' + (j === +d.col ? ' selected' : '') + '>' + esc(c.lb) + '</option>' : ''; }).join('') + '</select></td>'
      + '<td style="white-space:nowrap">' + (x ? x.t + '℃ <span class="mut" style="font-size:11px">' + esc(String(x.at).slice(5, 16)) + '</span>' : '<span class="mut">-</span>') + '</td>'
      + '<td style="white-space:nowrap">' + _bsB("#0f766e", "📄 코드", "_hcIotSync();hcIotIno(" + i + ")", "padding:3px 8px") + ' ' + _bsB("#64748b", "✕", "_hcIotSync();HC.iot.devs.splice(" + i + ",1);_hcIotDraw()", "padding:3px 8px") + '</td></tr>'; });
  h += '</table>' + _bsB("#0f766e", "+ 온도계", "_hcIotSync();var n=HC.iot.devs.length+1;HC.iot.devs.push({id:'frz'+n,nm:'냉동고 '+n,fid:'" + (logF[0] || "") + "',col:-1});_hcIotDraw()", "padding:5px 12px;margin-top:6px");
  h += '<div style="font-size:12px;margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:6px 8px">열쇠: <code>' + esc(I.key) + '</code> — 아두이노 코드에 자동으로 들어가요 (다른 사람이 가짜 값을 못 보내게)</div>';
  h += '<div style="text-align:right;margin-top:12px">' + _bsB("#16a34a", "💾 저장", "hcIotSave()", "padding:9px 22px") + '</div>';
  openPopup('<div style="max-height:86vh;overflow:auto">' + h + '</div>', 720);
}
function _hcIotSync(){ var I = HC.iot, g = function(id){ return document.getElementById(id); }; if(!g("io_on")) return;
  I.on = g("io_on").checked; I.times = g("io_times").value.split(/[,，\s]+/).map(function(t){ var m = t.match(/^(\d{1,2}):?(\d{2})$/); return m ? ("0" + m[1]).slice(-2) + ":" + m[2] : ""; }).filter(Boolean);
  (I.devs || []).forEach(function(d, i){ var a = g("io_id" + i), b = g("io_nm" + i), f = g("io_f" + i), c = g("io_c" + i); if(a) d.id = a.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30); if(b) d.nm = b.value.trim(); if(f) d.fid = f.value; if(c && c.value !== "") d.col = +c.value; }); }
function hcIotSave(){
  _hcIotSync(); var I = HC.iot, ids = {};
  for(var i = 0; i < I.devs.length; i++){ var d = I.devs[i]; if(!d.id) return toast("온도계 이름(영문·숫자)을 적어 주세요", true); if(ids[d.id]) return toast("온도계 이름이 겹쳐요: " + d.id, true); ids[d.id] = 1; if(!d.fid || d.col == null || d.col < 0) return toast(d.id + " — 적을 일지·칸을 골라 주세요", true); }
  if(I.on && !I.times.length) return toast("일지에 적을 시각을 넣어 주세요 (예: 09:00, 17:00)", true);
  _hcRef("set/iot").set(I).then(function(){ HC.D.set = HC.D.set || {}; HC.D.set.iot = I; closePopup(); toast("🌡 온도계 설정 저장" + (I.on ? " — 켜짐 (PC 파일봇이 2분 안에 읽어요)" : "")); draw(); }).catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// 📄 아두이노(ESP32 + DS18B20) 코드 — 와이파이 이름·비번만 고쳐서 올리면 됨
function hcIotIno(i){
  var I = HC.iot, d = I.devs[i], srv = (_hcS().iot || {})._srv || {};
  var code = [
    '// 🌡 가문굴비 해썹 온도계 — ' + (d.nm || d.id) + '  (ESP32 + DS18B20 방수 온도센서)',
    '// 배선: 센서 빨강=3.3V, 검정=GND, 노랑=GPIO4  + 노랑-3.3V 사이에 4.7kΩ 저항',
    '// 라이브러리(아두이노 IDE › 라이브러리 관리): OneWire, DallasTemperature   보드: ESP32 Dev Module',
    '// 5분마다 재서 PC 파일봇으로 보냄. PC 주소가 바뀌면 SERVER 만 고치면 돼요',
    '#include <WiFi.h>', '#include <HTTPClient.h>', '#include <OneWire.h>', '#include <DallasTemperature.h>', '',
    'const char* WIFI_NAME = "와이파이이름";      // ← 고치기',
    'const char* WIFI_PASS = "와이파이비번";      // ← 고치기',
    'const char* SERVER    = "http://' + (srv.ip || "192.168.0.10") + ':' + (srv.port || 8765) + '";',
    'const char* DEV       = "' + d.id + '";',
    'const char* KEY       = "' + I.key + '";',
    'const unsigned long EVERY_MS = 5UL * 60UL * 1000UL;   // 5분', '',
    'OneWire ow(4);', 'DallasTemperature sensors(&ow);', '',
    'void wifiOn(){', '  if(WiFi.status() == WL_CONNECTED) return;', '  WiFi.begin(WIFI_NAME, WIFI_PASS);',
    '  for(int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) delay(500);', '}', '',
    'void setup(){', '  Serial.begin(115200);', '  sensors.begin();', '  WiFi.mode(WIFI_STA);', '  wifiOn();', '}', '',
    'void loop(){',
    '  sensors.requestTemperatures();', '  float t = sensors.getTempCByIndex(0);',
    '  Serial.printf("%s %.1f C\\n", DEV, t);',
    '  if(t > -100){                       // -127 = 센서 빠짐 → 안 보냄',
    '    wifiOn();',
    '    if(WiFi.status() == WL_CONNECTED){',
    '      HTTPClient http;',
    '      String url = String(SERVER) + "/t?d=" + DEV + "&t=" + String(t, 1) + "&k=" + KEY;',
    '      http.begin(url);', '      int code = http.GET();', '      Serial.printf("보냄: %d\\n", code);', '      http.end();',
    '    }', '  }', '  delay(EVERY_MS);', '}', ''].join("\r\n");
  var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([code], { type: "text/plain;charset=utf-8" })); a.download = "haccp_" + d.id + ".ino"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast("📄 " + d.id + " 코드 받았어요 — 와이파이 이름·비번만 고쳐서 올리세요");
}
