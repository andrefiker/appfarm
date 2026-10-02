extends Node
var checks=[]
var failures=[]
var game
var out="user://qa"

func check(value:bool,message:String):
 checks.append({"name":message,"passed":value})
 if not value:failures.append(message);push_error("QA FAIL "+message)
 else:print("QA PASS "+message)

func frames(n:int=3):
 for i in range(n):await get_tree().process_frame

func click(pos:Vector2):
 pos=pos*Vector2(DisplayServer.window_get_size())/Vector2(1440,900)
 var motion=InputEventMouseMotion.new();motion.position=pos;Input.parse_input_event(motion)
 for pressed in [true,false]:
  var e=InputEventMouseButton.new();e.position=pos;e.button_index=MOUSE_BUTTON_LEFT;e.pressed=pressed;Input.parse_input_event(e)
  await frames(2)

func key(code:int,pressed:bool=true):
 var e=InputEventKey.new();e.physical_keycode=code;e.keycode=code;e.pressed=pressed;Input.parse_input_event(e)
 await frames(2)

func shot(name:String):
 await frames(5);await RenderingServer.frame_post_draw
 get_viewport().get_texture().get_image().save_png(out+"/"+name+".png")

func run(root):
 game=root;DirAccess.make_dir_recursive_absolute(out)
 await frames(10);await shot("01-title")
 check(game.mode=="title","title launches")
 await click(Vector2(220,407))
 if game.mode=="title":await click(Vector2(831,506))
 await frames(5);check(game.mode=="play","new organism button starts game")
 var h=game.habitat
 var origin=h.player.position
 await key(KEY_D)
 for i in range(75):await get_tree().physics_frame
 await key(KEY_D,false)
 check(h.player.position.x>origin.x+30,"keyboard input moves organism")
 await key(KEY_SPACE);await key(KEY_SPACE,false)
 check(h.attack_cd>0,"primary ability responds to key")
 await shot("02-swimming")
 # Play by steering to real food in the real simulation; no mutation injection.
 h.active=false;h.aim_mouse=false
 var steps=0
 var t0=Time.get_ticks_usec()
 while h.dna<20 and steps<18000 and h.integrity>0:
  var best=Vector2.INF;var distance=INF
  for food in h.food:
   var d=h.player.position.distance_squared_to(food.pos)
   if d<distance:distance=d;best=food.pos
  if best==Vector2.INF:break
  h.simulate(1.0/60,(best-h.player.position).normalized())
  steps+=1
  if steps%240==0:await frames(1)
 var cpu_ms=float(Time.get_ticks_usec()-t0)/1000.0/maxi(1,steps)
 check(h.dna>=18 and h.energy>=60,"feeding reaches first reproduction naturally")
 check(h.playtime<600,"first evolution is available within ten minutes")
 h.active=true
 await key(KEY_E);await key(KEY_E,false)
 check(game.mode=="editor","E opens editor at biological threshold")
 if game.mode=="editor":
  var before=game.draft.parts.size()
  await click(Vector2(160,309))
  await click(Vector2(710,540))
  check(game.draft.parts.size()>before,"palette and membrane click add real structures")
  var selected=game.selected_part
  var part_pos=game.editor_origin+game.editor_preview.attachment(game.draft.parts[selected])*game.editor_scale
  await click(part_pos)
  var previous_size=game.draft.parts[selected].size
  await click(Vector2(1320,598))
  check(game.draft.parts[selected].size>previous_size,"selected anatomical part can be resized")
  var original=game.draft.duplicate(true)
  game.draft.size=66;game.draft.aspect=1.9;game._editor_refresh()
  var extent=game.preview_extent(game.draft)*game.editor_scale
  check(extent.x<=311 and extent.y<=186,"mature morphology remains inside editor canvas")
  game.draft=original;game._editor_refresh()
  await shot("03-evolution-editor")
  await click(Vector2(1260,842))
  check(game.mode=="play" and h.generation==2,"reproduction commits editor anatomy")
  check(h.genome.parts.size()>before,"descendant physically retains added structures")
 await shot("04-descendant")
 await key(KEY_I);await key(KEY_I,false);await shot("05-species")
 check(game.mode=="index","species index opens")
 await key(KEY_ESCAPE);await key(KEY_ESCAPE,false)
 await key(KEY_L);await key(KEY_L,false);await shot("06-lineage")
 check(game.mode=="lineage" and h.lineage.size()==2,"lineage records both morphologies")
 await key(KEY_ESCAPE);await key(KEY_ESCAPE,false)
 await key(KEY_M);await key(KEY_M,false);await shot("07-habitat")
 check(game.mode=="map","habitat map opens")
 await key(KEY_ESCAPE);await key(KEY_ESCAPE,false)
 game.show_pause();await shot("08-pause")
 var saved=SaveStore.read()
 check(not saved.is_empty() and saved.generation==h.generation,"pause persists local lineage")
 var f=FileAccess.open(out+"/results.json",FileAccess.WRITE)
 f.store_string(JSON.stringify({"checks":checks,"failures":failures,"simulation_cpu_ms_per_tick":cpu_ms,"first_evolution_seconds":h.playtime,"engine":Engine.get_version_info().string,"os":OS.get_name(),"renderer":RenderingServer.get_video_adapter_name()},"  "));f.close()
 print("QA_RESULT ",JSON.stringify({"checks":checks.size(),"failures":failures,"cpu_ms":cpu_ms,"path":ProjectSettings.globalize_path(out)}))
 get_tree().call_deferred("quit",0 if failures.is_empty() else 1)

func run_resume(root):
 game=root;DirAccess.make_dir_recursive_absolute(out)
 await frames(10)
 var saved=SaveStore.read()
 check(not saved.is_empty(),"saved lineage available after full process restart")
 await click(Vector2(220,477));await frames(5)
 check(game.mode=="play","Continue restores saved game")
 check(game.habitat.generation==saved.get("generation",-1),"generation persists across launch")
 check(game.habitat.genome==saved.get("genome",{}),"edited anatomy persists across launch")
 check(game.habitat.ecology.epoch>=saved.get("ecology",{}).get("epoch",0),"ecosystem state persists across launch")
 check(game.habitat.player.position.distance_to(saved.get("position",Vector2.ZERO))<25,"saved location persists across launch")
 await shot("09-continued")
 await key(KEY_F11);await key(KEY_F11,false);await frames(10)
 check(DisplayServer.window_get_mode()==DisplayServer.WINDOW_MODE_FULLSCREEN,"fullscreen keyboard toggle")
 await shot("10-fullscreen")
 await key(KEY_F11);await key(KEY_F11,false);await frames(10)
 check(DisplayServer.window_get_mode()==DisplayServer.WINDOW_MODE_WINDOWED,"windowed keyboard toggle")
 await key(KEY_ESCAPE);await key(KEY_ESCAPE,false)
 check(game.mode=="pause","Escape pauses gameplay")
 var f=FileAccess.open(out+"/resume-results.json",FileAccess.WRITE)
 f.store_string(JSON.stringify({"checks":checks,"failures":failures,"os":OS.get_name()},"  "));f.close()
 print("RESUME_QA ",JSON.stringify({"checks":checks.size(),"failures":failures}))
 get_tree().call_deferred("quit",0 if failures.is_empty() else 1)
