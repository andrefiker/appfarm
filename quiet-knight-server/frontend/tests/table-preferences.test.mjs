import assert from 'node:assert/strict';
import {loadTablePreferences,REFERENCE_TABLE_UPGRADE} from '../src/table-preferences.ts';
const values = new Map([
 ['qk-piece-set-v1','classic'],['qk-atmosphere-v1','Royal Meadow'],['qk-zen-table-v1','true'],
 ['qk-local-save-v1:guest','saved-position'],['qk-seat-token','private-seat'],['qk-account','player-record'],
]);
const storage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Walnut',pieceSet:'faceted',zen:false});
assert.equal(values.get(REFERENCE_TABLE_UPGRADE),'applied');
for(const [key,value] of [['qk-local-save-v1:guest','saved-position'],['qk-seat-token','private-seat'],['qk-account','player-record']]) assert.equal(values.get(key),value);
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Walnut',pieceSet:'faceted',zen:false},'reload / StrictMode retains migrated design');
values.set('qk-piece-set-v1','animal-kingdom');values.set('qk-atmosphere-v1','Forest');values.set('qk-zen-table-v1','true');
assert.deepEqual(loadTablePreferences(storage),{atmosphere:'Walnut',pieceSet:'faceted',zen:true},'old choices are overridden even after the earlier upgrade; focus preference survives');
values.set('qk-piece-set-v1','classic');assert.equal(loadTablePreferences(storage).pieceSet,'faceted');
const broken = {getItem:()=>null,setItem:()=>{throw Error('storage full');}};
assert.equal(loadTablePreferences(broken).pieceSet,'faceted');assert.equal(loadTablePreferences().atmosphere,'Walnut');
for(const piece of ['classic','animal-kingdom','kawaii-faces','unknown'])for(const theme of ['Classic Wood','Midnight','Ivory','Forest','Animal Kingdom','Walnut','Library','Rain','Royal Meadow','unknown']){values.set('qk-piece-set-v1',piece);values.set('qk-atmosphere-v1',theme);assert.equal(loadTablePreferences(storage).pieceSet,'faceted');assert.equal(loadTablePreferences(storage).atmosphere,'Walnut');}
for(const [key,value] of [['qk-local-save-v1:guest','saved-position'],['qk-seat-token','private-seat'],['qk-account','player-record']]) assert.equal(values.get(key),value);
console.log('Single wood table passed: every old theme/piece choice normalizes; game, identity and focus data retained.');
