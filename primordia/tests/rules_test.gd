extends SceneTree
var passed=0
var failed=0

func check(value:bool,message:String):
 if value:passed+=1;print("PASS ",message)
 else:failed+=1;push_error("FAIL "+message)

func _initialize():call_deferred("run")

func run():
 var g=Genome.starter()
 check(Genome.valid(g),"starter genome is valid")
 check(Genome.cost(Genome.part("jaw",0,1.2))==6,"scaled mutation costs round up")
 var basic=Genome.stats(g);g.parts.append(Genome.part("flagellum",2.8))
 check(Genome.stats(g).speed>basic.speed,"flagellum adds real thrust")
 check(Genome.stats(g).metabolism>basic.metabolism,"flagellum has metabolic cost")
 g=Genome.starter();g.parts.append(Genome.part("armor",1.4))
 check(Genome.stats(g).defense>basic.defense and Genome.stats(g).speed<basic.speed,"armor trades speed for defense")
 check(Genome.damage(20,0.5)==10,"defense mitigates damage")
 check(Genome.damage(-10,0.2)==0,"negative attacks cannot heal")
 check(not Genome.can_reproduce(59,18),"reproduction rejects insufficient energy")
 check(not Genome.can_reproduce(60,17.9),"reproduction rejects insufficient mutation")
 check(not Genome.can_reproduce(60,18,1),"reproduction respects membrane cooldown")
 check(Genome.can_reproduce(60,18),"reproduction accepts threshold boundary")
 g.size=500;check(not Genome.valid(g),"invalid body size rejected")
 g=Genome.starter();g.parts[0].kind="untrusted";check(not Genome.valid(g),"unknown structure rejected")
 check(Ecology.zone(Vector2(100,100))==0 and Ecology.zone(Vector2(6000,5500))==5,"connected biome boundaries")
 var e=Ecology.new(42);var same=Ecology.new(42)
 check(e.snapshot()==same.snapshot(),"procedural species are reproducible by seed")
 var speed=e.species[0].speed
 for i in range(12):e.report_kill(0,true)
 for i in range(5):e.tick(8)
 check(e.species[0].speed>speed,"hunting pressure selects inherited prey speed")
 var starvation=Ecology.new(11)
 for s in starvation.species:
  if s.zone==2 and s.diet!="predator":s.population=0;s.extinct=true
 var predator_start=starvation.species[2].population
 for i in range(10):starvation.tick(8)
 check(starvation.species[2].population<predator_start,"predators decline without prey")
 var event_test=Ecology.new(5);event_test.event="Nutrient collapse";event_test.event_zone=0;event_test.event_left=50
 event_test.tick(8);check(event_test.resources[0]<1.1,"resource event changes ecology")
 for i in range(160):e.tick(8)
 var sane=true
 for s in e.species:sane=sane and s.population>=0 and s.population<=500 and Genome.valid(s.genome)
 check(sane,"long ecology run remains bounded")
 check(e.species.size()>10 and e.species.size()<=16,"successful species branch with bounded diversity")
 var h=Habitat.new();root.add_child(h);await process_frame
 h.aim_mouse=false
 var old_energy=h.energy;h.simulate(1.0,Vector2.ZERO)
 check(h.energy<old_energy,"basal metabolism consumes energy")
 h.food.clear();h.energy=20;h.dna=0;h.add_food(h.player.position,"nutrient");h.simulate(0.01,Vector2.ZERO)
 check(h.energy>20 and h.dna>0,"actual contact feeding yields energy and mutation")
 var initial_position=h.player.position
 for i in range(60):h.simulate(1.0/60,Vector2.RIGHT)
 check(h.player.position.x>initial_position.x+30,"swimming integrates real displacement")
 h.active=true;h.energy=50;h.primary();check(h.energy==43 and h.attack_cd>0,"burst consumes energy and sets cooldown")
 var count=h.lineage.size();h.evolve(Genome.starter(),"test")
 check(h.generation==2 and h.lineage.size()==count+1 and h.dna==0,"reproduction preserves ancestry and resets progress")
 var snap=h.snapshot();var path="user://test-lineage.save"
 check(SaveStore.write(snap,path),"transactional save writes successfully")
 var loaded=SaveStore.read(path)
 check(loaded.genome==snap.genome and loaded.ecology==snap.ecology and loaded.position==snap.position,"save roundtrip preserves genome and ecosystem")
 h.restore(loaded);check(h.agents.size()==snap.agents.size(),"live organism state restores")
 check(SaveStore.write(snap,path),"second save preserves backup")
 var f=FileAccess.open(path,FileAccess.WRITE);f.store_string("broken");f.close()
 check(not SaveStore.read(path).is_empty(),"corrupt primary falls back to last good save")
 h.dna=20;h.revive();check(h.integrity==100 and h.dna==13 and h.generation==2,"death retains established lineage, loses some loose mutation")
 h.queue_free();await process_frame
 print("RESULT ",passed," passed, ",failed," failed")
 quit(1 if failed else 0)
