import {Chess} from 'chess.js';
import type {Square, PieceSymbol} from 'chess.js';
const names:Record<PieceSymbol,string>={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const lookup=(file:number,rank:number)=>('abcdefgh'[file]+(rank+1)) as Square;
export function whyIllegal(game:Chess,from:Square,to:Square):string|null{
 const piece=game.get(from),destination=game.get(to);
 if(!piece)return 'There is no piece on '+from+'.';
 if(piece.color!==game.turn())return 'It is the other side’s turn.';
 if(game.moves({square:from,verbose:true}).some(move=>move.to===to))return null;
 if(from===to)return 'Choose a different square for your '+names[piece.type]+'.';
 if(destination?.color===piece.color)return 'Your own '+names[destination.type]+' is on '+to+'.';
 const x='abcdefgh'.indexOf(from[0]),y=Number(from[1])-1,dx='abcdefgh'.indexOf(to[0])-x,dy=Number(to[1])-1-y;
 const ax=Math.abs(dx),ay=Math.abs(dy);
 if(piece.type==='k'&&ay===0&&ax===2&&(from==='e1'||from==='e8')){
  const side=dx>0?'k':'q',rights=game.fen().split(' ')[2];
  if(!rights.includes(piece.color==='w'?side.toUpperCase():side))return 'Castling is no longer available on that side.';
  const path=dx>0?[1,2]:[-1,-2,-3];
  if(path.some(i=>game.get(lookup(x+i,y))))return 'Clear the squares between the king and rook to castle.';
  const opponent=piece.color==='w'?'b':'w';
  if(game.isCheck()||path.slice(0,2).some(i=>game.isAttacked(lookup(x+i,y),opponent)))return 'You cannot castle out of, through, or into check.';
 }
 if(piece.type==='p'){
  const direction=piece.color==='w'?1:-1,start=piece.color==='w'?1:6;
  if(dy*direction<=0)return 'Pawns only move forward.';
  if(ax>1||dy*direction>2||(dy*direction===2&&(y!==start||ax!==0)))return 'Pawns move one square, or two straight ahead from their starting rank.';
  if(dx===0&&(destination||(dy*direction===2&&game.get(lookup(x,y+direction)))))return 'A pawn cannot move straight into or through another piece.';
  if(ax===1&&!destination&&game.fen().split(' ')[3]!==to)return 'Pawns move diagonally only to capture, including en passant.';
 }
 if(piece.type==='n'&&!(ax===1&&ay===2||ax===2&&ay===1))return 'A knight moves in an L: two squares one way, then one square sideways.';
 if(piece.type==='k'&&Math.max(ax,ay)>1)return 'A king moves one square, except when castling.';
 if(piece.type==='b'&&ax!==ay)return 'A bishop moves only diagonally.';
 if(piece.type==='r'&&ax!==0&&ay!==0)return 'A rook moves along a rank or file, not diagonally.';
 if(piece.type==='q'&&ax!==ay&&ax!==0&&ay!==0)return 'A queen moves along ranks, files, or diagonals.';
 if('brq'.includes(piece.type)){
  const len=Math.max(ax,ay);
  for(let i=1;i<len;i++)if(game.get(lookup(x+Math.sign(dx)*i,y+Math.sign(dy)*i)))return 'The '+names[piece.type]+' cannot jump over the piece in its path.';
 }
 if(piece.type==='k')return 'Your king cannot move to a square under attack.';
 return game.isCheck()?'Your king is already in check. This move does not get it to safety.':'This move would leave your king in check.';
}
export const beginnerLessons=[
 {id:'check',title:'Give check',fen:'8/7k/8/8/8/8/4R3/4K3 w - - 0 1',prompt:'Move the white rook so it attacks the black king. Check forces the other side to protect its king.',done:'That is check. Black must respond to the attack on its king.'},
 {id:'castle',title:'Castle to safety',fen:'4k3/8/8/8/8/8/8/4K2R w K - 0 1',prompt:'Move the white king two squares toward its rook. The rook jumps across the king as part of the same move.',done:'You castled. The king is on g1 and the rook is on f1.'},
 {id:'promote',title:'Promote a pawn',fen:'7k/4P3/4K3/8/8/8/8/8 w - - 0 1',prompt:'Push your pawn to the last rank, then choose the piece it becomes.',done:'You promoted the pawn. A queen, rook, bishop, or knight is allowed.'},
] as const;
export type LessonId=typeof beginnerLessons[number]['id'];
export function lessonMatches(id:LessonId,after:Chess,move:{san:string;promotion?:string}){
 return id==='check'?after.isCheck():id==='castle'?move.san.startsWith('O-O'):Boolean(move.promotion);
}
export const threatPuzzles=[
 {fen:'7k/6b1/8/8/8/2R5/6P1/6K1 w - - 0 1',answer:'c3',attacker:'g7',reason:'The bishop on g7 attacks the rook on c3 along the diagonal.'},
 {fen:'7k/8/2n5/8/3Q4/6P1/8/6K1 w - - 0 1',answer:'d4',attacker:'c6',reason:'The knight on c6 can jump to d4 and capture the queen.'},
 {fen:'4r2k/8/8/8/8/4B3/6P1/6K1 w - - 0 1',answer:'e3',attacker:'e8',reason:'The rook on e8 has a clear file to the bishop on e3.'},
] as const;
