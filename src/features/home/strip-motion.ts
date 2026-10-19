// Motion language shared by the home "arrival" strips (Lo nuevo, ambientes):
// pieces added one at a time, a hold on the full composition, then a red wipe
// that resets it. Same timings everywhere so the strips feel like one system.

export const ADD_EVERY_MS = 350;
export const GROW_MS = 300;
export const HOLD_MS = 900;
export const WIPE_MS = 280;

export const WIPE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function subscribeToPageVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function getPageVisible() {
  return document.visibilityState === "visible";
}
