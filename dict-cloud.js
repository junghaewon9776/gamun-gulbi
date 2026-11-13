// ============================================================================
// ☁️ 받아쓰기 로그인 · 서버 저장 · 알림 (dictation.html 뒤에 붙음)
//   아이 계정: 가문굴비 계정관리 → 👦 아이 계정 (역할 "kid", 아이디 = 이름, 처음 비번 1234)
//     로그인 = 가문굴비와 같은 로그인 도우미(SEC_AUTH_URL) → 입장권(uid = 이름, r = kid)
//   따로 쓰는 Firebase 앱("kids") → 같은 폰의 가문굴비 관리자 로그인과 안 섞임
//   /kids/{uid}      = { name, rec, xp, st, day, speed, rk, at } — 자기 것만 읽기·쓰기
//   /kids/{uid}/log  = 공부한 일 (시험·진급·오늘 첫 공부)
//   /kids/_board/{uid} = { name, xp, rk } — 형제끼리 계급 보기 (아이 계정 누구나 읽기)
//   /kids/_cfg       = { tok, chats, on:{test,rank,daily} } — 알림 설정 (가문굴비 👦 아이들 탭에서 저장)
// ============================================================================
var KC = { app: null, auth: null, db: null, uid: "", name: "", cfg: null, t: null, ready: false };

// 로그인 도우미 부르기 (가문굴비 sec-auth.js 와 같은 방식)
function _kHelper(body){
  body.sys = (typeof SEC_SYS !== "undefined" && SEC_SYS) || "gamun";
  return fetch(SEC_AUTH_URL, { method: "POST", redirect: "follow", body: JSON.stringify(body) }).then(function(r){ return r.json(); });
}

