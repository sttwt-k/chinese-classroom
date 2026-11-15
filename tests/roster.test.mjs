import assert from 'node:assert/strict';
import test from 'node:test';
import XLSX from 'xlsx';
import { readRoster, replaceClassRoster } from '../src/roster.js';

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
  assert.deepEqual(replaceClassRoster(current, room, incoming, pins), [
    current[2],
    { id: '001', classId: room, name: 'ชื่อใหม่', pin: '0056' },
    { id: '004', classId: room, name: 'เพิ่มใหม่', pin: '9999' },
  ]);
  assert.deepEqual(replaceClassRoster(current, room, [], pins), [current[2]]);
  assert.throws(() => replaceClassRoster(current, room, [current[2]], pins), /อยู่ห้อง ม\.5\/3/);
});
