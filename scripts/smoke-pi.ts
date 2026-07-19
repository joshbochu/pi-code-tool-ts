import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface PiRun {
  exitCode: number;
  stderr: string;
  stdout: string;
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const piExecutable = join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "pi.cmd" : "pi",
);

function formatFailure(message: string, run: PiRun): string {
  return [
    message,
    `exit code: ${run.exitCode}`,
    `stdout:\n${run.stdout || "<empty>"}`,
    `stderr:\n${run.stderr || "<empty>"}`,
  ].join("\n");
}

function createSmokeEnvironment(agentDir: string): Record<string, string> {
  const environment: Record<string, string> = {
    PI_CODING_AGENT_DIR: agentDir,
    PI_OFFLINE: "1",
    PI_TELEMETRY: "0",
  };

  for (const key of [
    "PATH",
    "HOME",
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
    child.stdin.write(rpcInput);
  }
  child.stdin.end();

  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  return { exitCode, stdout, stderr };
}

function findSmokeResponse(stdout: string): unknown {
  for (const line of stdout.split("\n")) {
    if (!line) continue;
    try {
      const record = JSON.parse(line) as {
        command?: unknown;
        id?: unknown;
        success?: unknown;
        type?: unknown;
      };
      if (
        record.command === "get_state" &&
        record.id === "m0.1-smoke" &&
        record.type === "response" &&
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
    '{"id":"m0.1-smoke","type":"get_state"}\n',
  );
  if (valid.exitCode !== 0) {
    throw new Error(formatFailure("Pi failed to load the package root", valid));
  }
  if (!findSmokeResponse(valid.stdout)) {
    throw new Error(
      formatFailure("Pi started but returned no successful RPC response", valid),
    );
  }

  const invalid = await runPi(
    "./src/__m0_1_missing_extension__.ts",
    agentDir,
  );
  if (invalid.exitCode === 0) {
    throw new Error(
      formatFailure(
        "Negative control failed: Pi accepted a missing extension path",
        invalid,
      ),
    );
  }

  console.log(
    `Pi ${piVersion} loaded the package manifest and answered RPC; the missing-extension control failed as expected.`,
  );
} finally {
  await rm(agentDir, { recursive: true, force: true });
}
