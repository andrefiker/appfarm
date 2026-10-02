class_name Genome
extends RefCounted

# Every structure has a physical location, orientation and scale. Stats are
# derived rather than saved, so the editor and simulation cannot disagree.
const PARTS = {
 "flagellum": {"name":"Flagellum", "cost":4, "hint":"Strong propulsion · burns more energy", "speed":38.0,"turn":-0.12,"metabolism":0.15},
 "cilia": {"name":"Ciliary fan", "cost":3, "hint":"Fine steering · modest thrust", "speed":12.0,"turn":0.75,"metabolism":0.06},
 "fin": {"name":"Membrane fin", "cost":3, "hint":"Efficient turning · broader body", "speed":5.0,"turn":0.6,"defense":0.02},
 "spike": {"name":"Silica spine", "cost":4, "hint":"Contact damage · creates drag", "speed":-7.0,"attack":9.0,"defense":0.03},
 "armor": {"name":"Mineral plate", "cost":5, "hint":"Resists impacts · heavy and slow", "speed":-13.0,"turn":-0.20,"defense":0.13,"mass":0.2},
 "toxin": {"name":"Toxin vesicle", "cost":6, "hint":"Shift: toxic discharge · 18 energy", "attack":4.0,"metabolism":0.10},
 "eye": {"name":"Photoreceptor", "cost":3, "hint":"Extends the visible world", "senses":160.0},
 "chemo": {"name":"Chemical antenna", "cost":3, "hint":"Smell food and carrion beyond sight", "senses":80.0},
 "filter": {"name":"Filter crown", "cost":3, "hint":"Draws in nutrients · efficient grazing", "filter":0.65,"speed":-3.0},
 "jaw": {"name":"Predatory jaw", "cost":5, "hint":"Space: directional bite · costly hunting", "attack":22.0,"metabolism":0.10},
 "photo": {"name":"Chloroplast", "cost":4, "hint":"Harvests light · little use in the deep", "photo":1.1},
 "fat": {"name":"Lipid reserve", "cost":3, "hint":"More stored energy · extra inertia", "energy":32.0,"mass":0.15,"speed":-4.0},
 "regen": {"name":"Repair tissue", "cost":5, "hint":"Restores integrity · consumes energy", "regen":1.3,"metabolism":0.12},
 "parasite": {"name":"Anchoring hook", "cost":5, "hint":"Shift near a larger host: attach and drain", "attack":3.0,"speed":-3.0},
 "symbiont": {"name":"Symbiotic chamber", "cost":4, "hint":"Shares energy near peaceful species", "symbiosis":0.8,"speed":-3.0}
}

static func part(kind:String, angle:float, size:float=1.0) -> Dictionary:
 return {"kind":kind,"angle":angle,"size":size,"rotation":0.0,"radial":1.0}

static func starter() -> Dictionary:
 return {"hue":0.43,"aspect":1.12,"size":22.0,"pattern":0,"parts":[part("flagellum",PI),part("filter",0.0)]}

static func stats(g:Dictionary) -> Dictionary:
 var s = {"speed":100.0,"turn":2.7,"attack":5.0,"defense":0.03,"energy":100.0,"senses":390.0,"mass":1.0,"metabolism":0.40,"filter":0.5,"photo":0.0,"regen":0.35,"symbiosis":0.0}
 for p in g.parts:
  if not PARTS.has(p.kind): continue
  for k in s:
   s[k] += float(PARTS[p.kind].get(k,0.0))*float(p.size)
 var size_factor = float(g.size)/22.0
 s.mass *= size_factor*size_factor
 s.speed *= (0.82+0.18*float(g.aspect))/pow(size_factor,0.23)
 s.turn /= pow(size_factor,0.5)*(0.8+float(g.aspect)*0.2)
 s.energy *= pow(size_factor,0.45)
 s.attack *= pow(size_factor,0.65)
 s.speed = clampf(s.speed,45.0,270.0)
 s.turn = clampf(s.turn,0.8,7.0)
 s.defense = clampf(s.defense,0.0,0.72)
 return s

static func has(g:Dictionary, kind:String) -> bool:
 for p in g.parts:
  if p.kind == kind: return true
 return false

static func cost(p:Dictionary) -> int:
 return int(ceil(PARTS[p.kind].cost*float(p.size)))

static func value(g:Dictionary) -> int:
 var n = 0
 for p in g.parts: n += cost(p)
 return n

static func can_reproduce(energy:float, dna:float, cooldown:float=0.0) -> bool:
 return energy >= 60.0 and dna >= 18.0 and cooldown <= 0.0

static func role(g:Dictionary) -> String:
 if has(g,"parasite"): return "Parasite"
 if has(g,"jaw") and has(g,"filter"): return "Omnivore"
 if has(g,"jaw"): return "Predator"
 if has(g,"symbiont"): return "Symbiont"
 if has(g,"photo"): return "Phototroph"
 return "Filter feeder"

static func damage(raw:float, defense:float) -> float:
 return maxf(0.0,raw)*(1.0-clampf(defense,0.0,0.72))

static func valid(g:Dictionary) -> bool:
 if not g.has_all(["hue","aspect","size","parts","pattern"]): return false
 if not g.parts is Array or g.parts.size()>24: return false
 if not is_finite(float(g.size)) or not float(g.size) >= 12.0 or not float(g.size) <= 90.0: return false
 if not float(g.aspect) >= 0.7 or not float(g.aspect) <= 1.9: return false
 if not float(g.hue) >= 0.0 or not float(g.hue) <= 1.0: return false
 for p in g.parts:
  if not p is Dictionary or not p.has_all(["kind","size","angle","rotation","radial"]): return false
  if not PARTS.has(p.kind) or float(p.size)<0.65 or float(p.size)>1.5: return false
  if not is_finite(float(p.angle)) or not is_finite(float(p.rotation)): return false
  if float(p.radial)<0.45 or float(p.radial)>1.25: return false
 return true

static func opportunities(history:Dictionary, g:Dictionary) -> Array:
 var choices = []
 if history.get("hunts",0)>2: choices.append(["jaw","A hunting ancestry: stronger jaws"])
 if history.get("light",0.0)>60: choices.append(["photo","Long days in sunlight: chloroplasts"])
 if history.get("damage",0.0)>20: choices.append(["armor","Surviving impacts: mineral plates"])
 if history.get("bursts",0)>3: choices.append(["flagellum","Repeated escapes: propulsion"])
 if history.get("carrion",0)>2: choices.append(["chemo","Carrion feeding: chemical receptors"])
 if choices.size()<3: choices.append(["cilia","A wandering lineage: fine control"])
 if choices.size()<3: choices.append(["symbiont","A new possibility: cooperation"])
 if choices.size()<3: choices.append(["regen","A new possibility: repair tissue"])
 return choices.slice(0,3)
