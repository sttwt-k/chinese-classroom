import React, { useState, useRef } from 'react';
import { C, BLOOD_TYPES, RELIGIONS, MARITAL } from '../constants';
import { sCard, sBtn, sInp, sTab, sLabel } from '../styles';
import { fmtDate, todayStr } from '../utils';
import { emptyProfile, emptyGoal, profileCompletion, calcSavings } from '../models';
import { compressImg } from '../utils';
import { FormInp, FormSel, Row2, Row4 } from '../components/FormInputs';
import Sheet from '../components/Sheet';

// ─────────────────────────────────────────────
// ProfileForm
// ─────────────────────────────────────────────
function ProfileForm({ student, profile, onSave, onBack, toast }) {
  const [form, setForm] = useState({ ...emptyProfile(), ...profile });
  const [sec,  setSec]  = useState(0);
  const profileRef      = useRef(null);
  const homeRef         = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleBirthday = v => {
    let age = form.age;
    if (v) {
      const diff = Date.now() - new Date(v).getTime();
      age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }
    setForm(p => ({ ...p, birthday: v, age }));
  };

  const handleProfilePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { set('profilePhoto', await compressImg(file, 600, 0.8)); toast('พร้อมอัปโหลดรูปแล้ว', 'success'); }
    catch { toast('เลือกรูปไม่สำเร็จ', 'error'); }
    e.target.value = '';
  };

  const handleHomePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    if ((form.homePhotos || []).length >= 5) return toast('รูปบ้านสูงสุด 5 รูป', 'error');
    try {
      const c = await compressImg(file, 900, 0.75);
      setForm(p => ({ ...p, homePhotos: [...(p.homePhotos || []), c] }));
      toast('เพิ่มรูปรอเซฟแล้ว', 'success');
    } catch { toast('เลือกรูปไม่สำเร็จ', 'error'); }
    e.target.value = '';
  };

  const sections    = ['ข้อมูลส่วนตัว', 'ที่อยู่', 'ครอบครัว', 'ติดต่อ', 'รูปภาพ'];
  const completion  = profileCompletion(form);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={onBack} style={{ ...sBtn(false, true), padding: '7px 12px' }}>← กลับ</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{student.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>ข้อมูลครบ {completion}%</div>
        </div>
        <button onClick={() => onSave(form)} style={sBtn(true, true)}>💾 บันทึก</button>
      </div>

      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {sections.map((s, i) => <button key={i} onClick={() => setSec(i)} style={sTab(sec === i)}>{s}</button>)}
      </div>

      {/* Section 0 – ข้อมูลส่วนตัว */}
      {sec === 0 && (
        <div style={sCard}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.text }}>ข้อมูลส่วนตัว</div>
          <FormInp label="เลขบัตรประจำตัวประชาชน (13 หลัก)" val={form.idCard} onChange={v => set('idCard', v)} placeholder="x-xxxx-xxxxx-xx-x"/>
          <Row2>
            <FormInp label="วัน/เดือน/ปีเกิด" val={form.birthday} onChange={handleBirthday} type="date"/>
            <FormInp label="อายุ (ปี)" val={form.age} onChange={v => set('age', v)} type="number" placeholder="15"/>
          </Row2>
          <Row2>
            <FormSel label="หมู่เลือด" val={form.bloodType} onChange={v => set('bloodType', v)} options={BLOOD_TYPES}/>
            <FormInp label="เชื้อชาติ" val={form.ethnicity} onChange={v => set('ethnicity', v)} placeholder="ไทย"/>
          </Row2>
          <Row2>
            <FormInp label="สัญชาติ" val={form.nationality} onChange={v => set('nationality', v)} placeholder="ไทย"/>
            <FormSel label="ศาสนา" val={form.religion} onChange={v => set('religion', v)} options={RELIGIONS}/>
          </Row2>
          <Row2>
            <FormInp label="น้ำหนัก (กก.)" val={form.weight} onChange={v => set('weight', v)} type="number" placeholder="45"/>
            <FormInp label="ส่วนสูง (ซม.)" val={form.height} onChange={v => set('height', v)} type="number" placeholder="160"/>
          </Row2>
          <FormInp label="โรคประจำตัว" val={form.disease} onChange={v => set('disease', v)} placeholder="ระบุหากมี หรือ -"/>
          <button onClick={() => setSec(1)} style={{ ...sBtn(true), width: '100%', marginTop: 8 }}>ถัดไป: ที่อยู่ →</button>
        </div>
      )}

      {/* Section 1 – ที่อยู่ */}
      {sec === 1 && (
        <div style={sCard}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.text }}>ที่อยู่อาศัย</div>
          <Row2>
            <FormInp label="บ้านเลขที่" val={form.houseNo} onChange={v => set('houseNo', v)}/>
            <FormInp label="หมู่ที่" val={form.village} onChange={v => set('village', v)} type="number"/>
          </Row2>
          <FormInp label="ถนน" val={form.road} onChange={v => set('road', v)}/>
          <FormInp label="ตำบล/แขวง" val={form.subDistrict} onChange={v => set('subDistrict', v)}/>
          <FormInp label="อำเภอ/เขต" val={form.district} onChange={v => set('district', v)}/>
          <FormInp label="จังหวัด" val={form.province} onChange={v => set('province', v)}/>
          <FormInp label="รหัสไปรษณีย์" val={form.postalCode} onChange={v => set('postalCode', v)} placeholder="50000"/>
          <button onClick={() => setSec(2)} style={{ ...sBtn(true), width: '100%', marginTop: 8 }}>ถัดไป: ครอบครัว →</button>
        </div>
      )}

      {/* Section 2 – ครอบครัว */}
      {sec === 2 && (
        <div style={sCard}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.text }}>ข้อมูลครอบครัว</div>
          <Row2>
            <FormInp label="สมาชิกในครอบครัว (คน)" val={form.familyCount} onChange={v => set('familyCount', v)} type="number"/>
            <FormInp label="จำนวนพี่น้อง (คน)" val={form.siblingCount} onChange={v => set('siblingCount', v)} type="number"/>
          </Row2>
          <FormInp label="เป็นบุตรลำดับที่" val={form.childOrder} onChange={v => set('childOrder', v)} type="number" placeholder="1"/>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, marginTop: 8, fontWeight: 500 }}>จำนวนพี่น้อง</div>
          <Row4>
            {[['พี่ชาย', 'brotherOlder'], ['น้องชาย', 'brotherYounger'], ['พี่สาว', 'sisterOlder'], ['น้องสาว', 'sisterYounger']].map(([l, k]) => (
              <div key={k}>
                <label style={{ ...sLabel, fontSize: 12, textAlign: 'center' }}>{l}</label>
                <input type="number" min="0" value={form[k] || 0} onChange={e => set(k, parseInt(e.target.value) || 0)} style={{ ...sInp, textAlign: 'center', padding: '10px 4px' }}/>
              </div>
            ))}
          </Row4>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 12 }}>👨 ข้อมูลบิดา</div>
            <Row2>
              <FormInp label="ชื่อ" val={form.fatherName} onChange={v => set('fatherName', v)}/>
              <FormInp label="นามสกุล" val={form.fatherSurname} onChange={v => set('fatherSurname', v)}/>
            </Row2>
            <Row2>
              <FormInp label="อายุ (ปี)" val={form.fatherAge} onChange={v => set('fatherAge', v)} type="number"/>
              <FormInp label="อาชีพ" val={form.fatherJob} onChange={v => set('fatherJob', v)}/>
            </Row2>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 12 }}>👩 ข้อมูลมารดา</div>
            <Row2>
              <FormInp label="ชื่อ" val={form.motherName} onChange={v => set('motherName', v)}/>
              <FormInp label="นามสกุล" val={form.motherSurname} onChange={v => set('motherSurname', v)}/>
            </Row2>
            <Row2>
              <FormInp label="อายุ (ปี)" val={form.motherAge} onChange={v => set('motherAge', v)} type="number"/>
              <FormInp label="อาชีพ" val={form.motherJob} onChange={v => set('motherJob', v)}/>
            </Row2>
          </div>
          <FormSel label="สถานภาพบิดา-มารดา" val={form.maritalStatus} onChange={v => set('maritalStatus', v)} options={MARITAL}/>
          <Row2>
            <FormInp label="นักเรียนอาศัยอยู่กับ" val={form.livesWith} onChange={v => set('livesWith', v)}/>
            <FormInp label="เกี่ยวข้องเป็น" val={form.relationship} onChange={v => set('relationship', v)} placeholder="เช่น บิดา ปู่"/>
          </Row2>
          <button onClick={() => setSec(3)} style={{ ...sBtn(true), width: '100%', marginTop: 8 }}>ถัดไป: ติดต่อ →</button>
        </div>
      )}

      {/* Section 3 – ติดต่อ */}
      {sec === 3 && (
        <div style={sCard}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.text }}>ข้อมูลการติดต่อ</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 12 }}>📱 ผู้ปกครอง</div>
          <Row2>
            <FormInp label="เบอร์โทรศัพท์" val={form.guardianPhone} onChange={v => set('guardianPhone', v)} type="tel" placeholder="0812345678"/>
            <FormInp label="Line ID" val={form.guardianLine} onChange={v => set('guardianLine', v)} placeholder="@line"/>
          </Row2>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, marginBottom: 12 }}>📱 นักเรียน</div>
            <Row2>
              <FormInp label="เบอร์โทรศัพท์" val={form.studentPhone} onChange={v => set('studentPhone', v)} type="tel"/>
              <FormInp label="Line ID" val={form.studentLine} onChange={v => set('studentLine', v)}/>
            </Row2>
          </div>
          <button onClick={() => setSec(4)} style={{ ...sBtn(true), width: '100%', marginTop: 8 }}>ถัดไป: รูปภาพ →</button>
        </div>
      )}

      {/* Section 4 – รูปภาพ */}
      {sec === 4 && (
        <div>
          <div style={sCard}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: C.text }}>📷 รูปถ่ายนักเรียน</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {form.profilePhoto
                ? <img src={form.profilePhoto} style={{ width: 90, height: 90, borderRadius: 45, objectFit: 'cover', border: `3px solid ${C.border}`, flexShrink: 0 }}/>
                : <div style={{ width: 90, height: 90, borderRadius: 45, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>👤</div>}
              <div>
                <input ref={profileRef} type="file" accept="image/*" onChange={handleProfilePhoto} style={{ display: 'none' }}/>
                <button onClick={() => profileRef.current?.click()} style={{ ...sBtn(true, true), marginBottom: 6, display: 'block', width: '100%' }}>📷 เลือกรูป</button>
                {form.profilePhoto && <button onClick={() => set('profilePhoto', '')} style={{ ...sBtn(false, true), color: '#dc2626', display: 'block', width: '100%' }}>ลบรูป</button>}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>แนะนำ: รูปหน้าตรง</div>
              </div>
            </div>
          </div>

          <div style={sCard}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.text }}>🏠 รูปภาพเยี่ยมบ้าน</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>ต้องการอย่างน้อย 2 รูป · สูงสุด 5 รูป · ({form.homePhotos?.length || 0}/5)</div>
            {(form.homePhotos || []).length < 2 && (
              <div style={{ background: '#fffbf0', border: '1px solid #fed7aa', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#c2410c' }}>
                ⚠️ ต้องการรูปบ้านอย่างน้อย 2 รูปสำหรับข้อมูลเยี่ยมบ้าน
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {(form.homePhotos || []).map((ph, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={ph} style={{ width: '100%', borderRadius: 10, aspectRatio: '4/3', objectFit: 'cover', display: 'block', border: `1px solid ${C.border}` }}/>
                  <button
                    onClick={() => setForm(p => ({ ...p, homePhotos: p.homePhotos.filter((_, j) => j !== i) }))}
                    style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(220,38,38,0.9)', color: 'white', border: 'none', borderRadius: 12, width: 24, height: 24, cursor: 'pointer', fontSize: 16, fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                  <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>รูปที่ {i + 1}</div>
                </div>
              ))}
              {(form.homePhotos || []).length < 5 && (
                <div onClick={() => homeRef.current?.click()} style={{ borderRadius: 10, border: `2px dashed ${C.border}`, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '4/3', cursor: 'pointer', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span style={{ fontSize: 12, color: C.muted }}>เพิ่มรูปบ้าน</span>
                </div>
              )}
            </div>
            <input ref={homeRef} type="file" accept="image/*" onChange={handleHomePhoto} style={{ display: 'none' }}/>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onBack} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
            <button onClick={() => onSave(form)} style={{ ...sBtn(true), flex: 1 }}>💾 บันทึกทั้งหมด</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ProfileView
// ─────────────────────────────────────────────
function ProfileView({ student, profile, onEdit, onBack }) {
  const p   = profile || emptyProfile();
  const pct = profileCompletion(p);

  const Row = ({ label, value }) => (!value || value === '') ? null : (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
      <span style={{ color: C.muted, minWidth: 120, flexShrink: 0, fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={sCard}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: C.text }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={onBack} style={{ ...sBtn(false, true), padding: '7px 12px' }}>← กลับ</button>
        <button onClick={onEdit} style={sBtn(true, true)}>✏️ แก้ไข</button>
      </div>

      <div style={{ ...sCard, textAlign: 'center', padding: 20 }}>
        {p.profilePhoto
          ? <img src={p.profilePhoto} style={{ width: 100, height: 100, borderRadius: 50, objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: `3px solid ${C.border}` }}/>
          : <div style={{ width: 100, height: 100, borderRadius: 50, background: C.light, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>👤</div>}
        <div style={{ fontWeight: 700, fontSize: 18, color: C.text }}>{student.name}</div>
        {student.chineseName && <div style={{ color: C.blue, fontSize: 15, marginTop: 2 }}>{student.chineseName}</div>}
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{student.id} · {student.classId}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          <div style={{ height: 7, borderRadius: 4, background: '#e5e7eb', width: 120, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626', borderRadius: 4 }}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>ครบ {pct}%</span>
        </div>
      </div>

      <Section title="ข้อมูลส่วนตัว">
        <Row label="เลขบัตรประชาชน" value={p.idCard}/>
        <Row label="วันเกิด" value={p.birthday ? fmtDate(p.birthday) : null}/>
        <Row label="อายุ" value={p.age ? `${p.age} ปี` : null}/>
        <Row label="หมู่เลือด" value={p.bloodType}/>
        <Row label="เชื้อชาติ/สัญชาติ" value={[p.ethnicity, p.nationality].filter(Boolean).join(' / ')}/>
        <Row label="ศาสนา" value={p.religion}/>
        <Row label="น้ำหนัก/ส่วนสูง" value={p.weight && p.height ? `${p.weight} กก. / ${p.height} ซม.` : null}/>
        <Row label="โรคประจำตัว" value={p.disease}/>
      </Section>

      <Section title="ที่อยู่อาศัย">
        <Row label="บ้านเลขที่/หมู่" value={[p.houseNo ? `เลขที่ ${p.houseNo}` : null, p.village ? `หมู่ ${p.village}` : null].filter(Boolean).join(' ')}/>
        <Row label="ถนน" value={p.road}/>
        <Row label="ตำบล/แขวง" value={p.subDistrict}/>
        <Row label="อำเภอ/เขต" value={p.district}/>
        <Row label="จังหวัด" value={p.province}/>
        <Row label="รหัสไปรษณีย์" value={p.postalCode}/>
      </Section>

      <Section title="ข้อมูลครอบครัว">
        <Row label="สมาชิกในครัว" value={p.familyCount ? `${p.familyCount} คน` : null}/>
        <Row label="เป็นบุตรลำดับที่" value={p.childOrder}/>
        <Row label="บิดา" value={[p.fatherName, p.fatherSurname].filter(Boolean).join(' ')}/>
        <Row label="อาชีพบิดา" value={p.fatherJob}/>
        <Row label="มารดา" value={[p.motherName, p.motherSurname].filter(Boolean).join(' ')}/>
        <Row label="อาชีพมารดา" value={p.motherJob}/>
        <Row label="สถานภาพ" value={p.maritalStatus}/>
        <Row label="อาศัยอยู่กับ" value={p.livesWith}/>
        <Row label="เกี่ยวข้องเป็น" value={p.relationship}/>
      </Section>

      <Section title="ข้อมูลการติดต่อ">
        <Row label="ผู้ปกครอง (โทร)" value={p.guardianPhone}/>
        <Row label="ผู้ปกครอง (Line)" value={p.guardianLine}/>
        <Row label="นักเรียน (โทร)" value={p.studentPhone}/>
        <Row label="นักเรียน (Line)" value={p.studentLine}/>
      </Section>

      {(p.homePhotos?.length || 0) > 0 && (
        <Section title="🏠 รูปภาพเยี่ยมบ้าน">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {p.homePhotos.map((ph, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={ph} style={{ width: '100%', borderRadius: 8, aspectRatio: '4/3', objectFit: 'cover', border: `1px solid ${C.border}` }}/>
                <div style={{ position: 'absolute', bottom: 5, left: 5, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 8 }}>รูปที่ {i + 1}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ProfileSection
// ─────────────────────────────────────────────
function ProfileSection({ data, update, role, hStu, myStudentId, toast }) {
  const [viewId,  setViewId]  = useState(role === 'student' ? myStudentId : null);
  const [editing, setEditing] = useState(false);

  const targetId = viewId;
  const profile  = targetId ? (data.profiles?.[targetId] || emptyProfile()) : null;
  const student  = targetId ? data.students.find(s => s.id === targetId) : null;

  const saveProfile = newProfile => {
    update(prev => ({
      ...prev,
      profiles: { ...(prev.profiles || {}), [targetId]: { ...newProfile, updatedAt: new Date().toISOString() } },
    }));
    toast('บันทึกประวัติแล้ว', 'success');
    setEditing(false);
  };

  // Teacher – show student list
  if (role === 'teacher' && !viewId) {
    return (
      <div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
          <span>ห้อง {data.homeroom} · {hStu.length} คน</span>
          <span style={{ color: hStu.filter(s => profileCompletion(data.profiles?.[s.id]) >= 80).length === hStu.length && hStu.length > 0 ? '#16a34a' : '#d97706' }}>
            {hStu.filter(s => profileCompletion(data.profiles?.[s.id]) >= 80).length}/{hStu.length} ครบถ้วน
          </span>
        </div>
        {hStu.map(stu => {
          const pct = profileCompletion(data.profiles?.[stu.id]);
          const p   = data.profiles?.[stu.id];
          return (
            <div key={stu.id} onClick={() => setViewId(stu.id)} style={{ ...sCard, cursor: 'pointer', marginBottom: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {p?.profilePhoto
                  ? <img src={p.profilePhoto} style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', border: `2px solid ${C.border}`, flexShrink: 0 }}/>
                  : <div style={{ width: 48, height: 48, borderRadius: 24, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👤</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{stu.number ? `${stu.number}. ` : ''}{stu.name}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{stu.id}{p?.guardianPhone ? ` · 📞 ${p.guardianPhone}` : ''}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                    <div style={{ height: 5, borderRadius: 3, background: '#e5e7eb', flex: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626', borderRadius: 3, transition: 'width 0.4s' }}/>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626', flexShrink: 0 }}>{pct}%</span>
                  </div>
                </div>
                <span style={{ fontSize: 18, color: C.muted }}>›</span>
              </div>
            </div>
          );
        })}
        {!hStu.length && <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>ยังไม่มีนักเรียนในห้อง {data.homeroom}</div>}
      </div>
    );
  }

  if (!targetId || !student) return null;

  if (editing) {
    return (
      <ProfileForm
        key={student.id}
        student={student} profile={profile} onSave={saveProfile}
        onBack={() => { setEditing(false); if (role === 'teacher') setViewId(null); }}
        toast={toast}
      />
    );
  }

  return (
    <ProfileView
      student={student} profile={profile}
      onEdit={() => setEditing(true)}
      onBack={() => setViewId(role === 'teacher' ? null : myStudentId)}
    />
  );
}

// ─────────────────────────────────────────────
// SavingsSection
// ─────────────────────────────────────────────
function SavingsSection({ data, update, role, hStu, myStudentId, toast }) {
  const [viewId,    setViewId]    = useState(role === 'student' ? myStudentId : null);
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm,  setGoalForm]  = useState({ goalName: '', goal: '', goalDate: '' });
  const [entry,     setEntry]     = useState({ amount: '', note: '', date: todayStr() });

  const mySav = viewId ? (data.savings?.[viewId] || emptyGoal()) : null;
  const calc  = mySav  ? calcSavings(mySav) : null;
  const stu   = viewId ? data.students.find(s => s.id === viewId) : null;

  const updateSavings = (id, fn) => update(prev => {
    const s = prev.savings?.[id] || emptyGoal();
    return { ...prev, savings: { ...(prev.savings || {}), [id]: fn(s) } };
  });

  const addEntry = () => {
    const amount = parseFloat(entry.amount);
    if (!amount || amount <= 0) return toast('กรอกจำนวนเงิน', 'error');
    updateSavings(viewId, s => ({ ...s, entries: [...(s.entries || []), { ...entry, amount, id: Date.now().toString() }] }));
    setEntry(p => ({ ...p, amount: '', note: '' }));
    toast(`บันทึก ฿${amount.toLocaleString()} แล้ว`, 'success');
  };

  const removeEntry = id => updateSavings(viewId, s => ({ ...s, entries: (s.entries || []).filter(e => e.id !== id) }));

  const saveGoal = () => {
    updateSavings(viewId, s => ({ ...s, goalName: goalForm.goalName, goal: parseFloat(goalForm.goal) || 0, goalDate: goalForm.goalDate }));
    setGoalModal(false);
    toast('บันทึกเป้าหมายแล้ว', 'success');
  };

  // Teacher – class overview
  if (role === 'teacher' && !viewId) {
    const totalAll = hStu.reduce((sum, s) => sum + calcSavings(data.savings?.[s.id]).total, 0);
    return (
      <div>
        <div style={{ ...sCard, background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, opacity: 0.85 }}>ยอดออมรวมทั้งห้อง</div>
          <div style={{ fontSize: 40, fontWeight: 700, margin: '6px 0' }}>฿{totalAll.toLocaleString()}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{hStu.length} คน · ห้อง {data.homeroom}</div>
        </div>
        {hStu.map(s => {
          const c = calcSavings(data.savings?.[s.id]);
          return (
            <div key={s.id} onClick={() => setViewId(s.id)} style={{ ...sCard, cursor: 'pointer', marginBottom: 8, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: c.goal ? 6 : 0 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.nickname || s.name}</span>
                  {data.savings?.[s.id]?.goalName && <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>🎯 {data.savings[s.id].goalName}</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.red }}>฿{c.total.toLocaleString()}</div>
                  {c.goal > 0 && <div style={{ fontSize: 11, color: C.muted }}>{c.pct}%</div>}
                </div>
              </div>
              {c.goal > 0 && (
                <div style={{ height: 5, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.pct >= 100 ? '#16a34a' : '#d97706', borderRadius: 3 }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (!viewId || !mySav || !calc) return null;

  const previewDailyNeeded = goalForm.goal && goalForm.goalDate
    ? Math.ceil(parseFloat(goalForm.goal) / Math.max(1, Math.ceil((new Date(goalForm.goalDate + 'T00:00:00') - new Date()) / 86400000)))
    : 0;

  return (
    <div>
      {role === 'teacher' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => setViewId(null)} style={{ ...sBtn(false, true), padding: '7px 12px' }}>← กลับ</button>
          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{stu?.nickname || stu?.name}</div>
          <div style={{ width: 72 }}/>
        </div>
      )}

      {/* Savings hero card */}
      <div style={{ ...sCard, background: `linear-gradient(135deg,${C.red},${C.dark})`, color: 'white', marginBottom: 14 }}>
        {mySav.goalName && <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>🎯 {mySav.goalName}</div>}
        <div style={{ fontSize: 46, fontWeight: 700, lineHeight: 1 }}>฿{calc.total.toLocaleString()}</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4, marginBottom: 14 }}>ออมมาแล้วทั้งหมด</div>

        {calc.goal > 0 && <>
          <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.25)', marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, calc.pct)}%`, background: 'white', borderRadius: 4, transition: 'width 0.6s' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
            {[['เป้าหมาย', `฿${calc.goal.toLocaleString()}`], ['คงเหลือ', `฿${calc.remaining.toLocaleString()}`], ['ความคืบหน้า', `${calc.pct}%`]].map(([l, v]) => (
              <div key={l} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{v}</div>
                <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {calc.daysLeft > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>เหลืออีก {calc.daysLeft} วัน ต้องออม</span>
              <span style={{ fontWeight: 700, fontSize: 17 }}>฿{calc.dailyNeeded.toLocaleString()} /วัน</span>
            </div>
          )}
          {calc.pct >= 100 && <div style={{ background: 'rgba(22,163,74,0.8)', borderRadius: 8, padding: 10, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>🎉 ถึงเป้าหมายแล้ว!</div>}
        </>}

        {role === 'teacher' && (
          <button
            onClick={() => { setGoalForm({ goalName: mySav.goalName || '', goal: mySav.goal || '', goalDate: mySav.goalDate || '' }); setGoalModal(true); }}
            style={{ marginTop: 12, width: '100%', padding: '9px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 14 }}
          >
            🎯 {mySav.goal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายการออม'}
          </button>
        )}
      </div>

      {/* Add entry (teacher only) */}
      {role === 'teacher' && (
        <div style={sCard}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.text }}>💰 บันทึกการออม</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={sLabel}>จำนวนเงิน (บาท)</label>
              <input type="number" value={entry.amount} onChange={e => setEntry(p => ({ ...p, amount: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addEntry()} style={{ ...sInp, fontSize: 18, fontWeight: 700, textAlign: 'center' }} placeholder="50"/>
            </div>
            <div>
              <label style={sLabel}>วันที่</label>
              <input type="date" value={entry.date} onChange={e => setEntry(p => ({ ...p, date: e.target.value }))} style={sInp}/>
            </div>
          </div>
          <input value={entry.note} onChange={e => setEntry(p => ({ ...p, note: e.target.value }))} style={{ ...sInp, marginBottom: 10 }} placeholder="หมายเหตุ เช่น ถอนหรือฝากเพิ่ม"/>
          <button onClick={addEntry} style={{ ...sBtn(true), width: '100%', padding: 12 }}>+ บันทึกรายการ</button>
        </div>
      )}

      {/* History */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: C.text, display: 'flex', justifyContent: 'space-between' }}>
        <span>ประวัติการทำรายการ</span>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>{(mySav.entries || []).length} รายการ</span>
      </div>
      {(mySav.entries || []).length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 40 }}>ยังไม่มีรายการทำธุรกรรม</div>}
      {[...(mySav.entries || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((e, i) => {
        const amt   = parseFloat(e.amount);
        const isDep = amt > 0;
        return (
          <div key={e.id || i} style={{ ...sCard, marginBottom: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: isDep ? '#16a34a' : '#dc2626' }}>{isDep ? '+' : ''}฿{amt.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ''}</div>
            </div>
            {role === 'teacher' && (
              <button onClick={() => removeEntry(e.id || i)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 24, padding: '4px 8px', lineHeight: 1 }}>×</button>
            )}
          </div>
        );
      })}

      {/* Goal modal */}
      {role === 'teacher' && (
        <Sheet open={goalModal} title="🎯 ตั้งเป้าหมายการออม" onClose={() => setGoalModal(false)}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>ชื่อเป้าหมาย</div>
          <input value={goalForm.goalName} onChange={e => setGoalForm(p => ({ ...p, goalName: e.target.value }))} style={{ ...sInp, marginBottom: 12 }} placeholder="เช่น ซื้อโทรศัพท์ ทริปปิดเทอม"/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>จำนวนเงิน (บาท)</div>
              <input type="number" value={goalForm.goal} onChange={e => setGoalForm(p => ({ ...p, goal: e.target.value }))} style={{ ...sInp, textAlign: 'center', fontWeight: 700 }} placeholder="5000"/>
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>วันที่เป้าหมาย</div>
              <input type="date" value={goalForm.goalDate} onChange={e => setGoalForm(p => ({ ...p, goalDate: e.target.value }))} style={sInp}/>
            </div>
          </div>
          {goalForm.goal && goalForm.goalDate && previewDailyNeeded > 0 && (
            <div style={{ background: '#fffbf0', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>💡 ต้องออมเพื่อถึงเป้าหมาย</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.red }}>฿{previewDailyNeeded.toLocaleString()} ต่อวัน</div>
              <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>หรือ ฿{Math.ceil(previewDailyNeeded * 7).toLocaleString()} ต่อสัปดาห์</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setGoalModal(false)} style={{ ...sBtn(false), flex: 1 }}>ยกเลิก</button>
            <button onClick={saveGoal} style={{ ...sBtn(true), flex: 1 }}>💾 บันทึก</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HomeroomPage (default export)
// ─────────────────────────────────────────────
export default function HomeroomPage({ data, update, role, currentStudentId, toast }) {
  const [sub, setSub] = useState('profile');

  const hStu = (data.students || [])
    .filter(s => s.classId === data.homeroom)
    .sort((a, b) => (a.number || 999) - (b.number || 999));

  return (
    <div style={{ padding: '14px 14px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: C.text }}>🏫 ประจำชั้น</div>
        <div style={{ fontSize: 13, color: C.muted }}>{data.homeroom} · {hStu.length} คน</div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: 'white', padding: 6, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <button onClick={() => setSub('profile')} style={{ ...sTab(sub === 'profile'), flex: 1 }}>📋 ประวัติ</button>
        <button onClick={() => setSub('savings')} style={{ ...sTab(sub === 'savings'), flex: 1 }}>💰 การออมเงิน</button>
      </div>

      {sub === 'profile' && (
        <ProfileSection data={data} update={update} role={role} hStu={hStu} myStudentId={currentStudentId} toast={toast}/>
      )}
      {sub === 'savings' && (
        <SavingsSection data={data} update={update} role={role} hStu={hStu} myStudentId={currentStudentId} toast={toast}/>
      )}
    </div>
  );
}
