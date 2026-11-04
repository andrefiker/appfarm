// Counts stay with the seated players when colors change. A missing ledger
// starts with this game; older guest games cannot be reconstructed reliably.
export function visibleSeries(room){
 const prior=room.series_score||{white:0,black:0,draws:0};
 const result={white:prior.white||0,black:prior.black||0,draws:prior.draws||0};
 if(['checkmate','draw','resigned','timeout','timeout_draw'].includes(room.status)){
  if(room.winner==='w')result.white++;else if(room.winner==='b')result.black++;else if(['draw','timeout_draw'].includes(room.status))result.draws++;
 }
 return result;
}
export function carrySeries(room,swap){
 const score=visibleSeries(room);
 return swap?{white:score.black,black:score.white,draws:score.draws}:score;
}
