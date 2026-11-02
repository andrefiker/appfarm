/* SINGULARITY 1.0.0 — offline cinematic gravitational arcade. */
(function () {
  'use strict';
  const P = window.SingularityPhysics;
  if (!P) throw Error('Missing physics engine');
  const $ = id => document.getElementById(id);
  const stage = $('stage'), background = $('cosmos'), fx = $('effects'), ctx = fx.getContext('2d', {alpha:true});
  const menu = $('menu'), end = $('end'), hud = $('hud'), playTip = $('play-tip');
  const scoreText = $('score'), bestText = $('best'), ammoText = $('ammo');
  const state = {
    mode:'menu', w:0,h:0,dpr:1,t:0,dt:0,score:0,shots:6,records:0,
    last:0, hole:{x:0,y:0,r:0,mu:0}, launcher:{x:0,y:0},
    probes:[], shards:[], particles:[], ripples:[], sparks:[], stars:[],
    pointer:{x:0,y:0,down:false,id:null},flux:0,quality:.8,fps:60,
    audio:true,audioCtx:null,music:null,renderer:null,glError:'',endPending:0,
    spin:0,flash:0,renderScale:0,
  };
  const rand=(a=0,b=1)=>a+Math.random()*(b-a);
  const TAU=Math.PI*2;
  const VERSION='1.0.0';
  const safeStore={get(key){try{return localStorage.getItem(key)}catch{return null}},set(key,value){try{localStorage.setItem(key,value)}catch{}}};
  state.records=Number(safeStore.get('singularity-best-v1')||0);
  if (!Number.isFinite(state.records)) state.records=0;
  bestText.textContent=String(state.records).padStart(5,'0');
  state.audio=safeStore.get('singularity-audio')!=='off';
  $('sound').classList.toggle('off',!state.audio);
  window.__singularityDiagnostics={version:VERSION,renderer:'uninitialized',errors:[],frames:0};
  function audioInit(){if (!state.audio)return;try{
    if(!state.audioCtx)state.audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(state.audioCtx.state==='suspended')state.audioCtx.resume();
  }catch(e){state.audio=false;}}
  function tone(freq=180,duration=.28,volume=.09,type='sine',slide=.6){
    if(!state.audio||!state.audioCtx)return;
    try{
      const c=state.audioCtx,now=c.currentTime,o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),now);
      o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),now+duration);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.026);
      g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(c.destination);o.start(now);o.stop(now+duration+.05);
    }catch(e){/* Audio failure must not affect gameplay. */}
  }
  function haptic(ms=13){try{if(navigator.vibrate)navigator.vibrate(ms)}catch{}}
  function resize(){
    const rect=stage.getBoundingClientRect();state.w=Math.max(1,rect.width);state.h=Math.max(1,rect.height);
    state.dpr=Math.min(window.devicePixelRatio||1,2);
    fx.width=Math.round(state.w*state.dpr);fx.height=Math.round(state.h*state.dpr);
    ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
    state.hole={x:state.w*.5,y:state.h*.43,r:Math.min(state.w*.116,state.h*.104),mu:Math.pow(Math.min(state.w*.116,state.h*.104),3)*34};
    state.launcher={x:state.w*.5,y:state.h*.835};
    backgroundResize();
    initStars();
    initShards();
  }
  function backgroundResize(){
    const next=Math.max(.50,Math.min(1.15,state.quality*Math.min(window.devicePixelRatio||1,1.35)));
    background.width=Math.max(1,Math.floor(state.w*next));background.height=Math.max(1,Math.floor(state.h*next));
    state.renderScale=next;
  }
  function initStars(){
    state.stars=Array.from({length:170},()=>({x:rand(0,state.w),y:rand(0,state.h),r:rand(.3,1.4),a:rand(.07,.55),phase:rand(0,TAU)}));
  }
  function initShards(){
    state.shards=Array.from({length:13},(_,i)=>({a:i*TAU/13+rand(-.14,.14),r:state.hole.r*rand(1.85,3.6),spin:rand(.08,.31)*(i%2?-1:1),phase:rand(0,TAU),color:i%3}));
  }
  function burst(x,y,count=22,color='#89e6ff',energy=1){
    for(let i=0;i<count;i++){
      const a=rand(0,TAU),v=rand(28,220)*energy;
      state.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,ttl:rand(.32,1.25),age:0,size:rand(.7,3),color});
    }
    if(state.particles.length>650)state.particles.splice(0,state.particles.length-650);
  }
  function ripple(x,y,color='#e99ec2',speed=180){state.ripples.push({x,y,r:0,max:speed,age:0,ttl:.8,color});}
  function pointShard(shard){const h=state.hole;return {x:h.x+Math.cos(shard.a)*shard.r,y:h.y+Math.sin(shard.a)*shard.r*.54};}
  function newGame(){
    state.mode='play';state.score=0;state.shots=6;state.probes=[];state.particles=[];state.ripples=[];state.endPending=0;state.spin=0;
    initShards();menu.classList.add('hide');end.classList.add('hide');hud.classList.remove('hide');playTip.classList.remove('hide');
    scoreText.textContent='00000';updateAmmo();
    burst(state.hole.x,state.hole.y,48,'#e7a1cb',1.15);
    ripple(state.hole.x,state.hole.y,'#ecacd1',330);tone(110,.8,.14,'sawtooth',.5);tone(330,.6,.05,'sine',1.4);
    haptic(30);
  }
  function updateAmmo(){ammoText.textContent=Array(state.shots).fill('●').join(' ')||'—';}
  function setScore(n){state.score=Math.max(0,state.score+n);scoreText.textContent=String(state.score).padStart(5,'0');}
  function finish(){
    if(state.mode!=='play')return;
    state.mode='end';state.probes=[];state.pointer.down=false;
    if(state.score>state.records){state.records=state.score;safeStore.set('singularity-best-v1',String(state.records));}
    $('total').textContent=state.score.toLocaleString('en-US');$('record').textContent=state.score>=state.records&&state.score>0?'NEW PERSONAL RECORD ✦':'BEST RUN  '+String(state.records).padStart(5,'0');
    bestText.textContent=String(state.records).padStart(5,'0');end.classList.remove('hide');hud.classList.add('hide');playTip.classList.add('hide');
    burst(state.hole.x,state.hole.y,120,'#f6b8d5',1.65);
    tone(180,.45,.14,'sine',1.5);setTimeout(()=>tone(270,.6,.08,'sine',1.5),120);
  }
  function shoot(target){
    if(state.mode!=='play'||state.shots<1)return;
    const start=state.launcher, angle=P.heading(start,target);
    state.probes.push({x:start.x,y:start.y,vx:angle.vx,vy:angle.vy,age:0,lifetime:0,closest:Infinity,
      trail:[],near:false,alive:true,entered:false});
    state.shots--;updateAmmo();playTip.classList.add('hide');state.endPending=0;
    burst(start.x,start.y,32,'#b5f5ff',.92);ripple(start.x,start.y,'#82e9ff',200);
    tone(250,.21,.12,'triangle',.45);tone(105,.35,.08,'sine',.6);haptic(15);
  }
  function simulation(dt){
    if(state.mode==='play'){
      for(let i=state.probes.length-1;i>=0;i--){
        const p=state.probes[i];
        // Fixed-step integration retains stable orbits even if rendering occasionally drops frames.
        const steps=Math.max(1,Math.ceil(dt/(1/120)));
        for(let j=0;j<steps;j++)P.step(p,state.hole,dt/steps);
        p.age+=dt;
        p.trail.push({x:p.x,y:p.y});if(p.trail.length>42)p.trail.shift();
        const dist=P.length(p.x-state.hole.x,p.y-state.hole.y);
        if(dist<state.hole.r*1.38&&!p.near){
          p.near=true;setScore(125);ripple(p.x,p.y,'#f7cc85',140);
          burst(p.x,p.y,22,'#ffe9aa',.46);tone(430,.2,.095,'sine',1.8);haptic(9);
        }
        for(const shard of state.shards){
          const q=pointShard(shard);
          if(P.collect(p,q,Math.max(13,state.hole.r*.31))){
            setScore(350);burst(q.x,q.y,38,shard.color===1?'#81e7f2':'#f7b2ce',1.18);
            ripple(q.x,q.y,'#f4d5b1',185);tone(460,.3,.13,'triangle',1.7);tone(870,.25,.045,'sine',1.25);
            haptic(18);shard.a+=rand(.9,2.7);shard.r=state.hole.r*rand(2,3.55);
          }
        }
        if(dist<state.hole.r*.92){
          burst(p.x,p.y,62,'#ffc69c',1.5);ripple(state.hole.x,state.hole.y,'#ffc996',330);
          tone(90,.8,.19,'sawtooth',.2);haptic(42);state.probes.splice(i,1);continue;
        }
        if(p.age>11||p.x<-state.w*.6||p.x>state.w*1.6||p.y<-state.h*.6||p.y>state.h*1.6){
          if(p.age>2&&p.closest>state.hole.r*2.5)setScore(25);
          state.probes.splice(i,1);
        }
      }
      for(const shard of state.shards)shard.a+=shard.spin*dt;
      if(state.shots===0&&state.probes.length===0){state.endPending+=dt;if(state.endPending>1.15)finish();}
    }else{for(const shard of state.shards)shard.a+=shard.spin*dt*.46;}
    for(let i=state.particles.length-1;i>=0;i--){
      const p=state.particles[i];p.age+=dt;if(p.age>=p.ttl){state.particles.splice(i,1);continue;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.35,dt);p.vy*=Math.pow(.35,dt);
    }
    for(let i=state.ripples.length-1;i>=0;i--){const r=state.ripples[i];r.age+=dt;r.r+=r.max*dt;if(r.age>r.ttl)state.ripples.splice(i,1);}
    state.flux=Math.max(0,state.flux-dt*1.3);
  }
  function drawLauncher(){
    if(state.mode!=='play')return;
    const c=state.launcher,t=state.t;
    ctx.save();ctx.translate(c.x,c.y);
    const glow=ctx.createRadialGradient(0,0,3,0,0,45);glow.addColorStop(0,'rgba(116,240,252,.43)');glow.addColorStop(1,'rgba(116,240,252,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,45,0,TAU);ctx.fill();
    ctx.rotate(t*.35);ctx.strokeStyle='rgba(136,229,243,.75)';ctx.lineWidth=1.4;ctx.setLineDash([6,8]);ctx.beginPath();ctx.arc(0,0,20,0,TAU);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(-9,8);ctx.lineTo(0,-16);ctx.lineTo(9,8);ctx.lineTo(0,4);ctx.closePath();ctx.fillStyle='#b3f4ff';ctx.shadowColor='#9bf1ff';ctx.shadowBlur=17;ctx.fill();ctx.restore();
  }
  function drawShards(){
    if(state.mode!=='play')return;
    for(const s of state.shards){
      const p=pointShard(s),r=5+Math.sin(state.t*3+s.phase)*1.2;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(state.t*.8+s.phase);
      ctx.shadowColor=s.color===1?'#6be2ff':'#ffb5db';ctx.shadowBlur=23;
      ctx.fillStyle=s.color===1?'#7ee8ff':'#ffd1d8';ctx.beginPath();ctx.moveTo(0,-r*1.9);ctx.lineTo(r,0);ctx.lineTo(0,r*1.9);ctx.lineTo(-r,0);ctx.closePath();ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.43)';ctx.lineWidth=.65;ctx.stroke();ctx.restore();
    }
  }
  function drawTrails(){
    for(const p of state.probes){
      if(p.trail.length>2){ctx.save();ctx.globalCompositeOperation='lighter';
        for(let i=1;i<p.trail.length;i++){
          const alpha=i/p.trail.length;ctx.strokeStyle=`rgba(127,238,255,${alpha*.55})`;ctx.lineWidth=alpha*5;
          ctx.beginPath();ctx.moveTo(p.trail[i-1].x,p.trail[i-1].y);ctx.lineTo(p.trail[i].x,p.trail[i].y);ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();ctx.shadowColor='#affcff';ctx.shadowBlur=28;ctx.fillStyle='#f9ffff';ctx.beginPath();ctx.arc(p.x,p.y,4.8,0,TAU);ctx.fill();ctx.restore();
    }
  }
  function drawAim(){
    if(!state.pointer.down||state.mode!=='play')return;
    const target=state.pointer,origin=state.launcher,pts=P.trajectory(origin,target,state.hole,1,108,1/50);
    ctx.save();ctx.setLineDash([1,10]);ctx.lineCap='round';ctx.lineWidth=3;
    ctx.strokeStyle='rgba(171,247,255,.75)';ctx.shadowColor='#72cfee';ctx.shadowBlur=15;
    ctx.beginPath();ctx.moveTo(origin.x,origin.y);
    for(const p of pts)ctx.lineTo(p.x,p.y);
    ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='rgba(180,236,251,.7)';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(target.x,target.y,15,0,TAU);ctx.stroke();
    ctx.beginPath();ctx.moveTo(target.x-23,target.y);ctx.lineTo(target.x-12,target.y);ctx.moveTo(target.x+12,target.y);ctx.lineTo(target.x+23,target.y);ctx.moveTo(target.x,target.y-23);ctx.lineTo(target.x,target.y-12);ctx.moveTo(target.x,target.y+12);ctx.lineTo(target.x,target.y+23);ctx.stroke();ctx.restore();
  }
  function drawOverlay(dt){
    ctx.clearRect(0,0,state.w,state.h);
    const h=state.hole,t=state.t;
    // Energy stream particles. Never block the underlying shader or foreground probes.
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<155;i++){
      const a=i*2.399963+t*(.14+(i%11)*.011),rad=h.r*(1.2+(i*37%97)/30),rr=(i*17%13)/13;
      const px=h.x+Math.cos(a+Math.sin(t*.3+i)*.16)*rad;
      const py=h.y+Math.sin(a)*rad*.53;
      const alpha=Math.max(0,.15+.23*Math.sin(t*1.7+i))*(1-rr*.3);
      ctx.fillStyle=i%5?'rgba(249,127,179,'+alpha+')':'rgba(110,209,252,'+alpha+')';
      ctx.beginPath();ctx.arc(px,py,i%13===0?1.5:.6,0,TAU);ctx.fill();
    }
    ctx.restore();
    // Geometry/UI reads as an instrument rather than a flat arcade game.
    ctx.save();ctx.translate(h.x,h.y);ctx.rotate(t*.06);
    ctx.strokeStyle='rgba(165,198,234,.09)';ctx.lineWidth=.8;ctx.setLineDash([2,13]);
    ctx.beginPath();ctx.arc(0,0,h.r*4.2,0,TAU);ctx.stroke();ctx.setLineDash([]);
    const range=h.r*3.7;for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;
      ctx.strokeStyle='rgba(178,198,229,.18)';ctx.beginPath();ctx.arc(0,0,range,a-.05,a+.05);ctx.stroke();
    }ctx.restore();
    drawShards();drawTrails();drawAim();drawLauncher();
    for(const p of state.particles){
      const fade=Math.pow(1-p.age/p.ttl,1.4);
      ctx.globalAlpha=fade;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.size*5;
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*fade,0,TAU);ctx.fill();
    }ctx.shadowBlur=0;ctx.globalAlpha=1;
    for(const r of state.ripples){
      ctx.globalAlpha=Math.pow(1-r.age/r.ttl,2)*.68;ctx.lineWidth=1.2;ctx.strokeStyle=r.color;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();
    }ctx.globalAlpha=1;
  }
  function drawFallback(){
    // GPU unavailable: attractive 2D offline scene with no remote dependencies.
    const g=background.getContext('2d');if(!g)return;
    const W=background.width,H=background.height,ox=W*.5,oy=H*.43,R=Math.min(W*.116,H*.104);
    g.clearRect(0,0,W,H);const sky=g.createRadialGradient(ox,oy,0,ox,oy,H*.82);
    sky.addColorStop(0,'#271333');sky.addColorStop(.38,'#080e29');sky.addColorStop(.72,'#050719');sky.addColorStop(1,'#010209');g.fillStyle=sky;g.fillRect(0,0,W,H);
    for(const s of state.stars){g.globalAlpha=s.a*(.75+.25*Math.sin(state.t*2+s.phase));g.fillStyle='#b6dafa';g.beginPath();g.arc(s.x/state.w*W,s.y/state.h*H,s.r,0,TAU);g.fill();}g.globalAlpha=1;
    g.save();g.translate(ox,oy);g.rotate(-.23);g.shadowBlur=R*1.5;g.shadowColor='#ff6289';
    const ring=g.createRadialGradient(0,0,R*1.25,0,0,R*3.8);ring.addColorStop(0,'#ffcb8d');ring.addColorStop(.28,'#ea5a70');ring.addColorStop(.57,'#671755');ring.addColorStop(1,'#090617');
    g.scale(1,.23);g.strokeStyle=ring;g.lineWidth=R*1.4;g.beginPath();g.arc(0,0,R*2.5,0,TAU);g.stroke();g.restore();
    g.save();g.translate(ox,oy);g.shadowBlur=R*.9;g.shadowColor='#d9769e';g.fillStyle='#000009';g.beginPath();g.arc(0,0,R*.97,0,TAU);g.fill();g.restore();
    g.strokeStyle='rgba(255,186,136,.9)';g.lineWidth=R*.06;g.beginPath();g.arc(ox,oy,R*1.06,0,TAU);g.stroke();
  }
  function frame(now){
    const dt=Math.min(.034,Math.max(0,(now-state.last)/1000||.016));state.last=now;
    if(!document.hidden){
      state.t+=dt;
      simulation(dt);
      if(state.renderer){
        try{state.renderer.render({time:state.t,center:{x:.5,y:1-state.hole.y/state.h},core:state.hole.r/state.h,touch:{x:state.pointer.x/state.w,y:1-state.pointer.y/state.h},flux:state.flux});}
        catch(e){state.glError=String(e);state.renderer=null;window.__singularityDiagnostics.errors.push(state.glError);}
      }
      if(!state.renderer)drawFallback();
      drawOverlay(dt);
      const diagnostics=window.__singularityDiagnostics;diagnostics.frames++;
      diagnostics.renderer=state.renderer?'WebGL2':'Canvas2D';
      // Adaptive GPU resolution: maintain smooth touch feedback over sheer pixel count.
      state.spin+=dt;
      if(state.spin>3){
        state.fps=Math.max(1,Math.round(diagnostics.frames/state.spin));
        diagnostics.fps=state.fps;
        if(state.renderer){if(state.fps<31&&state.quality>.58){state.quality-=.10;backgroundResize();}
          else if(state.fps>52&&state.quality<.86){state.quality+=.035;backgroundResize();}}
        state.spin=0;diagnostics.frames=0;
      }
    }
    requestAnimationFrame(frame);
  }
  function pointerPos(ev){const rect=stage.getBoundingClientRect();return{x:ev.clientX-rect.left,y:ev.clientY-rect.top};}
  stage.addEventListener('pointerdown',ev=>{
    if(ev.target.closest('button'))return;
    const p=pointerPos(ev);state.pointer.x=p.x;state.pointer.y=p.y;state.flux=1;
    if(state.mode!=='play')return;
    ev.preventDefault();state.pointer.down=true;state.pointer.id=ev.pointerId;
    try{stage.setPointerCapture(ev.pointerId)}catch{}
  });
  stage.addEventListener('pointermove',ev=>{
    const p=pointerPos(ev);state.pointer.x=p.x;state.pointer.y=p.y;
    if(state.pointer.down)state.flux=.65;
  });
  function release(ev){
    if(!state.pointer.down||state.pointer.id!==ev.pointerId)return;
    const p=pointerPos(ev);state.pointer.x=p.x;state.pointer.y=p.y;
    state.pointer.down=false;state.pointer.id=null;
    shoot(p);
  }
  stage.addEventListener('pointerup',release);
  stage.addEventListener('pointercancel',()=>{state.pointer.down=false;state.pointer.id=null;});
  $('start').addEventListener('click',()=>{audioInit();newGame();});
  $('again').addEventListener('click',()=>{audioInit();newGame();});
  $('sound').addEventListener('click',()=>{
    state.audio=!state.audio;safeStore.set('singularity-audio',state.audio?'on':'off');$('sound').classList.toggle('off',!state.audio);
    if(state.audio){audioInit();tone(560,.16,.045,'sine',1.2);}
  });
  document.addEventListener('visibilitychange',()=>{state.last=performance.now();if(document.hidden&&state.audioCtx){try{state.audioCtx.suspend()}catch{}}});
  window.addEventListener('resize',resize);
  window.addEventListener('error',e=>{window.__singularityDiagnostics.errors.push(String(e.message));});
  window.addEventListener('contextmenu',e=>e.preventDefault());
  // Initialize WebGL only after assets and layout are ready.
  resize();
  try{state.renderer=window.SingularityShader.create(background)}catch(e){
    state.glError=String(e);window.__singularityDiagnostics.errors.push(state.glError);
  }
  requestAnimationFrame(frame);
})();
