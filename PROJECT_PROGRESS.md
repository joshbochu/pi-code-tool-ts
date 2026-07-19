# Project Progress

- Project: `pi-code-tool-ts`
- Canonical implementation sequence: [PROJECT_GOALS.md](./PROJECT_GOALS.md#milestone-plan)
- Current milestone plan: [M0 — Foundation and executable specification](./docs/milestones/M0_FOUNDATION.md)
- Last updated: 2026-07-19

## Purpose

This is the project control ledger. It answers four questions without requiring someone to reconstruct history from chat:

1. Which milestone and unit are active?
2. What has been accepted by a human reviewer?
3. What evidence supports each accepted unit?
4. What is the next permitted unit of work?

This file tracks delivery state. It does not replace the product contract, milestone plans, ADRs, learning notes, tests, or Git history.

## Sources of truth

When documents appear to disagree, use this order:

1. [PROJECT_GOALS.md](./PROJECT_GOALS.md) defines the product boundary, development contract, and canonical commit-sized milestone sequence.
2. This file records current status and accepted evidence.
3. `docs/milestones/M*.md` defines the execution plan and invariants for one milestone.
4. `docs/adr/` records accepted architectural decisions.
5. `docs/learning/` explains behavior that has actually been implemented.
6. [PI_CODE_MODE_ROADMAP.md](./PI_CODE_MODE_ROADMAP.md) is the strategic architecture roadmap and comparison backlog; its milestone labels are not commit identifiers.

Tests and running behavior outrank prose when they reveal a contradiction. A contradiction must be reported and resolved; it must not be silently rationalized.

## Status vocabulary

| Status | Meaning | Who may set it |
|---|---|---|
| `Not started` | Planned, but its prerequisites or handoff are not yet ready. | Planner or reviewer |
| `Ready` | Scope, invariants, and verification are defined; implementation may begin. | Planner or reviewer |
| `In progress` | An implementer is working on this unit and no later unit may begin. | Implementer |
| `Ready for review` | Implementation stopped at the checkpoint with evidence recorded. | Implementer |
| `Accepted` | A human reviewed the diff, learning note, demonstration, and failure path. | Human reviewer only |
| `Blocked` | A named prerequisite prevents useful progress and evidence is recorded. | Implementer or reviewer |
| `Deferred` | Explicitly outside the current delivery phase. | Planner or reviewer |

An implementer must never mark its own unit `Accepted`. Passing automated checks makes a unit ready for review, not accepted.

## Current checkpoint

| Field | Value |
|---|---|
| Delivery phase | V0 |
| Active milestone | M0 — Foundation and executable specification |
| Active unit | M0.1 — Scaffold the package |
| Unit status | `Ready for review` |
| Accepted V0 units | 0 / 35 |
| Last accepted unit | None |
| Next permitted work | Human review of M0.1; do not begin M0.2 |
| Stop point | Human review after M0.1; do not begin M0.2 |

## V0 milestone summary

| Milestone | Outcome | Units | Accepted | Status | Plan |
|---|---|---:|---:|---|---|
| M0 | Loadable extension skeleton and executable V0 specification | 3 | 0 | `Ready` | [M0 plan](./docs/milestones/M0_FOUNDATION.md) |
| M1 | Reliable persistent Bun subprocess and versioned IPC | 6 | 0 | `Not started` | Create after M0 is accepted |
| M2 | Persistent TypeScript notebook semantics | 7 | 0 | `Not started` | Create after M1 is accepted |
| M3 | Pi tools callable from TypeScript | 8 | 0 | `Not started` | Create after M2 is accepted |
| M4 | Complete Pi-facing code-tool experience and output discipline | 6 | 0 | `Not started` | Create after M3 is accepted |
| M5 | Compatibility evidence, benchmarks, documentation, and V0 decision | 5 | 0 | `Not started` | Create after M4 is accepted |

## M0 unit ledger

| Unit | Behavioral outcome | Status | Implementation commit | Learning note | Review evidence |
|---|---|---|---|---|---|
| M0.1 | Pi can load a deliberately inert Bun/TypeScript package skeleton and its checks run | `Ready for review` | — | `docs/learning/M0.1-package-scaffold.md` | See evidence log |
| M0.2 | Trusted execution requires explicit opt-in and communicates shell-equivalent authority | `Not started` | — | Planned: `docs/learning/M0.2-trust-contract.md` | — |
| M0.3 | Executable fixtures define implemented and pending V0 behavior | `Not started` | — | Planned: `docs/learning/M0.3-acceptance-fixtures.md` | — |

## Post-V0 milestone summary

These milestones remain visible but are not authorized implementation work during V0.

| Milestone | Outcome | Status |
|---|---|---|
| M6 | Durable, branch-correct sessions | `Deferred` |
| M7 | Capability policy and suspend/resume approvals | `Deferred` |
| M8 | Remote full Bun runtime | `Deferred` |
| M9 | Capability-only TypeScript sandbox | `Deferred` |
| M10 | Rich orchestration and output | `Deferred` |
| M11 | Saved tools and broader discovery | `Deferred` |

## Evidence log

Add one row when a unit moves to `Ready for review`, then amend the same row after human acceptance. Never claim a check that was not run.

| Date | Unit | State | Commit | Verification | Human reviewer | Notes |
|---|---|---|---|---|---|---|
| 2026-07-19 | M0.1 | Ready for review | — | `bun install --frozen-lockfile` exit 0; `bun run typecheck` exit 0; `bun test` 3 pass; `bun run check` exit 0; `bun run smoke:pi` exit 0 (`pi --offline --no-extensions -e ./src/extension.ts --list-models`). Bun 1.3.11; Pi 0.80.6; `@earendil-works/pi-coding-agent` 0.80.10 (dev/peer). | — | Scaffold only; inert factory; stop for human review. |

## Update protocol

For each implementation unit:

1. Confirm the prior unit is `Accepted`; M0.1 is the only bootstrap exception.
2. Read the canonical goals, this ledger, the active milestone plan, relevant ADRs, and the previous learning note.
3. Change only the active unit to `In progress`.
4. Implement only that unit and produce the evidence required by its milestone plan.
5. Add or update its learning note.
6. Change the unit to `Ready for review`, update milestone counts, and add an evidence-log row.
7. Stop. Do not start the next unit and do not create a commit unless explicitly asked.
8. After review, the human changes the unit to `Accepted`, records the commit, and authorizes the next plan.

If implementation reveals that the plan is wrong, stop and propose a plan change. Do not widen scope while preserving the appearance that the original plan was followed.

## Progress invariants

- Exactly zero or one unit may be `In progress`.
- A later unit cannot be `In progress`, `Ready for review`, or `Accepted` while an earlier prerequisite is unaccepted.
- Accepted counts equal the number of unit rows marked `Accepted`.
- Every accepted implementation unit has one focused commit and one learning note.
- Every evidence claim names the command, fixture, or human demonstration that produced it.
- A skipped, unavailable, or flaky check is not a passing check.
- Planning-only commits do not increment accepted implementation-unit counts.
- Scope changes update the goals and active milestone plan before implementation continues.
