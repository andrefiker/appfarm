shader_type canvas_item;
uniform float sight=0.65;
uniform float aspect=1.6;
void fragment() {
 vec2 p=(UV-vec2(0.5))*vec2(aspect,1.0);
 float d=length(p);
 float shade=smoothstep(sight*0.45,sight*1.2,d)*0.83;
 COLOR=vec4(0.003,0.01,0.022,shade);
}
