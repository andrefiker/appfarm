export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const SUIT_GLYPHS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
export const RED = new Set(['hearts', 'diamonds']);

export function mulberry32(seed) {
  let t = Number(seed) >>> 0;
  return () => { t += 0x6D2B79F5; let x = t; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}

export function makeDeck(seed = Date.now()) {
  const deck = SUITS.flatMap(suit => Array.from({length:13}, (_, i) => ({suit, rank:i+1, faceUp:false})));
  const random = mulberry32(seed);
  for (let i=deck.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]]; }
  return deck;
}

export function newGame(seed = Math.floor(Math.random()*1_000_000_000), drawCount=1) {
  const deck=makeDeck(seed); let cursor=0;
  const tableau=Array.from({length:7}, (_, col) => Array.from({length:col+1}, (_, row) => ({...deck[cursor++], faceUp:row===col})));
  return {seed:Number(seed), drawCount:drawCount===3?3:1, stock:deck.slice(cursor), waste:[], foundations:[[],[],[],[]], tableau, moves:0, score:0, startedAt:Date.now(), elapsed:0, status:'playing', history:[], hints:0};
}

export function color(card) { return RED.has(card.suit) ? 'red' : 'black'; }
export function top(pile) { return pile.at(-1) ?? null; }
export function cardLabel(card) { return `${card.rank===1?'A':card.rank===11?'J':card.rank===12?'Q':card.rank===13?'K':card.rank} of ${card.suit}`; }

export function isValidSequence(cards) {
  if (!cards?.length || cards.some(c=>!c.faceUp)) return false;
  for(let i=0;i<cards.length-1;i++) if(color(cards[i])===color(cards[i+1]) || cards[i].rank!==cards[i+1].rank+1) return false;
  return true;
}

export function canTableauAccept(card, destTop) {
  return destTop ? color(card)!==color(destTop) && card.rank===destTop.rank-1 : card.rank===13;
}
export function canFoundationAccept(card, pile) {
  return pile.length ? pile[0].suit===card.suit && top(pile).rank+1===card.rank : card.rank===1;
}

export function isWon(state) { return state.foundations.every(p=>p.length===13); }
export function cloneState(state) { return structuredClone(state); }

function remember(state) { state.history.push(cloneState({...state, history:[]})); }
function finish(state) { state.moves++; if(isWon(state)) state.status='won'; return state; }

export function drawFromStock(state) {
  if(state.status!=='playing') return false;
  remember(state);
  if(state.stock.length) {
    const n=Math.min(state.drawCount,state.stock.length);
    for(let i=0;i<n;i++) state.waste.push({...state.stock.pop(),faceUp:true});
    state.score=state.drawCount===1?state.score+5:state.score;
    finish(state); return {type:'draw',count:n};
  }
  if(!state.waste.length) { state.history.pop(); return false; }
  state.stock=state.waste.reverse().map(c=>({...c,faceUp:false})); state.waste=[];
  state.score=Math.max(0,state.score-20); finish(state); return {type:'recycle'};
}

function sourcePile(state, source) {
  if(source.type==='tableau') return state.tableau[source.index];
  if(source.type==='waste') return state.waste;
  if(source.type==='foundation') return state.foundations[source.index];
  return null;
}

export function legalMove(state, source, dest, cardIndex) {
  const from=sourcePile(state,source); if(!from?.length) return false;
  const index=cardIndex ?? from.length-1;
  if(index<0||index>=from.length) return false;
  const moving=from.slice(index); if(!isValidSequence(moving)) return false;
  const card=moving[0];
  if(dest.type==='tableau') {
    if(source.type==='tableau'&&source.index===dest.index) return false;
    const to=state.tableau[dest.index]; if(!to) return false;
    if(source.type==='foundation'&&moving.length!==1) return false;
    return canTableauAccept(card,top(to));
  }
  if(dest.type==='foundation') {
    if(moving.length!==1 || !['tableau','waste'].includes(source.type)) return false;
    return canFoundationAccept(card,state.foundations[dest.index]);
  }
  return false;
}

