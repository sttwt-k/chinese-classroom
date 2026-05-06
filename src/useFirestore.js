// src/useFirestore.js
import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const DOC_ID = "main_data";
const COLLECTION = "app_data";

const DEFAULT_CLASSES = [
  'ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3',
  'ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3',
  'ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'
];

export const initData = () => ({
  password: "0000",
  homeroom: "ม.5/2",
  classes: [...DEFAULT_CLASSES],
  subjects: [{ id: "sub_chinese", name: "ภาษาจีน", code: "จ", credits: 1.0 }],
  students: [],
  attendance: [],
  scores: [],
  categories: [
    { id: "hw", name: "การบ้าน", subjectId: "sub_chinese", max: 20, subs: [] },
    { id: "mid", name: "กลางภาค", subjectId: "sub_chinese", max: 30, subs: [] },
    { id: "final", name: "ปลายภาค", subjectId: "sub_chinese", max: 40, subs: [] },
    { id: "proj", name: "งาน/โปรเจกต์", subjectId: "sub_chinese", max: 10, subs: [] },
  ],
  conduct: {
    presentScore: 1, absentScore: -1,
    lateGroup: 3, latePenalty: -1, minAttPct: 20,
  },
  term: 1,
  year: 2568,
});

export function useFirestore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, COLLECTION, DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        // Migration: ตรวจสอบ field ใหม่
        d.classes = d.classes || [...DEFAULT_CLASSES];
        d.homeroom = d.homeroom || "ม.5/2";
        d.conduct = d.conduct || initData().conduct;
        d.subjects = d.subjects || initData().subjects;
        d.students = (d.students || []).map((s) => ({
          ...s,
          nickname: s.nickname || "",
          pin: /^\d{4}$/.test(s.pin) ? s.pin
            : Math.floor(1000 + Math.random() * 9000).toString(),
        }));
        d.categories = (d.categories || []).map((c) => ({
          ...c,
          subs: c.subs || [],
          subjectId: c.subjectId || d.subjects[0]?.id || "",
        }));
        setData(d);
      } else {
        const fresh = initData();
        setDoc(docRef, fresh);
        setData(fresh);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev);
      const docRef = doc(db, COLLECTION, DOC_ID);
      setDoc(docRef, next).catch((err) =>
        console.error("Firebase save error:", err)
      );
      return next;
    });
  }, []);

  return { data, loading, update };
}