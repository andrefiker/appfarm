// Stable IDs are part of save schema 1. Temperatures are game heat units, not °C.
export const M = Object.freeze({AIR:0,SAND:1,WATER:2,STONE:3,WOOD:4,FIRE:5,SMOKE:6,LAVA:7,STEAM:8,OIL:9,PLANT:10});
export const materials = [
 ['Air','#0b121e',0,'Empty space.'],['Sand','#efd18a',5,'Falls, piles up and sinks through liquids.'],
 ['Water','#438ff2',3,'Flows, sinks below oil, extinguishes fire; boils above 100 heat.'],
 ['Stone','#7d8fa6',10,'Immobile barrier. Conducts heat. Lava solidifies into stone.'],
 ['Wood','#ba8051',10,'Immobile fuel. Ignites above 220 heat or beside fire.'],
 ['Fire','#ffb547',0,'Heats and ignites fuel. Expires into smoke or air. Water extinguishes it.'],
 ['Smoke','#8993a9',0.1,'Rises, drifts and dissipates.'],['Lava','#ff633b',4,'Slow liquid, sustains 1100 heat; water turns it to stone and steam.'],
 ['Steam','#bfdfed',0.05,'Rises and cools. Condenses below 90 heat after 60 ticks.'],
 ['Oil','#c0aa47',2,'Floats on water. Ignites above 160 heat.'],['Plant','#64cf92',10,'Uses adjacent water to grow into it near open air. Burns above 180 heat.']
].map(([name,color,density,guide],id)=>({id,name,color,density,guide}));
const liquid = m => m===2 || m===7 || m===9;
const gas = m => m===5 || m===6 || m===8;
const fuel = m => m===4 || m===9 || m===10;
export const MAX_CELLS=131072;
export class World {
 constructor(w=160,h=240,seed=1731) {
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||w>512||h>512||w*h>MAX_CELLS)throw Error('World size must be 8–512 per side, at most 131072 cells.');
  this.w=w;this.h=h;this.seed=seed>>>0||1;this.tick=0;
  this.cells=new Uint8Array(w*h);this.temp=new Float32Array(w*h).fill(20);this.life=new Uint16Array(w*h);this.updated=new Uint32Array(w*h);this.heat=new Float32Array(w*h);this.neighbors=new Int32Array(4);
 }
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
 index(x,y){return x>=0&&x<this.w&&y>=0&&y<this.h?y*this.w+x:-1;}
 put(x,y,m,t){const i=this.index(x,y);if(i<0)return false;if(!Number.isInteger(m)||m<0||m>10)throw Error('Unknown material');this.set(i,m,t);return true;}
 set(i,m,t){this.cells[i]=m;this.temp[i]=t??(m===7?1100:m===5?650:m===8?150:20);this.life[i]=m===5?55:m===6?220:m===8?0:0;this.updated[i]=this.tick;}
 swap(a,b){let q=this.cells[a];this.cells[a]=this.cells[b];this.cells[b]=q;q=this.temp[a];this.temp[a]=this.temp[b];this.temp[b]=q;q=this.life[a];this.life[a]=this.life[b];this.life[b]=q;this.updated[a]=this.updated[b]=this.tick;}
 count(){const c=new Uint32Array(11);for(const m of this.cells)c[m]++;return c;}
 clear(){this.cells.fill(0);this.temp.fill(20);this.life.fill(0);this.updated.fill(0);this.tick=0;}
 step(){
  this.tick++;if(this.tick>=0xffffffff){this.tick=1;this.updated.fill(0);}
  const {w,h,cells:c,temp:t,life:l}=this,n=c.length;
  // Conservative pair exchange; read old heat, apply simultaneously. Air is insulating.
  this.heat.fill(0);
  for(let i=0;i<n;i++){
   if(!c[i])continue;
   for(let d=0;d<2;d++){const j=d?i+w:(i%w<w-1?i+1:n);if(j>=n||!c[j])continue;const q=(t[j]-t[i])*.035;this.heat[i]+=q;this.heat[j]-=q;}
  }
  for(let i=0;i<n;i++)t[i]=Math.max(-100,Math.min(1500,(t[i]+this.heat[i]-20)*.998+20));
  const direction=this.random()<.5?1:-1;
  for(let y=h-1;y>=0;y--)for(let k=0;k<w;k++){
   const x=direction===1?k:w-1-k,i=y*w+x,m=c[i];if(!m||this.updated[i]===this.tick)continue;
   const ns=this.neighbors;ns[0]=this.index(x,y-1);ns[1]=this.index(x+1,y);ns[2]=this.index(x,y+1);ns[3]=this.index(x-1,y);
   let reacted=false;
   if(m===7){t[i]=1100;for(const j of ns)if(c[j]===2){this.set(i,3,450);this.set(j,8,180);reacted=true;break;}}
   if(reacted)continue;
   if(m===5){
    const wet=ns.find(j=>c[j]===2);
    if(wet!==undefined){this.set(i,0);t[wet]=Math.min(99,t[wet]+15);continue;}
    t[i]=650;
    for(const j of ns)if(fuel(c[j])&&this.random()<.22){const old=c[j];this.set(j,5);l[j]=old===4?160:old===9?100:80;}
    if(l[i]>0)l[i]--;if(!l[i]){this.set(i,this.random()<.8?6:0,100);continue;}
   }
   if(fuel(m)&&t[i]>(m===4?220:m===9?160:180)){this.set(i,5);l[i]=m===4?160:100;continue;}
   if(m===2&&t[i]>100){this.set(i,8,Math.max(130,t[i]));continue;}
   if(m===8){l[i]=Math.min(65535,l[i]+1);if(l[i]>60&&t[i]<90){this.set(i,2,t[i]);continue;}}
   if(m===6){if(l[i]>0)l[i]--;if(!l[i]){this.set(i,0);continue;}}
   if(m===10 && this.tick%12===0 && this.random()<.3){
    const water=ns.find(j=>c[j]===2);
    if(water!==undefined && ((water%w>0&&c[water-1]===0)||(water%w<w-1&&c[water+1]===0)||(water>=w&&c[water-w]===0)||(water+w<n&&c[water+w]===0))){this.set(water,10,20);continue;}
   }
   if(m===3||m===4||m===10)continue;
   if(m===7&&this.tick%4!==0)continue;
   const s=this.random()<.5?1:-1, dy=gas(m)?-1:1;
   let moved=false;
   for(let attempt=0;attempt<(liquid(m)||gas(m)?5:3);attempt++){
    const xx=attempt===0?x:attempt===1||attempt===3?x+s:x-s;
    const yy=attempt<3?y+dy:y,j=this.index(xx,yy);
    if(j>=0&&(c[j]===0||(!gas(m)&&materials[m].density>materials[c[j]].density&&(liquid(c[j])||gas(c[j]))))){this.swap(i,j);moved=true;break;}
   }
   if(!moved)this.updated[i]=this.tick;
  }
 }
 snapshot(){return {schema:1,w:this.w,h:this.h,seed:this.seed,tick:this.tick,cells:Array.from(this.cells),temp:Array.from(this.temp),life:Array.from(this.life)};}
 static restore(s){
  if(!s||s.schema!==1)throw Error('Unsupported world format');const v=new World(s.w,s.h,s.seed),n=v.cells.length;
  if(!Number.isInteger(s.seed)||s.seed<1||s.seed>0xffffffff||!Number.isInteger(s.tick)||s.tick<0||s.tick>=0xffffffff)throw Error('Invalid clock or seed');
  for(const key of ['cells','temp','life'])if(!Array.isArray(s[key])||s[key].length!==n)throw Error('Invalid grid data');
  for(let i=0;i<n;i++)if(!Number.isInteger(s.cells[i])||s.cells[i]<0||s.cells[i]>10||!Number.isFinite(s.temp[i])||s.temp[i]<-100||s.temp[i]>1500||!Number.isInteger(s.life[i])||s.life[i]<0||s.life[i]>65535)throw Error('Invalid cell value');
  v.cells.set(s.cells);v.temp.set(s.temp);v.life.set(s.life);v.tick=s.tick;return v;
 }
}
export function brush(v,tool,m,x0,y0,x1=x0,y1=y0,r=3){
 for(const n of [x0,y0,x1,y1,r])if(!Number.isFinite(n))throw Error('Invalid brush');
 x0=Math.round(Math.max(0,Math.min(v.w-1,x0)));x1=Math.round(Math.max(0,Math.min(v.w-1,x1)));y0=Math.round(Math.max(0,Math.min(v.h-1,y0)));y1=Math.round(Math.max(0,Math.min(v.h-1,y1)));r=Math.round(Math.max(0,Math.min(24,r)));
 const paint=(x,y)=>{if(tool==='erase'||m===0||v.cells[v.index(x,y)]===0)v.put(x,y,tool==='erase'?0:m);};
 if(tool==='fill'){
  const start=v.index(x0,y0),target=v.cells[start];if(target===m)return;
  const stack=[start],seen=new Uint8Array(v.cells.length);seen[start]=1;
  while(stack.length){const i=stack.pop();v.set(i,m);const x=i%v.w,y=Math.floor(i/v.w);for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const j=v.index(xx,yy);if(j>=0&&!seen[j]&&v.cells[j]===target){seen[j]=1;stack.push(j);}}}return;
 }
 if(tool==='rectangle'){for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)if(x===x0||x===x1||y===y0||y===y1)paint(x,y);return;}
 const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0),1);
 for(let k=0;k<=steps;k++){const x=Math.round(x0+(x1-x0)*k/steps),y=Math.round(y0+(y1-y0)*k/steps);if(tool==='point'){paint(x,y);continue;}for(let yy=-r;yy<=r;yy++)for(let xx=-r;xx<=r;xx++)if(xx*xx+yy*yy<=r*r)paint(x+xx,y+yy);}
}
export class Clock {
 constructor(){this.speed=1;this.paused=false;this.acc=0;}
 advance(ms,v){if(this.paused){this.acc=0;return 0;}this.acc+=Math.min(Math.max(ms,0),100)*this.speed;let steps=0;while(this.acc+1e-8>=1000/30&&steps<6){v.step();this.acc-=1000/30;steps++;}this.acc=Math.min(this.acc,1000/30);return steps;}
}
export function encodeWorld(world,settings={}){return JSON.stringify({format:'sand-lab',version:1,world:world.snapshot(),settings});}
export function decodeWorld(text){if(typeof text!=='string'||text.length>8_000_000)throw Error('File is too large (8 MB limit)');const s=JSON.parse(text);if(s.format!=='sand-lab'||s.version!==1)throw Error('Not a SAND LAB v1 world');const world=World.restore(s.world);return {world,settings:cleanSettings(s.settings)};}
export function cleanSettings(s={}){return {theme:['dark','pixel','soft'].includes(s?.theme)?s.theme:'dark',hand:s?.hand==='right'?'right':'left',speed:[.25,1,2].includes(s?.speed)?s.speed:1,paused:!!s?.paused,zoom:Number.isFinite(s?.zoom)?Math.max(1,Math.min(4,s.zoom)):1,panX:Number.isFinite(s?.panX)?Math.max(-512,Math.min(512,s.panX)):0,panY:Number.isFinite(s?.panY)?Math.max(-512,Math.min(512,s.panY)):0};}
