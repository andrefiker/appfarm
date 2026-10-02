class_name MobileUI
extends Node

var game
var pad:TouchControls
var stats_label:Label
var notice:Label
var evolve_button:Button
var tool_buttons={}

func setup(root):
 game=root
 game.get_window().content_scale_size=Vector2i(1440,720)
 game.get_window().min_size=Vector2i(640,320)
 Input.emulate_mouse_from_touch=true
 game.ui.theme.default_font_size=24
 game.ui.theme.set_font_size("font_size","Button",24)
 configure_habitat()

func configure_habitat():
 game.habitat.touch_enabled=true
 game.habitat.aim_mouse=false

func clear(mode:String,dim:bool=true):
 if is_instance_valid(pad):pad.reset()
 game.habitat.touch_direction=Vector2.ZERO
 game.mode=mode;game.habitat.active=mode=="play";game.clear_ui()
 game.habitat.modulate=Color(1,1,1,0.10 if dim else 1.0)
 game.veil.visible=mode=="play"

func text(value:String,x:float,y:float,size:int=24,color:Color=Color("e1efe5")) -> Label:
 return game.label_text(value,Vector2(x,y),size,color)

func action(value:String,x:float,y:float,w:float,h:float,fn:Callable) -> Button:
 var b=game.button(value,Rect2(x,y,w,h),fn);b.focus_mode=Control.FOCUS_NONE;return b

func show_title():
 clear("title")
 text("AN OFFLINE EVOLUTION SANDBOX",64,62,20,game.MINT)
 text("PRIMORDIA",58,105, seventy())
 text("Become what survives.",64,205,28,game.MUTED)
 var saved=not SaveStore.read().is_empty()
 action("NEW ORGANISM",64,294,430,82,func():
  if saved or game.has_game:confirm_new()
  else:game.start_new())
 var b=action("CONTINUE",64,392,430,82,game.continue_game);b.disabled=not saved and not game.has_game
 action("SETTINGS",64,490,260,78,show_settings)
 action("QUIT",340,490,154,78,game.quit_game)
 text("Swim · feed · evolve",64,629,25,game.MUTED)
 text("v"+game.VERSION,1240,650,20,game.MUTED)
 var g=Genome.starter();g.size=34;g.aspect=1.35;g.parts.append(Genome.part("cilia",1.2));g.parts.append(Genome.part("photo",-0.8))
 var body=game._specimen(g,Vector2(1000,330),3.5);body.rotation=-0.3
 text("A living world. Your own strange lineage.",772,574,24,game.MUTED)

func seventy() -> int:return 70

func confirm_new():
 clear("confirm");game.panel(Rect2(330,160,780,400))
 text("Begin a new lineage?",380,204,36)
 text("This replaces your current autosave.\nYour previous save remains as a backup.",380,284,26,game.MUTED)
 action("KEEP LINEAGE",380,438,310,80,show_title)
 action("NEW ORGANISM",716,438,344,80,game.start_new)

func resume():
 clear("play",false);configure_habitat()
 text("P R I M O R D I A",58, twenty(),20,game.MINT)
 stats_label=text("",58,55,24)
 game._bar("energy",Vector2(58,97),208,game.MINT)
 game._bar("integrity",Vector2(308,97),180,Color("8fb5d0"))
 game._bar("dna",Vector2(532,97),192,game.GOLD)
 game.hud_labels.zone=text("",840,26,25)
 game.hud_labels.generation=text("",840,68,20,game.MUTED)
 action("Ⅱ",1294, twenty(),86,82,show_pause)
 notice=text("",425,133,25,game.MINT);notice.size=Vector2(590,80);notice.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART;notice.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER
 evolve_button=action("EVOLVE",512,602,240,80,open_editor)
 action("SPECIES",774,602,216,80,show_index)
 pad=TouchControls.new();pad.game=game;game.ui.add_child(pad)

func twenty() -> float:return 20.0

func update_play(dt:float):
 var h=game.habitat
 stats_label.text="ENERGY %d          INTEGRITY %d%%       MUTATION %d/18"%[h.energy,h.integrity,h.dna]
 for item in [["energy",h.energy/h.stats.energy],["integrity",h.integrity/100.0],["dna",h.dna/18.0]]:
  game.hud_bars[item[0]].node.size.x=game.hud_bars[item[0]].width*clampf(item[1],0,1)
 game.hud_labels.zone.text=h.zone_name
 game.hud_labels.generation.text="GEN %02d · %s"%[h.generation,Genome.role(h.genome).to_upper()]
 game.toast_time=maxf(0,game.toast_time-dt)
 var ready=Genome.can_reproduce(h.energy,h.dna,h.breed_cd)
 notice.text=game.status_message if game.toast_time>0 else ("A new generation is ready" if ready else "")
 if h.energy<20:notice.text="Low energy · graze golden particles"
 evolve_button.text="EVOLVE •" if ready else "EVOLVE"
 game.save_clock+=dt
 if game.save_clock>=20:game.save_clock=0;game.save_game()

