import {useEffect,useRef,useState} from 'react';

export function BoardLock({locked,onChange}:{locked:boolean;onChange:(locked:boolean)=>void}) {
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),[holding,setHolding]=useState(false);
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;setHolding(false);};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const start=()=>{if(timer.current)return;setHolding(true);timer.current=setTimeout(()=>{timer.current=null;setHolding(false);onChange(false);},900);};
 return <div className="board-lock" role="group" aria-label="Board lock">{locked?<><span role="status">Board locked · moves disabled</span><button type="button" className={holding?'unlock-holding':''} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start();}} onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();start();}}} onKeyUp={cancel} onBlur={cancel}>Hold to unlock</button></>:<button className="secondary" type="button" onClick={()=>onChange(true)}>Lock board</button>}</div>;
}

export function FirstGameTips(){
 const [step,setStep]=useState(()=>{try{return localStorage.getItem('qk-first-game-tips-v1')==='done'?3:0;}catch{return 0;}});
 const tips=['Tap a piece, then a highlighted square. You can also drag; release outside the board to cancel.','Open Move history to revisit a position. Return to game restores the live board.','Table controls contains draw, resign, sound and accessibility settings.'];
 function dismiss(){setStep(3);try{localStorage.setItem('qk-first-game-tips-v1','done');}catch{}}
 return step<3?<aside className="first-game-tips" aria-label="First game tips"><p><strong>{step+1}/3</strong> {tips[step]}</p><div><button type="button" onClick={()=>step===2?dismiss():setStep(n=>n+1)}>{step===2?'Got it':'Next tip'}</button><button type="button" onClick={dismiss}>Dismiss tips</button></div></aside>:null;
}
