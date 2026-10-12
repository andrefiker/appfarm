import assert from 'node:assert/strict';
import { frontendPath } from '../frontend-delivery.js';

assert.equal(frontendPath('/', false), null, 'do not serve the app without a ready identity schema');
assert.equal(frontendPath('/assets/quiet-knight/index.html', false), null, 'do not serve the APK web entry before schema readiness');
assert.equal(frontendPath('/', true), '/');
assert.equal(frontendPath('/assets/quiet-knight/index.html', true), '/index.html');
assert.equal(frontendPath('/assets/index-C465RDXf.js', true), '/assets/index-C465RDXf.js');
console.log('Frontend delivery alias and schema gate passed.');
