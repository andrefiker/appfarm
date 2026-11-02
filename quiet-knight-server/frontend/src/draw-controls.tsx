import type { Color } from './pieces';

type Proposal = { kind: 'draw' | 'takeback'; by: Color };
export type DrawAction = 'request' | 'accept' | 'decline' | 'cancel';

export function DrawControls({ me, proposal, busy, connected, paused, onAction }: {
  me: Color;
  proposal?: Proposal | null;
  busy: boolean;
  connected: boolean;
  paused: boolean;
  onAction: (action: DrawAction) => void;
}) {
  const disabled = busy || !connected || paused;
  const note = !connected ? 'Reconnect to offer or answer a draw.'
    : paused ? 'Resume the game to offer or answer a draw.' : null;
  if (proposal?.kind !== 'draw') return (
    <section className="draw-controls" aria-label="Draw offer">
      <button type="button" className="secondary" disabled={disabled || Boolean(proposal)} onClick={() => onAction('request')}>Offer draw</button>
      {note ? <small>{note}</small> : proposal ? <small>Resolve the takeback request first.</small> : null}
    </section>
  );
  const mine = proposal.by === me;
  return (
    <section className="draw-controls draw-pending" aria-label="Draw offer">
      <div role="status" aria-live="polite" aria-atomic="true">
        <strong>{mine ? 'Draw offered' : 'Your opponent offered a draw'}</strong>
        <p>{mine ? 'Waiting for your opponent’s answer.' : 'Accept to end this game as a draw, or keep playing.'}</p>
      </div>
      <div className="draw-actions">
        {mine ? <button type="button" className="secondary" disabled={disabled} onClick={() => onAction('cancel')}>Cancel offer</button> : <>
          <button type="button" className="secondary" disabled={disabled} onClick={() => onAction('decline')}>Decline draw</button>
          <button type="button" className="primary" disabled={disabled} onClick={() => onAction('accept')}>Accept draw</button>
        </>}
      </div>
      {note ? <small>{note}</small> : <small>Play can continue. A move clears the offer.</small>}
    </section>
  );
}
