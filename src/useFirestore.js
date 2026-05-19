import { useState, useEffect, useRef, useCallback } from "react";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db, authReady } from "./firebase";

// ─── Document layout ─────────────────────────────────────────────────────────
//  app_data/main_data          ← students, subjects, scores, settings, timetable…
//  app_data/att_2569-05        ← attendance records for year-month 2569-05
//  …
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTION  = "app_data";
const MAIN_DOC    = "main_data";
const BACKUP_KEY  = "chinese_classroom_backup_v2"; // localStorage key

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
  calendar: [],
});

// ─── LocalStorage backup ──────────────────────────────────────────────────────
// บันทึก snapshot ลง localStorage หลังทุก save สำเร็จ (ไม่รวม attendance เพราะใหญ่)
const saveLocalBackup = (fullData) => {
  try {
    const { attendance: _att, ...rest } = fullData;
    const payload = JSON.stringify({ ts: Date.now(), data: rest });
    // ถ้าข้อมูลใหญ่เกิน ~4 MB ให้ตัด profiles/savings ออกก่อน
    if (payload.length > 4_000_000) {
      const slim = { ...rest, profiles: {}, savings: {} };
      localStorage.setItem(BACKUP_KEY, JSON.stringify({ ts: Date.now(), data: slim, slim: true }));
    } else {
      localStorage.setItem(BACKUP_KEY, payload);
    }
  } catch (e) {
    console.warn("LocalStorage backup failed:", e);
  }
};

const loadLocalBackup = () => {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw); // { ts, data, slim? }
  } catch { return null; }
};

// ─── Firebase ไม่รับ undefined หรือ function ──────────────────────────────────
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

// ─── ตรวจว่า doc นี้เป็น "ข้อมูลว่างเปล่า" (เพิ่งสร้างใหม่) หรือเปล่า
const isEmptyDoc = (d) =>
  !d || ((!d.students || d.students.length === 0) && (!d.subjects || d.subjects.length <= 1));

