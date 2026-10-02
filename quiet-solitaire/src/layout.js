export function tableauOverlapLayout({ availableHeight, cardHeight, layers, preferred, minimum }) {
  const wanted = Math.max(minimum, preferred);
  if (layers <= 1) return { overlap: wanted, needsScroll: false };
  const fit = (availableHeight - cardHeight) / (layers - 1);
  return {
    overlap: Math.min(wanted, Math.max(minimum, fit)),
    needsScroll: fit < minimum,
  };
}

/** Use more portrait height early, then smoothly return to compact stacking. */
export function portraitPreferredOverlap(cardHeight, layers, baseOverlap, availableHeight) {
  if (layers <= 1) return baseOverlap;
  const factor = Math.max(.39, .76 - Math.max(0, layers - 7) * .045);
  const comfortable = cardHeight * factor;
  const fit = (availableHeight - cardHeight) / (layers - 1);
  return Math.min(fit, Math.max(baseOverlap, comfortable));
}
