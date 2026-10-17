/* TRAJECTORY 1.0.0 • self-contained offline production bundle */
(()=>{
"use strict";

// weapons
const WEAPONS = Object.freeze({
 standard:{name:'Standard',short:'Balanced & precise',speed:1,damage:48,blast:63,crater:42,color:'#ffd18a'},
 heavy:{name:'Heavy',short:'Slow • deep crater',speed:.82,damage:72,blast:80,crater:64,color:'#ff9d6b'},
 cluster:{name:'Cluster',short:'Splits after the apex',speed:1,damage:23,blast:43,crater:28,color:'#98e4d2'}
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const radians=d=>d*Math.PI/180;
const muzzleSpeed=(power,weapon='standard')=>(80+clamp(power,0,100)*3.2)*WEAPONS[weapon].speed;
function launch(unit,angle,power,weapon='standard'){
 const a=radians(clamp(angle,5,85)),dir=unit.facing||1,s=muzzleSpeed(power,weapon);
 return {x:unit.x+Math.cos(a)*26*dir,y:unit.y-Math.sin(a)*26,vx:Math.cos(a)*s*dir,vy:-Math.sin(a)*s,weapon,owner:unit.id,age:0,child:false,trail:[]};
}
function split(p){return [-1,0,1].map(i=>({...p,vx:p.vx*.83+i*42,vy:32+Math.abs(i)*7,child:true,trail:[]}));}


// terrain

const WIDTH=1000,FLOOR=600,DX=2;
function rng(seed=1){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function generateTerrain(seed=1,profile='rolling'){
 const random=rng(seed),phase=random()*6.28,phase2=random()*6.28;
 const h=Array.from({length:WIDTH/DX+1},(_,i)=>{
  const x=i*DX;
  let y=426+Math.sin(x/133+phase)*40+Math.sin(x/68+phase2)*16;
  if(profile==='flat')y=443;
  if(profile==='valley')y=330+Math.sin(x/1000*Math.PI)*140;
  if(profile==='ridge')y=440-Math.exp(-Math.pow((x-500)/130,2))*125;
  if(profile==='high')y=480-x*.19+Math.sin(x/95)*12;
  return clamp(y,270,510);
 });
 for(const cx of [100,880]){const y=h[Math.round(cx/DX)];for(let i=(cx-25)/DX|0;i<=(cx+25)/DX;i++)h[i]=y;}
 return h;
}
function heightAt(h,x){const n=clamp(x/DX,0,h.length-1),i=Math.floor(n);return h[i]+((h[i+1]??h[i])-h[i])*(n-i);}
function crater(h,x,y,r){let changed=0;for(let i=Math.max(0,Math.floor((x-r)/DX));i<=Math.min(h.length-1,Math.ceil((x+r)/DX));i++){const d=i*DX-x;if(Math.abs(d)>r)continue;const reach=Math.sqrt(r*r-d*d);if(y+reach>=h[i]&&y-reach<=FLOOR){let next=clamp(Math.max(h[i],y+reach),0,FLOOR-8);if(next!==h[i])changed++;h[i]=next;}}return changed;}
function settle(unit,h){const prev=unit.y;let support=FLOOR;for(let x=unit.x-11;x<=unit.x+11;x+=2)support=Math.min(support,heightAt(h,x));unit.y=support-9;return Math.max(0,unit.y-prev);}
function validTerrain(h){return h.length===501&&h.every(y=>Number.isFinite(y)&&y>=200&&y<FLOOR)&&Math.abs(heightAt(h,100)-heightAt(h,880))<210;}


// physics


const DT=1/120, GRAVITY=100;
function integrate(p,dt,wind=0,gravity=GRAVITY){p.x+=p.vx*dt+.5*wind*dt*dt;p.y+=p.vy*dt+.5*gravity*dt*dt;p.vx+=wind*dt;p.vy+=gravity*dt;}
function targetPosition(u,time){return u.motion?{x:u.baseX+Math.sin(time*u.motion)*u.amplitude,y:u.y}:u;}
function sweep(a,b,world,time=0,owner=null,age=1){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
 for(let i=1;i<=steps;i++){const k=i/steps,x=a.x+(b.x-a.x)*k,y=a.y+(b.y-a.y)*k;
  for(const unit of world.units){if(unit.hp<=0||(unit.id===owner&&age<.3))continue;const u=targetPosition(unit,time);if(Math.hypot(x-u.x,y-u.y)<(unit.radius||14)+2)return {x,y,type:'unit',unit};}
  for(const o of world.obstacles||[])if(x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h)return {x,y,type:'obstacle',obstacle:o};
  if(x<0||x>WIDTH||y>FLOOR+20||y<-1400)return {x,y,type:'boundary'};
  if(y>=heightAt(world.terrain,x))return {x,y,type:'terrain'};
 }
 return null;
}
function advance(p,world,time,dt=DT){const old={x:p.x,y:p.y};integrate(p,dt,world.wind,world.gravity??GRAVITY);p.age+=dt;const hit=sweep(old,p,world,time,p.owner,p.age);if(hit){p.x=hit.x;p.y=hit.y;return {hit};}if(p.weapon==='cluster'&&!p.child&&p.vy>=12)return {children:split(p)};if(p.age>16)return {hit:{x:p.x,y:p.y,type:'boundary'}};return {};}
function blastDamage(unit,impact,weapon){const w=WEAPONS[weapon],d=Math.max(0,Math.hypot(unit.x-impact.x,unit.y-impact.y)-(unit.radius||14));if(unit.directOnly&&impact.unit?.id!==unit.id)return 0;return d>=w.blast?0:Math.round(w.damage*(1-d/w.blast));}
function trace(world,p,maxSteps=2000){
 const queue=[p],points=[],impacts=[];let closest=Infinity,elapsed=0;
 for(let i=0;i<maxSteps&&queue.length;i++){
  elapsed+=DT;
  for(let j=queue.length-1;j>=0;j--){const q=queue[j],r=advance(q,world,(world.time||0)+elapsed);if(i%8===0)points.push({x:q.x,y:q.y});
   const target=world.units.find(u=>u.id!==p.owner&&u.hp>0);if(target){const pos=targetPosition(target,(world.time||0)+elapsed);closest=Math.min(closest,Math.hypot(q.x-pos.x,q.y-pos.y));}
   if(r.hit){impacts.push({...r.hit,weapon:q.weapon});queue.splice(j,1);}else if(r.children){queue.splice(j,1,...r.children);}
  }
 }
 return {points,impacts,closest,elapsed};
}


// challenges
const CHALLENGES=[
 ['First contact','A calm field. Find your range.','flat',0,4],
 ['A little further','More distance calls for more power.','rolling',0,4],
 ['Tailwind','A following wind carries your shell.','flat',12,4],
 ['Headwind','Fire into the wind. Add a little power.','flat',-12,4],
 ['Higher ground','The target is above you. Try a higher arc.','high',0,4],
 ['Over the ridge','Lift your shell over the central ridge.','ridge',0,4],
 ['Across the valley','Elevation changes the landing point.','valley',6,4],
 ['Crosswind','Strong wind. Watch your first miss.','flat',24,4],
 ['Against the gale','The wind is fierce. Plan a shorter flight.','rolling',-22,4],
 ['The wall','A high arc clears the barrier.','flat',4,4],
 ['Needlework','A small target. Only direct contact counts.','flat',0,5],
 ['Heavy weather','Heavy shells fly more slowly.','rolling',-8,4,'heavy'],
 ['Scattershot','Cluster shells split after the apex.','flat',8,4,'cluster'],
 ['Night watch','Haze hides the hills. Trust the wind gauge.','ridge',-14,4],
 ['Moving mark','Lead a moving target. It follows a steady rhythm.','flat',8,5]
].map(([name,hint,profile,wind,ammo,weapon],i)=>({id:i,name,hint,profile,wind,ammo,weapon:weapon||null,seed:700+i,targetX:i===0?620:i===1?820:800,obstacles:i===9?[{x:470,y:245,w:28,h:200}]:[],directOnly:i===10,motion:i===14?.7:0,amplitude:i===14?60:0,fog:i===13}));


// ai



function solve(world,unit,target,weapon='standard',step=3){
 let best={angle:45,power:65,error:Infinity,damage:0};
 for(let angle=16;angle<=84;angle+=step)for(let power=14;power<=100;power+=step){
  const result=trace(world,launch(unit,angle,power,weapon));
  let damage=0;for(const p of result.impacts){const pos=targetPosition(target,(world.time||0)+result.elapsed);damage+=blastDamage({...target,...pos},p,weapon);}
  const error=damage>0?-damage:result.closest;
  if(error<best.error)best={angle,power,error,damage};
 }
 return best;
}
function aimAI(world,difficulty='normal',attempt=0,seed=1){
 const unit=world.units[1],target=world.units[0];
 const weapon=attempt%4===3?'heavy':'standard',best=solve(world,unit,target,weapon,4);
 const random=rng(seed+attempt*177),spread={easy:12,normal:5,hard:.8}[difficulty]??5;
 const correction=1/(1+attempt*.32);
 return {...best,weapon,angle:clamp(best.angle+(random()-.5)*spread*correction,5,85),power:clamp(best.power+(random()-.5)*spread*1.4*correction,0,100)};
}


// game




class Game {
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
function scorePractice(shots,hits=1){return Math.max(0,Math.round(1000*hits/Math.max(1,shots)));}
function starsFor(shots){return shots===1?3:shots<=3?2:1;}


// storage


const STORAGE_KEY='trajectory.progress.v1';
function loadProgress(storage){
 const p={version:1,wins:0,losses:0,shots:0,hits:0,direct:0,bestPractice:0,challenges:Array(15).fill(0),tutorial:false,settings:{sound:true,haptics:true,left:true,guide:true,motion:true,difficulty:'normal'}};
 try{const raw=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(raw&&typeof raw==='object'){
 for(const k of ['wins','losses','shots','hits','direct','bestPractice'])if(Number.isFinite(raw[k]))p[k]=Math.floor(clamp(raw[k],0,1e9));
 p.challenges=p.challenges.map((_,i)=>Number.isFinite(raw.challenges?.[i])?Math.floor(clamp(raw.challenges[i],0,3)):0);
 for(const k of ['sound','haptics','left','guide','motion'])if(typeof raw.settings?.[k]==='boolean')p.settings[k]=raw.settings[k];
 if(['easy','normal','hard'].includes(raw.settings?.difficulty))p.settings.difficulty=raw.settings.difficulty;
 p.tutorial=raw.tutorial===true;
 }}catch{}return p;
}
function saveProgress(storage,p){try{if(!storage)return false;storage.setItem(STORAGE_KEY,JSON.stringify(p));return true;}catch{return false;}}
function recordResult(p,g){
 if(g.recorded)return;g.recorded=true;p.shots+=g.shots;p.hits+=g.hits;p.direct+=g.direct;
 if(g.mode==='duel'){if(g.winner===0)p.wins++;else if(g.winner===1)p.losses++;}
 if(g.mode==='challenge'&&g.winner===0)p.challenges[g.challenge]=Math.max(p.challenges[g.challenge],starsFor(g.shots));
}
function achievements(p){return [p.wins>=1&&'First victory',p.direct>=1&&'Dead centre',p.wins>=5&&'Field veteran',p.challenges.filter(Boolean).length>=5&&'Problem solver',p.challenges.every(Boolean)&&'Master of the arc',p.bestPractice>=3500&&'Sharpshooter'].filter(Boolean);}


// audio
class Sound {
 constructor(settings){this.settings=settings;this.ctx=null;this.flight=null;}
 unlock(){try{if(!this.ctx)this.ctx=new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();}catch{}}
 tone(freq,duration=.12,type='sine',volume=.06,slide=1){if(!this.settings.sound||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(15,freq*slide),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+duration);}
 noise(duration=.25,volume=.14){if(!this.settings.sound||!this.ctx)return;const c=this.ctx,b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,2);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=650;g.gain.value=volume;s.connect(f);f.connect(g);g.connect(c.destination);s.start();}
 play(type){if(type==='fire'){this.noise(.25,.22);this.tone(110,.26,'triangle',.1,.25);}else if(type==='blast'){this.noise(.5,.23);this.tone(65,.4,'sine',.14,.3);}else if(type==='damage'){this.tone(700,.15,'sine',.06,.5);}else if(type==='victory'){[440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,.3),i*100));}else if(type==='defeat'){this.tone(220,.5,'triangle',.06,.5);}else if(type==='split')this.tone(1100,.12,'sine',.03,.3);else this.tone(400,.045,'sine',.025,1.3);}
 setFlight(on){if(!on){if(this.flight){try{this.flight.o.stop();}catch{}this.flight=null;}return;}if(this.flight||!this.settings.sound||!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=190;g.gain.value=.009;o.connect(g);g.connect(this.ctx.destination);o.start();this.flight={o,g};}
 suspend(){this.setFlight(false);this.ctx?.suspend();}
 haptic(kind='tap'){if(!this.settings.haptics)return;try{if(window.Android?.haptic)window.Android.haptic(kind==='blast'?35:14);else navigator.vibrate?.(kind==='blast'?25:10);}catch{}}
}


// render




class Renderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.fx=[];this.ghost=[];this.camera={x:500,y:0,z:1};this.aimCache='';this.preview=[];this.last=0;this.recoil=[0,0];}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);if(this.canvas.width!==Math.round(r.width*d)||this.canvas.height!==Math.round(r.height*d)){this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}this.w=r.width;this.h=r.height;this.dpr=d;}
 events(events,motion=true){for(const e of events){if(e.type==='blast'){this.fx.push({...e,life:1,total:1});if(motion){const r=rng((e.x*111+e.y*57)|0);for(let i=0;i<22;i++)this.fx.push({type:'debris',x:e.x,y:e.y,vx:(r()-.5)*160,vy:-r()*180,life:.5+r()*.6,total:1});}}if(e.type==='damage')this.fx.push({...e,life:1.4,total:1.4});if(e.type==='fire'){this.recoil[e.unit]=1;this.ghost=[];}}}
 worldPoint(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.w/2)/this.s+this.camera.x,y:(clientY-r.top-this.base)/this.s+this.camera.y};}
 draw(g,ui,dt=1/60){
 this.resize();const c=this.ctx,w=this.w,h=this.h;c.setTransform(this.dpr,0,0,this.dpr,0,0);
 const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#081b30');sky.addColorStop(.58,'#344b61');sky.addColorStop(1,'#d3966d');c.fillStyle=sky;c.fillRect(0,0,w,h);
 const rs=rng(894);for(let i=0;i<38;i++){const x=rs()*w,y=rs()*h*.56;c.fillStyle=`rgba(233,236,232,${.12+rs()*.4})`;c.fillRect(x,y,1,1);}
 c.fillStyle='#f7d5aa';c.beginPath();c.arc(w*.78,h*.18,15,0,Math.PI*2);c.fill();c.fillStyle='#1b3047';c.beginPath();c.arc(w*.78-5,h*.18-4,14,0,Math.PI*2);c.fill();
 let follow=g.projectiles[0];const targetZ=follow&&ui.motion?1.12:1,targetY=follow?Math.min(0,follow.y-80):0;
 this.camera.z+=(targetZ-this.camera.z)*Math.min(1,dt*3);this.camera.x+=((follow?Math.max(450,Math.min(550,follow.x)):500)-this.camera.x)*Math.min(1,dt*3);this.camera.y+=(targetY-this.camera.y)*Math.min(1,dt*3);
 this.s=w/1000*this.camera.z;this.base=h*.79-420*this.s;
 // Three silhouette layers drift a little with the flight camera.
 for(let layer=0;layer<3;layer++){const rr=rng(111+layer*99);c.fillStyle=['#4c5866','#48505a','#333e4b'][layer];c.beginPath();c.moveTo(0,h);for(let i=0;i<=35;i++){const x=i/35*w,y=h*.6+layer*h*.065-(rr()*75+Math.sin(i*.8)*20)*(1-layer*.12);c.lineTo(x-(this.camera.x-500)*this.s*.12,y-this.camera.y*this.s*.10);}c.lineTo(w,h);c.closePath();c.fill();}
 c.save();const shake=ui.motion?this.fx.filter(f=>f.type==='blast').reduce((a,b)=>Math.max(a,b.life),0)*3:0;c.translate(w/2+Math.sin(g.time*63)*shake,this.base+Math.cos(g.time*79)*shake);c.scale(this.s,this.s);c.translate(-this.camera.x,-this.camera.y);
 for(const o of g.obstacles){c.fillStyle='#253440';c.fillRect(o.x,o.y,o.w,o.h);c.strokeStyle='#cdac83';c.lineWidth=3;c.strokeRect(o.x,o.y,o.w,o.h);for(let y=o.y+12;y<o.y+o.h;y+=18){c.beginPath();c.moveTo(o.x,y);c.lineTo(o.x+o.w,y-10);c.stroke();}}
 const earth=c.createLinearGradient(0,300,0,650);earth.addColorStop(0,'#c88d62');earth.addColorStop(.23,'#a56548');earth.addColorStop(1,'#352e35');
 c.fillStyle=earth;c.beginPath();c.moveTo(0,700);g.terrain.forEach((y,i)=>c.lineTo(i*2,y));c.lineTo(1000,700);c.closePath();c.fill();c.strokeStyle='#e0a876';c.lineWidth=2.5;c.beginPath();g.terrain.forEach((y,i)=>i?c.lineTo(i*2,y):c.moveTo(0,y));c.stroke();
 // Fine sediment contours are clipped to the ground, so excavation remains clean.
 c.save();c.beginPath();c.moveTo(0,700);g.terrain.forEach((y,i)=>c.lineTo(i*2,y));c.lineTo(1000,700);c.closePath();c.clip();const tr=rng(g.seed);c.strokeStyle='rgba(36,29,36,.13)';c.lineWidth=2;for(let y=380;y<700;y+=17){c.beginPath();for(let x=0;x<=1000;x+=20)c.lineTo(x,y+Math.sin(x/75+y)*7);c.stroke();}for(let i=0;i<180;i++){c.fillStyle='rgba(255,203,145,.09)';c.fillRect(tr()*1000,350+tr()*300,2+tr()*6,1.5);}c.restore();
 const player=g.units[0];
 if(g.phase==='aim'&&g.turn===0){const full=g.mode==='practice'&&ui.guide,key=[ui.angle,ui.power,ui.weapon,g.shots,g.seed,g.challenge,full].join(':');if(key!==this.aimCache){this.preview=trace(g,launch(player,ui.angle,ui.power,ui.weapon)).points;this.aimCache=key;}
 const pts=full?this.preview:this.preview.filter((p,i)=>i<5);c.strokeStyle=full?'rgba(255,209,138,.45)':'#ffd18a';c.lineWidth=3;c.setLineDash([5,10]);c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);}
 if(ui.lastTrail?.length){c.strokeStyle='rgba(255,215,166,.28)';c.lineWidth=2;c.setLineDash([4,9]);c.beginPath();ui.lastTrail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.setLineDash([]);}
 for(const u of g.units){const pos=targetPosition(u,g.time);c.save();c.translate(pos.x,pos.y);const col=u.id===0?'#ffd18a':'#ff9a87';if(g.mode!=='duel'&&u.id===1){c.strokeStyle=col;c.lineWidth=3;for(const r of [u.radius+4,(u.radius+4)*.55]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(-25,0);c.lineTo(25,0);c.moveTo(0,-25);c.lineTo(0,25);c.stroke();if(u.motion){c.strokeStyle='rgba(255,218,166,.3)';c.beginPath();c.moveTo(-40,30);c.lineTo(40,30);c.stroke();}}
 else{const angle=u.id===0?ui.angle:(ui.aiAngle||48),a=-radians(angle)*(u.facing||1)+(u.facing<0?Math.PI:0);c.fillStyle='#0c1e29';c.beginPath();c.roundRect(-24,-4,48,16,6);c.fill();c.strokeStyle=col;c.lineWidth=2;c.stroke();c.fillStyle='#0a1823';for(let j=-14;j<=14;j+=14){c.beginPath();c.arc(j,6,5,0,Math.PI*2);c.fill();}c.save();c.rotate(a);c.translate(-this.recoil[u.id]*6,0);c.fillStyle='#172b34';c.fillRect(-6,-6,41,12);c.fillStyle=col;c.fillRect(28,-6,7,12);c.restore();c.fillStyle='#21333c';c.beginPath();c.arc(0,-2,13,Math.PI,Math.PI*2);c.fill();if(this.recoil[u.id]>.7){c.fillStyle='#fff1c2';c.beginPath();c.arc(Math.cos(a)*42,Math.sin(a)*42,14*this.recoil[u.id],0,Math.PI*2);c.fill();}}
 c.font='600 25px system-ui';c.textAlign='center';c.fillStyle=col;c.fillText(u.id===0?'YOU':g.mode==='duel'?'RIVAL':'TARGET',0,-44);c.restore();this.recoil[u.id]=Math.max(0,this.recoil[u.id]-dt*4);}
 for(const p of g.projectiles){c.strokeStyle=WEAPONS[p.weapon].color;c.lineWidth=3;c.beginPath();p.trail.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.stroke();c.fillStyle='#fff5d5';c.shadowColor=WEAPONS[p.weapon].color;c.shadowBlur=14;c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.shadowBlur=0;}
 for(let i=this.fx.length-1;i>=0;i--){const f=this.fx[i];f.life-=dt;if(f.life<=0){this.fx.splice(i,1);continue;}const a=f.life/f.total;c.globalAlpha=a;if(f.type==='blast'){const r=f.r*(1-a)*1.45;c.fillStyle='#ffd394';c.beginPath();c.arc(f.x,f.y,Math.max(2,r),0,Math.PI*2);c.fill();c.strokeStyle='#fff1c7';c.lineWidth=3;c.beginPath();c.arc(f.x,f.y,r*1.3,0,Math.PI*2);c.stroke();c.fillStyle='#fff7e2';c.beginPath();c.arc(f.x,f.y,r*.45,0,Math.PI*2);c.fill();}else if(f.type==='debris'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=180*dt;c.fillStyle='#e6b183';c.fillRect(f.x,f.y,4,4);}else if(f.type==='damage'){c.font='bold 32px system-ui';c.textAlign='center';c.fillStyle=f.unit===1?'#ffe6b8':'#ff9a87';c.fillText('−'+f.amount,f.x,f.y-40-(1-a)*45);}c.globalAlpha=1;}
 c.restore();
 if(g.mode==='challenge'&&g.challenge===13){const fog=c.createLinearGradient(0,h*.25,0,h);fog.addColorStop(0,'rgba(30,45,62,0)');fog.addColorStop(.5,'rgba(180,188,191,.32)');fog.addColorStop(1,'rgba(30,45,62,.04)');c.fillStyle=fog;c.fillRect(0,0,w,h);}
 // Compass baseline and scale markers provide a quiet frame for the landscape.
 c.fillStyle='rgba(234,215,189,.45)';c.font='10px system-ui';c.textAlign='left';c.fillText('100 m',16,h-18);c.strokeStyle='rgba(234,215,189,.35)';c.beginPath();c.moveTo(16,h-30);c.lineTo(16+w*.1,h-30);c.stroke();
 }
}


