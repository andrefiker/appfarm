import { RED } from './engine.js';

const DRAG_THRESHOLDS = Object.freeze({ touch: 12, pen: 8, mouse: 6 });

export function dragThreshold(pointerType = 'mouse') {
  return DRAG_THRESHOLDS[pointerType] ?? DRAG_THRESHOLDS.mouse;
}

export function hasExceededDragThreshold(dx, dy, pointerType = 'mouse') {
  return Math.hypot(dx, dy) >= dragThreshold(pointerType);
}

export function isDoubleTap(previous, key, now, windowMs = 330) {
  return Boolean(previous?.key === key && now - previous.at >= 0 && now - previous.at <= windowMs);
}

/** Delay only cards that can go to a foundation so a double tap is atomic. */
export function createTapDispatcher({ single, double, schedule = setTimeout, cancel = clearTimeout, windowMs = 280 }) {
  let pending = null;
  function flush() {
    if (!pending) return;
    const item = pending; pending = null; cancel(item.timer); single(item.source);
  }
  return {
    flush,
    clear() { if (pending) cancel(pending.timer); pending = null; },
    tap(source, key, now, canDouble) {
      if (pending && isDoubleTap(pending, key, now, windowMs)) {
        cancel(pending.timer); pending = null; double(source); return 'double';
      }
      flush();
      if (canDouble) {
        pending = { source, key, at: now, timer: schedule(flush, windowMs) };
        return 'pending';
      }
      single(source); return 'single';
    },
  };
}

/** A foundation card is automatic only when the opposite colors are ready. */
export function safeFoundationMove(state, source) {
  const pile = sourcePile(state, source);
  const index = source.cardIndex ?? (pile?.length ?? 0) - 1;
  const card = pile?.[index];
  if (!card || index !== pile.length - 1 || source.type === 'foundation') return false;
  if (card.rank <= 2) return true;
  const opposite = state.foundations
    .filter(foundation => foundation.length && RED.has(foundation[0].suit) !== RED.has(card.suit));
  return opposite.length === 2 && opposite.every(foundation => foundation.length >= card.rank - 1);
}

export function pickExpandedDropTarget(point, candidates, padding = 14) {
  let best = null;
  for (const candidate of candidates ?? []) {
    const rect = candidate.rect;
    if (!rect || point.x < rect.left - padding || point.x > rect.right + padding
      || point.y < rect.top - padding || point.y > rect.bottom + padding) continue;
    const cx = Math.max(rect.left, Math.min(point.x, rect.right));
    const cy = Math.max(rect.top, Math.min(point.y, rect.bottom));
    const distance = Math.hypot(point.x - cx, point.y - cy);
    if (!best || distance < best.distance) best = { target: candidate.target, distance };
  }
  return best?.target ?? null;
}

function sourcePile(state, source) {
  if (source.type === 'tableau') return state.tableau[source.index];
  if (source.type === 'waste') return state.waste;
  if (source.type === 'foundation') return state.foundations[source.index];
  return null;
}

/** Aces can start on any empty foundation; choose one without asking the player. */
export function chooseAceFoundation(state, source, targets, random = Math.random) {
  const pile = sourcePile(state, source);
  const card = pile?.[source.cardIndex ?? (pile?.length ?? 0) - 1];
  if (card?.rank !== 1) return null;
  const empty = (targets ?? []).filter(target =>
    target.type === 'foundation' && !state.foundations[target.index]?.length
  );
  if (!empty.length) return null;
  return empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
}

/**
 * Pick a tap destination only when it is unambiguous or follows a conservative,
 * documented priority: uncover a hidden tableau card, then advance a safe card
 * to its foundation. Return null when a tap should select instead.
 */
export function chooseSmartDestination(state, source, targets, enabled = true, hand = 'left') {
  if (!enabled || !targets?.length) return null;
  if (targets.length === 1) return targets[0];

  const pile = sourcePile(state, source);
  const cardIndex = source.cardIndex ?? (pile?.length ?? 0) - 1;
  const card = pile?.[cardIndex];
  if (!card) return null;

  const tableauTargets = targets.filter(target => target.type === 'tableau');
  const revealsHiddenCard = source.type === 'tableau'
    && cardIndex > 0
    && pile[cardIndex - 1].faceUp === false;
  if (revealsHiddenCard && tableauTargets.length === 1) return tableauTargets[0];

  // Empty columns are equivalent destinations for a King. Make this tap useful
  // only when it exposes a hidden card or moves a King from the waste.
  if (card.rank === 13 && tableauTargets.length === targets.length
    && tableauTargets.every(target => !state.tableau[target.index].length)
    && (source.type === 'waste' || revealsHiddenCard)) {
    return [...tableauTargets].sort((a, b) => {
      if (source.type === 'tableau') {
        const distance = Math.abs(a.index - source.index) - Math.abs(b.index - source.index);
        if (distance) return distance;
      }
      return hand === 'right' ? b.index - a.index : a.index - b.index;
    })[0];
  }

  const foundationTargets = targets.filter(target => target.type === 'foundation');
  if (foundationTargets.length === 1 && safeFoundationMove(state, source)) return foundationTargets[0];
  return null;
}
