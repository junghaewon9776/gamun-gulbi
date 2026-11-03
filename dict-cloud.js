// ============================================================================
// ☁️ 받아쓰기 로그인 · 서버 저장 · 알림 (dictation.html 뒤에 붙음)
//   아이 계정: Firebase 이메일 로그인 — 아이는 이름 + 비밀번호(처음 1234)만 침
//     이메일 = "k" + 이름 UTF-8 16진수 + KID_DOMAIN, 실제 비번 = "dict:" + 4자리 (Firebase 6자 제한 때문)
//   따로 쓰는 Firebase 앱("kids") → 같은 폰의 가문굴비 관리자 로그인과 안 섞임
//   /kids/{uid}      = { name, rec, xp, st, day, speed, rk, at } — 자기 것만 읽기·쓰기
//   /kids/{uid}/log  = 공부한 일 (시험·진급·오늘 첫 공부)
//   /kids/_board/{uid} = { name, xp, rk } — 형제끼리 계급 보기 (아이 계정 누구나 읽기)
//   /kids/_cfg       = { tok, chats, on:{test,rank,daily} } — 알림 설정 (가문굴비 👦 아이들 탭에서 저장)
// ============================================================================
var KID_DOMAIN = "@kids.gamungulbi.app";
var KC = { app: null, auth: null, db: null, uid: "", name: "", cfg: null, t: null, ready: false };

function _kHex(s){ return Array.prototype.map.call(new TextEncoder().encode(String(s).trim()), function(b){ return ("0" + b.toString(16)).slice(-2); }).join(""); }
function _kEmail(name){ return "k" + _kHex(name) + KID_DOMAIN; }
function _kPw(pin){ return "dict:" + String(pin).trim(); }

(function(){
  try {
    if(typeof firebase === "undefined" || typeof firebaseConfig === "undefined") return;
    KC.app = firebase.apps.filter(function(a){ return a.name === "kids"; })[0] || firebase.initializeApp(firebaseConfig, "kids");
    KC.auth = KC.app.auth(); KC.db = KC.app.database();
    KC.auth.onAuthStateChanged(function(u){
      if(u && u.email && u.email.indexOf(KID_DOMAIN) > 0){ KC.uid = u.uid; KC.name = u.displayName || KC.name; }
      else { KC.uid = ""; KC.name = ""; }
      KC.ready = true;
      if(!$("vName").classList.contains("hidden")) renderNames();
    });
  } catch(e){ console.warn("[받아쓰기] 서버 연결 안 됨 — 이 폰에만 저장해요", e); }
})();
function _kOn(){ return !!KC.auth; }

