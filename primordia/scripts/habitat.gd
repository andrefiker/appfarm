class_name Habitat
extends Node2D

signal message(text:String)
signal sound(kind:String)
signal death
var ecology=Ecology.new()
var rng=RandomNumberGenerator.new()
var genome=Genome.starter()
var stats=Genome.stats(genome)
var player:OrganismBody
var camera:Camera2D
var energy=92.0
var integrity=100.0
var dna=5.0
var generation=1
var playtime=0.0
var velocity=Vector2.ZERO
var heading=0.0
var agents:Array=[]
var food:Array=[]
var effects:Array=[]
var discovered:Array=[]
var lineage:Array=[]
var history={"hunts":0,"light":0.0,"damage":0.0,"bursts":0,"carrion":0,"fed":0}
var active=false
var attack_cd=0.0
var secondary_cd=0.0
var breed_cd=0.0
var tick_time=0.0
var spawn_time=0.0
var invincible=0.0
var attached=-1
var ready_notified=false
var aim_mouse=true
var touch_enabled=false
var touch_direction=Vector2.ZERO
var sim_steps=0
var zone_name="Sunlit shallows"
var clouds:Array=[]

func _ready():
 rng.seed=341008
 player=OrganismBody.new(); player.genome=genome; player.is_player=true; player.position=Vector2(1750,1250); add_child(player)
 camera=Camera2D.new(); camera.position=player.position; camera.position_smoothing_enabled=false; add_child(camera)
 camera.make_current()
 for x in range(7):
  for y in range(6):clouds.append(Vector2(600+x*1200,500+y*1000))
 lineage=[{"generation":1,"parent":0,"genome":genome.duplicate(true),"role":Genome.role(genome),"mutation":"First membrane"}]
 populate()

func populate():
 for a in agents: a.node.queue_free()
 agents.clear(); food.clear(); effects.clear()
 for i in range(700):
  var pos=Vector2(rng.randf_range(40,8360),rng.randf_range(40,6360))
  if i<165: pos=player.position+Vector2.from_angle(rng.randf()*TAU)*sqrt(rng.randf_range(0.006,1.0))*1150.0
  add_food(pos,"nutrient" if Ecology.zone(pos)!=3 else "carrion")
 for i in range(85):
  var pos=Vector2(rng.randf_range(100,8300),rng.randf_range(100,6300))
  if i<38: pos=player.position+Vector2.from_angle(rng.randf()*TAU)*rng.randf_range(160,1350)
  var z=Ecology.zone(pos)
  var options=ecology.species.filter(func(s):return s.zone==z and not s.extinct)
  if not options.is_empty(): spawn_agent(options[rng.randi_range(0,options.size()-1)].id,pos)

func add_food(pos:Vector2,kind:String="nutrient",value:float=1.0):
 if food.size()>=1050: return
 food.append({"pos":pos.clamp(Vector2(20,20),Ecology.WORLD-Vector2(20,20)),"kind":kind,"size":rng.randf_range(2.5,5.0)*(1.8 if kind=="carrion" else 1.0),"phase":rng.randf()*TAU,"value":value})

func spawn_agent(id:int,pos:Vector2):
 var s=ecology.species[id]
 var body=OrganismBody.new(); body.genome=s.genome.duplicate(true); body.position=pos; body.rotation=rng.randf()*TAU; add_child(body)
 agents.append({"id":id,"node":body,"pos":pos,"vel":Vector2.ZERO,"heading":body.rotation,"hp":65.0+s.genome.size,"energy":70.0,"age":0.0,"decision":rng.randf(),"nibble":rng.randf()*0.25,"direction":Vector2.RIGHT.rotated(rng.randf()*TAU),"cooldown":0.0,"poison":0.0,"stats":Genome.stats(body.genome)})

func _physics_process(dt):
 if not active: return
 simulate(dt)

