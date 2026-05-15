import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("🔥 Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

export { db, storage };