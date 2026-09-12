/**
 * Shared button class strings. Centralizes the tactile press feedback
 * (`active:scale-*`) and transition timing so interactive controls feel
 * consistent app-wide. Reduced-motion users get the scale neutralized in
 * index.css. Compose with extra classes via a template literal at the call site.
 */

/** Primary action (blue). Use for the main confirm/submit button in a surface. */
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-md fleet-accent-bg px-3 py-1.5 text-sm font-medium text-white transition active:scale-[0.97] fleet-accent-bg-hover disabled:opacity-50 disabled:active:scale-100';

/** Neutral pill (Save / secondary actions). */
export const neutralBtn =
  'inline-flex items-center justify-center gap-2 rounded-md bg-fleet-surface-3 px-3 py-1.5 text-sm text-fleet-text transition active:scale-[0.97] hover:bg-fleet-surface-2 disabled:text-fleet-text-subtle disabled:active:scale-100';