func show_pause():
 game.save_game();clear("pause");game.panel(Rect2(425,38,590,644))
 text("Still water",476, sixty(),38)
 var items=[["RESUME",game.resume_game],["HABITAT MAP",show_map],["LINEAGE",show_lineage],["SETTINGS",show_settings],["TITLE SCREEN",show_title],["SAVE & QUIT",game.quit_game]]
 for i in range(items.size()):action(items[i][0],475,136+i*86,490,72,items[i][1])

func sixty() -> float:return 60.0

func show_settings():
 if game.mode!="settings":game.previous_mode=game.mode
 clear("settings");game.panel(Rect2(325,90,790,540))
 text("Settings",375,126,40)
 action("SOUND  "+("OFF" if game.settings.muted else "ON"),375,216,690,90,func():game.settings.muted=not game.settings.muted;game.audio.set_muted(game.settings.muted);game.save_settings();show_settings())
 action("CONTROLS  "+("LEFT-HANDED" if game.settings.left_handed else "RIGHT-HANDED"),375,326,690,90,func():game.settings.left_handed=not game.settings.left_handed;game.save_settings();show_settings())
 text("Drag the swim pad to move and face that direction.\nUse another finger for abilities. Progress saves locally.",375,445,24,game.MUTED)
 action("BACK",375,542,690,70,func():
  if game.previous_mode=="title":show_title()
  else:show_pause())

func died():
 game.save_game();clear("dead");game.panel(Rect2(290,160,860,400))
 text("One life. A longer lineage.",335,199,38)
 text("Your established anatomy survives.\nA descendant keeps 65% of loose mutation.",335,286,27,game.MUTED)
 action("CONTINUE THE LINEAGE",335,440,770, eighty(),func():game.habitat.revive();game.resume_game();game.save_game())

func eighty() -> float:return 80.0

func modal(mode:String,title:String):
 clear(mode);game.panel(Rect2(35,20,1370,680),0.98)
 text(title, sixty(),51,36)
 action("BACK",1210,43,170,80,game.resume_game)

func show_index():
 if not game.has_game:return
 modal("index","Life you have encountered")
 var scroll=ScrollContainer.new();scroll.position=Vector2(58,148);scroll.size=Vector2(1320,520);game.ui.add_child(scroll)
 var grid=GridContainer.new();grid.columns=2;grid.add_theme_constant_override("h_separation",20);grid.add_theme_constant_override("v_separation",20);scroll.add_child(grid)
 if game.habitat.discovered.is_empty():text("Swim close to other organisms to discover them.",65,180,28,game.MUTED)
 for id in game.habitat.discovered:
  if id>=game.habitat.ecology.species.size():continue
  var s=game.habitat.ecology.species[id]
  var area=Control.new();area.custom_minimum_size=Vector2(644,220);grid.add_child(area)
  var body=OrganismBody.new();body.genome=s.genome;body.position=Vector2(87,110);body.scale=Vector2.ONE*minf(1.5,68.0/game.preview_extent(s.genome).length());area.add_child(body)
  game.label_text(s.name,Vector2(182,18),28,game.INK,area)
  game.label_text(s.diet.to_upper()+" · "+Ecology.ZONES[s.zone],Vector2(182,64),22,game.MINT,area)
  game.label_text("Population %d · generation %d\nInherited speed ×%.2f"%[s.population,s.generation,s.speed],Vector2(182,108),23,game.MUTED,area)
  game.label_text("Hunts smaller organisms" if s.diet=="predator" else "Follows its ecological niche",Vector2(182,177),22,game.MUTED,area)

func show_lineage():
 if not game.has_game:return
 modal("lineage","Your surviving lineage")
 var scroll=ScrollContainer.new();scroll.position=Vector2(58,145);scroll.size=Vector2(1320,526);game.ui.add_child(scroll)
 var list=VBoxContainer.new();list.add_theme_constant_override("separation",20);scroll.add_child(list)
 for item in game.habitat.lineage:
  var area=Control.new();area.custom_minimum_size=Vector2(1280,190);list.add_child(area)
  var body=OrganismBody.new();body.genome=item.genome;body.position=Vector2(105,95);body.scale=Vector2.ONE*minf(1.5,78.0/game.preview_extent(item.genome).length());area.add_child(body)
  game.label_text("GEN %02d · %s"%[item.generation,item.role],Vector2(245,22),30,game.MINT,area)
  game.label_text(item.mutation,Vector2(245, eighty()),25,game.MUTED,area)
  game.label_text("Size %.1f μm · %d structures"%[item.genome.size*2,item.genome.parts.size()],Vector2(245,133),24,game.MUTED,area)

