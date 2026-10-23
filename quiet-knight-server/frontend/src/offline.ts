import { useEffect, useState } from 'react'; import { buildGame } from './computer'; import type { LocalMove } from './computer'; import type { Color } from './pieces'; export type LocalSave = { moves: LocalMove[]; color: Color; level: number }; const KEY = 'qk-local-save-v1'; const localKey=(playerId?:string)=>playerId?`${KEY}:${playerId}`:KEY; export function loadLocal(playerId?:string): LocalSave {
 const blank:LocalSave={moves:[],color:'w',level:5};
 for(const suffix of ['',':backup'])try{
  const raw=localStorage.getItem(localKey(playerId)+suffix);if(!raw)continue;
  const saved=JSON.parse(raw);
  if(saved.schema!==undefined&&saved.schema!==2)throw Error('Unsupported save schema');
  if(!Array.isArray(saved.moves)||saved.moves.length>4000||!['w','b'].includes(saved.color)||!Number.isInteger(saved.level)||saved.level<1||saved.level>10)throw Error('Invalid save');
  buildGame(saved.moves);return{moves:saved.moves,color:saved.color,level:saved.level};
 }catch{try{const raw=localStorage.getItem(localKey(playerId)+suffix);if(raw)localStorage.setItem(localKey(playerId)+':recovery'+suffix,raw);}catch{}}
 return blank;
}
export function saveLocal(save:LocalSave,playerId?:string):boolean {
 if(!playerId)return false;
 try{buildGame(save.moves);const key=localKey(playerId),old=localStorage.getItem(key);
  if(old){try{const prior=JSON.parse(old);if(prior.schema!==undefined&&prior.schema!==2)return false;buildGame(prior.moves);localStorage.setItem(key+':backup',old);}catch{localStorage.setItem(key+':recovery',old);}}
  localStorage.setItem(key,JSON.stringify({...save,schema:2}));return true;
 }catch{return false;}
}
export function useOfflineFiles(): string { const [status, setStatus] = useState('Offline files not yet saved'); useEffect(() => { if (!('serviceWorker' in navigator)) return; let active = true; let port: MessagePort | null = null; let timer: ReturnType<typeof setTimeout> | undefined; const check = async () => { try { const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }); void registration.update().catch(() => undefined); const ready = await navigator.serviceWorker.ready; if (!active) return; const channel = new MessageChannel(); port?.close(); port = channel.port1; if (timer) clearTimeout(timer); port.onmessage = event => { if (!active || event.data?.type !== 'QK_OFFLINE_STATUS') return; if (timer) clearTimeout(timer); setStatus(event.data.ready ? 'Computer files saved for offline play' : 'Offline files not yet saved'); port?.close(); }; timer = setTimeout(() => { if (active) setStatus('Offline files not yet saved'); port?.close(); }, 6000); ready.active?.postMessage({ type: 'QK_OFFLINE_STATUS' }, [channel.port2]); } catch { if (active) setStatus('Offline files not yet saved'); } }; void check(); navigator.serviceWorker.addEventListener('controllerchange', check); return () => { active = false; navigator.serviceWorker.removeEventListener('controllerchange', check); if (timer) clearTimeout(timer); port?.close(); }; }, []); return status; }
