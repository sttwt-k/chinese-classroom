import React, { useState, useEffect } from 'react';
import { C } from './constants';
import useFirestore from './useFirestore';
import LoginScreen from './pages/LoginScreen';
import TeacherApp  from './TeacherApp';
import StudentApp  from './StudentApp';

export default function AppRouter() {
  const { data, loading, update, systemActions, saveStatus } = useFirestore();

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

  // Loading screen
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg }}>
        <div style={{ fontSize: 64, color: C.red }}>中</div>
        <div style={{ color: C.muted, marginTop: 12, fontWeight: 500 }}>กำลังเชื่อมต่อฐานข้อมูล...</div>
      </div>
    );
  }

  // Error screen
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
