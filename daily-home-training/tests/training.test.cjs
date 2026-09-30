const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const API = require('../app/src/main/assets/training.js');
const { MODEL_VERSION, DATA_SCHEMA, EXERCISES, targetLabel, resultLabel, adjustActual, TrainingModel } = API;

class MemoryStorage {
  value = '';
  load() { return this.value; }
  save(value) { this.value = value; }
}
const at = (day, storage = new MemoryStorage()) => new TrainingModel(storage, new Date(`${day}T12:00:00`));
const record = (model, date, results) => {
  for (const [id, value] of Object.entries(results)) model.setActual(date, id, String(value));
  return model.finishDay(date);
};

test('fresh install has exactly the nine defaults and independent blank baselines', () => {
  const model = at('2026-09-30');
  assert.deepEqual(model.getExercises().map(ex => ex.name), [
    'Jumping jacks', 'Full squat', 'Assisted single-leg squat', 'Standing calf raise',
    'Normal push-ups', 'Glute bridge', 'Front plank', 'Side plank', 'Knee taps / high knees'
  ]);
  assert.equal(model.getExercises().some(ex => /backpack|row/i.test(ex.name)), false);
  const day = model.getDay('2026-09-30');
  assert.ok(model.getExercises().every(ex => day.target[ex.id] === null && day.baselineByExercise[ex.id]));
  assert.ok(model.getExercises().every(ex => day.actual[ex.id] === null));
  assert.equal(day.completed, false);
  assert.equal(model.data.schema, DATA_SCHEMA);
  assert.equal(model.data.progressionModelVersion, MODEL_VERSION);
  assert.equal('baselinePending' in model.data, false);
});

test('a partial session establishes a baseline only for exercises with actual results', () => {
  const model = at('2026-09-30');
  model.setActual('2026-09-30', 'squat', '10');
  model.setActual('2026-09-30', 'pushups', '7');
  assert.equal(model.completedCount('2026-09-30'), 2);
  assert.equal(model.getDay('2026-09-30').target.squat, null);
  const finished = model.finishDay('2026-09-30');
  assert.equal(finished.completed, true);
  assert.equal(finished.baselineByExercise.squat, true);
  assert.equal(finished.actual.plank, null);
  const tomorrow = at('2026-10-01', model.storage).getDay('2026-10-01');
  assert.equal(tomorrow.target.squat, 11);
  assert.equal(tomorrow.target.pushups, 8);
  assert.equal(tomorrow.target.plank, null);
  assert.equal(tomorrow.baselineByExercise.plank, true);
  assert.equal(tomorrow.baselineByExercise.squat, false);
});

test('each exercise can establish its baseline on a different completed day', () => {
  const model = at('2026-10-02');
  record(model, '2026-09-30', { squat: 12 });
  record(model, '2026-10-01', { plank: 30 });
  const day = model.getDay('2026-10-02');
  assert.equal(day.target.squat, 13);
  assert.equal(day.target.plank, 31);
  assert.equal(day.target.jacks, null);
  assert.equal(targetLabel(EXERCISES[0], day.target.jacks, day.lastActual.jacks), 'Baseline');
});

test('all exercises use actual +1, even below and above their goal', () => {
  const model = at('2026-10-04');
  record(model, '2026-09-30', { squat: 14, pushups: 14, plank: 30, jacks: 30 });
  assert.equal(model.getDay('2026-10-01').target.squat, 15);
  record(model, '2026-10-01', { squat: 8, pushups: 20, plank: 31, jacks: 31 });
  const next = model.getDay('2026-10-02').target;
  assert.equal(next.squat, 9);
  assert.equal(next.pushups, 21);
  assert.equal(next.plank, 32);
  assert.equal(next.jacks, 32);
  record(model, '2026-10-02', { jacks: 1000, plank: 120 });
  assert.equal(model.getDay('2026-10-03').target.jacks, 1001);
  assert.equal(model.getDay('2026-10-03').target.plank, 121);
});

