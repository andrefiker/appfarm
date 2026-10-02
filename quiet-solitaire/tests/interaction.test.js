import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from '../src/engine.js';
import { chooseAceFoundation, chooseSmartDestination, createTapDispatcher, dragThreshold, hasExceededDragThreshold, isDoubleTap, pickExpandedDropTarget, safeFoundationMove } from '../src/interaction.js';

function fixture() {
  const game = newGame(1);
  game.waste = [];
  game.foundations = [[], [], [], []];
  game.tableau = Array.from({ length: 7 }, () => []);
  return game;
}

test('touch drift stays a tap while mouse and pen retain precise drag thresholds', () => {
  assert.equal(dragThreshold('touch'), 12);
  assert.equal(hasExceededDragThreshold(8, 0, 'touch'), false);
  assert.equal(hasExceededDragThreshold(12, 0, 'touch'), true);
  assert.equal(hasExceededDragThreshold(5, 0, 'mouse'), false);
  assert.equal(hasExceededDragThreshold(6, 0, 'mouse'), true);
  assert.equal(hasExceededDragThreshold(8, 0, 'pen'), true);
});

test('double tap recognition requires the same card inside a short window', () => {
  const previous = { key: 'tableau:2:4', at: 1000 };
  assert.equal(isDoubleTap(previous, 'tableau:2:4', 1280), true);
  assert.equal(isDoubleTap(previous, 'tableau:2:3', 1280), false);
  assert.equal(isDoubleTap(previous, 'tableau:2:4', 1400), false);
});

test('expanded drop targets accept a near miss but reject distant drops', () => {
  const candidates = [
    { target: { type: 'tableau', index: 0 }, rect: { left: 10, top: 20, right: 60, bottom: 90 } },
    { target: { type: 'tableau', index: 1 }, rect: { left: 64, top: 20, right: 114, bottom: 90 } },
  ];
  assert.deepEqual(pickExpandedDropTarget({ x: 61, y: 55 }, candidates), { type: 'tableau', index: 0 });
  assert.deepEqual(pickExpandedDropTarget({ x: 63, y: 55 }, candidates), { type: 'tableau', index: 1 });
  assert.equal(pickExpandedDropTarget({ x: 140, y: 55 }, candidates), null);
});

test('an Ace is assigned to a randomly selected empty foundation slot', () => {
  const game = fixture();
  game.waste = [{ suit: 'hearts', rank: 1, faceUp: true }];
  game.foundations[1] = [{ suit: 'clubs', rank: 1, faceUp: true }];
  const targets = [0, 2, 3].map(index => ({ type: 'foundation', index }));
  assert.deepEqual(chooseAceFoundation(game, { type: 'waste', cardIndex: 0 }, targets, () => .8), targets[2]);
  assert.deepEqual(chooseAceFoundation(game, { type: 'waste', cardIndex: 0 }, targets, () => 0), targets[0]);
  assert.equal(chooseAceFoundation(game, { type: 'waste', cardIndex: 0 }, [{ type: 'tableau', index: 2 }]), null);
});

test('smart tap keeps a single legal destination automatic and respects the toggle', () => {
  const game = fixture();
  const only = { type: 'tableau', index: 3 };
  assert.equal(chooseSmartDestination(game, { type: 'waste' }, [only]), only);
  assert.equal(chooseSmartDestination(game, { type: 'waste' }, [only], false), null);
  assert.equal(chooseSmartDestination(game, { type: 'waste' }, []), null);
});

test('smart tap prefers the sole move that reveals a hidden tableau card', () => {
  const game = fixture();
  game.foundations[0] = Array.from({ length: 8 }, (_, i) => ({ suit: 'hearts', rank: i + 1, faceUp: true }));
  game.tableau[4] = [{ suit: 'spades', rank: 10, faceUp: true }];
  game.tableau[0] = [
    { suit: 'clubs', rank: 10, faceUp: false },
    { suit: 'hearts', rank: 9, faceUp: true },
  ];
  const source = { type: 'tableau', index: 0, cardIndex: 1 };
  const revealMove = { type: 'tableau', index: 4 };
  const alternatives = [revealMove, { type: 'foundation', index: 0 }];
  assert.equal(chooseSmartDestination(game, source, alternatives), revealMove);
});

