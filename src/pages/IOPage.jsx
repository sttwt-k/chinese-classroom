import React, { useState, useRef } from 'react';
import { C, STATUS } from '../constants';
import { sCard, sBtn, sInp } from '../styles';
import { todayStr, randomPin, sortClasses, getCatMax, getCatScore, hasCatScore, getSubjectGrade } from '../utils';
import { emptyProfile, calcSavings } from '../models';
import Sheet from '../components/Sheet';

export default function IOPage({ data, update, toast }) {
  const fileRef       = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [exportModal,   setExportModal]   = useState(false);
  const [exportSections, setExportSections] = useState({
    students:         true,
    homeroomProfiles: false,
    savingsSummary:   false,
    scores:           true,
    morningAtt:       true,
    classAtt:         true,
  });
  const [exportSubjs, setExportSubjs] = useState(() =>
    Object.fromEntries(data.subjects.map(s => [s.id, true]))
  );

  // ชื่อไฟล์ที่แก้ไขได้ — สร้าง default จาก appName + ภาคเรียน + วันที่
  const makeDefaultFilename = () => {
    const appShort = (data.appName || 'ChineseClass')
      .replace(/ห้องเรียนของ|ของ/g, '')
      .replace(/\s+/g, '')
      .substring(0, 20);
    return `${appShort}_ภาค${data.term}-${data.year}_${todayStr().replace(/-/g, '')}`;
  };
  const [exportFilename, setExportFilename] = useState(makeDefaultFilename);

  const toggleSection = k => setExportSections(p => ({ ...p, [k]: !p[k] }));
  const toggleSubj    = id => setExportSubjs(p => ({ ...p, [id]: !p[id] }));

  // --------- Export ---------
  const doExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();
      const safeSheetName = name => name.replace(/[\\/?*[\]:]/g, '-').substring(0, 31);

      if (exportSections.students) {
        const rows = data.students
          .sort((a, b) => (a.number || 999) - (b.number || 999))
          .map(s => ({
            'เลขที่': s.number || '', 'รหัส': s.id, 'ชื่อ-สกุล': s.name,
            'ชื่อเล่น': s.nickname || '', 'ชื่อภาษาจีน': s.chineseName || '',
            'ห้อง': s.classId, 'PIN': s.pin,
          }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName('นักเรียนทั้งหมด'));
      }

      if (exportSections.homeroomProfiles) {
        const hrStudents = data.students
          .filter(s => s.classId === data.homeroom)
          .sort((a, b) => (a.number || 999) - (b.number || 999));
        const rows = hrStudents.map(s => {
          const p = data.profiles?.[s.id] || emptyProfile();
          return {
            'เลขที่': s.number || '', 'รหัส': s.id, 'ชื่อ-สกุล': s.name,
            'เลขบัตรประชาชน': p.idCard || '', 'วันเกิด': p.birthday || '',
            'อายุ (ปี)': p.age || '', 'กรุ๊ปเลือด': p.bloodType || '',
            'ศาสนา': p.religion || '', 'น้ำหนัก': p.weight || '', 'ส่วนสูง': p.height || '',
            'โรคประจำตัว': p.disease || '', 'ที่อยู่เลขที่': p.houseNo || '',
            'หมู่ที่': p.village || '', 'ถนน': p.road || '', 'ตำบล': p.subDistrict || '',
            'อำเภอ': p.district || '', 'จังหวัด': p.province || '', 'รหัสไปรษณีย์': p.postalCode || '',
            'ชื่อบิดา': [p.fatherName, p.fatherSurname].filter(Boolean).join(' '),
            'ชื่อมารดา': [p.motherName, p.motherSurname].filter(Boolean).join(' '),
            'สถานภาพบิดามารดา': p.maritalStatus || '', 'อาศัยอยู่กับ': p.livesWith || '',
            'เบอร์โทรผู้ปกครอง': p.guardianPhone || '', 'เบอร์โทรนักเรียน': p.studentPhone || '',
          };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName(`ข้อมูลส่วนตัว ${data.homeroom}`));
      }

      if (exportSections.savingsSummary) {
        const hrStudents = data.students
          .filter(s => s.classId === data.homeroom)
          .sort((a, b) => (a.number || 999) - (b.number || 999));
        const rows = hrStudents.map(s => {
          const c = calcSavings(data.savings?.[s.id]);
          return {
            'เลขที่': s.number || '', 'รหัส': s.id, 'ชื่อ-สกุล': s.name,
            'เป้าหมายการออม (บาท)': c.goal, 'ออมแล้ว (บาท)': c.total, 'ความคืบหน้า (%)': c.pct,
          };
        });
        if (rows.length > 0) {
          const totalGoal = rows.reduce((s, r) => s + r['เป้าหมายการออม (บาท)'], 0);
          const totalSav  = rows.reduce((s, r) => s + r['ออมแล้ว (บาท)'], 0);
          rows.push({
            'เลขที่': 'รวมทั้งหมด', 'รหัส': '', 'ชื่อ-สกุล': '',
            'เป้าหมายการออม (บาท)': totalGoal, 'ออมแล้ว (บาท)': totalSav,
            'ความคืบหน้า (%)': totalGoal > 0 ? Math.round((totalSav / totalGoal) * 100) : 0,
          });
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName(`สรุปออมเงิน ${data.homeroom}`));
      }

      if (exportSections.morningAtt) {
        const rows = data.attendance
          .filter(a => a.type === 'morning')
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(a => {
            const s = data.students.find(x => x.id === a.studentId);
            return { 'วันที่': a.date, 'รหัส': a.studentId, 'เลขที่': s?.number || '', 'ชื่อ': s?.name || '', 'ห้อง': s?.classId || '', 'สถานะ': STATUS[a.status]?.label || a.status, 'หมายเหตุ': a.note || '' };
          });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName('เข้าแถว'));
      }

      if (exportSections.classAtt) {
        data.subjects.filter(s => exportSubjs[s.id]).forEach(subj => {
          const rows = data.attendance
            .filter(a => a.type === 'class' && a.subjectId === subj.id)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(a => {
              const s = data.students.find(x => x.id === a.studentId);
              return { 'วันที่': a.date, 'คาบ': a.period || '', 'รหัส': a.studentId, 'เลขที่': s?.number || '', 'ชื่อ': s?.name || '', 'ห้อง': s?.classId || '', 'สถานะ': STATUS[a.status]?.label || a.status, 'คะแนน': a.customScore ?? '' };
            });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName(`คาบ ${subj.code || subj.name}`));
        });
      }

      if (exportSections.scores) {
        data.subjects.filter(s => exportSubjs[s.id]).forEach(subj => {
          const sCats = data.categories.filter(c => c.subjectId === subj.id);
          const rows  = data.students
            .sort((a, b) => (a.number || 999) - (b.number || 999))
            .map(s => {
              const row = { 'เลขที่': s.number || '', 'รหัส': s.id, 'ชื่อ': s.name, 'ห้อง': s.classId };
              sCats.forEach(c => {
                const k = `${c.name}(${getCatMax(c)})`;
                row[k]  = getCatScore(s.id, c, data.scores, data.term, data.year) || '';
              });
              const mx  = sCats.reduce((t, c) => t + getCatMax(c), 0);
              const tot = sCats.reduce((t, c) => t + getCatScore(s.id, c, data.scores, data.term, data.year), 0);
              const has = sCats.some(c => hasCatScore(s.id, c, data.scores, data.term, data.year));
              row['รวม']  = has ? tot : '';
              row['เกรด'] = has ? (getSubjectGrade(s.id, subj, data.categories, data.scores, data.term, data.year, data.attendance, data.conduct)?.label || '') : '';
              return row;
            });
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), safeSheetName(`คะแนน ${subj.code || subj.name}`));
        });
      }

      const fname = (exportFilename.trim() || makeDefaultFilename()) + '.xlsx';
      XLSX.writeFile(wb, fname);
      setExportModal(false);
      toast('ส่งออก Excel สำเร็จ', 'success');
    } catch (e) {
      toast('ไม่สามารถส่งออก Excel ได้: ' + e.message, 'error');
    }
  };

  // --------- Template ---------
  const downloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb   = XLSX.utils.book_new();
      const sample = [
        { 'เลขที่': 1, 'รหัสนักเรียน': '12345', 'ชื่อ-สกุล': 'ตัวอย่าง ทดสอบ', 'ชื่อเล่น': 'ตัว', 'ชื่อภาษาจีน': '小明', 'ห้อง': 'ม.5/2', 'PIN': '1234' },
        { 'เลขที่': 2, 'รหัสนักเรียน': '12346', 'ชื่อ-สกุล': 'ตัวอย่าง 2', 'ชื่อเล่น': '', 'ชื่อภาษาจีน': '', 'ห้อง': 'ม.5/2', 'PIN': '5678' },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sample), 'นักเรียน');
      XLSX.writeFile(wb, 'template-students.xlsx');
      toast('ดาวน์โหลด Template แล้ว', 'success');
    } catch {
      toast('ไม่พร้อมใช้งาน', 'error');
    }
  };

  // --------- Import ---------
  const handleFile = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const XLSX = await import('xlsx');
      const wb   = XLSX.read(await f.arrayBuffer());
      const ws   = wb.Sheets[wb.SheetNames.find(n => n.includes('นักเรียน')) || wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws)
        .map(r => ({
          id:          String(r['รหัสนักเรียน'] || r['รหัส'] || '').trim(),
          name:        String(r['ชื่อ-สกุล'] || r['ชื่อ'] || '').trim(),
          nickname:    String(r['ชื่อเล่น'] || '').trim(),
          chineseName: String(r['ชื่อภาษาจีน'] || '').trim(),
          number:      parseInt(r['เลขที่']) || null,
          classId:     String(r['ห้อง'] || '').trim(),
          pin:         String(r['PIN'] || '').trim() || randomPin(),
        }))
        .filter(s => s.id && s.name && s.classId);
      if (!rows.length) return toast('ไม่พบข้อมูล ตรวจสอบหัวคอลัมน์', 'error');
      setImportPreview(rows);
    } catch (ex) {
      toast('อ่านไฟล์ไม่ได้: ' + ex.message, 'error');
    }
    e.target.value = '';
  };

  const confirmImport = mode => {
    if (!importPreview) return;
    update(prev => {
      const ex = new Map(prev.students.map(s => [s.id, s]));
      const nc = new Set(prev.classes);
      importPreview.forEach(s => {
        const pin = /^\d{4}$/.test(s.pin) ? s.pin : randomPin();
        if (ex.has(s.id)) {
          if (mode === 'replace') ex.set(s.id, { ...ex.get(s.id), ...s, pin });
        } else {
          ex.set(s.id, { ...s, pin });
        }
        if (s.classId && !nc.has(s.classId)) nc.add(s.classId);
      });
      return { ...prev, students: Array.from(ex.values()), classes: sortClasses(Array.from(nc)) };
    });
    toast(`นำเข้า ${importPreview.length} รายการ ✓`, 'success');
    setImportPreview(null);
  };

  const exportCounts = {
    students:  data.students.length,
    homeroom:  data.students.filter(s => s.classId === data.homeroom).length,
    morningAtt: data.attendance.filter(a => a.type === 'morning').length,
    classAtt:   data.attendance.filter(a => a.type === 'class').length,
    scores:     data.scores.length,
  };

  return (
    <div style={{ padding: '14px 14px 100px' }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, color: C.text, letterSpacing: '-0.5px' }}>📥 นำเข้า / ส่งออก</div>

      {/* Export card */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>📤 ส่งออก Excel</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>เลือกหัวข้อที่ต้องการส่งออก เพื่อเก็บสำรองข้อมูล</div>
        <button onClick={() => { setExportFilename(makeDefaultFilename()); setExportModal(true); }} style={{ ...sBtn(true), width: '100%', padding: 14, fontSize: 16 }}>
          📊 เลือกและส่งออก...
        </button>
      </div>

      {/* Import card */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>📥 นำเข้านักเรียน</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>คอลัมน์ Excel: เลขที่, รหัสนักเรียน, ชื่อ-สกุล, ชื่อเล่น, ชื่อภาษาจีน, ห้อง, PIN</div>
        <button onClick={downloadTemplate} style={{ ...sBtn(false), width: '100%', padding: 12, marginBottom: 12 }}>⬇ ดาวน์โหลดไฟล์ Template</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }}/>
        <button onClick={() => fileRef.current?.click()} style={{ ...sBtn(true), width: '100%', padding: 14, fontSize: 16 }}>
          📤 เลือกไฟล์ Excel เพื่อนำเข้า
        </button>
      </div>

      {/* Export modal */}
      <Sheet open={exportModal} title="📤 เลือกหัวข้อที่จะส่งออก" onClose={() => setExportModal(false)}>
        <div style={{ marginBottom: 16 }}>
          {[
            ['students',         `รายชื่อนักเรียนทั้งหมด (${exportCounts.students} คน)`],
            ['homeroomProfiles', `ข้อมูลส่วนตัวประจำชั้น ${data.homeroom} (${exportCounts.homeroom} คน)`],
            ['savingsSummary',   `สรุปการออมเงินประจำชั้น ${data.homeroom} (${exportCounts.homeroom} คน)`],
            ['morningAtt',       `เช็คชื่อเข้าแถว (${exportCounts.morningAtt} รายการ)`],
            ['classAtt',         `เช็คชื่อคาบเรียน (${exportCounts.classAtt} รายการ)`],
            ['scores',           `คะแนนวิชาต่างๆ (${exportCounts.scores} รายการ)`],
          ].map(([k, l]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <input type="checkbox" checked={exportSections[k]} onChange={() => toggleSection(k)} style={{ width: 20, height: 20, accentColor: C.red }}/>
              <span style={{ fontSize: 15, fontWeight: 500, color: C.text }}>{l}</span>
            </label>
          ))}
        </div>

        {(exportSections.classAtt || exportSections.scores) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: C.text, marginBottom: 10, fontWeight: 700 }}>เลือกรายวิชา:</div>
            {data.subjects.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
                <input type="checkbox" checked={exportSubjs[s.id] ?? true} onChange={() => toggleSubj(s.id)} style={{ width: 18, height: 18, accentColor: C.red }}/>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{s.code && `${s.code} `}{s.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    คะแนน {data.scores.filter(r => data.categories.find(c => c.id === r.categoryId && c.subjectId === s.id)).length} รายการ
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ชื่อไฟล์</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              value={exportFilename}
              onChange={e => setExportFilename(e.target.value)}
              style={{ ...sInp, flex: 1, fontSize: 14 }}
              placeholder={makeDefaultFilename()}
            />
            <span style={{ color: C.muted, fontSize: 13, whiteSpace: 'nowrap', fontWeight: 500 }}>.xlsx</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            💡 แก้ชื่อไฟล์ได้ก่อนกด ส่งออก
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setExportModal(false)} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
          <button onClick={doExport} style={{ ...sBtn(true), flex: 1 }}>📊 ส่งออก</button>
        </div>
      </Sheet>

      {/* Import preview modal */}
      <Sheet
        open={!!importPreview}
        title={`ตรวจสอบก่อนนำเข้า (${importPreview?.length || 0} รายการ)`}
        onClose={() => setImportPreview(null)}
      >
        {importPreview && (
          <div>
            <div style={{ maxHeight: '42vh', overflowY: 'auto', marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px', background: C.bg, padding: '10px 12px', fontSize: 13, fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                <span>เลขที่</span><span>ชื่อ</span><span>ห้อง · รหัส</span><span>สถานะ</span>
              </div>
              {importPreview.map((s, i) => {
                const exists = data.students.some(x => x.id === s.id);
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px', padding: '10px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 14, background: exists ? '#FFFBEB' : 'white' }}>
                    <span style={{ color: C.muted }}>{s.number || '-'}</span>
                    <span>
                      <b style={{ fontWeight: 600 }}>{s.name}</b>
                      {s.nickname ? ` (${s.nickname})` : ''}
                      {s.chineseName ? <span style={{ color: '#0284C7' }}> {s.chineseName}</span> : null}
                    </span>
                    <span style={{ color: C.muted }}>{s.classId} · {s.id}</span>
                    <span style={{ color: exists ? '#D97706' : '#16A34A', fontSize: 12, fontWeight: 700 }}>{exists ? 'อัปเดต' : 'ใหม่'}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button onClick={() => confirmImport('skip')} style={{ ...sBtn(true), padding: 14 }}>
                เพิ่มเฉพาะรายใหม่ ({importPreview.filter(s => !data.students.some(x => x.id === s.id)).length} คน)
              </button>
              <button onClick={() => confirmImport('replace')} style={{ ...sBtn(false), padding: 14 }}>
                เพิ่ม + อัปเดตที่มีอยู่ ({importPreview.length} คน)
              </button>
              <button onClick={() => setImportPreview(null)} style={{ ...sBtn(false), padding: 12, color: C.muted, background: 'transparent', border: `1px solid ${C.border}` }}>ยกเลิก</button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
