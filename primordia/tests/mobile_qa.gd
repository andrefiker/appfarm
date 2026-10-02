extends Node
var game
var checks=[]
var failures=[]
var out="user://mobile-qa"

func check(value:bool,message:String):
 checks.append({"name":message,"passed":value})
 if not value:failures.append(message);push_error("MOBILE FAIL "+message)
 else:print("MOBILE PASS "+message)

func frames(n:int=3):
 for i in range(n):await get_tree().process_frame

func click(pos:Vector2):
 var motion=InputEventMouseMotion.new();motion.position=pos;get_viewport().push_input(motion,true)
 for pressed in [true,false]:
  var e=InputEventMouseButton.new();e.position=pos;e.button_index=MOUSE_BUTTON_LEFT;e.pressed=pressed
  get_viewport().push_input(e,true);await frames(2)

func touch(index:int,pos:Vector2,pressed:bool=true,canceled:bool=false):
 var e=InputEventScreenTouch.new();e.index=index;e.position=pos;e.pressed=pressed;e.canceled=canceled
 get_viewport().push_input(e,true)
 await frames(2)

func drag(index:int,pos:Vector2):
 var e=InputEventScreenDrag.new();e.index=index;e.position=pos
 get_viewport().push_input(e,true);await frames(2)

func shot(name:String):
 await frames(3);await RenderingServer.frame_post_draw
 get_viewport().get_texture().get_image().save_png(out+"/"+name+".png")

func finish():
 var f=FileAccess.open(out+"/results.json",FileAccess.WRITE)
 f.store_string(JSON.stringify({"checks":checks,"failures":failures,"window":str(DisplayServer.window_get_size()),"engine":Engine.get_version_info().string},"  "));f.close()
 print("MOBILE_RESULT ",JSON.stringify({"checks":checks.size(),"failures":failures,"path":ProjectSettings.globalize_path(out)}))
 game.audio.shutdown();get_tree().call_deferred("quit",0 if failures.is_empty() else 1)

