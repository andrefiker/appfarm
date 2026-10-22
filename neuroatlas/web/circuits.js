/* Original teaching maps. No patient data, inference engine, or tractography. */
(function(root){
'use strict';
const palette=['#79d9c2','#b8a6ed','#edb779','#92b7ef'];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique=items=>[...new Set(items)];
const basisLabels={research:'Associações em estudos de grupo',model:'Modelo de função geral',anatomy:'Via anatômica · esquema incompleto'};
function selection(c,id='all'){
 const aspects=id==='all'?c.map.aspects:c.map.aspects.filter(a=>a.id===id);
 if(!aspects.length)throw Error('Unknown aspect: '+id);
 const colors={},links=[];
 for(const a of aspects){const color=palette[c.map.aspects.indexOf(a)%palette.length];for(const n of a.nodes)colors[n]??=color;a.links.forEach((pair,index)=>links.push({pair,color,aspect:a.id,basis:a.basis,index}));}
 return {aspects,nodes:unique(aspects.flatMap(a=>a.nodes)),sources:unique(aspects.flatMap(a=>a.sources)),networks:unique(aspects.flatMap(a=>a.networks)),colors,links};
}
function counts(nodes,A){return Object.fromEntries(Object.keys(A.views).map(v=>[v,nodes.filter(id=>Object.prototype.hasOwnProperty.call(A.marks[v],id)).length]));}
function bestView(nodes,A){const c=counts(nodes,A);return ['medial','coronalA','lateral','coronalP','inferior'].sort((a,b)=>c[b]-c[a])[0];}
function resetTransform(s){s.zoom=1;s.panX=s.panY=0;}
function ensure(c,s,A){if(!c.map.aspects.some(a=>a.id===s.aspect)&&s.aspect!=='all')s.aspect=c.map.aspects[0].id;if(!A.views[s.view])s.view=bestView(selection(c,s.aspect).nodes,A);if(!s.zoom)resetTransform(s);return s;}
function diagram(D,selected,s){
 return `<div class="circuit-diagram" role="group" aria-label="Diagrama de relações didáticas, sem posição anatômica"><svg aria-hidden="true">${selected.links.map(({pair:[a,b],color},i)=>`<path class="circuit-link ${(s.node||s.edge!=null)?((s.node?[a,b].includes(s.node):s.edge===i)?'focused-link':'muted-link'):''}" data-edge="${a}:${b}" d="M0 0L0 0" stroke="${color}"/>`).join('')}</svg>${selected.nodes.map(id=>{const r=D.regions.find(r=>r.id===id);return `<button class="circuit-node" data-action="circuit-node" data-id="${id}" aria-label="Destacar ${escape(r.name)} na anatomia" aria-pressed="${s.node===id}" style="--node-color:${selected.colors[id]}">${escape(r.short)}</button>`;}).join('')}</div>`;
}
let diagramObserver;
function bindDiagram(){
 diagramObserver?.disconnect();const box=document.querySelector('.circuit-diagram');if(!box)return;
 const update=()=>{const br=box.getBoundingClientRect(),svg=box.querySelector('svg');if(!br.width||!br.height)return;svg.setAttribute('viewBox',`0 0 ${br.width} ${br.height}`);box.querySelectorAll('[data-edge]').forEach(edge=>{const [a,b]=edge.dataset.edge.split(':'),p=box.querySelector(`[data-id="${a}"]`).getBoundingClientRect(),q=box.querySelector(`[data-id="${b}"]`).getBoundingClientRect(),px=p.x-br.x+p.width/2,py=p.y-br.y+p.height/2,qx=q.x-br.x+q.width/2,qy=q.y-br.y+q.height/2;edge.setAttribute('d',`M${px} ${py} C${br.width/2} ${py} ${br.width/2} ${qy} ${qx} ${qy}`);});};
 update();if(typeof ResizeObserver!=='undefined'){diagramObserver=new ResizeObserver(update);diagramObserver.observe(box);}
}
function sources(D,ids){return [...new Set(ids)].map(id=>{const x=D.sources.find(r=>r.id===id);return `<button class="source-button" data-action="source" data-id="${id}">${escape(x.author)} · ${escape(x.year)}<span>${escape(x.title)}</span></button>`;}).join('');}
function evidence(D,c,s,selected){
 const r=D.regions.find(r=>r.id===s.node),edge=selected.links[s.edge];
 if(r){const aspects=selected.aspects.filter(a=>a.nodes.includes(r.id));return `<section class="circuit-region highlight-evidence" aria-live="polite"><div class="eyebrow">POR QUE ESTA REGIÃO?</div><h3>${escape(r.name)}</h3><p>${escape(r.location)}</p><span class="level">Localização anatômica · esquema</span><p>${escape(r.function)}</p><span class="level developing">Seleção didática · função geral</span><p>${escape(aspects[0].highlights[r.id].limit)}</p><details><summary>Fontes da região e do recorte</summary><h4>Localização e função geral</h4>${sources(D,[...new Set(['anatomy',...r.sources])])}<h4>Contexto: ${escape(aspects.map(a=>a.label).join(' / '))}</h4><p>Estas fontes contextualizam o recorte. Não demonstram alteração desta área em cada pessoa.</p>${sources(D,aspects.flatMap(a=>a.sources))}</details><button class="secondary wide" data-action="region-detail" data-id="${r.id}">Ler sobre esta região</button></section>`;}
 if(edge){const a=c.map.aspects.find(a=>a.id===edge.aspect),e=a.connections[edge.index];return `<section class="highlight-evidence edge-evidence" aria-live="polite"><div class="eyebrow">POR QUE ESTA RELAÇÃO?</div><h3>${escape(edge.pair.map(id=>D.regions.find(r=>r.id===id).short).join(' ↔ '))}</h3><span class="level developing">Modelo de ensino · linha editorial</span><p>${escape(e.why)}</p><p>${escape(e.limit)}</p><details><summary>Fonte e alcance da afirmação</summary><p>${escape(a.text)}</p><p>${escape(a.limit)}</p>${sources(D,e.sources)}</details></section>`;}
 return `<div class="evidence-prompt">Toque em uma região ou relação para ver por que foi incluída e quais são suas fontes.</div>`;
}
function render(D,c,s,patient){
 const A=root.Anatomy;ensure(c,s,A);const selected=selection(c,s.aspect),visible=selected.nodes.filter(id=>A.marks[s.view][id]),n=counts(selected.nodes,A);
 const current=selected.aspects[0],all=s.aspect==='all',heading=all?'Visão integrada':current.label;
 const viewNames={lateral:'Lateral',medial:'Medial',inferior:'Inferior',coronalA:'Corte A',coronalP:'Corte P'};
 return `<div class="explorer-heading"><div class="eyebrow">CLÍNICA / EXPLORADOR INTEGRADO</div><h1>${escape(c.name)}</h1><div class="explorer-actions"><button class="primary" data-action="present" data-id="${c.id}">Apresentar ao paciente ↗</button><button class="secondary" data-action="${patient?'clinician':'show-patient'}">${patient?'Voltar à leitura clínica':'Mostrar ao paciente'}</button></div></div>
 <p class="circuit-boundary">${patient?'O brilho mostra o que estamos explicando. Não mede o seu cérebro.':'Destaques de ensino. Não indicam atividade medida, lesão ou gravidade.'}</p>
 <section class="circuit-explorer" aria-label="Explorar aspectos e anatomia">
 <div class="circuit-aspects" role="group" aria-label="Aspectos do transtorno"><button data-action="circuit-aspect" data-id="all" aria-pressed="${all}">Conjunto</button>${c.map.aspects.map((a,i)=>`<button data-action="circuit-aspect" data-id="${a.id}" aria-pressed="${a.id===s.aspect}"><span class="swatch" style="background:${palette[i%palette.length]}"></span>${escape(a.label)}</button>`).join('')}</div>
 <div class="recut-nav"><button data-action="circuit-step" data-id="prev" aria-label="Recorte anterior">← Anterior</button><span>${all?'Conjunto':`${c.map.aspects.indexOf(current)+1} de ${c.map.aspects.length}`}</span><button data-action="circuit-step" data-id="next" aria-label="Próximo recorte">Próximo →</button></div>
 <div class="circuit-description" aria-live="polite"><h2>${escape(heading)}</h2><p>${all?'Recortes complementares reunidos. O mapa não é completo nem identifica um diagnóstico.':escape(patient?current.patient:current.text)}</p>${!patient?`<span class="level developing">${all?'Evidência em desenvolvimento':escape(basisLabels[current.basis])}</span>`:''}</div>
 <div class="circuit-views" role="group" aria-label="Vistas do mapa">${Object.keys(viewNames).map(v=>`<button data-action="circuit-view" data-id="${v}" aria-pressed="${s.view===v}" aria-label="${viewNames[v]}: ${n[v]} regiões em destaque">${viewNames[v]}<span>${n[v]}</span></button>`).join('')}</div>
 <div class="unified-map"><figure class="atlas-panel circuit-anatomy" style="margin:0"><div class="figure-head"><span class="eyebrow">${escape(A.views[s.view].name)} · ${visible.length}/${selected.nodes.length} REGIÕES</span><span class="pill">Esquema</span></div>
 <div class="anatomy-options"><button data-action="circuit-layer" data-id="internal" aria-pressed="${s.tissue==='internal'}">Foco interno</button><button data-action="circuit-landmarks" aria-pressed="${!!s.landmarks}">Marcos anatômicos</button></div>
 <div class="viewport" id="circuit-viewport">${A.svg(s.view,s.node||'',true,{highlighted:selected.nodes,colors:selected.colors,prefix:'circuit-',emphasis:s.edge!=null?selected.links[s.edge]?.pair:[],tissue:s.tissue,landmarks:s.landmarks})}</div>
 ${s.landmarks?`<div class="landmark-key">Traços claros: ${A.landmarks[s.view].map(m=>escape(m.label)).join(' · ')}. Posições aproximadas.</div>`:''}
 <div class="figure-tools"><div class="zoom-controls"><button data-action="circuit-zoom" data-id="in" aria-label="Ampliar mapa">+</button><button data-action="circuit-zoom" data-id="out" aria-label="Reduzir mapa">−</button><button data-action="circuit-zoom" data-id="reset" aria-label="Redefinir ampliação do mapa"><span id="circuit-zoom-value">1×</span> · redefinir</button></div><span class="small muted">pinça + arraste</span></div>
 <figcaption class="figure-caption">${escape(A.views[s.view].caption)}. ${selected.nodes.length-visible.length} regiões em outros planos. Sem escala; não é exame. Áreas amplas resumem subdivisões.</figcaption>
 <div class="circuit-visible" aria-label="Regiões destacadas nesta vista">${visible.map(id=>`<button data-action="circuit-node" data-id="${id}" aria-pressed="${s.node===id}"><span class="swatch" style="background:${selected.colors[id]}"></span>${escape(D.regions.find(r=>r.id===id).short)}</button>`).join('')}</div></figure>
 <section class="relations-panel"><div class="eyebrow">MESMO RECORTE / RELAÇÕES</div><h3>Como as ideias se conectam</h3><p class="small muted">Diagrama sem posição anatômica. Linhas de ensino, não fibras medidas.</p>${diagram(D,selected,s)}<details class="edge-list"><summary>Examinar ${selected.links.length} relações e fontes</summary>${selected.links.map((l,i)=>`<button class="edge-button" data-action="circuit-edge" data-id="${i}" aria-pressed="${s.edge===i}"><span>${escape(l.pair.map(id=>D.regions.find(r=>r.id===id).short).join(' ↔ '))}</span><span class="small muted">${escape(c.map.aspects.find(a=>a.id===l.aspect).label)} · ensino</span></button>`).join('')}</details></section></div>
 ${!visible.length?`<div class="callout">Este plano não mostra as estruturas deste recorte. <button class="secondary wide" data-action="circuit-view" data-id="${bestView(selected.nodes,A)}">Ir à vista com mais destaques</button></div>`:''}
 ${evidence(D,c,s,selected)}
 <div class="circuit-legend">${selected.aspects.map(a=>`<span><i class="swatch" style="background:${palette[c.map.aspects.indexOf(a)%palette.length]}"></i>${escape(a.label)}</span>`).join('')}</div></section>
 <details class="circuit-limits"><summary>Limites e contexto</summary><p>${escape(patient?'Este desenho mostra apenas algumas relações. Ele não explica sozinho uma pessoa e não identifica um diagnóstico.':c.map.limitation)}</p>${!all&&!patient?`<p>${escape(current.limit)}</p>`:''}<p>Biologia, aprendizagem, relações e condições de vida interagem. Regiões sem brilho não estão “desligadas”.</p><p>${escape(patient?c.patient:c.summary)}</p></details>
 ${!patient?`<details class="circuit-evidence"><summary>Base de cada recorte</summary>${selected.aspects.map(a=>`<div><h3>${escape(a.label)}</h3><p>${escape(basisLabels[a.basis])}. ${escape(a.text)}</p><p class="small muted">${escape(a.limit)}</p>${sources(D,a.sources)}</div>`).join('')}</details>`:''}
 <button class="secondary wide" data-action="condition-detail" data-id="${c.id}">Ler o tema clínico completo</button>`;
}
function transform(s){const el=document.querySelector('#circuit-viewport'),g=el?.querySelector('#circuit-brain-transform');if(!g)return;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));s.zoom=clamp(s.zoom||1,1,4);s.panX=clamp(s.panX||0,-(s.zoom-1)*310,(s.zoom-1)*310);s.panY=clamp(s.panY||0,-(s.zoom-1)*225,(s.zoom-1)*225);
 g.setAttribute('transform',`translate(${s.panX} ${s.panY}) translate(310 225) scale(${s.zoom}) translate(-310 -225)`);document.querySelector('#circuit-zoom-value').textContent=s.zoom.toFixed(1)+'×';
}
function zoom(s,id){if(id==='reset')resetTransform(s);else s.zoom=(s.zoom||1)*(id==='in'?1.4:1/1.4);transform(s);}
function bind(s,onNode){bindDiagram();const el=document.querySelector('#circuit-viewport');if(!el)return;const points=new Map();let origin,last,distance,startZoom,moved=false;
 el.style.touchAction='none';
 el.addEventListener('pointerdown',e=>{points.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);if(points.size===1){origin={x:e.clientX,y:e.clientY};last=origin;moved=false;}if(points.size===2){const [a,b]=[...points.values()];distance=Math.hypot(a.x-b.x,a.y-b.y);startZoom=s.zoom;moved=true;}});
 el.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;const p={x:e.clientX,y:e.clientY};points.set(e.pointerId,p);if(points.size===2){const [a,b]=[...points.values()];s.zoom=startZoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,distance);moved=true;transform(s);}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>5)moved=true;if(s.zoom>1&&last){s.panX+=(p.x-last.x)*620/el.clientWidth;s.panY+=(p.y-last.y)*620/el.clientWidth;transform(s);}last=p;}});
 el.addEventListener('pointerup',e=>{points.delete(e.pointerId);if(!moved){const node=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-region]');if(node)onNode(node.dataset.region);}last=points.values().next().value;});
 el.addEventListener('pointercancel',e=>{points.delete(e.pointerId);moved=true;last=null;});transform(s);
}
root.NeuroCircuits={palette,basisLabels,selection,counts,bestView,resetTransform,ensure,render,zoom,bind};
if(typeof module!=='undefined')module.exports=root.NeuroCircuits;
})(typeof window!=='undefined'?window:globalThis);
