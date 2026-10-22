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
 for(const a of aspects){const color=palette[c.map.aspects.indexOf(a)%palette.length];for(const n of a.nodes)colors[n]??=color;for(const pair of a.links)links.push({pair,color,aspect:a.id,basis:a.basis});}
 return {aspects,nodes:unique(aspects.flatMap(a=>a.nodes)),sources:unique(aspects.flatMap(a=>a.sources)),networks:unique(aspects.flatMap(a=>a.networks)),colors,links};
}
function counts(nodes,A){return Object.fromEntries(Object.keys(A.views).map(v=>[v,nodes.filter(id=>Object.prototype.hasOwnProperty.call(A.marks[v],id)).length]));}
function bestView(nodes,A){const c=counts(nodes,A);return ['medial','coronalA','lateral','coronalP','inferior'].sort((a,b)=>c[b]-c[a])[0];}
function resetTransform(s){s.zoom=1;s.panX=s.panY=0;}
function ensure(c,s,A){if(!c.map.aspects.some(a=>a.id===s.aspect)&&s.aspect!=='all')s.aspect='all';if(!A.views[s.view])s.view=bestView(selection(c,s.aspect).nodes,A);if(!s.zoom)resetTransform(s);return s;}
function diagram(D,selected,s){
 const height=Math.ceil(selected.nodes.length/2)*82+10;
 const positions=Object.fromEntries(selected.nodes.map((id,i)=>[id,[i%2?240:80,Math.floor(i/2)*82+38]]));
 return `<div class="circuit-diagram" style="height:${height}px" role="group" aria-label="Diagrama de relações didáticas, sem posição anatômica">
 <svg viewBox="0 0 320 ${height}" preserveAspectRatio="none" aria-hidden="true">${selected.links.map(({pair:[a,b],color})=>{const p=positions[a],q=positions[b];return `<path class="circuit-link" data-edge="${a}:${b}" d="M${p[0]} ${p[1]} C160 ${p[1]} 160 ${q[1]} ${q[0]} ${q[1]}" stroke="${color}"/>`;}).join('')}</svg>
 ${selected.nodes.map(id=>{const r=D.regions.find(r=>r.id===id),p=positions[id];return `<button class="circuit-node" data-action="circuit-node" data-id="${id}" aria-label="Destacar ${escape(r.name)} na anatomia" aria-pressed="${s.node===id}" style="left:${(p[0]-68)/3.2}%;top:${p[1]-28}px;width:42.5%;--node-color:${selected.colors[id]}">${escape(r.short)}</button>`;}).join('')}</div>`;
}
function render(D,c,s,patient){
 const A=root.Anatomy;ensure(c,s,A);const selected=selection(c,s.aspect),visible=selected.nodes.filter(id=>A.marks[s.view][id]),n=counts(selected.nodes,A);
 const current=selected.aspects[0],all=s.aspect==='all',r=D.regions.find(r=>r.id===s.node);
 const heading=all?'Visão integrada':current.label;
 const viewNames={lateral:'Lateral',medial:'Medial',inferior:'Inferior',coronalA:'Corte A',coronalP:'Corte P'};
 return `<div class="eyebrow">${escape(c.category)} / EXPLORADOR</div><h1>${escape(c.name)}</h1><p class="circuit-lead">${escape(patient?c.patient:c.summary)}</p>
 <div class="circuit-mode"><span class="pill">${patient?'Vista para paciente':'Leitura clínica'}</span><button class="secondary" data-action="${patient?'clinician':'show-patient'}">${patient?'Voltar à leitura clínica':'Mostrar ao paciente'}</button></div>
 <p class="circuit-boundary">${patient?'O brilho mostra o que estamos explicando. Não mede o seu cérebro.':'Cor e brilho indicam seleção didática, não lesão, hiperatividade ou intensidade de sintomas.'}</p>
 <section class="circuit-explorer" aria-label="Explorar aspectos e anatomia">
 <div class="eyebrow">ESCOLHA UM RECORTE</div><div class="circuit-aspects" role="group" aria-label="Aspectos do transtorno"><button data-action="circuit-aspect" data-id="all" aria-pressed="${all}">Conjunto</button>${c.map.aspects.map((a,i)=>`<button data-action="circuit-aspect" data-id="${a.id}" aria-pressed="${a.id===s.aspect}"><span class="swatch" style="background:${palette[i%palette.length]}"></span>${escape(a.label)}</button>`).join('')}</div>
 <div class="circuit-description" aria-live="polite"><h2>${escape(heading)}</h2><p>${all?(patient?'Várias funções se encontram. Toque em um recorte para acompanhar uma relação de cada vez.':'Recortes complementares reunidos para estudo. Não são uma lista completa de mecanismos nem uma assinatura do diagnóstico.'):escape(patient?current.patient:current.text)}</p><span class="level developing">${all?'Conhecimento em desenvolvimento':escape(basisLabels[current.basis])}</span></div>
 <div class="circuit-views" role="group" aria-label="Vistas do mapa">${Object.keys(viewNames).map(v=>`<button data-action="circuit-view" data-id="${v}" aria-pressed="${s.view===v}" aria-label="${viewNames[v]}: ${n[v]} regiões em destaque">${viewNames[v]}<span>${n[v]}</span></button>`).join('')}</div>
 <figure class="atlas-panel circuit-anatomy" style="margin:0"><div class="figure-head"><span class="eyebrow">${escape(A.views[s.view].name)} · ${visible.length}/${selected.nodes.length} REGIÕES</span><span class="pill">Esquema</span></div>
 <div class="viewport" id="circuit-viewport">${A.svg(s.view,s.node||'',true,{highlighted:selected.nodes,colors:selected.colors,prefix:'circuit-'})}</div>
 <div class="figure-tools"><div class="zoom-controls"><button data-action="circuit-zoom" data-id="in" aria-label="Ampliar mapa">+</button><button data-action="circuit-zoom" data-id="out" aria-label="Reduzir mapa">−</button><button data-action="circuit-zoom" data-id="reset" aria-label="Redefinir ampliação do mapa"><span id="circuit-zoom-value">1×</span> · redefinir</button></div><span class="small muted">pinça + arraste</span></div>
 <figcaption class="figure-caption">${escape(A.views[s.view].caption)}. ${selected.nodes.length-visible.length} regiões em outros planos. Esquema sem escala; não é exame. Achados frequentemente bilaterais são resumidos nestas vistas.</figcaption></figure>
 ${!visible.length?`<div class="callout">Este plano não mostra as estruturas deste recorte. <button class="secondary wide" data-action="circuit-view" data-id="${bestView(selected.nodes,A)}">Ir à vista com mais destaques</button></div>`:''}
 <div class="circuit-visible" aria-label="Regiões destacadas nesta vista">${visible.map(id=>`<button data-action="circuit-node" data-id="${id}" aria-pressed="${s.node===id}"><span class="swatch" style="background:${selected.colors[id]}"></span>${escape(D.regions.find(r=>r.id===id).short)}</button>`).join('')}</div>
 ${r?`<div class="circuit-region" aria-live="polite"><h3>${escape(r.name)}</h3><p>${escape(patient?r.patient:r.location)}</p><button class="secondary wide" data-action="region-detail" data-id="${r.id}">Ler sobre esta região</button></div>`:''}
 <div class="section-head"><h2>Relações entre regiões</h2></div><p class="small muted">${patient?'As linhas ajudam a explicar relações. Toque em um nome para encontrá-lo no desenho.':'Diagrama sem posição anatômica: traços didáticos, sem direção, força ou trajeto de fibras. Não indicam que cada ligação foi medida nos estudos citados. Toque para localizar.'}</p>
 ${diagram(D,selected,s)}
 <div class="circuit-legend">${selected.aspects.map(a=>`<span><i class="swatch" style="background:${palette[c.map.aspects.indexOf(a)%palette.length]}"></i>${escape(a.label)}</span>`).join('')}</div>
 </section>
 <div class="callout circuit-limits"><strong>O que o mapa não mostra</strong><p>${escape(patient?'Este desenho mostra apenas algumas relações. Ele não explica sozinho uma pessoa e não identifica um diagnóstico.':c.map.limitation)}</p>${!all&&!patient?`<p>${escape(current.limit)}</p>`:''}<p>Biologia, aprendizagem, relações e condições de vida interagem. Regiões sem brilho não estão “desligadas”.</p></div>
 ${all&&!patient?`<details class="circuit-evidence"><summary>Base de cada recorte</summary>${c.map.aspects.map(a=>`<div><h3>${escape(a.label)}</h3><p class="small">${escape(basisLabels[a.basis])}. ${escape(a.text)}</p><p class="small muted">${escape(a.limit)}</p>${a.sources.map(id=>`<button class="source-button" data-action="source" data-id="${id}">${escape(D.sources.find(x=>x.id===id).author)} · ${escape(D.sources.find(x=>x.id===id).year)}</button>`).join('')}</div>`).join('')}</details>`:''}
 <button class="secondary wide" data-action="condition-detail" data-id="${c.id}">Ler o tema clínico completo</button>`;
}
function transform(s){const el=document.querySelector('#circuit-viewport'),g=el?.querySelector('#circuit-brain-transform');if(!g)return;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));s.zoom=clamp(s.zoom||1,1,4);s.panX=clamp(s.panX||0,-(s.zoom-1)*310,(s.zoom-1)*310);s.panY=clamp(s.panY||0,-(s.zoom-1)*225,(s.zoom-1)*225);
 g.setAttribute('transform',`translate(${s.panX} ${s.panY}) translate(310 225) scale(${s.zoom}) translate(-310 -225)`);document.querySelector('#circuit-zoom-value').textContent=s.zoom.toFixed(1)+'×';
}
function zoom(s,id){if(id==='reset')resetTransform(s);else s.zoom=(s.zoom||1)*(id==='in'?1.4:1/1.4);transform(s);}
function bind(s,onNode){const el=document.querySelector('#circuit-viewport');if(!el)return;const points=new Map();let origin,last,distance,startZoom,moved=false;
 el.style.touchAction='none';
 el.addEventListener('pointerdown',e=>{points.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);if(points.size===1){origin={x:e.clientX,y:e.clientY};last=origin;moved=false;}if(points.size===2){const [a,b]=[...points.values()];distance=Math.hypot(a.x-b.x,a.y-b.y);startZoom=s.zoom;moved=true;}});
 el.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;const p={x:e.clientX,y:e.clientY};points.set(e.pointerId,p);if(points.size===2){const [a,b]=[...points.values()];s.zoom=startZoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,distance);moved=true;transform(s);}else{if(Math.hypot(p.x-origin.x,p.y-origin.y)>5)moved=true;if(s.zoom>1&&last){s.panX+=(p.x-last.x)*620/el.clientWidth;s.panY+=(p.y-last.y)*620/el.clientWidth;transform(s);}last=p;}});
 el.addEventListener('pointerup',e=>{points.delete(e.pointerId);if(!moved){const node=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-region]');if(node)onNode(node.dataset.region);}last=points.values().next().value;});
 el.addEventListener('pointercancel',e=>{points.delete(e.pointerId);moved=true;last=null;});transform(s);
}
root.NeuroCircuits={palette,basisLabels,selection,counts,bestView,resetTransform,ensure,render,zoom,bind};
if(typeof module!=='undefined')module.exports=root.NeuroCircuits;
})(typeof window!=='undefined'?window:globalThis);
