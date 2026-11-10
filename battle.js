// ============================================================================
// ⚔️ 아이들 대결방 (2026-11-10) — dict-cloud.js 다음에 붙음
//   방장이 주제(수학·한자·영어·알파벳)와 놀이 방식을 골라 방을 만들면, 다른 아이가 들어와서 같이 풀기
//   ⚡ 스피드: 다 같이 풀고, 맞힌 사람 중 빠른 순서대로 3·2·1점
//   🔔 먼저 누르기: 🔔를 먼저 누른 사람만 보기에서 답 고르기 — 맞으면 +2, 틀리면 −1 (다음 사람 차례)
//   서버: /kids/_battle/{방} = { host, hostNm, ct, title, mode, n, qs:[{q,c:[4],k}], st:wait|play|end, cur, ph:q|rv, qt,
//                               p:{uid:{nm}}, a:{q0:{uid:{c,t}}}, bz:{q0:{uid:t}} }
//   방장 폰이 문제 넘기기(cur·ph)를 맡고, 점수는 모두가 a·bz 를 보고 똑같이 계산
// ============================================================================
var BT = { room: null, R: null, ref: null, lob: null, off: 0, tick: null, act: "", pick: { sub: "m", lv: "", mode: "speed", n: 10 } };
var BT_LIMIT = { speed: 15000, buzz: 25000 }, BT_RV = 3500;

function _btTS(){ return firebase.database.ServerValue.TIMESTAMP; }
function _btNow(){ return Date.now() + (BT.off || 0); }
function _btOk(){ return typeof KC !== "undefined" && KC.db && KC.uid; }
function _btBox(){
  var b = document.getElementById("btBox");
  if(!b){ b = document.createElement("div"); b.id = "btBox"; b.style.cssText = "position:fixed;inset:0;z-index:9000;background:#f0f9ff;overflow:auto;padding:14px 14px 40px"; document.body.appendChild(b); }
  b.style.display = "block"; return b;
}
var BT_B = function(bg, on, txt, extra){ return '<button onclick="' + on + '" style="background:' + bg + ';color:#fff;border:0;border-radius:12px;padding:12px 16px;font-size:18px;font-weight:900;' + (extra || "") + '">' + txt + '</button>'; };

// ── 들어가기 / 나가기 ──
function btOpen(){
  if(!_btOk()){ alert("⚔️ 대결은 로그인해야 할 수 있어요.\n이름이랑 비밀번호로 들어와 주세요!"); return; }
  KC.db.ref(".info/serverTimeOffset").once("value").then(function(s){ BT.off = s.val() || 0; }).catch(function(){});
  btLobby();
}
function btClose(){
  btLeave(true);
  if(BT.lob){ BT.lob.off(); BT.lob = null; }
  var b = document.getElementById("btBox"); if(b) b.style.display = "none";
}
function btLeave(quiet){
  clearInterval(BT.tick); BT.tick = null;
  if(BT.ref){ BT.ref.off(); }
  var R = BT.R, id = BT.room;
  if(id && R){
    if(R.host === KC.uid && R.st !== "end") KC.db.ref("/kids/_battle/" + id).remove().catch(function(){});
    else if(R.st === "wait") KC.db.ref("/kids/_battle/" + id + "/p/" + KC.uid).remove().catch(function(){});
  }
  BT.room = null; BT.R = null; BT.ref = null;
}

