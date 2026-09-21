import type { ClockState } from './chess-clock';
import type { Color } from './pieces';

export type PauseAction = 'request' | 'accept' | 'decline' | 'cancel' | 'resume';

export function ClockControls({ state, me, busy, onAction }: {
  state: ClockState;
  me: Color | null;
  busy: boolean;
  onAction: (action: PauseAction) => void;
}) {
  if (!state.time_control || typeof state.clock_paused !== 'boolean') return null;
  const pending = state.pause_request;
  const button = (action: PauseAction, label: string, primary = false) => (
    <button type='button' className={primary ? 'pause-button pause-primary' : 'pause-button'} disabled={busy} onClick={() => onAction(action)}>{label}</button>
  );
  if (state.clock_paused) return (
    <section className='pause-panel is-paused' aria-label='Game pause'>
      <div role='status'><strong>Game paused</strong><span>Both clocks are stopped. Either player can resume.</span></div>
      {me ? button('resume', 'Resume game', true) : null}
    </section>
  );
  if (pending) return (
    <section className='pause-panel' aria-label='Pause request'>
      <div role='status'><strong>{pending.by === me ? 'Pause requested' : 'Pause requested by ' + (pending.by === 'w' ? 'White' : 'Black')}</strong><span>The clock keeps running until accepted.</span></div>
      <div className='pause-actions'>
        {me && pending.by === me ? button('cancel', 'Cancel request') : me ? <>{button('decline', 'Keep playing')}{button('accept', 'Accept pause', true)}</> : null}
      </div>
    </section>
  );
  return me ? <div className='pause-idle'>{button('request', 'Request pause')}</div> : null;
}
