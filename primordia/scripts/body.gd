class_name OrganismBody
extends Node2D

var genome=Genome.starter()
var clock=0.0
var motion=0.0
var impact=0.0
var is_player=false
var low_detail=false

func _process(dt):
 clock+=dt
 impact=maxf(0,impact-dt*3)
 if visible: queue_redraw()

func attachment(p:Dictionary) -> Vector2:
 return Vector2(cos(p.angle)*genome.aspect,sin(p.angle))*genome.size*p.radial

func _draw():
 var r=float(genome.size)
 var col=Color.from_hsv(genome.hue,0.45,0.83)
 var stretch=Vector2(genome.aspect*(1.0-impact*0.15),1.0+impact*0.14)
 for p in genome.parts:
  draw_set_transform(attachment(p),p.angle+p.rotation,Vector2.ONE*p.size)
  _part(p.kind,r,col)
 draw_set_transform(Vector2.ZERO,0,stretch)
 var n=24 if low_detail else 48
 for layer in range(4):
  var points=PackedVector2Array()
  var factor=1.0-float(layer)*0.075
  for i in range(n):
   var a=float(i)/n*TAU
   var pulse=sin(a*3+clock*2.1)*0.026+sin(a*5-clock*1.4)*0.016
   points.append(Vector2(cos(a),sin(a))*r*(factor+pulse))
  draw_colored_polygon(points,Color(col.r,col.g,col.b,0.10+layer*0.045))
  points.append(points[0])
  draw_polyline(points,Color(col.r,col.g,col.b,0.68 if layer==0 else 0.13),1.1,true)
 if not low_detail:
  for i in range(9):
   var a=i*2.4+sin(clock*0.6+i)*0.07
   var v=Vector2(cos(a),sin(a))*r*(0.36+0.23*sin(i*3.7))
   draw_circle(v,r*(0.065+0.015*(i%3)),Color(col.r,col.g,col.b,0.2),true,-1,true)
   draw_arc(v,r*0.075,0.4,4.4,10,Color(col.r,col.g,col.b,0.25),0.65,true)
  if genome.pattern==1:
   for i in range(4): draw_arc(Vector2(-r*0.35,0),r*(0.4+i*0.12),-1.1,1.1,20,Color(col.r,col.g,col.b,0.3),1,true)
  if genome.pattern==2:
   for i in range(7): draw_circle(Vector2(sin(i*7.1),cos(i*4.3))*r*0.7,r*0.045,Color(0.82,0.92,0.76,0.45))
 var nuc=Vector2(sin(clock*0.8)*r*0.035,cos(clock*0.65)*r*0.04)
 draw_circle(nuc,r*0.31,Color(col.r*0.4,col.g*0.55,col.b*0.65,0.8),true,-1,true)
 draw_arc(nuc,r*0.31,0,TAU,24,Color(col.r,col.g,col.b,0.8),0.8,true)
 draw_circle(nuc+Vector2(-r*0.045,r*0.035),r*0.15,Color(col.r,col.g,col.b,0.4),true,-1,true)
 draw_arc(Vector2(-r*0.1,-r*0.16),r*0.72,3.6,4.9,16,Color(0.84,1,0.96,0.35),1.3,true)
 if impact>0: draw_circle(Vector2.ZERO,r,Color(1,0.35,0.22,impact*0.23))
 draw_set_transform(Vector2.ZERO)

func _part(kind:String,r:float,col:Color):
 match kind:
  "flagellum":
   var pts=PackedVector2Array()
   for j in range(19):
    var t=j/18.0
    pts.append(Vector2(t*r*2.2,sin(t*7-clock*(5+motion*0.05))*r*0.26*t))
   draw_polyline(pts,Color(col.r,col.g,col.b,0.20),4.0,true)
   draw_polyline(pts,Color(col.r,col.g,col.b,0.9),1.2,true)
  "cilia":
   for i in range(9):
    var o=Vector2(-abs(i-4)*1.1,(i-4)*r*0.12)
    var a=sin(clock*7+i*0.65)*0.7
    draw_polyline(PackedVector2Array([o,o+Vector2(r*0.30,0),o+Vector2(r*0.58,a*r*0.22)]),Color(col.r,col.g,col.b,0.65),1,true)
  "fin":
   var pts=PackedVector2Array([Vector2(-r*0.2,-r*0.4),Vector2(r*0.65,sin(clock*3)*r*0.15),Vector2(-r*0.2,r*0.4)])
   draw_colored_polygon(pts,Color(col.r,col.g,col.b,0.18)); draw_polyline(pts,Color(col.r,col.g,col.b,0.65),1,true)
  "spike":
   draw_colored_polygon(PackedVector2Array([Vector2(-3,-4),Vector2(r*0.75,0),Vector2(-3,4)]),Color(0.85,0.86,0.68,0.8))
  "armor":
   draw_colored_polygon(PackedVector2Array([Vector2(-6,-r*0.35),Vector2(5,-r*0.2),Vector2(7,r*0.2),Vector2(-6,r*0.35)]),Color(0.65,0.73,0.71,0.8))
   draw_line(Vector2(6,-r*0.16),Vector2(7,r*0.18),Color(0.86,0.96,0.85),1.2,true)
  "jaw":
   var flex=sin(clock*3)*0.07
   for sign_value in [-1,1]:
    draw_colored_polygon(PackedVector2Array([Vector2(-3,sign_value*r*0.26),Vector2(r*0.50,sign_value*r*(0.25+flex)),Vector2(r*0.35,sign_value*r*0.04),Vector2(0,sign_value*r*0.15)]),Color(0.88,0.67,0.49,0.9))
  "filter":
   draw_arc(Vector2(-r*0.05,0),r*0.43,-1.15,1.15,20,Color(0.79,0.92,0.75,0.8),1.5,true)
   for i in range(7):
    var a=(i-3)*0.33
    draw_line(Vector2(cos(a),sin(a))*r*0.25,Vector2(cos(a),sin(a))*r*(0.63+sin(clock*3+i)*0.05),Color(0.7,0.9,0.72,0.5),0.8,true)
  "chemo":
   for k in [-1,1]: draw_polyline(PackedVector2Array([Vector2.ZERO,Vector2(r*0.35,k*r*0.15),Vector2(r*0.75,k*r*(0.3+sin(clock*2)*0.07))]),Color(col.r,col.g,col.b,0.8),1,true)
  "parasite":
   draw_arc(Vector2(r*0.17,0),r*0.25,-1.3,2.8,16,Color(1,0.53,0.70,0.85),2,true)
  _:
   var c=col
   match kind:
    "photo": c=Color(0.53,0.82,0.26)
    "toxin": c=Color(0.80,0.39,0.85)
    "fat": c=Color(0.88,0.73,0.37)
    "regen": c=Color(0.92,0.50,0.58)
    "eye": c=Color(0.8,0.7,0.41)
   var pr=r*(0.15 if kind=="eye" else 0.23)
   draw_circle(Vector2(-r*0.20,0),pr,Color(c.r,c.g,c.b,0.45),true,-1,true)
   draw_arc(Vector2(-r*0.20,0),pr,0,TAU,16,Color(c.r,c.g,c.b,0.8),0.8,true)
   draw_circle(Vector2(-r*0.22,-pr*0.2),pr*0.35,Color(c.r,c.g,c.b,0.6))
