import React, { useState, useMemo } from 'react';
import { C, GRADE_SCALE } from '../constants';
import { sCard, sBtn, sInp, sLabel } from '../styles';
import { sortClasses, getCatMax, getCatScore, getGrade, calcAttRate, gradeColor, gradeBg } from '../utils';

// ─── helpers ──────────────────────────────────────────────────────────────────
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function thaiDate(iso) {
  if (!iso) { const n = new Date(); return `${n.getDate()} ${THAI_MONTHS[n.getMonth()]} ${n.getFullYear()+543}`; }
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()+543}`;
}

// Compute per-subject summary for one student
function getSubjectSummary(sid, subj, cats, scores, term, year) {
  const subjCats = cats.filter(c => c.subjectId === subj.id);
  let total = 0, max = 0;
  const catRows = subjCats.map(cat => {
    const catMax   = getCatMax(cat);
    const catScore = getCatScore(sid, cat, scores, term, year);
    total += catScore;
    max   += catMax;
    return { cat, catScore, catMax };
  });
  const grade = max > 0 ? getGrade(total, max) : null;
  return { total, max, grade, catRows };
}

// Compute per-student GPA across all subjects
function calcGPA(sid, subjects, cats, scores, term, year) {
  let totalCredits = 0, totalPoints = 0;
  subjects.forEach(subj => {
    const { grade } = getSubjectSummary(sid, subj, cats, scores, term, year);
    if (grade) {
      totalCredits += subj.credits || 1;
      totalPoints  += (grade.gpa ?? 0) * (subj.credits || 1);
    }
  });
  if (!totalCredits) return null;
  return { gpa: (totalPoints / totalCredits).toFixed(2), totalCredits };
}

// ─── Print HTML generator ─────────────────────────────────────────────────────
function generatePrintHTML(students, data, selectedIds) {
  const { subjects, categories, scores, attendance, term, year, appName, homeroom } = data;

  const cards = students
    .filter(s => selectedIds.has(s.id))
    .sort((a,b) => (a.number||999)-(b.number||999) || (a.name||'').localeCompare(b.name||'','th'))
    .map(student => {
      const rows = subjects.map(subj => {
        const { total, max, grade, catRows } = getSubjectSummary(student.id, subj, categories, scores, term, year);
        const pct = max > 0 ? Math.round((total/max)*100) : '-';
        return `
          <tr>
            <td>${subj.code || ''}</td>
            <td>${subj.name}</td>
            <td style="text-align:center">${subj.credits}</td>
            <td style="text-align:center">${max > 0 ? total.toFixed(1) : '-'}</td>
            <td style="text-align:center">${max > 0 ? max : '-'}</td>
            <td style="text-align:center">${pct !== '-' ? pct+'%' : '-'}</td>
            <td style="text-align:center;font-weight:bold;color:${grade ? gradeColor(grade) : '#666'}">${grade ? grade.label : '-'}</td>
            <td style="text-align:center;font-weight:bold;color:${grade ? gradeColor(grade) : '#666'}">${grade ? grade.gpa : '-'}</td>
          </tr>`;
      }).join('');

      const attRate = calcAttRate(student.id, attendance, 'morning');
      const attStr  = attRate != null ? `${Math.round(attRate)}%` : '-';
      const gpaData = calcGPA(student.id, subjects, categories, scores, term, year);

      return `
        <div class="card">
          <div class="school-header">
            <div class="school-icon">中</div>
            <div>
              <div class="school-name">${appName || 'ห้องเรียนของคุณครูต้นฝน'}</div>
              <div class="sub-title">สลิปผลการเรียน · ภาคเรียนที่ ${term} ปีการศึกษา ${year}</div>
            </div>
          </div>

          <div class="student-info">
            <div class="info-row">
              <span class="info-label">ชื่อ–สกุล</span>
              <span class="info-value">${student.name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">เลขที่</span>
              <span class="info-value">${student.number || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">ชั้น</span>
              <span class="info-value">${student.classId || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">วันที่พิมพ์</span>
              <span class="info-value">${thaiDate(null)}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>รหัสวิชา</th>
                <th>ชื่อวิชา</th>
                <th style="text-align:center">หน่วยกิต</th>
                <th style="text-align:center">คะแนนที่ได้</th>
                <th style="text-align:center">คะแนนเต็ม</th>
                <th style="text-align:center">เปอร์เซ็นต์</th>
                <th style="text-align:center">ระดับ</th>
                <th style="text-align:center">GPA</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="summary">
            <div class="sum-box">
              <div class="sum-label">GPA รวม</div>
              <div class="sum-value" style="color:${gpaData && gpaData.gpa >= 3 ? '#16a34a' : gpaData && gpaData.gpa >= 2 ? '#d97706' : '#dc2626'}">
                ${gpaData ? gpaData.gpa : '-'}
              </div>
            </div>
            <div class="sum-box">
              <div class="sum-label">หน่วยกิตรวม</div>
              <div class="sum-value">${gpaData ? gpaData.totalCredits : '-'}</div>
            </div>
            <div class="sum-box">
              <div class="sum-label">อัตราการมาเรียน</div>
              <div class="sum-value">${attStr}</div>
            </div>
          </div>

          <div class="footer-sig">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">ลายมือชื่อครูประจำชั้น</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">ลายมือชื่อผู้ปกครอง</div>
            </div>
          </div>
        </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>สลิปผลการเรียน</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800&display=swap"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Kanit', sans-serif;
      background: #f0f0f0;
      margin: 0; padding: 20px;
    }
    @media print {
      body { background: white; padding: 0; }
      .card { page-break-after: always; box-shadow: none !important; border: 1px solid #ddd; }
      .card:last-child { page-break-after: auto; }
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 28px;
      max-width: 720px;
      margin: 0 auto 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .school-header {
      display: flex; align-items: center; gap: 16px;
      border-bottom: 3px solid #B71C1C; padding-bottom: 16px; margin-bottom: 16px;
    }
    .school-icon {
      width: 52px; height: 52px; background: linear-gradient(135deg,#E53935,#B71C1C);
      color: white; font-size: 28px; font-weight: 800;
      display: flex; align-items: center; justify-content: center; border-radius: 14px;
      flex-shrink: 0;
    }
    .school-name { font-size: 16px; font-weight: 800; color: #1E293B; line-height: 1.3; }
    .sub-title { font-size: 13px; color: #64748B; margin-top: 3px; }

    .student-info {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 6px; background: #F8FAFC; border-radius: 12px;
      padding: 14px 18px; margin-bottom: 18px;
    }
    .info-row { display: flex; gap: 8px; align-items: baseline; }
    .info-label { font-size: 12px; color: #64748B; font-weight: 600; white-space: nowrap; min-width: 70px; }
    .info-value { font-size: 14px; color: #1E293B; font-weight: 600; }

    table {
      width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 18px;
    }
    th {
      background: #B71C1C; color: white; padding: 8px 10px;
      font-weight: 700; font-size: 12px;
    }
    th:first-child { border-radius: 8px 0 0 0; }
    th:last-child  { border-radius: 0 8px 0 0; }
    td { padding: 7px 10px; border-bottom: 1px solid #E2E8F0; color: #1E293B; }
    tr:nth-child(even) td { background: #F8FAFC; }
    tr:last-child td { border-bottom: none; }

    .summary {
      display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px;
    }
    .sum-box {
      background: #F8FAFC; border-radius: 12px; padding: 14px;
      text-align: center; border: 1.5px solid #E2E8F0;
    }
    .sum-label { font-size: 11px; color: #64748B; font-weight: 600; margin-bottom: 6px; }
    .sum-value { font-size: 24px; font-weight: 800; color: #1E293B; }

    .footer-sig {
      display: flex; gap: 40px; justify-content: flex-end;
      border-top: 1px solid #E2E8F0; padding-top: 20px;
    }
    .sig-box { text-align: center; }
    .sig-line { width: 160px; border-bottom: 1.5px solid #64748B; margin-bottom: 8px; }
    .sig-label { font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  ${cards}
  <script>
    document.fonts.ready.then(function() {
      setTimeout(function() { window.print(); }, 600);
    });
  <\/script>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportCardPage({ data }) {
  const { subjects, categories, scores, attendance, term, year, students, classes } = data;

  const classesWithStudents = useMemo(
    () => sortClasses(classes.filter(c => students.some(s => s.classId === c))),
    [classes, students]
  );

  const [cls,     setCls]     = useState(classesWithStudents[0] || '');
  const [selIds,  setSelIds]  = useState(new Set());
  const [all,     setAll]     = useState(false);

  const clsStudents = useMemo(
    () => students
      .filter(s => s.classId === cls)
      .sort((a,b) => (a.number||999)-(b.number||999) || (a.name||'').localeCompare(b.name||'','th')),
    [students, cls]
  );

  const toggleStudent = (id) => {
    setSelIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (all) { setSelIds(new Set()); setAll(false); }
    else     { setSelIds(new Set(clsStudents.map(s => s.id))); setAll(true); }
  };

  // update "all" state when manual selections match
  const isAll = selIds.size > 0 && clsStudents.every(s => selIds.has(s.id));

  const doPrint = () => {
    if (selIds.size === 0) { alert('กรุณาเลือกนักเรียนอย่างน้อย 1 คน'); return; }
    const html = generatePrintHTML(clsStudents, data, selIds);
    const win  = window.open('about:blank', '_blank');
    if (!win) { alert('กรุณาอนุญาต popup เพื่อพิมพ์'); return; }
    win.document.write(html);
    win.document.close();
  };

  // preview card for selected student
  const [preview, setPreview] = useState(null);
  const previewStu = preview ? students.find(s => s.id === preview) : null;

  return (
    <div style={{ padding: '16px 16px 100px', maxWidth: 540, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ ...sCard, padding: '20px 20px 16px', marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 4 }}>
          📄 สลิปผลการเรียน
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          ภาคเรียนที่ {term} ปีการศึกษา {year}
        </div>
      </div>

      {/* ── Class selector ── */}
      <div style={{ marginBottom: 16 }}>
        <label style={sLabel}>เลือกชั้นเรียน</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
          {classesWithStudents.map(c => (
            <button
              key={c}
              onClick={() => { setCls(c); setSelIds(new Set()); setAll(false); }}
              style={{
                padding: '8px 18px', borderRadius: 20, cursor:'pointer', fontFamily:'inherit',
                fontSize: 14, fontWeight: 600, border: 'none',
                background: cls === c
                  ? `linear-gradient(135deg,${C.red},${C.dark})`
                  : '#f1f5f9',
                color: cls === c ? '#fff' : C.muted,
                boxShadow: cls === c ? '0 3px 10px rgba(183,28,28,0.25)' : 'none',
                transition: 'all 0.15s',
              }}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* ── Student list ── */}
      {cls && (
        <div style={{ ...sCard, padding: '0 0 12px', marginBottom: 20, overflow:'hidden' }}>
          {/* header row */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: '14px 18px 10px', borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
              นักเรียน {cls} ({clsStudents.length} คน)
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
              <button
                onClick={toggleAll}
                style={{
                  background: 'none', border: `1.5px solid ${isAll ? C.red : C.border}`,
                  color: isAll ? C.red : C.muted, borderRadius: 8, cursor:'pointer',
                  padding: '4px 12px', fontSize: 12, fontWeight: 600, fontFamily:'inherit',
                }}
              >
                {isAll ? '✓ เลือกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
              <span style={{ fontSize: 12, color: C.muted }}>{selIds.size} คนที่เลือก</span>
            </div>
          </div>

          {clsStudents.map((stu, idx) => {
            const isSel  = selIds.has(stu.id);
            const gpaD   = calcGPA(stu.id, subjects, categories, scores, term, year);
            const gpa    = gpaD ? gpaD.gpa : null;
            return (
              <div
                key={stu.id}
                onClick={() => toggleStudent(stu.id)}
                style={{
                  display:'flex', alignItems:'center', gap: 14,
                  padding: '12px 18px',
                  background: isSel ? '#fef2f2' : 'transparent',
                  borderBottom: idx < clsStudents.length-1 ? `1px solid ${C.border}` : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {/* checkbox */}
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  border: `2px solid ${isSel ? C.red : C.border}`,
                  background: isSel ? C.red : '#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  {isSel && <span style={{ color:'#fff', fontSize: 13, fontWeight: 800 }}>✓</span>}
                </div>

                {/* number */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 12, fontWeight: 700, color: C.muted,
                }}>{stu.number || idx+1}</div>

                {/* name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.text,
                                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {stu.name || '(ไม่มีชื่อ)'}
                  </div>
                  {stu.nickname && (
                    <div style={{ fontSize: 12, color: C.muted }}>({stu.nickname})</div>
                  )}
                </div>

                {/* GPA badge */}
                {gpa !== null && (
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: gpa >= 3 ? '#16a34a' : gpa >= 2 ? '#d97706' : '#dc2626',
                    background: gpa >= 3 ? '#dcfce7' : gpa >= 2 ? '#fef3c7' : '#fee2e2',
                    padding: '3px 10px', borderRadius: 20,
                  }}>GPA {gpa}</span>
                )}

                {/* preview */}
                <button
                  onClick={e => { e.stopPropagation(); setPreview(stu.id === preview ? null : stu.id); }}
                  style={{
                    background: 'none', border: `1.5px solid ${C.border}`,
                    borderRadius: 8, cursor:'pointer', padding: '4px 10px',
                    fontSize: 12, color: C.muted, fontFamily:'inherit',
                  }}
                >👁</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview ── */}
      {previewStu && (
        <div style={{ ...sCard, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 14 }}>
            🔍 ตัวอย่างสลิป — {previewStu.name}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.red }}>
                {['รหัสวิชา','ชื่อวิชา','หน่วยกิต','คะแนน','เต็ม','%','ระดับ','GPA'].map(h => (
                  <th key={h} style={{
                    color:'#fff', padding:'7px 8px', fontWeight:700, fontSize:11,
                    textAlign: ['คะแนน','เต็ม','%','ระดับ','GPA','หน่วยกิต'].includes(h) ? 'center' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, idx) => {
                const { total, max, grade } = getSubjectSummary(previewStu.id, subj, categories, scores, term, year);
                const pct = max > 0 ? Math.round((total/max)*100) : null;
                return (
                  <tr key={subj.id} style={{ background: idx%2 ? '#f8fafc' : '#fff' }}>
                    <td style={{ padding:'7px 8px', color: C.muted, fontSize:12 }}>{subj.code}</td>
                    <td style={{ padding:'7px 8px', fontWeight:600 }}>{subj.name}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', color:C.muted }}>{subj.credits}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', fontWeight:700 }}>
                      {max > 0 ? total.toFixed(1) : '-'}
                    </td>
                    <td style={{ padding:'7px 8px', textAlign:'center', color:C.muted }}>
                      {max > 0 ? max : '-'}
                    </td>
                    <td style={{ padding:'7px 8px', textAlign:'center', color:C.muted }}>
                      {pct !== null ? pct+'%' : '-'}
                    </td>
                    <td style={{ padding:'7px 8px', textAlign:'center' }}>
                      {grade ? (
                        <span style={{
                          fontWeight:800, fontSize:14, color: gradeColor(grade),
                          background: gradeBg?.(grade) || '#f8fafc',
                          padding:'1px 8px', borderRadius:8,
                        }}>{grade.label}</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding:'7px 8px', textAlign:'center' }}>
                      {grade ? (
                        <span style={{ fontWeight:800, color: gradeColor(grade) }}>{grade.gpa}</span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(() => {
            const gpaD = calcGPA(previewStu.id, subjects, categories, scores, term, year);
            const attR = calcAttRate(previewStu.id, attendance, 'morning');
            return (
              <div style={{
                display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:14,
              }}>
                {[
                  { label:'GPA รวม', val: gpaD ? gpaD.gpa : '-',
                    color: gpaD ? (gpaD.gpa>=3?'#16a34a':gpaD.gpa>=2?'#d97706':'#dc2626') : C.muted },
                  { label:'หน่วยกิตรวม', val: gpaD ? gpaD.totalCredits : '-', color: C.text },
                  { label:'อัตราการมาเรียน', val: attR != null ? Math.round(attR)+'%' : '-', color: C.text },
                ].map(item => (
                  <div key={item.label} style={{
                    background:'#f8fafc', borderRadius:10, padding:'10px',
                    textAlign:'center', border:`1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{item.label}</div>
                    <div style={{ fontSize:20, fontWeight:800, color:item.color }}>{item.val}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Print button ── */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0,
        background:'#fff', borderTop:`1px solid ${C.border}`,
        padding:'14px 20px', zIndex:30,
        display:'flex', gap:12, maxWidth:540, margin:'0 auto',
      }}>
        <button
          onClick={() => { setSelIds(new Set()); setAll(false); }}
          style={{ ...sBtn(false), flex:1 }}
          disabled={selIds.size === 0}
        >ล้าง</button>
        <button
          onClick={doPrint}
          style={{
            ...sBtn(true), flex:3,
            opacity: selIds.size === 0 ? 0.5 : 1,
          }}
          disabled={selIds.size === 0}
        >
          🖨 พิมพ์สลิป {selIds.size > 0 ? `(${selIds.size} คน)` : ''}
        </button>
      </div>
    </div>
  );
}
