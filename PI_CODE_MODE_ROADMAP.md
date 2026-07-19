# Pi Code Mode: Architecture and Roadmap

- Status: proposed
- Last updated: 2026-07-19

## Objective

Build a Pi extension that exposes one model-facing `code` tool. The model writes TypeScript that can call Pi tools as ordinary async functions, keep state between calls, run loops and parallel work, and return only selected output to model context.

The product target is not merely a proof of concept. The trusted backend should approach Oh My Pi's JavaScript `eval` fidelity, while separate sandboxed and remote backends provide stronger isolation when full Bun access is inappropriate.

## Why build it

Programmatic tool calling can provide:

- Fewer model round trips for loops, branching, filtering, aggregation, and fan-out.
- Lower context usage because intermediate tool results remain inside the runtime.
- Lower latency and inference cost on multi-tool workflows.
- Deterministic data transformations in code instead of repeated model reasoning.
- Natural parallelism with `Promise.all` and reusable helper functions.
- Tool-surface compression: one code tool can present a typed API over many host tools.
- Provider-independent code mode for models and APIs that do not offer it natively.
- A foundation for saved, inspectable, reusable agent-written tools.

It is not automatically better for one or two simple sequential tool calls. Those should remain direct calls.

## Architecture decisions

### AD-1: Target OMP fidelity, not an explicit-state-only product

The explicit `state` object is useful as a bootstrap and serialization primitive, but it is not the final user experience. The full-fidelity target includes ordinary persistent top-level bindings:

```ts
// Call 1
const files = await tool.find({ pattern: "**/*.ts" });

// Call 2: `files` still exists
const matches = await Promise.all(
  files.map(path => tool.grep({ pattern: "TODO", path })),
);
```

Why this is harder than `state.files = ...`:

- Indirect `eval` does not naturally persist top-level `let`, `const`, and `class` bindings in a reusable host-visible scope.
- Code needs transformation for TypeScript, imports, top-level await, final-expression display, and declaration persistence.
- Failed cells must not corrupt previously valid bindings.
- Functions and closures may capture prior cell bindings.
- Reset, cancellation, replay, and branching must agree on the same state model.

Plan: port or adapt OMP's MIT-licensed JavaScript transformation/runtime techniques with attribution, then keep `state` as an explicit serializable escape hatch rather than the primary interface.

### AD-2: Use pluggable execution backends

One backend cannot simultaneously provide unrestricted Bun compatibility and deny-by-default isolation. Use a shared protocol with multiple backends:

1. `bun-process`
   - Full Bun/TypeScript and npm compatibility.
   - Persistent subprocess connected over Bun IPC.
   - Best match for OMP fidelity.
   - Trusted execution: guest code has the subprocess user's ambient authority.

2. `typescript-sandbox`
   - Capability-only TypeScript subset.
   - Evaluate Zapcode first; QuickJS/WASM remains a fallback candidate.
   - No ambient filesystem, environment, process, or network access.
   - Host tools are the only escape hatch.
   - Reduced language/library compatibility is an intentional tradeoff.

3. `remote`
   - Run the full Bun backend inside a disposable container, VM, SSH host, or sandbox service.
   - Preserve full language fidelity while moving the trust boundary off the user's machine.
   - Approval prompts may be disabled by profile, while capability and credential policies remain enforced.

All backends implement the same conceptual contract:

```ts
interface CodeRuntime {
  start(session: RuntimeSession): Promise<void>;
  execute(request: ExecuteRequest): AsyncIterable<RuntimeEvent>;
  reset(): Promise<void>;
  snapshot?(): Promise<Uint8Array>;
  restore?(snapshot: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
```

### AD-3: Separate approvals from capabilities

Every bridged tool gets one policy:

- `allow`: execute without prompting.
- `ask`: prompt for this invocation.
- `deny`: unavailable to guest code.

Configuration supports profiles plus per-tool overrides:

```json
{
  "execution": {
    "backend": "bun-process",
    "approvalProfile": "interactive-local",
    "approvals": {
      "read": "allow",
      "grep": "allow",
      "find": "allow",
      "ls": "allow",
      "bash": "ask",
      "edit": "ask",
      "write": "ask"
    }
  }
}
```

Initial profiles:

| Profile | Default | Intended environment |
|---|---|---|
| `interactive-local` | Read-only tools allowed; mutations ask | Normal workstation |
| `locked-down` | Deny unless explicitly allowed | Sensitive workspace |
| `trusted-remote` | Allow bridged tools without prompts | Disposable remote sandbox |
| `headless-deny` | Prompts become denials | CI without unattended mutation authority |
| `headless-allow` | Prompts become approvals | Explicitly trusted automation |

Turning off prompts does not grant a tool that is denied or absent. It only changes confirmation behavior for an available capability.

