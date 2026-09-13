import { Chess } from 'chess.js';

export const INITIAL_MS = 600000;
export const timed = room => room.time_control?.initial_ms === INITIAL_MS;
const timeKey = color => color === 'w' ? 'white_time_ms' : 'black_time_ms';

export function resetClock(room, now) {
  Object.assign(room, {time_control:{initial_ms:INITIAL_MS,increment_ms:0}, white_time_ms:INITIAL_MS, black_time_ms:INITIAL_MS, clock_running_color:room.status === 'active' ? 'w' : null, turn_started_at:room.status === 'active' ? now : null, flagged_color:null});
}
export function deadline(room) {
  return timed(room) && room.status === 'active' && ['w','b'].includes(room.clock_running_color) && Number.isFinite(room.turn_started_at)
    ? room.turn_started_at + room[timeKey(room.clock_running_color)] : null;
}
export function remaining(room, color, now) {
  return Math.max(0, room[timeKey(color)] - (room.clock_running_color === color ? Math.max(0, now-room.turn_started_at) : 0));
}
export function stopClock(room, now) {
  if (!timed(room)) return;
  if (room.clock_running_color) room[timeKey(room.clock_running_color)] = remaining(room,room.clock_running_color,now);
  room.clock_running_color=null; room.turn_started_at=null;
}
export function moveClock(room, now) {
  if (!timed(room)) return;
  stopClock(room,now);
  if (room.status === 'active') {room.clock_running_color=room.turn;room.turn_started_at=now;}
}

// Material-based possible-mate test, considering BOTH armies and bishop square colors.
// A lone minor can mate with opposing blocking material; two knights can mate cooperatively.
// Like standard chess engines, this does not attempt exhaustive fortress/dead-position search.
export function hasMatingMaterial(fen, color) {
  const game=new Chess(fen), pieces=game.board().flat().filter(Boolean);
  const own=pieces.filter(p=>p.color===color&&p.type!=='k');
  const other=pieces.filter(p=>p.color!==color&&p.type!=='k');
  if (!own.length) return false;
  if (own.some(p=>['p','r','q'].includes(p.type))) return true;
  if (own.some(p=>p.type==='n')) return own.length>1 || other.some(p=>p.type!=='q');
  const bishops=pieces.filter(p=>p.type==='b');
  const squareColors=new Set(bishops.map(p=>game.squareColor(p.square)));
  return squareColors.size>1 || pieces.some(p=>p.type==='p'||p.type==='n');
}
export function flagClock(room, now) {
  const due=deadline(room);
  if (due===null || now<due) return false;
  const flagged=room.clock_running_color, opponent=flagged==='w'?'b':'w';
  stopClock(room,due);
  room.flagged_color=flagged;
  room.winner=hasMatingMaterial(room.fen,opponent)?opponent:null;
  room.status=room.winner?'timeout':'timeout_draw';
  room.ended_at=due;
  return true;
}
export function validTimeout(room) {
  if (!timed(room) || !['w','b'].includes(room.flagged_color) || room.turn!==room.flagged_color || room.clock_running_color!==null || room.turn_started_at!==null || room[timeKey(room.flagged_color)]!==0 || !Number.isFinite(room.ended_at)) return false;
  const opponent=room.flagged_color==='w'?'b':'w';
  const canMate=hasMatingMaterial(room.fen,opponent);
  return room.status===(canMate?'timeout':'timeout_draw') && room.winner===(canMate?opponent:null);
}