func show_map():
 if not game.has_game:return
 modal("map","One connected drop of water")
 for z in range(6):
  var x=62+(z%2)*446;var y=154+int(z/2)*164
  game.panel(Rect2(x,y,426,148),0.8)
  text(Ecology.ZONES[z],x+18,y+16,27)
  text("Nutrients ×%.2f"%game.habitat.ecology.resources[z],x+18,y+ sixty(),23,game.MUTED)
  if Ecology.zone(game.habitat.player.position)==z:text("● YOU ARE HERE",x+18,y+103,22,game.MINT)
 text("ECOSYSTEM",990,162,24,game.MINT)
 var l=text(game.habitat.ecology.event,990,211,30);l.size.x=365;l.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 text("%d species\n%d regional generations"%[game.habitat.ecology.species.size(),game.habitat.ecology.epoch],990,307,24,game.MUTED)
 var note=text("Swim down to descend.\nSwim right to reach the\nneighboring habitat.",990,454,25,game.MUTED);note.size.x=360

func open_editor():
 if not game.has_game:return
 var h=game.habitat
 if not Genome.can_reproduce(h.energy,h.dna,h.breed_cd):
  game.show_message("Evolution needs 18 mutation + 60 energy. Let a new membrane settle first.");return
 game.draft=h.genome.duplicate(true);game.base_value=Genome.value(game.draft);game.budget=int(h.dna)
 game.selected_part=-1;game.selected_tool="";game.dragging=false;game.discount_kind="";game.adaptation="Open variation"
 render_editor()

func render_editor():
 clear("editor");tool_buttons.clear()
 text("THE NEXT GENERATION",58,20,21,game.MINT)
 text("Shape what comes next",58, fifty(),32)
 game.editor_budget=text("",950,39,27,game.GOLD)
 game.panel(Rect2( forty(),110,342,470));game.panel(Rect2(1008,110,392,470))
 var scroll=ScrollContainer.new();scroll.position=Vector2(52,124);scroll.size=Vector2(320,442);game.ui.add_child(scroll)
 var list=VBoxContainer.new();list.add_theme_constant_override("separation",9);scroll.add_child(list)
 for kind in Genome.PARTS:
  var p=Genome.PARTS[kind];var b=Button.new();b.text=p.name+" · "+str(p.cost);b.custom_minimum_size=Vector2(304,72);b.focus_mode=Control.FOCUS_NONE
  b.pressed.connect(func():game.selected_tool=kind;game.selected_part=-1;game.editor_hint.text="Tap beside the membrane to add it";refresh_editor())
  b.add_theme_font_size_override("font_size",22);b.clip_text=true
  list.add_child(b);tool_buttons[kind]=b
 game.editor_origin=Vector2(692,360)
 game.editor_preview=game._specimen(game.draft,game.editor_origin,3.5);game.editor_preview.edit_mode=true
 game.editor_hint=text("Choose a part. Tap to place. Drag to move.",402,123,21,game.MUTED)
 game.editor_hint.size=Vector2(588,65);game.editor_hint.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 game.editor_info=text("Tap an attached part\nto rotate or resize it.",1030,129,23);game.editor_info.size=Vector2(345,99);game.editor_info.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART
 game.editor_stats=text("",1030,236,20,game.MUTED)
 game.editor_stats.add_theme_constant_override("line_spacing",0)
 action("ROTATE −",1026,430,173,70,func():game.edit_property("rotation",-0.3))
 action("ROTATE +",1211,430,173,70,func():game.edit_property("rotation",0.3))
 action("SMALLER",1026,510,173,70,func():game.edit_property("size",-0.15))
 action("LARGER",1211,510,173,70,func():game.edit_property("size",0.15))
 action("CANCEL", forty(),610,142, eighty(),game.resume_game)
 action("BODY",194,610,128, eighty(),show_body)
 action("PIGMENT",334,610,164, eighty(),func():game.draft.hue=fmod(game.draft.hue+0.075,1.0);refresh_editor())
 action("PATTERN",510,610,164, eighty(),func():game.draft.pattern=(int(game.draft.pattern)+1)%3;refresh_editor())
 action("PAIRS ON" if game.symmetry else "PAIRS OFF",686,610,196,eighty(),toggle_pairs)
 action("REMOVE",894,610,180, eighty(),game.remove_part)
 game.editor_commit=action("REPRODUCE",1086,610,314, eighty(),game.commit_evolution)
 var choices=Genome.opportunities(game.habitat.history,game.habitat.genome)
 for i in range(choices.size()):
  var option=choices[i]
  var b=action(Genome.PARTS[option[0]].name,399+i*197,520,188,64,func():game.discount_kind=option[0];game.adaptation=option[1];game.selected_tool=option[0];game.selected_part=-1;game.editor_hint.text="Inherited possibility: 2 mutation off";refresh_editor())
  b.add_theme_font_size_override("font_size",17)
  b.clip_text=true
  for state in ["normal","hover","pressed","disabled","focus"]:
   var style=game.ui.theme.get_stylebox(state,"Button").duplicate()
   style.content_margin_left=8;style.content_margin_right=8
   b.add_theme_stylebox_override(state,style)
 refresh_editor()

