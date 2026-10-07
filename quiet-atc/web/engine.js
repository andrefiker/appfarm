(function(root, factory){
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.QuietATCEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
  'use strict';

  const DEG = Math.PI / 180;
  const RUNWAY = {
    threshold: { x: 0.50, y: 0.86 },
    farEnd: { x: 0.50, y: 0.67 },
    heading: 180,
    captureHalfWidth: 0.055,
    captureTop: 0.26,
    captureBottom: 0.80
  };

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const normHeading = d => ((d % 360) + 360) % 360;
  const signedHeadingDelta = (from,to) => ((to - from + 540) % 360) - 180;
  const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);

  function stepHeading(current,target,maxTurn){
    const delta = signedHeadingDelta(current,target);
    return normHeading(current + clamp(delta,-maxTurn,maxTurn));
  }

  function seeded(seed){
    let s = (seed >>> 0) || 0x12345678;
    return function(){
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s >>> 0) / 4294967296);
    };
  }

  function classifyConflict(a,b){
    const horizontal = distance(a,b);
    const vertical = Math.abs(a.altitude - b.altitude);
    if (horizontal < 0.020 && vertical < 500) return 'collision';
    if (horizontal < 0.060 && vertical < 1000) return 'warning';
    return 'clear';
  }

  function canCaptureApproach(a){
    if (!a || a.kind !== 'arrival') return false;
    const withinX = Math.abs(a.x - RUNWAY.threshold.x) <= RUNWAY.captureHalfWidth * 1.4;
    const withinY = a.y >= RUNWAY.captureTop && a.y <= RUNWAY.captureBottom;
    const headingOK = Math.abs(signedHeadingDelta(a.heading, RUNWAY.heading)) <= 35;
    const altitudeOK = a.altitude <= 4000;
    return withinX && withinY && headingOK && altitudeOK;
  }

  function approachGuidance(a){
    const progress = clamp((a.y - RUNWAY.captureTop) / (RUNWAY.captureBottom - RUNWAY.captureTop), 0, 1);
    const desiredAltitude = Math.round((3500 - progress * 2800) / 100) * 100;
    return { heading: RUNWAY.heading, altitude: clamp(desiredAltitude, 700, 3500) };
  }

  function isLanded(a){
    if (!a || a.kind !== 'arrival' || !a.approach) return false;
    const nearThreshold = Math.hypot(a.x - RUNWAY.threshold.x, a.y - RUNWAY.threshold.y) <= 0.050;
    const headingOK = Math.abs(signedHeadingDelta(a.heading, RUNWAY.heading)) <= 12;
    return nearThreshold && headingOK && a.altitude <= 900;
  }

  function isSafeExit(a){
    const outside = a.x < -0.03 || a.x > 1.03 || a.y < -0.03 || a.y > 1.03;
    if (!outside) return false;
    if (a.kind === 'departure') return a.altitude >= 5000;
    if (a.kind === 'overflight') return true;
    return false;
  }

  function moveAircraft(a, dt){
    const turnRate = a.approach ? 10 : 16;
    a.heading = stepHeading(a.heading, a.targetHeading, turnRate * dt);
    const climbRate = a.approach ? 1150 : 1350;
    const altDelta = clamp(a.targetAltitude - a.altitude, -climbRate*dt, climbRate*dt);
    a.altitude = Math.max(0, a.altitude + altDelta);
    if (a.approach) {
      const g = approachGuidance(a);
      a.targetHeading = g.heading;
      a.targetAltitude = g.altitude;
    }
    const r = a.heading * DEG;
    const pixels = a.speed * dt;
    a.x += Math.sin(r) * pixels;
    a.y -= Math.cos(r) * pixels;
    return a;
  }

  function trafficLevel(seconds, score){
    if (seconds < 45 && score < 500) return 1;
    if (seconds < 100 && score < 1300) return 2;
    if (seconds < 180 && score < 2600) return 3;
    if (seconds < 280 && score < 4500) return 4;
    return 5;
  }

  function spawnInterval(level){
    return [0, 10.5, 8.5, 7.0, 5.8, 4.8][clamp(level,1,5)];
  }

  function createAircraft(spec){
    return {
      id: spec.id,
      callsign: spec.callsign,
      kind: spec.kind,
      x: spec.x,
      y: spec.y,
      heading: normHeading(spec.heading),
      targetHeading: normHeading(spec.targetHeading ?? spec.heading),
      altitude: spec.altitude,
      targetAltitude: spec.targetAltitude ?? spec.altitude,
      speed: spec.speed ?? 0.045,
      approach: !!spec.approach,
      selected: false,
      conflict: 'clear',
      age: 0
    };
  }

  function callsign(rng, kind){
    const prefixes = kind === 'arrival' ? ['TAM','AZU','GLO','ARG','IBE'] : kind === 'departure' ? ['TAM','AZU','GLO','PTB','VSP'] : ['LAN','AAL','KLM','AFR','UAL'];
    return prefixes[Math.floor(rng()*prefixes.length)] + (100 + Math.floor(rng()*899));
  }

  function spawnCandidate(rng, id, level){
    const roll = rng();
    let kind = roll < 0.48 ? 'arrival' : roll < 0.72 ? 'departure' : 'overflight';
    if (kind === 'departure') {
      return createAircraft({id, callsign:callsign(rng,kind), kind, x:0.50, y:0.79, heading:0, altitude:800, targetAltitude:7000, speed:0.043 + level*0.0015});
    }
    const side = Math.floor(rng()*4);
    let x,y,heading;
    if (side===0){x=0.02;y=0.12+rng()*0.58;heading=70+rng()*40;}
    else if(side===1){x=0.98;y=0.12+rng()*0.58;heading=250+rng()*40;}
    else if(side===2){x=0.10+rng()*0.80;y=0.02;heading=145+rng()*70;}
    else {x=0.08+rng()*0.84;y=0.96;heading=325+rng()*70;}
    const altitude = kind==='arrival' ? (5000 + Math.floor(rng()*5)*1000) : (6000 + Math.floor(rng()*7)*1000);
    const targetAltitude = kind==='arrival' ? 3000 : altitude;
    return createAircraft({id,callsign:callsign(rng,kind),kind,x,y,heading,altitude,targetAltitude,speed:0.040 + rng()*0.010 + level*0.0012});
  }

  function safeSpawn(existing, candidate){
    return existing.every(a => distance(a,candidate) > 0.16 || Math.abs(a.altitude-candidate.altitude) >= 2000);
  }

  function makeGame(seed){
    return {
      rng: seeded(seed || Date.now()),
      seed: seed || Date.now(),
      aircraft: [],
      nextId: 1,
      elapsed: 0,
      score: 0,
      landed: 0,
      handedOff: 0,
      conflicts: 0,
      strikes: 0,
      gameOver: false,
      spawnClock: 2,
      level: 1,
      selectedId: null,
      lastEvent: 'SHIFT READY'
    };
  }

  function trySpawn(game){
    for (let i=0;i<8;i++) {
      const c = spawnCandidate(game.rng, game.nextId, game.level);
      if (safeSpawn(game.aircraft,c)) {
        game.nextId++;
        game.aircraft.push(c);
        game.lastEvent = `${c.callsign} ENTERING SECTOR`;
        return c;
      }
    }
    return null;
  }

  function updateGame(game, dt){
    if (game.gameOver) return game;
    dt = clamp(dt,0,0.08);
    game.elapsed += dt;
    game.level = trafficLevel(game.elapsed, game.score);
    game.spawnClock -= dt;
    if (game.spawnClock <= 0) {
      trySpawn(game);
      game.spawnClock += spawnInterval(game.level) * (0.85 + game.rng()*0.30);
    }

    for (const a of game.aircraft) {
      a.age += dt;
      a.conflict = 'clear';
      moveAircraft(a,dt);
    }

    for (let i=0;i<game.aircraft.length;i++) {
      for (let j=i+1;j<game.aircraft.length;j++) {
        const a=game.aircraft[i], b=game.aircraft[j];
        const c = classifyConflict(a,b);
        if (c==='collision') {
          a.conflict=b.conflict='collision';
          game.gameOver=true;
          game.lastEvent=`COLLISION — ${a.callsign} / ${b.callsign}`;
        } else if (c==='warning') {
          if (a.conflict!=='collision') a.conflict='warning';
          if (b.conflict!=='collision') b.conflict='warning';
        }
      }
    }

    const keep=[];
    for (const a of game.aircraft) {
      if (isLanded(a)) {
        game.landed++; game.score += 250 + game.level*20;
        game.lastEvent=`${a.callsign} LANDED`;
        continue;
      }
      if (isSafeExit(a)) {
        game.handedOff++; game.score += a.kind==='departure' ? 180 : 120;
        game.lastEvent=`${a.callsign} HANDOFF COMPLETE`;
        continue;
      }
      const runaway = a.x < -0.18 || a.x > 1.18 || a.y < -0.18 || a.y > 1.18;
      if (runaway) {
        if (a.kind==='arrival') {
          game.score=Math.max(0,game.score-120);
          game.strikes++;
          game.lastEvent=`${a.callsign} MISSED — ${game.strikes}/3`;
          if (game.strikes>=3) game.gameOver=true;
        }
        continue;
      }
      keep.push(a);
    }
    game.aircraft=keep;
    if (game.selectedId && !game.aircraft.some(a=>a.id===game.selectedId)) game.selectedId=null;
    return game;
  }

  function selectAircraft(game,id){
    game.selectedId=id;
    for(const a of game.aircraft) a.selected=a.id===id;
    return game.aircraft.find(a=>a.id===id)||null;
  }

  function commandHeading(game,id,heading){
    const a=game.aircraft.find(a=>a.id===id); if(!a)return false;
    a.approach=false; a.targetHeading=normHeading(Math.round(heading/5)*5); return true;
  }
  function commandAltitude(game,id,altitude){
    const a=game.aircraft.find(a=>a.id===id); if(!a)return false;
    a.approach=false; a.targetAltitude=clamp(Math.round(altitude/500)*500,1000,14000); return true;
  }
  function clearApproach(game,id){
    const a=game.aircraft.find(a=>a.id===id); if(!a || !canCaptureApproach(a)) return false;
    a.approach=true; const g=approachGuidance(a); a.targetHeading=g.heading; a.targetAltitude=g.altitude; return true;
  }

  return {
    RUNWAY, clamp, normHeading, signedHeadingDelta, distance, stepHeading, seeded,
    classifyConflict, canCaptureApproach, approachGuidance, isLanded, isSafeExit,
    moveAircraft, trafficLevel, spawnInterval, createAircraft, safeSpawn, makeGame,
    trySpawn, updateGame, selectAircraft, commandHeading, commandAltitude, clearApproach
  };
});
