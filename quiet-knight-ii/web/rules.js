import {Chess, DEFAULT_POSITION, validateFen} from './vendor/chess.js';
export {Chess, DEFAULT_POSITION};
export const squareNames=Array.from({length:64},(_,i)=>'abcdefgh'[i%8]+(8-Math.floor(i/8)));
export const opposite=c=>c==='w'?'b':'w';
export const uci=m=>m.from+m.to+(m.promotion||'');
export function validPosition(fen){
  const v=validateFen(fen); if(!v.ok) throw Error(v.error);
  const c=new Chess(fen), all=c.board().flat().filter(Boolean);
  for(const color of ['w','b']){
    if(all.filter(p=>p.color===color&&p.type==='p').length>8||all.filter(p=>p.color===color).length>16)throw Error('Too many pieces for one side.');
    const k=all.find(p=>p.color===color&&p.type==='k');
    if(color!==c.turn()&&c.isAttacked(k.square,c.turn()))throw Error('The side that just moved cannot leave its king in check.');
  }
  const rights=fen.split(/\s+/)[2];
  for(const [flag,king,rook,color] of [['K','e1','h1','w'],['Q','e1','a1','w'],['k','e8','h8','b'],['q','e8','a8','b']]){
    if(rights.includes(flag)&&!(c.get(king)?.type==='k'&&c.get(king)?.color===color&&c.get(rook)?.type==='r'&&c.get(rook)?.color===color))throw Error('Castling rights require the king and rook on their original squares.');
  }
  return c;
}
export function repetitionKey(c){return c.fen().split(' ').slice(0,4).join(' ');}
// Sound, conservative proof for completely locked pawn-only fortresses.
// King reachability deliberately ignores the other king, so it overestimates freedom.
export function lockedPawnDead(c){
  const pieces=c.board().flat().filter(Boolean), pawns=pieces.filter(p=>p.type==='p');
  if(!pawns.length||pieces.some(p=>!['p','k'].includes(p.type))||c.inCheck())return false;
  // An available en-passant capture can remove a blocker despite every pawn
  // having an occupied forward square. chess.js emits only effective EP rights.
  if(c.fen().split(' ')[3]!=='-')return false;
  const xy=s=>[s.charCodeAt(0)-97,Number(s[1])-1], sq=(x,y)=>'abcdefgh'[x]+(y+1);
  for(const p of pawns){const [x,y]=xy(p.square),d=p.color==='w'?1:-1;
    // Only another pawn is a permanent blocker. A king can move away and
    // release this pawn, which may later break an otherwise closed barrier.
    if(y+d<0||y+d>7||c.get(sq(x,y+d))?.type!=='p')return false;
    for(const dx of [-1,1])if(x+dx>=0&&x+dx<8){const q=c.get(sq(x+dx,y+d));if(q?.type==='p'&&q.color!==p.color)return false;}
  }
  const attacked=(s,color)=>pawns.some(p=>{const [x,y]=xy(p.square),[a,b]=xy(s);return p.color===color&&Math.abs(x-a)===1&&b-y===(color==='w'?1:-1);});
  for(const color of ['w','b']){
    const king=pieces.find(p=>p.type==='k'&&p.color===color), seen=new Set([king.square]),queue=[king.square];
    for(let i=0;i<queue.length;i++){const [x,y]=xy(queue[i]);for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
      if(!(dx||dy)||x+dx<0||x+dx>7||y+dy<0||y+dy>7)continue;
      const s=sq(x+dx,y+dy),p=c.get(s);if(attacked(s,opposite(color)))continue;
      if(p?.type==='p'){if(p.color!==color)return false;continue;}
      if(!seen.has(s)){seen.add(s);queue.push(s);}
    }}
  }
  return true;
}
export function attackMap(c){const map={w:{},b:{}};for(const color of ['w','b'])for(const s of squareNames)map[color][s]=c.attackers(s,color);return map;}
export class Game{
  constructor(fen=DEFAULT_POSITION){this.chess=validPosition(fen);this.root=this.chess.fen();this.moves=[];this.keys=[repetitionKey(this.chess)];this.result=null;this.id=globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random();}
  static restore(data){if(!data||data.schema!==1||!Array.isArray(data.moves)||data.moves.length>5000)throw Error('Invalid saved game.');const g=new Game(data.root);for(const m of data.moves)g.move(m);g.id=data.id||g.id;if(data.result&&['1-0','0-1','1/2-1/2'].includes(data.result.score))g.result=data.result;return g;}
  serialize(){return {schema:1,id:this.id,root:this.root,moves:this.moves,result:this.result};}
  move(m){if(this.status().over)throw Error('Game is over.');const made=this.chess.move(m);if(!made)throw Error('Illegal move');this.moves.push({from:made.from,to:made.to,...(made.promotion?{promotion:made.promotion}:{})});this.keys.push(repetitionKey(this.chess));return made;}
  undo(){this.result=null;const m=this.chess.undo();if(m){this.moves.pop();this.keys.pop();}return m;}
  status(){if(this.result)return{over:true,...this.result};const c=this.chess;
    if(c.isCheckmate())return{over:true,score:c.turn()==='w'?'0-1':'1-0',reason:'Checkmate'};
    if(c.isStalemate())return{over:true,score:'1/2-1/2',reason:'Stalemate'};
    if(c.isInsufficientMaterial()||lockedPawnDead(c))return{over:true,score:'1/2-1/2',reason:'Dead position'};
    const count=this.keys.filter(k=>k===repetitionKey(c)).length,half=Number(c.fen().split(' ')[4]);
    if(count>=5)return{over:true,score:'1/2-1/2',reason:'Fivefold repetition'};
    if(half>=150)return{over:true,score:'1/2-1/2',reason:'75-move rule'};
    return{over:false,check:c.inCheck(),claim:count>=3?'Threefold repetition':half>=100?'50-move rule':null};
  }
  claimOptions(){const s=this.status();if(s.over)return[];if(s.claim)return[{move:null,reason:s.claim}];const out=[];
    for(const m of this.chess.moves({verbose:true})){this.chess.move(m);const key=repetitionKey(this.chess),count=this.keys.filter(k=>k===key).length+1,half=Number(this.chess.fen().split(' ')[4]);this.chess.undo();if(count>=3||half>=100)out.push({move:uci(m),san:m.san,reason:count>=3?'Threefold repetition':'50-move rule'});}
    return out;
  }
  claim(move=null){const found=this.claimOptions().find(x=>x.move===move);if(!found)throw Error('No valid draw claim.');this.result={score:'1/2-1/2',reason:found.reason+(move?' (declared '+found.san+')':'')};}
  resign(color){
    if(!['w','b'].includes(color))throw Error('Invalid resigning side.');
    if(this.status().over)return;
    // FIDE 5.1.2: resignation is a draw if the opponent cannot possibly mate.
    // A bare king can never give a legal check, regardless of the other army.
    const opponent=opposite(color),hasPiece=this.chess.board().flat().some(p=>p?.color===opponent&&p.type!=='k');
    this.result=hasPiece?{score:color==='w'?'0-1':'1-0',reason:(color==='w'?'White':'Black')+' resigned'}:{score:'1/2-1/2',reason:'Resignation · opponent has only a king'};
  }
  exportPgn(){this.chess.header('Event','Quiet Knight II','Site','Offline','Result',this.status().score||'*');return this.chess.pgn({maxWidth:80});}
  static fromPgn(text){if(text.length>100000)throw Error('PGN is too large.');const c=new Chess();c.loadPgn(text,{strict:true});const h=c.getHeaders();if(h.Result&&!['*','1-0','0-1','1/2-1/2'].includes(h.Result))throw Error('Invalid PGN result.');const g=new Game(h.FEN||DEFAULT_POSITION);for(const m of c.history({verbose:true}))g.move({from:m.from,to:m.to,promotion:m.promotion});if(h.Result&&h.Result!=='*'&&!g.status().over)g.result={score:h.Result,reason:'Imported result'};return g;}
}
