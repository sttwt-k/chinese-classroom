import React, { useState } from 'react';
import { C } from '../constants';
import { sCard, sBtn, sInp } from '../styles';

export default function LoginScreen({ data, onLogin }) {
  const [id,  setId]  = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const doLogin = () => {
    const tUser = data.teacherUsername || 'puntoy';
    const tPass = data.password || '0000';
    if (id.trim() === tUser && pin === tPass) {
      onLogin({ role:'teacher' });
    } else {
      const s = data.students.find(x => x.id === id.trim());
      if (s) {
        if (s.pin === pin) onLogin({ role:'student', id:s.id });
        else setErr('PIN ไม่ถูกต้อง');
      } else {
        setErr('ชื่อผู้ใช้ / รหัสนักเรียน หรือ รหัสผ่าน ไม่ถูกต้อง');
      }
    }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:`linear-gradient(160deg, #FFF5F5 0%, ${C.bg} 50%, #EFF6FF 100%)`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24,
    }}>
      {/* Logo + App name */}
      <div style={{ textAlign:'center', marginBottom:36 }}>
        <div style={{
          width:96, height:96, borderRadius:28,
          background:`linear-gradient(135deg,${C.red},${C.dark})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 18px',
          boxShadow:'0 12px 40px rgba(183,28,28,0.35)',
        }}>
          <span style={{ fontSize:56, color:'white', lineHeight:1 }}>中</span>
        </div>
        <div style={{ fontSize:26, fontWeight:800, color:C.text, letterSpacing:'-0.5px' }}>
          {data.appName || 'ห้องเรียนของคุณครูต้นฝน'}
        </div>
        <div style={{ color:C.muted, fontSize:14, marginTop:6 }}>ระบบจัดการการเรียนการสอน</div>
      </div>

      {/* Login card */}
      <div style={{
        ...sCard,
        width:'100%', maxWidth:360,
        padding:28,
        boxShadow:'0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.1)',
      }}>
        <div style={{ fontWeight:700, fontSize:17, color:C.text, marginBottom:22, textAlign:'center' }}>
          เข้าสู่ระบบ
        </div>
        <label style={{ fontSize:12, color:C.muted, marginBottom:6, display:'block', fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase' }}>
          ชื่อผู้ใช้ หรือ รหัสนักเรียน
        </label>
        <input
          placeholder="Username หรือ รหัสนักเรียน"
          value={id} onChange={e => setId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          style={{ ...sInp, marginBottom:16 }} autoFocus
        />
        <label style={{ fontSize:12, color:C.muted, marginBottom:6, display:'block', fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase' }}>
          รหัสผ่าน หรือ PIN 4 หลัก
        </label>
        <input
          type="password"
          placeholder="รหัสผ่าน หรือ PIN"
          value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doLogin()}
          style={{ ...sInp, marginBottom:20 }}
        />
        {err && (
          <div style={{
            color:'#B91C1C', fontSize:14, marginBottom:16, padding:'10px 14px',
            background:'#FEF2F2', borderRadius:10, textAlign:'center',
            border:'1px solid #FECACA',
          }}>
            ⚠ {err}
          </div>
        )}
        <button onClick={doLogin} style={{ ...sBtn(true), width:'100%', padding:'14px 0', fontSize:16 }}>
          เข้าสู่ระบบ →
        </button>
      </div>

      {/* Footer hint */}
      <div style={{ marginTop:24, color:C.muted, fontSize:13, textAlign:'center', opacity:0.7 }}>
        ครูเข้าได้ด้วย Username · นักเรียนเข้าด้วยรหัสนักเรียน
      </div>
    </div>
  );
}
