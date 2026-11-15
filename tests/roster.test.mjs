import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';
import { defaultRosterSheet, previewClassRosters, readRoster, replaceClassRosters } from '../src/roster.js';

const room = 'ม.5/2';
const readWorkbook = (workbook, sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  header: 1, raw: false, defval: '',
});

test('reads the selected room from Excel and preserves formatted student IDs and PINs', () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['รายชื่อเทอมใหม่'],
    ['เลขที่', 'เลขประจำตัวนักเรียน', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ห้องเรียน', 'PIN'],
    [1, 1, 'น.ส.', 'ตัวอย่าง', 'สอง', '5/2', 42],
    [1, 2, '', 'อีกห้อง', '', 'ม.5/3', ''],
  ]);
  sheet.B3.z = '00000';
  sheet.G3.z = '0000';
  XLSX.utils.book_append_sheet(workbook, sheet, 'นักเรียน');
  const saved = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const reloaded = XLSX.read(saved);
  assert.deepEqual(readRoster(readWorkbook(reloaded, 'นักเรียน'), room), [{
    id: '00001', name: 'น.ส. ตัวอย่าง สอง', number: 1, classId: room,
    pin: '0042', nickname: '', chineseName: '',
  }]);
});

test('reads a Thai CSV without a room column and rejects incomplete or duplicate rows', () => {
  const csv = 'รหัสนักเรียน,ชื่อ-สกุล\n001,ทดสอบ\n002,นักเรียนใหม่';
  const wb = XLSX.read(csv, { type: 'string', raw: true });
  const rows = readWorkbook(wb, wb.SheetNames[0]);
  assert.deepEqual(readRoster(rows, room).map(s => s.id), ['001', '002']);
  assert.throws(() => readRoster([...rows, ['001', 'ซ้ำ']], room), /ซ้ำ/);
  assert.throws(() => readRoster([...rows, ['003', '']], room), /แถวที่ 4/);
  assert.throws(() => readRoster([['รหัส', 'ชื่อ', 'ห้อง'], ['01', 'อีกห้อง', 'ม.5/3']], room), /ไม่พบรายชื่อ/);
});

test('replaces or clears a single room and rejects IDs belonging to another room', () => {
  const current = [
    { id: '001', classId: room, name: 'เดิม', pin: '0056' },
    { id: '002', classId: room, name: 'ย้ายออก' },
    { id: '003', classId: 'ม.5/3', name: 'อีกห้อง' },
  ];
  const incoming = [{ id: '001', name: 'ชื่อใหม่' }, { id: '004', name: 'เพิ่มใหม่' }];
  const pins = new Map([['004', '9999']]);
  assert.deepEqual(replaceClassRosters(current, [{ classId: room, incoming }], pins), [
    current[2],
    { id: '001', classId: room, name: 'ชื่อใหม่', pin: '0056' },
    { id: '004', classId: room, name: 'เพิ่มใหม่', pin: '9999' },
  ]);
  assert.deepEqual(replaceClassRosters(current, [{ classId: room, incoming: [] }], pins), [current[2]]);
  assert.throws(() => replaceClassRosters(current, [{ classId: room, incoming: [current[2]] }], pins), /อยู่ห้อง ม\.5\/3/);
});

test('previews multiple rooms in a shared sheet using the room column', () => {
  const sheets = [{ name: 'นักเรียน', rows: [
    ['รหัสนักเรียน', 'ชื่อ-สกุล', 'ห้อง'],
    ['001', 'ห้องสอง', '5/2'],
    ['004', 'ห้องสาม', 'ม. 5 / 3'],
    ['005', 'ห้องอื่น', 'ม.5/4'],
  ] }];
  const selections = [
    { classId: room, sheetName: 'นักเรียน', current: [{ id: '002' }] },
    { classId: 'ม.5/3', sheetName: 'นักเรียน', current: [{ id: '004' }] },
  ];
  const previews = previewClassRosters(sheets, selections);
  assert.deepEqual(previews.map(({ incoming, added, removed }) => [incoming.map(s => s.id), added, removed]), [
    [['001'], 1, 1], [['004'], 0, 0],
  ]);
  const missing = previewClassRosters(sheets, [...selections, {
    classId: 'ม.5/1', sheetName: 'นักเรียน', current: [{ id: '006' }],
  }]);
  assert.match(missing[2].error, /ไม่พบรายชื่อสำหรับห้อง/);
});

test('matches separate worksheets, and rejects reusing a sheet without room labels', () => {
  const sheets = [
    { name: 'ม.5-2', rows: [['รหัส', 'ชื่อ'], ['001', 'คนแรก']] },
    { name: '5_3', rows: [['รหัส', 'ชื่อ'], ['002', 'คนที่สอง']] },
  ];
  const selections = [room, 'ม.5/3'].map(classId => ({
    classId, sheetName: defaultRosterSheet(sheets, classId, true), current: [],
  }));
  assert.deepEqual(previewClassRosters(sheets, selections).map(room => room.incoming[0].id), ['001', '002']);
  const reused = [{ ...selections[1], sheetName: selections[0].sheetName }, selections[0]];
  assert.ok(previewClassRosters(sheets, reused).every(room => /ระบุห้องในคอลัมน์/.test(room.error)));
  assert.equal(defaultRosterSheet(sheets, 'ม.5/4', true), '');
});

test('moves a student between selected rooms while keeping the PIN and rejects duplicate IDs', () => {
  const first = { id: '001', classId: room, pin: '1234' };
  const untouched = { id: '002', classId: 'ม.5/4', pin: '3456' };
  const students = [first, untouched];
  const rooms = [
    { classId: room, incoming: [] },
    { classId: 'ม.5/3', incoming: [{ id: '001', name: 'ย้ายห้อง' }] },
  ];
  assert.deepEqual(replaceClassRosters(students, rooms, new Map()), [
    untouched, { ...first, classId: 'ม.5/3', name: 'ย้ายห้อง' },
  ]);
  assert.throws(() => replaceClassRosters(students, [
    { ...rooms[0], incoming: [first] }, rooms[1],
  ], new Map()), /ซ้ำในรายชื่อ/);
  assert.deepEqual(replaceClassRosters(students, rooms.map(room => ({ ...room, incoming: [] })), new Map()), [untouched]);
});
