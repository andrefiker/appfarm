# Poker Table — Stage 1 rules engine

Pure TypeScript authority for 2–5 player No-Limit Texas Hold’em and Fixed-Limit Five-Card Draw. It has no UI, network, persistence, bot, clock, browser, or transport dependency. `GameState` is canonical server-private state; it must not be sent wholesale to a client because it contains hidden cards.

## Reproduce

```bash
npm ci
npm run verify
```

The test script compiles to the ignored `.build/` directory and invokes the built-in Node test runner. The production package has no runtime dependencies.

Expected Stage 1 result: strict typecheck passes; 24 Node tests pass with no failures, skips, cancellations, or todos. Those tests include 210 settled seeded hands: 10 smoke hands and 200 varied legal-action simulations (seeds 1–100 across both variants).

## Public API

`engine/index.ts` exports:

- card/deck utilities: `standardDeck`, `shuffle`, `cryptoRandom`, `deterministicDeck`, `take`;
- hand ranking: `rankFive`, `rankBest`, `compareHands`;
- pot utilities: `buildPots`, `splitPot`;
- game transitions: `createGame`, `startHand`, `setBetweenHandStatus`, `legalActions`, `act`, `draw`, `settle`, `assertInvariants`.

State transitions never mutate their input. Invalid transitions throw before returning a changed state. Production callers inject no deck or deterministic entropy: `startHand(state)` uses the Node cryptographic Fisher–Yates adapter. The `RandomSource` argument exists only for deterministic verification; a future server endpoint must never make it client-controlled or expose a prearranged deck.

## State model

`PREPARING` is resolved atomically by `startHand`: it selects eligible players, deals, posts forced chips, and chooses the first actor. `RUNOUT` is represented by immediate atomic board transitions when no player can act. This avoids externally observable half-dealt states.

The engine records cards in exactly one physical location: deck, private hand, board, or discards. Showdown evaluations reference those locations rather than creating duplicate card objects.

`tableChipTotal` is authoritative immutable accounting for the table. Before settlement, invariant checks require stacks plus all commitments to equal that total; after settlement, stacks alone must equal it.
