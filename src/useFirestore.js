import { useState, useEffect, useRef, useCallback } from "react";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ─── Document layout ─────────────────────────────────────────────────────────
//  app_data/main_data          ← students, subjects, scores, settings, timetable…
//  app_data/att_2569-05        ← attendance records for year-month 2569-05
//  app_data/att_2569-06        ← attendance records for year-month 2569-06
//  …
//
// แยก attendance ออกจาก main_data เพราะ Firestore มี hard limit 1 MB/document
// 400 นักเรียน × 100 วัน = ~4 MB → เกินแน่ถ้าเก็บรวมกัน
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTION = "app_data";
const MAIN_DOC   = "main_data";

// "2569-05-15" → "2569-05"
const toYM = (date) => (date ? date.substring(0, 7) : null);

// Attendance doc ID: "att_2569-05"
const attDocId = (ym) => `att_${ym}`;

const initData = () => ({
  appName: 'ห้องเรียนของคุณครูต้นฝน',
  teacherUsername: 'puntoy',
  password: '0000',
  term: 1,
  year: 2569,
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
  conduct: { presentScore: 1, absentScore: -1, lateGroup: 3, latePenalty: -1, minAttPct: 20 },
});

// Firebase ไม่รับ undefined หรือ function — ลบออกก่อนบันทึก
const sanitize = v => {
  if (v === undefined || typeof v === 'function') return null;
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(sanitize).filter(x => x != null);
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    const s = sanitize(val);
    if (s !== undefined) out[k] = s;
  }
  return out;
};

// แยก data เป็น main doc (ไม่มี attendance) + monthly attendance maps
const splitData = (fullData) => {
  const { attendance, attendanceMonths: _ignored, ...mainFields } = fullData;
  const byMonth = {};
  (attendance || []).forEach(rec => {
    const ym = toYM(rec.date);
    if (!ym) return;
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(rec);
  });
  const attendanceMonths = Object.keys(byMonth).sort();
  return { mainDoc: { ...mainFields, attendanceMonths }, byMonth };
};

// รวม main doc + monthly maps กลับเป็น data object ที่แอปใช้
const mergeData = (mainDoc, attCache) => ({
  ...mainDoc,
  attendance: Object.values(attCache).flat(),
});

export default function useFirestore() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');

  const dirtyRef    = useRef(false);
  const attCacheRef = useRef({});   // { "2569-05": [records…], … }

  // ─── Realtime listener on main doc ────────────────────────────────────────
  useEffect(() => {
    if (!db) {
      setError("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (db is null)");
      setLoading(false);
      return;
    }

    const mainRef   = doc(db, COLLECTION, MAIN_DOC);
    let   mounted   = true;

    const timeoutId = setTimeout(() => {
      setError("การเชื่อมต่อใช้เวลานานผิดปกติ กรุณาตรวจสอบอินเทอร์เน็ตหรือ Firebase Rules");
      setLoading(false);
    }, 10000);

    const unsubscribe = onSnapshot(
      mainRef,
      async (snap) => {
        clearTimeout(timeoutId);
        if (!mounted) return;

        let mainDoc;

        if (!snap.exists()) {
          // ─── ไม่มีข้อมูล: สร้าง default ────────────────────────────────
          const full = initData();
          const { mainDoc: md } = splitData(full);
          try {
            await setDoc(mainRef, sanitize(md));
            mainDoc = md;
          } catch (err) {
            setError("ไม่มีสิทธิ์สร้างข้อมูลเริ่มต้น (ติด Firebase Rules)");
            setLoading(false);
            return;
          }
        } else {
          mainDoc = snap.data();

          // ─── MIGRATION: ถ้าข้อมูลเก่าเก็บ attendance ไว้ใน main_data ──
          if (
            Array.isArray(mainDoc.attendance) &&
            mainDoc.attendance.length > 0 &&
            !mainDoc.attendanceMonths
          ) {
            console.log("🔄 Migrating attendance to monthly docs…");
            const { mainDoc: newMain, byMonth } = splitData({
              ...mainDoc,
              attendance: mainDoc.attendance,
            });
            // บันทึก monthly docs
            for (const [ym, records] of Object.entries(byMonth)) {
              await setDoc(
                doc(db, COLLECTION, attDocId(ym)),
                sanitize({ records })
              );
              attCacheRef.current[ym] = records;
            }
            // อัปเดต main_data โดยไม่มี attendance array
            await setDoc(mainRef, sanitize(newMain));
            mainDoc = newMain;
            console.log("✅ Migration complete");
          }
        }

        // ถ้ามี dirty write ค้างอยู่ ให้ใช้ local state ต่อไปก่อน
        if (dirtyRef.current) {
          setLoading(false);
          return;
        }

        // โหลด monthly attendance docs ที่ยังไม่อยู่ใน cache
        const months   = mainDoc.attendanceMonths || [];
        const toFetch  = months.filter(ym => !(ym in attCacheRef.current));
        for (const ym of toFetch) {
          try {
            const attSnap = await getDoc(doc(db, COLLECTION, attDocId(ym)));
            attCacheRef.current[ym] = attSnap.exists()
              ? (attSnap.data().records || [])
              : [];
          } catch (e) {
            console.warn("Could not load att doc", ym, e);
            attCacheRef.current[ym] = [];
          }
        }

        if (mounted) {
          setData(mergeData(mainDoc, attCacheRef.current));
          setLoading(false);
        }
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error("Firestore Error:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message);
        setLoading(false);
      }
    );

    return () => { mounted = false; clearTimeout(timeoutId); unsubscribe(); };
  }, []);

  // ─── Auto-save (debounced 500 ms) ──────────────────────────────────────────
  useEffect(() => {
    if (!data || !db || !dirtyRef.current) return;

    setSaveStatus('saving');
    const mainRef = doc(db, COLLECTION, MAIN_DOC);

    const timer = setTimeout(async () => {
      try {
        const { mainDoc, byMonth } = splitData(data);

        // บันทึก main doc
        await setDoc(mainRef, sanitize(mainDoc));

        // บันทึกเฉพาะ monthly docs ที่เปลี่ยนแปลง
        for (const [ym, records] of Object.entries(byMonth)) {
          const cached  = JSON.stringify(attCacheRef.current[ym] || []);
          const current = JSON.stringify(records);
          if (cached !== current) {
            await setDoc(
              doc(db, COLLECTION, attDocId(ym)),
              sanitize({ records })
            );
            attCacheRef.current[ym] = records;
          }
        }

        dirtyRef.current = false;
        setSaveStatus('saved');
        console.log("✅ Saved to Firebase");
      } catch (err) {
        console.error("❌ Firebase save error:", err);
        setSaveStatus('error');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data]);

  // ─── update ────────────────────────────────────────────────────────────────
  const update = useCallback((fn) => {
    dirtyRef.current = true;
    setData(prev => (prev ? fn(prev) : prev));
  }, []);

  // ─── systemActions (for SettingsPage / IOPage) ─────────────────────────────
  const systemActions = {
    exportJSON: () => data ? JSON.stringify(data, null, 2) : '{}',
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object') return false;
        // reset attendance cache ด้วยเพราะข้อมูลใหม่อาจมี attendance ที่ต่างออกไป
        attCacheRef.current = {};
        update(() => parsed);
        return true;
      } catch { return false; }
    },
    resetData: () => {
      attCacheRef.current = {};
      update(() => initData());
    },
  };

  return { data, loading, error, update, systemActions, saveStatus };
}