test('blank is not zero and does not replace a previous performance', () => {
  const model = at('2026-10-03');
  record(model, '2026-09-30', { squat: 12, pushups: 8 });
  record(model, '2026-10-01', { squat: 0 });
  const saved = JSON.parse(model.storage.load());
  assert.equal(saved.records['2026-10-01'].actual.squat, 0);
  assert.equal(saved.records['2026-10-01'].actual.pushups, null);
  assert.equal(model.completedCount('2026-10-01'), 1);
  assert.equal(model.getDay('2026-10-02').target.squat, 1);
  assert.equal(model.getDay('2026-10-02').target.pushups, 9);
  assert.equal(model.getDay('2026-10-02').target.plank, null);
});

test('missed days do nothing to the last-result goal', () => {
  const model = at('2026-10-10');
  record(model, '2026-09-30', { squat: 14 });
  assert.equal(model.getDay('2026-10-01').target.squat, 15);
  assert.equal(model.getDay('2026-10-10').target.squat, 15);
  record(model, '2026-10-03', {});
  assert.equal(model.getDay('2026-10-10').target.squat, 15);
});

test('draft values survive restart without finishing the workout', () => {
  const storage = new MemoryStorage();
  let model = at('2026-09-30', storage);
  model.setActual('2026-09-30', 'squat', '0');
  model.setActual('2026-09-30', 'plank', '30');
  model = at('2026-09-30', storage);
  const draft = model.getDay('2026-09-30');
  assert.equal(draft.completed, false);
  assert.equal(draft.actual.squat, 0);
  assert.equal(draft.actual.plank, 30);
  assert.equal(draft.actual.pushups, null);
  assert.equal(model.completedCount('2026-09-30'), 2);
  assert.equal(model.getDay('2026-10-01').target.squat, null); // draft is not progression history
  model.finishDay('2026-09-30');
  model = at('2026-10-01', storage);
  assert.equal(model.getDay('2026-09-30').completed, true);
  assert.equal(model.getDay('2026-10-01').target.squat, 1);
  assert.equal(model.getDay('2026-10-01').target.plank, 31);
});

test('completed history is locked until explicitly unlocked, then locks again', () => {
  const model = at('2026-10-03');
  record(model, '2026-09-30', { squat: 10 });
  assert.equal(model.getDay('2026-09-30').locked, true);
  assert.throws(() => model.setActual('2026-09-30', 'squat', '11'), /Unlock/);
  model.unlockDay('2026-09-30');
  assert.equal(model.getDay('2026-09-30').editing, true);
  model.setActual('2026-09-30', 'squat', '14');
  model.finishDay('2026-09-30');
  assert.equal(model.getDay('2026-09-30').locked, true);
  assert.equal(model.getDay('2026-09-30').actual.squat, 14);
  model.unlockDay('2026-09-30');
  model.setDate('2026-10-01');
  assert.equal(model.getDay('2026-09-30').locked, true);
});

test('historical edits leave later completed snapshots intact while future drafts use latest actual', () => {
  const model = at('2026-10-03');
  record(model, '2026-09-30', { squat: 10 });
  record(model, '2026-10-01', { squat: 14 });
  record(model, '2026-10-02', { squat: 15 });
  const oldTarget = model.getDay('2026-10-01').target.squat;
  model.unlockDay('2026-09-30');
  model.setActual('2026-09-30', 'squat', '999');
  model.finishDay('2026-09-30');
  assert.equal(model.getDay('2026-10-01').target.squat, oldTarget);
  assert.equal(model.getDay('2026-10-02').target.squat, 15);
  assert.equal(model.getDay('2026-10-03').target.squat, 16);
  assert.equal(model.getDay('2026-09-30').target.squat, null);
});

test('future navigation stops at today, and future entry and FINISH are blocked', () => {
  const model = at('2026-09-30');
  assert.equal(model.shiftDate(1).date, '2026-09-30');
  assert.equal(model.selectedDate, '2026-09-30');
  assert.equal(model.setDate('2026-10-10').date, '2026-09-30');
  assert.throws(() => model.setActual('2026-10-01', 'squat', '9'), /Future/);
  assert.throws(() => model.finishDay('2026-10-01'), /Future/);
  assert.equal(model.data.records['2026-10-01'], undefined);
  model.shiftDate(-1);
  assert.equal(model.selectedDate, '2026-09-29');
  model.shiftDate(1);
  assert.equal(model.selectedDate, '2026-09-30');
});

