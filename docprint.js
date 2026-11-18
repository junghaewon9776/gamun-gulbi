// ============================================================================
// 🖨 문서 인쇄 창 (공통) — 법성포청년회 정산서 인쇄 창을 그대로 가져옴 (2026-11-18)
//   크기 ➖➕ · 여백 · 📏 한 장 줄이기 · 출력일자/쪽 번호 · 📝 한글(.hml) 받기 · (o.xl 있으면) 📊 엑셀로 저장
//   _docPrint({ title, html, landscape, key, xl: "부모 창에서 부를 함수 호출 글" })
// ============================================================================
function _docPrintBoot(KEY, ORI, TTL){
  var Z = 100, M = 12, SD = false, SP = false, W, H;
  try { var sv = JSON.parse(localStorage.getItem(KEY) || "{}"); if(sv.z) Z = sv.z; if(sv.m != null) M = sv.m; SD = !!sv.sd; SP = !!sv.sp; if(sv.o === "portrait" || sv.o === "landscape") ORI = sv.o; } catch(e){}
  function wh(){ W = ORI === "landscape" ? 297 : 210; H = ORI === "landscape" ? 210 : 297; } wh();
  var td = new Date(), DT = td.getFullYear() + "-" + ("0" + (td.getMonth() + 1)).slice(-2) + "-" + ("0" + td.getDate()).slice(-2);
  var $ = function(id){ return document.getElementById(id); };
  function px(mm){ return mm * 96 / 25.4; }
  function ap(){
    var nb = '"\\a0"';
    $("pg").textContent = "@page{size:A4 " + ORI + ";margin:" + M + "mm;"
      + "@top-left{content:" + nb + "}@top-center{content:" + nb + "}@top-right{content:" + nb + "}"
      + "@bottom-left{content:" + (SD ? '"출력일자 ' + DT + '"' : nb) + ";font-size:9pt;color:#000}"
      + "@bottom-center{content:" + nb + "}"
      + "@bottom-right{content:" + (SP ? 'counter(page) " / " counter(pages)' : nb) + ";font-size:9pt;color:#000}}";
    $("cd").checked = SD; $("cp").checked = SP;
    var d = $("doc"), pw = px(W - 2 * M);
    d.style.zoom = Z / 100; d.style.width = (pw / (Z / 100)) + "px";
    $("zv").textContent = Z + "%"; $("mv").value = M;
    ["portrait", "landscape"].forEach(function(o){ var b = $("ori_" + o); if(b){ b.style.background = ORI === o ? "#f59e0b" : "#475569"; } });
    var h = d.getBoundingClientRect().height, ph = px(H - 2 * M), n = Math.max(1, Math.ceil(h / ph - 0.01));
    $("pv").textContent = "약 " + n + "장";
    window._docFit = function(){ if(n <= 1 && h <= ph){ alert("이미 한 장이에요"); return; } var want = Math.max(1, Math.ceil(h / ph - 0.01) - 1); Z = Math.max(50, Math.floor(Z * (want * ph) / h * 0.97)); ap(); };
    try { localStorage.setItem(KEY, JSON.stringify({ z: Z, m: M, sd: SD, sp: SP, o: ORI })); } catch(e){}
  }
  window._docZ = function(d){ Z = Math.min(150, Math.max(50, Z + d)); ap(); };
  window._docOri = function(o){ ORI = o; wh(); ap(); };
  window._docZ0 = function(){ Z = 100; ap(); };
  window._docOpt = function(){ SD = $("cd").checked; SP = $("cp").checked; ap(); };
  window._docM = function(v){ M = Math.max(0, Math.min(30, Number(v) || 0)); ap(); };
  window._docDoc = function(){
    // 한글에서 열리는 문서(.doc) — 한글은 HTML 의 style 을 잘 못 읽어서 옛날식 속성(width·align·bgcolor·border)으로 바꿔 줌
    //  (2026-11-16 한컴오피스로 직접 열어 확인: charset 은 http-equiv 로 줘야 글자 안 깨짐)
    var src = $("doc").cloneNode(true);
    [].forEach.call(src.querySelectorAll(".noprint,.no-print,button,script"), function(e){ e.remove(); });
    [].forEach.call(src.querySelectorAll("*"), function(e){
      var st = e.style; if(!st) return;
      var ta = st.textAlign, va = st.verticalAlign, bg = st.backgroundColor, w = st.width;
      if(e.tagName === "TABLE"){
        e.setAttribute("border", "1"); e.setAttribute("cellspacing", "0"); e.setAttribute("cellpadding", "3");
        e.setAttribute("width", w && /%$/.test(w) ? w : (w && /px$/.test(w) ? parseInt(w, 10) : "100%"));
        var pa = e.parentNode; if(pa && pa.style && pa.style.justifyContent === "flex-end"){ pa.setAttribute("align", "right"); e.setAttribute("align", "right"); }   // 결재란 오른쪽
        var cs = e.querySelectorAll("col"), r0 = e.rows && e.rows[0];   // colgroup 칸 너비 → 첫 줄 칸 width
        if(cs.length && r0){ var ci = 0; [].forEach.call(r0.cells, function(c){ var cw = cs[ci] && cs[ci].style.width; if(cw && /px$/.test(cw) && !c.getAttribute("width")) c.setAttribute("width", parseInt(cw, 10)); ci += c.colSpan || 1; }); }
      }
      if(ta === "center" || ta === "right") e.setAttribute("align", ta);
      if((e.tagName === "TD" || e.tagName === "TH") && va === "middle") e.setAttribute("valign", "middle");
      if((e.tagName === "TD" || e.tagName === "TH") && bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)"){
        var m = bg.match(/\d+/g); if(m) e.setAttribute("bgcolor", "#" + m.slice(0, 3).map(function(x){ return ("0" + (+x).toString(16)).slice(-2); }).join(""));
      }
      if((e.tagName === "TD" || e.tagName === "TH") && w && /px$/.test(w)) e.setAttribute("width", parseInt(w, 10));
      if(e.tagName === "DIV" && ta === "center" && !e.querySelector("table")){   // 제목 같은 가운데 줄 → 문단으로
        var pp = document.createElement("p"); pp.setAttribute("align", "center"); pp.innerHTML = e.innerHTML; pp.style.cssText = e.style.cssText; e.parentNode.replaceChild(pp, e);
      }
    });
    var css = "body{font-family:'맑은 고딕','Malgun Gothic';font-size:10pt;color:#000}table{border-collapse:collapse}td,th{border:1px solid #000;padding:3px 5px}";
    var html = "<html><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'><title>" + (TTL || "") + "</title><style>" + css + "</style></head><body>" + src.innerHTML + "</body></html>";
    var b = new Blob([html], { type: "application/msword" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = (TTL || "정산서").replace(/[\\\/:*?"<>|]/g, "_") + ".doc"; document.body.appendChild(a); a.click();
    window._docLastHtml = html;
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  // ── 📝 한글 문서(.hml, 한글 XML) 만들기 — 화면에 그려진 정산서를 그대로 한글 표·문단으로 옮김 (2026-11-16 한컴오피스로 열어 확인) ──
  window._docHml = function(){
    var doc = $("doc"), U = 283.465, TW = Math.round((W - 2 * M) * U), dw = doc.clientWidth || 1;
    var X = function(t){ return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
    var CS = [], CSK = {}, BF = [], BFK = {}, iid = 1000;
    var cs = function(px, bold){ var h = Math.max(600, Math.round(px * 0.75 * 100 / 50) * 50), k = h + "|" + (bold ? 1 : 0); if(CSK[k] == null){ CSK[k] = CS.length; CS.push({ h: h, b: bold }); } return CSK[k]; };
    var bf = function(bg){ var k = bg || "-"; if(BFK[k] == null){ BFK[k] = BF.length + 3; BF.push(bg); } return BFK[k]; };   // 1·2 = 선 없음, 3~ = 검정 선 (+배경)
    var colInt = function(c){ var m = String(c || "").match(/\d+/g); if(!m || (m.length > 3 && +m[3] === 0)) return null; return (+m[0]) + (+m[1]) * 256 + (+m[2]) * 65536; };
    var PS = { left: 0, center: 1, right: 2 };
    var psOf = function(e){ var a = getComputedStyle(e).textAlign; return a === "center" ? 1 : (a === "right" || a === "end") ? 2 : 0; };
    var fw = function(e){ var w = getComputedStyle(e).fontWeight; return w === "bold" || +w >= 600; };
    var fpx = function(e){ return parseFloat(getComputedStyle(e).fontSize) || 13; };
    // 글자 → <CHAR> (줄바꿈은 LINEBREAK)
    var runs = function(txt){ return String(txt).replace(/ /g, " ").split("\n").map(function(l){ return X(l); }).join("<LINEBREAK/>"); };
    var textOf = function(e){
      var c = e.cloneNode(true); [].forEach.call(c.querySelectorAll("br"), function(b){ b.replaceWith("\n"); });
      [].forEach.call(c.querySelectorAll("div,p,tr"), function(d){ d.insertAdjacentText("beforebegin", "\n"); });
      return c.textContent.replace(/[ \t]+\n/g, "\n").replace(/\n{2,}/g, "\n").replace(/^\n+|\n+$/g, "");
    };
    var para = function(e, txt, pb){ return '<P ParaShape="' + psOf(e) + '" Style="0"' + (pb ? ' PageBreak="true"' : '') + '><TEXT CharShape="' + cs(fpx(e), fw(e)) + '"><CHAR>' + runs(txt) + '</CHAR></TEXT></P>'; };
    var table = function(t, right){
      var sc = TW / dw, tw = Math.min(TW, Math.round(t.offsetWidth * sc)), rows = [].slice.call(t.rows), grid = [], out = "", nC = 0;
      rows.forEach(function(r, ri){ grid[ri] = grid[ri] || []; var ci = 0;
        [].forEach.call(r.cells, function(c){ while(grid[ri][ci]) ci++; c._ra = ri; c._ca = ci;
          for(var y = 0; y < c.rowSpan; y++) for(var x = 0; x < c.colSpan; x++){ grid[ri + y] = grid[ri + y] || []; grid[ri + y][ci + x] = 1; }
          ci += c.colSpan; nC = Math.max(nC, ci); }); });
      var tScale = tw / (t.offsetWidth || 1);
      rows.forEach(function(r){
        out += "<ROW>";
        [].forEach.call(r.cells, function(c){
          var bg = colInt(getComputedStyle(c).backgroundColor), va = getComputedStyle(c).verticalAlign;
          var lines = textOf(c);
          out += '<CELL BorderFill="' + bf(bg) + '" ColAddr="' + c._ca + '" ColSpan="' + c.colSpan + '" Dirty="false" Editable="false" HasMargin="true" Header="' + (r.parentNode && r.parentNode.tagName === "THEAD" ? "true" : "false") + '" Height="' + (lines.trim() ? 282 : Math.max(282, Math.round(c.offsetHeight * tScale))) + '" Protect="false" RowAddr="' + c._ra + '" RowSpan="' + c.rowSpan + '" Width="' + Math.round(c.offsetWidth * tScale) + '">'
            + '<CELLMARGIN Bottom="170" Left="340" Right="340" Top="170"/><PARALIST LineWrap="Break" LinkListID="0" LinkListIDNext="0" TextDirection="0" VertAlign="' + (va === "top" ? "Top" : va === "bottom" ? "Bottom" : "Center") + '">'
            + '<P ParaShape="' + psOf(c) + '" Style="0"><TEXT CharShape="' + cs(fpx(c), fw(c) || (c.parentNode && fw(c.parentNode))) + '"><CHAR>' + runs(lines) + '</CHAR></TEXT></P></PARALIST></CELL>';
        });
        out += "</ROW>";
      });
      iid++;
      return '<P ParaShape="0" Style="0"><TEXT CharShape="0"><TABLE BorderFill="3" CellSpacing="0" ColCount="' + nC + '" PageBreak="Cell" RepeatHeader="' + (t.tHead ? "true" : "false") + '" RowCount="' + rows.length + '">'
        + '<SHAPEOBJECT InstId="' + iid + '" Lock="false" NumberingType="Table" TextWrap="TopAndBottom" ZOrder="' + iid + '"><SIZE Height="' + Math.round(t.offsetHeight * tScale) + '" HeightRelTo="Absolute" Protect="false" Width="' + tw + '" WidthRelTo="Absolute"/>'
        + '<POSITION AffectLSpacing="false" AllowOverlap="false" FlowWithText="true" HoldAnchorAndSO="false" HorzAlign="' + (right ? "Right" : "Left") + '" HorzOffset="0" HorzRelTo="Para" TreatAsChar="false" VertAlign="Top" VertOffset="0" VertRelTo="Para"/><OUTSIDEMARGIN Bottom="141" Left="0" Right="0" Top="141"/></SHAPEOBJECT>'
        + '<INSIDEMARGIN Bottom="100" Left="280" Right="280" Top="100"/>' + out + '</TABLE><CHAR/></TEXT></P>';
    };
    // 문서 훑기: 표 → 한글 표, 글 덩어리 → 문단
    var body = [];
    var walk = function(e){
      [].forEach.call(e.children, function(ch){
        var st = getComputedStyle(ch); if(st.display === "none" || /noprint|no-print/.test(ch.className)) return;
        var pb = st.breakBefore === "page" || st.pageBreakBefore === "always";
        if(ch.tagName === "TABLE"){ body.push(table(ch, false)); return; }
        if(ch.tagName === "IMG" || ch.tagName === "BUTTON" || ch.tagName === "SCRIPT" || ch.tagName === "STYLE") return;
        var t = ch.querySelector("table");
        if(t){
          if(ch.children.length === 1 && ch.firstElementChild === t){ body.push(table(t, st.justifyContent === "flex-end" || st.textAlign === "right")); return; }
          walk(ch); return;
        }
        var blk = [].some.call(ch.children, function(k){ var d = getComputedStyle(k).display; return d === "block" || d === "flex" || d === "grid"; });
        if(blk && st.display !== "flex"){ walk(ch); return; }
        var txt = textOf(ch); if(!txt.trim()) return;
        body.push(para(ch, txt, pb));
      });
    };
    walk(doc);
    // 머리(글꼴·글자 모양·문단 모양·테두리)
    var LANGS = ["Hangul", "Latin", "Hanja", "Japanese", "Other", "Symbol", "User"];
    var fonts = LANGS.map(function(l){ return '<FONTFACE Count="1" Lang="' + l + '"><FONT Id="0" Name="맑은 고딕" Type="ttf"/></FONTFACE>'; }).join("");
    var seven = function(tag, v){ return "<" + tag + " " + LANGS.map(function(l){ return l + '="' + v + '"'; }).join(" ") + "/>"; };
    if(!CS.length) cs(13, false);
    var charL = CS.map(function(c, i){ return '<CHARSHAPE BorderFillId="1" Height="' + c.h + '" Id="' + i + '" ShadeColor="4294967295" SymMark="0" TextColor="0" UseFontSpace="false" UseKerning="false">' + seven("FONTID", 0) + seven("RATIO", 100) + seven("CHARSPACING", 0) + seven("RELSIZE", 100) + seven("CHAROFFSET", 0) + (c.b ? "<BOLD/>" : "") + "</CHARSHAPE>"; }).join("");
    var paraL = ["Left", "Center", "Right"].map(function(a, i){ return '<PARASHAPE Align="' + a + '" BreakLatinWord="KeepWord" BreakNonLatinWord="true" Condense="0" HeadingType="None" Id="' + i + '" KeepLines="false" KeepWithNext="false" Level="0" LineWrap="Break" PageBreakBefore="false" SnapToGrid="true" TabDef="0" VerAlign="Baseline" WidowOrphan="false"><PARAMARGIN Indent="0" Left="0" LineSpacing="130" LineSpacingType="Percent" Next="0" Prev="0" Right="0"/><PARABORDER BorderFill="1" Connect="false" IgnoreMargin="false"/></PARASHAPE>'; }).join("");
    var line = function(tp){ return '<LEFTBORDER Type="' + tp + '" Width="0.12mm" Color="0"/><RIGHTBORDER Type="' + tp + '" Width="0.12mm" Color="0"/><TOPBORDER Type="' + tp + '" Width="0.12mm" Color="0"/><BOTTOMBORDER Type="' + tp + '" Width="0.12mm" Color="0"/><DIAGONAL Type="Solid" Width="0.1mm"/>'; };
    var bfA = '<BORDERFILL BackSlash="0" BreakCellSeparateLine="0" CenterLine="0" CounterBackSlash="0" CounterSlash="0" CrookedSlash="0" Id="';
    var bfL = bfA + '1" Shadow="false" Slash="0" ThreeD="false">' + line("None") + '</BORDERFILL>' + bfA + '2" Shadow="false" Slash="0" ThreeD="false">' + line("None") + '</BORDERFILL>'
      + BF.map(function(bg, i){ return bfA + (i + 3) + '" Shadow="false" Slash="0" ThreeD="false">' + line("Solid") + (bg != null ? '<FILLBRUSH><WINDOWBRUSH Alpha="0" FaceColor="' + bg + '" HatchColor="0"/></FILLBRUSH>' : '') + '</BORDERFILL>'; }).join("");
    if(!BF.length) bf(null), bfL += bfA + '3" Shadow="false" Slash="0" ThreeD="false">' + line("Solid") + '</BORDERFILL>';
    var mm = function(v){ return Math.round(v * U); };
    var secdef = '<SECDEF CharGrid="0" FirstBorder="false" FirstFill="false" LineGrid="0" MemoShapeId="0" OutlineShape="0" SpaceColumns="1134" TabStop="8000" TextDirection="0" TextVerticalWidthHead="0"><STARTNUMBER Equation="0" Figure="0" Page="0" PageStartsOn="Both" Table="0"/><HIDE Border="false" EmptyLine="false" Fill="false" Footer="false" Header="false" MasterPage="false" PageNumPos="false"/>'
      + '<PAGEDEF GutterType="LeftOnly" Height="' + mm(H) + '" Landscape="' + (ORI === "landscape" ? 1 : 0) + '" Width="' + mm(W) + '"><PAGEMARGIN Bottom="' + mm(M) + '" Footer="0" Gutter="0" Header="0" Left="' + mm(M) + '" Right="' + mm(M) + '" Top="' + mm(M) + '"/></PAGEDEF></SECDEF><COLDEF Count="1" Layout="Left" SameGap="0" SameSize="true" Type="Newspaper"/>';
    var first = '<P ParaShape="0" Style="0"><TEXT CharShape="0">' + secdef + '</TEXT></P>';
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?><HWPML Style="embed" SubVersion="10.0.0.0" Version="2.91"><HEAD SecCnt="1"><DOCSUMMARY><TITLE>' + X(TTL || "") + '</TITLE></DOCSUMMARY><DOCSETTING><BEGINNUMBER Endnote="1" Equation="1" Footnote="1" Page="1" Picture="1" Table="1"/><CARETPOS List="0" Para="0" Pos="0"/></DOCSETTING>'
      + '<MAPPINGTABLE><FACENAMELIST>' + fonts + '</FACENAMELIST><BORDERFILLLIST Count="' + (BF.length + 2) + '">' + bfL + '</BORDERFILLLIST><CHARSHAPELIST Count="' + CS.length + '">' + charL + '</CHARSHAPELIST>'
      + '<TABDEFLIST Count="1"><TABDEF AutoTabLeft="false" AutoTabRight="false" Id="0"/></TABDEFLIST><PARASHAPELIST Count="3">' + paraL + '</PARASHAPELIST>'
      + '<STYLELIST Count="1"><STYLE CharShape="0" EngName="Normal" Id="0" LangId="1042" LockForm="0" Name="바탕글" NextStyle="0" ParaShape="0" Type="Para"/></STYLELIST></MAPPINGTABLE></HEAD>'
      + '<BODY><SECTION Id="0">' + first + body.join("") + '</SECTION></BODY><TAIL/></HWPML>';
    window._docLastHml = xml;
    var b = new Blob([xml], { type: "application/xml" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = (TTL || "정산서").replace(/[\\\/:*?"<>|]/g, "_") + ".hml"; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  window.addEventListener("load", ap); setTimeout(ap, 300);
}
function _docPrint(o){
  // o = { title, html, landscape, key }
  var ori = o.landscape ? "landscape" : "portrait", key = "gmDocPrint_" + (o.key || "doc");
  var B = 'border:none;border-radius:6px;padding:7px 12px;font-size:14px;font-weight:800;color:#fff;cursor:pointer;background:';
  var css = 'body{font-family:"맑은 고딕","Malgun Gothic",sans-serif;margin:0;color:#000;background:#e5e7eb}'
    + '#doc{background:#fff;margin:0 auto 30px;box-shadow:0 0 0 1px #cbd5e1}'
    + 'table{page-break-inside:auto}tr{page-break-inside:avoid}thead{display:table-header-group}tfoot{display:table-footer-group}'
    + '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    // 표 선·회색 글씨 진하게 (인쇄하면 연하게 나오던 것)
    + '#doc td,#doc th{border-color:#000!important}'
    + '#doc [style*="color:#64748b"],#doc [style*="color:#94a3b8"],#doc [style*="color:#475569"],#doc [style*="color:#334155"],#doc [style*="color:#334"]{color:#000!important}'
    + '.bar{position:sticky;top:0;z-index:9;background:#0f172a;color:#fff;padding:8px 10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:14px;margin-bottom:12px}'
    + '.bar input{width:52px;font-size:14px;padding:4px;border-radius:5px;border:0}'
    + '@media print{body{background:#fff}.bar,.noprint,.no-print{display:none!important}#doc{box-shadow:none;margin:0}}';
  var bar = '<div class="bar"><button style="' + B + '#1d4ed8" onclick="window.print()">🖨️ 인쇄 / PDF</button>'
    + '<span style="margin-left:6px">방향</span><button id="ori_portrait" style="' + B + '#475569" onclick="_docOri(\'portrait\')">▯ 세로</button><button id="ori_landscape" style="' + B + '#475569" onclick="_docOri(\'landscape\')">▭ 가로</button>'
    + '<span style="margin-left:6px">크기</span><button style="' + B + '#475569" onclick="_docZ(-5)">➖</button><b id="zv" style="min-width:44px;text-align:center">100%</b><button style="' + B + '#475569" onclick="_docZ(5)">➕</button><button style="' + B + '#334155;font-size:12px" onclick="_docZ0()">원래대로</button>'
    + '<span style="margin-left:6px">여백</span><input id="mv" type="number" min="0" max="30" step="1" onchange="_docM(this.value)">mm'
    + '<b id="pv" style="margin-left:6px;color:#fde68a"></b><button style="' + B + '#b45309" onclick="_docFit()">📏 한 장 줄이기</button>'
    + '<label style="display:flex;gap:4px;align-items:center;margin-left:6px;cursor:pointer"><input id="cd" type="checkbox" style="width:18px;height:18px" onchange="_docOpt()">출력일자</label>'
    + '<label style="display:flex;gap:4px;align-items:center;cursor:pointer"><input id="cp" type="checkbox" style="width:18px;height:18px" onchange="_docOpt()">쪽 번호 (1/2)</label>'
    + (o.xl ? '<button style="' + B + '#047857" onclick="try{opener.' + o.xl.replace(/"/g, '&quot;') + '}catch(e){alert(&quot;원래 창이 닫혀서 엑셀을 못 만들어요 — 다시 열어 주세요&quot;)}">📊 엑셀로 저장</button>' : '')
    + '<button style="' + B + '#15803d" onclick="_docHml()">📝 한글 파일로 받기 (.hml)</button>'
    + '<span style="font-size:12px;color:#cbd5e1">마지막 한두 줄 때문에 장이 넘어가면 「📏 한 장 줄이기」 · 설정은 기억해요 · 그래도 위아래에 주소·날짜가 찍히면 인쇄 창 「설정 더보기 › 머리글과 바닥글」 체크를 꺼 주세요</span></div>';
  var h = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(o.title || "") + '</title><style id="pg"></style><style>' + css + '</style></head><body>' + bar + '<div id="doc">' + o.html + '</div>'
    + '<script>(' + _docPrintBoot.toString() + ')(' + JSON.stringify(key) + ',' + JSON.stringify(ori) + ',' + JSON.stringify(o.title || "") + ')<\/script></body></html>';
  var w = window.open("", "_blank", "width=1000,height=1000"); if(!w){ toast("팝업이 막혔어요 — 허용 후 다시", true); return; }
  w.document.open(); w.document.write(h); w.document.close();
}
