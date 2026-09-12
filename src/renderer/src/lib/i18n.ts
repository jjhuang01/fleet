import { useCallback } from 'react';
import { useSettingsStore } from '../store/settings-store';
import {
  resolveLocale,
  translate,
  type Locale,
  type MessageKey,
  type TranslateParams
} from '../../../shared/i18n';

/** Looks a key up in the active locale and fills in `{placeholders}`. */
export type Translator = (key: MessageKey, params?: TranslateParams) => string;

/**
 * Which locale the UI reads in. `settings.general.language` is the user's
 * choice and defaults to `'system'`, in which case the OS decides - Chromium
 * gives us the OS locale in `navigator.language`, so the renderer needs no IPC
 * round trip to answer this.
 */
export function useLocale(): Locale {
  const preference = useSettingsStore((s) => s.settings?.general.language);
  return resolveLocale(preference, navigator.language);
}

/**
 * The renderer's translation entry point.
 *
 * `t` is rebuilt only when the locale changes, so it is safe to use as a
 * dependency of a `useMemo` that formats text.
 */
export function useTranslation(): { t: Translator; locale: Locale } {
  const locale = useLocale();
  const t = useCallback<Translator>((key, params) => translate(locale, key, params), [locale]);
  return { t, locale };
}
