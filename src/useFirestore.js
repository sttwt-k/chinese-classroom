// src/useFirestore.js
import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { storage } from "./firebase";                               // ← เพิ่ม
import { ref, uploadString, getDownloadURL } from "firebase/storage"; // ← เพิ่ม

const DOC_ID = "main_data";
const COLLECTION = "app_data";

const DEFAULT_CLASSES = [
  'ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3',
  'ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3',
  'ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'
];

// ===== เพิ่มส่วนนี้ทั้งหมด ก่อน initData =====
const isBase64 = s => typeof s === 'string' && s.startsWith('data:image');

const uploadImg = async (base64, path) => {
  try {
    const r = ref(storage, path);
    await uploadString(r, base64, 'data_url');
    return await getDownloadURL(r);
  } catch (e) {
    console.error('Upload error:', e);
    return base64; // fallback ถ้า upload ไม่สำเร็จ
  }
};

const processProfiles = async (profiles) => {
  const result = {};
  for (const [sid, profile] of Object.entries(profiles || {})) {
    const p = { ...profile };
    if (isBase64(p.profilePhoto)) {
      p.profilePhoto = await uploadImg(
        p.profilePhoto, `profiles/${sid}/photo.jpg`
      );
    }
    if (Array.isArray(p.homePhotos)) {
      p.homePhotos = await Promise.all(
        p.homePhotos.map((ph, i) =>
          isBase64(ph)
            ? uploadImg(ph, `profiles/${sid}/home_${i}.jpg`)
            : Promise.resolve(ph)
        )
      );
    }
    result[sid] = p;
  }
  return result;
};
// ===== จบส่วนที่เพิ่ม =====

export const initData = () => ({
  // ... เหมือนเดิมทุกอย่าง
});

export function useFirestore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... เหมือนเดิมทุกอย่าง
  }, []);

  // ===== แก้แค่ update function นี้ =====
  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);

      const save = async () => {
        const toSave = { ...next };
        if (toSave.profiles) {
          toSave.profiles = await processProfiles(toSave.profiles);
        }
        const docRef = doc(db, COLLECTION, DOC_ID);
        await setDoc(docRef, toSave);
      };

      save().catch(err => console.error("Firebase save error:", err));
      return next;
    });
  }, []);

  return { data, loading, update };
}