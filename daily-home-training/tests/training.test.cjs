const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EXERCISES, BASE, targetLabel, adjustActual, addDays, TrainingModel } = require('../app/src/main/assets/training.js');

class MemoryStorage {
  value = '';
  load() { return this.value; }
  save(value) { this.value = value; }
}
function app(storage = new MemoryStorage(), now = new Date(2026, 8, 30, 10)) {
  return { model: new TrainingModel(storage, now), storage };
}

test('first launch exposes only the nine specified exercises and starting targets', () => {
  const { model } = app();
  const day = model.getDay('2026-09-30');
  assert.equal(EXERCISES.length, 9);
  assert.deepEqual(day.target, BASE);
  assert.equal(day.target.singleSquat, 5);
  assert.equal(day.target.sidePlank, 15);
  assert.equal(day.saved, false);
});

test('values survive reload; date navigation keeps separate daily entries', () => {
  const storage = new MemoryStorage();
  let { model } = app(storage);
  model.setActual('2026-09-30', 'squat', '12');
  model.saveDay('2026-09-30');
  model.setDate('2026-10-01');
  assert.equal(model.getDay('2026-10-01').target.squat, 11);
  model.setActual('2026-10-01', 'squat', '8');
  model.saveDay('2026-10-01');
  model.setDate('2026-09-30');
  assert.equal(model.getDay('2026-09-30').actual.squat, 12);
  assert.equal(model.getDay('2026-09-30').saved, true);
  model = app(storage).model;
  assert.equal(model.getDay('2026-09-30').actual.squat, 12);
  assert.equal(model.getDay('2026-10-01').actual.squat, 8);
  assert.equal(model.getDay('2026-10-02').target.squat, 11);
});

test('a saved successful day adds one; a missed target repeats unchanged', () => {
  const { model } = app();
  model.setActual('2026-09-30', 'pushups', '8');
  model.saveDay('2026-09-30');
  assert.equal(model.getDay('2026-10-01').target.pushups, 9);
  model.setActual('2026-10-01', 'pushups', '7');
  model.saveDay('2026-10-01');
  assert.equal(model.getDay('2026-10-02').target.pushups, 9);
});

test('an unsaved day or an empty missed day never compounds progression', () => {
  const { model } = app();
  model.setActual('2026-09-30', 'jacks', '40'); // not saved
  assert.equal(model.getDay('2026-10-01').target.jacks, 30);
  model.setDate('2026-10-04'); // three blank days
  assert.equal(model.getDay('2026-10-04').target.jacks, 30);
  model.setActual('2026-10-04', 'jacks', '30');
  model.saveDay('2026-10-04');
  assert.equal(model.getDay('2026-10-05').target.jacks, 35);
});

test('jumping jacks and knee taps add five; plank times add five seconds', () => {
  const { model } = app();
  for (const ex of EXERCISES) model.setActual('2026-09-30', ex.id, String(BASE[ex.id]));
  model.saveDay('2026-09-30');
  const tomorrow = model.getDay('2026-10-01').target;
  assert.equal(tomorrow.jacks, 35);
  assert.equal(tomorrow.kneeTaps, 35);
  assert.equal(tomorrow.plank, 25);
  assert.equal(tomorrow.sidePlank, 20);
  assert.equal(tomorrow.singleSquat, 6);
});

test('progression caps hold while actual amounts can exceed them', () => {
  const { model } = app();
  const capDate = '2026-09-30';
  let date = capDate;
  for (let day = 0; day < 100; day++) {
    const current = model.getDay(date);
    for (const ex of EXERCISES) model.setActual(date, ex.id, String(current.target[ex.id]));
    model.saveDay(date);
    date = require('../app/src/main/assets/training.js').addDays(date, 1);
  }
  const capped = model.getDay(date);
  for (const ex of EXERCISES) assert.equal(capped.target[ex.id], ex.cap);
  model.setActual(date, 'squat', '99');
  assert.equal(model.getDay(date).actual.squat, 99);
});

test('per-side entries use one-side targets and invalid values are ignored', () => {
  const { model } = app();
  assert.equal(EXERCISES.find(x => x.id === 'singleSquat').side, 'per leg');
  assert.equal(EXERCISES.find(x => x.id === 'sidePlank').side, 'per side');
  model.setActual('2026-09-30', 'singleSquat', '5');
  model.setActual('2026-09-30', 'sidePlank', '15');
  assert.equal(model.getDay('2026-09-30').actual.singleSquat, 5);
  assert.equal(model.getDay('2026-09-30').actual.sidePlank, 15);
  model.setActual('2026-09-30', 'squat', '-1');
  assert.equal(model.getDay('2026-09-30').actual.squat, null);
});

test('compact target language is correct and steppers clamp at zero', () => {
  assert.equal(targetLabel(EXERCISES.find(x => x.id === 'singleSquat'), 5), 'Target 5 / leg');
  assert.equal(targetLabel(EXERCISES.find(x => x.id === 'sidePlank'), 15), 'Target 15 sec / side');
  assert.equal(targetLabel(EXERCISES.find(x => x.id === 'squat'), 10), 'Target 10 reps');
  assert.equal(adjustActual(0, -1), 0);
  assert.equal(adjustActual(12, -1), 11);
  assert.equal(adjustActual(12, 1), 13);
});

test('tomorrow preview uses the saved progression and a failed target repeats', () => {
  const { model } = app();
  model.setActual('2026-09-30', 'squat', '10');
  model.saveDay('2026-09-30');
  assert.equal(model.getDay(addDays('2026-09-30', 1)).target.squat, 11);
  model.setActual('2026-10-01', 'squat', '9');
  model.saveDay('2026-10-01');
  assert.equal(model.getDay(addDays('2026-10-01', 1)).target.squat, 11);
});

test('compact screen has direct-entry fields, stepper buttons, completion, preview, and pinned save', () => {
  const html = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.css'), 'utf8');
  assert.match(html, /input\.type = 'number'/);
  assert.match(html, /Decrease \$\{ex\.name\}/);
  assert.match(html, /Increase \$\{ex\.name\}/);
  assert.match(html, /row\.classList\.toggle\('is-complete', complete\)/);
  assert.match(html, /model\.getDay\(TrainingModel\.addDays\(selectedDate, 1\)\)/);
  assert.match(html, /row\.append\(info, controls, preview\);\s*paintValue\(row, input, ex, day\.target\[ex\.id\], value\)/);
  assert.match(css, /\.bottom\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /padding-bottom:\s*78px/);
});
