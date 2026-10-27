import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ActiveClock} from '../clock.js';
test('fractional active intervals accumulate while pauses do not',()=>{const c=new ActiveClock(0);assert.equal(c.advance(0,true),0);assert.equal(c.advance(999,true),0);assert.equal(c.advance(1001,true),1);assert.equal(c.remainder,1);assert.equal(c.advance(1500,false),0);assert.equal(c.advance(9500,true),0);assert.equal(c.advance(10000,true),1);assert.equal(c.remainder,0)});
test('remainder survives persistence and inactive starts',()=>{const c=new ActiveClock(100,750);assert.equal(c.advance(500,true),0);assert.equal(c.advance(749,true),0);assert.equal(c.advance(750,false),1);assert.equal(c.remainder,0)});
