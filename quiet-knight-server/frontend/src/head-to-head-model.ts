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
