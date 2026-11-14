// ============================================================================
// ⚔️ 아이들 대결방 (2026-11-10) — dict-cloud.js 다음에 붙음
//   방장이 주제(수학·한자·영어·알파벳)와 놀이 방식을 골라 방을 만들면, 다른 아이가 들어와서 같이 풀기
//   ⚡ 스피드: 다 같이 풀고, 맞힌 사람 중 빠른 순서대로 3·2·1점
//   🔔 먼저 누르기: 🔔를 먼저 누른 사람만 보기에서 답 고르기 — 맞으면 +2, 틀리면 −1 (다음 사람 차례)
//   서버: /kids/_battle/{방} = { host, hostNm, ct, title, mode, n, qs:[{q,c:[4],k}], st:wait|play|end, cur, ph:q|rv, qt,
//                               p:{uid:{nm}}, a:{q0:{uid:{c,t}}}, bz:{q0:{uid:t}} }
//   방장 폰이 문제 넘기기(cur·ph)를 맡고, 점수는 모두가 a·bz 를 보고 똑같이 계산
// ============================================================================
var BT = { said: "", sayN: 0, room: null, R: null, ref: null, lob: null, off: 0, tick: null, act: "", pick: { sub: "m", lv: "", mode: "speed", n: 10, how: "mix" } };
var BT_LIMIT = { speed: 15000, buzz: 25000 }, BT_RV = 3500;
function _btLim(R){ var Q = R && R.qs && R.qs[R.cur]; return (Q && Q.lim ? Q.lim + (R.mode === "buzz" ? 8000 : 0) : BT_LIMIT[R.mode]); }

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
  if(id && R && !BT.watch){
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
      var watchB = BT_B("#0f766e", "btWatch('" + id + "')", "👀 관전");
      h += '<div style="background:#fff;border-radius:14px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;border:2px solid ' + (mine ? "#f59e0b" : "#e2e8f0") + '"><div style="flex:1"><b style="font-size:19px">' + (R.mode === "buzz" ? "🔔 " : "⚡ ") + esc(R.title || "") + '</b><div style="color:#64748b;font-size:14px">👑 ' + esc(R.hostNm || "") + ' · ' + R.n + '문제 · 👦 ' + n + '명' + (R.st !== "wait" ? " · 하는 중" : "") + '</div></div>'
        + '<div style="display:flex;flex-direction:column;gap:6px">' + (R.st === "wait" || mine ? BT_B(mine ? "#b45309" : "#1d4ed8", "btJoin('" + id + "')", mine ? "다시 들어가기" : "들어가기") : "") + (mine ? "" : watchB) + '</div></div>';
    });
    var el = document.getElementById("btRooms"); if(el) el.innerHTML = h || '<div style="text-align:center;color:#94a3b8;padding:24px">아직 열린 방이 없어요. 방을 만들어 봐요!</div>';
  }, function(e){ var el = document.getElementById("btRooms"); if(el) el.innerHTML = '<div style="color:#b91c1c;padding:12px">대결방에 연결이 안 돼요 (' + esc(e && e.code || e) + ')</div>'; });
}

