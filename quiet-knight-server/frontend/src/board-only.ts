import {useEffect} from 'react';

// The native bridge is restricted to the bundled app's top-level origin.
export function useBoardFullscreen() {
  useEffect(() => {
    const send = (mode: 'board' | 'normal') => {
      (window as Window & {QuietKnightDisplay?: {postMessage: (value:string) => void}}).QuietKnightDisplay?.postMessage(mode);
    };
    send('board');
    const resume=()=>send('board');
    window.addEventListener('qk-resume',resume);
    return()=>{window.removeEventListener('qk-resume',resume);send('normal');};
  },[]);
}