export function moveCards(state, source, dest, cardIndex) {
  if(state.status!=='playing'||!legalMove(state,source,dest,cardIndex)) return false;
  const from=sourcePile(state,source), index=cardIndex??from.length-1;
  remember(state); const moved=from.splice(index);
  if(source.type==='tableau'&&from.length&& !top(from).faceUp) { top(from).faceUp=true; state.score+=5; }
  if(dest.type==='tableau') state.tableau[dest.index].push(...moved.map(c=>({...c,faceUp:true})));
  else state.foundations[dest.index].push({...moved[0],faceUp:true});
  if(dest.type==='foundation') state.score+=10;
  if(source.type==='foundation') state.score=Math.max(0,state.score-15);
  finish(state); return true;
}

export function undo(state) {
  if(!state.history.length) return false;
  const elapsed=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000)+Number(state.elapsed||0));
  const previous=state.history.pop();
  Object.assign(state,previous,{history:state.history,elapsed,startedAt:Date.now()});
  return true;
}

export function legalMoves(state) {
  const moves=[];
  for(let i=0;i<7;i++) {
    const col=state.tableau[i];
    for(let j=0;j<col.length;j++) if(col[j].faceUp&&isValidSequence(col.slice(j))) {
      for(let d=0;d<7;d++) if(d!==i&&legalMove(state,{type:'tableau',index:i},{type:'tableau',index:d},j)) moves.push({source:{type:'tableau',index:i},dest:{type:'tableau',index:d},cardIndex:j,priority:col.slice(j).some(c=>c.rank===13)?1:3});
      if(j===col.length-1) for(let d=0;d<4;d++) if(legalMove(state,{type:'tableau',index:i},{type:'foundation',index:d})) moves.push({source:{type:'tableau',index:i},dest:{type:'foundation',index:d},cardIndex:j,priority:state.foundations[d].length===0?4:5});
    }
  }
  if(state.waste.length) {
    for(let d=0;d<7;d++) if(legalMove(state,{type:'waste'},{type:'tableau',index:d})) moves.push({source:{type:'waste'},dest:{type:'tableau',index:d},cardIndex:state.waste.length-1,priority:4});
    for(let d=0;d<4;d++) if(legalMove(state,{type:'waste'},{type:'foundation',index:d})) moves.push({source:{type:'waste'},dest:{type:'foundation',index:d},cardIndex:state.waste.length-1,priority:2});
  }
  for(let i=0;i<4;i++) if(state.foundations[i].length) for(let d=0;d<7;d++) if(legalMove(state,{type:'foundation',index:i},{type:'tableau',index:d})) moves.push({source:{type:'foundation',index:i},dest:{type:'tableau',index:d},cardIndex:state.foundations[i].length-1,priority:0});
  return moves;
}

export function getHint(state) {
  const moves=legalMoves(state);
  if(!moves.length) return state.stock.length||state.waste.length?{source:{type:'stock'},dest:{type:'waste'},priority:8}:null;
  const hintPriority=move=>{
    if(move.source.type==='tableau'&&move.dest.type==='tableau') {
      const from=state.tableau[move.source.index];
      if(move.cardIndex>0&&from[move.cardIndex-1]?.faceUp===false) return 0;
      if(!state.tableau[move.dest.index].length&&from[move.cardIndex]?.rank===13) return 1;
      return 3;
    }
    if(move.source.type==='waste'&&move.dest.type==='tableau') return 2;
    if(move.dest.type==='foundation') return 4;
    if(move.source.type==='foundation') return 7;
    return 6;
  };
  moves.sort((a,b)=>hintPriority(a)-hintPriority(b)); return moves[0];
}

export function autoFinishSafe(state) {
  if(state.stock.length||state.waste.length) return false;
  if(state.tableau.some(col=>col.some(c=>!c.faceUp))) return false;
  const redProgress=state.foundations.filter(p=>p.length&&RED.has(p[0].suit)).map(p=>p.length);
  const blackProgress=state.foundations.filter(p=>p.length&&!RED.has(p[0].suit)).map(p=>p.length);
  if(redProgress.length<2)redProgress.push(0);
  if(blackProgress.length<2)blackProgress.push(0);
  const minRed=Math.min(...redProgress);
  const minBlack=Math.min(...blackProgress);
  for(const col of state.tableau) if(col.length) {
    const c=top(col); if(c.rank>minRed+2&&color(c)==='red') return false;
    if(c.rank>minBlack+2&&color(c)==='black') return false;
  }
  return true;
}

export function serialize(state) { const copy=cloneState(state); return JSON.stringify(copy); }
export function restore(serialized) { return JSON.parse(serialized); }
