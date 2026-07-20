import { describe, expect, test } from "bun:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import extension, {
  TRUSTED_EXECUTION_FLAG,
  TRUSTED_EXECUTION_FLAG_DESCRIPTION,
  TRUSTED_EXECUTION_WARNING,
} from "../src/extension";

interface RegisteredFlag {
  default?: boolean | string;
  description?: string;
  name: string;
  type: "boolean" | "string";
}

interface TrustHarness {
  accessedProperties: PropertyKey[];
  flag?: RegisteredFlag;
  notifyMessages: Array<{ level: string; message: string }>;
  pi: ExtensionAPI;
  startSession(): void;
}

type SessionStartHandler = (event: never, context: never) => unknown;

function createTrustHarness(enabled: boolean): TrustHarness {
  const accessedProperties: PropertyKey[] = [];
  const notifyMessages: Array<{ level: string; message: string }> = [];
  let flag: RegisteredFlag | undefined;
  let sessionStartHandler: SessionStartHandler | undefined;

  const apiMethods = {
    registerFlag(
      name: string,
      options: {
        default?: boolean | string;
        description?: string;
        type: "boolean" | "string";
      },
    ) {
      flag = { name, ...options };
    },
    getFlag(name: string) {
      expect(name).toBe(TRUSTED_EXECUTION_FLAG);
      return enabled;
    },
    on(event: string, handler: SessionStartHandler) {
      expect(event).toBe("session_start");
      sessionStartHandler = handler;
    },
  };

  const pi = new Proxy(apiMethods, {
    get(target, property, receiver) {
      accessedProperties.push(property);
      if (!Reflect.has(target, property)) {
        throw new Error(`Unexpected Pi API access: ${String(property)}`);
      }
      return Reflect.get(target, property, receiver);
    },
  }) as unknown as ExtensionAPI;

  return {
    accessedProperties,
    get flag() {
      return flag;
    },
    notifyMessages,
    pi,
    startSession() {
      if (!sessionStartHandler) throw new Error("session_start was not registered");
      sessionStartHandler({} as never, {
        ui: {
          notify(message: string, level: string) {
            notifyMessages.push({ level, message });
          },
        },
      } as never);
    },
  };
}

describe("extension factory", () => {
  test("default export is a function", () => {
    expect(typeof extension).toBe("function");
  });

  test("registers an explicit disabled-by-default trust flag", () => {
    const harness = createTrustHarness(false);

    expect(extension(harness.pi)).toBeUndefined();
    expect(harness.flag).toEqual({
      name: TRUSTED_EXECUTION_FLAG,
      type: "boolean",
      default: false,
      description: TRUSTED_EXECUTION_FLAG_DESCRIPTION,
    });
    expect(TRUSTED_EXECUTION_FLAG_DESCRIPTION).toContain(
      "authority as an unrestricted shell",
    );
  });

  test("keeps the disabled path silent and exposes no code tool", () => {
    const harness = createTrustHarness(false);

    extension(harness.pi);
    harness.startSession();

    expect(harness.notifyMessages).toEqual([]);
    expect(harness.accessedProperties).toEqual([
      "registerFlag",
      "on",
      "getFlag",
    ]);
  });

  test("warns about shell-equivalent authority after explicit opt-in", () => {
    const harness = createTrustHarness(true);

    extension(harness.pi);
    harness.startSession();

    expect(harness.notifyMessages).toEqual([
      { level: "warning", message: TRUSTED_EXECUTION_WARNING },
    ]);
    expect(TRUSTED_EXECUTION_WARNING).toContain("shell-equivalent authority");
    expect(TRUSTED_EXECUTION_WARNING).toContain(
      "A subprocess is not a security sandbox",
    );
  });
});
