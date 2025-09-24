// Firebase 설정 및 초기화
const firebaseConfig = {
  apiKey: "AIzaSyAPzVq3PV5ppJijFD3CQJv3HIJSFQn-rVM",
  authDomain: "lol-randomchampion-default-rtdb.firebaseio.com",
  databaseURL: "https://lol-randomchampion-default-rtdb.firebaseio.com",
  projectId: "lol-randomchampion",
  storageBucket: "lol-randomchampion.appspot.com",
  messagingSenderId: "558228597015",
  appId: "1:558228597015:web:e1b8a2f77fa3ba9e6f4d6b"
};

// Firebase SDK가 로드될 때까지 대기
function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.firebase) {
      resolve();
    } else {
      const checkFirebase = setInterval(() => {
        if (window.firebase) {
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);
    }
  });
}

// Firebase 초기화 함수
async function initializeFirebase() {
  await waitForFirebase();
  
  // Firebase 앱 초기화
  const app = window.firebase.initializeApp(firebaseConfig);
  const db = window.firebase.getDatabase(app);
  
  // 전역으로 노출
  window.firebase.app = app;
  window.firebase.db = db;
  window.db = db;
  
  console.log('Firebase 초기화 완료');
}

// 페이지 로드 시 Firebase 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFirebase);
} else {
  initializeFirebase();
}