func simulate(dt:float,input_override:Vector2=Vector2.INF):
 playtime+=dt; sim_steps+=1
 attack_cd=maxf(0,attack_cd-dt); secondary_cd=maxf(0,secondary_cd-dt); breed_cd=maxf(0,breed_cd-dt); invincible=maxf(0,invincible-dt)
 var dir=input_override
 if dir==Vector2.INF and touch_enabled:dir=touch_direction
 if dir==Vector2.INF:
  dir=Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP))).limit_length()
 var aim=get_global_mouse_position()-player.position
 if aim_mouse and aim.length()>25: heading=lerp_angle(heading,aim.angle(),minf(1,stats.turn*dt))
 elif dir.length()>0: heading=lerp_angle(heading,dir.angle(),minf(1,stats.turn*dt))
 var exhaustion=0.45 if energy<8 else 1.0
 var thrust=stats.speed*exhaustion
 # Flagella reward alignment; cilia retain strong lateral movement.
 var alignment=0.76+0.24*maxf(0,dir.dot(Vector2.from_angle(heading)))
 var response=3.4/sqrt(stats.mass)+(0.8 if Genome.has(genome,"cilia") else 0)
 velocity=velocity.lerp(dir*thrust*alignment,minf(1,dt*response))
 var current=Vector2(sin(player.position.y/800+playtime*0.06),cos(player.position.x/1100))*6.0
 if ecology.event=="Cold current" and ecology.event_zone==Ecology.zone(player.position):
  current*=4.5; energy-=dt*0.18
 if attached>=0 and attached<agents.size():
  var host=agents[attached]
  player.position=host.pos+Vector2.from_angle(heading+PI)*host.node.genome.size
  host.hp-=dt*4; energy=minf(stats.energy,energy+dt*3.2)
  if dir.length()>0.6: attached=-1
 else:
  attached=-1; player.position+=(velocity+current)*dt
 player.position=player.position.clamp(Vector2(45,45),Ecology.WORLD-Vector2(45,45))
 player.rotation=heading; player.motion=velocity.length()
 var light=Ecology.light(player.position)
 if ecology.event=="Long shadow" and ecology.event_zone==Ecology.zone(player.position): light*=0.15
 energy-=dt*(stats.metabolism+dir.length()*0.38+genome.size*0.0015)
 energy+=dt*stats.photo*light
 if light>0.65: history.light+=dt
 if energy>35 and integrity<100:
  var heal=stats.regen*dt; integrity=minf(100,integrity+heal); energy-=heal*0.7
 if energy<=0: energy=0; integrity-=dt*1.6
 energy=minf(stats.energy,energy)
 if ecology.event=="Toxic bloom" and ecology.event_zone==Ecology.zone(player.position): hurt(dt*0.9,false)
 _eat(dt)
 _agents(dt)
 if integrity<=0: active=false; death.emit(); return
 tick_time+=dt; spawn_time+=dt
 if tick_time>=8:
  tick_time-=8; ecology.tick(8)
 if spawn_time>=4:
  spawn_time-=4; _replenish()
 var target_zoom=clampf(1.08-pow(genome.size/22.0-1.0,0.8)*0.12,0.62,1.08)
 camera.zoom=camera.zoom.lerp(Vector2.ONE*target_zoom,minf(1,dt*0.6))
 camera.position=camera.position.lerp(player.position,minf(1,dt*4))
 for e in effects: e.life-=dt
 effects=effects.filter(func(e):return e.life>0)
 var new_zone=Ecology.ZONES[Ecology.zone(player.position)]
 if new_zone!=zone_name: zone_name=new_zone; message.emit(new_zone)
 if Genome.can_reproduce(energy,dna,breed_cd) and not ready_notified:
  ready_notified=true; message.emit("A new generation is possible · press E to evolve")
 queue_redraw()

