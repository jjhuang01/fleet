import type { CSSProperties } from 'react';

type FleetThemeCssProperties = CSSProperties & Record<`--fleet-${string}`, string>;
import {
  ACCENT_COLORS,
  DEFAULT_ACCENT_COLOR_ID,
  DEFAULT_APP_THEME,
  DEFAULT_TERMINAL_THEME_ID,
  TERMINAL_THEMES,
  isAccentColorId,
  isAppThemeSelection,
  isTerminalThemeId,
  type AccentColorDefinition,
  type AccentColorId,
  type AppThemeSelection,
  type AppThemeTokens,
  type TerminalThemeDefinition,
  type TerminalThemeId,
  type TerminalThemeColors
} from '../../../shared/theme-presets';

export function resolveTerminalTheme(id?: string): TerminalThemeDefinition {
  if (id && isTerminalThemeId(id)) {
    return TERMINAL_THEMES[id];
  }
  return TERMINAL_THEMES[DEFAULT_TERMINAL_THEME_ID];
}

export function resolveXtermTheme(
  id?: TerminalThemeId,
  transparentBackground = false
): TerminalThemeColors {
  const theme = { ...resolveTerminalTheme(id).xterm };
  // Dim the selection toward the pane background so an unfocused pane's
  // selection reads as "not live" (xterm swaps to this automatically when the
  // terminal's DOM element blurs). Computed here rather than authored per
  // theme so all 14 presets stay consistent.
  if (theme.selectionBackground && theme.background) {
    theme.selectionInactiveBackground = mixHex(theme.selectionBackground, theme.background, 0.6);
  }
  // xterm 6 draws its own scrollbar (5.5 used the native one, which picked up
  // the global rules in index.css). Its default slider is the theme foreground
  // at 20%, which would make the terminal the one scroll port in the app that
  // is not teal. Same values as the `*::-webkit-scrollbar-thumb` rules, set
  // here for the same reason as selectionInactiveBackground above: derived once
  // so all 14 presets stay consistent.
  theme.scrollbarSliderBackground = '#2dd4bf33';
  theme.scrollbarSliderHoverBackground = '#2dd4bf66';
  theme.scrollbarSliderActiveBackground = '#2dd4bf99';
  // When a terminal background image is active, render xterm's default cell
  // background transparently so the image layer behind it shows through.
  if (transparentBackground) {
    theme.background = 'rgba(0, 0, 0, 0)';
  }
  return theme;
}

export function resolveAccentColor(id?: string): AccentColorDefinition {
  if (id && isAccentColorId(id)) {
    return ACCENT_COLORS[id];
  }
  return ACCENT_COLORS[DEFAULT_ACCENT_COLOR_ID];
}

/**
 * The ramp for filled accent surfaces (buttons, toggles, progress). Those
 * surfaces carry a white label in both modes, so they use a stop dark enough to
 * hold 4.5:1 with white: the bright `ACCENT_COLORS` ramp is 3.68:1 at rest and
 * 2.54:1 on hover, which is fine for an accent-coloured ring or icon on a dark
 * surface but not for a label. Neither ramp moves; each token names where it is
 * allowed to be used.
 */
const ACCENT_FILL_COLORS: Record<AccentColorId, { value: string; hover: string }> = {
  blue: { value: '#2563eb', hover: '#1d4ed8' },
  teal: { value: '#0f766e', hover: '#115e59' },
  purple: { value: '#7e22ce', hover: '#6b21a8' },
  rose: { value: '#be123c', hover: '#9f1239' },
  amber: { value: '#b45309', hover: '#92400e' },
  emerald: { value: '#047857', hover: '#065f46' }
};

export function getAccentCssVars(
  id?: AccentColorId,
  kind: TerminalThemeDefinition['kind'] = 'dark'
): FleetThemeCssProperties {
  const accent = resolveAccentColor(id);
  const fill = ACCENT_FILL_COLORS[accent.id];
  return {
    // Accent-coloured text, icons, borders and rings read against the app
    // surface, so they keep the bright ramp on dark chrome.
    '--fleet-accent': kind === 'light' ? fill.value : accent.value,
    '--fleet-accent-hover': kind === 'light' ? fill.hover : accent.hover,
    // Filled surfaces are read by a white label instead.
    '--fleet-accent-fill': fill.value,
    '--fleet-accent-fill-hover': fill.hover
  };
}

