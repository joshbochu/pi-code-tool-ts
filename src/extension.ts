import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * M0.1 inert Pi extension factory.
 * Proves the package can load. Registers nothing and starts nothing.
 */
export default function piCodeToolTsExtension(_pi: ExtensionAPI): undefined {
  return undefined;
}