func _eat(dt:float):
 var radius=genome.size*(1.2+stats.filter*0.55)
 for i in range(food.size()-1,-1,-1):
  var f=food[i]
  var distance=player.position.distance_to(f.pos)
  if distance<radius+45 and stats.filter>0.7:
   f.pos=f.pos.move_toward(player.position,dt*55)
  if distance<radius:
   var gain=(7.0 if f.kind=="nutrient" else 13.0)*f.value
   if f.kind=="nutrient": gain*=0.55+stats.filter*0.45
   energy=minf(stats.energy,energy+gain)
   dna=minf(80,dna+(1.2 if f.kind=="nutrient" else 2.1)*f.value)
   history.fed+=1
   if f.kind=="carrion": history.carrion+=1
   effects.append({"pos":f.pos,"life":0.7,"max":0.7,"kind":"feed","col":Color(0.55,0.91,0.69)})
   sound.emit("feed"); food.remove_at(i)

func hurt(amount:float,flash:bool=true):
 if invincible>0: return
 var d=Genome.damage(amount,stats.defense)
 integrity-=d; history.damage+=d
 if flash: player.impact=1; sound.emit("hurt")

func primary():
 if not active or attack_cd>0 or energy<7: return
 energy-=7; attack_cd=0.65
 if Genome.has(genome,"jaw"):
  effects.append({"pos":player.position+Vector2.from_angle(heading)*genome.size,"life":0.3,"max":0.3,"kind":"bite","col":Color(1,0.64,0.43)})
  for a in agents:
   var v=a.pos-player.position
   if v.length()<genome.size*1.5+a.node.genome.size+28 and v.normalized().dot(Vector2.from_angle(heading))>0.15:
    a.hp-=Genome.damage(stats.attack,a.stats.defense); a.node.impact=1; a.vel+=v.normalized()*125
    if a.hp<=0: history.hunts+=1; ecology.report_kill(a.id,true); a["reported"]=true
 else:
  velocity+=Vector2.from_angle(heading)*stats.speed*1.6; history.bursts+=1; sound.emit("burst")

func secondary():
 if not active or secondary_cd>0: return
 if attached>=0: attached=-1; return
 if Genome.has(genome,"parasite") and energy>=5:
  for i in range(agents.size()):
   var a=agents[i]
   if a.node.genome.size>genome.size*1.05 and a.pos.distance_to(player.position)<a.node.genome.size+genome.size+35:
    attached=i; secondary_cd=2; energy-=5; message.emit("Attached · move to release"); return
 if Genome.has(genome,"toxin") and energy>=18:
  energy-=18; secondary_cd=5
  effects.append({"pos":player.position,"life":1.7,"max":1.7,"kind":"toxin","col":Color(0.80,0.46,0.93)})
  for a in agents:
   if a.pos.distance_to(player.position)<180: a.poison=6
  sound.emit("burst")
 elif energy>=10:
  energy-=10; secondary_cd=2.5; velocity+=Vector2.from_angle(heading)*stats.speed*1.6; history.bursts+=1; sound.emit("burst")

