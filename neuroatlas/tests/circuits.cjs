// Evidence and topology invariants for the editorial maps, not clinical validation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'web/data.js'),'utf8'),ctx);
const D=ctx.window.ATLAS_DATA,A=require('../web/anatomy.js'),M=require('../web/model.js'),C=require('../web/circuits.js');
const maps=D.conditions.filter(c=>c.map),regions=new Set(D.regions.map(r=>r.id)),sources=new Set(D.sources.map(r=>r.id)),networks=new Set(D.networks.map(n=>n.id));
const results=[];function check(name,f){f();results.push({name,pass:true});}
check('Twenty named disorder/group maps with explicit scope and review date',()=>{
 assert.equal(maps.length,20);assert.equal(new Set(maps.map(c=>c.id)).size,20);
 for(const c of maps){assert.ok(c.category&&c.map.limitation.length>50);assert.equal(c.map.reviewed,'2026-10-22');assert.ok(c.map.aspects.length>=2);assert.equal(new Set(c.map.aspects.map(a=>a.id)).size,c.map.aspects.length);}
});
check('Every aspect has verified references, a basis, limits and resolvable regions',()=>{
 for(const c of maps)for(const a of c.map.aspects){
  assert.ok(['research','model','anatomy'].includes(a.basis));
  for(const f of ['label','text','patient','limit','level'])assert.ok(a[f]?.length>0,`${c.id}/${a.id}/${f}`);
  assert.ok(a.sources.length&&a.nodes.length>=2&&a.links.length);
  assert.equal(new Set(a.nodes).size,a.nodes.length);
  for(const id of a.nodes)assert.ok(regions.has(id),id);
  for(const id of a.sources)assert.ok(sources.has(id),id);
  for(const id of a.networks)assert.ok(networks.has(id),id);
  for(const pair of a.links){assert.equal(pair.length,2);assert.notEqual(pair[0],pair[1]);assert.ok(pair.every(id=>a.nodes.includes(id)),c.id+'/'+a.id);}
 }
});
check('All-view counts and illuminated shapes exactly match selected editorial nodes',()=>{
 for(const c of maps)for(const aspect of ['all',...c.map.aspects.map(a=>a.id)]){
  const selected=C.selection(c,aspect),seen=new Set(),counts=C.counts(selected.nodes,A);
  for(const v of Object.keys(A.views)){
   const expected=selected.nodes.filter(id=>Object.hasOwn(A.marks[v],id));
   assert.equal(counts[v],expected.length);
   const svg=A.svg(v,'',true,{highlighted:selected.nodes,colors:selected.colors,prefix:'circuit-'});
   for(const id of expected){assert.match(svg,new RegExp(`data-region="${id}" class="structure [^"]*circuit-on`));seen.add(id);}
   const marked=[...svg.matchAll(/<path data-region="([^"]+)" class="structure [^"]*circuit-on/g)].map(m=>m[1]);
   assert.deepEqual(marked.sort(),[...expected].sort());
   assert.equal((svg.match(/class="brain-label"/g)||[]).length,expected.length);
  }
  assert.deepEqual([...seen].sort(),[...selected.nodes].sort());
  assert.equal(counts[C.bestView(selected.nodes,A)],Math.max(...Object.values(counts)));
  for(const l of selected.links)assert.ok(l.pair.every(id=>selected.nodes.includes(id)));
 }
});
check('Uncertainty is visible for agoraphobia, ADHD, insomnia and dissociation',()=>{
 const get=id=>maps.find(c=>c.id===id);
 assert.ok(get('agoraphobia-topic').map.aspects.every(a=>a.basis==='model'));
 assert.ok(get('adhd-topic').map.aspects.some(a=>a.sources.includes('adhd-null')));
 const insomnia=get('insomnia-topic').map.aspects.flatMap(a=>a.sources);
 assert.ok(insomnia.includes('insomnia-null')&&insomnia.includes('insomnia-update'));
 assert.match(get('dissociation-topic').map.limitation,/pequenas/);
 const code=fs.readFileSync(path.join(root,'web/circuits.js'),'utf8');
 for(const phrase of ['Não indicam atividade medida, lesão ou gravidade','Não mede o seu cérebro','Linhas de ensino, não fibras medidas','não estão “desligadas”'])assert.ok(code.includes(phrase),phrase);
});
check('New conditions remain searchable and existing bookmark IDs stay valid',()=>{
 for(const id of ['gad-topic','binge-topic','borderline-topic','insomnia-topic'])assert.ok(D.conditions.find(c=>c.id===id));
 assert.ok(M.search(D,'compulsao alimentar').some(c=>c.id==='binge-topic'));
 assert.ok(M.search(D,'agorafobia').some(c=>c.id==='agoraphobia-topic'));
 assert.deepEqual(M.settings({bookmarks:['condition:ocd-topic','condition:depression-topic']}).bookmarks,['condition:ocd-topic','condition:depression-topic']);
});
const report={version:D.version,maps:maps.length,aspects:maps.reduce((n,c)=>n+c.map.aspects.length,0),checks:results,note:'Editorial structure and deterministic mapping verified; not clinical certification.'};
fs.writeFileSync(path.join(root,'qa/circuit-content-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
