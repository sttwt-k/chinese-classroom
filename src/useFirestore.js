import { useState, useEffect, useCallback } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase"; // ดึง db มาจากไฟล์ firebase.js ที่เราแยกไว้

// ชื่อ Collection และ Document จากรูป Firebase ของคุณครู
const COLLECTION = "app_data";
const DOC_ID = "main_data";

// ข้อมูลเริ่มต้นกรณีฐานข้อมูลว่างเปล่า (เพื่อไม่ให้แอปพัง)
const initData = () => ({
  appName: 'ห้องเรียนของคุณครูต้นฝน',
  teacherUsername: 'puntoy',
  password: '0000',
  term: 1,
  year: 2569, // อิงจากรููปตารางสอน
  homeroom: 'ม.1/1',
  classes: ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3','ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'],
  subjects: [{ id: 's1', code: 'จ23201', name: 'ภาษาจีน 5', credits: 1.0 }],
  categories: [],
  students: [],
  attendance: [],
  scores: [],
  profiles: {},
  savings: {},
  timetable: {},
  conduct: { presentScore: 1, absentScore: -1, lateGroup: 3, latePenalty: -1, minAttPct: 20 }
});

export function useFirestore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setError("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (db is null)");
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, COLLECTION, DOC_ID);

    // ป้องกันหน้าจอค้าง ถ้าโหลดนานเกิน 7 วินาที
    const timeoutId = setTimeout(() => {
      if (loading) {
        setError("การเชื่อมต่อใช้เวลานานผิดปกติ กรุณาตรวจสอบอินเทอร์เน็ตหรือ Firebase Rules");
        setLoading(false);
      }
    }, 7000);

    // ดึงข้อมูลแบบ Realtime
    const unsubscribe = onSnapshot(docRef, 
      (docSnap) => {
        clearTimeout(timeoutId); // ยกเลิก timeout ถ้าโหลดสำเร็จ
        
        if (docSnap.exists()) {
          // มีข้อมูลอยู่แล้ว
          setData(docSnap.data());
        } else {
          // ถ้าไม่มีข้อมูล ให้สร้างข้อมูลเริ่มต้นโยนเข้าไปก่อน
          console.log("No data found, creating initial data...");
          const defaultData = initData();
          setDoc(docRef, defaultData)
            .then(() => setData(defaultData))
            .catch(err => {
              console.error("Cannot create initial data:", err);
              setError("ไม่มีสิทธิ์สร้างข้อมูลเริ่มต้น (ติด Firebase Rules)");
            });
        }
        setLoading(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error("Firestore Error:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message);
        setLoading(false);
      }
    );

    // Cleanup function เมื่อปิดแอป
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // ฟังก์ชันสำหรับอัปเดตข้อมูลและเซฟลง Firebase (ครอบด้วย useCallback เพื่อความเสถียรของ React)
  const update = useCallback((fn) => {
    setData((prev) => {
      if (!prev) return prev;
      const nextData = fn(prev); // คำนวณข้อมูล state ใหม่

      // บันทึกลง Firebase เบื้องหลัง
      if (db) {
        const docRef = doc(db, COLLECTION, DOC_ID);
        setDoc(docRef, nextData).catch(err => {
          console.error("Firebase save error:", err);
          alert("บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต");
        });
      }
      return nextData; // อัปเดตหน้าจอทันที ไม่ต้องรอ Firebase (Optimistic UI)
    });
  }, []);

  return { data, loading, error, update };
}