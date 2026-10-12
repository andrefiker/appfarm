import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/animal-kingdom/pieces');
const names = ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn'];
const files = (await readdir(root)).sort();
assert.equal(files.length, 12, 'Expected one ivory and one ebony asset for each of six pieces');

function geometry(svg) {
  return svg
    .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
    .replace(/aria-label="[^"]*"/, 'aria-label="piece"');
}

for (const name of names) {
  const ivory = await readFile(path.join(root, `ivory-${name}.svg`), 'utf8');
  const ebony = await readFile(path.join(root, `ebony-${name}.svg`), 'utf8');
  for (const [file, svg] of [[`ivory-${name}.svg`, ivory], [`ebony-${name}.svg`, ebony]]) {
    assert.match(svg, /viewBox="0 0 100 100"/, `${file} must keep the shared square artboard`);
    assert.doesNotMatch(svg, /<rect\b|<image\b|(?:href|src)="https?:/i, `${file} must be transparent and self-contained`);
    assert.ok(Buffer.byteLength(svg) < 10_000, `${file} should stay light for mobile`);
  }
  assert.equal(geometry(ivory), geometry(ebony), `${name} armies must share identical geometry`);
}

const component = await readFile(path.resolve(root, '../../../src/animal-pieces.tsx'), 'utf8');
for (const name of names) assert.ok(component.includes(`file: '${name}'`), `Missing ${name} mapping`);
console.log('Animal Kingdom asset set passed: 12 lightweight transparent vectors, matched army geometry, and complete piece mapping.');
