extends Node2D

const VERSION="1.0.0"
const INK=Color("e1efe5")
const MUTED=Color("81a29e")
const MINT=Color("a4e4ba")
const GOLD=Color("d8c795")
var habitat:Habitat
var audio:BioSound
var layer:CanvasLayer
var ui:Control
var water:ColorRect
var veil:ColorRect
var mode="title"
var previous_mode="title"
var hud_labels={}
var hud_bars={}
var toast:Label
var toast_time=0.0
var save_clock=0.0
var has_game=false
var status_message=""
var settings={"muted":false,"fullscreen":false,"reduced_motion":true,"mouse_aim":true}
var draft={}
var editor_preview:OrganismBody
var editor_origin=Vector2(700,431)
var editor_scale=4.1
var selected_part=-1
var selected_tool=""
var symmetry=true
var dragging=false
var budget=0
var base_value=0
var adaptation="Open variation"
var discount_kind=""
var editor_stats:Label
var editor_info:Label
var editor_budget:Label
var editor_commit:Button
var editor_hint:Label
var pending_new=false

func _ready():
 get_tree().auto_accept_quit=false
 var cfg=ConfigFile.new()
 if cfg.load("user://settings.cfg")==OK:
  for k in settings: settings[k]=cfg.get_value("preferences",k,settings[k])
 _background()
 habitat=Habitat.new(); add_child(habitat)
 habitat.message.connect(show_message); habitat.sound.connect(func(k):audio.cue(k)); habitat.death.connect(_died)
 audio=BioSound.new(); add_child(audio); audio.set_muted(settings.muted)
 layer=CanvasLayer.new(); layer.layer=10; add_child(layer)
 ui=Control.new(); ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); layer.add_child(ui)
 ui.mouse_filter=Control.MOUSE_FILTER_IGNORE
 _theme()
 habitat.aim_mouse=settings.mouse_aim
 if settings.fullscreen: DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
 show_title()
 if "--qa" in OS.get_cmdline_user_args(): call_deferred("_qa_run")

func _background():
 var bg=CanvasLayer.new(); bg.layer=-10; add_child(bg)
 water=ColorRect.new(); water.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); water.mouse_filter=Control.MOUSE_FILTER_IGNORE
 var material=ShaderMaterial.new(); material.shader=load("res://assets/water.gdshader"); water.material=material; bg.add_child(water)
 var fog=CanvasLayer.new(); fog.layer=2; add_child(fog)
 veil=ColorRect.new(); veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); veil.mouse_filter=Control.MOUSE_FILTER_IGNORE
 var vmat=ShaderMaterial.new(); vmat.shader=load("res://assets/veil.gdshader"); veil.material=vmat; fog.add_child(veil)

func _theme():
 var theme=Theme.new(); theme.default_font_size=18
 theme.set_color("font_color","Label",INK)
 for state in ["normal","hover","pressed","disabled","focus"]:
  var box=StyleBoxFlat.new()
  box.bg_color=Color("163a40") if state=="hover" else Color("0c272f")
  if state=="pressed": box.bg_color=Color("28554f")
  if state=="disabled": box.bg_color=Color("0c2027")
  box.border_color=Color("659489") if state=="focus" else Color("294a4c")
  box.set_border_width_all(1); box.set_corner_radius_all(6)
  box.content_margin_left=18; box.content_margin_right=18; box.content_margin_top=10; box.content_margin_bottom=10
  theme.set_stylebox(state,"Button",box)
 theme.set_color("font_color","Button",INK); theme.set_color("font_hover_color","Button",MINT)
 theme.set_color("font_disabled_color","Button",Color("506562"))
 theme.set_font_size("font_size","Button",17)
 ui.theme=theme

func clear_ui():
 for c in ui.get_children(): c.queue_free()
 hud_labels.clear(); hud_bars.clear(); editor_preview=null; toast=null
 # Remove queued controls immediately from input/layout before rebuilding.
 for c in ui.get_children(): ui.remove_child(c)

func label_text(text:String,pos:Vector2,size:int=18,color:Color=INK,parent:Node=null) -> Label:
 var l=Label.new(); l.text=text; l.position=pos; l.add_theme_font_size_override("font_size",size); l.add_theme_color_override("font_color",color); l.mouse_filter=Control.MOUSE_FILTER_IGNORE
 (ui if parent==null else parent).add_child(l); return l