// ── 방 만들기: 주제 고르기 ──
function _btLvs(sub){
  if(sub === "m") return MATH.map(function(x){ return { id: x.id, t: x.t }; });
  if(sub === "h") return (WSL.han || []).map(function(x){ return { id: x.id, t: x.t }; });
  if(sub === "e") return (WSL.eng || []).map(function(x){ return { id: x.id, t: x.t }; });
  if(sub === "g") return BT_GAMES;
  return ABC_LV.map(function(x){ return { id: x.id, t: x.t }; });
}
function btMake(){
  var P = BT.pick, b = _btBox(), L = _btLvs(P.sub);
  if(!L.some(function(x){ return x.id === P.lv; })) P.lv = L[0] ? L[0].id : "";
  var tab = function(k, t){ var on = P.sub === k; return '<button onclick="BT.pick.sub=\'' + k + '\';btMake()" style="flex:1;border:0;border-radius:10px;padding:10px 4px;font-size:17px;font-weight:900;background:' + (on ? "#1e3a8a" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#1e293b") + '">' + t + '</button>'; };
  var opt = function(key, v, t){ var on = P[key] === v; return '<button onclick="BT.pick.' + key + '=' + JSON.stringify(v).replace(/"/g, "'") + ';btMake()" style="flex:1;border:0;border-radius:10px;padding:10px 4px;font-size:16px;font-weight:900;background:' + (on ? "#7c3aed" : "#e2e8f0") + ';color:' + (on ? "#fff" : "#1e293b") + '">' + t + '</button>'; };
  b.innerHTML = '<div style="max-width:620px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:22px">➕ 방 만들기</b>' + BT_B("#475569", "btLobby()", "◀ 뒤로") + '</div>'
    + '<div style="font-weight:900;margin:8px 0 6px">① 과목</div><div style="display:flex;gap:6px">' + tab("m", "🔢 수학") + tab("h", "🈶 한자") + tab("e", "🔤 영어") + tab("a", "🔤 ABC") + tab("g", "🎮 게임") + '</div>'
    + '<div style="font-weight:900;margin:14px 0 6px">② 주제</div><select id="btLv" onchange="BT.pick.lv=this.value" style="width:100%;font-size:18px;padding:10px;border-radius:10px">' + L.map(function(x){ return '<option value="' + esc(x.id) + '"' + (x.id === P.lv ? " selected" : "") + '>' + esc(x.t) + '</option>'; }).join("") + '</select>'
    + (P.sub === "a" ? '<div style="font-weight:900;margin:14px 0 6px">🔊 문제 내는 법</div><div style="display:flex;gap:6px">' + opt("how", "mix", "🔀 섞어서<br><small>아래 셋이 골고루</small>") + opt("how", "listen", "🔊 듣고 고르기<br><small>소리 듣고 글자 찾기</small>") + '</div><div style="display:flex;gap:6px;margin-top:6px">' + opt("how", "type", "✍️ 듣고 쓰기<br><small>들은 글자를 직접 쳐요</small>") + opt("how", "see", "👀 보고 고르기<br><small>소문자·소리 찾기</small>") + '</div>' : '')
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
function btMakeQs(sub, lvId, n, how){
  var qs = [];
  if(sub === "g") return btGameQs(lvId, n);
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
      if(w2.length === 3){ var Q2 = _btQ(it.q, it.a, w2); if(sub === "e"){ var en = /[A-Za-z]/.test(it.q) ? it.q : /[A-Za-z]/.test(it.a) ? it.a : ""; if(en){ Q2.say = [{ t: en, en: 1 }]; Q2.rs = [{ t: en, en: 1 }]; } } qs.push(Q2); }
      if(i > n * 4) break;
    }
    return qs;
  }
  var A = ABC_LV.filter(function(y){ return y.id === lvId; })[0] || ABC_LV[0], letters = ABC.slice(A.from, A.to), j = 0;
  letters = shuffle(letters);
  var Ln = function(z){ return z.L + " " + z.l; }, Q, kinds = ["pick", "type", "see"], k0 = Math.floor(Math.random() * 3);
  while(qs.length < n && j < n * 4){ var r = letters[j % letters.length]; j++;
    var kd = how === "mix" ? kinds[(j + k0) % 3] : how === "type" ? "type" : how === "listen" ? "pick" : "see";
    if(kd === "type"){
      // ✍️ 듣고 쓰기 — 소리만 듣고 그 글자를 직접 쳐서 냄 (대·소문자 아무거나, 소리가 같은 글자도 정답)
      var bySnd = !A.only && j % 2 === 0;
      Q = { q: bySnd ? "✍️ 이 소리 나는 글자를 써요" : "✍️ 들리는 글자를 써요", c: [r.L + " " + r.l], k: 0, ty: 1,
        ok: bySnd ? ABC.filter(function(z){ return z.snd === r.snd; }).map(function(z){ return z.l; }) : [r.l] };
      Q.say = bySnd ? [{ t: r.snd + " 소리" }] : [{ t: r.L, en: 1 }];
      Q.rs = bySnd ? [{ t: r.L, en: 1 }, { t: r.snd + " 소리" }, { t: r.ex, en: 1 }] : [{ t: r.L, en: 1 }, { t: r.nm }];
    } else if(kd === "pick"){
      // 🔊 듣고 고르기 — 글자는 안 보여 주고 소리만 → 들리는 글자를 고르기 (읽을 줄 알아야 맞힘)
      if(A.only || j % 2){ Q = _btQ("🔊 이 글자는?", Ln(r), _btPick3(Ln(r), ABC.map(Ln))); Q.say = [{ t: r.L, en: 1 }]; Q.rs = [{ t: r.L, en: 1 }, { t: r.nm }]; }
      else { Q = _btQ("🔊 이 소리 나는 글자는?", Ln(r), _btPick3(Ln(r), ABC.filter(function(z){ return z.snd !== r.snd; }).map(Ln))); Q.say = [{ t: r.snd + " 소리" }]; Q.rs = [{ t: r.L, en: 1 }, { t: r.snd + " 소리" }, { t: r.ex, en: 1 }]; }
    } else if(A.only || (how === "mix" && j % 2)){ Q = _btQ(r.L + "  — 소문자는?", r.l, _btPick3(r.l, ABC.map(function(z){ return z.l; }))); Q.rs = [{ t: r.L, en: 1 }, { t: r.nm }]; }
    else { Q = _btQ(r.L + " " + r.l + "  — 무슨 소리?", r.snd, _btPick3(r.snd, ABC.map(function(z){ return z.snd; }))); Q.rs = [{ t: r.L, en: 1 }, { t: r.snd + " 소리" }, { t: r.ex, en: 1 }]; }
    qs.push(Q);
  }
  return qs;
}
function btCreate(){
  var P = BT.pick, sel = document.getElementById("btLv"); if(sel) P.lv = sel.value;
  var qs = btMakeQs(P.sub, P.lv, P.n, P.sub === "a" ? P.how : "");
  if(qs.length < 3){ alert("이 주제로는 문제를 만들기 어려워요. 다른 주제를 골라 주세요."); return; }
  var lvT = (_btLvs(P.sub).filter(function(x){ return x.id === P.lv; })[0] || {}).t || "";
  var title = { m: "🔢 ", h: "🈶 ", e: "🔤 ", a: "🔤 ABC ", g: "🎮 " }[P.sub] + lvT + (P.sub === "a" ? ({ listen: " · 🔊 듣고 고르기", type: " · ✍️ 듣고 쓰기", mix: " · 🔀 섞어서" }[P.how] || "") : "");
  var R = { host: KC.uid, hostNm: KC.name, ct: _btTS(), title: title, sub: P.sub, lv: P.lv, how: P.sub === "a" ? (P.how || "mix") : "", mode: P.mode, n: qs.length, qs: qs, st: "wait", cur: 0, ph: "q", qt: 0, p: {} };
  R.p[KC.uid] = { nm: KC.name };
  // 내가 예전에 만든 방은 정리
  KC.db.ref("/kids/_battle").once("value").then(function(s){ var all = s.val() || {}; Object.keys(all).forEach(function(id){ if(all[id] && all[id].host === KC.uid) KC.db.ref("/kids/_battle/" + id).remove().catch(function(){}); }); }).catch(function(){})
    .then(function(){ var r = KC.db.ref("/kids/_battle").push(); return r.set(R).then(function(){ btJoin(r.key, true); }); })
    .catch(function(e){ alert("방을 못 만들었어요 😢\n" + (e && e.message || e)); });
}

// ── 방 안 ──
function btWatch(id){ btJoin(id, true, true); }
function btJoin(id, mine, watch){
  if(BT.lob){ BT.lob.off(); BT.lob = null; }
  BT.watch = !!watch;
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
  var qs = btMakeQs(R.sub, R.lv, R.n, R.how || "");
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
  if(R.st === "play" && R.ph === "q" && R.qt){ var t = document.getElementById("btTime"); if(t){ var left = Math.max(0, Math.ceil((R.qt + _btLim(R) - _btNow()) / 1000)); t.textContent = left; t.style.color = left <= 5 ? "#b91c1c" : "#1d4ed8"; } }
  if(R.st === "play" && R.ph === "q" && R.qt){ var Qm = R.qs[R.cur]; if(Qm && Qm.show){ var ph = (_btNow() - R.qt < Qm.show) ? "see" : "hide", pk = R.cur + "|" + R.qt + "|" + ph; if(BT.memK !== pk){ BT.memK = pk; btDraw(); } } }
  if(R.host !== KC.uid || R.st !== "play" || !R.qt) return;
  var now = _btNow(), key = R.cur + R.ph;
  if(R.ph === "q"){
    var s = _btState(R, R.cur);
    if((s.allIn || now - R.qt > _btLim(R)) && BT.act !== key){ BT.act = key; BT.ref.update({ ph: "rv", rt: _btTS() }); }
  } else if(R.ph === "rv" && R.rt && now - R.rt > ((R.qs[R.cur] || {}).rs ? 5500 : BT_RV) && BT.act !== key){   // 정답 읽어 주는 문제는 조금 더 길게
    BT.act = key;
    if(R.cur >= R.n - 1) BT.ref.update({ st: "end" });
    else BT.ref.update({ cur: R.cur + 1, ph: "q", qt: _btTS() });
  }
}
function btAns(c){
  var R = BT.R; if(BT.watch || !R || R.st !== "play" || R.ph !== "q") return;
  var s = _btState(R, R.cur);
  if(s.A[KC.uid]) return;
  if(R.mode === "buzz" && s.holder !== KC.uid) return;
  BT.ref.child("a/q" + R.cur + "/" + KC.uid).set({ c: c, t: _btTS(), s: Math.max(0, Math.round((_btNow() - (R.qt || _btNow())) / 100) / 10) }).catch(function(){});
  if(typeof speak === "function"){ try { speechSynthesis.cancel(); } catch(e){} }
}
function btAnsT(){
  var R = BT.R; if(BT.watch || !R || R.st !== "play" || R.ph !== "q") return;
  var Q = R.qs[R.cur], s = _btState(R, R.cur); if(!Q || !Q.ty || s.A[KC.uid]) return;
  if(R.mode === "buzz" && s.holder !== KC.uid) return;
  var el = document.getElementById("btTy"), v = el ? String(el.value).trim() : ""; if(!v){ if(el) el.focus(); return; }
  var nv = v.toLowerCase().replace(/\s+/g, ""), ok = (Q.ok || [String(Q.c[0]).toLowerCase()]).some(function(x){ return String(x).toLowerCase().replace(/\s+/g, "") === nv; });
  BT.ref.child("a/q" + R.cur + "/" + KC.uid).set({ c: ok ? Q.k : -1, v: v.slice(0, 20), t: _btTS(), s: Math.max(0, Math.round((_btNow() - (R.qt || _btNow())) / 100) / 10) }).catch(function(){});
  try { speechSynthesis.cancel(); } catch(e){}
}
function btBuzz(){
  var R = BT.R; if(!R || R.st !== "play" || R.ph !== "q") return;
  var s = _btState(R, R.cur); if(BT.watch || s.Z[KC.uid] || s.A[KC.uid] || s.solved) return;
  BT.ref.child("bz/q" + R.cur + "/" + KC.uid).set(_btTS()).catch(function(){});
}

function btDraw(){
  var R = BT.R, b = _btBox(); if(!R) return;
  var ps = R.p || {}, uids = Object.keys(ps), me = KC.uid, host = R.host === me, sc = btScores(R);
  var nm = function(u){ return esc((ps[u] || {}).nm || "?"); };
  var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:19px">' + (R.mode === "buzz" ? "🔔 " : "⚡ ") + esc(R.title) + '</b>' + BT_B("#475569", "if(confirm('방에서 나갈까요?'" + (host ? "+'\\n(방장이 나가면 방이 닫혀요)'" : "") + ")) btLobby()", "나가기", "font-size:15px;padding:8px 12px") + '</div>';
  var board = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">' + uids.slice().sort(function(x, y){ return (sc[y] || 0) - (sc[x] || 0); }).map(function(u){ return '<div style="background:' + (u === me ? "#fef3c7" : "#fff") + ';border-radius:10px;padding:6px 10px;font-weight:800;border:1px solid #e2e8f0">' + (u === R.host ? "👑" : "👦") + ' ' + nm(u) + ' <span style="color:#1d4ed8">' + (sc[u] || 0) + '점</span></div>'; }).join("") + '</div>';
  var h = '<div style="max-width:620px;margin:0 auto">' + head + (BT.watch ? '<div style="background:#0f766e;color:#fff;border-radius:10px;padding:6px 10px;margin-bottom:8px;font-weight:800;text-align:center">👀 관전 중 — 보기만 해요 (점수엔 안 들어가요)</div>' : '');
  if(R.st === "wait"){
    h += '<div style="background:#fff;border-radius:14px;padding:14px;text-align:center"><div style="font-size:18px;color:#475569">' + R.n + '문제 · ' + (R.mode === "buzz" ? "🔔 먼저 누른 사람이 답하기 (맞으면 +2, 틀리면 −1)" : "⚡ 다 같이 풀기 (빨리 맞힌 순서로 3·2·1점)") + '</div>'
      + '<div style="font-size:20px;font-weight:900;margin:14px 0 6px">모인 친구 ' + uids.length + '명</div><div style="font-size:22px;line-height:1.7">' + uids.map(function(u){ return (u === R.host ? "👑 " : "👦 ") + nm(u); }).join("<br>") + '</div>'
      + (host ? BT_B("#15803d", "btStart()", "▶ 시작하기", "width:100%;margin-top:14px;font-size:24px;padding:16px") : '<div style="margin-top:14px;color:#64748b;font-size:18px">⏳ 방장(' + esc(R.hostNm) + ')이 시작하길 기다려요...</div>') + '</div>';
  } else if(R.st === "play"){
    var i = R.cur, Q = R.qs[i], s = _btState(R, i), mine = s.A[me], rv = R.ph === "rv";
    h += board + '<div style="display:flex;justify-content:space-between;color:#475569;font-weight:800"><span>' + (i + 1) + ' / ' + R.n + '번</span>' + (rv ? '' : '<span>⏱ <b id="btTime" style="font-size:22px">' + Math.ceil(_btLim(R) / 1000) + '</b>초</span>') + '</div>';
    h += '<div style="background:#fff;border-radius:16px;padding:22px 10px;text-align:center;font-size:' + (Q.q.length > 12 ? 30 : 46) + 'px;font-weight:900;margin:8px 0 12px' + (Q.col ? ';color:' + Q.col + ';font-size:64px' : '') + '" class="' + (R.sub === "h" ? "hz" : "") + '">' + (Q.top ? '<div style="font-size:18px;color:#475569;margin-bottom:4px">' + esc(Q.top) + '</div>' : '') + (Q.pic ? '<div style="font-size:34px;line-height:1.35;letter-spacing:2px;margin-bottom:8px;word-break:break-all">' + esc(Q.pic) + '</div>' : '') + esc(Q.q) + (Q.say && !rv ? '<div><button onclick="btSay(true)" style="margin-top:10px;border:0;border-radius:12px;padding:10px 18px;font-size:20px;font-weight:900;background:#0f766e;color:#fff">🔊 다시 듣기</button></div>' : '') + '</div>';
    var canPick = !BT.watch && !rv && !mine && (R.mode === "speed" || s.holder === me);
    if(R.mode === "buzz" && !rv){
      if(s.holder === me && !mine) h += '<div style="text-align:center;font-size:22px;font-weight:900;color:#b45309;margin-bottom:8px">🔔 내 차례! 답을 골라요</div>';
      else if(s.holder) h += '<div style="text-align:center;font-size:20px;font-weight:900;color:#7c3aed;margin-bottom:8px">🔔 ' + nm(s.holder) + ' 차례 — 답 고르는 중...</div>';
      if(!BT.watch && !s.Z[me] && !mine && !s.solved) h += BT_B("#dc2626", "btBuzz()", "🔔 내가 알아요!", "width:100%;font-size:30px;padding:22px;margin-bottom:10px");
      else if(s.Z[me] && s.holder !== me && !mine) h += '<div style="text-align:center;color:#64748b;margin-bottom:8px">🔔 눌렀어요 — 앞사람이 틀리면 내 차례</div>';
    }
    if(Q.g){ h += _btGameHtml(R, Q, s, mine, rv, canPick); }
    else if(Q.ty){
      // ✍️ 쓰기 문제: 입력칸 / 낸 답 / 정답 공개 때 모두의 답
      if(canPick) h += '<div style="display:flex;gap:8px"><input id="btTy" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="10" placeholder="여기에 써요" onkeydown="if(event.key===\'Enter\'){event.preventDefault();btAnsT();}" style="flex:1;min-width:0;font-size:34px;padding:12px;border-radius:14px;border:3px solid #1e3a8a;text-align:center;font-weight:900"><button onclick="btAnsT()" style="border:0;border-radius:14px;padding:12px 18px;font-size:22px;font-weight:900;color:#fff;background:#15803d">✅ 내기</button></div>';
      else if(mine && !rv) h += '<div style="text-align:center;font-size:24px;font-weight:900;color:#b45309">✍️ 낸 답: ' + esc(mine.v || "") + '</div>';
      if(rv) h += '<div style="text-align:center;font-size:30px;font-weight:900;color:#15803d;background:#dcfce7;border-radius:14px;padding:10px">정답: ' + esc(Q.c[0]) + '</div>'
        + uids.filter(function(u){ return s.A[u]; }).map(function(u){ var a = s.A[u]; return '<div style="text-align:center;font-size:18px">' + (a.c === Q.k ? "⭕" : "❌") + ' ' + nm(u) + ': <b>' + esc(a.v || "") + '</b></div>'; }).join("");
    } else if(R.mode === "speed" || rv || s.holder === me || mine){
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
  var ty0 = document.getElementById("btTy"), keep = ty0 ? ty0.value : "", foc = ty0 && document.activeElement === ty0, qid = R.cur + "|" + R.qt;
  b.innerHTML = h + '</div>';
  var ty1 = document.getElementById("btTy");   // 다른 친구가 답해서 화면이 다시 그려져도 쓰던 글자는 그대로
  if(ty1){ if(BT.tyQ === qid) ty1.value = keep; BT.tyQ = qid; if(foc || !keep) try { ty1.focus(); } catch(e){} }
  if(R.st === "play") btSay(false);
}
// 🔊 문제가 나오면 읽어 주고(say), 정답 공개 때 정답을 읽어 줌(rs) — 한 번씩만
function btSay(again){
  var R = BT.R; if(!R || R.st !== "play" || !R.qs) return;
  var Q = R.qs[R.cur]; if(!Q) return;
  var L = R.ph === "rv" ? Q.rs : Q.say, key = BT.room + "|" + R.cur + "|" + R.ph + "|" + R.qt;
  if(!L || !L.length || (!again && BT.said === key)) return;
  BT.said = key;
  try { if(synth) synth.cancel(); } catch(e){}
  var my = ++BT.sayN;
  L.reduce(function(p, x){ return p.then(function(){ if(my !== BT.sayN) return; return (x.en && typeof speakEn === "function" ? speakEn(x.t, 0.75) : speak(x.t, 0.9)).then(function(){ return wait(200); }); }); }, wait(150));
}
// 끝나면 경험치 — 한 판에 한 번 (맞힌 점수 + 1등 보너스), 하루 상한은 gainXp 가 막음
function btReward(R, sc, rank){
  var id = BT.room + "|" + (R.qt || R.ct);
  if(!ME || BT.paid === id || !(KC.uid in sc)) return;
  BT.paid = id;
  var my = Math.max(0, sc[KC.uid] || 0), win = rank[0] === KC.uid && rank.length > 1 && sc[rank[0]] > (sc[rank[1]] || 0);
  var got = gainXp(Math.max(1, my) + (win ? 10 : 0), win ? "⚔️ 대결 우승!" : "⚔️ 대결", "battle");
  if(got) setTimeout(function(){ try { if(typeof kPush === "function") kPush(); } catch(e){} }, 500);
  // 📜 대결 기록 남기기 — /kids/{uid}/bt (가문굴비 👦 아이들 › ⚔️ 대결 기록에서 봄) + 공부한 일
  try {
    var me = KC.uid, ps = R.p || {}, nm = function(u){ return (ps[u] || {}).nm || "?"; }, okN = 0;
    var qs = (R.qs || []).slice(0, R.n).map(function(q, i){ var a = ((R.a || {})["q" + i] || {})[me], o = a && a.c === q.k ? 1 : 0; okN += o; var all = (R.a || {})["q" + i] || {}, us = Object.keys(all).sort(function(x, y){ return (all[x].t || 0) - (all[y].t || 0); });
      var w = us.map(function(u){ var b = all[u]; return { nm: nm(u), m: b.v != null ? b.v : (q.c[b.c] || ""), o: b.c === q.k ? 1 : 0, s: b.s != null ? b.s : (b.t && R.qt && i === R.cur ? Math.round((b.t - R.qt) / 100) / 10 : "") }; });
      Object.keys(ps).forEach(function(u){ if(!all[u]) w.push({ nm: nm(u), m: "", o: 0, s: "" }); });
      return { q: q.q + (q.say ? " (" + q.say.map(function(x){ return x.t; }).join(" ") + ")" : ""), a: q.c[q.k], m: a ? (a.v != null ? a.v : (q.c[a.c] || "")) : "", o: o, w: w }; });
    var j = rank.indexOf(me), rec = { t: new Date().toISOString(), title: R.title || "", mode: R.mode, n: R.n, rank: j + 1, of: rank.length, sc: sc[me] || 0, ok: okN, win: win ? 1 : 0,
      pl: rank.map(function(u){ return { nm: nm(u), sc: sc[u] || 0 }; }), qs: qs };
    KC.db.ref("/kids/" + me + "/bt").push(JSON.parse(JSON.stringify(rec))).catch(function(){});
    if(typeof kLog === "function") kLog("battle", "⚔️ 대결 " + (R.title || "") + " — " + (j + 1) + "등 / " + rank.length + "명 · " + (sc[me] || 0) + "점 · " + okN + "/" + R.n + " 맞힘" + (rank.length > 1 ? " (함께: " + rank.filter(function(u){ return u !== me; }).map(nm).join(", ") + ")" : ""));
  } catch(e){ console.warn("[대결] 기록 저장 실패", e); }
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


// ───────── 🎮 게임 대결 — 틀린그림찾기 · 다른 하나 찾기 · 같은 그림 기억하기 · 개수 세기 · 색깔 맞추기 ─────────
//   모두 「누른 칸 번호 = 답」이라 기존 대결 규칙(빨리 맞힌 순서·먼저 누르기·관전·기록)을 그대로 씀
var BT_GAMES = [
  { id: "mix", t: "🔀 섞어서 (게임 골고루)" }, { id: "diff", t: "🔍 틀린그림찾기" }, { id: "odd", t: "👀 다른 하나 찾기" },
  { id: "mem", t: "🧠 같은 그림 기억하기" }, { id: "cnt", t: "🔢 몇 개일까? (개수 세기)" }, { id: "col", t: "🎨 글자 색깔 맞추기" }
];
var BT_EMO = ["🐶","🐱","🐭","🐰","🦊","🐻","🐼","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐤","🦄","🐝","🐞","🦋","🐢","🐙","🐬","🐳","🍎","🍌","🍇","🍓","🍒","🍑","🍉","🍋","🥕","🌽","🍕","🍔","🍩","🍪","🍦","⚽","🏀","🎈","🎁","⭐","🌙","☀️","🌈","🌸","🚗","🚌","🚀","✈️","⛵","🏠","🎸","🔔"];
var BT_ODD = [["🍎","🍅"],["🐻","🐨"],["⚽","🏀"],["🐟","🐠"],["🍊","🍑"],["🐮","🐷"],["🚗","🚕"],["⭐","🌟"],["🐸","🐢"],["🍪","🍩"],["🐶","🐺"],["🐔","🐤"],["🌸","🌺"],["🚌","🚎"],["🍋","🍌"],["🐭","🐹"],["😀","😃"],["🙂","😊"],["🌙","🌛"],["🎈","🎀"]];
var BT_COL = [["빨강","#dc2626"],["파랑","#2563eb"],["초록","#16a34a"],["노랑","#eab308"],["보라","#7c3aed"],["검정","#111827"]];
function _gRand(n){ return Math.floor(Math.random() * n); }
function _gGrid(arr, cols, show){ return { a: arr, cols: cols }; }
function btGameQs(lvId, n){
  var kinds = ["diff", "odd", "mem", "cnt", "col"], qs = [], k0 = _gRand(5);
  for(var i = 0; i < n; i++){
    var kd = lvId === "mix" || !lvId ? kinds[(i + k0) % 5] : lvId, lvl = Math.min(2, Math.floor(i / Math.max(1, Math.ceil(n / 3))));   // 뒤로 갈수록 어려워짐
    qs.push(_gMake(kd, lvl));
  }
  return qs;
}
function _gMake(kd, lvl){
  var Q, cells, cols, pool, i;
  if(kd === "diff"){
    cols = [3, 4, 5][lvl]; pool = shuffle(BT_EMO).slice(0, [6, 9, 12][lvl]);
    var a = []; for(i = 0; i < cols * cols; i++) a.push(pool[_gRand(pool.length)]);
    var b = a.slice(), x = _gRand(a.length), other = shuffle(BT_EMO).filter(function(e){ return e !== a[x]; })[0]; b[x] = other;
    Q = { g: "diff", q: "🔍 아래 그림에서 다른 곳을 눌러요", a: a, b: b, cols: cols, k: x, lim: [15000, 20000, 25000][lvl] };
    Q.c = b.map(function(e, j){ return (j + 1) + "번 칸 " + e; });
  } else if(kd === "odd"){
    cols = [4, 5, 6][lvl]; var pr = BT_ODD[_gRand(BT_ODD.length)], flip = _gRand(2), maj = pr[flip], min = pr[1 - flip], y = _gRand(cols * cols);
    cells = []; for(i = 0; i < cols * cols; i++) cells.push(i === y ? min : maj);
    Q = { g: "odd", q: "👀 하나만 달라요! 찾아서 눌러요", b: cells, cols: cols, k: y, lim: [12000, 15000, 18000][lvl] };
    Q.c = cells.map(function(e, j){ return (j + 1) + "번 칸 " + e; });
  } else if(kd === "mem"){
    var nC = [6, 8, 12][lvl]; cols = [3, 4, 4][lvl]; cells = shuffle(BT_EMO).slice(0, nC); var t = _gRand(nC);
    Q = { g: "mem", q: "🧠 그림 자리를 기억해요!", b: cells, cols: cols, k: t, show: [4000, 5000, 6000][lvl], tg: cells[t] };
    Q.lim = Q.show + 10000;
    Q.c = cells.map(function(e, j){ return (j + 1) + "번 칸 " + e; });
  } else if(kd === "cnt"){
    pool = shuffle(BT_EMO).slice(0, [2, 3, 4][lvl]); var cnt = {}, items = [];
    pool.forEach(function(e){ cnt[e] = 2 + _gRand([5, 7, 9][lvl]); for(var z = 0; z < cnt[e]; z++) items.push(e); });
    var ask = pool[_gRand(pool.length)], ans = cnt[ask];
    var w = _btPick3(ans, [ans - 2, ans - 1, ans + 1, ans + 2, ans + 3].filter(function(v){ return v > 0; }));
    Q = _btQ(ask + " 몇 개?", ans, w); Q.pic = shuffle(items).join(" "); Q.lim = [12000, 15000, 18000][lvl];
  } else {   // col — 글자 뜻 말고 「글자 색깔」을 골라요
    var cl = shuffle(BT_COL), word = cl[0], color = cl[1];
    Q = _btQ(word[0], color[0], _btPick3(color[0], BT_COL.map(function(c){ return c[0]; }).filter(function(v){ return v !== word[0] || lvl < 2; })));
    Q.col = color[1]; Q.top = "🎨 글자 「색깔」은 뭘까요? (글자 뜻 말고!)"; Q.lim = [8000, 7000, 6000][lvl];
  }
  return Q;
}
function _btGameHtml(R, Q, s, mine, rv, canPick){
  var seeing = Q.show && !rv && (_btNow() - R.qt < Q.show), cols = Q.cols || 4, n = Q.b.length;
  var big = cols <= 3 ? 46 : cols === 4 ? 38 : cols === 5 ? 30 : 26;
  var cell = function(e, j, tap, bg){ return '<button ' + (tap ? 'onclick="btAns(' + j + ')"' : 'disabled') + ' style="border:0;border-radius:10px;aspect-ratio:1/1;font-size:' + big + 'px;padding:0;background:' + bg + ';cursor:' + (tap ? "pointer" : "default") + '">' + e + '</button>'; };
  var grid = function(arr, tapOK, hide){
    return '<div style="display:grid;grid-template-columns:repeat(' + cols + ',1fr);gap:5px;max-width:' + (cols * 78) + 'px;margin:0 auto">' + arr.map(function(e, j){
      var bg = "#fff";
      if(rv){ bg = j === Q.k ? "#86efac" : (mine && mine.c === j ? "#fca5a5" : "#fff"); }
      else if(mine && mine.c === j) bg = "#fde68a";
      return cell(hide && !rv ? "❓" : e, j, tapOK && canPick, bg);
    }).join("") + '</div>';
  };
  var h = "";
  if(Q.g === "diff"){
    h += '<div style="text-align:center;font-weight:800;color:#475569;margin:2px 0 4px">⬇ 원래 그림</div>' + '<div style="opacity:.95">' + grid(Q.a, false, false).replace(/onclick="btAns\(\d+\)"/g, "disabled") + '</div>'
      + '<div style="text-align:center;font-weight:900;color:#b91c1c;margin:10px 0 4px">⬇ 여기서 다른 곳을 눌러요</div>' + grid(Q.b, true, false);
  } else if(Q.g === "odd"){
    h += grid(Q.b, true, false);
  } else if(Q.g === "mem"){
    if(seeing) h += '<div style="text-align:center;font-size:22px;font-weight:900;color:#7c3aed;margin-bottom:6px">👀 잘 봐요! ' + Math.round(Q.show / 1000) + '초 보여 주고 가려져요</div>' + grid(Q.b, false, false);
    else h += '<div style="text-align:center;font-size:24px;font-weight:900;margin-bottom:6px"><span style="font-size:44px">' + esc(Q.tg) + '</span> 어디 있었지?</div>' + grid(Q.b, true, true);
  }
  return h;
}
