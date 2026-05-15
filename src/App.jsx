import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useFirestore } from './useFirestore';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

// ===== CONSTANTS =====
const DEFAULT_CLASSES=['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3','ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'];
const STATUS={present:{label:'มา',short:'มา',bg:'#16a34a'},absent:{label:'ขาด',short:'ขาด',bg:'#dc2626'},late:{label:'สาย',short:'สาย',bg:'#d97706'},leave_p:{label:'ลากิจ',short:'ลก',bg:'#0891b2',custom:true},leave_s:{label:'ลาป่วย',short:'ลป',bg:'#2563eb',custom:true},activity:{label:'กิจกรรม',short:'กจ',bg:'#7c3aed',custom:true}};
const S_ORDER=['present','absent','late','leave_p','leave_s','activity'];
const GRADE_SCALE=[{label:'4',min:80,gpa:4},{label:'3.5',min:75,gpa:3.5},{label:'3',min:70,gpa:3},{label:'2.5',min:65,gpa:2.5},{label:'2',min:60,gpa:2},{label:'1.5',min:55,gpa:1.5},{label:'1',min:50,gpa:1},{label:'0',min:0,gpa:0}];
const CREDIT_OPTIONS=[0.5,1.0,1.5,2.0,2.5];
const creditToHours=c=>c*2;
const CONDUCT_DEF={presentScore:1,absentScore:-1,lateGroup:3,latePenalty:-1,minAttPct:20};

// ปรับโทนสี
const C={red:'#E53935',dark:'#B71C1C',bg:'#F8FAFC',card:'#FFFFFF',border:'#E2E8F0',text:'#1E293B',muted:'#64748B',light:'#FEF2F2',blue:'#0284C7'};
const NAV=[{id:'home',icon:'🏠',label:'หน้าหลัก'},{id:'att',icon:'✓',label:'เช็คชื่อ'},{id:'score',icon:'📊',label:'คะแนน'},{id:'stu',icon:'👥',label:'นักเรียน'},{id:'stat',icon:'📈',label:'สถิติ'},{id:'homeroom',icon:'🏫',label:'ประจำชั้น'},{id:'io',icon:'📥',label:'นำเข้า/ส่งออก'},{id:'set',icon:'⚙️',label:'ตั้งค่า'}];

// ข้อมูลสำหรับตารางสอน
const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
const PERIODS = [
  {id:1, time:'08.30-09.20'}, {id:2, time:'09.20-10.10'}, {id:3, time:'10.20-11.10'}, 
  {id:4, time:'11.10-12.00'}, {id:5, time:'12.00-13.00', isLunch:true}, {id:6, time:'13.00-13.50'}, 
  {id:7, time:'13.50-14.40'}, {id:8, time:'14.40-15.30'}, {id:9, time:'15.30-16.20'}
];

const BLOOD_TYPES = ['A','B','AB','O','ไม่ทราบ'];
const RELIGIONS = ['พุทธ','คริสต์','อิสลาม','พราหมณ์-ฮินดู','อื่นๆ'];
const MARITAL = ['จดทะเบียนสมรส','หย่าร้าง','อยู่ด้วยกันแบบไม่จดทะเบียนสมรส','บิดาเสียชีวิต','มารดาเสียชีวิต'];

// ===== STYLES =====
const sCard={background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:20,marginBottom:16,boxShadow:'0 2px 10px rgba(0,0,0,0.02)'};
const sBtn=(p=true,sm=false)=>({padding:sm?'8px 16px':'12px 24px',borderRadius:10,fontWeight:600,cursor:'pointer',border:'none',background:p?C.red:C.light,color:p?'white':C.red,fontSize:sm?14:16,fontFamily:'inherit',transition:'all 0.2s'});
const sInp={padding:'12px 16px',borderRadius:10,border:`1.5px solid ${C.border}`,width:'100%',fontSize:15,background:'#F8FAFC',color:C.text,boxSizing:'border-box',fontFamily:'inherit',transition:'border 0.2s',outline:'none'};
const sTab=a=>({padding:'10px 16px',borderRadius:10,cursor:'pointer',border:'none',fontWeight:a?700:500,background:a?C.red:'transparent',color:a?'white':C.muted,fontSize:14,fontFamily:'inherit',whiteSpace:'nowrap',transition:'all 0.2s'});
const sLabel={fontSize:13,color:C.muted,marginBottom:6,display:'block',fontWeight:500};

// ===== UTILS =====
const todayStr=()=>new Date().toISOString().split('T')[0];
const fmtDate=s=>{if(!s)return'';const d=new Date(s+'T00:00:00');const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];return`${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()+543}`;};
const randomPin=()=>String(Math.floor(1000+Math.random()*9000));
const uid=()=>'_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
const getGrade=(score,max)=>{const p=max>0?(score/max)*100:0;return GRADE_SCALE.find(g=>p>=g.min)||GRADE_SCALE[7];};
const gradeColor=g=>!g||g.special?g?.color||'#dc2626':g.gpa>=3?'#16a34a':g.gpa>=1?'#d97706':'#dc2626';
const gradeBg=g=>!g||g.special?'#fee2e2':g.gpa>=3?'#dcfce7':g.gpa>=1?'#fef9c3':'#fee2e2';
const getCatMax=cat=>cat.subs?.length>0?cat.subs.reduce((s,x)=>s+x.max,0):cat.max||0;
const getCatScore=(sid,cat,scores,term,year)=>{if(cat.subs?.length>0)return cat.subs.reduce((t,sub)=>{const r=scores.find(x=>x.studentId===sid&&x.categoryId===cat.id&&x.subId===sub.id&&x.term===term&&x.year===year);return t+(r?r.score:0);},0);const r=scores.find(x=>x.studentId===sid&&x.categoryId===cat.id&&!x.subId&&x.term===term&&x.year===year);return r?r.score:0;};
const hasCatScore=(sid,cat,scores,term,year)=>{if(cat.subs?.length>0)return cat.subs.some(sub=>scores.some(x=>x.studentId===sid&&x.categoryId===cat.id&&x.subId===sub.id&&x.term===term&&x.year===year));return scores.some(x=>x.studentId===sid&&x.categoryId===cat.id&&!x.subId&&x.term===term&&x.year===year);};
const hasIncomplete=(sid,cat,scores,term,year)=>{if(!cat.subs?.length)return false;return cat.subs.some(sub=>!scores.some(x=>x.studentId===sid&&x.categoryId===cat.id&&x.subId===sub.id&&x.term===term&&x.year===year));};
const calcConduct=(sid,att,cfg=CONDUCT_DEF,subjId=null)=>{const a=att.filter(x=>x.studentId===sid&&x.type==='class'&&(!subjId||x.subjectId===subjId));let score=0,lc=0;const counts={present:0,absent:0,late:0,leave_p:0,leave_s:0,activity:0};
  for(const r of a){counts[r.status]=(counts[r.status]||0)+1;if(r.status==='present')score+=cfg.presentScore;else if(r.status==='absent')score+=cfg.absentScore;else if(r.status==='late')lc++;else if(STATUS[r.status]?.custom){const cs=r.customScore||0;if(cs>0)score+=cfg.presentScore;else if(cs<0)score+=cfg.absentScore;else lc++;}}
  score+=Math.floor(lc/cfg.lateGroup)*cfg.latePenalty;return{score,counts,total:a.length};};
const calcAttRate=(sid,att,type='class',subjId=null)=>{const a=att.filter(x=>x.studentId===sid&&x.type===type&&(!subjId||x.subjectId===subjId));if(!a.length)return null;const ok=a.filter(x=>{if(x.status==='present'||x.status==='late')return true;if(STATUS[x.status]?.custom)return(x.customScore||0)>=0;return false;}).length;return Math.round(ok/a.length*100);};
const getSubjectGrade=(sid,subj,cats,scores,term,year,att,conduct)=>{const rate=calcAttRate(sid,att,'class',subj.id);if(rate!==null&&rate<conduct.minAttPct)return{label:'มส.',gpa:0,special:true,color:'#dc2626'};const sc=cats.filter(c=>c.subjectId===subj.id);if(sc.some(c=>hasIncomplete(sid,c,scores,term,year)&&hasCatScore(sid,c,scores,term,year)))return{label:'ร',gpa:0,special:true,color:'#d97706'};const tot=sc.reduce((s,c)=>s+getCatScore(sid,c,scores,term,year),0);const mx=sc.reduce((s,c)=>s+getCatMax(c),0);if(!sc.some(c=>hasCatScore(sid,c,scores,term,year)))return null;return getGrade(tot,mx);};
const sortClasses=cls=>[...cls].sort((a,b)=>{const p=c=>{const m=c.match(/ม\.(\d+)\/(\d+)/);return m?parseInt(m[1])*100+parseInt(m[2]):999;};return p(a)-p(b);});
const dateInRange=(ds,range)=>{if(range==='term')return true;const d=new Date(ds+'T00:00:00'),now=new Date();now.setHours(0,0,0,0);if(range==='today')return ds===todayStr();if(range==='week'){const w=new Date(now);w.setDate(w.getDate()-7);return d>=w;}if(range==='month'){const m=new Date(now);m.setDate(m.getDate()-30);return d>=m;}return true;};

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

