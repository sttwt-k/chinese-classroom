import React, { useState, useMemo, useEffect } from 'react';
import { C, STATUS, S_ORDER } from './constants';
import { sCard, sBtn, sInp } from './styles';
import { fmtDate, calcAttRate, calcConduct, getCatMax, getCatScore, hasCatScore, getSubjectGrade, getGrade, gradeColor, gradeBg } from './utils';
import Sheet from './components/Sheet';
import HomeroomPage from './pages/HomeroomPage';

export default function StudentApp({ data, update, student, onLogout }) {
  const [tab,      setTab]      = useState('scores');
  const [pinModal, setPinModal] = useState(false);
  const [pf,       setPf]       = useState({ cur: '', n1: '', n2: '' });
  const [pinErr,   setPinErr]   = useState('');

  const enrolledSubjects = useMemo(() => {
    return data.subjects.filter(subj => {
      const hasAtt   = data.attendance.some(a => a.type === 'class' && a.subjectId === subj.id && data.students.find(s => s.id === a.studentId)?.classId === student.classId);
      const hasScore = data.categories.some(c => c.subjectId === subj.id && data.scores.some(s => s.categoryId === c.id && data.students.find(x => x.id === s.studentId)?.classId === student.classId));
      return hasAtt || hasScore;
    });
  }, [data, student]);

  const [selSubjId, setSelSubjId] = useState(enrolledSubjects[0]?.id || '');

  useEffect(() => {
    if (enrolledSubjects.length > 0 && !enrolledSubjects.find(s => s.id === selSubjId)) {
      setSelSubjId(enrolledSubjects[0].id);
    }
  }, [enrolledSubjects, selSubjId]);

  if (!student) return <div style={{ padding: 40, textAlign: 'center', color: C.red }}>ไม่พบข้อมูล</div>;

  const isHomeroom = student.classId === data.homeroom;
  const subj       = enrolledSubjects.find(s => s.id === selSubjId);
  const cats       = subj ? data.categories.filter(c => c.subjectId === subj.id) : [];
  const mx         = cats.reduce((s, c) => s + getCatMax(c), 0);
  const tot        = cats.reduce((s, c) => s + getCatScore(student.id, c, data.scores, data.term, data.year), 0);
  const hasAny     = cats.some(c => hasCatScore(student.id, c, data.scores, data.term, data.year));
  const attRate    = calcAttRate(student.id, data.attendance, 'class', subj?.id);
  const morningRate= calcAttRate(student.id, data.attendance, 'morning');
  const grade      = hasAny && subj ? getSubjectGrade(student.id, subj, data.categories, data.scores, data.term, data.year, data.attendance, data.conduct) : null;
  const conduct    = calcConduct(student.id, data.attendance, data.conduct, subj?.id);
  const myAtt      = data.attendance.filter(a => a.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));

  const changePin = () => {
    if (pf.cur !== student.pin)          return setPinErr('PIN ปัจจุบันไม่ถูกต้อง');
    if (!/^\d{4}$/.test(pf.n1))          return setPinErr('PIN ต้องเป็นตัวเลข 4 หลัก');
    if (pf.n1 !== pf.n2)                 return setPinErr('ยืนยัน PIN ไม่ตรงกัน');
    update(prev => ({ ...prev, students: prev.students.map(s => s.id === student.id ? { ...s, pin: pf.n1 } : s) }));
    setPinModal(false);
    setPf({ cur: '', n1: '', n2: '' });
  };

  const tabs = [['scores', '📊 คะแนน'], ['att', '✓ เข้าเรียน'], ...(isHomeroom ? [['homeroom', '🏫 ประจำชั้น']] : [])];

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>
              {student.nickname || student.name}
              {student.chineseName && <span style={{ fontSize: 15, marginLeft: 8, opacity: 0.9 }}>{student.chineseName}</span>}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{student.id} · {student.classId} · เทอม {data.term}/{data.year}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPinModal(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔑</button>
            <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: 'white', borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            flex: 1, padding: '16px 8px', border: 'none', cursor: 'pointer', background: 'transparent',
            fontWeight: tab === v ? 700 : 500, color: tab === v ? C.red : C.muted,
            borderBottom: `3px solid ${tab === v ? C.red : 'transparent'}`,
            fontSize: 15, fontFamily: 'inherit', transition: 'all 0.2s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {/* ── Scores tab ── */}
        {tab === 'scores' && (
          <div>
            {enrolledSubjects.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>ยังไม่มีข้อมูลรายวิชาของคุณ</div>
              : <>
                  {enrolledSubjects.length > 1 && (
                    <select value={selSubjId} onChange={e => setSelSubjId(e.target.value)} style={{ ...sInp, marginBottom: 16, fontFamily: 'inherit', fontWeight: 600 }}>
                      {enrolledSubjects.map(s => <option key={s.id} value={s.id}>{s.code ? `${s.code} ${s.name}` : s.name}</option>)}
                    </select>
                  )}

                  {hasAny && (
                    <div style={{ ...sCard, background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', textAlign: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(183,28,28,0.25)' }}>
                      <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 500 }}>คะแนนรวม · {subj?.name}</div>
                      <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1, margin: '8px 0' }}>{tot}</div>
                      <div style={{ fontSize: 15, opacity: 0.9 }}>จาก {mx} ({mx > 0 ? Math.round(tot / mx * 100) : 0}%)</div>
                      {grade && (
                        <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', display: 'inline-block', padding: '6px 28px', borderRadius: 24, fontSize: 22, fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                          เกรด {grade.label}
                        </div>
                      )}
                    </div>
                  )}

                  {cats.map(cat => {
                    const cs  = getCatScore(student.id, cat, data.scores, data.term, data.year);
                    const cm  = getCatMax(cat);
                    const has = hasCatScore(student.id, cat, data.scores, data.term, data.year);
                    return (
                      <div key={cat.id} style={{ ...sCard, marginBottom: 12, padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: has ? 10 : 0 }}>
                          <span style={{ fontWeight: 700, fontSize: 16 }}>{cat.name}</span>
                          <span style={{ fontSize: 18, fontWeight: 700 }}>{has ? `${cs}/${cm}` : '-'}</span>
                        </div>
                        {has && cm > 0 && (
                          <div style={{ height: 8, borderRadius: 4, background: '#f3f4f6', overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', width: `${(cs / cm) * 100}%`, background: gradeColor(getGrade(cs, cm)), borderRadius: 4 }}/>
                          </div>
                        )}
                        {cat.subs?.map(sub => {
                          const sr = data.scores.find(x => x.studentId === student.id && x.categoryId === cat.id && x.subId === sub.id && x.term === data.term && x.year === data.year);
                          return (
                            <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0 6px 12px', borderTop: `1px dashed ${C.border}` }}>
                              <span style={{ color: C.muted, fontWeight: 500 }}>{sub.name}{sub.date ? ` · ${fmtDate(sub.date)}` : ''}</span>
                              <span style={{ fontWeight: 700 }}>{sr ? `${sr.score}/${sub.max}` : '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
            }
          </div>
        )}

        {/* ── Attendance tab ── */}
        {tab === 'att' && (
          <div>
            {enrolledSubjects.length === 0
              ? <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>ยังไม่มีข้อมูลการเข้าเรียน</div>
              : <>
                  {enrolledSubjects.length > 1 && (
                    <select value={selSubjId} onChange={e => setSelSubjId(e.target.value)} style={{ ...sInp, marginBottom: 16, fontFamily: 'inherit', fontWeight: 600 }}>
                      {enrolledSubjects.map(s => <option key={s.id} value={s.id}>{s.code ? `${s.code} ${s.name}` : s.name}</option>)}
                    </select>
                  )}

                  <div style={{ ...sCard, background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', textAlign: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(183,28,28,0.25)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>🌅 เข้าแถว</div>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{morningRate ?? '-'}%</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 500 }}>📚 {subj?.code || 'คาบ'}</div>
                        <div style={{ fontSize: 32, fontWeight: 700 }}>{attRate ?? '-'}%</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>จิตพิสัย: <b>{conduct.score > 0 ? '+' : ''}{conduct.score}</b></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
                      {S_ORDER.map(k => (
                        <div key={k} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 4px' }}>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{conduct.counts[k]}</div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{STATUS[k].label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {myAtt.slice(0, 60).map((a, i) => {
                    const sj = data.subjects.find(x => x.id === a.subjectId);
                    return (
                      <div key={i} style={{ ...sCard, marginBottom: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{fmtDate(a.date)}</div>
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                            {a.type === 'morning' ? '🌅 เข้าแถว' : `📚 ${sj?.code || sj?.name || 'คาบ'}${a.period ? ` คาบ ${a.period}` : ''}`}
                          </div>
                        </div>
                        <span style={{ background: STATUS[a.status]?.bg || '#94A3B8', color: 'white', fontSize: 13, padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
                          {STATUS[a.status]?.label}
                          {STATUS[a.status]?.custom && a.customScore !== undefined ? ` (${a.customScore > 0 ? '+' : ''}${a.customScore})` : ''}
                        </span>
                      </div>
                    );
                  })}
                </>
            }
          </div>
        )}

        {/* ── Homeroom tab ── */}
        {tab === 'homeroom' && isHomeroom && (
          <HomeroomPage data={data} update={update} role="student" currentStudentId={student.id} toast={msg => alert(msg)}/>
        )}
      </div>

      {/* PIN change sheet */}
      <Sheet open={pinModal} title="🔑 เปลี่ยนรหัสผ่าน PIN" onClose={() => { setPinModal(false); setPinErr(''); }}>
        <input type="password" placeholder="PIN ปัจจุบัน 4 หลัก" value={pf.cur} onChange={e => setPf(p => ({ ...p, cur: e.target.value }))} style={{ ...sInp, marginBottom: 12, textAlign: 'center', letterSpacing: 4, fontSize: 20 }} maxLength={4}/>
        <input type="password" placeholder="PIN ใหม่ 4 หลัก" value={pf.n1} onChange={e => setPf(p => ({ ...p, n1: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={{ ...sInp, marginBottom: 12, textAlign: 'center', letterSpacing: 4, fontSize: 20 }} maxLength={4}/>
        <input type="password" placeholder="ยืนยัน PIN ใหม่" value={pf.n2} onChange={e => setPf(p => ({ ...p, n2: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={{ ...sInp, marginBottom: 16, textAlign: 'center', letterSpacing: 4, fontSize: 20 }} maxLength={4}/>
        {pinErr && <div style={{ color: C.red, fontSize: 14, marginBottom: 16, padding: 10, background: '#FEF2F2', borderRadius: 8, textAlign: 'center' }}>{pinErr}</div>}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => { setPinModal(false); setPinErr(''); }} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
          <button onClick={changePin} style={{ ...sBtn(true), flex: 1 }}>บันทึกรหัสใหม่</button>
        </div>
      </Sheet>
    </div>
  );
}
