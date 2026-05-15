import React, { useState, useEffect, useMemo } from 'react';
import { C, STATUS, S_ORDER, PERIODS, DAYS } from '../constants';
import { sCard, sBtn, sInp, sTab } from '../styles';
import { todayStr, sortClasses } from '../utils';
import Sheet from '../components/Sheet';

export default function AttendancePage({ data, update, initType, initClass, toast }) {
  const [tab,       setTab]       = useState(initType || 'morning');
  const [date,      setDate]      = useState(todayStr());
  const [cls,       setCls]       = useState(initClass || (tab === 'morning' ? data.homeroom : ''));
  const [subjId,    setSubjId]    = useState(data.subjects[0]?.id || '');
  const [period,    setPeriod]    = useState(1);
  const [scoreModal, setScoreModal] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(null);
  const [ttForm,    setTtForm]    = useState({ subjId:'', classId:'' });
  const [ttView,    setTtView]    = useState(tab === 'class');

  useEffect(() => { if (tab === 'morning') setCls(data.homeroom); }, [tab, data.homeroom]);

  const classesHave = sortClasses(data.classes.filter(c => data.students.some(s => s.classId === c)));
  const students    = data.students
    .filter(s => s.classId === cls)
    .sort((a, b) => (a.number || 999) - (b.number || 999) || (a.name || '').localeCompare(b.name || '', 'th'));
  const subj        = data.subjects.find(s => s.id === subjId);

  const checkedPeriods = useMemo(() => {
    if (tab !== 'class' || !cls || !subjId) return [];
    const ps = new Set();
    data.attendance
      .filter(a => a.date === date && a.type === 'class' && a.subjectId === subjId && students.some(s => s.id === a.studentId))
      .forEach(a => { if (a.period) ps.add(a.period); });
    return Array.from(ps).sort();
  }, [data.attendance, date, tab, cls, subjId, students]);

  const getRec = id => data.attendance.find(a =>
    a.date === date && a.type === tab && a.studentId === id &&
    (tab === 'morning' || (a.subjectId === subjId && a.period === period))
  );

  const saveStatus = (id, status, customScore, note) => {
    update(prev => {
      const a = prev.attendance.filter(x =>
        !(x.date === date && x.type === tab && x.studentId === id &&
          (tab === 'morning' || (x.subjectId === subjId && x.period === period)))
      );
      a.push({
        date, type:tab, studentId:id, status,
        ...(tab === 'class' ? { subjectId:subjId, period } : {}),
        ...(customScore !== undefined ? { customScore } : {}),
        ...(note ? { note } : {}),
      });
      return { ...prev, attendance:a };
    });
  };

  // กดซ้ำเพื่อยกเลิกการเช็คชื่อ
  const setStatus = (id, status) => {
    const rec = getRec(id);
    if (rec && rec.status === status) {
      update(prev => ({ ...prev, attendance:prev.attendance.filter(x => x !== rec) }));
      return;
    }
    if (STATUS[status]?.custom && tab === 'class') {
      setScoreModal({ studentId:id, status, customScore:rec?.customScore ?? 0, note:rec?.note || '' });
    } else {
      saveStatus(id, status);
    }
  };

  const markAll = status => {
    if (STATUS[status]?.custom) return;
    update(prev => {
      let a = prev.attendance.filter(x =>
        !(x.date === date && x.type === tab && students.some(s => s.id === x.studentId) &&
          (tab === 'morning' || (x.subjectId === subjId && x.period === period)))
      );
      students.forEach(s => a.push({
        date, type:tab, studentId:s.id, status,
        ...(tab === 'class' ? { subjectId:subjId, period } : {}),
      }));
      return { ...prev, attendance:a };
    });
    toast(`${STATUS[status].label}ทุกคน ✓`, 'success');
  };

  const counted = st => students.filter(s => getRec(s.id)?.status === st).length;

  // ===== TIMETABLE HANDLERS =====
  const handleCellClick = (d, p) => {
    const key = `${d}-${p.id}`;
    const block = data.timetable?.[key];
    if (block && block.classId && block.subjId) {
      setSubjId(block.subjId);
      setCls(block.classId);
      setPeriod(p.id);
      const now    = new Date();
      const dayIdx = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'].indexOf(d);
      const diff   = dayIdx - now.getDay();
      const target = new Date(now);
      target.setDate(now.getDate() + diff);
      setDate(target.toISOString().split('T')[0]);
      setTtView(false);
    } else {
      setTtForm({ subjId:block?.subjId || data.subjects[0]?.id || '', classId:block?.classId || '' });
      setSheetOpen({ type:'tt_edit', day:d, period:p });
    }
  };

  const handleDragStart = (e, day, period) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ day, period:period.id }));
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd   = e => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver  = e => { e.preventDefault(); e.currentTarget.style.background = '#FEF2F2'; };
  const handleDragLeave = e => { e.currentTarget.style.background = ''; };
  const handleDrop = (e, targetDay, targetPeriod) => {
    e.preventDefault(); e.currentTarget.style.background = '';
    try {
      const src    = JSON.parse(e.dataTransfer.getData('text/plain'));
      const srcKey = `${src.day}-${src.period}`;
      const tgtKey = `${targetDay}-${targetPeriod.id}`;
      if (srcKey === tgtKey) return;
      update(prev => {
        const newTt   = { ...(prev.timetable || {}) };
        const srcBlock = newTt[srcKey];
        const tgtBlock = newTt[tgtKey];
        if (srcBlock) newTt[tgtKey] = srcBlock; else delete newTt[tgtKey];
        if (tgtBlock) newTt[srcKey] = tgtBlock; else delete newTt[srcKey];
        return { ...prev, timetable:newTt };
      });
      toast('สลับคาบเรียนแล้ว', 'success');
    } catch {}
  };

  return (
    <div style={{ padding:'14px 14px 100px' }}>
      <div style={{ fontWeight:700, fontSize:20, marginBottom:16, color:C.text, letterSpacing:'-0.5px' }}>
        ✓ เช็คชื่อเข้าเรียน
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, background:'white', padding:6, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => { setTab('morning'); setTtView(false); }} style={{ ...sTab(tab === 'morning'), flex:1 }}>🌅 เข้าแถว</button>
        <button onClick={() => { setTab('class');   setTtView(true);  }} style={{ ...sTab(tab === 'class'),   flex:1 }}>📚 ตารางสอน</button>
      </div>

      {/* ===== TIMETABLE VIEW ===== */}
      {tab === 'class' && ttView && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>ตารางสอนประจำสัปดาห์</div>
            <div style={{ fontSize:12, color:C.muted }}>กดเพื่อเช็คชื่อ หรือลากสลับวิชาได้</div>
          </div>
          <div style={{ overflowX:'auto', background:'white', borderRadius:12, border:`1px solid ${C.border}`, boxShadow:'0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ display:'inline-flex', flexDirection:'column', minWidth:800 }}>
              {/* Header row */}
              <div style={{ display:'flex', background:C.light, borderBottom:`2px solid ${C.red}` }}>
                <div style={{ width:60, padding:10, fontWeight:700, textAlign:'center', borderRight:`1px solid ${C.border}`, fontSize:13 }}>วัน/คาบ</div>
                {PERIODS.map(p => (
                  <div key={p.id} style={{ flex:1, padding:8, textAlign:'center', borderRight:`1px solid ${C.border}` }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{p.id}</div>
                    <div style={{ fontSize:10, color:C.muted }}>{p.time}</div>
                  </div>
                ))}
              </div>
              {/* Day rows */}
              {DAYS.map(d => (
                <div key={d} style={{ display:'flex', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:60, padding:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', borderRight:`1px solid ${C.border}`, background:'#F8FAFC', fontSize:14 }}>{d}</div>
                  {PERIODS.map(p => {
                    const key   = `${d}-${p.id}`;
                    const block = data.timetable?.[key];
                    if (p.isLunch) return (
                      <div key={p.id} style={{ flex:1, background:'#F1F5F9', borderRight:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:12, writingMode:'vertical-rl', transform:'rotate(180deg)' }}>
                        พักกลางวัน
                      </div>
                    );
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleCellClick(d, p)}
                        draggable
                        onDragStart={e => handleDragStart(e, d, p)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, d, p)}
                        style={{
                          position:'relative', flex:1, padding:6,
                          borderRight:`1px solid ${C.border}`, cursor:'pointer',
                          minHeight:64, display:'flex', flexDirection:'column',
                          justifyContent:'center', alignItems:'center',
                          background:block ? '#FFF5F5' : 'white', transition:'background 0.2s',
                        }}
                      >
                        {block ? (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                update(prev => { const newTt = { ...(prev.timetable || {}) }; delete newTt[key]; return { ...prev, timetable:newTt }; });
                                toast('ลบวิชาในคาบนี้แล้ว', 'success');
                              }}
                              style={{ position:'absolute', top:0, right:0, background:'transparent', border:'none', color:'#ef4444', fontSize:18, cursor:'pointer', padding:'2px 6px', lineHeight:1 }}
                            >×</button>
                            <div style={{ fontWeight:700, fontSize:13, color:C.red, textAlign:'center', lineHeight:1.2 }}>
                              {data.subjects.find(s => s.id === block.subjId)?.code || 'วิชา'}
                            </div>
                            <div style={{ fontSize:13, fontWeight:600, marginTop:4 }}>{block.classId}</div>
                          </>
                        ) : (
                          <div style={{ fontSize:20, color:'#CBD5E1' }}>+</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== ATTENDANCE FORM ===== */}
      {(!ttView || tab === 'morning') && (
        <>
          <div style={sCard}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>
                {tab === 'class' ? '📌 เช็คชื่อรายคาบ' : '🌅 เช็คชื่อเข้าแถว'}
              </div>
              {tab === 'class' && (
                <button onClick={() => setTtView(true)} style={{ fontSize:13, color:C.red, background:'none', border:'none', fontWeight:600, cursor:'pointer' }}>
                  ← กลับไปตารางสอน
                </button>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:tab === 'class' ? 12 : 0 }}>
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>วันที่</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={sInp}/>
              </div>
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ห้องเรียน</div>
                {tab === 'morning' ? (
                  <input value={data.homeroom} disabled style={{ ...sInp, background:C.light, fontWeight:700, color:C.red }}/>
                ) : (
                  <button onClick={() => setSheetOpen({ type:'class' })} style={{ ...sInp, textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', background:'white' }}>
                    <span style={{ fontWeight:cls ? 700 : 400 }}>{cls || '-- เลือกห้อง --'}</span>
                    <span style={{ fontSize:12, color:C.muted }}>▼</span>
                  </button>
                )}
              </div>
            </div>

            {tab === 'class' && (
              <div style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>รายวิชา</div>
                  <button onClick={() => setSheetOpen({ type:'subj' })} style={{ ...sInp, textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', background:'white' }}>
                    <span style={{ fontWeight:subjId ? 700 : 400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {subj ? `${subj.code || ''} ${subj.name}` : '-- เลือกวิชา --'}
                    </span>
                    <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>▼</span>
                  </button>
                </div>
                <div style={{ flexShrink:0 }}>
                  <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>
                    คาบ {checkedPeriods.length > 0 && <span style={{ color:'#16a34a' }}>✓{checkedPeriods.join(',')}</span>}
                  </div>
                  <button onClick={() => setSheetOpen({ type:'period' })} style={{ ...sInp, textAlign:'center', background:'white', fontWeight:700, width:70 }}>
                    {period} <span style={{ fontSize:10, color:C.muted }}>▼</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {cls && students.length > 0 && (
            <>
              <div style={{ ...sCard, padding:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, fontSize:13, fontWeight:600, flexWrap:'wrap', gap:8 }}>
                  {S_ORDER.map(k => <span key={k} style={{ color:STATUS[k].bg }}>{STATUS[k].short} <b>{counted(k)}</b></span>)}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => markAll('present')} style={{ flex:1, padding:10, borderRadius:10, border:'1px solid #16a34a', background:'#dcfce7', color:'#16a34a', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>✓ มาทุกคน</button>
                  <button onClick={() => markAll('absent')}  style={{ flex:1, padding:10, borderRadius:10, border:'1px solid #dc2626', background:'#fee2e2', color:'#dc2626', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>✗ ขาดทุกคน</button>
                </div>
              </div>

              {students.map((stu, i) => {
                const rec = getRec(stu.id);
                return (
                  <div key={stu.id} style={{ ...sCard, marginBottom:10, padding:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div>
                        <span style={{ fontSize:13, color:C.muted, marginRight:8 }}>{stu.number || i + 1}.</span>
                        <span style={{ fontWeight:700, fontSize:16, color:C.text }}>{stu.nickname || stu.name}</span>
                        {stu.chineseName && <span style={{ fontSize:14, color:'#0284C7', marginLeft:8 }}>{stu.chineseName}</span>}
                        <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{stu.id}</div>
                      </div>
                      {rec && (
                        <span style={{ background:STATUS[rec.status].bg, color:'white', fontSize:13, padding:'4px 12px', borderRadius:20, fontWeight:700 }}>
                          {STATUS[rec.status].label}
                          {STATUS[rec.status]?.custom && rec.customScore !== undefined ? ` (${rec.customScore > 0 ? '+' : ''}${rec.customScore})` : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                      {S_ORDER.map(k => {
                        const a = rec?.status === k;
                        return (
                          <button key={k} onClick={() => setStatus(stu.id, k)} style={{
                            padding:'10px 4px', borderRadius:10,
                            border:`1.5px solid ${a ? STATUS[k].bg : '#E2E8F0'}`,
                            background:a ? STATUS[k].bg : 'white',
                            color:a ? 'white' : C.muted,
                            fontSize:14, fontWeight:a ? 700 : 600,
                            cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s',
                          }}>
                            {STATUS[k].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!cls && tab === 'class' && (
            <div style={{ textAlign:'center', color:C.muted, padding:48 }}>📋 กรุณาเลือกห้องเรียนด้านบน</div>
          )}
        </>
      )}

      {/* ===== SHEETS ===== */}
      <Sheet open={sheetOpen?.type === 'class'} title="🏫 เลือกห้องเรียน" onClose={() => setSheetOpen(null)}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {classesHave.map(c => (
            <button key={c} onClick={() => { setCls(c); setSheetOpen(null); }} style={{
              padding:14, borderRadius:12, border:`2px solid ${cls === c ? C.red : C.border}`,
              background:cls === c ? C.light : 'white', color:cls === c ? C.red : C.text,
              fontWeight:cls === c ? 700 : 500, fontSize:16, fontFamily:'inherit',
            }}>{c}</button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheetOpen?.type === 'subj'} title="📚 เลือกรายวิชา" onClose={() => setSheetOpen(null)}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {data.subjects.map(s => (
            <button key={s.id} onClick={() => { setSubjId(s.id); setSheetOpen(null); }} style={{
              padding:16, borderRadius:12, border:`2px solid ${subjId === s.id ? C.red : C.border}`,
              background:subjId === s.id ? C.light : 'white', color:subjId === s.id ? C.red : C.text,
              fontWeight:subjId === s.id ? 700 : 500, fontSize:16, textAlign:'left', fontFamily:'inherit',
            }}>
              <div style={{ fontWeight:700 }}>{s.code}</div>
              <div style={{ fontSize:14, opacity:0.8 }}>{s.name}</div>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheetOpen?.type === 'period'} title="⏱ เลือกคาบเรียน" onClose={() => setSheetOpen(null)}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {PERIODS.filter(p => !p.isLunch).map(p => (
            <button key={p.id} onClick={() => { setPeriod(p.id); setSheetOpen(null); }} style={{
              padding:14, borderRadius:12, border:`2px solid ${period === p.id ? C.red : C.border}`,
              background:period === p.id ? C.light : 'white', color:period === p.id ? C.red : C.text,
              fontWeight:period === p.id ? 700 : 500, fontSize:18, fontFamily:'inherit',
            }}>{p.id}</button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheetOpen?.type === 'tt_edit'} title={`แก้ไขวิชา: ${sheetOpen?.day || ''} คาบ ${sheetOpen?.period?.id || ''}`} onClose={() => setSheetOpen(null)}>
        {sheetOpen?.type === 'tt_edit' && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>รายวิชา</div>
              <select value={ttForm.subjId} onChange={e => setTtForm(p => ({ ...p, subjId:e.target.value }))} style={{ ...sInp, fontFamily:'inherit' }}>
                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.code} {s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:13, color:C.muted, marginBottom:6 }}>ห้องเรียน <span style={{ color:C.red }}>*พิมเลขห้อง 301 = ม.3/1</span></div>
              <input value={ttForm.classId} onChange={e => setTtForm(p => ({ ...p, classId:e.target.value }))} style={sInp} placeholder="เช่น ม.3/1 หรือ 301" list="cls-list"/>
              <datalist id="cls-list">{sortClasses(data.classes).map(c => <option key={c} value={c}/>)}</datalist>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button
                onClick={() => {
                  const key = `${sheetOpen.day}-${sheetOpen.period.id}`;
                  update(p => { const newTt = { ...(p.timetable || {}) }; delete newTt[key]; return { ...p, timetable:newTt }; });
                  setSheetOpen(null); toast('ลบวิชาในคาบนี้แล้ว', 'success');
                }}
                style={{ ...sBtn(false), flex:1, color:'#dc2626', border:'1px solid #fecaca', background:'#fee2e2' }}
              >ลบวิชา</button>
              <button
                onClick={() => {
                  if (!ttForm.subjId || !ttForm.classId) return toast('เลือกข้อมูลให้ครบ', 'error');
                  const key = `${sheetOpen.day}-${sheetOpen.period.id}`;
                  update(p => ({ ...p, timetable:{ ...(p.timetable || {}), [key]:ttForm } }));
                  setSheetOpen(null); toast('บันทึกคาบเรียนแล้ว', 'success');
                }}
                style={{ ...sBtn(true), flex:2 }}
              >💾 บันทึกตารางสอน</button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={!!scoreModal} title={scoreModal ? `📝 ${STATUS[scoreModal.status]?.label} — คะแนนจิตพิสัย` : ''} onClose={() => setScoreModal(null)}>
        {scoreModal && (
          <div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:8 }}>+เท่ากับมา · -เท่ากับขาด · 0เท่ากับสาย</div>
            <input type="number" step="0.5" value={scoreModal.customScore}
              onChange={e => setScoreModal(p => ({ ...p, customScore:parseFloat(e.target.value) || 0 }))}
              style={{ ...sInp, marginBottom:16, fontSize:24, fontWeight:700, textAlign:'center', padding:16 }} autoFocus
            />
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {[-1, -0.5, 0, 0.5, 1].map(n => (
                <button key={n} onClick={() => setScoreModal(p => ({ ...p, customScore:n }))} style={{
                  flex:1, padding:12, borderRadius:10,
                  border:`2px solid ${scoreModal.customScore === n ? C.red : C.border}`,
                  background:scoreModal.customScore === n ? C.red : 'white',
                  color:scoreModal.customScore === n ? 'white' : C.text,
                  cursor:'pointer', fontFamily:'inherit', fontSize:15, fontWeight:700,
                }}>{n > 0 ? '+' : ''}{n}</button>
              ))}
            </div>
            <input value={scoreModal.note || ''} onChange={e => setScoreModal(p => ({ ...p, note:e.target.value }))} style={{ ...sInp, marginBottom:20 }} placeholder="หมายเหตุ (ถ้ามี)"/>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setScoreModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
              <button onClick={() => { saveStatus(scoreModal.studentId, scoreModal.status, scoreModal.customScore, scoreModal.note); setScoreModal(null); }} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