func button(text:String,rect:Rect2,action:Callable,parent:Node=null) -> Button:
 var b=Button.new(); b.text=text; b.position=rect.position; b.size=rect.size; b.pressed.connect(action)
 b.mouse_default_cursor_shape=Control.CURSOR_POINTING_HAND
 (ui if parent==null else parent).add_child(b); return b

func panel(rect:Rect2,opacity:float=0.94) -> Panel:
 var p=Panel.new(); p.position=rect.position; p.size=rect.size; p.mouse_filter=Control.MOUSE_FILTER_STOP
 var style=StyleBoxFlat.new(); style.bg_color=Color(0.025,0.078,0.094,opacity); style.border_color=Color("274549"); style.set_border_width_all(1); style.set_corner_radius_all(10)
 p.add_theme_stylebox_override("panel",style); ui.add_child(p); return p

func rule(pos:Vector2,width:float):
 var line=ColorRect.new(); line.color=Color("31544f"); line.position=pos; line.size=Vector2(width,1); line.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(line)

func _specimen(g:Dictionary,pos:Vector2,zoom:float) -> OrganismBody:
 var b=OrganismBody.new(); b.genome=g.duplicate(true); b.position=pos; b.scale=Vector2.ONE*zoom; ui.add_child(b); return b

func show_title():
 mode="title"; habitat.active=false; clear_ui(); veil.visible=false
 label_text("A SMALL WORLD. AN UNWRITTEN LINEAGE.",Vector2(88,133),14,MINT)
 label_text("PRIMORDIA",Vector2(78,177),74)
 label_text("Become what survives.",Vector2(88,277),25,MUTED)
 rule(Vector2(90,344),410)
 var saved=not SaveStore.read().is_empty()
 button("NEW ORGANISM",Rect2(88,382,310,57),func():
  if saved or has_game: confirm_new()
  else: start_new())
 var cont=button("CONTINUE",Rect2(88,451,310,57),continue_game); cont.disabled=not saved and not has_game
 button("SETTINGS",Rect2(88,520,310,52),show_settings)
 button("QUIT",Rect2(88,584,310,52),quit_game)
 label_text("Swim. Feed. Change. Leave descendants.",Vector2(88,722),17,MUTED)
 label_text("OFFLINE ECOSYSTEM  /  v"+VERSION,Vector2(88,815),13,MUTED)
 var g=Genome.starter(); g.size=36; g.aspect=1.35; g.pattern=1; g.parts.append(Genome.part("cilia",1.2)); g.parts.append(Genome.part("photo",-0.8)); g.parts.append(Genome.part("chemo",0.7))
 var body=_specimen(g,Vector2(990,410),4.1); body.rotation=-0.3
 label_text("01  /  THE FIRST MEMBRANE",Vector2(811,673),13,MINT)
 label_text("No prescribed destination.\nOnly the consequences of your anatomy.",Vector2(811,708),18,MUTED)
 rule(Vector2(811,652),380)

func confirm_new():
 clear_ui(); panel(Rect2(420,260,600,330))
 label_text("Begin a new lineage?",Vector2(462,302),32)
 label_text("Your current autosave will be replaced.\nThe previous save is retained as a local backup.",Vector2(462,366),19,MUTED)
 button("KEEP MY LINEAGE",Rect2(462,480,244,52),show_title)
 button("NEW ORGANISM",Rect2(720,480,244,52),start_new)

func start_new():
 habitat.queue_free(); remove_child(habitat)
 habitat=Habitat.new(); add_child(habitat)
 habitat.message.connect(show_message); habitat.sound.connect(func(k):audio.cue(k)); habitat.death.connect(_died)
 habitat.aim_mouse=settings.mouse_aim; has_game=true; resume_game(); save_game(); show_message("WASD to swim · graze the golden particles · E when ready to evolve")

func continue_game():
 if not has_game:
  var d=SaveStore.read()
  if d.is_empty(): show_message("No readable local save"); return
  habitat.restore(d); has_game=true
  if habitat.integrity<=0: habitat.revive()
 resume_game()

func resume_game():
 mode="play"; clear_ui(); habitat.active=true; veil.visible=true; _hud()