For `bun-process`, approving the outer code execution is the meaningful local security boundary: unrestricted Bun code can bypass bridged tools and call filesystem, network, and process APIs directly. Per-tool prompts in this backend remain useful for auditability and intentional host-tool routing, but they cannot contain hostile guest code. In a language sandbox, bridged-tool policies are an actual security boundary.

### AD-4: Prefer a subprocess over a Worker for the full Bun backend

- Reliable hard termination for infinite loops and timeouts.
- Independent PID, memory accounting, exit status, stdout, and stderr.
- Better crash containment.
- Easier future placement inside containers and remote environments.
- IPC overhead is expected to be negligible relative to tool, filesystem, network, and model latency.

A Worker transport remains an experiment behind the same protocol, not a v1 dependency.

## Trust models

### Trusted local execution

`bun-process` runs model-written code as the current OS user. Unless the entire process is externally sandboxed, code can potentially:

- Read or modify any file the user can access.
- Read inherited environment variables and credentials.
- Make network requests.
- Spawn commands and child processes.
- Consume disk, memory, CPU, and process resources.

A separate process improves failure isolation; it does not remove those permissions. Environment scrubbing, a controlled working directory, timeouts, and resource limits reduce exposure but do not create a complete security sandbox.

### Capability sandbox

Guest code has no ambient host APIs. It can only call explicitly registered external functions. This is the appropriate local mode when code may be adversarial or prompt-injected.

### Remote sandbox

Full Bun runs with ambient authority, but only inside a disposable remote boundary. This protects the local computer, but credentials and externally consequential tools still need capability policy: a disposable VM does not make sending email, pushing Git commits, deleting cloud resources, or writing production databases harmless.

## OMP fidelity checklist

### Required for the first credible release

- [ ] Persistent Bun subprocess per Pi session.
- [ ] TypeScript transformation.
- [ ] Top-level await.
- [ ] Persistent `let`, `const`, function, and class declarations.
- [ ] Static and dynamic import handling relative to session cwd.
- [ ] Final-expression display.
- [ ] `console.log`, `display`, and streaming stdout/stderr.
- [ ] Async `tool.<name>(args)` bridge.
- [ ] Sequential and parallel tool calls.
- [ ] Per-tool `allow` / `ask` / `deny` policy.
- [ ] Configurable approval profiles, including no-prompt remote mode.
- [ ] Hard timeout, cancellation, reset, and subprocess replacement.
- [ ] Output truncation with full-output artifacts.
- [ ] Session restoration and branch-correct state.
- [ ] Tool-call traces and timings.

### OMP parity candidates after the core release

- [ ] Rich display bundles: JSON, Markdown, tables, and images.
- [ ] Image resizing and multimodal tool results.
- [ ] `completion()` for stateless nested model calls.
- [ ] `agent()` for structured subagent execution.
- [ ] `parallel()` and `pipeline()` convenience helpers.
- [ ] Runtime budget and concurrency inspection.
- [ ] Idle timeout that pauses around nested model/subagent work.
- [ ] Import caching and session-aware module resolution.
- [ ] Saved reusable code tools.
- [ ] Cross-session or explicitly shared runtime state.
- [ ] Ruby, Julia, or Python backends only if real demand justifies them.

## Roadmap

### M0 — Comparative spike and benchmarks

- Build small proof-of-concept adapters for full Bun IPC and Zapcode.
- Verify Zapcode under Bun on all target platforms.
- Test TypeScript syntax, external function suspension/resumption, `Promise.all`, snapshot portability, resource limits, and error quality.
- Define benchmark tasks: repository search/filter, multi-file reads, JSON aggregation, batch edits, and mixed sequential/parallel tools.
- Record direct-tool-call baselines for model turns, input tokens, wall time, task success, and errors.

Exit criterion: choose backend defaults using evidence, not runtime microbenchmarks alone.

### M1 — Full Bun runtime foundation

- Create the Pi extension and `code` tool.
- Implement versioned IPC protocol and process lifecycle manager.
- Stream output and structured runtime events.
- Add hard timeout, cancellation, reset, crash recovery, output caps, and environment scrubbing.
- Use explicit `state` only as temporary scaffolding while M2 is incomplete.

### M2 — OMP-level JavaScript/TypeScript fidelity

- Port/adapt top-level declaration persistence.
- Add TypeScript transformation, top-level await, final expressions, and import rewriting.
- Cover closures, failed cells, duplicate declarations, asynchronous output, and state after cancellation.
- Attribute reused MIT code and document intentional divergences.

Exit criterion: the OMP JavaScript persistence examples and an agreed compatibility suite pass.

### M3 — Pi tool bridge and approval engine