func forty() -> float:return 40.0
func fifty() -> float:return 50.0

func refresh_editor():
 game.editor_preview.genome=game.draft;game.editor_preview.selected=game.selected_part
 var extent=game.preview_extent(game.draft)
 game.editor_scale=minf(3.5,minf(278.0/extent.x,148.0/extent.y));game.editor_preview.scale=Vector2.ONE*game.editor_scale
 var next=game.draft.duplicate(true);next.size=minf(66,next.size*1.07)
 var s=Genome.stats(next);var old=game.habitat.stats
 game.editor_budget.text="%d / %d MUTATION LEFT"%[game.budget-game.editor_spent(),game.budget]
 game.editor_commit.disabled=game.editor_spent()>game.budget or not Genome.valid(game.draft)
 game.editor_stats.text="Speed         %d → %d\nTurning       %.1f → %.1f\nDefense      %d%% → %d%%\nAttack         %d → %d\nEnergy        %d → %d\nSenses        %d → %d"%[old.speed,s.speed,old.turn,s.turn,old.defense*100,s.defense*100,old.attack,s.attack,old.energy,s.energy,old.senses,s.senses]
 var kind=game.selected_tool
 if game.selected_part>=0 and game.selected_part<game.draft.parts.size():kind=game.draft.parts[game.selected_part].kind
 if kind!="":game.editor_info.text=Genome.PARTS[kind].name+"\n"+Genome.PARTS[kind].hint
 for key in tool_buttons:tool_buttons[key].modulate=game.MINT if key==kind else Color.WHITE

func toggle_pairs():
 game.symmetry=not game.symmetry
 game.editor_hint.text="Paired placement "+("ON" if game.symmetry else "OFF")
 for child in game.ui.get_children():
  if child is Button and child.text.begins_with("PAIRS"):child.text="PAIRS ON" if game.symmetry else "PAIRS OFF"

func show_body():
 clear("body");game.panel(Rect2(380,105,680,510))
 text("Body proportions",426,150,36)
 text("Proportions affect speed and turning.\nPaired placement adds mirrored new parts.",426,235,26,game.MUTED)
 action("BROADER",426,342,278,90,func():game.draft.aspect=maxf(0.7,game.draft.aspect-0.1))
 action("LONGER",726,342,278,90,func():game.draft.aspect=minf(1.9,game.draft.aspect+0.1))
 action("BACK TO ORGANISM",426,478,578,90,render_editor)

func unhandled(event):
 if event is InputEventKey and event.pressed and event.physical_keycode==KEY_ESCAPE:
  back();return
 if game.mode!="editor":return
 if event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
  if not event.pressed:game.dragging=false;return
  if not Rect2(390,197,611,313).has_point(event.position):return
  var v=(event.position-game.editor_origin)/game.editor_scale
  var near=-1;var distance=22.0/game.editor_scale
  for i in range(game.draft.parts.size()):
   var d=v.distance_to(game.editor_preview.attachment(game.draft.parts[i]))
   if d<distance:near=i;distance=d
  if near>=0:game.selected_part=near;game.selected_tool="";game.dragging=true
  elif game.selected_tool!="" and game.draft.parts.size()<24:
   var a=Vector2(v.x/game.draft.aspect,v.y).angle()
   game.draft.parts.append(Genome.part(game.selected_tool,a));game.selected_part=game.draft.parts.size()-1
   if game.symmetry and abs(sin(a))>0.2 and game.draft.parts.size()<24:game.draft.parts.append(Genome.part(game.selected_tool,-a))
   game.selected_tool="";game.dragging=true
  refresh_editor();get_viewport().set_input_as_handled()
 if event is InputEventMouseMotion and game.dragging and game.selected_part>=0:
  var v=(event.position-game.editor_origin)/game.editor_scale
  var fixed=Vector2(v.x/game.draft.aspect,v.y)
  game.draft.parts[game.selected_part].angle=fixed.angle();game.draft.parts[game.selected_part].radial=clampf(fixed.length()/game.draft.size,0.45,1.25)
  refresh_editor()

func back():
 if game.mode=="play":show_pause()
 elif game.mode=="body":render_editor()
 elif game.mode=="confirm":show_title()
 elif game.mode=="title":game.quit_game()
 elif game.mode=="settings":
  if game.previous_mode=="title":show_title()
  else:show_pause()
 elif game.has_game and game.mode!="dead":game.resume_game()