test('smart tap advances a safe foundation card, but selects when it is unsafe', () => {
  const game = fixture();
  const card = { suit: 'hearts', rank: 4, faceUp: true };
  game.waste = [card];
  game.foundations[0] = Array.from({ length: 3 }, (_, i) => ({ suit: 'hearts', rank: i + 1, faceUp: true }));
  game.foundations[2] = Array.from({ length: 2 }, (_, i) => ({ suit: 'clubs', rank: i + 1, faceUp: true }));
  game.foundations[3] = Array.from({ length: 2 }, (_, i) => ({ suit: 'spades', rank: i + 1, faceUp: true }));
  game.tableau[0] = [{ suit: 'clubs', rank: 5, faceUp: true }];
  const source = { type: 'waste', cardIndex: 0 };
  const foundation = { type: 'foundation', index: 0 };
  const tableau = { type: 'tableau', index: 0 };
  assert.equal(chooseSmartDestination(game, source, [tableau, foundation]), null);
  game.foundations[2].push({ suit: 'clubs', rank: 3, faceUp: true });
  game.foundations[3].push({ suit: 'spades', rank: 3, faceUp: true });
  assert.equal(chooseSmartDestination(game, source, [tableau, foundation]), foundation);
  game.foundations[2] = [];
  game.foundations[3] = [];
  assert.equal(chooseSmartDestination(game, source, [tableau, foundation]), null);
});

test('whole sequence can reveal a hidden card and ambiguous destinations remain selected', () => {
  const game=fixture();
  game.tableau[0]=[
    {suit:'spades',rank:9,faceUp:false},
    {suit:'hearts',rank:8,faceUp:true},
    {suit:'clubs',rank:7,faceUp:true},
    {suit:'diamonds',rank:6,faceUp:true},
  ];
  const source={type:'tableau',index:0,cardIndex:1};
  const destination={type:'tableau',index:2};
  assert.equal(chooseSmartDestination(game,source,[destination]),destination);
  assert.equal(chooseSmartDestination(game,source,[destination,{type:'tableau',index:3}]),null);
});

test('low foundation cards are safe, higher cards wait for both opposite suits', () => {
  const game=fixture();
  game.waste=[{suit:'hearts',rank:2,faceUp:true}];
  assert.equal(safeFoundationMove(game,{type:'waste'}),true);
  game.waste[0].rank=5;
  game.foundations[0]=Array.from({length:4},(_,i)=>({suit:'clubs',rank:i+1,faceUp:true}));
  game.foundations[1]=Array.from({length:3},(_,i)=>({suit:'spades',rank:i+1,faceUp:true}));
  assert.equal(safeFoundationMove(game,{type:'waste'}),false);
  game.foundations[1].push({suit:'spades',rank:4,faceUp:true});
  assert.equal(safeFoundationMove(game,{type:'waste'}),true);
});

test('double tap cancels pending single tap and dispatches foundation exactly once', () => {
  const events=[],timers=new Map();
  let id=0;
  const taps=createTapDispatcher({
    single:s=>events.push('single:'+s),
    double:s=>events.push('foundation:'+s),
    schedule:fn=>{timers.set(++id,fn);return id},
    cancel:n=>timers.delete(n),
  });
  assert.equal(taps.tap('A','waste:0',1000,true),'pending');
  assert.equal(taps.tap('A','waste:0',1190,true),'double');
  for(const fn of timers.values())fn();
  assert.deepEqual(events,['foundation:A']);
  taps.tap('B','tableau:1',1500,false);
  assert.deepEqual(events,['foundation:A','single:B']);
});
