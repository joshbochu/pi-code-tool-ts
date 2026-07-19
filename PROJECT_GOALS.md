# Pi TypeScript Code Mode: Project Goals

- Status: proposed
- Working name: `pi-code-tool-ts`
- Last updated: 2026-07-19
- Reference roadmap: [PI_CODE_MODE_ROADMAP.md](./PI_CODE_MODE_ROADMAP.md)

## One-sentence goal

Build a stock Pi extension that gives the model a persistent, fully trusted Bun and TypeScript workbench whose programs can call Pi tools, process intermediate results outside model context, and return only useful output.

## Why this project exists

Ordinary tool calling forces the model back into the loop after most operations:

```text
model → search → model → read → model → read → model → aggregate → answer
```

Code mode lets the model express the workflow once:

```text
model → TypeScript program → search/read/filter/aggregate → result → model
```

The expected benefits are:

- Fewer model inference round trips.
- Less intermediate tool output in model context.
- Lower token usage and latency on multi-tool work.
- Reliable loops, branching, filtering, aggregation, and parallelism.
- A typed programming interface over Pi tools.
- A foundation for richer trusted, remote, and sandboxed runtimes later.

This feature is not meant to replace direct tool calls for simple one-step operations.

## V0 product promise

V0 is intentionally trusted execution.

The model receives one Pi tool named `code` and writes TypeScript such as:

```ts
const files = await tool.find({ pattern: "**/*.ts" });

const matches = await Promise.all(
  files.map(path => tool.grep({ pattern: "TODO", path })),
);

display(matches.filter(result => result.count > 0));
```

The program runs in a persistent Bun subprocess and may use normal Bun, Node, filesystem, process, network, and npm capabilities. It has the same practical trust level as giving the model an unrestricted shell.

V0 must state this honestly. A subprocess provides lifecycle and crash isolation; it is not a security sandbox.

### V0 user-visible capabilities

- A stock Pi extension that registers `code`.
- Real TypeScript execution through Bun.
- A persistent subprocess per Pi session.
- Top-level await.
- Final-expression display.
- Persistent top-level variables, functions, classes, and imports.
- `tool.read`, `tool.grep`, `tool.find`, `tool.ls`, `tool.write`, `tool.edit`, and `tool.bash` adapters.
- Sequential and parallel tool calls from TypeScript.
- Streaming console output.
- Structured `display()` output for text and JSON.
- Timeouts, cancellation, reset, crash recovery, and session disposal.
- Output limits and full-output artifacts.
- Clear traces and errors for code and nested tool calls.
- A benchmark showing whether code mode saves turns, context, or time on representative tasks.

### V0 non-goals

- Security sandboxing.
- Remote execution.
- Python, Ruby, or Julia.
- Durable restoration of arbitrary live closures after Pi restarts.
- Branch-safe replay of side effects.
- Per-tool confirmation prompts as a security boundary.
- Saved reusable tools.
- Images, charts, or Jupyter MIME bundles.
- Nested model completions or subagents.
- Automatic bridging of every extension and MCP tool.
- A Worker-based runtime.

These remain roadmap items rather than disappearing from scope.

## Competitive reference points

The intended V0 is a focused intersection of the strongest ideas in Oh My Pi and `pi-code-tool`, not a complete clone of either.

### Oh My Pi `eval`

Reference: [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi). The research workspace used a local clone for source inspection; third-party source is not included in this repository.

OMP currently provides:

- Persistent Python and Bun/JavaScript by default.
- Optional Ruby and Julia.
- A Bun subprocess with Worker and inline fallbacks.
- TypeScript stripping, import rewriting, top-level await, final-expression display, and persistent lexical declarations.
- Generic access to internal session tools through `tool.<name>`.
- Streaming output, JSON, Markdown, images, truncation, and artifacts.
- `completion()`, `agent()`, `parallel()`, `pipeline()`, progress events, and budget helpers.
- Extensive lifecycle and regression coverage.

