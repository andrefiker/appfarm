import {generateTerrain,settle,crater,rng,heightAt} from './terrain.js';
import {launch,WEAPONS} from './weapons.js';
import {advance,blastDamage,DT,targetPosition} from './physics.js';
import {CHALLENGES} from './challenges.js';
export class Game {
 constructor({mode='duel',seed=1,difficulty='normal',challenge=0,practiceIndex=0}={}){
  Object.assign(this,{mode,seed,difficulty,challenge,practiceIndex,time:0,phase:'aim',turn:0,shots:0,hits:0,direct:0,aiShots:0,turnTime:0,projectiles:[],events:[],winner:null,settleTime:0,shotHit:false,shotDirect:false});
  const c=mode==='challenge'?CHALLENGES[challenge]:null,r=rng(seed);
  this.terrain=generateTerrain(c?.seed??seed,c?.profile??'rolling');this.wind=c?.wind??Math.round((r()-.5)*28);this.gravity=100;
  this.obstacles=structuredClone(c?.obstacles||[]);this.ammo=c?.ammo??Infinity;
  const targetX=c?.targetX??(mode==='practice'?530+r()*350:880);
  this.units=[{id:0,x:100,y:0,hp:100,maxHp:100,facing:1,radius:14},{id:1,x:targetX,baseX:targetX,y:0,hp:mode==='duel'?100:1,maxHp:mode==='duel'?100:1,facing:-1,radius:c?.directOnly?6:14,directOnly:c?.directOnly||false,motion:c?.motion||0,amplitude:c?.amplitude||0}];
  this.units.forEach(u=>settle(u,this.terrain));if(c?.motion)this.units[1].y-=35;
  this.lastImpact=null;
 }
 fire(angle,power,weapon='standard'){
  if(this.phase!=='aim'||this.winner!==null||this.ammo<=0||!WEAPONS[weapon])return false;
  const forced=this.mode==='challenge'?CHALLENGES[this.challenge].weapon:null;
  if(forced)weapon=forced;
  this.shotHit=false;this.shotDirect=false;this.phase='flight';this.turnTime=0;
  this.projectiles=[launch(this.units[this.turn],angle,power,weapon)];
  if(this.turn===0){this.shots++;this.ammo--;}else this.aiShots++;
  this.events.push({type:'fire',unit:this.turn,weapon});return true;
 }
 impact(p,hit){
  this.lastImpact=hit;
  if(hit.type==='boundary'){this.events.push({type:'miss',...hit});return;}
  const w=WEAPONS[p.weapon];crater(this.terrain,hit.x,hit.y,w.crater);
  for(const unit of this.units){if(unit.hp<=0)continue;const position=targetPosition(unit,this.time);const amount=blastDamage({...unit,...position},hit,p.weapon);if(amount>0){unit.hp=Math.max(0,unit.hp-amount);this.events.push({type:'damage',unit:unit.id,amount,x:position.x,y:unit.y});if(unit.id!==p.owner&&p.owner===0)this.shotHit=true;if(hit.unit?.id===unit.id&&unit.id!==p.owner&&p.owner===0)this.shotDirect=true;}}
  this.events.push({type:'blast',x:hit.x,y:hit.y,r:w.crater,weapon:p.weapon});
  for(const u of this.units){if(!u.motion){const fall=settle(u,this.terrain);if(fall>28&&u.hp>0){const dmg=Math.round((fall-28)*.3);u.hp=Math.max(0,u.hp-dmg);this.events.push({type:'damage',unit:u.id,amount:dmg,x:u.x,y:u.y});}}}
 }
 step(){
  if(this.phase==='aim')this.time+=DT;
  if(this.phase==='flight'){
   this.time+=DT;this.turnTime+=DT;
   for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];const r=advance(p,this,this.time);p.trail.push({x:p.x,y:p.y});if(p.trail.length>180)p.trail.shift();if(r.hit){this.impact(p,r.hit);this.projectiles.splice(i,1);}else if(r.children){this.events.push({type:'split',x:p.x,y:p.y});this.projectiles.splice(i,1,...r.children);}}
   if(!this.projectiles.length){this.phase='settling';this.settleTime=.85;}
  }else if(this.phase==='settling'){
   this.settleTime-=DT;if(this.settleTime<=0)this.finishTurn();
  }
 }
 finishTurn(){
  if(this.turn===0){if(this.shotHit)this.hits++;if(this.shotDirect)this.direct++;}
  if(this.units[0].hp<=0||this.units[1].hp<=0){this.winner=this.units[0].hp<=0?(this.units[1].hp<=0?'draw':1):0;this.phase='result';return;}
  if(this.mode!=='duel'){if(this.ammo<=0){this.winner=1;this.phase='result';}else this.phase='aim';return;}
  this.turn=1-this.turn;this.phase=this.turn===1?'ai':'aim';
  // Wind is fixed for a match: each correction remains learnable and fair.
 }
 beginAI(){if(this.phase==='ai'){this.phase='aim';return true;}return false;}
 drainEvents(){const e=this.events;this.events=[];return e;}
}
export function scorePractice(shots,hits=1){return Math.max(0,Math.round(1000*hits/Math.max(1,shots)));}
export function starsFor(shots){return shots===1?3:shots<=3?2:1;}
