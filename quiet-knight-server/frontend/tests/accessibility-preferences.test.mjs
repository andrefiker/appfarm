import assert from 'node:assert/strict';
import test from 'node:test';
import {readSoundCues,soundCue,readPieceStyle} from '../src/accessibility-preferences.ts';
test('legacy and malformed settings preserve existing audio behavior and default sculptures',()=>{
 const all={move:true,capture:true,check:true};
 assert.deepEqual(readSoundCues(undefined),all);
 assert.deepEqual(readSoundCues({move:'true',capture:false,check:0}),{...all,capture:false});
 assert.equal(readPieceStyle('sculptor'),'sculptor');
 assert.equal(readPieceStyle('contrast'),'contrast');
 assert.equal(readPieceStyle('old-animal'),'sculptor');
});
test('each fresh move selects at most one category; check wins when enabled',()=>{
 const p=readSoundCues({move:false});
 assert.equal(soundCue(p,false,false),null);
 assert.equal(soundCue(p,true,false),'capture');
 assert.equal(soundCue(p,true,true),'check');
 assert.equal(soundCue({...p,check:false},true,true),'capture');
 assert.equal(soundCue({...p,check:false,capture:false},true,true),null);
 assert.equal(soundCue(readSoundCues({capture:false}),true,false),null);
 assert.equal(soundCue(readSoundCues({check:false}),false,true),'move');
});
