// Public, credential-free protocol declaration. An absent/older endpoint must
// never be interpreted by a client as support for untimed guest multiplayer.
export const CAPABILITIES = Object.freeze({
  protocol: 1, new_games: 'untimed', increment_ms: 0, guest_play: true,
  variants: ['standard'], correspondence: true, draw_offers: true,
  takebacks: 'mutual-casual-untimed', reactions: true,
  cleanup: 'empty-waiting-only-7-days',
});
export function guestName(value) {
  return typeof value === 'string' ? value.normalize('NFKC').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 24) : '';
}
