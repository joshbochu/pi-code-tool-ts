import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import extension from "../src/extension";

const extensionAtRuntime: (pi: ExtensionAPI) => unknown = extension;

describe("extension factory", () => {
  test("default export is a function", () => {
    expect(typeof extension).toBe("function");
  });

  test("returns undefined without throwing", () => {
    const result = extensionAtRuntime({} as ExtensionAPI);
    expect(result).toBeUndefined();
  });

  test("does not touch the Pi API (hostile Proxy)", () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error("API property access is forbidden in M0.1");
        },
      },
    );
    const result = extensionAtRuntime(hostile as ExtensionAPI);
    expect(result).toBeUndefined();
  });
});
