# Stage 1 rules contract

This deterministic engine contract follows [Poker TDA Rules 43, 47 and 48](https://www.pokertda.com/view-poker-tda-rules/) and [Robert’s Rules of Poker](https://homepokertourney.org/roberts-rules-of-poker.htm) for the selected reopening conventions.

## No-Limit Hold’em

- Blinds are 10/20. `betTo` and `raiseTo` are final contributions for the current round.
- The normal minimum opening wager is 20. A short stack may open all-in below 20; later players may call the actual amount or **complete to 20**, never to short-opening-plus-20.
- A full raise is at least the prior full-raise increment; only a full raise changes that increment.
- A short all-in above a wager is legal, changes no increment, and does not itself reopen. Reopening is per player: exposure since that player’s last action must reach one full increment. Cumulative short all-ins may reopen an earlier actor but leave a later actor closed.
- A short big blind posts all its chips, but the bring-in stays 20: other players call 20.
- Once calls are resolved and fewer than two players can wager, remaining board cards run out atomically; no dry side-pot betting occurs.
- Heads-up, the button is the small blind and acts first preflop; the big blind acts first postflop.

## Fixed-Limit Five-Card Draw

- Antes are 10. The first-round unit is 20 and final-round unit is 40; antes are total commitment only.
- A normal opening wager and every normal raise are **exactly** the applicable unit. Arbitrary targets are illegal when the actor has the full unit.
- A short opening below half a unit completes to the unit and consumes no raise slot (5 → 20; 9 → 20). An opening of at least half is treated as the opening wager for reopening; its next normal raise is actual wager plus unit (10 → 30; 15 → 35).
- A short raise below half is incomplete: it neither reopens nor uses a cap slot; the next raise completes to the preceding full level plus one unit (20 → 25 → 40). A short raise of at least half reopens actors facing at least half a unit and consumes one cap slot.
- The cap is an opening wager plus three qualifying raises, including heads-up. Incomplete completions never double-count it; calls and folds remain legal at the cap.
- Every non-folded player, including an all-in player, gets one clockwise draw turn. They exchange 0–5 distinct indexes. Discards never recycle.

## Pots, cards, and dealer

- Pots are layered by commitment; folded chips remain but folded players cannot win. A one-contributor layer is returned once as unmatched excess.
- If everyone else folds, the sole live player receives all committed chips privately. Each contested pot ranks its eligible non-folded players independently. Settlement is one-shot.
- Odd chips go clockwise beginning with the first eligible winner **left of the button**.
- Every card has one physical location: deck, hand, board, or discard pile.
- Between hands, button movement starts clockwise from the prior button seat and skips empty, sit-out, departed, and busted seats. Seats are table positions 0–4. Heads-up: button is small blind and first preflop; big blind is first postflop.

## Invariants

- `tableChipTotal` is fixed when the table is created. Before settlement, player stacks plus all commitments must equal it; after settlement, stacks alone must equal it.
- Stacks, commitments, and legal action amounts are nonnegative safe integers. A round commitment can never exceed total commitment.
- Each physical card identity occurs exactly once across deck, hands, board, and discards; all 52 cards must be accounted for.
- A betting actor must be an actionable in-hand player. A draw actor may be all-in, but must be non-folded, in hand, and not already drawn.
- Settlement is unique: a settled state is `INTERMISSION` only, and a second settlement command is rejected before any payout.
