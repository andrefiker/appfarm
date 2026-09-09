import type {Color} from './pieces';
import type {RememberedGame} from './knight-id';

export const LOSS_MESSAGE='You tried your best! And failed miserably...';
export function viewerLost(viewer:Color|null,winner:Color|null,ended:boolean,joined:boolean){
 return ended&&joined&&(viewer==='w'||viewer==='b')&&(winner==='w'||winner==='b')&&viewer!==winner;
}

export function historyEntry(game:RememberedGame,viewerId:string){
 const white=game.white_player_id,black=game.black_player_id;
 if(!white||!black||white===black||(white!==viewerId&&black!==viewerId)||!['1-0','0-1','1/2-1/2'].includes(game.result))return null;
 const color=white===viewerId?'White':'Black';
 const opponent=color==='White'?game.black_handle:game.white_handle;
 const outcome=game.result==='1/2-1/2'?'Draw':game.result===(color==='White'?'1-0':'0-1')?'Win':'Loss';
 const points=color==='White'?game.white_points:game.black_points;
 const pointsText=!game.scored?'No points':Number.isFinite(points)?`+${points} Quiet Point${points===1?'':'s'}`:'Points unavailable';
 const date=new Date(game.ended_at);
 return {color,opponent,outcome,pointsText,moves:Math.ceil(game.moves.length/2),date:Number.isFinite(date.getTime())?date.toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}):'Date unavailable'};
}
