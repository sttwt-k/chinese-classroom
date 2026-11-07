import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getConductPoints, getScoreSummary, getSubjectGrade, buildAttendanceSummary } from '../src/utils.js';
import { CONDUCT_DEF } from '../src/constants.js';
const record = (status, extra = {}) => ({ studentId:'a', subjectId:'cn', type:'class', date:'2026-11-07', period:1, status, ...extra });
const data = { categories:[{ id:'c', subjectId:'cn', max:95 }], scores:[{ studentId:'a', categoryId:'c', score:75, term:1, year:2569 }], attendance:[record('present')], conduct:CONDUCT_DEF, term:1, year:2569 };
test('attendance converts to 0–5, isolates student/subject/morning and handles no data', () => {
  assert.equal(getConductPoints('a', [], CONDUCT_DEF, 'cn'), null);
  assert.equal(getConductPoints('a', [record('present')], CONDUCT_DEF, 'cn'), 5);
  assert.equal(getConductPoints('a', [record('absent')], CONDUCT_DEF, 'cn'), 0);
  assert.equal(getConductPoints('a', [...Array.from({length:3}, () => record('present')), record('absent')], CONDUCT_DEF, 'cn'), 2.5);
  assert.equal(getConductPoints('a', [record('present'), record('absent', {type:'morning'}), record('absent', {subjectId:'other'}), record('absent', {studentId:'b'})], CONDUCT_DEF, 'cn'), 5);
  assert.equal(getConductPoints('a', [record('present')], {...CONDUCT_DEF, presentScore:0}, 'cn'), null);
});
test('late groups, custom statuses and rounding follow existing conduct rules', () => {
  const att = [...Array.from({length:7}, () => record('present')), ...Array.from({length:3}, () => record('late'))];
  assert.equal(getConductPoints('a', att, CONDUCT_DEF, 'cn'), 3);
  assert.equal(getConductPoints('a', [record('leave_s', {customScore:1})], CONDUCT_DEF, 'cn'), 5);
  assert.equal(getConductPoints('a', [record('activity', {customScore:-1})], CONDUCT_DEF, 'cn'), 0);
  assert.equal(getConductPoints('a', [record('present'), record('present'), record('late')], CONDUCT_DEF, 'cn'), 3.33);
});
test('conduct contributes once to totals and grades; term and year records remain isolated', () => {
  assert.deepEqual(getScoreSummary('a', 'cn', data), {conductPoints:5,total:80,max:100,has:true});
  assert.equal(getSubjectGrade('a', {id:'cn'}, data.categories, data.scores, 1, 2569, data.attendance, CONDUCT_DEF).label, '4');
  assert.equal(getScoreSummary('a','cn', {...data, attendance:[...data.attendance, record('absent', {term:2,year:2569}), record('absent', {term:1,year:2568})]}).total, 80);
  assert.equal(getScoreSummary('a','cn', {...data, attendance:[], scores:[]}).has, false);
});
test('summary separates date, period, type and unmarked students without sharing private notes', () => {
  const students = [{id:'a',number:1,name:'นักเรียน ก'}, {id:'b',number:2,name:'นักเรียน ข'}, {id:'c',number:3,name:'นักเรียน ค'}];
  const attendance = [record('absent',{note:'PRIVATE'}),record('present',{studentId:'b'}),record('present',{studentId:'c',period:2}),record('present',{type:'morning'})];
  const args = {students, attendance, date:'2026-11-07', type:'class', classId:'ม.1/1', subject:{id:'cn',name:'จีน'},period:1};
  const summary = buildAttendanceSummary(args);
  assert.match(summary,/ขาด 1 คน/); assert.match(summary,/มา 1 คน/); assert.match(summary,/ยังไม่ได้เช็ค 1 คน/);
  assert.match(summary,/เลขที่ 1 นักเรียน ก/); assert.match(summary,/คาบ 1/); assert.doesNotMatch(summary,/PRIVATE/);
  const morning = buildAttendanceSummary({...args,type:'morning'});
  assert.match(morning,/เข้าแถว/); assert.match(morning,/ขาด 0 คน/); assert.doesNotMatch(morning,/คาบ 1/);
  assert.match(buildAttendanceSummary({...args,date:'2026-11-08'}),/ยังไม่ได้เช็ค 3 คน/);
});
