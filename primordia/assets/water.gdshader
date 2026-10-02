shader_type canvas_item;
uniform float depth = 0.15;
uniform float horizontal = 0.15;
uniform float darkness = 0.0;
float field(vec2 p) {
 return sin(p.x*2.3+sin(p.y*2.0))*sin(p.y*1.7+cos(p.x*1.2));
}
void fragment() {
 vec2 p=UV*vec2(2.0,1.2);
 float n=field(p*3.0+vec2(TIME*0.009,TIME*0.006));
 float m=field(p*6.0-vec2(TIME*0.007,0.0));
 vec3 shallow=vec3(0.038,0.145,0.157);
 vec3 deep=vec3(0.023,0.033,0.082);
 vec3 base=mix(shallow,deep,depth);
 base=mix(base,vec3(0.065,0.10,0.085),horizontal*0.22);
 base+=(n*0.014+m*0.004)*vec3(0.4,0.9,0.8);
 float beam=pow(max(0.0,sin(UV.x*12.0+UV.y*3.0+TIME*0.015)),12.0)*(1.0-depth)*0.014;
 base+=beam;
 COLOR=vec4(base*(1.0-darkness*0.55),1.0);
}