func _agents(dt:float):
 for i in range(agents.size()-1,-1,-1):
  var a=agents[i]
  var s=ecology.species[a.id]
  var distance=a.pos.distance_to(player.position)
  a.node.visible=distance<1200; a.node.low_detail=distance>600
  a.cooldown=maxf(0,a.cooldown-dt)
  if distance>2100:
   if sim_steps%30!=0: continue
   a.pos+=a.direction*12*dt*30; a.node.position=a.pos
   continue
  var step=dt
  if distance>1200:
   if sim_steps%6!=0: continue
   step=dt*6
  a.age+=step; a.energy-=step*0.23; a.decision-=step
  a.nibble=a.get("nibble",0.0)-step
  if a.poison>0: a.poison-=step; a.hp-=step*5
  if a.decision<=0:
   a.decision=rng.randf_range(0.35,0.9)
   a.direction=Vector2.from_angle(a.heading+rng.randf_range(-1.0,1.0))
   var target=Vector2.INF
   var nearest=600.0
   if s.diet in ["predator","parasite"]:
    if genome.size<a.node.genome.size*1.15 and distance<500 and invincible<=0: target=player.position; nearest=distance
    for b in agents:
     if b==a or b.id==a.id or b.node.genome.size>a.node.genome.size*0.90: continue
     var dd=a.pos.distance_to(b.pos)
     if dd<nearest: nearest=dd; target=b.pos
   elif s.diet!="photo":
    for f in food:
     if s.diet=="scavenger" and f.kind!="carrion": continue
     var dd=a.pos.distance_to(f.pos)
     if dd<nearest: nearest=dd; target=f.pos
   if target!=Vector2.INF: a.direction=(target-a.pos).normalized()
   for b in agents:
    if b==a: continue
    var other=ecology.species[b.id]
    if other.diet=="predator" and b.node.genome.size>a.node.genome.size*1.1 and a.pos.distance_to(b.pos)<190:
     a.direction=(a.pos-b.pos).normalized(); break
   if Genome.has(genome,"jaw") and genome.size>a.node.genome.size*0.85 and distance<170: a.direction=(a.pos-player.position).normalized()
  var speed=a.stats.speed*s.speed*(0.70 if s.diet in ["photo","symbiont"] else 0.90)
  a.vel=a.vel.lerp(a.direction*speed,minf(1,step*2.0)); a.pos+=a.vel*step
  a.pos=a.pos.clamp(Vector2(35,35),Ecology.WORLD-Vector2(35,35))
  for b in agents:
   if b==a:continue
   var delta=a.pos-b.pos
   var separation=(a.node.genome.size+b.node.genome.size)*0.78
   var squared=delta.length_squared()
   if squared>0.01 and squared<separation*separation:
    a.pos+=delta.normalized()*(separation-sqrt(squared))*minf(0.25,step*3.0)
  a.heading=lerp_angle(a.heading,a.direction.angle(),minf(1,step*a.stats.turn))
  a.node.position=a.pos; a.node.rotation=a.heading; a.node.motion=a.vel.length()
  if s.diet=="photo": a.energy+=step*Ecology.light(a.pos)*1.0
  if s.diet=="symbiont" and distance<170 and Genome.has(genome,"symbiont"):
   energy=minf(stats.energy,energy+step*stats.symbiosis); a.energy+=step*0.8
  var reach=a.node.genome.size+genome.size
  if distance<reach+6:
   if s.diet in ["predator","parasite"] and a.cooldown<=0 and invincible<=0:
    var front=(player.position-a.pos).normalized().dot(Vector2.from_angle(a.heading))
    if front>0.15:
     hurt(a.stats.attack*s.attack*0.47); a.cooldown=1.1; velocity+=(player.position-a.pos).normalized()*75
   if Genome.has(genome,"spike") and a.cooldown<=0:
    for p in genome.parts:
     if p.kind=="spike" and (a.pos-player.position).normalized().dot(Vector2.from_angle(heading+p.angle))>0.65:
      a.hp-=stats.attack*0.7; a.cooldown=0.8; a.node.impact=1
   a.pos+=(a.pos-player.position).normalized()*step*22
  if s.diet in ["predator","parasite"] and a.cooldown<=0:
   for b in agents:
    if b==a or b.id==a.id or b.node.genome.size>a.node.genome.size*0.90: continue
    if a.pos.distance_to(b.pos)<a.node.genome.size+b.node.genome.size:
     b.hp-=Genome.damage(a.stats.attack*s.attack*0.55,b.stats.defense); b.node.impact=0.6; a.cooldown=1.2; a.energy+=5; break
  elif s.diet not in ["predator","parasite","photo"] and a.nibble<=0:
   a.nibble=0.25
   for j in range(food.size()-1,-1,-1):
    if a.pos.distance_squared_to(food[j].pos)<pow(a.node.genome.size+7,2):
     a.energy+=7; food.remove_at(j); break
  if a.energy<0: a.hp-=step*1.5
  if distance<stats.senses and a.id not in discovered:
   discovered.append(a.id); message.emit("Discovered: "+s.name)
  if a.hp<=0 or s.extinct:
   add_food(a.pos,"carrion",1.8)
   if not a.get("reported",false): ecology.report_kill(a.id)
   a.node.queue_free(); agents.remove_at(i); attached=-1

