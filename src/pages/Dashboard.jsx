import React, { useMemo } from 'react';
import { C, STATUS, S_ORDER } from '../constants';
import { sCard, sBtn } from '../styles';
import { todayStr, fmtDate, calcAttRate, sortClasses } from '../utils';

export default function Dashboard({ data, setPage, openAtt }) {
  const today      = todayStr();
  const morningAtt = data.attendance.filter(a => a.date === today && a.type === 'morning');
  const hStu       = data.students.filter(s => s.classId === data.homeroom);

  const summary = useMemo(() => {
    const r = {};
    S_ORDER.forEach(k => r[k] = 0);
    morningAtt.forEach(a => { if (r[a.status] !== undefined) r[a.status]++; });
    return r;
  }, [morningAtt]);

  const atRisk = useMemo(() =>
    data.students
      .map(s => ({ stu:s, rate:calcAttRate(s.id, data.attendance) }))
      .filter(x => x.rate !== null && x.rate < data.conduct.minAttPct),
    [data]
  );

  return (
    <div style={{ padding:'20px 16px 100px' }}>

      {/* Greeting header */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontSize:24, fontWeight:800, color:C.text, letterSpacing:'-0.5px' }}>
          สวัสดี ครู! 👋
        </div>
        <div style={{ color:C.muted, fontSize:14, marginTop:3 }}>{fmtDate(today)}</div>
      </div>

      {/* Quick action cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <button
          onClick={() => openAtt('morning', data.homeroom)}
          style={{
            background:'linear-gradient(145deg,#0EA5E9,#0369A1)',
            color:'white', border:'none', borderRadius:20, padding:18,
            textAlign:'left', cursor:'pointer', fontFamily:'inherit',
            boxShadow:'0 6px 20px rgba(3,105,161,0.3)',
          }}
        >
          <div style={{ fontSize:26, marginBottom:8 }}>🌅</div>
          <div style={{ fontSize:12, opacity:0.85, marginBottom:3 }}>เช็คชื่อเข้าแถว</div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:'-0.3px' }}>{data.homeroom}</div>
          <div style={{
            fontSize:11, opacity:0.9, marginTop:8,
            background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 7px',
            display:'inline-block',
          }}>
            {morningAtt.length > 0 ? `✓ ${morningAtt.length}/${hStu.length} คน` : `${hStu.length} คน →`}
          </div>
        </button>

        <button
          onClick={() => openAtt('class')}
          style={{
            background:`linear-gradient(145deg,${C.red},${C.dark})`,
            color:'white', border:'none', borderRadius:20, padding:18,
            textAlign:'left', cursor:'pointer', fontFamily:'inherit',
            boxShadow:`0 6px 20px rgba(183,28,28,0.3)`,
          }}
        >
          <div style={{ fontSize:26, marginBottom:8 }}>📚</div>
          <div style={{ fontSize:12, opacity:0.85, marginBottom:3 }}>ตารางสอน / คาบเรียน</div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:'-0.3px' }}>เปิดตารางสอน</div>
          <div style={{
            fontSize:11, opacity:0.9, marginTop:8,
            background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 7px',
            display:'inline-block',
          }}>ดูคาบเรียนวันนี้ →</div>
        </button>
      </div>

      {/* Morning summary */}
      <div style={{ ...sCard, padding:18 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>
            🌅 เข้าแถววันนี้
          </div>
          <div style={{
            fontSize:12, fontWeight:600, color:C.blue,
            background:'#EFF6FF', borderRadius:8, padding:'3px 8px',
          }}>
            {data.homeroom} · {morningAtt.length}/{hStu.length}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {S_ORDER.map(k => (
            <div key={k} style={{
              background:C.bg, borderRadius:12, padding:'12px 6px',
              textAlign:'center',
              borderTop:`3px solid ${STATUS[k].bg}`,
              boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize:22, fontWeight:800, color:STATUS[k].bg, lineHeight:1 }}>{summary[k]}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:5, fontWeight:500 }}>{STATUS[k].short}</div>
            </div>
          ))}
        </div>
      </div>

      {/* At-risk students */}
      {atRisk.length > 0 && (
        <div style={{
          ...sCard,
          border:'1px solid #FECACA',
          background:'linear-gradient(135deg,#FEF2F2,#FFF5F5)',
          padding:18,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#B91C1C' }}>🚨 เสี่ยง มส.</div>
            <div style={{
              fontSize:12, fontWeight:700, color:'white',
              background:'#DC2626', borderRadius:20, padding:'2px 8px',
            }}>{atRisk.length} คน</div>
          </div>
          {atRisk.slice(0, 5).map(({ stu, rate }, i) => (
            <div key={stu.id} style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'9px 0', fontSize:14,
              borderTop: i > 0 ? '1px solid #FCA5A5' : 'none',
            }}>
              <span style={{ fontWeight:500, color:C.text }}>{stu.nickname || stu.name}</span>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:12, color:C.muted }}>{stu.classId}</span>
                <span style={{
                  color:'white', fontWeight:700, fontSize:12,
                  background:'#DC2626', borderRadius:8, padding:'2px 8px',
                }}>{rate}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation shortcuts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {[
          { id:'stu',  icon:'👥', label:'นักเรียน',  sub:`${data.students.length} คน` },
          { id:'stat', icon:'📈', label:'สถิติ',      sub:`${data.subjects.length} วิชา` },
          { id:'score',icon:'📊', label:'คะแนน',      sub:'บันทึกคะแนน' },
          { id:'io',   icon:'📥', label:'นำเข้า/ส่งออก', sub:'Excel / JSON' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              ...sCard, margin:0, cursor:'pointer', textAlign:'left', padding:16,
              display:'flex', flexDirection:'column', gap:4, border:`1px solid ${C.border}`,
            }}
          >
            <div style={{ fontSize:24 }}>{item.icon}</div>
            <div style={{ fontWeight:700, fontSize:14, color:C.text, marginTop:4 }}>{item.label}</div>
            <div style={{ fontSize:12, color:C.muted }}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
