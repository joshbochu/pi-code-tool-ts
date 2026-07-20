import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const TRUSTED_EXECUTION_FLAG = "allow-trusted-code";

export const TRUSTED_EXECUTION_FLAG_DESCRIPTION =
  "Opt in to model-written TypeScript execution with the same practical authority as an unrestricted shell.";

export const TRUSTED_EXECUTION_WARNING =
  "Trusted code execution is enabled. Model-written TypeScript will have shell-equivalent authority: it can read and modify files, access environment variables and credentials, use the network, and spawn processes. A subprocess is not a security sandbox. M0.2 defines this trust contract but does not execute code yet.";

/** Register the V0 trust contract without exposing code execution yet. */
export default function piCodeToolTsExtension(pi: ExtensionAPI): undefined {
  pi.registerFlag(TRUSTED_EXECUTION_FLAG, {
    description: TRUSTED_EXECUTION_FLAG_DESCRIPTION,
    type: "boolean",
    default: false,
  });

  pi.on("session_start", (_event, ctx) => {
    if (pi.getFlag(TRUSTED_EXECUTION_FLAG) !== true) return;
    ctx.ui.notify(TRUSTED_EXECUTION_WARNING, "warning");
  });

  return undefined;
}
