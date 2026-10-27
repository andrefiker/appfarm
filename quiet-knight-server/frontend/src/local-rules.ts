import {Chess,normalizeMove} from 'chessops/chess';
import {parseFen,makeFen,INITIAL_FEN} from 'chessops/fen';
import {parseUci,makeUci,makeSquare,roleToChar} from 'chessops/util';
import {makeSan,parseSan} from 'chessops/san';
import type {Move,NormalMove} from 'chessops/types';
import type {Position} from './chess-ui';
export {INITIAL_FEN};
export type StudySession={archiveId?:string;archiveMode?:'pass'|'computer';schema:2;start:string;moves:string[];variant:'standard'|'chess960';mode:'analysis'|'pass'|'computer';human:'w'|'b';level:number;cursor:number;result?:'1-0'|'0-1'|'1/2-1/2'|'*'};
export function positionFromFen(fen:string){
  if(typeof fen!=='string'||fen.length>200||fen.trim().split(/\s+/).length!==6)throw Error('Use a complete six-field FEN.');
  const setup=parseFen(fen.trim()).unwrap();
  for(const square of setup.castlingRights){const rook=setup.board.get(square);if(rook?.role!=='rook'||Math.floor(square/8)!==(rook.color==='white'?0:7))throw Error('Castling rights require the matching rook on its back rank.');}
  if(setup.epSquare!==undefined){const white=setup.turn==='white',rank=Math.floor(setup.epSquare/8);const pawn=setup.board.get(setup.epSquare+(white?-8:8));if(rank!==(white?5:2)||pawn?.role!=='pawn'||pawn.color===setup.turn||setup.board.has(setup.epSquare)||setup.board.has(setup.epSquare+(white?8:-8))||setup.halfmoves!==0)throw Error('Invalid en passant target.');}
  const pos=Chess.fromSetup(setup).unwrap();if(!pos.castles.castlingRights.equals(setup.castlingRights))throw Error('Castling rights do not match the king and rook setup.');return pos;
}
export function variantForFen(fen:string,preferred:'standard'|'chess960'='standard'){
 const pos=positionFromFen(fen);if(preferred==='chess960')return preferred;
 for(const color of ['white','black'] as const){const back=color==='white'?0:56;const rights=[...pos.castles.castlingRights].filter(s=>Math.floor(s/8)===back/8);if(rights.length&&(pos.board.kingOf(color)!==back+4||rights.some(s=>s!==back&&s!==back+7)))return 'chess960' as const;}
 return 'standard' as const;
}
export function legalMoves(pos:Chess):NormalMove[]{const out:NormalMove[]=[];for(const[from,dests]of pos.allDests())for(const to of dests){const p=pos.board.get(from);for(const promotion of p?.role==='pawn'&&(to<8||to>=56)?['queen','rook','bishop','knight'] as const:[undefined]){const m={from,to,promotion};if(pos.isLegal(m))out.push(m);}}return out;}
export function playUci(pos:Chess,uci:string){const m=parseUci(uci);if(!m)throw Error('Invalid move');const normalized=normalizeMove(pos,m);if(!pos.isLegal(normalized))throw Error('Illegal move');const san=makeSan(pos,normalized);pos.play(normalized);return san;}
export function replay(session:StudySession,until=session.moves.length){const pos=positionFromFen(session.start),sans:string[]=[],fens=[makeFen(pos.toSetup())];for(const uci of session.moves.slice(0,until)){sans.push(playUci(pos,uci));fens.push(makeFen(pos.toSetup()));}return{pos,sans,fens};}
export function boardPosition(pos:Chess):Position{const board:Position={};for(const[sq,p]of pos.board)board[makeSquare(sq)]={color:p.color==='white'?'w':'b',type:roleToChar(p.role)};return board;}
export function moveFeatures(pos:Chess,uci:string){const m=parseUci(uci) as NormalMove|undefined;if(!m||!pos.isLegal(m))return{capture:0,check:false,center:0,exposure:0};const values={pawn:1,knight:3,bishop:3,rook:5,queen:9,king:0};const target=pos.board.get(m.to),own=pos.turn;const next=pos.clone();next.play(m);let exposure=0;for(const[sq,p]of next.board)if(p.color===own&&next.kingAttackers(sq,next.turn,next.board.occupied).nonEmpty())exposure+=values[p.role];const center=3.5-Math.abs(3.5-(m.to%8))+3.5-Math.abs(3.5-Math.floor(m.to/8));return{capture:target&&target.color!==own?values[target.role]:0,check:next.isCheck(),center,exposure};}
export function chess960Fen(index:number){
  if(!Number.isInteger(index)||index<0||index>959)throw Error('Chess960 index must be 0–959');
  let n=index;const rank=Array<string>(8).fill('');rank[(n%4)*2+1]='B';n=Math.floor(n/4);rank[(n%4)*2]='B';n=Math.floor(n/4);
  const empty=()=>rank.map((p,i)=>p?-1:i).filter(i=>i>=0);rank[empty()[n%6]]='Q';n=Math.floor(n/6);
  const pairs=[];for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)pairs.push([i,j]);const spaces=empty();for(const i of pairs[n])rank[spaces[i]]='N';const rest=empty();rank[rest[0]]='R';rank[rest[1]]='K';rank[rest[2]]='R';
  const rights=String.fromCharCode(65+rest[2],65+rest[0]);return `${rank.join('').toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${rank.join('')} w ${rights+rights.toLowerCase()} - 0 1`;
}
export function repetitionCount(fens:string[]){const key=(f:string)=>f.split(' ').slice(0,4).join(' '),last=key(fens[fens.length-1]);return fens.filter(f=>key(f)===last).length;}
export function outcome(session:StudySession){if(session.result&&session.result!=='*')return session.result==='1/2-1/2'?'Draw · recorded result':session.result==='1-0'?'White wins · recorded result':'Black wins · recorded result';const{pos,fens}=replay(session);if(pos.isCheckmate())return pos.turn==='white'?'Black wins by checkmate':'White wins by checkmate';if(pos.isStalemate())return'Draw · stalemate';if(pos.isInsufficientMaterial())return'Draw · insufficient material';if(pos.halfmoves>=150)return'Draw · 75-move rule';if(repetitionCount(fens)>=5)return'Draw · fivefold repetition';return null;}
export function blankStudy():StudySession{return{schema:2,start:INITIAL_FEN,moves:[],variant:'standard',mode:'analysis',human:'w',level:5,cursor:0};}
function validateSession(s:StudySession){if(s?.schema!==2||!['standard','chess960'].includes(s.variant)||!['analysis','pass','computer'].includes(s.mode)||!['w','b'].includes(s.human)||!Number.isInteger(s.level)||s.level<1||s.level>10||!Array.isArray(s.moves)||s.moves.length>2000||!s.moves.every(m=>typeof m==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)))throw Error('Invalid saved session');replay(s);return{...s,cursor:Math.max(0,Math.min(s.moves.length,Number(s.cursor)||0))};}
export function loadStudy(owner:string):StudySession{for(const suffix of['',':backup'])try{const raw=localStorage.getItem('qk-study-v2:'+owner+suffix);if(raw)return validateSession(JSON.parse(raw));}catch{try{const raw=localStorage.getItem('qk-study-v2:'+owner+suffix);if(raw)localStorage.setItem('qk-study-v2:'+owner+':recovery'+suffix,raw);}catch{}}return blankStudy();}
export function saveStudy(s:StudySession,owner:string){validateSession(s);const key='qk-study-v2:'+owner;try{const previous=localStorage.getItem(key);if(previous){try{validateSession(JSON.parse(previous));localStorage.setItem(key+':backup',previous);}catch{localStorage.setItem(key+':recovery',previous);}}localStorage.setItem(key,JSON.stringify(s));return true;}catch{return false;}}
export function studyPgn(session:StudySession){const{sans,pos}=replay(session),result=session.result&&session.result!=='*'?session.result:outcome(session)?pos.isCheckmate()?(pos.turn==='white'?'0-1':'1-0'):'1/2-1/2':'*';const tags=`[Event "Quiet Knight local study"]\n[TimeControl "-"]\n[Result "${result}"]\n[SetUp "1"]\n[FEN "${session.start}"]\n${session.variant==='chess960'?'[Variant "Chess960"]\n':''}`;const initial=positionFromFen(session.start);let number=initial.fullmoves,white=initial.turn==='white';const tokens=sans.map((san,i)=>{const prefix=white?`${number}. `:i===0?`${number}... `:'';if(!white)number++;white=!white;return prefix+san;});return tags+'\n'+tokens.join(' ')+' '+result;}
export function importStudyPgn(input:string):StudySession{
  if(typeof input!=='string'||input.length>100000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input))throw Error('PGN is too large or contains control characters');
  const fen=input.match(/^\[FEN "([^"\r\n]+)"\]/m)?.[1]||INITIAL_FEN,variant=input.match(/^\[Variant "([^"\r\n]+)"\]/m)?.[1];if(variant&&variant!=='Chess960'&&variant!=='Standard')throw Error('Unsupported variant');
  const session:StudySession={...blankStudy(),start:makeFen(positionFromFen(fen).toSetup()),variant:variant==='Chess960'?'chess960' as const:'standard' as const};
  const body=input.replace(/^\[[^\r\n]*\]\s*$/gm,'').replace(/\{[^}]*\}/g,'').replace(/;[^\n]*/g,'').trim();if(/[(){}\[\]]/.test(body))throw Error('Import a single main line; variations or incomplete comments are not supported');
  const tokens=body.replace(/\d+\.(?:\.\.)?/g,' ').split(/\s+/).filter(Boolean),pos=positionFromFen(session.start);let finished=false;
  for(let token of tokens){if(/^\$\d+$/.test(token))continue;if(/^(1-0|0-1|1\/2-1\/2|\*)$/.test(token)){if(finished)throw Error('Multiple PGN games');finished=true;session.result=token as StudySession['result'];continue;}if(finished)throw Error('Moves after result');token=token.replace(/[!?]+$/,'');const move=parseSan(pos,token);if(!move||!pos.isLegal(move))throw Error('Illegal or unrecognized SAN: '+token.slice(0,20));session.moves.push(makeUci(move));pos.play(move);if(session.moves.length>2000)throw Error('Too many moves');}
  const declared=input.match(/^\[Result "([^"\r\n]+)"\]/m)?.[1];if(declared&&!['*','1-0','0-1','1/2-1/2'].includes(declared))throw Error('Invalid PGN result');if(declared&&session.result&&declared!==session.result)throw Error('PGN result tag and movetext disagree');if(declared)session.result=declared as StudySession['result'];
  session.cursor=session.moves.length;return session;
}
export function uciFor(from:string,to:string,promotion='q'):string{return from+to+(promotion||'');}
export function legalUci(pos:Chess,move:Move){return makeUci(normalizeMove(pos,move));}
