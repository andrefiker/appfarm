export const DT=1/120;
export const LAYOUTS=[[1,2,3,4,5,6,7,8,9,10],[10],[7],[6,10],[7,10],[2,4,5],[3,6,10],[1,5],[4,6],[2,3]];
export function rack(ids=LAYOUTS[0]){let id=1,out=[];for(let row=0;row<4;row++)for(let c=0;c<=row;c++,id++)if(ids.includes(id))out.push({id,x:(c-row/2)*.305,y:17.1+row*.264,vx:0,vy:0,r:.061,m:1.53,angle:0,omega:0,tilt:0,down:false,impulse:0});return out;}
export function release(x,angle,power,spin){power=Math.max(0,Math.min(1,power));const speed=3.8+power*7.8;return {x:Math.max(-.45,Math.min(.45,x)),y:.3,vx:Math.sin(angle)*speed,vy:Math.cos(angle)*speed,r:.108,m:6.8,spin:Math.max(-1,Math.min(1,spin)),gutter:false,angle:0};}
export function createWorld(ids,ball){return {pins:rack(ids),ball,time:0,quiet:0,done:false,hits:[]};}
function hit(a,b,w){let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy),rad=a.r+b.r;if(dist>=rad)return;let nx=dist?dx/dist:1,ny=dist?dy/dist:0;const inv=1/a.m+1/b.m,over=rad-dist;a.x-=nx*over/(a.m*inv);a.y-=ny*over/(a.m*inv);b.x+=nx*over/(b.m*inv);b.y+=ny*over/(b.m*inv);const vn=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(vn>=0)return;const j=-(1+.42)*vn/inv;a.vx-=j*nx/a.m;a.vy-=j*ny/a.m;b.vx+=j*nx/b.m;b.vy+=j*ny/b.m;for(const [p,s]of [[a,-1],[b,1]])if(p.id){p.impulse+=j;p.omega+=s*j*.36*(nx+ny*.5);p.tilt+=j*.16;}w.hits.push(Math.min(1,j/5));}
export function step(w,dt=DT){if(w.done)return;w.time+=dt;w.hits=[];const b=w.ball;
 if(!b.gutter&&Math.abs(b.x)>.533){b.gutter=true;b.vx=0;b.spin=0;b.x=Math.sign(b.x)*.635;}
 if(!b.gutter){b.vx+=b.spin*.14*Math.min(1,b.y/10)*dt;b.spin*=Math.exp(-.025*dt);const v=Math.hypot(b.vx,b.vy),d=Math.max(0,1-.13*dt/Math.max(v,.01));b.vx*=d;b.vy*=d;}
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=Math.hypot(b.vx,b.vy)*dt/b.r;
 for(const p of w.pins){p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.omega*dt;p.omega*=Math.exp(-1.8*dt);p.vx*=Math.exp(-.95*dt);p.vy*=Math.exp(-.95*dt);
 if(p.tilt>.3){p.tilt+=Math.sin(Math.min(1.56,p.tilt))*5*dt;}else p.tilt*=Math.exp(-2*dt);
 if(p.tilt>=.8){p.down=true;p.tilt=Math.min(1.57,p.tilt);p.r=.10;}
 if(Math.abs(p.x)>.63||p.y>18.65){p.down=true;p.tilt=1.57;}
 if(Math.abs(p.x)>1.1){p.x=Math.sign(p.x)*1.1;p.vx*=-.25;}if(p.y>19.1){p.y=19.1;p.vy*=-.2;}
 }
 if(!b.gutter)for(const p of w.pins)hit(b,p,w);
 for(let i=0;i<w.pins.length;i++)for(let j=i+1;j<w.pins.length;j++)hit(w.pins[i],w.pins[j],w);
 const motion=w.pins.some(p=>Math.hypot(p.vx,p.vy)>.045||Math.abs(p.omega)>.1||p.tilt>.3&&p.tilt<1.5);
 if((b.y>19||Math.hypot(b.vx,b.vy)<.15)&&!motion)w.quiet+=dt;else w.quiet=0;
 if(w.quiet>.65||w.time>10)w.done=true;
}
export function simulate(x=0,a=0,p=.8,s=0,ids=LAYOUTS[0]){const w=createWorld(ids,release(x,a,p,s));while(!w.done)step(w);return w;}
export function standing(w){return w.pins.filter(p=>!p.down).map(p=>p.id);}
export function isSplit(ids){if(ids.includes(1)||ids.length<2)return false;const pp=rack(ids);return pp.some(a=>pp.every(b=>a===b||Math.hypot(a.x-b.x,a.y-b.y)>.44));}
// Shared projection and inverse input mapping keep touch aiming in lane units.
export function projectLane(x,y,w,h){const t=Math.max(0,Math.min(1,y/19.5)),s=(1-t*.61)*w*.64;return {x:w/2+x*s,y:h*.92-t*(h*.92-Math.max(100,h*.28)),s};}
export function unprojectLane(x,y,w,h){const depth=(h*.92-y)/(h*.92-Math.max(100,h*.28))*19.5;return {x:(x-w/2)/((1-depth/19.5*.61)*w*.64),y:depth};}
export function screenPosition(x,w){return Math.max(-.45,Math.min(.45,(x-w/2)/projectLane(0,.3,w,500).s));}
export function gestureDelivery(start,end,w,h){const dy=start.y-end.y,a=unprojectLane(start.x,start.y,w,h),b=unprojectLane(end.x,end.y,w,h);return {power:Math.max(0,Math.min(1,.15+dy/h*1.2+dy/Math.max(80,end.t-start.t)*.16)),angle:Math.max(-.09,Math.min(.09,Math.atan2(b.x-a.x,b.y-a.y)))};}
