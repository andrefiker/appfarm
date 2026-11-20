import {useEffect,useRef,useState} from 'react';
import {Chess,type Move} from 'chess.js';
import {engineSearch,type EngineLine} from './offline-engine';
import {api} from './network';

type Side='w'|'b';
type View={game_number:number;revision:number;available:boolean;enabled:boolean;proposal:{id:string;by:Side}|null};
type Room={code:string;fen:string;version:number;game_number?:number;teaching_revision?:number};
type Choice={move:string;reason:string;watch:string};
type Props={room:Room|null;seat:string|null;me:Side|null;fen:string;yourTurn:boolean;connected:boolean;accept:(value:unknown)=>void};
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function legal(game:Chess,uci:string):Move|null{try{return /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)?game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]}):null;}catch{return null;}}
function textMove(m:Move){return (m.san.startsWith('O-O')?'Castle':names[m.piece][0].toUpperCase()+names[m.piece].slice(1)+' '+m.from+' → '+m.to)+' ('+m.san+')';}
function explain(fen:string,lines:EngineLine[]):Choice[]{
 const seen=new Set<string>();
 return lines.slice(0,3).flatMap(line=>{
  const game=new Chess(fen),m=legal(game,line.move);
  if(!m||seen.has(line.move))return [];seen.add(line.move);
  let reason=m.san.endsWith('#')?'This is checkmate.':m.san.startsWith('O-O')?'Castle to shelter your king and bring your rook into play.':m.promotion?'Promote your pawn to a '+names[m.promotion]+'.':m.captured?'Take the '+names[m.captured]+' on '+m.to+'.':m.san.endsWith('+')?'Give check, so your opponent must answer it.':m.piece==='p'&&/[de][45]/.test(m.to)?'Put a pawn in the center to claim space.':(m.piece==='n'||m.piece==='b')&&/[18]$/.test(m.from)?'Bring a back-rank piece into play.':'A playable candidate from Stockfish’s short search.';
  const answer=line.pv[1]&&legal(game,line.pv[1]);
  const watch=answer?'Watch '+textMove(answer)+': '+(answer.san.endsWith('#')?'it’s checkmate.':answer.captured?'it takes a '+names[answer.captured]+'.':answer.san.endsWith('+')?'it gives check.':'it is one possible reply, not a forced move.'):'Check whether your piece can be taken and whether your king stays safe.';
  return [{move:textMove(m),reason,watch}];
 });
}
export function BeginnerCoach({room,seat,me,fen,yourTurn,connected,accept}:Props){
 const [view,setView]=useState<View|null>(null),[working,setWorking]=useState(false),[error,setError]=useState(''),[choices,setChoices]=useState<Choice[]>([]);
 const dialog=useRef<HTMLDialogElement>(null),job=useRef<AbortController|null>(null),mutating=useRef(false),live=useRef('');
 const route=room?.code?'/api/rooms/'+room.code+'/teaching':null,game=room?.game_number||1,rev=room?.teaching_revision;
 const capable=Boolean(route&&seat&&me&&typeof rev==='number');
 const key=[route,game,rev,me,room?.version,fen,yourTurn,connected].join('|');live.current=key;
 const statusKey=[route,game,rev,seat,me,connected].join('|');
 const [viewOwner,setViewOwner]=useState('');
 const current=viewOwner===statusKey?view:null;
 function stop(){job.current?.abort();job.current=null;setChoices([]);setWorking(false);}
 useEffect(()=>{stop();setError('');if(dialog.current?.open)dialog.current.close();return()=>{job.current?.abort();job.current=null;};},[key]);
 useEffect(()=>{
  const hide=()=>{if(document.visibilityState==='hidden'){stop();dialog.current?.close();}};
  document.addEventListener('visibilitychange',hide);
  return()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 useEffect(()=>{
  if(!capable||!connected||!route)return;
  let gone=false;
  api.post(route,{action:'status',seat_token:seat,game_number:game}).then(({data})=>{
   if(!gone&&data.teaching?.game_number===game&&data.teaching.revision===rev){setView(data.teaching);setViewOwner(statusKey);}
  },()=>{if(!gone)setViewOwner('');});
  return()=>{gone=true;};
 },[statusKey,capable]);
 async function change(action:string){
  if(!route||!room||!current||!connected||mutating.current)return;
  const at=key;mutating.current=true;setError('');
  try{const {data}=await api.post(route,{action,seat_token:seat,game_number:game,expected_version:room.version,proposal_id:current.proposal?.id});if(live.current===at&&data.room)accept(data.room);}
  catch{if(live.current===at)setError('The table changed or the request expired. Close and try again.');}
  finally{mutating.current=false;}
 }
 async function hint(){
  if(document.visibilityState==='hidden'||!yourTurn||(room&&(!current?.enabled||!connected||!route))||job.current)return;
  const at=key,controller=new AbortController();job.current=controller;setWorking(true);setChoices([]);setError('');
  try{
    if(room){
      const {data}=await api.post(route!,{action:'tip',seat_token:seat,game_number:game,expected_version:room.version,expected_fen:fen});
      if(data.fen!==fen||data.position_version!==room.version||!data.teaching?.enabled)throw Error('Position changed');
    }
    if(controller.signal.aborted||live.current!==at)return;
    const lines=await engineSearch(fen,{ms:350,analysis:true,signal:controller.signal});
    if(controller.signal.aborted||live.current!==at)return;
    const next=explain(fen,lines);if(!next.length)throw Error('No suggestions');setChoices(next);
  }catch{if(!controller.signal.aborted&&live.current===at)setError('Couldn’t get a tip for this position. Try again.');}
  finally{if(job.current===controller){job.current=null;setWorking(false);}}
 }
 if(room&&(!capable||!current?.available))return null;
 const button=room?(current?.enabled?'Coach · on':current?.proposal?'Teaching request':'Teaching'):'Beginner Coach';
 return <>
  <button type="button" className="secondary beginner-coach-toggle" aria-haspopup="dialog" onClick={()=>{setError('');if(!dialog.current?.open)dialog.current?.showModal();if(!room||current?.enabled)void hint();}}>{button}</button>
  <dialog ref={dialog} className="qk-dialog coach-dialog" aria-labelledby="qk-coach-title" onClose={stop}>
   <div className="dialog-head"><h2 id="qk-coach-title">Beginner Coach</h2><button type="button" className="secondary" autoFocus onClick={()=>dialog.current?.close()}>Close</button></div>
   {room?<p>{current?.enabled?'Teaching is on for both players. No Quiet Points this game.':current?.proposal?'Teaching request pending. Tips stay off until both players agree.':'Teaching is off. Both players must agree. Enabling it makes this game casual, without Quiet Points.'}</p>:null}
   {room&&!current?.enabled?(current?.proposal
      ? current.proposal.by===me?<button type="button" onClick={()=>void change('cancel')}>Cancel request</button>
        :<div className="coach-actions"><button type="button" onClick={()=>void change('accept')}>Accept teaching</button><button type="button" onClick={()=>void change('decline')}>Decline</button></div>
      :<button type="button" onClick={()=>void change('request')}>Request teaching</button>):null}
   {(!room||current?.enabled)&&<><p>{yourTurn?'Nothing is played for you. Pick a move on the board.':'Tips are available on your turn.'}</p>
    {working?<p role="status">Looking at this position…</p>:choices.length?<ol className="coach-choices">{choices.map((choice,i)=><li key={choice.move}><strong>{i===0?'Top idea: ':''}{choice.move}</strong><p>{choice.reason}</p><small>{choice.watch}</small></li>)}</ol>:yourTurn?<button type="button" onClick={()=>void hint()}>Get tips</button>:null}
   </>}
   {error?<p role="alert">{error}</p>:null}
   {room&&current?.enabled?<button type="button" className="secondary" onClick={()=>void change('disable')}>Turn off teaching</button>:null}
  </dialog>
 </>;
}