func _bar(name:String,pos:Vector2,width:float,col:Color):
 var bg=ColorRect.new(); bg.position=pos; bg.size=Vector2(width,4); bg.color=Color("1c353b"); bg.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(bg)
 var fg=ColorRect.new(); fg.position=pos; fg.size=Vector2(width,4); fg.color=col; fg.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(fg)
 hud_bars[name]={"node":fg,"width":width}

func _hud():
 label_text("P R I M O R D I A",Vector2(36,25),17,MINT)
 hud_labels.energy=label_text("ENERGY",Vector2(36,60),13,MUTED); _bar("energy",Vector2(36,89),190,MINT)
 hud_labels.integrity=label_text("INTEGRITY",Vector2(258,60),13,MUTED); _bar("integrity",Vector2(258,89),150,Color("8fb5d0"))
 hud_labels.dna=label_text("MUTATION",Vector2(440,60),13,MUTED); _bar("dna",Vector2(440,89),160,GOLD)
 hud_labels.zone=label_text("",Vector2(1084,27),21)
 hud_labels.generation=label_text("",Vector2(1084,61),14,MUTED)
 button("II",Rect2(1368,27,42,44),show_pause)
 hud_labels.hint=label_text("WASD swim   ·   Mouse orient   ·   Space burst   ·   Shift escape",Vector2(36,817),15,MUTED)
 hud_labels.feed=label_text("Golden specks feed you. Gather 18 mutation and 60 energy to reproduce.",Vector2(36,850),14,MUTED)
 button("E  EVOLVE",Rect2(1116,826,170,44),open_editor)
 button("I  SPECIES",Rect2(915,826,182,44),show_index)
 button("L",Rect2(1300,826,48,44),show_lineage).tooltip_text="Lineage"
 button("M",Rect2(1362,826,48,44),show_map).tooltip_text="Habitat map"
 toast=label_text("",Vector2(420,126),19,MINT); toast.size=Vector2(600,50); toast.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER

func _process(dt):
 if not habitat or not is_instance_valid(habitat): return
 var pos=habitat.player.position
 water.material.set_shader_parameter("depth",clampf(pos.y/6400,0,1))
 water.material.set_shader_parameter("horizontal",pos.x/8400)
 var shadow=1.0 if habitat.ecology.event=="Long shadow" and habitat.ecology.event_zone==Ecology.zone(pos) else 0.0
 water.material.set_shader_parameter("darkness",shadow)
 veil.material.set_shader_parameter("sight",clampf(habitat.stats.senses*habitat.camera.zoom.x/780.0,0.48,1.2))
 veil.material.set_shader_parameter("aspect",1.6)
 if mode=="play":
  hud_labels.energy.text="ENERGY  %d / %d"%[habitat.energy,habitat.stats.energy]
  hud_labels.integrity.text="INTEGRITY  %d%%"%habitat.integrity
  hud_labels.dna.text="MUTATION  %d / 18"%habitat.dna
  hud_bars.energy.node.size.x=hud_bars.energy.width*clampf(habitat.energy/habitat.stats.energy,0,1)
  hud_bars.integrity.node.size.x=hud_bars.integrity.width*clampf(habitat.integrity/100.0,0,1)
  hud_bars.dna.node.size.x=hud_bars.dna.width*clampf(habitat.dna/18.0,0,1)
  hud_labels.zone.text=habitat.zone_name
  hud_labels.generation.text="GENERATION %02d  ·  %s"%[habitat.generation,Genome.role(habitat.genome).to_upper()]
  hud_labels.hint.text="WASD swim  ·  Mouse orient  ·  Space %s  ·  Shift %s"%["bite" if Genome.has(habitat.genome,"jaw") else "burst","toxin / attach" if Genome.has(habitat.genome,"toxin") or Genome.has(habitat.genome,"parasite") else "escape"]
  hud_labels.feed.text="Ready to reproduce · E opens your organism editor" if Genome.can_reproduce(habitat.energy,habitat.dna,habitat.breed_cd) else ("Gather 18 mutation + 60 energy to reproduce" if habitat.breed_cd<=0 else "New membrane settling · %ds"%ceil(habitat.breed_cd))
  if habitat.energy<20: hud_labels.feed.text="Energy is low · find nutrients or illuminated water"
  toast_time=maxf(0,toast_time-dt)
  if toast: toast.text=status_message if toast_time>0 else ""
  save_clock+=dt
  if save_clock>=20: save_clock=0; save_game()
 if mode=="editor" and is_instance_valid(editor_preview): editor_preview.queue_redraw()
 queue_redraw()

