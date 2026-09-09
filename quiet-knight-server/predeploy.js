import {spawn} from 'node:child_process';
for(const file of ['verify-identity.js','verify-server.js','verify-review.js']){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[file],{stdio:['ignore','inherit','pipe'],env:process.env});
  // Assertion errors can contain credentials. Keep failures identifiable without dumping values.
  child.stderr.resume();child.on('error',()=>reject(new Error(file+' could not start')));
  child.on('exit',code=>code===0?resolve():reject(new Error(file+' failed; inspect the bounded acceptance assertions')));
 });
}
console.log(JSON.stringify({event:'predeploy.complete',passed:true,suites:['identity','server-http-ws-redis','stockfish-review']}));
