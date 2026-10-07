(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.QuietATCEngine=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  const DEG=Math.PI/180;
  const RUNWAY={
    y:0.62,
    x1:0.23,
    x2:0.79,
    halfWidth:0.045,
    leftGate:{x:0.18,y:0.62},
    rightGate:{x:0.84,y:0.62},
    captureRadius:0.145
  };
  const HELIPAD={x:0.77,y:0.82,r:0.050,captureRadius:0.145};

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const normHeading=d=>((d%360)+360)%360;
  const signedHeadingDelta=(from,to)=>((to-from+540)%360)-180;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

  function seeded(seed){
    let s=(seed>>>0)||0x6d2b79f5;
    return function(){s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
  }

  function headingTo(a,b){
    return normHeading(Math.atan2(b.x-a.x,-(b.y-a.y))/DEG);
  }

  function stepHeading(current,target,maxTurn){
    const d=signedHeadingDelta(current,target);
    return normHeading(current+clamp(d,-maxTurn,maxTurn));
  }

  function simplifyPoints(points,minGap=0.022){
    const out=[];
    for(const p of points||[]){
      if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)) continue;
      const q={x:clamp(p.x,-0.05,1.05),y:clamp(p.y,-0.05,1.05)};
      if(!out.length||distance(out[out.length-1],q)>=minGap) out.push(q);
    }
    return out;
  }

  function resolveRoute(type,points){
    const route=simplifyPoints(points);
    if(!route.length) return {route:[],landing:false,destination:null};
    const last=route[route.length-1];

    if(type==='heli'&&distance(last,HELIPAD)<=HELIPAD.captureRadius){
      route.push({x:HELIPAD.x,y:HELIPAD.y});
      return {route,landing:true,destination:'helipad'};
    }

    if(type==='plane'){
      const dl=distance(last,RUNWAY.leftGate),dr=distance(last,RUNWAY.rightGate);
      if(Math.min(dl,dr)<=RUNWAY.captureRadius){
        if(dl<=dr){
          route.push(
            {x:RUNWAY.leftGate.x,y:RUNWAY.y},
            {x:RUNWAY.x1+0.06,y:RUNWAY.y},
            {x:0.51,y:RUNWAY.y},
            {x:RUNWAY.x2-0.04,y:RUNWAY.y}
          );
          return {route,landing:true,destination:'runway-east'};
        } else {
          route.push(
            {x:RUNWAY.rightGate.x,y:RUNWAY.y},
            {x:RUNWAY.x2-0.06,y:RUNWAY.y},
            {x:0.51,y:RUNWAY.y},
            {x:RUNWAY.x1+0.04,y:RUNWAY.y}
          );
          return {route,landing:true,destination:'runway-west'};
        }
      }
    }

    return {route,landing:false,destination:null};
  }

  function classifyConflict(a,b){
    const d=distance(a,b);
    if(d<0.028) return 'collision';
    if(d<0.072) return 'warning';
    return 'clear';
  }

  function createAircraft(spec){
    return {
      id:spec.id,
      callsign:spec.callsign,
      type:spec.type||'plane',
      x:spec.x,
      y:spec.y,
      heading:normHeading(spec.heading||0),
      speed:spec.speed??(spec.type==='heli'?0.034:0.052),
      route:[],
      routeIndex:0,
      landing:false,
      destination:null,
      warning:false,
      selected:false,
      age:0,
      completed:false,
      palette:spec.palette||0
    };
  }

  function trimRouteStart(route,a,minDistance=0.095){
    const out=(route||[]).map(p=>({x:p.x,y:p.y}));
    while(out.length>1&&distance(a,out[0])<minDistance) out.shift();
    return out;
  }

  function assignPath(game,id,points){
    const a=game.aircraft.find(x=>x.id===id);
    if(!a) return false;
    const resolved=resolveRoute(a.type,points);
    if(!resolved.route.length) return false;
    const trimmed=trimRouteStart(resolved.route,a);
    a.route=trimmed.length?trimmed:resolved.route.slice(-1);
    a.routeIndex=0;
    a.landing=resolved.landing;
    a.destination=resolved.destination;
    game.selectedId=id;
    for(const x of game.aircraft) x.selected=x.id===id;
    return true;
  }

  function moveAircraft(a,dt){
    let target=null;
    if(a.routeIndex<a.route.length) target=a.route[a.routeIndex];

    if(target){
      const desired=headingTo(a,target);
      const turnRate=a.type==='heli'?230:170;
      a.heading=stepHeading(a.heading,desired,turnRate*dt);
      const step=a.speed*dt*(a.landing?0.92:1);
      const r=a.heading*DEG;
      a.x+=Math.sin(r)*step;
      a.y-=Math.cos(r)*step;
      const capture=Math.max(0.020,a.speed*dt*2.6);
      if(distance(a,target)<=capture){
        a.x=target.x;a.y=target.y;a.routeIndex++;
        if(a.routeIndex>=a.route.length&&a.landing) a.completed=true;
      }
    }else{
      const r=a.heading*DEG;
      a.x+=Math.sin(r)*a.speed*dt;
      a.y-=Math.cos(r)*a.speed*dt;
    }
    a.age+=dt;
    return a;
  }

  function trafficLevel(elapsed,landed){
    if(elapsed<35&&landed<4) return 1;
    if(elapsed<80&&landed<10) return 2;
    if(elapsed<145&&landed<20) return 3;
    if(elapsed<220&&landed<34) return 4;
    return 5;
  }

  function spawnInterval(level){return [0,6.2,5.3,4.6,4.0,3.5][clamp(level,1,5)];}

  function callsign(rng,type){
    const p=type==='heli'?['H','R','M']:['A','B','Q','S','T'];
    return p[Math.floor(rng()*p.length)]+(10+Math.floor(rng()*90));
  }

  function spawnCandidate(rng,id,level){
    const type=rng()<0.18?'heli':'plane';
    const side=Math.floor(rng()*4);
    let x,y,heading;
    if(side===0){x=-0.035;y=0.08+rng()*0.78;heading=70+rng()*40;}
    else if(side===1){x=1.035;y=0.08+rng()*0.78;heading=250+rng()*40;}
    else if(side===2){x=0.08+rng()*0.84;y=-0.035;heading=145+rng()*70;}
    else{x=0.08+rng()*0.84;y=1.035;heading=325+rng()*70;}
    const base=type==='heli'?0.030:0.046;
    return createAircraft({
      id,callsign:callsign(rng,type),type,x,y,heading,
      speed:base+level*(type==='heli'?0.0007:0.0013)+rng()*0.005,
      palette:Math.floor(rng()*4)
    });
  }

  function safeSpawn(existing,c){
    return existing.every(a=>distance(a,c)>0.17);
  }

  function makeGame(seed){
    return {
      seed:seed||Date.now(),
      rng:seeded(seed||Date.now()),
      aircraft:[],
      nextId:1,
      elapsed:0,
      score:0,
      landed:0,
      missed:0,
      level:1,
      selectedId:null,
      gameOver:false,
      spawnClock:1.3,
      lastEvent:'DRAW A PATH TO LAND',
      combo:0
    };
  }

  function trySpawn(game){
    for(let i=0;i<10;i++){
      const c=spawnCandidate(game.rng,game.nextId,game.level);
      if(safeSpawn(game.aircraft,c)){
        game.aircraft.push(c);game.nextId++;
        game.lastEvent=c.type==='heli'?c.callsign+' → HELIPAD':c.callsign+' → RUNWAY';
        return c;
      }
    }
    return null;
  }

  function updateGame(game,dt){
    if(game.gameOver) return game;
    dt=clamp(dt,0,0.08);
    game.elapsed+=dt;
    game.level=trafficLevel(game.elapsed,game.landed);
    game.spawnClock-=dt;
    if(game.spawnClock<=0){
      trySpawn(game);
      game.spawnClock+=spawnInterval(game.level)*(0.84+game.rng()*0.30);
    }

    for(const a of game.aircraft){a.warning=false;moveAircraft(a,dt);}

    for(let i=0;i<game.aircraft.length;i++){
      for(let j=i+1;j<game.aircraft.length;j++){
        const a=game.aircraft[i],b=game.aircraft[j],c=classifyConflict(a,b);
        if(c==='collision'){
          a.warning=b.warning=true;
          game.gameOver=true;
          game.lastEvent='COLLISION — '+a.callsign+' / '+b.callsign;
        }else if(c==='warning'){
          a.warning=b.warning=true;
        }
      }
    }

    const keep=[];
    for(const a of game.aircraft){
      if(a.completed){
        game.landed++;
        game.combo++;
        game.score+=100+game.level*15+Math.min(100,game.combo*5);
        game.lastEvent=a.callsign+' LANDED  +'+(100+game.level*15+Math.min(100,game.combo*5));
        continue;
      }
      const outside=a.x<-0.09||a.x>1.09||a.y<-0.09||a.y>1.09;
      if(outside){
        game.missed++;
        game.combo=0;
        game.lastEvent=a.callsign+' MISSED  '+game.missed+'/3';
        if(game.missed>=3) game.gameOver=true;
        continue;
      }
      keep.push(a);
    }
    game.aircraft=keep;
    if(game.selectedId&&!game.aircraft.some(a=>a.id===game.selectedId)) game.selectedId=null;
    return game;
  }

  return {
    RUNWAY,HELIPAD,clamp,normHeading,signedHeadingDelta,distance,seeded,headingTo,stepHeading,
    simplifyPoints,resolveRoute,trimRouteStart,classifyConflict,createAircraft,assignPath,moveAircraft,
    trafficLevel,spawnInterval,spawnCandidate,safeSpawn,makeGame,trySpawn,updateGame
  };
});