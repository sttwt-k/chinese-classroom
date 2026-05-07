import { useState, useRef } from "react";

// ===== CONSTANTS =====
const C = {red:'#C0392B',dark:'#96281B',bg:'#FFF9F0',card:'#fff',border:'#F0E0CC',text:'#2C1810',muted:'#9B7B5C',light:'#FAF0E6',blue:'#0891b2'};
const BLOOD_TYPES = ['A','B','AB','O','ไม่ทราบ'];
const RELIGIONS = ['พุทธ','คริสต์','อิสลาม','พราหมณ์-ฮินดู','อื่นๆ'];
const MARITAL = ['จดทะเบียนสมรส','หย่าร้าง','อยู่ด้วยกันแบบไม่จดทะเบียนสมรส','บิดาเสียชีวิต','มารดาเสียชีวิต'];

// ===== STYLES =====
const sCard = {background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:16,marginBottom:12};
const sBtn = (p=true,sm=false) => ({padding:sm?'7px 14px':'10px 20px',borderRadius:8,fontWeight:600,cursor:'pointer',border:'none',background:p?C.red:C.light,color:p?'white':C.text,fontSize:sm?13:15,fontFamily:'inherit'});
const sInp = {padding:'10px 12px',borderRadius:8,border:`1.5px solid ${C.border}`,width:'100%',fontSize:14,background:C.card,color:C.text,boxSizing:'border-box',fontFamily:'inherit'};
const sTab = a => ({padding:'9px 14px',borderRadius:8,cursor:'pointer',border:'none',fontWeight:a?700:500,background:a?C.red:'transparent',color:a?'white':C.muted,fontSize:13,fontFamily:'inherit',whiteSpace:'nowrap'});
const sLabel = {fontSize:12,color:C.muted,marginBottom:4,display:'block'};

// ===== UTILS =====
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = s => { if(!s)return''; const d=new Date(s+'T00:00:00'); const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; return`${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()+543}`; };

// ===== IMAGE COMPRESSION =====
const compressImg = (file, maxPx=800, q=0.75) => new Promise(res => {
  const r = new FileReader();
  r.onload = e => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxPx/img.width, maxPx/img.height);
      const cv = document.createElement('canvas');
      cv.width = img.width*ratio; cv.height = img.height*ratio;
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', q));
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(file);
});

// ===== DATA =====
export const emptyProfile = () => ({
  idCard:'', birthday:'', age:'', bloodType:'', ethnicity:'ไทย', nationality:'ไทย', religion:'พุทธ',
  weight:'', height:'', disease:'',
  houseNo:'', village:'', road:'', subDistrict:'', district:'', province:'', postalCode:'',
  familyCount:'', siblingCount:'', childOrder:'',
  brotherOlder:0, brotherYounger:0, sisterOlder:0, sisterYounger:0,
  fatherName:'', fatherSurname:'', fatherAge:'', fatherJob:'',
  motherName:'', motherSurname:'', motherAge:'', motherJob:'',
  maritalStatus:'', livesWith:'', relationship:'',
  guardianPhone:'', guardianLine:'', studentPhone:'', studentLine:'',
  profilePhoto:'', homePhotos:[], updatedAt:'',
});

export const emptyGoal = () => ({ goalName:'', goal:0, goalDate:'', entries:[] });

const profileCompletion = p => {
  if (!p) return 0;
  const req = ['idCard','birthday','bloodType','houseNo','province','fatherName','motherName','guardianPhone'];
  const filled = req.filter(k => p[k]?.toString().trim()).length;
  const photo = p.profilePhoto ? 1 : 0;
  const homePhotos = (p.homePhotos?.length || 0) >= 2 ? 1 : 0;
  return Math.round(((filled + photo + homePhotos) / (req.length + 2)) * 100);
};

const calcSavings = s => {
  if (!s) return { total:0, goal:0, remaining:0, pct:0, daysLeft:0, dailyNeeded:0 };
  const entries = s.entries || [];
  const total = entries.reduce((sum, e) => sum + (parseFloat(e.amount)||0), 0);
  const goal = parseFloat(s.goal) || 0;
  const remaining = Math.max(0, goal - total);
  const pct = goal > 0 ? Math.min(100, Math.round(total/goal*100)) : 0;
  let daysLeft = 0, dailyNeeded = 0;
  if (s.goalDate) {
    daysLeft = Math.max(0, Math.ceil((new Date(s.goalDate+'T00:00:00') - new Date()) / 86400000));
    dailyNeeded = daysLeft > 0 ? Math.ceil(remaining/daysLeft) : remaining;
  }
  return { total, goal, remaining, pct, daysLeft, dailyNeeded };
};

