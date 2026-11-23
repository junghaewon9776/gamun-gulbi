// ════════ 🔥 소방 — 소방계획서 (해마다 고치고 인쇄) ════════
//   /main/Fire/plans/{연도} = { gen:{…}, ins:{…}, chk:{…}, team:{f:{…}, rows:[…]}, … }  — 칸(구역)마다 f(칸 값) · rows(표 줄)
//   첫 해(2026) 내용은 DB에 넣어 둠(예전 한글 소방계획서에서 옮김) · 아무것도 없는 해는 빈 양식
//   새 해 = 앞 해 것을 통째로 복사 · 인쇄 = 소방청 표준 소방계획서(일반 소형 2·3급) 순서 그대로
//   buse.js 도우미(_bsB·_bsN·_bsToday·_bsMD·_bsCan) 같이 씀
var FR = { D: null, loading: false, yr: "" };
function _frS(){ return FR.D || {}; }
function _frRef(p){ return fbDb.ref("/main/Fire" + (p ? "/" + p : "")); }
function _frCan(){ return typeof _bsCan === "function" ? _bsCan() : !!ME; }
function _frLoad(){
  if(FR.loading) return; FR.loading = true;
  _frRef().once("value").then(function(s){ FR.loading = false; FR.D = s.val() || {}; if(/^fr/.test(CTAB)) draw(); })
    .catch(function(e){ FR.loading = false; toast("소방 자료 불러오기 실패: " + e.message, true); });
}
// 칸 정의: f = [키, 이름, 종류(date|num|area), 도움말] · rows = 표 칸 [키, 이름, 너비%]
var FR_SEC = [
  { k: "gen", t: "일반현황 (5.0)", f: [["nm", "명칭"], ["addr", "도로명주소"], ["tel", "대표 전화"], ["owner", "관리주체 (건물 소유)"], ["ownerNm", "대표자 (관계인)"], ["tenant", "입주(임차) 업체"], ["grade", "소방안전관리 등급"],
    ["mgr", "소방안전관리자"], ["mgrTel", "소방안전관리자 휴대전화"], ["mgrDate", "선임일자", "date"], ["mgrQual", "자격 구분"], ["sub", "소방안전관리 보조자"], ["subDate", "보조자 선임일자", "date"],
    ["bArea", "건축면적 (㎡)"], ["tArea", "연면적 (㎡)"], ["fArea", "바닥면적 (㎡)"], ["fl", "지상 층수"], ["bfl", "지하 층수"], ["hgt", "높이 (m)"], ["str", "구조"], ["roof", "지붕"], ["use", "용도"], ["appr", "사용승인일", "date"],
    ["stair", "계단 (구분·구역·제연설비)"], ["lift", "승강기 (승용·비상용)"], ["live", "거주인원"], ["work", "근무인원"], ["elder", "고령자"], ["kid", "영유아"], ["dis", "장애인 (이동/시각/청각/언어)"],
    ["keepYr", "계획서 보관 기간 (년)"], ["keepAt", "계획서 보관장소"]] },
  { k: "ins", t: "화재보험 (5.0)", rows: [["from", "가입 시작", 18], ["to", "가입 끝", 18], ["co", "보험사", 24], ["tgt", "가입대상", 16], ["amt", "가입금액", 24]], dt: { from: 1, to: 1 } },
  { k: "chk", t: "자체점검 (6.0)", f: [["work", "작동기능점검 날짜", "date"], ["workHow", "작동기능점검 방식 (자체/외주)"], ["full", "종합정밀점검 날짜 (해당 시)", "date"], ["fullHow", "종합정밀점검 방식"], ["agent", "업무대행 업체 (있으면)"], ["agentTel", "업무대행 연락처·면허번호"], ["agentTerm", "대행기간"], ["note", "비고"]] },
  { k: "daily", t: "일상적 안전관리 (8.0)", rows: [["kind", "구분", 18], ["item", "관리 항목", 42], ["cyc", "관리 주기", 40]] },
  { k: "proxy", t: "소방안전관리(보조)자 대리자 지정 (8.2)", rows: [["dt", "작성일자", 16], ["nm", "대리자 성명", 18], ["term", "대리기간", 24], ["why", "지정사유", 26], ["ok", "확인(관계인)", 16]] },
  { k: "promo", t: "화재예방 및 홍보 (9.0)", rows: [["how", "홍보방법", 60], ["when", "계획 (시기)", 40]] },
  { k: "hot", t: "화기취급작업 일지 (10.2)", rows: [["dt", "허가일자", 18], ["loc", "허가장소", 30], ["kind", "작업종류", 30], ["watch", "화재감시인", 22]] },
  { k: "team", t: "자위소방대 편성 (12.0)", f: [["head", "편성인원 (대장·부대장·대원)"], ["org", "조직구성 (팀·인원)"], ["init", "초기대응체계 편성인원 (조별)"], ["hours", "운영시간 (주간·야간·휴일)"]],
    rows: [["role", "구분", 15], ["dept", "소속·구역", 15], ["nm", "성명", 13], ["task", "개별임무", 19], ["tel1", "사무실", 19], ["tel2", "개인", 19]] },
  { k: "init", t: "초기대응체계 조 편성 (12.0)", rows: [["grp", "조", 14], ["time", "시간", 22], ["lead", "운영책임자", 24], ["mem", "대원", 40]] },
  { k: "edu", t: "교육훈련 및 평가 계획 (13.0)", f: [["no", "[년 제 차] (예: 2027년 제1차)"], ["nm", "명칭"], ["dt", "일자", "date"], ["place", "장소"], ["tgt", "대상 (자위소방대 / 재실자·거주자)"], ["theory", "이론 (강의식 / 세미나)"], ["prac", "실습 (도상 / 종합 / 부분(기능)훈련)"],
    ["eplan", "교육계획", "area"], ["tplan", "훈련계획", "area"], ["evDt", "평가일시", "date"], ["evBy", "평가자"], ["evHow", "평가방법", "area"]] },
  { k: "alarm", t: "비상연락 (14.1)", f: [["mode", "화재경보 방식 (일제경보 / 우선경보)"], ["floors", "경보 층 (예: 전층 1~2층)"], ["spread", "상황전파 방법"], ["center", "수신반(방재실) 위치·전화"], ["report", "화재신고"], ["upd", "비상연락망 최종 업데이트", "date"], ["updBy", "담당자"]] },
  { k: "tel", t: "비상연락망 (14.2)", rows: [["nm", "구분", 30], ["tel", "유선", 22], ["mob", "무선", 22], ["fn", "기능", 26]] },
  { k: "ext", t: "초기대응장비 · 소화기 (15.1)", rows: [["kind", "종류(형식)", 24], ["loc", "위치", 30], ["qty", "수량", 10], ["yr", "제조연도", 14], ["note", "비고", 22]] },
  { k: "resp", t: "초기대응 · 방호안전 (15.2)", f: [["lpg", "가스(LPG 등) 위치"], ["elec", "전기 분전함 위치"], ["valuable", "중요물품 반출 장소"], ["note", "비고", "area"]] },
  { k: "evac", t: "피난(유도) (16.0)", f: [["alarm", "화재경보 (경종 전층 등)"], ["live", "상시거주 (명)"], ["work", "상시근무 (명)"], ["float", "유동인원 (명)"], ["weak", "재해약자 현황"], ["route1", "제1피난로"], ["route2", "제2피난로"], ["roof", "옥상출입 (상시개방 / 폐쇄)"],
    ["help", "재해약자 피난방법"], ["meet", "집결지"]], rows: [["fl", "층(구역)", 50], ["n", "피난인원", 50]] },
  { k: "rec", t: "피해복구 지원기관 (17.2)", rows: [["nm", "구분", 30], ["what", "지원내용", 35], ["tel", "연락처", 35]] },
  { k: "fac", t: "소방·방화시설 및 위험정보 현황 (부록3)", f: [["fire", "소화설비", "area"], ["alarm", "경보설비", "area"], ["recv", "수신기 (형식·위치·회로수)"], ["evac", "피난설비 (유도등 등)", "area"], ["water", "소화용수설비"], ["act", "소화활동설비"],
    ["stairs", "피난시설 (복도·계단·출입구)", "area"], ["fwall", "방화시설 (방화구획·마감재료)", "area"], ["flame", "방염 (종류·위치·필증)"], ["haz", "위험물·특수가연물"], ["elec", "전기시설 (수전용량·차단기)"], ["gas", "가스시설 (종류·용도·차단기)"], ["smoke", "흡연구역"]] },
  { k: "edurec", t: "교육·훈련 실시 기록 (부록5)", rows: [["dt", "일시", 16], ["place", "장소", 18], ["n", "참석인원", 12], ["what", "주요내용", 30], ["fix", "미비점·개선사항", 24]], dt: { dt: 1 } },
  { k: "rev", t: "개정이력", rows: [["dt", "일자", 16], ["txt", "주요 개정내용", 40], ["by", "작성자", 15], ["chk", "검토", 14], ["ok", "확인", 15]], dt: { dt: 1 } }
];
// 기본값 = 빈 양식 (⚠ 이 파일은 공개 사이트에 올라가요 — 이름·전화·주소 같은 개인정보는 여기 넣지 말고 DB(/main/Fire, 로그인해야 보임)에만)
var FR_SEED = {
  gen: { grade: "3급", keepYr: "2" },
  daily: { rows: [{ kind: "소화시설", item: "소화기 외관점검", cyc: "매일 (오전)" }, { kind: "소화시설", item: "수신기 점검", cyc: "매월 말일" }] },
  edu: { tgt: "자위소방대, 재실자·거주자", theory: "강의식", prac: "부분(기능)훈련" },
  alarm: { mode: "일제경보", report: "119" },
  rec: { rows: [{ nm: "대한적십자사", what: "생필품 지원", tel: "" }, { nm: "화재보험회사", what: "화재보험금 지급", tel: "" }, { nm: "전기안전공사", what: "전기시설 안전점검", tel: "1588-7500" }, { nm: "가스안전공사", what: "가스설비 응급복구", tel: "" }] },
  rev: { rows: [] }
};
function _frYears(){ return Object.keys(_frS().plans || {}).sort(); }
function _frPlan(yr){ var P = (_frS().plans || {})[yr]; return P || null; }
// 보이는 값: 저장된 해 → 그 값 / 처음 여는 해 → 기본값
function _frGet(yr){ var P = _frPlan(yr); return P ? P : JSON.parse(JSON.stringify(FR_SEED)); }
function _frV(sec, k){ var x = (_frGet(FR.yr) || {})[sec] || {}; var S = FR_SEC.filter(function(s){ return s.k === sec; })[0]; return (S && S.rows && S.f ? (x.f || {}) : x)[k]; }
function _frSecVal(P, s){ var x = P[s.k] || {}; return { f: s.rows && s.f ? (x.f || {}) : (s.rows ? {} : x), rows: s.rows ? (x.rows || []) : [], note: x.note || "" }; }
function _frDt(v){ return v ? String(v).replace(/-/g, ".") : ""; }

