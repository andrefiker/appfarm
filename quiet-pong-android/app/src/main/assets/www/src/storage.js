export const DEFAULTS = Object.freeze({matches:0,wins:0,losses:0,bestRally:0,practiceBest:0,preferredSide:'left',sound:true,volume:55,haptics:true,difficulty:'normal'});
export function readLocal(storage=globalThis.localStorage){
  try{return {...DEFAULTS,...JSON.parse(storage.getItem('quietPong.v1')||'{}')};}catch{return {...DEFAULTS};}
}
export function writeLocal(value,storage=globalThis.localStorage){
  try{storage.setItem('quietPong.v1',JSON.stringify({...DEFAULTS,...value}));return true;}catch{return false;}
}
export function recordMatch(stats,{won,longestRally,mode}){
  const next={...stats};
  next.bestRally=Math.max(next.bestRally||0,longestRally||0);
  if(mode==='practice')next.practiceBest=Math.max(next.practiceBest||0,longestRally||0);
  else{next.matches=(next.matches||0)+1;if(mode==='cpu'){if(won)next.wins=(next.wins||0)+1;else next.losses=(next.losses||0)+1;}}
  return next;
}
