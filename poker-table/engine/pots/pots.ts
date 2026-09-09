export type Contribution = Readonly<{ playerId: string; amount: number; folded?: boolean }>;
export type Pot = Readonly<{ amount: number; eligibleIds: readonly string[]; contributorIds: readonly string[] }>;
export function buildPots(contributions: readonly Contribution[]): Readonly<{ pots: readonly Pot[]; returned: Readonly<Record<string, number>> }> {
  if (contributions.some((c) => !Number.isSafeInteger(c.amount) || c.amount < 0)) throw new Error('Invalid contribution');
  const levels = [...new Set(contributions.map((c) => c.amount).filter((n) => n > 0))].sort((a, b) => a - b);
  const pots: Pot[] = []; const returned: Record<string, number> = {};
  let prior = 0;
  for (const level of levels) {
    const involved = contributions.filter((c) => c.amount >= level);
    const slice = (level - prior) * involved.length;
    prior = level;
    if (involved.length < 2) { const only = involved[0]; if (only) returned[only.playerId] = (returned[only.playerId] ?? 0) + slice; continue; }
    pots.push(Object.freeze({ amount: slice, eligibleIds: Object.freeze(involved.filter((c) => !c.folded).map((c) => c.playerId)), contributorIds: Object.freeze(involved.map((c) => c.playerId)) }));
  }
  return Object.freeze({ pots: Object.freeze(pots), returned: Object.freeze(returned) });
}
export function splitPot(amount: number, winnerIds: readonly string[], clockwiseOrder: readonly string[]): Readonly<Record<string, number>> {
  if (!winnerIds.length || amount < 0 || !Number.isInteger(amount)) throw new Error('Invalid split');
  const out: Record<string, number> = Object.fromEntries(winnerIds.map((id) => [id, Math.floor(amount / winnerIds.length)]));
  const ordered = clockwiseOrder.filter((id) => winnerIds.includes(id));
  for (let i = 0; i < amount % winnerIds.length; i += 1) { const id = ordered[i]!; out[id] = (out[id] ?? 0) + 1; }
  return Object.freeze(out);
}
