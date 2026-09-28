import test from 'node:test';
import assert from 'node:assert/strict';
import { tableauOverlapLayout } from '../src/layout.js';

test('long tableau columns tighten spacing before the board needs to scroll', () => {
  const fit = tableauOverlapLayout({ availableHeight: 500, cardHeight: 70, layers: 25, preferred: 20, minimum: 12 });
  assert.equal(fit.overlap, (500 - 70) / 24);
  assert.equal(fit.needsScroll, false);
});

test('extreme stacks keep a selectable minimum overlap and enable board scrolling', () => {
  const fit = tableauOverlapLayout({ availableHeight: 260, cardHeight: 70, layers: 30, preferred: 20, minimum: 12 });
  assert.equal(fit.overlap, 12);
  assert.equal(fit.needsScroll, true);
});

test('short columns keep the preferred card overlap', () => {
  const fit = tableauOverlapLayout({ availableHeight: 500, cardHeight: 70, layers: 7, preferred: 18, minimum: 12 });
  assert.equal(fit.overlap, 18);
  assert.equal(fit.needsScroll, false);
});