func _replenish():
 # Replacement comes from the regional population budget, outside the viewport.
 for i in range(agents.size()-1,-1,-1):
  if agents[i].pos.distance_to(player.position)>2600 and agents.size()>65:
   agents[i].node.queue_free(); agents.remove_at(i); attached=-1
 var regional=Ecology.zone(player.position)
 var candidates=ecology.species.filter(func(s):return not s.extinct and (s.zone==regional or rng.randf()<0.12))
 var local=agents.filter(func(a):return a.pos.distance_to(player.position)<1600).size()
 if local<48 and agents.size()<105 and not candidates.is_empty():
  for j in range(4):
   if agents.size()>=105:break
   var s=candidates[rng.randi_range(0,candidates.size()-1)]
   var count=agents.filter(func(a):return a.id==s.id).size()
   if s.population>float(count)*4:
    var pos=player.position+Vector2.from_angle(rng.randf()*TAU)*rng.randf_range(1100,1650)
    pos=pos.clamp(Vector2(50,50),Ecology.WORLD-Vector2(50,50))
    if pos.distance_to(player.position)>1000: spawn_agent(s.id,pos)
 for j in range(22):
  var pos=player.position+Vector2.from_angle(rng.randf()*TAU)*rng.randf_range(650,1850)
  var z=Ecology.zone(pos)
  if rng.randf()<ecology.resources[z]*0.65: add_food(pos,"carrion" if z==3 else "nutrient")
 # Fixed nutrient patches renew according to regional productivity. They cap
 # their standing crop, so this is a habitat resource rather than a player drop.
 for center in clouds:
  if center.distance_to(player.position)>1900:continue
  var z=Ecology.zone(center)
  var crop=0
  for f in food:
   if center.distance_squared_to(f.pos)<32400:crop+=1
  var capacity=int(14*ecology.resources[z])
  for i in range(mini(4,maxi(0,capacity-crop))):
   add_food(center+Vector2.from_angle(rng.randf()*TAU)*sqrt(rng.randf())*175,"carrion" if z==3 else "nutrient")

func evolve(g:Dictionary,adaptation:String):
 var parent=generation
 genome=g.duplicate(true); genome.size=minf(66,genome.size*1.07)
 stats=Genome.stats(genome); player.genome=genome; generation+=1
 energy=stats.energy*0.76; integrity=100; dna=0; breed_cd=35; invincible=7; ready_notified=false
 lineage.append({"generation":generation,"parent":parent,"genome":genome.duplicate(true),"role":Genome.role(genome),"mutation":adaptation})
 history={"hunts":0,"light":0.0,"damage":0.0,"bursts":0,"carrion":0,"fed":0}
 sound.emit("birth"); message.emit("Generation %d · %s"%[generation,Genome.role(genome)])

func revive():
 genome=lineage[-1].genome.duplicate(true); stats=Genome.stats(genome); player.genome=genome
 player.position=Vector2(1750,1250); camera.position=player.position; velocity=Vector2.ZERO
 energy=stats.energy*0.8; integrity=100; dna=floor(dna*0.65); invincible=10; attached=-1
 populate(); active=true; message.emit("A viable descendant continues your lineage")