func show_message(text:String):
 status_message=text; toast_time=5

func save_game():
 if not has_game: return
 if not SaveStore.write(habitat.snapshot()): show_message("Autosave could not be written · check disk space")

func show_pause():
 mode="pause"; habitat.active=false; save_game(); clear_ui()
 panel(Rect2(470,195,500,515))
 label_text("Still water",Vector2(520,238),42)
 label_text("Your lineage is saved locally.",Vector2(520,303),18,MUTED)
 button("RESUME",Rect2(520,370,400,52),resume_game)
 button("SETTINGS",Rect2(520,436,400,52),show_settings)
 button("TITLE SCREEN",Rect2(520,502,400,52),show_title)
 button("SAVE & QUIT",Rect2(520,568,400,52),quit_game)

func show_settings():
 if mode!="settings": previous_mode=mode
 mode="settings"; habitat.active=false; clear_ui(); panel(Rect2(410,150,620,620))
 label_text("Settings",Vector2(460,194),42)
 label_text("Quiet by design. Everything stays on this PC.",Vector2(460,263),17,MUTED)
 button("SOUND   "+("OFF" if settings.muted else "ON"),Rect2(460,324,520,52),func():settings.muted=not settings.muted; audio.set_muted(settings.muted); save_settings(); show_settings())
 button("DISPLAY   "+("FULLSCREEN" if settings.fullscreen else "WINDOWED"),Rect2(460,390,520,52),func():toggle_fullscreen(); show_settings())
 button("AIM   "+("MOUSE" if settings.mouse_aim else "MOVEMENT DIRECTION"),Rect2(460,456,520,52),func():settings.mouse_aim=not settings.mouse_aim; habitat.aim_mouse=settings.mouse_aim; save_settings(); show_settings())
 label_text("No camera shake. Gentle follow.\nArrow keys also move. F11 toggles fullscreen.\nEsc pauses; losing focus pauses automatically.",Vector2(460,542),17,MUTED)
 button("BACK",Rect2(460,672,520,52),func():
  if previous_mode=="title": show_title()
  else: show_pause())

func save_settings():
 var cfg=ConfigFile.new()
 for k in settings: cfg.set_value("preferences",k,settings[k])
 cfg.save("user://settings.cfg")

func toggle_fullscreen():
 settings.fullscreen=not settings.fullscreen
 DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if settings.fullscreen else DisplayServer.WINDOW_MODE_WINDOWED)
 save_settings()

func _died():
 mode="dead"; habitat.active=false; save_game(); clear_ui()
 panel(Rect2(385,240,670,400))
 label_text("One life. A longer lineage.",Vector2(429,281),35)
 label_text("Your established anatomy survives in a viable descendant.\nSome unspent mutation is lost. The ecosystem continues.",Vector2(429,355),18,MUTED)
 label_text("Generation %d  ·  %s"%[habitat.generation,Genome.role(habitat.genome)],Vector2(429,428),19,MINT)
 button("CONTINUE THE LINEAGE",Rect2(429,518,582,58),func():habitat.revive(); resume_game(); save_game())

func _modal_header(kicker:String,title:String):
 habitat.active=false; clear_ui(); panel(Rect2(28,28,1384,844),0.98)
 label_text(kicker,Vector2(66,55),13,MINT); label_text(title,Vector2(63,79),36)
 button("BACK  /  ESC",Rect2(1190, sixty(),180,48),resume_game)
 rule(Vector2(66,137),1300)

func sixty() -> float: return 65.0

