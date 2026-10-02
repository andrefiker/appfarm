import {newGame,drawFromStock,moveCards,undo,getHint,legalMove,legalMoves,autoFinishSafe,isWon,SUIT_GLYPHS,color,cardLabel,restore,serialize} from './engine.js';
import {chooseAceFoundation,chooseSmartDestination,createTapDispatcher,hasExceededDragThreshold,pickExpandedDropTarget} from './interaction.js';
import {tableauOverlapLayout} from './layout.js';

const $=id=>document.getElementById(id), app=$('app');
const defaults={draw:1,theme:'green',deck:'classic',mode:'relaxed',hand:'left',sound:true,haptics:true,contrast:false,motion:false,smart:true};
let settings={...defaults,...read('quiet-settings',{})};
const savedGame=read('quiet-current',null);
let game=savedGame||newGame(randomSeed(),settings.draw), selected=null, hintTimer=0, clockTimer=0, drag=null, suppressClick=false, audio=null, wonHandled=false, layoutFrame=0, needsTableauScroll=false, cardOverlap=0, finishTimer=0;
game.startedAt=Date.now();

function read(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function randomSeed(){return Math.floor(Math.random()*999_999_999)+1}
function persist(){game.elapsed=elapsedSeconds();game.startedAt=Date.now();write('quiet-current',game);write('quiet-settings',settings)}
function elapsedSeconds(){return Math.max(0,Math.floor((Date.now()-game.startedAt)/1000)+Number(game.elapsed||0))}
function formatTime(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function preferredOverlap(){const ruler=document.createElement('div');ruler.style.cssText='position:absolute;top:var(--card-overlap);visibility:hidden;pointer-events:none';app.append(ruler);const value=parseFloat(getComputedStyle(ruler).top);ruler.remove();return Number.isFinite(value)?value:18}
function buzz(kind='light'){if(!settings.haptics||!navigator.vibrate)return;navigator.vibrate(kind==='win'?[18,30,28]:kind==='bad'?12:kind==='reveal'?14:8)}
function sound(kind='place'){if(!settings.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);const cfg={pickup:[520,.035],place:[360,.045],flip:[610,.04],draw:[450,.035],bad:[145,.07],win:[770,.13]}[kind]||[360,.04];osc.type=kind==='bad'?'triangle':'sine';osc.frequency.setValueAtTime(cfg[0],now);if(kind==='place'||kind==='flip'||kind==='win')osc.frequency.exponentialRampToValueAtTime(cfg[0]*1.32,now+cfg[1]);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.007);gain.gain.exponentialRampToValueAtTime(.0001,now+cfg[1]);osc.start(now);osc.stop(now+cfg[1]+.01)}catch{}}
function cardHTML(card,source,index,extra=''){
  const face=card.faceUp, rank=card.rank===1?'A':card.rank===11?'J':card.rank===12?'Q':card.rank===13?'K':card.rank;
  const suit=SUIT_GLYPHS[card.suit]; const klass=`card ${face?color(card):'face-down'} ${settings.deck==='minimal'?'minimal':''} ${extra}`;
  const attrs=face?`data-source="${source.type}" data-source-index="${source.index??''}" data-card-index="${index}" tabindex="0" role="button" aria-label="${cardLabel(card)}"`:'aria-hidden="true"';
  const placement=source.type==='tableau'?` style="top:${index*cardOverlap}px"`:'';
  if(!face)return `<div class="${klass}"${placement} ${attrs}></div>`;
  const faceArt=card.rank>=11?`<div class="face-art"><span class="face-crown">♛</span><span class="face-letter">${rank}</span></div>`:'';
  return `<div class="${klass}"${placement} ${attrs}><span class="corner"><span class="rank">${rank}</span><span class="suit-mini">${suit}</span></span><span class="center-suit">${suit}</span>${faceArt}<span class="corner bottom"><span class="rank">${rank}</span><span class="suit-mini">${suit}</span></span></div>`;
}
function render(){
  if(!cardOverlap)cardOverlap=preferredOverlap();
  app.className=`felt-${settings.theme} hand-${settings.hand==='right'?'right':'left'}${settings.contrast?' high-contrast':''}${settings.motion?' reduce-motion':''}${needsTableauScroll?' tableau-scroll':''}`;
  $('game-number').textContent=String(game.seed).padStart(6,'0');$('timer').textContent=formatTime(elapsedSeconds());$('moves').textContent=String(game.moves);$('score').textContent=settings.mode==='standard'?`${game.score} PTS`:'';$('score').classList.toggle('hidden',settings.mode!=='standard');
  const stock=$('stock-pile');stock.classList.toggle('empty',!game.stock.length);stock.innerHTML=game.stock.length?'':`<span class="recycle-symbol">↻</span>`;stock.setAttribute('aria-label',game.stock.length?`${game.stock.length} cards in stock, draw ${game.drawCount}`:'Recycle waste');
  const waste=$('waste-pile');waste.innerHTML=game.waste.length?cardHTML(game.waste.at(-1),{type:'waste'},game.waste.length-1,selected?.type==='waste'?'selected':''):'';
  $('foundations').innerHTML=game.foundations.map((pile,i)=>`<div class="pile foundation-pile" data-pile="foundation" data-index="${i}" data-suit="${pile.length?SUIT_GLYPHS[pile[0].suit]:''}" ${pile.length?'':`role="button" tabindex="0"`} aria-label="${pile.length?`${pile[0].suit} foundation`:'Empty foundation'}">${pile.length?cardHTML(pile.at(-1),{type:'foundation',index:i},pile.length-1,selected?.type==='foundation'&&selected.index===i?'selected':''):''}</div>`).join('');
  $('tableau').innerHTML=game.tableau.map((col,i)=>`<div class="tableau-column" data-pile="tableau" data-index="${i}" ${col.length?'':`role="button" tabindex="0"`} aria-label="Tableau column ${i+1}">${col.map((c,j)=>cardHTML(c,{type:'tableau',index:i},j,selected?.type==='tableau'&&selected.index===i&&j>=selected.cardIndex?'selected':'')).join('')}</div>`).join('');
  document.querySelectorAll('[data-pile].legal-target').forEach(pile=>pile.classList.remove('legal-target'));
  document.querySelectorAll('.card.legal-target-card').forEach(card=>card.classList.remove('legal-target-card'));
  if(selected)for(const target of targetPiles(selected)){const pile=document.querySelector(`.${target.type==='tableau'?'tableau-column':'foundation-pile'}[data-index="${target.index}"]`);pile?.classList.add('legal-target');pile?.querySelector('.card:last-of-type')?.classList.add('legal-target-card')}
  $('undo').disabled=!game.history.length;$('auto-finish').classList.toggle('hidden',!autoFinishSafe(game)||game.status!=='playing');if(game.status==='won'&&!wonHandled){wonHandled=true;onWin()};
  persist();fitTableau();
}
function fitTableau(){
  cancelAnimationFrame(layoutFrame);
  layoutFrame=requestAnimationFrame(()=>{
    const board=$('tableau'),viewport=$('tableau-viewport'),controls=$('game-controls'),sample=board.querySelector('.tableau-column>.card');
    if(!sample||!controls)return;
    const baseOverlap=preferredOverlap();
    const landscape=matchMedia('(orientation:landscape) and (min-width:600px)').matches;
    const contained=getComputedStyle(viewport).display!=='contents';
    const boardTop=board.getBoundingClientRect().top+app.scrollTop;
    const controlsTop=controls.getBoundingClientRect().top;
    const cardHeight=sample.getBoundingClientRect().height;
    const layers=Math.max(...game.tableau.map(column=>column.length),1);
    const clearance=landscape?3:12;
    const availableHeight=contained?viewport.clientHeight-parseFloat(getComputedStyle(board).marginTop)-clearance:controlsTop-boardTop-clearance;
    const fillOverlap=(availableHeight-cardHeight)/Math.max(1,layers-1);
    const preferred=landscape&&layers>1?Math.min(cardHeight*.42,Math.max(baseOverlap,fillOverlap)):baseOverlap;
    const minimum=landscape?Math.max(19,cardHeight*.18):contained?Math.max(23,cardHeight*.29):Math.max(10,cardHeight*.16);
    const fitted=tableauOverlapLayout({availableHeight,cardHeight,layers,preferred,minimum});
    cardOverlap=fitted.overlap;
    for(const column of board.children)for(let i=0;i<column.children.length;i++)column.children[i].style.top=`${i*cardOverlap}px`;
    if(contained||fitted.needsScroll)board.style.minHeight=`${cardHeight+(layers-1)*fitted.overlap}px`;
    else board.style.removeProperty('min-height');
    needsTableauScroll=fitted.needsScroll;
    app.classList.toggle('tableau-scroll',needsTableauScroll);
  });
}
function notify(text,bad=false){const el=$('status-note');el.textContent=text;el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),1450);sound(bad?'bad':'place');buzz(bad?'bad':'light')}
function selectionTip(){if(!targetPiles(selected).length)return;const el=$('status-note');el.textContent='Tap an outlined pile to place';el.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.remove('show'),1500)}
function targetPiles(source){const candidates=[];for(let i=0;i<7;i++)if(source.type!=='tableau'||i!==source.index)if(legalMove(game,source,{type:'tableau',index:i},source.cardIndex))candidates.push({type:'tableau',index:i});if(source.type==='waste'||source.type==='tableau')for(let i=0;i<4;i++)if(legalMove(game,source,{type:'foundation',index:i},source.cardIndex))candidates.push({type:'foundation',index:i});return candidates}
function perform(source,dest,index){const before=game.tableau.map(c=>c.length);if(moveCards(game,source,dest,index)){selected=null;render();sound('place');buzz('light');if(game.tableau.some((c,i)=>c.length<before[i])){sound('flip');buzz('reveal')}return true}return false}
function sourceFromCard(el){return {type:el.dataset.source,index:el.dataset.sourceIndex===''?undefined:Number(el.dataset.sourceIndex),cardIndex:Number(el.dataset.cardIndex)}}
function sourceKey(source){return `${source.type}:${source.index??''}:${source.cardIndex}`}
function onCardTap(source){
  if(selected){if(selected.type===source.type&&selected.index===source.index&&selected.cardIndex===source.cardIndex){selected=null;render();return}
    const dest={type:source.type==='tableau'?'tableau':source.type,index:source.index};
    if(dest.type==='tableau'&&perform(selected,dest,selected.cardIndex))return true;
    if(dest.type==='foundation'&&perform(selected,dest,selected.cardIndex))return true;
  }
  const targets=targetPiles(source),aceTarget=chooseAceFoundation(game,source,targets);if(aceTarget)return perform(source,aceTarget,source.cardIndex);
  const smartTarget=chooseSmartDestination(game,source,targets,settings.smart,settings.hand);if(smartTarget)return perform(source,smartTarget,source.cardIndex);
  selected={type:source.type,index:source.index,cardIndex:source.cardIndex};render();sound('pickup');buzz('light');selectionTip();
  return false;
}
function pileClick(pile){const type=pile.dataset.pile,index=pile.dataset.index===''?undefined:Number(pile.dataset.index);
  if(type==='stock'){const result=drawFromStock(game);selected=null;if(result){render();sound(result.type==='recycle'?'flip':'draw');buzz('light')}else notify('No cards to draw',true);return}
  if(selected){const dest={type,index};if(perform(selected,dest,selected.cardIndex))return;notify('That card does not fit there',true);selected=null;render();return}
  if(type==='waste'&&game.waste.length){onCardTap(sourceFromCard(pile.querySelector('.card')));return}
  if(type==='foundation'&&game.foundations[index]?.length){onCardTap(sourceFromCard(pile.querySelector('.card')));return}
}
function onDoubleTap(source){const targets=targetPiles(source),aceTarget=chooseAceFoundation(game,source,targets);if(aceTarget)return perform(source,aceTarget,source.cardIndex);const foundations=targets.filter(t=>t.type==='foundation');return foundations.length===1?perform(source,foundations[0],source.cardIndex):false}
const cardTaps=createTapDispatcher({single:onCardTap,double:onDoubleTap});
function applySettings(){for(const [id,key] of [['setting-draw','draw'],['setting-theme','theme'],['setting-deck','deck'],['setting-mode','mode'],['setting-hand','hand'],['setting-sound','sound'],['setting-haptics','haptics'],['setting-contrast','contrast'],['setting-motion','motion'],['setting-smart','smart']]){const e=$(id);e.type==='checkbox'?e.checked=!!settings[key]:e.value=String(settings[key])}}
function countGame(){const s=stats(game.drawCount);s.played++;write(`quiet-stats-${game.drawCount}`,s)}
function setGame(seed,draw=settings.draw){cardTaps.clear();stopFinish();game=newGame(seed,draw);settings.draw=draw;selected=null;wonHandled=false;countGame();closeModal();render()}
function openModal(view='menu'){ $('modal-backdrop').classList.remove('hidden');for(const v of ['menu','number','new','win'])$(`${v}-view`).classList.toggle('hidden',v!==view);$('modal-title').textContent=view==='win'?'Well played.':view==='number'?'Choose a game number':view==='new'?'A fresh deal?':'A quieter game.';if(view==='menu'){$('menu-game-details').textContent=`GAME ${game.seed} · ${formatTime(elapsedSeconds())} · ${game.moves} MOVE${game.moves===1?'':'S'}`;showStats()}applySettings() }
function closeModal(){$('modal-backdrop').classList.add('hidden')}
function stats(draw=game.drawCount){return read(`quiet-stats-${draw}`,{played:0,won:0,streak:0,best:0,fastest:null,fewest:null})}
function showStats(){const s=stats();$('stats-summary').innerHTML=`<div class="stat"><strong>${s.played}</strong><span>GAMES</span></div><div class="stat"><strong>${s.played?Math.round(s.won/s.played*100):0}%</strong><span>WON</span></div><div class="stat"><strong>${s.streak}</strong><span>STREAK</span></div><div class="stat"><strong>${s.best}</strong><span>BEST</span></div>`}
function onWin(){if(game.recorded){openModal('win');return}game.elapsed=elapsedSeconds();const s=stats(game.drawCount);s.won++;s.streak++;s.best=Math.max(s.best,s.streak);s.fastest=s.fastest===null?game.elapsed:Math.min(s.fastest,game.elapsed);s.fewest=s.fewest===null?game.moves:Math.min(s.fewest,game.moves);write(`quiet-stats-${game.drawCount}`,s);game.recorded=true;persist();sound('win');buzz('win');$('win-stats').textContent=`${game.moves} MOVES · ${formatTime(game.elapsed)}`;setTimeout(()=>openModal('win'),420)}
function stopFinish(){clearTimeout(finishTimer);finishTimer=0}
function maybeFinish(){if(finishTimer){stopFinish();return}if(!autoFinishSafe(game))return;const tick=()=>{finishTimer=0;if(game.status!=='playing')return;const move=legalMoves(game).find(m=>m.dest.type==='foundation');if(!move)return;perform(move.source,move.dest,move.cardIndex);if(game.status==='playing')finishTimer=setTimeout(tick,settings.motion||matchMedia('(prefers-reduced-motion: reduce)').matches?16:85)};tick()}
function hint(){const m=getHint(game);if(!m){notify('No legal moves in view',true);return}if(m.source.type==='stock'){notify(game.stock.length?'Draw from the stock':'Recycle the waste');return}const s=m.source.type==='waste'?$(`.waste-pile .card`):m.source.type==='foundation'?$(`.foundation-pile[data-index="${m.source.index}"] .card`):$(`.tableau-column[data-index="${m.source.index}"] .card[data-card-index="${m.cardIndex}"]`);const d=m.dest.type==='foundation'?$(`.foundation-pile[data-index="${m.dest.index}"]`):$(`.tableau-column[data-index="${m.dest.index}"]`);s?.classList.add('highlight');d?.classList.add('highlight');$('hint-message').textContent=m.dest.type==='foundation'?'Move this card to a foundation':'Move this card to the highlighted pile';$('hint-layer').classList.remove('hidden');clearTimeout(hintTimer);hintTimer=setTimeout(()=>{$('hint-layer').classList.add('hidden');document.querySelectorAll('.highlight').forEach(e=>e.classList.remove('highlight'))},2100);game.hints++;}
function beginDrag(e,el){if(e.button!==undefined&&e.button!==0)return;const source={type:el.dataset.source,index:el.dataset.sourceIndex===''?undefined:Number(el.dataset.sourceIndex),cardIndex:Number(el.dataset.cardIndex)};drag={el,source,pointerId:e.pointerId,pointerType:e.pointerType||'mouse',startX:e.clientX,startY:e.clientY,moved:false,ghost:null};try{el.setPointerCapture?.(e.pointerId)}catch{}}
function updateDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(!drag.moved&&!hasExceededDragThreshold(dx,dy,drag.pointerType))return;if(!drag.moved){drag.moved=true;const from=sourcePileDOM(drag.source);const cards=drag.source.type==='tableau'?Array.from(from.querySelectorAll('.card')).filter(c=>Number(c.dataset.cardIndex)>=drag.source.cardIndex):[drag.el];const bounds=drag.el.getBoundingClientRect();const ghost=document.createElement('div');ghost.className='drag-group';ghost.style.cssText=`position:fixed;left:${bounds.left}px;top:${bounds.top}px;z-index:1100;pointer-events:none`;for(const card of cards){const r=card.getBoundingClientRect();const clone=card.cloneNode(true);clone.classList.add('ghost-card');clone.style.left=`${r.left-bounds.left}px`;clone.style.top=`${r.top-bounds.top}px`;clone.style.width=`${r.width}px`;clone.style.height=`${r.height}px`;ghost.append(clone);card.style.visibility='hidden'}document.body.append(ghost);drag.ghost=ghost;drag.offsetX=e.clientX-bounds.left;drag.offsetY=e.clientY-bounds.top;suppressClick=true;sound('pickup');buzz('light')}
  drag.ghost.style.transform=`translate(${dx}px,${dy}px) rotate(${Math.max(-4,Math.min(4,dx*.035))}deg)`;}
