import React, { useState, useRef } from 'react';
import { C, STATUS } from '../constants';
import { sCard, sBtn, sInp } from '../styles';
import { todayStr, fmtDate, randomPin, sortClasses, getCatMax, getCatScore, hasCatScore, getSubjectGrade } from '../utils';
import { emptyProfile, calcSavings } from '../models';
import Sheet from '../components/Sheet';

// ─── Student Card Printer  (A4 · 1 card per page) ─────────────────────────────
function buildCardHtml(students, profiles, data) {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=Noto+Serif+TC:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{
      font-family:'Kanit',sans-serif;
      -webkit-print-color-adjust:exact;print-color-adjust:exact;
      background:#d0d0d0;
    }
    @page{size:A4 portrait;margin:0}
    @media print{html,body{background:#fff}}

    /* ── Card = 1 A4 page ── */
    .card{
      width:210mm;min-height:297mm;
      background:#fff;
      display:flex;flex-direction:column;
      page-break-after:always;
      position:relative;overflow:hidden;
      margin:0 auto;
    }
    @media screen{.card{margin-bottom:32px;box-shadow:0 6px 32px rgba(0,0,0,.18)}}

    /* ── Header ── */
    .hdr{
      background:#B91C1C;padding:14px 22px;flex-shrink:0;
      display:flex;align-items:center;justify-content:space-between;
      position:relative;overflow:hidden;
    }
    .hdr::after{
      content:'';position:absolute;right:0;top:0;bottom:0;width:100px;
      background-image:
        linear-gradient(rgba(255,255,255,.12) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.12) 1px,transparent 1px);
      background-size:13px 13px;
    }
    .hdr-tag{font-size:9.5px;font-weight:700;letter-spacing:2.5px;color:#ffcaca;text-transform:uppercase;margin-bottom:3px}
    .hdr-title{font-size:20px;font-weight:700;color:#fff;letter-spacing:.5px}
    .hdr-cn{font-family:'Noto Serif TC',serif;font-size:13px;color:rgba(255,255,255,.55);letter-spacing:4px;margin-top:3px}
    .hdr-right{text-align:right;font-size:12px;color:rgba(255,255,255,.7);line-height:1.9;font-weight:300}

    /* ── Red accent line ── */
    .stripe{height:4px;background:linear-gradient(90deg,#DC2626,#7f1d1d);flex-shrink:0}

    /* ── Body ── */
    .body{flex:1;padding:16px 22px 14px;display:flex;flex-direction:column;gap:0}

    /* ── Top block: photo + name ── */
    .top{display:flex;gap:18px;align-items:flex-start;margin-bottom:12px}
    .photo-frame{
      flex-shrink:0;width:108px;height:138px;
      border:2.5px solid #B91C1C;box-shadow:3px 3px 0 #f3c2c2;
      overflow:hidden;background:#fef2f2;position:relative;
    }
    .photo-frame img{width:100%;height:100%;object-fit:cover;display:block}
    .photo-ph{
      width:100%;height:100%;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
    }
    .photo-ph-icon{font-size:38px;opacity:.18}
    .photo-ph-lbl{font-size:9px;color:#ccc;letter-spacing:1px;font-weight:300}
    .photo-corner{
      position:absolute;bottom:0;right:0;width:0;height:0;
      border-style:solid;border-width:0 0 18px 18px;
      border-color:transparent transparent #B91C1C transparent;
    }
    .name-col{flex:1;padding-top:2px}
    .badge{
      display:inline-block;background:#B91C1C;color:#fff;
      font-size:11px;font-weight:700;padding:3px 12px;
      border-radius:3px;letter-spacing:.5px;margin-bottom:6px;
    }
    .num-line{font-size:12px;color:#9ca3af;margin-bottom:5px}
    .name-th{font-size:26px;font-weight:900;color:#B91C1C;line-height:1.1;letter-spacing:-.5px;word-break:break-word}
    .name-cn{font-family:'Noto Serif TC',serif;font-size:15px;color:#7f1d1d;letter-spacing:4px;margin-top:3px}
    .nickname{font-size:12px;color:#b0b0b0;font-style:italic;font-weight:300;margin-top:2px}

    /* ── Section ── */
    .sec{margin-bottom:10px}
    .sec-hdr{
      font-size:10px;font-weight:700;color:#B91C1C;letter-spacing:1.5px;text-transform:uppercase;
      border-bottom:1px solid #fecaca;padding-bottom:3px;margin-bottom:6px;
      display:flex;align-items:center;gap:6px;
    }
    .sec-hdr::before{content:'';width:7px;height:7px;background:#B91C1C;border-radius:50%;flex-shrink:0}

    /* ── Grid layouts ── */
    .g2{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}
    .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:0 12px}

    /* ── Data row ── */
    .dr{display:flex;gap:5px;font-size:10.5px;padding:2px 0;line-height:1.5}
    .dl{color:#aaa;white-space:nowrap;font-weight:300;flex-shrink:0}
    .dv{color:#1a1a1a;font-weight:400;word-break:break-word}

    /* ── Divider ── */
    .div{height:1px;background:linear-gradient(90deg,#fecaca 30%,transparent);margin:9px 0}

    /* ── Home photos ── */
    .ph-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:6px}
    .ph-img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #fecaca;display:block}

    /* ── Signature row ── */
    .sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:auto;padding-top:8px}
    .sig-box{text-align:center}
    .sig-line{border-bottom:1px solid #d1d5db;height:28px;margin-bottom:4px}
    .sig-lbl{font-size:9px;color:#9ca3af;font-weight:300;line-height:1.5}

    /* ── Footer ── */
    .foot{
      background:#B91C1C;padding:9px 22px;flex-shrink:0;
      display:flex;align-items:center;justify-content:space-between;
    }
    .foot-cn{font-family:'Noto Serif TC',serif;font-size:11px;color:rgba(255,255,255,.5);letter-spacing:4px}
    .foot-mid{font-size:11px;color:rgba(255,255,255,.85);font-weight:600}
    .foot-id{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;font-weight:300}
  `;

  const cards = students.map(s => {
    const p    = profiles?.[s.id] || emptyProfile();
    const addr = [
      p.houseNo     && `เลขที่ ${p.houseNo}`,
      p.village     && `หมู่ ${p.village}`,
      p.road        && `ถ.${p.road}`,
      p.subDistrict && `ต.${p.subDistrict}`,
      p.district    && `อ.${p.district}`,
      p.province    && `จ.${p.province}`,
      p.postalCode  && p.postalCode,
    ].filter(Boolean).join(' ');

    const fFull = [p.fatherName, p.fatherSurname].filter(Boolean).join(' ');
    const mFull = [p.motherName, p.motherSurname].filter(Boolean).join(' ');

    const photoEl = p.profilePhoto
      ? `<img src="${p.profilePhoto}" alt=""/>`
      : `<div class="photo-ph"><div class="photo-ph-icon">👤</div><div class="photo-ph-lbl">รูปถ่าย</div></div>`;

    const r = (lbl, val) =>
      val ? `<div class="dr"><span class="dl">${lbl}</span><span class="dv">${val}</span></div>` : '';

    const homePhotosHtml = (p.homePhotos || []).length
      ? `<div class="div"></div>
         <div class="sec">
           <div class="sec-hdr">รูปภาพเยี่ยมบ้าน (${p.homePhotos.length} รูป)</div>
           <div class="ph-grid">
             ${p.homePhotos.map(ph => `<img class="ph-img" src="${ph}" alt="บ้าน"/>`).join('')}
           </div>
         </div>`
      : '';

    return `<div class="card">
  <!-- Header -->
  <div class="hdr">
    <div>
      <div class="hdr-tag">Student Profile Card</div>
      <div class="hdr-title">บัตรประวัตินักเรียน</div>
      <div class="hdr-cn">学生档案</div>
    </div>
    <div class="hdr-right">
      ${data.appName || ''}<br/>
      ภาคเรียนที่ ${data.term} / ${data.year}
    </div>
  </div>
  <div class="stripe"></div>

  <div class="body">
    <!-- ① Photo + Name -->
    <div class="top">
      <div class="photo-frame">
        ${photoEl}
        <div class="photo-corner"></div>
      </div>
      <div class="name-col">
        <span class="badge">${s.classId || ''}</span>
        <div class="num-line">เลขที่ ${s.number || '-'} &nbsp;·&nbsp; รหัส ${s.id}</div>
        <div class="name-th">${s.name || ''}</div>
        ${s.chineseName ? `<div class="name-cn">${s.chineseName}</div>` : ''}
        ${s.nickname    ? `<div class="nickname">"${s.nickname}"</div>` : ''}
      </div>
    </div>

    <div class="div"></div>

    <!-- ② Personal + Family -->
    <div class="g2">
      <div class="sec">
        <div class="sec-hdr">ข้อมูลส่วนตัว</div>
        ${r('เลขบัตรประชาชน', p.idCard)}
        ${r('วันเกิด', p.birthday ? fmtDate(p.birthday) : '')}
        ${r('อายุ', p.age ? p.age + ' ปี' : '')}
        ${r('หมู่เลือด', p.bloodType)}
        ${r('ศาสนา', p.religion)}
        ${r('เชื้อชาติ / สัญชาติ', [p.ethnicity, p.nationality].filter(Boolean).join(' / '))}
        ${r('น้ำหนัก / ส่วนสูง', (p.weight || p.height) ? `${p.weight||'-'} กก. / ${p.height||'-'} ซม.` : '')}
        ${r('โรคประจำตัว', p.disease)}
      </div>
      <div class="sec">
        <div class="sec-hdr">ข้อมูลครอบครัว</div>
        ${r('บิดา', fFull)}
        ${r('อาชีพบิดา', p.fatherJob)}
        ${r('มารดา', mFull)}
        ${r('อาชีพมารดา', p.motherJob)}
        ${r('สถานภาพบิดา-มารดา', p.maritalStatus)}
        ${r('นักเรียนอาศัยอยู่กับ', p.livesWith)}
        ${r('เกี่ยวข้องเป็น', p.relationship)}
        ${r('จำนวนพี่น้อง', p.siblingCount ? p.siblingCount + ' คน' : '')}
      </div>
    </div>

    <div class="div"></div>

    <!-- ③ Address + Contact -->
    <div class="g2">
      <div class="sec">
        <div class="sec-hdr">ที่อยู่อาศัย</div>
        <div class="dr"><span class="dv" style="font-size:10.5px;line-height:1.7">${addr || '-'}</span></div>
      </div>
      <div class="sec">
        <div class="sec-hdr">ข้อมูลการติดต่อ</div>
        ${r('โทรผู้ปกครอง', p.guardianPhone)}
        ${r('LINE ผู้ปกครอง', p.guardianLine)}
        ${r('โทรนักเรียน', p.studentPhone)}
        ${r('LINE นักเรียน', p.studentLine)}
      </div>
    </div>

    <!-- ④ Home photos (if any) -->
    ${homePhotosHtml}

    <!-- ⑤ Signature lines -->
    <div class="div"></div>
    <div class="sig">
      <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">ลายมือชื่อนักเรียน<br/>Student Signature</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">ลายมือชื่อผู้ปกครอง<br/>Guardian Signature</div></div>
      <div class="sig-box"><div class="sig-line"></div><div class="sig-lbl">ลายมือชื่อครูที่ปรึกษา<br/>Homeroom Teacher</div></div>
    </div>
  </div>

  <!-- Footer -->
  <div class="foot">
    <span class="foot-cn">学生档案</span>
    <span class="foot-mid">${data.appName || 'ห้องเรียน'} · ห้อง ${s.classId || ''}</span>
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
${cards.join('\n')}
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

      {/* JSON Backup card */}
      <div style={{ ...sCard, border: '2px solid #16A34A', background: '#F0FDF4' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#15803D' }}>🛡️ สำรองข้อมูลทั้งหมด (JSON)</div>
        <div style={{ fontSize: 13, color: '#166534', marginBottom: 12, lineHeight: 1.6 }}>
          บันทึกข้อมูลทั้งหมดเป็นไฟล์ .json เก็บไว้ใน Google Drive หรือโทรศัพท์
          {' '}— ใช้กู้คืนได้ทันทีหากข้อมูลหาย
        </div>
        {lastBackup ? (
          <div style={{ fontSize: 12, color: '#16A34A', marginBottom: 10, fontWeight: 600 }}>
            ✅ สำรองล่าสุด: {fmtBackupDate(lastBackup)}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10, fontWeight: 600 }}>
            ⚠️ ยังไม่เคยสำรองข้อมูล
          </div>
        )}
        <button onClick={doJsonBackup} style={{ ...sBtn(true), width: '100%', padding: 14, fontSize: 16, background: 'linear-gradient(135deg,#16A34A,#15803D)', marginBottom: 10 }}>
          💾 สำรองข้อมูลเดี๋ยวนี้
        </button>
        <input ref={jsonFileRef} type="file" accept=".json" onChange={handleJsonImport} style={{ display: 'none' }}/>
        <button onClick={() => jsonFileRef.current?.click()} style={{ ...sBtn(false), width: '100%', padding: 12, fontSize: 14, color: '#15803D', border: '1.5px solid #16A34A' }}>
          📂 กู้คืนจากไฟล์ JSON
        </button>
      </div>

      {/* Print Student Cards card */}
      <div style={{ ...sCard, border: '2px solid #B91C1C', background: '#FFF5F5' }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: '#B91C1C' }}>🪪 พิมพ์บัตรประวัตินักเรียน</div>
        <div style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12, lineHeight: 1.6 }}>
          สร้างบัตรประวัตินักเรียน 2 คอลัมน์ต่อหน้า A4 พร้อมรูปภาพและข้อมูลส่วนตัวครบถ้วน
        </div>
        <button onClick={openPrintModal} style={{ ...sBtn(true), width: '100%', padding: 14, fontSize: 16, background: 'linear-gradient(135deg,#B91C1C,#991B1B)' }}>
          🖨️ เลือกนักเรียนและพิมพ์...
        </button>
      </div>

      {/* Print modal */}
      <Sheet open={printModal} title="🪪 พิมพ์บัตรประวัตินักเรียน" onClose={() => setPrintModal(false)}>
        {(() => {
          const hrStudents = data.students
            .filter(s => s.classId === data.homeroom)
            .sort((a, b) => (a.number || 999) - (b.number || 999));
          const allSelected = hrStudents.every(s => printSelected.has(s.id));
          return (
            <>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                  ห้อง {data.homeroom} — เลือกแล้ว {printSelected.size} / {hrStudents.length} คน
                </div>
                <button
                  onClick={() => setPrintSelected(allSelected ? new Set() : new Set(hrStudents.map(s => s.id)))}
                  style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', background: 'transparent', border: '1px solid #B91C1C', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                </button>
              </div>

              {/* Student list */}
              <div style={{ maxHeight: '46vh', overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 14 }}>
                {hrStudents.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 14 }}>ไม่มีนักเรียนในห้องประจำชั้น</div>
                ) : hrStudents.map((s, i) => {
                  const checked = printSelected.has(s.id);
                  const hasPhoto = !!(data.profiles?.[s.id]?.profilePhoto);
                  return (
                    <label key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < hrStudents.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer',
                      background: checked ? '#FFF5F5' : 'transparent',
                      transition: 'background 0.15s',
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePrintStudent(s.id)}
                        style={{ width: 18, height: 18, accentColor: '#B91C1C', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: C.muted, fontWeight: 600, minWidth: 28 }}>{s.number || '-'}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>
                        {s.name}
                        {s.nickname ? <span style={{ fontWeight: 400, color: C.muted, fontSize: 12 }}> ({s.nickname})</span> : null}
                        {s.chineseName ? <span style={{ color: '#B91C1C', fontSize: 13, marginLeft: 6 }}>{s.chineseName}</span> : null}
                      </span>
                      <span style={{ fontSize: 11, color: hasPhoto ? '#16A34A' : '#D1D5DB', flexShrink: 0 }}>
                        {hasPhoto ? '📷' : '○'}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#7F1D1D', lineHeight: 1.7 }}>
                💡 หน้าต่างพิมพ์จะเปิดขึ้นอัตโนมัติ — เลือก "Save as PDF" เพื่อบันทึกเป็นไฟล์
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPrintModal(false)} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
                <button
                  onClick={doPrintCards}
                  disabled={printSelected.size === 0}
                  style={{ ...sBtn(true), flex: 2, background: printSelected.size ? 'linear-gradient(135deg,#B91C1C,#991B1B)' : '#ccc', cursor: printSelected.size ? 'pointer' : 'default' }}
                >
                  🖨️ พิมพ์ {printSelected.size > 0 ? `(${printSelected.size} คน)` : ''}
                </button>
              </div>
            </>
          );
        })()}
      </Sheet>

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