// ── 첫 화면: 이름 · 비밀번호 로그인 ──
var _renderNames0 = renderNames;
renderNames = function(){
  if(!_kOn()) return _renderNames0();
  var h = '';
  if(!KC.ready){ $("nameList").innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px">📡 연결 중...</div>'; return; }
  if(KC.uid && KC.name){
    var r = RANKS[rankIdx(xpOf(KC.name))];
    h += '<button style="grid-column:1/-1;background:#1d4ed8;font-size:24px" onclick="kGo()">▶ ' + esc(KC.name) + '(으)로 계속하기<small>' + insSmall(r, "#fff") + ' ' + esc(r.name) + '</small></button>';
    h += '<button style="grid-column:1/-1;background:#64748b" onclick="kOut()">다른 사람이에요 (로그아웃)</button>';
  } else {
    h += '<div style="grid-column:1/-1;text-align:left"><label style="font-weight:900;font-size:19px">✏️ 내 이름</label><input id="kName" autocomplete="username" placeholder="예: 다원" style="width:100%;font-size:24px;padding:12px;border:3px solid #94a3b8;border-radius:12px;box-sizing:border-box;margin:6px 0 12px">';
    h += '<label style="font-weight:900;font-size:19px">🔑 비밀번호</label><input id="kPin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="숫자 4개" onkeydown="if(event.key===\'Enter\')kLogin()" style="width:100%;font-size:24px;padding:12px;border:3px solid #94a3b8;border-radius:12px;box-sizing:border-box;margin:6px 0 12px;letter-spacing:6px">';
    h += '<div id="kErr" style="color:#b91c1c;font-weight:800;min-height:22px"></div></div>';
    h += '<button style="grid-column:1/-1;background:#15803d;font-size:24px" onclick="kLogin()">🚪 들어가기</button>';
    h += '<div style="grid-column:1/-1;color:#64748b;font-size:15px">처음 비밀번호는 <b>1234</b> 예요. 들어가서 바꿀 수 있어요.</div>';
  }
  $("nameList").innerHTML = h;
  var hd = document.querySelector("#vName h2"); if(hd) hd.textContent = KC.uid ? "👋 반가워요!" : "👋 이름이랑 비밀번호를 쳐요";
};
function kLogin(){
  var nm = ($("kName").value || "").trim(), pin = ($("kPin").value || "").trim(), er = $("kErr");
  if(!nm){ er.textContent = "이름을 쳐 주세요"; return; }
  if(!/^\d{4,8}$/.test(pin)){ er.textContent = "비밀번호는 숫자 4개예요"; return; }
  er.textContent = "확인 중...";
  KC.auth.signInWithEmailAndPassword(_kEmail(nm), _kPw(pin)).then(function(c){
    KC.uid = c.user.uid; KC.name = c.user.displayName || nm; return kPull();
  }).then(function(){ er.textContent = ""; kGo(); })
    .catch(function(e){ er.textContent = /password|credential|user-not-found|invalid/i.test(e.code + e.message) ? "이름이나 비밀번호가 틀렸어요" : "연결이 안 돼요: " + (e.message || e); });
}
function kGo(){
  var i = DB.names.indexOf(KC.name);
  if(i < 0){ DB.names.push(KC.name); save(); i = DB.names.length - 1; }
  kPull().then(function(){ pickName(i); kDailyMark(); });
}
function kOut(){ if(!confirm("로그아웃할까요?")) return; KC.auth.signOut(); ME = ""; renderNames(); }

// ── 서버에서 받기 (서버 기록이 있으면 서버 것, 없으면 이 폰 기록을 올림) ──
var KEYS = ["rec", "st", "day", "speed"];
function kPull(){
  if(!KC.uid) return Promise.resolve();
  var n = KC.name;
  return Promise.all([KC.db.ref("/kids/" + KC.uid).once("value"), KC.db.ref("/kids/_board").once("value").catch(function(){ return null; }), KC.db.ref("/kids/_cfg").once("value").catch(function(){ return null; })]).then(function(r){
    var S = r[0].val() || {}, has = S.rec || S.xp != null || S.st;
    if(has){ KEYS.forEach(function(k){ DB[k] = DB[k] || {}; if(S[k]) DB[k][n] = S[k]; }); if(S.xp != null) DB.xp[n] = S.xp; }
    var B = r[1] && r[1].val() || {}; Object.keys(B).forEach(function(u){ var b = B[u]; if(b && b.name && b.name !== n){ if(DB.names.indexOf(b.name) < 0) DB.names.push(b.name); DB.xp[b.name] = b.xp || 0; } });
    KC.cfg = r[2] && r[2].val() || null;
    _save0();
    if(!has) kPush(true);   // 처음 로그인: 이 폰에 있던 기록을 서버로
  });
}
function kPush(now){
  if(!KC.uid || !KC.name || (!now && ME !== KC.name)) return;   // 평소엔 로그인한 아이로 공부 중일 때만, 첫 로그인 올리기(now)는 바로
  clearTimeout(KC.t);
  var go = function(){
    var n = KC.name, o = { name: n, xp: xpOf(n), rk: RANKS[rankIdx(xpOf(n))].name, at: new Date().toISOString() };
    KEYS.forEach(function(k){ o[k] = (DB[k] || {})[n] || null; });
    KC.db.ref("/kids/" + KC.uid).update(JSON.parse(JSON.stringify(o))).catch(function(e){ console.warn("[받아쓰기] 서버 저장 실패", e); });
    KC.db.ref("/kids/_board/" + KC.uid).set({ name: n, xp: o.xp, rk: o.rk }).catch(function(){});
  };
  if(now) go(); else KC.t = setTimeout(go, 1500);
}
var _save0 = save;
save = function(){ _save0(); kPush(); };

// ── 공부한 일 남기기 + 알림 ──
function kLog(type, txt, extra){
  if(!KC.uid) return;
  var o = Object.assign({ t: new Date().toISOString(), type: type, txt: txt }, extra || {});
  KC.db.ref("/kids/" + KC.uid + "/log").push(JSON.parse(JSON.stringify(o))).catch(function(){});
  var c = KC.cfg; if(!c || !c.tok || !c.chats || !(c.on || {})[type]) return;
  var ic = { test: "📝", rank: "🎖", daily: "📚" }[type] || "✏️";
  var msg = ic + " <b>" + esc(KC.name) + "</b> " + esc(txt) + "\n" + new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  String(c.chats).split(/[,\s]+/).filter(Boolean).forEach(function(id){
    fetch("https://api.telegram.org/bot" + c.tok + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: id, text: msg, parse_mode: "HTML", disable_web_page_preview: true }) }).catch(function(){});
  });
}
// 시험 끝 (받아쓰기)
var _recordScore0 = recordScore;
recordScore = function(){
  var was = SAVED; _recordScore0.apply(this, arguments); if(was || !KC.uid) return;
  var arr = (DB.rec[ME] || {})[T.key] || [], x = arr[arr.length - 1]; if(!x) return;
  var wrongTxt = T.qs.filter(function(q, k){ return MARK[k] === false; }).map(function(q){ return q.s; });
  kLog("test", "받아쓰기 " + lvName(T.key) + " " + x.no + "회차 " + x.score + "점 (" + x.ok + "/" + x.n + ")" + (wrongTxt.length ? "\n❌ " + wrongTxt.slice(0, 5).join(" / ") + (wrongTxt.length > 5 ? " 외 " + (wrongTxt.length - 5) + "개" : "") : " 💯"),
    { key: T.key, no: x.no, score: x.score, ok: x.ok, n: x.n, wrongTxt: wrongTxt, where: x.where });
};
// 시험 끝 (수학)
var _mFinish0 = mFinish;
mFinish = function(){
  var k = mKey(), before = ((DB.rec[ME] || {})[k] || []).length, m = MQ;
  _mFinish0.apply(this, arguments);
  if(!KC.uid) return;
  var arr = (DB.rec[ME] || {})[k] || [];
  if(m.mode === "speed") kLog("test", "🔢 " + mName(MLV) + " 1분 도전 " + m.right + "개", { key: k, speed: m.right });
  else if(arr.length > before){ var x = arr[arr.length - 1]; kLog("test", "🔢 " + mName(MLV) + " " + x.no + "회차 " + x.score + "점 (" + x.ok + "/" + x.n + ")", { key: k, no: x.no, score: x.score, ok: x.ok, n: x.n, wrongTxt: x.wrong || [] }); }
};
// 진급
var _promote0 = promote;
promote = function(r){ _promote0.apply(this, arguments); kLog("rank", "진급! 🎖 " + r.name + " (경험치 " + xpOf(ME) + ")", { rk: r.name }); };
// 오늘 첫 공부
function kDailyMark(){}
var _gainXp0 = gainXp;
gainXp = function(amount, why){
  var first = ME && (!DB.day[ME] || DB.day[ME].d !== today());
  var got = _gainXp0.apply(this, arguments);
  if(first && got > 0) kLog("daily", "오늘 공부 시작! (" + why + ")" + (DB.day[ME] && DB.day[ME].streak > 1 ? " 🔥 " + DB.day[ME].streak + "일 연속" : ""));
  return got;
};

