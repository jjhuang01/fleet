/**
 * WCAG contrast math + legibility hints for terminal background images.
 *
 * Pure functions — no React, no DOM, no imports.
 */

/**
 * Parse a hex color ('#rrggbb' or '#rgb', with or without '#') to [r,g,b] 0-255.
 * Returns null on invalid input.
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const s = hex.startsWith('#') ? hex.slice(1) : hex;
  if (s.length === 3) {
    const r = parseInt(s[0] + s[0], 16);
    const g = parseInt(s[1] + s[1], 16);
    const b = parseInt(s[2] + s[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (s.length === 6) {
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

/**
 * WCAG relative luminance (0..1) for a hex color. Returns 0 if unparseable.
 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const lin = c / 255;
    return lin <= 0.03928 ? lin / 12.92 : ((lin + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio (1..21) between two hex colors. Returns 1 if either is unparseable.
 */
export function contrastRatio(a: string, b: string): number {
  if (!hexToRgb(a) || !hexToRgb(b)) return 1;
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * A legibility problem worth telling the user about, worst case first.
 *
 * Named rather than a sentence so the caller can render it in the active
 * language; this module stays a pure function with no catalogue dependency.
 */
export type LegibilityIssue = 'highOpacity' | 'moderateOpacity' | 'lowThemeContrast';

/**
 * Heuristic legibility issues for an IMAGE background behind terminal text.
 *
 * Returns the problems worth a warning, or an empty array when the image is
 * unlikely to hurt readability.
 *
 * Logic:
 * - Warn when opacity > 0.5 AND blur < 4 (unknown image pixels increasingly replace
 *   the safe theme bg, worst-case contrast can collapse toward ~1).
 * - Report the stronger issue when opacity > 0.75.
 * - Report separately when the theme's own base contrast < 4.5, because that is
 *   true with or without an image.
 */
export function backgroundLegibilityIssues(opts: {
  opacity: number;
  blur: number;
  themeForeground: string;
  themeBackground: string;
}): LegibilityIssue[] {
  const { opacity, blur, themeForeground, themeBackground } = opts;
  const issues: LegibilityIssue[] = [];

  if (blur < 4) {
    if (opacity > 0.75) issues.push('highOpacity');
    else if (opacity > 0.5) issues.push('moderateOpacity');
  }

  if (contrastRatio(themeForeground, themeBackground) < 4.5) {
    issues.push('lowThemeContrast');
  }

  return issues;
}
