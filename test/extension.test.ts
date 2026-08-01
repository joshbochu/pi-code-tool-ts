import { describe, expect, test } from "bun:test";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import extension, {
  TRUSTED_EXECUTION_FLAG,
  TRUSTED_EXECUTION_FLAG_DESCRIPTION,
  TRUSTED_EXECUTION_WARNING,
} from "../src/extension";

const extensionAtRuntime: (pi: ExtensionAPI) => unknown = extension;

type FlagOptions = Parameters<ExtensionAPI["registerFlag"]>[1];
type FlagValue = ReturnType<ExtensionAPI["getFlag"]>;
type NotificationLevel = "info" | "warning" | "error" | undefined;
type SessionStartHandler = (
  event: SessionStartEvent,
  context: ExtensionContext,
) => unknown;

interface RegisteredFlag {
  name: string;
  options: FlagOptions;
}

interface TrustNotification {
  message: string;
  type: NotificationLevel;
}

interface TrustHarness {
  apiAccesses: PropertyKey[];
  contextAccesses: PropertyKey[];
  notifications: TrustNotification[];
  pi: ExtensionAPI;
  readonly registeredFlag: RegisteredFlag | undefined;
  startSession(): void;
  uiAccesses: PropertyKey[];
}

function createTrustHarness(flagValue: FlagValue): TrustHarness {
  const apiAccesses: PropertyKey[] = [];
  const contextAccesses: PropertyKey[] = [];
  const notifications: TrustNotification[] = [];
  const uiAccesses: PropertyKey[] = [];
  let registeredFlag: RegisteredFlag | undefined;
  let sessionStartHandler: SessionStartHandler | undefined;

  const apiMethods = {
    getFlag(name: string): FlagValue {
      if (name !== TRUSTED_EXECUTION_FLAG) {
        throw new Error(`Unexpected flag read: ${name}`);
      }
      return flagValue;
    },
    on(event: string, handler: SessionStartHandler): void {
      if (event !== "session_start") {
        throw new Error(`Unexpected Pi event registration: ${event}`);
      }
      if (sessionStartHandler !== undefined) {
        throw new Error("session_start was registered more than once");
      }
      sessionStartHandler = handler;
    },
    registerFlag(name: string, options: FlagOptions): void {
      if (registeredFlag !== undefined) {
        throw new Error("A Pi flag was registered more than once");
      }
      registeredFlag = { name, options };
    },
  };

  const pi = new Proxy(apiMethods, {
    get(target, property, receiver): unknown {
      apiAccesses.push(property);
      if (!Reflect.has(target, property)) {
        throw new Error(`Unexpected Pi API access: ${String(property)}`);
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return value;
    },
  }) as unknown as ExtensionAPI;

  return {
    apiAccesses,
    contextAccesses,
    notifications,
    pi,
    get registeredFlag() {
      return registeredFlag;
    },
    startSession(): void {
      if (sessionStartHandler === undefined) {
        throw new Error("session_start was not registered");
      }

      const ui = new Proxy(
        {
          notify(message: string, type?: NotificationLevel): void {
            notifications.push({ message, type });
          },
        },
        {
          get(target, property, receiver): unknown {
            uiAccesses.push(property);
            if (!Reflect.has(target, property)) {
              throw new Error(`Unexpected Pi UI access: ${String(property)}`);
            }
            const value: unknown = Reflect.get(target, property, receiver);
            return value;
          },
        },
      );

      const context = new Proxy(
        { ui },
        {
          get(target, property, receiver): unknown {
            contextAccesses.push(property);
            if (!Reflect.has(target, property)) {
              throw new Error(
                `Unexpected session context access: ${String(property)}`,
              );
            }
            const value: unknown = Reflect.get(target, property, receiver);
            return value;
          },
        },
      );

      sessionStartHandler(
        {} as SessionStartEvent,
        context as unknown as ExtensionContext,
      );
    },
    uiAccesses,
  };
}

describe("extension factory", () => {
  test("default export is a synchronous function that returns undefined", () => {
    const harness = createTrustHarness(false);

    expect(typeof extension).toBe("function");
    const result = extensionAtRuntime(harness.pi);
    expect(result).toBeUndefined();
  });

  test("registers one disabled-by-default boolean trust flag", () => {
    const harness = createTrustHarness(false);

    extension(harness.pi);

    expect(harness.registeredFlag).toEqual({
      name: TRUSTED_EXECUTION_FLAG,
      options: {
        description: TRUSTED_EXECUTION_FLAG_DESCRIPTION,
        type: "boolean",
        default: false,
      },
    });
    expect(TRUSTED_EXECUTION_FLAG_DESCRIPTION).toContain(
      "same practical authority as an unrestricted shell",
    );
  });

  const disabledValues: { label: string; value: FlagValue }[] = [
    { label: "false", value: false },
    { label: "undefined", value: undefined },
    { label: 'the string "true"', value: "true" },
    { label: 'the string "false"', value: "false" },
  ];

  for (const { label, value } of disabledValues) {
    test(`keeps the session silent when the flag value is ${label}`, () => {
      const harness = createTrustHarness(value);

      extension(harness.pi);
      harness.startSession();

      expect(harness.notifications).toEqual([]);
      expect(harness.apiAccesses).toEqual(["registerFlag", "on", "getFlag"]);
      expect(harness.contextAccesses).toEqual([]);
      expect(harness.uiAccesses).toEqual([]);
    });
  }

  test("warns through the UI only after exact boolean opt-in", () => {
    const harness = createTrustHarness(true);

    extension(harness.pi);
    harness.startSession();

    expect(harness.notifications).toEqual([
      { message: TRUSTED_EXECUTION_WARNING, type: "warning" },
    ]);
    expect(harness.apiAccesses).toEqual(["registerFlag", "on", "getFlag"]);
    expect(harness.contextAccesses).toEqual(["ui"]);
    expect(harness.uiAccesses).toEqual(["notify"]);

    for (const requiredWarningText of [
      "shell-equivalent authority",
      "unrestricted shell",
      "read and modify files",
      "environment variables and credentials",
      "use the network",
      "spawn commands and child processes",
      "not a security sandbox",
      "executes no generated code",
      "registers no code tool",
    ]) {
      expect(TRUSTED_EXECUTION_WARNING).toContain(requiredWarningText);
    }
  });
});
