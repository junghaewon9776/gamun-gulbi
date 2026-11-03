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
  fbDb.ref("/kids").once("value").then(function(s){ KD_LOADING = false; KD = s.val() || {}; if(CTAB === "kids") draw(); })
    .catch(function(e){ KD_LOADING = false; KD = {}; toast("아이들 기록을 못 읽었어요: " + e.message, true); });
}
function _kdKids(){ return Object.keys(KD || {}).filter(function(k){ return k.charAt(0) !== "_" && KD[k] && KD[k].name; }).sort(function(a, b){ return String(KD[a].name).localeCompare(String(KD[b].name)); }); }
function _kdLogs(k){ var L = (KD[k] && KD[k].log) || {}; return Object.keys(L).map(function(i){ return L[i]; }).sort(function(a, b){ return String(b.t).localeCompare(String(a.t)); }); }
function _kdTime(t){ try { return new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch(e){ return t || ""; } }
function _kdKeyName(k){ k = String(k); if(k.indexOf("수·") === 0) return "🔢 수학 " + k.slice(2); if(k === "all") return "전체"; if(k === "wrong") return "틀린 것"; var m = k.split("·"); return m.length > 1 ? m[0] + " 급수표 " + _kdKeyName(m[1]) : k + "급"; }

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
function _kdRecHtml(k, print){
  var x = KD[k], keys = Object.keys(x.rec || {}).filter(function(key){ return (x.rec[key] || []).length; });
  if(!keys.length) return '<div style="padding:20px;text-align:center;color:#94a3b8">아직 본 시험이 없어요</div>';
  // 틀린 문장: 로그에 남긴 것(새 기록)에서 회차별로 찾기
  var wt = {}; _kdLogs(k).forEach(function(l){ if(l.type === "test" && l.key != null && l.no != null) wt[l.key + "#" + l.no] = l.wrongTxt || []; });
  var S = print ? "" : "padding:6px;border-bottom:1px solid #f1f5f9;";
  var h = '';
  keys.sort().forEach(function(key){
    var arr = x.rec[key];
    h += '<div style="font-weight:800;margin:12px 0 4px">' + esc(_kdKeyName(key)) + ' <span style="font-weight:400;color:#64748b;font-size:12px">' + arr.length + '회 · 최고 ' + Math.max.apply(null, arr.map(function(r){ return r.score || 0; })) + '점</span></div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr' + (print ? "" : ' style="background:#f8fafc"') + '><th style="' + S + 'text-align:left">회차</th><th style="' + S + 'text-align:left">날짜</th><th style="' + S + 'text-align:right">점수</th><th style="' + S + 'text-align:center">맞음</th><th style="' + S + 'text-align:left">어디에</th><th style="' + S + 'text-align:left">틀린 것</th></tr></thead><tbody>';
    arr.slice().reverse().forEach(function(r){
      var w = wt[key + "#" + r.no] || (r.wrong || []).map(function(q){ return String(q).replace(/^q:/, ""); });
      h += '<tr><td style="' + S + '">' + (r.no || "") + '회</td><td style="' + S + '">' + esc(r.d || "") + '</td><td style="' + S + 'text-align:right;font-weight:900;color:' + ((r.score || 0) >= 90 ? "#15803d" : "#b91c1c") + '">' + (r.score || 0) + (r.score === 100 ? " 💯" : "") + '</td><td style="' + S + 'text-align:center">' + (r.ok || 0) + '/' + (r.n || 0) + '</td><td style="' + S + 'font-size:12px">' + esc({ screen: "폰 타자", hand: "폰 손글씨", paper: "종이" }[r.where] || r.where || "") + '</td><td style="' + S + 'font-size:12px;color:#b91c1c">' + esc(w.join(" / ")) + '</td></tr>';
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
// 👦 아이 계정 (받아쓰기 로그인) — 계정관리 · 아이들 탭에 같이 나옴. 역할 "kid", 아이디 = 이름
var KD_NAMES = ["다원", "라온", "은우", "도겸", "은교", "다윤"];
function _kdAcctList(){ var a = []; for(var k in US){ if(US[k] && US[k].r === "kid") a.push(k); } return a.sort(function(x, y){ var i = KD_NAMES.indexOf(x), j = KD_NAMES.indexOf(y); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || x.localeCompare(y); }); }
function _kdAcctCard(){
  if(typeof _isGlobalAdm !== "function" || !_isGlobalAdm()) return "";
  var L = _kdAcctList(), miss = KD_NAMES.filter(function(n){ return !US[n]; });
  var h = '<div class="card" style="border:2px solid #16a34a;background:#f0fdf4"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px"><h3 style="margin:0;color:#14532d;font-weight:800">👦 아이 계정 (받아쓰기)</h3>';
  h += '<button class="btn btn-s" style="background:#16a34a;color:#fff;font-weight:700" onclick="kdAddKid()">+ 아이 추가</button></div>';
  h += '<div style="font-size:12px;color:#166534;margin-bottom:8px">아이는 받아쓰기 첫 화면에서 <b>이름 + 비밀번호</b>로 들어가요 (처음 비밀번호 1234 · 들어가서 바꿀 수 있어요). 이 계정으로는 가문굴비 업무 화면은 못 봐요.</div>';
  if(miss.length) h += '<div style="margin-bottom:8px">' + miss.map(function(n){ return '<button class="btn btn-s" style="background:#15803d;color:#fff;margin:2px" onclick="kdAddKid(\'' + esc(n) + '\')">+ ' + esc(n) + '</button>'; }).join("") + '</div>';
  h += '<div class="scrollx"><table><tr><th>이름 (아이디)</th><th>관리</th></tr>';
  if(!L.length) h += '<tr><td colspan="2" style="text-align:center;color:#999;padding:14px">아직 아이 계정이 없어요 — 위 이름 버튼을 누르면 바로 만들어져요</td></tr>';
  L.forEach(function(id){ h += '<tr><td style="font-weight:800;font-size:15px">' + esc(id) + '</td><td><button class="btn btn-s" style="background:#b45309;color:#fff" onclick="kdResetPw(\'' + esc(id) + '\')">🔑 비번 1234로</button> <button class="btn btn-r btn-s" onclick="kdDelKid(\'' + esc(id) + '\')">삭제</button></td></tr>'; });
  return h + '</table></div></div>';
}
async function kdAddKid(nm){
  if(!nm){ nm = prompt("👦 아이 이름 (받아쓰기에서 칠 이름)"); if(nm === null) return; nm = nm.trim(); }
  if(!nm) return;
  if(US[nm]){ alert("이미 있는 아이디예요: " + nm); return; }
  showLoading("만드는 중...");
  var r = await api("addAcct", { id: nm, pw: "1234", r: "kid", ar: "", nm: nm, tel: "", _who: CID });
  hideLoading();
  if(!r.ok){ alert(r.err || "실패"); return; }
  US[nm] = { r: "kid", ar: "", nm: nm, tel: "" };
  toast(r.warn ? r.warn : "👦 " + nm + " 계정 만들었어요 (비밀번호 1234)", !!r.warn); draw();
}
async function kdResetPw(id){
  if(!confirm(id + " 비밀번호를 1234 로 되돌릴까요?")) return;
  showLoading("바꾸는 중...");
  var r = typeof secHelper === "function" ? await secHelper({ action: "setPw", id: id, newPw: "1234" }) : await api("updateAcct", { oldId: id, id: id, pw: "1234", r: "kid", ar: "", nm: id });
  hideLoading();
  if(r && r.ok) toast("🔑 " + id + " 비밀번호 1234 로 바꿨어요"); else alert("실패: " + ((r && r.err) || ""));
}
async function kdDelKid(id){
  if(!confirm(id + " 아이 계정을 지울까요?\n(공부 기록은 그대로 남아요)")) return;
  showLoading("지우는 중...");
  var r = await api("deleteAcct", { id: id });
  hideLoading();
  if(!r.ok){ alert(r.err || "실패"); return; }
  delete US[id]; toast(id + " 계정 지웠어요"); draw();
}
// 🔔 알림 설정 — 아이 앱이 /kids/_cfg 를 읽어 텔레그램으로 보냄
function kdCfg(){
  var c = (KD && KD._cfg) || {}, on = c.on || { test: 1, rank: 1, daily: 1 };
  var me = (typeof _tgOf === "function" && CID) ? _tgOf(CID) : "";
  var h = '<h3 style="margin:0 0 8px">🔔 아이들 알림 <button class="btn" style="background:#475569;color:#fff;float:right" onclick="closePopup()">닫기</button></h3>';
  h += '<div style="font-size:13px;color:#475569;margin-bottom:10px">아이가 받아쓰기를 하면 이 텔레그램으로 알려요 (가문굴비 알림 봇).</div>';
  h += '<label style="font-size:13px;font-weight:700">받을 텔레그램 숫자 ID <span style="font-weight:400;color:#64748b">(여러 개는 쉼표)</span></label><input id="kdChats" value="' + esc(c.chats || me || (typeof TG_CHAT_IDS !== "undefined" ? TG_CHAT_IDS : "")) + '" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;box-sizing:border-box;margin:4px 0 12px">';
  [["test", "📝 시험 끝났을 때 (점수 · 틀린 것)"], ["rank", "🎖 진급했을 때"], ["daily", "📚 그날 처음 공부 시작할 때"]].forEach(function(o){ h += '<label style="display:block;font-size:14px;margin:6px 0"><input type="checkbox" id="kdOn_' + o[0] + '"' + (on[o[0]] ? " checked" : "") + '> ' + o[1] + '</label>'; });
  h += '<div style="text-align:right;margin-top:12px"><button class="btn" style="background:#16a34a;color:#fff;padding:9px 20px" onclick="kdCfgSave()">💾 저장</button></div>';
  openPopup(h, 520);
}
function kdCfgSave(){
  var o = { tok: (typeof TG_BOT_TOKEN !== "undefined" ? TG_BOT_TOKEN : ""), chats: document.getElementById("kdChats").value.trim(), on: {} };
  ["test", "rank", "daily"].forEach(function(k){ if(document.getElementById("kdOn_" + k).checked) o.on[k] = 1; });
  showLoading("저장 중...");
  fbDb.ref("/kids/_cfg").set(o).then(function(){ hideLoading(); KD._cfg = o; closePopup(); toast("🔔 알림 설정 저장했어요"); })
    .catch(function(e){ hideLoading(); toast("저장 실패: " + e.message, true); });
}
