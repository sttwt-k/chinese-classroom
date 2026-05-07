import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase"; 

const DOC_ID = "main_data";
const COLLECTION = "app_data";

// ===== จัดการรูปภาพ (Firebase Storage) =====
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

// ===== ข้อมูลเริ่มต้นระบบ =====
export const initData = () => ({
  appName: 'ห้องเรียนของคุณครูต้นฝน', // เปลี่ยนชื่อเริ่มต้นที่นี่
  password: '0000',
  term: 1,
  year: 2569,
  homeroom: 'ม.1/1',
  classes: [
    'ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3',
    'ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3',
    'ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'
  ],
  subjects: [{ id: 's1', code: 'จ20201', name: 'ภาษาจีนเบื้องต้น', credits: 1.0 }],
  categories: [],
  students: [],
  attendance: [],
  scores: [],
  profiles: {},
  savings: {},
  conduct: { presentScore: 1, absentScore: -1, lateGroup: 3, latePenalty: -1, minAttPct: 80 }
});

// ===== Hook หลักสำหรับใช้งานใน App =====
export function useFirestore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลแบบ Real-time
  useEffect(() => {
    const docRef = doc(db, COLLECTION, DOC_ID);

    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
        } else {
          // ถ้ายังไม่มีข้อมูล ให้สร้างใหม่
          const defaultData = initData();
          setDoc(docRef, defaultData).catch(err => console.error("Create initial data error:", err));
          setData(defaultData);
        }
        setLoading(false); // สำคัญมาก: ต้องบอกให้หน้าแอปเลิกหมุนโหลด
      },
      (error) => {
        console.error("Firestore Error:", error);
        alert("เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาเช็ก Firebase Rules");
        setLoading(false); // ถึงจะพัง ก็ต้องให้เลิกหมุนโหลด
      }
    );

    return () => unsubscribe();
  }, []);

  // ฟังก์ชันอัปเดตข้อมูลและรูปภาพ
  const update = useCallback((fn) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = fn(prev);

      const save = async () => {
        const toSave = { ...next };
        // แปลง Base64 เป็น URL ก่อนเซฟลง Firestore
        if (toSave.profiles) {
          toSave.profiles = await processProfiles(toSave.profiles);
        }
        const docRef = doc(db, COLLECTION, DOC_ID);
        await setDoc(docRef, toSave);
      };

      save().catch(err => {
        console.error("Firebase save error:", err);
        alert("บันทึกข้อมูลไม่สำเร็จ");
      });
      
      return next;
    });
  }, []);

  return { data, loading, update };
}