// ⏰ 알림 — 소화기 10년 · 보험 만기 · 작동점검 · 다음 해 계획서 마감
function _frAlerts(yr, P){
  var A = [], t = _bsToday(), ty = +t.slice(0, 4);
  (P.ext && P.ext.rows || []).forEach(function(r){ var y = _bsN(r.yr); if(y && ty - y >= 10) A.push(["🧯", "소화기 " + r.loc + " — " + y + "년 제조, " + (ty - y) + "년 됨 (분말소화기 내용연수 10년 → 교체 또는 성능검사)"]); });
  if(!(P.ext && P.ext.rows || []).some(function(r){ return _bsN(r.yr); })) A.push(["🧯", "소화기 제조연도가 비어 있어요 — 소화기 몸통 라벨의 제조연도를 적어 주세요 (10년 지나면 교체)"]);
  var ins = (P.ins && P.ins.rows || []).map(function(r){ return r.to; }).filter(Boolean).sort().pop();
  if(!ins || ins < t) A.push(["🛡", ins ? "화재보험 기간이 끝났어요 (" + _frDt(ins) + ") — 새 보험 기간을 적어 주세요" : "화재보험 가입기간을 적어 주세요"]);
  var w = (P.chk || {}).work; if(!w || String(w).slice(0, 4) < String(yr)) A.push(["🔎", "작동기능점검 날짜를 적어 주세요 (" + yr + "년)"]);
  if(+yr === ty && t.slice(5) >= "11-01" && !_frPlan(String(ty + 1))) A.push(["📅", (ty + 1) + "년 소방계획서는 " + ty + "년 12월 31일까지 작성 — [＋ " + (ty + 1) + "년 만들기]"]);
  return A;
}

