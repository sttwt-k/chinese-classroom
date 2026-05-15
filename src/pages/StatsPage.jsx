import React, { useState, useMemo } from 'react';
import { C, STATUS, S_ORDER } from '../constants';
import { sCard, sInp, sTab } from '../styles';
import {
  calcAttRate, calcConduct, getCatMax, getCatScore, hasCatScore,
  getSubjectGrade, getGrade, gradeColor, gradeBg, sortClasses, dateInRange,
} from '../utils';

export default function StatsPage({ data }) {
  const [sub, setSub]           = useState('morning');
  const [cls, setCls]           = useState('');
  const [range, setRange]       = useState('term');
  const [statSubjId, setStatSubjId] = useState(data.subjects[0]?.id || '');

  const classesHave = sortClasses(data.classes.filter(c => data.students.some(s => s.classId === c)));
  const students    = cls ? data.students.filter(s => s.classId === cls) : data.students;

  const filteredAtt = useMemo(
    () => data.attendance.filter(a => dateInRange(a.date, range)),
    [data.attendance, range]
  );

  const ranges = [
    { id: 'today', label: 'วันนี้' },
    { id: 'week',  label: 'สัปดาห์' },
    { id: 'month', label: 'เดือน' },
    { id: 'term',  label: 'ทั้งภาค' },
  ];

  const morningStats = useMemo(() =>
    students.map(stu => {
      const att    = filteredAtt.filter(a => a.studentId === stu.id && a.type === 'morning');
      const counts = {};
      S_ORDER.forEach(k => counts[k] = 0);
      att.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
      const pct = att.length ? Math.round((counts.present + counts.late) / att.length * 100) : null;
      return { stu, counts, total: att.length, pct };
    }).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101)),
    [students, filteredAtt]
  );

  const classStats = useMemo(() =>
    students.map(stu => {
      const cd      = calcConduct(stu.id, filteredAtt, data.conduct, statSubjId || null);
      const rate    = calcAttRate(stu.id, filteredAtt, 'class', statSubjId || null);
      const eligible = rate === null || rate >= data.conduct.minAttPct;
      return { stu, ...cd, rate, eligible };
    }).sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101)),
    [students, filteredAtt, data.conduct, statSubjId]
  );

  const statSubj = data.subjects.find(s => s.id === statSubjId);

  const scoreStats = useMemo(() => {
    const subj  = statSubj;
    const sCats = subj ? data.categories.filter(c => c.subjectId === subj.id) : [];
    return students.map(stu => {
      const mx    = sCats.reduce((s, c) => s + getCatMax(c), 0);
      const tot   = sCats.reduce((s, c) => s + getCatScore(stu.id, c, data.scores, data.term, data.year), 0);
      const has   = sCats.some(c => hasCatScore(stu.id, c, data.scores, data.term, data.year));
      const grade = has && subj
        ? getSubjectGrade(stu.id, subj, data.categories, data.scores, data.term, data.year, data.attendance, data.conduct)
        : null;
      return { stu, tot, mx, has, grade };
    }).sort((a, b) => b.tot - a.tot);
  }, [students, statSubj, data]);

  const gradeDist = useMemo(() => {
    const d = { '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0': 0, 'ร': 0, 'มส.': 0 };
    scoreStats.filter(s => s.grade).forEach(s => { if (d[s.grade.label] !== undefined) d[s.grade.label]++; });
    return d;
  }, [scoreStats]);

  return (
    <div style={{ padding: '14px 14px 100px' }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, color: C.text, letterSpacing: '-0.5px' }}>📈 สถิติ</div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'white', padding: 6, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setSub('morning')} style={{ ...sTab(sub === 'morning'), flex: 1 }}>🌅 แถว</button>
        <button onClick={() => setSub('class')}   style={{ ...sTab(sub === 'class'),   flex: 1 }}>📚 คาบ</button>
        <button onClick={() => setSub('score')}   style={{ ...sTab(sub === 'score'),   flex: 1 }}>📊 คะแนน</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: sub === 'morning' ? 14 : 10 }}>
        <select value={cls} onChange={e => setCls(e.target.value)} style={{ ...sInp, flex: 1, fontFamily: 'inherit' }}>
          <option value="">ทุกห้อง ({data.students.length})</option>
          {classesHave.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={range} onChange={e => setRange(e.target.value)} style={{ ...sInp, flex: 1, fontFamily: 'inherit' }}>
          {ranges.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      {(sub === 'class' || sub === 'score') && (
        <select value={statSubjId} onChange={e => setStatSubjId(e.target.value)} style={{ ...sInp, marginBottom: 14, fontFamily: 'inherit' }}>
          {data.subjects.map(s => (
            <option key={s.id} value={s.id}>{s.code ? `${s.code} ${s.name}` : s.name}</option>
          ))}
        </select>
      )}

      {/* Morning attendance */}
      {sub === 'morning' && morningStats.map(({ stu, counts, total, pct }) => (
        <div key={stu.id} style={{ ...sCard, marginBottom: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: total ? 8 : 0 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{stu.nickname || stu.name}</span>
              <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>{stu.classId}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: pct === null ? C.muted : pct >= 80 ? '#16a34a' : '#dc2626' }}>
              {pct !== null ? `${pct}%` : '-'}
            </span>
          </div>
          {total > 0 && <>
            <div style={{ height: 6, borderRadius: 3, background: '#f3f4f6', marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#16a34a' : '#dc2626', borderRadius: 3 }}/>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 500 }}>
              {S_ORDER.map(k => counts[k] > 0 ? <span key={k} style={{ color: STATUS[k].bg }}>{STATUS[k].short} {counts[k]}</span> : null)}
            </div>
          </>}
        </div>
      ))}

      {/* Class attendance */}
      {sub === 'class' && classStats.map(({ stu, score, counts, total, rate, eligible }) => (
        <div key={stu.id} style={{ ...sCard, marginBottom: 10, padding: 16, borderLeft: !eligible ? '4px solid #dc2626' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: total ? 8 : 0 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{stu.nickname || stu.name}</span>
              <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>{stu.classId}</span>
              {!eligible && (
                <span style={{ fontSize: 11, color: 'white', background: '#dc2626', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 700 }}>มส.</span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: rate === null ? C.muted : rate >= 80 ? '#16a34a' : '#dc2626' }}>
                {rate ?? '-'}%
              </div>
              {total > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>จิตพิสัย {score > 0 ? '+' : ''}{score}</div>}
            </div>
          </div>
          {total > 0 && <>
            <div style={{ height: 6, borderRadius: 3, background: '#f3f4f6', marginBottom: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${rate}%`, background: rate >= 80 ? '#16a34a' : '#dc2626', borderRadius: 3 }}/>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 500 }}>
              {S_ORDER.map(k => counts[k] > 0 ? <span key={k} style={{ color: STATUS[k].bg }}>{STATUS[k].short} {counts[k]}</span> : null)}
            </div>
          </>}
        </div>
      ))}

      {/* Score stats */}
      {sub === 'score' && <>
        <div style={{ ...sCard, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📊 จำนวนนักเรียนแต่ละเกรด · {statSubj?.name}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
            {Object.entries(gradeDist).map(([g, n]) => {
              const sp = g === 'ร' || g === 'มส.';
              return (
                <div key={g} style={{
                  background: n > 0 ? (sp ? '#FEF2F2' : C.bg) : C.card,
                  borderRadius: 10, padding: '10px 6px', textAlign: 'center',
                  border: `1px solid ${n > 0 ? (sp ? '#FCA5A5' : C.border) : C.border}`,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: sp ? '#dc2626' : C.text }}>{n}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4, fontWeight: 600 }}>{g}</div>
                </div>
              );
            })}
          </div>
        </div>

        {scoreStats.map(({ stu, tot, mx, has, grade }) => (
          <div key={stu.id} style={{ ...sCard, marginBottom: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: has ? 8 : 0 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{stu.nickname || stu.name}</span>
                <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>{stu.classId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {has && <span style={{ fontSize: 15, fontWeight: 700 }}>{tot}/{mx}</span>}
                {grade && (
                  <span style={{ fontWeight: 700, fontSize: 14, padding: '4px 12px', borderRadius: 10, background: gradeBg(grade), color: gradeColor(grade) }}>
                    {grade.label}
                  </span>
                )}
                {!has && <span style={{ fontSize: 13, color: C.muted }}>-</span>}
              </div>
            </div>
            {has && mx > 0 && (
              <div style={{ height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(tot / mx) * 100}%`, background: gradeColor(grade), borderRadius: 3 }}/>
              </div>
            )}
          </div>
        ))}
      </>}
    </div>
  );
}
