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
import HomeroomPage from './pages/HomeroomPage';
import SettingsPage from './pages/SettingsPage';

export default function TeacherApp({ data, update, systemActions, saveStatus, onLogout }) {
  const [page,       setPage]       = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabOpen,    setFabOpen]    = useState(false);
  const [attInit,    setAttInit]    = useState(null);
  const [toastMsg,   setToastMsg]   = useState({ msg: '', type: 'info' });

  const toast   = useCallback((msg, type = 'info') => setToastMsg({ msg, type }), []);
  const openAtt = (type, classId) => { setAttInit({ type, classId }); setPage('att'); };

  useEffect(() => { if (page !== 'att') setAttInit(null); }, [page]);

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

      {page === 'home'     && <Dashboard     data={data} setPage={setPage} openAtt={openAtt}/>}
      {page === 'att'      && <AttendancePage data={data} update={update} initType={attInit?.type} initClass={attInit?.classId} toast={toast}/>}
      {page === 'score'    && <ScoresPage    data={data} update={update} toast={toast}/>}
      {page === 'stu'      && <StudentsPage  data={data} update={update} toast={toast}/>}
      {page === 'stat'     && <StatsPage     data={data}/>}
      {page === 'io'       && <IOPage        data={data} update={update} toast={toast}/>}
      {page === 'homeroom' && <HomeroomPage  data={data} update={update} role="teacher" currentStudentId={null} toast={toast}/>}
      {page === 'set'      && <SettingsPage  data={data} update={update} systemActions={systemActions} toast={toast}/>}

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
            style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#0284C7,#0369A1)', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(2,132,199,0.2)' }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>🌅 เช็คชื่อเข้าแถว</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{data.homeroom}</div>
          </button>

          <button
            onClick={() => { setFabOpen(false); openAtt('class'); }}
            style={{ padding: '16px 20px', background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(229,57,53,0.2)' }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>📚 ตารางสอน / เช็คชื่อคาบ</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>เปิดตารางเพื่อเช็คชื่อ</div>
          </button>

          <button
            onClick={() => { setFabOpen(false); setPage('score'); }}
            style={{ padding: '16px 20px', background: 'linear-gradient(135deg,#D97706,#B45309)', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(217,119,6,0.2)' }}
          >
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>📊 บันทึกคะแนน</div>
          </button>

          <button
            onClick={() => { setFabOpen(false); setPage('stu'); }}
            style={{ padding: '16px 20px', background: C.card, color: C.text, border: `1.5px solid ${C.border}`, borderRadius: 16, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
          >
            <div style={{ fontWeight: 700, fontSize: 16 }}>👤 จัดการนักเรียน</div>
          </button>
        </div>
      </Sheet>

      <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg({ msg: '', type: 'info' })}/>
    </div>
  );
}
