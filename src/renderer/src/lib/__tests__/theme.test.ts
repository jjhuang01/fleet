import { describe, expect, it } from 'vitest';
import {
  deriveAppTheme,
  getAccentCssVars,
  mixHex,
  getAppThemeCssVars,
  resolveAccentColor,
  resolveTerminalTheme,
  resolveXtermTheme
} from '../theme';
import {
  ACCENT_COLORS,
  TERMINAL_THEMES,
  type AccentColorId,
  type TerminalThemeId
} from '../../../../shared/theme-presets';
import { contrastRatio } from '../contrast';

describe('theme resolvers', () => {
  it('falls back to the default terminal theme for unknown ids', () => {
    expect(resolveTerminalTheme('unknown' as never).id).toBe('fleet-dark');
    expect(resolveTerminalTheme(undefined).id).toBe('fleet-dark');
  });

  it('returns a fresh xterm theme object with a derived inactive-selection color', () => {
    const resolved = resolveXtermTheme('fleet-dark');
    expect(resolved).toEqual({
      ...TERMINAL_THEMES['fleet-dark'].xterm,
      selectionInactiveBackground: resolved.selectionInactiveBackground,
      scrollbarSliderBackground: resolved.scrollbarSliderBackground,
      scrollbarSliderHoverBackground: resolved.scrollbarSliderHoverBackground,
      scrollbarSliderActiveBackground: resolved.scrollbarSliderActiveBackground
    });
    expect(resolved.selectionInactiveBackground).toMatch(/^#[0-9a-f]{6}$/i);
    expect(resolved).not.toBe(TERMINAL_THEMES['fleet-dark'].xterm);
  });

  it('gives every preset the same teal scrollbar slider as the rest of the app', () => {
    // xterm 6 draws its own scrollbar; without this it would default to the
    // theme foreground at 20% and be the only non-teal scroll port in Fleet.
    for (const id of Object.keys(TERMINAL_THEMES) as TerminalThemeId[]) {
      const resolved = resolveXtermTheme(id);
      expect(resolved.scrollbarSliderBackground).toBe('#2dd4bf33');
      expect(resolved.scrollbarSliderHoverBackground).toBe('#2dd4bf66');
      expect(resolved.scrollbarSliderActiveBackground).toBe('#2dd4bf99');
    }
  });

  it('dims selectionInactiveBackground toward the pane background, not toward the selection color', () => {
    const resolved = resolveXtermTheme('fleet-dark');
    const { background, selectionBackground, selectionInactiveBackground } = resolved;
    expect(selectionInactiveBackground).not.toBe(selectionBackground);
    expect(selectionInactiveBackground).not.toBe(background);
  });

  it('computes selectionInactiveBackground from the opaque background, not the transparent override', () => {
    const resolved = resolveXtermTheme('fleet-dark', true);
    expect(resolved.background).toBe('rgba(0, 0, 0, 0)');
    expect(resolved.selectionInactiveBackground).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('falls back to the default accent color for unknown ids', () => {
    expect(resolveAccentColor('unknown' as never).id).toBe('blue');
    expect(resolveAccentColor(undefined).id).toBe('blue');
  });
});

describe('deriveAppTheme borders', () => {
  it('derives a translucent white hairline border for dark themes with no override', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['dracula']);
    expect(t.border).toBe('oklch(1 0 0 / 0.08)');
    expect(t.borderStrong).toBe('oklch(1 0 0 / 0.16)');
  });

  it('derives a translucent black hairline border for light themes with no override', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['catppuccin-latte']);
    expect(t.border).toBe('oklch(0 0 0 / 0.08)');
    expect(t.borderStrong).toBe('oklch(0 0 0 / 0.16)');
  });

  it('applies the universal border formula to fleet-dark and fleet-light too (no per-theme override)', () => {
    const dark = deriveAppTheme(TERMINAL_THEMES['fleet-dark']);
    const light = deriveAppTheme(TERMINAL_THEMES['fleet-light']);
    expect(dark.border).toBe('oklch(1 0 0 / 0.08)');
    expect(dark.borderStrong).toBe('oklch(1 0 0 / 0.16)');
    expect(light.border).toBe('oklch(0 0 0 / 0.08)');
    expect(light.borderStrong).toBe('oklch(0 0 0 / 0.16)');
  });
});

