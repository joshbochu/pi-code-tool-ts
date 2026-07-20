# M0 — Foundation and Executable Specification

- Status: `In progress`
- Active unit: M0.2 only
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

M0.1 is accepted. M0.2 is the only active implementation unit.

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

## Accepted design

- Opt-in surface: Pi boolean flag `--allow-trusted-code`.
- Default: `false`.
- Disabled behavior: no warning, tool, runtime, or other execution behavior.
- Enabled behavior: warn at `session_start` that model-written TypeScript has
  shell-equivalent authority and that a subprocess is not a sandbox.
- Scope: flag registration, warning, tests, smoke evidence, learning note, and
  progress updates only.

The warning must name the material ambient powers: files, environment and
credentials, network, and process spawning. It must also say that M0.2 does not
execute code yet so the current behavior cannot be confused with a runtime.

## Required tests

Tests must prove:

1. The flag is boolean and defaults to `false`.
2. Its description names unrestricted-shell authority.
3. The disabled session path emits no warning and does not register a tool.
4. The enabled session path emits the exact warning at warning severity.
5. A narrow Proxy rejects any unexpected Pi API access.
6. The project-pinned Pi smoke probe observes both disabled and enabled paths.

Do not add a broad fake Pi runtime. The test harness should expose only
`registerFlag`, `getFlag`, and `on`; any other property access is a failure.

## M0.2 invariants

| ID | Invariant | Evidence |
|---|---|---|
| M0.2-I1 | Pi exposes `--allow-trusted-code` as a boolean defaulting to `false`. | Exact flag-registration test |
| M0.2-I2 | The CLI description says trusted execution has unrestricted-shell authority. | Description assertion |
| M0.2-I3 | The disabled session path is silent and registers no model-facing tool. | Proxy access log and notification assertion |
| M0.2-I4 | The enabled path warns about shell-equivalent authority, ambient powers, and lack of sandboxing. | Exact notification and semantic assertions |
| M0.2-I5 | Enabling the flag still starts no runtime and exposes no `code` tool. | Source/diff review and Proxy harness |
| M0.2-I6 | Project-pinned Pi exhibits the disabled and enabled contracts in an isolated offline session. | `bun run smoke:pi` |
| M0.2-I7 | Strict type-checking and all Bun tests pass. | `bun run typecheck`, `bun test`, `bun run check` |
| M0.2-I8 | The learning note satisfies the eight-part contract and distinguishes consent from isolation. | Learning-note review |
| M0.2-I9 | No third-party source is copied and no runtime dependency is added. | Diff and manifest review |
| M0.2-I10 | Progress ends at `Ready for review`; M0.3 remains unstarted. | `PROJECT_PROGRESS.md` |

## Verification commands

Run from the repository root:

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

Inspect the complete diff for any `registerTool`, process, Worker, IPC, network,
filesystem, or evaluator work. Any such product behavior is out of scope.

## Learning-note requirements

Create `docs/learning/M0.2-trust-contract.md` with exactly the eight standard
sections. It must explain:

- how Pi parses and exposes the flag;
- why exact boolean `true` is required;
- when and where the warning appears;
- why opt-in is not a sandbox;
- why absence of a `code` tool is the disabled contract in M0.2; and
- what remains for M0.3 and later runtime milestones.

## Completion state

After all evidence passes:

- mark M0.1 `Accepted` only because the human explicitly authorized M0.2;
- mark M0.2 `Ready for review`;
- record the implementation and smoke evidence without inventing a commit hash;
- leave M0.3 `Not started`; and
- stop for human review.

## Human acceptance checklist

- [ ] The flag is visibly disabled by default.
- [ ] The reviewer can run Pi with and without `--allow-trusted-code` and explain
      the difference.
- [ ] The warning accurately describes ambient authority and lack of sandboxing.
- [ ] The reviewer can confirm that no `code` tool or runtime exists.
- [ ] All unit, type, and real-Pi smoke checks pass.
- [ ] The learning note distinguishes consent from isolation.
- [ ] The full diff contains no M0.3 or M1 work.

Only after this review may the human mark M0.2 accepted and authorize M0.3.

# Later M0 Unit — Planning Preview Only

## M0.3 — Add black-box acceptance fixtures

Planned outcome: executable cases name the future V0 behavior and clearly mark
pending cases without pretending they pass. Its detailed invariant plan will be
written only after M0.2 is accepted.

M0.3 is not authorized by this handoff.
