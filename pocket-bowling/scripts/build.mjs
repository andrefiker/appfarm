import {mkdir,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});for(const p of ['index.html','src','icon.svg','manifest.webmanifest','sw.js'])await cp(p,'dist/'+p,{recursive:true});
