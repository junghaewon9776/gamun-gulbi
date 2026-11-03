// 🔤 영어 단어 — 초등 학년별 기초 어휘 (교육부 초등 권장 어휘에서 자주 나오는 것 위주로 고름)
//   [영어, 뜻] — 학년마다 주제별 묶음. 받아쓰기 앱이 15개씩 단계로 나눠 씀
var ENGLISH = {
  "0": { t: "처음 영어 (알파벳·숫자·색깔)", w: [
    ["one","하나"],["two","둘"],["three","셋"],["four","넷"],["five","다섯"],["six","여섯"],["seven","일곱"],["eight","여덟"],["nine","아홉"],["ten","열"],
    ["red","빨간색"],["blue","파란색"],["yellow","노란색"],["green","초록색"],["white","흰색"],["black","검은색"],["pink","분홍색"],["orange","주황색"],["brown","갈색"],["purple","보라색"],
    ["mom","엄마"],["dad","아빠"],["baby","아기"],["dog","개"],["cat","고양이"],["fish","물고기"],["bird","새"],["sun","해"],["moon","달"],["star","별"]
  ]},
  "3": { t: "3학년", w: [
    ["apple","사과"],["banana","바나나"],["milk","우유"],["water","물"],["egg","달걀"],["bread","빵"],["pizza","피자"],["juice","주스"],["cake","케이크"],["candy","사탕"],
    ["head","머리"],["eye","눈"],["nose","코"],["mouth","입"],["ear","귀"],["hand","손"],["foot","발"],["arm","팔"],["leg","다리"],["face","얼굴"],
    ["father","아버지"],["mother","어머니"],["brother","형·오빠·남동생"],["sister","언니·누나·여동생"],["family","가족"],["friend","친구"],["teacher","선생님"],["student","학생"],["boy","소년"],["girl","소녀"],
    ["book","책"],["bag","가방"],["pencil","연필"],["desk","책상"],["chair","의자"],["door","문"],["window","창문"],["ball","공"],["cup","컵"],["box","상자"],
    ["big","큰"],["small","작은"],["happy","행복한"],["sad","슬픈"],["hot","뜨거운·더운"],["cold","차가운·추운"],["good","좋은"],["new","새로운"],["tall","키가 큰"],["short","짧은·키가 작은"],
    ["run","달리다"],["jump","뛰다"],["swim","수영하다"],["sing","노래하다"],["dance","춤추다"],["eat","먹다"],["sleep","자다"],["go","가다"],["come","오다"],["sit","앉다"]
  ]},
  "4": { t: "4학년", w: [
    ["Monday","월요일"],["Tuesday","화요일"],["Wednesday","수요일"],["Thursday","목요일"],["Friday","금요일"],["Saturday","토요일"],["Sunday","일요일"],["today","오늘"],["tomorrow","내일"],["week","주"],
    ["spring","봄"],["summer","여름"],["fall","가을"],["winter","겨울"],["rain","비"],["snow","눈 (내리는 눈)"],["wind","바람"],["cloud","구름"],["sunny","맑은"],["weather","날씨"],
    ["school","학교"],["home","집"],["park","공원"],["library","도서관"],["hospital","병원"],["store","가게"],["zoo","동물원"],["room","방"],["kitchen","부엌"],["bathroom","화장실"],
    ["lion","사자"],["tiger","호랑이"],["monkey","원숭이"],["elephant","코끼리"],["rabbit","토끼"],["horse","말"],["pig","돼지"],["cow","소"],["duck","오리"],["bear","곰"],
    ["read","읽다"],["write","쓰다"],["play","놀다"],["help","돕다"],["open","열다"],["close","닫다"],["like","좋아하다"],["want","원하다"],["have","가지고 있다"],["see","보다"],
    ["hungry","배고픈"],["tired","피곤한"],["fast","빠른"],["slow","느린"],["pretty","예쁜"],["long","긴"],["old","늙은·오래된"],["young","어린"],["kind","친절한"],["busy","바쁜"]
  ]},
  "5": { t: "5학년", w: [
    ["January","1월"],["February","2월"],["March","3월"],["April","4월"],["May","5월"],["June","6월"],["July","7월"],["August","8월"],["September","9월"],["October","10월"],
    ["November","11월"],["December","12월"],["birthday","생일"],["holiday","휴일"],["vacation","방학"],["morning","아침"],["afternoon","오후"],["evening","저녁"],["night","밤"],["time","시간"],
    ["math","수학"],["science","과학"],["music","음악"],["art","미술"],["English","영어"],["Korean","국어·한국어"],["history","역사"],["subject","과목"],["homework","숙제"],["test","시험"],
    ["doctor","의사"],["nurse","간호사"],["cook","요리사"],["farmer","농부"],["police officer","경찰관"],["firefighter","소방관"],["singer","가수"],["pilot","조종사"],["scientist","과학자"],["dream","꿈"],
    ["bus","버스"],["train","기차"],["bike","자전거"],["ship","배"],["airplane","비행기"],["subway","지하철"],["street","거리"],["bridge","다리 (건너는 다리)"],["left","왼쪽"],["right","오른쪽"],
    ["clean","깨끗한·청소하다"],["learn","배우다"],["teach","가르치다"],["visit","방문하다"],["watch","보다·시계"],["listen","듣다"],["speak","말하다"],["buy","사다"],["sell","팔다"],["think","생각하다"]
  ]},
  "6": { t: "6학년", w: [
    ["country","나라"],["city","도시"],["village","마을"],["world","세계"],["mountain","산"],["river","강"],["sea","바다"],["island","섬"],["forest","숲"],["earth","지구"],
    ["important","중요한"],["different","다른"],["same","같은"],["easy","쉬운"],["difficult","어려운"],["dangerous","위험한"],["famous","유명한"],["favorite","가장 좋아하는"],["special","특별한"],["healthy","건강한"],
    ["remember","기억하다"],["forget","잊다"],["arrive","도착하다"],["leave","떠나다"],["finish","끝내다"],["start","시작하다"],["travel","여행하다"],["practice","연습하다"],["protect","보호하다"],["save","구하다·아끼다"],
    ["question","질문"],["answer","대답"],["idea","생각·아이디어"],["problem","문제"],["future","미래"],["culture","문화"],["festival","축제"],["museum","박물관"],["restaurant","식당"],["vegetable","채소"],
    ["always","항상"],["usually","보통"],["often","자주"],["sometimes","가끔"],["never","절대 ~않다"],["before","~전에"],["after","~후에"],["because","왜냐하면"],["maybe","아마"],["together","함께"],
    ["first","첫 번째"],["second","두 번째"],["third","세 번째"],["hundred","100 (백)"],["thousand","1000 (천)"],["price","가격"],["money","돈"],["weight","무게"],["height","키·높이"],["size","크기"]
  ]}
};