(function(){
  try {
    if(typeof firebase === "undefined" || typeof firebaseConfig === "undefined" || typeof SEC_AUTH_URL === "undefined" || !SEC_AUTH_URL) return;
    KC.app = firebase.apps.filter(function(a){ return a.name === "kids"; })[0] || firebase.initializeApp(firebaseConfig, "kids");
    KC.auth = KC.app.auth(); KC.db = KC.app.database();
    KC.auth.onAuthStateChanged(function(u){
      var done = function(kid){
        // 예전 한글 아이디로 들어온 것(uid 가 「??」로 깨짐)은 내보내고 다시 로그인하게
        if(kid && !_kIdOk(u.uid)){ try { KC.auth.signOut(); } catch(e){} kid = false; }
        if(kid){ KC.uid = u.uid; KC.name = _kShort(_kNameOf(u.uid)); } else { KC.uid = ""; KC.name = ""; }
        KC.ready = true;
        if(!$("vName").classList.contains("hidden")) renderNames();
      };
      if(!u) return done(false);
      u.getIdTokenResult().then(function(t){ done(t.claims.r === "kid"); }, function(){ done(false); });
    });
  } catch(e){ console.warn("[받아쓰기] 서버 연결 안 됨 — 이 폰에만 저장해요", e); }
})();
function _kOn(){ return !!KC.auth; }
// 아이디에 성이 붙어 있어도(정다원) 앱 안에서는 이름(다원)으로 — 급수표·학년·형제 순서가 이름 기준
var KID_SURNAME = "정";
function _kShort(id){ id = String(id || ""); var L = (typeof DEFAULT_NAMES !== "undefined" ? DEFAULT_NAMES : []).concat(DB.names || []); return L.indexOf(id) >= 0 ? id : (id.length >= 3 && L.indexOf(id.slice(1)) >= 0 ? id.slice(1) : id); }
// 아이 아이디 = "k" + 이름 UTF-8 16진수 (로그인 도우미가 한글 아이디를 「??」로 깨뜨려서) — 가문굴비 kids.js _kdId 와 같아야 함
function _kIdOf(name){ return "k" + Array.prototype.map.call(new TextEncoder().encode(String(name).trim()), function(b){ return ("0" + b.toString(16)).slice(-2); }).join(""); }
function _kIdOk(id){ return /^k([0-9a-f]{2})+$/.test(String(id || "")); }
function _kNameOf(id){ try { var h = String(id).slice(1), b = new Uint8Array(h.length / 2); for(var i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return new TextDecoder().decode(b); } catch(e){ return id; } }

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
  // QR 로 왔으면: 그 아이로 이미 로그인돼 있으면 바로 들어가고, 아니면 이름 채워 두기
  if(KC.qrName){
    var q = KC.qrName;
    if(KC.uid && _kShort(KC.name) === _kShort(q)){ KC.qrName = ""; setTimeout(kGo, 0); }
    else if(!KC.uid){ var ki = $("kName"); if(ki && !ki.value){ ki.value = q; var kp = $("kPin"); if(kp) setTimeout(function(){ kp.focus(); }, 50); } }
  }
};
function kLogin(){
  var nm = ($("kName").value || "").trim(), pin = ($("kPin").value || "").trim(), er = $("kErr");
  if(!nm){ er.textContent = "이름을 쳐 주세요"; return; }
  if(pin.length < 4){ er.textContent = "비밀번호는 4개 이상이에요"; return; }
  er.textContent = "확인 중...";
  // 아이디는 이름을 영문·숫자로 바꾼 것. 성 없이 쳐도(다원 → 정다원), 성까지 쳐도(정다원 → 다원 계정) 들어가게 차례로
  // 계정이 「정○○」라서 성 없이 치면 성 붙인 것부터 (한 번에 찾게 — 도우미 왕복이 느려서)
  var cands = nm.charAt(0) !== KID_SURNAME ? [KID_SURNAME + nm, nm] : (nm.length >= 3 ? [nm, nm.slice(1)] : [nm]);
  var tryOne = function(i){
    return _kHelper({ action: "login", id: _kIdOf(cands[i]), pw: pin }).then(function(r){
      if(r && !r.ok && /존재하지/.test(r.err || "") && i < cands.length - 1) return tryOne(i + 1);
      return r;
    });
  };
  tryOne(0).then(function(r){
    if(!r || !r.ok){ var m = (r && r.err) || ""; throw { kid: /존재하지/.test(m) ? "그런 이름이 없어요. 엄마·아빠한테 물어봐요" : /일치하지/.test(m) ? "비밀번호가 틀렸어요" : m || "들어가지 못했어요" }; }
    if(!r.me || r.me.r !== "kid") throw { kid: "아이 계정이 아니에요" };
    return KC.auth.signInWithCustomToken(r.token);
  }).then(function(c){
    KC.uid = c.user.uid; KC.name = _kShort(_kNameOf(c.user.uid));   // 기록 불러오기는 kGo 가 한 번만
  }).then(function(){ er.textContent = ""; kGo(); })
    .catch(function(e){ er.textContent = (e && e.kid) || "연결이 안 돼요: " + ((e && e.message) || e); });
}
function kGo(){
  var i = DB.names.indexOf(KC.name);
  if(i < 0){ DB.names.push(KC.name); _save0(); i = DB.names.length - 1; }
  if(KC.going) return; KC.going = true;
  var nl = $("nameList"); if(nl && nl.insertAdjacentHTML) nl.insertAdjacentHTML("afterbegin", '<div id="kGoing" style="grid-column:1/-1;text-align:center;font-weight:800;color:#1d4ed8;padding:6px">📡 내 기록 불러오는 중...</div>');
  var done = false, enter = function(err){
    if(done) return; done = true; KC.going = false;
    var g = document.getElementById("kGoing"); if(g && g.remove) g.remove();
    // 서버가 안 돼도 공부는 하게 — 이 폰에 저장했다가 다음에 합쳐서 올라감
    try { pickName(i); kDailyMark(); } catch(e){ alert("화면을 못 열었어요: " + (e.message || e)); }
    if(err) kErrBar(String((err && (err.code || err.message)) || err));
  };
  setTimeout(function(){ enter("시간 초과"); }, 8000);
  kPull().then(function(){ enter(); }, function(e){ console.warn("[받아쓰기] 불러오기 실패", e); enter(e); });
}
// 서버 연결 실패 — 사라지지 않게 위에 띄워 두기 (이유 그대로 + 다시 로그인)
function kErrBar(why){
  var old = document.getElementById("kErrBar"); if(old) old.remove();
  var lv = $("vLevel"); if(!lv || !lv.insertAdjacentHTML) return;
  var tip = /PERMISSION|permission/i.test(why) ? "로그인이 오래돼서 그래요 → 🔄 다시 로그인을 눌러 주세요" : /시간 초과|network|unavailable/i.test(why) ? "인터넷이 느리거나 끊겼어요 → 와이파이를 확인하고 🔄 다시 로그인" : "🔄 다시 로그인을 눌러 주세요";
  lv.insertAdjacentHTML("afterbegin", '<div id="kErrBar" style="background:#fef2f2;border:3px solid #dc2626;border-radius:12px;padding:10px 12px;margin-bottom:10px;font-size:15px;color:#7f1d1d">'
    + '<b>⚠️ 서버에 연결이 안 됐어요</b> — 지금 공부는 이 폰에 저장했다가 다음에 합쳐서 올라가요.<br>' + esc(tip)
    + '<div style="font-size:12px;color:#991b1b;margin-top:4px">이유: ' + esc(why.slice(0, 120)) + '</div>'
    + '<div class="row" style="margin-top:8px"><button class="b-bad" style="font-size:16px" onclick="kRelogin()">🔄 다시 로그인</button><button class="b-dark" style="font-size:16px;flex:0 0 auto" onclick="this.closest(\'#kErrBar\').remove()">✕ 닫기</button></div></div>');
}
function kRelogin(){ try { KC.auth.signOut(); } catch(e){} ME = ""; var b = document.getElementById("kErrBar"); if(b) b.remove(); go("vName"); }
function kOut(){ if(!confirm("로그아웃할까요?")) return; KC.auth.signOut(); ME = ""; renderNames(); }

