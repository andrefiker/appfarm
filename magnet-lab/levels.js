(function(root){
const L=[
{name:'First attraction',tag:'BASICS',brief:'A negative magnet attracts the positive particle. Bend it into the collector.',magnets:[[190,205]],goal:[265,175],obstacles:[[292,273,25,95]],solution:[1]},
{name:'A gentle push',tag:'REPULSION',brief:'A positive magnet repels the particle. Use a push from below to clear the barrier.',magnets:[[30,375]],goal:[265,155],obstacles:[[150,275,24,90]],solution:[-1]},
{name:'Leave space',tag:'SELECTIVITY',brief:'More magnets are not always better. Try leaving one switched off.',magnets:[[165,205],[280,330]],goal:[241,125],obstacles:[[215,255,105,18]],solution:[1,0]},
{name:'Push and pull',tag:'TWO FIELDS',brief:'A push from below and a pull ahead make a useful pair.',magnets:[[30,380],[265,175]],goal:[332,138],obstacles:[[174,277,24,100]],solution:[-1,1]},
{name:'The return arc',tag:'TURNING',brief:'The collector is above the emitter. Curve around the end of the barrier.',magnets:[[135,185],[280,240]],goal:[128,122],obstacles:[[195,252,130,18]],solution:[1,-1]},
{name:'Upper passage',tag:'CLEARANCE',brief:'Use the field preview to thread the upper passage.',magnets:[[30,375],[265,205]],goal:[317,176],obstacles:[[145,278,28,90],[210,75,18,85]],solution:[-1,1]},
{name:'Long reach',tag:'RESTRAINT',brief:'A distant pull can be enough. The hot zone ends a run on contact.',magnets:[[120,240],[250,170]],goal:[329,190],obstacles:[[180,320,20,65]],hazards:[[270,315,21]],solution:[0,1]},
{name:'Quiet third',tag:'THREE MAGNETS',brief:'Choose each field with care. An idle magnet is sometimes the key.',magnets:[[30,380],[235,160],[280,330]],goal:[299,60],obstacles:[[151,278,26,100]],hazards:[[230,310,23]],solution:[-1,1,0]},
{name:'Narrow ascent',tag:'CONTROL',brief:'Rise through the central channel. Keep the right side quiet.',magnets:[[150,180],[230,340],[305,185]],goal:[156,96],obstacles:[[198,240,120,20],[45,120,55,18]],solution:[1,-1,0]},
{name:'Side pressure',tag:'BALANCE',brief:'Repulsion on two sides lifts the particle into a steep arc.',magnets:[[30,375],[225,150],[300,310]],goal:[250,100],obstacles:[[190,260,125,22]],hazards:[[90,155,20]],solution:[-1,0,-1]},
{name:'Curl inward',tag:'PRECISION',brief:'Pull up, then let the far field tighten the curve.',magnets:[[125,205],[240,180],[285,335]],goal:[135,88],obstacles:[[190,250,120,22]],hazards:[[55,170,19]],solution:[1,0,-1]},
{name:'Perfect alignment',tag:'FINAL CHAMBER',brief:'Three fields, one clean arc. Bring everything you learned together.',magnets:[[30,380],[230,165],[305,290]],goal:[327,45],obstacles:[[145,280,30,90],[220,230,95,18]],hazards:[[160,110,22]],solution:[-1,1,-1]}
];
root.MagnetLevels=L.map((l,i)=>({...l,id:i+1,start:{x:32,y:310,vx:112,vy:0},goal:{x:l.goal[0],y:l.goal[1]},magnets:l.magnets.map(([x,y],j)=>({x,y,label:String.fromCharCode(65+j)})),obstacles:l.obstacles.map(([x,y,w,h])=>({x,y,w,h})),hazards:(l.hazards||[]).map(([x,y,r])=>({x,y,r}))}));
if(typeof module!=='undefined')module.exports=root.MagnetLevels;
})(typeof window!=='undefined'?window:globalThis);
