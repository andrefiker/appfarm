(function(root){
'use strict';
function validConfig(w,h,m){return [w,h,m].every(Number.isInteger)&&w>=5&&w<=30&&h>=5&&h<=30&&m>=1&&m<=w*h-1;}
class Game {
 constructor(w,h,m,seed){if(!validConfig(w,h,m))throw Error('Invalid board');Object.assign(this,{w,h,m,seed:seed>>>0,started:false,status:'ready',trigger:-1,cells:Array.from({length:w*h},()=>({mine:false,count:0,revealed:false,flag:false}))});}
 neighbors(i){const out=[],x=i%this.w,y=Math.floor(i/this.w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let a=x+dx,b=y+dy;if((dx||dy)&&a>=0&&a<this.w&&b>=0&&b<this.h)out.push(b*this.w+a)}return out}
 place(first){let excluded=new Set([first,...this.neighbors(first)]);if(this.cells.length-excluded.size<this.m)excluded=new Set([first]);let available=this.cells.map((_,i)=>i).filter(i=>!excluded.has(i)), state=this.seed;const rnd=()=>{state=(state+0x6D2B79F5)|0;let t=state;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296};for(let i=available.length-1;i>0;i--){let j=Math.floor(rnd()*(i+1));[available[i],available[j]]=[available[j],available[i]]}for(let i=0;i<this.m;i++)this.cells[available[i]].mine=true;this.cells.forEach((c,i)=>c.count=this.neighbors(i).filter(k=>this.cells[k].mine).length);this.started=true;this.status='playing'}
 reveal(x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=this.w||y>=this.h||['won','lost'].includes(this.status))return;let i=y*this.w+x,c=this.cells[i];if(c.flag)return;if(!this.started)this.place(i);if(c.revealed){const ns=this.neighbors(i);if(c.count>0&&ns.filter(k=>this.cells[k].flag).length===c.count){for(const k of ns)if(!this.cells[k].flag&&!this.cells[k].revealed){this.open(k);if(this.status==='lost')break}this.checkWin()}return}this.open(i);this.checkWin()}
 open(i){if(this.cells[i].mine){this.cells[i].revealed=true;this.trigger=i;this.status='lost';return}const q=[i];for(let p=0;p<q.length;p++){let k=q[p],c=this.cells[k];if(c.revealed||c.flag||c.mine)continue;c.revealed=true;if(c.count===0)for(const n of this.neighbors(k))if(!this.cells[n].revealed&&!this.cells[n].flag)q.push(n)}}
 checkWin(){if(this.status==='playing'&&this.cells.every(c=>c.mine||c.revealed))this.status='won'}
 flag(x,y){if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=this.w||y>=this.h||['won','lost'].includes(this.status))return;let c=this.cells[y*this.w+x];if(!c.revealed)c.flag=!c.flag}
 static restore(json){let d=JSON.parse(json);if(!validConfig(d.w,d.h,d.m)||!Array.isArray(d.cells)||d.cells.length!==d.w*d.h||!['ready','playing','won','lost'].includes(d.status))throw Error('Invalid save');let g=new Game(d.w,d.h,d.m,d.seed);Object.assign(g,d);return g}
}
const api={Game,validConfig};if(typeof module!=='undefined')module.exports=api;root.MinesEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
