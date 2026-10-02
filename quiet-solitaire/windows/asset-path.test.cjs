const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { assetPath } = require('./asset-path.cjs');

const root = path.resolve(__dirname, '..', 'dist');
test('only bundled assets on the local origin resolve', () => {
  assert.equal(assetPath(root, 'quiet://app/'), path.join(root, 'index.html'));
  assert.equal(assetPath(root, 'quiet://app/src/app.js'), path.join(root, 'src', 'app.js'));
  for (const url of ['https://example.com/', 'quiet://remote/index.html', 'quiet://app/%2e%2e%2fsecret', 'quiet://app/%5csecret', 'quiet://app/%00x', 'quiet://app/%ZZ']) {
    assert.equal(assetPath(root, url), null, url);
  }
});
