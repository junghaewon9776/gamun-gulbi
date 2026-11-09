// ============================================================================
// 🧭 단계 고르는 화면 단순하게 (받아쓰기 급 · 수학 · 한자 · 영어 · ABC) — abc.js 다음에 붙음
//   여러 색 타일 + ○●●○ 점 → 맨 위 「👉 지금 할 것」 큰 단추 하나 + 타일은 ✅ 통과 / 하는 중 / 아직 글자로
//   지금 할 것 = 👍 추천 중 아직 통과 못 한 첫 번째 (추천이 없거나 다 했으면 통과 못 한 첫 번째)
// ============================================================================
(function(){
  var css = document.createElement("style");
  css.textContent = ".lv .dots{display:none!important}"
    + ".lv.sl-done{background:#dcfce7!important;color:#14532d!important;border:2px solid #86efac}"
    + ".lv.sl-todo{background:#f8fafc!important;color:#0f172a!important;border:2px solid #cbd5e1}"
    + ".lv.sl-now{background:#1d4ed8!important;color:#fff!important;outline:4px solid #facc15!important;outline-offset:1px}"
    + ".lv .sl-st{display:block;font-size:13px;font-weight:800;margin-top:4px}"
    + ".lv.sl-done .sl-st{color:#15803d}.lv.sl-todo .sl-st{color:#b45309}.lv.sl-now .sl-st{color:#fde68a}"
    + ".lv .badge{display:none!important}"
    + ".sl-now-btn{width:100%;font-size:22px;padding:16px;margin:0 0 12px;background:#1d4ed8;outline:4px solid #facc15;outline-offset:2px;line-height:1.35}"
    + ".sl-now-btn small{display:block;font-size:14px;font-weight:600;opacity:.95}";
  document.head.appendChild(css);
})();
// 한 화면 정리: 타일 상태 읽어서 글자로, 지금 할 것 하나 고르기
function _slTidy(boxId, label){
  var box = document.getElementById(boxId); if(!box) return;
  var old = box.parentNode.querySelector(".sl-now-wrap[data-for='" + boxId + "']"); if(old) old.remove();
  var tiles = [].slice.call(box.querySelectorAll("button.lv")).filter(function(b){ return !b.disabled; });
  if(!tiles.length) return;
  var info = tiles.map(function(b){
    var bd = b.querySelector(".badge"), dots = (b.querySelector(".dots") || {}).textContent || "";
    var passed = !!(bd && !bd.classList.contains("no")), score = bd ? (bd.textContent.match(/\d+/) || [""])[0] : "";
    var started = passed || !!bd || dots.indexOf("●") >= 0;
    var rec = b.textContent.indexOf("👍") >= 0;
    return { b: b, passed: passed, started: started, score: score, rec: rec };
  });
  var now = info.filter(function(x){ return x.rec && !x.passed; })[0] || info.filter(function(x){ return !x.passed; })[0];
  info.forEach(function(x){
    x.b.classList.remove("sl-done", "sl-todo", "sl-now");
    x.b.style.outline = ""; x.b.style.background = "";
    var st = x.b.querySelector(".sl-st"); if(!st){ st = document.createElement("span"); st.className = "sl-st"; x.b.appendChild(st); }
    if(x === now){ x.b.classList.add("sl-now"); st.textContent = "👉 지금 이거!" + (x.started && !x.passed ? " (하는 중)" : ""); }
    else if(x.passed){ x.b.classList.add("sl-done"); st.textContent = "✅ 통과" + (x.score ? " " + x.score + "점" : ""); }
    else { x.b.classList.add("sl-todo"); st.textContent = x.started ? "하는 중" + (x.score ? " · " + x.score + "점" : "") : "아직"; }
  });
  if(!now) return;
  // 맨 위 「👉 지금 할 것」 — 타일 이름 그대로, 누르면 그 단계로
  var name = (now.b.childNodes[0] && now.b.childNodes[0].nodeType === 3 ? now.b.childNodes[0].textContent : now.b.textContent.split("\n")[0]).replace(/👍\s*/g, "").trim();
  var nameEl = now.b.cloneNode(true); [].forEach.call(nameEl.querySelectorAll("small,.sl-st,.badge,.dots"), function(e){ e.remove(); });
  name = nameEl.textContent.replace(/👍\s*/g, "").trim() || name;
  var wrap = document.createElement("div"); wrap.className = "sl-now-wrap"; wrap.setAttribute("data-for", boxId); wrap.style.gridColumn = "1/-1";
  wrap.innerHTML = '<button class="sl-now-btn">👉 지금 할 것: ' + esc(name) + '<small>' + (now.started ? "하던 거 이어서 해요" : "여기부터 시작해요") + (label ? " · " + esc(label) : "") + '</small></button>';
  wrap.querySelector("button").onclick = function(){ now.b.click(); };
  box.parentNode.insertBefore(wrap, box);
}
(function(){
  var wrap = function(fn, after){ var f0 = window[fn]; if(typeof f0 !== "function") return; window[fn] = function(){ var r = f0.apply(this, arguments); try { after(); } catch(e){} return r; }; };
  wrap("renderLevels", function(){ _slTidy("levelList", "받아쓰기"); });
  wrap("mRenderLevels", function(){ _slTidy("mLevels", "수학"); });
  wrap("wsRenderLevels", function(){ _slTidy("wsLevels", WS.sub === "han" ? "한자" : "영어"); });
  wrap("abRenderLevels", function(){ _slTidy("abLevels", "알파벳"); });
})();
