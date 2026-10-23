import {useEffect,useState} from 'react';
import type {Dispatch,SetStateAction} from 'react';
import {buildGame} from './computer';
import type {LocalMove} from './computer';
import {engineSearch,selectStyle,ENGINE_NAME} from './offline-engine';
import type {Style} from './offline-engine';
import {positionFromFen,moveFeatures} from './local-rules';
export function useComputerOpponent(active:boolean,moves:LocalMove[],level:number,setMoves:Dispatch<SetStateAction<LocalMove[]>>,setMessage:Dispatch<SetStateAction<string>>,settings:{style?:Style;think?:number}={}){
 const[engine,setEngine]=useState(ENGINE_NAME),[visible,setVisible]=useState(()=>document.visibilityState!=='hidden');
 useEffect(()=>{const update=()=>setVisible(document.visibilityState!=='hidden');const hide=()=>setVisible(false),show=()=>setVisible(true);document.addEventListener('visibilitychange',update);window.addEventListener('qk-background',hide);window.addEventListener('qk-resume',show);return()=>{document.removeEventListener('visibilitychange',update);window.removeEventListener('qk-background',hide);window.removeEventListener('qk-resume',show);};},[]);
 const{style='balanced',think=250}=settings;
 useEffect(()=>{if(!active||!visible)return;let retired=false;let fallback:Worker|undefined;const controller=new AbortController(),fen=buildGame(moves).fen();
 const apply=(uci:string)=>{if(retired)return;const game=buildGame(moves),made=game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});setMoves(previous=>buildGame(previous).fen()===fen?[...previous,{from:made.from,to:made.to,promotion:made.promotion,san:made.san}]:previous);};
 setEngine(ENGINE_NAME);void engineSearch(fen,{level,style,ms:think,signal:controller.signal}).then(lines=>{const pos=positionFromFen(fen);apply(selectStyle(lines,style,m=>moveFeatures(pos,m),level).move);}).catch(error=>{if(retired||error?.name==='AbortError')return;setEngine('Quiet Knight Mini 1.0 · local fallback');setMessage('Offline Stockfish could not load. Quiet Knight Mini is playing this move.');try{fallback=new Worker(new URL('./computer-worker.ts',import.meta.url),{type:'module'});fallback.onmessage=e=>{const move=e.data?.move;if(move&&!retired)apply(move.from+move.to+(move.promotion||''));fallback?.terminate();};fallback.onerror=()=>{fallback?.terminate();setMessage('No offline engine is available. Your position is saved; reopen the table to retry.');};fallback.postMessage({moves,level});}catch{setMessage('No offline engine is available. Your position is saved; reopen the table to retry.');}});
 return()=>{retired=true;controller.abort();fallback?.terminate();};},[active,visible,moves,level,setMoves,setMessage,style,think]);return engine;
}