func run(root):
 game=root;DirAccess.make_dir_recursive_absolute(out)
 await frames(10);await shot("01-title")
 check(game.mode=="title" and game.mobile_ui!=null,"phone title launches")
 if "--qa-mobile-resume" in OS.get_cmdline_user_args():
  var saved=SaveStore.read()
  await click(Vector2(275,434))
  check(game.mode=="play","Continue restores saved phone game after restart")
  check(game.habitat.genome==saved.get("genome",{}),"anatomy survives full process restart")
  check(game.habitat.generation==saved.get("generation",-1),"generation survives full process restart")
  check(game.habitat.ecology.epoch>=saved.get("ecology",{}).get("epoch",0),"ecosystem survives full process restart")
  await shot("11-restored");finish();return
 await click(Vector2(275,335))
 if game.mode=="confirm":await click(Vector2(880,475))
 check(game.mode=="play","large New Organism button starts game")
 if game.mode!="play":finish();return
 var h=game.habitat
 var pad=game.mobile_ui.pad
 var origin=h.player.position
 await touch(0,pad.joystick+Vector2(70,0))
 for i in range(50):await get_tree().physics_frame
 check(h.player.position.x>origin.x+20,"finger on swim pad moves organism")
 await touch(1,pad.primary_pos)
 check(h.attack_cd>0 and pad.move_finger==0 and h.touch_direction.x>0.5,"second finger activates primary while swimming")
 await touch(1,pad.primary_pos,false)
 await touch(2,pad.secondary_pos)
 check(h.secondary_cd>0 and pad.move_finger==0,"third finger activates escape without losing movement")
 await touch(2,pad.secondary_pos,false)
 await drag(0,pad.joystick+Vector2(0,70))
 check(h.touch_direction.y>0.5 and absf(h.touch_direction.x)<0.01,"drag changes swim direction")
 await touch(0,Vector2.ZERO,false,true)
 check(h.touch_direction==Vector2.ZERO and pad.move_finger==-1,"canceled touch clears held movement")
 await shot("02-swimming")
 await touch(0,pad.joystick+Vector2(60,0))
 game._notification(NOTIFICATION_APPLICATION_PAUSED)
 await frames(3)
 check(game.mode=="pause" and h.touch_direction==Vector2.ZERO,"backgrounding pauses and clears all held controls")
 check(not SaveStore.read().is_empty(),"backgrounding saves local progress")
 await click(Vector2(705,165))
 check(game.mode=="play","Resume button returns to habitat")
 # First evolution is reached by feeding in the real simulation.
 h.active=false;h.aim_mouse=false
 var steps=0
 while h.dna<20 and steps<18000 and h.integrity>0:
  var best=Vector2.INF;var distance=INF
  for food in h.food:
   var d=h.player.position.distance_squared_to(food.pos)
   if d<distance:distance=d;best=food.pos
  if best==Vector2.INF:break
  h.simulate(1.0/60,(best-h.player.position).normalized());steps+=1
  if steps%240==0:await frames(1)
 check(Genome.can_reproduce(h.energy,h.dna,h.breed_cd),"feeding unlocks evolution naturally on mobile")
 await click(Vector2(630,640))
 check(game.mode=="editor","Evolve button opens touch editor")
 if game.mode!="editor":finish();return
 var before=game.draft.parts.size()
 await click(Vector2(195,237))
 await click(Vector2(720,450))
 check(game.draft.parts.size()>before,"palette and canvas taps add structures")
 var selected=game.selected_part
 if selected>=0:
  var old=game.draft.parts[selected].size
  await click(Vector2(1297,529))
  check(game.draft.parts[selected].size>old,"Larger button changes selected part")
  old=game.draft.parts[selected].rotation
  await click(Vector2(1297,445))
  check(game.draft.parts[selected].rotation>old,"Rotate button changes selected part")
 await click(Vector2(254,650))
 var aspect=game.draft.aspect
 await click(Vector2(864,385));await click(Vector2(705,520))
 check(game.mode=="editor" and game.draft.aspect>aspect,"body proportions return safely to draft")
 var original=game.draft.duplicate(true)
 game.draft.size=66;game.draft.aspect=1.9;game._editor_refresh()
 var extent=game.preview_extent(game.draft)*game.editor_scale
 check(extent.x<=279 and extent.y<=149,"large evolved anatomy stays inside phone editor")
 game.draft=original;game._editor_refresh()
 await shot("03-editor")
 await click(Vector2(1240,650))
 check(game.mode=="play" and h.generation==2,"Reproduce commits descendant anatomy")
 check(h.genome.parts.size()>before,"descendant retains added structures")
 await shot("04-descendant")
 await click(Vector2(880,640));await shot("05-species")
 check(game.mode=="index","Species button opens phone index")
 game.mobile_ui.back();game.show_lineage();await shot("06-lineage")
 check(h.lineage.size()==2 and game.mode=="lineage","phone lineage records both generations")
 game.mobile_ui.back();game.show_map();await shot("07-map")
 game.mobile_ui.back();game.show_pause();await shot("08-pause")
 await click(Vector2(705,428));await shot("09-settings")
 check(game.mode=="settings","pause menu opens phone settings")
 var previous=game.settings.left_handed
 await click(Vector2(714,366))
 check(game.settings.left_handed!=previous,"handedness setting toggles")
 await click(Vector2(705,578));await click(Vector2(705,165))
 check(game.mobile_ui.pad.joystick.x<720 if previous else game.mobile_ui.pad.joystick.x>720,"swim pad moves to chosen side")
 await shot("10-mirrored-controls")
 game.settings.left_handed=previous;game.save_settings();game.show_pause()
 var saved=SaveStore.read()
 check(saved.get("genome",{})==h.genome and saved.get("generation",0)==2,"phone autosave preserves edited anatomy")
 finish()