// ════════ 화면 ════════
function dFrPlan(){
  if(!FR.D){ _frLoad(); return '<div class="card"><div class="mut">📡 소방 자료 불러오는 중...</div></div>'; }
  var Y = _frYears(), ty = String(+_bsToday().slice(0, 4)), can = _frCan();
  if(!FR.yr) FR.yr = Y.indexOf(ty) >= 0 ? ty : (Y[Y.length - 1] || ty);
  var yr = FR.yr, P = _frGet(yr), saved = !!_frPlan(yr), nx = String(+(Y[Y.length - 1] || ty) + 1);
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><div><strong style="font-size:18px">🔥 소방계획서</strong> <span class="mut" style="font-size:12px;margin-left:6px">해마다 고쳐서 인쇄 · 소방청 표준 양식(일반 소형 2·3급) 순서</span></div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += _bsB("#b91c1c", "🖨 " + yr + "년 소방계획서 인쇄", "frPrint()") + (can ? _bsB("#0f766e", "＋ " + nx + "년 만들기 (" + (Y.length ? Y[Y.length - 1] : yr) + "년 복사)", "frNewYear('" + nx + "')") : "") + '</div></div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + (Y.length ? Y : [yr]).concat(Y.indexOf(yr) < 0 && Y.length ? [yr] : []).filter(function(v, i, a){ return a.indexOf(v) === i; }).sort().map(function(y){ var on = y === yr; return '<button class="btn" onclick="FR.yr=\'' + y + '\';draw()" style="padding:5px 14px;font-weight:900;background:' + (on ? "#b91c1c" : "#fff") + ';color:' + (on ? "#fff" : "#b91c1c") + ';border:1.5px solid #b91c1c">' + y + '년' + (_frPlan(y) ? '' : ' (저장 전)') + '</button>'; }).join("") + '</div>';
  if(!saved) h += '<div style="margin-top:8px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px;padding:8px 10px;font-size:13px">아직 저장 전이에요 — 빈 양식이에요. 위 [＋ 만들기]로 앞 해 것을 복사하거나, 칸마다 ✏ 고쳐서 저장하면 ' + yr + '년 것으로 저장돼요.</div>';
  h += '</div>';
  var A = _frAlerts(yr, P);
  if(A.length) h += '<div class="card" style="margin-bottom:10px;background:#fef2f2;border:2px solid #fca5a5"><b style="color:#b91c1c">⏰ 챙길 것 ' + A.length + '개</b>' + A.map(function(a){ return '<div style="font-size:13.5px;margin-top:4px">' + a[0] + ' ' + esc(a[1]) + '</div>'; }).join("") + '</div>';
  FR_SEC.forEach(function(s){ var v = _frSecVal(P, s), mob = window.innerWidth < 760;
    h += '<div class="card" style="margin-bottom:8px;padding:10px 12px"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><b style="font-size:15px;color:#7f1d1d">' + esc(s.t) + '</b>' + (can ? _bsB("#2563eb", "✏ 고치기", "frEdit('" + s.k + "')", "padding:3px 10px;font-size:12.5px") : "") + '</div>';
    if(s.f){ var fs = s.f.filter(function(x){ return v.f[x[0]] !== undefined && v.f[x[0]] !== ""; });
      h += fs.length ? '<div style="display:grid;grid-template-columns:' + (mob ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))") + ';gap:2px 14px;margin-top:6px;font-size:13px">' + fs.map(function(x){ return '<div><span style="color:#64748b">' + esc(x[1]) + '</span> <b style="white-space:pre-wrap">' + esc(x[2] === "date" ? _frDt(v.f[x[0]]) : v.f[x[0]]) + '</b></div>'; }).join("") + '</div>' : '<div class="mut" style="font-size:12.5px;margin-top:4px">비어 있어요</div>'; }
    if(s.rows){ h += v.rows.length ? '<div style="overflow-x:auto;margin-top:6px"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><tr>' + s.rows.map(function(c){ return '<th style="background:#fef2f2;border:1px solid #fecaca;padding:4px 6px;text-align:left;white-space:nowrap">' + esc(c[1]) + '</th>'; }).join("") + '</tr>' + v.rows.map(function(r){ return '<tr>' + s.rows.map(function(c){ var x = r[c[0]] || ""; return '<td style="border:1px solid #f1f5f9;padding:4px 6px">' + esc((s.dt || {})[c[0]] ? _frDt(x) : x) + '</td>'; }).join("") + '</tr>'; }).join("") + '</table></div>' : '<div class="mut" style="font-size:12.5px;margin-top:4px">' + (s.f ? '' : '줄이 없어요') + '</div>'; }
    if(v.note) h += '<div style="font-size:12px;color:#92400e;margin-top:4px">📝 ' + esc(v.note) + '</div>';
    h += '</div>'; });
  return h;
}
// ✏ 칸 하나 고치기
function frEdit(k){
  var s = FR_SEC.filter(function(x){ return x.k === k; })[0], P = _frGet(FR.yr), v = _frSecVal(P, s);
  FR.ed = { k: k, f: JSON.parse(JSON.stringify(v.f)), rows: JSON.parse(JSON.stringify(v.rows)), note: v.note };
  _frEdDraw();
}
function _frEdDraw(){
  var E = FR.ed, s = FR_SEC.filter(function(x){ return x.k === E.k; })[0];
  var h = '<h3 style="margin:0 0 10px">✏ ' + esc(s.t) + ' <span class="mut" style="font-size:13px;font-weight:400">' + FR.yr + '년</span></h3>';
  if(s.f) h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px">' + s.f.map(function(x){ var val = E.f[x[0]] == null ? "" : E.f[x[0]], on = 'oninput="FR.ed.f[\'' + x[0] + '\']=this.value"', st = 'style="width:100%;padding:7px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-weight:400"';
    return '<label style="display:block;font-size:12.5px;font-weight:700;' + (x[2] === "area" ? "grid-column:1/-1" : "") + '">' + esc(x[1]) + (x[2] === "area" ? '<textarea ' + on + ' rows="3" ' + st + '>' + esc(val) + '</textarea>' : '<input ' + (x[2] === "date" ? 'type="date"' : '') + ' value="' + esc(val) + '" ' + on + ' ' + st + '>') + '</label>'; }).join("") + '</div>';
  if(s.rows){ h += '<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th></th>' + s.rows.map(function(c){ return '<th style="padding:4px;text-align:left;white-space:nowrap">' + esc(c[1]) + '</th>'; }).join("") + '<th></th></tr>';
    E.rows.forEach(function(r, i){ h += '<tr><td style="white-space:nowrap">' + (i > 0 ? '<button class="btn" onclick="_frRowMv(' + i + ',-1)" style="padding:1px 5px;background:#e2e8f0">▲</button>' : '') + (i < E.rows.length - 1 ? '<button class="btn" onclick="_frRowMv(' + i + ',1)" style="padding:1px 5px;background:#e2e8f0">▼</button>' : '') + '</td>' + s.rows.map(function(c){ return '<td style="padding:2px"><input ' + ((s.dt || {})[c[0]] ? 'type="date"' : '') + ' value="' + esc(r[c[0]] || "") + '" oninput="FR.ed.rows[' + i + '][\'' + c[0] + '\']=this.value" style="width:100%;min-width:' + Math.max(70, c[2] * 6) + 'px;padding:6px;font-size:14px;border:1px solid #cbd5e1;border-radius:5px;box-sizing:border-box"></td>'; }).join("") + '<td><button class="btn" onclick="FR.ed.rows.splice(' + i + ',1);_frEdDraw()" style="background:#dc2626;color:#fff;padding:3px 8px">✕</button></td></tr>'; });
    h += '</table></div>' + _bsB("#0f766e", "+ 줄 추가", "FR.ed.rows.push({});_frEdDraw()", "padding:4px 12px;margin-top:6px"); }
  h += '<label style="display:block;font-size:12.5px;font-weight:700;margin-top:10px">비고 (인쇄에 같이 나와요)<input value="' + esc(E.note || "") + '" oninput="FR.ed.note=this.value" style="width:100%;padding:7px;font-size:15px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;font-weight:400"></label>';
  h += '<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:12px">' + _bsB("#475569", "취소", "closePopup()") + _bsB("#16a34a", "💾 저장", "frSave()", "padding:8px 22px") + '</div>';
  openPopup(h, s.rows && s.rows.length > 4 ? 820 : 640);
}
function _frRowMv(i, d){ var a = FR.ed.rows, j = i + d; if(j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; _frEdDraw(); }
function frSave(){
  var E = FR.ed, s = FR_SEC.filter(function(x){ return x.k === E.k; })[0], yr = FR.yr, val = {};
  var clean = function(o){ var r = {}; Object.keys(o || {}).forEach(function(k){ var v = String(o[k] == null ? "" : o[k]).trim(); if(v) r[k] = v; }); return r; };
  if(s.rows){ val.rows = E.rows.map(clean).filter(function(r){ return Object.keys(r).length; }); if(s.f) val.f = clean(E.f); } else val = clean(E.f);
  if(String(E.note || "").trim()) val.note = String(E.note).trim();
  var up = {};
  if(!_frPlan(yr)){ var all = _frGet(yr); all[E.k] = val; up["plans/" + yr] = all; } else up["plans/" + yr + "/" + E.k] = val;
  if(up["plans/" + yr]){ up["plans/" + yr].upAt = new Date().toISOString(); } else up["plans/" + yr + "/upAt"] = new Date().toISOString();
  _frRef().update(up).then(function(){ FR.D.plans = FR.D.plans || {}; if(up["plans/" + yr]) FR.D.plans[yr] = up["plans/" + yr]; else { FR.D.plans[yr][E.k] = val; FR.D.plans[yr].upAt = up["plans/" + yr + "/upAt"]; } closePopup(); toast("💾 " + s.t + " 저장 (" + yr + "년)"); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}
// 새 해 = 앞 해 통째로 복사 (+ 개정이력 한 줄, 교육 기록·화기 일지·대리자는 비움)
function frNewYear(ny){
  var Y = _frYears(), src = Y.length ? Y[Y.length - 1] : FR.yr;
  if(_frPlan(ny)) return toast(ny + "년 것이 이미 있어요", true);
  if(!confirm(src + "년 소방계획서를 복사해서 " + ny + "년 것을 만들까요?\n(교육·훈련 실시 기록, 화기취급 일지, 대리자 지정은 비우고 새로 적어요)")) return;
  var P = JSON.parse(JSON.stringify(_frGet(src))); ["edurec", "hot", "proxy"].forEach(function(k){ P[k] = { rows: [] }; });
  P.rev = P.rev || { rows: [] }; P.rev.rows = (P.rev.rows || []).concat([{ dt: _bsToday(), txt: ny + "년 소방계획 수립", by: (P.gen || {}).mgr || "", chk: (P.gen || {}).ownerNm || "" }]);
  P.edu = P.edu || {}; P.edu.no = ny + "년 제1차"; P.upAt = new Date().toISOString();
  var up = {}; up["plans/" + ny] = P; if(!_frPlan(src)) up["plans/" + src] = Object.assign(_frGet(src), { upAt: new Date().toISOString() });
  _frRef().update(up).then(function(){ FR.D.plans = FR.D.plans || {}; Object.keys(up).forEach(function(p){ FR.D.plans[p.split("/")[1]] = up[p]; }); FR.yr = ny; toast("＋ " + ny + "년 소방계획서 만들었어요 — 바뀐 칸만 고쳐 주세요"); draw(); })
    .catch(function(e){ toast("저장 실패: " + e.message, true); });
}

// ════════ 🖨 인쇄 — 표준 소방계획서 순서 ════════
function frPrint(){
  var yr = FR.yr, P = _frGet(yr), g = P.gen || {}, V = function(s, k){ return esc(((P[s] || {}).f || P[s] || {})[k] || ""); };
  var row = function(s){ return ((P[s] || {}).rows) || []; }, note = function(s){ var n = (P[s] || {}).note; return n ? '<div class="nt">비고. ' + esc(n) + '</div>' : ''; };
  var tb = function(sk, cols, min){ var R = row(sk), S = FR_SEC.filter(function(x){ return x.k === sk; })[0]; cols = cols || S.rows; var b = '<table><tr>' + cols.map(function(c){ return '<th style="width:' + (c[2] || "") + '%">' + esc(c[1]) + '</th>'; }).join("") + '</tr>';
    R.forEach(function(r){ b += '<tr>' + cols.map(function(c){ var x = r[c[0]] || ""; return '<td>' + esc((S.dt || {})[c[0]] ? _frDt(x) : x) + '</td>'; }).join("") + '</tr>'; });
    for(var i = R.length; i < (min || 0); i++) b += '<tr>' + cols.map(function(){ return '<td>&nbsp;</td>'; }).join("") + '</tr>'; return b + '</table>'; };
  var kv = function(L){ return '<table>' + L.map(function(r){ return '<tr>' + r.map(function(c, i){ return i % 2 === 0 ? '<th style="width:16%">' + c + '</th>' : '<td' + (r.length === 2 ? ' colspan="3"' : '') + '>' + c + '</td>'; }).join("") + '</tr>'; }).join("") + '</table>'; };
  var NM = esc(g.nm || ""), LAW = "「화재의 예방 및 안전관리에 관한 법률」";
  var b = '';
  // 표지
  b += '<div class="pg cover"><div class="cv1">일반 소형(2·3급)</div><div class="cv2">' + NM + '<br>소방계획서</div><div class="cv3">[' + yr + '.12.31까지]</div><table class="sg"><tr><th rowspan="2" style="width:9mm">결<br>재</th><th>작 성</th><th>검 토</th><th>승 인</th></tr><tr><td style="height:20mm"></td><td></td><td></td></tr></table></div>';
  // 개정이력
  var RV = row("rev"), RC = FR_SEC.filter(function(x){ return x.k === "rev"; })[0].rows;
  b += '<div class="pg"><h2>개정이력 (소방안전관리대상물)</h2><table><tr><th style="width:8%">순번</th>' + RC.map(function(c){ return '<th style="width:' + c[2] + '%">' + c[1] + '</th>'; }).join("") + '</tr>' + RV.map(function(r, i){ return '<tr><td style="text-align:center">' + i + '</td>' + RC.map(function(c){ var x = r[c[0]] || ""; return '<td>' + esc(c[0] === "dt" ? _frDt(x) : x) + (c[0] === "by" || c[0] === "chk" ? (x ? ' <span class="sm">(서명)</span>' : '') : '') + '</td>'; }).join("") + '</tr>'; }).join("");
  for(var ri = RV.length; ri < 8; ri++) b += '<tr><td>&nbsp;</td>' + RC.map(function(){ return '<td></td>'; }).join("") + '</tr>';
  b += '</table>';
  // 제1장
  b += '<h1>' + NM + ' 소방계획서</h1><h2>제1장 일반사항</h2>';
  b += '<h3>1.0 목 적</h3><p>이 계획의 목적은 [' + NM + ']의 화재로 인한 재난발생을 사전에 예방․대비하고 화재 시 신속하고 효율적으로 대응․복구함으로써 인명 및 재산 피해를 최소화하기 위함이다.</p>';
  b += '<h3>2.0 적용근거</h3><p>2.1 ' + LAW + ' 제24조<br>2.2 ' + LAW + ' 시행령 제27조</p>';
  b += '<h3>3.0 적용범위</h3><p>3.1 이 계획은 [' + NM + ']의 관계인(소유자, 점유자, 관리자), 상시 거주․근무인원 및 방문자에 대해 적용한다.<br>3.2 이 계획은 화재로 인한 재난의 예방․완화, 대비, 대응, 복구 단계에 대해 적용한다.</p>';
  b += '<h3>4.0 문서작성 및 기록관리</h3><p>4.1 소방계획의 수립 시 대상물의 안전정책, 내부규정 및 다른 안전관리계획을 사전에 검토하여 반영해야 한다.<br>4.2 차기년도 소방계획은 [매년 12월 31일]까지 작성하여 내용을 검토한 후 [대표자/소유자 : ' + V("gen", "ownerNm") + ']에게 최종 승인을 받는다.<br>4.3 소방계획은 반드시 문서[종이, 전자문서 등]로 작성하여 [' + (V("gen", "keepYr") || "2") + ']년간 [보관장소 : ' + V("gen", "keepAt") + ']에 보관해야 한다.</p></div>';
  // 제2장
  var ins = row("ins");
  b += '<div class="pg"><h2>제2장 예방 및 완화</h2><h3>5.0 일반현황 등의 작성</h3><p>소방계획의 수립에 필요한 건축물의 현황 및 소방안전관리에 대한 사항(부록)을 작성·관리하고 소방안전관리자 현황표를 게시해야 한다.</p>';
  b += kv([["명칭", NM, "도로명주소", V("gen", "addr")], ["관리주체", V("gen", "owner") + (g.tenant ? '<br><span class="sm">입주(임차) : ' + V("gen", "tenant") + '</span>' : ''), "책임자 · 연락처", V("gen", "mgr") + " · " + V("gen", "mgrTel")],
    ["규모", "건축면적 " + V("gen", "bArea") + "㎡ · 연면적 " + V("gen", "tArea") + "㎡", "층수 · 높이", "지상 " + V("gen", "fl") + "층 / 지하 " + (V("gen", "bfl") || "-") + "층 · " + V("gen", "hgt") + "m"],
    ["구조 · 지붕", V("gen", "str") + " · " + V("gen", "roof"), "용도 · 사용승인", V("gen", "use") + " · " + _frDt(g.appr)], ["계단", V("gen", "stair"), "승강기", V("gen", "lift")],
    ["인원현황", "거주 " + (V("gen", "live") || "-") + "명 · 근무 " + (V("gen", "work") || "-") + "명", "고령자·영유아·장애인", (V("gen", "elder") || "-") + " · " + (V("gen", "kid") || "-") + " · " + (V("gen", "dis") || "-")],
    ["소방안전관리자", V("gen", "mgr") + " (선임 " + _frDt(g.mgrDate) + ")", "소방안전관리 보조자", (V("gen", "sub") || "-") + (g.subDate ? " (선임 " + _frDt(g.subDate) + ")" : "")],
    ["업무대행", (V("chk", "agent") || "-") + " " + V("chk", "agentTel"), "대행기간", V("chk", "agentTerm") || "-"]]);
  b += '<div class="st">화재보험</div>' + tb("ins", null, 1);
  b += '<h3>6.0 자체점검</h3><p>「소방시설 설치 및 관리에 관한 법률」 제22조에 따른 자체점검을 아래와 같이 정기적으로 실시해야 한다. ※ [사용승인일 : ' + _frDt(g.appr) + ']</p>';
  b += '<table><tr><th>구 분</th><th>점 검 시 기</th><th>점 검 방 식</th></tr><tr><td>작동기능점검</td><td>' + _frDt((P.chk || {}).work) + '</td><td>' + V("chk", "workHow") + '</td></tr><tr><td>종합정밀점검</td><td>' + _frDt((P.chk || {}).full) + '</td><td>' + V("chk", "fullHow") + '</td></tr></table>' + (V("chk", "note") ? '<div class="nt">비고. ' + V("chk", "note") + '</div>' : '');
  b += '<h3>8.0 일상적 안전관리</h3><p>소방안전관리대상물의 화재예방 및 피해완화를 위해 일상적 안전관리 활동을 아래와 같이 지속적으로 실시해야 한다.</p>' + tb("daily", null, 3) + note("daily");
  b += '<div class="st">8.2 소방안전관리(보조)자 대리자 지정현황</div>' + tb("proxy", null, 2) + '<div class="nt">비고. 여행, 질병 그 밖의 사유로 일시적으로 직무를 수행할 수 없거나 안전관리자의 해임·퇴직과 동시에 선임할 수 없는 경우 지정(30일 이내)</div></div>';
  b += '<div class="pg"><h3>9.0 화재예방 및 홍보</h3><p>소방안전관리대상물의 안전의식 및 안전문화 향상을 위해 화재예방 및 홍보 활동을 아래와 같이 실시해야 한다.</p>' + tb("promo", null, 3) + note("promo");
  b += '<h3>10.0 화기취급감독</h3><p>소방안전관리대상물의 화재예방을 위해 화기취급작업을 사전에 허가하고 화재감시인이 입회하여 감독하는 등 안전관리 업무를 수행하여야 한다.</p>';
  b += '<table><tr><th style="width:18%">구 분</th><th style="width:22%">처리절차</th><th>업무내용</th></tr><tr><td>사전허가</td><td>작업허가</td><td>➊ 작업요청 ➋ 승인검토 및 허가서 발급</td></tr><tr><td rowspan="2">안전조치</td><td>화재예방조치</td><td>➊ 가연물 이동 및 보호조치 ➋ 소방시설 작동 확인 ➌ 용접·용단장비·보호구 점검</td></tr><tr><td>안전교육</td><td>➍ 화재안전교육 ➎ 비상 시 행동요령 교육</td></tr><tr><td rowspan="2">작업 및 감독</td><td>화재감시인 입회 및 감독</td><td>➊ 화재감시인 입회 ➋ 화기취급감독</td></tr><tr><td>최종 작업 확인</td><td>➌ 현장상주 및 화재감시 ➍ 작업 종료 확인</td></tr></table><div class="nt">* 화재감시인은 소방안전관리자, 보조자 또는 안전관리자가 지정한 인력으로 운영</div>';
  b += '<div class="st">10.2 화기취급작업 일지</div>' + tb("hot", null, 4) + '</div>';
  // 제3장
  b += '<div class="pg"><h2>제3장 대 비</h2><h3>12.0 자위소방대·초기대응체계 구성 및 운영</h3><p>' + LAW + ' 제24조에 따른 자위소방대 및 초기대응체계를 아래와 같이 구성․운영해야 한다.</p>';
  b += kv([["자위소방대 편성", V("team", "head")], ["조직구성", V("team", "org")], ["초기대응체계", V("team", "init")], ["운영시간", V("team", "hours")]]);
  b += '<div class="st">대원편성 및 임무현황</div>' + tb("team", null, 0) + '<div class="nt">* 각 구역별(층 또는 업종별 대표) 2인 이상을 선정</div><div class="st">초기대응체계</div>' + tb("init", null, 2) + note("init") + '</div>';
  var E = P.edu || {};
  b += '<div class="pg"><h3>13.0 교육훈련 및 자체평가</h3><p>' + LAW + ' 제37조에 따른 교육․훈련을 정기적으로 실시해야 한다.</p><div class="st">[' + esc(E.no || (yr + "년 제  차")) + '] 교육훈련 및 평가계획</div>';
  b += kv([["명칭", esc(E.nm || "")], ["일자 / 장소", _frDt(E.dt) + " / " + esc(E.place || "")], ["대상", esc(E.tgt || "")], ["이론", esc(E.theory || "")], ["실습", esc(E.prac || "")], ["교육계획", esc(E.eplan || "").replace(/\n/g, "<br>")], ["훈련계획", esc(E.tplan || "").replace(/\n/g, "<br>")], ["평가일시 · 평가자", _frDt(E.evDt) + " · " + esc(E.evBy || "") + " (서명)"], ["평가방법", esc(E.evHow || "").replace(/\n/g, "<br>")]]) + note("edu");
  // 제4장
  var al = P.alarm || {};
  b += '<h2>제4장 대 응</h2><h3>14.0 비상연락</h3><p>화재 시 신속하고 명확하게 화재를 경보하고 상황을 전파해야 하며 비상연락체계를 구축하여 운영해야 한다.</p>';
  b += kv([["화재경보", esc(al.mode || "") + " — " + esc(al.floors || "")], ["상황전파", esc(al.spread || "")], ["수신반(방재실)", esc(al.center || "")], ["화재신고", esc(al.report || "")]]) + '</div>';
  b += '<div class="pg"><div class="st">14.2 비상연락망</div>' + tb("tel", null, 3) + '<div class="nt">비고. 최종 업데이트 날짜 : ' + _frDt(al.upd) + ' / 담당자 : ' + esc(al.updBy || "") + '</div>';
  b += '<h3>15.0 초기대응</h3><p>화재로 인한 재난발생 시 필요한 초기소화, 응급구조 및 방호안전조치 등 초기대응절차를 사전에 수립해야 한다.</p><div class="st">15.1 초기대응장비</div>' + tb("ext", null, 0) + note("ext");
  b += '<div class="st">15.2 초기대응절차</div><table><tr><th style="width:18%">구분</th><th style="width:36%">대응조치</th><th>대응절차</th></tr><tr><td>초기소화</td><td>초기소화(소화기)</td><td>초기소화팀 현장 출동 및 대응 · 화재 현장에서 초기소화</td></tr><tr><td>응급구조</td><td>출혈 · 화상 · 골절 · 심폐소생술</td><td>응급구조팀 현장 출동 및 대응 · 응급환자 발생 시 사고현장에 출동하여 응급처치</td></tr><tr><td>방호안전</td><td>위험물질 공급차단(가스, 전기) · 중요물품 비상반출</td><td>가스 : ' + V("resp", "lpg") + ' · 전기 분전함 : ' + V("resp", "elec") + (V("resp", "valuable") ? ' · 반출 : ' + V("resp", "valuable") : '') + '</td></tr></table>' + note("resp") + '</div>';
  var ev = P.evac || {};
  b += '<div class="pg"><h3>16.0 피난(유도)</h3><p>' + LAW + ' 제36조에 따라, 피난계획을 수립하여 시행해야 한다.</p>';
  b += kv([["화재경보", esc(ev.alarm || "")], ["피난인원", "상시거주 " + esc(ev.live || "-") + "명 · 상시근무 " + esc(ev.work || "-") + "명 · 유동인원 " + esc(ev.float || "-") + "명"], ["재해약자 현황", esc(ev.weak || "")], ["제1피난로", esc(ev.route1 || "")], ["제2피난로", esc(ev.route2 || "")], ["옥상출입", esc(ev.roof || "")], ["재해약자 피난보조", esc(ev.help || "")], ["집결지", esc(ev.meet || "")]]);
  b += '<div class="st">층(구역)별 피난인원</div>' + tb("evac", null, 0) + '<div class="nt">* 재해약자 : 노인[65세↑], 영유아[6세↓], 어린이(13세↓), 임산부 및 장애인</div>' + note("evac");
  // 제5장
  b += '<h2>제5장 복 구</h2><h3>17.0 화재피해의 복구</h3><p>화재로 인한 재난이 발생하는 경우 피해를 최소화하고 신속히 정상상태로 복귀하기 위해 피해 복구계획을 수립하고 실행할 수 있다.</p>';
  b += '<table><tr><th style="width:18%">구분</th><th>주 요 내 용</th></tr><tr><td>단기복구</td><td>화재인원 및 피해현황 조사 · 시설 정비 및 보수절차 · 화재현장 복구 · 임시 숙소 및 영업장 마련</td></tr><tr><td>장기복구</td><td>의료 및 심리치료 지원 · 기반시설 복원 및 안전진단 · 법률 상담 및 재정 지원 · 화재보험처리 및 피해보상</td></tr></table>';
  b += '<div class="st">17.2 피해복구 지원</div>' + tb("rec", null, 0) + '</div>';
  // 부록
  var fc = P.fac || {}, FS = FR_SEC.filter(function(x){ return x.k === "fac"; })[0];
  b += '<div class="pg"><h2>[부록 3] 소방·방화시설 및 위험정보 현황</h2><table>' + FS.f.map(function(x){ return '<tr><th style="width:26%">' + esc(x[1]) + '</th><td>' + esc(fc[x[0]] || "").replace(/\n/g, "<br>") + '</td></tr>'; }).join("") + '</table>' + note("fac");
  var yc = {}; row("ext").forEach(function(r){ var y = r.yr || "모름"; yc[y] = (yc[y] || 0) + (_bsN(r.qty) || 1); }); var yk = Object.keys(yc).sort();
  b += '<div class="st">수동식 분말소화기 제조연도별 설치수량</div><table><tr>' + yk.map(function(y){ return '<th>' + esc(y) + (y === "모름" ? '' : '년') + '</th>'; }).join("") + '</tr><tr>' + yk.map(function(y){ return '<td style="text-align:center">' + yc[y] + '</td>'; }).join("") + '</tr></table></div>';
  b += '<div class="pg"><h2>[부록 5] 교육·훈련 실시 결과 기록부</h2>' + kv([["상호(명칭)", NM, "등급", V("gen", "grade")], ["소재지", V("gen", "addr") + " (☎ " + V("gen", "tel") + ")", "소방안전관리자", V("gen", "mgr") + " (선임 " + _frDt(g.mgrDate) + ")"]]) + '<div class="st">실시 기록</div>' + tb("edurec", null, 8) + '</div>';
  b += '<div class="pg"><h2>[부록 4] 화기취급작업현장 안전수칙</h2><table><tr><th style="width:12%">순 번</th><th>안전수칙</th></tr>' + ["모든 작업은 화재감시인 입회 및 감독 하에 작업", "작업현장(반경 11m 이내)의 모든 가연물을 이동", "가연물 이동 불가 시 적절한 보호조치(차단막 등 설치)", "작업장 내부·바닥을 깨끗이 청소하고 정리정돈 유지", "화기취급작업 시 반드시 개인보호장구 착용", "화기취급 시 불티가 가연물로 비산되지 않도록 주의", "작업현장의 화재 위험성이 높은 경우, 즉시 작업 중단", "화재발생 시 초기소화(소화기) 및 경보설비(비상벨) 작동", "작업장 내 절대 금연(라이터 반입금지) 및 음주행위 금지", "기타 사항은 화재감시인의 지시에 따라 작업"].map(function(t, i){ return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + t + '</td></tr>'; }).join("") + '</table><div class="nt">비상연락처 : 화재신고 119, 방재실 : ' + V("gen", "tel") + ' · [' + NM + ']</div></div>';
  var css = '@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0}body{font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#111;font-size:12px;line-height:1.55}.pg{width:210mm;padding:14mm 15mm 0;margin:0 auto;break-after:page}.pg:last-child{break-after:auto!important}'
    + 'h1{text-align:center;font-size:20px;margin:6mm 0 4mm}h2{font-size:16px;color:#1e3a8a;border-bottom:2px solid #1e3a8a;padding-bottom:1mm;margin:5mm 0 3mm}h3{font-size:13.5px;color:#1d4ed8;margin:4mm 0 1.5mm}p{margin:0 0 2mm}.st{font-weight:800;margin:3mm 0 1.5mm}.nt{font-size:11px;color:#334155;margin:1mm 0 2mm}.sm{font-size:10.5px;color:#334155}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:2mm}td,th{border:1px solid #333;padding:3px 6px;vertical-align:middle}th{background:#eef2f7;font-weight:700}'
    + '.cover{text-align:center;padding-top:40mm}.cv1{font-size:16px;font-weight:700;color:#475569}.cv2{font-size:34px;font-weight:900;margin:22mm 0 10mm;line-height:1.4}.cv3{font-size:18px;font-weight:800;margin-bottom:40mm}.sg{width:110mm;margin:0 auto}.sg th,.sg td{text-align:center}'
    + '.tb{display:flex;justify-content:center;gap:8px;padding:10px;background:#1e293b;position:sticky;top:0}.tb button{padding:8px 18px;font-size:14px;font-weight:700;border:none;border-radius:6px;color:#fff;cursor:pointer}@media print{.tb{display:none}html,body{height:auto!important}}';
  var w = window.open("", "_blank", "width=920,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(g.nm || "") + ' 소방계획서 ' + yr + '</title><style>' + css + '</style></head><body><div class="tb"><button style="background:#2563eb" onclick="window.print()">🖨️ 인쇄 / PDF 저장</button><button style="background:#475569" onclick="window.close()">닫기</button></div>' + b + '</body></html>');
  w.document.close();
}
