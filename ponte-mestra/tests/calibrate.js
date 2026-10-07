// Calibra orçamentos: para cada nível, acha o projeto automático mais barato que passa
// (preferindo 3★ robusto) e grava budget = custo × folga, arredondado a R$500.
// Também salva as pontes de referência em tests/solutions.json.
const fs = require('fs'), path = require('path');
const D = require('./designer.js'); const E = D.E;
const file = path.join(__dirname, '../src/levels.json');
const lines = fs.readFileSync(file, 'utf8').split('\n');
const sols = {};
for (const lv of E.LEVELS) {
  const r = D.solveLevel(lv, { maxTries: 20 });
  const c = r.best || r.firstPass;
  if (!c) { console.log('L' + lv.id, 'SEM SOLUÇÃO'); process.exitCode = 1; continue; }
  const k = r.best ? 1.05 : 1.15;
  const budget = Math.ceil(c.cost * k / 500) * 500;
  sols[lv.id] = { cost: c.cost, peak: +c.peak.toFixed(3), d: c.d, bridge: c.br };
  const i = lines.findIndex(l => l.startsWith('{"id":' + lv.id + ','));
  lines[i] = lines[i].replace(/"budget":\d+/, '"budget":' + budget);
  console.log(`L${lv.id} ${lv.name}: R$${c.cost} -> budget ${budget} (${r.best ? '3★' : '1★'} peak ${c.peak.toFixed(2)}) [${c.d}]`);
}
fs.writeFileSync(file, lines.join('\n'));
fs.writeFileSync(path.join(__dirname, 'solutions.json'), JSON.stringify(sols));