// ===== HELPER COMPONENTS =====
function Sheet({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'16px 16px 0 0',padding:24,width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto'}}>
        {title && <div style={{fontWeight:700,fontSize:17,marginBottom:16,color:C.text}}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ===== PROFILE FORM =====
function ProfileForm({ student, profile, onSave, onBack, toast }) {
  const [form, setForm] = useState({ ...emptyProfile(), ...profile });
  const [sec, setSec] = useState(0);
  const profileRef = useRef(null);
  const homeRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleProfilePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { set('profilePhoto', await compressImg(file, 600, 0.8)); toast('อัปโหลดรูปแล้ว','success'); }
    catch { toast('อัปโหลดไม่สำเร็จ','error'); }
    e.target.value = '';
  };

  const handleHomePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    if ((form.homePhotos||[]).length >= 5) return toast('รูปบ้านสูงสุด 5 รูป','error');
    try {
      const c = await compressImg(file, 900, 0.75);
      setForm(p => ({ ...p, homePhotos: [...(p.homePhotos||[]), c] }));
      toast('เพิ่มรูปบ้านแล้ว','success');
    } catch { toast('อัปโหลดไม่สำเร็จ','error'); }
    e.target.value = '';
  };

  const Inp = ({ label, k, type='text', placeholder='' }) => (
    <div style={{marginBottom:10}}>
      <label style={sLabel}>{label}</label>
      <input type={type} value={form[k]||''} onChange={e=>set(k,e.target.value)} style={sInp} placeholder={placeholder}/>
    </div>
  );
  const Sel = ({ label, k, options }) => (
    <div style={{marginBottom:10}}>
      <label style={sLabel}>{label}</label>
      <select value={form[k]||''} onChange={e=>set(k,e.target.value)} style={{...sInp,fontFamily:'inherit'}}>
        <option value="">-- เลือก --</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const Row2 = ({ children }) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{children}</div>;
  const Row4 = ({ children }) => <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>{children}</div>;

  const sections = ['ข้อมูลส่วนตัว','ที่อยู่','ครอบครัว','ติดต่อ','รูปภาพ'];
  const completion = profileCompletion(form);

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <button onClick={onBack} style={{...sBtn(false,true),padding:'7px 12px'}}>← กลับ</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontWeight:600,fontSize:14,color:C.text}}>{student.name}</div>
          <div style={{fontSize:11,color:C.muted}}>ข้อมูลครบ {completion}%</div>
        </div>
        <button onClick={() => onSave(form)} style={{...sBtn(true,true)}}>💾 บันทึก</button>
      </div>

      {/* Section tabs */}
      <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:4,marginBottom:12}}>
        {sections.map((s,i) => <button key={i} onClick={()=>setSec(i)} style={{...sTab(sec===i)}}>{s}</button>)}
      </div>

      {/* ===== SECTION 0: PERSONAL ===== */}
      {sec===0 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>ข้อมูลส่วนตัว</div>
        <Inp label="เลขบัตรประจำตัวประชาชน (13 หลัก)" k="idCard" placeholder="x-xxxx-xxxxx-xx-x"/>
        <Row2><Inp label="วัน/เดือน/ปีเกิด" k="birthday" type="date"/><Inp label="อายุ (ปี)" k="age" type="number" placeholder="15"/></Row2>
        <Row2><Sel label="หมู่เลือด" k="bloodType" options={BLOOD_TYPES}/><Inp label="เชื้อชาติ" k="ethnicity" placeholder="ไทย"/></Row2>
        <Row2><Inp label="สัญชาติ" k="nationality" placeholder="ไทย"/><Sel label="ศาสนา" k="religion" options={RELIGIONS}/></Row2>
        <Row2><Inp label="น้ำหนัก (กก.)" k="weight" type="number" placeholder="45"/><Inp label="ส่วนสูง (ซม.)" k="height" type="number" placeholder="160"/></Row2>
        <Inp label="โรคประจำตัว" k="disease" placeholder="ระบุหากมี หรือ -"/>
        <button onClick={()=>setSec(1)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ที่อยู่ →</button>
      </div>}

      {/* ===== SECTION 1: ADDRESS ===== */}
      {sec===1 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>ที่อยู่อาศัย</div>
        <Row2><Inp label="บ้านเลขที่" k="houseNo"/><Inp label="หมู่ที่" k="village" type="number"/></Row2>
        <Inp label="ถนน" k="road"/>
        <Inp label="ตำบล/แขวง" k="subDistrict"/>
        <Inp label="อำเภอ/เขต" k="district"/>
        <Inp label="จังหวัด" k="province"/>
        <Inp label="รหัสไปรษณีย์" k="postalCode" placeholder="50000"/>
        <button onClick={()=>setSec(2)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ครอบครัว →</button>
      </div>}

      {/* ===== SECTION 2: FAMILY ===== */}
      {sec===2 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>ข้อมูลครอบครัว</div>
        <Row2>
          <Inp label="สมาชิกในครอบครัว (คน)" k="familyCount" type="number"/>
          <Inp label="จำนวนพี่น้อง (คน)" k="siblingCount" type="number"/>
        </Row2>
        <Inp label="เป็นบุตรลำดับที่" k="childOrder" type="number" placeholder="1"/>
        <div style={{fontSize:12,color:C.muted,marginBottom:6,marginTop:4}}>จำนวนพี่น้อง</div>
        <Row4>
          {[['พี่ชาย','brotherOlder'],['น้องชาย','brotherYounger'],['พี่สาว','sisterOlder'],['น้องสาว','sisterYounger']].map(([l,k])=>(
            <div key={k}>
              <label style={{...sLabel,fontSize:11}}>{l}</label>
              <input type="number" min="0" value={form[k]||0} onChange={e=>set(k,parseInt(e.target.value)||0)} style={{...sInp,textAlign:'center',padding:'8px 4px'}}/>
            </div>
          ))}
        </Row4>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:12}}>
          <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:8}}>👨 ข้อมูลบิดา</div>
          <Row2><Inp label="ชื่อ" k="fatherName"/><Inp label="นามสกุล" k="fatherSurname"/></Row2>
          <Row2><Inp label="อายุ (ปี)" k="fatherAge" type="number"/><Inp label="อาชีพ" k="fatherJob"/></Row2>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4}}>
          <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:8}}>👩 ข้อมูลมารดา</div>
          <Row2><Inp label="ชื่อ" k="motherName"/><Inp label="นามสกุล" k="motherSurname"/></Row2>
          <Row2><Inp label="อายุ (ปี)" k="motherAge" type="number"/><Inp label="อาชีพ" k="motherJob"/></Row2>
        </div>

        <Sel label="สถานภาพบิดา-มารดา" k="maritalStatus" options={MARITAL}/>
        <Row2><Inp label="นักเรียนอาศัยอยู่กับ" k="livesWith"/><Inp label="เกี่ยวข้องเป็น" k="relationship" placeholder="เช่น บิดา บิดา ปู่"/></Row2>
        <button onClick={()=>setSec(3)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ติดต่อ →</button>
      </div>}

      {/* ===== SECTION 3: CONTACT ===== */}
      {sec===3 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>ข้อมูลการติดต่อ</div>
        <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:8}}>📱 ผู้ปกครอง</div>
        <Row2><Inp label="เบอร์โทรศัพท์" k="guardianPhone" type="tel" placeholder="0812345678"/><Inp label="Line ID" k="guardianLine" placeholder="@line"/></Row2>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4}}>
          <div style={{fontWeight:600,fontSize:13,color:C.text,marginBottom:8}}>📱 นักเรียน</div>
          <Row2><Inp label="เบอร์โทรศัพท์" k="studentPhone" type="tel"/><Inp label="Line ID" k="studentLine"/></Row2>
        </div>
        <button onClick={()=>setSec(4)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: รูปภาพ →</button>
      </div>}

      {/* ===== SECTION 4: PHOTOS ===== */}
      {sec===4 && <div>
        <div style={sCard}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>📷 รูปถ่ายนักเรียน</div>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            {form.profilePhoto ?
              <img src={form.profilePhoto} style={{width:90,height:90,borderRadius:45,objectFit:'cover',border:`3px solid ${C.border}`,flexShrink:0}}/> :
              <div style={{width:90,height:90,borderRadius:45,background:C.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:40,flexShrink:0}}>👤</div>}
            <div>
              <input ref={profileRef} type="file" accept="image/*" onChange={handleProfilePhoto} style={{display:'none'}}/>
              <button onClick={()=>profileRef.current?.click()} style={{...sBtn(true,true),marginBottom:6,display:'block',width:'100%'}}>📷 เลือกรูป</button>
              {form.profilePhoto && <button onClick={()=>set('profilePhoto','')} style={{...sBtn(false,true),color:'#dc2626',display:'block',width:'100%'}}>ลบรูป</button>}
              <div style={{fontSize:11,color:C.muted,marginTop:6}}>แนะนำ: รูปหน้าตรง</div>
            </div>
          </div>
        </div>

        <div style={sCard}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4,color:C.text}}>🏠 รูปภาพเยี่ยมบ้าน</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:12}}>ต้องการอย่างน้อย 2 รูป · สูงสุด 5 รูป · ({form.homePhotos?.length||0}/5)</div>
          {(form.homePhotos||[]).length < 2 && (
            <div style={{background:'#fffbf0',border:'1px solid #fed7aa',borderRadius:8,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#c2410c'}}>
              ⚠️ ต้องการรูปบ้านอย่างน้อย 2 รูปสำหรับข้อมูลเยี่ยมบ้าน
            </div>
          )}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
            {(form.homePhotos||[]).map((ph, i) => (
              <div key={i} style={{position:'relative'}}>
                <img src={ph} style={{width:'100%',borderRadius:10,aspectRatio:'4/3',objectFit:'cover',display:'block',border:`1px solid ${C.border}`}}/>
                <button onClick={()=>setForm(p=>({...p,homePhotos:p.homePhotos.filter((_,j)=>j!==i)}))} style={{position:'absolute',top:5,right:5,background:'rgba(220,38,38,0.9)',color:'white',border:'none',borderRadius:12,width:24,height:24,cursor:'pointer',fontSize:16,fontWeight:700,padding:0,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                <div style={{position:'absolute',bottom:5,left:5,background:'rgba(0,0,0,0.5)',color:'white',fontSize:10,padding:'2px 6px',borderRadius:8}}>รูปที่ {i+1}</div>
              </div>
            ))}
            {(form.homePhotos||[]).length < 5 && (
              <div onClick={()=>homeRef.current?.click()} style={{borderRadius:10,border:`2px dashed ${C.border}`,background:C.light,display:'flex',alignItems:'center',justifyContent:'center',aspectRatio:'4/3',cursor:'pointer',flexDirection:'column',gap:6}}>
                <span style={{fontSize:28}}>📷</span>
                <span style={{fontSize:12,color:C.muted}}>เพิ่มรูปบ้าน</span>
              </div>
            )}
          </div>
          <input ref={homeRef} type="file" accept="image/*" onChange={handleHomePhoto} style={{display:'none'}}/>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button onClick={onBack} style={{...sBtn(false),flex:1}}>ยกเลิก</button>
          <button onClick={()=>onSave(form)} style={{...sBtn(true),flex:1}}>💾 บันทึกทั้งหมด</button>
        </div>
      </div>}
    </div>
  );
}

// ===== PROFILE VIEW (read-only for teacher) =====
function ProfileView({ student, profile, onEdit, onBack }) {
  const p = profile || emptyProfile();
  const pct = profileCompletion(p);

  const Row = ({ label, value }) => (!value || value === '') ? null : (
    <div style={{display:'flex',gap:8,padding:'7px 0',borderBottom:`1px solid ${C.border}`,fontSize:13}}>
      <span style={{color:C.muted,minWidth:120,flexShrink:0,fontSize:12}}>{label}</span>
      <span style={{fontWeight:500}}>{value}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={sCard}>
      <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:C.text}}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
        <button onClick={onBack} style={{...sBtn(false,true),padding:'7px 12px'}}>← กลับ</button>
        <button onClick={onEdit} style={{...sBtn(true,true)}}>✏️ แก้ไข</button>
      </div>

      <div style={{...sCard,textAlign:'center',padding:20}}>
        {p.profilePhoto ?
          <img src={p.profilePhoto} style={{width:100,height:100,borderRadius:50,objectFit:'cover',margin:'0 auto 12px',display:'block',border:`3px solid ${C.border}`}}/> :
          <div style={{width:100,height:100,borderRadius:50,background:C.light,margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44}}>👤</div>}
        <div style={{fontWeight:700,fontSize:18,color:C.text}}>{student.name}</div>
        {student.chineseName && <div style={{color:C.blue,fontSize:15,marginTop:2}}>{student.chineseName}</div>}
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>{student.id} · {student.classId}</div>
        <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center',marginTop:12}}>
          <div style={{height:7,borderRadius:4,background:'#e5e7eb',width:120,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${pct}%`,background:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626',borderRadius:4}}/>
          </div>
          <span style={{fontSize:13,fontWeight:700,color:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626'}}>ครบ {pct}%</span>
        </div>
      </div>

      <Section title="ข้อมูลส่วนตัว">
        <Row label="เลขบัตรประชาชน" value={p.idCard}/>
        <Row label="วันเกิด" value={p.birthday?fmtDate(p.birthday):null}/>
        <Row label="อายุ" value={p.age?`${p.age} ปี`:null}/>
        <Row label="หมู่เลือด" value={p.bloodType}/>
        <Row label="เชื้อชาติ/สัญชาติ" value={[p.ethnicity,p.nationality].filter(Boolean).join(' / ')}/>
        <Row label="ศาสนา" value={p.religion}/>
        <Row label="น้ำหนัก/ส่วนสูง" value={p.weight&&p.height?`${p.weight} กก. / ${p.height} ซม.`:null}/>
        <Row label="โรคประจำตัว" value={p.disease}/>
      </Section>

      <Section title="ที่อยู่อาศัย">
        <Row label="บ้านเลขที่/หมู่" value={[p.houseNo?`เลขที่ ${p.houseNo}`:null, p.village?`หมู่ ${p.village}`:null].filter(Boolean).join(' ')}/>
        <Row label="ถนน" value={p.road}/>
        <Row label="ตำบล/แขวง" value={p.subDistrict}/>
        <Row label="อำเภอ/เขต" value={p.district}/>
        <Row label="จังหวัด" value={p.province}/>
        <Row label="รหัสไปรษณีย์" value={p.postalCode}/>
      </Section>

      <Section title="ข้อมูลครอบครัว">
        <Row label="สมาชิกในครัว" value={p.familyCount?`${p.familyCount} คน`:null}/>
        <Row label="เป็นบุตรลำดับที่" value={p.childOrder}/>
        <Row label="บิดา" value={[p.fatherName,p.fatherSurname].filter(Boolean).join(' ')}/>
        <Row label="อาชีพบิดา" value={p.fatherJob}/>
        <Row label="มารดา" value={[p.motherName,p.motherSurname].filter(Boolean).join(' ')}/>
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

      {(p.homePhotos?.length||0) > 0 && (
        <Section title="🏠 รูปภาพเยี่ยมบ้าน">
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8}}>
            {p.homePhotos.map((ph,i) => (
              <div key={i} style={{position:'relative'}}>
                <img src={ph} style={{width:'100%',borderRadius:8,aspectRatio:'4/3',objectFit:'cover',border:`1px solid ${C.border}`}}/>
                <div style={{position:'absolute',bottom:5,left:5,background:'rgba(0,0,0,0.5)',color:'white',fontSize:10,padding:'2px 6px',borderRadius:8}}>รูปที่ {i+1}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ===== PROFILE SECTION =====
function ProfileSection({ data, update, role, hStu, myStudentId, toast }) {
  const [viewId, setViewId] = useState(role === 'student' ? myStudentId : null);
  const [editing, setEditing] = useState(role === 'student');

  const targetId = viewId;
  const profile = targetId ? (data.profiles?.[targetId] || emptyProfile()) : null;
  const student = targetId ? data.students.find(s => s.id === targetId) : null;

  const saveProfile = newProfile => {
    update(prev => ({
      ...prev,
      profiles: { ...(prev.profiles||{}), [targetId]: { ...newProfile, updatedAt: new Date().toISOString() } }
    }));
    toast('บันทึกประวัติแล้ว','success');
    if (role === 'teacher') setEditing(false);
  };

  // Teacher: list view
  if (role === 'teacher' && !viewId) {
    return (
      <div>
        <div style={{fontSize:13,color:C.muted,marginBottom:10}}>
          ห้อง {data.homeroom} · {hStu.length} คน
          <span style={{float:'right',color:hStu.filter(s=>profileCompletion(data.profiles?.[s.id])>=80).length===hStu.length&&hStu.length>0?'#16a34a':'#d97706'}}>
            {hStu.filter(s=>profileCompletion(data.profiles?.[s.id])>=80).length}/{hStu.length} ครบถ้วน
          </span>
        </div>
        {hStu.map(stu => {
          const pct = profileCompletion(data.profiles?.[stu.id]);
          const p = data.profiles?.[stu.id];
          return (
            <div key={stu.id} onClick={()=>setViewId(stu.id)} style={{...sCard,cursor:'pointer',marginBottom:8,padding:'12px 14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                {p?.profilePhoto ?
                  <img src={p.profilePhoto} style={{width:48,height:48,borderRadius:24,objectFit:'cover',border:`2px solid ${C.border}`,flexShrink:0}}/> :
                  <div style={{width:48,height:48,borderRadius:24,background:C.light,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>👤</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:15}}>{stu.number?`${stu.number}. `:''}{stu.name}</div>
                  <div style={{fontSize:12,color:C.muted}}>{stu.id}{p?.guardianPhone?` · 📞 ${p.guardianPhone}`:''}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:5}}>
                    <div style={{height:5,borderRadius:3,background:'#e5e7eb',flex:1,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626',borderRadius:3,transition:'width 0.4s'}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:pct>=80?'#16a34a':pct>=50?'#d97706':'#dc2626',flexShrink:0}}>{pct}%</span>
                  </div>
                </div>
                <span style={{fontSize:18,color:C.muted}}>›</span>
              </div>
            </div>
          );
        })}
        {!hStu.length && <div style={{textAlign:'center',color:C.muted,padding:40}}>ยังไม่มีนักเรียนในห้อง {data.homeroom}</div>}
      </div>
    );
  }

  if (!targetId || !student) return null;

  if (editing) return <ProfileForm student={student} profile={profile} onSave={saveProfile} onBack={()=>{setEditing(false);if(role==='teacher')setViewId(null);}} toast={toast}/>;
  return <ProfileView student={student} profile={profile} onEdit={()=>setEditing(true)} onBack={()=>setViewId(null)}/>;
}

// ===== SAVINGS SECTION =====
function SavingsSection({ data, update, role, hStu, myStudentId, toast }) {
  const [viewId, setViewId] = useState(role === 'student' ? myStudentId : null);
  const [goalModal, setGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState({ goalName:'', goal:'', goalDate:'' });
  const [entry, setEntry] = useState({ amount:'', note:'', date:todayStr() });

  const mySav = viewId ? (data.savings?.[viewId] || emptyGoal()) : null;
  const calc = mySav ? calcSavings(mySav) : null;
  const stu = viewId ? data.students.find(s=>s.id===viewId) : null;

  const updateSavings = (viewId, fn) => update(prev => {
    const s = prev.savings?.[viewId] || emptyGoal();
    return { ...prev, savings: { ...(prev.savings||{}), [viewId]: fn(s) } };
  });

  const addEntry = () => {
    const amount = parseFloat(entry.amount);
    if (!amount || amount <= 0) return toast('กรอกจำนวนเงิน','error');
    updateSavings(viewId, s => ({ ...s, entries: [...(s.entries||[]), { ...entry, amount, id: Date.now().toString() }] }));
    setEntry(p => ({ ...p, amount:'', note:'' }));
    toast(`บันทึก ฿${amount.toLocaleString()} แล้ว`,'success');
  };

  const removeEntry = id => updateSavings(viewId, s => ({ ...s, entries: (s.entries||[]).filter(e=>e.id!==id) }));

  const saveGoal = () => {
    updateSavings(viewId, s => ({ ...s, goalName:goalForm.goalName, goal:parseFloat(goalForm.goal)||0, goalDate:goalForm.goalDate }));
    setGoalModal(false);
    toast('บันทึกเป้าหมายแล้ว','success');
  };

  // Teacher overview
  if (role === 'teacher' && !viewId) {
    const totalAll = hStu.reduce((sum, s) => sum + calcSavings(data.savings?.[s.id]).total, 0);
    return (
      <div>
        <div style={{...sCard,background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',textAlign:'center',marginBottom:14}}>
          <div style={{fontSize:13,opacity:0.85}}>ยอดออมรวมทั้งห้อง</div>
          <div style={{fontSize:40,fontWeight:700,margin:'6px 0'}}>฿{totalAll.toLocaleString()}</div>
          <div style={{fontSize:12,opacity:0.85}}>{hStu.length} คน · ห้อง {data.homeroom}</div>
        </div>
        {hStu.map(s => {
          const sv = data.savings?.[s.id];
          const c = calcSavings(sv);
          return (
            <div key={s.id} onClick={()=>setViewId(s.id)} style={{...sCard,cursor:'pointer',marginBottom:8,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:c.goal?6:0}}>
                <div>
                  <span style={{fontWeight:600,fontSize:14}}>{s.nickname||s.name}</span>
                  {sv?.goalName && <span style={{fontSize:11,color:C.muted,marginLeft:6}}>🎯 {sv.goalName}</span>}
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700,fontSize:15,color:C.red}}>฿{c.total.toLocaleString()}</div>
                  {c.goal>0 && <div style={{fontSize:11,color:C.muted}}>{c.pct}%</div>}
                </div>
              </div>
              {c.goal>0 && <div style={{height:5,borderRadius:3,background:'#e5e7eb',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${c.pct}%`,background:c.pct>=100?'#16a34a':'#d97706',borderRadius:3}}/>
              </div>}
            </div>
          );
        })}
      </div>
    );
  }

  if (!viewId || !mySav || !calc) return null;

  const previewDailyNeeded = goalForm.goal && goalForm.goalDate
    ? Math.ceil(parseFloat(goalForm.goal) / Math.max(1, Math.ceil((new Date(goalForm.goalDate+'T00:00:00') - new Date()) / 86400000)))
    : 0;

  return (
    <div>
      {role === 'teacher' && (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <button onClick={()=>setViewId(null)} style={{...sBtn(false,true),padding:'7px 12px'}}>← กลับ</button>
          <div style={{fontWeight:600,fontSize:14,color:C.text}}>{stu?.nickname||stu?.name}</div>
          <div style={{width:72}}/>
        </div>
      )}

      {/* Summary */}
      <div style={{...sCard,background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',marginBottom:14}}>
        {mySav.goalName && <div style={{fontSize:13,opacity:0.85,marginBottom:4}}>🎯 {mySav.goalName}</div>}
        <div style={{fontSize:46,fontWeight:700,lineHeight:1}}>฿{calc.total.toLocaleString()}</div>
        <div style={{fontSize:13,opacity:0.85,marginTop:4,marginBottom:14}}>ออมมาแล้วทั้งหมด</div>

        {calc.goal > 0 && <>
          <div style={{height:7,borderRadius:4,background:'rgba(255,255,255,0.25)',marginBottom:8,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${Math.min(100,calc.pct)}%`,background:'white',borderRadius:4,transition:'width 0.6s'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
            {[['เป้าหมาย',`฿${calc.goal.toLocaleString()}`],['คงเหลือ',`฿${calc.remaining.toLocaleString()}`],['ความคืบหน้า',`${calc.pct}%`]].map(([l,v])=>(
              <div key={l} style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                <div style={{fontSize:14,fontWeight:700}}>{v}</div>
                <div style={{fontSize:10,opacity:0.85,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>
          {calc.daysLeft > 0 && (
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13}}>เหลืออีก {calc.daysLeft} วัน ต้องออม</span>
              <span style={{fontWeight:700,fontSize:17}}>฿{calc.dailyNeeded.toLocaleString()} /วัน</span>
            </div>
          )}
          {calc.pct >= 100 && <div style={{background:'rgba(22,163,74,0.8)',borderRadius:8,padding:'10px',textAlign:'center',fontSize:15,fontWeight:700}}>🎉 ถึงเป้าหมายแล้ว!</div>}
        </>}

        <button onClick={()=>{setGoalForm({goalName:mySav.goalName||'',goal:mySav.goal||'',goalDate:mySav.goalDate||''});setGoalModal(true);}} style={{marginTop:12,width:'100%',padding:'9px',background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',color:'white',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:13}}>
          🎯 {mySav.goal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายการออม'}
        </button>
      </div>

      {/* Add entry */}
      <div style={sCard}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:C.text}}>💰 บันทึกการออม</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <div>
            <label style={sLabel}>จำนวนเงิน (บาท)</label>
            <input type="number" value={entry.amount} onChange={e=>setEntry(p=>({...p,amount:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&addEntry()} style={{...sInp,fontSize:18,fontWeight:700,textAlign:'center'}} placeholder="50"/>
          </div>
          <div>
            <label style={sLabel}>วันที่</label>
            <input type="date" value={entry.date} onChange={e=>setEntry(p=>({...p,date:e.target.value}))} style={sInp}/>
          </div>
        </div>
        <input value={entry.note} onChange={e=>setEntry(p=>({...p,note:e.target.value}))} style={{...sInp,marginBottom:10}} placeholder="หมายเหตุ เช่น ขายของ ได้เงินพิเศษ"/>
        <button onClick={addEntry} style={{...sBtn(true),width:'100%',padding:12}}>+ บันทึกการออม</button>
      </div>

      {/* History */}
      <div style={{fontWeight:600,fontSize:14,marginBottom:8,color:C.text,display:'flex',justifyContent:'space-between'}}>
        <span>ประวัติการออม</span>
        <span style={{fontSize:12,color:C.muted,fontWeight:400}}>{(mySav.entries||[]).length} รายการ</span>
      </div>
      {(mySav.entries||[]).length === 0 && <div style={{textAlign:'center',color:C.muted,padding:40}}>ยังไม่มีการออม · เพิ่มรายการด้านบน</div>}
      {[...(mySav.entries||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map((e,i) => (
        <div key={e.id||i} style={{...sCard,marginBottom:6,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#16a34a'}}>+฿{parseFloat(e.amount).toLocaleString()}</div>
            <div style={{fontSize:12,color:C.muted}}>{fmtDate(e.date)}{e.note?` · ${e.note}`:''}</div>
          </div>
          <button onClick={()=>removeEntry(e.id||i)} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:20,padding:'4px 8px',lineHeight:1}}>×</button>
        </div>
      ))}

      {/* Goal Modal */}
      <Sheet open={goalModal} title="🎯 ตั้งเป้าหมายการออม" onClose={()=>setGoalModal(false)}>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>ชื่อเป้าหมาย</div>
        <input value={goalForm.goalName} onChange={e=>setGoalForm(p=>({...p,goalName:e.target.value}))} style={{...sInp,marginBottom:10}} placeholder="เช่น ซื้อโทรศัพท์ ทริปปิดเทอม"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>จำนวนเงิน (บาท)</div><input type="number" value={goalForm.goal} onChange={e=>setGoalForm(p=>({...p,goal:e.target.value}))} style={{...sInp,textAlign:'center',fontWeight:700}} placeholder="5000"/></div>
          <div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>วันที่เป้าหมาย</div><input type="date" value={goalForm.goalDate} onChange={e=>setGoalForm(p=>({...p,goalDate:e.target.value}))} style={sInp}/></div>
        </div>
        {goalForm.goal && goalForm.goalDate && previewDailyNeeded > 0 && (
          <div style={{background:'#fffbf0',border:'1px solid #fed7aa',borderRadius:10,padding:'12px 14px',marginBottom:14}}>
            <div style={{fontSize:12,color:'#92400e',marginBottom:4}}>💡 ต้องออมเพื่อถึงเป้าหมาย</div>
            <div style={{fontSize:20,fontWeight:700,color:C.red}}>฿{previewDailyNeeded.toLocaleString()} ต่อวัน</div>
            <div style={{fontSize:12,color:'#92400e',marginTop:2}}>หรือ ฿{Math.ceil(previewDailyNeeded*7).toLocaleString()} ต่อสัปดาห์</div>
          </div>
        )}
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setGoalModal(false)} style={{...sBtn(false),flex:1}}>ยกเลิก</button>
          <button onClick={saveGoal} style={{...sBtn(true),flex:1}}>💾 บันทึก</button>
        </div>
      </Sheet>
    </div>
  );
}

// ===== MAIN EXPORT =====
export function HomeroomPage({ data, update, role, currentStudentId, toast }) {
  const [sub, setSub] = useState('profile');

  const hStu = (data.students||[])
    .filter(s => s.classId === data.homeroom)
    .sort((a,b) => (a.number||999)-(b.number||999));

  return (
    <div style={{padding:'14px 14px 100px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontWeight:700,fontSize:18,color:C.text}}>🏫 ประจำชั้น</div>
        <div style={{fontSize:12,color:C.muted}}>{data.homeroom} · {hStu.length} คน</div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:14,background:'white',padding:5,borderRadius:10,border:`1px solid ${C.border}`}}>
        <button onClick={()=>setSub('profile')} style={{...sTab(sub==='profile'),flex:1}}>📋 ประวัติ</button>
        <button onClick={()=>setSub('savings')} style={{...sTab(sub==='savings'),flex:1}}>💰 การออมเงิน</button>
      </div>

      {sub==='profile' && (
        <ProfileSection data={data} update={update} role={role} hStu={hStu}
          myStudentId={currentStudentId} toast={toast}/>
      )}
      {sub==='savings' && (
        <SavingsSection data={data} update={update} role={role} hStu={hStu}
          myStudentId={currentStudentId} toast={toast}/>
      )}
    </div>
  );
}