func show_index():
 if not has_game: return
 mode="index"; _modal_header("FIELD NOTES", "Life you have encountered")
 if habitat.discovered.is_empty(): label_text("Swim toward other organisms to observe them.",Vector2(66,190),22,MUTED)
 var scroll=ScrollContainer.new(); scroll.position=Vector2(62,165); scroll.size=Vector2(1305,657); ui.add_child(scroll)
 var grid=GridContainer.new(); grid.columns=3; grid.add_theme_constant_override("h_separation",20); grid.add_theme_constant_override("v_separation",18); scroll.add_child(grid)
 for id in habitat.discovered:
  if id>=habitat.ecology.species.size(): continue
  var s=habitat.ecology.species[id]
  var card=PanelContainer.new(); card.custom_minimum_size=Vector2(414,250); grid.add_child(card)
  var area=Control.new(); area.custom_minimum_size=Vector2(414,250); card.add_child(area)
  var body=OrganismBody.new(); body.genome=s.genome; body.position=Vector2(76,88); body.scale=Vector2.ONE*1.25; area.add_child(body)
  label_text(s.name,Vector2(155,32),21,INK,area)
  label_text(s.diet.to_upper(),Vector2(155,65),13,MINT,area)
  label_text(Ecology.ZONES[s.zone],Vector2(155,94),15,MUTED,area)
  label_text("Population %d  ·  generation %d"%[s.population,s.generation],Vector2(22,161),16,MUTED,area)
  var danger="Hunts smaller organisms" if s.diet=="predator" else ("Attaches to larger hosts" if s.diet=="parasite" else "Follows resources")
  label_text(danger+"\nSpeed adaptation ×%.2f"%s.speed,Vector2(22,192),15,INK,area)

func show_lineage():
 if not has_game: return
 mode="lineage"; _modal_header("ANCESTRY", "The shapes you have survived in")
 var scroll=ScrollContainer.new(); scroll.position=Vector2(64,165); scroll.size=Vector2(1305,660); ui.add_child(scroll)
 var list=VBoxContainer.new(); list.add_theme_constant_override("separation",14); scroll.add_child(list)
 for item in habitat.lineage:
  var card=PanelContainer.new(); card.custom_minimum_size=Vector2(1270,146); list.add_child(card)
  var area=Control.new(); area.custom_minimum_size=Vector2(1270,146); card.add_child(area)
  var body=OrganismBody.new(); body.genome=item.genome; body.position=Vector2(115,70); body.scale=Vector2.ONE*1.2; area.add_child(body)
  label_text("%02d"%item.generation,Vector2(230,27),36,MINT,area)
  label_text(item.role+"  ·  %.1f μm"%(item.genome.size*2),Vector2(322,31),23,INK,area)
  label_text(item.mutation,Vector2(322,75),17,MUTED,area)
  label_text("DESCENDED FROM %02d"%item.parent if item.parent>0 else "ORIGIN",Vector2(940,51),13,MUTED,area)
 label_text("The player follows one surviving branch. Species variants branch in the ecosystem ledger.",Vector2(64,832),14,MUTED)

func show_map():
 if not has_game: return
 mode="map"; _modal_header("HABITAT", "One connected drop of water")
 var colors=["294d46","374e36","233f50","49433b","4a3839","292e4b"]
 for z in range(6):
  var x=70+(z%2)*388; var y=177+int(z/2)*205
  var rect=ColorRect.new(); rect.position=Vector2(x,y); rect.size=Vector2(370,188); rect.color=Color(colors[z]); ui.add_child(rect)
  label_text("0%d"%(z+1),Vector2(x+20,y+14),14,MINT)
  label_text(Ecology.ZONES[z],Vector2(x+20,y+50),24)
  label_text("Nutrient density ×%.2f"%habitat.ecology.resources[z],Vector2(x+20,y+91),16,MUTED)
  if Ecology.zone(habitat.player.position)==z: label_text("●  YOUR ORGANISM",Vector2(x+20,y+140),15,MINT)
 label_text("ECOSYSTEM LEDGER",Vector2(887,181),14,MINT)
 label_text(habitat.ecology.event,Vector2(887,218),25)
 label_text("%d regional generations\n%d species · %d observed"%[habitat.ecology.epoch,habitat.ecology.species.size(),habitat.discovered.size()],Vector2(887,270),18,MUTED)
 var y=370
 for text in habitat.ecology.logbook.slice(0,6):
  var l=label_text(text,Vector2(887,y),16,MUTED); l.size.x=430; l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; y+=65
 label_text("Move south to descend. Move east to cross into the neighboring habitat.",Vector2(70,824),16,MUTED)