func snapshot() -> Dictionary:
 var occupants=[]
 for a in agents:
  var d=a.duplicate(); d.erase("node"); occupants.append(d)
 return {"schema":1,"genome":genome.duplicate(true),"generation":generation,"energy":energy,"integrity":integrity,"dna":dna,"position":player.position,"heading":heading,"ecology":ecology.snapshot(),"lineage":lineage.duplicate(true),"discovered":discovered.duplicate(),"history":history.duplicate(),"playtime":playtime,"food":food.duplicate(true),"agents":occupants,"breed_cd":breed_cd,"rng":rng.state}

func restore(d:Dictionary):
 genome=d.genome; stats=Genome.stats(genome); player.genome=genome; generation=d.generation; energy=d.energy; integrity=d.integrity; dna=d.dna; player.position=d.position; heading=d.get("heading",0.0)
 ecology.restore(d.ecology); lineage=d.lineage; discovered=d.discovered; history=d.history; playtime=d.playtime; breed_cd=d.get("breed_cd",0.0)
 camera.position=player.position
 for a in agents: a.node.queue_free()
 agents.clear(); food=d.get("food",[])
 for a in d.get("agents",[]):
  spawn_agent(a.id,a.pos)
  var new_agent=agents[-1]
  for k in a: new_agent[k]=a[k]
  new_agent.node.position=a.pos; new_agent.node.rotation=a.heading
 rng.state=d.get("rng",rng.state); invincible=3

func _draw():
 if not player: return
 var p=player.position
 for center in clouds:
  if center.distance_squared_to(p)>1500000:continue
  var resource=ecology.resources[Ecology.zone(center)]
  for ring in range(4):
   draw_circle(center,180.0-ring*32,Color(0.23,0.44,0.27,resource*0.011))
 # Suspended particles are a deterministic infinite-looking field, not entities.
 var cell=160.0
 var base=Vector2(floor(p.x/cell),floor(p.y/cell))
 for xx in range(-7,8):
  for yy in range(-5,6):
   var ij=base+Vector2(xx,yy)
   var h=fmod(abs(sin(ij.dot(Vector2(12.9898,78.233)))*43758.5453),1.0)
   var pos=ij*cell+Vector2(h*cell,fmod(h*317,1.0)*cell)
   pos+=Vector2(sin(playtime*0.08+h*9),cos(playtime*0.06+h*5))*18
   draw_circle(pos,1.0+h*1.5,Color(0.5,0.75,0.70,0.08+h*0.17))
   if h>0.8: draw_arc(pos,14+h*20,0.4,5.0,18,Color(0.26,0.62,0.52,0.08),1,true)
 for f in food:
  var d=p.distance_squared_to(f.pos)
  if d>1500000: continue
  var c=Color(0.68,0.81,0.36) if f.kind=="nutrient" else Color(0.76,0.52,0.32)
  var wobble=Vector2(sin(playtime*0.8+f.phase),cos(playtime*0.6+f.phase))*1.5
  draw_circle(f.pos+wobble,f.size*2.4,Color(c.r,c.g,c.b,0.04))
  draw_circle(f.pos+wobble,f.size,Color(c.r,c.g,c.b,0.43),true,-1,true)
  draw_arc(f.pos+wobble,f.size,-2.3,-0.4,8,Color(c.r,c.g,c.b,0.75),0.7,true)
  if Genome.has(genome,"chemo") and d>pow(stats.senses*0.65,2) and d<700000:
   draw_arc(f.pos,12+sin(playtime*2)*3,0,TAU,14,Color(c.r,c.g,c.b,0.25),1,true)
 for e in effects:
  var progress=1-e.life/e.max
  var r=lerpf(10,160 if e.kind=="toxin" else 38,progress)
  draw_arc(e.pos,r,0,TAU,32,Color(e.col.r,e.col.g,e.col.b,(1-progress)*0.65),1.3,true)
  if e.kind=="toxin": draw_circle(e.pos,r,Color(e.col.r,e.col.g,e.col.b,(1-progress)*0.08))
