---
name: appfarm-stack-router
description: Route Andre's app/game builds to the smallest correct stack. Railway Hobby and Hatchable are paid and authorized; AppDeploy is used on the free tier.
version: 2026-09-11
---

# AppFarm Stack Router

Use this skill before substantial implementation or deployment decisions for AppFarm projects.

## Platform baseline

- Railway Hobby: paid and already authorized.
- Hatchable: paid and already authorized.
- AppDeploy: available and used on the free tier.
- GitHub: source of truth; default repository is `andrefiker/appfarm`.

Ordinary use within the existing Railway Hobby and Hatchable plans is not a cost blocker. Ask Andre only before a new subscription, paid add-on, plan upgrade, or material recurring-cost increase.

## Core rule

Choose the smallest correct stack. Do not combine platforms simply because they are available.

## Lane A — local, static, offline-first, or single-player PWA

Default:
- AppDeploy frontend/PWA on the free tier.
- GitHub source.
- No Railway, Hatchable backend, Postgres, or Redis unless a concrete requirement appears.

Use for local utilities, offline-first tools, simple single-player games, read-only apps, and similar projects.

## Lane B — ordinary full-stack app without long-lived realtime requirements

Default:
- Hatchable as the primary full-stack platform.
- Use Hatchable Postgres, API functions, auth, storage, scheduling, email, and managed services when they fit.
- Keep GitHub as canonical source when practical.

Prefer this for CRUD apps, dashboards, forms, admin tools, content apps, lightweight SaaS-style tools, and apps that need backend logic but not a long-lived realtime server.

Do not add Railway just to duplicate capabilities Hatchable already provides cleanly.

## Lane C — realtime/server-authoritative multiplayer or long-lived backend

Default:
- AppDeploy frontend/PWA on the free tier.
- Railway Hobby backend.
- Railway Postgres for durable shared state when needed.
- Redis only when justified by live coordination, ephemeral shared state, presence, locks, pub/sub, scaling, or similar realtime needs.
- GitHub source.

Use this for Quiet Knight / Poker Table style multiplayer, WebSockets, long-running authoritative game services, reconnect logic, or workloads Hatchable cannot host as a long-lived server.

Hatchable may still be used for a separate admin/support surface if that materially simplifies the system, but it is not the default multiplayer authority.

## Architecture rules

- Keep every app isolated in its own top-level directory and runtime resources.
- Prefer pure, deterministic, independently testable engines for rules-heavy games.
- Competitive shared state must be server-authoritative. Clients send intents, not outcomes.
- Hidden-information games require recipient-specific state. Never ship canonical secret state to every client and merely hide it in UI.
- Phone portrait is the primary browser-game target unless the project says otherwise.
- Prefer PWA installation, obvious next actions, large touch targets, low clutter, and resilient reconnect behavior.

## Testing and release

Before production:
- Verify source/commit and branch.
- Run mechanics/rules tests and relevant deterministic fixtures/invariants.
- Test deployed behavior, not only local code.
- For multiplayer, test separate identities, reconnect, invalid actions, and private-state isolation.
- Record a known-good rollback target.

After production:
- Record commit.
- Record frontend version/deployment.
- Record Railway or Hatchable deployment/version when relevant.
- Record DB migration/version when relevant.
- Record rollback target.

## Execution style

For substantial Work implementation:
- Prefer one bounded end-to-end goal.
- Plan, build, test, repair, and advance through internal gates without stopping after every stage.
- Allow up to 3 credible repair attempts for the same underlying failure.
- HOLD only for unresolved correctness/security, unavailable credentials/permissions, destructive or risky production changes, unexpected new cost, interference with another production app, or the same fundamental failure after 3 credible repair attempts.

Do not HOLD for ordinary build errors, naming/folder choices, provider quirks, or minor aesthetic decisions.

## Priority order

1. Correct.
2. Playable/usable.
3. Recoverable.
4. Mobile-clear.
5. Beautiful.