func open_editor():
 if not has_game: return
 if not Genome.can_reproduce(habitat.energy,habitat.dna,habitat.breed_cd):
  show_message("Reproduction needs 18 mutation, 60 energy, and a settled membrane"); return
 habitat.active=false; mode="editor"; clear_ui(); veil.visible=false
 draft=habitat.genome.duplicate(true); base_value=Genome.value(draft); budget=int(habitat.dna)
 selected_part=-1; selected_tool=""; dragging=false; discount_kind=""; adaptation="Open variation"
 label_text("THE NEXT GENERATION",Vector2(38,27),13,MINT)
 label_text("Shape what comes next.",Vector2(35,52),37)
 editor_budget=label_text("",Vector2(1100,46),21,GOLD)
 panel(Rect2(30,130,285,640)); panel(Rect2(1090,130,320,640))
 label_text("STRUCTURES",Vector2(50,152),13,MUTED)
 var scroll=ScrollContainer.new(); scroll.position=Vector2(43,185); scroll.size=Vector2(260,555); ui.add_child(scroll)
 var box=VBoxContainer.new(); box.add_theme_constant_override("separation",7); scroll.add_child(box)
 for kind in Genome.PARTS:
  var p=Genome.PARTS[kind]
  var b=Button.new(); b.text=p.name+"  ·  "+str(p.cost); b.custom_minimum_size=Vector2(245,45); b.tooltip_text=p.hint
  b.pressed.connect(func():selected_tool=kind; selected_part=-1; editor_hint.text="Click beside the membrane to add "+p.name; _editor_refresh())
  box.add_child(b)
 editor_preview=_specimen(draft,editor_origin,editor_scale)
 editor_info=label_text("Select a structure\nor drag an existing part.",Vector2(1112,157),18,INK); editor_info.size=Vector2(272,114); editor_info.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 editor_stats=label_text("",Vector2(1112,297),18,MUTED)
 button("ROTATE  ↶",Rect2(1110,528,134,40),func():edit_property("rotation",-0.26))
 button("ROTATE  ↷",Rect2(1250,528,140,40),func():edit_property("rotation",0.26))
 button("SMALLER",Rect2(1110,578,134,40),func():edit_property("size",-0.15))
 button("LARGER",Rect2(1250,578,140,40),func():edit_property("size",0.15))
 button("REMOVE PART",Rect2(1110,637,280,43),remove_part)
 button("RESET CHANGES",Rect2(1110,694,280,43),func():draft=habitat.genome.duplicate(true); selected_part=-1; _editor_refresh())
 editor_hint=label_text("Choose a structure. Click to place. Drag to reposition.",Vector2(355,153),17,MUTED)
 button("SYMMETRY  ON",Rect2(354,646,210,44),func():
  symmetry=not symmetry
  for child in ui.get_children():
   if child is Button and child.text.begins_with("SYMMETRY"):child.text="SYMMETRY  "+("ON" if symmetry else "OFF"))
 button("BODY  −",Rect2(578,646,112,44),func():draft.aspect=maxf(0.7,draft.aspect-0.1);_editor_refresh())
 button("BODY  +",Rect2(700,646,112,44),func():draft.aspect=minf(1.9,draft.aspect+0.1);_editor_refresh())
 button("PIGMENT",Rect2(827,646,120,44),func():draft.hue=fmod(draft.hue+0.075,1.0);_editor_refresh())
 button("PATTERN",Rect2(956,646,110,44),func():draft.pattern=(int(draft.pattern)+1)%3;_editor_refresh())
 label_text("INHERITED POSSIBILITIES  ·  choose one structure for a 2-point discount",Vector2(355,710),12,MINT)
 var choices=Genome.opportunities(habitat.history,habitat.genome)
 for i in range(choices.size()):
  var option=choices[i]
  var b=button(Genome.PARTS[option[0]].name,Rect2(355+i*238,738,226,42),func():discount_kind=option[0]; adaptation=option[1]; selected_tool=option[0]; editor_hint.text=option[1]; _editor_refresh())
  b.tooltip_text=option[1]
 button("CANCEL",Rect2( thirty(),817,180,52),resume_game)
 editor_commit=button("REPRODUCE  →",Rect2(1110,812,300,57),commit_evolution)
 label_text("Energy rebuilds. Your descendant inherits this anatomy.",Vector2(356,831),16,MUTED)
 _editor_refresh()

func thirty() -> float: return 30.0

func editor_spent() -> int:
 var spent=Genome.value(draft)-base_value
 if discount_kind!="":
  var old_count=habitat.genome.parts.filter(func(p):return p.kind==discount_kind).size()
  var new_count=draft.parts.filter(func(p):return p.kind==discount_kind).size()
  if new_count>old_count: spent-=2
 return maxi(0,spent)

