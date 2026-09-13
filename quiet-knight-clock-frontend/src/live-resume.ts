const LAST_ROOM='qk-last-live-room';
export function lastLiveRoom():string|null{try{const code=localStorage.getItem(LAST_ROOM);return code&&/^[A-Z0-9]{6}$/.test(code)&&localStorage.getItem(`qk-seat-${code}`)?code:null;}catch{return null;}}
export function rememberLiveRoom(code:string,role:string,token:string|null){if(!/^[A-Z0-9]{6}$/.test(code)||!['white','black'].includes(role)||!token)return;try{if(localStorage.getItem(`qk-seat-${code}`)===token)localStorage.setItem(LAST_ROOM,code);}catch{}}
export function forgetLiveRoom(code:string){try{if(localStorage.getItem(LAST_ROOM)===code)localStorage.removeItem(LAST_ROOM);}catch{}}