// ── 서버에서 받기 (서버 기록이 있으면 서버 것, 없으면 이 폰 기록을 올림) ──
var KEYS = ["rec", "st", "day", "speed"];
function kPull(){
  if(!KC.uid) return Promise.resolve();
  var n = KC.name;
  return Promise.all([KC.db.ref("/kids/" + KC.uid).once("value"), KC.db.ref("/kids/_board").once("value").catch(function(){ return null; }), KC.db.ref("/kids/_cfg").once("value").catch(function(){ return null; })]).then(function(r){
    var S = r[0].val() || {}; ["rec", "st", "speed"].forEach(function(k){ if(S[k]) S[k] = kKeys(S[k], false); });
    var has = S.rec || S.xp != null || S.st;
    kAlias(n);   // 예전 버그로 「??」·영문 아이디·성 붙은 이름으로 이 폰에 쌓인 기록도 이 아이 이름으로 모음
    // 이 폰 기록(로그인 안 하고 QR 로 한 것 등)과 서버 기록을 합침 — 어느 쪽도 버리지 않음
    var localHad = !!((DB.rec || {})[n] || xpOf(n));
    if(has){ var mg = null; try { mg = kMerge(S, n); } catch(e){ console.warn("[받아쓰기] 합치기 실패 — 이 폰 기록을 그대로 씀", e); localHad = true; }
      if(mg){ KEYS.forEach(function(k){ DB[k] = DB[k] || {}; if(mg[k]) DB[k][n] = mg[k]; }); DB.xp[n] = mg.xp; } }
    var B = r[1] && r[1].val() || {}; Object.keys(B).forEach(function(u){ var b = B[u]; if(b && b.name && b.name !== n){ if(DB.names.indexOf(b.name) < 0) DB.names.push(b.name); DB.xp[b.name] = b.xp || 0; } });
    KC.cfg = r[2] && r[2].val() || null;
    // 모든 폰 공통 부모님 비밀번호는 이 폰에도 기억 (로그인 전 설정 화면에서도 쓰게)
    if(KC.cfg && KC.cfg.ppw) DB.opt.ppwS = KC.cfg.ppw; else delete DB.opt.ppwS;
    _save0();
    if(!has || localHad) kPush(true);   // 처음 로그인 · 이 폰에만 있던 기록 → 서버로
  });
}
// 서버 기록 S + 이 폰 기록(이름 n) 합치기: 시험 기록은 같은 것(날짜·점수·맞은 수)만 빼고 다 모음, 경험치·기록은 큰 쪽
// 이 폰에 다른 이름으로 쌓인 같은 아이 기록 모으기 — 「??」(한글 아이디가 깨졌던 때), 영문 아이디(k…), 성 붙은 이름(정라온)
//   시험 기록은 합치고(같은 건 한 번), 경험치는 큰 쪽, 단계·속도·연속일도 합침. 모은 뒤 그 이름은 목록에서 지움
function kAlias(n){
  var al = ["??", KC.uid, KID_SURNAME + n].filter(function(a){ return a && a !== n; });
  if(KC.uid) al.push(_kNameOf(KC.uid));
  al = al.filter(function(a, i){ return a !== n && al.indexOf(a) === i; });
  var moved = false;
  al.forEach(function(a){
    var has = (DB.rec && DB.rec[a]) || (DB.xp && DB.xp[a]) || (DB.st && DB.st[a]);
    if(!has) return;
    var tmp = { rec: (DB.rec || {})[a], st: (DB.st || {})[a], speed: (DB.speed || {})[a], day: (DB.day || {})[a], xp: (DB.xp || {})[a] };
    var mg = kMerge(tmp, n);
    DB.rec = DB.rec || {}; DB.st = DB.st || {}; DB.speed = DB.speed || {}; DB.day = DB.day || {};
    DB.rec[n] = mg.rec; DB.st[n] = mg.st; DB.speed[n] = mg.speed; if(mg.day) DB.day[n] = mg.day; DB.xp[n] = mg.xp;
    ["rec", "st", "speed", "day", "xp"].forEach(function(k){ if(DB[k]) delete DB[k][a]; });
    var ix = DB.names.indexOf(a); if(ix >= 0) DB.names.splice(ix, 1);
    moved = true;
  });
  if(moved) _save0();
}
// 서버(Firebase)는 키에 . $ # [ ] / 를 못 씀 — 한자 「7급Ⅱ」 같은 단계 이름(漢·h7.5-1)의 점을 ‧ 로 바꿔 올리고 받을 때 되돌림
var K_BAD = { ".": "‧", "$": "＄", "#": "＃", "[": "［", "]": "］", "/": "∕" };
function kKeys(o, up){
  if(!o || typeof o !== "object" || Array.isArray(o)) return o;
  var r = {};
  Object.keys(o).forEach(function(k){
    var nk = k;
    Object.keys(K_BAD).forEach(function(c){ nk = up ? nk.split(c).join(K_BAD[c]) : nk.split(K_BAD[c]).join(c); });
    r[nk] = o[k];
  });
  return r;
}
// 서버(Firebase)는 1·2·3 같은 숫자 키 묶음을 빈 칸 있는 목록으로 돌려줌 → 다시 {키: 값} 으로, 빈 칸은 버림
function kObj(o){ var r = {}; if(!o) return r; Object.keys(o).forEach(function(k){ if(o[k] != null) r[k] = o[k]; }); return r; }
function kArr(a){ return (Array.isArray(a) ? a : a ? Object.keys(a).map(function(k){ return a[k]; }) : []).filter(function(x){ return x && typeof x === "object"; }); }
function kMerge(S, n){
  var L = function(k){ return kObj((DB[k] || {})[n]); }, out = {};
  var rec = {}, sr = kObj(S.rec), lr = L("rec");
  Object.keys(sr).forEach(function(key){ rec[key] = JSON.parse(JSON.stringify(kArr(sr[key]))); });
  Object.keys(lr).forEach(function(key){
    var a = rec[key] = rec[key] || [], sig = {};
    a.forEach(function(x){ sig[[x.d, x.score, x.ok, x.n].join("|")] = 1; });
    kArr(lr[key]).forEach(function(x){ var s = [x.d, x.score, x.ok, x.n].join("|"); if(!sig[s]){ a.push(x); sig[s] = 1; } });
  });
  Object.keys(rec).forEach(function(key){ rec[key].forEach(function(x, i){ x.no = i + 1; }); });
  out.rec = rec;
  var st = JSON.parse(JSON.stringify(kObj(S.st))), ls = L("st");
  Object.keys(ls).forEach(function(key){ st[key] = st[key] || {}; Object.keys(ls[key] || {}).forEach(function(s){ if(ls[key][s]) st[key][s] = ls[key][s]; }); });
  out.st = st;
  var sp = JSON.parse(JSON.stringify(kObj(S.speed))), lp = L("speed");
  Object.keys(lp).forEach(function(k){ sp[k] = Math.max(sp[k] || 0, lp[k] || 0); });
  out.speed = sp;
  var sd = S.day || null, ld = L("day") || null;
  out.day = !sd ? ld : !ld ? sd : (String(ld.d) > String(sd.d) ? ld : String(ld.d) < String(sd.d) ? sd : (ld.streak || 0) >= (sd.streak || 0) ? ld : sd);
  out.xp = Math.max(Number(S.xp) || 0, xpOf(n));
  return out;
}
// 📷 QR 로 들어오면(주소 ?n=이름) 로그인 화면으로 — 이름은 미리 채워 두고 비밀번호만 (로그인해야 서버에 기록돼요)
(function(){
  if(!_kOn()) return;
  var n = new URLSearchParams(location.search).get("n"); if(!n) return;
  KC.qrName = n; ME = ""; go("vName");
})();
function kPush(now){
  if(!KC.uid || !KC.name || (!now && ME !== KC.name)) return;   // 평소엔 로그인한 아이로 공부 중일 때만, 첫 로그인 올리기(now)는 바로
  clearTimeout(KC.t);
  var go = function(){
    var n = KC.name, o = { name: n, xp: xpOf(n), rk: RANKS[rankIdx(xpOf(n))].name, at: new Date().toISOString() };
    KEYS.forEach(function(k){ var v = (DB[k] || {})[n] || null; o[k] = v && k !== "day" ? kKeys(v, true) : v; });
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
  kPaper(x);
};
// 📝 시험지 남기기 — 문제마다 정답 · 아이가 쓴 것(타자 글자 / 손글씨 그림) · ⭕❌ → /kids/{uid}/paper/{id}
//   가문굴비 👦 아이들 → 시험 기록지에서 회차를 누르면 보여요. 손글씨는 작게 줄인 그림(JPEG)으로
function _kShrink(u){
  return new Promise(function(ok){
    if(!u) return ok("");
    var im = new Image();
    im.onload = function(){ try {
      var w = Math.min(420, im.width), h = Math.round(im.height * w / im.width), c = document.createElement("canvas");
      c.width = w; c.height = h; var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
      ok(c.toDataURL("image/jpeg", 0.55));
    } catch(e){ ok(""); } };
    im.onerror = function(){ ok(""); }; im.src = u;
  });
}
function kPaper(x){
  if(!KC.uid || !x || !x.id || !T || !T.qs) return;
  var uid = KC.uid, o = { key: T.key, no: x.no, d: x.d, where: T.where, score: x.score,
    q: T.qs.map(function(q){ return q.s; }), m: MARK.map(function(v){ return v ? 1 : 0; }) };
  if(T.where === "screen") o.a = T.qs.map(function(q, k){ return T.ans[k] || ""; });
  var draws = T.where === "hand" ? (T.draw || []).slice() : [];
  Promise.all(draws.map(_kShrink)).then(function(img){
    if(img.length) o.img = img.map(function(v){ return v || ""; });
    return KC.db.ref("/kids/" + uid + "/paper/" + x.id).set(JSON.parse(JSON.stringify(o)));
  }).catch(function(e){ console.warn("[받아쓰기] 시험지 저장 실패", e); });
}
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
  var o = prompt("🔑 지금 비밀번호"); if(o === null) return;
  var a = prompt("🔑 새 비밀번호 (숫자 4개)"); if(a === null) return;
  if(!/^\d{4,8}$/.test(a.trim())){ alert("숫자 4개로 해 주세요"); return; }
  var b = prompt("한 번 더 쳐 주세요"); if(b === null) return;
  if(a.trim() !== b.trim()){ alert("두 번 친 게 달라요"); return; }
  u.getIdToken().then(function(t){ return _kHelper({ action: "setPw", idToken: t, id: KC.uid, oldPw: o.trim(), newPw: a.trim() }); })
    .then(function(r){ if(r && r.ok) alert("✅ 비밀번호를 바꿨어요! 잊어버리지 마요"); else alert(/현재 비밀번호/.test((r && r.err) || "") ? "지금 비밀번호가 틀렸어요" : "못 바꿨어요: " + ((r && r.err) || "")); })
    .catch(function(e){ alert("못 바꿨어요: " + ((e && e.message) || e)); });
}
// 급 고르기 화면 위에 내 계정 버튼 (비번 바꾸기 · 로그아웃)
(function(){
  if(!_kOn()) return;
  var lv = $("vLevel"); if(!lv) return;
  var bar = document.createElement("div"); bar.className = "row"; bar.id = "kBar"; bar.style.marginBottom = "8px";
  bar.innerHTML = '<button class="b-dark" style="font-size:15px" onclick="kChangePw()">🔑 비밀번호 바꾸기</button><button class="b-dark" style="font-size:15px;background:#64748b" onclick="kOut();go(\'vName\')">🚪 로그아웃</button>';
  lv.insertBefore(bar, lv.firstChild);
})();

