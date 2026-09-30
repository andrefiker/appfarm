const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const TrainingApi = require('../app/src/main/assets/training.js');
const {
  MODEL_VERSION, EXERCISES, addDays, targetLabel, resultLabel, adjustActual, TrainingModel
} = TrainingApi;

class MemoryStorage {
  value = '';
  load() { return this.value; }
  save(value) { this.value = value; }
}
function app(storage = new MemoryStorage(), now = new Date(2026, 8, 30, 10)) {
  return { model: new TrainingModel(storage, now), storage };
}
function fillBaseline(model, date, results) {
  for (const [id, value] of Object.entries(results)) model.setActual(date, id, String(value));
  return model.saveDay(date);
}
function saveResult(model, date, id, value) {
  model.setActual(date, id, String(value));
  return model.saveDay(date);
}
function legacyStorage(records, startDate = '2026-09-01') {
  const storage = new MemoryStorage();
  storage.save(JSON.stringify({ schema: 1, startDate, records }));
  return storage;
}

class FakeElement {
  constructor(tagName = 'div') { this.tagName = tagName.toUpperCase(); this.children = []; this.listeners = {}; this.attributes = {}; this.dataset = {}; this.value = ''; this.className = ''; this._text = ''; this.hidden = false; }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = [...items]; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  fire(name, extra = {}) { const event = { target: this, ...extra }; for (const callback of this.listeners[name] || []) callback(event); }
  click() { this.fire('click'); }
  focus() {}
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text; }
  get classList() {
    const element = this;
    return {
      toggle(name, force) {
        const names = new Set(element.className.split(/\s+/).filter(Boolean));
        if (force) names.add(name); else names.delete(name);
        element.className = [...names].join(' ');
      },
      contains(name) { return element.className.split(/\s+/).includes(name); }
    };
  }
  querySelector(selector) {
    const wanted = selector.slice(1);
    for (const child of this.children) {
      if (child.className.split(/\s+/).includes(wanted)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}

test('the product contains exactly the nine specified exercises', () => {
  assert.deepEqual(EXERCISES.map(ex => ex.name), [
    'Jumping jacks', 'Full squat', 'Assisted single-leg squat',
    'Standing calf raise', 'Normal push-ups', 'Glute bridge',
    'Front plank', 'Side plank', 'Knee taps / high knees'
  ]);
  assert.equal(EXERCISES.length, 9);
  assert.equal(EXERCISES.some(ex => /backpack row/i.test(ex.name)), false);
});

test('fresh install starts with a target-free baseline', () => {
  const { model } = app();
  const day = model.getDay('2026-09-30');
  assert.equal(day.baseline, true);
  assert.equal(day.saved, false);
  assert.ok(Object.values(day.target).every(value => value == null));
  assert.ok(Object.values(day.actual).every(value => value == null));
  assert.equal(model.data.progressionModelVersion, MODEL_VERSION);
});

test('baseline actual 10 becomes next target 11', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 10 });
  const next = model.getDay('2026-10-01');
  assert.equal(next.baseline, false);
  assert.equal(next.lastActual.squat, 10);
  assert.equal(next.target.squat, 11);
});

test('last actual 17 becomes 18 regardless of the old target', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 17 });
  assert.equal(model.getDay('2026-10-01').target.squat, 18);
});

test('a result below the previous goal drives next goal from actual 8 to 9', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 14 });
  assert.equal(model.getDay('2026-10-01').target.squat, 15);
  saveResult(model, '2026-10-01', 'squat', 8);
  assert.equal(model.getDay('2026-10-02').target.squat, 9);
});

test('an above-goal result 20 becomes 21', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 14 });
  saveResult(model, '2026-10-01', 'squat', 20);
  assert.equal(model.getDay('2026-10-02').target.squat, 21);
});

test('plank and jumping jacks both increase by exactly one', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { plank: 30, jacks: 30 });
  const next = model.getDay('2026-10-01').target;
  assert.equal(next.plank, 31);
  assert.equal(next.jacks, 31);
});

test('one or several missed calendar days do not change a target', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 14 });
  assert.equal(model.getDay('2026-10-01').target.squat, 15);
  assert.equal(model.getDay('2026-10-05').target.squat, 15);
  assert.equal(model.getDay('2026-10-05').lastActual.squat, 14);
});

test('a blank exercise retains its last result while entered exercises advance', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 12, pushups: 8 });
  model.saveDay('2026-10-01'); // both blank
  const next = model.getDay('2026-10-02');
  assert.equal(next.target.squat, 13);
  assert.equal(next.target.pushups, 9);
});

