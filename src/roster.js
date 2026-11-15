const columns = {
  id: ['รหัสนักเรียน', 'เลขประจำตัวนักเรียน', 'เลขประจำตัว', 'รหัส'],
  name: ['ชื่อ-สกุล', 'ชื่อ-นามสกุล', 'ชื่อสกุล', 'ชื่อและนามสกุล', 'ชื่อ'],
  surname: ['นามสกุล', 'สกุล'],
  prefix: ['คำนำหน้า', 'คำนำหน้าชื่อ'],
  number: ['เลขที่', 'ลำดับ'],
  classId: ['ห้อง', 'ห้องเรียน', 'ชั้น/ห้อง', 'ระดับชั้น/ห้อง'],
  nickname: ['ชื่อเล่น'],
  chineseName: ['ชื่อภาษาจีน', 'ชื่อจีน'],
  pin: ['pin'],
};

const cellText = value => String(value ?? '').trim();
const normalizeHeader = value => cellText(value).toLowerCase().replace(/[\s–—-]/g, '');
const normalizeClass = value => cellText(value).replace(/\s/g, '').replace(/^ม\.?(?=\d)/, '');

export function readRoster(sheetRows, classId) {
  const headerIndex = sheetRows.findIndex(row => {
    const keys = row.map(normalizeHeader);
    return columns.id.some(key => keys.includes(normalizeHeader(key))) &&
      columns.name.some(key => keys.includes(normalizeHeader(key)));
  });
  if (headerIndex < 0) throw new Error('ไม่พบคอลัมน์รหัสนักเรียนและชื่อ-สกุล');

  const headers = sheetRows[headerIndex].map(normalizeHeader);
  const indices = Object.fromEntries(Object.entries(columns).map(([field, labels]) => [
    field, labels.map(normalizeHeader).map(label => headers.indexOf(label)).find(index => index >= 0) ?? -1,
  ]));
  const rows = sheetRows.slice(headerIndex + 1)
    .map((row, index) => ({ row, line: headerIndex + index + 2 }))
    .filter(({ row }) => row.some(value => cellText(value)));
  const target = normalizeClass(classId);
  const hasClassValues = rows.some(({ row }) => cellText(row[indices.classId]));
  const ids = new Set();
  const students = [];

  for (const { row, line } of rows) {
    const get = field => cellText(row[indices[field]]);
    const room = normalizeClass(get('classId'));
    if (room && room !== target) continue;
    if (!room && hasClassValues) throw new Error(`แถวที่ ${line} ไม่ระบุห้องเรียน`);

    const id = get('id');
    const firstName = get('name');
    const name = [get('prefix'), firstName, get('surname')].filter(Boolean).join(' ');
    if (!id || !firstName || /\//.test(id) || id === '__proto__') {
      throw new Error(`แถวที่ ${line} มีรหัสนักเรียนหรือชื่อไม่ถูกต้อง`);
    }
    if (ids.has(id)) throw new Error(`รหัสนักเรียนซ้ำในไฟล์ (แถวที่ ${line})`);

    const number = get('number');
    if (number && (!/^\d+$/.test(number) || Number(number) < 1)) {
      throw new Error(`เลขที่ในแถวที่ ${line} ไม่ถูกต้อง`);
    }
    const pin = get('pin');
    if (pin && !/^\d{4}$/.test(pin)) throw new Error(`PIN ในแถวที่ ${line} ต้องมี 4 หลัก`);

    ids.add(id);
    students.push({
      id, name, classId, pin,
      number: number ? Number(number) : null,
      nickname: get('nickname'),
      chineseName: get('chineseName'),
    });
  }

  if (!students.length) throw new Error(`ไม่พบรายชื่อสำหรับห้อง ${classId} ในไฟล์นี้`);
  return students;
}

export function replaceClassRoster(students, classId, incoming, pins) {
  const otherStudents = students.filter(student => student.classId !== classId);
  const otherById = new Map(otherStudents.map(student => [student.id, student]));
  const currentById = new Map(students.map(student => [student.id, student]));

  const replacements = incoming.map(student => {
    const conflict = otherById.get(student.id);
    if (conflict) {
      throw new Error(`รหัส ${student.id} อยู่ห้อง ${conflict.classId} กรุณาย้ายห้องในหน้ารายชื่อก่อน`);
    }
    const current = currentById.get(student.id);
    return {
      ...current,
      ...student,
      classId,
      pin: student.pin || current?.pin || pins.get(student.id),
    };
  });

  return [...otherStudents, ...replacements];
}
