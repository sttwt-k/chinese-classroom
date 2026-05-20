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
            'เป้าหมายการออม (บาท)': totalGoal, 'ออมแล้ว (บาท)': totalSa