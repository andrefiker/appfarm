extends SceneTree

func _initialize():call_deferred("run")

func run():
 var h=Habitat.new();root.add_child(h);await process_frame
 h.aim_mouse=false;h.active=false
 var deaths=0;var max_agents=0;var max_food=0;var target=h.player.position
 var start=Time.get_ticks_usec()
 for i in range(18000):
  if i%12==0:
   var closest=INF
   for f in h.food:
    var d=f.pos.distance_squared_to(h.player.position)
    if d<closest:closest=d;target=f.pos
  h.simulate(1.0/30,(target-h.player.position).normalized())
  if h.integrity<=0:deaths+=1;h.revive();h.active=false
  if Genome.can_reproduce(h.energy,h.dna,h.breed_cd):
   var next=h.genome.duplicate(true)
   if next.parts.size()<12:next.parts.append(Genome.part("photo" if h.generation%2==0 else "cilia",float(h.generation)*2.4))
   h.evolve(next,"soak-test variation")
  max_agents=maxi(max_agents,h.agents.size());max_food=maxi(max_food,h.food.size())
  if i%900==0:await process_frame
 var valid=Genome.valid(h.genome) and is_finite(h.energy) and is_finite(h.player.position.x)
 var passed=valid and deaths<=3 and h.generation>=3 and max_agents<=105 and max_food<=1050 and h.ecology.epoch>=74
 var result={"passed":passed,"simulated_seconds":600,"generations":h.generation,"deaths":deaths,"max_agents":max_agents,"max_food":max_food,"species":h.ecology.species.size(),"ecology_epochs":h.ecology.epoch,"mean_tick_ms":float(Time.get_ticks_usec()-start)/18000000.0}
 print("SOAK_RESULT ",JSON.stringify(result))
 DirAccess.make_dir_recursive_absolute("user://qa")
 var f=FileAccess.open("user://qa/soak-results.json",FileAccess.WRITE);f.store_string(JSON.stringify(result,"  "));f.close()
 h.queue_free();await process_frame;quit(0 if passed else 1)
