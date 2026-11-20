import {useEffect, useState} from 'react';
import {accountRequest} from './account-api';
import {identityHeaders} from './player-credential';
import {headToHeadPath, parseHeadToHead, rememberScoreboardRival} from './head-to-head-model';
import type {HeadToHeadTotals} from './head-to-head-model';

type Props = {
  viewerId: string;
  rival: {id: string; handle: string};
  roomCode: string;
  eventId?: string;
  settling: boolean;
};

type Snapshot = {path: string; status: 'loading' | 'ready' | 'failed'; totals: HeadToHeadTotals | null};

export function HeadToHead({viewerId, rival, roomCode, eventId, settling}: Props) {
  const path = headToHeadPath(viewerId, rival.id);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const reconnect = () => setRetry(n => n + 1);
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  useEffect(() => {
    let alive = true;
    setSnapshot(previous => ({path, status: 'loading', totals: previous?.path === path ? previous.totals : null}));
    void accountRequest<unknown>(path, undefined, identityHeaders()).then(value => {
      const totals = parseHeadToHead(value);
      if (!totals) throw new Error('Invalid head-to-head totals');
      if (!alive) return;
      rememberScoreboardRival(viewerId, rival);
      setSnapshot({path, status: 'ready', totals});
    }).catch(error => {
      if (!alive) return;
      const denied = error?.status === 401 || error?.status === 403;
      setSnapshot(previous => ({path, status: 'failed', totals: !denied && previous?.path === path ? previous.totals : null}));
    });
    return () => {alive = false;};
  }, [path, roomCode, eventId, retry]);
  const current = snapshot?.path === path ? snapshot : null;
  const totals = current?.totals;
  return <div className="series-score lifetime-score" role="status" aria-label="Lifetime scoreboard" title="Completed games together across rooms and colors">
    {totals ? <>
      <span>You {totals.wins}</span><span>Draws {totals.draws}</span><span>{rival.handle} {totals.losses}</span>
      <small>{current?.status === 'failed' ? 'Last verified totals' : settling ? 'Saving result.' : current?.status === 'ready' ? 'All recorded games' : 'Updating score.'}</small>
    </> : <small>{current?.status === 'failed' ? 'Lifetime score unavailable' : settling ? 'Saving result.' : 'Loading lifetime score.'}</small>}
  </div>;
}
