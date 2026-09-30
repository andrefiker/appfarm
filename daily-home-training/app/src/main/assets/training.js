(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TrainingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MODEL_VERSION = 2, DATA_SCHEMA = 3;
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
  const SIDES = new Set([null, 'leg', 'side']), UNITS = new Set(['reps', 'sec']);
  function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
  function addDays(key, n) { const [y,m,d]=key.split('-').map(Number); return isoDate(new Date(y,m-1,d+n,12)); }
  function localToday(now) { return isoDate(now || new Date()); }
  function parseJson(raw) { try { return typeof raw==='string' ? JSON.parse(raw) : raw; } catch (_) { return null; } }
  function validId(id) { return typeof id==='string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id); }
  function cleanExercise(raw) {
    if (!raw || !validId(raw.id) || typeof raw.name!=='string' || !raw.name.trim()) return null;
    const ex={id:raw.id,name:raw.name.trim().slice(0,40),unit:UNITS.has(raw.unit)?raw.unit:'reps',side:SIDES.has(raw.side)?raw.side:null};
    if (typeof raw.progressionStartDate==='string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.progressionStartDate)) ex.progressionStartDate=raw.progressionStartDate;
    return ex;
  }
  function cleanMap(input) { const out={}; if (input&&typeof input==='object') for(const [id,v] of Object.entries(input)) out[id]=Number.isSafeInteger(v)&&v>=0?v:null; return out; }
  function emptyExerciseMap(exercises) { return Object.fromEntries(exercises.map(ex=>[ex.id,null])); }
  function cleanMeta(input, fallback=[]) {
    const out={}; if(input&&typeof input==='object') for(const [id,raw] of Object.entries(input)){const ex=cleanExercise({id,...raw});if(ex)out[id]={name:ex.name,unit:ex.unit,side:ex.side};}
    for(const ex of fallback) out[ex.id] ||= {name:ex.name,unit:ex.unit,side:ex.side}; return out;
  }
  function migrateLegacy(parsed,today) {
    const records={}; for(const [date,old] of Object.entries(parsed.records||{})){if(!old||typeof old!=='object')continue;const actual=cleanMap(old.actual),saved=Boolean(old.saved);records[date]={actual:saved?actual:{},legacyActual:saved?null:actual,saved,targetAtTime:cleanMap(old.target),lastAtTime:{},baseline:false,legacy:true,exerciseMeta:cleanMeta(null,EXERCISES)};}
    return {schema:DATA_SCHEMA,progressionModelVersion:MODEL_VERSION,startDate:typeof parsed.startDate==='string'?parsed.startDate:today,migrationDate:today,baselinePending:true,baselineDate:null,exercises:EXERCISES.map(x=>({...x})),removedExercises:[],records};
  }
  function safeData(raw,today) {
    const p=parseJson(raw); if(!p||typeof p!=='object'||!p.records||typeof p.records!=='object')return null;
    if(p.progressionModelVersion!==MODEL_VERSION||![2,DATA_SCHEMA].includes(p.schema))return migrateLegacy(p,today);
    const all=(Array.isArray(p.exercises)?p.exercises:EXERCISES).map(cleanExercise).filter(Boolean), removedIn=(Array.isArray(p.removedExercises)?p.removedExercises:[]).map(cleanExercise).filter(Boolean), seen=new Set();
    const exercises=all.filter(x=>!seen.has(x.id)&&seen.add(x.id)),removedExercises=removedIn.filter(x=>!seen.has(x.id)&&seen.add(x.id)),records={};
    for(const [date,r] of Object.entries(p.records)){if(!r||typeof r!=='object')continue;records[date]={actual:cleanMap(r.actual),legacyActual:r.legacyActual?cleanMap(r.legacyActual):null,saved:Boolean(r.saved),targetAtTime:r.targetAtTime?cleanMap(r.targetAtTime):null,lastAtTime:cleanMap(r.lastAtTime),baseline:Boolean(r.baseline),legacy:Boolean(r.legacy),exerciseMeta:cleanMeta(r.exerciseMeta)};}
    const legacySchema=p.schema===2;return {schema:DATA_SCHEMA,progressionModelVersion:MODEL_VERSION,startDate:typeof p.startDate==='string'?p.startDate:today,migrationDate:legacySchema?today:(typeof p.migrationDate==='string'?p.migrationDate:today),baselinePending:legacySchema?true:Boolean(p.baselinePending),baselineDate:legacySchema?null:(typeof p.baselineDate==='string'?p.baselineDate:null),exercises:exercises.length||removedExercises.length?exercises:EXERCISES.map(x=>({...x})),removedExercises,records};
  }
  function targetLabel(ex,target,last,baseline=false){if(baseline)return'Baseline';if(!Number.isSafeInteger(target))return'Set baseline';const s=ex.side==='leg'?' / leg':ex.side==='side'?' sec / side':ex.unit==='sec'?' sec':'';return Number.isSafeInteger(last)?`Last ${last}${s}  →  Goal ${target}${s}`:`Goal ${target}${s}`;}
  function resultLabel(ex,v){if(!Number.isSafeInteger(v))return'';if(ex.side==='leg')return`${v} / leg`;if(ex.side==='side')return`${v} sec / side`;return`${v} ${ex.unit}`;}
  function adjustActual(current,delta){const t=String(current==null?'':current).trim();if(!t)return delta>0?1:null;return Math.max(0,(/^[0-9]+$/.test(t)?Number(t):0)+delta);}
  class TrainingModel {
    constructor(storage,now){this.storage=storage||{load:()=>'',save:()=>{}};this.today=localToday(now);this.selectedDate=this.today;this.data=safeData(this.storage.load(),this.today)||{schema:DATA_SCHEMA,progressionModelVersion:MODEL_VERSION,startDate:this.today,migrationDate:this.today,baselinePending:true,baselineDate:null,exercises:EXERCISES.map(x=>({...x})),removedExercises:[],records:{}};this.ensureRecord(this.today);this.persist();}
    persist(){this.storage.save(JSON.stringify(this.data));} getExercises(){return this.data.exercises.map(x=>({...x}));} getRemovedExercises(){return this.data.removedExercises.map(x=>({...x}));} exercise(id){return this.data.exercises.find(x=>x.id===id);}
    ensureRecord(date){if(!this.data.records[date])this.data.records[date]={actual:emptyExerciseMap(this.data.exercises),legacyActual:null,saved:false,targetAtTime:null,lastAtTime:null,baseline:this.data.baselinePending&&date>=this.data.migrationDate,legacy:false,exerciseMeta:{}};return this.data.records[date];}
    latestPerformanceBefore(date,id){const ex=this.exercise(id);if(!ex)return null;let latest=null;for(const [d,r] of Object.entries(this.data.records)){if(d>=date||!r.saved||(ex.progressionStartDate&&d<ex.progressionStartDate))continue;const a=r.actual&&r.actual[id];if(!Number.isSafeInteger(a)||a<0)continue;const meta=r.exerciseMeta&&r.exerciseMeta[id];if(meta&&(meta.unit!==ex.unit||meta.side!==ex.side))continue;if(!latest||d>latest.date)latest={date:d,actual:a};}return latest;}
    snapshotFor(date){const targets=emptyExerciseMap(this.data.exercises),lastActual=emptyExerciseMap(this.data.exercises);for(const ex of this.data.exercises){const p=this.latestPerformanceBefore(date,ex.id);if(p){lastActual[ex.id]=p.actual;targets[ex.id]=p.actual+1;}}return{targets,lastActual};}
    getDay(date){const r=this.ensureRecord(date),baseline=r.saved?Boolean(r.baseline):Boolean(this.data.baselinePending&&date>=this.data.migrationDate);let target,lastActual;if(r.saved){target=r.targetAtTime?{...r.targetAtTime}:{};lastActual=r.lastAtTime?{...r.lastAtTime}:{}}else if(baseline){target=emptyExerciseMap(this.data.exercises);lastActual=emptyExerciseMap(this.data.exercises)}else({targets:target,lastActual}=this.snapshotFor(date));const actual=r.legacy&&!r.saved&&date<this.data.migrationDate&&r.legacyActual?r.legacyActual:r.actual;return{date,target,lastActual,actual:{...actual},saved:Boolean(r.saved),baseline,legacy:Boolean(r.legacy),exerciseMeta:cleanMeta(r.exerciseMeta,this.data.exercises)};}
    setActual(date,id,raw){if(!this.exercise(id))throw Error('Unknown exercise');const r=this.ensureRecord(date),t=String(raw==null?'':raw).trim(),v=t===''?null:(/^\d+$/.test(t)?Number(t):null),dest=r.legacy&&!r.saved&&date<this.data.migrationDate&&r.legacyActual?r.legacyActual:r.actual;dest[id]=Number.isSafeInteger(v)&&v>=0?v:null;this.persist();return this.getDay(date);}
    saveDay(date){const r=this.ensureRecord(date);if(r.legacy&&!r.saved&&date<this.data.migrationDate){r.actual=r.legacyActual?{...r.legacyActual}:{};r.saved=true;this.persist();return this.getDay(date);}if(r.saved&&r.legacy){this.persist();return this.getDay(date);}const baseline=this.data.baselinePending&&date>=this.data.migrationDate,s=baseline?{targets:emptyExerciseMap(this.data.exercises),lastActual:emptyExerciseMap(this.data.exercises)}:this.snapshotFor(date);r.targetAtTime={...s.targets};r.lastAtTime={...s.lastActual};r.saved=true;r.legacy=false;r.baseline=baseline;r.exerciseMeta=cleanMeta(null,this.data.exercises);if(baseline){this.data.baselinePending=false;this.data.baselineDate=date;}this.persist();return this.getDay(date);}
    addExercise(details){const name=String(details&&details.name||'').trim(),unit=UNITS.has(details&&details.unit)?details.unit:'reps',side=SIDES.has(details&&details.side)?details.side:null;if(!name||name.length>40)throw Error('Name must be 1–40 characters');if(side==='side'&&unit!=='sec')throw Error('Per-side timing requires seconds');let id;do{id=`custom_${Math.random().toString(36).slice(2,10)}`;}while(this.data.exercises.some(x=>x.id===id)||this.data.removedExercises.some(x=>x.id===id));const ex={id,name,unit,side};this.data.exercises.push(ex);this.persist();return{...ex};}
    editExercise(id,updates){const ex=this.exercise(id);if(!ex)throw Error('Unknown exercise');const name=String(updates.name==null?ex.name:updates.name).trim(),unit=UNITS.has(updates.unit)?updates.unit:ex.unit,side=SIDES.has(updates.side)?updates.side:null;if(!name||name.length>40)throw Error('Name must be 1–40 characters');if(side==='side'&&unit!=='sec')throw Error('Per-side timing requires seconds');if(unit!==ex.unit||side!==ex.side)ex.progressionStartDate=this.today;else delete ex.progressionStartDate;ex.name=name;ex.unit=unit;ex.side=side;this.persist();return{...ex};}
    removeExercise(id){const i=this.data.exercises.findIndex(x=>x.id===id);if(i<0)return false;this.data.removedExercises.push(this.data.exercises.splice(i,1)[0]);this.persist();return true;}
    restoreExercise(id){const i=this.data.removedExercises.findIndex(x=>x.id===id);if(i<0)return false;this.data.exercises.push(this.data.removedExercises.splice(i,1)[0]);this.persist();return true;}
    setDate(date){this.selectedDate=date;this.ensureRecord(date);this.persist();return this.getDay(date);}shiftDate(amount){return this.setDate(addDays(this.selectedDate,amount));}completedCount(date){const d=this.getDay(date);return this.data.exercises.filter(ex=>Number.isSafeInteger(d.actual[ex.id])).length;}
  }
  return{MODEL_VERSION,DATA_SCHEMA,EXERCISES,addDays,localToday,targetLabel,resultLabel,adjustActual,safeData,TrainingModel};
});
