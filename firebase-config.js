// Firebase 설정 - 가문굴비
// ⚠️⚠️ 반드시 가문굴비 전용 새 Firebase 프로젝트를 만들어 아래 값을 교체하세요!
//      (이대로 두면 작동하지 않습니다. 단오/청년회 설정을 넣으면 데이터가 섞이니 절대 금지)
// 만드는 법: console.firebase.google.com → 프로젝트 추가 → Realtime Database 만들기 →
//            프로젝트 설정 → 내 앱(웹) 추가 → firebaseConfig 값 복사 → 아래에 붙여넣기
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  databaseURL: "https://REPLACE_ME-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.firebasestorage.app",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

firebase.initializeApp(firebaseConfig);
const fbDb = firebase.database();
const fbAuth = firebase.auth();
