export class Worlds {
 async db(){if(this.handle)return this.handle;this.handle=await new Promise((resolve,reject)=>{const r=indexedDB.open('sand-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('worlds',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return this.handle;}
 async run(mode,fn){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction('worlds',mode),r=fn(tx.objectStore('worlds'));tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 async list(){return (await this.run('readonly',s=>s.getAll())).sort((a,b)=>b.updated-a.updated);}
 async save(name,data,id){if(typeof data!=='string'||data.length>8_000_000)throw Error('World is too large');const all=await this.list();if(!id&&all.length>=12)throw Error('12 world limit. Delete or export a world first.');if(all.filter(a=>a.id!==id).reduce((s,a)=>s+a.data.length,0)+data.length>24_000_000)throw Error('24 MB world storage limit reached.');const item={id:id??(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-')),name:String(name).trim().slice(0,60)||'Untitled world',data,updated:Date.now()};await this.run('readwrite',s=>s.put(item));return item;}
 delete(id){return this.run('readwrite',s=>s.delete(id));}
}
