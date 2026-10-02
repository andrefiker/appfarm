extends SceneTree

func _initialize():call_deferred("run")

func percentile(samples:Array,fraction:float) -> float:
 samples.sort()
 return float(samples[mini(samples.size()-1,int(samples.size()*fraction))])

func run():
 var game=load("res://main.tscn").instantiate();root.add_child(game)
 await process_frame
 game.start_new();game.habitat.active=false
 var simulation=[]
 for i in range(600):
  var start=Time.get_ticks_usec()
  game.habitat.simulate(1.0/60.0,Vector2.RIGHT)
  simulation.append(float(Time.get_ticks_usec()-start)/1000.0)
  if i%100==99:await process_frame
 game.habitat.active=true
 for i in range(45):await process_frame
 var frames=[];var process=[];var physics=[]
 var before=Time.get_ticks_usec()
 for i in range(150):
  await process_frame
  frames.append(float(Time.get_ticks_usec()-before)/1000.0)
  process.append(Performance.get_monitor(Performance.TIME_PROCESS)*1000.0)
  physics.append(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS)*1000.0)
  before=Time.get_ticks_usec()
 var total=0.0;var sim_total=0.0;var proc_total=0.0;var phys_total=0.0
 for n in frames:total+=n
 for n in simulation:sim_total+=n
 for n in process:proc_total+=n
 for n in physics:phys_total+=n
 print("PERF_RESULT ",JSON.stringify({"sim_ms_mean":sim_total/simulation.size(),"sim_ms_p95":percentile(simulation,0.95),"frame_ms_mean":total/frames.size(),"frame_ms_p95":percentile(frames,0.95),"fps":1000.0*frames.size()/total,"process_ms":proc_total/process.size(),"physics_ms":phys_total/physics.size(),"agents":game.habitat.agents.size(),"food":game.habitat.food.size(),"window":str(DisplayServer.window_get_size())}))
 game.audio.shutdown();call_deferred("quit")
