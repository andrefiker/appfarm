import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/animal-kingdom/pieces');
const names = ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn'];
const files = (await readdir(root)).filter((file) => file.endsWith('.png')).sort();
assert.equal(files.length, 12, 'Expected one ivory and one ebony asset for each of six pieces');

for (const name of names) {
  for (const file of [`ivory-${name}.png`, `ebony-${name}.png`]) {
    const png = await readFile(path.join(root, file));
    assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), `${file} must be a PNG`);
    assert.equal(png.readUInt32BE(16), 512, `${file} must use the shared 512px artboard`);
    assert.equal(png.readUInt32BE(20), 512, `${file} must use the shared 512px artboard`);
    assert.equal(png[25], 6, `${file} must retain transparent RGBA pixels`);
    assert.ok(png.length < 600_000, `${file} should stay light for mobile`);
  }
}

const component = await readFile(path.resolve(root, '../../../src/animal-pieces.tsx'), 'utf8');
for (const name of names) assert.ok(component.includes(`file: '${name}'`), `Missing ${name} mapping`);
assert.match(component, /pieces\/\$\{army\}-\$\{animal\.file\}\.png/, 'Piece renderer must load local PNG assets');
console.log('Animal Kingdom asset set passed: 12 lightweight transparent PNGs and complete piece mapping.');
