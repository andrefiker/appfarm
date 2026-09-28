export function tableauOverlapLayout({ availableHeight, cardHeight, layers, preferred, minimum }) {
  const wanted = Math.max(minimum, preferred);
  if (layers <= 1) return { overlap: wanted, needsScroll: false };
  const fit = (availableHeight - cardHeight) / (layers - 1);
  return {
    overlap: Math.min(wanted, Math.max(minimum, fit)),
    needsScroll: fit < minimum,
  };
}
