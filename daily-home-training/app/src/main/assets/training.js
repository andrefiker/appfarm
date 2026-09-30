(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TrainingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODEL_VERSION = 3;
  const DATA_SCHEMA = 4;
  const EXERCISES = [
    { id: 'jacks', name: 'Jumping jacks', unit: 'reps', side: null },
    { id: 'squat', name: 'Full squat', unit: 'reps', side: null },
    { id: 'singleSquat', name: 'Assisted single-leg squat', unit: 'reps', side: 'leg' },
    { id: 'calf', name: 'Standing calf raise', unit: 'reps', side: null },
    { id: 'pushups', name: 'Normal push-ups', unit: 'reps', side: null },
    { id: 'bridge', name: 'Glute bridge', unit: 'reps', side: null },
    { id: 'plank', name: 'Front plank', unit: 'sec', side: null },
    { id: 'sidePlank', name: 'Side plank', unit: 'sec', side: 'side' },
    { id: 'kneeTaps', name: 'Knee taps / high knees', unit: 'reps', side: null }
  ];
  const SIDES = new Set([null, 'leg', 'side']);
  const UNITS = new Set(['reps', 'sec']);
  const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function addDays(key, amount) {
    const [year, month, day] = key.split('-').map(Number);
    return isoDate(new Date(year, month - 1, day + amount, 12));
  }
  function localToday(now) { return isoDate(now || new Date()); }
  function parseJson(raw) {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (_) { return null; }
  }
  function validId(id) { return typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id); }
  function cleanExercise(raw) {
    if (!raw || !validId(raw.id) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
    const exercise = {
      id: raw.id, name: raw.name.trim().slice(0, 40),
      unit: UNITS.has(raw.unit) ? raw.unit : 'reps',
      side: SIDES.has(raw.side) ? raw.side : null
    };
    if (typeof raw.progressionStartDate === 'string' && DATE_PATTERN.test(raw.progressionStartDate)) {
      exercise.progressionStartDate = raw.progressionStartDate;
    }
    return exercise;
  }
  function cleanMap(input) {
    const output = {};
    if (input && typeof input === 'object') {
      for (const [id, value] of Object.entries(input)) {
        if (validId(id)) output[id] = Number.isSafeInteger(value) && value >= 0 ? value : null;
      }
    }
    return output;
  }
  function emptyMap(exercises) { return Object.fromEntries(exercises.map(ex => [ex.id, null])); }
  function cleanMeta(input, fallback = []) {
    const output = {};
    if (input && typeof input === 'object') {
      for (const [id, raw] of Object.entries(input)) {
        const ex = cleanExercise({ id, ...raw });
        if (ex) output[id] = { name: ex.name, unit: ex.unit, side: ex.side };
      }
    }
    for (const ex of fallback) output[ex.id] ||= { name: ex.name, unit: ex.unit, side: ex.side };
    return output;
  }
  function cleanBaselineMap(input, targets, exercises) {
    const output = {};
    for (const ex of exercises) {
      output[ex.id] = input && typeof input[ex.id] === 'boolean'
        ? input[ex.id] : !Number.isSafeInteger(targets && targets[ex.id]);
    }
    return output;
  }
  function cleanRecord(raw, exercises, schema) {
    const actual = cleanMap(raw.actual);
    const legacyActual = raw.legacyActual ? cleanMap(raw.legacyActual) : null;
    const targetAtTime = cleanMap(schema === 1 ? raw.target : raw.targetAtTime);
    const lastAtTime = cleanMap(raw.lastAtTime);
    const completed = Boolean(schema === DATA_SCHEMA ? raw.completed : raw.saved);
    return {
      actual: completed || !legacyActual ? actual : { ...actual, ...legacyActual },
      completed,
      targetAtTime,
      lastAtTime,
      baselineAtTime: cleanBaselineMap(raw.baselineAtTime, targetAtTime, exercises),
      exerciseMeta: cleanMeta(raw.exerciseMeta, exercises),
      legacy: Boolean(raw.legacy || schema === 1)
    };
  }
  function safeData(raw) {
    const parsed = parseJson(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.records || typeof parsed.records !== 'object') return null;
    if (![1, 2, 3, DATA_SCHEMA].includes(parsed.schema)) return null;
    const all = (Array.isArray(parsed.exercises) ? parsed.exercises : EXERCISES).map(cleanExercise).filter(Boolean);
    const removed = (Array.isArray(parsed.removedExercises) ? parsed.removedExercises : []).map(cleanExercise).filter(Boolean);
    const seen = new Set();
    const exercises = all.filter(ex => !seen.has(ex.id) && seen.add(ex.id));
    const removedExercises = removed.filter(ex => !seen.has(ex.id) && seen.add(ex.id));
    const active = exercises.length || removedExercises.length ? exercises : EXERCISES.map(ex => ({ ...ex }));
    const records = {};
    for (const [date, record] of Object.entries(parsed.records)) {
      if (DATE_PATTERN.test(date) && record && typeof record === 'object') {
        records[date] = cleanRecord(record, active, parsed.schema);
      }
    }
    return {
      schema: DATA_SCHEMA, progressionModelVersion: MODEL_VERSION,
      startDate: DATE_PATTERN.test(parsed.startDate) ? parsed.startDate : null,
      exercises: active, removedExercises, records
    };
  }
  function unitSuffix(exercise) {
    if (exercise.side === 'leg') return ' / leg';
    if (exercise.side === 'side') return ' sec / side';
    return exercise.unit === 'sec' ? ' sec' : '';
  }
  function targetLabel(exercise, target, lastActual) {
    if (!Number.isSafeInteger(target)) return 'Baseline';
    return Number.isSafeInteger(lastActual)
      ? `${lastActual} → ${target}${unitSuffix(exercise)}`
      : `${target}${unitSuffix(exercise)}`;
  }
  function resultLabel(exercise, value) {
    if (!Number.isSafeInteger(value)) return '';
    return `${value}${unitSuffix(exercise) || ' reps'}`;
  }
  function adjustActual(current, delta) {
    const text = String(current == null ? '' : current).trim();
    if (text === '') return delta > 0 ? 1 : null;
    const value = /^\d+$/.test(text) ? Number(text) : 0;
    return Math.max(0, value + delta);
  }

  class TrainingModel {
    constructor(storage, now) {
      this.storage = storage || { load: () => '', save: () => {} };
      this.today = localToday(now);
      this.selectedDate = this.today;
      this.editingDates = new Set();
      this.data = safeData(this.storage.load()) || {
        schema: DATA_SCHEMA, progressionModelVersion: MODEL_VERSION, startDate: this.today,
        exercises: EXERCISES.map(ex => ({ ...ex })), removedExercises: [], records: {}
      };
      this.data.startDate ||= this.today;
      this.ensureRecord(this.today);
      this.persist();
    }
    persist() { this.storage.save(JSON.stringify(this.data)); }
    getExercises() { return this.data.exercises.map(ex => ({ ...ex })); }
    getRemovedExercises() { return this.data.removedExercises.map(ex => ({ ...ex })); }
    exercise(id) { return this.data.exercises.find(ex => ex.id === id); }
    ensureRecord(date) {
      if (!DATE_PATTERN.test(date)) throw new Error('Invalid date');
      if (!this.data.records[date]) {
        this.data.records[date] = {
          actual: emptyMap(this.data.exercises), completed: false, targetAtTime: {},
          lastAtTime: {}, baselineAtTime: {}, exerciseMeta: {}, legacy: false
        };
      }
      return this.data.records[date];
    }
    latestPerformanceBefore(date, id) {
      const exercise = this.exercise(id);
      if (!exercise) return null;
      let latest = null;
      for (const [recordDate, record] of Object.entries(this.data.records)) {
        if (recordDate >= date || !record.completed ||
            (exercise.progressionStartDate && recordDate < exercise.progressionStartDate)) continue;
        const actual = record.actual[id];
        if (!Number.isSafeInteger(actual) || actual < 0) continue;
        const meta = record.exerciseMeta[id];
        if (meta && (meta.unit !== exercise.unit || meta.side !== exercise.side)) continue;
        if (!latest || recordDate > latest.date) latest = { date: recordDate, actual };
      }
      return latest;
    }
    snapshotFor(date) {
      const targets = emptyMap(this.data.exercises), lastActual = emptyMap(this.data.exercises);
      for (const ex of this.data.exercises) {
        const prior = this.latestPerformanceBefore(date, ex.id);
        if (prior) { lastActual[ex.id] = prior.actual; targets[ex.id] = prior.actual + 1; }
      }
      return { targets, lastActual };
    }
    getDay(date) {
      const record = this.ensureRecord(date);
      const snapshot = record.completed
        ? { targets: record.targetAtTime, lastActual: record.lastAtTime }
        : this.snapshotFor(date);
      const target = { ...emptyMap(this.data.exercises), ...snapshot.targets };
      const lastActual = { ...emptyMap(this.data.exercises), ...snapshot.lastActual };
      const baselineByExercise = record.completed
        ? { ...cleanBaselineMap(record.baselineAtTime, target, this.data.exercises) }
        : cleanBaselineMap(null, target, this.data.exercises);
      return {
        date, target, lastActual, baselineByExercise,
        baseline: Object.values(baselineByExercise).some(Boolean),
        actual: { ...emptyMap(this.data.exercises), ...record.actual },
        completed: record.completed, locked: record.completed && !this.editingDates.has(date),
        editing: this.editingDates.has(date), legacy: record.legacy,
        exerciseMeta: cleanMeta(record.exerciseMeta, this.data.exercises)
      };
    }
    setActual(date, id, raw) {
      if (date > this.today) throw new Error('Future workouts are unavailable');
      if (!this.exercise(id)) throw new Error('Unknown exercise');
      const record = this.ensureRecord(date);
      if (record.completed && !this.editingDates.has(date)) throw new Error('Unlock completed results first');
      const text = String(raw == null ? '' : raw).trim();
      if (text && !/^\d+$/.test(text)) throw new Error('Enter a whole number');
      const value = text === '' ? null : Number(text);
      if (value != null && (!Number.isSafeInteger(value) || value < 0)) throw new Error('Enter a valid whole number');
      record.actual[id] = value;
      this.persist();
      return this.getDay(date);
    }
    finishDay(date) {
      if (date > this.today) throw new Error('Future workouts are unavailable');
      const record = this.ensureRecord(date);
      if (record.completed) {
        if (!this.editingDates.has(date)) throw new Error('Workout already complete');
        this.editingDates.delete(date);
      } else {
        const snapshot = this.snapshotFor(date);
        record.targetAtTime = { ...snapshot.targets };
        record.lastAtTime = { ...snapshot.lastActual };
        record.baselineAtTime = cleanBaselineMap(null, snapshot.targets, this.data.exercises);
        record.exerciseMeta = cleanMeta(null, this.data.exercises);
        record.completed = true;
        record.legacy = false;
      }
      this.persist();
      return this.getDay(date);
    }
    unlockDay(date) {
      if (date > this.today || !this.ensureRecord(date).completed) throw new Error('No completed workout to edit');
      this.editingDates.add(date);
      return this.getDay(date);
    }
    setDate(date) {
      if (!DATE_PATTERN.test(date)) throw new Error('Invalid date');
      if (date > this.today) return this.getDay(this.selectedDate);
      this.editingDates.clear();
      this.selectedDate = date;
      this.ensureRecord(date);
      this.persist();
      return this.getDay(date);
    }
    shiftDate(amount) { return this.setDate(addDays(this.selectedDate, amount)); }
    refreshToday(now) {
      const next = localToday(now);
      if (next === this.today) return false;
      const wasToday = this.selectedDate === this.today;
      this.today = next;
      if (wasToday) this.setDate(next);
      return true;
    }
    completedCount(date) {
      const day = this.getDay(date);
      return this.data.exercises.filter(ex => Number.isSafeInteger(day.actual[ex.id])).length;
    }
    addExercise(details) {
      const name = String(details && details.name || '').trim();
      const unit = UNITS.has(details && details.unit) ? details.unit : 'reps';
      const side = SIDES.has(details && details.side) ? details.side : null;
      if (!name || name.length > 40) throw new Error('Name must be 1–40 characters');
      if (side === 'side' && unit !== 'sec') throw new Error('Per-side timing requires seconds');
      let id;
      do { id = `custom_${Math.random().toString(36).slice(2, 10)}`; }
      while (this.data.exercises.some(ex => ex.id === id) || this.data.removedExercises.some(ex => ex.id === id));
      const exercise = { id, name, unit, side };
      this.data.exercises.push(exercise);
      this.persist();
      return { ...exercise };
    }
    editExercise(id, updates) {
      const exercise = this.exercise(id);
      if (!exercise) throw new Error('Unknown exercise');
      const name = String(updates.name == null ? exercise.name : updates.name).trim();
      const unit = UNITS.has(updates.unit) ? updates.unit : exercise.unit;
      const side = SIDES.has(updates.side) ? updates.side : null;
      if (!name || name.length > 40) throw new Error('Name must be 1–40 characters');
      if (side === 'side' && unit !== 'sec') throw new Error('Per-side timing requires seconds');
      if (unit !== exercise.unit || side !== exercise.side) exercise.progressionStartDate = this.today;
      exercise.name = name; exercise.unit = unit; exercise.side = side;
      this.persist();
      return { ...exercise };
    }
    removeExercise(id) {
      const index = this.data.exercises.findIndex(ex => ex.id === id);
      if (index < 0) return false;
      this.data.removedExercises.push(this.data.exercises.splice(index, 1)[0]);
      this.persist();
      return true;
    }
    restoreExercise(id) {
      const index = this.data.removedExercises.findIndex(ex => ex.id === id);
      if (index < 0) return false;
      this.data.exercises.push(this.data.removedExercises.splice(index, 1)[0]);
      this.persist();
      return true;
    }
  }
  return { MODEL_VERSION, DATA_SCHEMA, EXERCISES, addDays, localToday, targetLabel, resultLabel, adjustActual, safeData, TrainingModel };
});
