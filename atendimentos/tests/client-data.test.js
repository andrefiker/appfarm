const assert = require('node:assert/strict');
const {test} = require('node:test');
const {validateClients,safeUrl} = require('../app/src/main/assets/client-data.js');
const person = () => ({id:'synthetic-1',name:'Pessoa Exemplo',lastSession:'2026-10-01',status:'Ativo',
 driveFolderUrl:'https://drive.google.com/drive/folders/example', dossierUrl:'https://docs.google.com/document/d/example/edit',
 roadmapUrl:'https://docs.google.com/document/d/example2/edit',notebookUrl:'https://notebooklm.google.com',
 briefing:'Exemplo fictício',postura:'Acolher',zonasAfeto:['Tema'],reflexoes:['Reflexão'],
 dossier:{quadroReferencia:'x',incongruencia:'x',condicoesValor:'x',climaRelacional:'x',tendenciaAtualizante:'x'}});
test('imports a valid synthetic roster and strips unknown fields', () => {
 const input = person(); input.extra='private'; const [record]=validateClients([input]);
 assert.equal(record.extra,undefined); assert.equal(record.name,'Pessoa Exemplo');
});
test('rejects duplicate IDs, unsafe links and malformed data', () => {
 assert.throws(() => validateClients([person(),person()]));
 for (const link of ['javascript:alert(1)','http://docs.google.com','https://docs.google.com.evil.test/x']) {
   const input=person(); input.dossierUrl=link; assert.throws(() => validateClients([input]));
 }
 assert.equal(safeUrl('https://drive.google.com/drive/folders/example'),true);
 assert.throws(() => validateClients({}));
});
test('JSON import/export preserves the clinical schema', () => {
 const data=validateClients([person()]); assert.deepEqual(validateClients(JSON.parse(JSON.stringify(data))), data);
});
