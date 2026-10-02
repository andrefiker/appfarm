class_name BioSound
extends Node

var ambience:AudioStreamPlayer
var muted=false

func _ready():
 ambience=AudioStreamPlayer.new(); add_child(ambience)
 ambience.stream=tone(52,4.0,0.13,true)
 ambience.volume_db=-23
 ambience.play()

func tone(frequency:float,duration:float,volume:float,loop:bool=false) -> AudioStreamWAV:
 var rate=22050
 var bytes=PackedByteArray(); bytes.resize(int(duration*rate)*2)
 for i in range(int(duration*rate)):
  var t=float(i)/rate
  var envelope=1.0 if loop else pow(1.0-t/duration,2.0)*minf(1,t*45)
  var value=(sin(t*frequency*TAU+sin(t*TAU*0.5)*0.6)*0.65+sin(t*frequency*1.5*TAU)*0.22)*volume*envelope
  bytes.encode_s16(i*2,int(value*32767))
 var w=AudioStreamWAV.new(); w.format=AudioStreamWAV.FORMAT_16_BITS; w.mix_rate=rate; w.data=bytes
 if loop: w.loop_mode=AudioStreamWAV.LOOP_FORWARD; w.loop_end=int(duration*rate)
 return w

func cue(kind:String):
 if muted: return
 var p=AudioStreamPlayer.new(); add_child(p)
 var freq={"feed":420,"hurt":84,"burst":145,"birth":220,"click":310}.get(kind,310)
 p.stream=tone(freq,0.7 if kind=="birth" else 0.16,0.18)
 p.volume_db=-14; p.finished.connect(p.queue_free); p.play()

func set_muted(value:bool):
 muted=value
 if ambience: ambience.volume_db=-80 if value else -23

func shutdown():
 for player in get_children():
  if player is AudioStreamPlayer:
   player.stop(); player.stream=null

func _exit_tree():
 shutdown()
