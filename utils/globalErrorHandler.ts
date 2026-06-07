/**
 * Catches errors that the React ErrorBoundary can't see:
 *
 *  - setTimeout / setInterval callbacks
 *  - Native module rejections that bubble past every .catch()
 *  - Unhandled promise rejections (async code without .catch / await without
 *    try/catch)
 *  - Native crashes routed through React Native's ErrorUtils
 *
 * Without this, those errors blank-screen the app via React Native's red
 * box → silent unmount path in release builds. The boundary at app/_layout.tsx
 * only catches errors thrown DURING render; everything else needs this.
 *
 * Call once from the root layout's mount effect.
 */

import { LogBox } from "react-native";

type RNErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

let installed = false;

export function installGlobalErrorHandler(): void {
  if (installed) return;
  installed = true;

  const errorUtils: RNErrorUtils | undefined =
    (globalThis as unknown as { ErrorUtils?: RNErrorUtils }).ErrorUtils;
  const prev = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    try {
      // eslint-disable-next-line no-console
      console.error("[globalError]", isFatal ? "FATAL" : "non-fatal", error);
    } catch {
      // ignore
    }
    if (prev) {
      try {
        prev(error, isFatal);
      } catch {
        // swallow secondary failure
      }
    }
  });

  const onRejection = (event: { reason?: unknown; promise?: unknown } | unknown) => {
    const reason = (event as { reason?: unknown })?.reason ?? event;
    try {
      // eslint-disable-next-line no-console
      console.error("[globalError] unhandledRejection", reason);
    } catch {
      // ignore
    }
  };
  try {
    (globalThis as unknown as { addEventListener?: (...a: unknown[]) => void })
      .addEventListener?.("unhandledrejection", onRejection);
  } catch {
    // ignore
  }
  try {
    const proc = (globalThis as unknown as {
      process?: { on?: (event: string, cb: (...a: unknown[]) => void) => void };
    }).process;
    proc?.on?.("unhandledRejection", onRejection);
  } catch {
    // ignore
  }

  LogBox.ignoreLogs([
    "[Reanimated]",
    "Failed to load image",
  ]);
}