// ── 🔑 비밀번호 바꾸기 ──
function kChangePw(){
  var u = KC.auth && KC.auth.currentUser; if(!u){ alert("로그인한 다음에 바꿀 수 있어요"); return; }
  var a = prompt("🔑 새 비밀번호 (숫자 4개)"); if(a === null) return;
  if(!/^\d{4,8}$/.test(a.trim())){ alert("숫자 4개로 해 주세요"); return; }
  var b = prompt("한 번 더 쳐 주세요"); if(b === null) return;
  if(a.trim() !== b.trim()){ alert("두 번 친 게 달라요"); return; }
  u.updatePassword(_kPw(a)).then(function(){ alert("✅ 비밀번호를 바꿨어요! 잊어버리지 마요"); })
    .catch(function(e){ alert(/recent/i.test(e.code + e.message) ? "로그아웃했다가 다시 들어와서 바꿔 주세요" : "못 바꿨어요: " + e.message); });
}
// 급 고르기 화면 위에 내 계정 버튼 (비번 바꾸기 · 로그아웃)
(function(){
  if(!_kOn()) return;
  var lv = $("vLevel"); if(!lv) return;
  var bar = document.createElement("div"); bar.className = "row"; bar.id = "kBar"; bar.style.marginBottom = "8px";
  bar.innerHTML = '<button class="b-dark" style="font-size:15px" onclick="kChangePw()">🔑 비밀번호 바꾸기</button><button class="b-dark" style="font-size:15px;background:#64748b" onclick="kOut();go(\'vName\')">🚪 로그아웃</button>';
  lv.insertBefore(bar, lv.firstChild);
})();
