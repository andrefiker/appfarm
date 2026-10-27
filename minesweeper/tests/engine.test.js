const test = require('node:test');
const assert = require('node:assert/strict');
const {Game, validConfig} = require('../app/src/main/assets/engine');
test('first reveal is safe and seed generates reproducible exact mines', () => {
  const a = new Game(9,9,10,42), b = new Game(9,9,10,42);
  a.reveal(4,4); b.reveal(4,4);
  assert.equal(a.cells.filter(c => c.mine).length,10);
  assert.equal(a.cells[40].mine,false);
  assert.equal(a.cells[40].count,0);
  assert.deepEqual(a.cells.map(c=>c.mine), b.cells.map(c=>c.mine));
});
test('counts and boundaries match independent neighbor enumeration', () => {
  const g = new Game(9,9,10,17); g.reveal(0,0);
  for(let y=0;y<9;y++) for(let x=0;x<9;x++) {
    let n=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      if ((!dx&&!dy)||x+dx<0||x+dx>=9||y+dy<0||y+dy>=9) continue;
      n += Number(g.cells[(y+dy)*9+x+dx].mine);
    } assert.equal(g.cells[y*9+x].count,n);
  }
});
test('flags block reveals and toggle',()=>{const g=new Game(9,9,10,3);g.flag(0,0);g.reveal(0,0);assert.equal(g.started,false);g.flag(0,0);g.reveal(0,0);assert.equal(g.cells[0].revealed,true)});
test('empty area floods and defeat freezes board',()=>{const g=new Game(9,9,10,4);g.reveal(0,0);assert.ok(g.cells.filter(c=>c.revealed).length>1); const i=g.cells.findIndex(c=>c.mine);g.reveal(i%9,Math.floor(i/9));assert.equal(g.status,'lost');const before=JSON.stringify(g.cells);g.flag(8,8);assert.equal(JSON.stringify(g.cells),before)});
test('winning all safe cells and restore',()=>{const g=new Game(9,9,10,5);g.reveal(0,0);const restored=Game.restore(JSON.stringify(g));assert.deepEqual(restored.cells,g.cells);for(let i=0;i<81;i++)if(!restored.cells[i].mine)restored.reveal(i%9,Math.floor(i/9));assert.equal(restored.status,'won')});
test('chord opens neighbors with flags; incorrect flags can lose',()=>{for(const wrong of [false,true]) {const g=new Game(9,9,10,12);g.reveal(0,0);let i=g.cells.findIndex((c,j)=>c.revealed&&c.count>0&&g.neighbors(j).filter(k=>!g.cells[k].revealed).length>c.count);assert.ok(i>=0);const ns=g.neighbors(i).filter(k=>!g.cells[k].revealed);let mines=ns.filter(k=>g.cells[k].mine);if(wrong){const safe=ns.find(k=>!g.cells[k].mine);mines=[...mines.slice(1),safe]}for(const k of mines)g.flag(k%9,Math.floor(k/9));g.reveal(i%9,Math.floor(i/9));if(wrong)assert.equal(g.status,'lost');else assert.ok(ns.filter(k=>!g.cells[k].mine).every(k=>g.cells[k].revealed));}});
test('validates custom limits',()=>{assert.ok(validConfig(9,9,10));assert.ok(validConfig(30,16,99));assert.equal(validConfig(1,9,1),false);assert.equal(validConfig(9,9,81),false);assert.equal(validConfig(9.5,9,10),false)});