// ── 대기실 목록 ──
function btLobby(){
  btLeave(true);
  var b = _btBox();
  b.innerHTML = '<div style="max-width:620px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:24px">⚔️ 대결방</b>' + BT_B("#475569", "btClose()", "닫기") + '</div>'
    + '<div style="color:#475569;margin-bottom:10px">' + esc(KC.name) + ' — 방을 만들거나, 친구가 만든 방에 들어가요</div>'
    + BT_B("#15803d", "btMake()", "➕ 방 만들기 (내가 방장)", "width:100%;font-size:22px;padding:16px") + '<div id="btRooms" style="margin-top:14px">📡 방 찾는 중...</div></div>';
  if(BT.lob) BT.lob.off();
  BT.lob = KC.db.ref("/kids/_battle");
  BT.lob.on("value", function(s){
    var all = s.val() || {}, now = _btNow(), h = "";
    Object.keys(all).forEach(function(id){
      var R = all[id]; if(!R || !R.host) return;
      if(now - (R.ct || 0) > 3 * 3600000) return;   // 3시간 지난 방은 안 보임
      var ps = R.p || {}, n = Object.keys(ps).length, mine = !!ps[KC.uid];
      if(R.st !== "wait" && !mine) return;
      h += '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:2px solid ' + (mine ? "#f59e0b" : "#e2e8f0") + '"><div style="flex:1"><b style="font-size:19px">' + (R.mode === "buzz" ? "🔔 " : "⚡ ") + esc(R.title || "") + '</b><div style="color:#64748b;font-size:14px">👑 ' + esc(R.hostNm || "") + ' · ' + R.n + '문제 · 👦 ' + n + '명' + (R.st !== "wait" ? " · 하는 중" : "") + '</div></div>'
        + BT_B(mine ? "#b45309" : "#1d4ed8", "btJoin('" + id + "')", mine ? "다시 들어가기" : "들어가기") + '</div>';
    });
    var el = document.getElementById("btRooms"); if(el) el.innerHTML = h || '<div style="text-align:center;color:#94a3b8;padding:24px">아직 열린 방이 없어요. 방을 만들어 봐요!</div>';
  }, function(e){ var el = document.getElementById("btRooms"); if(el) el.innerHTML = '<div style="color:#b91c1c;padding:12px">대결방에 연결이 안 돼요 (' + esc(e && e.code || e) + ')</div>'; });
}

