type Account = {id: string; handle: string};
type Seats = {
  white_player?: Account | null; black_player?: Account | null;
  white_joined: boolean; black_joined: boolean; status: string;
};
export type HeadToHeadTotals = {wins: number; losses: number; draws: number};
const playerId = /^[a-f0-9-]{36}$/;

export function rivalForRoom(room: Seats | null | undefined, color: 'w' | 'b' | null, viewer: string | undefined, pinned?: Account | null): Account | null {
  if (!room || !color || !viewer || !playerId.test(viewer)) return null;
  const mine = color === 'w' ? room.white_player : room.black_player;
  if (mine?.id !== viewer) return null;
  const other = color === 'w' ? room.black_player : room.white_player;
  const otherJoined = color === 'w' ? room.black_joined : room.white_joined;
  if (otherJoined) return other?.id && playerId.test(other.id) && other.id !== viewer ? other : null;
  return room.status === 'waiting' && pinned?.id && playerId.test(pinned.id) && pinned.id !== viewer ? pinned : null;
}

export function headToHeadPath(viewer: string, rival: string): string {
  return '/players/' + encodeURIComponent(viewer) + '/head-to-head/' + encodeURIComponent(rival);
}

export function parseHeadToHead(payload: unknown): HeadToHeadTotals | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const {wins, losses, draws} = payload as HeadToHeadTotals;
  return [wins, losses, draws].every(n => Number.isSafeInteger(n) && n >= 0) ? {wins, losses, draws} : null;
}

function pinKey(viewer: string) {return 'qk-scoreboard-rival-v1:' + viewer;}
export function readScoreboardRival(viewer: string | undefined): Account | null {
  if (!viewer) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(pinKey(viewer)) || 'null');
    if (stored && typeof stored.id === 'string' && playerId.test(stored.id) && typeof stored.handle === 'string' && /^[a-zA-Z0-9_-]{3,20}$/.test(stored.handle)) return {id: stored.id, handle: stored.handle};
  } catch {}
  return null;
}

export function rememberScoreboardRival(viewer: string, rival: Account): void {
  try {localStorage.setItem(pinKey(viewer), JSON.stringify({id: rival.id, handle: rival.handle}));} catch {}
}

export function scoreboardRoomStatus(room: Seats | null | undefined, color: 'w' | 'b' | null): string {
  if (!room) return 'Connecting to the table.';
  if (!color) return 'Only players can see their lifetime score.';
  const mine = color === 'w' ? room.white_player : room.black_player;
  const other = color === 'w' ? room.black_player : room.white_player;
  const joined = color === 'w' ? room.black_joined : room.white_joined;
  if (!mine?.id || !playerId.test(mine.id)) return 'Sign in, then play in a new room.';
  if (!joined) return 'Waiting for opponent to join.';
  if (!other?.id || !playerId.test(other.id)) return 'Opponent must sign in, then join a new room.';
  if (mine.id === other.id) return 'Use two different Knight IDs.';
  return 'Lifetime score unavailable.';
}
export type RivalAccount = Account;
export type RecentHumanGame = {id:string; white_player_id:string|null; black_player_id:string|null; result:string; ended_at:string; moves?:ReadonlyArray<unknown>};
export type RecentPairGame = {id:string; outcome:'Win'|'Draw'|'Loss'; endedAt:number; moveCount:number|null};

export function recentPairGames(games:ReadonlyArray<RecentHumanGame>, viewer:string, rival:string): RecentPairGame[] {
  if (!playerId.test(viewer) || !playerId.test(rival) || viewer === rival) return [];
  const found = new Map<string, RecentPairGame>();
  for (const game of games) {
    if (!game || typeof game.id !== 'string' || !game.id || found.has(game.id) || typeof game.ended_at !== 'string') continue;
    const white = game.white_player_id === viewer && game.black_player_id === rival;
    const black = game.black_player_id === viewer && game.white_player_id === rival;
    if (!white && !black) continue;
    const endedAt = Date.parse(game.ended_at);
    if (!Number.isFinite(endedAt) || !['1-0','0-1','1/2-1/2'].includes(game.result)) continue;
    const outcome = game.result === '1/2-1/2' ? 'Draw' : (white === (game.result === '1-0') ? 'Win' : 'Loss');
    found.set(game.id, {id:game.id,outcome,endedAt,moveCount:Array.isArray(game.moves) ? Math.ceil(game.moves.length/2) : null});
  }
  return [...found.values()].sort((a,b) => b.endedAt - a.endedAt).slice(0,8);
}

const explicitPinPrefix = 'qk-scoreboard-pin-v1:';
function explicitPinKey(viewer:string) {return explicitPinPrefix + viewer;}
export function hasStoredOpponentPin(): boolean {
  try {
    for(let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(explicitPinPrefix) && readPinnedOpponent(key.slice(explicitPinPrefix.length))) return true;
    }
  } catch {}
  return false;
}
export function readPinnedOpponent(viewer:string|undefined): Account|null {
  if (!viewer || !playerId.test(viewer)) return null;
  try {
    const rival = JSON.parse(localStorage.getItem(explicitPinKey(viewer)) || 'null');
    return validOpponent(viewer,rival) ? rival : null;
  } catch {return null;}
}
function validOpponent(viewer:string, rival:unknown): rival is Account {
  if (typeof rival !== 'object' || rival === null) return false;
  const a = rival as Account;
  return playerId.test(viewer) && typeof a.id === 'string' && playerId.test(a.id) && a.id !== viewer
    && typeof a.handle === 'string' && /^[a-zA-Z0-9_-]{3,20}$/.test(a.handle);
}
export function writePinnedOpponent(viewer:string, rival:Account|null): boolean {
  if (!playerId.test(viewer) || (rival && !validOpponent(viewer,rival))) return false;
  try {
    if (rival) localStorage.setItem(explicitPinKey(viewer), JSON.stringify({id:rival.id, handle:rival.handle}));
    else localStorage.removeItem(explicitPinKey(viewer));
    return true;
  } catch {return false;}
}
