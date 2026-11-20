import {useMemo,useState} from 'react';
import {Chess} from 'chess.js';
import type {Square} from 'chess.js';
import {ChessBoard,PromotionChoices} from './chess-ui';
import type {Position} from './chess-ui';
import {beginnerLessons,lessonMatches,threatPuzzles,whyIllegal} from './beginner-rules';
import './beginner-practice.css';
export type BeginnerPreset='rules'|'tactics';
export function BeginnerEntry({onPractice,onFullGame}:{onPractice:(preset:BeginnerPreset)=>void;onFullGame:()=>void}){
 return <section className="beginner-entry" aria-labelledby="beginner-entry-title"><h2 id="beginner-entry-title">Beginner practice</h2><p>Learn the rules offline, spot a threat, or play the computer.</p><div><button type="button" className="secondary" onClick={()=>onPractice('rules')}>Learn the rules</button><button type="button" className="secondary" onClick={()=>onPractice('tactics')}>Practice tactics</button><button type="button" className="secondary" onClick={onFullGame}>Play a full game</button></div></section>;
}
export function BeginnerPractice({preset,onBack}:{preset:BeginnerPreset;onBack:()=>void}){
 const tactics=preset==='tactics';
 const items=tactics?threatPuzzles:beginnerLessons;
 const [step,setStep]=useState(0),[result,setResult]=useState<{fen?:string;message:string;correct:boolean}|null>(null);
 const [selected,select]=useState<Square|null>(null),[pending,setPending]=useState<{from:Square;to:Square}|null>(null),[done,setDone]=useState(false),[revealed,setRevealed]=useState(false);
 const lesson=beginnerLessons[step],puzzle=threatPuzzles[step];
 const game=useMemo(()=>new Chess(result?.fen||items[step].fen),[result?.fen,items,step]);
 const board=useMemo(()=>Object.fromEntries(game.board().flat().filter(Boolean).map(p=>[p!.square,{color:p!.color,type:p!.type}])) as Position,[game]);
 const kingInCheck=game.isCheck()?Object.keys(board).find(square=>board[square].color===game.turn()&&board[square].type==='k')||null:null;
 function reset(){setResult(null);select(null);setRevealed(false);setPending(null);}
 function move(from:Square,to:Square,promotion?:string){
  const why=whyIllegal(game,from,to);
  if(why){setResult({message:why,correct:false});return;}
  if(!promotion&&game.moves({square:from,verbose:true}).some(m=>m.to===to&&m.promotion)){setPending({from,to});return;}
  const next=new Chess(game.fen()),played=next.move({from,to,promotion});
  if(!lessonMatches(lesson.id,next,played)){setResult({message:'That move is legal, but does not finish this exercise. Try another move.',correct:false});return;}
  select(null);setPending(null);setResult({fen:next.fen(),message:lesson.done,correct:true});
 }
 function onSquare(square:string){
  if(done||revealed||result?.correct||pending)return;
  const s=square as Square;
  if(tactics){
   if(board[s]?.color!=='w'){setResult({message:'Choose a white piece that Black could capture on its next turn.',correct:false});return;}
   select(s);
   if(s===puzzle.answer){setRevealed(true);setResult({message:'Correct. '+puzzle.reason,correct:true});}
   else setResult({message:'Not that piece. Follow the black piece’s line of attack and try again.',correct:false});
   return;
  }
  if(board[s]?.color==='w'){select(selected===s?null:s);return;}
  if(selected)move(selected,s);
 }
 return <main className="qk beginner-page" aria-label={tactics?'Spot the Threat':'First-game guide'}>
  <header><button type="button" className="secondary" onClick={onBack}>Back to table</button><small>Quiet Knight · Practice</small></header>
  <h1>{tactics?'Spot the Threat':'First-game guide'}</h1>
  <p className="beginner-progress">{done?'Practice complete':(tactics?'Position ':'Lesson ')+(step+1)+' of '+items.length}</p>
  {done?<section className="beginner-callout"><h2>{tactics?'Good eye.':'You know the essentials.'}</h2><p>{tactics?'Before moving, see which of your pieces the opponent can capture.':'You gave check, castled and promoted a pawn.'}</p><button type="button" className="secondary" onClick={()=>{setDone(false);setStep(0);reset();}}>Practise again</button></section>:<>
   <h2>{tactics?'Which white piece is under attack?':lesson.title}</h2>
   <p>{tactics?'Assume Black could move now. Tap the white piece Black threatens to capture.':lesson.prompt}</p>
   <div className="board-frame"><ChessBoard position={board} orientation="w" selected={revealed?puzzle.answer:selected} targets={revealed?[puzzle.attacker]:!tactics&&selected?game.moves({square:selected,verbose:true}).map(m=>m.to):[]} last={null} check={kingInCheck} motion={null} locked={false} onSquare={onSquare}/></div>
   <div className="beginner-feedback" role="status">{result?.message}</div>
   {pending?<div className="beginner-callout"><PromotionChoices color="w" onChoose={kind=>move(pending.from,pending.to,kind)}/><button type="button" className="secondary" onClick={()=>setPending(null)}>Cancel promotion</button></div>:null}
   <div className="beginner-actions">
    {tactics&&!revealed?<button type="button" className="secondary" disabled={selected===null} onClick={()=>{setRevealed(true);setResult({message:puzzle.reason,correct:false});}}>Reveal answer</button>:null}
    {result?.correct||revealed?<button type="button" className="primary" onClick={()=>{if(step===items.length-1)setDone(true);else setStep(step+1);reset();}}>{step===items.length-1?'Finish practice':'Next exercise'}</button>:null}
    <button type="button" className="secondary" onClick={reset}>Reset position</button>
   </div></>}
 </main>;
}
