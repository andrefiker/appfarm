class_name Ecology
extends RefCounted

const ZONES = ["Sunlit shallows","Algal bloom","Open water","Detritus field","Thermal vent","Deep dark"]
const WORLD = Vector2(8400,6400)
var rng = RandomNumberGenerator.new()
var species:Array = []
var resources:Array = [1.1,1.4,0.75,1.0,0.8,0.55]
var event = "Quiet water"
var event_zone = 0
var event_left = 0.0
var epoch = 0
var logbook:Array = []

func _init(seed_value:int=81473):
 rng.seed = seed_value
 var names = ["Glass lace","Amber grazer","Ribbon hunter","Silt lantern","Crown drifter","Violet lancet","Vent spindle","Moss raft","Needle leech","Blue pilgrim"]
 var diets = ["filter","filter","predator","scavenger","photo","predator","filter","photo","parasite","symbiont"]
 var zones = [0,1,2,3,0,5,4,1,3,2]
 var sizes = [17,25,36,26,29,46,32,37,16,24]
 var hues = [0.43,0.12,0.035,0.58,0.28,0.75,0.065,0.35,0.9,0.52]
 for i in range(10):
  var g = {"size":float(sizes[i]),"aspect":rng.randf_range(0.85,1.6),"hue":hues[i],"pattern":i%3,"parts":[]}
  g.parts.append(Genome.part("flagellum" if i%2==0 else "cilia",PI))
  match diets[i]:
   "predator": g.parts.append(Genome.part("jaw",0)); g.parts.append(Genome.part("spike",0.7)); g.parts.append(Genome.part("eye",-0.8))
   "photo": g.parts.append(Genome.part("photo",0.5)); g.parts.append(Genome.part("photo",-0.5)); g.parts.append(Genome.part("fin",PI/2))
   "scavenger": g.parts.append(Genome.part("filter",0)); g.parts.append(Genome.part("chemo",-0.7))
   "parasite": g.parts.append(Genome.part("parasite",0)); g.parts.append(Genome.part("chemo",0.8))
   "symbiont": g.parts.append(Genome.part("symbiont",0)); g.parts.append(Genome.part("filter",-0.5))
   _: g.parts.append(Genome.part("filter",0))
  if i==1: g.parts.append(Genome.part("armor",PI/2))
  species.append({"id":i,"parent":-1,"name":names[i],"diet":diets[i],"zone":zones[i],"genome":g,"population":180.0 if diets[i] not in ["predator","parasite"] else 48.0,"speed":1.0,"attack":1.0,"generation":1,"kills":0,"pressure":0.0,"aggression":0.9 if diets[i]=="predator" else 0.1,"births":0,"extinct":false})

static func zone(p:Vector2) -> int:
 if p.y<2100: return 0 if p.x<4200 else 1
 if p.y<4200: return 2 if p.x<4200 else 3
 return 4 if p.x<4200 else 5

static func light(p:Vector2) -> float:
 return clampf(1.1-p.y/5900.0,0.03,1.0)*(0.6 if zone(p)==1 else 1.0)

func report_kill(id:int, by_player:bool=false):
 if id<0 or id>=species.size(): return
 var s = species[id]
 s.population = maxf(0,s.population-1.0)
 s.pressure += 1.7 if by_player else 0.6
 s.kills += 1

func tick(dt:float):
 epoch += 1
 if event_left>0:
  event_left = maxf(0,event_left-dt)
  if event_left==0: event="Quiet water"
 elif epoch%10==0:
  event_zone=rng.randi_range(0,5)
  event=["Nutrient bloom","Cold current","Toxic bloom","Long shadow","Nutrient collapse"][rng.randi_range(0,4)]
  event_left=72.0
  logbook.push_front(event+" · "+ZONES[event_zone])
  logbook=logbook.slice(0,10)
 for z in range(6):
  var target = [1.1,1.4,0.75,1.0,0.8,0.55][z]
  if event_zone==z and event_left>0:
   if event=="Nutrient bloom": target*=2.1
   if event in ["Toxic bloom","Nutrient collapse"]: target*=0.3
  resources[z]=lerpf(resources[z],float(target),0.28)
 var before=species.duplicate(true)
 for s in species:
  if s.extinct: continue
  var prey=0.0
  var predators=0.0
  var competition=0.0
  var armored=0.0
  for other in before:
   if other.zone!=s.zone: continue
   if other.diet in ["predator","parasite"]: predators+=other.population
   else: prey+=other.population; armored+=other.population*Genome.stats(other.genome).defense
   if other.diet==s.diet: competition+=other.population
  var capacity=260.0*resources[s.zone]
  var rate=0.08*(1.0-competition/maxf(20,capacity))-predators*0.00024
  if s.diet in ["predator","parasite"]:
   rate=0.11*(prey/(prey+95.0))-0.043-competition*0.00040
  if s.diet=="scavenger": rate+=predators*0.00013
  if event=="Toxic bloom" and event_zone==s.zone: rate-=0.065
  if event=="Cold current" and event_zone==s.zone: rate-=0.025
  if event=="Long shadow" and event_zone==s.zone and s.diet=="photo": rate-=0.09
  var births=maxf(0.0,s.population*maxf(0,rate))
  s.population=clampf(s.population*(1.0+rate*dt/8.0),0.0,500.0)
  s.births+=births
  # Selection acts on inherited species traits at reproduction, not every frame.
  if s.births>=12.0 or epoch%5==0:
   s.births=0; s.generation+=1
   if s.pressure>1.0 and s.diet not in ["predator","parasite"]:
    s.speed=minf(1.75,s.speed+minf(0.10,s.pressure*0.012))
    s.genome.aspect=minf(1.9,s.genome.aspect+0.025)
   if s.diet=="predator" and prey>0: s.attack=minf(1.8,s.attack+armored/prey*0.05)
   s.pressure*=0.65
  if s.population<1.0:
   s.population=0; s.extinct=true; logbook.push_front(s.name+" went extinct")
 # Successful lineages occasionally divide into an inherited local variant.
 if epoch%25==0 and species.size()<16:
  var viable=species.filter(func(s): return s.population>150 and not s.extinct)
  if not viable.is_empty():
   var parent=viable[rng.randi_range(0,viable.size()-1)]
   var child=parent.duplicate(true)
   child.id=species.size(); child.parent=parent.id; child.name=parent.name+" / delta"
   child.zone=(parent.zone+2)%6; child.population=parent.population*0.18
   parent.population*=0.82; child.genome.hue=fmod(child.genome.hue+0.055,1.0)
   child.genome.parts.append(Genome.part("cilia",-PI/2))
   species.append(child); logbook.push_front(child.name+" colonized "+ZONES[child.zone])
 logbook=logbook.slice(0,10)

func snapshot() -> Dictionary:
 return {"species":species.duplicate(true),"resources":resources.duplicate(),"event":event,"event_zone":event_zone,"event_left":event_left,"epoch":epoch,"logbook":logbook.duplicate(),"rng":rng.state}

func restore(d:Dictionary):
 species=d.species; resources=d.resources; event=d.event; event_zone=d.event_zone; event_left=d.event_left; epoch=d.epoch; logbook=d.logbook; rng.state=d.rng
