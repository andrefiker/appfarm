import {test} from 'node:test';
import assert from 'node:assert/strict';
import {challenge,challenges} from '../challenges.js';
import {validState,won,Game} from '../engine.js';
test('every challenge has a complete legal solution and survives save and restart',()=>{
 for(const item of challenges){const {state,solution}=challenge(item.id);assert.ok(validState(state));assert.equal(solution.length,52+item.steps);let g=Game.fromState(state);for(const step of solution){assert.ok(g.apply(step.from,step.to));assert.ok(validState(g.state))}assert.ok(won(g.state));assert.ok(g.undo());assert.ok(!won(g.state));assert.ok(g.redo());assert.ok(won(g.state));let restored=Game.restore(g.serialize());assert.ok(won(restored.state));restored.restart();assert.deepEqual(restored.state,state);}
});
test('restore rejects damaged deck and inconsistent history',()=>{
 const g=Game.fromState(challenge(1).state);let save=JSON.parse(g.serialize());save.original.deck[0]=save.original.deck[1];assert.equal(Game.restore(JSON.stringify(save)),null);
 save=JSON.parse(g.serialize());save.positions[0].seed=99;assert.equal(Game.restore(JSON.stringify(save)),null);
});

test('challenge selection shows increasing initial cell pressure',()=>{assert.deepEqual(challenges.map(c=>challenge(c.id).state.cells.filter(x=>x!==null).length),[0,3,4])});
