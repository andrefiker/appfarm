import {launch,clamp} from './weapons.js';
import {trace,blastDamage,targetPosition} from './physics.js';
import {rng} from './terrain.js';
export function solve(world,unit,target,weapon='standard',step=3){
 let best={angle:45,power:65,error:Infinity,damage:0};
 for(let angle=16;angle<=84;angle+=step)for(let power=14;power<=100;power+=step){
  const result=trace(world,launch(unit,angle,power,weapon));
  let damage=0;for(const p of result.impacts){const pos=targetPosition(target,(world.time||0)+result.elapsed);damage+=blastDamage({...target,...pos},p,weapon);}
  const error=damage>0?-damage:result.closest;
  if(error<best.error)best={angle,power,error,damage};
 }
 return best;
}
export function aimAI(world,difficulty='normal',attempt=0,seed=1){
 const unit=world.units[1],target=world.units[0];
 const weapon=attempt%4===3?'heavy':'standard',best=solve(world,unit,target,weapon,4);
 const random=rng(seed+attempt*177),spread={easy:12,normal:5,hard:.8}[difficulty]??5;
 const correction=1/(1+attempt*.32);
 return {...best,weapon,angle:clamp(best.angle+(random()-.5)*spread*correction,5,85),power:clamp(best.power+(random()-.5)*spread*1.4*correction,0,100)};
}