function sourcePileDOM(s){return s.type==='waste'?$('waste-pile'):s.type==='foundation'?$(`.foundation-pile[data-index="${s.index}"]`):$(`.tableau-column[data-index="${s.index}"]`)}
function expandedDropTarget(source,x,y){const candidates=targetPiles(source).map(target=>{const selector=target.type==='tableau'?`.tableau-column[data-index="${target.index}"]`:`.foundation-pile[data-index="${target.index}"]`;const el=document.querySelector(selector);return el?{target,rect:el.getBoundingClientRect()}:null}).filter(Boolean);return pickExpandedDropTarget({x,y},candidates,16)}
function finishInvalidDrag(d){if(!d.ghost){notify('That card does not fit there',true);render();suppressClick=false;return}d.ghost.classList.add('returning');requestAnimationFrame(()=>{d.ghost.style.transform='translate(0,0) rotate(0deg)'});setTimeout(()=>{document.querySelectorAll('.card').forEach(c=>c.style.visibility='');d.ghost?.remove();notify('That card does not fit there',true);render();suppressClick=false},190)}
function endDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;const d=drag;drag=null;if(!d.moved)return;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-pile]');let target=null;if(hit){const type=hit.dataset.pile,index=hit.dataset.index===''?undefined:Number(hit.dataset.index);if((type==='tableau'||type==='foundation')&&legalMove(game,d.source,{type,index},d.source.cardIndex))target={type,index}}target??=expandedDropTarget(d.source,e.clientX,e.clientY);if(!target){finishInvalidDrag(d);return}document.querySelectorAll('.card').forEach(c=>c.style.visibility='');d.ghost?.remove();if(!perform(d.source,target,d.source.cardIndex)){finishInvalidDrag(d);return}setTimeout(()=>suppressClick=false,280)}
function cancelDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;const d=drag;drag=null;document.querySelectorAll('.card').forEach(c=>c.style.visibility='');d.ghost?.remove();suppressClick=false}
document.addEventListener('pointerdown',e=>{suppressClick=false;const card=e.target.closest('.card[data-source]');if(card)beginDrag(e,card)});
document.addEventListener('pointermove',updateDrag);document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',cancelDrag);
document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();return}if(e.target.closest('#auto-finish'))return;const card=e.target.closest('.card[data-source]');if(card){stopFinish();const source=sourceFromCard(card),targets=targetPiles(source);cardTaps.tap(source,sourceKey(source),performance.now(),targets.some(t=>t.type==='foundation'));return}cardTaps.flush();stopFinish();const pile=e.target.closest('[data-pile]');if(pile)pileClick(pile)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key!=='Enter'&&e.key!==' ')return;if(e.target.matches('.card[data-source]')){e.preventDefault();onCardTap(e.target);return}if(e.target.matches('[data-pile]')){e.preventDefault();pileClick(e.target)}});
$('stock-pile').addEventListener('click',()=>{});$('undo').onclick=()=>{cardTaps.clear();stopFinish();if(undo(game)){selected=null;render();sound('flip');buzz('light')}};$('hint').onclick=hint;
$('new-game').onclick=()=>openModal('new');$('game-number-open').onclick=()=>openModal('number');$('menu-open').onclick=()=>openModal();$('modal-close').onclick=closeModal;$('modal-backdrop').addEventListener('click',e=>{if(e.target===$('modal-backdrop'))closeModal()});
$('continue-game').onclick=closeModal;$('new-random').onclick=()=>setGame(randomSeed(),settings.draw);$('play-number').onclick=()=>openModal('number');$('number-start').onclick=()=>{const n=Number($('number-input').value);if(!Number.isInteger(n)||n<1||n>999999999){$('number-input').focus();return}setGame(n,settings.draw)};
$('cancel-new').onclick=closeModal;$('confirm-new').onclick=()=>setGame(randomSeed(),settings.draw);$('win-new').onclick=()=>setGame(randomSeed(),settings.draw);$('auto-finish').onclick=maybeFinish;
for(const [id,key] of [['setting-draw','draw'],['setting-theme','theme'],['setting-deck','deck'],['setting-mode','mode'],['setting-hand','hand'],['setting-sound','sound'],['setting-haptics','haptics'],['setting-contrast','contrast'],['setting-motion','motion'],['setting-smart','smart']])$(id).addEventListener('change',e=>{settings[key]=e.target.type==='checkbox'?e.target.checked:(key==='draw'?Number(e.target.value):e.target.value);write('quiet-settings',settings);render()});
window.addEventListener('resize',fitTableau,{passive:true});window.addEventListener('orientationchange',fitTableau,{passive:true});window.addEventListener('pagehide',()=>{cardTaps.flush();stopFinish();persist()});document.addEventListener('visibilitychange',()=>{if(document.hidden){cardTaps.flush();stopFinish();persist()}else render()});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
if(!savedGame)countGame();render();applySettings();clockTimer=setInterval(()=>{$('timer').textContent=formatTime(elapsedSeconds())},1000);
