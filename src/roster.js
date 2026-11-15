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

export function readRoster(sheetRows, classId, { requireRoom = false } = {}) {
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
  if (requireRoom && !hasClassValues) {
    throw new Error('ระบุห้องในคอลัมน์ห้องเรียน หรือเลือกชีตแยกสำหรับแต่ละห้อง');
  }
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

export function defaultRosterSheet(sheets, classId, multipleRooms = false) {
  const normalizeSheet = value => normalizeClass(value).replace(/[-_]/g, '/');
  return sheets.find(sheet => normalizeSheet(sheet.name) === normalizeSheet(classId))?.name
    || sheets.find(sheet => sheet.name === 'นักเรียน' || sheet.name === 'นักเรียนทั้งหมด')?.name
    || (multipleRooms && sheets.length > 1 ? '' : sheets[0].name);
}

export function previewClassRosters(sheets, rooms) {
  const sheetByName = new Map(sheets.map(sheet => [sheet.name, sheet]));
  const roomCounts = new Map();
  for (const { sheetName } of rooms) {
    roomCounts.set(sheetName, (roomCounts.get(sheetName) || 0) + 1);
  }

  return rooms.map(room => {
    try {
      const sheet = sheetByName.get(room.sheetName);
      if (!sheet) throw new Error('เลือกชีตที่มีรายชื่อของห้องนี้');
      const incoming = readRoster(sheet.rows, room.classId, { requireRoom: roomCounts.get(room.sheetName) > 1 });
      const currentIds = new Set(room.current.map(student => student.id));
      const incomingIds = new Set(incoming.map(student => student.id));
      const added = incoming.filter(student => !currentIds.has(student.id)).length;
      const removed = room.current.filter(student => !incomingIds.has(student.id)).length;
      return { ...room, incoming, added, removed };
    } catch (err) {
      return { ...room, error: err.message };
    }
  });
}

export function replaceClassRosters(students, rooms, pins) {
  const targets = new Set(rooms.map(room => room.classId));
  const otherStudents = students.filter(student => !targets.has(student.classId));
  const otherById = new Map(otherStudents.map(student => [student.id, student]));
  const currentById = new Map(students.map(student => [student.id, student]));
  const nextRoomById = new Map();
  const replacements = [];

  for (const { classId, incoming } of rooms) {
    for (const student of incoming) {
      const duplicateRoom = nextRoomById.get(student.id);
      if (duplicateRoom) {
        throw new Error(`รหัส ${student.id} ซ้ำในรายชื่อที่นำเข้า (${duplicateRoom} และ ${classId})`);
      }
      const conflict = otherById.get(student.id);
      if (conflict) {
        throw new Error(`รหัส ${student.id} อยู่ห้อง ${conflict.classId} กรุณาเลือกห้องเดิมด้วย หรือย้ายห้องในหน้ารายชื่อก่อน`);
      }
      const current = currentById.get(student.id);
      nextRoomById.set(student.id, classId);
      replacements.push({
        ...current,
        ...student,
        classId,
        pin: student.pin || current?.pin || pins.get(student.id),
      });
    }
  }

  return [...otherStudents, ...replacements];
}
