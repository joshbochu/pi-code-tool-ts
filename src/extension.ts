import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const TRUSTED_EXECUTION_FLAG = "allow-trusted-code";

export const TRUSTED_EXECUTION_FLAG_DESCRIPTION =
  "Allow future model-written TypeScript with the same practical authority as an unrestricted shell (disabled by default).";

export const TRUSTED_EXECUTION_WARNING =
  "Trusted code consent is enabled. Future model-written TypeScript will have shell-equivalent authority, the same practical authority as an unrestricted shell: it can read and modify files, read environment variables and credentials, use the network, and spawn commands and child processes. A subprocess provides lifecycle isolation but is not a security sandbox. M0.2 executes no generated code and registers no code tool.";

/** Register the M0.2 consent contract without exposing code execution. */
export default function piCodeToolTsExtension(pi: ExtensionAPI): undefined {
  pi.registerFlag(TRUSTED_EXECUTION_FLAG, {
    description: TRUSTED_EXECUTION_FLAG_DESCRIPTION,
    type: "boolean",
    default: false,
  });

  pi.on("session_start", (_event, context) => {
    if (pi.getFlag(TRUSTED_EXECUTION_FLAG) !== true) return;
    context.ui.notify(TRUSTED_EXECUTION_WARNING, "warning");
  });

  return undefined;
}
