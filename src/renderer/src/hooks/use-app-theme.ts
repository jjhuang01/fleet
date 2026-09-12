import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { getAppThemeCssVars, resolveAppThemeDefinition } from '../lib/theme';
import { useSettingsStore } from '../store/settings-store';

export type AppThemeResolution = {
  vars: CSSProperties;
  kind: 'dark' | 'light';
};

/** Tracks the OS color-scheme preference, updating live when it changes. */
function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent): void => setPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return prefersDark;
}

/**
 * Resolve the active app-theme selection to the CSS custom properties that
 * drive the app chrome. Reacts to OS theme changes when 'system' is selected.
 */
export function useAppThemeVars(appTheme?: string, terminalTheme?: string): AppThemeResolution {
  const prefersDark = useSystemPrefersDark();
  const def = resolveAppThemeDefinition(appTheme, terminalTheme, prefersDark);
  const vars = useMemo(() => getAppThemeCssVars(def), [def]);
  // Reflect the resolved theme's darkness onto the root `.dark` class so the
  // Tailwind `dark:` variant tracks the app theme rather than the OS. Used by
  // Streamdown's Shiki dual themes, and by the few places that state a literal
  // color - the amber the agent pane warns in - which the --fleet-* tokens
  // cannot carry because they only describe the neutral chrome.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', def.kind === 'dark');
  }, [def.kind]);
  return { vars, kind: def.kind };
}

/**
 * The resolved light/dark kind of the active app theme, for renderers that must
 * choose a palette React cannot style with a class - the diff viewer's Shiki
 * theme, for instance. Reading the root `.dark` class from a component would
 * lag one render behind the class toggle in {@link useAppThemeVars}.
 */
export function useAppThemeKind(): 'dark' | 'light' {
  const general = useSettingsStore((s) => s.settings?.general);
  const prefersDark = useSystemPrefersDark();
  return resolveAppThemeDefinition(general?.theme, general?.terminalTheme, prefersDark).kind;
}
