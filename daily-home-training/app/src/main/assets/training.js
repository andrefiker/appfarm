(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TrainingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MODEL_VERSION = 2;
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
  const BY_ID = Object.fromEntries(EXERCISES.map(ex => [ex.id, ex]));

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function addDays(key, amount) {
    const [y, m, d] = key.split('-').map(Number);
    return isoDate(new Date(y, m - 1, d + amount, 12, 0, 0, 0));
  }
  function localToday(now) { return isoDate(now || new Date()); }
  function emptyMap(value = null) { return Object.fromEntries(EXERCISES.map(ex => [ex.id, value])); }
  function cleanActuals(input) {
    const output = emptyMap();
    for (const ex of EXERCISES) {
      const value = input && input[ex.id];
      output[ex.id] = Number.isSafeInteger(value) && value >= 0 ? value : null;
    }
    return output;
  }
  function cleanTargets(input) {
    if (!input || typeof input !== 'object') return null;
    const output = emptyMap();
    for (const ex of EXERCISES) {
      const value = input[ex.id];
      output[ex.id] = Number.isSafeInteger(value) && value >= 0 ? value : null;
    }
    return output;
  }
  function parseJson(raw) {
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (_) { return null; }
  }
  function migrateLegacy(parsed, today) {
    const records = {};
    for (const [date, old] of Object.entries(parsed.records || {})) {
      if (!old || typeof old !== 'object') continue;
      const actual = cleanActuals(old.actual);
      const saved = Boolean(old.saved);
      records[date] = {
        actual: saved ? actual : emptyMap(),
        legacyActual: saved ? null : actual,
        saved,
        targetAtTime: cleanTargets(old.target),
        lastAtTime: null,
        baseline: false,
        legacy: true
      };
    }
    return {
      schema: 2,
      progressionModelVersion: MODEL_VERSION,
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : today,
      migrationDate: today,
      baselinePending: true,
      baselineDate: null,
      records
    };
  }
  function safeData(raw, today) {
    const parsed = parseJson(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.records || typeof parsed.records !== 'object') return null;
    if (parsed.progressionModelVersion !== MODEL_VERSION || parsed.schema !== 2) return migrateLegacy(parsed, today);
    const records = {};
    for (const [date, record] of Object.entries(parsed.records)) {
      if (!record || typeof record !== 'object') continue;
      records[date] = {
        actual: cleanActuals(record.actual),
        legacyActual: record.legacyActual ? cleanActuals(record.legacyActual) : null,
        saved: Boolean(record.saved),
        targetAtTime: cleanTargets(record.targetAtTime),
        lastAtTime: cleanActuals(record.lastAtTime),
        baseline: Boolean(record.baseline),
        legacy: Boolean(record.legacy)
      };
    }
    return {
      schema: 2,
      progressionModelVersion: MODEL_VERSION,
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : today,
      migrationDate: typeof parsed.migrationDate === 'string' ? parsed.migrationDate : today,
      baselinePending: Boolean(parsed.baselinePending),
      baselineDate: typeof parsed.baselineDate === 'string' ? parsed.baselineDate : null,
      records
    };
  }

  function targetLabel(exercise, target, lastActual, baseline = false) {
    if (baseline) return 'Baseline';
    if (!Number.isSafeInteger(target)) return 'Set baseline';
    const suffix = exercise.side === 'leg' ? ' / leg' : exercise.side === 'side' ? ' sec / side' : exercise.unit === 'sec' ? ' sec' : '';
    if (Number.isSafeInteger(lastActual)) return `Goal ${target}${suffix} · Last ${lastActual}${suffix}`;
    return `Goal ${target}${suffix}`;
  }
  function resultLabel(exercise, value) {
    if (!Number.isSafeInteger(value)) return '';
    if (exercise.side === 'leg') return `${value} / leg`;
    if (exercise.side === 'side') return `${value} sec / side`;
    return `${value} ${exercise.unit}`;
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
      this.data = safeData(this.storage.load(), this.today);
      if (!this.data) {
        this.data = {
          schema: 2,
          progressionModelVersion: MODEL_VERSION,
          startDate: this.today,
          migrationDate: this.today,
          baselinePending: true,
          baselineDate: null,
          records: {}
        };
      }
      this.ensureRecord(this.today);
      this.persist();
    }

    persist() { this.storage.save(JSON.stringify(this.data)); }

    ensureRecord(date) {
      if (!this.data.records[date]) {
        this.data.records[date] = {
          actual: emptyMap(), legacyActual: null, saved: false,
          targetAtTime: null, lastAtTime: null,
          baseline: this.data.baselinePending && date >= this.data.migrationDate,
          legacy: false
        };
      }
      return this.data.records[date];
    }

    latestPerformanceBefore(date, exerciseId) {
      let latest = null;
      for (const [recordDate, record] of Object.entries(this.data.records)) {
        if (recordDate >= date || !record.saved) continue;
        const actual = record.actual && record.actual[exerciseId];
        if (!Number.isSafeInteger(actual) || actual < 0) continue;
        if (!latest || recordDate > latest.date) latest = { date: recordDate, actual };
      }
      return latest;
    }

    snapshotFor(date) {
      const targets = emptyMap();
      const lastActual = emptyMap();
      for (const ex of EXERCISES) {
        const previous = this.latestPerformanceBefore(date, ex.id);
        if (previous) {
          lastActual[ex.id] = previous.actual;
          targets[ex.id] = previous.actual + 1;
        }
      }
      return { targets, lastActual };
    }

    getDay(date) {
      const record = this.ensureRecord(date);
      const baseline = record.saved
        ? Boolean(record.baseline)
        : Boolean(this.data.baselinePending && date >= this.data.migrationDate);
      let target;
      let lastActual;
      if (record.saved) {
        target = record.targetAtTime ? { ...record.targetAtTime } : emptyMap();
        lastActual = record.lastAtTime ? { ...record.lastAtTime } : emptyMap();
      } else if (baseline) {
        target = emptyMap();
        lastActual = emptyMap();
      } else {
        ({ targets: target, lastActual } = this.snapshotFor(date));
      }
      return {
        date,
        target,
        lastActual,
        actual: { ...(record.legacy && !record.saved && date < this.data.migrationDate && record.legacyActual ? record.legacyActual : record.actual) },
        saved: Boolean(record.saved),
        baseline,
        legacy: Boolean(record.legacy)
      };
    }

    setActual(date, exerciseId, raw) {
      if (!BY_ID[exerciseId]) throw new Error('Unknown exercise');
      const record = this.ensureRecord(date);
      const text = String(raw == null ? '' : raw).trim();
      const value = text === '' ? null : (/^\d+$/.test(text) ? Number(text) : null);
      const destination = record.legacy && !record.saved && date < this.data.migrationDate && record.legacyActual
        ? record.legacyActual
        : record.actual;
      destination[exerciseId] = Number.isSafeInteger(value) && value >= 0 ? value : null;
      if (record.saved && !record.legacy) {
        // Historical edits change only this session's result. Its saved target/last snapshots stay fixed.
      }
      this.persist();
      return this.getDay(date);
    }

    saveDay(date) {
      const record = this.ensureRecord(date);
      if (record.legacy && !record.saved && date < this.data.migrationDate) {
        record.actual = record.legacyActual ? { ...record.legacyActual } : emptyMap();
        record.saved = true;
        this.persist();
        return this.getDay(date);
      }
      if (record.saved && record.legacy) {
        // A pre-migration completed workout remains history; the first new save is the baseline.
        this.persist();
        return this.getDay(date);
      }
      const isBaseline = this.data.baselinePending && date >= this.data.migrationDate;
      const snapshot = isBaseline ? { targets: emptyMap(), lastActual: emptyMap() } : this.snapshotFor(date);
      record.targetAtTime = { ...snapshot.targets };
      record.lastAtTime = { ...snapshot.lastActual };
      record.saved = true;
      record.legacy = false;
      record.baseline = isBaseline;
      if (isBaseline) {
        this.data.baselinePending = false;
        this.data.baselineDate = date;
      }
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
    completedCount(date) {
      return Object.values(this.getDay(date).actual).filter(Number.isSafeInteger).length;
    }
    getStatus(date) {
      const day = this.getDay(date);
      if (day.saved) return 'Saved';
      if (Object.values(day.actual).some(Number.isSafeInteger)) return 'Unsaved changes';
      return day.baseline ? 'Baseline' : 'Not saved';
    }
  }

  return { MODEL_VERSION, EXERCISES, addDays, localToday, targetLabel, resultLabel, adjustActual, safeData, TrainingModel };
});