- Bridge `read`, `grep`, `find`, and `ls` first.
- Add `bash`, `edit`, and `write` with `allow` / `ask` / `deny` policies.
- Implement interactive and headless profiles.
- Validate arguments before dispatch and preserve Pi tool hooks where the public API permits.
- Add audit events for every nested tool call, including cached/replayed calls.

### M4 — Durable sessions

- Persist serializable state in tool-result details.
- Reconstruct state correctly after restart and branching.
- Add replay with tool-call result caching so side effects do not repeat.
- Evaluate checkpoints/snapshots for closures and mid-tool-call suspension.
- Add saved reusable code tools with human-readable source files.

### M5 — Sandboxed and remote backends

- Add a Zapcode-backed TypeScript capability sandbox if M0 compatibility is acceptable.
- Add backend capability reporting so prompts advertise only supported syntax/APIs.
- Define a remote runtime protocol and one reference backend: container, SSH, or a sandbox service.
- Provide `trusted-remote` no-prompt configuration.
- Add explicit credential injection and network egress policies.

### M6 — Rich orchestration and output

- Rich display protocol and image support.
- Nested `completion()` and `agent()` calls.
- Parallel/pipeline helpers, progress events, budgets, and timeout pausing.
- Large-output artifacts and structured result schemas.

### M7 — Broader tool ecosystem

- Investigate bridging extension-defined and MCP tools despite Pi's public API exposing metadata rather than generic execution handles.
- Generate TypeScript declarations and concise tool documentation from schemas.
- Add tool discovery/search when the bridged surface becomes large.
- Add compatibility adapters for common read/search/browser/database tool result shapes.

### M8 — Evaluation and release

- Security review of sandbox and bridge boundaries.
- Cross-platform testing on macOS, Linux, and Windows.
- Compare task quality and cost across models.
- Publish reproducible benchmarks, threat model, limitations, and migration guidance.

## Systems to track and compare

| System | Language/runtime | Isolation model | Lessons to borrow |
|---|---|---|---|
| [Oh My Pi eval](https://github.com/can1357/oh-my-pi) | Full Python and Bun/JS, plus optional Ruby/Julia | Host processes/workers; trusted | Highest local-runtime fidelity, streaming, persistence, rich output, nested tools |
| [pi-code-tool](https://pi.dev/packages/pi-code-tool) | Python via Monty | Language sandbox | Pi adapter, approvals, replay, branching, static checking, saved tools |
| [Zapcode](https://github.com/TheUncharted/zapcode) | TypeScript subset in a Rust VM | Deny-by-default language sandbox | TS-native external functions, snapshots, resource limits; evaluate as sandbox backend |
| [Pydantic Monty](https://github.com/pydantic/monty) | Python subset in a Rust VM | Deny-by-default language sandbox | Suspend/resume, snapshots, type checking, capability-only host calls |
| [Cloudflare Code Mode](https://developers.cloudflare.com/agents/model-context-protocol/codemode/) | JavaScript in isolated Workers | Managed isolate | Typed API compression, MCP/OpenAPI exposure, no ambient filesystem/env |
| [Anthropic programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) | Managed Python container | Provider-managed sandbox | Caller identity, pause/resume protocol, context/token behavior |
| [Hermes Agent execute_code](https://hermes-agent.nousresearch.com/docs/user-guide/features/code-execution/) | Python child process with Unix-socket RPC | Trusted/restricted host process, optional container backends | Environment scrubbing, tool whitelist, call/output limits, project vs strict modes |
| [Hugging Face smolagents](https://huggingface.co/docs/smolagents/main/tutorials/secure_code_execution) | Python CodeAgent with several executors | Local or remote sandbox options | Code-agent prompting and executor portability |
| [E2B Code Interpreter](https://e2b.dev/docs/code-interpreting/contexts) | Remote code contexts | Cloud sandbox | Remote lifecycle, parallel contexts, disposable full environments |
| [just-bash](https://github.com/vercel-labs/just-bash) | In-process Bash interpreter and virtual filesystem | Language/virtual-FS boundary | Capability-oriented shell workflows and swappable sandbox API |

Revisit this matrix at each milestone. New candidates should be assessed for language fidelity, startup, persistence, suspend/resume, tool bridging, approval controls, resource limits, state restoration, portability, licensing, and maintenance health.

## Success metrics

For representative multi-tool tasks, measure:

- Task completion rate and output correctness.
- Number of model inference turns.
- Input/output tokens and estimated model cost.
- Wall-clock latency.
- Tool calls executed and avoided through local filtering.
- Runtime startup and steady-state memory.
- Timeout and crash recovery reliability.
- Branch/session restoration correctness.
- Approval prompts shown, suppressed, denied, and bypass attempts.
- Sandbox escape tests and accidental side effects.

The project is successful if it materially improves multi-tool latency or context use without reducing task correctness, while presenting an honest and configurable trust boundary.
