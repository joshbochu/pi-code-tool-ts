# M0 — Foundation and Executable Specification

- Status: `Ready`
- Active unit: M0.1 only
- Canonical sequence: [PROJECT_GOALS.md](../../PROJECT_GOALS.md#milestone-plan)
- Progress ledger: [PROJECT_PROGRESS.md](../../PROJECT_PROGRESS.md)
- Last updated: 2026-07-19

## Milestone outcome

At the end of M0, a human can:

- Explain the V0 product and trust boundary.
- Install dependencies and run the project checks with Bun.
- Load the extension skeleton in Pi without errors.
- See executable fixtures for every promised V0 behavior, clearly separated into implemented and pending cases.
- Identify which code executes inside Pi and confirm that no runtime subprocess exists yet.

M0 establishes an executable specification. It does not implement code execution.

## Authoritative external contract

This plan was checked against Pi's current official documentation on 2026-07-19:

- [Extensions](https://pi.dev/docs/latest/extensions): an extension is a TypeScript module with a default factory that receives `ExtensionAPI`; explicit test loading uses `pi --no-extensions -e ./path.ts`.
- [Pi packages](https://pi.dev/docs/latest/packages): a package declares extension entrypoints under `package.json`'s `pi.extensions`; Pi core packages belong in `peerDependencies`; package code has full system access.
- [CLI usage](https://pi.dev/docs/latest/usage): `--no-extensions` disables discovery while an explicit `-e` path loads the target extension.

Observed local baseline when this plan was written:

| Tool | Version |
|---|---:|
| Bun | 1.3.11 |
| Pi | 0.80.6 |

These observed versions explain the initial lockfile and smoke-test environment. The implementer must record the versions actually used and must report—not silently absorb—an incompatible API change.

## Milestone boundaries

### Included

- Package and directory structure.
- Strict TypeScript and Bun test configuration.
- A deliberately inert Pi extension entrypoint.
- The explicit trusted-execution product contract.
- Black-box fixtures describing the future V0 behavior.
- Learning notes and review evidence for each unit.

### Excluded

- A model-facing `code` tool.
- Bun subprocesses, Workers, IPC, sockets, or process managers.
- TypeScript transformation or evaluation.
- Tool adapters, approvals, output streaming, or persistence.
- Dependencies copied or adapted from OMP or `pi-code-tool`.
- Publishing to npm.
- Work from M1 or later.

If a proposed M0 change needs any excluded mechanism, stop and move that work to the correct later milestone.

## Unit map and stop gates

| Unit | Single outcome | Entry condition | Exit condition | Stop gate |
|---|---|---|---|---|
| M0.1 | Loadable, inert package skeleton | This plan is approved | Checks and Pi smoke load pass; learning note exists | Human reviews before M0.2 |
| M0.2 | Explicit trusted-execution opt-in contract | M0.1 is accepted | Enabled/disabled contract tests pass | Human reviews before M0.3 |
| M0.3 | Executable V0 acceptance fixtures | M0.2 is accepted | Implemented vs pending behavior is unambiguous | Human accepts M0 before M1 planning |

Only M0.1 is authorized by this handoff.

---

# M0.1 Implementer Handoff — Scaffold the Package

## Behavioral outcome

Create the smallest real Pi package that:

1. Is managed and tested with Bun.
2. Is type-checked as strict TypeScript.
3. Is discoverable through an explicit Pi package manifest.
4. Loads through the real Pi CLI without error.
5. Deliberately registers nothing, starts nothing, and changes no Pi behavior.

This unit proves the development and loading path. It must not preview the runtime.

## Read before editing

Read these files in order:

1. [PROJECT_GOALS.md](../../PROJECT_GOALS.md), especially Development principles and M0.1.
2. [PROJECT_PROGRESS.md](../../PROJECT_PROGRESS.md).
3. This milestone plan.
4. [README.md](../../README.md).

There is no previous implementation learning note for the bootstrap unit.

Before changing source files, restate the outcome in one sentence and list the files you expect to touch. If your expected list includes runtime, protocol, tool, process, approval, or output code, the plan has already drifted.

## Required repository shape after M0.1

```text
pi-code-tool-ts/
├─ src/
│  └─ extension.ts
├─ test/
│  └─ extension.test.ts
├─ docs/
│  ├─ learning/
│  │  └─ M0.1-package-scaffold.md
│  └─ milestones/
│     └─ M0_FOUNDATION.md
├─ package.json
├─ bun.lock
├─ tsconfig.json
├─ PROJECT_GOALS.md
├─ PROJECT_PROGRESS.md
├─ PI_CODE_MODE_ROADMAP.md
└─ README.md
```

Do not create empty future source files merely to resemble the eventual architecture. Files appear in the commit where their idea becomes real.

## Package decisions

The implementation must preserve these decisions unless it stops and proposes an amendment:

- Package name: `pi-code-tool-ts`.
- Version: `0.0.0`; the project has made no release promise.
- `private: true`; M0 must not be accidentally published to npm.
- Module mode: ESM.
- Package manager and test runner: Bun.
- Pi discovery: explicit `pi.extensions` entry for `./src/extension.ts`.
- Discoverability keyword: `pi-package`.
- Pi API types: current official `@earendil-works/pi-coding-agent`, not an obsolete package name found in older examples.
- Pi core imports used by the package must be declared as peer dependencies with `"*"`, per Pi's package guidance, and installed as development dependencies when required for local checking.
- Runtime dependencies: none for M0.1.
- Generated JavaScript: none; TypeScript is loaded directly by Pi and checked with `tsc --noEmit`.
- Lockfile: Bun's lockfile is committed.

Required scripts:

| Script | Responsibility |
|---|---|
| `test` | Run `bun test`. |
| `typecheck` | Run strict TypeScript checking without emitting files. |
| `check` | Run type-checking and tests. |
| `smoke:pi` | Use the installed Pi CLI in offline mode to explicitly load only `src/extension.ts` and exit via a non-interactive command such as `--list-models`. |

The Pi smoke check remains separate from `check` so normal unit tests do not silently depend on a global Pi installation. It is nevertheless mandatory evidence for M0.1 in the implementation environment.

## Extension-entrypoint rules

`src/extension.ts` must:

- Import `ExtensionAPI` as a type-only import.
- Default-export a named, synchronous factory compatible with Pi's extension contract.
- Return `undefined` and produce no output.
- Access no properties on the supplied Pi API.
- Register no tool, command, flag, shortcut, provider, renderer, or event handler.
- Start no child process, Worker, timer, socket, watcher, or asynchronous task.
- Read no files, environment variables, settings, credentials, or network resources.
- Have no top-level side effect other than defining and exporting the function.

Official Pi guidance says long-lived resources should not begin in an extension factory. M0.1 is stricter: it has no resources at all.

## Required tests

`test/extension.test.ts` must prove at least:

1. The module's default export is a function.
2. Calling the factory returns `undefined` and does not throw.
3. Calling it with a hostile `Proxy` that throws on every property access still succeeds. This proves the skeleton does not touch the Pi API or register behavior.

Do not create a broad fake `ExtensionAPI`. A broad fake can accidentally bless behavior that belongs in a later unit.

## M0.1 invariants

The implementer must report each invariant as `PASS`, `FAIL`, or `BLOCKED` with evidence.

| ID | Invariant | Evidence |
|---|---|---|
| M0.1-I1 | `package.json` names the package and points `pi.extensions` to the existing `src/extension.ts`. | Manifest inspection plus Pi smoke load |
| M0.1-I2 | The package is private, ESM, Bun-managed, and has no runtime dependency. | Manifest and lockfile inspection |
| M0.1-I3 | Strict type-checking emits no generated files. | `bun run typecheck`; clean status after check |
| M0.1-I4 | The extension default-exports a Pi-compatible factory. | Type-check and export-shape test |
| M0.1-I5 | Loading or invoking the factory has no observable product behavior. | Hostile-Proxy test and source inspection |
| M0.1-I6 | No process, Worker, IPC, timer, socket, watcher, tool, event, or model call exists. | Focused source review and diff inspection |
| M0.1-I7 | The real installed Pi CLI loads the explicit extension path without a loader error. | `bun run smoke:pi` exit code 0 |
| M0.1-I8 | Bun tests pass without network access or secrets. | `bun test` |
| M0.1-I9 | The learning note satisfies the eight-part learning-note contract. | File review |
| M0.1-I10 | Only scaffold, test, learning, and progress files changed. | `git diff --stat` and `git status --short` |
| M0.1-I11 | The unit contains no copied third-party source and requires no attribution entry. | Diff review; otherwise stop and add attribution |
| M0.1-I12 | Progress ends at `Ready for review`; M0.2 remains unstarted. | Project-progress diff |

## Suggested execution order

1. Record `bun --version` and `pi --version`.
2. Change M0.1 in `PROJECT_PROGRESS.md` from `Ready` to `In progress`.
3. Create `package.json` with only the required metadata, scripts, Pi manifest, peer dependency, and development tooling.
4. Install dependencies with Bun and retain `bun.lock`.
5. Add strict, no-emit `tsconfig.json` scoped to `src/` and `test/`.
6. Add the inert extension factory.
7. Add the narrow hostile-Proxy tests.
8. Run the fast checks and fix only scaffold-related failures.
9. Run the real Pi smoke load.
10. Write `docs/learning/M0.1-package-scaffold.md` using the required eight headings.
11. Update the progress ledger to `Ready for review` and add an evidence row.
12. Run final diff hygiene checks and stop.

Do not commit unless the human explicitly requests it.

## Verification commands

Run from the repository root and report the exit status of every command:

```sh
bun --version
pi --version
bun install --frozen-lockfile
bun run typecheck
bun test
bun run check
bun run smoke:pi
git diff --check
git status --short
git diff --stat
```

Also inspect the complete diff. A green test suite cannot prove scope discipline or the absence of unintended package behavior.

If `bun install --frozen-lockfile` cannot run immediately after initially generating the lockfile, rerun it after generation and report both steps accurately. Do not claim the initial dependency resolution was frozen.

## Failure and blocker policy

- If Bun is missing, stop and report the missing prerequisite.
- If Pi is missing, unit tests may continue, but M0.1 cannot become `Ready for review` until the real smoke load is run somewhere named in the evidence.
- If the current Pi API differs from the official contract cited above, record versions and exact errors, then stop for a plan update.
- If the Pi smoke command requires model credentials or makes a model call, replace it with another non-interactive loader path; do not add credentials merely to prove module loading.
- If a test seems to require a real runtime, tool registration, or event handler, the test belongs to a later unit.
- If unrelated pre-existing changes are present, preserve them and keep them out of the proposed M0.1 commit.
- Never weaken an invariant or skip a check solely to make the unit appear complete.

## Learning-note requirements

Create `docs/learning/M0.1-package-scaffold.md` with exactly these top-level sections:

1. Problem
2. Mental model
3. Code tour
4. Protocol or data flow
5. Try it
6. Tests
7. Tradeoffs
8. Review questions

For this unit, “Protocol or data flow” should show:

```text
Pi package loader
  → reads package.json pi.extensions
  → loads src/extension.ts
  → calls default factory with ExtensionAPI
  → factory returns without registering behavior
```

The note must distinguish what is proven from what is merely planned. It must explicitly say that no child process, IPC, code evaluation, or model-facing code tool exists yet.

## Completion report template

The implementer should finish with this report and then stop:

```markdown
## M0.1 completion report

Outcome: <one sentence>
State: Ready for review | Blocked

### Files changed
- <path>: <why>

### Toolchain
- Bun: <version>
- Pi: <version>

### Verification
- `bun install --frozen-lockfile`: PASS/FAIL/BLOCKED — <evidence>
- `bun run typecheck`: PASS/FAIL/BLOCKED — <evidence>
- `bun test`: PASS/FAIL/BLOCKED — <evidence>
- `bun run check`: PASS/FAIL/BLOCKED — <evidence>
- `bun run smoke:pi`: PASS/FAIL/BLOCKED — <evidence>
- `git diff --check`: PASS/FAIL/BLOCKED — <evidence>

### Invariants
- M0.1-I1: PASS/FAIL/BLOCKED — <evidence>
...
- M0.1-I12: PASS/FAIL/BLOCKED — <evidence>

### Tradeoffs and limitations
- <what remains intentionally absent>

### Human review
- Demonstration: <command and expected result>
- Failure path: <intentional failure and observed error>
- Questions the reviewer should be able to answer: <answers withheld>

No commit was created. M0.2 was not started.
```

## Human acceptance checklist

The reviewer accepts M0.1 only after all of these are true:

- [ ] The full diff contains only the stated unit.
- [ ] Every required command passed in the named environment.
- [ ] Temporarily breaking the extension path or export makes the Pi smoke load fail clearly; the change is then restored and checks pass again.
- [ ] The reviewer can explain how the Pi manifest reaches the extension factory.
- [ ] The reviewer can explain why this factory runs inside Pi and why no trust boundary has been created.
- [ ] The reviewer can identify the exact first file where future product behavior will eventually be registered.
- [ ] The learning note says what is unproven.
- [ ] The progress ledger is internally consistent.
- [ ] No M0.2 or M1 work is present.

Only after this review may the human authorize a focused M0.1 commit and begin planning the M0.2 handoff.

## Copyable handoff prompt

```text
Implement M0.1 only in this repository.

Read PROJECT_GOALS.md, PROJECT_PROGRESS.md, docs/milestones/M0_FOUNDATION.md, and README.md before editing. Restate the single behavioral outcome and expected files first.

Follow every M0.1 scope boundary and invariant in docs/milestones/M0_FOUNDATION.md. Create the inert Pi package scaffold, narrow tests, Bun lockfile, and docs/learning/M0.1-package-scaffold.md. Update PROJECT_PROGRESS.md from Ready to In progress, then to Ready for review only after all required checks pass.

Run and report every verification command. Mark each invariant PASS, FAIL, or BLOCKED with evidence. Inspect the complete diff. Do not implement M0.2, start a runtime, register a tool, or create a commit. Finish with the completion-report template and stop for human review.
```

---

# Later M0 Units — Planning Preview Only

## M0.2 — Define the V0 trust contract

Planned outcome: configuration requires explicit trusted-execution opt-in and presents shell-equivalent authority honestly. It must not execute code yet. Its detailed invariant plan will be written only after M0.1 is accepted and its lessons are incorporated.

## M0.3 — Add black-box acceptance fixtures

Planned outcome: executable cases name the future V0 behavior and clearly mark pending cases without pretending they pass. Its detailed invariant plan will be written only after M0.2 is accepted.

Neither later unit is authorized by the M0.1 handoff.
