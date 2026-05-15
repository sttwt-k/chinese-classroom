import { GRADE_SCALE, STATUS, CONDUCT_DEF } from './constants';

// ===== UTILS =====

export const todayStr = () => new Date().toISOString().split('T')[0];

export const fmtDate = s => {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export const randomPin = () => String(Math.floor(1000 + Math.random() * 9000));

export const uid = () => '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

export const getGrade = (score, max) => {
  const p = max > 0 ? (score / max) * 100 : 0;
  return GRADE_SCALE.find(g => p >= g.min) || GRADE_SCALE[7];
};

export const gradeColor = g =>
  !g || g.special ? (g?.color || '#dc2626') : g.gpa >= 3 ? '#16a34a' : g.gpa >= 1 ? '#d97706' : '#dc2626';

export const gradeBg = g =>
  !g || g.special ? '#fee2e2' : g.gpa >= 3 ? '#dcfce7' : g.gpa >= 1 ? '#fef9c3' : '#fee2e2';

export const getCatMax = cat =>
  cat.subs?.length > 0 ? cat.subs.reduce((s, x) => s + x.max, 0) : cat.max || 0;

export const getCatScore = (sid, cat, scores, term, year) => {
  if (cat.subs?.length > 0)
    return cat.subs.reduce((t, sub) => {
      const r = scores.find(x => x.studentId === sid && x.categoryId === cat.id && x.subId === sub.id && x.term === term && x.year === year);
      return t + (r ? r.score : 0);
    }, 0);
  const r = scores.find(x => x.studentId === sid && x.categoryId === cat.id && !x.subId && x.term === term && x.year === year);
  return r ? r.score : 0;
};

export const hasCatScore = (sid, cat, scores, term, year) => {
  if (cat.subs?.length > 0)
    return cat.subs.some(sub => scores.some(x => x.studentId === sid && x.categoryId === cat.id && x.subId === sub.id && x.term === term && x.year === year));
  return scores.some(x => x.studentId === sid && x.categoryId === cat.id && !x.subId && x.term === term && x.year === year);
};

export const hasIncomplete = (sid, cat, scores, term, year) => {
  if (!cat.subs?.length) return false;
  return cat.subs.some(sub => !scores.some(x => x.studentId === sid && x.categoryId === cat.id && x.subId === sub.id && x.term === term && x.year === year));
};

export const calcConduct = (sid, att, cfg = CONDUCT_DEF, subjId = null) => {
  const a = att.filter(x => x.studentId === sid && x.type === 'class' && (!subjId || x.subjectId === subjId));
  let score = 0, lc = 0;
  const counts = { present:0, absent:0, late:0, leave_p:0, leave_s:0, activity:0 };
  for (const r of a) {
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status === 'present') score += cfg.presentScore;
    else if (r.status === 'absent') score += cfg.absentScore;
    else if (r.status === 'late') lc++;
    else if (STATUS[r.status]?.custom) {
      const cs = r.customScore || 0;
      if (cs > 0) score += cfg.presentScore;
      else if (cs < 0) score += cfg.absentScore;
      else lc++;
    }
  }
  score += Math.floor(lc / cfg.lateGroup) * cfg.latePenalty;
  return { score, counts, total: a.length };
};

export const calcAttRate = (sid, att, type = 'class', subjId = null) => {
  const a = att.filter(x => x.studentId === sid && x.type === type && (!subjId || x.subjectId === subjId));
  if (!a.length) return null;
  const ok = a.filter(x => {
    if (x.status === 'present' || x.status === 'late') return true;
    if (STATUS[x.status]?.custom) return (x.customScore || 0) >= 0;
    return false;
  }).length;
  return Math.round(ok / a.length * 100);
};

export const getSubjectGrade = (sid, subj, cats, scores, term, year, att, conduct) => {
  const rate = calcAttRate(sid, att, 'class', subj.id);
  if (rate !== null && rate < conduct.minAttPct) return { label:'มส.', gpa:0, special:true, color:'#dc2626' };
  const sc = cats.filter(c => c.subjectId === subj.id);
  if (sc.some(c => hasIncomplete(sid, c, scores, term, year) && hasCatScore(sid, c, scores, term, year)))
    return { label:'ร', gpa:0, special:true, color:'#d97706' };
  const tot = sc.reduce((s, c) => s + getCatScore(sid, c, scores, term, year), 0);
  const mx  = sc.reduce((s, c) => s + getCatMax(c), 0);
  if (!sc.some(c => hasCatScore(sid, c, scores, term, year))) return null;
  return getGrade(tot, mx);
};

export const sortClasses = cls => [...cls].sort((a, b) => {
  const p = c => { const m = c.match(/ม\.(\d+)\/(\d+)/); return m ? parseInt(m[1]) * 100 + parseInt(m[2]) : 999; };
  return p(a) - p(b);
});

export const dateInRange = (ds, range) => {
  if (range === 'term') return true;
  const d = new Date(ds + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (range === 'today') return ds === todayStr();
  if (range === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
  if (range === 'month') { const m = new Date(now); m.setDate(m.getDate() - 30); return d >= m; }
  return true;
};

export const creditToHours = c => c * 2;

// ===== IMAGE COMPRESSION =====
export const compressImg = (file, maxPx = 800, q = 0.75) => new Promise(res => {
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxPx / img.width, maxPx / img.height);
      const cv = document.createElement('canvas');
      cv.width = img.width * ratio; cv.height = img.height * ratio;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', q));
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(file);
});
