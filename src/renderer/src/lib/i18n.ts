import { useCallback, useEffect } from 'react';
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
 * Keep `<html lang>` in step with the locale the UI is actually rendered in.
 *
 * Not decoration. The attribute is what tells the engine which Han face to
 * prefer, how to break lines in a language written without spaces, and which
 * phonetics a screen reader should read Chinese with - an interface that
 * renders Chinese inside `<html lang="en">` is announced in English.
 *
 * Called once, from the app root; the static value in `index.html` is only the
 * default for the first paint, before settings have loaded.
 */
export function useDocumentLanguage(): Locale {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return locale;
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