/**
 * The surface tokens a pane's chrome paints with once there is a background
 * image behind it: the same colors, mixed toward transparent so the picture
 * reads through them. Returns nothing when no image is showing, which leaves
 * the `index.css` defaults - the opaque tokens - in place.
 *
 * Surfaces opt in by name (`bg-fleet-glass-surface`), so the things that must
 * stay solid to stay usable - text inputs, the settings cards - simply keep
 * asking for the opaque token and are unaffected.
 */
export function getGlassCssVars(active: boolean): FleetThemeCssProperties | undefined {
  if (!active) return undefined;
  // Held above the pane's own background opacity: chrome is what the user
  // reads and types into, so it stays the most solid thing over the picture.
  const glass = (token: string, percent: number): string =>
    `color-mix(in srgb, var(${token}) ${percent}%, transparent)`;
  return {
    '--fleet-glass-bg': glass('--fleet-bg', 55),
    // The sidebar is a wall of small text, so it holds far more of its own
    // colour than a pane does. It reads as the same material as the rest of the
    // chrome, only thicker - enough that the picture behind it never competes
    // with a session name.
    '--fleet-glass-chrome': glass('--fleet-bg', 88),
    // The scrim an assistant turn sits on once the pane is glass. Prose and
    // muted tool rows have no ground of their own over a picture, and the
    // transcript is the one surface in the app that is read a paragraph at a
    // time. Off entirely without an image, so a plain theme keeps the flat
    // transcript it has today.
    '--fleet-turn-scrim': glass('--fleet-surface', 55),
    '--fleet-turn-pad': '0.5rem 0.75rem',
    '--fleet-glass-surface': glass('--fleet-surface', 70),
    '--fleet-glass-surface-2': glass('--fleet-surface-2', 65),
    '--fleet-glass-surface-3': glass('--fleet-surface-3', 70)
  };
}

/**
 * How much of its own colour a pane keeps once it is sitting on the app
 * background canvas. Terminals go to glass - monospace on a tinted picture is
 * the look the wallpaper exists for - and `paneTint` in the background settings
 * is the knob that tunes it; `PANE_GLASS` is only the fallback for callers with
 * no settings to hand. Prose panes stay near-solid at `PANE_SOLID`, and are not
 * user-tunable: a transcript is read a paragraph at a time, and a picture moving
 * underneath it costs more than it gives.
 */
export const PANE_GLASS = 22;
export const PANE_SOLID = 88;

/**
 * The `backdrop-filter` a glass pane carries over the canvas: frost, and a
 * saturation lift for the colour that dimming the image took out.
 *
 * Returns undefined unless something is actually dialled in, because a
 * backdrop-filter of any value promotes the pane to its own compositing layer
 * and makes it a containing block for fixed descendants. A user who has not
 * asked for glass should not pay for the layer or inherit the layout change.
 */
