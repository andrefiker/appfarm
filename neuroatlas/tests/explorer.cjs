const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');global.window=globalThis;vm.runInThisContext(fs.readFileSync(path.join(root,'web/data.js'),'utf8'));
const D=ATLAS_DATA,A=require('../web/anatomy.js'),C=require('../web/circuits.js'),X=require('../web/explorer.js'),M=require('../web/model.js');
const checks=[],check=(name,f)=>{f();checks.push({name,pass:true});};
let nodeClaims=0,edgeClaims=0;
const ids=D.regions.map(r=>r.id),sourceIds=D.sources.map(s=>s.id);
check('Every region selection and every editorial edge has scoped evidence and a limitation',()=>{
 for(const c of D.conditions.filter(c=>c.map))for(const a of c.map.aspects){
  assert.deepEqual(Object.keys(a.highlights).sort(),[...a.nodes].sort());
  for(const [id,h]of Object.entries(a.highlights)){assert.equal(h.basis,'teaching-selection');assert.ok(h.why.length>20&&h.limit.length>50);assert.ok(h.sources.every(s=>sourceIds.includes(s)));assert.deepEqual(h.contextSources,a.sources);nodeClaims++;}
  assert.equal(a.connections.length,a.links.length);
  for(const [i,e]of a.connections.entries()){assert.deepEqual(e.pair,a.links[i]);assert.equal(e.basis,'teaching');assert.match(e.limit,/não valida esta linha/);assert.deepEqual(e.sources,a.sources);edgeClaims++;}
 }
});
check('Eight function catalogs cross-link existing aspects, networks and sources',()=>{
 assert.equal(D.functions.length,8);
 for(const f of D.functions){assert.ok(f.nodes.every(id=>ids.includes(id)));assert.ok(f.sources.every(id=>sourceIds.includes(id)));assert.ok(f.networks.every(id=>D.networks.some(n=>n.id===id)));assert.ok(new Set(f.members.map(m=>m.condition)).size>=2);for(const m of f.members){const x=X.member(D,m);assert.ok(x.condition&&x.aspect);}}
 assert.ok(M.search(D,'repeticao flexibilidade').some(x=>x.type==='function'));
});
check('Every comparison pairs different conditions and colors intersections consistently',()=>{
 for(const f of D.functions)for(const m of f.members){const state={first:m.condition+'|'+m.aspect};const html=X.comparison(D,f,state);assert.notEqual(state.first.split('|')[0],state.second.split('|')[0]);assert.match(html,/não demonstram causas iguais/);assert.ok(!html.includes('undefined')&&!html.includes('NaN'));}
});
check('Six fictional narratives have five ordered steps and no individual diagnosis or scoring',()=>{
 assert.equal(D.stories.length,6);
 for(const t of D.stories){assert.deepEqual(t.steps.map(s=>s.label),['Situação','Corpo','Atenção','Ação','Consequência']);assert.ok(D.functions.some(f=>f.id===t.function));assert.ok(t.sources.every(id=>sourceIds.includes(id)));assert.match(t.limitation,/não é uma cadeia causal/);for(const step of t.steps){assert.ok(step.nodes.every(id=>ids.includes(id)));assert.ok(step.text.length>50);}}
});
check('Short and extended patient presentations work for every topic, aspect and function',()=>{
 for(const c of D.conditions.filter(c=>c.map))for(const aspect of ['all',...c.map.aspects.map(a=>a.id)])for(const duration of ['short','long']){
  const s={kind:'condition',id:c.id,aspect,duration};const slides=X.slides(D,s);assert.ok(slides.length>=1);if(duration==='short')assert.equal(slides.length,1);else assert.ok(slides.length>=2);for(const slide of slides){assert.ok(slide.nodes.every(id=>ids.includes(id)));assert.ok(slide.sources.every(id=>sourceIds.includes(id)));assert.ok(slide.text.length<750);}
 }
 for(const f of D.functions){assert.equal(X.slides(D,{id:f.id,kind:'function',duration:'long'}).length,3);}
});
check('Anatomical landmarks and internal layers retain valid views and known region names',()=>{
 assert.equal(Object.keys(A.landmarks).length,5);for(const v of Object.keys(A.views)){assert.ok(A.landmarks[v].length>=2);const html=A.svg(v,'',true,{landmarks:true,tissue:'internal'});assert.match(html,/anatomy-landmarks/);assert.ok(!html.includes('undefined'));}
 assert.ok(A.deep.includes('hippocampus')&&!A.deep.includes('dlpfc'));
});
const report={version:D.version,nodeClaims,edgeClaims,functions:D.functions.length,stories:D.stories.length,checks,note:'Structural and editorial checks, not independent clinical validation.'};fs.writeFileSync(path.join(root,'qa/explorer-content-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