test('explicit zero is a result and makes the next target one', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 0 });
  assert.equal(model.getDay('2026-10-01').lastActual.squat, 0);
  assert.equal(model.getDay('2026-10-01').target.squat, 1);
});

test('single-leg squat and side plank each progress by one per side', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { singleSquat: 6, sidePlank: 22 });
  const next = model.getDay('2026-10-01');
  assert.equal(next.target.singleSquat, 7);
  assert.equal(next.target.sidePlank, 23);
  assert.equal(targetLabel(EXERCISES.find(ex => ex.id === 'singleSquat'), 7, 6), 'Last 6 / leg  →  Goal 7 / leg');
  assert.equal(targetLabel(EXERCISES.find(ex => ex.id === 'sidePlank'), 23, 22), 'Last 22 sec / side  →  Goal 23 sec / side');
  assert.equal(resultLabel(EXERCISES.find(ex => ex.id === 'sidePlank'), 22), '22 sec / side');
});

test('v1 migration preserves saved history but resets the active engine for one baseline', () => {
  const storage = legacyStorage({
    '2026-09-29': { target: { squat: 40, jacks: 100 }, actual: { squat: 9, jacks: 30 }, saved: true }
  });
  const { model } = app(storage);
  const old = model.getDay('2026-09-29');
  const baseline = model.getDay('2026-09-30');
  assert.equal(old.saved, true);
  assert.equal(old.actual.squat, 9);
  assert.equal(old.target.squat, 40); // retained for historical display only
  assert.equal(baseline.baseline, true);
  assert.equal(baseline.target.squat, null); // old target 40 cannot control the new model
  assert.equal(model.data.baselinePending, true);
});

test('v1.2 schema migration requests exactly one new baseline and preserves old records', () => {
  const storage = new MemoryStorage();
  storage.save(JSON.stringify({
    schema: 2, progressionModelVersion: 2, startDate: '2026-09-01', migrationDate: '2026-09-01',
    baselinePending: false, baselineDate: '2026-09-02',
    records: { '2026-09-29': { actual: { squat: 18 }, saved: true, targetAtTime: { squat: 18 }, lastAtTime: { squat: 17 }, baseline: false } }
  }));
  let model = app(storage).model;
  assert.equal(model.data.baselinePending, true);
  assert.equal(model.getDay('2026-09-29').actual.squat, 18);
  assert.equal(model.getDay('2026-09-30').baseline, true);
  assert.equal(model.getDay('2026-09-30').target.squat, null);
  fillBaseline(model, '2026-09-30', { squat: 6 });
  model = app(storage).model;
  assert.equal(model.data.baselinePending, false);
  assert.equal(model.getDay('2026-10-01').target.squat, 7);
});

test('migration is persisted once; restart keeps the completed baseline and +1 target', () => {
  const storage = legacyStorage({
    '2026-09-29': { target: { squat: 40 }, actual: { squat: 9 }, saved: true }
  });
  let model = app(storage).model;
  fillBaseline(model, '2026-09-30', { squat: 4 });
  assert.equal(model.data.baselinePending, false);
  model = app(storage).model;
  assert.equal(model.data.baselinePending, false);
  assert.equal(model.getDay('2026-09-30').baseline, true);
  assert.equal(model.getDay('2026-10-01').target.squat, 5);
});

test('blank baseline exercise retains legacy last actual; typed baseline result replaces it', () => {
  const storage = legacyStorage({
    '2026-09-28': { target: { squat: 10 }, actual: { squat: 9, pushups: 6 }, saved: true }
  });
  const { model } = app(storage);
  fillBaseline(model, '2026-09-30', { pushups: 3 });
  const next = model.getDay('2026-10-01');
  assert.equal(next.target.squat, 10); // blank: keep the previous actual 9
  assert.equal(next.target.pushups, 4); // baseline actual 3 is newer
});

test('restart preserves a normal saved result and the next target', () => {
  const storage = new MemoryStorage();
  let model = app(storage).model;
  fillBaseline(model, '2026-09-30', { squat: 10 });
  saveResult(model, '2026-10-01', 'squat', 17);
  model = app(storage).model;
  assert.equal(model.getDay('2026-10-02').target.squat, 18);
  assert.equal(model.getDay('2026-10-01').actual.squat, 17);
});

test('there are no old targets, +5 steps, or progression caps', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { jacks: 30, plank: 120 });
  assert.equal(model.getDay('2026-10-01').target.jacks, 31);
  assert.equal(model.getDay('2026-10-01').target.plank, 121);
  saveResult(model, '2026-10-01', 'jacks', 1000);
  assert.equal(model.getDay('2026-10-02').target.jacks, 1001);
  assert.equal('cap' in EXERCISES[0], false);
  assert.ok(EXERCISES.every(ex => !('start' in ex) && !('step' in ex) && !('cap' in ex)));
});