// ===== DATA MODELS =====
const emptyProfile = () => ({
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

const emptyGoal = () => ({ goalName:'', goal:0, goalDate:'', entries:[] });

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
  return { total, goal, remaining, pct, daysLeft, dailyNeeded };};

// 📌 แก้ไขให้ตรงกับ Database เดิมที่คุณครูแคปรูปมา (app_data / main_data)
const COLLECTION = "app_data";
const DEFAULT_DOC_ID = "main_data";

const isBase64 = s => typeof s === 'string' && s.startsWith('data:image');
const uploadImg = async (base64, path) => {
  try {
    if (!storage) return base64;
    const r = ref(storage, path);
    await uploadString(r, base64, 'data_url');
    return await getDownloadURL(r);
  } catch (e) {
    console.error('Upload error:', e);
    return base64; 
  }
};

const processProfiles = async (profiles) => {
  const result = {};
  for (const [sid, profile] of Object.entries(profiles || {})) {
    const p = { ...profile };
    if (isBase64(p.profilePhoto)) {
      p.profilePhoto = await uploadImg(p.profilePhoto, `profiles/${sid}/photo.jpg`);
    }
    if (Array.isArray(p.homePhotos)) {
      p.homePhotos = await Promise.all(p.homePhotos.map(async (photo, idx) => {
        if (isBase64(photo)) {
          return await uploadImg(photo, `profiles/${sid}/home_${idx}_${Date.now()}.jpg`);
        }
        return photo;
      }));
    }
    result[sid] = p;
  }
  return result;
};

const initData = () => ({
  appName: 'ห้องเรียนของคุณครูต้นฝน',
  teacherUsername: 'puntoy',
  password: '0000',
  term: 1,
  year: 2569,
  homeroom: 'ม.1/1',
  classes: DEFAULT_CLASSES,
  subjects: [{ id: 's1', code: 'จ20201', name: 'ภาษาจีนเบื้องต้น', credits: 1.0 }],
  categories: [],
  students: [],
  attendance: [],
  scores: [],
  profiles: {},
  savings: {},
  timetable: {},
  conduct: { presentScore: 1, absentScore: -1, lateGroup: 3, latePenalty: -1, minAttPct: 20 }
});

// ===== SEPARATE INPUT COMPONENTS TO FIX FOCUS LOSS =====
const FormInp = ({ label, val, onChange, type='text', placeholder='', disabled=false }) => (
  <div style={{marginBottom:12}}>
    <label style={sLabel}>{label}</label>
    <input type={type} value={val||''} onChange={e=>onChange(e.target.value)} disabled={disabled} style={{...sInp, opacity:disabled?0.6:1}} placeholder={placeholder}/>
  </div>
);

const FormSel = ({ label, val, onChange, options }) => (
  <div style={{marginBottom:12}}>
    <label style={sLabel}>{label}</label>
    <select value={val||''} onChange={e=>onChange(e.target.value)} style={{...sInp,fontFamily:'inherit',appearance:'none',backgroundImage:`url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 16px center',backgroundSize:'12px'}}>
      <option value="">-- เลือก --</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);
const Row2 = ({ children }) => <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{children}</div>;
const Row4 = ({ children }) => <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>{children}</div>;

function Sheet({open,title,onClose,children}){if(!open)return null;return(<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:300,backdropFilter:'blur(2px)'}}><div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:'24px 24px 0 0',padding:24,width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 -4px 24px rgba(0,0,0,0.1)'}}>{title&&<div style={{fontWeight:700,fontSize:18,marginBottom:20,color:C.text}}>{title}</div>}{children}</div></div>);}
function Toast({msg,type,onClose}){useEffect(()=>{if(msg){const t=setTimeout(onClose,2800);return()=>clearTimeout(t);}},[msg,onClose]);if(!msg)return null;return<div style={{position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',background:type==='success'?'#16a34a':'#dc2626',color:'white',padding:'12px 24px',borderRadius:24,fontSize:15,fontWeight:600,boxShadow:'0 4px 16px rgba(0,0,0,0.2)',zIndex:400,maxWidth:'90%',textAlign:'center',fontFamily:'inherit'}}>{msg}</div>;}

function TopBar({onMenu,onLogout,label,appName}){
  return(
    <div style={{background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,zIndex:50,boxShadow:'0 2px 12px rgba(183,28,28,0.3)'}}>
      <button onClick={onMenu} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',width:40,height:40,borderRadius:12,cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>☰</button>
      <div style={{flex:1,textAlign:'center'}}>
        <div style={{fontWeight:700,fontSize:17,letterSpacing:'-0.5px'}}>{appName}</div>
        <div style={{fontSize:12,opacity:0.9,fontWeight:300}}>{label}</div>
      </div>
      <button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',width:40,height:40,borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  );
}

function Drawer({open,onClose,current,onNav,data}){return(<><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,opacity:open?1:0,pointerEvents:open?'auto':'none',transition:'opacity 0.2s',backdropFilter:'blur(2px)'}}/><div style={{position:'fixed',top:0,left:0,bottom:0,width:280,background:'white',zIndex:201,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform 0.25s',boxShadow:'2px 0 24px rgba(0,0,0,0.15)',display:'flex',flexDirection:'column'}}><div style={{background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',padding:'24px 20px'}}><div style={{fontSize:44,lineHeight:1}}>中</div><div style={{fontWeight:700,fontSize:18,marginTop:8}}>{data.appName||'ห้องเรียนของคุณครูต้นฝน'}</div><div style={{fontSize:13,opacity:0.85}}>ภาคเรียน {data.term}/{data.year}</div></div><div style={{flex:1,overflowY:'auto',padding:'12px 0'}}>{NAV.map((n,i)=>(<div key={n.id}>{i===5&&<div style={{height:1,background:C.border,margin:'12px 20px'}}/>}<button onClick={()=>{onNav(n.id);onClose();}} style={{width:'100%',padding:'14px 20px',border:'none',background:current===n.id?C.light:'transparent',color:current===n.id?C.red:C.text,display:'flex',alignItems:'center',gap:16,cursor:'pointer',fontSize:16,fontWeight:current===n.id?700:500,fontFamily:'inherit',borderLeft:`4px solid ${current===n.id?C.red:'transparent'}`,transition:'all 0.2s'}}><span style={{fontSize:20,width:24,textAlign:'center'}}>{n.icon}</span><span>{n.label}</span></button></div>))}</div></div></>);}

// ===== HOMEROOM COMPONENTS =====
function ProfileForm({ student, profile, onSave, onBack, toast }) {
  const [form, setForm] = useState({ ...emptyProfile(), ...profile });
  const [sec, setSec] = useState(0);
  const profileRef = useRef(null);
  const homeRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleBirthday = (v) => {
    let age = form.age;
    if(v) { 
        const diff = Date.now() - new Date(v).getTime();
        age = Math.abs(new Date(diff).getUTCFullYear() - 1970);
    }
    setForm(p => ({...p, birthday: v, age: age}));
  };

  const handleProfilePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { set('profilePhoto', await compressImg(file, 600, 0.8)); toast('พร้อมอัปโหลดรูปแล้ว','success'); }
    catch { toast('เลือกรูปไม่สำเร็จ','error'); }
    e.target.value = '';
  };

  const handleHomePhoto = async e => {
    const file = e.target.files[0]; if (!file) return;
    if ((form.homePhotos||[]).length >= 5) return toast('รูปบ้านสูงสุด 5 รูป','error');
    try {
      const c = await compressImg(file, 900, 0.75);
      setForm(p => ({ ...p, homePhotos: [...(p.homePhotos||[]), c] }));
      toast('เพิ่มรูปรอเซฟแล้ว','success');
    } catch { toast('เลือกรูปไม่สำเร็จ','error'); }
    e.target.value = '';
  };

  const sections = ['ข้อมูลส่วนตัว','ที่อยู่','ครอบครัว','ติดต่อ','รูปภาพ'];
  const completion = profileCompletion(form);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <button onClick={onBack} style={{...sBtn(false,true),padding:'7px 12px'}}>← กลับ</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontWeight:600,fontSize:14,color:C.text}}>{student.name}</div>
          <div style={{fontSize:11,color:C.muted}}>ข้อมูลครบ {completion}%</div>
        </div>
        <button onClick={() => onSave(form)} style={{...sBtn(true,true)}}>💾 บันทึก</button>
      </div>

      <div style={{display:'flex',gap:4,overflowX:'auto',paddingBottom:4,marginBottom:12}}>
        {sections.map((s,i) => <button key={i} onClick={()=>setSec(i)} style={{...sTab(sec===i)}}>{s}</button>)}
      </div>

      {sec===0 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.text}}>ข้อมูลส่วนตัว</div>
        <FormInp label="เลขบัตรประจำตัวประชาชน (13 หลัก)" val={form.idCard} onChange={v=>set('idCard',v)} placeholder="x-xxxx-xxxxx-xx-x"/>
        <Row2><FormInp label="วัน/เดือน/ปีเกิด" val={form.birthday} onChange={handleBirthday} type="date"/><FormInp label="อายุ (ปี)" val={form.age} onChange={v=>set('age',v)} type="number" placeholder="15"/></Row2>
        <Row2><FormSel label="หมู่เลือด" val={form.bloodType} onChange={v=>set('bloodType',v)} options={BLOOD_TYPES}/><FormInp label="เชื้อชาติ" val={form.ethnicity} onChange={v=>set('ethnicity',v)} placeholder="ไทย"/></Row2>
        <Row2><FormInp label="สัญชาติ" val={form.nationality} onChange={v=>set('nationality',v)} placeholder="ไทย"/><FormSel label="ศาสนา" val={form.religion} onChange={v=>set('religion',v)} options={RELIGIONS}/></Row2>
        <Row2><FormInp label="น้ำหนัก (กก.)" val={form.weight} onChange={v=>set('weight',v)} type="number" placeholder="45"/><FormInp label="ส่วนสูง (ซม.)" val={form.height} onChange={v=>set('height',v)} type="number" placeholder="160"/></Row2>
        <FormInp label="โรคประจำตัว" val={form.disease} onChange={v=>set('disease',v)} placeholder="ระบุหากมี หรือ -"/>
        <button onClick={()=>setSec(1)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ที่อยู่ →</button>
      </div>}

      {sec===1 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.text}}>ที่อยู่อาศัย</div>
        <Row2><FormInp label="บ้านเลขที่" val={form.houseNo} onChange={v=>set('houseNo',v)}/><FormInp label="หมู่ที่" val={form.village} onChange={v=>set('village',v)} type="number"/></Row2>
        <FormInp label="ถนน" val={form.road} onChange={v=>set('road',v)}/>
        <FormInp label="ตำบล/แขวง" val={form.subDistrict} onChange={v=>set('subDistrict',v)}/>
        <FormInp label="อำเภอ/เขต" val={form.district} onChange={v=>set('district',v)}/>
        <FormInp label="จังหวัด" val={form.province} onChange={v=>set('province',v)}/>
        <FormInp label="รหัสไปรษณีย์" val={form.postalCode} onChange={v=>set('postalCode',v)} placeholder="50000"/>
        <button onClick={()=>setSec(2)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ครอบครัว →</button>
      </div>}

      {sec===2 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.text}}>ข้อมูลครอบครัว</div>
        <Row2>
          <FormInp label="สมาชิกในครอบครัว (คน)" val={form.familyCount} onChange={v=>set('familyCount',v)} type="number"/>
          <FormInp label="จำนวนพี่น้อง (คน)" val={form.siblingCount} onChange={v=>set('siblingCount',v)} type="number"/>
        </Row2>
        <FormInp label="เป็นบุตรลำดับที่" val={form.childOrder} onChange={v=>set('childOrder',v)} type="number" placeholder="1"/>
        <div style={{fontSize:13,color:C.muted,marginBottom:8,marginTop:8,fontWeight:500}}>จำนวนพี่น้อง</div>
        <Row4>
          {[['พี่ชาย','brotherOlder'],['น้องชาย','brotherYounger'],['พี่สาว','sisterOlder'],['น้องสาว','sisterYounger']].map(([l,k])=>(
            <div key={k}>
              <label style={{...sLabel,fontSize:12,textAlign:'center'}}>{l}</label>
              <input type="number" min="0" value={form[k]||0} onChange={e=>set(k,parseInt(e.target.value)||0)} style={{...sInp,textAlign:'center',padding:'10px 4px'}}/>
            </div>
          ))}
        </Row4>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:16}}>
          <div style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:12}}>👨 ข้อมูลบิดา</div>
          <Row2><FormInp label="ชื่อ" val={form.fatherName} onChange={v=>set('fatherName',v)}/><FormInp label="นามสกุล" val={form.fatherSurname} onChange={v=>set('fatherSurname',v)}/></Row2>
          <Row2><FormInp label="อายุ (ปี)" val={form.fatherAge} onChange={v=>set('fatherAge',v)} type="number"/><FormInp label="อาชีพ" val={form.fatherJob} onChange={v=>set('fatherJob',v)}/></Row2>
        </div>

        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:8}}>
          <div style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:12}}>👩 ข้อมูลมารดา</div>
          <Row2><FormInp label="ชื่อ" val={form.motherName} onChange={v=>set('motherName',v)}/><FormInp label="นามสกุล" val={form.motherSurname} onChange={v=>set('motherSurname',v)}/></Row2>
          <Row2><FormInp label="อายุ (ปี)" val={form.motherAge} onChange={v=>set('motherAge',v)} type="number"/><FormInp label="อาชีพ" val={form.motherJob} onChange={v=>set('motherJob',v)}/></Row2>
        </div>

        <FormSel label="สถานภาพบิดา-มารดา" val={form.maritalStatus} onChange={v=>set('maritalStatus',v)} options={MARITAL}/>
        <Row2><FormInp label="นักเรียนอาศัยอยู่กับ" val={form.livesWith} onChange={v=>set('livesWith',v)}/><FormInp label="เกี่ยวข้องเป็น" val={form.relationship} onChange={v=>set('relationship',v)} placeholder="เช่น บิดา บิดา ปู่"/></Row2>
        <button onClick={()=>setSec(3)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: ติดต่อ →</button>
      </div>}

      {sec===3 && <div style={sCard}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:C.text}}>ข้อมูลการติดต่อ</div>
        <div style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:12}}>📱 ผู้ปกครอง</div>
        <Row2><FormInp label="เบอร์โทรศัพท์" val={form.guardianPhone} onChange={v=>set('guardianPhone',v)} type="tel" placeholder="0812345678"/><FormInp label="Line ID" val={form.guardianLine} onChange={v=>set('guardianLine',v)} placeholder="@line"/></Row2>
        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16,marginTop:8}}>
          <div style={{fontWeight:600,fontSize:14,color:C.text,marginBottom:12}}>📱 นักเรียน</div>
          <Row2><FormInp label="เบอร์โทรศัพท์" val={form.studentPhone} onChange={v=>set('studentPhone',v)} type="tel"/><FormInp label="Line ID" val={form.studentLine} onChange={v=>set('studentLine',v)}/></Row2>
        </div>
        <button onClick={()=>setSec(4)} style={{...sBtn(true),width:'100%',marginTop:8}}>ถัดไป: รูปภาพ →</button>
      </div>}

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

function ProfileView({ student, profile, onEdit, onBack }) {
  const p = profile || emptyProfile();
  const pct = profileCompletion(p);

  const Row = ({ label, value }) => (!value || value === '') ? null : (
    <div style={{display:'flex',gap:8,padding:'7px 0',borderBottom:`1px solid ${C.border}`,fontSize:14}}>
      <span style={{color:C.muted,minWidth:120,flexShrink:0,fontSize:13}}>{label}</span>
      <span style={{fontWeight:500}}>{value}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={sCard}>
      <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:C.text}}>{title}</div>
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

function ProfileSection({ data, update, role, hStu, myStudentId, toast }) {
  const [viewId, setViewId] = useState(role === 'student' ? myStudentId : null);
  const [editing, setEditing] = useState(false);

  const targetId = viewId;
  const profile = targetId ? (data.profiles?.[targetId] || emptyProfile()) : null;
  const student = targetId ? data.students.find(s => s.id === targetId) : null;

  const saveProfile = newProfile => {
    update(prev => ({
      ...prev,
      profiles: { ...(prev.profiles||{}), [targetId]: { ...newProfile, updatedAt: new Date().toISOString() } }
    }));
    toast('บันทึกประวัติแล้วรอเซฟรูปลงระบบ','success');
    setEditing(false);
  };

  if (role === 'teacher' && !viewId) {
    return (
      <div>
        <div style={{fontSize:14,color:C.muted,marginBottom:10,display:'flex',justifyContent:'space-between'}}>
          <span>ห้อง {data.homeroom} · {hStu.length} คน</span>
          <span style={{color:hStu.filter(s=>profileCompletion(data.profiles?.[s.id])>=80).length===hStu.length&&hStu.length>0?'#16a34a':'#d97706'}}>
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
  return <ProfileView student={student} profile={profile} onEdit={()=>setEditing(true)} onBack={()=>setViewId(role==='teacher'?null:myStudentId)}/>;
}

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

        {role === 'teacher' && (
          <button onClick={()=>{setGoalForm({goalName:mySav.goalName||'',goal:mySav.goal||'',goalDate:mySav.goalDate||''});setGoalModal(true);}} style={{marginTop:12,width:'100%',padding:'9px',background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.4)',color:'white',borderRadius:8,cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:14}}>
            🎯 {mySav.goal ? 'แก้ไขเป้าหมาย' : 'ตั้งเป้าหมายการออม'}
          </button>
        )}
      </div>

      {role === 'teacher' && (
        <div style={sCard}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12,color:C.text}}>💰 บันทึกการออม</div>
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
          <input value={entry.note} onChange={e=>setEntry(p=>({...p,note:e.target.value}))} style={{...sInp,marginBottom:10}} placeholder="หมายเหตุ เช่น ถอนหรือฝากเพิ่ม"/>
          <button onClick={addEntry} style={{...sBtn(true),width:'100%',padding:12}}>+ บันทึกรายการ</button>
        </div>
      )}

      <div style={{fontWeight:600,fontSize:14,marginBottom:8,color:C.text,display:'flex',justifyContent:'space-between'}}>
        <span>ประวัติการทำรายการ</span>
        <span style={{fontSize:12,color:C.muted,fontWeight:400}}>{(mySav.entries||[]).length} รายการ</span>
      </div>
      {(mySav.entries||[]).length === 0 && <div style={{textAlign:'center',color:C.muted,padding:40}}>ยังไม่มีรายการทำธุรกรรม</div>}
      {[...(mySav.entries||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map((e,i) => {
        const amt = parseFloat(e.amount);
        const isDep = amt > 0;
        return(
        <div key={e.id||i} style={{...sCard,marginBottom:6,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:isDep?'#16a34a':'#dc2626'}}>{isDep?'+':''}฿{amt.toLocaleString()}</div>
            <div style={{fontSize:12,color:C.muted}}>{fmtDate(e.date)}{e.note?` · ${e.note}`:''}</div>
          </div>
          {role === 'teacher' && <button onClick={()=>removeEntry(e.id||i)} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:24,padding:'4px 8px',lineHeight:1}}>×</button>}
        </div>
      )})}

      {role === 'teacher' && (
        <Sheet open={goalModal} title="🎯 ตั้งเป้าหมายการออม" onClose={()=>setGoalModal(false)}>
          <div style={{fontSize:13,color:C.muted,marginBottom:6}}>ชื่อเป้าหมาย</div>
          <input value={goalForm.goalName} onChange={e=>setGoalForm(p=>({...p,goalName:e.target.value}))} style={{...sInp,marginBottom:12}} placeholder="เช่น ซื้อโทรศัพท์ ทริปปิดเทอม"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><div style={{fontSize:13,color:C.muted,marginBottom:6}}>จำนวนเงิน (บาท)</div><input type="number" value={goalForm.goal} onChange={e=>setGoalForm(p=>({...p,goal:e.target.value}))} style={{...sInp,textAlign:'center',fontWeight:700}} placeholder="5000"/></div>
            <div><div style={{fontSize:13,color:C.muted,marginBottom:6}}>วันที่เป้าหมาย</div><input type="date" value={goalForm.goalDate} onChange={e=>setGoalForm(p=>({...p,goalDate:e.target.value}))} style={sInp}/></div>
          </div>
          {goalForm.goal && goalForm.goalDate && previewDailyNeeded > 0 && (
            <div style={{background:'#fffbf0',border:'1px solid #fed7aa',borderRadius:10,padding:'12px 14px',marginBottom:16}}>
              <div style={{fontSize:12,color:'#92400e',marginBottom:4}}>💡 ต้องออมเพื่อถึงเป้าหมาย</div>
              <div style={{fontSize:20,fontWeight:700,color:C.red}}>฿{previewDailyNeeded.toLocaleString()} ต่อวัน</div>
              <div style={{fontSize:12,color:'#92400e',marginTop:2}}>หรือ ฿{Math.ceil(previewDailyNeeded*7).toLocaleString()} ต่อสัปดาห์</div>
            </div>
          )}
          <div style={{display:'flex',gap:12}}>
            <button onClick={()=>setGoalModal(false)} style={{...sBtn(false),flex:1}}>ยกเลิก</button>
            <button onClick={saveGoal} style={{...sBtn(true),flex:1}}>💾 บันทึก</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function HomeroomPage({ data, update, role, currentStudentId, toast }) {
  const [sub, setSub] = useState('profile');

  const hStu = (data.students||[])
    .filter(s => s.classId === data.homeroom)
    .sort((a,b) => (a.number||999)-(b.number||999));

  return (
    <div style={{padding:'14px 14px 100px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:20,color:C.text}}>🏫 ประจำชั้น</div>
        <div style={{fontSize:13,color:C.muted}}>{data.homeroom} · {hStu.length} คน</div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:16,background:'white',padding:6,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
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

// ===== LOGIN =====
function LoginScreen({data,onLogin}){
  const[id,setId]=useState('');const[pin,setPin]=useState('');const[err,setErr]=useState('');
  const doLogin=()=>{
    const tUser = data.teacherUsername || 'puntoy';
    const tPass = data.password || '0000';
    if(id.trim() === tUser && pin === tPass){onLogin({role:'teacher'});}else{
      const s=data.students.find(x=>x.id===id.trim());
      if(s){if(s.pin===pin) onLogin({role:'student',id:s.id}); else setErr('PIN ไม่ถูกต้อง');}else{setErr('ชื่อผู้ใช้ / รหัสนักเรียน หรือ รหัสผ่าน ไม่ถูกต้อง');}
    }
  };
  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{width:88,height:88,borderRadius:24,background:`linear-gradient(135deg,${C.red},${C.dark})`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 8px 32px rgba(183,28,28,0.3)'}}><span style={{fontSize:52,color:'white',lineHeight:1}}>中</span></div>
        <div style={{fontSize:26,fontWeight:700,color:C.text,letterSpacing:'-0.5px'}}>{data.appName||'ห้องเรียนของคุณครูต้นฝน'}</div><div style={{color:C.muted,fontSize:15,marginTop:6}}>ระบบจัดการการเรียนการสอน</div></div>
      <div style={{...sCard,width:'100%',maxWidth:340}}>
        <label style={{fontSize:13,color:C.muted,marginBottom:6,display:'block',fontWeight:500}}>ชื่อผู้ใช้ (ครู) หรือ รหัสนักเรียน</label>
        <input placeholder="Username หรือ รหัสนักเรียน" value={id} onChange={e=>setId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} style={{...sInp,marginBottom:16}} autoFocus/>
        <label style={{fontSize:13,color:C.muted,marginBottom:6,display:'block',fontWeight:500}}>รหัสผ่าน (ครู) หรือ PIN 4 หลัก (นักเรียน)</label>
        <input type="password" placeholder="รหัสผ่าน หรือ PIN" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()} style={{...sInp,marginBottom:20}}/>
        {err&&<div style={{color:C.red,fontSize:14,marginBottom:16,padding:'10px',background:'#FEF2F2',borderRadius:8,textAlign:'center'}}>{err}</div>}
        <button onClick={doLogin} style={{...sBtn(true),width:'100%',padding:14,fontSize:16}}>เข้าสู่ระบบ</button></div></div>
  );
}

// ===== DASHBOARD =====
function Dashboard({data,setPage,openAtt}){const today=todayStr();const morningAtt=data.attendance.filter(a=>a.date===today&&a.type==='morning');const hStu=data.students.filter(s=>s.classId===data.homeroom);const classesHave=sortClasses(data.classes.filter(c=>data.students.some(s=>s.classId===c)));
  const summary=useMemo(()=>{const r={};S_ORDER.forEach(k=>r[k]=0);morningAtt.forEach(a=>{if(r[a.status]!==undefined)r[a.status]++;});return r;},[morningAtt]);
  const atRisk=useMemo(()=>data.students.map(s=>({stu:s,rate:calcAttRate(s.id,data.attendance)})).filter(x=>x.rate!==null&&x.rate<data.conduct.minAttPct),[data]);
  return(<div style={{padding:'16px 16px 100px'}}><div style={{marginBottom:20}}><div style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:'-0.5px'}}>สวัสดี ครู! 👋</div><div style={{color:C.muted,fontSize:15}}>{fmtDate(today)}</div></div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
      <button onClick={()=>openAtt('morning',data.homeroom)} style={{background:'linear-gradient(135deg,#0284C7,#0369A1)',color:'white',border:'none',borderRadius:16,padding:16,textAlign:'left',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(2,132,199,0.2)'}}><div style={{fontSize:24,marginBottom:6}}>🌅</div><div style={{fontSize:13,opacity:0.9}}>เช็คชื่อเข้าแถว</div><div style={{fontSize:18,fontWeight:700}}>{data.homeroom}</div><div style={{fontSize:12,opacity:0.85,marginTop:6}}>{morningAtt.length>0?`เช็คแล้ว ${morningAtt.length}/${hStu.length}`:`${hStu.length} คน →`}</div></button>
      <button onClick={()=>openAtt('class')} style={{background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',border:'none',borderRadius:16,padding:16,textAlign:'left',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(229,57,53,0.2)'}}><div style={{fontSize:24,marginBottom:6}}>📚</div><div style={{fontSize:13,opacity:0.9}}>ตารางสอน / คาบเรียน</div><div style={{fontSize:18,fontWeight:700}}>เปิดตารางสอน</div><div style={{fontSize:12,opacity:0.85,marginTop:6}}>ดูคาบเรียนวันนี้ →</div></button></div>
    <div style={{...sCard,padding:16}}><div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:12}}>🌅 สรุปเข้าแถววันนี้ · {data.homeroom} ({morningAtt.length}/{hStu.length})</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>{S_ORDER.map(k=><div key={k} style={{background:C.bg,borderRadius:10,padding:'12px 8px',textAlign:'center',borderLeft:`3px solid ${STATUS[k].bg}`}}><div style={{fontSize:24,fontWeight:700,color:STATUS[k].bg,lineHeight:1}}>{summary[k]}</div><div style={{fontSize:12,color:C.muted,marginTop:6}}>{STATUS[k].label}</div></div>)}</div></div>
    {atRisk.length>0&&<div style={{...sCard,borderLeft:'4px solid #dc2626',background:'#FEF2F2'}}><div style={{fontWeight:700,fontSize:15,color:'#B91C1C',marginBottom:8}}>🚨 เสี่ยง มส. ({atRisk.length} คน)</div>{atRisk.slice(0,5).map(({stu,rate})=><div key={stu.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderTop:`1px solid #FCA5A5`,fontSize:14}}><span>{stu.nickname||stu.name}</span><span style={{color:'#DC2626',fontWeight:700}}>{stu.classId} · {rate}%</span></div>)}</div>}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><button onClick={()=>setPage('stu')} style={{...sCard,margin:0,cursor:'pointer',textAlign:'left',padding:16}}><div style={{fontSize:26}}>👥</div><div style={{fontWeight:700,marginTop:6,fontSize:15}}>นักเรียน</div><div style={{fontSize:13,color:C.muted}}>{data.students.length} คน</div></button><button onClick={()=>setPage('stat')} style={{...sCard,margin:0,cursor:'pointer',textAlign:'left',padding:16}}><div style={{fontSize:26}}>📈</div><div style={{fontWeight:700,marginTop:6,fontSize:15}}>สถิติ</div><div style={{fontSize:13,color:C.muted}}>{data.subjects.length} วิชา</div></button></div></div>);}

// ===== ATTENDANCE & TIMETABLE =====
function AttendancePage({data,update,initType,initClass,toast}){
  const[tab,setTab]=useState(initType||'morning');const[date,setDate]=useState(todayStr());const[cls,setCls]=useState(initClass||(tab==='morning'?data.homeroom:''));const[subjId,setSubjId]=useState(data.subjects[0]?.id||'');const[period,setPeriod]=useState(1);const[scoreModal,setScoreModal]=useState(null);
  const[sheetOpen,setSheetOpen]=useState(null);
  const[ttForm,setTtForm]=useState({subjId:'',classId:''});
  
  useEffect(()=>{if(tab==='morning')setCls(data.homeroom);},[tab,data.homeroom]);
  const classesHave=sortClasses(data.classes.filter(c=>data.students.some(s=>s.classId===c)));const students=data.students.filter(s=>s.classId===cls).sort((a,b)=>(a.number||999)-(b.number||999)||(a.name||'').localeCompare(b.name||'','th'));
  const subj=data.subjects.find(s=>s.id===subjId);
  const checkedPeriods=useMemo(()=>{if(tab!=='class'||!cls||!subjId)return[];const ps=new Set();data.attendance.filter(a=>a.date===date&&a.type==='class'&&a.subjectId===subjId&&students.some(s=>s.id===a.studentId)).forEach(a=>{if(a.period)ps.add(a.period);});return Array.from(ps).sort();},[data.attendance,date,tab,cls,subjId,students]);
  const getRec=id=>data.attendance.find(a=>a.date===date&&a.type===tab&&a.studentId===id&&(tab==='morning'||(a.subjectId===subjId&&a.period===period)));
  
  const saveStatus=(id,status,customScore,note)=>{update(prev=>{const a=prev.attendance.filter(x=>!(x.date===date&&x.type===tab&&x.studentId===id&&(tab==='morning'||(x.subjectId===subjId&&x.period===period))));a.push({date,type:tab,studentId:id,status,...(tab==='class'?{subjectId:subjId,period}:{}),...(customScore!==undefined?{customScore}:{}),...(note?{note}:{})});return{...prev,attendance:a};});};
  
  // กดซ้ำเพื่อยกเลิกการเช็คชื่อ
  const setStatus=(id,status)=>{
    const rec = getRec(id);
    if(rec && rec.status === status) {
        update(prev=>({...prev,attendance:prev.attendance.filter(x=>x!==rec)}));
        return;
    }
    if(STATUS[status]?.custom&&tab==='class'){setScoreModal({studentId:id,status,customScore:rec?.customScore??0,note:rec?.note||''});}else saveStatus(id,status);
  };
  
  const markAll=status=>{if(STATUS[status]?.custom)return;update(prev=>{let a=prev.attendance.filter(x=>!(x.date===date&&x.type===tab&&students.some(s=>s.id===x.studentId)&&(tab==='morning'||(x.subjectId===subjId&&x.period===period))));students.forEach(s=>a.push({date,type:tab,studentId:s.id,status,...(tab==='class'?{subjectId:subjId,period}:{})}));return{...prev,attendance:a};});toast(`${STATUS[status].label}ทุกคน ✓`,'success');};
  const counted=st=>students.filter(s=>getRec(s.id)?.status===st).length;

  // ตารางสอน
  const [ttView, setTtView] = useState(tab === 'class');
  const handleCellClick = (d, p) => {
    const key = `${d}-${p.id}`;
    const block = data.timetable?.[key];
    if (block && block.classId && block.subjId) {
       setSubjId(block.subjId);
       setCls(block.classId);
       setPeriod(p.id);
       const now = new Date();
       const dayIdx = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'].indexOf(d);
       const todayIdx = now.getDay();
       const diff = dayIdx - todayIdx;
       const targetDate = new Date(now);
       targetDate.setDate(now.getDate() + diff);
       setDate(targetDate.toISOString().split('T')[0]);
       setTtView(false);
    } else {
       setTtForm({ subjId: block?.subjId || data.subjects[0]?.id || '', classId: block?.classId || '' });
       setSheetOpen({type:'tt_edit', day:d, period:p});
    }
  };

  const handleDragStart = (e, day, period) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({day, period: period.id}));
    e.currentTarget.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver = (e) => { e.preventDefault(); e.currentTarget.style.background = '#FEF2F2'; };
  const handleDragLeave = (e) => { e.currentTarget.style.background = ''; };
  const handleDrop = (e, targetDay, targetPeriod) => {
    e.preventDefault(); e.currentTarget.style.background = '';
    try {
        const src = JSON.parse(e.dataTransfer.getData('text/plain'));
        const srcKey = `${src.day}-${src.period}`;
        const tgtKey = `${targetDay}-${targetPeriod.id}`;
        if(srcKey === tgtKey) return;
        update(prev => {
            const newTt = {...(prev.timetable||{})};
            const srcBlock = newTt[srcKey];
            const tgtBlock = newTt[tgtKey];
            if (srcBlock) newTt[tgtKey] = srcBlock; else delete newTt[tgtKey];
            if (tgtBlock) newTt[srcKey] = tgtBlock; else delete newTt[srcKey];
            return {...prev, timetable: newTt};
        });
        toast('สลับคาบเรียนแล้ว', 'success');
    } catch(err) {}
  };

  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>✓ เช็คชื่อเข้าเรียน</div>
    <div style={{display:'flex',gap:8,marginBottom:16,background:'white',padding:6,borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}><button onClick={()=>{setTab('morning');setTtView(false);}} style={{...sTab(tab==='morning'),flex:1}}>🌅 เข้าแถว</button><button onClick={()=>{setTab('class');setTtView(true);}} style={{...sTab(tab==='class'),flex:1}}>📚 ตารางสอน</button></div>
    
    {tab==='class' && ttView && (
       <div>
         <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700}}>ตารางสอนประจำสัปดาห์</div>
            <div style={{fontSize:12,color:C.muted}}>กดเพื่อเช็คชื่อ หรือลากสลับวิชาได้</div>
         </div>
         <div style={{overflowX:'auto',background:'white',borderRadius:12,border:`1px solid ${C.border}`,boxShadow:'0 4px 12px rgba(0,0,0,0.03)'}}>
           <div style={{display:'inline-flex',flexDirection:'column',minWidth:800}}>
             <div style={{display:'flex',background:C.light,borderBottom:`2px solid ${C.red}`}}>
                <div style={{width:60,padding:10,fontWeight:700,textAlign:'center',borderRight:`1px solid ${C.border}`,fontSize:13}}>วัน/คาบ</div>
                {PERIODS.map(p=><div key={p.id} style={{flex:1,padding:8,textAlign:'center',borderRight:`1px solid ${C.border}`}}><div style={{fontWeight:700,fontSize:14}}>{p.id}</div><div style={{fontSize:10,color:C.muted}}>{p.time}</div></div>)}
             </div>
             {DAYS.map(d=><div key={d} style={{display:'flex',borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:60,padding:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',borderRight:`1px solid ${C.border}`,background:'#F8FAFC',fontSize:14}}>{d}</div>
                {PERIODS.map(p=>{
                   const key = `${d}-${p.id}`;
                   const block = data.timetable?.[key];
                   if(p.isLunch) return <div key={p.id} style={{flex:1,background:'#F1F5F9',borderRight:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:12,writingMode:'vertical-rl',transform:'rotate(180deg)'}}>พักกลางวัน</div>;
                   return <div key={p.id} onClick={()=>handleCellClick(d,p)} draggable onDragStart={(e)=>handleDragStart(e,d,p)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={(e)=>handleDrop(e,d,p)} style={{position:'relative',flex:1,padding:6,borderRight:`1px solid ${C.border}`,cursor:'pointer',minHeight:64,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',background:block?'#FFF5F5':'white',transition:'background 0.2s'}}>
                       {block ? <>
                         <button onClick={(e)=>{e.stopPropagation();update(prev=>{const newTt={...(prev.timetable||{})};delete newTt[key];return{...prev,timetable:newTt};});toast('ลบวิชาในคาบนี้แล้ว','success');}} style={{position:'absolute',top:0,right:0,background:'transparent',border:'none',color:'#ef4444',fontSize:18,cursor:'pointer',padding:'2px 6px',lineHeight:1}}>×</button>
                         <div style={{fontWeight:700,fontSize:13,color:C.red,textAlign:'center',lineHeight:1.2}}>{data.subjects.find(s=>s.id===block.subjId)?.code||'วิชา'}</div>
                         <div style={{fontSize:13,fontWeight:600,marginTop:4}}>{block.classId}</div>
                       </> : <div style={{fontSize:20,color:'#CBD5E1'}}>+</div>}
                   </div>;
                })}
             </div>)}
           </div>
         </div>
       </div>
    )}

    {(!ttView || tab==='morning') && <>
      <div style={sCard}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:700}}>{tab==='class'?'📌 เช็คชื่อรายคาบ':'🌅 เช็คชื่อเข้าแถว'}</div>
            {tab==='class'&&<button onClick={()=>setTtView(true)} style={{fontSize:13,color:C.red,background:'none',border:'none',fontWeight:600,cursor:'pointer'}}>← กลับไปตารางสอน</button>}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:tab==='class'?12:0}}>
          <div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>วันที่</div><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={sInp}/></div>
          <div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ห้องเรียน</div>
            {tab==='morning'?<input value={data.homeroom} disabled style={{...sInp,background:C.light,fontWeight:700,color:C.red}}/>:<button onClick={()=>setSheetOpen({type:'class'})} style={{...sInp,textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',background:'white'}}><span style={{fontWeight:cls?700:400}}>{cls||'-- เลือกห้อง --'}</span><span style={{fontSize:12,color:C.muted}}>▼</span></button>}</div></div>
        {tab==='class'&&<div style={{display:'flex',gap:12,alignItems:'flex-end'}}>
          <div style={{flex:1}}><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>รายวิชา</div><button onClick={()=>setSheetOpen({type:'subj'})} style={{...sInp,textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',background:'white'}}><span style={{fontWeight:subjId?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{subj?`${subj.code||''} ${subj.name}`:'-- เลือกวิชา --'}</span><span style={{fontSize:12,color:C.muted,flexShrink:0}}>▼</span></button></div>
          <div style={{flexShrink:0}}><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>คาบ {checkedPeriods.length>0&&<span style={{color:'#16a34a'}}>✓{checkedPeriods.join(',')}</span>}</div>
            <button onClick={()=>setSheetOpen({type:'period'})} style={{...sInp,textAlign:'center',background:'white',fontWeight:700,width:70}}>{period} <span style={{fontSize:10,color:C.muted}}>▼</span></button></div></div>}
      </div>
      {cls&&students.length>0&&(<><div style={{...sCard,padding:16}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:14,fontSize:13,fontWeight:600,flexWrap:'wrap',gap:8}}>{S_ORDER.map(k=><span key={k} style={{color:STATUS[k].bg}}>{STATUS[k].short} <b>{counted(k)}</b></span>)}</div><div style={{display:'flex',gap:10}}><button onClick={()=>markAll('present')} style={{flex:1,padding:10,borderRadius:10,border:'1px solid #16a34a',background:'#dcfce7',color:'#16a34a',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>✓ มาทุกคน</button><button onClick={()=>markAll('absent')} style={{flex:1,padding:10,borderRadius:10,border:'1px solid #dc2626',background:'#fee2e2',color:'#dc2626',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>✗ ขาดทุกคน</button></div></div>
        {students.map((stu,i)=>{const rec=getRec(stu.id);return(<div key={stu.id} style={{...sCard,marginBottom:10,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><div><span style={{fontSize:13,color:C.muted,marginRight:8}}>{stu.number||i+1}.</span><span style={{fontWeight:700,fontSize:16,color:C.text}}>{stu.nickname||stu.name}</span>{stu.chineseName&&<span style={{fontSize:14,color:'#0284C7',marginLeft:8}}>{stu.chineseName}</span>}<div style={{fontSize:13,color:C.muted,marginTop:4}}>{stu.id}</div></div>{rec&&<span style={{background:STATUS[rec.status].bg,color:'white',fontSize:13,padding:'4px 12px',borderRadius:20,fontWeight:700}}>{STATUS[rec.status].label}{STATUS[rec.status]?.custom&&rec.customScore!==undefined?` (${rec.customScore>0?'+':''}${rec.customScore})`:''}</span>}</div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>{S_ORDER.map(k=>{const a=rec?.status===k;return<button key={k} onClick={()=>setStatus(stu.id,k)} style={{padding:'10px 4px',borderRadius:10,border:`1.5px solid ${a?STATUS[k].bg:'#E2E8F0'}`,background:a?STATUS[k].bg:'white',color:a?'white':C.muted,fontSize:14,fontWeight:a?700:600,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>{STATUS[k].label}</button>;})}</div></div>);})}</>)}
      {!cls&&tab==='class'&&<div style={{textAlign:'center',color:C.muted,padding:48}}>📋 กรุณาเลือกห้องเรียนด้านบน</div>}
    </>}

    <Sheet open={sheetOpen?.type==='class'} title="🏫 เลือกห้องเรียน" onClose={()=>setSheetOpen(null)}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
         {classesHave.map(c=><button key={c} onClick={()=>{setCls(c);setSheetOpen(null);}} style={{padding:14,borderRadius:12,border:`2px solid ${cls===c?C.red:C.border}`,background:cls===c?C.light:'white',color:cls===c?C.red:C.text,fontWeight:cls===c?700:500,fontSize:16,fontFamily:'inherit'}}>{c}</button>)}
      </div>
    </Sheet>
    <Sheet open={sheetOpen?.type==='subj'} title="📚 เลือกรายวิชา" onClose={()=>setSheetOpen(null)}>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
         {data.subjects.map(s=><button key={s.id} onClick={()=>{setSubjId(s.id);setSheetOpen(null);}} style={{padding:16,borderRadius:12,border:`2px solid ${subjId===s.id?C.red:C.border}`,background:subjId===s.id?C.light:'white',color:subjId===s.id?C.red:C.text,fontWeight:subjId===s.id?700:500,fontSize:16,textAlign:'left',fontFamily:'inherit'}}><div style={{fontWeight:700}}>{s.code}</div><div style={{fontSize:14,opacity:0.8}}>{s.name}</div></button>)}
      </div>
    </Sheet>
    <Sheet open={sheetOpen?.type==='period'} title="⏱ เลือกคาบเรียน" onClose={()=>setSheetOpen(null)}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
         {PERIODS.filter(p=>!p.isLunch).map(p=><button key={p.id} onClick={()=>{setPeriod(p.id);setSheetOpen(null);}} style={{padding:14,borderRadius:12,border:`2px solid ${period===p.id?C.red:C.border}`,background:period===p.id?C.light:'white',color:period===p.id?C.red:C.text,fontWeight:period===p.id?700:500,fontSize:18,fontFamily:'inherit'}}>{p.id}</button>)}
      </div>
    </Sheet>

    <Sheet open={sheetOpen?.type==='tt_edit'} title={`แก้ไขวิชา: ${sheetOpen?.day||''} คาบ ${sheetOpen?.period?.id||''}`} onClose={()=>setSheetOpen(null)}>
       {sheetOpen?.type === 'tt_edit' && (
           <div>
               <div style={{marginBottom:16}}>
                   <div style={{fontSize:13,color:C.muted,marginBottom:6}}>รายวิชา</div>
                   <select value={ttForm.subjId} onChange={e=>setTtForm(p=>({...p,subjId:e.target.value}))} style={{...sInp,fontFamily:'inherit'}}>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.code} {s.name}</option>)}</select>
               </div>
               <div style={{marginBottom:24}}>
                   <div style={{fontSize:13,color:C.muted,marginBottom:6}}>ห้องเรียน <span style={{color:C.red}}>*พิมเลขห้อง 301 = ม.3/1</span></div>
                   <input value={ttForm.classId} onChange={e=>setTtForm(p=>({...p,classId:e.target.value}))} style={sInp} placeholder="เช่น ม.3/1 หรือ 301" list="cls-list"/>
                   <datalist id="cls-list">{sortClasses(data.classes).map(c=><option key={c} value={c}/>)}</datalist>
               </div>
               <div style={{display:'flex',gap:12}}>
                  <button onClick={() => {
                      const key = `${sheetOpen.day}-${sheetOpen.period.id}`;
                      update(p => { const newTt = {...(p.timetable||{})}; delete newTt[key]; return {...p, timetable: newTt}; });
                      setSheetOpen(null); toast('ลบวิชาในคาบนี้แล้ว','success');
                  }} style={{...sBtn(false),flex:1,color:'#dc2626',border:'1px solid #fecaca',background:'#fee2e2'}}>ลบวิชา</button>
                  <button onClick={() => {
                      if(!ttForm.subjId || !ttForm.classId) return toast('เลือกข้อมูลให้ครบ','error');
                      const key = `${sheetOpen.day}-${sheetOpen.period.id}`;
                      update(p => ({...p, timetable: {...(p.timetable||{}), [key]: ttForm}}));
                      setSheetOpen(null); toast('บันทึกคาบเรียนแล้ว','success');
                  }} style={{...sBtn(true),flex:2}}>💾 บันทึกตารางสอน</button>
               </div>
           </div>
       )}
    </Sheet>

    <Sheet open={!!scoreModal} title={scoreModal?`📝 ${STATUS[scoreModal.status]?.label} — คะแนนจิตพิสัย`:''} onClose={()=>setScoreModal(null)}>{scoreModal&&<div><div style={{fontSize:13,color:C.muted,marginBottom:8}}>+เท่ากับมา · -เท่ากับขาด · 0เท่ากับสาย</div><input type="number" step="0.5" value={scoreModal.customScore} onChange={e=>setScoreModal(p=>({...p,customScore:parseFloat(e.target.value)||0}))} style={{...sInp,marginBottom:16,fontSize:24,fontWeight:700,textAlign:'center',padding:16}} autoFocus/><div style={{display:'flex',gap:8,marginBottom:20}}>{[-1,-0.5,0,0.5,1].map(n=><button key={n} onClick={()=>setScoreModal(p=>({...p,customScore:n}))} style={{flex:1,padding:12,borderRadius:10,border:`2px solid ${scoreModal.customScore===n?C.red:C.border}`,background:scoreModal.customScore===n?C.red:'white',color:scoreModal.customScore===n?'white':C.text,cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700}}>{n>0?'+':''}{n}</button>)}</div><input value={scoreModal.note||''} onChange={e=>setScoreModal(p=>({...p,note:e.target.value}))} style={{...sInp,marginBottom:20}} placeholder="หมายเหตุ (ถ้ามี)"/><div style={{display:'flex',gap:12}}><button onClick={()=>setScoreModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={()=>{saveStatus(scoreModal.studentId,scoreModal.status,scoreModal.customScore,scoreModal.note);setScoreModal(null);}} style={{...sBtn(true),flex:1}}>บันทึก</button></div></div>}</Sheet></div>);}

// ===== SCORES =====
function ScoresPage({data,update,toast}){
  const[sub,setSub]=useState('entry');const[subjId,setSubjId]=useState(data.subjects[0]?.id||'');const[cls,setCls]=useState('');const[catId,setCatId]=useState('');const[subCatId,setSubCatId]=useState('');const[draft,setDraft]=useState({});
  const[showSubjModal,setShowSubjModal]=useState(null);const[subjForm,setSubjForm]=useState({name:'',code:'',credits:1});
  const[catModal,setCatModal]=useState(null);const[catForm,setCatForm]=useState({name:'',max:'',subjectId:''});
  const[subCatModal,setSubCatModal]=useState(null);const[subCatForm,setSubCatForm]=useState({name:'',max:'',date:todayStr()});
  const[expandedSubj,setExpandedSubj]=useState({});
  const[confirmModal,setConfirmModal]=useState(null);

  const classesHave=sortClasses(data.classes.filter(c=>data.students.some(s=>s.classId===c)));const students=data.students.filter(s=>s.classId===cls).sort((a,b)=>(a.number||999)-(b.number||999)||(a.name||'').localeCompare(b.name||'','th'));
  const subjCats=data.categories.filter(c=>c.subjectId===subjId);const cat=data.categories.find(c=>c.id===catId);const subCat=cat?.subs?.find(s=>s.id===subCatId);const subj=data.subjects.find(s=>s.id===subjId);
  const getScore=sid=>{if(subCat)return data.scores.find(r=>r.studentId===sid&&r.categoryId===catId&&r.subId===subCatId&&r.term===data.term&&r.year===data.year)?.score??'';if(cat&&(!cat.subs?.length))return data.scores.find(r=>r.studentId===sid&&r.categoryId===catId&&!r.subId&&r.term===data.term&&r.year===data.year)?.score??'';return'';};
  const entryMax=subCat?subCat.max:(cat&&!cat.subs?.length?cat.max:0);
  const saveScore=(sid,val)=>{const v=parseFloat(val);update(prev=>{const s=prev.scores.filter(r=>!(r.studentId===sid&&r.categoryId===catId&&(subCat?r.subId===subCatId:!r.subId)&&r.term===prev.term&&r.year===prev.year));if(!isNaN(v)&&val!=='')s.push({studentId:sid,categoryId:catId,...(subCat?{subId:subCatId}:{}),score:v,term:prev.term,year:prev.year,date:todayStr()});return{...prev,scores:s};});setDraft(p=>{const n={...p};delete n[sid];return n;});};
  const canEnter=cat&&cls&&(cat.subs?.length>0?!!subCat:true);
  const saveSubj=()=>{if(!subjForm.name.trim())return;update(prev=>{if(showSubjModal==='add')return{...prev,subjects:[...prev.subjects,{id:uid(),name:subjForm.name.trim(),code:subjForm.code.trim(),credits:parseFloat(subjForm.credits)||1}]};return{...prev,subjects:prev.subjects.map(s=>s.id===subjForm.id?{...s,name:subjForm.name.trim(),code:subjForm.code.trim(),credits:parseFloat(subjForm.credits)||s.credits}:s)};});setShowSubjModal(null);toast('บันทึกแล้ว','success');};
  const delSubj=id=>{if(data.categories.some(c=>c.subjectId===id))return toast('มีหมวดคะแนนผูกอยู่ ให้ลบหมวดคะแนนก่อน','error'); setConfirmModal({type:'subj',id,msg:'ต้องการลบรายวิชานี้หรือไม่?'});};
  const saveCat=()=>{if(!catForm.name.trim())return;update(prev=>{if(catModal==='add')return{...prev,categories:[...prev.categories,{id:uid(),name:catForm.name.trim(),subjectId:catForm.subjectId,max:parseFloat(catForm.max)||0,subs:[]}]};return{...prev,categories:prev.categories.map(c=>c.id===catForm.id?{...c,name:catForm.name.trim(),max:parseFloat(catForm.max)||c.max}:c)};});setCatModal(null);toast('บันทึกแล้ว','success');};
  const delCat=id=>{setConfirmModal({type:'cat',id,msg:'ต้องการลบหมวดหมู่นี้ และคะแนนที่เกี่ยวข้องทั้งหมดหรือไม่?'});};
  const saveSubCat=()=>{if(!subCatForm.name.trim())return;update(prev=>({...prev,categories:prev.categories.map(c=>{if(c.id!==catId)return c;const subs=subCatModal==='add'?[...c.subs,{id:uid(),name:subCatForm.name.trim(),max:parseFloat(subCatForm.max)||0,date:subCatForm.date}]:c.subs.map(s=>s.id===subCatForm.id?{...s,name:subCatForm.name.trim(),max:parseFloat(subCatForm.max)||s.max,date:subCatForm.date}:s);return{...c,subs};})}));setSubCatModal(null);toast('บันทึกแล้ว','success');};
  const delSubCat=sid=>{setConfirmModal({type:'subcat',id:sid,msg:'ต้องการลบหมวดย่อยนี้ และคะแนนทั้งหมดหรือไม่?'});};
  const toggleSubj=id=>setExpandedSubj(p=>({...p,[id]:!p[id]}));

  const handleConfirm = () => {
     if(confirmModal.type==='subj'){update(prev=>({...prev,subjects:prev.subjects.filter(s=>s.id!==confirmModal.id)}));}
     if(confirmModal.type==='cat'){update(prev=>({...prev,categories:prev.categories.filter(c=>c.id!==confirmModal.id),scores:prev.scores.filter(r=>r.categoryId!==confirmModal.id)}));}
     if(confirmModal.type==='subcat'){update(prev=>({...prev,categories:prev.categories.map(c=>c.id===catId?{...c,subs:c.subs.filter(s=>s.id!==confirmModal.id)}:c),scores:prev.scores.filter(r=>!(r.categoryId===catId&&r.subId===confirmModal.id))}));}
     setConfirmModal(null); toast('ลบสำเร็จ','success');
  };

  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>📊 คะแนน</div>
    <div style={{display:'flex',gap:8,marginBottom:16,background:'white',padding:6,borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}><button onClick={()=>setSub('entry')} style={{...sTab(sub==='entry'),flex:1}}>📝 บันทึกคะแนน</button><button onClick={()=>setSub('manage')} style={{...sTab(sub==='manage'),flex:1}}>📚 วิชา/หมวดหมู่</button></div>
    {sub==='entry'&&<><div style={sCard}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>รายวิชา</div><select value={subjId} onChange={e=>{setSubjId(e.target.value);setCatId('');setSubCatId('');}} style={{...sInp,fontFamily:'inherit'}}>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.code?`${s.code} ${s.name}`:s.name}</option>)}</select></div>
        <div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ห้องเรียน</div><select value={cls} onChange={e=>setCls(e.target.value)} style={{...sInp,fontFamily:'inherit'}}><option value="">-- เลือก --</option>{classesHave.map(c=><option key={c} value={c}>{c}</option>)}</select></div></div>
      <div style={{fontSize:13,color:C.muted,marginBottom:8,fontWeight:500}}>หมวดหลัก</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:cat?.subs?.length>0?10:0}}>{subjCats.map(c=><button key={c.id} onClick={()=>{setCatId(c.id);setSubCatId('');}} style={{...sTab(catId===c.id),padding:'8px 14px',fontSize:14}}>{c.name} <span style={{opacity:0.7}}>/{getCatMax(c)}</span></button>)}{!subjCats.length&&<div style={{fontSize:14,color:C.muted}}>ยังไม่มีหมวด → ไปแท็บ วิชา/หมวดหมู่</div>}</div>
      {cat?.subs?.length>0&&<div><div style={{fontSize:13,color:C.muted,marginBottom:8,marginTop:12,fontWeight:500}}>หมวดย่อย</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{cat.subs.map(s=><button key={s.id} onClick={()=>setSubCatId(s.id)} style={{...sTab(subCatId===s.id),padding:'8px 12px',fontSize:13}}>{s.name} /{s.max}{s.date?` · ${fmtDate(s.date)}`:''}</button>)}</div></div>}</div>
      {canEnter&&students.length>0&&<div style={sCard}><div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{subCat?subCat.name:cat?.name} · {cls}</div><div style={{fontSize:13,color:C.muted,marginBottom:16}}>เต็ม {entryMax} · พิมพ์แล้วกด Enter เพื่อบันทึก</div>
        {students.map((stu,i)=>{const saved=getScore(stu.id);const val=draft[stu.id]!==undefined?draft[stu.id]:saved;const g=saved!==''?getGrade(parseFloat(saved),entryMax):null;return(<div key={stu.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`}}><span style={{width:28,fontSize:13,color:C.muted,textAlign:'right'}}>{stu.number||i+1}</span><span style={{flex:1,fontSize:15,fontWeight:600}}>{stu.nickname||stu.name}</span><input type="number" min={0} max={entryMax} value={val} placeholder="-" onChange={e=>setDraft(p=>({...p,[stu.id]:e.target.value}))} onBlur={()=>{if(draft[stu.id]!==undefined)saveScore(stu.id,draft[stu.id]);}} onKeyDown={e=>{if(e.key==='Enter')saveScore(stu.id,draft[stu.id]??saved);}} style={{width:64,padding:'8px 10px',borderRadius:8,border:`1.5px solid ${draft[stu.id]!==undefined?C.red:C.border}`,textAlign:'center',fontSize:15,fontFamily:'inherit'}}/><span style={{fontSize:13,color:C.muted}}>/{entryMax}</span>{g&&<span style={{fontSize:13,fontWeight:700,width:28,color:gradeColor(g),textAlign:'center'}}>{g.label}</span>}</div>);})}
        <div style={{marginTop:16,background:C.light,borderRadius:12,padding:'12px 16px'}}><div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>รวมทุกหมวด · {subj?.name}</div>{students.map(stu=>{const mx=subjCats.reduce((s,c)=>s+getCatMax(c),0);const tot=subjCats.reduce((s,c)=>s+getCatScore(stu.id,c,data.scores,data.term,data.year),0);const has=subjCats.some(c=>hasCatScore(stu.id,c,data.scores,data.term,data.year));const g=has?getGrade(tot,mx):null;return(<div key={stu.id} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'4px 0',borderTop:`1px solid ${C.border}`}}><span>{stu.nickname||stu.name}</span>{has?<span style={{fontWeight:700}}>{tot}/{mx} <span style={{color:gradeColor(g),marginLeft:6}}>{g.label}</span></span>:<span style={{color:C.muted}}>-</span>}</div>);})}</div></div>}
      {!cls&&<div style={{textAlign:'center',color:C.muted,padding:48}}>📊 เลือกวิชาและห้องด้านบน</div>}</>}
    {sub==='manage'&&<div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><div style={{fontSize:15,color:C.muted}}>{data.subjects.length} วิชา</div><button onClick={()=>{setSubjForm({name:'',code:'',credits:1});setShowSubjModal('add');}} style={{...sBtn(true,true),padding:'8px 16px'}}>+ เพิ่มวิชา</button></div>
      {data.subjects.map(s=>{const sCats=data.categories.filter(c=>c.subjectId===s.id);const sMax=sCats.reduce((t,c)=>t+getCatMax(c),0);const expanded=expandedSubj[s.id];
        return(<div key={s.id} style={{...sCard,marginBottom:12,padding:0,overflow:'hidden'}}><div style={{padding:'16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',background:expanded?C.light:'white'}} onClick={()=>toggleSubj(s.id)}><div style={{flex:1}}><div style={{fontWeight:700,fontSize:16}}>{s.code&&<span style={{color:C.red,marginRight:8}}>{s.code}</span>}{s.name}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>{s.credits} นก. · {creditToHours(s.credits)} ชม./สป. · {sCats.length} หมวด · เต็ม {sMax}</div></div><div style={{display:'flex',gap:8,alignItems:'center'}}><button onClick={e=>{e.stopPropagation();setSubjForm({...s});setShowSubjModal('edit');}} style={{...sBtn(false,true),padding:'6px 12px',fontSize:13}}>แก้ไข</button><button onClick={e=>{e.stopPropagation();delSubj(s.id);}} style={{...sBtn(false,true),color:'#dc2626',padding:'6px 12px',fontSize:13,background:'#FEF2F2',border:'1px solid #FCA5A5'}}>ลบ</button><span style={{fontSize:20,color:C.muted,transform:expanded?'rotate(90deg)':'rotate(0)',transition:'transform 0.2s',marginLeft:4}}>›</span></div></div>
          {expanded&&<div style={{borderTop:`1px solid ${C.border}`,padding:'12px 16px 16px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:12,alignItems:'center'}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>หมวดคะแนน</div><button onClick={()=>{setCatForm({name:'',max:'20',subjectId:s.id,id:null});setCatModal('add');}} style={{...sBtn(true,true),padding:'6px 12px',fontSize:13}}>+ เพิ่มหมวด</button></div>
            {sCats.map(c=><div key={c.id} style={{marginBottom:10,background:C.bg,borderRadius:10,padding:'12px',border:`1px solid ${C.border}`}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:c.subs?.length?8:0}}><span style={{fontWeight:700,fontSize:15}}>{c.name} <span style={{color:C.muted,fontWeight:500}}>/ {getCatMax(c)}</span></span><div style={{display:'flex',gap:6}}><button onClick={()=>{setCatForm({name:c.name,max:c.max,subjectId:c.subjectId,id:c.id});setCatModal('edit');}} style={{fontSize:12,color:C.text,background:'white',border:`1px solid ${C.border}`,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>แก้</button><button onClick={()=>delCat(c.id)} style={{fontSize:12,color:'#dc2626',background:'#FEF2F2',border:'1px solid #FCA5A5',padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>ลบ</button><button onClick={()=>{setCatId(c.id);setSubCatForm({name:'',max:'5',date:todayStr()});setSubCatModal('add');}} style={{fontSize:12,color:'white',background:C.red,border:`1px solid ${C.red}`,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>+ ย่อย</button></div></div>
              {c.subs?.map(sb=><div key={sb.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0 6px 12px',borderTop:`1px dashed ${C.border}`,fontSize:13,alignItems:'center'}}><span style={{color:C.muted,fontWeight:500}}>{sb.name} <span style={{color:C.text}}>/ {sb.max}</span> {sb.date?` · ${fmtDate(sb.date)}`:''}</span><div style={{display:'flex',gap:6}}><button onClick={()=>{setCatId(c.id);setSubCatForm({...sb});setSubCatModal('edit');}} style={{fontSize:11,color:C.text,background:'white',border:`1px solid ${C.border}`,padding:'3px 8px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>แก้</button><button onClick={()=>{setCatId(c.id);delSubCat(sb.id);}} style={{fontSize:11,color:'#dc2626',background:'#FEF2F2',border:'1px solid #FCA5A5',padding:'3px 8px',borderRadius:6,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>ลบ</button></div></div>)}</div>)}
            {!sCats.length&&<div style={{fontSize:14,color:C.muted,textAlign:'center',padding:16}}>ยังไม่มีหมวดคะแนน ลองเพิ่มด้านบนเลยครับ</div>}</div>}</div>);})}</div>}
    
    <Sheet open={!!showSubjModal} title={showSubjModal==='add'?'➕ เพิ่มวิชา':'✏️ แก้ไขวิชา'} onClose={()=>setShowSubjModal(null)}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>รหัสวิชา</div><input value={subjForm.code||''} onChange={e=>setSubjForm(p=>({...p,code:e.target.value}))} style={sInp} placeholder="เช่น จ20201"/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>หน่วยกิต</div><select value={subjForm.credits} onChange={e=>setSubjForm(p=>({...p,credits:parseFloat(e.target.value)}))} style={{...sInp,fontFamily:'inherit'}}>{CREDIT_OPTIONS.map(c=><option key={c} value={c}>{c} นก. ({creditToHours(c)} ชม./สป.)</option>)}</select></div></div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อวิชา *</div><input value={subjForm.name||''} onChange={e=>setSubjForm(p=>({...p,name:e.target.value}))} style={{...sInp,marginBottom:20}} placeholder="ชื่อวิชา"/><div style={{display:'flex',gap:12}}><button onClick={()=>setShowSubjModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={saveSubj} style={{...sBtn(true),flex:1}}>บันทึก</button></div></Sheet>
    <Sheet open={!!catModal} title={catModal==='add'?'➕ เพิ่มหมวด':'✏️ แก้ไข'} onClose={()=>setCatModal(null)}><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อหมวด</div><input value={catForm.name} onChange={e=>setCatForm(p=>({...p,name:e.target.value}))} style={{...sInp,marginBottom:12}} placeholder="เช่น กลางภาค สอบย่อย"/><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>คะแนนเต็ม (เว้นไว้ถ้ามีหมวดย่อย)</div><input type="number" value={catForm.max} onChange={e=>setCatForm(p=>({...p,max:e.target.value}))} style={{...sInp,marginBottom:20}} placeholder="เช่น 20"/><div style={{display:'flex',gap:12}}><button onClick={()=>setCatModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={saveCat} style={{...sBtn(true),flex:1}}>บันทึก</button></div></Sheet>
    <Sheet open={!!subCatModal} title={subCatModal==='add'?'➕ หมวดย่อย':'✏️ แก้ไข'} onClose={()=>setSubCatModal(null)}><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่องาน/การสอบ</div><input value={subCatForm.name} onChange={e=>setSubCatForm(p=>({...p,name:e.target.value}))} style={{...sInp,marginBottom:12}} placeholder="เช่น สอบครั้งที่ 1, สมุด"/><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>คะแนนเต็ม</div><input type="number" value={subCatForm.max} onChange={e=>setSubCatForm(p=>({...p,max:e.target.value}))} style={sInp}/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>วันที่สั่งงาน</div><input type="date" value={subCatForm.date} onChange={e=>setSubCatForm(p=>({...p,date:e.target.value}))} style={sInp}/></div></div><div style={{display:'flex',gap:12}}><button onClick={()=>setSubCatModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={saveSubCat} style={{...sBtn(true),flex:1}}>บันทึก</button></div></Sheet>
    
    <Sheet open={!!confirmModal} title="🚨 ยืนยันการลบ" onClose={()=>setConfirmModal(null)}>
       <div style={{fontSize:15,color:C.text,marginBottom:24,textAlign:'center'}}>{confirmModal?.msg}</div>
       <div style={{display:'flex',gap:12}}>
          <button onClick={()=>setConfirmModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button>
          <button onClick={handleConfirm} style={{...sBtn(true),flex:1,background:'#dc2626',boxShadow:'0 4px 12px rgba(220,38,38,0.3)'}}>ยืนยันลบ</button>
       </div>
    </Sheet>
  </div>);}

// ===== STUDENTS =====
function StudentsPage({data,update,toast}){const[sub,setSub]=useState('list');const[cls,setCls]=useState('');const[search,setSearch]=useState('');const[modal,setModal]=useState(null);const[form,setForm]=useState({});const[err,setErr]=useState('');const[clsModal,setClsModal]=useState(null);const[clsForm,setClsForm]=useState({name:'',oldName:''});
  const[delConfirm,setDelConfirm]=useState(null);
  const sortedClasses=useMemo(()=>sortClasses(data.classes),[data.classes]);
  const getClassWeight=c=>{const m=String(c||'').match(/ม\.(\d+)\/(\d+)/);return m?parseInt(m[1])*100+parseInt(m[2]):9999;};
  const students=data.students.filter(s=>(cls?s.classId===cls:true)&&(search?s.name.includes(search)||s.id.includes(search)||(s.nickname||'').includes(search)||(s.chineseName||'').includes(search):true)).sort((a,b)=>{const wA=getClassWeight(a.classId),wB=getClassWeight(b.classId);if(wA!==wB)return wA-wB;return(a.number||999)-(b.number||999)||(a.name||'').localeCompare(b.name||'','th');});
  const openAdd=()=>{setForm({id:'',name:'',nickname:'',chineseName:'',number:'',classId:cls||sortedClasses[0]||'',pin:randomPin()});setErr('');setModal('add');};
  const save=()=>{if(!form.id.trim()||!form.name.trim()||!form.classId)return setErr('กรอกรหัส ชื่อ และห้องให้ครบ');if(!/^\d{4}$/.test(form.pin))return setErr('PIN ต้อง 4 หลัก');if(modal==='add'&&data.students.find(s=>s.id===form.id.trim()))return setErr('รหัสซ้ำ');
    const stu={...form,id:form.id.trim(),number:parseInt(form.number)||null};update(prev=>{const sts=modal==='add'?[...prev.students,stu]:prev.students.map(s=>s.id===form.id?stu:s);return{...prev,students:sts};});setModal(null);toast('บันทึกแล้ว','success');};
  const doDel=()=>{update(prev=>({...prev,students:prev.students.filter(s=>s.id!==delConfirm.stu.id),attendance:prev.attendance.filter(a=>a.studentId!==delConfirm.stu.id),scores:prev.scores.filter(r=>r.studentId!==delConfirm.stu.id)}));setDelConfirm(null);toast('ลบนักเรียนแล้ว','success');};
  const resetPin=stu=>{const p=randomPin();update(prev=>({...prev,students:prev.students.map(s=>s.id===stu.id?{...s,pin:p}:s)}));toast(`รหัสผ่านใหม่: ${p}`,'success');};
  const saveClass=()=>{const n=clsForm.name.trim();if(!n)return;if(clsModal==='add'){if(data.classes.includes(n))return toast('มีแล้ว','error');update(prev=>({...prev,classes:sortClasses([...prev.classes,n])}));}else update(prev=>({...prev,classes:sortClasses(prev.classes.map(c=>c===clsForm.oldName?n:c)),students:prev.students.map(s=>s.classId===clsForm.oldName?{...s,classId:n}:s),homeroom:prev.homeroom===clsForm.oldName?n:prev.homeroom}));setClsModal(null);toast('บันทึก ✓','success');};
  const delClass=c=>{if(data.students.some(s=>s.classId===c))return toast('ยังมีนักเรียนในห้องนี้','error'); update(prev=>({...prev,classes:prev.classes.filter(x=>x!==c)}));toast('ลบห้องเรียนแล้ว','success');};
  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>👥 นักเรียน</div>
    <div style={{display:'flex',gap:8,marginBottom:16,background:'white',padding:6,borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}><button onClick={()=>setSub('list')} style={{...sTab(sub==='list'),flex:1}}>👥 รายชื่อ</button><button onClick={()=>setSub('class')} style={{...sTab(sub==='class'),flex:1}}>🏫 ห้องเรียน</button></div>
    {sub==='list'&&<><button onClick={openAdd} style={{...sBtn(true),width:'100%',marginBottom:16,padding:16,fontSize:16,boxShadow:'0 4px 12px rgba(229,57,53,0.3)'}}>+ เพิ่มนักเรียน</button><div style={sCard}><select value={cls} onChange={e=>setCls(e.target.value)} style={{...sInp,marginBottom:12,fontFamily:'inherit'}}><option value="">ทุกห้อง ({data.students.length} คน)</option>{sortedClasses.map(c=><option key={c} value={c}>{c} ({data.students.filter(s=>s.classId===c).length} คน)</option>)}</select><input placeholder="🔍 ค้นหา ชื่อ รหัส ชื่อเล่น ชื่อจีน..." value={search} onChange={e=>setSearch(e.target.value)} style={sInp}/></div>
      {students.map(stu=><div key={stu.id} style={{...sCard,marginBottom:10,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:16,color:C.text}}>{stu.number?<span style={{color:C.muted,fontSize:14,marginRight:8}}>{stu.number}.</span>:null}{stu.name}{stu.nickname&&<span style={{color:C.red,fontSize:14,marginLeft:6}}>({stu.nickname})</span>}{stu.chineseName&&<span style={{fontSize:14,color:'#0284C7',marginLeft:6}}>{stu.chineseName}</span>}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>{stu.id} · {stu.classId}</div></div><div style={{display:'flex',gap:6}}><button onClick={()=>{setDelConfirm({action:'pin',stu});}} style={{...sBtn(false,true),padding:'8px 10px',fontSize:14}}>🔑</button><button onClick={()=>{setForm({...stu,number:stu.number||''});setErr('');setModal('edit');}} style={{...sBtn(false,true),padding:'8px 12px'}}>แก้ไข</button><button onClick={()=>setDelConfirm({action:'del',stu})} style={{...sBtn(false,true),color:'#dc2626',background:'#FEF2F2',border:'1px solid #FCA5A5',padding:'8px 12px'}}>ลบ</button></div></div></div>)}
      {!students.length&&<div style={{textAlign:'center',color:C.muted,padding:48}}>ไม่พบนักเรียน</div>}</>}
    {sub==='class'&&<><div style={{display:'flex',justifyContent:'space-between',marginBottom:16,alignItems:'center'}}><div style={{fontSize:14,color:C.muted}}>ประจำชั้น <b style={{color:C.red,fontSize:16}}>{data.homeroom}</b></div><button onClick={()=>{setClsForm({name:'',oldName:''});setClsModal('add');}} style={{...sBtn(true,true),padding:'8px 16px'}}>+ เพิ่มห้อง</button></div>
      {sortedClasses.map(c=>{const ct=data.students.filter(s=>s.classId===c).length;return(<div key={c} style={{...sCard,marginBottom:10,padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderLeft:c===data.homeroom?`4px solid ${C.red}`:`1px solid ${C.border}`}}><div><div style={{fontWeight:700,fontSize:16}}>{c} {c===data.homeroom&&<span style={{fontSize:12,color:C.red,marginLeft:6}}>★ ประจำชั้น</span>}</div><div style={{fontSize:13,color:C.muted,marginTop:4}}>{ct} คน</div></div><div style={{display:'flex',gap:8}}><button onClick={()=>{setClsForm({name:c,oldName:c});setClsModal('edit');}} style={{...sBtn(false,true),padding:'6px 12px'}}>แก้ไข</button><button onClick={()=>delClass(c)} disabled={ct>0} style={{...sBtn(false,true),color:ct?'#94A3B8':'#dc2626',background:ct?C.light:'#FEF2F2',border:`1px solid ${ct?C.border:'#FCA5A5'}`,cursor:ct?'not-allowed':'pointer',padding:'6px 12px'}}>ลบ</button></div></div>);})}</>}
    <Sheet open={!!modal} title={modal==='add'?'➕ เพิ่มนักเรียน':'✏️ แก้ไขข้อมูล'} onClose={()=>setModal(null)}>
      <div style={{display:'grid',gridTemplateColumns:'80px 1fr',gap:12,marginBottom:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>เลขที่</div><input type="number" value={form.number||''} onChange={e=>setForm(p=>({...p,number:e.target.value}))} style={sInp} placeholder="-"/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>รหัสนักเรียน *</div><input value={form.id||''} onChange={e=>setForm(p=>({...p,id:e.target.value}))} disabled={modal==='edit'} style={{...sInp,opacity:modal==='edit'?0.6:1}} placeholder="เช่น 12345"/></div></div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อ-สกุล (ภาษาไทย) *</div><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} style={{...sInp,marginBottom:12}} placeholder="ชื่อ-สกุล"/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อเล่น</div><input value={form.nickname||''} onChange={e=>setForm(p=>({...p,nickname:e.target.value}))} style={sInp}/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อภาษาจีน</div><input value={form.chineseName||''} onChange={e=>setForm(p=>({...p,chineseName:e.target.value}))} style={sInp} placeholder="小名"/></div></div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ห้องเรียน *</div><select value={form.classId||''} onChange={e=>setForm(p=>({...p,classId:e.target.value}))} style={{...sInp,marginBottom:16,fontFamily:'inherit'}}><option value="">-- เลือก --</option>{sortedClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:13,color:C.muted,fontWeight:500}}>PIN 4 หลัก (รหัสผ่านนักเรียน) *</span><button onClick={()=>setForm(p=>({...p,pin:randomPin()}))} style={{fontSize:12,color:C.red,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>🎲 สุ่มใหม่</button></div><input value={form.pin||''} maxLength={4} onChange={e=>setForm(p=>({...p,pin:e.target.value.replace(/\D/g,'').slice(0,4)}))} style={{...sInp,marginBottom:20,fontSize:24,letterSpacing:8,textAlign:'center',fontWeight:700}}/>
      {err&&<div style={{color:C.red,fontSize:14,marginBottom:16,padding:'10px',background:'#FEF2F2',borderRadius:8,textAlign:'center'}}>{err}</div>}<div style={{display:'flex',gap:12}}><button onClick={()=>setModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={save} style={{...sBtn(true),flex:1}}>บันทึก</button></div></Sheet>
    <Sheet open={!!clsModal} title={clsModal==='add'?'➕ เพิ่มห้อง':'✏️ แก้ไข'} onClose={()=>setClsModal(null)}><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อห้องเรียน</div><input value={clsForm.name} onChange={e=>setClsForm(p=>({...p,name:e.target.value}))} style={{...sInp,marginBottom:20}} placeholder="เช่น ม.1/4" autoFocus/><div style={{display:'flex',gap:12}}><button onClick={()=>setClsModal(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={saveClass} style={{...sBtn(true),flex:1}}>บันทึก</button></div></Sheet>
    
    <Sheet open={!!delConfirm} title={delConfirm?.action==='del'?'🚨 ยืนยันการลบ':'🔑 ตั้งรหัสผ่านใหม่'} onClose={()=>setDelConfirm(null)}>
       {delConfirm?.action==='del' && <>
          <div style={{fontSize:15,color:C.text,marginBottom:24,textAlign:'center'}}>ต้องการลบประวัติของ <b>{delConfirm.stu.name}</b> หรือไม่? ข้อมูลการเช็คชื่อและคะแนนจะหายทั้งหมด</div>
          <div style={{display:'flex',gap:12}}><button onClick={()=>setDelConfirm(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={doDel} style={{...sBtn(true),flex:1,background:'#dc2626',boxShadow:'0 4px 12px rgba(220,38,38,0.3)'}}>ลบถาวร</button></div>
       </>}
       {delConfirm?.action==='pin' && <>
          <div style={{fontSize:15,color:C.text,marginBottom:24,textAlign:'center'}}>ต้องการสร้าง PIN ใหม่ให้ <b>{delConfirm.stu.name}</b> หรือไม่?</div>
          <div style={{display:'flex',gap:12}}><button onClick={()=>setDelConfirm(null)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={()=>{resetPin(delConfirm.stu);setDelConfirm(null);}} style={{...sBtn(true),flex:1}}>สร้างรหัสใหม่</button></div>
       </>}
    </Sheet>
  </div>);}

// ===== STATS =====
function StatsPage({data}){const[sub,setSub]=useState('morning');const[cls,setCls]=useState('');const[range,setRange]=useState('term');const[statSubjId,setStatSubjId]=useState(data.subjects[0]?.id||'');
  const classesHave=sortClasses(data.classes.filter(c=>data.students.some(s=>s.classId===c)));const students=cls?data.students.filter(s=>s.classId===cls):data.students;
  const filteredAtt=useMemo(()=>data.attendance.filter(a=>dateInRange(a.date,range)),[data.attendance,range]);
  const ranges=[{id:'today',label:'วันนี้'},{id:'week',label:'สัปดาห์'},{id:'month',label:'เดือน'},{id:'term',label:'ทั้งภาค'}];
  const morningStats=useMemo(()=>students.map(stu=>{const att=filteredAtt.filter(a=>a.studentId===stu.id&&a.type==='morning');const counts={};S_ORDER.forEach(k=>counts[k]=0);att.forEach(a=>{if(counts[a.status]!==undefined)counts[a.status]++;});const pct=att.length?Math.round((counts.present+counts.late)/att.length*100):null;return{stu,counts,total:att.length,pct};}).sort((a,b)=>(a.pct??101)-(b.pct??101)),[students,filteredAtt]);
  const classStats=useMemo(()=>students.map(stu=>{const cd=calcConduct(stu.id,filteredAtt,data.conduct,statSubjId||null);const rate=calcAttRate(stu.id,filteredAtt,'class',statSubjId||null);const eligible=rate===null||rate>=data.conduct.minAttPct;return{stu,...cd,rate,eligible};}).sort((a,b)=>(a.rate??101)-(b.rate??101)),[students,filteredAtt,data.conduct,statSubjId]);
  const statSubj=data.subjects.find(s=>s.id===statSubjId);
  const scoreStats=useMemo(()=>{const subj=statSubj;const sCats=subj?data.categories.filter(c=>c.subjectId===subj.id):[];return students.map(stu=>{const mx=sCats.reduce((s,c)=>s+getCatMax(c),0);const tot=sCats.reduce((s,c)=>s+getCatScore(stu.id,c,data.scores,data.term,data.year),0);const has=sCats.some(c=>hasCatScore(stu.id,c,data.scores,data.term,data.year));const grade=has&&subj?getSubjectGrade(stu.id,subj,data.categories,data.scores,data.term,data.year,data.attendance,data.conduct):null;return{stu,tot,mx,has,grade};}).sort((a,b)=>b.tot-a.tot);},[students,statSubj,data]);
  const gradeDist=useMemo(()=>{const d={'4':0,'3.5':0,'3':0,'2.5':0,'2':0,'1.5':0,'1':0,'0':0,'ร':0,'มส.':0};scoreStats.filter(s=>s.grade).forEach(s=>{if(d[s.grade.label]!==undefined)d[s.grade.label]++;});return d;},[scoreStats]);

  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>📈 สถิติ</div>
    <div style={{display:'flex',gap:8,marginBottom:14,background:'white',padding:6,borderRadius:12,boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}><button onClick={()=>setSub('morning')} style={{...sTab(sub==='morning'),flex:1}}>🌅 แถว</button><button onClick={()=>setSub('class')} style={{...sTab(sub==='class'),flex:1}}>📚 คาบ</button><button onClick={()=>setSub('score')} style={{...sTab(sub==='score'),flex:1}}>📊 คะแนน</button></div>
    <div style={{display:'flex',gap:12,marginBottom:sub==='morning'?14:10}}><select value={cls} onChange={e=>setCls(e.target.value)} style={{...sInp,flex:1,fontFamily:'inherit'}}><option value="">ทุกห้อง ({data.students.length})</option>{classesHave.map(c=><option key={c} value={c}>{c}</option>)}</select><select value={range} onChange={e=>setRange(e.target.value)} style={{...sInp,flex:1,fontFamily:'inherit'}}>{ranges.map(r=><option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
    {(sub==='class'||sub==='score')&&<select value={statSubjId} onChange={e=>setStatSubjId(e.target.value)} style={{...sInp,marginBottom:14,fontFamily:'inherit'}}>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.code?`${s.code} ${s.name}`:s.name}</option>)}</select>}
    {sub==='morning'&&morningStats.map(({stu,counts,total,pct})=><div key={stu.id} style={{...sCard,marginBottom:10,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:total?8:0}}><div><span style={{fontWeight:700,fontSize:15}}>{stu.nickname||stu.name}</span><span style={{fontSize:13,color:C.muted,marginLeft:8}}>{stu.classId}</span></div><span style={{fontWeight:700,fontSize:16,color:pct===null?C.muted:pct>=80?'#16a34a':'#dc2626'}}>{pct!==null?`${pct}%`:'-'}</span></div>{total>0&&<><div style={{height:6,borderRadius:3,background:'#f3f4f6',marginBottom:6,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:pct>=80?'#16a34a':'#dc2626',borderRadius:3}}/></div><div style={{display:'flex',gap:10,fontSize:12,fontWeight:500}}>{S_ORDER.map(k=>counts[k]>0?<span key={k} style={{color:STATUS[k].bg}}>{STATUS[k].short} {counts[k]}</span>:null)}</div></>}</div>)}
    {sub==='class'&&classStats.map(({stu,score,counts,total,rate,eligible})=><div key={stu.id} style={{...sCard,marginBottom:10,padding:'16px',borderLeft:!eligible?'4px solid #dc2626':undefined}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:total?8:0}}><div><span style={{fontWeight:700,fontSize:15}}>{stu.nickname||stu.name}</span><span style={{fontSize:13,color:C.muted,marginLeft:8}}>{stu.classId}</span>{!eligible&&<span style={{fontSize:11,color:'white',background:'#dc2626',padding:'2px 8px',borderRadius:10,marginLeft:8,fontWeight:700}}>มส.</span>}</div><div style={{textAlign:'right'}}><div style={{fontWeight:700,fontSize:16,color:rate===null?C.muted:rate>=80?'#16a34a':'#dc2626'}}>{rate??'-'}%</div>{total>0&&<div style={{fontSize:12,color:C.muted,marginTop:2}}>จิตพิสัย {score>0?'+':''}{score}</div>}</div></div>{total>0&&<><div style={{height:6,borderRadius:3,background:'#f3f4f6',marginBottom:6,overflow:'hidden'}}><div style={{height:'100%',width:`${rate}%`,background:rate>=80?'#16a34a':'#dc2626',borderRadius:3}}/></div><div style={{display:'flex',gap:10,fontSize:12,fontWeight:500}}>{S_ORDER.map(k=>counts[k]>0?<span key={k} style={{color:STATUS[k].bg}}>{STATUS[k].short} {counts[k]}</span>:null)}</div></>}</div>)}
    {sub==='score'&&<><div style={{...sCard,padding:16,marginBottom:12}}><div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📊 จำนวนนักเรียนแต่ละเกรด · {statSubj?.name}</div><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>{Object.entries(gradeDist).map(([g,n])=>{const sp=g==='ร'||g==='มส.';return<div key={g} style={{background:n>0?(sp?'#FEF2F2':C.bg):C.card,borderRadius:10,padding:'10px 6px',textAlign:'center',border:`1px solid ${n>0?(sp?'#FCA5A5':C.border):C.border}`}}><div style={{fontSize:20,fontWeight:700,color:sp?'#dc2626':C.text}}>{n}</div><div style={{fontSize:13,color:C.muted,marginTop:4,fontWeight:600}}>{g}</div></div>;})}</div></div>
      {scoreStats.map(({stu,tot,mx,has,grade})=><div key={stu.id} style={{...sCard,marginBottom:10,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:has?8:0}}><div><span style={{fontWeight:700,fontSize:15}}>{stu.nickname||stu.name}</span><span style={{fontSize:13,color:C.muted,marginLeft:8}}>{stu.classId}</span></div><div style={{display:'flex',alignItems:'center',gap:10}}>{has&&<span style={{fontSize:15,fontWeight:700}}>{tot}/{mx}</span>}{grade&&<span style={{fontWeight:700,fontSize:14,padding:'4px 12px',borderRadius:10,background:gradeBg(grade),color:gradeColor(grade)}}>{grade.label}</span>}{!has&&<span style={{fontSize:13,color:C.muted}}>-</span>}</div></div>{has&&mx>0&&<div style={{height:6,borderRadius:3,background:'#f3f4f6',overflow:'hidden'}}><div style={{height:'100%',width:`${(tot/mx)*100}%`,background:gradeColor(grade),borderRadius:3}}/></div>}</div>)}</>}
  </div>);}

// ===== IMPORT/EXPORT =====
function IOPage({data,update,toast}){
  const fileRef=useRef(null);const[importPreview,setImportPreview]=useState(null);
  const[exportModal,setExportModal]=useState(false);
  const[exportSections,setExportSections]=useState({students:true,homeroomProfiles:false,savingsSummary:false,scores:true,morningAtt:true,classAtt:true});
  const[exportSubjs,setExportSubjs]=useState(()=>Object.fromEntries(data.subjects.map(s=>[s.id,true])));

  const toggleSection=k=>setExportSections(p=>({...p,[k]:!p[k]}));
  const toggleSubj=id=>setExportSubjs(p=>({...p,[id]:!p[id]}));

  const doExport=async()=>{
    try{
      const XLSX=await import('xlsx');
      const wb=XLSX.utils.book_new();
      const safeSheetName = (name) => name.replace(/[\\/?*[\]:]/g, '-').substring(0, 31);
      
      if(exportSections.students){
        const rows=data.students.sort((a,b)=>(a.number||999)-(b.number||999)).map(s=>({'เลขที่':s.number||'','รหัส':s.id,'ชื่อ-สกุล':s.name,'ชื่อเล่น':s.nickname||'','ชื่อภาษาจีน':s.chineseName||'','ห้อง':s.classId,'PIN':s.pin}));
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),safeSheetName('นักเรียนทั้งหมด'));
      }
      
      if(exportSections.homeroomProfiles){
        const hrStudents = data.students.filter(s => s.classId === data.homeroom).sort((a,b)=>(a.number||999)-(b.number||999));
        const rows = hrStudents.map(s => {
            const p = data.profiles?.[s.id] || emptyProfile();
            return {
                'เลขที่': s.number || '',
                'รหัส': s.id,
                'ชื่อ-สกุล': s.name,
                'เลขบัตรประชาชน': p.idCard || '',
                'วันเกิด': p.birthday || '',
                'อายุ (ปี)': p.age || '',
                'กรุ๊ปเลือด': p.bloodType || '',
                'ศาสนา': p.religion || '',
                'น้ำหนัก': p.weight || '',
                'ส่วนสูง': p.height || '',
                'โรคประจำตัว': p.disease || '',
                'ที่อยู่เลขที่': p.houseNo || '',
                'หมู่ที่': p.village || '',
                'ถนน': p.road || '',
                'ตำบล': p.subDistrict || '',
                'อำเภอ': p.district || '',
                'จังหวัด': p.province || '',
                'รหัสไปรษณีย์': p.postalCode || '',
                'ชื่อบิดา': [p.fatherName, p.fatherSurname].filter(Boolean).join(' '),
                'ชื่อมารดา': [p.motherName, p.motherSurname].filter(Boolean).join(' '),
                'สถานภาพบิดามารดา': p.maritalStatus || '',
                'อาศัยอยู่กับ': p.livesWith || '',
                'เบอร์โทรผู้ปกครอง': p.guardianPhone || '',
                'เบอร์โทรนักเรียน': p.studentPhone || ''
            };
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName(`ข้อมูลส่วนตัว ${data.homeroom}`));
      }
      
      if(exportSections.savingsSummary){
        const hrStudents = data.students.filter(s => s.classId === data.homeroom).sort((a,b)=>(a.number||999)-(b.number||999));
        const rows = hrStudents.map(s => {
            const sv = data.savings?.[s.id];
            const c = calcSavings(sv);
            return {
                'เลขที่': s.number || '',
                'รหัส': s.id,
                'ชื่อ-สกุล': s.name,
                'เป้าหมายการออม (บาท)': c.goal,
                'ออมแล้ว (บาท)': c.total,
                'ความคืบหน้า (%)': c.pct
            };
        });
        
        if (rows.length > 0) {
             const totalGoal = rows.reduce((s, r) => s + r['เป้าหมายการออม (บาท)'], 0);
             const totalSav = rows.reduce((s, r) => s + r['ออมแล้ว (บาท)'], 0);
             rows.push({
                 'เลขที่': 'รวมทั้งหมด',
                 'รหัส': '',
                 'ชื่อ-สกุล': '',
                 'เป้าหมายการออม (บาท)': totalGoal,
                 'ออมแล้ว (บาท)': totalSav,
                 'ความคืบหน้า (%)': totalGoal > 0 ? Math.round((totalSav/totalGoal)*100) : 0
             });
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), safeSheetName(`สรุปออมเงิน ${data.homeroom}`));
      }
      
      if(exportSections.morningAtt){
        const rows=data.attendance.filter(a=>a.type==='morning').sort((a,b)=>a.date.localeCompare(b.date)).map(a=>{const s=data.students.find(x=>x.id===a.studentId);return{'วันที่':a.date,'รหัส':a.studentId,'เลขที่':s?.number||'','ชื่อ':s?.name||'','ห้อง':s?.classId||'','สถานะ':STATUS[a.status]?.label||a.status,'หมายเหตุ':a.note||''};});
        XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),safeSheetName('เข้าแถว'));
      }
      
      if(exportSections.classAtt){
        data.subjects.filter(s=>exportSubjs[s.id]).forEach(subj=>{const rows=data.attendance.filter(a=>a.type==='class'&&a.subjectId===subj.id).sort((a,b)=>a.date.localeCompare(b.date)).map(a=>{const s=data.students.find(x=>x.id===a.studentId);return{'วันที่':a.date,'คาบ':a.period||'','รหัส':a.studentId,'เลขที่':s?.number||'','ชื่อ':s?.name||'','ห้อง':s?.classId||'','สถานะ':STATUS[a.status]?.label||a.status,'คะแนน':a.customScore??''};});const shName=safeSheetName(`คาบ ${subj.code||subj.name}`);XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),shName);});
      }
      
      if(exportSections.scores){
        data.subjects.filter(s=>exportSubjs[s.id]).forEach(subj=>{const sCats=data.categories.filter(c=>c.subjectId===subj.id);const rows=data.students.sort((a,b)=>(a.number||999)-(b.number||999)).map(s=>{const row={'เลขที่':s.number||'','รหัส':s.id,'ชื่อ':s.name,'ห้อง':s.classId};sCats.forEach(c=>{const k=`${c.name}(${getCatMax(c)})`;row[k]=getCatScore(s.id,c,data.scores,data.term,data.year)||'';});const mx=sCats.reduce((t,c)=>t+getCatMax(c),0);const tot=sCats.reduce((t,c)=>t+getCatScore(s.id,c,data.scores,data.term,data.year),0);const has=sCats.some(c=>hasCatScore(s.id,c,data.scores,data.term,data.year));row['รวม']=has?tot:'';row['เกรด']=has?(getSubjectGrade(s.id,subj,data.categories,data.scores,data.term,data.year,data.attendance,data.conduct)?.label||''):'' ;return row;});const shName=safeSheetName(`คะแนน ${subj.code||subj.name}`);XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),[shName][0]);});
      }
      
      const safeDate = todayStr().replace(/-/g, '');
      XLSX.writeFile(wb,`ChineseClass_${data.term}_${data.year}_${safeDate}.xlsx`);
      setExportModal(false);
      toast('ส่งออก Excel สำเร็จ','success');
    }catch(e){toast('ไม่สามารถส่งออก Excel ได้: '+e.message,'error');}
  };

  const downloadTemplate=async()=>{try{const XLSX=await import('xlsx');const wb=XLSX.utils.book_new();const sample=[{'เลขที่':1,'รหัสนักเรียน':'12345','ชื่อ-สกุล':'ตัวอย่าง ทดสอบ','ชื่อเล่น':'ตัว','ชื่อภาษาจีน':'小明','ห้อง':'ม.5/2','PIN':'1234'},{'เลขที่':2,'รหัสนักเรียน':'12346','ชื่อ-สกุล':'ตัวอย่าง 2','ชื่อเล่น':'','ชื่อภาษาจีน':'','ห้อง':'ม.5/2','PIN':'5678'}];XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(sample),'นักเรียน');XLSX.writeFile(wb,'template-students.xlsx');toast('ดาวน์โหลด Template แล้ว','success');}catch{toast('ไม่พร้อมใช้งาน','error');}};
  const handleFile=async e=>{const f=e.target.files[0];if(!f)return;try{const XLSX=await import('xlsx');const wb=XLSX.read(await f.arrayBuffer());const ws=wb.Sheets[wb.SheetNames.find(n=>n.includes('นักเรียน'))||wb.SheetNames[0]];const rows=XLSX.utils.sheet_to_json(ws).map(r=>({id:String(r['รหัสนักเรียน']||r['รหัส']||'').trim(),name:String(r['ชื่อ-สกุล']||r['ชื่อ']||'').trim(),nickname:String(r['ชื่อเล่น']||'').trim(),chineseName:String(r['ชื่อภาษาจีน']||'').trim(),number:parseInt(r['เลขที่'])||null,classId:String(r['ห้อง']||'').trim(),pin:String(r['PIN']||'').trim()||randomPin()})).filter(s=>s.id&&s.name&&s.classId);if(!rows.length)return toast('ไม่พบข้อมูล ตรวจสอบหัวคอลัมน์','error');setImportPreview(rows);}catch(ex){toast('อ่านไฟล์ไม่ได้: '+ex.message,'error');}e.target.value='';};
  const confirmImport=mode=>{if(!importPreview)return;update(prev=>{const ex=new Map(prev.students.map(s=>[s.id,s]));const nc=new Set(prev.classes);importPreview.forEach(s=>{const pin=/^\d{4}$/.test(s.pin)?s.pin:randomPin();if(ex.has(s.id)){if(mode==='replace')ex.set(s.id,{...ex.get(s.id),...s,pin});}else ex.set(s.id,{...s,pin});if(s.classId&&!nc.has(s.classId))nc.add(s.classId);});return{...prev,students:Array.from(ex.values()),classes:sortClasses(Array.from(nc))};});toast(`นำเข้า ${importPreview.length} รายการ ✓`,'success');setImportPreview(null);};

  const hrCount = data.students.filter(s => s.classId === data.homeroom).length;
  const exportCounts={
    students:data.students.length,
    homeroom:hrCount,
    morningAtt:data.attendance.filter(a=>a.type==='morning').length,
    classAtt:data.attendance.filter(a=>a.type==='class').length,
    scores:data.scores.length
  };

  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>📥 นำเข้า / ส่งออก</div>
    <div style={sCard}><div style={{fontWeight:700,fontSize:16,marginBottom:8}}>📤 ส่งออก Excel</div><div style={{fontSize:13,color:C.muted,marginBottom:16}}>เลือกหัวข้อที่ต้องการส่งออก เพื่อเก็บสำรองข้อมูล</div><button onClick={()=>setExportModal(true)} style={{...sBtn(true),width:'100%',padding:14,fontSize:16}}>📊 เลือกและส่งออก...</button></div>
    <div style={sCard}><div style={{fontWeight:700,fontSize:16,marginBottom:8}}>📥 นำเข้านักเรียน</div><div style={{fontSize:13,color:C.muted,marginBottom:12}}>คอลัมน์ Excel: เลขที่, รหัสนักเรียน, ชื่อ-สกุล, ชื่อเล่น, ชื่อภาษาจีน, ห้อง, PIN</div><button onClick={downloadTemplate} style={{...sBtn(false),width:'100%',padding:12,marginBottom:12}}>⬇ ดาวน์โหลดไฟล์ Template</button><input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:'none'}}/><button onClick={()=>fileRef.current?.click()} style={{...sBtn(true),width:'100%',padding:14,fontSize:16}}>📤 เลือกไฟล์ Excel เพื่อนำเข้า</button></div>

    <Sheet open={exportModal} title="📤 เลือกหัวข้อที่จะส่งออก" onClose={()=>setExportModal(false)}>
      <div style={{marginBottom:16}}>
        {[
          ['students',`รายชื่อนักเรียนทั้งหมด (${exportCounts.students} คน)`],
          ['homeroomProfiles',`ข้อมูลส่วนตัวประจำชั้น ${data.homeroom} (${exportCounts.homeroom} คน)`],
          ['savingsSummary',`สรุปการออมเงินประจำชั้น ${data.homeroom} (${exportCounts.homeroom} คน)`],
          ['morningAtt',`เช็คชื่อเข้าแถว (${exportCounts.morningAtt} รายการ)`],
          ['classAtt',`เช็คชื่อคาบเรียน (${exportCounts.classAtt} รายการ)`],
          ['scores',`คะแนนวิชาต่างๆ (${exportCounts.scores} รายการ)`]
        ].map(([k,l])=><label key={k} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:`1px solid ${C.border}`,cursor:'pointer'}}><input type="checkbox" checked={exportSections[k]} onChange={()=>toggleSection(k)} style={{width:20,height:20,accentColor:C.red}}/><span style={{fontSize:15,fontWeight:500,color:C.text}}>{l}</span></label>)}</div>
      {(exportSections.classAtt||exportSections.scores)&&<div style={{marginBottom:16}}><div style={{fontSize:14,color:C.text,marginBottom:10,fontWeight:700}}>เลือกรายวิชา:</div>{data.subjects.map(s=><label key={s.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${C.border}`,cursor:'pointer'}}><input type="checkbox" checked={exportSubjs[s.id]??true} onChange={()=>toggleSubj(s.id)} style={{width:18,height:18,accentColor:C.red}}/><div><div style={{fontSize:15,fontWeight:600}}>{s.code&&`${s.code} `}{s.name}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>คะแนน {data.scores.filter(r=>data.categories.find(c=>c.id===r.categoryId&&c.subjectId===s.id)).length} รายการ</div></div></label>)}</div>}
      <div style={{background:C.light,borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:13,color:C.muted}}>จะสร้างไฟล์: <b style={{color:C.text}}>ChineseClass_{data.term}_{data.year}_{todayStr().replace(/-/g,'')}.xlsx</b></div>
      <div style={{display:'flex',gap:12}}><button onClick={()=>setExportModal(false)} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={doExport} style={{...sBtn(true),flex:1}}>📊 ส่งออก</button></div></Sheet>

    <Sheet open={!!importPreview} title={`ตรวจสอบก่อนนำเข้า (${importPreview?.length||0} รายการ)`} onClose={()=>setImportPreview(null)}>
      {importPreview&&<div><div style={{maxHeight:'42vh',overflowY:'auto',marginBottom:16,border:`1px solid ${C.border}`,borderRadius:12}}><div style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 60px',background:C.bg,padding:'10px 12px',fontSize:13,fontWeight:700,color:C.muted,borderBottom:`1px solid ${C.border}`}}><span>เลขที่</span><span>ชื่อ</span><span>ห้อง · รหัส</span><span>สถานะ</span></div>
          {importPreview.map((s,i)=>{const exists=data.students.some(x=>x.id===s.id);return(<div key={i} style={{display:'grid',gridTemplateColumns:'40px 1fr 1fr 60px',padding:'10px 12px',borderBottom:`1px solid ${C.border}`,fontSize:14,background:exists?'#FFFBEB':'white'}}><span style={{color:C.muted}}>{s.number||'-'}</span><span><b style={{fontWeight:600}}>{s.name}</b>{s.nickname?` (${s.nickname})`:''}{s.chineseName?<span style={{color:'#0284C7'}}> {s.chineseName}</span>:null}</span><span style={{color:C.muted}}>{s.classId} · {s.id}</span><span style={{color:exists?'#D97706':'#16A34A',fontSize:12,fontWeight:700}}>{exists?'อัปเดต':'ใหม่'}</span></div>);})}</div>
        <div style={{display:'flex',gap:10,flexDirection:'column'}}><button onClick={()=>confirmImport('skip')} style={{...sBtn(true),padding:14}}>เพิ่มเฉพาะรายใหม่ ({importPreview.filter(s=>!data.students.some(x=>x.id===s.id)).length} คน)</button><button onClick={()=>confirmImport('replace')} style={{...sBtn(false),padding:14}}>เพิ่ม + อัปเดตที่มีอยู่ ({importPreview.length} คน)</button><button onClick={()=>setImportPreview(null)} style={{...sBtn(false),padding:12,color:C.muted,background:'transparent',border:`1px solid ${C.border}`}}>ยกเลิก</button></div></div>}</Sheet>
  </div>);}

// ===== SETTINGS =====
function SettingsPage({data, update, systemActions, toast}){
  const[form,setForm]=useState({appName:data.appName||'ห้องเรียนของคุณครูต้นฝน',term:data.term,year:data.year,homeroom:data.homeroom,teacherUsername:data.teacherUsername||'puntoy',password:'',presentScore:data.conduct.presentScore,absentScore:data.conduct.absentScore,lateGroup:data.conduct.lateGroup,latePenalty:data.conduct.latePenalty,minAttPct:data.conduct.minAttPct});
  const[wipeModal,setWipeModal]=useState(false);
  const[wipeOpts,setWipeOpts]=useState({students:false, attendance:false, scores:false, savings:false});
  const sortedCls=useMemo(()=>sortClasses(data.classes),[data.classes]);

  // ระบบจัดการเทอม
  const [termModal, setTermModal] = useState(false);
  const [termForm, setTermForm] = useState({ term: data.term === 1 ? 2 : 1, year: data.term === 1 ? data.year : data.year + 1 });
  const [termOpts, setTermOpts] = useState({ keepAtt: false, keepScore: false, keepTt: false, keepSav: false });
  const [switchId, setSwitchId] = useState(systemActions.sysConfig?.activeDocId || '');

  const save=async()=>{
    update(prev=>({...prev,appName:form.appName.trim()||prev.appName,term:parseInt(form.term)||prev.term,year:parseInt(form.year)||prev.year,homeroom:form.homeroom,teacherUsername:form.teacherUsername.trim()||'puntoy',password:form.password.trim()||prev.password,conduct:{presentScore:parseFloat(form.presentScore)||0,absentScore:parseFloat(form.absentScore)||0,lateGroup:parseInt(form.lateGroup)||3,latePenalty:parseFloat(form.latePenalty)||0,minAttPct:parseInt(form.minAttPct)||20}}));
    
    // อัปเดตชื่อเทอมในประวัติให้ตรงกับการตั้งค่าที่แก้
    if(systemActions?.sysConfig) {
       const newLabel = `ภาคเรียน ${form.term}/${form.year}`;
       const newHistory = (systemActions.sysConfig.history || []).map(h => 
           h.id === systemActions.sysConfig.activeDocId ? { ...h, label: newLabel } : h
       );
       await setDoc(doc(getFirestore(), "app_data", "_system_config"), {
           ...systemActions.sysConfig,
           history: newHistory
       });
    }

    toast('บันทึกการตั้งค่าแล้ว','success');setForm(p=>({...p,password:''}));
  };
  
  const handleCreateTerm = async () => {
    await systemActions.createNewTerm(termForm.term, termForm.year, termOpts);
    setTermModal(false);
    toast('สร้างและสลับไปภาคเรียนใหม่สำเร็จ', 'success');
  };

  const handleSwitch = async () => {
    if(!switchId) return;
    await systemActions.switchTerm(switchId);
    toast('สลับภาคเรียนแล้ว', 'success');
  };

  const confirmWipe=()=>{
    update(prev => {
        const next = {...prev};
        if(wipeOpts.students) { next.students = []; next.profiles = {}; next.classes = DEFAULT_CLASSES; }
        if(wipeOpts.attendance) { next.attendance = []; }
        if(wipeOpts.scores) { next.scores = []; next.categories = []; } 
        if(wipeOpts.savings) { next.savings = {}; }
        return next;
    });
    setWipeModal(false);
    toast('ล้างข้อมูลที่เลือกในเทอมนี้แล้ว','success');
  };

  return(<div style={{padding:'14px 14px 100px'}}><div style={{fontWeight:700,fontSize:20,marginBottom:16,color:C.text,letterSpacing:'-0.5px'}}>⚙️ ตั้งค่าระบบ</div>
      
      {/* ระบบจัดการเทอมแบบแยกฐานข้อมูล */}
      <div style={{...sCard, border:`2px solid ${C.red}`}}>
         <div style={{fontWeight:700,fontSize:16,marginBottom:12, color:C.red}}>🗄️ การจัดการฐานข้อมูล (แยกเทอม)</div>
         <div style={{fontSize:13,color:C.muted,marginBottom:8}}>สลับไปดูข้อมูลเทอมก่อนหน้า หรือเทอมอื่นๆ ได้ที่นี่</div>
         <div style={{display:'flex', gap:8, marginBottom:16}}>
            <select value={switchId} onChange={e=>setSwitchId(e.target.value)} style={{...sInp, flex:1, fontFamily:'inherit'}}>
               {(systemActions.sysConfig?.history || []).map(h => (
                  <option key={h.id} value={h.id}>{h.label} {h.id === systemActions.sysConfig?.activeDocId ? '(เทอมปัจจุบัน)' : ''}</option>
               ))}
            </select>
            <button onClick={handleSwitch} style={{...sBtn(true), background:C.blue, padding:'10px 16px', flexShrink:0}}>🔄 สลับดูข้อมูล</button>
         </div>
         <button onClick={()=>setTermModal(true)} style={{...sBtn(false), width:'100%', border:`2px dashed ${C.red}`, color:C.red, background:'transparent', padding:14}}>
            ➕ ขึ้นเทอมใหม่ (สร้างฐานข้อมูลใหม่)
         </button>
      </div>

      <div style={sCard}><div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🏫 ชื่อแอปพลิเคชัน</div><input value={form.appName} onChange={e=>setForm(p=>({...p,appName:e.target.value}))} style={sInp}/></div>
      <div style={sCard}><div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📅 แก้ไขชื่อภาคเรียน (เฉพาะฐานข้อมูลนี้)</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ภาคเรียน</div><select value={form.term} onChange={e=>setForm(p=>({...p,term:e.target.value}))} style={{...sInp,fontFamily:'inherit'}}><option value={1}>1</option><option value={2}>2</option></select></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ปี (พ.ศ.)</div><input type="number" value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} style={sInp}/></div></div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ห้องประจำชั้น</div><select value={form.homeroom} onChange={e=>setForm(p=>({...p,homeroom:e.target.value}))} style={{...sInp,fontFamily:'inherit'}}>{sortedCls.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
      <div style={sCard}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>🎯 จิตพิสัย (คาบเรียน)</div><div style={{fontSize:13,color:C.muted,marginBottom:12}}>ลา/กิจกรรม: +มา · -ขาด · 0=สาย</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>มา (+)</div><input type="number" step="0.5" value={form.presentScore} onChange={e=>setForm(p=>({...p,presentScore:e.target.value}))} style={sInp}/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ขาด (-)</div><input type="number" step="0.5" value={form.absentScore} onChange={e=>setForm(p=>({...p,absentScore:e.target.value}))} style={sInp}/></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>สาย ทุก N ครั้ง</div><input type="number" value={form.lateGroup} onChange={e=>setForm(p=>({...p,lateGroup:e.target.value}))} style={sInp}/></div><div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>หักคะแนน</div><input type="number" step="0.5" value={form.latePenalty} onChange={e=>setForm(p=>({...p,latePenalty:e.target.value}))} style={sInp}/></div></div></div>
      <div style={sCard}><div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🚨 มส. (เข้าเรียนต่ำกว่า %)</div><input type="number" value={form.minAttPct} onChange={e=>setForm(p=>({...p,minAttPct:e.target.value}))} style={sInp}/></div>
      <div style={sCard}><div style={{fontWeight:700,fontSize:15,marginBottom:12}}>🔐 บัญชีครูผู้สอน</div><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>ชื่อผู้ใช้ (Username)</div><input value={form.teacherUsername} onChange={e=>setForm(p=>({...p,teacherUsername:e.target.value}))} style={{...sInp,marginBottom:12}} placeholder="เช่น puntoy"/><div style={{fontSize:13,color:C.muted,marginBottom:6,fontWeight:500}}>รหัสผ่านใหม่ (ทิ้งว่างถ้าไม่ต้องการเปลี่ยน)</div><input type="password" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} style={sInp} placeholder="เว้นว่าง = ไม่เปลี่ยน"/></div>
      <button onClick={save} style={{...sBtn(true),width:'100%',padding:16,fontSize:18,marginBottom:16,boxShadow:'0 4px 12px rgba(229,57,53,0.3)'}}>💾 บันทึกการตั้งค่า</button>
      <button onClick={()=>setWipeModal(true)} style={{width:'100%',padding:14,background:'#FEF2F2',color:'#DC2626',border:'1px solid #FCA5A5',borderRadius:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>⚠️ ล้างข้อมูลในเทอมปัจจุบันนี้...</button>

      {/* Modal เลือกล้างข้อมูล */}
      <Sheet open={wipeModal} title="⚠️ ล้างข้อมูลเฉพาะเทอมนี้" onClose={()=>setWipeModal(false)}>
         <div style={{fontSize:14,color:C.muted,marginBottom:16}}>ข้อมูลที่ถูกลบในเทอมนี้จะไม่สามารถกู้คืนได้ (ควรใช้กรณีที่กรอกข้อมูลผิดพลาดทั้งหมด)</div>
         <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:24}}>
            {[
               {k:'students', l:'รายชื่อนักเรียนทั้งหมด (รวมประวัติ รูปถ่าย และห้องเรียน)'},
               {k:'attendance', l:'ประวัติการเช็คชื่อทั้งหมด (แถวและคาบเรียน)'},
               {k:'scores', l:'คะแนนเก็บทั้งหมด (รวมถึงหมวดหมู่คะแนน)'},
               {k:'savings', l:'ประวัติเป้าหมายและการออมเงิน'}
            ].map(o=><label key={o.k} style={{display:'flex',alignItems:'flex-start',gap:12,padding:14,border:`2px solid ${wipeOpts[o.k]?C.red:C.border}`,borderRadius:12,background:wipeOpts[o.k]?'#FFF5F5':'white',cursor:'pointer',transition:'all 0.2s'}}>
                <input type="checkbox" checked={wipeOpts[o.k]} onChange={()=>setWipeOpts(p=>({...p,[o.k]:!p[o.k]}))} style={{width:22,height:22,accentColor:C.red,marginTop:2}}/>
                <span style={{fontSize:15,fontWeight:wipeOpts[o.k]?700:500,color:wipeOpts[o.k]?C.red:C.text}}>{o.l}</span>
            </label>)}
         </div>
         <div style={{display:'flex',gap:12}}>
            <button onClick={()=>setWipeModal(false)} style={{...sBtn(false),flex:1}}>ยกเลิก</button>
            <button onClick={confirmWipe} disabled={!Object.values(wipeOpts).some(Boolean)} style={{...sBtn(true),flex:1,opacity:Object.values(wipeOpts).some(Boolean)?1:0.5}}>ยืนยันการลบ</button>
         </div>
      </Sheet>

      {/* Modal สร้างเทอมใหม่ */}
      <Sheet open={termModal} title="➕ สร้างฐานข้อมูลเทอมใหม่" onClose={()=>setTermModal(false)}>
         <div style={{fontSize:14,color:C.text,marginBottom:16, lineHeight:1.5}}>
            ระบบจะสร้างฐานข้อมูลใหม่ขึ้นมา และคัดลอก <b>"รายชื่อนักเรียน ประวัตินักเรียน และรายวิชาทั้งหมด"</b> ให้อัตโนมัติ เพื่อให้เริ่มสอนเทอมใหม่ได้ทันที
         </div>
         <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
            <div><div style={{fontSize:13,color:C.muted,marginBottom:6}}>เทอมใหม่</div>
               <select value={termForm.term} onChange={e=>setTermForm(p=>({...p,term:parseInt(e.target.value)}))} style={{...sInp,fontFamily:'inherit'}}><option value={1}>1</option><option value={2}>2</option><option value={3}>3 (ซัมเมอร์)</option></select>
            </div>
            <div><div style={{fontSize:13,color:C.muted,marginBottom:6}}>ปีการศึกษาใหม่ (พ.ศ.)</div>
               <input type="number" value={termForm.year} onChange={e=>setTermForm(p=>({...p,year:parseInt(e.target.value)}))} style={sInp}/>
            </div>
         </div>
         <div style={{fontWeight:700, fontSize:15, marginBottom:10}}>ตัวเลือกการคัดลอกเพิ่มเติม</div>
         <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
            <label style={{display:'flex',alignItems:'center',gap:10}}><input type="checkbox" checked disabled style={{accentColor:C.red, width:18, height:18}}/><span style={{fontSize:15,color:C.muted}}>นักเรียน ประวัติ และวิชา (บังคับคัดลอก)</span></label>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="checkbox" checked={termOpts.keepTt} onChange={()=>setTermOpts(p=>({...p,keepTt:!p.keepTt}))} style={{accentColor:C.red, width:18, height:18}}/><span style={{fontSize:15}}>คัดลอกตารางสอนเดิมมาด้วย</span></label>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}><input type="checkbox" checked={termOpts.keepSav} onChange={()=>setTermOpts(p=>({...p,keepSav:!p.keepSav}))} style={{accentColor:C.red, width:18, height:18}}/><span style={{fontSize:15}}>คัดลอกข้อมูลเงินออมเดิมมาด้วย</span></label>
         </div>
         <div style={{display:'flex',gap:12}}>
            <button onClick={()=>setTermModal(false)} style={{...sBtn(false),flex:1, padding:14}}>ยกเลิก</button>
            <button onClick={handleCreateTerm} style={{...sBtn(true),flex:1, padding:14}}>สร้างเทอมใหม่</button>
         </div>
      </Sheet>
  </div>);}

// ===== STUDENT APP =====
function StudentApp({data,update,student,onLogout}){
  const[tab,setTab]=useState('scores');
  const enrolledSubjects = useMemo(() => {return data.subjects.filter(subj => {const hasAtt = data.attendance.some(a => a.type === 'class' && a.subjectId === subj.id && data.students.find(s=>s.id===a.studentId)?.classId === student.classId);const hasScore = data.categories.some(c => c.subjectId === subj.id && data.scores.some(s => s.categoryId === c.id && data.students.find(x=>x.id===s.studentId)?.classId === student.classId));return hasAtt || hasScore;});}, [data, student]);
  const[selSubjId,setSelSubjId]=useState(enrolledSubjects[0]?.id||'');const[pinModal,setPinModal]=useState(false);const[pf,setPf]=useState({cur:'',n1:'',n2:''});const[pinErr,setPinErr]=useState('');
  useEffect(() => {if (enrolledSubjects.length > 0 && !enrolledSubjects.find(s => s.id === selSubjId)) {setSelSubjId(enrolledSubjects[0].id);}}, [enrolledSubjects, selSubjId]);
  if(!student)return<div style={{padding:40,textAlign:'center',color:C.red}}>ไม่พบข้อมูล</div>; const isHomeroom = student.classId === data.homeroom;
  const subj=enrolledSubjects.find(s=>s.id===selSubjId);const cats=subj?data.categories.filter(c=>c.subjectId===subj.id):[];const mx=cats.reduce((s,c)=>s+getCatMax(c),0);const tot=cats.reduce((s,c)=>s+getCatScore(student.id,c,data.scores,data.term,data.year),0);const hasAny=cats.some(c=>hasCatScore(student.id,c,data.scores,data.term,data.year));
  const attRate=calcAttRate(student.id,data.attendance,'class',subj?.id);const morningRate=calcAttRate(student.id,data.attendance,'morning');
  const grade=hasAny&&subj?getSubjectGrade(student.id,subj,data.categories,data.scores,data.term,data.year,data.attendance,data.conduct):null;const conduct=calcConduct(student.id,data.attendance,data.conduct,subj?.id);
  const myAtt=data.attendance.filter(a=>a.studentId===student.id).sort((a,b)=>b.date.localeCompare(a.date));
  const changePin=()=>{if(pf.cur!==student.pin)return setPinErr('PIN ปัจจุบันไม่ถูกต้อง');if(!/^\d{4}$/.test(pf.n1))return setPinErr('PIN ต้องเป็นตัวเลข 4 หลัก');if(pf.n1!==pf.n2)return setPinErr('ยืนยัน PIN ไม่ตรงกัน');update(prev=>({...prev,students:prev.students.map(s=>s.id===student.id?{...s,pin:pf.n1}:s)}));setPinModal(false);setPf({cur:'',n1:'',n2:''});};
  
  return(<div style={{minHeight:'100vh',background:C.bg}}><div style={{background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',padding:'16px 20px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontWeight:700,fontSize:20}}>{student.nickname||student.name}{student.chineseName&&<span style={{fontSize:15,marginLeft:8,opacity:0.9}}>{student.chineseName}</span>}</div><div style={{fontSize:13,opacity:0.9,marginTop:4}}>{student.id} · {student.classId} · เทอม {data.term}/{data.year}</div></div><div style={{display:'flex',gap:8}}><button onClick={()=>setPinModal(true)} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',width:40,height:40,borderRadius:12,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>🔑</button><button onClick={onLogout} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',width:40,height:40,borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></button></div></div></div>
    <div style={{display:'flex',background:'white',borderBottom:`1px solid ${C.border}`}}>{[['scores','📊 คะแนน'],['att','✓ เข้าเรียน'],...(isHomeroom ? [['homeroom','🏫 ประจำชั้น']] : [])].map(([v,l])=><button key={v} onClick={()=>setTab(v)} style={{flex:1,padding:'16px 8px',border:'none',cursor:'pointer',background:'transparent',fontWeight:tab===v?700:500,color:tab===v?C.red:C.muted,borderBottom:`3px solid ${tab===v?C.red:'transparent'}`,fontSize:15,fontFamily:'inherit',transition:'all 0.2s'}}>{l}</button>)}</div>
    <div style={{padding:16}}>{tab==='scores'&&<div>{enrolledSubjects.length===0?<div style={{textAlign:'center',padding:48,color:C.muted}}>ยังไม่มีข้อมูลรายวิชาของคุณ</div>:<>{enrolledSubjects.length>1&&<select value={selSubjId} onChange={e=>setSelSubjId(e.target.value)} style={{...sInp,marginBottom:16,fontFamily:'inherit',fontWeight:600}}>{enrolledSubjects.map(s=><option key={s.id} value={s.id}>{s.code?`${s.code} ${s.name}`:s.name}</option>)}</select>}
          {hasAny&&<div style={{...sCard,background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',textAlign:'center',marginBottom:16,boxShadow:'0 8px 24px rgba(183,28,28,0.25)'}}><div style={{fontSize:14,opacity:0.9,fontWeight:500}}>คะแนนรวม · {subj?.name}</div><div style={{fontSize:56,fontWeight:700,lineHeight:1.1,margin:'8px 0'}}>{tot}</div><div style={{fontSize:15,opacity:0.9}}>จาก {mx} ({mx>0?Math.round(tot/mx*100):0}%)</div>{grade&&<div style={{marginTop:12,background:'rgba(255,255,255,0.2)',display:'inline-block',padding:'6px 28px',borderRadius:24,fontSize:22,fontWeight:700,backdropFilter:'blur(4px)'}}>เกรด {grade.label}</div>}</div>}
          {cats.map(cat=>{const cs=getCatScore(student.id,cat,data.scores,data.term,data.year);const cm=getCatMax(cat);const has=hasCatScore(student.id,cat,data.scores,data.term,data.year);return(<div key={cat.id} style={{...sCard,marginBottom:12,padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:has?10:0}}><span style={{fontWeight:700,fontSize:16}}>{cat.name}</span><span style={{fontSize:18,fontWeight:700}}>{has?`${cs}/${cm}`:'-'}</span></div>{has&&cm>0&&<div style={{height:8,borderRadius:4,background:'#f3f4f6',overflow:'hidden',marginBottom:12}}><div style={{height:'100%',width:`${(cs/cm)*100}%`,background:gradeColor(getGrade(cs,cm)),borderRadius:4}}/></div>}{cat.subs?.map(sub=>{const sr=data.scores.find(x=>x.studentId===student.id&&x.categoryId===cat.id&&x.subId===sub.id&&x.term===data.term&&x.year===data.year);return<div key={sub.id} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'6px 0 6px 12px',borderTop:`1px dashed ${C.border}`}}><span style={{color:C.muted,fontWeight:500}}>{sub.name}{sub.date?` · ${fmtDate(sub.date)}`:''}</span><span style={{fontWeight:700}}>{sr?`${sr.score}/${sub.max}`:'-'}</span></div>;})}</div>);})}</>}</div>}
      {tab==='att'&&<div>{enrolledSubjects.length===0?<div style={{textAlign:'center',padding:48,color:C.muted}}>ยังไม่มีข้อมูลการเข้าเรียน</div>:<>{enrolledSubjects.length>1&&<select value={selSubjId} onChange={e=>setSelSubjId(e.target.value)} style={{...sInp,marginBottom:16,fontFamily:'inherit',fontWeight:600}}>{enrolledSubjects.map(s=><option key={s.id} value={s.id}>{s.code?`${s.code} ${s.name}`:s.name}</option>)}</select>}
          <div style={{...sCard,background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',textAlign:'center',marginBottom:16,boxShadow:'0 8px 24px rgba(183,28,28,0.25)'}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}><div style={{background:'rgba(255,255,255,0.15)',borderRadius:12,padding:12}}><div style={{fontSize:13,opacity:0.9,fontWeight:500}}>🌅 เข้าแถว</div><div style={{fontSize:32,fontWeight:700}}>{morningRate??'-'}%</div></div><div style={{background:'rgba(255,255,255,0.15)',borderRadius:12,padding:12}}><div style={{fontSize:13,opacity:0.9,fontWeight:500}}>📚 {subj?.code||'คาบ'}</div><div style={{fontSize:32,fontWeight:700}}>{attRate??'-'}%</div></div></div><div style={{fontSize:14,fontWeight:500}}>จิตพิสัย: <b>{conduct.score>0?'+':''}{conduct.score}</b></div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:12}}>{S_ORDER.map(k=><div key={k} style={{background:'rgba(255,255,255,0.15)',borderRadius:8,padding:'8px 4px'}}><div style={{fontSize:18,fontWeight:700}}>{conduct.counts[k]}</div><div style={{fontSize:12,fontWeight:500}}>{STATUS[k].label}</div></div>)}</div></div>
          {myAtt.slice(0,60).map((a,i)=>{const sj=data.subjects.find(x=>x.id===a.subjectId);return<div key={i} style={{...sCard,marginBottom:8,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><div style={{fontSize:15,fontWeight:600}}>{fmtDate(a.date)}</div><div style={{fontSize:13,color:C.muted,marginTop:2}}>{a.type==='morning'?'🌅 เข้าแถว':`📚 ${sj?.code||sj?.name||'คาบ'}${a.period?` คาบ ${a.period}`:''}`}</div></div><span style={{background:STATUS[a.status]?.bg||'#94A3B8',color:'white',fontSize:13,padding:'4px 12px',borderRadius:20,fontWeight:700}}>{STATUS[a.status]?.label}{STATUS[a.status]?.custom&&a.customScore!==undefined?` (${a.customScore>0?'+':''}${a.customScore})`:''}</span></div>;})}</>}</div>}
      {tab==='homeroom' && isHomeroom && (<HomeroomPage data={data} update={update} role="student" currentStudentId={student.id} toast={(msg) => alert(msg)} />)}</div>
    <Sheet open={pinModal} title="🔑 เปลี่ยนรหัสผ่าน PIN" onClose={()=>{setPinModal(false);setPinErr('');}}><input type="password" placeholder="PIN ปัจจุบัน 4 หลัก" value={pf.cur} onChange={e=>setPf(p=>({...p,cur:e.target.value}))} style={{...sInp,marginBottom:12,textAlign:'center',letterSpacing:4,fontSize:20}} maxLength={4}/><input type="password" placeholder="PIN ใหม่ 4 หลัก" value={pf.n1} onChange={e=>setPf(p=>({...p,n1:e.target.value.replace(/\D/g,'').slice(0,4)}))} style={{...sInp,marginBottom:12,textAlign:'center',letterSpacing:4,fontSize:20}} maxLength={4}/><input type="password" placeholder="ยืนยัน PIN ใหม่" value={pf.n2} onChange={e=>setPf(p=>({...p,n2:e.target.value.replace(/\D/g,'').slice(0,4)}))} style={{...sInp,marginBottom:16,textAlign:'center',letterSpacing:4,fontSize:20}} maxLength={4}/>{pinErr&&<div style={{color:C.red,fontSize:14,marginBottom:16,padding:'10px',background:'#FEF2F2',borderRadius:8,textAlign:'center'}}>{pinErr}</div>}<div style={{display:'flex',gap:12}}><button onClick={()=>{setPinModal(false);setPinErr('');}} style={{...sBtn(false),flex:1}}>ยกเลิก</button><button onClick={changePin} style={{...sBtn(true),flex:1}}>บันทึกรหัสใหม่</button></div></Sheet></div>);}

// ===== TEACHER SHELL =====
function TeacherApp({data,update,systemActions,onLogout}){const[page,setPage]=useState('home');const[drawerOpen,setDrawerOpen]=useState(false);const[fabOpen,setFabOpen]=useState(false);const[attInit,setAttInit]=useState(null);const[toastMsg,setToastMsg]=useState({msg:'',type:'info'});
  const toast=useCallback((msg,type='info')=>setToastMsg({msg,type}),[]);const openAtt=(type,classId)=>{setAttInit({type,classId});setPage('att');};useEffect(()=>{if(page!=='att')setAttInit(null);},[page]);const pageObj=NAV.find(n=>n.id===page);
  return(<div style={{minHeight:'100vh',background:C.bg}}><TopBar onMenu={()=>setDrawerOpen(true)} onLogout={onLogout} label={pageObj?`${pageObj.icon} ${pageObj.label}`:''} appName={data.appName||'ห้องเรียนของคุณครูต้นฝน'}/><Drawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} current={page} onNav={setPage} data={data}/>
    {page==='home'&&<Dashboard data={data} setPage={setPage} openAtt={openAtt}/>}{page==='att'&&<AttendancePage data={data} update={update} initType={attInit?.type} initClass={attInit?.classId} toast={toast}/>}{page==='score'&&<ScoresPage data={data} update={update} toast={toast}/>}{page==='stu'&&<StudentsPage data={data} update={update} toast={toast}/>}{page==='stat'&&<StatsPage data={data}/>}{page==='io'&&<IOPage data={data} update={update} toast={toast}/>}{page==='homeroom'&&<HomeroomPage data={data} update={update} role="teacher" currentStudentId={null} toast={toast}/>}{page==='set'&&<SettingsPage data={data} update={update} systemActions={systemActions} toast={toast}/>}
    <button onClick={()=>setFabOpen(true)} style={{position:'fixed',bottom:24,right:20,width:64,height:64,borderRadius:32,background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',border:'none',fontSize:32,cursor:'pointer',boxShadow:'0 8px 24px rgba(183,28,28,0.4)',zIndex:40,display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 0.2s'}}>+</button>
    <Sheet open={fabOpen} title="➕ จัดการด่วน" onClose={()=>setFabOpen(false)}><div style={{display:'flex',flexDirection:'column',gap:12}}><button onClick={()=>{setFabOpen(false);openAtt('morning',data.homeroom);}} style={{padding:'16px 20px',background:'linear-gradient(135deg,#0284C7,#0369A1)',color:'white',border:'none',borderRadius:16,cursor:'pointer',textAlign:'left',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(2,132,199,0.2)'}}><div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🌅 เช็คชื่อเข้าแถว</div><div style={{fontSize:13,opacity:0.85}}>{data.homeroom}</div></button><button onClick={()=>{setFabOpen(false);openAtt('class');}} style={{padding:'16px 20px',background:`linear-gradient(135deg,${C.red},${C.dark})`,color:'white',border:'none',borderRadius:16,cursor:'pointer',textAlign:'left',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(229,57,53,0.2)'}}><div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📚 ตารางสอน / เช็คชื่อคาบ</div><div style={{fontSize:13,opacity:0.85}}>เปิดตารางเพื่อเช็คชื่อ</div></button><button onClick={()=>{setFabOpen(false);setPage('score');}} style={{padding:'16px 20px',background:'linear-gradient(135deg,#D97706,#B45309)',color:'white',border:'none',borderRadius:16,cursor:'pointer',textAlign:'left',fontFamily:'inherit',boxShadow:'0 4px 12px rgba(217,119,6,0.2)'}}><div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📊 บันทึกคะแนน</div></button><button onClick={()=>{setFabOpen(false);setPage('stu');}} style={{padding:'16px 20px',background:C.card,color:C.text,border:`1.5px solid ${C.border}`,borderRadius:16,cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}><div style={{fontWeight:700,fontSize:16}}>👤 จัดการนักเรียน</div></button></div></Sheet>
    <Toast msg={toastMsg.msg} type={toastMsg.type} onClose={()=>setToastMsg({msg:'',type:'info'})}/></div>);}

// ===== MAIN =====
export default function App(){
  const { data, loading, update, systemActions } = useFirestore();
  const [user, setUser] = useState(() => {const saved = localStorage.getItem('chinese_app_user'); return saved ? JSON.parse(saved) : null;});
  const handleLogin = (userData) => {setUser(userData); localStorage.setItem('chinese_app_user', JSON.stringify(userData));};
  const handleLogout = () => {setUser(null); localStorage.removeItem('chinese_app_user');};

  useEffect(()=>{
    // โหลดและใช้ Font Kanit
    const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap';document.head.appendChild(l);
    document.body.style.fontFamily='Kanit, sans-serif';
    document.body.style.backgroundColor='#F8FAFC';
    document.body.style.margin='0';
  },[]);

  // 📌 เพิ่มกลไกหลุดออกจากหน้า Loading หากเกิด Error นานเกินไป
  useEffect(() => {
    let timeout;
    if (loading) {
       timeout = setTimeout(() => setLoading(false), 5000); // ถ้าโหลดเกิน 5 วิ ให้บังคับดับ
    }
    return () => clearTimeout(timeout);
  }, [loading]);

  if(loading)return<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',background:C.bg}}><div style={{fontSize:64,color:C.red}}>中</div><div style={{color:C.muted,marginTop:12,fontWeight:500}}>กำลังเชื่อมต่อฐานข้อมูล...</div></div>;
  if(!data)return <div style={{padding:40,textAlign:'center',color:C.red}}>ข้อผิดพลาด: ไม่สามารถโหลดข้อมูลจาก Firebase ได้ กรุณาตรวจสอบแท็บ Rules ใน Firebase ของคุณ</div>;
  if(!user)return<LoginScreen data={data} onLogin={handleLogin}/>;
  
  if(user.role==='teacher')return<TeacherApp data={data} update={update} systemActions={systemActions} onLogout={handleLogout}/>;
  
  const studentData = data.students.find(s=>s.id===user.id);
  if (!studentData) {handleLogout(); return null;}
  
  return<StudentApp data={data} update={update} student={studentData} onLogout={handleLogout}/>;
}