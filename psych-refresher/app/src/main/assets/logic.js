(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PsychData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TODAY = '2026-10-03';
  const topicSeeds = [
    ['Modern Psychiatry','Psychiatry','A pluralistic field increasingly combining diagnosis, medication, psychotherapy, and social context.'],
    ['Psychotherapy Outcomes & Mechanisms','Psychotherapy','Outcomes emerge from interacting treatment methods, relationships, therapists, and patient change processes.'],
    ['Rogers / Humanistic Psychology','Psychotherapy','Rogers framed empathy, congruence, and acceptance as conditions that support constructive change.'],
    ['ADHD','Clinical science','A heterogeneous neurodevelopmental condition involving developmentally persistent patterns of inattention and/or hyperactivity-impulsivity.'],
    ['Consciousness / Self / Agency','Mind & brain','Conscious experience, self-models, and agency are related but distinct explanatory problems.'],
    ['Modern Learning Theory','Behavioral science','Learning research now spans associative, computational, social, and embodied accounts of adaptation.'],
    ['Affect & Emotion','Affective science','Emotion is studied as coordinated appraisal, bodily change, action readiness, and social meaning.'],
    ['Memory & Reconsolidation','Neuroscience','Retrieval can make some memories temporarily modifiable, though clinical translation remains qualified.'],
    ['Personality','Individual differences','Personality reflects relatively stable patterns that still vary with context, development, and measurement.'],
    ['Developmental Psychopathology','Development','Risk and resilience develop through transactions across people, environments, and time.'],
    ['Trauma / PTSD','Clinical science','PTSD is a specific syndrome; trauma exposure alone does not imply disorder or a single pathway.'],
    ['Placebo / Expectancy','Psychology & medicine','Expectations and learning can shape symptoms and treatment experience through several mechanisms.'],
    ['Social Neuroscience','Neuroscience','Social behavior recruits distributed systems whose meaning depends on task and context.'],
    ['Psychometrics','Methods','Measurement quality depends on the construct, population, use, and consequences of scores.'],
    ['Replication & Methodology','Research methods','Confidence grows through converging methods, transparent analysis, and informative replication.'],
    ['Embodied Cognition / Interoception','Mind & body','Bodily signals can contribute to perception and regulation, with contested claims about their scope.'],
    ['Digital Mental Health / AI Therapy','Technology & care','Digital interventions range from guided tools to conversational systems, with evidence and risks varying by use.'],
    ['Computational Psychiatry','Psychiatry & computation','Computational models aim to formalize how learning and decision processes relate to symptoms.'],
    ['Philosophy of Mind','Philosophy','Philosophy of mind clarifies competing accounts of experience, representation, and personhood.']
  ];
  const seedBriefId = 'brief-psychotherapy-outcomes-2026-10-03';
  function seedData() {
    const topics = topicSeeds.map((t,i)=>({id:'topic-'+(i+1),name:t[0],category:t[1],status:i===1?'Fresh':'New',lastReviewed:i===1?TODAY:'',currentUnderstanding:t[2]}));
    const outcome = topics[1];
    const brief = {id:seedBriefId,title:'Why does psychotherapy work?',date:TODAY,topicId:outcome.id,whyItMatters:'Modern psychotherapy research is moving away from a simple technique-vs-common-factors debate toward dynamic therapist-patient-process interactions.',notes:'',reviewed:false,takeaways:[
      'Alliance predicts outcome, but causality is reciprocal.',
      'Therapist effects are real, roughly 5–8% of outcome variance in recent reviews.',
      'Adherence to a manual alone does not guarantee better outcome.',
      'Relationship and technique are dynamically entangled.'
    ]};
    const papers = [
      {id:'paper-fluckiger-2020',title:'The reciprocal relationship between alliance and early treatment symptoms',authors:'Flückiger et al.',year:'2020',journal:'',url:'',topicId:outcome.id,whyRead:'A useful test of whether alliance predicts later improvement, improvement predicts later alliance, or both.',status:'Queue',personalNote:''},
      {id:'paper-alfonsson-2026',title:'The therapist effect in adult psychotherapy: a systematic scoping review of reviews',authors:'Alfonsson et al.',year:'2026',journal:'',url:'',topicId:outcome.id,whyRead:'Maps how therapist effects have been defined and estimated across reviews.',status:'Queue',personalNote:''},
      {id:'paper-power-2022',title:'Associations between treatment adherence-competence-integrity and adult psychotherapy outcomes',authors:'Power et al.',year:'2022',journal:'',url:'',topicId:outcome.id,whyRead:'Helps separate fidelity to a treatment model from skillful delivery and patient outcome.',status:'Queue',personalNote:''}
    ];
    const questions = [
      {id:'q-alliance-direction',text:'What designs best distinguish alliance causing improvement from improvement strengthening alliance?',topicId:outcome.id,seminarBriefId:brief.id,resolved:false},
      {id:'q-therapist-measure',text:'How much do therapist effects change after case mix and setting are modeled well?',topicId:outcome.id,seminarBriefId:brief.id,resolved:false},
      {id:'q-fidelity',text:'When does adherence help, and when does flexible responsiveness matter more?',topicId:outcome.id,seminarBriefId:brief.id,resolved:false},
      {id:'q-adhd-heterogeneity',text:'Which ADHD subgroups show meaningfully different treatment response?',topicId:topics[3].id,seminarBriefId:null,resolved:false},
      {id:'q-memory-clinic',text:'How strong is the evidence that reconsolidation findings improve routine therapy?',topicId:topics[7].id,seminarBriefId:null,resolved:false}
    ];
    return {version:1,topics,briefs:[brief],papers,questions};
  }
  function clone(x){return JSON.parse(JSON.stringify(x));}
  function load(storage) {
    try { const raw=storage.getItem('psych-refresher-v1'); if(raw){const parsed=JSON.parse(raw);if(parsed&&parsed.version===1&&Array.isArray(parsed.topics)&&Array.isArray(parsed.briefs)&&Array.isArray(parsed.papers)&&Array.isArray(parsed.questions))return parsed;} } catch (_) {}
    const fresh=seedData(); save(storage,fresh); return fresh;
  }
  function save(storage,data){storage.setItem('psych-refresher-v1',JSON.stringify(data));return data;}
  function markReviewed(data,topicId,date){const t=data.topics.find(x=>x.id===topicId);if(!t)return false;t.status='Fresh';t.lastReviewed=date;return true;}
  function reviewTopics(data){const order={Rusty:0,Cooling:1,New:2,Fresh:3};return data.topics.filter(t=>t.status==='Rusty'||t.status==='Cooling').slice().sort((a,b)=>order[a.status]-order[b.status]||a.name.localeCompare(b.name));}
  function setTopicStatus(data,id,status){if(!['New','Fresh','Cooling','Rusty'].includes(status))return false;const t=data.topics.find(x=>x.id===id);if(!t)return false;t.status=status;return true;}
  function setPaperStatus(data,id,status){if(!['Queue','Reading','Read','Skip'].includes(status))return false;const p=data.papers.find(x=>x.id===id);if(!p)return false;p.status=status;return true;}
  function resolveQuestion(data,id,resolved){const q=data.questions.find(x=>x.id===id);if(!q)return false;q.resolved=Boolean(resolved);return true;}
  function newestBrief(data){return data.briefs.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]||null;}
  function makeId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
  return {TODAY,seedData,clone,load,save,markReviewed,reviewTopics,setTopicStatus,setPaperStatus,resolveQuestion,newestBrief,makeId};
});
