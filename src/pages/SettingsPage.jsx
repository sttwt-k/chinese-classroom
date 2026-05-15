import React, { useState, useMemo } from 'react';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { C, DEFAULT_CLASSES } from '../constants';
import { sCard, sBtn, sInp } from '../styles';
import { sortClasses } from '../utils';
import Sheet from '../components/Sheet';

export default function SettingsPage({ data, update, systemActions, toast }) {
  // systemActions may be undefined if hook doesn't provide it — guard everywhere
  const sa = systemActions || {};

  const [form, setForm] = useState({
    appName:       data.appName || 'ห้องเรียนของคุณครูต้นฝน',
    term:          data.term,
    year:          data.year,
    homeroom:      data.homeroom,
    teacherUsername: data.teacherUsername || 'puntoy',
    password:      '',
    presentScore:  data.conduct.presentScore,
    absentScore:   data.conduct.absentScore,
    lateGroup:     data.conduct.lateGroup,
    latePenalty:   data.conduct.latePenalty,
    minAttPct:     data.conduct.minAttPct,
  });

  const [wipeModal,  setWipeModal]  = useState(false);
  const [wipeOpts,   setWipeOpts]   = useState({ students: false, attendance: false, scores: false, savings: false });
  const [termModal,  setTermModal]  = useState(false);
  const [termForm,   setTermForm]   = useState({ term: data.term === 1 ? 2 : 1, year: data.term === 1 ? data.year : data.year + 1 });
  const [termOpts,   setTermOpts]   = useState({ keepAtt: false, keepScore: false, keepTt: false, keepSav: false });
  const [switchId,   setSwitchId]   = useState(sa.sysConfig?.activeDocId || '');

  const sortedCls = useMemo(() => sortClasses(data.classes), [data.classes]);

  // --------- Save settings ---------
  const save = async () => {
    update(prev => ({
      ...prev,
      appName:  form.appName.trim() || prev.appName,
      term:     parseInt(form.term)  || prev.term,
      year:     parseInt(form.year)  || prev.year,
      homeroom: form.homeroom,
      teacherUsername: form.teacherUsername.trim() || 'puntoy',
      password: form.password.trim() || prev.password,
      conduct: {
        presentScore: parseFloat(form.presentScore) || 0,
        absentScore:  parseFloat(form.absentScore)  || 0,
        lateGroup:    parseInt(form.lateGroup)       || 3,
        latePenalty:  parseFloat(form.latePenalty)  || 0,
        minAttPct:    parseInt(form.minAttPct)       || 20,
      },
    }));

    // Update term label in history if system config is available
    if (sa?.sysConfig) {
      const newLabel   = `ภาคเรียน ${form.term}/${form.year}`;
      const newHistory = (sa.sysConfig.history || []).map(h =>
        h.id === sa.sysConfig.activeDocId ? { ...h, label: newLabel } : h
      );
      try {
        await setDoc(doc(getFirestore(), 'app_data', '_system_config'), { ...sa.sysConfig, history: newHistory });
      } catch (e) {
        console.warn('Could not update system config:', e);
      }
    }

    toast('บันทึกการตั้งค่าแล้ว', 'success');
    setForm(p => ({ ...p, password: '' }));
  };

  // --------- New term ---------
  const handleCreateTerm = async () => {
    if (!sa?.createNewTerm) { toast('ฟีเจอร์นี้ไม่พร้อมใช้งาน', 'error'); return; }
    await sa.createNewTerm(termForm.term, termForm.year, termOpts);
    setTermModal(false);
    toast('สร้างและสลับไปภาคเรียนใหม่สำเร็จ', 'success');
  };

  // --------- Switch term ---------
  const handleSwitch = async () => {
    if (!switchId) return;
    if (!sa?.switchTerm) { toast('ฟีเจอร์นี้ไม่พร้อมใช้งาน', 'error'); return; }
    await sa.switchTerm(switchId);
    toast('สลับภาคเรียนแล้ว', 'success');
  };

  // --------- Wipe data ---------
  const confirmWipe = () => {
    update(prev => {
      const next = { ...prev };
      if (wipeOpts.students)   { next.students = []; next.profiles = {}; next.classes = DEFAULT_CLASSES; }
      if (wipeOpts.attendance) { next.attendance = []; }
      if (wipeOpts.scores)     { next.scores = []; next.categories = []; }
      if (wipeOpts.savings)    { next.savings = {}; }
      return next;
    });
    setWipeModal(false);
    toast('ล้างข้อมูลที่เลือกในเทอมนี้แล้ว', 'success');
  };

  const historyList = sa.sysConfig?.history || [];

  return (
    <div style={{ padding: '14px 14px 100px' }}>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 16, color: C.text, letterSpacing: '-0.5px' }}>⚙️ ตั้งค่าระบบ</div>

      {/* Term database management */}
      <div style={{ ...sCard, border: `2px solid ${C.red}` }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: C.red }}>🗄️ การจัดการฐานข้อมูล (แยกเทอม)</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>สลับไปดูข้อมูลเทอมก่อนหน้า หรือเทอมอื่นๆ ได้ที่นี่</div>

        {historyList.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <select value={switchId} onChange={e => setSwitchId(e.target.value)} style={{ ...sInp, flex: 1, fontFamily: 'inherit' }}>
              {historyList.map(h => (
                <option key={h.id} value={h.id}>
                  {h.label} {h.id === sa.sysConfig?.activeDocId ? '(เทอมปัจจุบัน)' : ''}
                </option>
              ))}
            </select>
            <button onClick={handleSwitch} style={{ ...sBtn(true), background: C.blue, padding: '10px 16px', flexShrink: 0 }}>🔄 สลับ</button>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, padding: '10px 12px', background: C.light, borderRadius: 8 }}>ยังไม่มีประวัติเทอม (ระบบ multi-term อาจไม่ได้ตั้งค่าไว้)</div>
        )}

        <button
          onClick={() => setTermModal(true)}
          style={{ ...sBtn(false), width: '100%', border: `2px dashed ${C.red}`, color: C.red, background: 'transparent', padding: 14 }}
        >
          ➕ ขึ้นเทอมใหม่ (สร้างฐานข้อมูลใหม่)
        </button>
      </div>

      {/* App name */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🏫 ชื่อแอปพลิเคชัน</div>
        <input value={form.appName} onChange={e => setForm(p => ({ ...p, appName: e.target.value }))} style={sInp}/>
      </div>

      {/* Term / homeroom */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📅 แก้ไขชื่อภาคเรียน (เฉพาะฐานข้อมูลนี้)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ภาคเรียน</div>
            <select value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))} style={{ ...sInp, fontFamily: 'inherit' }}>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ปี (พ.ศ.)</div>
            <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} style={sInp}/>
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ห้องประจำชั้น</div>
        <select value={form.homeroom} onChange={e => setForm(p => ({ ...p, homeroom: e.target.value }))} style={{ ...sInp, fontFamily: 'inherit' }}>
          {sortedCls.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Conduct scoring */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🎯 จิตพิสัย (คาบเรียน)</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>ลา/กิจกรรม: +มา · -ขาด · 0=สาย</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>มา (+)</div>
            <input type="number" step="0.5" value={form.presentScore} onChange={e => setForm(p => ({ ...p, presentScore: e.target.value }))} style={sInp}/>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ขาด (-)</div>
            <input type="number" step="0.5" value={form.absentScore} onChange={e => setForm(p => ({ ...p, absentScore: e.target.value }))} style={sInp}/>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>สาย ทุก N ครั้ง</div>
            <input type="number" value={form.lateGroup} onChange={e => setForm(p => ({ ...p, lateGroup: e.target.value }))} style={sInp}/>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>หักคะแนน</div>
            <input type="number" step="0.5" value={form.latePenalty} onChange={e => setForm(p => ({ ...p, latePenalty: e.target.value }))} style={sInp}/>
          </div>
        </div>
      </div>

      {/* มส. threshold */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🚨 มส. (เข้าเรียนต่ำกว่า %)</div>
        <input type="number" value={form.minAttPct} onChange={e => setForm(p => ({ ...p, minAttPct: e.target.value }))} style={sInp}/>
      </div>

      {/* Teacher account */}
      <div style={sCard}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🔐 บัญชีครูผู้สอน</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>ชื่อผู้ใช้ (Username)</div>
        <input value={form.teacherUsername} onChange={e => setForm(p => ({ ...p, teacherUsername: e.target.value }))} style={{ ...sInp, marginBottom: 12 }} placeholder="เช่น puntoy"/>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>รหัสผ่านใหม่ (ทิ้งว่างถ้าไม่ต้องการเปลี่ยน)</div>
        <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={sInp} placeholder="เว้นว่าง = ไม่เปลี่ยน"/>
      </div>

      <button onClick={save} style={{ ...sBtn(true), width: '100%', padding: 16, fontSize: 18, marginBottom: 16, boxShadow: '0 4px 12px rgba(229,57,53,0.3)' }}>
        💾 บันทึกการตั้งค่า
      </button>
      <button onClick={() => setWipeModal(true)} style={{ width: '100%', padding: 14, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        ⚠️ ล้างข้อมูลในเทอมปัจจุบันนี้...
      </button>

      {/* Wipe modal */}
      <Sheet open={wipeModal} title="⚠️ ล้างข้อมูลเฉพาะเทอมนี้" onClose={() => setWipeModal(false)}>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>ข้อมูลที่ถูกลบในเทอมนี้จะไม่สามารถกู้คืนได้ (ควรใช้กรณีที่กรอกข้อมูลผิดพลาดทั้งหมด)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {[
            { k: 'students',   l: 'รายชื่อนักเรียนทั้งหมด (รวมประวัติ รูปถ่าย และห้องเรียน)' },
            { k: 'attendance', l: 'ประวัติการเช็คชื่อทั้งหมด (แถวและคาบเรียน)' },
            { k: 'scores',     l: 'คะแนนเก็บทั้งหมด (รวมถึงหมวดหมู่คะแนน)' },
            { k: 'savings',    l: 'ประวัติเป้าหมายและการออมเงิน' },
          ].map(o => (
            <label key={o.k} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
              border: `2px solid ${wipeOpts[o.k] ? C.red : C.border}`,
              borderRadius: 12, background: wipeOpts[o.k] ? '#FFF5F5' : 'white',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              <input type="checkbox" checked={wipeOpts[o.k]} onChange={() => setWipeOpts(p => ({ ...p, [o.k]: !p[o.k] }))} style={{ width: 22, height: 22, accentColor: C.red, marginTop: 2 }}/>
              <span style={{ fontSize: 15, fontWeight: wipeOpts[o.k] ? 700 : 500, color: wipeOpts[o.k] ? C.red : C.text }}>{o.l}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setWipeModal(false)} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
          <button
            onClick={confirmWipe}
            disabled={!Object.values(wipeOpts).some(Boolean)}
            style={{ ...sBtn(true), flex: 1, opacity: Object.values(wipeOpts).some(Boolean) ? 1 : 0.5 }}
          >
            ยืนยันการลบ
          </button>
        </div>
      </Sheet>

      {/* New term modal */}
      <Sheet open={termModal} title="➕ สร้างฐานข้อมูลเทอมใหม่" onClose={() => setTermModal(false)}>
        <div style={{ fontSize: 14, color: C.text, marginBottom: 16, lineHeight: 1.5 }}>
          ระบบจะสร้างฐานข้อมูลใหม่ขึ้นมา และคัดลอก <b>"รายชื่อนักเรียน ประวัตินักเรียน และรายวิชาทั้งหมด"</b> ให้อัตโนมัติ เพื่อให้เริ่มสอนเทอมใหม่ได้ทันที
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>เทอมใหม่</div>
            <select value={termForm.term} onChange={e => setTermForm(p => ({ ...p, term: parseInt(e.target.value) }))} style={{ ...sInp, fontFamily: 'inherit' }}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3 (ซัมเมอร์)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>ปีการศึกษาใหม่ (พ.ศ.)</div>
            <input type="number" value={termForm.year} onChange={e => setTermForm(p => ({ ...p, year: parseInt(e.target.value) }))} style={sInp}/>
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>ตัวเลือกการคัดลอกเพิ่มเติม</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked disabled style={{ accentColor: C.red, width: 18, height: 18 }}/>
            <span style={{ fontSize: 15, color: C.muted }}>นักเรียน ประวัติ และวิชา (บังคับคัดลอก)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={termOpts.keepTt} onChange={() => setTermOpts(p => ({ ...p, keepTt: !p.keepTt }))} style={{ accentColor: C.red, width: 18, height: 18 }}/>
            <span style={{ fontSize: 15 }}>คัดลอกตารางสอนเดิมมาด้วย</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={termOpts.keepSav} onChange={() => setTermOpts(p => ({ ...p, keepSav: !p.keepSav }))} style={{ accentColor: C.red, width: 18, height: 18 }}/>
            <span style={{ fontSize: 15 }}>คัดลอกข้อมูลเงินออมเดิมมาด้วย</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setTermModal(false)} style={{ ...sBtn(false), flex: 1, padding: 14 }}>ยกเลิก</button>
          <button onClick={handleCreateTerm} style={{ ...sBtn(true), flex: 1, padding: 14 }}>สร้างเทอมใหม่</button>
        </div>
      </Sheet>
    </div>
  );
}