// ── 방 만들기: 주제 고르기 ──
function _btLvs(sub){
  if(sub === "m") return MATH.map(function(x){ return { id: x.id, t: x.t }; });
  if(sub === "h") return (WSL.han || []).map(function(x){ return { id: x.id, t: x.t }; });
  if(sub === "e") return (WSL.eng || []).map(function(x){ return { id: x.id, t: x.t }; });
  return ABC_LV.map(function(x){ return { id: x.id, t: x.t }; });
}
function btMake(){
  var P = BT.pick, b = _btBox(), L = _btLvs(P.sub);
  if(!L.some(function(x){ return x.id === P.lv; })) P.lv = L[0] ? L[0].id : "";
  var tab = function(k, t){ var on = P.sub === k; return '<button onclick="BT.pick.sub=\'' + k + '\';btMake()" style="flex:1;border:0;border-radius:10px;padding:10px 4px;font-size:17px;font-weight:900;background:' + (on ? "#1e3a8a" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#1e293b") + '">' + t + '</button>'; };
  var opt = function(key, v, t){ var on = P[key] === v; return '<button onclick="BT.pick.' + key + '=' + JSON.stringify(v).replace(/"/g, "'") + ';btMake()" style="flex:1;border:0;border-radius:10px;padding:10px 4px;font-size:16px;font-weight:900;background:' + (on ? "#7c3aed" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#1e293b") + '">' + t + '</button>'; };
  b.innerHTML = '<div style="max-width:620px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:22px">➕ 방 만들기</b>' + BT_B("#475569", "btLobby()", "◀ 뒤로") + '</div>'
    + '<div style="font-weight:900;margin:8px 0 6px">① 과목</div><div style="display:flex;gap:6px">' + tab("m", "🔢 수학") + tab("h", "🈶 한자") + tab("e", "🔤 영어") + tab("a", "🔤 ABC") + '</div>'
    + '<div style="font-weight:900;margin:14px 0 6px">② 주제</div><select id="btLv" onchange="BT.pick.lv=this.value" style="width:100%;font-size:18px;padding:10px;border-radius:10px">' + L.map(function(x){ return '<option value="' + esc(x.id) + '"' + (x.id === P.lv ? " selected" : "") + '>' + esc(x.t) + '</option>'; }).join("") + '</select>'
    + '<div style="font-weight:900;margin:14px 0 6px">③ 놀이 방식</div><div style="display:flex;gap:6px">' + opt("mode", "speed", "⚡ 스피드<br><small>다 같이 풀고 빠른 순서로 점수</small>") + opt("mode", "buzz", "🔔 먼저 누르기<br><small>먼저 누른 사람이 답하기</small>") + '</div>'
    + '<div style="font-weight:900;margin:14px 0 6px">④ 문제 수</div><div style="display:flex;gap:6px">' + [5, 10, 15, 20].map(function(n){ return opt("n", n, n + "문제"); }).join("") + '</div>'
    + BT_B("#15803d", "btCreate()", "✅ 방 열기", "width:100%;margin-top:18px;font-size:22px;padding:16px") + '</div>';
}

// ── 문제 만들기 (모두 4지선다, 방장이 만들어서 방에 저장 → 모두 같은 문제) ──
function _btPick3(right, pool, same){
  var out = [], seen = {}; seen[String(right)] = 1;
  shuffle(pool).forEach(function(v){ v = String(v); if(out.length < 3 && !seen[v] && !(same && same(v))){ seen[v] = 1; out.push(v); } });
  return out;
}
function _btQ(q, right, wrong){ var c = shuffle([String(right)].concat(wrong)); return { q: String(q), c: c, k: c.indexOf(String(right)) }; }
function btMakeQs(sub, lvId, n){
  var qs = [];
  if(sub === "m"){
    var x = mLv(lvId); if(!x) return [];
    var seen = {}, extra = [];
    for(var t = 0; t < 400 && qs.length < n; t++){
      var o = x.gen(); if(seen[o.q]) { extra.push(o.a); continue; } seen[o.q] = 1;
      var a = o.a, pool;
      if(/^-?\d+$/.test(String(a))){ a = Number(a); pool = [1, -1, 2, -2, 3, -3, 10, -10, 5, -5].map(function(d){ return a + d; }).filter(function(v){ return v >= 0; }); }
      else { pool = []; for(var u = 0; u < 30; u++) pool.push(x.gen().a); pool = pool.concat(extra); }
      var w = _btPick3(a, pool, function(v){ return typeof mEq === "function" && mEq(v, { a: a, eq: o.eq }); });
      if(w.length < 3) continue;
      qs.push(_btQ(o.q + " = ?", a, w));
    }
    return qs;
  }
  if(sub === "h" || sub === "e"){
    var lv = wsLv(lvId); if(!lv) return [];
    var grade = (WSL[sub === "h" ? "han" : "eng"] || []).filter(function(y){ return y.grade === lv.grade && !y.whole; }), gp = [];
    grade.forEach(function(y){ gp = gp.concat(y.items); });
    var items = shuffle(lv.items), i = 0;
    while(qs.length < n && items.length){ var it = items[i % items.length]; i++;
      var w2 = _btPick3(it.a, (lv.items.length >= 6 ? lv.items : gp).map(function(z){ return z.a; }));
      if(w2.length === 3) qs.push(_btQ(it.q, it.a, w2));
      if(i > n * 4) break;
    }
    return qs;
  }
  var A = ABC_LV.filter(function(y){ return y.id === lvId; })[0] || ABC_LV[0], letters = ABC.slice(A.from, A.to), j = 0;
  letters = shuffle(letters);
  while(qs.length < n && j < n * 4){ var r = letters[j % letters.length]; j++;
    if(A.only) qs.push(_btQ(r.L + "  — 소문자는?", r.l, _btPick3(r.l, ABC.map(function(z){ return z.l; }))));
    else qs.push(_btQ(r.L + " " + r.l + "  — 무슨 소리?", r.snd, _btPick3(r.snd, ABC.map(function(z){ return z.snd; }))));
  }
  return qs;
}
function btCreate(){
  var P = BT.pick, sel = document.getElementById("btLv"); if(sel) P.lv = sel.value;
  var qs = btMakeQs(P.sub, P.lv, P.n);
  if(qs.length < 3){ alert("이 주제로는 문제를 만들기 어려워요. 다른 주제를 골라 주세요."); return; }
  var lvT = (_btLvs(P.sub).filter(function(x){ return x.id === P.lv; })[0] || {}).t || "";
  var title = { m: "🔢 ", h: "🈶 ", e: "🔤 ", a: "🔤 ABC " }[P.sub] + lvT;
  var R = { host: KC.uid, hostNm: KC.name, ct: _btTS(), title: title, sub: P.sub, lv: P.lv, mode: P.mode, n: qs.length, qs: qs, st: "wait", cur: 0, ph: "q", qt: 0, p: {} };
  R.p[KC.uid] = { nm: KC.name };
  // 내가 예전에 만든 방은 정리
  KC.db.ref("/kids/_battle").once("value").then(function(s){ var all = s.val() || {}; Object.keys(all).forEach(function(id){ if(all[id] && all[id].host === KC.uid) KC.db.ref("/kids/_battle/" + id).remove().catch(function(){}); }); }).catch(function(){})
    .then(function(){ var r = KC.db.ref("/kids/_battle").push(); return r.set(R).then(function(){ btJoin(r.key, true); }); })
    .catch(function(e){ alert("방을 못 만들었어요 😢\n" + (e && e.message || e)); });
}

// ── 방 안 ──
function btJoin(id, mine){
  if(BT.lob){ BT.lob.off(); BT.lob = null; }
  var go2 = function(){
    BT.room = id; BT.ref = KC.db.ref("/kids/_battle/" + id); BT.act = "";
    BT.ref.on("value", function(s){
      var R = s.val();
      if(!R){ if(BT.room === id){ BT.room = null; BT.R = null; alert("방이 닫혔어요."); btLobby(); } return; }
      BT.R = R; btDraw();
    });
    clearInterval(BT.tick); BT.tick = setInterval(btTick, 250);
  };
  if(mine){ go2(); return; }
  KC.db.ref("/kids/_battle/" + id).once("value").then(function(s){
    var R = s.val(); if(!R){ alert("없어진 방이에요."); btLobby(); return; }
    if(R.p && R.p[KC.uid]){ go2(); return; }
    if(R.st !== "wait"){ alert("벌써 시작한 방이에요."); btLobby(); return; }
    if(Object.keys(R.p || {}).length >= 8){ alert("방이 꽉 찼어요 (8명)."); btLobby(); return; }
    return KC.db.ref("/kids/_battle/" + id + "/p/" + KC.uid).set({ nm: KC.name }).then(go2);
  }).catch(function(e){ alert("못 들어갔어요 😢\n" + (e && e.message || e)); btLobby(); });
}
function btStart(){
  var R = BT.R; if(!R || R.host !== KC.uid) return;
  if(Object.keys(R.p || {}).length < 2 && !confirm("혼자예요. 그래도 시작할까요?")) return;
  BT.ref.update({ st: "play", cur: 0, ph: "q", qt: _btTS(), a: null, bz: null });
}
function btAgain(){
  var R = BT.R; if(!R || R.host !== KC.uid) return;
  var qs = btMakeQs(R.sub, R.lv, R.n);
  BT.ref.update({ st: "wait", cur: 0, ph: "q", qt: 0, a: null, bz: null, qs: qs, saved: null });
}

// 문제 하나의 상태 (모두 똑같이 계산)
function _btState(R, i){
  var qk = "q" + i, A = (R.a || {})[qk] || {}, Z = (R.bz || {})[qk] || {}, k = R.qs[i].k, ps = Object.keys(R.p || {});
  var right = Object.keys(A).filter(function(u){ return A[u].c === k; }).sort(function(x, y){ return A[x].t - A[y].t; });
  var wrong = Object.keys(A).filter(function(u){ return A[u].c !== k; });
  var st = { A: A, Z: Z, k: k, right: right, wrong: wrong, holder: null, solved: false, allIn: false };
  if(R.mode === "buzz"){
    st.solved = right.length > 0;
    var order = Object.keys(Z).sort(function(x, y){ return Z[x] - Z[y]; });
    if(!st.solved) st.holder = order.filter(function(u){ return !A[u]; })[0] || null;
    st.allIn = st.solved || ps.every(function(u){ return A[u]; });
  } else st.allIn = ps.every(function(u){ return A[u]; });
  return st;
}
function btScores(R){
  var sc = {}; Object.keys(R.p || {}).forEach(function(u){ sc[u] = 0; });
  var last = R.st === "end" ? R.n - 1 : (R.ph === "rv" ? R.cur : R.cur - 1);
  for(var i = 0; i <= last && i < R.n; i++){
    var s = _btState(R, i);
    if(R.mode === "buzz"){ s.right.forEach(function(u){ sc[u] = (sc[u] || 0) + 2; }); s.wrong.forEach(function(u){ sc[u] = (sc[u] || 0) - 1; }); }
    else s.right.forEach(function(u, j){ sc[u] = (sc[u] || 0) + (j === 0 ? 3 : j === 1 ? 2 : 1); });
  }
  return sc;
}
// 방장이 문제 넘기기
function btTick(){
  var R = BT.R; if(!R) return;
  if(R.st === "play" && R.ph === "q" && R.qt){ var t = document.getElementById("btTime"); if(t){ var left = Math.max(0, Math.ceil((R.qt + BT_LIMIT[R.mode] - _btNow()) / 1000)); t.textContent = left; t.style.color = left <= 5 ? "#b91c1c" : "#1d4ed8"; } }
  if(R.host !== KC.uid || R.st !== "play" || !R.qt) return;
  var now = _btNow(), key = R.cur + R.ph;
  if(R.ph === "q"){
    var s = _btState(R, R.cur);
    if((s.allIn || now - R.qt > BT_LIMIT[R.mode]) && BT.act !== key){ BT.act = key; BT.ref.update({ ph: "rv", rt: _btTS() }); }
  } else if(R.ph === "rv" && R.rt && now - R.rt > BT_RV && BT.act !== key){
    BT.act = key;
    if(R.cur >= R.n - 1) BT.ref.update({ st: "end" });
    else BT.ref.update({ cur: R.cur + 1, ph: "q", qt: _btTS() });
  }
}
function btAns(c){
  var R = BT.R; if(!R || R.st !== "play" || R.ph !== "q") return;
  var s = _btState(R, R.cur);
  if(s.A[KC.uid]) return;
  if(R.mode === "buzz" && s.holder !== KC.uid) return;
  BT.ref.child("a/q" + R.cur + "/" + KC.uid).set({ c: c, t: _btTS() }).catch(function(){});
  if(typeof speak === "function"){ try { speechSynthesis.cancel(); } catch(e){} }
}
function btBuzz(){
  var R = BT.R; if(!R || R.st !== "play" || R.ph !== "q") return;
  var s = _btState(R, R.cur); if(s.Z[KC.uid] || s.A[KC.uid] || s.solved) return;
  BT.ref.child("bz/q" + R.cur + "/" + KC.uid).set(_btTS()).catch(function(){});
}

function btDraw(){
  var R = BT.R, b = _btBox(); if(!R) return;
  var ps = R.p || {}, uids = Object.keys(ps), me = KC.uid, host = R.host === me, sc = btScores(R);
  var nm = function(u){ return esc((ps[u] || {}).nm || "?"); };
  var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:19px">' + (R.mode === "buzz" ? "🔔 " : "⚡ ") + esc(R.title) + '</b>' + BT_B("#475569", "if(confirm('방에서 나갈까요?'" + (host ? "+'\\n(방장이 나가면 방이 닫혀요)'" : "") + ")) btLobby()", "나가기", "font-size:15px;padding:8px 12px") + '</div>';
  var board = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + uids.slice().sort(function(x, y){ return (sc[y] || 0) - (sc[x] || 0); }).map(function(u){ return '<div style="background:' + (u === me ? "#fef3c7" : "#fff") + ';border-radius:10px;padding:6px 10px;font-weight:800;border:1px solid #e2e8f0">' + (u === R.host ? "👑" : "👦") + ' ' + nm(u) + ' <span style="color:#1d4ed8">' + (sc[u] || 0) + '점</span></div>'; }).join("") + '</div>';
  var h = '<div style="max-width:620px;margin:0 auto">' + head;
  if(R.st === "wait"){
    h += '<div style="background:#fff;border-radius:14px;padding:14px;text-align:center"><div style="font-size:18px;color:#475569">' + R.n + '문제 · ' + (R.mode === "buzz" ? "🔔 먼저 누른 사람이 답하기 (맞으면 +2, 틀리면 −1)" : "⚡ 다 같이 풀기 (빨리 맞힌 순서로 3·2·1점)") + '</div>'
      + '<div style="font-size:20px;font-weight:900;margin:14px 0 6px">모인 친구 ' + uids.length + '명</div><div style="font-size:22px;line-height:1.7">' + uids.map(function(u){ return (u === R.host ? "👑 " : "👦 ") + nm(u); }).join("<br>") + '</div>'
      + (host ? BT_B("#15803d", "btStart()", "▶ 시작하기", "width:100%;margin-top:14px;font-size:24px;padding:16px") : '<div style="margin-top:14px;color:#64748b;font-size:18px">⏳ 방장(' + esc(R.hostNm) + ')이 시작하길 기다려요...</div>') + '</div>';
  } else if(R.st === "play"){
    var i = R.cur, Q = R.qs[i], s = _btState(R, i), mine = s.A[me], rv = R.ph === "rv";
    h += board + '<div style="display:flex;justify-content:space-between;color:#475569;font-weight:800"><span>' + (i + 1) + ' / ' + R.n + '번</span>' + (rv ? '' : '<span>⏱ <b id="btTime" style="font-size:22px">' + Math.ceil(BT_LIMIT[R.mode] / 1000) + '</b>초</span>') + '</div>';
    h += '<div style="background:#fff;border-radius:16px;padding:22px 10px;text-align:center;font-size:' + (Q.q.length > 12 ? 30 : 46) + 'px;font-weight:900;margin:8px 0 12px" class="' + (R.sub === "h" ? "hz" : "") + '">' + esc(Q.q) + '</div>';
    var canPick = !rv && !mine && (R.mode === "speed" || s.holder === me);
    if(R.mode === "buzz" && !rv){
      if(s.holder === me && !mine) h += '<div style="text-align:center;font-size:22px;font-weight:900;color:#b45309;margin-bottom:8px">🔔 내 차례! 답을 골라요</div>';
      else if(s.holder) h += '<div style="text-align:center;font-size:20px;font-weight:900;color:#7c3aed;margin-bottom:8px">🔔 ' + nm(s.holder) + ' 차례 — 답 고르는 중...</div>';
      if(!s.Z[me] && !mine && !s.solved) h += BT_B("#dc2626", "btBuzz()", "🔔 내가 알아요!", "width:100%;font-size:30px;padding:22px;margin-bottom:10px");
      else if(s.Z[me] && s.holder !== me && !mine) h += '<div style="text-align:center;color:#64748b;margin-bottom:8px">🔔 눌렀어요 — 앞사람이 틀리면 내 차례</div>';
    }
    if(R.mode === "speed" || rv || s.holder === me || mine){
      h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' + Q.c.map(function(c, j){
        var bg = "#1e3a8a";
        if(rv){ bg = j === Q.k ? "#15803d" : (mine && mine.c === j ? "#b91c1c" : "#94a3b8"); }
        else if(mine){ bg = mine.c === j ? "#f59e0b" : "#cbd5e1"; }
        else if(!canPick) bg = "#94a3b8";
        return '<button ' + (canPick ? 'onclick="btAns(' + j + ')"' : "disabled") + ' style="border:0;border-radius:14px;padding:18px 6px;font-size:' + (c.length > 8 ? 18 : 24) + 'px;font-weight:900;color:#fff;background:' + bg + '">' + esc(c) + '</button>';
      }).join("") + '</div>';
    }
    if(!rv && mine && R.mode === "speed") h += '<div style="text-align:center;margin-top:10px;color:#64748b;font-size:17px">✋ 골랐어요! 친구들 기다리는 중... (' + Object.keys(s.A).length + '/' + uids.length + ')</div>';
    if(rv){
      var line = function(u){ var a = s.A[u], ok = a && a.c === s.k, sec = a ? ((a.t - R.qt) / 1000).toFixed(1) + "초" : "안 풀었어요"; return '<div style="padding:4px 0;font-size:18px">' + (ok ? "⭕" : a ? "❌" : "⏰") + ' <b>' + nm(u) + '</b> <span style="color:#64748b">' + sec + '</span></div>'; };
      var ord = s.right.concat(uids.filter(function(u){ return s.right.indexOf(u) < 0; }));
      h += '<div style="background:#fff;border-radius:14px;padding:12px;margin-top:12px"><div style="font-weight:900;font-size:20px;margin-bottom:4px">' + (s.right.length ? "🥇 제일 빨리 맞힌 사람: " + nm(s.right[0]) : "😮 아무도 못 맞혔어요") + '</div>' + ord.filter(function(u){ return R.mode === "speed" || s.A[u]; }).map(line).join("") + '<div style="color:#94a3b8;margin-top:4px">곧 다음 문제!</div></div>';
    }
  } else {   // 끝
    var rank = uids.slice().sort(function(x, y){ return (sc[y] || 0) - (sc[x] || 0); }), medal = ["🥇", "🥈", "🥉"];
    h += '<div style="background:#fff;border-radius:16px;padding:16px;text-align:center"><div style="font-size:30px;font-weight:900">🏁 끝!</div><div style="font-size:24px;margin:8px 0">' + (rank.length ? "👑 " + nm(rank[0]) + " 우승!" : "") + '</div>'
      + rank.map(function(u, j){ var same = j > 0 && sc[u] === sc[rank[j - 1]]; return '<div style="font-size:22px;padding:6px;font-weight:' + (u === me ? 900 : 600) + ';background:' + (u === me ? "#fef3c7" : "none") + ';border-radius:10px">' + (medal[j] || (j + 1) + "등") + ' ' + nm(u) + ' — ' + (sc[u] || 0) + '점' + (same ? " (같은 점수)" : "") + '</div>'; }).join("") + '</div>';
    h += '<div style="display:flex;gap:8px;margin-top:12px">' + (host ? BT_B("#15803d", "btAgain()", "🔁 한 판 더", "flex:1") : "") + BT_B("#1d4ed8", "btLobby()", "🚪 대결방 목록", "flex:1") + '</div>';
    btReward(R, sc, rank);
  }
  b.innerHTML = h + '</div>';
}
// 끝나면 경험치 — 한 판에 한 번 (맞힌 점수 + 1등 보너스), 하루 상한은 gainXp 가 막음
function btReward(R, sc, rank){
  var id = BT.room + "|" + (R.qt || R.ct);
  if(!ME || BT.paid === id || !(KC.uid in sc)) return;
  BT.paid = id;
  var my = Math.max(0, sc[KC.uid] || 0), win = rank[0] === KC.uid && rank.length > 1 && sc[rank[0]] > (sc[rank[1]] || 0);
  var got = gainXp(Math.max(1, my) + (win ? 10 : 0), win ? "⚔️ 대결 우승!" : "⚔️ 대결", "battle");
  if(got) setTimeout(function(){ try { if(typeof kPush === "function") kPush(); } catch(e){} }, 500);
}

// 과목 단추줄에 ⚔️ 대결 단추
var BT_BTN = '<button class="btBtn" style="font-size:19px;background:#dc2626" onclick="btOpen()">⚔️ 대결</button>';
(function(){
  ["vLevel", "vMath"].forEach(function(v){ var row = document.querySelector("#" + v + " .card .row"); if(row && !row.querySelector(".btBtn")) row.insertAdjacentHTML("beforeend", BT_BTN); });
})();
var _goBt0 = go;
go = function(id){
  _goBt0(id);
  if(id === "vWs"){ var r = document.getElementById("wsSubRow"); if(r && !r.querySelector(".btBtn")) r.insertAdjacentHTML("beforeend", BT_BTN); }
  if(id === "vAbc"){ var a = document.querySelector("#vAbc .row"); if(a && !a.querySelector(".btBtn")) a.insertAdjacentHTML("beforeend", BT_BTN); }
};