test('navigation is stable and saved target snapshots do not change', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 10 });
  saveResult(model, '2026-10-01', 'squat', 14);
  saveResult(model, '2026-10-02', 'squat', 15);
  model.setDate('2026-09-30');
  assert.equal(model.getDay(model.selectedDate).actual.squat, 10);
  model.shiftDate(1);
  assert.equal(model.selectedDate, '2026-10-01');
  assert.equal(model.getDay(model.selectedDate).target.squat, 11);
  model.shiftDate(1);
  assert.equal(model.getDay(model.selectedDate).target.squat, 15);
});

test('editing an old result updates that record without rewriting later saved sessions', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 10 });
  saveResult(model, '2026-10-01', 'squat', 14);
  saveResult(model, '2026-10-02', 'squat', 15);
  model.setActual('2026-09-30', 'squat', '999');
  assert.equal(model.getDay('2026-10-01').target.squat, 11);
  assert.equal(model.getDay('2026-10-02').target.squat, 15);
  assert.equal(model.getDay('2026-10-03').target.squat, 16); // follows latest saved result
});

test('blank and intentional zero are distinguishable in storage', () => {
  const { model, storage } = app();
  model.setActual('2026-09-30', 'squat', '0');
  model.saveDay('2026-09-30');
  const saved = JSON.parse(storage.load());
  assert.equal(saved.records['2026-09-30'].actual.squat, 0);
  assert.equal(saved.records['2026-09-30'].actual.pushups, null);
  assert.equal(model.getDay('2026-10-01').target.squat, 1);
  assert.equal(model.getDay('2026-10-01').target.pushups, null);
});

test('empty plus starts at one and minus never goes below zero', () => {
  assert.equal(adjustActual('', 1), 1);
  assert.equal(adjustActual('', -1), null);
  assert.equal(adjustActual(0, -1), 0);
  assert.equal(adjustActual(13, 1), 14);
  assert.equal(adjustActual(13, -1), 12);
});

test('custom exercise add, edit, remove, restore, and persistence preserve its progression', () => {
  const { model, storage } = app();
  fillBaseline(model, '2026-09-30', { squat: 10 });
  const custom = model.addExercise({ name: 'Wall sit', unit: 'sec', side: null });
  assert.equal(model.getExercises().length, 10);
  model.setActual('2026-09-30', custom.id, '22');
  model.saveDay('2026-09-30');
  assert.equal(model.getDay('2026-10-01').target[custom.id], 23);
  model.editExercise(custom.id, { name: 'Wall squat hold', unit: 'sec', side: null });
  assert.equal(model.getExercises().find(ex => ex.id === custom.id).name, 'Wall squat hold');
  assert.equal(model.removeExercise(custom.id), true);
  assert.equal(model.getExercises().some(ex => ex.id === custom.id), false);
  assert.equal(model.getRemovedExercises().some(ex => ex.id === custom.id), true);
  let restarted = new TrainingModel(storage, new Date(2026, 9, 1, 10));
  assert.equal(restarted.getRemovedExercises().some(ex => ex.id === custom.id), true);
  restarted.restoreExercise(custom.id);
  assert.equal(restarted.getDay('2026-10-01').target[custom.id], 23);
  assert.equal(restarted.data.records['2026-09-30'].actual[custom.id], 22);
});

test('changing exercise unit keeps past snapshots but starts a fresh target lineage', () => {
  const { model } = app();
  fillBaseline(model, '2026-09-30', { squat: 18 });
  model.editExercise('squat', { name: 'Full squat', unit: 'sec', side: null });
  assert.equal(model.getDay('2026-10-01').target.squat, null);
  model.setActual('2026-10-01', 'squat', '25');
  model.saveDay('2026-10-01');
  assert.equal(model.getDay('2026-10-02').target.squat, 26);
  assert.equal(model.getDay('2026-09-30').target.squat, null);
});

