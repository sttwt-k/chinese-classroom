import React, { useState, useCallback, useEffect } from 'react';
import { C, NAV } from './constants';
import { sBtn } from './styles';
import TopBar   from './components/TopBar';
import Drawer   from './components/Drawer';
import Toast    from './components/Toast';
import Sheet    from './components/Sheet';

import Dashboard    from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import ScoresPage   from './pages/ScoresPage';
import StudentsPage from './pages/StudentsPage';
import StatsPage    from './pages/StatsPage';
import IOPage       from './pages/IOPage';
import HomeroomPage    from './pages/HomeroomPage';
import CalendarPage    from './pages/CalendarPage';
import ReportCardPage  from './pages/ReportCardPage';
import SettingsPage    from './pages/SettingsPage';

const BACKUP_KEY = 'cc_last_backup';

function needsBackupReminder() {
  const last = localStorage.getItem(BACKUP_KEY);
  if (!last) return true;
  const days = (Date.now() - new Date(last).getTime()) / 86400000;
  return days >= 7;
}

export default function TeacherApp({ data, update, systemActions, saveStatus, onLogout }) {
  const [page,       setPage]       = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen,    setFabOpen]    = useState(false);
  const [attInit,    setAttInit]    = useState(null);
  const [toastMsg,   setToastMsg]   = useState({ msg: '', type: 'info' });
  const [backupBanner, setBackupBanner] = useState(false);

  const toast   = useCallback((msg, type = 'info') => setToastMsg({ msg, type }), []);
  const openAtt = (type, classId) => { setAttInit({ type, classId }); setPage('att'); };

  useEffect(() => { if (page !== 'att') setAttInit(null); }, [page]);

  // แสดง banner เตือนสำรองข้อมูลถ้าเกิน 7 วัน
  useEffect(() => {
    const timer = setTimeout(() => {
      if (needsBackupReminder()) setBackupBanner(true);
    }, 3000); // รอ 3 วิให้ app โหลดเสร็จก่อน
    return () => clearTimeout(timer);
  }, []);

  const pageObj = NAV.find(n => n.id === page);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <TopBar
        onMenu={() => setDrawerOpen(true)}
        onLogout={onLogout}
        label={pageObj ? `${pageObj.icon} ${pageObj.label}` : ''}
        appName={data.appName || 'ห้องเรียนของคุณครูต้นฝน'}
        saveStatus={saveStatus}
      />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} current={page} onNav={setPage} data={data}/>

      {/* Backup reminder banner */}
      {backupBanner && (
        <div style={{
          background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
          borderBottom: '2px solid #F59E0B',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: '#78350F', fontWeight: 600, flex: 1 }}>
            💾 ยังไม่ได้สำรองข้อมูลนานกว่า 7 วัน — แนะนำให้สำรองไว้เพื่อความปลอดภัย
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => { setPage('io'); setBackupBanner(false); }}
              style={{ padding: '6px 14px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              สำรองเดี๋ยวนี้
            </button>
            <button
              onClick={() => setBackupBanner(false)}
              style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.1)', color: '#78350F', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {page === 'home'     && <Dashboard     data={data} setPage={setPage} openAtt={openAtt}/>}
      {page === 'att'      && <AttendancePage data={data} update={update} initType={attInit?.type} initClass={attInit?.classId} toast={toast}/>}
      {page === 'score'    && <ScoresPage    data={data} update={update} toast={toast}/>}
      {page === 'stu'      && <StudentsPage  data={data} update={update} toast={toast}/>}
      {page === 'stat'     && <StatsPage     data={data}/>}
      {page === 'io'       && <IOPage        data={data} update={update} toast={toast}/>}
      {page === 'homeroom' && <HomeroomPage   data={data} update={update} role="teacher" currentStudentId={null} toast={toast}/>}
      {page === 'cal'      && <CalendarPage   data={data} update={update} role="teacher" toast={toast}/>}
      {page === 'report'   && <ReportCardPage data={data}/>}
      {page === 'set'      && <SettingsPage   data={data} update={update} systemActions={systemActions} toast={toast}/>}

      {/* FAB */}
      <button
        onClick={() => setFabOpen(true)}
        style={{
          position: 'fixed', bottom: 24, right: 20,
          width: 64, height: 64, borderRadius: 32,
          background: `linear-gradient(135deg,${C.red},${C.dark})`,
          color: 'white', border: 'none', fontSize: 32, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(183,28,28,0.4)', zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
      >+</button>

      {/* FAB Sheet */}
      <Sheet open={fabOpen} title="➕ จัดการด่วน" onClose={() => setFabOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => { setFabOpen(false); openAtt('morning', data.homeroom); }}
            style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#0284C7,#0369A1)', color: 'white', bord