import { useEffect, useMemo, useState } from 'react';
import type { Color } from './pieces';

export type ClockState = {
  time_control?: { initial_ms: number; increment_ms: number };
  white_time_ms?: number;
  black_time_ms?: number;
  clock_running_color?: Color | null;
  turn_started_at?: number | null;
  server_now?: number;
};
export function clockMilliseconds(
  state: ClockState,
  color: Color,
  serverNow: number,
) {
  const saved =
    (color === 'w' ? state.white_time_ms : state.black_time_ms) ?? 0;
  const elapsed =
    state.clock_running_color === color &&
    typeof state.turn_started_at === 'number'
      ? Math.max(0, serverNow - state.turn_started_at)
      : 0;
  return Math.max(0, saved - elapsed);
}
export function clockText(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function ChessClock({
  state,
  color,
}: {
  state: ClockState;
  color: Color;
}) {
  const anchor = useMemo(
    () => ({
      server: state.server_now ?? Date.now(),
      wall: Date.now(),
      mono: performance.now(),
    }),
    [state],
  );
  const [elapsed, setElapsed] = useState(0);
  const running = state.clock_running_color === color;
  useEffect(() => {
    const tick = () =>
      setElapsed(
        Math.max(0, Date.now() - anchor.wall, performance.now() - anchor.mono),
      );
    tick();
    if (!running) return;
    const timer = window.setInterval(tick, 100);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('pageshow', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [anchor, running]);
  if (!state.time_control) return null;
  const ms = clockMilliseconds(state, color, anchor.server + elapsed),
    text = clockText(ms);
  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={`${color === 'w' ? 'White' : 'Black'} clock ${text}`}
      className={`chess-clock${running ? ' clock-active' : ''}${running && ms < 60000 ? ' clock-low' : ''}`}
      title="10 minutes · no increment"
    >
      {text}
    </span>
  );
}
