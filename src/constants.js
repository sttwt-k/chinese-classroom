// ===== CONSTANTS =====

export const DEFAULT_CLASSES = ['ม.1/1','ม.1/2','ม.1/3','ม.2/1','ม.2/2','ม.2/3','ม.3/1','ม.3/2','ม.3/3','ม.4/1','ม.4/2','ม.4/3','ม.5/1','ม.5/2','ม.5/3','ม.6/1','ม.6/2','ม.6/3'];

export const STATUS = {
  present:  { label:'มา',    short:'มา',  bg:'#16a34a' },
  absent:   { label:'ขาด',   short:'ขาด', bg:'#dc2626' },
  late:     { label:'สาย',   short:'สาย', bg:'#d97706' },
  leave_p:  { label:'ลากิจ', short:'ลก',  bg:'#0891b2', custom:true },
  leave_s:  { label:'ลาป่วย',short:'ลป',  bg:'#2563eb', custom:true },
  activity: { label:'กิจกรรม',short:'กจ', bg:'#7c3aed', custom:true },
};

export const S_ORDER = ['present','absent','late','leave_p','leave_s','activity'];

export const GRADE_SCALE = [
  { label:'4',   min:80, gpa:4   },
  { label:'3.5', min:75, gpa:3.5 },
  { label:'3',   min:70, gpa:3   },
  { label:'2.5', min:65, gpa:2.5 },
  { label:'2',   min:60, gpa:2   },
  { label:'1.5', min:55, gpa:1.5 },
  { label:'1',   min:50, gpa:1   },
  { label:'0',   min:0,  gpa:0   },
];

export const CREDIT_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5];

export const CONDUCT_DEF = { presentScore:1, absentScore:-1, lateGroup:3, latePenalty:-1, minAttPct:20 };

// โทนสี
export const C = {
  red:    '#E53935',
  dark:   '#B71C1C',
  bg:     '#F8FAFC',
  card:   '#FFFFFF',
  border: '#E2E8F0',
  text:   '#1E293B',
  muted:  '#64748B',
  light:  '#FEF2F2',
  blue:   '#0284C7',
};

export const NAV = [
  { id:'home',     icon:'🏠', label:'หน้าหลัก'       },
  { id:'att',      icon:'✓',  label:'เช็คชื่อ'        },
  { id:'score',    icon:'📊', label:'คะแนน'           },
  { id:'stu',      icon:'👥', label:'นักเรียน'        },
  { id:'stat',     icon:'📈', label:'สถิติ'            },
  { id:'homeroom', icon:'🏫', label:'ประจำชั้น'       },
  { id:'io',       icon:'📥', label:'นำเข้า/ส่งออก'  },
  { id:'set',      icon:'⚙️', label:'ตั้งค่า'          },
];

// ข้อมูลสำหรับตารางสอน
export const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

export const PERIODS = [
  { id:1, time:'08.30-09.20' },
  { id:2, time:'09.20-10.10' },
  { id:3, time:'10.20-11.10' },
  { id:4, time:'11.10-12.00' },
  { id:5, time:'12.00-13.00', isLunch:true },
  { id:6, time:'13.00-13.50' },
  { id:7, time:'13.50-14.40' },
  { id:8, time:'14.40-15.30' },
  { id:9, time:'15.30-16.20' },
];

export const BLOOD_TYPES = ['A','B','AB','O','ไม่ทราบ'];
export const RELIGIONS   = ['พุทธ','คริสต์','อิสลาม','พราหมณ์-ฮินดู','อื่นๆ'];
export const MARITAL     = ['จดทะเบียนสมรส','หย่าร้าง','อยู่ด้วยกันแบบไม่จดทะเบียนสมรส','บิดาเสียชีวิต','มารดาเสียชีวิต'];
