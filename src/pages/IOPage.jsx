import React, { useState, useRef } from 'react';
import { C, STATUS } from '../constants';
import { sCard, sBtn, sInp } from '../styles';
import { todayStr, fmtDate, randomPin, sortClasses, getCatMax, getCatScore, hasCatScore, getSubjectGrade } from '../utils';
import { emptyProfile, calcSavings } from '../models';
import Sheet from '../components/Sheet';

// ─── Student Card Printer ──────────────────────────────────────────────────
function buildCardHtml(students, profiles, data) {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=Noto+Serif+TC:wght@400;600&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Kanit',sans-serif;background:#f0f0f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{display:flex;flex-wrap:wrap}
    @media print{body{background:#fff}.page{margin:0}}

    /* ── Card shell ── */
    .card{
      width:50%;background:#fff;position:relative;overflow:hidden;
      page-break-inside:avoid;
      border-right:0.5px solid #e5e7eb;border-bottom:0.5px solid #e5e7eb;
    }

    /* ── Lattice bg (right half) ── */
    .card::after{
      content:'';position:absolute;
      top:60px;right:0;bottom:44px;width:45%;
      background-image:
        linear-gradient(#e8d5d5 1px,transparent 1px),
        linear-gradient(90deg,#e8d5d5 1px,transparent 1px);
      background-size:28px 28px;
      opacity:.55;pointer-events:none;z-index:0;
    }

    /* ── Header bar ── */
    .hdr{
      background:#B91C1C;color:#fff;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 16px;height:52px;position:relative;z-index:2;
    }
    .hdr-left{display:flex;align-items:center;gap:10px}
    .hdr-label{font-size:11px;font-weight:700;letter-spacing:2px;color:#ffcaca;text-transform:uppercase}
    .hdr-sep{width:1px;height:22px;background:rgba(255,255,255,.25)}
    .hdr-th{font-size:12px;font-weight:400;color:#ffd5d5}
    .hdr-term{font-size:11px;font-weight:300;color:#ffc0c0;letter-spacing:1px}

    /* ── Left accent stripe ── */
    .accent{position:absolute;left:0;top:52px;bottom:44px;width:4px;background:#DC2626;z-index:2}

    /* ── Body ── */
    .body{padding:14px 16px 14px 20px;position:relative;z-index:1}

    /* ── Class badge + student info ── */
    .meta{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .badge{background:#B91C1C;color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:.5px}
    .num{font-size:12px;color:#9ca3af;font-weight:400}

    /* ── Name block ── */
    .name-th{font-size:28px;font-weight:900;color:#B91C1C;line-height:1.05;letter-spacing:-.5px;word-break:break-word}
    .name-cn{font-family:'Noto Serif TC',serif;font-size:15px;color:#7f1d1d;letter-spacing:4px;margin-top:3px}
    .nickname{font-size:12px;color:#b0b0b0;font-weight:300;font-style:italic;margin-top:1px}

    /* ── Photo ── */
    .photo-wrap{
      position:absolute;top:62px;right:14px;
      width:90px;height:112px;
      border:2.5px solid #B91C1C;
      box-shadow:3px 3px 0 #f3c2c2;
      overflow:hidden;background:#fef2f2;z-index:2;
    }
    .photo-wrap img{width:100%;height:100%;object-fit:cover}
    .photo-placeholder{
      width:100%;height:100%;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:4px;
    }
    .photo-icon{font-size:32px;opacity:.3}
    .photo-lbl{font-size:9px;color:#ccc;font-weight:300}
    .photo-corner{position:absolute;top:0;right:0;width:16px;height:16px;background:#B91C1C}

    /* ── Divider ── */
    .divider{height:1px;background:linear-gradient(90deg,#f3d5d5,transparent);margin:10px 0}

    /* ── Two column info ── */
    .cols{display:grid;grid-template-columns:1fr 1fr;gap:0 10px}
    .sec-title{
      font-size:10px;font-weight:700;color:#B91C1C;
      display:flex;align-items:center;gap:5px;
      margin:10px 0 5px;
    }
    .sec-title::before{content:'';width:7px;height:7px;border-radius:50%;background:#B91C1C;flex-shrink:0}
    .row{display:flex;gap:4px;font-size:10.5px;padding:1.5px 0;line-height:1.4}
    .lbl{color:#aaa;white-space:nowrap;font-weight:300;min-width:0}
    .val{color:#1f1f1f;font-weight:400}

    /* ── Footer strip ── */
    .foot{
      position:absolute;bottom:0;left:0;right:0;height:44px;
      background:#B91C1C;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 16px;z-index:2;
    }
    .foot-cn{font-family:'Noto Serif TC',serif;font-size:12px;color:#7f1d1d;letter-spacing:3px}
    .foot-id{font-size:10px;color:#f5a0a0;letter-spacing:1px;font-weight:300}
  `;

  const cards = students.map(s => {
    const p   = profiles?.[s.id] || emptyProfile();
    const addr = [
      p.houseNo   && `${p.houseNo}`,
      p.village   && `หมู่ ${p.village}`,
      p.road      && `ถ.${p.road}`,
      p.subDistrict && `ต.${p.subDistrict}`,
      p.district  && `อ.${p.district}`,
      p.province  && `จ.${p.province}`,
    ].filter(Boolean).join(' ');
    const fFull = [p.fatherName, p.fatherSurname].filter(Boolean).join(' ');
    const mFull = [p.motherName, p.motherSurname].filter(Boolean).join(' ');
    const photoEl = p.profilePhoto
      ? `<img src="${p.profilePhoto}" alt="photo"/>`
      : `<div class="photo-placeholder"><div class="photo-icon">👤</div><div class="photo-lbl">รูปถ่าย</div></div>`;

    const r = (lbl, val) => val ? `<div class="row"><span class="lbl">${lbl}</span><span class="val">${val}</span></div>` : '';

    return `<div class="card">
  <div class="hdr">
    <div class="hdr-left">
      <span class="hdr-label">Student Profile</span>
      <div class="hdr-sep"></div>
      <span class="hdr-th">บัตรประวัตินักเรียน</span>
    </div>
    <span class="hdr-term">ภาค ${data.term} / ${data.year}</span>
  </div>
  <div class="accent"></div>
  <div class="photo-wrap">
    ${photoEl}
    <div class="photo-corner"></div>
  </div>
  <div class="body">
    <div class="meta">
      <span class="badge">${s.classId || ''}</span>
      <span class="num">เลขที่ ${s.number || '-'} &nbsp;·&nbsp; รหัส ${s.id}</span>
    </div>
    <div class="name-th">${s.name || ''}</div>
    ${s.chineseName ? `<div class="name-cn">${s.chineseName}</div>` : ''}
    ${s.nickname    ? `<div class="nickname">"${s.nickname}"</div>` : ''}
    <div class="divider"></div>
    <div class="cols">
      <div>
        <div class="sec-title">ข้อมูลส่วนตัว</div>
        ${r('เลขบัตรประชาชน', p.idCard)}
        ${r('วันเกิด', p.birthday ? fmtDate(p.birthday) : '')}
        ${r('กรุ๊ปเลือด', p.bloodType ? `${p.bloodType}  ·  ${p.religion||''}` : '')}
        ${r('น้ำหนัก/สูง', (p.weight||p.height) ? `${p.weight||'-'} กก. / ${p.height||'-'} ซม.` : '')}
        ${r('โรคประจำตัว', p.disease)}
        <div class="sec-title">ที่อยู่</div>
        <div class="row"><span class="val" style="font-size:10px">${addr || '-'}</span></div>
      </div>
      <div>
        <div class="sec-title">ผู้ปกครอง</div>
        ${r('บิดา', fFull + (p.fatherJob ? ` (${p.fatherJob})` : ''))}
        ${r('มารดา', mFull + (p.motherJob ? ` (${p.motherJob})` : ''))}
        ${r('สถานะ', p.maritalStatus)}
        ${r('อาศัยกับ', p.livesWith)}
        <div class="sec-title">ติดต่อ</div>
        ${r('โทรผู้ปกครอง', p.guardianPhone)}
        ${r('LINE', p.guardianLine)}
        ${r('โทรนักเรียน', p.studentPhone)}
      </div>
    </div>
  </div>
  <div class="foot">
    <span class="foot-cn">学生档案</span>
    <span class="foot-id">ID : ${s.id}</span>
  </div>
</div>`;
  });

  return `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8"/>
<title>บัตรประวัตินักเรียน</title>
<style>${css}</style>
</head><body>
<div class="page">${cards.join('\n')}</div>
<script>document.fonts.ready.then(()=>window.print());<\/script>
</body></html>`;
}

const BACKUP_KEY = 'cc_last_backup';

function fmtBackupDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `${d.toLocaleDateString('th-TH', { dateStyle: 'long' })} เวลา ${d.toLocaleTimeString('th-TH', { timeStyle: 'short' })}`;
}

export default function IOPage({ data, update, toast }) {
  const fileRef       = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem(BACKUP_KEY));
  const [printModal,    setPrintModal]    = useState(false);
  const [printSelected, setPrintSelected] = useState(() => new Set());
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

  // --------- JSON Backup ---------
  const doJsonBackup = () => {
    try {
      const exportObj = {
        exportedAt: new Date().toISOString(),
        appVersion: 2,
        appName: data.appName,
        term: data.term,
        year: data.year,
        students: data.students,
        classes: data.classes,
        subjects: data.subjects,
        categories: data.categories,
        scores: data.scores,
        attendance: data.attendance,
        profiles: data.profiles,
        savings: data.savings,
        conduct: data.conduct,
        calendar: data.calendar,
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `backup_chinese_classroom_${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const now = new Date().toISOString();
      localStorage.setItem(BACKUP_KEY, now);
      setLastBackup(now);
      toast('💾 สำรองข้อมูลสำเร็จ ✓', 'success');
    } catch (e) {
      toast('สำรองข้อมูลไม่สำเร็จ: ' + e.message, 'error');
    }
  };

  // --------- Print Student Cards ---------
  const openPrintModal = () => {
    const ids = new Set(data.students.filter(s => s.classId === data.homeroom).map(s => s.id));
    setPrintSelected(ids);
    setPrintModal(true);
  };

  const doPrintCards = () => {
    const students = data.students
      .filter(s => s.classId === data.homeroom && printSelected.has(s.id))
      .sort((a, b) => (a.number || 999) - (b.number || 999));
    if (!students.length) return toast('กรุณาเลือกนักเรียนอย่างน้อย 1 คน', 'error');
    const html = buildCardHtml(students, data.profiles, data);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setPrintModal(false);
  };

  const togglePrintStudent = id => setPrintSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // --------- Import JSON Backup ---------
  const jsonFileRef = useRef(null);
  const handleJsonImport = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const text = await f.text();
      const obj  = JSON.parse(text);
      if (!obj.students || !Array.isArray(obj.students))
        return toast('ไฟล์ไม่ถูกต้อง ไม่พบข้อมูลนักเรียน', 'error');
      update(prev => ({
        ...prev,
        students:   obj.students   ?? prev.students,
        classes:    obj.classes    ?? prev.classes,
        subjects:   obj.subjects   ?? prev.subjects,
        categories: obj.categories ?? prev.categories,
        scores:     obj.scores     ?? prev.scores,
        attendance: obj.attendance ?? prev.attendance,
        profiles:   obj.profiles   ?? prev.profiles,
        savings:    obj.savings    ?? prev.savings,
        conduct:    obj.conduct    ?? prev.conduct,
        calendar:   obj.calendar   ?? prev.calendar,
      }));
      toast(`✅ กู้คืนข้อมูลสำเร็จ — นักเรียน ${obj.students.length} คน`, 'success');
    } catch (err) {
      toast('อ่านไฟล์ไม่ได้: ' + err.message, 'error');
    }
    e.target.value = '';
  };

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
      t