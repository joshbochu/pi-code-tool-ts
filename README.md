# pi-code-tool-ts

An experimental, TypeScript-first code-mode extension for [Pi](https://pi.dev/) built around a persistent Bun runtime.

The central idea is simple: instead of sending every intermediate tool result back through the model, Pi can give the model one `code` tool. The model writes a TypeScript program that calls Pi tools, loops, filters, aggregates, and returns only the useful result. This should reduce model round trips, context usage, and latency for multi-step workflows.

## Status

M0.1, the inert Bun/TypeScript package scaffold, is accepted. M0.2 adds an explicit `--allow-trusted-code` opt-in and a shell-authority warning; it does not add a runtime, code execution, tool bridge, or model-facing `code` tool.

- [Project goals](./PROJECT_GOALS.md) defines the product promise, competitive baseline, V0 scope, learning contract, and milestone outcomes.
- [Project progress](./PROJECT_PROGRESS.md) records the active unit, accepted evidence, and next permitted work.
- [Architecture and roadmap](./PI_CODE_MODE_ROADMAP.md) records the proposed runtime architecture, security model, approval policy, deferred features, and comparison set.
- [M0 milestone plan](./docs/milestones/M0_FOUNDATION.md) is the first implementer handoff, including invariants and self-verification.

The active implementation unit is M0.2: define the trusted-execution contract. Each unit is intended to be small enough for one focused commit and one focused human review. Implementers stop at `Ready for review`; only a human reviewer marks a unit accepted and authorizes the next unit.

## V0 trust model

V0 intentionally targets fully trusted execution on a machine or remote computer dedicated to the agent. Its persistent Bun subprocess will have the same practical authority as an unrestricted shell running as that user.

A subprocess provides crash and lifecycle isolation. It is **not** a security sandbox. Do not run untrusted model-generated code on a personal workstation or alongside valuable credentials. Sandboxed and remote execution backends are explicit post-V0 roadmap items.

Future trusted execution is disabled unless Pi is started with `--allow-trusted-code`. Enabling the flag currently shows the trust warning only; M0.2 still executes no generated code.

## Reference projects

The design compares and learns from:

- [Oh My Pi](https://github.com/can1357/oh-my-pi), especially its high-fidelity persistent JavaScript/Bun evaluation.
- [pi-code-tool](https://github.com/josephkern/pi-code-tool), especially its context-efficient tool calling, durable replay, approvals, and saved tools.

No third-party source code is included in this initial repository. Any future adaptation of MIT-licensed runtime techniques will retain the required attribution and license notices.

## Near-term direction

1. Scaffold a stock Pi extension with Bun and TypeScript.
2. Establish the host/runtime protocol and persistent subprocess lifecycle.
3. Add code evaluation semantics incrementally: top-level await, display, and persistent bindings.
4. Bridge a narrow set of Pi tools with clear tracing, cancellation, limits, and configurable approvals.
5. Benchmark turn count, context usage, and latency against direct tool calling.

The roadmap deliberately keeps security sandboxing, generic remote execution, rich media, saved tools, and durable branching visible as future milestones rather than quietly dropping them.