// main








const $=id=>document.getElementById(id);
let local=null;try{local=window.localStorage;}catch{}
const progress=loadProgress(local),audio=new Sound(progress.settings),renderer=new Renderer($('battle'));
let game=new Game({seed:26}),playing=false,paused=false,resultShown=false,angle=48,power=65,weapon='standard',aiAngle=48,aiDelay=0,accumulator=0,lastFrame=0,menuFrame=0,practiceRound=0,practiceTotal=0,tutorialStep=-1,lastTrail=[],shotTrail=[],toastUntil=0,modalOpener=null;
const store=()=>saveProgress(local,progress);
const toast=text=>{$('toast').textContent=text;$('toast').hidden=false;toastUntil=performance.now()+3000;};
const titleCase=s=>s[0].toUpperCase()+s.slice(1);
function applySettings(){$('app').classList.toggle('right-hand',!progress.settings.left);audio.settings=progress.settings;}
function openSheet(html){modalOpener=document.activeElement;$('sheet').innerHTML=html;$('modal').hidden=false;$('sheet').focus();audio.setFlight(false);}
function closeSheet(){$('modal').hidden=true;modalOpener?.focus?.();}
const closeButton='<button class="close-sheet" data-action="close" aria-label="Close">×</button>';
function showMenu(){playing=false;paused=false;closeSheet();audio.setFlight(false);$('app').classList.add('menu-mode');for(const id of ['hud','deck','field-top','tip','flight-label'])$(id).hidden=true;$('menu').hidden=false;$('challenge-progress').textContent=`${progress.challenges.filter(Boolean).length} / 15 completed`;game=new Game({seed:26});renderer.fx=[];renderer.camera={x:500,y:0,z:1};}
function start(mode='duel',index=0,tutorial=false){
 closeSheet();audio.unlock();playing=true;paused=false;resultShown=false;lastTrail=[];shotTrail=[];accumulator=0;aiDelay=0;renderer.fx=[];renderer.aimCache='';renderer.camera={x:500,y:0,z:1};
 if(mode==='practice'&&index===0){practiceRound=0;practiceTotal=0;}
 game=new Game({mode,seed:tutorial?735:((Date.now()&0x7fffffff)+index),difficulty:progress.settings.difficulty,challenge:index,practiceIndex:index});
 if(tutorial){game.wind=0;game.units[1].x=620;game.units[1].baseX=620;game.units[1].y=game.terrain[310]-9;}
 tutorialStep=tutorial?0:-1;angle=48;power=65;weapon=mode==='challenge'?(CHALLENGES[index].weapon||'standard'):'standard';
 $('app').classList.remove('menu-mode');$('menu').hidden=true;for(const id of ['hud','deck','field-top'])$(id).hidden=false;
 $('mode-label').textContent=mode==='duel'?'QUICK DUEL · '+progress.settings.difficulty.toUpperCase():mode==='practice'?'PRACTICE · '+(index+1)+'/5':'CHALLENGE '+(index+1)+' · '+CHALLENGES[index].name.toUpperCase();
 $('guide-toggle').hidden=mode!=='practice';if(mode==='challenge')toast(CHALLENGES[index].hint);syncControls();syncHUD();
}
function syncControls(){
 $('angle').value=angle;$('power').value=power;$('angle-out').textContent=Math.round(angle)+'°';$('power-out').textContent=Math.round(power);
 for(const k of ['angle','power']){const e=$(k);e.style.setProperty('--fill',((Number(e.value)-Number(e.min))/(Number(e.max)-Number(e.min))*100)+'%');}
 const can=playing&&!paused&&game.phase==='aim'&&game.turn===0;
 $('fire').disabled=!can;
 for(const b of document.querySelectorAll('[data-step],#angle,#power'))b.disabled=!can;
 for(const b of document.querySelectorAll('[data-weapon]')){b.classList.toggle('selected',b.dataset.weapon===weapon);b.disabled=!can||!!(game.mode==='challenge'&&CHALLENGES[game.challenge].weapon&&b.dataset.weapon!==weapon);}
 $('weapon-info').textContent=WEAPONS[weapon].short;$('shot-count').textContent=`SHOT ${game.shots+1} · ${can?'YOUR TURN':game.phase==='ai'?'RIVAL THINKING':'WATCH THE ARC'}`;
 $('guide-toggle').textContent='GUIDE '+(progress.settings.guide?'ON':'OFF');$('ammo').textContent=game.mode==='challenge'?game.ammo+' SHOTS LEFT':'';
 const tips=['Slide ANGLE or use + / − to shape the arc.','Now adjust POWER. A little goes a long way.','Tap FIRE. Watch where your shell lands.','Use the fading trail to correct your next shot. Wind pushes every shell.'];
 $('tip').hidden=tutorialStep<0;$('tip').textContent=tips[Math.min(tutorialStep,3)]||'';
}
function syncHUD(){
 $('you-hp').textContent=Math.ceil(game.units[0].hp);$('rival-label').firstChild.textContent=game.mode==='duel'?'RIVAL ':'TARGET ';$('rival-hp').textContent=game.mode==='duel'?Math.ceil(game.units[1].hp):game.units[1].hp>0?'•':'✓';
 $('you-bar').style.width=game.units[0].hp+'%';$('rival-bar').style.width=100*game.units[1].hp/game.units[1].maxHp+'%';$('wind-value').textContent=(game.wind<0?'← ':game.wind>0?'→ ':'· ')+Math.abs(game.wind);$('round-label').textContent=game.phase==='ai'?'RIVAL THINKING':game.phase==='flight'?(game.turn===0?'YOUR SHELL':'RIVAL SHELL'):game.phase==='result'?'FIELD CLEAR':game.turn===0?'YOUR SHOT':'RIVAL SHOT';$('flight-label').hidden=game.phase!=='flight';syncControls();
}
function adjust(k,value){if(!playing||paused||game.phase!=='aim'||game.turn!==0)return;if(k==='angle')angle=clamp(Math.round(value),5,85);else power=clamp(Math.round(value),0,100);if(tutorialStep===0&&k==='angle')tutorialStep=1;else if(tutorialStep===1&&k==='power')tutorialStep=2;syncControls();}
function fire(){if(paused||!playing||game.turn!==0)return;audio.unlock();if(game.fire(angle,power,weapon)){shotTrail=[];if(tutorialStep>=0)tutorialStep=3;audio.haptic();syncHUD();}}
function duelDialog(){openSheet(`${closeButton}<div class="eyeline">QUICK DUEL</div><h2>Choose your rival.</h2><p>Same terrain. Same physics. How close should the first shot come?</p><div class="segmented">${['easy','normal','hard'].map(d=>`<button data-difficulty="${d}" class="${d===progress.settings.difficulty?'selected':''}">${titleCase(d)}</button>`).join('')}</div><button class="primary" data-action="begin-duel">ENTER THE FIELD</button>`);}
function challengeDialog(){openSheet(`${closeButton}<h2>Read the field.</h2><p>Fifteen ballistic puzzles. Every field is open; earn up to three stars by using fewer shots.</p><div class="challenge-list">${CHALLENGES.map(c=>`<button data-challenge="${c.id}"><span class="num">${String(c.id+1).padStart(2,'0')}</span><span>${c.name}<small>${c.ammo} shots${c.weapon?' · '+titleCase(c.weapon):''}</small></span><span class="stars">${'★'.repeat(progress.challenges[c.id])||'—'}</span></button>`).join('')}</div>`);}
function settingsDialog(){openSheet(`${closeButton}<h2>Make it yours.</h2><p>Everything stays on this device.</p>${[['sound','Sound','Locally synthesized effects'],['haptics','Haptics','Subtle fire and impact feedback'],['left','Left-handed','FIRE on the left'],['guide','Practice guide','Show the full practice trajectory'],['motion','Camera & particles','Tracking, recoil and impact motion']].map(([key,name,desc])=>`<div class="setting"><span>${name}<small>${desc}</small></span><button class="switch" role="switch" data-setting="${key}" aria-label="${name}" aria-checked="${progress.settings[key]}"></button></div>`).join('')}<p class="sheet-hint">No accounts. No ads. No network connection.</p>`);}
function recordsDialog(){const a=achievements(progress);openSheet(`${closeButton}<h2>Your field notes.</h2><div class="records-grid">${[[progress.wins,'WINS'],[progress.losses,'LOSSES'],progress.shots?[Math.round(100*progress.hits/progress.shots)+'%','ACCURACY']:['—','ACCURACY'],[progress.shots,'SHOTS'],[progress.direct,'DIRECT HITS'],[progress.bestPractice,'BEST PRACTICE']].map(([n,s])=>`<div><strong>${n}</strong><span>${s}</span></div>`).join('')}</div><p>${progress.challenges.filter(Boolean).length} of 15 challenges completed</p>${a.map(s=>`<div class="achievement">✦ ${s}</div>`).join('')||'<p>Your first victory is waiting.</p>'}`);}
function pauseGame(){if(!playing||paused||resultShown)return;paused=true;audio.suspend();openSheet(`<div class="eyeline">TAKE A BREATH</div><h2>Field paused.</h2><p>Your shot will wait.</p><button class="primary" data-action="resume">RESUME</button><button class="wide" data-action="restart">RESTART FIELD</button><button class="wide" data-action="menu">MAIN MENU</button>`);syncControls();}
function result(){
 if(resultShown)return;resultShown=true;audio.setFlight(false);recordResult(progress,game);const win=game.winner===0;
 if(tutorialStep>=0){progress.tutorial=true;tutorialStep=-1;}
 if(game.mode==='practice'){practiceTotal+=scorePractice(game.shots,win?1:0);if(practiceRound===4)progress.bestPractice=Math.max(progress.bestPractice,practiceTotal);}
 store();audio.play(win?'victory':'defeat');
 const heading=game.winner==='draw'?'A mutual lesson.':game.mode==='duel'?(win?'A beautiful shot.':'One more adjustment.'):win?'Range found.':'A useful miss.';
 const desc=game.mode==='duel'?(win?'The field is yours. Ready for a new landscape?':'The rival found the range. A fresh field is one tap away.'):game.mode==='practice'?`Target ${practiceRound+1} of 5 · Round score ${practiceTotal.toLocaleString()}`:CHALLENGES[game.challenge].hint;
 openSheet(`<div class="eyeline">${game.mode==='duel'?(win?'VICTORY':game.winner==='draw'?'DRAW':'DEFEAT'):game.mode==='practice'?'TARGET PRACTICE':'CHALLENGE '+(game.challenge+1)}</div><h2>${heading}</h2><p>${desc}</p>${game.mode==='challenge'&&win?`<div class="result-stars">${'★'.repeat(starsFor(game.shots))}${'☆'.repeat(3-starsFor(game.shots))}</div>`:''}<div class="result-stats"><div><strong>${game.shots}</strong><span>SHOTS</span></div><div><strong>${Math.round(100*game.hits/Math.max(1,game.shots))}%</strong><span>ACCURACY</span></div><div><strong>${game.direct}</strong><span>DIRECT HITS</span></div></div><button class="primary" data-action="${game.mode==='practice'&&practiceRound<4?'next-target':game.mode==='challenge'&&win&&game.challenge<14?'next-challenge':'restart'}">${game.mode==='practice'&&practiceRound<4?'NEXT TARGET':game.mode==='challenge'&&win&&game.challenge<14?'NEXT CHALLENGE':'PLAY AGAIN'}</button><button class="wide" data-action="menu">MAIN MENU</button>`);
 syncHUD();
}
$('play').onclick=duelDialog;$('practice').onclick=()=>start('practice');$('challenges').onclick=challengeDialog;$('settings').onclick=settingsDialog;$('records').onclick=recordsDialog;$('tutorial').onclick=()=>start('practice',0,true);$('pause').onclick=pauseGame;$('fire').onclick=fire;
for(const k of ['angle','power'])$(k).addEventListener('input',e=>adjust(k,Number(e.target.value)));
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const [k,d]=b.dataset.step.split(':');adjust(k,(k==='angle'?angle:power)+Number(d));audio.play('ui');});
document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{weapon=b.dataset.weapon;audio.play('ui');syncControls();});
$('guide-toggle').onclick=()=>{progress.settings.guide=!progress.settings.guide;store();syncControls();};
$('sheet').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;audio.unlock();audio.play('ui');const act=b.dataset.action;
 if(b.dataset.difficulty){progress.settings.difficulty=b.dataset.difficulty;store();duelDialog();}
 if(b.dataset.challenge!==undefined)start('challenge',Number(b.dataset.challenge));
 if(b.dataset.setting){let key=b.dataset.setting;progress.settings[key]=!progress.settings[key];b.setAttribute('aria-checked',progress.settings[key]);applySettings();store();if(key==='haptics')audio.haptic();}
 if(act==='close')closeSheet();if(act==='begin-duel')start('duel');if(act==='menu')showMenu();if(act==='restart')start(game.mode,game.mode==='challenge'?game.challenge:0);if(act==='resume'){closeSheet();paused=false;audio.unlock();lastFrame=performance.now();accumulator=0;syncHUD();}if(act==='next-target'){practiceRound++;start('practice',practiceRound);}if(act==='next-challenge')start('challenge',game.challenge+1);
});
let dragging=false;
$('battle').addEventListener('pointerdown',e=>{if(!playing||paused||game.phase!=='aim'||game.turn!==0)return;dragging=true;$('battle').setPointerCapture(e.pointerId);aimDrag(e);});
function aimDrag(e){const p=renderer.worldPoint(e.clientX,e.clientY),u=game.units[0],dx=p.x-u.x,dy=u.y-p.y;if(dx>5&&dy>0)adjust('angle',Math.atan2(dy,dx)*180/Math.PI);}
$('battle').addEventListener('pointermove',e=>{if(dragging)aimDrag(e);});$('battle').addEventListener('pointerup',()=>dragging=false);$('battle').addEventListener('pointercancel',()=>dragging=false);
document.addEventListener('keydown',e=>{if(!$('modal').hidden){if(e.key==='Escape'&&paused){$('sheet').querySelector('[data-action="resume"]')?.click();}if(e.key==='Tab'){const items=[...$('sheet').querySelectorAll('button:not(:disabled),input')];if(!items.length)return;const a=items[0],z=items.at(-1);if(e.shiftKey&&(document.activeElement===a||document.activeElement===$('sheet'))){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}return;}if(!playing)return;if(e.key==='Escape'){pauseGame();return;}if(e.target instanceof HTMLInputElement)return;if(e.key==='ArrowLeft')adjust('angle',angle-1);if(e.key==='ArrowRight')adjust('angle',angle+1);if(e.key==='ArrowUp')adjust('power',power+1);if(e.key==='ArrowDown')adjust('power',power-1);});
function background(){if(playing&&!resultShown)pauseGame();audio.suspend();accumulator=0;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)background();else{lastFrame=performance.now();accumulator=0;}});window.addEventListener('pagehide',background);window.addEventListener('trajectoryPause',background);window.addEventListener('blur',()=>{if(playing&&$('modal').hidden)background();});
function frame(now){requestAnimationFrame(frame);if(document.hidden)return;const dt=Math.min(.05,Math.max(0,(now-(lastFrame||now))/1000));lastFrame=now;
 if(!playing){menuFrame+=dt;if(menuFrame<1/30)return;menuFrame=0;renderer.draw(game,{angle:42,power:65,weapon:'standard',motion:false,guide:false},dt);return;}
 if(!paused&&!resultShown){
  if(game.phase==='ai'){aiDelay+=dt;if(aiDelay>.65){const a=aimAI(game,game.difficulty,game.aiShots,game.seed);aiDelay=0;aiAngle=a.angle;game.beginAI();game.fire(a.angle,a.power,a.weapon);syncHUD();}}
  accumulator+=dt;while(accumulator>=DT){game.step();accumulator-=DT;for(const p of game.projectiles)if(p.owner===0){if(shotTrail.length<1200)shotTrail.push({x:p.x,y:p.y});}}
  const events=game.drainEvents();if(events.length){renderer.events(events,progress.settings.motion);for(const e of events){audio.play(e.type);if(e.type==='blast'){audio.haptic('blast');if(game.turn===0)lastTrail=[...shotTrail];}if(e.type==='miss'&&game.turn===0){lastTrail=[...shotTrail];toast('Beyond the field. Try less power or a higher arc.');}if(e.type==='damage')syncHUD();}syncHUD();}
  if(game.phase==='aim'||game.phase==='ai')syncHUD();if(game.phase==='result')result();audio.setFlight(game.phase==='flight');
 }
 renderer.draw(game,{angle,power,weapon,aiAngle,motion:progress.settings.motion,guide:progress.settings.guide,lastTrail},paused||resultShown?0:dt);
 if(toastUntil&&now>toastUntil){$('toast').hidden=true;toastUntil=0;}
}
applySettings();showMenu();requestAnimationFrame(frame);

})();
