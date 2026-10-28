/* Tower Stack 1.0.0 — deterministic fixed-step Matter.js simulation. */
(function(root,factory){if(typeof module==='object')module.exports=factory(require('../vendor/matter.min.js'));else root.Tower=factory(root.Matter)})(typeof window==='object'?window:this,function(M){
'use strict';
const DT=1000/60, MODES=['endless','precision','time','zen','sandbox'];
class Game{
 constructor(mode='endless',seed=Date.now()>>>0){
 this.mode=MODES.includes(mode)?mode:'endless';this.seed=seed>>>0;this.rng=this.seed;this.tick=0;this.log=[];this.blocks=[];this.score=0;this.placed=0;this.combo=0;this.maxHeight=0;this.phase='ready';this.still=0;this.wait=0;this.failTicks=0;this.lost=0;this.paused=false;this.reason='';this.events=[];
 this.engine=M.Engine.create({enableSleeping:false,positionIterations:20,velocityIterations:8,constraintIterations:4});this.engine.gravity.y=1;this.engine.gravity.scale=.001;
 this.ground=M.Bodies.rectangle(200,630,240,60,{isStatic:true,friction:.8,restitution:.03});M.Composite.add(this.engine.world,this.ground);this.next=this.generate();
 }
 random(){this.rng=(Math.imul(1664525,this.rng)+1013904223)>>>0;return this.rng/4294967296}
 generate(){let level=Math.min(1,this.placed/60),r=this.random(),w=100,h=28,material='wood',shape='box';if(this.mode==='endless'||this.mode==='time'){w=70+this.random()*60-25*level;h=24+this.random()*10;if(this.placed>6&&r<.23)shape='trapezoid';if(this.placed>9&&r>.7)material=r>.88?'ice':'stone'}return {w,h,material,shape,color:Math.floor(this.random()*6)}}
 make(c,x,y,angle=0){let props={friction:c.material==='ice'?.23:.75,frictionStatic:1.2,frictionAir:.008,restitution:.035,density:c.material==='stone'?.003:.0012,slop:.025,sleepThreshold:90};let b=c.shape==='trapezoid'?M.Bodies.trapezoid(x,y,c.w,c.h,.22,props):M.Bodies.rectangle(x,y,c.w,c.h,props);M.Body.setAngle(b,angle);b.game={...c,scored:false,lost:false};return b}
 get top(){let ys=this.blocks.filter(b=>b.game.scored&&!b.game.lost&&b.position.y<620).map(b=>b.bounds.min.y);return Math.min(600,...ys)}
 get height(){return Math.max(0,(600-this.top)/28)}
 get spawnY(){return this.top-115}
 drop(x,angle=0){if(this.phase!=='ready'||this.paused)return false;x=Math.max(25,Math.min(375,Number(x)||200));angle=Math.max(-Math.PI/3,Math.min(Math.PI/3,Number(angle)||0));this.log.push({tick:this.tick,x,angle,config:{...this.next}});let b=this.make(this.next,x,this.spawnY,angle);this.blocks.push(b);M.Composite.add(this.engine.world,b);this.active=b;this.phase='falling';this.wait=0;this.still=0;return true}
 stable(){return this.blocks.filter(b=>!b.game.lost).every(b=>b.isSleeping||(b.speed<.12&&Math.abs(b.angularVelocity)<.004))}
 finish(reason){if(this.phase==='over')return;this.phase='over';this.reason=reason;this.events.push('over')}
 step(){if(this.paused||this.phase==='over')return;this.tick++;for(let b of this.blocks)if(!b.game.lost)b.previousPose={x:b.position.x,y:b.position.y,angle:b.angle};M.Engine.update(this.engine,DT);for(let b of this.blocks){if(!Number.isFinite(b.position.x+b.position.y+b.angle))throw Error('Non-finite physics');if(!b.game.lost&&(b.position.y>700||Math.abs(b.position.x-200)>900)){b.game.lost=true;this.lost++;this.events.push('lost');M.Composite.remove(this.engine.world,b)}}
 if(this.phase==='falling'){
 this.wait++;this.still=this.stable()?this.still+1:0;
 if(this.active.game.lost){this.combo=0;if(this.mode!=='sandbox'&&this.mode!=='zen'){this.finish('Block missed the platform')}else this.ready()}
 else if(this.still>=36){this.settle();this.ready()}
 else if(this.wait>600){this.combo=0;this.settle();this.ready()}
 }
 let live=this.blocks.filter(b=>b.game.scored&&!b.game.lost);let fallen=this.blocks.filter(b=>b.game.scored&&b.game.lost).length;
 if(this.mode!=='zen'&&this.mode!=='sandbox'&&this.placed>=3){this.failTicks=(fallen>=Math.max(2,Math.ceil(this.placed*.4))||this.height< this.maxHeight*.38)?this.failTicks+1:0;if(this.failTicks>90)this.finish('Tower collapsed')}
 if(this.mode==='time'&&this.tick>=10800)this.finish('Three minutes complete');
 }
 settle(){let b=this.active;if(b.game.scored||b.game.lost)return;let stable=this.still>=36;b.game.scored=true;this.placed++;this.combo=stable?this.combo+1:0;let below=this.blocks.filter(v=>v!==b&&!v.game.lost&&v.bounds.min.y>b.bounds.min.y);let support=below.sort((a,c)=>a.bounds.min.y-c.bounds.min.y)[0]||this.ground;let alignment=Math.max(0,1-Math.abs(b.position.x-support.position.x)/50);let precision=Math.round(alignment*(this.mode==='precision'?100:30));this.score+=100+Math.floor(this.height)*10+(stable?25:0)+Math.min(this.combo,10)*5+precision;this.maxHeight=Math.max(this.maxHeight,this.height);this.events.push('settled')}
 ready(){if(this.phase==='over')return;this.phase='ready';this.next=this.generate();this.active=null}
 save(){return {schema:1,mode:this.mode,seed:this.seed,tick:this.tick,log:this.log.map(e=>({...e}))}}
 static valid(s){return s&&s.schema===1&&MODES.includes(s.mode)&&Number.isInteger(s.seed)&&s.seed>=0&&s.seed<=4294967295&&Number.isInteger(s.tick)&&s.tick>=0&&s.tick<=10000000&&Array.isArray(s.log)&&s.log.length<=20000&&s.log.every((e,i)=>Number.isInteger(e.tick)&&e.tick>=0&&e.tick<=s.tick&&(!i||e.tick>s.log[i-1].tick)&&Number.isFinite(e.x)&&e.x>=25&&e.x<=375&&Number.isFinite(e.angle)&&Math.abs(e.angle)<=Math.PI/3&&(!e.config||(Number.isFinite(e.config.w)&&e.config.w>=20&&e.config.w<=180&&Number.isFinite(e.config.h)&&e.config.h>=15&&e.config.h<=60&&['wood','stone','ice'].includes(e.config.material)&&['box','trapezoid'].includes(e.config.shape)&&Number.isInteger(e.config.color)&&e.config.color>=0&&e.config.color<=5)))}
 static restore(s){if(!Game.valid(s))throw Error('Invalid save');let g=new Game(s.mode,s.seed),i=0;while(g.tick<s.tick){if(s.log[i]?.tick===g.tick){if(s.log[i].config)g.next={...s.log[i].config};if(!g.drop(s.log[i].x,s.log[i].angle))throw Error('Invalid replay');i++}let t=g.tick;g.step();if(t===g.tick)throw Error('Replay ended early')}if(s.log[i]?.tick===g.tick){if(s.log[i].config)g.next={...s.log[i].config};g.drop(s.log[i].x,s.log[i].angle);}return g}
}
const defaultStats=()=>({bestScore:0,highest:0,blocks:0,longest:0,sessions:0});
function record(stats,g,previous={blocks:0}){stats={...defaultStats(),...stats};stats.bestScore=Math.max(stats.bestScore,g.score);stats.highest=Math.max(stats.highest,g.maxHeight);stats.longest=Math.max(stats.longest,g.tick/60);stats.blocks+=Math.max(0,g.placed-(previous.blocks||0));return stats}
return {Game,M,DT,MODES,defaultStats,record};
});
