import {useEffect, useState} from 'react';
export type ServerCapabilities = {protocol: number; new_games: string; guest_play: boolean; variants: string[]; correspondence?: boolean};
export type Compatibility = {state: 'checking'|'compatible'|'incompatible'|'unavailable'; message: string; capabilities?: ServerCapabilities};
export async function inspectServer(signal?: AbortSignal): Promise<Compatibility> {
  try {
    const r = await fetch('/capabilities', {cache:'no-store', credentials:'omit', signal});
    if (r.status === 404) return {state:'incompatible',message:'This server uses an older game protocol. New untimed friend games require the separately approved server update. Existing rooms can still be reopened.'};
    if (!r.ok) throw Error('unavailable');
    const c = await r.json();
    if (c.protocol !== 2 || c.new_games !== 'untimed' || c.guest_play !== true || !Array.isArray(c.variants) || !c.variants.includes('standard'))
      return {state:'incompatible',message:'Untimed guest multiplayer is unsupported by this server. Local play is available offline.'};
    return {state:'compatible', message:'Server supports untimed guest games.',capabilities:c};
  } catch { return {state:'unavailable',message:'Server unavailable. Local play works offline; reconnect to create a friend game.'}; }
}
export function useServerCapabilities() {
  const [result,setResult] = useState<Compatibility>({state:'checking',message:'Checking friend-game compatibility…'});
  useEffect(()=>{
    let controller: AbortController; let mounted=true;
    const check = () => { controller?.abort(); controller = new AbortController(); const current=controller;
      const timer=setTimeout(()=>current.abort(),4000);
      void inspectServer(current.signal).then(r=>{if(!mounted||controller!==current)return;if(!current.signal.aborted)setResult(r);else if(controller===current)setResult({state:'unavailable',message:'Server check timed out. Local play remains available.'});}).finally(()=>clearTimeout(timer)); };
    check();window.addEventListener('online',check);
    return()=>{mounted=false;controller?.abort();window.removeEventListener('online',check);};
  },[]);
  return result;
}
