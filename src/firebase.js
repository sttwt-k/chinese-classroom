import { initializeApp }                              from "firebase/app";
import { getFirestore }                               from "firebase/firestore";
import { getStorage }                                 from "firebase/storage";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyD5lp8QvTTHKeJu3ZP74GUjDOtXQphdIRc",
  authDomain: "chinese-classroom-81547.firebaseapp.com",
  projectId: "chinese-classroom-81547",
  storageBucket: "chinese-classroom-81547.firebasestorage.app",
  messagingSenderId: "405497440904",
  appId: "1:405497440904:web:96721a405f2a9ba757cd3d"
};

let app;
let db;
let storage;
let auth;

// Promise ที่ resolve เมื่อ anonymous auth สำเร็จ
// useFirestore จะรอ promise นี้ก่อนเริ่ม onSnapshot
let authReady;

try {
  app = initializeApp(firebaseConfig);

  // ── App Check (reCAPTCHA Enterprise) ─────────────────────────────────────
  // ต้อง init ก่อน getFirestore/getAuth
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6Lcsj_EsAAAAADoj6fNXjm3PHBRTXITBkdvA4exF'),
    isTokenAutoRefreshEnabled: true,
  });

  db      = getFirestore(app);
  storage = getStorage(app);
  auth    = getAuth(app);

  // ── Anonymous Auth ────────────────────────────────────────────────────────
  // ทำให้ทุก request มี request.auth != null
  // → บอต/สคริปต์ภายนอกที่ไม่มี Firebase auth token จะถูกบล็อกที่ Rules ทันที
  authReady = new Promise((resolve) => {
    // ถ้า sign-in สำเร็จหรือมี session เดิมอยู่แล้ว → resolve ทันที
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
    signInAnonymously(auth).catch((err) => {
      console.error("❌ Anonymous sign-in failed:", err.code, err.message);
      unsub();
      resolve(null); // resolve null เพื่อไม่ให้แอปค้าง (Firestore จะ error แทน)
    });
  });

  console.log("🔥 Firebase initialized (App Check 🛡️ + Anonymous Auth 🔐)");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  authReady = Promise.resolve(null);
}

export { db, storage, auth, authReady };