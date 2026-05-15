import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { DEFAULT_CLASSES } from './constants';

// ===== DATA MODELS =====

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

export const profileCompletion = p => {
  if (!p) return 0;
  const req = ['idCard','birthday','bloodType','houseNo','province','fatherName','motherName','guardianPhone'];
  const filled = req.filter(k => p[k]?.toString().trim()).length;
  const photo = p.profilePhoto ? 1 : 0;
  const homePhotos = (p.homePhotos?.length || 0) >= 2 ? 1 : 0;
  return Math.round(((filled + photo + homePhotos) / (req.length + 2)) * 100);
};

export const calcSavings = s => {
  if (!s) return { total:0, goal:0, remaining:0, pct:0, daysLeft:0, dailyNeeded:0 };
  const entries = s.entries || [];
  const total = entries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const goal = parseFloat(s.goal) || 0;
  const remaining = Math.max(0, goal - total);
  const pct = goal > 0 ? Math.min(100, Math.round(total / goal * 100)) : 0;
  let daysLeft = 0, dailyNeeded = 0;
  if (s.goalDate) {
    daysLeft = Math.max(0, Math.ceil((new Date(s.goalDate + 'T00:00:00') - new Date()) / 86400000));
    dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  }
  return { total, goal, remaining, pct, daysLeft, dailyNeeded };
};

export const initData = () => ({
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
  conduct: { presentScore:1, absentScore:-1, lateGroup:3, latePenalty:-1, minAttPct:20 },
});

// ===== IMAGE UPLOAD =====
const isBase64 = s => typeof s === 'string' && s.startsWith('data:image');

const uploadImg = async (base64, path) => {
  try {
    const storage = getStorage();
    if (!storage) return base64;
    const r = ref(storage, path);
    await uploadString(r, base64, 'data_url');
    return await getDownloadURL(r);
  } catch (e) {
    console.error('Upload error:', e);
    return base64;
  }
};

export const processProfiles = async profiles => {
  const result = {};
  for (const [sid, profile] of Object.entries(profiles || {})) {
    const p = { ...profile };
    if (isBase64(p.profilePhoto)) {
      p.profilePhoto = await uploadImg(p.profilePhoto, `profiles/${sid}/photo.jpg`);
    }
    if (Array.isArray(p.homePhotos)) {
      p.homePhotos = await Promise.all(p.homePhotos.map(async (photo, idx) => {
        if (isBase64(photo)) return await uploadImg(photo, `profiles/${sid}/home_${idx}_${Date.now()}.jpg`);
        return photo;
      }));
    }
    result[sid] = p;
  }
  return result;
};
