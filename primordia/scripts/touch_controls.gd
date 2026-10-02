class_name TouchControls
extends Node2D

var game
var move_finger=-1
var primary_finger=-1
var secondary_finger=-1
var joystick=Vector2(1210,548)
var primary_pos=Vector2(154,548)
var secondary_pos=Vector2(338,579)
var stick=Vector2.ZERO
var mouse_drag=false

func _ready():
 if not game.settings.left_handed:
  joystick.x=230;primary_pos.x=1286;secondary_pos.x=1102

func reset():
 move_finger=-1;primary_finger=-1;secondary_finger=-1;stick=Vector2.ZERO;mouse_drag=false
 if is_instance_valid(game.habitat):game.habitat.touch_direction=Vector2.ZERO

func move_to(pos:Vector2):
 stick=(pos-joystick).limit_length(90)
 var direction=stick/90.0
 if direction.length()<0.12:direction=Vector2.ZERO
 game.habitat.touch_direction=direction
 queue_redraw()

func _input(event):
 if game.mode!="play":return
 var pos=game.mobile_ui.ui_position(event.position) if event is InputEventScreenTouch or event is InputEventScreenDrag or event is InputEventMouse else Vector2.ZERO
 if event is InputEventScreenTouch:
  if event.pressed and not event.canceled:
   if pos.distance_to(joystick)<145 and move_finger<0:
    move_finger=event.index;move_to(pos);get_viewport().set_input_as_handled()
   elif pos.distance_to(primary_pos)<82:
    primary_finger=event.index;game.habitat.primary();get_viewport().set_input_as_handled()
   elif pos.distance_to(secondary_pos)<74:
    secondary_finger=event.index;game.habitat.secondary();get_viewport().set_input_as_handled()
  else:
   if event.index==move_finger:move_finger=-1;move_to(joystick)
   if event.index==primary_finger:primary_finger=-1
   if event.index==secondary_finger:secondary_finger=-1
 if event is InputEventScreenDrag and event.index==move_finger:
  move_to(pos);get_viewport().set_input_as_handled()
 # A mouse fallback is useful for the phone-layout QA harness. Touch input
 # owns multitouch; emulated mouse events must not fire abilities twice.
 if event is InputEventMouseButton and event.device!=-1:
  if event.button_index==MOUSE_BUTTON_LEFT:
   if event.pressed:
    if pos.distance_to(joystick)<145:mouse_drag=true;move_to(pos)
    elif pos.distance_to(primary_pos)<82:game.habitat.primary()
    elif pos.distance_to(secondary_pos)<74:game.habitat.secondary()
   elif mouse_drag:mouse_drag=false;move_to(joystick)
 if event is InputEventMouseMotion and mouse_drag:move_to(pos)
 queue_redraw()

func _exit_tree():reset()

func _draw():
 var ink=Color(0.64,0.89,0.75,0.52)
 draw_circle(joystick,116,Color(0.03,0.10,0.12,0.52),true,-1,true)
 draw_arc(joystick,116,0,TAU,64,ink,2,true)
 draw_circle(joystick+stick,43,Color(0.55,0.85,0.72,0.24),true,-1,true)
 draw_arc(joystick+stick,43,0,TAU,32,Color(0.65,0.97,0.8,0.6),2,true)
 for item in [[primary_pos,76.0,primary_finger>=0,"BITE" if Genome.has(game.habitat.genome,"jaw") else "BURST"],[secondary_pos,61.0,secondary_finger>=0,"ABILITY" if Genome.has(game.habitat.genome,"toxin") or Genome.has(game.habitat.genome,"parasite") else "ESCAPE"]]:
  var c=Color(0.13,0.31,0.28,0.8) if item[2] else Color(0.025,0.09,0.10,0.72)
  draw_circle(item[0],item[1],c,true,-1,true)
  draw_arc(item[0],item[1],0,TAU,48,ink,2,true)
  var font=ThemeDB.fallback_font
  var text_size=font.get_string_size(item[3],HORIZONTAL_ALIGNMENT_LEFT,-1,23)
  draw_string(font,item[0]+Vector2(-text_size.x/2,8),item[3],HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color(0.84,0.95,0.87))
 draw_string(ThemeDB.fallback_font,joystick+Vector2(-34,145),"SWIM",HORIZONTAL_ALIGNMENT_LEFT,-1,20,ink)
