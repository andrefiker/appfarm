import {cp,mkdir,rm,readdir,readFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('web','dist',{recursive:true});
for(const file of await readdir('dist'))if(/\.(js|html|css)$/.test(file)){const s=await readFile('dist/'+file,'utf8');if(/https?:\/\/|fetch\(|XMLHttpRequest|WebSocket/.test(s))throw Error('Remote dependency in '+file);}
console.log('Offline production bundle: dist/');
