// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚠️ ใส่ config ที่คัดลอกจากขั้นตอน 6.2 ตรงนี้
const firebaseConfig = {
  apiKey: "AIzaSyD5lp8QvTTHKeJu3ZP74GUjDOtXQphdIRc",
  authDomain: "chinese-classroom-81547.firebaseapp.com",
  projectId: "chinese-classroom-81547",
  storageBucket: "chinese-classroom-81547.firebasestorage.app",
  messagingSenderId: "405497440904",
  appId: "1:405497440904:web:96721a405f2a9ba757cd3d",
  measurementId: "G-1FNYQ74BKM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);