export default function useFirestore() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [saveStatus,  setSaveStatus]  = useState('idle');
  // แจ้งเตือนเมื่อพบว่าข้อมูลใน Firebase ว่างเปล่าแต่มี backup ใน localStorage
  const [backupAlert, setBackupAlert] = useState(null); // null | { ts, studentCount }

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
    let   unsubscribe = () => {};

    const timeoutId = setTimeout(() => {
      setError("การเชื่อมต่อใช้เวลานานผิดปกติ กรุณาตรวจสอบอินเทอร์เน็ตหรือ Firebase Rules");
      setLoading(false);
    }, 10000);

    // รอ anonymous auth สำเร็จก่อน แล้วค่อยเริ่ม Firestore listener
    // ป้องกัน permission-denied ก่อน token พร้อม
    authReady.then((user) => {
      if (!mounted) return;
      if (!user) {
        clearTimeout(timeoutId);
        setError("ไม่สามารถยืนยันตัวตนกับ Firebase ได้ กรุณา Enable Anonymous Auth ใน Firebase Console");
        setLoading(false);
        return;
      }
      startListener();
    });

    const startListener = () => {
    unsubscribe = onSnapshot(
      mainRef,
      async (snap) => {
        clearTimeout(timeoutId);
        if (!mounted) return;

        let mainDoc;

        if (!snap.exists()) {
          // ── กันกันไว้: ตรวจซ้ำด้วย getDoc ก่อนเขียน initData ──────────────
          // onSnapshot บางครั้งแจ้ง exists=false ระหว่าง network glitch
          // ถ้า getDoc ยืนยันว่าไม่มีจริง ค่อยสร้าง default
          let confirmed = false;
          try {
            const confirmSnap = await getDoc(mainRef);
            confirmed = !confirmSnap.exists();
            if (!confirmed) {
              // document มีอยู่จริง — ใช้ข้อมูลจาก confirmSnap แทน
              console.warn("⚠️ onSnapshot said no-exist but getDoc found document — using getDoc data");
              mainDoc = confirmSnap.data();
            }
          } catch (e) {
            // getDoc ล้มเหลว — ไม่เขียน initData ทับ
            console.error("getDoc confirm failed:", e);
            if (mounted) { setLoading(false); }
            return;
          }

          if (confirmed) {
            // ── ตรวจ localStorage backup ก่อนเขียน initData ────────────────
            const backup = loadLocalBackup();
            if (backup?.data?.students?.length > 0) {
              // มี backup ที่มีข้อมูลจริง — แจ้งเตือนแทนการเขียนทับ
              console.warn("⚠️ Firebase doc missing but local backup exists — NOT writing initData");
              if (mounted) {
                setBackupAlert({ ts: backup.ts, studentCount: backup.data.students.length });
                setLoading(false);
              }
              return;
            }

            // ไม่มี backup — สร้าง default ใหม่จริงๆ
            const full = initData();
            const { mainDoc: md } = splitData(full);
            try {
              await setDoc(mainRef, sanitize(md));
              mainDoc = md;
              console.log("✅ Created new default document");
            } catch (err) {
              setError("ไม่มีสิทธิ์สร้างข้อมูลเริ่มต้น (ติด Firebase Rules)");
              setLoading(false);
              return;
            }
          }
        } else {
          mainDoc = snap.data();

          // ── MIGRATION: ถ้าข้อมูลเก่าเก็บ attendance ไว้ใน main_data ────────
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
            for (const [ym, records] of Object.entries(byMonth)) {
              await setDoc(
                doc(db, COLLECTION, attDocId(ym)),
                sanitize({ records })
              );
              attCacheRef.current[ym] = records;
            }
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
        const months  = mainDoc.attendanceMonths || [];
        const toFetch = months.filter(ym => !(ym in attCacheRef.current));
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
          const merged = mergeData(mainDoc, attCacheRef.current);

          // ── ตรวจว่า Firebase data ว่างเปล่าแต่มี backup ────────────────────
          if (isEmptyDoc(mainDoc)) {
            // ลำดับ 1: ตรวจ localStorage
            const localBackup = loadLocalBackup();
            if (localBackup?.data?.students?.length > 0) {
              console.warn("⚠️ Firebase has empty data but localStorage backup has students — showing alert");
              setBackupAlert({ ts: localBackup.ts, studentCount: localBackup.data.students.length, source: 'local' });
            } else {
              // ลำดับ 2: ตรวจ Firestore backup_latest
              try {
                const fbBackupSnap = await getDoc(doc(db, COLLECTION, 'backup_latest'));
                if (fbBackupSnap.exists()) {
                  const fbBackup = fbBackupSnap.data();
                  if (fbBackup._studentCount > 0) {
                    console.warn("⚠️ Firebase has empty data but backup_latest has students — showing alert");
                    const backupTs = fbBackup._backupAt ? new Date(fbBackup._backupAt).getTime() : Date.now();
                    setBackupAlert({ ts: backupTs, studentCount: fbBackup._studentCount, source: 'firestore' });
                  }
                }
              } catch (e) {
                console.warn("Could not check backup_latest:", e.message);
              }
            }
          }

          setData(merged);
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
    }; // end startListener

    return () => { mounted = false; clearTimeout(timeoutId); unsubscribe(); };
  }, []);

  // ─── Auto-save (debounced 800 ms) ──────────────────────────────────────────
  useEffect(() => {
    if (!data || !db || !dirtyRef.current) return;

    // ป้องกัน: ไม่ save ถ้า students หายหมดแล้วมี backup อยู่
    // (แสดงว่ามีบางอย่างผิดปกติ)
    if (data.students?.length === 0) {
      const backup = loadLocalBackup();
      if (backup?.data?.students?.length > 0) {
        console.warn("⚠️ Save blocked: students is empty but backup exists");
        setSaveStatus('error');
        return;
      }
    }

    setSaveStatus('saving');
    const mainRef = doc(db, COLLECTION, MAIN_DOC);

    const timer = setTimeout(async () => {
      try {
        const { mainDoc, byMonth } = splitData(data);

        await setDoc(mainRef, sanitize(mainDoc));

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

        // ── บันทึก backup ลง localStorage หลัง save สำเร็จ ────────────────
        saveLocalBackup(data);

        // ── บันทึก backup ลง Firestore (app_data/backup_latest) ─────────────
        // ต่างจาก main_data ตรงที่ไม่มี attendanceMonths — เป็น snapshot ล้วนๆ
        // protected โดย rule เดียวกัน (delete: false) → กู้คืนได้แม้ main_data หาย
        try {
          const backupRef = doc(db, COLLECTION, 'backup_latest');
          const { mainDoc: backupDoc } = splitData(data);
          await setDoc(backupRef, sanitize({
            ...backupDoc,
            _backupAt: new Date().toISOString(),
            _studentCount: data.students?.length || 0,
          }));
        } catch (backupErr) {
          // backup ล้มเหลวไม่ให้ขัดการทำงานหลัก
          console.warn("⚠️ Firestore backup failed (non-critical):", backupErr.message);
        }

        console.log("✅ Saved to Firebase + localStorage + Firestore backup");
      } catch (err) {
        console.error("❌ Firebase save error:", err);
        setSaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [data]);

  // ─── update ────────────────────────────────────────────────────────────────
  const update = useCallback((fn) => {
    dirtyRef.current = true;
    setData(prev => (prev ? fn(prev) : prev));
  }, []);

  // ─── restoreFromBackup (localStorage หรือ Firestore backup_latest) ──────────
  const restoreFromBackup = useCallback(async (source = 'local') => {
    if (source === 'firestore') {
      // ดึงจาก Firestore backup_latest
      try {
        const fbSnap = await getDoc(doc(db, COLLECTION, 'backup_latest'));
        if (!fbSnap.exists()) return false;
        const fbData = fbSnap.data();
        // ลบ meta fields
        const { _backupAt, _studentCount, ...restoredMain } = fbData;
        attCacheRef.current = {};
        dirtyRef.current = true;
        setData({ ...restoredMain, attendance: [] });
        setBackupAlert(null);
        console.log("✅ Restored from Firestore backup_latest");
        return true;
      } catch (e) {
        console.error("Restore from Firestore backup failed:", e);
        return false;
      }
    }

    // default: localStorage
    const backup = loadLocalBackup();
    if (!backup?.data) return false;
    attCacheRef.current = {};
    const restored = { ...backup.data, attendance: [] };
    dirtyRef.current = true;
    setData(restored);
    setBackupAlert(null);
    console.log("✅ Restored from localStorage backup");
    return true;
  }, []);

  // ─── systemActions ─────────────────────────────────────────────────────────
  const systemActions = {
    exportJSON: () => data ? JSON.stringify(data, null, 2) : '{}',
    importJSON: (json) => {
      try {
        const parsed = JSON.parse(json);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) return false;
        // validation: ต้องมี field หลักครบ
        if (!Array.isArray(parsed.students)) return false;
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

  return { data, loading, error, update, systemActions, saveStatus, backupAlert, restoreFromBackup };
}
