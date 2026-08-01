# M0 — Foundation and Executable Specification

- Status: `In progress`
- Active unit: M0.2 only
- Canonical sequence: [PROJECT_GOALS.md](../../PROJECT_GOALS.md#milestone-plan)
- Progress ledger: [PROJECT_PROGRESS.md](../../PROJECT_PROGRESS.md)
- Last updated: 2026-07-31

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
| Host Pi | 0.80.6 |
| Project test Pi | 0.80.10 |

The project test Pi is pinned as a development dependency and is the reproducible smoke-test runtime. The host Pi is recorded separately and is not implied to have been exercised by a Bun package script. The implementer must record the versions actually used and must report—not silently absorb—an incompatible API change.

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
- Product/runtime subprocesses, Workers, IPC, sockets, or process managers. A test-only smoke harness may launch the Pi CLI and speak RPC solely to prove extension loading.
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

M0.1 is accepted. Only M0.2 is authorized by this handoff; M0.3 remains unstarted.

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
├─ scripts/
│  └─ smoke-pi.ts
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
- Pi core imports used by the package must be declared as peer dependencies with `"*"`, per Pi's package guidance.
- The Pi CLI used for development checks must be pinned to an exact development-dependency version so a lockfile refresh cannot silently change the tested API or loader.
- Runtime dependencies: none for M0.1.
- Generated JavaScript: none; TypeScript is loaded directly by Pi and checked with `tsc --noEmit`.
- Lockfile: Bun's lockfile is committed.

Required scripts:

| Script | Responsibility |
|---|---|
| `test` | Run `bun test`. |
| `typecheck` | Run strict TypeScript checking without emitting files. |
| `check` | Run type-checking and tests. |
| `smoke:pi` | Use the project-pinned Pi CLI with an isolated temporary config directory, load the package root through no-session RPC, require a successful response, and require a missing-extension negative control to fail. |

The Pi smoke check remains separate from `check` so normal unit tests do not silently start Pi. It uses the project dependency rather than whichever global `pi` happens to appear on `PATH`, and it must not use the user's models, credentials, or settings. It is mandatory evidence for M0.1.

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
| M0.1-I6 | The extension and its product import graph start no process, Worker, IPC, timer, socket, watcher, tool, event, or model call. The smoke harness is test-only and may launch Pi. | Focused source review and diff inspection |
| M0.1-I7 | The project-pinned Pi CLI resolves the package manifest, starts in isolated no-session RPC mode, answers a state request, and rejects a missing extension path. | `bun run smoke:pi` exit code 0 and its positive/negative assertions |
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
9. Run the isolated package-root Pi RPC smoke load and its negative control.
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
- If the project Pi executable is missing, run the frozen install. M0.1 cannot become `Ready for review` until the isolated RPC smoke load passes.
- If the current Pi API differs from the official contract cited above, record versions and exact errors, then stop for a plan update.
- If the Pi smoke command reads user credentials/settings or makes a model call, treat that as a failure; package loading must be proven with an isolated temporary Pi config and no model call.
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

# M0.2 Implementer Handoff — Define the V0 Trust Contract

## Behavioral outcome

Add one explicit, disabled-by-default opt-in for future trusted code execution
and present its shell-equivalent authority honestly. This unit defines informed
consent only. It must not register a `code` tool or execute generated code.

At the end of M0.2, a human can start Pi with or without the opt-in, observe the
two trust-contract paths, and explain why neither path is a security sandbox or
a working code runtime.

## Entry condition and authorization

M0.1 was accepted after its package, unit, smoke, and learning evidence was
reviewed. Its focused implementation commit is `a77e281`, and the complete
scaffold was merged through PR #2.

Only M0.2 is authorized. M0.3 fixtures, the model-facing `code` tool, runtime
processes, IPC, TypeScript evaluation, and Pi tool adapters remain unauthorized.

## Read before editing

Read these files in order:

1. [PROJECT_GOALS.md](../../PROJECT_GOALS.md), especially the V0 trust model,
   architecture boundary, development principles, and M0.2 outcome.
2. [PROJECT_PROGRESS.md](../../PROJECT_PROGRESS.md).
3. The M0 milestone boundaries and this M0.2 handoff.
4. [M0.1 package-scaffold learning note](../learning/M0.1-package-scaffold.md).
5. `src/extension.ts`, `test/extension.test.ts`, `scripts/smoke-pi.ts`, and
   `README.md`.

Before changing source files, restate this outcome in one sentence and list the
files expected to change. If that list contains a runtime, protocol, evaluator,
tool registry, output renderer, approval engine, Worker, or product subprocess,
the proposed work has already left M0.2 scope.

## Accepted design

- Opt-in surface: Pi boolean extension flag `--allow-trusted-code`.
- Registered flag name: `allow-trusted-code` (Pi adds the leading `--`).
- Default: `false`.
- Enablement check: only the boolean value `true` counts as opt-in.
- Disabled behavior: no warning, model-facing tool, runtime, or execution
  behavior.
- Enabled behavior: at `session_start`, show a warning that future
  model-written TypeScript has shell-equivalent authority and that a subprocess
  is not a security sandbox.
- Warning severity: Pi `warning` notification.
- Configuration scope: command-line flag only for M0.2. Do not add an
  environment-variable alias or settings-file format.
- Product scope: flag registration, warning, tests, real-Pi smoke evidence,
  README text, a learning note, and progress updates only.

The warning must name the material ambient powers available to the planned Bun
runtime:

- reading and modifying files;
- reading environment variables and credentials;
- using the network; and
- spawning commands and child processes.

It must also state that M0.2 executes no generated code yet. The warning is an
informed-consent contract, not evidence of isolation. A future execution unit
must consult the same opt-in before exposing trusted execution.

## Trust-contract data flow

```text
Pi loads src/extension.ts
  → extension registers --allow-trusted-code (boolean, default false)
  → extension subscribes to session_start
  → Pi starts a session
      ├─ flag is not exactly true
      │    → remain silent
      │    → expose no code tool or runtime
      └─ flag is exactly true
           → show the shell-authority warning
           → still expose no code tool or runtime
```

The only state in this unit is Pi's parsed flag value for the current process.
There is no child-process state, notebook state, transcript state, or replay.

## Expected implementation files

M0.2 should normally change only these files:

- `src/extension.ts` — register the flag and enabled-session warning.
- `test/extension.test.ts` — prove the flag and both session paths with a narrow
  harness.
- `scripts/smoke-pi.ts` — observe disabled and enabled behavior through the
  project-pinned Pi CLI.
- `README.md` — explain the opt-in and its current no-runtime limitation.
- `docs/learning/M0.2-trust-contract.md` — teach the behavior actually added.
- `PROJECT_PROGRESS.md` — record implementation state and evidence.

No package dependency or lockfile change is expected. If one appears necessary,
stop and explain why before proceeding.

## Extension-entrypoint rules

`src/extension.ts` must:

- retain the type-only `ExtensionAPI` import;
- keep a named, synchronous default factory;
- register one boolean flag whose default is `false`;
- use an exported constant for the flag name and stable user-facing text;
- register only the `session_start` event needed to present the warning;
- read the flag at session start and require exact boolean `true`;
- notify only on the enabled path and use warning severity;
- register no tool, command, shortcut, renderer, provider, or unrelated event;
  and
- start no process, Worker, timer, socket, watcher, asynchronous task, or other
  product resource.

The unit-test harness should permit only `registerFlag`, `getFlag`, and `on`.
Unexpected Pi API access must fail loudly. The enabled callback may use only the
session context's `ui.notify` operation.

## Required tests

Tests must prove at least:

1. The default export remains a function and returns `undefined`.
2. The extension registers `allow-trusted-code` as a boolean defaulting to
   `false`.
3. The flag description names authority equivalent to an unrestricted shell.
4. A session without exact boolean `true` emits no warning.
5. The disabled path does not access any Pi API capable of registering a tool
   or starting work.
6. The enabled path emits the exact warning at warning severity.
7. The warning names shell-equivalent authority, ambient powers, and the lack
   of a security sandbox.
8. Enabling the flag still does not register a `code` tool or start a runtime.
9. A narrow Proxy rejects every unexpected Pi API access.
10. The project-pinned Pi smoke probe observes both disabled and enabled paths.

Do not create a broad fake Pi runtime. A broad fake could accidentally bless
behavior that belongs to M1 or M4.

## Real-Pi smoke contract

Extend `scripts/smoke-pi.ts` without weakening its M0.1 checks. It must use the
project-pinned Pi executable, isolated temporary `PI_CODING_AGENT_DIR`, offline
mode, no saved session, and RPC rather than a model call.

The probe must establish all of these independently:

1. The default launch loads the package and answers `get_state`.
2. The default launch emits no trusted-execution warning.
3. A launch with `--allow-trusted-code` loads the package and answers
   `get_state`.
4. The opted-in launch emits a warning containing a stable trust-contract
   marker.
5. The existing missing-extension negative control still exits non-zero.

Failure reports must retain exit code, stdout, and stderr so a loader failure
cannot be mistaken for a successful silent path.

## M0.2 invariants

The implementer must report each invariant as `PASS`, `FAIL`, or `BLOCKED` with
named evidence.

| ID | Invariant | Evidence |
|---|---|---|
| M0.2-I1 | Pi exposes `--allow-trusted-code` as a boolean defaulting to `false`. | Exact flag-registration test |
| M0.2-I2 | The CLI description says trusted execution has unrestricted-shell authority. | Description assertion |
| M0.2-I3 | Only exact boolean `true` enables the warning path. | Disabled/non-boolean and enabled tests |
| M0.2-I4 | The disabled session path is silent and registers no model-facing tool. | Proxy access log and notification assertion |
| M0.2-I5 | The enabled path warns about shell-equivalent authority, ambient powers, and lack of sandboxing. | Exact notification and semantic assertions |
| M0.2-I6 | Enabling the flag still starts no runtime and exposes no `code` tool. | Source/diff review and Proxy harness |
| M0.2-I7 | The project-pinned Pi CLI exhibits both trust-contract paths in an isolated offline session. | `bun run smoke:pi` |
| M0.2-I8 | All M0.1 package-loading and missing-extension evidence remains intact. | Existing tests plus smoke negative control |
| M0.2-I9 | Strict type-checking and all Bun tests pass. | `bun run typecheck`, `bun test`, `bun run check` |
| M0.2-I10 | The learning note satisfies the eight-part contract and distinguishes consent from isolation. | Learning-note review |
| M0.2-I11 | No third-party source, runtime dependency, runtime mechanism, or M0.3 fixture is added. | Manifest, source, and complete-diff review |
| M0.2-I12 | Progress ends at `Ready for review`; M0.3 remains `Not started`. | `PROJECT_PROGRESS.md` |

## Suggested execution order

1. Confirm M0.1 is `Accepted` and M0.2 is `Ready` in the progress ledger.
2. Record Bun and project-pinned Pi versions.
3. Change only M0.2 from `Ready` to `In progress`.
4. Define the flag name, description, and warning text in
   `src/extension.ts`.
5. Register the disabled-by-default flag and `session_start` warning path.
6. Replace the inert hostile-Proxy test with the narrow trust-contract harness
   while retaining the M0.1 export and return-shape checks.
7. Extend the isolated smoke probe to cover default and opted-in launches.
8. Update the README with the flag and the fact that execution remains absent.
9. Run the fast checks and smoke probe; fix only M0.2 behavior.
10. Write `docs/learning/M0.2-trust-contract.md` using the required headings.
11. Inspect the entire diff for M0.3 or runtime work.
12. If every invariant passes, mark M0.2 `Ready for review`, add its evidence
    row, and stop.

Do not create a commit unless the human explicitly requests it.

## Verification commands

Run from the repository root and report the exit status of every command:

```sh
bun --version
./node_modules/.bin/pi --version
bun install --frozen-lockfile
bun run typecheck
bun test
bun run check
bun run smoke:pi
git diff --check
git status --short
git diff --stat
```

Also inspect the complete diff. Search product source for `registerTool`,
`Bun.spawn`, `Worker`, IPC, sockets, timers, filesystem access, network access,
and evaluators. The test-only smoke harness may continue to launch Pi; product
code may not launch anything.

## Failure and blocker policy

- If the pinned Pi API no longer supports `registerFlag`, `getFlag`,
  `session_start`, or warning notifications as documented, record the exact
  version and error, then stop for a plan amendment.
- If the extension flag cannot be parsed before session start, do not replace
  it with an environment variable silently; stop and propose a new opt-in
  surface.
- If the default path warns, registers a tool, or starts any product work,
  treat that as a failed trust contract.
- If the enabled path requires a placeholder `code` tool to demonstrate the
  flag, reject that approach; model-facing tool registration belongs to M4.
- If the smoke test uses the user's configuration, credentials, model, or
  session, treat that as a failure and restore isolation.
- If implementation needs a runtime dependency or copied reference code, stop
  and explain why; neither is expected in M0.2.
- If unrelated worktree changes exist, preserve them and keep them out of this
  unit.

## Learning-note requirements

Create `docs/learning/M0.2-trust-contract.md` with exactly these top-level
sections:

1. Problem
2. Mental model
3. Code tour
4. Protocol or data flow
5. Try it
6. Tests
7. Tradeoffs
8. Review questions

It must explain:

- how Pi parses and exposes the flag;
- why exact boolean `true` is required;
- when and where the warning appears;
- why opt-in records informed consent but provides no isolation;
- why absence of a `code` tool is the correct M0.2 contract;
- which ambient powers the future Bun runtime will receive; and
- what remains for M0.3 and later runtime milestones.

The note must distinguish unit-test evidence from real-Pi smoke evidence and
must not describe planned execution as implemented behavior.

## Completion report template

The implementer should finish with this report and then stop:

```markdown
## M0.2 completion report

Outcome: <one sentence>
State: Ready for review | Blocked

### Files changed
- <path>: <why>

### Trust contract
- Opt-in: <flag and default>
- Disabled behavior: <observed behavior>
- Enabled behavior: <observed behavior>
- Execution behavior: <confirm what remains absent>

### Verification
- `bun install --frozen-lockfile`: PASS/FAIL/BLOCKED — <evidence>
- `bun run typecheck`: PASS/FAIL/BLOCKED — <evidence>
- `bun test`: PASS/FAIL/BLOCKED — <evidence>
- `bun run check`: PASS/FAIL/BLOCKED — <evidence>
- `bun run smoke:pi`: PASS/FAIL/BLOCKED — <evidence>
- `git diff --check`: PASS/FAIL/BLOCKED — <evidence>

### Invariants
- M0.2-I1: PASS/FAIL/BLOCKED — <evidence>
...
- M0.2-I12: PASS/FAIL/BLOCKED — <evidence>

### Tradeoffs and limitations
- <why this is consent rather than isolation>
- <what remains intentionally absent>

### Human review
- Demonstration: <commands with and without the opt-in>
- Failure path: <how disabled behavior was verified>
- Questions the reviewer should be able to answer: <answers withheld>

No commit was created. M0.3 was not started.
```

## Human acceptance checklist

The reviewer accepts M0.2 only after all of these are true:

- [ ] The flag is visibly disabled by default.
- [ ] Pi can be run with and without `--allow-trusted-code`, and the reviewer
      can explain the difference.
- [ ] The warning accurately describes ambient authority and lack of
      sandboxing.
- [ ] The reviewer can explain why the flag is informed consent rather than a
      security boundary.
- [ ] The reviewer confirms that neither path registers a `code` tool or starts
      a runtime.
- [ ] Unit, type, and real-Pi smoke checks pass, including the M0.1 negative
      control.
- [ ] The learning note clearly separates implemented and planned behavior.
- [ ] The complete diff contains no M0.3, M1, or later work.
- [ ] The progress ledger is internally consistent.

Only after this review may the human mark M0.2 accepted and authorize a focused
M0.2 commit and the M0.3 handoff.

## Copyable handoff prompt

```text
Implement M0.2 only in this repository.

Read PROJECT_GOALS.md, PROJECT_PROGRESS.md, docs/milestones/M0_FOUNDATION.md, docs/learning/M0.1-package-scaffold.md, README.md, and the current extension, tests, and smoke harness before editing. Restate the single behavioral outcome and expected files first.

Follow every M0.2 scope boundary and invariant in docs/milestones/M0_FOUNDATION.md. Add the disabled-by-default --allow-trusted-code flag, the enabled-session shell-authority warning, narrow unit tests, real-Pi disabled/enabled smoke evidence, README text, and docs/learning/M0.2-trust-contract.md. Preserve all M0.1 checks.

Update M0.2 from Ready to In progress, then to Ready for review only after every required check passes. Report all commands and invariants with evidence. Inspect the complete diff. Do not register a code tool, execute TypeScript, start a product subprocess, add M0.3 fixtures, or create a commit. Finish with the completion-report template and stop for human review.
```

---

# Later M0 Unit — Planning Preview Only

## M0.3 — Add black-box acceptance fixtures

Planned outcome: executable cases name the future V0 behavior and clearly mark
pending cases without pretending they pass. Its detailed invariant plan will be
written only after M0.2 is accepted and its lessons are incorporated.

M0.3 is not authorized by this handoff.
