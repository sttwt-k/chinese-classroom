import React, { useState, useMemo, useCallback } from 'react';
import { C, CREDIT_OPTIONS } from '../constants';
import { sCard, sBtn, sInp, sTab } from '../styles';
import { todayStr, uid, sortClasses, fmtDate, getGrade, getSubjectGrade, getCatMax, getCatScore, hasCatScore, hasIncomplete, gradeColor, creditToHours } from '../utils';
import Sheet from '../components/Sheet';

export default function ScoresPage({ data, update, toast }) {
  const [sub,          setSub]          = useState('entry');
  const [subjId,       setSubjId]       = useState(data.subjects[0]?.id || '');
  const [cls,          setCls]          = useState('');
  const [catId,        setCatId]        = useState('');
  const [subCatId,     setSubCatId]     = useState('');
  const [draft,        setDraft]        = useState({});
  const [showSubjModal,setShowSubjModal]= useState(null);
  const [subjForm,     setSubjForm]     = useState({ name:'', code:'', credits:1 });
  const [catModal,     setCatModal]     = useState(null);
  const [catForm,      setCatForm]      = useState({ name:'', max:'', subjectId:'' });
  const [subCatModal,  setSubCatModal]  = useState(null);
  const [subCatForm,   setSubCatForm]   = useState({ name:'', max:'', date:todayStr() });
  const [expandedSubj, setExpandedSubj] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);

  const classesHave = sortClasses(data.classes.filter(c => data.students.some(s => s.classId === c)));
  const students    = data.students.filter(s => s.classId === cls).sort((a, b) => (a.number || 999) - (b.number || 999) || (a.name || '').localeCompare(b.name || '', 'th'));
  const subjCats    = data.categories.filter(c => c.subjectId === subjId);
  const cat         = data.categories.find(c => c.id === catId);
  const subCat      = cat?.subs?.find(s => s.id === subCatId);
  const subj        = data.subjects.find(s => s.id === subjId);

  const getScore = sid => {
    if (subCat) return data.scores.find(r => r.studentId === sid && r.categoryId === catId && r.subId === subCatId && r.term === data.term && r.year === data.year)?.score ?? '';
    if (cat && !cat.subs?.length) return data.scores.find(r => r.studentId === sid && r.categoryId === catId && !r.subId && r.term === data.term && r.year === data.year)?.score ?? '';
    return '';
  };

  const entryMax = subCat ? subCat.max : (cat && !cat.subs?.length ? cat.max : 0);

  const saveScore = useCallback((sid, val) => {
    const v = parseFloat(val);
    update(prev => {
      const s = prev.scores.filter(r => !(r.studentId === sid && r.categoryId === catId && (subCat ? r.subId === subCatId : !r.subId) && r.term === prev.term && r.year === prev.year));
      if (!isNaN(v) && val !== '') s.push({ studentId:sid, categoryId:catId, ...(subCat ? { subId:subCatId } : {}), score:v, term:prev.term, year:prev.year, date:todayStr() });
      return { ...prev, scores:s };
    });
    setDraft(p => { const n = { ...p }; delete n[sid]; return n; });
  }, [update, catId, subCat, subCatId]);

  const canEnter = cat && cls && (cat.subs?.length > 0 ? !!subCat : true);

  const saveSubj = () => {
    if (!subjForm.name.trim()) return;
    update(prev => {
      if (showSubjModal === 'add') return { ...prev, subjects:[...prev.subjects, { id:uid(), name:subjForm.name.trim(), code:subjForm.code.trim(), credits:parseFloat(subjForm.credits) || 1 }] };
      return { ...prev, subjects:prev.subjects.map(s => s.id === subjForm.id ? { ...s, name:subjForm.name.trim(), code:subjForm.code.trim(), credits:parseFloat(subjForm.credits) || s.credits } : s) };
    });
    setShowSubjModal(null); toast('บันทึกแล้ว', 'success');
  };

  const delSubj = id => {
    if (data.categories.some(c => c.subjectId === id)) return toast('มีหมวดคะแนนผูกอยู่ ให้ลบหมวดคะแนนก่อน', 'error');
    setConfirmModal({ type:'subj', id, msg:'ต้องการลบรายวิชานี้หรือไม่?' });
  };

  const saveCat = () => {
    if (!catForm.name.trim()) return;
    update(prev => {
      if (catModal === 'add') return { ...prev, categories:[...prev.categories, { id:uid(), name:catForm.name.trim(), subjectId:catForm.subjectId, max:parseFloat(catForm.max) || 0, subs:[] }] };
      return { ...prev, categories:prev.categories.map(c => c.id === catForm.id ? { ...c, name:catForm.name.trim(), max:parseFloat(catForm.max) || c.max } : c) };
    });
    setCatModal(null); toast('บันทึกแล้ว', 'success');
  };

  const delCat    = id => setConfirmModal({ type:'cat', id, msg:'ต้องการลบหมวดหมู่นี้ และคะแนนที่เกี่ยวข้องทั้งหมดหรือไม่?' });

  const saveSubCat = () => {
    if (!subCatForm.name.trim()) return;
    update(prev => ({
      ...prev,
      categories: prev.categories.map(c => {
        if (c.id !== catId) return c;
        const subs = subCatModal === 'add'
          ? [...c.subs, { id:uid(), name:subCatForm.name.trim(), max:parseFloat(subCatForm.max) || 0, date:subCatForm.date }]
          : c.subs.map(s => s.id === subCatForm.id ? { ...s, name:subCatForm.name.trim(), max:parseFloat(subCatForm.max) || s.max, date:subCatForm.date } : s);
        return { ...c, subs };
      }),
    }));
    setSubCatModal(null); toast('บันทึกแล้ว', 'success');
  };

  const delSubCat  = sid => setConfirmModal({ type:'subcat', id:sid, msg:'ต้องการลบหมวดย่อยนี้ และคะแนนทั้งหมดหรือไม่?' });
  const toggleSubj = id  => setExpandedSubj(p => ({ ...p, [id]:!p[id] }));

  const handleConfirm = () => {
    if (confirmModal.type === 'subj')   update(prev => ({ ...prev, subjects:prev.subjects.filter(s => s.id !== confirmModal.id) }));
    if (confirmModal.type === 'cat')    update(prev => ({ ...prev, categories:prev.categories.filter(c => c.id !== confirmModal.id), scores:prev.scores.filter(r => r.categoryId !== confirmModal.id) }));
    if (confirmModal.type === 'subcat') update(prev => ({ ...prev, categories:prev.categories.map(c => c.id === catId ? { ...c, subs:c.subs.filter(s => s.id !== confirmModal.id) } : c), scores:prev.scores.filter(r => !(r.categoryId === catId && r.subId === confirmModal.id)) }));
    setConfirmModal(null); toast('ลบสำเร็จ', 'success');
  };

  return (
    <div style={{ padding:'14px 14px 100px' }}>
      <div style={{ fontWeight:700, fontSize:20, marginBottom:16, color:C.text, letterSpacing:'-0.5px' }}>📊 คะแนน</div>

      <div style={{ display:'flex', gap:8, marginBottom:16, background:'white', padding:6, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setSub('entry')}  style={{ ...sTab(sub === 'entry'),  flex:1 }}>📝 บันทึกคะแนน</button>
        <button onClick={() => setSub('manage')} style={{ ...sTab(sub === 'manage'), flex:1 }}>📚 วิชา/หมวดหมู่</button>
      </div>

      {/* ===== ENTRY TAB ===== */}
      {sub === 'entry' && (
        <>
          <div style={sCard}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>รายวิชา</div>
                <select value={subjId} onChange={e => { setSubjId(e.target.value); setCatId(''); setSubCatId(''); }} style={{ ...sInp, fontFamily:'inherit' }}>
                  {data.subjects.map(s => <option key={s.id} value={s.id}>{s.code ? `${s.code} ${s.name}` : s.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ห้องเรียน</div>
                <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...sInp, fontFamily:'inherit' }}>
                  <option value="">-- เลือก --</option>
                  {classesHave.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ fontSize:13, color:C.muted, marginBottom:8, fontWeight:500 }}>หมวดหลัก</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:cat?.subs?.length > 0 ? 10 : 0 }}>
              {subjCats.map(c => (
                <button key={c.id} onClick={() => { setCatId(c.id); setSubCatId(''); }} style={{ ...sTab(catId === c.id), padding:'8px 14px', fontSize:14 }}>
                  {c.name} <span style={{ opacity:0.7 }}>/{getCatMax(c)}</span>
                </button>
              ))}
              {!subjCats.length && <div style={{ fontSize:14, color:C.muted }}>ยังไม่มีหมวด → ไปแท็บ วิชา/หมวดหมู่</div>}
            </div>

            {cat?.subs?.length > 0 && (
              <div>
                <div style={{ fontSize:13, color:C.muted, marginBottom:8, marginTop:12, fontWeight:500 }}>หมวดย่อย</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {cat.subs.map(s => (
                    <button key={s.id} onClick={() => setSubCatId(s.id)} style={{ ...sTab(subCatId === s.id), padding:'8px 12px', fontSize:13 }}>
                      {s.name} /{s.max}{s.date ? ` · ${fmtDate(s.date)}` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canEnter && students.length > 0 && (
            <div style={sCard}>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>{subCat ? subCat.name : cat?.name} · {cls}</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:16 }}>เต็ม {entryMax} · พิมพ์แล้วกด Enter เพื่อบันทึก</div>

              {students.map((stu, i) => {
                const saved = getScore(stu.id);
                const val   = draft[stu.id] !== undefined ? draft[stu.id] : saved;
                const g     = saved !== '' ? getGrade(parseFloat(saved), entryMax) : null;
                return (
                  <div key={stu.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ width:28, fontSize:13, color:C.muted, textAlign:'right' }}>{stu.number || i + 1}</span>
                    <span style={{ flex:1, fontSize:15, fontWeight:600 }}>{stu.nickname || stu.name}</span>
                    <input
                      type="number" min={0} max={entryMax} value={val} placeholder="-"
                      onChange={e => setDraft(p => ({ ...p, [stu.id]:e.target.value }))}
                      onBlur={() => { if (draft[stu.id] !== undefined) saveScore(stu.id, draft[stu.id]); }}
                      onKeyDown={e => { if (e.key === 'Enter') saveScore(stu.id, draft[stu.id] ?? saved); }}
                      style={{ width:64, padding:'8px 10px', borderRadius:8, border:`1.5px solid ${draft[stu.id] !== undefined ? C.red : C.border}`, textAlign:'center', fontSize:15, fontFamily:'inherit' }}
                    />
                    <span style={{ fontSize:13, color:C.muted }}>/{entryMax}</span>
                    {g && <span style={{ fontSize:13, fontWeight:700, width:28, color:gradeColor(g), textAlign:'center' }}>{g.label}</span>}
                  </div>
                );
              })}

              <div style={{ marginTop:16, background:C.light, borderRadius:12, padding:'12px 16px' }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8 }}>รวมทุกหมวด · {subj?.name}</div>
                {students.map(stu => {
                  const mx  = subjCats.reduce((s, c) => s + getCatMax(c), 0);
                  const tot = subjCats.reduce((s, c) => s + getCatScore(stu.id, c, data.scores, data.term, data.year), 0);
                  const has = subjCats.some(c => hasCatScore(stu.id, c, data.scores, data.term, data.year));
                  const g   = has ? getGrade(tot, mx) : null;
                  return (
                    <div key={stu.id} style={{ display:'flex', justifyContent:'space-between', fontSize:14, padding:'4px 0', borderTop:`1px solid ${C.border}` }}>
                      <span>{stu.nickname || stu.name}</span>
                      {has
                        ? <span style={{ fontWeight:700 }}>{tot}/{mx} <span style={{ color:gradeColor(g), marginLeft:6 }}>{g.label}</span></span>
                        : <span style={{ color:C.muted }}>-</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {!cls && <div style={{ textAlign:'center', color:C.muted, padding:48 }}>📊 เลือกวิชาและห้องด้านบน</div>}
        </>
      )}

      {/* ===== MANAGE TAB ===== */}
      {sub === 'manage' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:15, color:C.muted }}>{data.subjects.length} วิชา</div>
            <button onClick={() => { setSubjForm({ name:'', code:'', credits:1 }); setShowSubjModal('add'); }} style={{ ...sBtn(true, true), padding:'8px 16px' }}>+ เพิ่มวิชา</button>
          </div>

          {data.subjects.map(s => {
            const sCats    = data.categories.filter(c => c.subjectId === s.id);
            const sMax     = sCats.reduce((t, c) => t + getCatMax(c), 0);
            const expanded = expandedSubj[s.id];
            return (
              <div key={s.id} style={{ ...sCard, marginBottom:12, padding:0, overflow:'hidden' }}>
                <div style={{ padding:16, display:'flex', alignItems:'center', gap:12, cursor:'pointer', background:expanded ? C.light : 'white' }} onClick={() => toggleSubj(s.id)}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:16 }}>
                      {s.code && <span style={{ color:C.red, marginRight:8 }}>{s.code}</span>}
                      {s.name}
                    </div>
                    <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>
                      {s.credits} นก. · {creditToHours(s.credits)} ชม./สป. · {sCats.length} หมวด · เต็ม {sMax}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button onClick={e => { e.stopPropagation(); setSubjForm({ ...s }); setShowSubjModal('edit'); }} style={{ ...sBtn(false, true), padding:'6px 12px', fontSize:13 }}>แก้ไข</button>
                    <button onClick={e => { e.stopPropagation(); delSubj(s.id); }} style={{ ...sBtn(false, true), color:'#dc2626', padding:'6px 12px', fontSize:13, background:'#FEF2F2', border:'1px solid #FCA5A5' }}>ลบ</button>
                    <span style={{ fontSize:20, color:C.muted, transform:expanded ? 'rotate(90deg)' : 'rotate(0)', transition:'transform 0.2s', marginLeft:4 }}>›</span>
                  </div>
                </div>

                {expanded && (
                  <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 16px 16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, alignItems:'center' }}>
                      <div style={{ fontSize:14, fontWeight:700, color:C.text }}>หมวดคะแนน</div>
                      <button onClick={() => { setCatForm({ name:'', max:'20', subjectId:s.id, id:null }); setCatModal('add'); }} style={{ ...sBtn(true, true), padding:'6px 12px', fontSize:13 }}>+ เพิ่มหมวด</button>
                    </div>

                    {sCats.map(c => (
                      <div key={c.id} style={{ marginBottom:10, background:C.bg, borderRadius:10, padding:12, border:`1px solid ${C.border}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:c.subs?.length ? 8 : 0 }}>
                          <span style={{ fontWeight:700, fontSize:15 }}>{c.name} <span style={{ color:C.muted, fontWeight:500 }}>/ {getCatMax(c)}</span></span>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => { setCatForm({ name:c.name, max:c.max, subjectId:c.subjectId, id:c.id }); setCatModal('edit'); }} style={{ fontSize:12, color:C.text, background:'white', border:`1px solid ${C.border}`, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>แก้</button>
                            <button onClick={() => delCat(c.id)} style={{ fontSize:12, color:'#dc2626', background:'#FEF2F2', border:'1px solid #FCA5A5', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>ลบ</button>
                            <button onClick={() => { setCatId(c.id); setSubCatForm({ name:'', max:'5', date:todayStr() }); setSubCatModal('add'); }} style={{ fontSize:12, color:'white', background:C.red, border:`1px solid ${C.red}`, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>+ ย่อย</button>
                          </div>
                        </div>

                        {c.subs?.map(sb => (
                          <div key={sb.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0 6px 12px', borderTop:`1px dashed ${C.border}`, fontSize:13, alignItems:'center' }}>
                            <span style={{ color:C.muted, fontWeight:500 }}>{sb.name} <span style={{ color:C.text }}>/ {sb.max}</span> {sb.date ? ` · ${fmtDate(sb.date)}` : ''}</span>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => { setCatId(c.id); setSubCatForm({ ...sb }); setSubCatModal('edit'); }} style={{ fontSize:11, color:C.text, background:'white', border:`1px solid ${C.border}`, padding:'3px 8px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>แก้</button>
                              <button onClick={() => { setCatId(c.id); delSubCat(sb.id); }} style={{ fontSize:11, color:'#dc2626', background:'#FEF2F2', border:'1px solid #FCA5A5', padding:'3px 8px', borderRadius:6, cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>ลบ</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    {!sCats.length && <div style={{ fontSize:14, color:C.muted, textAlign:'center', padding:16 }}>ยังไม่มีหมวดคะแนน ลองเพิ่มด้านบนเลยครับ</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== SHEETS ===== */}
      <Sheet open={!!showSubjModal} title={showSubjModal === 'add' ? '➕ เพิ่มวิชา' : '✏️ แก้ไขวิชา'} onClose={() => setShowSubjModal(null)}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>รหัสวิชา</div><input value={subjForm.code || ''} onChange={e => setSubjForm(p => ({ ...p, code:e.target.value }))} style={sInp} placeholder="เช่น จ20201"/></div>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>หน่วยกิต</div>
            <select value={subjForm.credits} onChange={e => setSubjForm(p => ({ ...p, credits:parseFloat(e.target.value) }))} style={{ ...sInp, fontFamily:'inherit' }}>
              {CREDIT_OPTIONS.map(c => <option key={c} value={c}>{c} นก. ({creditToHours(c)} ชม./สป.)</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อวิชา *</div>
        <input value={subjForm.name || ''} onChange={e => setSubjForm(p => ({ ...p, name:e.target.value }))} style={{ ...sInp, marginBottom:20 }} placeholder="ชื่อวิชา"/>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setShowSubjModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={saveSubj} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
        </div>
      </Sheet>

      <Sheet open={!!catModal} title={catModal === 'add' ? '➕ เพิ่มหมวด' : '✏️ แก้ไข'} onClose={() => setCatModal(null)}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่อหมวด</div>
        <input value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name:e.target.value }))} style={{ ...sInp, marginBottom:12 }} placeholder="เช่น กลางภาค สอบย่อย"/>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>คะแนนเต็ม (เว้นไว้ถ้ามีหมวดย่อย)</div>
        <input type="number" value={catForm.max} onChange={e => setCatForm(p => ({ ...p, max:e.target.value }))} style={{ ...sInp, marginBottom:20 }} placeholder="เช่น 20"/>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setCatModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={saveCat} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
        </div>
      </Sheet>

      <Sheet open={!!subCatModal} title={subCatModal === 'add' ? '➕ หมวดย่อย' : '✏️ แก้ไข'} onClose={() => setSubCatModal(null)}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>ชื่องาน/การสอบ</div>
        <input value={subCatForm.name} onChange={e => setSubCatForm(p => ({ ...p, name:e.target.value }))} style={{ ...sInp, marginBottom:12 }} placeholder="เช่น สอบครั้งที่ 1, สมุด"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>คะแนนเต็ม</div><input type="number" value={subCatForm.max} onChange={e => setSubCatForm(p => ({ ...p, max:e.target.value }))} style={sInp}/></div>
          <div><div style={{ fontSize:13, color:C.muted, marginBottom:6, fontWeight:500 }}>วันที่สั่งงาน</div><input type="date" value={subCatForm.date} onChange={e => setSubCatForm(p => ({ ...p, date:e.target.value }))} style={sInp}/></div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setSubCatModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={saveSubCat} style={{ ...sBtn(true), flex:1 }}>บันทึก</button>
        </div>
      </Sheet>

      <Sheet open={!!confirmModal} title="🚨 ยืนยันการลบ" onClose={() => setConfirmModal(null)}>
        <div style={{ fontSize:15, color:C.text, marginBottom:24, textAlign:'center' }}>{confirmModal?.msg}</div>
        <div style={{ display:'flex', gap:12 }}>
          <button onClick={() => setConfirmModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
          <button onClick={handleConfirm} style={{ ...sBtn(true), flex:1, background:'#dc2626', boxShadow:'0 4px 12px rgba(220,38,38,0.3)' }}>ยืนยันลบ</button>
        </div>
      </Sheet>
    </div>
  );
}
