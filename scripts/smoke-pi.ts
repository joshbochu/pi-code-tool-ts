import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TRUSTED_EXECUTION_FLAG,
  TRUSTED_EXECUTION_WARNING,
} from "../src/extension";

interface PiRun {
  exitCode: number;
  stderr: string;
  stdout: string;
}

interface SmokeRpcRequest {
  id: typeof SMOKE_RPC_ID;
  type: typeof SMOKE_RPC_COMMAND;
}

interface SmokeRpcResponse {
  command?: unknown;
  id?: unknown;
  success?: unknown;
  type?: unknown;
}

interface TrustNotification {
  message?: unknown;
  method?: unknown;
  notifyType?: unknown;
  type?: unknown;
}

const SMOKE_RPC_ID = "m0.1-smoke";
const SMOKE_RPC_COMMAND = "get_state";
const SMOKE_RPC_RESPONSE_TYPE = "response";
const MISSING_EXTENSION_PATH = "./src/__m0_1_missing_extension__.ts";
const TRUSTED_EXECUTION_CLI_FLAG = `--${TRUSTED_EXECUTION_FLAG}`;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const piExecutable = join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "pi.cmd" : "pi",
);

const smokeRpcRequest: SmokeRpcRequest = {
  id: SMOKE_RPC_ID,
  type: SMOKE_RPC_COMMAND,
};

function formatFailure(message: string, run: PiRun): string {
  return [
    message,
    `exit code: ${String(run.exitCode)}`,
    `stdout:\n${run.stdout || "<empty>"}`,
    `stderr:\n${run.stderr || "<empty>"}`,
  ].join("\n");
}

function createSmokeEnvironment(agentDir: string): Record<string, string> {
  const environment: Record<string, string> = {
    HOME: agentDir,
    PI_CODING_AGENT_DIR: agentDir,
    PI_OFFLINE: "1",
    PI_TELEMETRY: "0",
  };

  for (const key of [
    "PATH",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "SystemRoot",
    "COMSPEC",
    "PATHEXT",
  ]) {
    const value = process.env[key];
    if (value !== undefined) {
      environment[key] = value;
    }
  }

  return environment;
}

async function runPi(
  extensionSource: string,
  agentDir: string,
  rpcInput = "",
  extraArguments: readonly string[] = [],
): Promise<PiRun> {
  const child = Bun.spawn(
    [
      piExecutable,
      "--offline",
      "--no-extensions",
      "-e",
      extensionSource,
      "--mode",
      "rpc",
      "--no-session",
      ...extraArguments,
    ],
    {
      cwd: projectRoot,
      env: createSmokeEnvironment(agentDir),
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    },
  );

  if (rpcInput) {
    await child.stdin.write(rpcInput);
  }
  await child.stdin.end();

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

function findTrustNotification(stdout: string): TrustNotification | undefined {
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line) as TrustNotification;
      if (
        record.type === "extension_ui_request" &&
        record.method === "notify" &&
        record.notifyType === "warning" &&
        record.message === TRUSTED_EXECUTION_WARNING
      ) {
        return record;
      }
    } catch {
      // Pi RPC output is JSONL. Non-JSON output is retained in the failure
      // report if no matching trust notification is found.
    }
  }
  return undefined;
}

function findSmokeResponse(stdout: string): SmokeRpcResponse | undefined {
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line) as SmokeRpcResponse;
      if (
        record.command === SMOKE_RPC_COMMAND &&
        record.id === SMOKE_RPC_ID &&
        record.type === SMOKE_RPC_RESPONSE_TYPE &&
        record.success === true
      ) {
        return record;
      }
    } catch {
      // Pi RPC output is JSONL. Non-JSON output is ignored here and retained in
      // the failure report if no matching response is found.
    }
  }
  return undefined;
}

const agentDir = await mkdtemp(join(tmpdir(), "pi-code-tool-ts-smoke-"));

try {
  const version = Bun.spawnSync([piExecutable, "--version"], {
    cwd: projectRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (version.exitCode !== 0) {
    throw new Error(
      `Unable to execute the project Pi CLI:\n${version.stderr.toString()}`,
    );
  }
  const piVersion = version.stdout.toString().trim();

  const valid = await runPi(
    ".",
    agentDir,
    `${JSON.stringify(smokeRpcRequest)}\n`,
  );
  if (valid.exitCode !== 0) {
    throw new Error(formatFailure("Pi failed to load the package root", valid));
  }
  if (!findSmokeResponse(valid.stdout)) {
    throw new Error(
      formatFailure(
        "Pi started but returned no successful RPC response",
        valid,
      ),
    );
  }
  if (findTrustNotification(valid.stdout)) {
    throw new Error(
      formatFailure(
        "Trusted-execution warning appeared without explicit opt-in",
        valid,
      ),
    );
  }

  const trusted = await runPi(
    ".",
    agentDir,
    `${JSON.stringify(smokeRpcRequest)}\n`,
    [TRUSTED_EXECUTION_CLI_FLAG],
  );
  if (trusted.exitCode !== 0) {
    throw new Error(
      formatFailure("Pi failed with trusted execution enabled", trusted),
    );
  }
  if (!findSmokeResponse(trusted.stdout)) {
    throw new Error(
      formatFailure(
        "Trusted Pi session returned no successful RPC response",
        trusted,
      ),
    );
  }
  if (!findTrustNotification(trusted.stdout)) {
    throw new Error(
      formatFailure(
        "Trusted Pi session did not emit the shell-authority warning",
        trusted,
      ),
    );
  }

  const invalid = await runPi(MISSING_EXTENSION_PATH, agentDir);
  if (invalid.exitCode === 0) {
    throw new Error(
      formatFailure(
        "Negative control failed: Pi accepted a missing extension path",
        invalid,
      ),
    );
  }

  console.log(
    `Pi ${piVersion} loaded the package, kept the default path silent, warned after trusted opt-in, and rejected the missing-extension control.`,
  );
} finally {
  await rm(agentDir, { recursive: true, force: true });
}
