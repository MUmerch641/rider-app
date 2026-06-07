import { useRouter } from "expo-router";
import { useMemo } from "react";

/**
 * Drop-in replacement for expo-router's `useRouter()` that ignores
 * `push` / `replace` / `back` calls within ~500ms of the previous one.
 *
 * The rider app's order list + map is full of cards / buttons that can
 * double-fire navigation when the rider taps quickly. expo-router does
 * dedupe identical paths, but still mounts two copies when params differ
 * by even a query string, which races the destination screen's first
 * render.
 *
 * The throttle is GLOBAL — the timestamp lives in module scope so a
 * tap on screen A and an immediate tap on screen B share the same
 * window. A rapid sequence of taps is almost always an impatient
 * driver, not a deliberate two-step.
 */

const NAV_THROTTLE_MS = 500;

let lastNavTs = 0;

const shouldAllow = () => {
  const now = Date.now();
  if (now - lastNavTs < NAV_THROTTLE_MS) return false;
  lastNavTs = now;
  return true;
};

export function useNavGuard() {
  const router = useRouter();
  return useMemo(
    () => ({
      ...router,
      push: ((...args: Parameters<typeof router.push>) => {
        if (!shouldAllow()) return;
        return router.push(...args);
      }) as typeof router.push,
      replace: ((...args: Parameters<typeof router.replace>) => {
        if (!shouldAllow()) return;
        return router.replace(...args);
      }) as typeof router.replace,
      back: () => {
        if (!shouldAllow()) return;
        return router.back();
      },
    }),
    [router],
  );
}
