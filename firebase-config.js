// Firebase 설정 - 가문굴비
const firebaseConfig = {
  apiKey: "AIzaSyCHGgbK7Jp8jvOGjlzMOfASB3Z1D2GII0I",
  authDomain: "gamungulbi.firebaseapp.com",
  databaseURL: "https://gamungulbi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gamungulbi",
  storageBucket: "gamungulbi.firebasestorage.app",
  messagingSenderId: "806693868312",
  appId: "1:806693868312:web:1a6b90d56b958544a8846d"
};

firebase.initializeApp(firebaseConfig);
const fbDb = firebase.database();
const fbAuth = firebase.auth();

// 🔑 로그인 도우미(Apps Script) 주소 — 비어 있으면 예전 로그인 방식 (2026-10 보안작업 2단계, AuthHelper_GAS.js)
var SEC_AUTH_URL = "https://script.google.com/macros/s/AKfycbylFvbMgcGfy6E9fRXq-V2LPogguDKNVtfq1YI_baBES1q58SVxmJdfm54uI_MORxFa/exec";
var SEC_SYS = "gamun";
