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
