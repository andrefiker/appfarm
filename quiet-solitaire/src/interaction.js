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
export function chooseSmartDestination(state, source, targets, enabled = true) {
  if (!enabled || !targets?.length) return null;
  if (targets.length === 1) return targets[0];

  const pile = sourcePile(state, source);
  const cardIndex = source.cardIndex ?? (pile?.length ?? 0) - 1;
  const card = pile?.[cardIndex];
  if (!card) return null;

  const tableauTargets = targets.filter(target => target.type === 'tableau');
  const revealsHiddenCard = source.type === 'tableau'
    && cardIndex === pile.length - 1
    && cardIndex > 0
    && pile[cardIndex - 1].faceUp === false;
  if (revealsHiddenCard && tableauTargets.length === 1) return tableauTargets[0];

  const foundationTargets = targets.filter(target => target.type === 'foundation');
  if (foundationTargets.length !== 1) return null;
  const oppositeFoundations = state.foundations.filter(foundation =>
    foundation.length && RED.has(foundation[0].suit) !== RED.has(card.suit)
  );
  const oppositeSuitProgress = oppositeFoundations.map(foundation => foundation.length);
  if (oppositeFoundations.length < 2) oppositeSuitProgress.push(0);
  const leastAdvancedOppositeSuit = Math.min(...oppositeSuitProgress);
  return card.rank <= leastAdvancedOppositeSuit + 2 ? foundationTargets[0] : null;
}
