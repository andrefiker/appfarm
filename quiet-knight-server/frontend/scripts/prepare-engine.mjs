import {readFileSync, mkdirSync, copyFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files = {
  'stockfish-18-lite-single.js':'5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391',
  'stockfish-18-lite-single.wasm':'a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1',
};
mkdirSync('public/engine',{recursive:true});mkdirSync('public/licenses',{recursive:true});
for(const [name,sha] of Object.entries(files)){
  const from='node_modules/stockfish/bin/'+name;
  if(createHash('sha256').update(readFileSync(from)).digest('hex')!==sha)throw Error('Unexpected engine bytes: '+name);
  copyFileSync(from,'public/engine/'+name);
}
copyFileSync('node_modules/stockfish/Copying.txt','public/licenses/GPL-3.0.txt');
copyFileSync('node_modules/chessops/LICENSE.txt','public/licenses/chessops.txt');
for(const [name,file] of [['chess.js','LICENSE'],['react','LICENSE'],['qrcode-generator','test/qrcode-test-impl.js']]){
  if(name==='qrcode-generator')continue;
  copyFileSync('node_modules/'+name+'/'+file,'public/licenses/'+name+'.txt');
}
writeFileSync('public/engine/manifest.json',JSON.stringify({engine:'Stockfish 18 Lite single-thread WebAssembly',package:'stockfish@18.0.8',license:'GPL-3.0',files},null,2));

const lock=JSON.parse(readFileSync('package-lock.json','utf8'));const notices=[];
for(const [path,meta]of Object.entries(lock.packages)){
 if(!path||meta.dev)continue;
 const name=path.split('node_modules/').at(-1);const candidates=['LICENSE','LICENSE.txt','LICENSE.md','license','Copying.txt'];let license='';
 for(const file of candidates)try{license=readFileSync(path+'/'+file,'utf8');break;}catch{}
 if(!license&&name==='qrcode-generator')license=readFileSync(path+'/dist/qrcode.js','utf8').split('var qrcode')[0];
 notices.push({name,version:meta.version,license:meta.license,text:license||'See upstream package for full license text.'});
}
writeFileSync('public/licenses/dependency-notices.json',JSON.stringify(notices,null,2));
