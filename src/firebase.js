import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// 1. Import App Check เพิ่มเข้ามา
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ⚠️ วาง Firebase Config ของคุณครูตรงนี้นะครับ
const firebaseConfig = {
  apiKey: "AIzaSyD5lp8QvTTHKeJu3ZP74GUjDOtXQphdIRc",
  authDomain: "chinese-classroom-81547.firebaseapp.com",
  projectId: "chinese-classroom-81547",
  storageBucket: "chinese-classroom-81547.firebasestorage.app",
  messagingSenderId: "405497440904",
  appId: "1:405497440904:web:96721a405f2a9ba757cd3d"
};

// Initialize Firebase อย่างปลอดภัย (ทำแค่ครั้งเดียว)
let app;
let db;
let storage;
let appCheck; // เพิ่มตัวแปรสำหรับ App Check

try {
  app = initializeApp(firebaseConfig);
  
  // 2. เริ่มต้นระบบ App Check ทันทีหลังจาก initializeApp
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Lcsj_EsAAAAADoj6fNXjm3PHBRTXITBkdvA4exF'), // <--- วาง Site Key ตรงนี้ครับ
    isTokenAutoRefreshEnabled: true // ให้ระบบต่ออายุบัตรผ่านอัตโนมัติ
  });

  db = getFirestore(app);
  storage = getStorage(app);
  console.log("🔥 Firebase initialized successfully (with App Check 🛡️)");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

export { db, storage };