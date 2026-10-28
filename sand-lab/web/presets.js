import {World,M,brush} from './engine.js';
export const presets=['Volcano','Forest fire','Waterfall','Sand hourglass','Oil fire','Steam engine'];
export function preset(name,w=160,h=240){
 const v=new World(w,h,731);const p=(x,y,m)=>v.put(Math.floor(x*w),Math.floor(y*h),m);
 const rect=(x,y,ww,hh,m)=>{for(let yy=Math.floor(y*h);yy<Math.floor((y+hh)*h);yy++)for(let xx=Math.floor(x*w);xx<Math.floor((x+ww)*w);xx++)v.put(xx,yy,m);};
 rect(0,.97,1,.03,M.STONE);
 const basin=()=>{rect(.05,.65,.025,.32,M.STONE);rect(.925,.65,.025,.32,M.STONE);rect(.05,.94,.9,.03,M.STONE);};
 if(name==='Volcano'){
  basin();rect(.08,.81,.84,.13,M.WATER);
  for(let y=.4;y<.95;y+=1/h)for(let x=.22;x<.78;x+=1/w)if(Math.abs(x-.5)<(y-.35)*.48 && Math.abs(x-.5)>.045)p(x,y,M.STONE);
  rect(.46,.35,.08,.57,M.LAVA);
 }else if(name==='Forest fire'){
  rect(.05,.9,.9,.06,M.SAND);
  for(let x=.12;x<.95;x+=.18){rect(x,.55,.025,.35,M.WOOD);for(let y=.4;y<.7;y+=1/h)for(let xx=x-.07;xx<x+.1;xx+=1/w)if(Math.abs(xx-x)<(y-.35)*.3)p(xx,y,M.PLANT);}
  rect(.08,.8,.06,.06,M.FIRE);rect(.05,.88,.9,.02,M.WATER);
 }else if(name==='Waterfall'){
  basin();rect(.05,.16,.38,.018,M.STONE);rect(.05,.04,.025,.13,M.STONE);rect(.08,.05,.3,.11,M.WATER);
  for(let k=0;k<4;k++)rect(k%2?.36:.58,.3+k*.14,.23,.025,M.STONE);
 }else if(name==='Sand hourglass'){
  for(let y=.16;y<.8;y+=1/h){const x=.5+Math.abs(y-.48)*.9;p(x,y,M.STONE);p(1-x,y,M.STONE);}
  rect(.2,.15,.6,.015,M.STONE);rect(.2,.8,.6,.015,M.STONE);
  for(let y=.19;y<.43;y+=1/h)for(let x=.23;x<.77;x+=1/w)if(Math.abs(x-.5)<Math.abs(y-.48)*.9-.02)p(x,y,M.SAND);
 }else if(name==='Oil fire'){
  basin();rect(.08,.82,.84,.12,M.WATER);rect(.08,.72,.84,.1,M.OIL);rect(.12,.72,.08,.02,M.FIRE);
 }else if(name==='Steam engine'){
  basin();rect(.12,.84,.76,.1,M.LAVA);rect(.12,.76,.76,.08,M.WATER);
  rect(.1,.5,.025,.35,M.STONE);rect(.875,.5,.025,.35,M.STONE);rect(.1,.5,.32,.025,M.STONE);rect(.58,.5,.32,.025,M.STONE);
 }
 return v;
}
