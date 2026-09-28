import {cp,rm,mkdir} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const item of ['index.html','manifest.webmanifest','service-worker.js','src','public']) await cp(item,`dist/${item}`,{recursive:true});
console.log('Built offline-ready PWA in dist/');