test('per-leg and per-side results progress by one with natural units', () => {
  const model = at('2026-10-01');
  record(model, '2026-09-30', { singleSquat: 6, sidePlank: 22 });
  const day = model.getDay('2026-10-01');
  assert.equal(day.target.singleSquat, 7);
  assert.equal(day.target.sidePlank, 23);
  assert.equal(targetLabel(EXERCISES[2], 7, 6), '6 → 7 / leg');
  assert.equal(targetLabel(EXERCISES[7], 23, 22), '22 → 23 sec / side');
  assert.equal(resultLabel(EXERCISES[7], 22), '22 sec / side');
});

test('v1.3 migration preserves completed history and draft, then runs only once', () => {
  const storage = new MemoryStorage();
  storage.save(JSON.stringify({
    schema: 3, progressionModelVersion: 2, startDate: '2026-09-01', migrationDate: '2026-09-01',
    baselinePending: false, baselineDate: '2026-09-02', exercises: EXERCISES,
    removedExercises: [], records: {
      '2026-09-29': { actual: { squat: 18, pushups: null }, saved: true,
        targetAtTime: { squat: 17, pushups: null }, lastAtTime: { squat: 16, pushups: null },
        baseline: false, legacy: false },
      '2026-09-30': { actual: { pushups: 7, squat: null }, saved: false, targetAtTime: null }
    }
  }));
  let model = at('2026-09-30', storage);
  assert.equal(model.data.schema, DATA_SCHEMA);
  assert.equal(model.data.progressionModelVersion, MODEL_VERSION);
  assert.equal(model.getDay('2026-09-29').target.squat, 17);
  assert.equal(model.getDay('2026-09-29').actual.squat, 18);
  assert.equal(model.getDay('2026-09-30').target.squat, 19);
  assert.equal(model.getDay('2026-09-30').target.pushups, null);
  assert.equal(model.getDay('2026-09-30').actual.pushups, 7);
  assert.equal(model.getDay('2026-09-30').completed, false);
  model = at('2026-09-30', storage);
  assert.equal(model.getDay('2026-09-30').actual.pushups, 7);
  assert.equal(model.getDay('2026-09-30').baselineByExercise.pushups, true);
  model.finishDay('2026-09-30');
  model = at('2026-10-01', storage);
  assert.equal(model.getDay('2026-10-01').target.pushups, 8);
  assert.equal(model.getDay('2026-10-01').target.squat, 19);
});

test('exercise management retains customized history behind the overflow path', () => {
  const model = at('2026-10-01');
  record(model, '2026-09-30', { squat: 10 });
  const added = model.addExercise({ name: 'Wall sit', unit: 'sec', side: null });
  model.unlockDay('2026-09-30');
  model.setActual('2026-09-30', added.id, '22');
  model.finishDay('2026-09-30');
  assert.equal(model.getDay('2026-10-01').target[added.id], 23);
  model.editExercise(added.id, { name: 'Wall hold', unit: 'sec', side: null });
  assert.equal(model.getDay('2026-10-01').target[added.id], 23);
  model.removeExercise(added.id);
  assert.equal(model.getRemovedExercises().length, 1);
  model.restoreExercise(added.id);
  assert.equal(model.getDay('2026-10-01').target[added.id], 23);
  model.editExercise(added.id, { name: 'Wall hold', unit: 'reps', side: null });
  assert.equal(model.getDay('2026-10-01').target[added.id], null);
});

test('empty plus starts at one and minus cannot go negative', () => {
  assert.equal(adjustActual('', 1), 1);
  assert.equal(adjustActual('', -1), null);
  assert.equal(adjustActual(0, -1), 0);
  assert.equal(adjustActual(13, 1), 14);
});

