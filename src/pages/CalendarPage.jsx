import React, { useState, useMemo } from 'react';
import { C, CALENDAR_TYPES } from '../constants';
import { sCard, sBtn, sInp, sLabel } from '../styles';

// ─── helpers ─────────────────────────────────────────────────────────────────
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const THAI_DAYS_SHORT = ['อา','จ','อ','พ','พฤ','ศ','ส'];

const toISO = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

const todayISO = () => {
  const n = new Date();
  return toISO(n.getFullYear(), n.getMonth(), n.getDate());
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// build calendar grid (6 weeks × 7 days) for a given CE year/month
function buildGrid(year, month) {
  const first   = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInM = new Date(year, month + 1, 0).getDate();
  const cells   = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInM; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = (date = '') => ({ title:'', date, type:'activity', note:'', endDate:'' });

// ─── EventDot ─────────────────────────────────────────────────────────────────
function EventDot({ type }) {
  const cfg = CALENDAR_TYPES[type] || CALENDAR_TYPES.other;
  return (
    <span style={{
      display: 'inline-block',
      width: 7, height: 7, borderRadius: '50%',
      background: cfg.color, flexShrink: 0,
    }}/>
  );
}

// ─── EventBadge (in list view) ────────────────────────────────────────────────
function EventBadge({ ev, onClick, onDelete, isTeacher }) {
  const cfg = CALENDAR_TYPES[ev.type] || CALENDAR_TYPES.other;
  return (
    <div
      onClick={() => onClick(ev)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: cfg.bg,
        border: `1px solid ${cfg.color}22`,
        borderLeft: `4px solid ${cfg.color}`,
        borderRadius: 12, cursor: 'pointer',
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {ev.title}
        </div>
        {ev.note && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {ev.note}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, color: cfg.color,
        background: '#fff', padding: '2px 8px', borderRadius: 20,
        border: `1px solid ${cfg.color}44`, whiteSpace:'nowrap',
      }}>{cfg.label}</span>
      {isTeacher && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(ev.id); }}
          style={{ background:'none', border:'none', cursor:'pointer',
                   color: C.muted, fontSize: 16, padding:'2px 4px', lineHeight:1 }}
        >×</button>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200,
        display:'flex', alignItems:'flex-end', justifyContent:'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:'100%', maxWidth:480, background:'#fff',
          borderRadius:'24px 24px 0 0', padding:'24px 20px 32px',
          maxHeight:'90vh', overflowY:'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage({ data, update, role, toast }) {
  const isTeacher = role === 'teacher';
  const today     = todayISO();

  const now       = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());      // 0-indexed CE month
  const [modal,  setModal]  = useState(null);  // null | 'add' | 'detail'
  const [selEv,  setSelEv]  = useState(null);
  const [form,   setForm]   = useState(emptyForm());
  const [selDay, setSelDay] = useState(null);

  const events    = data.calendar || [];
  const thaiYear  = year + 543;

  // events keyed by ISO date
  const evByDate  = useMemo(() => {
    const m = {};
    events.forEach(ev => {
      // support date range (endDate)
      const start = ev.date;
      const end   = ev.endDate && ev.endDate >= start ? ev.endDate : start;
      // iterate days in range
      let cur = new Date(start + 'T00:00:00');
      const stop = new Date(end + 'T00:00:00');
      while (cur <= stop) {
        // ใช้ local date components — ไม่ใช้ toISOString() เพราะแปลงเป็น UTC แล้วเลื่อนวัน
        const key = toISO(cur.getFullYear(), cur.getMonth(), cur.getDate());
        if (!m[key]) m[key] = [];
        m[key].push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return m;
  }, [events]);

  // events for this month (for the list below the grid)
  const monthEvents = useMemo(() => {
    const prefix = `${year}-${String(month+1).padStart(2,'0')}`;
    return events
      .filter(ev => ev.date.startsWith(prefix) ||
                    (ev.endDate && ev.endDate >= prefix + '-01' && ev.date <= prefix + '-31'))
      .sort((a,b) => a.date.localeCompare(b.date));
  }, [events, year, month]);

  // events for selected day
  const dayEvents = selDay ? (evByDate[selDay] || []) : [];

  // ─── navigate ──────────────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // ─── save / delete ─────────────────────────────────────────────────────────
  const saveEvent = () => {
    if (!form.title.trim()) { toast?.('กรุณาใส่ชื่อกิจกรรม', 'error'); return; }
    if (!form.date)         { toast?.('กรุณาเลือกวันที่', 'error'); return; }
    const newEv = { ...form, title: form.title.trim(), id: uid() };
    update(d => ({ ...d, calendar: [...(d.calendar || []), newEv] }));
    setModal(null);
    toast?.('เพิ่มกิจกรรมแล้ว ✓', 'success');
  };

  const deleteEvent = (id) => {
    update(d => ({ ...d, calendar: (d.calendar || []).filter(e => e.id !== id) }));
    if (modal === 'detail') setModal(null);
    toast?.('ลบกิจกรรมแล้ว', 'info');
  };

  const openAdd = (date) => {
    setForm(emptyForm(date || today));
    setModal('add');
  };

  const openDetail = (ev) => { setSelEv(ev); setModal('detail'); };

  // ─── grid ──────────────────────────────────────────────────────────────────
  const cells = buildGrid(year, month);
  const fmtD  = d => d ? `${d.getDate()} ${THAI_MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()+543}` : '';

  return (
    <div style={{ padding: '16px 16px 100px', maxWidth: 520, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={sBtn(false, true)}>‹</button>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>
            {THAI_MONTHS[month]} {thaiYear}
          </div>
        </div>
        <button onClick={nextMonth} style={sBtn(false, true)}>›</button>
      </div>

      {/* ── Calendar Grid ── */}
      <div style={{ ...sCard, padding: 12, marginBottom: 20, overflow:'hidden' }}>
        {/* Day-of-week header */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom: 6 }}>
          {THAI_DAYS_SHORT.map((d,i) => (
            <div key={d} style={{
              textAlign:'center', fontSize: 12, fontWeight: 700,
              color: i === 0 ? '#dc2626' : i === 6 ? '#2563eb' : C.muted,
              paddingBottom: 4,
            }}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 2 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`}/>;
            const iso   = toISO(year, month, day);
            const evs   = evByDate[iso] || [];
            const isToday = iso === today;
            const isSel   = iso === selDay;
            const dow     = idx % 7; // 0=Sun
            return (
              <div
                key={iso}
                onClick={() => setSelDay(iso === selDay ? null : iso)}
                style={{
                  borderRadius: 10, padding: '6px 4px 4px',
                  cursor: 'pointer',
                  background: isSel ? C.red : isToday ? '#fee2e2' : 'transparent',
                  border: isToday && !isSel ? `2px solid ${C.red}` : '2px solid transparent',
                  transition: 'background 0.15s',
                  minHeight: 44,
                  display:'flex', flexDirection:'column', alignItems:'center',
                }}
              >
                <div style={{
                  fontSize: 13, fontWeight: isToday ? 800 : 500, lineHeight: 1,
                  color: isSel ? '#fff' : isToday ? C.red : dow===0 ? '#dc2626' : dow===6 ? '#2563eb' : C.text,
                  marginBottom: 4,
                }}>{day}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:2, justifyContent:'center' }}>
                  {evs.slice(0,3).map((ev,i) => <EventDot key={i} type={ev.type}/>)}
                  {evs.length > 3 && <span style={{ fontSize:9, color:C.muted }}>+{evs.length-3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Selected Day Events ── */}
      {selDay && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10,
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
              📅 {fmtD(new Date(selDay + 'T00:00:00'))}
            </div>
            {isTeacher && (
              <button onClick={() => openAdd(selDay)} style={{ ...sBtn(true,true), fontSize: 13 }}>
                + เพิ่ม
              </button>
            )}
          </div>
          {dayEvents.length === 0 ? (
            <div style={{
              textAlign:'center', color: C.muted, fontSize: 13,
              padding: '20px 0', background:'#f8fafc', borderRadius:12,
            }}>ไม่มีกิจกรรมในวันนี้</div>
          ) : (
            dayEvents.map(ev => (
              <EventBadge key={ev.id} ev={ev}
                onClick={openDetail}
                onDelete={deleteEvent}
                isTeacher={isTeacher}
              />
            ))
          )}
        </div>
      )}

      {/* ── Month List ── */}
      <div>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
            📋 กิจกรรมเดือนนี้ ({monthEvents.length})
          </div>
          {isTeacher && !selDay && (
            <button onClick={() => openAdd()} style={{ ...sBtn(true,true), fontSize: 13 }}>
              + เพิ่มกิจกรรม
            </button>
          )}
        </div>

        {monthEvents.length === 0 ? (
          <div style={{
            ...sCard, padding: 32, textAlign:'center',
            color: C.muted, fontSize: 14,
          }}>
            ยังไม่มีกิจกรรมในเดือนนี้<br/>
            {isTeacher && <span style={{ fontSize:12, marginTop:6, display:'block' }}>
              กดปุ่ม "+ เพิ่มกิจกรรม" เพื่อเริ่มต้น
            </span>}
          </div>
        ) : (
          monthEvents.map(ev => (
            <EventBadge key={ev.id} ev={ev}
              onClick={openDetail}
              onDelete={deleteEvent}
              isTeacher={isTeacher}
            />
          ))
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ ...sCard, padding: '12px 16px', marginTop: 16 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8 }}>ประเภทกิจกรรม</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
          {Object.entries(CALENDAR_TYPES).map(([k, cfg]) => (
            <span key={k} style={{
              display:'inline-flex', alignItems:'center', gap: 5,
              fontSize: 12, padding: '3px 10px', borderRadius: 20,
              background: cfg.bg, color: cfg.color, fontWeight: 600,
              border: `1px solid ${cfg.color}44`,
            }}>
              {cfg.icon} {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* ══ MODAL: Add Event ══ */}
      {modal === 'add' && (
        <Modal onClose={() => setModal(null)}>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 20, color: C.text }}>
            📅 เพิ่มกิจกรรม
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={sLabel}>ชื่อกิจกรรม *</label>
            <input
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={sInp}
              placeholder="เช่น สอบกลางภาค"
              autoFocus
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={sLabel}>วันที่เริ่ม *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                style={sInp}
              />
            </div>
            <div>
              <label style={sLabel}>วันที่สิ้นสุด</label>
              <input
                type="date"
                value={form.endDate}
                min={form.date}
                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                style={sInp}
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={sLabel}>ประเภท</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 8, marginTop: 4 }}>
              {Object.entries(CALENDAR_TYPES).map(([k, cfg]) => (
                <button
                  key={k}
                  onClick={() => setForm(p => ({ ...p, type: k }))}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor:'pointer', fontFamily:'inherit',
                    fontSize: 13, fontWeight: 600,
                    border: `2px solid ${form.type === k ? cfg.color : 'transparent'}`,
                    background: form.type === k ? cfg.bg : '#f1f5f9',
                    color: form.type === k ? cfg.color : C.muted,
                    transition: 'all 0.15s',
                  }}
                >{cfg.icon} {cfg.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={sLabel}>หมายเหตุ</label>
            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              style={{ ...sInp, height: 80, resize:'vertical' }}
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            />
          </div>

          <div style={{ display:'flex', gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ ...sBtn(false), flex:1 }}>ยกเลิก</button>
            <button onClick={saveEvent} style={{ ...sBtn(true), flex:2 }}>บันทึก</button>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Event Detail ══ */}
      {modal === 'detail' && selEv && (() => {
        const cfg = CALENDAR_TYPES[selEv.type] || CALENDAR_TYPES.other;
        const fmtRange = () => {
          const d1 = fmtD(new Date(selEv.date + 'T00:00:00'));
          if (!selEv.endDate || selEv.endDate === selEv.date) return d1;
          return `${d1} – ${fmtD(new Date(selEv.endDate + 'T00:00:00'))}`;
        };
        return (
          <Modal onClose={() => setModal(null)}>
            <div style={{
              display:'flex', alignItems:'flex-start', gap: 14, marginBottom: 20,
            }}>
              <span style={{
                fontSize: 36, width: 56, height: 56, background: cfg.bg,
                borderRadius: 16, display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink: 0,
              }}>{cfg.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{selEv.title}</div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: cfg.color,
                  background: cfg.bg, padding:'2px 10px', borderRadius:20, marginTop:4,
                  display:'inline-block',
                }}>{cfg.label}</span>
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 12, color: C.muted, fontSize: 14 }}>
              <span>📅</span> {fmtRange()}
            </div>

            {selEv.note && (
              <div style={{
                background: '#f8fafc', borderRadius: 12, padding: '12px 16px',
                color: C.text, fontSize: 14, lineHeight: 1.6, marginBottom: 20,
              }}>{selEv.note}</div>
            )}

            {isTeacher ? (
              <div style={{ display:'flex', gap: 10 }}>
                <button
                  onClick={() => deleteEvent(selEv.id)}
                  style={{
                    ...sBtn(false), flex:1, color:'#dc2626',
                    border: '1.5px solid #dc2626',
                  }}
                >🗑 ลบ</button>
                <button onClick={() => setModal(null)} style={{ ...sBtn(true), flex:2 }}>ปิด</button>
              </div>
            ) : (
              <button onClick={() => setModal(null)} style={{ ...sBtn(true), width:'100%' }}>ปิด</button>
            )}
          </Modal>
        );
      })()}
    </div>
  );
}