describe('fleet-dark / fleet-light cool-gray retint', () => {
  it('retints fleet-dark neutrals to OKLCH hue 260 chroma 0.006 at the same lightness', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['fleet-dark']);
    expect(t.bg).toBe('#090a0d');
    expect(t.surface).toBe('#15171a');
    expect(t.surface2).toBe('#242629');
    expect(t.surface3).toBe('#3e4043');
    expect(t.text).toBe('#f8fafe');
    expect(t.textSecondary).toBe('#d2d4d8');
    expect(t.textMuted).toBe('#a1a3a7');
    expect(t.textSubtle).toBe('#7f8185');
  });

  it('retints fleet-light neutrals to OKLCH hue 260 chroma 0.006 at the same lightness', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['fleet-light']);
    expect(t.bg).toBe('#f5f7fb');
    expect(t.surface).toBe('#fdffff');
    expect(t.surface2).toBe('#eff2f6');
    expect(t.surface3).toBe('#e5e8eb');
    expect(t.text).toBe('#16181b');
    expect(t.textSecondary).toBe('#3e4043');
    expect(t.textMuted).toBe('#555a60');
    expect(t.textSubtle).toBe('#62676e');
  });

  it('does not regress WCAG contrast for fleet-dark after retinting', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['fleet-dark']);
    expect(contrastRatio(t.text, t.bg)).toBeCloseTo(18.94, 1);
    expect(contrastRatio(t.text, t.surface)).toBeCloseTo(17.19, 1);
    expect(contrastRatio(t.textSecondary, t.bg)).toBeCloseTo(13.34, 1);
    expect(contrastRatio(t.textMuted, t.bg)).toBeCloseTo(7.84, 1);
    // Tertiary text clears AA on both the chrome background and a surface;
    // #717377 fell to 4.17 / 3.78 and read as too dim in the sidebar.
    expect(contrastRatio(t.textSubtle, t.bg)).toBeCloseTo(5.07, 1);
    expect(contrastRatio(t.textSubtle, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('does not regress WCAG contrast for fleet-light after retinting', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['fleet-light']);
    expect(contrastRatio(t.text, t.bg)).toBeCloseTo(16.58, 1);
    expect(contrastRatio(t.text, t.surface)).toBeCloseTo(17.72, 1);
    expect(contrastRatio(t.textSecondary, t.bg)).toBeCloseTo(9.7, 1);
    expect(contrastRatio(t.textMuted, t.bg)).toBeCloseTo(6.49, 1);
    expect(contrastRatio(t.textSubtle, t.bg)).toBeCloseTo(5.31, 1);
  });
});

describe('light preset chrome text', () => {
  it('derives every light preset text token above WCAG AA on its own surfaces', () => {
    for (const def of Object.values(TERMINAL_THEMES)) {
      if (def.kind !== 'light') continue;
      const t = deriveAppTheme(def);
      for (const token of [t.text, t.textSecondary, t.textMuted, t.textSubtle]) {
        for (const surface of [t.bg, t.surface, t.surface2]) {
          expect(contrastRatio(token, surface)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('leaves dark themes on the previous muted ramp', () => {
    const t = deriveAppTheme(TERMINAL_THEMES['dracula']);
    expect(t.textSubtle).toBe(mixHex(t.text, t.bg, 0.55));
    expect(t.textMuted).toBe(mixHex(t.text, t.bg, 0.4));
  });
});

describe('runtime theme variables', () => {
  it('publishes light glass aliases at the App root instead of inheriting the dark root defaults', () => {
    const vars = getAppThemeCssVars(TERMINAL_THEMES['fleet-light']);
    expect(vars['--fleet-glass-chrome']).toBe('#f5f7fb');
    expect(vars['--fleet-glass-surface']).toBe('#fdffff');
    expect(vars['--fleet-glass-surface-2']).toBe('#eff2f6');
    expect(vars['--fleet-glass-surface-3']).toBe('#e5e8eb');
    expect(vars['--fleet-glass-bg']).toContain('#f5f7fb 40%');
  });

  it('keeps white labels readable on filled accent surfaces in both modes', () => {
    for (const kind of ['light', 'dark'] as const) {
      for (const id of Object.keys(ACCENT_COLORS) as AccentColorId[]) {
        const vars = getAccentCssVars(id, kind);
        expect(contrastRatio('#ffffff', vars['--fleet-accent-fill'])).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#ffffff', vars['--fleet-accent-fill-hover'])).toBeGreaterThanOrEqual(
          4.5
        );
      }
    }
    // The bright ramp still carries accent text, icons and rings on dark chrome.
    expect(getAccentCssVars('blue', 'dark')).toMatchObject({
      '--fleet-accent': '#3b82f6',
      '--fleet-accent-fill': '#2563eb'
    });
  });

  it('uses darker accent stops on light chrome so text and filled-button labels remain readable', () => {
    expect(getAccentCssVars('blue', 'light')).toMatchObject({
      '--fleet-accent': '#2563eb',
      '--fleet-accent-hover': '#1d4ed8'
    });
    expect(getAccentCssVars('amber', 'light')).toMatchObject({
      '--fleet-accent': '#b45309',
      '--fleet-accent-hover': '#92400e'
    });
    expect(getAccentCssVars('blue', 'dark')).toMatchObject({
      '--fleet-accent': '#3b82f6',
      '--fleet-accent-hover': '#60a5fa'
    });

    const light = deriveAppTheme(TERMINAL_THEMES['fleet-light']);
    for (const id of Object.keys(ACCENT_COLORS) as AccentColorId[]) {
      const vars = getAccentCssVars(id, 'light');
      const accent = vars['--fleet-accent'];
      expect(contrastRatio(accent, light.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio('#ffffff', accent)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
