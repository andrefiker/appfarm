const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {Chess}=require('chess.js');
const buildGame=moves=>{const game=new Chess();moves.forEach(m=>game.move(m));return game;};
const e4={from:'e2',to:'e4'},e5={from:'e7',to:'e5'};
let effect,engineLabel,request,previous,notice,workerCalls;
function load(){
 let code=ts.transpileModule(fs.readFileSync('src/use-computer-opponent.ts','utf8').replace('import.meta.url',"'https://example.test/app.js'"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const exports={};const context={exports,require:name=>name==='react'?{useEffect:fn=>{effect=fn;},useState:value=>[value,v=>{engineLabel=v;}]}:name==='./computer'?{buildGame,chooseComputerMove:()=>e5}:{stockfishMove:(...args)=>request(...args)},navigator:{onLine:true},Worker:class{postMessage(){workerCalls++;queueMicrotask(()=>this.onmessage({data:{move:e5}}));}terminate(){}},URL,AbortController,setTimeout,clearTimeout};
 vm.runInNewContext(code,context);return{hook:exports.useComputerOpponent,context};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let resolve;
 request=()=>new Promise(r=>resolve=r);previous=[e4];notice='';workerCalls=0;
 const{hook,context}=load();
 const run=()=>{hook(true,[e4],10,f=>{previous=f(previous);},v=>notice=v);return effect();};
 let cleanup=run();resolve({engine:'Stockfish 18',move:e5});await tick();assert.equal(previous.length,2);assert.equal(engineLabel,'Stockfish 18');assert.equal(workerCalls,0);cleanup();
 previous=[e4];cleanup=run();cleanup();resolve({engine:'Stockfish 18',move:e5});await tick();assert.equal(previous.length,1,'retired response must not append');
 previous=[e4];cleanup=run();previous=[];resolve({engine:'Stockfish 18',move:e5});await tick();assert.equal(previous.length,0,'reset must reject stale position');cleanup();
 previous=[e4];request=()=>Promise.reject(new Error('Network'));cleanup=run();await tick();assert.equal(previous.length,2);assert.match(engineLabel,/fallback/);assert.match(notice,/temporarily unavailable/);cleanup();
 previous=[e4];context.navigator.onLine=false;request=()=>{throw Error('Offline must not fetch');};cleanup=run();await tick();assert.equal(previous.length,2);assert.match(engineLabel,/offline/);cleanup();
 context.navigator.onLine=true;request=()=>Promise.resolve({engine:'Stockfish 18',move:e5});previous=[e4];cleanup=run();await tick();assert.equal(engineLabel,'Stockfish 18');cleanup();
 console.log('PASS: remote reply, leaving/reset stale guards, visible fallback, offline no request, online recovery');
})().catch(e=>{console.error(e);process.exitCode=1;});
