import { describe, expect, test } from "bun:test";
import extension from "../src/extension";

describe("extension factory", () => {
  test("default export is a function", () => {
    expect(typeof extension).toBe("function");
  });

  test("returns undefined without throwing", () => {
    const result = extension({} as never);
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
    expect(extension(hostile as never)).toBeUndefined();
  });
});
