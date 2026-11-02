/* Procedural cinematic black-hole renderer. No downloaded textures, models or network. */
(function () {
 'use strict';
 const VERT = `#version 300 es
 in vec2 a_position;
 void main(){gl_Position=vec4(a_position,0.,1.);}`;
 const FRAG = `#version 300 es
 precision highp float;
 uniform vec2 u_resolution;
 uniform float u_time;
 uniform float u_core;
 uniform float u_flux;
 uniform vec2 u_center;
 uniform vec2 u_touch;
 out vec4 outColor;
 #define PI 3.14159265
 float hash(vec2 x) {return fract(sin(dot(x,vec2(127.1,311.7)))*43758.5453123);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.49;}return v;}
 float stars(vec2 p){
   vec2 tile=p*190.;vec2 id=floor(tile),d=fract(tile)-.5;
   float h=hash(id),br=smoothstep(.988,1.,h);
   float core=pow(max(0.,1.-length(d)*3.6),10.);
   float cross=(.0018/(abs(d.x)+.035)*.0018/(abs(d.y)+.035));
   return br*(core*2.4+cross*3.)*mix(.5,1.5,hash(id+9.));
 }
 vec3 sky(vec2 p){
   vec2 q=mat2(.93,-.36,.36,.93)*p;
   float cloud=fbm(q*2.1+vec2(.23,.42));
   float fil=fbm(q*5.8-vec2(u_time*.004,0.));
   float band=exp(-pow((q.y+.08*sin(q.x*1.6))/.42,2.));
   vec3 base=vec3(.003,.006,.021);
   base+=vec3(.028,.007,.072)*pow(cloud,2.)*band*1.65;
   base+=vec3(.006,.042,.105)*pow(max(0.,fil-.36),2.)*band*2.1;
   base+=vec3(.13,.045,.10)*pow(max(0.,cloud-.57),2.)*band*1.3;
   float star=stars(p*1.1+vec2(.07,.10));
   float star2=stars(p*.37+vec2(19.,13.))*.6;
   base+=vec3(.55,.78,1.4)*(star+star2);
   return base;
 }
 void main(){
   vec2 uv=(gl_FragCoord.xy-u_resolution*.5)/u_resolution.y;
   vec2 center=(u_center-.5)*u_resolution/u_resolution.y;
   vec2 d=uv-center;
   float r=length(d),R=r/u_core;
   vec2 dir=d/max(r,.00001);
   float lens=u_core*.25/(R+.15)+u_core*.48*exp(-pow((R-1.55)*1.6,2.));
   vec2 bent=d-dir*lens;
   vec3 color=sky(center+bent*1.24+vec2(u_time*.0009,-u_time*.0003));
   float halo=exp(-pow((R-1.26)*2.0,2.));
   color+=vec3(.36,.12,.045)*halo*.37;
   float phi=atan(d.y,d.x);
   vec2 disk=vec2(d.x*.972-d.y*.235,(d.x*.235+d.y*.972)*3.75);
   float dr=length(disk)/u_core;
   float angle=atan(disk.y,disk.x);
   float inner=smoothstep(1.17,1.50,dr);
   float outer=1.-smoothstep(3.18,4.20,dr);
   float band=inner*outer;
   float swirl=sin(angle*5.1-dr*7.1+u_time*.68);
   float plasma=fbm(vec2(angle*5.3+u_time*.11,dr*6.-u_time*.31));
   float stream=.58+.25*swirl+.42*plasma;
   float hot=exp(-pow((dr-1.72)/.23,2.));
   float cold=exp(-pow((dr-2.7)/.95,2.));
   float doppler=.66+.60*smoothstep(-.8,.8,disk.x/max(dr*u_core,.001));
   float diskLight=band*stream*doppler*(.75+1.85*hot+.5*cold);
   vec3 gold=mix(vec3(.45,.018,.08),vec3(1.8,.52,.08),clamp(hot*.92+.22,0.,1.));
   color+=gold*diskLight*.76;
   color+=vec3(.42,.03,.17)*band*pow(plasma,2.)*.25;
   // A vertical magnetic jet with turquoise filamentation.
   float jetAxis=abs(d.x)/(u_core*(.16+.17*abs(d.y)/u_core));
   float jet=exp(-jetAxis*jetAxis*2.4)*smoothstep(.75,1.6,abs(d.y)/u_core)*(1.-smoothstep(3.5,8.5,abs(d.y)/u_core));
   float jf=.55+.45*sin(abs(d.y)/u_core*9.-u_time*1.6+noise(d*24.)*3.);
   color+=vec3(.018,.26,.45)*jet*jf*.52;
   color+=vec3(.007,.085,.14)*exp(-jetAxis*.75)*jet*.7;
   // Photon ring and an almost-black singularity, with a thin hot edge.
   float photon=exp(-pow((R-1.09)/.085,2.));
   color+=vec3(1.35,.70,.36)*photon*(.43+.23*sin(phi*2.4+u_time*.18));
   float silhouette=1.-smoothstep(.94,1.055,R);
   color=mix(color,vec3(.00015,.0001,.001),silhouette);
   color+=vec3(.025,.14,.22)*exp(-pow((R-1.25)/.28,2.))*.27;
   // Color-rich interactive gravitational fingertip reaction.
   float tdist=length(uv-(u_touch-.5)*u_resolution/u_resolution.y);
   color+=vec3(.02,.085,.19)*exp(-tdist*13.)*u_flux*.27;
   // Filmic tone mapping, carefully preserving dark space.
   color=max(color,vec3(0.));
   color=1.-exp(-color*1.21);
   color=pow(color,vec3(.89));
   float vign=1.-.47*pow(length(uv/vec2(.85,.94)),2.);
   color*=clamp(vign,.53,1.);
   outColor=vec4(color,1.);
 }`;
 function compile(gl,kind,code){
   const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);
   if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
     const msg=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error('GLSL: '+msg);
   }
   return shader;
 }
 window.SingularityShader={
   create(canvas){
     const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});
     if(!gl)throw new Error('WebGL2 unavailable');
     const program=gl.createProgram();
     const vertex=compile(gl,gl.VERTEX_SHADER,VERT),frag=compile(gl,gl.FRAGMENT_SHADER,FRAG);
     gl.attachShader(program,vertex);gl.attachShader(program,frag);gl.linkProgram(program);
     if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shader link: '+gl.getProgramInfoLog(program));
     gl.deleteShader(vertex);gl.deleteShader(frag);
     gl.useProgram(program);
     const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
     gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
     const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
     const U={};for(const s of ['u_resolution','u_time','u_core','u_center','u_touch','u_flux'])U[s]=gl.getUniformLocation(program,s);
     return {
       render({time,center,core,touch,flux}){
         gl.viewport(0,0,canvas.width,canvas.height);
         gl.uniform2f(U.u_resolution,canvas.width,canvas.height);
         gl.uniform1f(U.u_time,time);
         gl.uniform1f(U.u_core,core);
         gl.uniform2f(U.u_center,center.x,center.y);
         gl.uniform2f(U.u_touch,touch.x,touch.y);
         gl.uniform1f(U.u_flux,flux);
         gl.drawArrays(gl.TRIANGLES,0,6);
       },gl
     };
   }
 };
})();
