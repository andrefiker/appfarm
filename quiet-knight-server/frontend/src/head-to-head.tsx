import {useEffect, useId, useRef, useState} from 'react';
import {accountRequest} from './account-api';
import {identityHeaders} from './player-credential';
import {headToHeadPath, parseHeadToHead, recentPairGames, rememberScoreboardRival, writePinnedOpponent} from './head-to-head-model';
import type {HeadToHeadTotals, RecentHumanGame, RivalAccount} from './head-to-head-model';
import './head-to-head.css';

type Props = {
  viewerId: string;
  rival: RivalAccount;
  roomCode: string;
  eventId?: string;
  settling: boolean;
  recentGames?: ReadonlyArray<RecentHumanGame>;
  pinnedRival?: RivalAccount | null;
  onPinChange?: () => void;
};

type Snapshot = {path: string; status: 'loading' | 'ready' | 'failed' | 'denied'; totals: HeadToHeadTotals | null};

export function HeadToHeadStatus({message}: {message: string}) {
  return <div className="series-score lifetime-score lifetime-score-status" role="status" aria-label="Lifetime scoreboard" title="Completed games together across rooms and colors">
    <strong>Lifetime score</strong><small>{message}</small>
  </div>;
}

export function HeadToHead({viewerId, rival, roomCode, eventId, settling, recentGames, pinnedRival, onPinChange}: Props) {
  const path = headToHeadPath(viewerId, rival.id);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [retry, setRetry] = useState(0);
  const [pinMessage, setPinMessage] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [history, setHistory] = useState<{path:string; status:'loading'|'ready'|'failed'; games:ReadonlyArray<RecentHumanGame>} | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const pinned = pinnedRival?.id === rival.id;
  useEffect(() => {
    const reconnect = () => setRetry(n => n + 1);
    window.addEventListener('online', reconnect);
    return () => window.removeEventListener('online', reconnect);
  }, []);
  useEffect(() => {
    dialog.current?.close();
    setPinMessage('');
  }, [path]);
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
      setSnapshot(previous => ({path, status: denied ? 'denied' : 'failed', totals: !denied && previous?.path === path ? previous.totals : null}));
    });
    return () => {alive = false;};
  }, [path, roomCode, eventId, retry]);
  const current = snapshot?.path === path ? snapshot : null;
  const totals = current?.totals;
  const allowed = current?.status === 'ready' || Boolean(totals && current?.status !== 'denied');
  useEffect(() => {
    if (!allowed && dialog.current?.open) dialog.current.close();
  }, [allowed]);
  useEffect(() => {
    if (!detailsOpen || !allowed || recentGames) return;
    let active = true;
    setHistory({path, status:'loading', games:[]});
    void accountRequest<{player?:{id?:string}, games?:RecentHumanGame[]}>('/players/me', undefined, identityHeaders())
      .then(data => {
        if (data.player?.id !== viewerId || !Array.isArray(data.games)) throw new Error('Recent game list unavailable');
        if (active) setHistory({path,status:'ready',games:data.games});
      }).catch(() => {if(active) setHistory({path,status:'failed',games:[]});});
    return () => {active = false;};
  }, [detailsOpen, allowed, recentGames, path, viewerId, eventId]);
  const source = recentGames ?? (history?.path === path && history.status === 'ready' ? history.games : undefined);
  const matches = allowed && source ? recentPairGames(source, viewerId, rival.id) : [];
  const historyFailed = history?.path === path && history.status === 'failed';
  const note = totals ? (current?.status === 'failed' ? 'Last verified totals' : settling ? 'Saving result.' : current?.status === 'ready' ? 'All recorded games' : 'Updating score.') : (current?.status === 'failed' ? 'Lifetime score unavailable' : settling ? 'Saving result.' : 'Loading lifetime score.');
  const date = new Intl.DateTimeFormat(undefined,{dateStyle:'medium'});
  function togglePin() {
    if (!allowed || !onPinChange) return;
    if (writePinnedOpponent(viewerId, pinned ? null : rival)) {
      onPinChange();
      setPinMessage(pinned ? 'Opponent unpinned.' : 'Opponent pinned on this device.');
    } else setPinMessage('This device could not save your pinned opponent.');
  }
  if (current?.status === 'denied') return <HeadToHeadStatus message='Sign in to view your lifetime score.' />;
  if (!totals) return <HeadToHeadStatus message={note} />;
  const scoreLabel = `Lifetime scoreboard: You ${totals.wins}, draws ${totals.draws}, ${rival.handle} ${totals.losses}. Open recent games.`;
  const cells = [[totals.wins,'Your wins'],[totals.draws,'Draws'],[totals.losses,`${rival.handle} wins`]] as const;
  return <div className="lifetime-score-mount">
    <button type="button" ref={opener} className="series-score lifetime-score" aria-label={scoreLabel} aria-haspopup="dialog" title="Open head-to-head history" onClick={() => {if (dialog.current && !dialog.current.open) {dialog.current.showModal(); setDetailsOpen(true);}}}>
      <span className="lifetime-score-cells" aria-hidden="true">
        {cells.map(([number,caption]) => <span key={caption} className="lifetime-score-cell"><strong className="lifetime-score-number">{number}</strong><span className="lifetime-score-caption">{caption}</span></span>)}
      </span>
      <small className="lifetime-score-note">{note} <span aria-hidden="true">· ›</span></small>
    </button>
    <dialog className="head-to-head-dialog" ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={() => {setDetailsOpen(false); opener.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)e.currentTarget.close();}}>
      <div className="head-to-head-content">
        <header><h2 id={titleId}>You vs {rival.handle}</h2><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Close</button></header>
        <p id={descriptionId}>Across all rooms and both colors: {totals.wins} wins, {totals.draws} draws, {totals.losses} losses.</p>
        {onPinChange ? <><button type="button" className="secondary" onClick={togglePin}>{pinned ? 'Unpin opponent' : `Pin ${rival.handle}`}</button><p className="head-to-head-pin-note" role="status">{pinMessage || (pinned ? 'Pinned on this device.' : 'Pin this opponent to find the rivalry from Home.')}</p></> : null}
        <h3>Recent games</h3>
        <p>From your last eight completed online games.</p>
        {!source ? <p>{historyFailed ? "Recent history unavailable." : "Loading recent games."}</p> : matches.length ? <ul aria-label="Recent games together">{matches.map(game => <li key={game.id}><strong>{game.outcome}</strong><time dateTime={new Date(game.endedAt).toISOString()}>{date.format(game.endedAt)}</time>{game.moveCount !== null ? <small>{game.moveCount} {game.moveCount === 1 ? 'move' : 'moves'}</small> : null}</li>)}</ul> : <p>No games with {rival.handle} in this recent history.</p>}
      </div>
    </dialog>
  </div>;
}