class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.listeners = {}; this.attributes = {};
    this.dataset = {}; this.value = ''; this.className = ''; this._text = '';
    this.hidden = false; this.disabled = false; this.readOnly = false; this.offsetWidth = 50;
  }
  append(...items) { this.children.push(...items); }
  replaceChildren(...items) { this.children = [...items]; }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(event, callback) { (this.listeners[event] ||= []).push(callback); }
  fire(event, extra = {}) { for (const callback of this.listeners[event] || []) callback({ target: this, preventDefault() {}, ...extra }); }
  click() { if (!this.disabled) this.fire('click'); }
  focus() {}
  get classList() {
    const element = this;
    return {
      toggle(name, force) {
        const set = new Set(element.className.split(/\s+/).filter(Boolean));
        if (force) set.add(name); else set.delete(name);
        element.className = [...set].join(' ');
      },
      add(name) { if (!this.contains(name)) element.className = `${element.className} ${name}`.trim(); },
      remove(name) { element.className = element.className.split(/\s+/).filter(value => value !== name).join(' '); },
      contains(name) { return element.className.split(/\s+/).includes(name); }
    };
  }
  set textContent(value) { this._text = String(value); }
  get textContent() { return this._text; }
  querySelector(selector) {
    const className = selector.slice(1);
    for (const child of this.children) {
      if (child.className.split(/\s+/).includes(className)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
}
function fakeClock(day) {
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [`${day}T12:00:00`])); }
  };
}
function launchUi(storage, day) {
  const html = fs.readFileSync(path.join(__dirname, '../app/src/main/assets/training.html'), 'utf8');
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
  const ids = ['previous','date','today','count','next','more','baseline-note','exercise-list',
    'save-status','finish','edit-results','done-edit','menu','close-menu','open-manager',
    'manager','close-manager','manager-active','manager-removed','removed-wrap','add-exercise',
    'editor','exercise-form','editor-title','exercise-name','exercise-unit','exercise-side',
    'editor-error','cancel-editor','cancel-editor-x'];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
  elements['today'].hidden = true;
  elements['baseline-note'].hidden = true;
  elements['menu'].hidden = true;
  elements['manager'].hidden = true;
  elements['editor'].hidden = true;
  const haptics = { tick: 0, goal: 0, saved: 0 };
  const bridge = {
    load: () => storage.load(), save: value => storage.save(value),
    tick: () => haptics.tick++, goal: () => haptics.goal++, saved: () => haptics.saved++
  };
  const document = {
    getElementById: id => elements[id], createElement: tag => new FakeElement(tag),
    addEventListener() {}
  };
  const boundApi = { ...API, TrainingModel: class extends API.TrainingModel {
    constructor(store) { super(store, new Date(`${day}T12:00:00`)); }
  } };
  vm.runInNewContext(inline, { document, window: { LocalLedger: bridge }, TrainingModel: boundApi,
    Intl, Date: fakeClock(day), localStorage: null });
  return { elements, haptics };
}

test('workout UI logs goal in one tap, finishes, locks, and edits deliberately', () => {
  const storage = new MemoryStorage();
  const first = launchUi(storage, '2026-09-30');
  const e = first.elements;
  assert.equal(e['exercise-list'].children.length, 9);
  assert.equal(e['baseline-note'].hidden, false);
  assert.equal(e.next.disabled, true);
  const squat = e['exercise-list'].children[1];
  const input = squat.children[1].children[1];
  assert.equal(input.value, '');
  input.value = '10'; input.fire('input');
  assert.equal(e.count.textContent, '1/9');
  e.finish.click();
  assert.equal(first.haptics.saved, 1);
  assert.equal(e.finish.hidden, true);
  assert.equal(input.readOnly, false); // row was replaced; use the current rendered row below
  assert.equal(e['exercise-list'].children[1].children[1].children[1].readOnly, true);
  assert.match(e['save-status'].textContent, /Workout complete/);

  const second = launchUi(storage, '2026-10-01');
  const d = second.elements;
  assert.equal(d['baseline-note'].hidden, false); // blank exercises still need a baseline
  const goal = d['exercise-list'].children[1].querySelector('.goal-value');
  assert.equal(goal.textContent, '11');
  goal.click();
  goal.click(); // repeated tap does not repeat the success haptic
  assert.equal(d['exercise-list'].children[1].children[1].children[1].value, '11');
  assert.equal(d.count.textContent, '1/9');
  assert.equal(second.haptics.goal, 1);
  assert.equal(second.haptics.tick, 0);
  d.finish.click();
  assert.match(d['exercise-list'].children[1].querySelector('.feedback').textContent, /Done 11 · Next 12/);
  assert.equal(d.next.disabled, true);
  d.previous.click();
  assert.equal(d.today.hidden, false);
  assert.equal(d['exercise-list'].children[1].children[1].children[1].readOnly, true);
  d['edit-results'].click();
  const oldInput = d['exercise-list'].children[1].children[1].children[1];
  assert.equal(oldInput.readOnly, false);
  oldInput.value = '5'; oldInput.fire('input');
  d['done-edit'].click();
  assert.equal(d['exercise-list'].children[1].children[1].children[1].readOnly, true);
  d.today.click();
  assert.equal(d.today.hidden, true);
  assert.equal(d['exercise-list'].children[1].querySelector('.goal-value').textContent, '11');
  assert.equal(second.haptics.saved, 1); // editing does not repeat FINISH confirmation
});

