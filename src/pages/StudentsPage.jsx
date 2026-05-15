import React, { useState, useMemo } from 'react';
import { C } from '../constants';
import { sCard, sBtn, sInp, sTab } from '../styles';
import { randomPin, sortClasses } from '../utils';
import Sheet from '../components/Sheet';

export default function StudentsPage({ data, update, toast }) {
  const [sub,        setSub]        = useState('list');
  const [cls,        setCls]        = useState('');
  const [search,     setSearch]     = useState('');
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState({});
  const [err,        setErr]        = useState('');
  const [clsModal,   setClsModal]   = useState(null);
  const [clsForm,    setClsForm]    = useState({ name:'', oldName:'' });
  const [delConfirm, setDelConfirm] = useState(null);

  const sortedClasses = useMemo(() => sortClasses(data.classes), [data.classes]);

  const getClassWeight = c => {
    const m = String(c || '').match(/ม\.(\d+)\/(\d+)/);
    return m ? parseInt(m[1]) * 100 + parseInt(m[2]) : 9999;
  };

  const students = data.students
    .filter(s =>
      (cls ? s.classId === cls : true) &&
      (search ? s.name.includes(search) || s.id.includes(search) || (s.nickname || '').includes(search) || (s.chineseName || '').includes(search) : true)
    )
    .sort((a, b) => {
      const wA = getClassWeight(a.classId), wB = getClassWeight(b.classId);
      if (wA !== wB) return wA - wB;
      return (a.number || 999) - (b.number || 999) || (a.name || '').localeCompare(b.name || '', 'th');
    });

  const openAdd = () => {
    setForm({ id:'', name:'', nickname:'', chineseName:'', number:'', classId:cls || sortedClasses[0] || '', pin:randomPin() });
    setErr(''); setModal('add');
  };

  const save = () => {
    if (!form.id.trim() || !form.name.trim() || !form.classId) return setErr('กรอกรหัส ชื่อ และห้องให้ครบ');
    if (!/^\d{4}$/.test(form.pin)) return setErr('PIN ต้อง 4 หลัก');
    if (modal === 'add' && data.students.find(s => s.id === form.id.trim())) return setErr('รหัสซ้ำ');
    const stu = { ...form, id:form.id.trim(), number:parseInt(form.number) || null };
    update(prev => {
      const sts = modal === 'add' ? [...prev.students, stu] : prev.students.map(s => s.id === form.id ? stu : s);
      return { ...prev, students:sts };
    });
    setModal(null); toast('บันทึกแล้ว', 'success');
  };

  const doDel = () => {
    update(prev => ({
      ...prev,
      students:   prev.students.filter(s => s.id !== delConfirm.stu.id),
      attendance: prev.attendance.filter(a => a.studentId !== delConfirm.stu.id),
      scores:     prev.scores.filter(r => r.studentId !== delConfirm.stu.id),
    }));
    setDelConfirm(null); toast('ลบนักเรียนแล้ว', 'success');
  };

  const resetPin = stu => {
    const p = randomPin();
    update(prev => ({ ...prev, students:prev.students.map(s => s.id === stu.id ? { ...s, pin:p } : s) }));
    toast(`รหัสผ่านใหม่: ${p}`, 'success');
  };

  const saveClass = () => {
    const n = clsForm.name.trim(); if (!n) return;
    if (clsModal === 'add') {
      if (data.classes.includes(n)) return toast('มีแล้ว', 'error');
      update(prev => ({ ...prev, classes:sortClasses([...prev.classes, n]) }));
    } else {
      update(prev => ({
        ...prev,
        classes:  sortClasses(prev.classes.map(c => c === clsForm.oldName ? n : c)),
        students: prev.students.map(s => s.classId === clsForm.oldName ? { ...s, classId:n } : s),
        homeroom: prev.homeroom === clsForm.oldName ? n : prev.homeroom,
      }));
    }
    setClsModal(null); toast('บันทึก ✓', 'success');
  };

  const delClass = c => {
    if (data.students.some(s => s.classId === c)) return toast('ยังมีนักเรียนในห้องนี้', 'error');
    update(prev => ({ ...prev, classes:prev.classes.filter(x => x !== c) }));
    toast('ลบห้องเรียนแล้ว', 'success');
  };

  return (
    <div style={{ padding:'14px 14px 100px' }}>
      <div style={{ fontWeight:700, fontSize:20, marginBottom:16, color:C.text, letterSpacing:'-0.5px' }}>👥 นักเรียน</div>

      <div style={{ display:'flex', gap:8, marginBottom:16, background:'white', padding:6, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setSub('list')}  style={{ ...sTab(sub === 'list'),  flex:1 }}>👥 รายชื่อ</button>
        <button onClick={() => setSub('class')} style={{ ...sTab(sub === 'class'), flex:1 }}>🏫 ห้องเรียน</button>
      </div>

      {/* ===== LIST TAB ===== */}
      {sub === 'list' && (
        <>
          <button onClick={openAdd} style={{ ...sBtn(true), width:'100%', marginBottom:16, padding:16, fontSize:16, boxShadow:'0 4px 12px rgba(229,57,53,0.3)' }}>+ เพิ่มนักเรียน</button>
          <div style={sCard}>
            <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...sInp, marginBottom:12, fontFamily:'inherit' }}>
              <option value="">ทุกห้อง ({data.students.length} คน)</option>
              {sortedClasses.map(c => <option key={c} value={c}>{c} ({data.students.filter(s => s.classId === c).length} คน)</option>)}
            </select>
            <input placeholder="🔍 ค้นหา ชื่อ รหัส ชื่อเล่น ชื่อจีน..." value={search} onChange={e => setSearch(e.target.value)} style={sInp}/>
          </div>

          {students.map(stu => (
            <div key={stu.id} style={{ ...sCard, marginBottom:10, padding:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:16, color:C.text }}>
                    {stu.number ? <span style={{ color:C.muted, fontSize:14, marginRight:8 }}>{stu.number}.</span> : null}
                    {stu.name}
                    {stu.nickname && <span style={{ color:C.red, fontSize:14, marginLeft:6 }}>({stu.nickname})</span>}
                    {stu.chineseName && <span style={{ fontSize:14, color:'#0284C7', marginLeft:6 }}>{stu.chineseName}</span>}
                  </div>
                  <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{stu.id} · {stu.classId}</div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => setDelConfirm({ action:'pin', stu })} style={{ ...sBtn(false, true), padding:'8px 10px', fontSize:14 }}>🔑</button>
                  <button onClick={() => { setForm({ ...stu, number:stu.number || '' }); setErr(''); setModal('edit'); }} style={{ ...sBtn(false, true), padding:'8px 12px' }}>แก้ไข</button>
                  <button onClick={() => setDelConfirm({ action:'del', stu })} style={{ ...sBtn(false, true), color:'#dc2626', background:'#FEF2F2', border:'1px solid #FCA5A5', padding:'8px 12px' }}>ลบ</button>
                </div>
              </div>
            </div>
          ))}
          {!students.length && <div style={{ textAlign:'center', color:C.muted, padding:48 }}>ไม่พบนักเรียน</div>}
        </>
      )}

      {/* ===== CLASS TAB ===== */}
      {sub === 'class' && (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, alignItems:'center' }}>
            <div style={{ fontSize:14, color:C.muted }}>ประจำชั้น <b style={{ color:C.red, fontSize:16 }}>{data.homeroom}</b></div>
            <button onClick={() => { setClsForm({ name:'', oldName:'' }); setClsModal('add'); }} style={{ ...sBtn(true, true), padding:'8px 16px' }}>+ เพิ่มห้อง</button>
          </div>
          {sortedClasses.map(c => {
            const ct = data.students.filter(s => s.classId === c).length;
            return (
              <div key={c} style={{ ...sCard, marginBottom:10, padding:16, display:'flex', justifyContent:'space-between', alignItems:'center', borderLeft:c === data.homeroom ? `4px solid ${C.red}` : `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{c} {c === data.homeroom && <span style={{ fontSize:12, color:C.red, marginLeft:6 }}>★ ประจำชั้น</span>}</div>
                  <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>{ct} คน</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => { setClsForm({ name:c, oldName:c }); setClsModal('edit'); }} style={{ ...sBtn(false, true), padding:'6px 12px' }}>แก้ไข</button>
                  <button onClick={() => delClass(c)} disabled={ct > 0} style={{ ...sBtn(false, true), color:ct ? '#94A3B8' : '#dc2626', background:ct ? C.light : '#FEF2F2', border:`1px solid ${ct ? C.border : '#FCA5A5'}`, cursor:ct ? 'not-allowed' : 'pointer', padding:'6px 12px' }}>ลบ</button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ===== SHEETS ===== */}
      <Sheet open={!!modal} title={modal === 'add' ? '➕ เพิ่มนักเรียน' : '✏️ แก้ไขข้อมูล'} onClose={() => setModal(null)}>
        <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:12, marginBottom:12 }}>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>เลขที่</div><input type="number" value={form.number || ''} onChange={e => setForm(p => ({ ...p, number:e.target.value }))} style={sInp} placeholder="-"/></div>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>รหัสนักเรียน *</div><input value={form.id || ''} onChange={e => setForm(p => ({ ...p, id:e.target.value }))} disabled={modal === 'edit'} style={{ ...sInp, opacity:modal === 'edit' ? 0.6 : 1 }} placeholder="เช่น 12345"/></div>
        </div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อ-สกุล (ภาษาไทย) *</div>
        <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name:e.target.value }))} style={{ ...sInp, marginBottom:12 }} placeholder="ชื่อ-สกุล"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อเล่น</div><input value={form.nickname || ''} onChange={e => setForm(p => ({ ...p, nickname:e.target.value }))} style={sInp}/></div>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อภาษาจีน</div><input value={form.chineseName || ''} onChange={e => setForm(p => ({ ...p, chineseName:e.target.value }))} style={sInp} placeholder="小名"/></div>
        </div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ห้องเรียน *</div>
        <select value={form.classId || ''} onChange={e => setForm(p => ({ ...p, classId:e.target.value }))} style={{ ...sInp, marginBottom:16, fontFamily:'inherit' }}>
          <option value="">-- เลือก --</option>
          {sortedClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:13, color:C.muted, fontWeight:500 }}>PIN 4 หลัก (รหัสผ่านนักเรียน) *</span>
          <button onClick={() => setForm(p => ({ ...p, pin:randomPin() }))} style={{ fontSize:12, color:C.red, background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:700 }}>🎲 สุ่มใหม่</button>
        </div>
        <input value={form.pin || ''} maxLength={4} onChange={e => setForm(p => ({ ...p, pin:e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={{ ...sInp, marginBottom:20, fontSize:24, letterSpacing:8, textAlign:'center', fontWeight:700 }}/>
        {err && <div style={{ color:C.red, fontSize:14, marginBottom:16, padding:10, background:'#FEF2F2', borderRadius:8, textAlign:'center' }}>{err}</div>}
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={save} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
        </div>
      </Sheet>

      <Sheet open={!!clsModal} title={clsModal === 'add' ? '➕ เพิ่มห้อง' : '✏️ แก้ไข'} onClose={() => setClsModal(null)}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อห้องเรียน</div>
        <input value={clsForm.name} onChange={e => setClsForm(p => ({ ...p, name:e.target.value }))} style={{ ...sInp, marginBottom:20 }} placeholder="เช่น ม.1/4" autoFocus/>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setClsModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={saveClass} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
        </div>
      </Sheet>

      <Sheet open={!!delConfirm} title={delConfirm?.action === 'del' ? '🚨 ยืนยันการลบ' : '🔑 ตั้งรหัสผ่านใหม่'} onClose={() => setDelConfirm(null)}>
        {delConfirm?.action === 'del' && (
          <>
            <div style={{ fontSize:15, color:C.text, marginBottom:24, textAlign:'center' }}>
              ต้องการลบประวัติของ <b>{delConfirm.stu.name}</b> หรือไม่? ข้อมูลการเช็คชื่อและคะแนนจะหายทั้งหมด
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setDelConfirm(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
              <button onClick={doDel} style={{ ...sBtn(true), flex:1, background:'#dc2626', boxShadow:'0 4px 12px rgba(220,38,38,0.3)' }}>ลบถาวร</button>
            </div>
          </>
        )}
        {delConfirm?.action === 'pin' && (
          <>
            <div style={{ fontSize:15, color:C.text, marginBottom:24, textAlign:'center' }}>
              ต้องการสร้าง PIN ใหม่ให้ <b>{delConfirm.stu.name}</b> หรือไม่?
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={() => setDelConfirm(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
              <button onClick={() => { resetPin(delConfirm.stu); setDelConfirm(null); }} style={{ ...sBtn(true), flex:1 }}>สร้างรหัสใหม่</button>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
