import {score} from './scoring.js';
import {LAYOUTS} from './physics.js';
export const freshStats=()=>({games:0,best:0,sum:0,strikes:0,spares:0,pins:0,perfect:0,longest:0,streak:0,challenges:0,firstRolls:0,spareAttempts:0});
export const freshGame=(mode='classic')=>({mode,rolls:[],standing:[...LAYOUTS[0]],phase:'ready',shot:0,challenge:0,timeLeft:90,timePins:0,finished:false});
export function frameCount(g){return g.mode==='quick'?5:10;}
export function commitRoll(g,remaining,stats){if(g.phase!=='rolling')throw Error('No active roll');const before=score(g.rolls,frameCount(g));const pins=g.standing.length-remaining.length;g.shot++;stats.pins+=pins;
 if(['practice','challenge','time'].includes(g.mode)){
  g.timePins+=pins;if(g.mode==='challenge'&&remaining.length===0){stats.challenges++;g.challenge++;}
  if(g.mode==='practice')g.standing=remaining.length?remaining:[...LAYOUTS[0]];
  if(g.mode==='challenge')g.standing=[...LAYOUTS[1+g.challenge%(LAYOUTS.length-1)]];
  if(g.mode==='time')g.standing=[...LAYOUTS[0]];
 }else{
 const f=before.frames.at(-1),first=!f||f.closed||before.frame===frameCount(g)&&(f.rolls.length===1&&f.rolls[0]===10||f.rolls.length===2&&(f.rolls[0]===10?f.rolls[1]===10:f.rolls[0]+f.rolls[1]===10));
 if(first){stats.firstRolls++;if(pins===10){stats.strikes++;stats.streak++;stats.longest=Math.max(stats.longest,stats.streak);}else stats.streak=0;}
 else {stats.spareAttempts++;if(remaining.length===0)stats.spares++;stats.streak=0;}
 g.rolls.push(pins);const after=score(g.rolls,frameCount(g));g.standing=after.remaining===10?[...LAYOUTS[0]]:remaining;
 if(after.complete){g.finished=true;if(g.mode==='classic'){stats.games++;stats.sum+=after.total;stats.best=Math.max(stats.best,after.total);if(after.total===300)stats.perfect++;}}
 }
 g.phase='ready';return pins;
}
export function encode(g,stats,prefs){return JSON.stringify({version:1,g,stats,prefs});}
export function decode(raw){try{const v=JSON.parse(raw);if(v.version!==1||!v.g||!Array.isArray(v.g.rolls))return null;score(v.g.rolls,frameCount(v.g));if(!v.g.standing.every(id=>Number.isInteger(id)&&id>0&&id<=10))return null;if(v.g.phase==='rolling')v.g.phase='ready';return v;}catch{return null;}}
