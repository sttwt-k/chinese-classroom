import React, { useState, useEffect } from 'react';
import { C } from './constants';
import useFirestore from './useFirestore';
import LoginScreen from './pages/LoginScreen';
import TeacherApp  from './TeacherApp';
import StudentApp  from './StudentApp';

// ─── Backup Alert Banner ──────────────────────────────────────────────────────
function BackupAlertModal({ alert, onRestore, onDismiss }) {
  const ts  = new Date(alert.ts);
  const fmt = `${ts.toLocaleDateString('th-TH', { dateStyle: 'long' })} เวลา ${ts.toLocaleTimeString('th-TH', { timeStyle: 'short' })}`;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: 28,
        maxWidth: 380, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: '2px solid #FCA5A5',
      }}>
        <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#B91C1C', textAlign: 'center', marginBottom: 8 }}>
          พบข้อมูลสำรองในเครื่อง
        </div>
        <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 20, textAlign: 'center' }}>
          Firebase มีข้อมูลว่างเปล่า แต่พบข้อมูลสำรอง
          {alert.source === 'firestore' ? ' ใน Firebase Backup' : ' ในเครื่องนี้'}
          {' '}ที่บันทึกไว้เมื่อ <strong>{fmt}</strong>
          <br/>มีข้อมูลนักเรียน <strong>{alert.studentCount} คน</strong>
          {alert.source === 'firestore' && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>
              🛡️ สำรองจาก Firebase โดยตรง — ปลอดภัยที่สุด
            </div>
          )}
        </div>
        <button
          onClick={onRestore}
          style={{
            width: '100%', padding: '14px 0',
            background: 'linear-gradient(135deg,#16A34A,#15803D)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 10,
            boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
          }}
        >
          ✅ กู้คืนข้อมูลจากสำรอง
        </button>
        <button
          onClick={onDismiss}
          style={{
            width: '100%', padding: '12px 0',
            background: 'none', border: '1.5px solid #D1D5DB',
            color: '#6B7280', borderRadius: 12,
            fontSize: 14, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ไม่ต้องกู้คืน (ใช้ข้อมูลใหม่)
        </button>
        <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10 }}>
          หากเลือก "ไม่ต้องกู้คืน" ข้อมูลสำรองจะถูกลบทิ้ง
        </div>
      </div>
    </div>
  );
}

export default function AppRouter() {
  const { data, loading, error, update, systemActions, saveStatus, backupAlert, restoreFromBackup } = useFirestore();
  const [alertDismissed, setAlertDismissed] = useState(false);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chinese_app_user')); }
    catch { return null; }
  });

  const handleLogin  = userData => { setUser(userData); localStorage.setItem('chinese_app_user', JSON.stringify(userData)); };
  const handleLogout = ()       => { setUser(null);     localStorage.removeItem('chinese_app_user'); };

  // Load Kanit font once
  useEffect(() => {
    const l = document.createElement('link');
    l.rel  = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(l);
    document.body.style.fontFamily      = 'Kanit, sans-serif';
    document.body.style.backgroundColor = '#F8FAFC';
    document.body.style.margin          = '0';
  }, []);

  const handleRestore = () => {
    const source = backupAlert?.source || 'local';
    restoreFromBackup(source);
    setAlertDismissed(false);
  };
  const handleDismissAlert = () => {
    // Clear the backup so user isn't asked again
    try { localStorage.removeItem('chinese_classroom_backup_v2'); } catch {}
    setAlertDismissed(true);
  };

  // Loading screen
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <div style={{ fontSize: 64, color: C.red }}>中</div>
        <div style={{ color: C.muted, marginTop: 12, fontWeight: 500 }}>กำลังเชื่อมต่อฐานข้อมูล...</div>
      </div>
    );
  }

  // Error screen (hard error from Firestore)
  if (error && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.red }}>
        ข้อผิดพลาด: ไม่สามารถโหลดข้อมูลจาก Firebase ได้<br/>
        กรุณาตรวจสอบแท็บ Rules ใน Firebase ของคุณ
      </div>
    );
  }

  // Backup alert: Firebase is empty but local backup exists — show restore modal
  if (backupAlert && !alertDismissed) {
    return (
      <>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
          <div style={{ fontSize: 64, color: C.red }}>中</div>
        </div>
        <BackupAlertModal
          alert={backupAlert}
          onRestore={handleRestore}
          onDismiss={handleDismissAlert}
        />
      </>
    );
  }

  // No data at all
  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: C.red }}>
        ข้อผิดพลาด: ไม่สามารถโหลดข้อมูลจาก Firebase ได้<br/>
        กรุณาตรวจสอบแท็บ Rules ใน Firebase ของคุณ
      </div>
    );
  }

  // Login
  if (!user) return <LoginScreen data={data} onLogin={handleLogin}/>;

  // Teacher
  if (user.role === 'teacher') {
    return <TeacherApp data={data} update={update} systemActions={systemActions} saveStatus={saveStatus} onLogout={handleLogout}/>;
  }

  // Student
  const studentData = data.students.find(s => s.id === user.id);
  if (!studentData) { handleLogout(); return null; }

  return <StudentApp data={data} update={update} student={studentData} onLogout={handleLogout}/>;
}
