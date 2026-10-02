(function(root){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const uid=()=>globalThis.crypto?.randomUUID?.()||'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const specs=[
['Jumping Jacks','Bodyweight','seconds',2,30,false,'Land softly. Keep knees relaxed and breathe steadily.',120],
['Goblet Squat','5 kg kettlebell','reps',3,10,false,'Hold kettlebell at chest. Sit down between the hips. Stand tall.',20],
['Kettlebell Romanian Deadlift','5 kg kettlebell','reps',3,10,false,'Push hips back. Keep back neutral. Stand by driving hips forward.',20],
['Reverse Lunge','Bodyweight or 5 kg','reps',2,8,true,'Step back. Lower under control. Push through the front foot.',15],
['One-Arm Kettlebell Row','5 kg kettlebell','reps',3,10,true,'Brace torso. Pull elbow toward hip. Lower slowly.',20],
['Push-Ups','Bodyweight · baseline first','reps',3,0,false,'Brace your body. Stop before form breaks; leave a little in reserve.',25],
['One-Arm Kettlebell Overhead Press','5 kg kettlebell','reps',3,8,true,'Start at shoulder. Brace trunk. Press overhead without leaning back.',15],
['Glute Bridge','Bodyweight or kettlebell on hips','reps',3,12,false,'Squeeze glutes at the top. Do not overarch lower back.',25],
['Standing Calf Raise','Bodyweight or 5 kg','reps',3,15,false,'Rise onto toes. Pause, then lower heels slowly.',30],
['Bird Dog','Bodyweight','reps',2,8,true,'Reach opposite arm and leg. Keep hips level. Move slowly.',15],
['Plank','Bodyweight','seconds',3,20,false,'Straight line from shoulders to feet. Brace and keep breathing.',60],
['Side Plank','Bodyweight','seconds',2,15,true,'Stack shoulders and hips. Keep your body in one line.',60]
];
function seed(){return {schema:1,exercises:specs.map((s,i)=>({id:'seed-'+i,name:s[0],equipment:s[1],unit:s[2],sets:s[3],starter:s[4],bilateral:s[5],cue:s[6],cap:s[7],increment:s[2]==='seconds'?5:1,baseline:i===5,enabled:true,generation:0})),schedule:[1,3,5],settings:{theme:'dark',haptics:true,easy:true,keepAwake:true},sessions:[],draft:null,summary:null};}
function entries(e,value=e.starter){return Array.from({length:e.sets},()=>Array(e.bilateral?2:1).fill(value));}
function history(state,e){return state.sessions.filter(s=>s.mode==='main').flatMap(s=>s.results.filter(r=>r.exercise.id===e.id&&r.exercise.generation===e.generation).map(r=>({...r,date:s.date})));}
function targets(state,e){let h=history(state,e),last=h.at(-1);return entries(e).map((row,i)=>row.map((_,j)=>Math.min(e.cap,last?.next?.[i]?.[j]??e.starter)));}
function progress(e,target,actual,isBaseline=false){return target.map((row,i)=>row.map((t,j)=>{let a=actual[i][j];return Math.min(e.cap,isBaseline?Math.max(1,a+e.increment):a>=t?t+e.increment:t);}));}
function start(state,mode,date=dateKey()){
 if(state.draft)throw Error('Finish the current workout first.');
 const easyIds=[0,1,5,9,10].map(i=>'seed-'+i);
 const list=state.exercises.filter(e=>e.enabled&&(mode==='main'||easyIds.includes(e.id))).map(e=>{
 const exercise=clone(e); if(mode==='easy'){exercise.sets=1;exercise.baseline=false;}
 const isBaseline=mode==='main'&&e.baseline&&history(state,e).length===0;
 const target=mode==='easy'?entries(exercise,Math.max(1,Math.min(e.unit==='seconds'?15:5,e.starter||5))):targets(state,e);
 return {exercise,target,actual:target.map(r=>r.map(()=>null)),isBaseline,status:'pending'};
 });
 if(!list.length)throw Error('Enable an exercise first.');
 state.draft={id:uid(),date,mode,list,index:0,set:0,side:0,entry:list[0].isBaseline?0:list[0].target[0][0],undo:[],timer:null};return state.draft;
}
function snapshot(d){let c=clone(d);delete c.undo;return c;}
function remember(d){d.undo.push(snapshot(d));if(d.undo.length>100)d.undo.shift();}
function select(d,index,set=0,side=0){d.index=index;d.set=set;d.side=side;d.timer=null;let r=d.list[index];d.entry=r.actual[set][side]??(r.isBaseline?0:r.target[set][side]);}
function log(state,value){let d=state.draft,r=d.list[d.index];if(!Number.isInteger(value)||value<0||value>3600)throw Error('Enter a whole number from 0 to 3600.');remember(d);r.actual[d.set][d.side]=value;d.timer=null;if(r.actual.flat().every(v=>v!==null)){r.status='done';select(d,d.index,d.set,d.side);}else if(d.side+1<r.actual[d.set].length)select(d,d.index,d.set,d.side+1);else if(d.set+1<r.actual.length)select(d,d.index,d.set+1,0);else {r.status='done';select(d,d.index,d.set,d.side);}return r.status;}
function advance(state,skip=false){let d=state.draft,r=d.list[d.index];if(!skip&&r.status!=='done')throw Error('Record all sets first.');remember(d);if(skip){r.status='skipped';r.actual=r.actual.map(row=>row.map(()=>null));}let idx=d.list.findIndex((x,i)=>i>d.index&&x.status==='pending');if(idx<0)idx=d.list.findIndex(x=>x.status==='pending');if(idx<0){d.index=d.list.length;d.timer=null;}else select(d,idx);}
function undo(state){let d=state.draft,last=d.undo.pop();if(!last)return false;let stack=d.undo;Object.assign(d,last,{undo:stack,timer:null});return true;}
function finish(state,asMain=false){let d=state.draft;if(d.list.some(r=>r.status==='pending'))throw Error('Finish or skip remaining exercises.');let mode=asMain?'main':d.mode;
const results=d.list.filter(r=>r.status==='done').map(r=>({...clone(r),next:progress(r.exercise,r.target,r.actual,r.isBaseline)}));
if(asMain){for(const r of results){let e=state.exercises.find(x=>x.id===r.exercise.id);r.exercise=clone(e);let full=targets(state,e);r.target=full;r.actual=entries(e,0).map((row,i)=>row.map((_,j)=>i===0?d.list.find(x=>x.exercise.id===e.id).actual[0][j]:null)); // Explicit promotion only updates the logged first set.
r.promoted=true;r.next=full.map((row,i)=>row.map((t,j)=>r.actual[i][j]===null?t:Math.min(e.cap,r.actual[i][j]>=t?t+e.increment:t)));}}
let session={id:d.id,date:d.date,mode,results,skipped:d.list.filter(r=>r.status==='skipped').length};state.sessions.push(session);state.summary=clone(session);state.draft=null;return session;}
function ready(state,e){let last=history(state,e).at(-1);return !!last&&last.actual.length===e.sets&&last.actual.every(row=>row.every(v=>v!==null&&v>=e.cap));}
function normalizeExercise(e){const n=clone(e);n.name=String(n.name||'').trim().slice(0,80);n.equipment=String(n.equipment||'').slice(0,120);n.cue=String(n.cue||'').slice(0,250);if(!n.name)throw Error('Give the exercise a name.');for(const [key,min,max] of [['sets',1,8],['starter',0,3600],['increment',1,60],['cap',1,3600],['generation',0,100000]]){if(!Number.isInteger(n[key])||n[key]<min||n[key]>max)throw Error('Check '+key+' value.');}if(n.starter>n.cap)throw Error('Starter must be at or below the cap.');if(!['reps','seconds'].includes(n.unit))throw Error('Choose reps or seconds.');for(const k of ['bilateral','enabled','baseline'])if(typeof n[k]!=='boolean')throw Error('Invalid '+k);if(typeof n.id!=='string'||!n.id)throw Error('Invalid exercise ID.');return n;}
function validate(state){
 if(!state||state.schema!==1||!Array.isArray(state.exercises)||state.exercises.length>100||!Array.isArray(state.sessions)||state.sessions.length>10000)throw Error('Not a ONE MORE backup.');
 let s=clone(state);s.exercises=s.exercises.map(normalizeExercise);if(new Set(s.exercises.map(e=>e.id)).size!==s.exercises.length)throw Error('Duplicate exercise IDs.');
 if(!Array.isArray(s.schedule)||!s.schedule.length||s.schedule.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Invalid schedule.');
 if(!s.settings||!['dark','light','system'].includes(s.settings.theme)||['haptics','easy','keepAwake'].some(k=>typeof s.settings[k]!=='boolean'))throw Error('Invalid settings.');
 const matrix=(m,e,nullable=false)=>Array.isArray(m)&&m.length===e.sets&&m.every(r=>Array.isArray(r)&&r.length===(e.bilateral?2:1)&&r.every(v=>(nullable&&v===null)||(Number.isInteger(v)&&v>=0&&v<=3600)));
 const checkRecord=(r,draft=false)=>{normalizeExercise(r.exercise);if(!matrix(r.target,r.exercise)||!matrix(r.actual,r.exercise,true)||(!draft&&!matrix(r.next,r.exercise)))throw Error('Invalid set records.');if(!['pending','done','skipped'].includes(r.status)||typeof r.isBaseline!=='boolean')throw Error('Invalid result status.');if(r.status==='done'&&r.actual.flat().some(v=>v===null)&&!(!draft&&r.promoted===true&&r.actual.slice(1).every(row=>row.every(v=>v===null))&&r.actual[0].every(v=>v!==null)))throw Error('Incomplete result.');};
 for(const session of s.sessions){if(!session||typeof session.id!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(session.date)||!['main','easy'].includes(session.mode)||!Array.isArray(session.results))throw Error('Invalid session.');session.results.forEach(r=>checkRecord(r));}
 if(s.draft){let d=s.draft;if(!Array.isArray(d.list)||!d.list.length||d.list.length>100||!['main','easy'].includes(d.mode)||!Number.isInteger(d.index)||d.index<0||d.index>d.list.length)throw Error('Invalid workout draft.');d.list.forEach(r=>checkRecord(r,true));if(d.index<d.list.length&&(!d.list[d.index].actual[d.set]||d.side<0||d.side>=d.list[d.index].actual[d.set].length))throw Error('Invalid set cursor.');d.undo=[];if(d.timer&&(!Number.isFinite(d.timer.started)||!Number.isFinite(d.timer.deadline)))throw Error('Invalid timer.');}
 s.summary=null;return s;
}
function stats(state,today=dateKey()){
 const all=state.sessions.filter(s=>s.mode==='main'&&s.results.length);const days=new Set(all.map(s=>s.date));let now=new Date(today+'T12:00:00');const monday=new Date(now);monday.setDate(now.getDate()-((now.getDay()+6)%7));let week=all.filter(s=>s.date>=dateKey(monday)&&s.date<=today);let improved=new Set();for(const s of week)for(const r of s.results){let prior=all.slice(0,all.indexOf(s)).flatMap(x=>x.results).filter(x=>x.exercise.id===r.exercise.id&&x.exercise.generation===r.exercise.generation).at(-1);if(prior&&r.actual.flat().some((v,i)=>v!==null&&v>(prior.actual.flat()[i]??v)))improved.add(r.exercise.id);}let streak=0;
 for(let i=0;i<3660;i++){let d=new Date(now);d.setDate(now.getDate()-i);let key=dateKey(d);if(!state.schedule.includes(d.getDay()))continue;if(i===0&&!days.has(key))continue;if(!days.has(key))break;streak++;}
 return {total:all.length,week:week.length,streak,improved:improved.size};
}
const api={clone,uid,dateKey,seed,entries,history,targets,progress,start,select,log,advance,undo,finish,ready,normalizeExercise,validate,stats};if(typeof module!=='undefined')module.exports=api;else root.OM=api;
})(globalThis);