test('a normal nine-exercise session takes nine goal taps and no keyboard entry', () => {
  const storage = new MemoryStorage();
  const model = at('2026-09-30', storage);
  record(model, '2026-09-30', Object.fromEntries(EXERCISES.map(ex => [ex.id, 10])));
  const { elements, haptics } = launchUi(storage, '2026-10-01');
  for (const row of elements['exercise-list'].children) row.querySelector('.goal-value').click();
  assert.equal(elements.count.textContent, '9/9');
  assert.equal(haptics.goal, 9);
  assert.equal(haptics.tick, 0);
  assert.equal(elements['exercise-list'].children.every(row => row.classList.contains('is-complete')), true);
  elements.finish.click();
  assert.equal(haptics.saved, 1);
  assert.match(elements['save-status'].textContent, /Workout complete/);
});

test('overflow menu exposes add/edit/remove/restore without an Edit control on workout screen', () => {
  const storage = new MemoryStorage(), { elements: e } = launchUi(storage, '2026-09-30');
  assert.equal(e.more.attributes['aria-label'], undefined); // static HTML supplies the accessible label
  e.more.click();
  assert.equal(e.menu.hidden, false);
  e['open-manager'].click();
  assert.equal(e.manager.hidden, false);
  assert.equal(e['manager-active'].children.length, 9);
  e['add-exercise'].click();
  e['exercise-name'].value = 'Wall sit'; e['exercise-unit'].value = 'sec';
  e['exercise-form'].fire('submit');
  assert.equal(e['manager-active'].children.length, 10);
  e['manager-active'].children[9].children[1].click();
  e['exercise-name'].value = 'Wall hold'; e['exercise-form'].fire('submit');
  assert.equal(e['manager-active'].children[9].children[0].textContent, 'Wall hold');
  const remove = e['manager-active'].children[9].children[2]; remove.click(); remove.click();
  assert.equal(e['manager-active'].children.length, 9);
  assert.equal(e['manager-removed'].children.length, 1);
  e['manager-removed'].children[0].children[1].click();
  assert.equal(e['manager-active'].children.length, 10);
  assert.equal(e['exercise-list'].children.length, 10);
  const restarted = launchUi(storage, '2026-09-30');
  assert.equal(restarted.elements['exercise-list'].children.length, 10);
});

test('Android release retains offline package and icon and updates haptic bridge', () => {
  const base = path.join(__dirname, '../app/src/main');
  const html = fs.readFileSync(path.join(base, 'assets/training.html'), 'utf8');
  const css = fs.readFileSync(path.join(base, 'assets/training.css'), 'utf8');
  const java = fs.readFileSync(path.join(base, 'java/com/andrefiker/dailyhometraining/MainActivity.java'), 'utf8');
  const gradle = fs.readFileSync(path.join(__dirname, '../app/build.gradle'), 'utf8');
  const manifest = fs.readFileSync(path.join(base, 'AndroidManifest.xml'), 'utf8');
  assert.match(html, /id="more"[^>]*aria-label="More options"/);
  assert.match(html, /id="open-manager"[^>]*>Manage exercises/);
  assert.doesNotMatch(html, /id="manage"[^>]*>Edit/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(java, /void goal\(\)/);
  assert.match(java, /HapticFeedbackConstants\.KEYBOARD_TAP/);
  assert.match(java, /HapticFeedbackConstants\.CONFIRM/);
  assert.match(gradle, /versionCode 5/);
  assert.match(gradle, /versionName '1\.4\.0'/);
  assert.match(gradle, /applicationId 'com\.andrefiker\.dailyhometraining'/);
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.doesNotMatch(manifest, /INTERNET/);
});
