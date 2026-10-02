class_name SaveStore
extends RefCounted

const PATH = "user://lineage.save"
const MAGIC = "PRIMORDIA/1"

static func write(data:Dictionary, path:String=PATH) -> bool:
 var bytes=var_to_bytes(data)
 var hash=HashingContext.new()
 hash.start(HashingContext.HASH_SHA256); hash.update(bytes)
 var f=FileAccess.open(path+".tmp",FileAccess.WRITE)
 if f==null: return false
 f.store_line(MAGIC); f.store_line(hash.finish().hex_encode()); f.store_buffer(bytes); f.flush(); f.close()
 if read_one(path+".tmp").is_empty(): return false
 var exists=FileAccess.file_exists(path)
 if exists:
  if FileAccess.file_exists(path+".bak"): DirAccess.remove_absolute(path+".bak")
  if DirAccess.rename_absolute(path,path+".bak")!=OK: return false
 if DirAccess.rename_absolute(path+".tmp",path)!=OK:
  if exists: DirAccess.rename_absolute(path+".bak",path)
  return false
 return true

static func read_one(path:String) -> Dictionary:
 if not FileAccess.file_exists(path): return {}
 var f=FileAccess.open(path,FileAccess.READ)
 if f==null or f.get_length()>8000000: return {}
 if f.get_line()!=MAGIC: return {}
 var expected=f.get_line()
 var bytes=f.get_buffer(f.get_length()-f.get_position())
 var hash=HashingContext.new(); hash.start(HashingContext.HASH_SHA256); hash.update(bytes)
 if hash.finish().hex_encode()!=expected: return {}
 var data=bytes_to_var(bytes)
 if not data is Dictionary or data.get("schema",0)!=1: return {}
 if not data.has_all(["genome","generation","energy","integrity","position","ecology","lineage","discovered","history","dna","playtime"]): return {}
 if not data.genome is Dictionary or not Genome.valid(data.genome): return {}
 if not data.position is Vector2 or not is_finite(data.position.x) or not is_finite(data.position.y): return {}
 if not data.ecology is Dictionary or not data.ecology.has_all(["species","resources","event","event_zone","event_left","epoch","logbook","rng"]): return {}
 if not data.ecology.species is Array or data.ecology.species.size()<1 or data.ecology.species.size()>16: return {}
 for s in data.ecology.species:
  if not s is Dictionary or not s.has_all(["genome","id","zone","population","diet","name","speed","attack","generation","births","pressure","extinct"]): return {}
  if not Genome.valid(s.genome): return {}
 if not data.lineage is Array or not data.discovered is Array or not data.history is Dictionary: return {}
 return data

static func read(path:String=PATH) -> Dictionary:
 var data=read_one(path)
 return data if not data.is_empty() else read_one(path+".bak")