// ───────── 👀 관전: 지금 보는 화면·쓰는 답을 /kids/{uid}/live 로 (가문굴비 👦 아이들 탭에서 실시간으로 봄) ─────────
var KLIVE = { last: "", lastAt: 0, imgAt: 0, img: "", busy: false };
var KLIVE_NM = { vName: "들어가는 화면", vLevel: "급 고르는 중", vMode: "단계 고르는 중", vStudy: "1단계 전체 듣기", vType: "2단계 따라 치기", vPrac: "3단계 듣고 써 보기",
  vOpt: "시험 준비", vTest: "📝 4단계 시험 보는 중", vResult: "시험 결과", vMine: "내 기록 보는 중", vRanks: "계급표 보는 중", vBoard: "형제 계급 보는 중", vSet: "설정",
  vMath: "🔢 수학 고르는 중", vMMode: "🔢 수학 단계 고르는 중", vMStudy: "🔢 수학 공부", vMQuiz: "🔢 수학 문제 푸는 중", vMResult: "🔢 수학 결과" };
function _kLiveSnap(){
  var v = (typeof VIEWS !== "undefined" ? VIEWS : []).filter(function(id){ var e = $(id); return e && !e.classList.contains("hidden"); })[0] || "";
  var tx = function(id){ var e = $(id); return e ? String(e.textContent || "").trim().slice(0, 200) : ""; };
  var val = function(id){ var e = $(id); return e ? String(e.value || "") : ""; };
  var vis = function(id){ var e = $(id); return !!(e && !e.classList.contains("hidden") && e.offsetParent !== null); };
  var o = { v: v, nm: KLIVE_NM[v] || v, lv: (ME && typeof lvName === "function") ? (function(){ try { return lvName(); } catch(e){ return ""; } })() : "" }, pad = null;
  try {
    if(v === "vType" && KT){ o.n = KT.idx + 1; o.of = KT.qs.length; o.q = KT.qs[KT.idx]; o.a = val("kAns"); o.fb = tx("kFb"); if(vis("kPadBox")) pad = PADK; }
    else if(v === "vPrac" && PT){ o.n = PT.idx + 1; o.of = PT.qs.length; o.q = PT.qs[PT.idx]; o.a = val("pAns"); o.fb = tx("pFb"); if(vis("pPadBox")) pad = PADP; }
    else if(v === "vTest" && T){ o.n = T.idx + 1; o.of = T.qs.length; o.q = T.qs[T.idx]; o.where = T.where; o.heard = T.heard[T.idx]; o.max = T.max;
      if(T.where === "screen") o.a = val("tAns"); if(T.where === "hand") pad = PADT; o.fb = tx("tStatus"); }
    else if(v === "vResult") o.fb = tx("rScore");
    else if(v === "vMQuiz" && MQ){ o.q = tx("mqQ"); o.a = MQ.input || ""; o.fb = tx("mqFb"); o.info = tx("mqInfo"); }
    else if(v === "vMResult") o.fb = tx("mrScore");
  } catch(e){}
  return { o: o, pad: pad };
}
function _kLiveTick(force){
  if(!KC.uid || !KC.db || KLIVE.busy) return;
  if(document.hidden){ if(KLIVE.last !== "off"){ KLIVE.last = "off"; KC.db.ref("/kids/" + KC.uid + "/live").set({ off: true, ts: Date.now() }).catch(function(){}); } return; }
  var s = _kLiveSnap(), now = Date.now();
  var withImg = function(img){
    s.o.img = img || "";
    var key = JSON.stringify(s.o);
    if(!force && key === KLIVE.last && now - KLIVE.lastAt < 20000) return;   // 바뀐 게 없으면 20초에 한 번만 (살아 있다는 표시)
    KLIVE.last = key; KLIVE.lastAt = now; s.o.ts = now;
    KC.db.ref("/kids/" + KC.uid + "/live").set(s.o).catch(function(){});
  };
  if(s.pad && !s.pad.empty()){
    if(now - KLIVE.imgAt < 1500) return withImg(KLIVE.img);   // 손글씨 그림은 1.5초에 한 번만 새로
    KLIVE.busy = true; KLIVE.imgAt = now;
    _kShrink(s.pad.url()).then(function(u){ KLIVE.busy = false; KLIVE.img = u; withImg(u); }, function(){ KLIVE.busy = false; });
  } else { KLIVE.img = ""; withImg(""); }
}
setInterval(_kLiveTick, 1000);
document.addEventListener("visibilitychange", function(){ _kLiveTick(true); });
