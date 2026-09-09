import assert from 'node:assert/strict';
// Cache API comparison must account for Vary on immutable public build assets.
const recorded=new Request('https://qk.test/assets/index-abc123.js',{headers:{Origin:'https://qk.test'}});
const incoming=new Request(recorded.url);
const response=new Response('export {};',{headers:{'Content-Type':'text/javascript','Vary':'Origin'}});
const match=(request,options={})=>request.url===recorded.url&&(options.ignoreVary||recorded.headers.get(response.headers.get('vary'))===request.headers.get(response.headers.get('vary')))?response:undefined;
assert.equal(match(incoming),undefined);
assert.equal(match(incoming,{ignoreVary:true}),response);
assert.equal(match(new Request('https://qk.test/assets/index-other.js'),{ignoreVary:true}),undefined);
console.log('PASS: reproduced stored-key/missing-match Vary behavior; ignoreVary preserves URL identity');
