(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TrainingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EXERCISES = [
    { id: 'jacks', name: 'Jumping jacks', unit: 'reps', start: 30, step: 5, cap: 100 },
    { id: 'squat', name: 'Full squat', unit: 'reps', start: 10, step: 1, cap: 40 },
    { id: 'singleSquat', name: 'Assisted single-leg squat', unit: 'reps', side: 'per leg', start: 5, step: 1, cap: 20 },
    { id: 'calf', name: 'Standing calf raise', unit: 'reps', start: 15, step: 1, cap: 50 },
    { id: 'pushups', name: 'Normal push-ups', unit: 'reps', start: 8, step: 1, cap: 40 },
    { id: 'bridge', name: 'Glute bridge', unit: 'reps', start: 12, step: 1, cap: 50 },
    { id: 'plank', name: 'Front plank', unit: 'sec', start: 20, step: 5, cap: 120 },
    { id: 'sidePlank', name: 'Side plank', unit: 'sec', side: 'per side', start: 15, step: 5, cap: 90 },
    { id: 'kneeTaps', name: 'Knee taps / high knees', unit: 'reps', start: 30, step: 5, cap: 100 }
  ];
  const BY_ID = Object.fromEntries(EXERCISES.map(x => [x.id, x]));
  const BASE = Object.fromEntries(EXERCISES.map(x => [x.id, x.start]));

  function targetLabel(exercise, target) {
    if (exercise.side === 'per leg') return `Target ${target} / leg`;
    if (exercise.side === 'per side') return `Target ${target} sec / side`;
    return `Target ${target} ${exercise.unit}`;
  }
  function adjustActual(current, delta) {
    return Math.max(0, (Number(current) || 0) + delta);
  }

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(key, amount) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d + amount, 12, 0, 0, 0);
    return isoDate(date);
  }
  function localToday(now) { return isoDate(now || new Date()); }
  function emptyActuals() { return Object.fromEntries(EXERCISES.map(x => [x.id, null])); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function safeData(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!parsed || typeof parsed !== 'object' || typeof parsed.startDate !== 'string' || !parsed.records || typeof parsed.records !== 'object') return null;
      return { schema: 1, startDate: parsed.startDate, records: parsed.records };
    } catch (_) { return null; }
  }

  class TrainingModel {
    constructor(storage, now) {
      this.storage = storage || { load: () => '', save: () => {} };
      this.today = localToday(now);
      this.selectedDate = this.today;
      this.data = safeData(this.storage.load());
      if (!this.data) this.data = { schema: 1, startDate: this.today, records: {} };
      this.ensureRecord(this.today);
      this.persist();
    }

    persist() { this.storage.save(JSON.stringify(this.data)); }

    targetFor(date) {
      if (date < this.data.startDate) return { ...BASE };
      let targets = { ...BASE };
      for (let cursor = this.data.startDate; cursor < date; cursor = addDays(cursor, 1)) {
        const record = this.data.records[cursor];
        if (!record) continue;
        record.target = { ...targets };
        if (record.saved) {
          for (const ex of EXERCISES) {
            const value = record.actual && record.actual[ex.id];
            if (Number.isInteger(value) && value >= targets[ex.id]) {
              targets[ex.id] = Math.min(ex.cap, targets[ex.id] + ex.step);
            }
          }
        }
      }
      const current = this.data.records[date];
      if (current) current.target = { ...targets };
      return targets;
    }

    ensureRecord(date) {
      if (!this.data.records[date]) {
        this.data.records[date] = { target: this.targetFor(date), actual: emptyActuals(), saved: false };
      } else {
        this.data.records[date].target = this.targetFor(date);
        this.data.records[date].actual = { ...emptyActuals(), ...(this.data.records[date].actual || {}) };
      }
      return this.data.records[date];
    }

    getDay(date) {
      const record = this.ensureRecord(date);
      return { date, target: { ...record.target }, actual: { ...record.actual }, saved: Boolean(record.saved) };
    }

    setActual(date, exerciseId, raw) {
      if (!BY_ID[exerciseId]) throw new Error('Unknown exercise');
      const record = this.ensureRecord(date);
      const text = String(raw == null ? '' : raw).trim();
      const value = text === '' ? null : (/^\d+$/.test(text) ? Number(text) : null);
      record.actual[exerciseId] = Number.isSafeInteger(value) && value >= 0 ? value : null;
      record.saved = false;
      this.persist();
      return this.getDay(date);
    }

    saveDay(date) {
      const record = this.ensureRecord(date);
      record.saved = true;
      record.target = this.targetFor(date);
      this.persist();
      return this.getDay(date);
    }

    setDate(date) {
      this.selectedDate = date;
      this.ensureRecord(date);
      this.persist();
      return this.getDay(date);
    }

    shiftDate(days) { return this.setDate(addDays(this.selectedDate, days)); }
    getStatus(date) {
      const r = this.ensureRecord(date);
      if (r.saved) return 'Saved';
      if (Object.values(r.actual).some(v => Number.isInteger(v))) return 'Unsaved changes';
      return 'Not saved';
    }
  }

  return { EXERCISES, BASE, addDays, localToday, targetLabel, adjustActual, TrainingModel };
});