test('compact screen includes target tap, progress count, haptics, reduced motion, and pinned save', () => {
  const html = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.css'), 'utf8');
  const java = fs.readFileSync(path.join(__dirname, '../app/src/main/java/com/andrefiker/dailyhometraining/MainActivity.java'), 'utf8');
  assert.match(html, /input\.type\s*=\s*'number'/);
  assert.match(html, /target\.addEventListener\('click'/);
  assert.match(html, /countEl\.textContent=`\$\{n\}\/\$\{total\}`/);
  assert.match(html, /model\.addExercise\(detail\)/);
  assert.match(html, /model\.editExercise\(editingId,detail\)/);
  assert.match(html, /model\.removeExercise\(ex\.id\)/);
  assert.match(html, /model\.restoreExercise\(ex\.id\)/);
  assert.match(html, /haptic\('tick'\)/);
  assert.match(html, /haptic\('saved'\)/);
  assert.match(html, /SAVE/);
  assert.match(css, /\.bottom\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(java, /HapticFeedbackConstants\.KEYBOARD_TAP/);
  assert.match(java, /HapticFeedbackConstants\.CONFIRM/);
});

test('Android launcher icon is configured and release version is incremented', () => {
  const base = path.join(__dirname, '../app/src/main');
  const manifest = fs.readFileSync(path.join(base, 'AndroidManifest.xml'), 'utf8');
  const gradle = fs.readFileSync(path.join(__dirname, '../app/build.gradle'), 'utf8');
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher"/);
  assert.match(gradle, /versionCode 4/);
  assert.match(gradle, /versionName '1\.3\.0'/);
  for (const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']) {
    assert.ok(fs.existsSync(path.join(base, `res/mipmap-${density}/ic_launcher.png`)));
    assert.ok(fs.existsSync(path.join(base, `res/mipmap-${density}/ic_launcher_foreground.png`)));
  }
  assert.ok(fs.existsSync(path.join(base, 'res/mipmap-anydpi-v26/ic_launcher.xml')));
});

test('screen renders and target tap, steppers, baseline save, and next-day goal work together', () => {
  const html = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.html'), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const ids = ['date','count','exercise-list','save-status','previous','next','save','manage','manager','close-manager','manager-active','manager-removed','removed-wrap','add-exercise','editor','exercise-form','editor-title','exercise-name','exercise-unit','exercise-side','editor-error','cancel-editor','cancel-editor-x'];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement(id === 'save' || id === 'previous' || id === 'next' ? 'button' : 'div')]));
  const storage = new MemoryStorage();
  const haptics = { tick: 0, saved: 0 };
  const bridge = {
    load: () => storage.load(),
    save: value => storage.save(value),
    tick: () => haptics.tick++,
    saved: () => haptics.saved++
  };
  const document = {
    getElementById: id => elements[id],
    createElement: tag => new FakeElement(tag)
  };
  vm.runInNewContext(inline, {
    document,
    window: { LocalLedger: bridge },
    TrainingModel: TrainingApi,
    Intl,
    setTimeout: () => 1,
    clearTimeout: () => {}
  });

  assert.equal(elements['exercise-list'].children.length, 9);
  assert.match(elements['exercise-list'].children[0].querySelector('.target-line').textContent, /Baseline/);
  const squat = elements['exercise-list'].children[1];
  const squatInput = squat.children[1].children[1];
  squat.children[1].children[2].click(); // empty + becomes 1
  assert.equal(squatInput.value, '1');
  assert.equal(elements.count.textContent, '1/9');
  assert.equal(haptics.tick, 1);
  squatInput.value = '10';
  squatInput.fire('input');
  elements.save.click();
  assert.match(elements['save-status'].textContent, /SAVED/);
  assert.equal(haptics.saved, 1);
  elements.next.click();
  const nextSquat = elements['exercise-list'].children[1];
  assert.match(nextSquat.querySelector('.target-line').textContent, /Last 10\s+→\s+Goal 11/);
  nextSquat.querySelector('.target-line').click();
  assert.equal(nextSquat.children[1].children[1].value, '11');
  assert.equal(nextSquat.classList.contains('is-complete'), true);
  nextSquat.children[1].children[0].click();
  assert.equal(nextSquat.children[1].children[1].value, '10');
  assert.equal(nextSquat.classList.contains('is-complete'), false);

  elements.manage.click();
  assert.equal(elements.manager.hidden, false);
  assert.equal(elements['manager-active'].children.length, 9);
  elements['add-exercise'].click();
  elements['exercise-name'].value = 'Wall sit';
  elements['exercise-unit'].value = 'sec';
  elements['exercise-form'].fire('submit', { preventDefault() {} });
  assert.equal(elements['manager-active'].children.length, 10);
  const customRow = elements['manager-active'].children[9];
  customRow.children[1].click();
  elements['exercise-name'].value = 'Wall hold';
  elements['exercise-form'].fire('submit', { preventDefault() {} });
  assert.equal(elements['manager-active'].children[9].children[0].textContent, 'Wall hold');
  const remove = elements['manager-active'].children[9].children[2];
  remove.click();
  remove.click();
  assert.equal(elements['manager-active'].children.length, 9);
  assert.equal(elements['manager-removed'].children.length, 1);
  elements['manager-removed'].children[0].children[1].click();
  assert.equal(elements['manager-active'].children.length, 10);
  assert.equal(elements['exercise-list'].children.length, 10);
});
