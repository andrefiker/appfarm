const assert=require('node:assert/strict');
const E=require('../app/src/main/assets/engine.js');
for(const [name,count] of [['english',33],['european',37],['triangle',15]]){
 const b=E.board(name); assert.equal(b.holes.length,count); assert.equal(new Set(b.holes.map(p=>p.join(','))).size,count);
 for(const m of b.moves){assert.ok(m.every(i=>i>=0&&i<count));const [a,x,z]=m.map(i=>b.holes[i]);assert.equal(a[0]+z[0],2*x[0]);assert.equal(a[1]+z[1],2*x[1]);}
 const p=E.generate(b,12345,8);const p2=E.generate(b,12345,8);assert.deepEqual(p,p2);let s=p.state;assert.equal(E.count(s),p.solution.length+1);for(const m of p.solution){assert.ok(E.legal(s,m));s=E.apply(b,s,m)}assert.equal(E.count(s),1);assert.equal(E.moves(b,s).length,0);
 assert.equal(E.moves(b,0n).length,0);assert.equal(E.solve(b,0n,1000).status,'unsolvable');
}
const b=E.board('english');let s=E.standard(b);assert.equal(E.count(s),32);let m=E.moves(b,s)[0];let next=E.apply(b,s,m);assert.equal(E.count(next),31);assert.throws(()=>E.apply(b,next,m));let p=E.generate(b,9,5);let result=E.solve(b,p.state,100000);assert.equal(result.status,'solved');let st=p.state;for(const move of result.path){assert.ok(E.legal(st,move));st=E.apply(b,st,move)}assert.equal(E.count(st),1);
console.log('engine tests passed');
for(const type of ['english','european','triangle']){const b=E.board(type),initial=E.standard(b);for(const m of E.moves(b,initial)){let after=E.apply(b,initial,m);assert.equal(E.count(after),E.count(initial)-1);assert.ok(!E.has(after,m[0])&&!E.has(after,m[1])&&E.has(after,m[2]));assert.throws(()=>E.apply(b,after,m))}for(let seed=1;seed<=100;seed++){let puzzle=E.generate(b,seed,12),state=puzzle.state;for(let m of puzzle.solution){assert.ok(b.moves.some(x=>x.join()===m.join()));state=E.apply(b,state,m)}assert.equal(E.count(state),1)}assert.equal(E.solve(b,1n<<BigInt(b.holes.length),10).status,'invalid')}

assert.throws(()=>E.apply(b,E.standard(b),[0,1,16]));