export function paneBackdrop(
  overCanvas: boolean,
  frost: number,
  saturation: number
): string | undefined {
  if (!overCanvas) return undefined;
  const parts: string[] = [];
  if (frost > 0) parts.push(`blur(${frost}px)`);
  if (saturation !== 1) parts.push(`saturate(${saturation})`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * A pane's own ground colour over the canvas. With no image showing this is the
 * identity, so panes stay fully opaque and nothing about the plain themes moves.
 */
export function paneGround(color: string, overCanvas: boolean, percent = PANE_SOLID): string {
  if (!overCanvas) return color;
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

// ── App theme (UI chrome) ──────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  // padEnd guards against a malformed/short hex producing NaN channels.
  const h = hex.replace('#', '').padEnd(6, '0');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Linearly blend two hex colors. `t=0` returns `a`, `t=1` returns `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const ch = (x: number, y: number): string =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/** WCAG relative luminance of a hex color. */
function relativeLuminance(color: string): number {
  const channel = (value: number): number => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parseHex(color);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colors, 1 to 21. */
function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** Walk a color toward black until it clears `minRatio` against `bg`. */
function darkenTo(color: string, bg: string, minRatio: number): string {
  let out = color;
  for (let i = 0; i < 40 && contrastRatio(out, bg) < minRatio; i += 1) {
    out = mixHex(out, '#000000', 0.08);
  }
  return out;
}

/**
 * Build the app-chrome token set from a theme's base colors, then layer in any
 * per-theme `appOverrides`. Surfaces/borders contrast against the background by
 * mixing toward the foreground; on dark themes text mutes by mixing toward the
 * background, and on light themes it is derived against contrast targets.
 */
export function deriveAppTheme(def: TerminalThemeDefinition): AppThemeTokens {
  const dark = def.kind === 'dark';
  const fg = def.xterm.foreground ?? (dark ? '#e4e4e4' : '#1f2937');
  // App shell sits a touch darker than the terminal pane so panes stay distinct.
  const bg = dark
    ? mixHex(def.background, '#000000', 0.25)
    : mixHex(def.background, '#000000', 0.02);
  // Translucent hairline borders (Raycast/Linear-style): a white or black
  // overlay at low alpha reads correctly against any surface underneath,
  // so this is universal across all 14 themes rather than per-theme mixed hex.
  const borderOverlay = dark ? '1 0 0' : '0 0 0';
  // Light presets borrow their chrome text from a terminal palette whose
  // foreground was tuned for a full-screen terminal: Solarized Light's #657b83
  // is 3.95:1 on its own background, and mixing it 55% toward the background -
  // fine on dark themes - leaves 1.7:1. Derive the ramp by contrast target
  // instead, so a light preset stays legible in the chrome at 11px. Terminal
  // panes keep the preset's exact colours.
  const text = dark ? fg : darkenTo(fg, bg, 8);
  const ramp = (mix: number, floor: number): string =>
    dark ? mixHex(fg, bg, mix) : darkenTo(mixHex(text, bg, mix), bg, floor);
  const textSecondary = ramp(dark ? 0.18 : 0.16, 6.3);
  const textMuted = ramp(dark ? 0.4 : 0.3, 5.75);
  const textSubtle = ramp(dark ? 0.55 : 0.44, 5.3);

  const derived: AppThemeTokens = {
    bg,
    surface: mixHex(bg, fg, 0.05),
    surface2: mixHex(bg, fg, 0.1),
    surface3: mixHex(bg, fg, 0.16),
    border: `oklch(${borderOverlay} / 0.08)`,
    borderStrong: `oklch(${borderOverlay} / 0.16)`,
    text,
    textSecondary,
    textMuted,
    textSubtle
  };
  return { ...derived, ...def.appOverrides };
}

/** Map a legacy or arbitrary stored value to a valid selection. */
export function normalizeAppTheme(value?: string): AppThemeSelection {
  if (!value) return DEFAULT_APP_THEME;
  if (value === 'dark') return 'fleet-dark';
  if (value === 'light') return 'fleet-light';
  if (isAppThemeSelection(value)) return value;
  return DEFAULT_APP_THEME;
}

/** Resolve a selection (incl. system / match-terminal) to a concrete theme. */
export function resolveAppThemeDefinition(
  selection: string | undefined,
  terminalTheme: string | undefined,
  prefersDark: boolean
): TerminalThemeDefinition {
  const sel = normalizeAppTheme(selection);
  if (sel === 'system') {
    return resolveTerminalTheme(prefersDark ? 'fleet-dark' : 'fleet-light');
  }
  if (sel === 'match-terminal') {
    return resolveTerminalTheme(terminalTheme);
  }
  return resolveTerminalTheme(sel);
}

export function getAppThemeCssVars(def: TerminalThemeDefinition): FleetThemeCssProperties {
  const t = deriveAppTheme(def);
  return {
    '--fleet-bg': t.bg,
    '--fleet-surface': t.surface,
    '--fleet-surface-2': t.surface2,
    '--fleet-surface-3': t.surface3,
    '--fleet-border': t.border,
    '--fleet-border-strong': t.borderStrong,
    '--fleet-text': t.text,
    '--fleet-text-secondary': t.textSecondary,
    '--fleet-text-muted': t.textMuted,
    '--fleet-text-subtle': t.textSubtle,
    // Glass tokens inherit from the root, where their var() references resolve
    // against the dark initial-paint values before the App-root theme vars are
    // applied. Publish the opaque aliases at the same cascade level so a light
    // theme never leaves the sidebar or agent chrome on the dark defaults.
    '--fleet-glass-bg': `color-mix(in srgb, ${t.bg} 40%, transparent)`,
    '--fleet-glass-chrome': t.bg,
    '--fleet-glass-surface': t.surface,
    '--fleet-glass-surface-2': t.surface2,
    '--fleet-glass-surface-3': t.surface3
  };
}
