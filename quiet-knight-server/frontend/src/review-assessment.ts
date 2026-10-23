export function reviewAssessment(beforeWhite:number,afterWhite:number,mover:'w'|'b',tactical=false){
 if(!Number.isFinite(beforeWhite)||!Number.isFinite(afterWhite))return{category:'Not evaluated',loss:null,missedTactic:false};
 const loss=Math.max(0,(beforeWhite-afterWhite)*(mover==='w'?1:-1));
 return{category:loss>=200?'Blunder':loss>=100?'Mistake':loss>=50?'Inaccuracy':'No major loss',loss,missedTactic:tactical&&loss>=100};
}
export function adaptiveLevel(level:number,result:'win'|'loss'|'draw',enabled:boolean){return enabled?Math.max(1,Math.min(10,level+(result==='win'?1:result==='loss'?-1:0))):level;}
