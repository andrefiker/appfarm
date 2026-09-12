import {chooseComputerMove} from './computer';import type {LocalMove} from './computer';
self.onmessage=(event:MessageEvent<{moves:LocalMove[];level:number}>)=>{try{const move=chooseComputerMove(event.data.moves,event.data.level);self.postMessage({move:move?{from:move.from,to:move.to,promotion:move.promotion}:null});}catch{self.postMessage({error:true});}};

