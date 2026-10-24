import assert from 'node:assert/strict';
import {loadTablePreferences,REFERENCE_TABLE_UPGRADE} from '../src/table-preferences.ts';
const values = new Map([
 ['qk-piece-set-v1','classic'],['qk-atmosphere-v1','Royal Meadow'],['qk-zen-table-v1','true'],
 ['qk-local-save-v1:guest','saved-position'],['qk-seat-token','private-seat'],['qk-account','player-record'],
]);
const storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Walnut',pieceSet:'kawaii-faces',zen:false});
assert.equal(values.get(REFERENCE_TABLE_UPGRADE),'applied');
for(const [key,value] of [['qk-local-save-v1:guest','saved-position'],['qk-seat-token','private-seat'],['qk-account','player-record']]) assert.equal(values.get(key),value);
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Walnut',pieceSet:'kawaii-faces',zen:false},'reload / StrictMode retains migrated design');
values.set('qk-piece-set-v1','animal-kingdom');values.set('qk-atmosphere-v1','Forest');values.set('qk-zen-table-v1','true');
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Forest',pieceSet:'animal-kingdom',zen:true},'later explicit choices survive launch');
values.set('qk-piece-set-v1','classic');assert.equal(loadTablePreferences(storage).pieceSet,'classic');
const broken = {getItem:()=>null,setItem:()=>{throw Error('storage full');}};
assert.equal(loadTablePreferences(broken).pieceSet,'kawaii-faces');assert.equal(loadTablePreferences().atmosphere,'Walnut');
console.log('Pictured table upgrade passed: saved Classic migrates once; games, identity and later choices are preserved.');
