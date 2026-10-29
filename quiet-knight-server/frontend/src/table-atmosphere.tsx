import {useCallback,useEffect,useLayoutEffect,useState} from 'react';import {materialTotals} from './chess-view-model';import type {Position} from './chess-ui';import type {Losses} from './chess-view-model';
import {loadTablePreferences,REFERENCE_TABLE} from './table-preferences';
export function useTablePreferences(){
 const[initial]=useState(()=>{try{return loadTablePreferences(localStorage);}catch{return loadTablePreferences();}});
 const[zen,setZen]=useState(initial.zen);
 useLayoutEffect(()=>{
  document.body.dataset.atmosphere='brushed-metal';
  document.body.dataset.pieceSet=REFERENCE_TABLE.pieceSet;
 },[]);
 useEffect(()=>{try{localStorage.setItem('qk-zen-table-v1',String(zen));}catch{}},[zen]);
 return{zen,setZen};
}
export function useQuietIdle(active:boolean,wakeKey:string,warning:boolean){const[idle,setIdle]=useState(false);const wake=useCallback(()=>setIdle(false),[]);useEffect(()=>{setIdle(false);if(!active||warning)return;let timer:number;const arm=()=>{window.clearTimeout(timer);setIdle(false);timer=window.setTimeout(()=>setIdle(true),180000);};arm();document.addEventListener('pointerdown',arm,{passive:true});document.addEventListener('keydown',arm);document.addEventListener('focusin',arm);document.addEventListener('visibilitychange',arm);return()=>{window.clearTimeout(timer);document.removeEventListener('pointerdown',arm);document.removeEventListener('keydown',arm);document.removeEventListener('focusin',arm);document.removeEventListener('visibilitychange',arm);};},[active,wakeKey,warning]);return{idle,wake};}
export function GameSoFar({position,sans,losses}:{position:Position;sans:string[];losses:Losses|null}){const material=materialTotals(position);const delta=material.w-material.b;const captures=losses?losses.w.length+losses.b.length:null;const whiteQueen=Object.values(position).some(p=>p.type==='q'&&p.color==='w'),blackQueen=Object.values(position).some(p=>p.type==='q'&&p.color==='b');return <details className='game-so-far'><summary>The game so far</summary><p>Move {Math.floor(sans.length/2)+1} · {delta===0?'Equal material':`${delta>0?'White':'Black'} +${Math.abs(delta)} material`}{captures===null?'':` · ${captures} ${captures===1?'capture':'captures'}`}</p><p>{whiteQueen&&blackQueen?'Queens on both sides':whiteQueen?'White has a queen':blackQueen?'Black has a queen':'No queens on the board'} · {sans.length?`Last move ${sans[sans.length-1]}`:'No moves yet'}</p></details>;}

