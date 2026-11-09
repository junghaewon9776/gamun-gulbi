// ============================================================================
// 👦 아이들 공부 기록 — 받아쓰기·수학(dictation.html) 아이 계정 기록 보기 + 알림 설정
//   /kids/{uid} = { name, rec, xp, rk, st, day, speed, at, log:{…} }   (아이 앱이 저장)
//   /kids/_cfg  = { tok, chats, on:{test,rank,daily} }                  (여기서 저장 → 아이 앱이 알림 보냄)
//   아이 계정 = /main/Users 의 역할 "kid" (아이디 = 이름) — 로그인은 가문굴비와 같은 로그인 도우미
//   읽기: 가문굴비 최고관리자·관리자만 (DB 규칙)
// ============================================================================
var KD = null, KD_LOADING = false, KD_SEL = "", KD_TAB = "rec";
var KD_URL = "https://junghaewon9776.github.io/gamun-gulbi/dictation.html";

function _kdLoad(){
  if(KD_LOADING) return; KD_LOADING = true;
  fbDb.ref("/kids").once("value").then(function(s){ KD_LOADING = false; KD = s.val() || {}; Object.keys(KD).forEach(function(k){ if(KD[k] && k.charAt(0) !== "_" && typeof US !== "undefined" && US[k] && US[k].nm) KD[k].name = US[k].nm; }); if(CTAB === "kids") draw(); })
    .catch(function(e){ KD_LOADING = false; KD = {}; toast("아이들 기록을 못 읽었어요: " + e.message, true); });
}
function _kdKids(){ return Object.keys(KD || {}).filter(function(k){ return k.charAt(0) !== "_" && KD[k] && KD[k].name; }).sort(function(a, b){ return String(KD[a].name).localeCompare(String(KD[b].name)); }); }
function _kdLogs(k){ var L = (KD[k] && KD[k].log) || {}; return Object.keys(L).map(function(i){ return L[i]; }).sort(function(a, b){ return String(b.t).localeCompare(String(a.t)); }); }
function _kdTime(t){ try { return new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch(e){ return t || ""; } }

function dKids(){
  if(!KD){ _kdLoad(); return _kdAcctCard() + '<div class="card"><div class="mut">📡 아이들 기록 불러오는 중...</div></div>'; }
  var ids = _kdKids(), B = function(bg, l, on, ex){ return '<button class="btn" style="background:' + bg + ';color:#fff;' + (ex || "") + '" onclick="' + on + '">' + l + '</button>'; };
  var h = '<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><strong style="font-size:18px">👦 아이들 공부 기록</strong><div style="display:flex;gap:6px;flex-wrap:wrap">' + B("#475569", "🔄 새로", "KD=null;draw()") + B("#2563eb", "✏️ 받아쓰기 열기", "window.open(KD_URL,'_blank')") + B("#7c3aed", "🔔 알림 설정", "kdCfg()") + '</div></div>';
  h += '<div class="mut" style="font-size:12.5px;margin-top:4px">아이가 받아쓰기에서 <b>이름 + 비밀번호</b>로 들어가면 여기 기록이 쌓여요. 시험을 보거나 진급하면 텔레그램으로 알려요.</div></div>';
  h += _kdAcctCard();
  if(!ids.length) return h + '<div class="card" style="padding:30px;text-align:center;color:#94a3b8">아직 로그인해서 공부한 아이가 없어요</div>';
  // 아이 카드
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin-bottom:10px">';
  ids.forEach(function(k){ var x = KD[k], on = KD_SEL === k, logs = _kdLogs(k), last = logs[0], tests = 0, ok = 0, n = 0;
    Object.keys(x.rec || {}).forEach(function(key){ (x.rec[key] || []).forEach(function(r){ tests++; ok += r.ok || 0; n += r.n || 0; }); });
    var dd = x.day && x.day.d, td = todayKST ? todayKST() : "";
    h += '<div onclick="KD_SEL=\'' + k + '\';draw()" style="cursor:pointer;border:3px solid ' + (on ? "#2563eb" : "#e5e7eb") + ';border-radius:12px;padding:12px;background:' + (on ? "#eff6ff" : "#fff") + '"><div style="font-size:19px;font-weight:900">' + esc(x.name) + ' <span style="font-size:13px;color:#4d7c0f">🎖 ' + esc(x.rk || "") + '</span></div>';
    h += '<div style="font-size:12.5px;color:#475569;margin-top:4px">경험치 <b>' + (x.xp || 0) + '</b> · 시험 ' + tests + '회 · 정답률 ' + (n ? Math.round(ok / n * 100) : 0) + '%</div>';
    h += '<div style="font-size:12.5px;margin-top:4px">' + (dd === td ? '<b style="color:#16a34a">✅ 오늘 공부함</b>' : '<span style="color:#b45309">오늘 아직</span>') + (x.day && x.day.streak > 1 ? ' · 🔥 ' + x.day.streak + '일 연속' : '') + '</div>';
    if(last) h += '<div style="font-size:12px;color:#64748b;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">최근: ' + esc(String(last.txt || "").split("\n")[0]) + '</div>';
    h += '</div>'; });
  h += '</div>';
  if(!KD_SEL || !KD[KD_SEL]) KD_SEL = ids[0];
  var x = KD[KD_SEL];
  h += '<div class="card"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><strong style="font-size:17px;margin-right:8px">' + esc(x.name) + '</strong>';
  [["rec", "📝 시험 기록지"], ["log", "📚 공부한 일"]].forEach(function(v){ var on = KD_TAB === v[0]; h += '<button class="btn" style="background:' + (on ? "#1e293b" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#1e293b") + '" onclick="KD_TAB=\'' + v[0] + '\';draw()">' + v[1] + '</button>'; });
  h += '<span style="margin-left:auto">' + B("#7c4a21", "🖨️ 기록지 인쇄", "kdPrint('" + KD_SEL + "')") + '</span></div>';
  h += KD_TAB === "log" ? _kdLogHtml(KD_SEL) : _kdRecHtml(KD_SEL, false);
  return h + '</div>';
}
// 기록 이름 알아보기 쉽게 (수학 a10 → 10까지 덧셈, 漢·h8-1 → 한자 8급 ①)
var KD_MATH = { a10: "10까지 덧셈", s10: "10까지 뺄셈", a20: "20까지 덧셈(받아올림)", s20: "20까지 뺄셈(받아내림)", m20: "덧셈·뺄셈 섞기(20까지)", a21: "두 자리 + 한 자리", s21: "두 자리 − 한 자리", a22: "두 자리 + 두 자리", s22: "두 자리 − 두 자리", a33: "세 자리 덧셈", s33: "세 자리 뺄셈",
  g25: "구구단 2·5단", g34: "구구단 3·4단", g67: "구구단 6·7단", g89: "구구단 8·9단", gall: "구구단 전체", x21: "곱셈 두 자리 × 한 자리", x31: "곱셈 세 자리 × 한 자리", x22: "곱셈 두 자리 × 두 자리", x32: "곱셈 세 자리 × 두 자리",
  v1: "나눗셈(구구단 거꾸로)", v21r: "두 자리 ÷ 한 자리(나머지)", v31: "세 자리 ÷ 한 자리", v31r: "세 자리 ÷ 한 자리(나머지)", v32: "세 자리 ÷ 두 자리", v32r: "세 자리 ÷ 두 자리(나머지)",
  f4a: "분모 같은 분수 덧셈", f4s: "분모 같은 분수 뺄셈", c4a: "소수 덧셈(0.1)", c4s: "소수 뺄셈(0.1)", c4b: "소수 덧셈(0.01)", k5m: "혼합 계산", k5g: "최대공약수", k5l: "최소공배수", k5r: "약분", k5a: "분모 다른 분수 덧셈", k5s: "분모 다른 분수 뺄셈", k5x: "분수 × 자연수", k5d: "소수 × 자연수",
  k6f: "분수 ÷ 자연수", k6F: "분수 ÷ 분수", k6d: "소수 ÷ 자연수", k6p: "백분율", k6r: "비례식" };
var KD_CIRC = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
var KD_HAN = { "9": "9급(처음)", "8": "8급", "7.5": "7급Ⅱ", "7": "7급", "6.5": "6급Ⅱ", "6": "6급", "4.5": "준4급" };
var KD_ENG = { p: "파닉스", "0": "처음 영어", "3": "3학년", "4": "4학년", "5": "5학년", "6": "6학년" };
var KD_ABC = { u1: "대·소문자 A~M", u2: "대·소문자 N~Z", u3: "대·소문자 전체", a1: "소리 A~I", a2: "소리 J~R", a3: "소리 S~Z", a4: "소리 전체" };
function _kdKeyName(k){
  k = String(k);
  var lv = function(id, map){ var m = String(id).match(/^.(.+)-(\d+)$/); return m ? (map[m[1]] || m[1]) + " " + (KD_CIRC[+m[2] - 1] || m[2]) : id; };
  if(k.indexOf("漢·") === 0) return "🈶 한자 " + lv(k.slice(2), KD_HAN);
  if(k.indexOf("英·") === 0) return "🔤 영어 " + lv(k.slice(2), KD_ENG);
  if(k.indexOf("ABC·") === 0) return "🔤 알파벳 " + (KD_ABC[k.slice(4)] || k.slice(4));
  if(k.indexOf("수·") === 0){ var id = k.slice(2), dm = id.match(/^d(\d)$/); return "🔢 수학 " + (KD_MATH[id] || (dm ? "구구단 " + dm[1] + "단" : id)); }
  if(k === "all") return "✏️ 받아쓰기 전체"; if(k === "wrong") return "✏️ 받아쓰기 틀린 것";
  var m = k.split("·"); return m.length > 1 ? "✏️ " + m[0] + " 급수표 " + _kdKeyName(m[1]).replace(/^✏️ /, "") : "✏️ 받아쓰기 " + k + "급";
}
// "11. 3. 오후 07:08" → 비교용 숫자 (해는 없어서 월·일·시·분만)
function _kdWhen(d){
  var m = String(d || "").match(/(\d+)\.\s*(\d+)\.\s*(오전|오후)?\s*(\d+):(\d+)/); if(!m) return 0;
  var h = +m[4] % 12 + (m[3] === "오후" ? 12 : 0);
  return ((+m[1] * 100 + +m[2]) * 100 + h) * 100 + +m[5];
}
function _kdRecHtml(k, print){
  var x = KD[k], rec = x.rec || {};
  var arrOf = function(a){ return (Array.isArray(a) ? a : Object.keys(a || {}).map(function(i){ return a[i]; })).filter(function(r){ return r && typeof r === "object"; }); };
  var keys = Object.keys(rec).filter(function(key){ return arrOf(rec[key]).length; });
  if(!keys.length) return '<div style="padding:20px;text-align:center;color:#94a3b8">아직 본 시험이 없어요</div>';
  // 틀린 문장: 로그에 남긴 것(새 기록)에서 회차별로 찾기
  var wt = {}; _kdLogs(k).forEach(function(l){ if(l.type === "test" && l.key != null && l.no != null) wt[l.key + "#" + l.no] = l.wrongTxt || []; });
  var wrongOf = function(key, r){ return (wt[key + "#" + r.no] || (r.wrong || []).map(function(q){ return String(q).replace(/^q:/, ""); })).join(" / "); };
  var S = print ? "" : "padding:6px 8px;border-bottom:1px solid #f1f5f9;";
  var scoreTd = function(r){ return '<td style="' + S + 'text-align:right;font-weight:900;color:' + ((r.score || 0) >= 90 ? "#15803d" : "#b91c1c") + '">' + (r.score || 0) + (r.score === 100 ? " 💯" : "") + '</td>'; };
  var where = function(r){ return { screen: "폰 타자", hand: "폰 손글씨", paper: "종이" }[r.where] || r.where || ""; };
  // 칸 너비 고정 — 어느 표든 같은 자리에 (왔다 갔다 안 하게)
  var tbl = function(cols){ return '<table style="width:100%;max-width:980px;table-layout:fixed;border-collapse:collapse;font-size:13px"><colgroup>' + cols.map(function(w){ return '<col style="width:' + w + '">'; }).join("") + '</colgroup>'; };
  var th = function(t, al){ return '<th style="' + S + 'text-align:' + (al || "left") + '">' + t + '</th>'; };
  var all = [];
  keys.forEach(function(key){ arrOf(rec[key]).forEach(function(r){ all.push({ key: key, r: r, w: _kdWhen(r.d) }); }); });
  all.sort(function(a, b){ return b.w - a.w; });
  var h = '';
  // 🕘 최근 시험 10개 (어느 과목이든)
  h += '<div style="font-weight:900;font-size:15px;margin:4px 0 6px">🕘 최근 시험</div>' + tbl(["120px", "auto", "60px", "64px", "38%"])
    + '<thead><tr' + (print ? "" : ' style="background:#eff6ff"') + '>' + th("날짜") + th("무슨 시험") + th("점수", "right") + th("맞음", "center") + th("틀린 것") + '</tr></thead><tbody>'
    + all.slice(0, 10).map(function(o){ return '<tr><td style="' + S + 'white-space:nowrap">' + esc(o.r.d || "") + '</td><td style="' + S + 'font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(_kdKeyName(o.key)) + ' <span style="color:#64748b;font-weight:400">' + (o.r.no || "") + '회</span></td>' + scoreTd(o.r) + '<td style="' + S + 'text-align:center">' + (o.r.ok || 0) + '/' + (o.r.n || 0) + '</td><td style="' + S + 'font-size:12px;color:#b91c1c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(wrongOf(o.key, o.r)) + '">' + esc(wrongOf(o.key, o.r)) + '</td></tr>'; }).join("")
    + '</tbody></table>';
  // 과목별 — 최근에 본 것부터
  var last = {}; all.forEach(function(o){ if(!(o.key in last)) last[o.key] = o.w; });
  keys.sort(function(a, b){ return (last[b] || 0) - (last[a] || 0); });
  h += '<div style="font-weight:900;font-size:15px;margin:18px 0 2px">📚 과목별 기록 <span style="font-weight:400;color:#64748b;font-size:12px">— 최근에 본 것부터</span></div>';
  keys.forEach(function(key){
    var arr = arrOf(rec[key]).slice().sort(function(a, b){ return _kdWhen(b.d) - _kdWhen(a.d) || (b.no || 0) - (a.no || 0); });
    h += '<div style="font-weight:800;margin:12px 0 4px">' + esc(_kdKeyName(key)) + ' <span style="font-weight:400;color:#64748b;font-size:12px">' + arr.length + '회 · 최고 ' + Math.max.apply(null, arr.map(function(r){ return r.score || 0; })) + '점</span></div>';
    h += tbl(["60px", "120px", "60px", "64px", "84px", "auto"]) + '<thead><tr' + (print ? "" : ' style="background:#f8fafc"') + '>' + th("회차") + th("날짜") + th("점수", "right") + th("맞음", "center") + th("어디에") + th("틀린 것") + '</tr></thead><tbody>';
    arr.forEach(function(r){
      h += '<tr><td style="' + S + '">' + (r.no || "") + '회</td><td style="' + S + 'white-space:nowrap">' + esc(r.d || "") + '</td>' + scoreTd(r) + '<td style="' + S + 'text-align:center">' + (r.ok || 0) + '/' + (r.n || 0) + '</td><td style="' + S + 'font-size:12px">' + esc(where(r)) + '</td><td style="' + S + 'font-size:12px;color:#b91c1c">' + esc(wrongOf(key, r)) + '</td></tr>';
    });
    h += '</tbody></table>';
  });
  return h;
}
function _kdLogHtml(k){
  var L = _kdLogs(k).slice(0, 200);
  if(!L.length) return '<div style="padding:20px;text-align:center;color:#94a3b8">아직 기록이 없어요</div>';
  var ic = { test: "📝", rank: "🎖", daily: "📚" };
  return '<table style="width:100%;border-collapse:collapse;font-size:13px">' + L.map(function(l){ return '<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px;white-space:nowrap;color:#64748b">' + _kdTime(l.t) + '</td><td style="padding:6px">' + (ic[l.type] || "✏️") + '</td><td style="padding:6px;white-space:pre-wrap">' + esc(l.txt || "") + '</td></tr>'; }).join("") + '</table>';
}
function kdPrint(k){
  var x = KD[k], w = window.open("", "_blank", "width=900,height=1100"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(x.name) + ' 시험 기록지</title><style>@page{size:A4;margin:12mm}body{font-family:"Malgun Gothic",sans-serif;color:#111}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:4px 6px;font-size:12px}th{background:#eef2f7}h1{text-align:center;letter-spacing:8px}.tb{text-align:center;padding:8px;background:#1e293b}.tb button{padding:8px 18px;font-weight:700;border:none;border-radius:6px;background:#2563eb;color:#fff}@media print{.tb{display:none}}</style></head><body><div class="tb"><button onclick="window.print()">🖨️ 인쇄 / PDF</button></div>'
    + '<h1>' + esc(x.name) + ' 시험 기록지</h1><div style="text-align:right;font-size:13px;margin-bottom:6px">🎖 ' + esc(x.rk || "") + ' · 경험치 ' + (x.xp || 0) + ' · ' + esc(todayKST ? todayKST() : "") + '</div>' + _kdRecHtml(k, true) + '</body></html>');
  w.document.close();
}
// 👦 아이 계정 (받아쓰기 로그인) — 계정관리 · 아이들 탭에 같이 나옴. 역할 "kid"
//   아이디 = "k" + 이름 UTF-8 16진수 (예: 정다원 → k1a2b…) — 로그인 도우미가 한글 아이디를 "??" 로 깨뜨려서 영문·숫자로만
//   nm = 아이가 칠 이름 (예: 정다원) — 받아쓰기는 성을 빼고(다원) 급수표·학년·형제 순서를 찾음
var KD_NAMES = ["다원", "라온", "은우", "도겸", "은교", "다윤"], KD_SURNAME = "정";
function _kdShort(id){ id = String(id || ""); return KD_NAMES.indexOf(id) >= 0 ? id : (id.length >= 3 && KD_NAMES.indexOf(id.slice(1)) >= 0 ? id.slice(1) : id); }
function _kdId(name){ return "k" + Array.prototype.map.call(new TextEncoder().encode(String(name).trim()), function(b){ return ("0" + b.toString(16)).slice(-2); }).join(""); }
function _kdOk(id){ return /^k([0-9a-f]{2})+$/.test(String(id || "")); }
function _kdNm(id){ return (US[id] && US[id].nm) || id; }
function _kdAcctList(){ var a = []; for(var k in US){ if(US[k] && US[k].r === "kid") a.push(k); } return a.sort(function(x, y){ var i = KD_NAMES.indexOf(_kdShort(_kdNm(x))), j = KD_NAMES.indexOf(_kdShort(_kdNm(y))); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || _kdNm(x).localeCompare(_kdNm(y)); }); }
function _kdAcctCard(){
  if(typeof _isGlobalAdm !== "function" || !_isGlobalAdm()) return "";
  var L = _kdAcctList(), have = L.map(function(id){ return _kdShort(_kdNm(id)); }), miss = KD_NAMES.filter(function(n){ return have.indexOf(n) < 0; });
  var bad = L.filter(function(id){ return !_kdOk(id); });
  var noSur = L.filter(function(id){ return KD_NAMES.indexOf(_kdNm(id)) >= 0; });
  var h = '<div class="card" style="border:2px solid #16a34a;background:#f0fdf4"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px"><h3 style="margin:0;color:#14532d;font-weight:800">👦 아이 계정 (받아쓰기)</h3>';
  h += '<button class="btn btn-s" style="background:#16a34a;color:#fff;font-weight:700" onclick="kdAddKid()">+ 아이 추가</button></div>';
  h += '<div style="font-size:12px;color:#166534;margin-bottom:8px">아이는 받아쓰기 첫 화면에서 <b>이름 + 비밀번호</b>로 들어가요 (처음 비밀번호 1234 · 들어가서 바꿀 수 있어요). 성 없이 이름만 쳐도 돼요. 이 계정으로는 가문굴비 업무 화면은 못 봐요.</div>';
  if(bad.length) h += '<div style="margin-bottom:8px;padding:10px;background:#fef2f2;border:2px solid #dc2626;border-radius:8px;font-size:13px;color:#7f1d1d"><b>🔧 로그인하면 이름이 「??」로 나오는 계정 ' + bad.length + '개</b> (' + esc(bad.map(_kdNm).join(", ")) + ') — 한 번 고쳐 주세요. 비밀번호는 그대로예요.<br><button class="btn btn-s" style="background:#dc2626;color:#fff;margin-top:6px" onclick="kdFixIds()">🔧 지금 고치기</button>' + (noSur.length ? ' <label style="margin-left:6px"><input type="checkbox" id="kdFixSur" checked> 고치면서 이름 앞에 「' + KD_SURNAME + '」도 붙이기</label>' : '') + '</div>';
  if(miss.length) h += '<div style="margin-bottom:8px">' + miss.map(function(n){ return '<button class="btn btn-s" style="background:#15803d;color:#fff;margin:2px" onclick="kdAddKid(\'' + esc(KD_SURNAME + n) + '\')">+ ' + esc(KD_SURNAME + n) + '</button>'; }).join("") + '</div>';
  if(!bad.length && noSur.length) h += '<div style="margin-bottom:8px;padding:8px 10px;background:#fefce8;border:1px solid #fde047;border-radius:8px;font-size:13px">성이 없는 이름 ' + noSur.length + '개 (' + esc(noSur.map(_kdNm).join(", ")) + ') <button class="btn btn-s" style="background:#a16207;color:#fff;margin-left:6px" onclick="kdAddSurname()">🏷 모두 「' + KD_SURNAME + '」 붙이기</button> <span style="color:#713f12">공부 기록·비밀번호는 그대로 옮겨져요</span></div>';
  h += '<div class="scrollx"><table><tr><th>이름 (로그인할 때 치는 이름)</th><th>관리</th></tr>';
  if(!L.length) h += '<tr><td colspan="2" style="text-align:center;color:#999;padding:14px">아직 아이 계정이 없어요 — 위 이름 버튼을 누르면 바로 만들어져요</td></tr>';
  L.forEach(function(id){ h += '<tr><td style="font-weight:800;font-size:15px">' + esc(_kdNm(id)) + (_kdOk(id) ? '' : ' <span style="color:#dc2626;font-size:12px">🔧 고치기 필요</span>') + '</td><td><button class="btn btn-b btn-s" onclick="kdEditKid(\'' + esc(id) + '\')">✏️ 수정</button> <button class="btn btn-s" style="background:#b45309;color:#fff" onclick="kdResetPw(\'' + esc(id) + '\')">🔑 비번 1234로</button> <button class="btn btn-r btn-s" onclick="kdDelKid(\'' + esc(id) + '\')">삭제</button></td></tr>'; });
  return h + '</table></div></div>';
}
// ✏️ 이름·비밀번호 수정
function kdEditKid(id){
  openPopup('<h3>✏️ ' + esc(_kdNm(id)) + ' 수정 <button class="close-x" onclick="closePopup()">&times;</button></h3>'
    + '<div class="frow fr2"><div><label>이름 (받아쓰기에서 칠 이름)</label><input type="text" id="kdEdId" value="' + esc(_kdNm(id)) + '"></div>'
    + '<div><label>새 비밀번호 <span style="font-weight:400;color:#64748b">(비우면 그대로)</span></label><input type="text" id="kdEdPw" inputmode="numeric" placeholder="숫자 4개 이상"></div></div>'
    + '<div style="font-size:12px;color:#475569;margin-top:6px">이름을 바꿔도 <b>공부 기록·계급은 그대로</b> 따라가요.</div>'
    + '<div style="text-align:right;margin-top:14px"><button class="btn" style="background:#16a34a;color:#fff" onclick="kdEditSave(\'' + esc(id) + '\')">💾 저장</button></div>');
}
async function kdEditSave(oldId){
  var nm = document.getElementById("kdEdId").value.trim(), pw = document.getElementById("kdEdPw").value.trim();
  if(!nm){ alert("이름을 넣어 주세요"); return; }
  if(pw && pw.length < 4){ alert("비밀번호는 4자 이상이에요"); return; }
  var nid = _kdId(nm);
  showLoading("저장 중...");
  var r = nid !== oldId ? await _kdRename(oldId, nid, pw, nm) : (pw ? await secHelper({ action: "setPw", id: oldId, newPw: pw }) : { ok: true });
  hideLoading();
  if(!r || !r.ok){ alert("실패: " + ((r && r.err) || "")); return; }
  closePopup(); toast("✏️ " + nm + " 저장했어요" + (pw ? " (비밀번호 바뀜)" : "")); draw();
}
// 아이디 바꾸기: 회원명단 + 비밀번호(도우미가 옮김) + 공부 기록(/kids/옛아이디 → /kids/새아이디)
async function _kdRename(oldId, nid, pw, nm){
  if(US[nid]) return { ok: false, err: "이미 있는 이름이에요: " + (nm || nid) };
  var users = (_cache.Users || []).slice(), idx = -1;
  for(var i = 0; i < users.length; i++) if(users[i] && users[i].id === oldId){ idx = i; break; }
  if(idx < 0) return { ok: false, err: "계정을 찾을 수 없어요" };
  nm = nm || _kdNm(oldId);
  try {
    var rec = (await fbDb.ref("/kids/" + oldId).once("value")).val(), bd = (await fbDb.ref("/kids/_board/" + oldId).once("value")).val();
    // ① 공부 기록부터 새 아이디로 복사 (여기서 막히면 아무것도 안 바뀜)
    try { if(rec) await fbDb.ref("/kids/" + nid).set(rec); if(bd) await fbDb.ref("/kids/_board/" + nid).set(bd); }
    catch(e){ return { ok: false, err: "공부 기록을 옮길 권한이 없어요 (보안 규칙에 관리자 쓰기 필요) — 아무것도 안 바뀌었어요" }; }
    // ② 회원명단 + 비밀번호
    users[idx] = Object.assign({}, users[idx], { id: nid, nm: nm });
    await saveMainNode("Users", users); _cache.Users = users;
    var h = await secHelper({ action: "setPw", id: nid, newPw: pw || "", fromId: oldId });
    if(!h.ok) return { ok: false, err: "비밀번호 옮기기 실패: " + h.err };
    // ③ 옛 기록 정리
    if(rec) await fbDb.ref("/kids/" + oldId).remove().catch(function(){});
    if(bd) await fbDb.ref("/kids/_board/" + oldId).remove().catch(function(){});
    US[nid] = Object.assign({}, US[oldId], { nm: nm }); delete US[oldId];
    if(KD){ if(KD[oldId]){ KD[nid] = KD[oldId]; delete KD[oldId]; } if(KD_SEL === oldId) KD_SEL = nid; }
    return { ok: true };
  } catch(e){ return { ok: false, err: (e && e.message) || String(e) }; }
}
async function _kdRenameMany(list, title){
  if(!list.length) return;
  if(!confirm(list.map(function(x){ return x[1] === _kdNm(x[0]) ? x[1] : _kdNm(x[0]) + " → " + x[1]; }).join("\n") + "\n\n" + title + "\n(공부 기록·비밀번호는 그대로 옮겨져요)")) return;
  showLoading("고치는 중...");
  var bad = [];
  for(var i = 0; i < list.length; i++){ var r = await _kdRename(list[i][0], _kdId(list[i][1]), "", list[i][1]); if(!r.ok) bad.push(_kdNm(list[i][0]) + ": " + r.err); }
  hideLoading();
  if(bad.length) alert("일부 실패:\n" + bad.join("\n")); else toast("✅ 다 고쳤어요");
  draw();
}
// 🔧 한글 아이디(로그인하면 ??) → 영문 아이디로 (성 붙이기 같이 선택)
function kdFixIds(){
  var sur = document.getElementById("kdFixSur"), addSur = sur ? sur.checked : false;
  _kdRenameMany(_kdAcctList().filter(function(id){ return !_kdOk(id); }).map(function(id){ var n = _kdNm(id); return [id, addSur && KD_NAMES.indexOf(n) >= 0 ? KD_SURNAME + n : n]; }), "이렇게 고칠까요?");
}
// 🏷 성 없는 이름에 모두 성 붙이기 (다원 → 정다원)
function kdAddSurname(){
  _kdRenameMany(_kdAcctList().filter(function(id){ return KD_NAMES.indexOf(_kdNm(id)) >= 0; }).map(function(id){ return [id, KD_SURNAME + _kdNm(id)]; }), "이렇게 바꿀까요? 아이들은 성 없이 이름만 쳐도 들어가져요.");
}
async function kdAddKid(nm){
  if(!nm){ nm = prompt("👦 아이 이름 (받아쓰기에서 칠 이름, 예: 정다원)"); if(nm === null) return; nm = nm.trim(); }
  if(!nm) return;
  var id = _kdId(nm);
  if(US[id]){ alert("이미 있는 이름이에요: " + nm); return; }
  showLoading("만드는 중...");
  var r = await api("addAcct", { id: id, pw: "1234", r: "kid", ar: "", nm: nm, tel: "", _who: CID });
  hideLoading();
  if(!r.ok){ alert(r.err || "실패"); return; }
  US[id] = { r: "kid", ar: "", nm: nm, tel: "" };
  toast(r.warn ? r.warn : "👦 " + nm + " 계정 만들었어요 (비밀번호 1234)", !!r.warn); draw();
}
async function kdResetPw(id){
  if(!confirm(_kdNm(id) + " 비밀번호를 1234 로 되돌릴까요?")) return;
  showLoading("바꾸는 중...");
  var r = typeof secHelper === "function" ? await secHelper({ action: "setPw", id: id, newPw: "1234" }) : await api("updateAcct", { oldId: id, id: id, pw: "1234", r: "kid", ar: "", nm: _kdNm(id) });
  hideLoading();
  if(r && r.ok) toast("🔑 " + _kdNm(id) + " 비밀번호 1234 로 바꿨어요"); else alert("실패: " + ((r && r.err) || ""));
}
async function kdDelKid(id){
  if(!confirm(_kdNm(id) + " 아이 계정을 지울까요?\n(공부 기록은 그대로 남아요)")) return;
  showLoading("지우는 중...");
  var r = await api("deleteAcct", { id: id });
  hideLoading();
  if(!r.ok){ alert(r.err || "실패"); return; }
  delete US[id]; toast("계정 지웠어요"); draw();
}
// 🔔 알림 설정 — 아이 앱이 /kids/_cfg 를 읽어 텔레그램으로 보냄
function kdCfg(){
  var c = (KD && KD._cfg) || {}, on = c.on || { test: 1, rank: 1, daily: 1 };
  var me = (typeof _tgOf === "function" && CID) ? _tgOf(CID) : "";
  var h = '<h3 style="margin:0 0 8px">🔔 아이들 알림 <button class="btn" style="background:#475569;color:#fff;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="font-size:13px;color:#475569;margin-bottom:10px">아이가 받아쓰기를 하면 이 텔레그램으로 알려요 (가문굴비 알림 봇).</div>';
  h += '<label style="font-size:13px;font-weight:700">받을 텔레그램 숫자 ID <span style="font-weight:400;color:#64748b">(여러 개는 쉼표)</span></label><input id="kdChats" value="' + esc(c.chats || me || (typeof TG_CHAT_IDS !== "undefined" ? TG_CHAT_IDS : "")) + '" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;margin:4px 0 12px">';
  [["test", "📝 시험 끝났을 때 (점수 · 틀린 것)"], ["rank", "🎖 진급했을 때"], ["daily", "📚 그날 처음 공부 시작할 때"]].forEach(function(o){ h += '<label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" id="kdOn_' + o[0] + '"' + (on[o[0]] ? " checked" : "") + '> ' + o[1] + '</label>'; });
  h += '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #e5e7eb"><label style="font-size:13px;font-weight:700">🔒 받아쓰기 부모님 비밀번호 <span style="font-weight:400;color:#64748b">(설정·채점 잠금 · 모든 폰 공통 · ' + (c.ppw ? "정해져 있음" : "아직 안 정함 → 폰마다 처음 1234") + ')</span></label>'
    + '<input id="kdPpw" type="text" placeholder="바꿀 때만 입력 (4자 이상) — 비우면 그대로" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;margin-top:4px"></div>';
  h += '<div style="text-align:right;margin-top:12px"><button class="btn" style="background:#16a34a;color:#fff;padding:9px 20px" onclick="kdCfgSave()">💾 저장</button></div>';
  openPopup(h, 520);
}
// 받아쓰기 앱과 같은 암호값 (dictation.html _pph 와 같아야 함)
function _kdPph(s){ s = "gamun-parent:" + String(s == null ? "" : s).trim(); var h = 5381; for(var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return "p" + h.toString(36); }
function kdCfgSave(){
  var o = { tok: (typeof TG_BOT_TOKEN !== "undefined" ? TG_BOT_TOKEN : ""), chats: document.getElementById("kdChats").value.trim(), on: {} };
  ["test", "rank", "daily"].forEach(function(k){ if(document.getElementById("kdOn_" + k).checked) o.on[k] = 1; });
  var pp = (document.getElementById("kdPpw").value || "").trim(), old = (KD && KD._cfg) || {};
  if(pp && pp.length < 4){ alert("부모님 비밀번호는 4자 이상이에요"); return; }
  if(pp) o.ppw = _kdPph(pp); else if(old.ppw) o.ppw = old.ppw;
  showLoading("저장 중...");
  fbDb.ref("/kids/_cfg").set(o).then(function(){ hideLoading(); KD._cfg = o; closePopup(); toast("🔔 알림 설정 저장했어요"); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
