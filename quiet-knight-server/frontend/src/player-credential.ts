// Credentials are read only for explicit authenticated HTTP headers. Never include this in diagnostics.
export function identityHeaders():Record<string,string>{try{const token=localStorage.getItem('qk-player-token-v1');return localStorage.getItem('qk-player-active-v1')!=='false'&&token&&/^[A-Za-z0-9_-]{43}$/.test(token)?{Authorization:'Bearer '+token}:{};}catch{return {};}}

