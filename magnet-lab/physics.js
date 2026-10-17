(function(root){
'use strict';
const DT=1/120,R=7,W=360,H=420;
function begin(level){return {x:level.start.x,y:level.start.y,vx:level.start.vx,vy:level.start.vy,t:0,status:'running',trail:[]};}
function step(s,l,modes,dt=DT){
if(s.status!=='running')return s;
let ax=0,ay=0;
l.magnets.forEach((m,i)=>{let mode=modes[i]||0;if(!mode)return;let dx=m.x-s.x,dy=m.y-s.y,d=Math.hypot(dx,dy),f=Math.min(280,1700000/(d*d+1700))*mode;ax+=dx/Math.max(d,1)*f;ay+=dy/Math.max(d,1)*f;});
let a=Math.hypot(ax,ay);if(a>400){ax*=400/a;ay*=400/a;}
s.vx+=ax*dt;s.vy+=ay*dt;let v=Math.hypot(s.vx,s.vy);if(v>225){s.vx*=225/v;s.vy*=225/v;}s.x+=s.vx*dt;s.y+=s.vy*dt;s.t+=dt;
if(Math.hypot(s.x-l.goal.x,s.y-l.goal.y)<19){s.status='won';return s;}
if(s.x<R||s.x>W-R||s.y<R||s.y>H-R||s.t>14){s.status='lost';s.reason=s.t>14?'Signal timed out':'Particle left the chamber';return s;}
for(const o of l.obstacles||[]){if(s.x>o.x-R&&s.x<o.x+o.w+R&&s.y>o.y-R&&s.y<o.y+o.h+R){s.status='lost';s.reason='Particle hit a barrier';return s;}}
for(const o of l.hazards||[]){if(Math.hypot(s.x-o.x,s.y-o.y)<o.r+R){s.status='lost';s.reason='Particle entered a hot zone';return s;}}
return s;
}
function simulate(l,modes,limit=1800){let s=begin(l),points=[];for(let i=0;i<limit&&s.status==='running';i++){step(s,l,modes);if(i%8===0)points.push({x:s.x,y:s.y});}return {...s,points};}
const api={DT,R,W,H,begin,step,simulate};if(typeof module!=='undefined')module.exports=api;root.MagnetPhysics=api;
})(typeof window!=='undefined'?window:globalThis);