func _editor_refresh():
 editor_preview.genome=draft
 var s=Genome.stats(draft); var old=habitat.stats
 editor_budget.text="%d / %d MUTATION LEFT"%[budget-editor_spent(),budget]
 editor_budget.modulate=Color(1,0.6,0.4) if editor_spent()>budget else Color.WHITE
 editor_commit.disabled=editor_spent()>budget or draft.parts.size()>24 or not Genome.valid(draft)
 editor_stats.text="TRAIT                 NOW → NEXT\n\nSpeed            %d → %d\nTurning         %.1f → %.1f\nDefense         %d%% → %d%%\nAttack            %d → %d\nEnergy           %d → %d\nSenses           %d → %d"%[old.speed,s.speed,old.turn,s.turn,old.defense*100,s.defense*100,old.attack,s.attack,old.energy,s.energy,old.senses,s.senses]
 if selected_part>=0 and selected_part<draft.parts.size():
  var p=draft.parts[selected_part]; editor_info.text=Genome.PARTS[p.kind].name+"\n"+Genome.PARTS[p.kind].hint+"\nScale %.2f · %d mutation"%[p.size,Genome.cost(p)]
 elif selected_tool!="": editor_info.text=Genome.PARTS[selected_tool].name+"\n"+Genome.PARTS[selected_tool].hint

func edit_property(key:String,delta:float):
 if selected_part<0 or selected_part>=draft.parts.size():return
 var p=draft.parts[selected_part]
 p[key]+=delta
 if key=="size":p.size=clampf(p.size,0.65,1.5)
 _editor_refresh()

func remove_part():
 if selected_part<0 or selected_part>=draft.parts.size():return
 draft.parts.remove_at(selected_part); selected_part=-1; _editor_refresh()

func commit_evolution():
 if editor_spent()>budget or not Genome.valid(draft):return
 habitat.evolve(draft,adaptation); resume_game(); save_game()

func _unhandled_input(event):
 if event is InputEventKey and event.pressed and not event.echo:
  match event.physical_keycode:
   KEY_F11:toggle_fullscreen()
   KEY_ESCAPE:
    if mode=="play":show_pause()
    elif mode in ["pause","editor","index","lineage","map"]:resume_game()
    elif mode=="settings":
     if previous_mode=="title":show_title()
     else:show_pause()
   KEY_E:
    if mode=="play":open_editor()
   KEY_I:
    if mode=="play":show_index()
   KEY_L:
    if mode=="play":show_lineage()
   KEY_M:
    if mode=="play":show_map()
   KEY_SPACE:
    if mode=="play":habitat.primary()
   KEY_SHIFT:
    if mode=="play":habitat.secondary()
   KEY_DELETE:
    if mode=="editor":remove_part()
 if mode!="editor":return
 if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
  if not event.pressed:dragging=false;return
  if event.position.x<330 or event.position.x>1075 or event.position.y<200 or event.position.y>628:return
  var v=(event.position-editor_origin)/editor_scale
  var near=-1;var dist=10.0
  for i in range(draft.parts.size()):
   var d=v.distance_to(editor_preview.attachment(draft.parts[i]))
   if d<dist:near=i;dist=d
  if near>=0:
   selected_part=near;selected_tool="";dragging=true
  elif selected_tool!="" and draft.parts.size()<24:
   var a=Vector2(v.x/draft.aspect,v.y).angle()
   draft.parts.append(Genome.part(selected_tool,a));selected_part=draft.parts.size()-1
   if symmetry and abs(sin(a))>0.2 and draft.parts.size()<24:draft.parts.append(Genome.part(selected_tool,-a))
   selected_tool="";dragging=true
  _editor_refresh()
 if event is InputEventMouseMotion and dragging and selected_part>=0:
  var v=(event.position-editor_origin)/editor_scale
  var fixed=Vector2(v.x/draft.aspect,v.y)
  draft.parts[selected_part].angle=fixed.angle();draft.parts[selected_part].radial=clampf(fixed.length()/draft.size,0.45,1.25)
  _editor_refresh()

func _notification(what):
 if what==NOTIFICATION_WM_CLOSE_REQUEST:quit_game()
 if what==NOTIFICATION_APPLICATION_FOCUS_OUT and mode=="play" and not "--qa" in OS.get_cmdline_user_args():show_pause()

func quit_game():
 save_game();save_settings();get_tree().quit()

func _qa_run():
 var runner=load("res://tests/gameplay_qa.gd").new()
 add_child(runner);runner.run(self)
