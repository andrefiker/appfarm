export type HapticKind = 'select' | 'move' | 'capture' | 'check' | 'arrival';
type HapticWindow = Window & {QuietKnightHaptics?: {postMessage: (kind:string)=>void}};
const patterns:Record<HapticKind,number|number[]>={select:7,move:14,capture:24,check:[16,35,16],arrival:10};
let foreground=true;
if(typeof window!=='undefined'){
 window.addEventListener('qk-background',()=>{foreground=false;});
 window.addEventListener('qk-resume',()=>{foreground=true;});
}

// This release turns on the newly available native feedback once. A later
// opt-out persists. Appearance, game saves and identity keys are untouched.
export function loadHapticPreference(storage?:Pick<Storage,'getItem'|'setItem'>):boolean{
 try{
  if(!storage)return true;
  if(storage.getItem('qk-native-haptics-v1')!=='ready'){
   storage.setItem('qk-haptics','true');
   storage.setItem('qk-native-haptics-v1','ready');
   return true;
  }
  return storage.getItem('qk-haptics')!=='false';
 }catch{return true;}
}

export function playHaptic(kind:HapticKind,enabled:boolean):boolean{
 if(!enabled||!foreground||typeof document==='undefined'||document.visibilityState==='hidden')return false;
 try{
  const bridge=(window as HapticWindow).QuietKnightHaptics;
  if(bridge&&typeof bridge.postMessage==='function'){bridge.postMessage(kind);return true;}
 }catch{/* A browser/older wrapper can still use the standard web fallback. */}
 try{return typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'?navigator.vibrate(patterns[kind]):false;}catch{return false;}
}
