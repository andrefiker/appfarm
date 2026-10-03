const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../app/src/main/assets/logic.js');

function memoryStorage(){let value=null;return {getItem(){return value;},setItem(_key,v){value=v;},read(){return value;}};}

test('seed includes requested topics, seminar brief, and all three queue papers',()=>{
  const data=D.seedData();
  assert.equal(data.topics.length,19);
  assert.ok(data.topics.some(t=>t.name==='Modern Psychiatry'));
  assert.ok(data.topics.some(t=>t.name==='Psychotherapy Outcomes & Mechanisms'));
  assert.equal(data.briefs[0].title,'Why does psychotherapy work?');
  assert.equal(data.briefs[0].takeaways.length,4);
  assert.equal(data.papers.length,3);
  assert.ok(data.papers.every(p=>p.topicId===data.briefs[0].topicId&&p.status==='Queue'));
  assert.ok(data.papers.every(p=>p.journal===''&&p.url===''));
});

test('first load seeds once and subsequent loads preserve local edits',()=>{
  const store=memoryStorage(),first=D.load(store);first.topics[0].status='Rusty';D.save(store,first);
  const next=D.load(store);assert.equal(next.topics[0].status,'Rusty');assert.equal(next.briefs.length,1);
});

test('review action sets supplied date and Fresh status',()=>{
  const data=D.seedData(),id=data.topics[0].id;
  assert.equal(D.markReviewed(data,id,'2026-10-04'),true);
  assert.equal(data.topics[0].status,'Fresh');assert.equal(data.topics[0].lastReviewed,'2026-10-04');
});

test('review ordering places Rusty topics before Cooling topics',()=>{
  const data=D.seedData();data.topics[0].status='Cooling';data.topics[3].status='Rusty';
  const ordered=D.reviewTopics(data);
  assert.equal(ordered[0].status,'Rusty');assert.equal(ordered[1].status,'Cooling');
});

test('paper status changes survive save and reload',()=>{
  const store=memoryStorage(),data=D.load(store),id=data.papers[0].id;
  assert.equal(D.setPaperStatus(data,id,'Read'),true);D.save(store,data);
  assert.equal(D.load(store).papers[0].status,'Read');
});

test('topic status changes survive save and reload',()=>{
  const store=memoryStorage(),data=D.load(store),id=data.topics[4].id;
  assert.equal(D.setTopicStatus(data,id,'Rusty'),true);D.save(store,data);
  assert.equal(D.load(store).topics[4].status,'Rusty');
});

test('open question resolution survives save and reload',()=>{
  const store=memoryStorage(),data=D.load(store),id=data.questions[0].id;
  assert.equal(D.resolveQuestion(data,id,true),true);D.save(store,data);
  assert.equal(D.load(store).questions[0].resolved,true);
});