OMP's relevant limitations for this project:

- Its full runtimes are trusted rather than sandboxed.
- It is deeply coupled to OMP's private session/tool APIs.
- State is primarily live-process state rather than fully durable branch-safe replay.
- It does not provide a first-class generic remote runtime backend.
- It does not expose the granular capability-policy product we eventually want.

Lessons to borrow:

- JavaScript runtime semantics and source transformation.
- Subprocess-first lifecycle and hard cancellation.
- Tool-call IPC protocol.
- Output streaming and artifact handling.
- Compatibility tests and failure cases.

Any copied or adapted code must retain MIT attribution and be called out in the relevant commit learning note.

### `pi-code-tool`

Reference: [pi-code-tool package](https://pi.dev/packages/pi-code-tool) and [source](https://github.com/josephkern/pi-code-tool).

`pi-code-tool` currently provides:

- Sandboxed Python through Pydantic Monty.
- Direct Pi adapters for `read`, `grep`, `find`, `ls`, `bash`, `edit`, and `write`.
- Mid-execution approval suspension and later resumption.
- Branch-safe state through transcript replay and a tool-call cache.
- Static checking against generated Python stubs.
- Resource limits, traces, and streaming output.
- Saved reusable tools.
- A mature installable package and test suite.

Its intentional constraints:

- Guest programs use a restricted Python subset.
- No arbitrary Python packages or full CPython standard library.
- No full Bun, Node, or npm environment.
- No OMP-style JavaScript notebook and rich orchestration runtime.

Lessons to borrow after V0:

- Durable session reconstruction.
- Side-effect-safe replay.
- Approval suspension/resumption.
- Generated tool typings/stubs.
- Saved human-readable tools.
- Branch-correct state and test strategy.

### Positioning of this project

| Area | OMP | `pi-code-tool` | Trusted V0 | Long-term target |
|---|---|---|---|---|
| Guest language | Full JS/TS, Python, Ruby, Julia | Restricted Python | Full Bun/TS | TS sandbox + full Bun |
| Context-saving tool composition | Yes | Yes | Yes | Yes |
| Persistent notebook bindings | Yes, live | Replay-based variables | Yes, live | Live plus durable state |
| npm/Bun/Node APIs | Yes | No | Yes | Yes when backend permits |
| Pi portability | OMP internal | Stock Pi package | Stock Pi package | Stock Pi package |
| Sandbox | No | Yes | No | Yes, optional backend |
| Remote full runtime | No generic backend | No | No | Yes |
| Durable branch restoration | Limited | Yes | No | Yes |
| Rich output/nested agents | Strong | Focused/minimal | Basic | Strong |
| Approval model | Outer exec trust | Mutation gates/global auto-approve | Explicit full trust | Per-capability profiles |

### V0 parity target

V0 should reach approximately:

- 75–80% of OMP's user-visible Bun/TypeScript code-mode core.
- The central context-saving behavior of `pi-code-tool`.
- Less security and durability than `pi-code-tool`, explicitly and intentionally.
- Less rich output and orchestration than OMP.

V0 is successful when it is useful and understandable, not when its feature count matches either project.

## Architecture boundary

```text
Pi process
├─ extension and `code` tool
├─ session/runtime manager
├─ Pi tool adapters
├─ output renderer
└─ Bun IPC transport
        │
        ▼
Persistent Bun subprocess
├─ TypeScript/source transformation
├─ notebook state
├─ console/display capture
├─ tool proxy
└─ user program
```

The host owns:

- Pi integration.
- Tool adapters and validation.
- Runtime lifecycle.
- Timeout and cancellation decisions.
- Output truncation and artifacts.
- Session identity.

The child owns:

- TypeScript execution.
- Persistent lexical state.
- Imports relative to the session working directory.
- Console and display capture.
- Suspending and resuming promises around host-tool calls.

Host and child communicate only through a versioned, serializable protocol.

## Repository shape

The exact package name can change, but the intended separation is:

```text
pi-code-mode-ts/
├─ extensions/
│  └─ index.ts
├─ src/
│  ├─ extension.ts
│  ├─ protocol.ts
│  ├─ process-manager.ts
│  ├─ tool-registry.ts
│  ├─ output.ts
│  └─ runtime/
│     ├─ entry.ts
│     ├─ engine.ts
│     ├─ transform.ts
│     └─ prelude.ts
├─ test/
├─ examples/
├─ docs/
│  ├─ adr/
│  └─ learning/
└─ package.json
```

## Development principles

### One architectural idea per commit

Each roadmap unit below is intended to become one successive commit. A commit may be split further if implementation reveals two independently understandable ideas. Multiple units should not be combined merely because an LLM can implement them in one pass.

Each commit must:

- Leave the build and existing tests green.
- Add or update tests for its behavior.
- Include a small runnable demonstration when user-visible.
- Add a learning note under `docs/learning/`.
- Avoid unrelated refactoring.
- Record copied/reference code and license attribution.
- State limitations and the next missing behavior.
- Be independently revertible.

### Human learning note contract

Every implementation commit adds a file such as:

```text
docs/learning/M1.2-child-handshake.md
```

It contains:

1. **Problem** — what was impossible before this commit.
2. **Mental model** — the simplest explanation of the new mechanism.
3. **Code tour** — the files and important functions in reading order.
4. **Protocol or data flow** — inputs, outputs, state, and failure path.
5. **Try it** — one command and expected result.
6. **Tests** — what is proven and what remains unproven.
7. **Tradeoffs** — why this implementation was chosen.
8. **Review questions** — two or three questions a human should be able to answer before continuing.

The learning note is part of the feature, not optional commentary.

### LLM implementation contract

For each unit, the LLM should:

1. Read this document, the current milestone note, relevant ADRs, and the previous learning note.
2. Restate the single unit's behavioral outcome.
3. Identify files expected to change.
4. Write or update the narrowest meaningful tests.
5. Implement only that unit.
6. Run the stated verification commands.
7. Write the learning note and update the milestone checklist.
8. Report the diff, tradeoffs, test evidence, and remaining limitation.
9. Stop for human review before beginning the next unit.

The LLM should not create a commit unless explicitly asked. After human review, the unit should be committed without bundling subsequent work.

### Human review checkpoint

Before accepting a unit, the human builder should be able to:

- Explain the new mechanism without reading its implementation line by line.
- Run the demonstration and intentionally trigger one failure path.
- Identify where state lives and who owns cleanup.
- Explain what the tests prove and do not prove.
- Revert the commit without breaking earlier milestones.

If this is not possible, the unit or its learning note is too large.

### Commit conventions

Suggested commit shape:

```text
feat(runtime): add versioned child handshake

- establish host/child protocol version negotiation
- reject incompatible child versions
- document lifecycle and failure behavior
```

Suggested prefixes:

- `chore:` package and tooling only.
- `test:` executable specification without new product behavior.
- `feat:` new behavior.
- `fix:` correction to established behavior.
- `docs:` learning material or decisions without runtime changes.

Dependency additions should be isolated when practical so their purpose and generated lockfile changes are easy to review.

## Milestone plan

This is the canonical commit-sized implementation sequence. Current delivery status lives in [PROJECT_PROGRESS.md](./PROJECT_PROGRESS.md), and detailed per-milestone handoffs live under [`docs/milestones/`](./docs/milestones/). The milestone labels in `PI_CODE_MODE_ROADMAP.md` describe strategic architecture phases and are not implementation-unit identifiers.

### M0 — Foundation and executable specification

Outcome: a human understands the product boundary, can load the extension skeleton in Pi, and can run a test suite before runtime complexity begins.

#### M0.1 — Scaffold the package

Commit outcome:

- Create the package layout, Pi manifest, TypeScript configuration, and Bun test command.
- Add a minimal extension entrypoint that loads without registering experimental behavior.

Proof:

- `bun test` passes.
- Pi loads the extension without error.

Human understanding:

- How Pi discovers and loads an extension.
- Which code runs in the Pi process.

#### M0.2 — Define the V0 trust contract

Commit outcome:

- Add configuration requiring an explicit trusted-execution opt-in.
- Show a clear warning or description that code has shell-equivalent authority.

Proof:

- The `code` tool is unavailable or refuses execution without opt-in.
- Tests cover enabled and disabled configurations.

Human understanding:

- Why a child process is not a sandbox.
- What authority the model receives.

#### M0.3 — Add black-box acceptance fixtures

Commit outcome:

- Define executable fixtures for the eventual V0 behaviors without implementing them all.
- Mark future behaviors as skipped or expected failures with milestone references.

Fixtures cover:

- Basic TypeScript.
- Top-level await.
- Persistent declarations.
- Imports.
- Tool calls.
- Parallel tool calls.
- Timeout recovery.
- Output truncation.

Proof:

- The acceptance suite runs and clearly distinguishes implemented from pending behavior.

Human understanding:

- What V0 means in observable terms.

### M1 — Persistent Bun process and IPC

Outcome: Pi can reliably start, communicate with, stop, and replace a Bun child process.

#### M1.1 — Define the versioned protocol

Commit outcome:

- Add serializable host-to-child and child-to-host message types.
- Cover `init`, `ready`, `run`, `result`, `error`, and `close`.

Proof:

- Round-trip serialization tests.
- Unknown message and version mismatch tests.

Human understanding:

- Why the protocol is a compatibility boundary.
- Which side owns each message.

#### M1.2 — Start a child and complete a handshake

Commit outcome:

- Spawn `process.execPath` as a Bun child with IPC.
- Require `init`/`ready` before use.

Proof:

- Integration test observes the child PID and successful handshake.
- Startup failure produces a bounded, useful error.

Human understanding:

- Difference between the Pi process and runtime process.
- Startup and failure sequence.

#### M1.3 — Execute JavaScript and return a value

Commit outcome:

- Add one `run` request at a time.
- Return a serializable final value or normalized error.

Proof:

- Arithmetic, object, thrown-error, and unserializable-result tests.

Human understanding:

- Where code is evaluated.
- How a run is correlated with its result.

#### M1.4 — Stream stdout and stderr

Commit outcome:

- Capture `console.log`, `console.error`, stdout, and stderr as ordered runtime events.

Proof:

- Interleaved output test preserves per-run ordering.

Human understanding:

- Difference between streaming events and the final result.

#### M1.5 — Add cancellation and hard timeout

Commit outcome:

- Abort an asynchronous run.
- Kill a process stuck in a synchronous infinite loop.
- Reject outstanding requests predictably.

Proof:

- Infinite-loop test terminates within a bounded interval.
- The Pi test process remains responsive.

Human understanding:

- Why killing the child is the only reliable synchronous-loop interrupt.
- Which state is lost after a kill.

#### M1.6 — Reset, crash recovery, and disposal

Commit outcome:

- Reset replaces runtime state.
- Unexpected exit marks the session dead and permits a fresh process.
- Pi session disposal leaves no child behind.

Proof:

- Reset, crash, restart, and orphan-process tests.

Human understanding:

- Runtime state machine: starting, ready, running, closing, dead.

### M2 — TypeScript notebook semantics

Outcome: separate `code` calls feel like one persistent TypeScript notebook.

#### M2.1 — Transpile TypeScript

Commit outcome:

- Use Bun's transpiler to strip TypeScript syntax before execution.
- Preserve source identity for useful errors.

Proof:

- Type annotations, interfaces, generics, and syntax-error tests.

Human understanding:

- Transpilation versus type-checking.
- Why V0 executes TypeScript without promising static correctness.

#### M2.2 — Display the final expression

Commit outcome:

- Detect and display the last expression while preserving statement behavior.

Proof:

- Expression, statement-only, object-literal, and thrown-expression tests.

Human understanding:

- How notebook output differs from `console.log`.

#### M2.3 — Support top-level await

Commit outcome:

- Wrap asynchronous cells without losing final-expression behavior.

Proof:

- Resolved, rejected, and mixed statement/await tests.

Human understanding:

- Why top-level await requires a wrapper.

#### M2.4 — Persist functions and simple bindings

Commit outcome:

- Preserve top-level `var` and function declarations across runs.

Proof:

- Define in one run and use in the next.
- Reset removes them.

Human understanding:

- Global properties versus lexical bindings.

#### M2.5 — Persist `let`, `const`, and classes

Commit outcome:

- Transform top-level lexical declarations into durable session bindings.
- Adapt relevant OMP behavior with attribution where useful.

Proof:

- Destructuring, classes, duplicate declarations, and cross-cell use.

Human understanding:

- Why ordinary `eval` does not provide notebook persistence automatically.
- What transformation changes semantically.

#### M2.6 — Preserve closures and failed-cell integrity

Commit outcome:

- Functions retain references to earlier bindings.
- A failed transformation or execution does not silently corrupt established state.

Proof:

- Closure mutation and failed-cell regression tests.

Human understanding:

- Difference between lexical persistence and serializable state.

#### M2.7 — Resolve imports from the session cwd

Commit outcome:

- Rewrite static and dynamic imports to resolve as if issued from the active project.
- Support normal project and npm dependencies available to Bun.

Proof:

- Local module, package, dynamic import, missing module, and cwd tests.

Human understanding:

- Why imports otherwise resolve relative to the runtime implementation.

### M3 — Pi tool calling

Outcome: TypeScript can compose Pi tools without returning to the model after each call.

#### M3.1 — Add tool-call request and reply messages

Commit outcome:

- Extend the protocol with correlated `tool-call` and `tool-reply` messages.
- Pause the child promise until a reply arrives.

Proof:

- Fake host function returns a value, throws, and runs concurrently.

Human understanding:

- How code pauses without pausing the Pi process.

#### M3.2 — Create an explicit host tool registry

Commit outcome:

- Register named host functions with schemas and executors.
- Reject unknown tools and invalid arguments before execution.

Proof:

- Registry lookup and validation tests.

Human understanding:

- Why stock Pi metadata is not itself a generic execution handle.

#### M3.3 — Expose the TypeScript `tool` proxy

Commit outcome:

- Inject `tool.<name>(args)` into the runtime.
- Normalize successful and failed results.

Proof:

- One model-like TypeScript program calls a fake tool twice.

Human understanding:

- Proxy syntax versus protocol messages and real host execution.

#### M3.4 — Bridge `read`

Commit outcome:

- Adapt Pi's read implementation and result shape.
- Preserve cancellation and output limits.

Proof:

- Read a project file from code and use its contents without displaying them.

Human understanding:

- The first complete guest-code-to-Pi-tool round trip.

#### M3.5 — Bridge `grep`, `find`, and `ls`

Commit outcome:

- Add the remaining read-only repository tools.
- Normalize their outputs into code-friendly structures.

Proof:

- A program finds files, searches them, filters results, and displays a summary.

Human understanding:

- Where context savings occur.

#### M3.6 — Bridge `bash`, `edit`, and `write`

Commit outcome:

- Add trusted mutation and command adapters.
- Mark each nested call clearly in traces.
- Document that V0 does not claim inner-tool prompts can contain unrestricted Bun code.

Proof:

- A temporary workspace test writes, edits, and invokes a harmless command.

Human understanding:

- Why full Bun can bypass the adapter layer.
- Why adapters remain useful for structured results and observability.

#### M3.7 — Support parallel calls and cancellation

Commit outcome:

- Route overlapping tool calls to the correct promises.
- Abort outstanding host calls when the run ends.

Proof:

- `Promise.all` result ordering, mixed success/failure, and cancellation tests.

Human understanding:

- Correlation IDs and concurrent in-flight state.

#### M3.8 — Generate the model-facing TypeScript API

Commit outcome:

- Generate concise tool declarations and prompt guidance from the registry.
- Keep model instructions aligned with actual enabled adapters.

Proof:

- Snapshot tests for tool descriptions and declarations.

Human understanding:

- How a typed API reduces tool-selection and argument mistakes.

### M4 — Pi experience and output discipline

Outcome: the feature is understandable and safe to operate as a trusted tool in a real Pi session.

#### M4.1 — Register the real `code` tool

Commit outcome:

- Connect the runtime manager to Pi's tool interface.
- Scope one runtime to one Pi session and working directory.

Proof:

- End-to-end Pi extension test executes TypeScript.

Human understanding:

- Complete call path from model tool call to runtime result.

#### M4.2 — Stream progress into Pi

Commit outcome:

- Show incremental console and nested-tool status without flooding model context.

Proof:

- UI/update integration test and transcript inspection.

Human understanding:

- User-visible progress versus model-visible content.

#### M4.3 — Add structured `display()`

Commit outcome:

- Support text and JSON values separately from console output.
- Define which values enter model context.

Proof:

- Text, object, array, empty, and unserializable display tests.

Human understanding:

- Why deliberate display is the context-control boundary.

#### M4.4 — Truncate output and preserve artifacts

Commit outcome:

- Cap model-visible output.
- Store complete oversized output and return a reference.

Proof:

- Byte, line, and large nested-tool-output tests.

Human understanding:

- Why code mode can still overflow context without output discipline.

#### M4.5 — Improve errors and traces

Commit outcome:

- Report source-oriented TypeScript errors, runtime duration, backend PID, and nested tool trace.

Proof:

- Syntax, runtime, timeout, tool failure, and process-crash snapshots.

Human understanding:

- How to distinguish transform, runtime, transport, and host-tool failures.

#### M4.6 — Add explicit reset and session cleanup

Commit outcome:

- Expose `reset` on the `code` tool.
- Tie cleanup to Pi session disposal and extension reload.

Proof:

- State disappears after reset and no child remains after disposal.

Human understanding:

- Runtime lifetime relative to Pi session lifetime.

### M5 — V0 evidence and release readiness

Outcome: V0 is not only demonstrated; its benefits and limitations are measured and reproducible.

#### M5.1 — Build the compatibility suite

Commit outcome:

- Port or independently reproduce the relevant OMP JavaScript compatibility cases.
- Record attribution and intentional semantic differences.

Proof:

- Compatibility matrix generated from tests.

Human understanding:

- What “OMP-like” means precisely.

#### M5.2 — Add lifecycle and stress tests

Commit outcome:

- Exercise repeated runs, resets, crashes, parallel calls, cancellation races, and cleanup.

Proof:

- No orphan child processes or unresolved promises after the suite.

Human understanding:

- Which failures appear only under repetition or concurrency.

#### M5.3 — Benchmark direct tools versus code mode

Commit outcome:

- Add representative read/search/filter/aggregate tasks.
- Measure model turns, input tokens, output tokens, wall time, success, and tool calls.

Comparisons:

- Normal Pi tool calling.
- This TypeScript code mode.
- `pi-code-tool` where the task is supported by both.
- OMP where practical.

Proof:

- Reproducible benchmark command and machine-readable results.

Human understanding:

- Where code mode helps and where it adds overhead.

#### M5.4 — Write operator and contributor documentation

Commit outcome:

- Install, configuration, trust model, architecture, troubleshooting, and extension-development guides.

Proof:

- A fresh checkout can be installed and demonstrated from the documentation alone.

Human understanding:

- How to use and extend the system without reconstructing its history.

#### M5.5 — Declare V0

Commit outcome:

- Close or explicitly defer every V0 acceptance fixture.
- Publish the compatibility, benchmark, and known-limitations summaries.
- Tag the trusted runtime as V0-ready; package publication remains a separate explicit action.

Proof:

- Clean install, test, smoke, and representative Pi session.

Human understanding:

- What V0 promises and what it deliberately does not promise.

## Post-V0 milestones

These milestones preserve the longer competitive direction without burdening the trusted V0.

### M6 — Durable and branch-correct sessions

- Persist serializable state in tool-result details.
- Reconstruct state after restart and conversation branching.
- Replay code with cached tool results so side effects do not repeat.
- Define behavior for closures and non-serializable values.

Outcome: approach `pi-code-tool`'s durable state guarantees.

### M7 — Capability policy and suspend/resume approvals

- Add per-tool `allow`, `ask`, and `deny` policies.
- Suspend code at gated tool calls and resume later.
- Support interactive and headless profiles.
- Preserve pending approvals across restart where possible.

Outcome: approvals become useful for sandboxed/remote backends and externally consequential tools.

### M8 — Remote full Bun

- Define a transport-neutral runtime interface.
- Run full Bun in one disposable remote VM/container backend.
- Sync repositories and return reviewable patches.
- Add scoped credential injection, network policy, resource limits, and automatic teardown.

Outcome: retain full Bun compatibility without giving generated code direct access to the local machine.

### M9 — TypeScript capability sandbox

- Evaluate Zapcode against the V0 compatibility suite.
- Add a deny-by-default backend if its supported subset is adequate.
- Advertise backend-specific language capabilities to the model.
- Maintain the same host-tool API where possible.

Outcome: safe local code mode for workflows that do not require npm or full Bun APIs.

### M10 — Rich orchestration and output

- Markdown, tables, and images.
- Nested `completion()` and `agent()` calls.
- `parallel()` and `pipeline()` helpers.
- Progress, budgets, and timeout pausing around nested model work.

Outcome: approach OMP's richer orchestration experience.

### M11 — Saved tools and broader discovery

- Save successful TypeScript as human-readable reusable tools.
- Generate adapters/declarations for cooperating extension and MCP tools.
- Add tool search when the API surface becomes large.

Outcome: exceed a one-off REPL and become a reusable agent programming environment.

## Definition of V0 success

V0 is complete only when all of the following are true:

- A user can install the extension and deliberately opt into trusted execution.
- The model can write TypeScript that calls at least seven Pi tools.
- State persists naturally across separate code calls.
- Synchronous infinite loops cannot hang Pi permanently.
- Process crashes and resets recover predictably.
- Large intermediate results remain outside model context unless displayed.
- Output is bounded and full output is recoverable.
- The test suite covers the public behavior and major lifecycle failures.
- The benchmark identifies at least one task class where code mode materially improves turns, tokens, or latency without reducing correctness.
- The documentation allows a human to explain the architecture, trust boundary, and principal tradeoffs.
- Every milestone unit exists as a comprehensible, green, independently reviewable commit.

## Decision gates

At the end of each milestone, pause before continuing.

### After M1

Question: Is the subprocess lifecycle reliable and simple enough to maintain?

Stop or redesign if process cleanup, IPC, or timeout recovery is unreliable.

### After M2

Question: Does OMP-like notebook fidelity justify the source transformation complexity?

Compare against an explicit `state` object before committing to additional transformation features.

### After M3

Question: Does TypeScript programmatic tool calling work reliably with the target models?

Run real tasks before investing in rich UI work.

### After M5

Question: Does the measured benefit justify maintaining a separate project from `pi-code-tool`?

If not, publish the findings and stop rather than expanding scope by inertia.

## First implementation task

Begin with **M0.1 — Scaffold the package** only.

Do not begin subprocess, transformation, or tool-bridge work in the same commit. The first commit should establish the project shape, test command, Pi loading path, and first learning note so every later unit follows the intended development discipline.
