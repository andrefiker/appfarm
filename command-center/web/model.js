/* Pure reporting model; no provider access or inferred completion. */
(function(root){
 const statuses=['VERIFIED COMPLETE','ACTIVE','BLOCKED','NEEDS REVIEW','UNKNOWN'];
 const string=(v)=>typeof v==='string'?v:'';
 function health(s,now=Date.now()){
  if(!s||s.result==='NO CURRENT FEED')return 'MANUAL / UNKNOWN';
  if(s.result==='CHECKING')return 'CHECK INCOMPLETE';
  if(s.result!=='OK')return 'ERROR';
  const t=Date.parse(s.lastSuccess);if(!Number.isFinite(t))return 'UNKNOWN';
  return now-t>Number(s.ttlHours)*3600000?'STALE':'CHECKED';
 }
 function validate(raw){
  if(!raw||raw.schemaVersion!==1||!Array.isArray(raw.projects)||!Array.isArray(raw.sources)||raw.projects.length>100||raw.sources.length>40||!Number.isFinite(Date.parse(raw.capturedAt)))throw Error('This file is not a supported project snapshot.');
  const ids=new Set();const projects=raw.projects.map(p=>{
   if(!p.id||ids.has(p.id)||!statuses.includes(p.status))throw Error('Duplicate project or invalid status.');ids.add(p.id);
   return Object.fromEntries(['id','title','area','status','priority','lastEvidence','nextAction','blocker','sourceUrl','mode','approval','scope','summary','sourceId'].map(k=>[k,string(p[k]).slice(0,1500)]));
  });
  const sourceIds=new Set();const sources=raw.sources.map(s=>{
   if(!s.id||sourceIds.has(s.id)||!Number.isFinite(Number(s.ttlHours)))throw Error('Invalid source record.');sourceIds.add(s.id);
   return {...Object.fromEntries(['id','title','mode','lastSuccess','result','summary','boundary','url'].map(k=>[k,string(s[k]).slice(0,1500)])),ttlHours:Number(s.ttlHours)};
  });
  const completed=(Array.isArray(raw.completed)?raw.completed:[]).slice(0,100).map(c=>({project:string(c.project),title:string(c.title),status:'VERIFIED COMPLETE',scope:string(c.scope)}));
  const dashboardUrl=typeof raw.dashboardUrl==='string'&&raw.dashboardUrl.startsWith('https://docs.google.com/spreadsheets/')?raw.dashboardUrl:'https://docs.google.com/spreadsheets/';
  return {schemaVersion:1,capturedAt:raw.capturedAt,dashboardUrl,projects,sources,completed};
 }
 function select(projects,query='',filter='ALL'){
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return projects.filter(p=>(filter==='ALL'||p.status===filter)&&norm(p.title+' '+p.area).includes(norm(query)));
 }
 const api={health,validate,select};if(typeof module!=='undefined')module.exports=api;else root.CCModel=api;
})(typeof window!=='undefined'?window:globalThis);
