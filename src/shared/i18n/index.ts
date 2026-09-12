import { en, type MessageKey } from './en';
import { zhCN } from './zh-Hans';

export type { MessageKey };

/** Locales the app ships. Adding one means adding a catalogue and this union. */
export const LOCALES = ['en', 'zh-Hans'] as const;
export type Locale = (typeof LOCALES)[number];

/** What the user picked: a locale, or "whatever the OS is set to". */
export type LocalePreference = Locale | 'system';

/**
 * Values for `{placeholders}`. Undefined is part of the value type because a
 * catalogue may reference a placeholder the caller did not supply; `translate`
 * leaves those braces untouched rather than printing "undefined".
 */
export type TranslateParams = Record<string, string | number | undefined>;

const CATALOGUES: Record<Locale, Record<MessageKey, string>> = {
  en,
  'zh-Hans': zhCN
};

/**
 * Map a stored preference plus the OS locale onto a locale we actually ship.
 *
 * Locale ids are BCP 47 tags, and the Chinese one names a *script*: `zh-Hans`
 * says Simplified outright, rather than letting a region imply it. That is the
 * subtag W3C's guidance for declaring content language keys font selection and
 * line breaking off, so it is also what `<html lang>` gets.
 * https://www.w3.org/International/questions/qa-html-language-declarations
 *
 * Anything Chinese (zh, zh-Hans-CN, zh-TW, …) lands on Simplified Chinese
 * rather than on English: a Traditional reader is better served by Simplified
 * than by nothing, and a second Chinese catalogue is its own decision.
 */
export function resolveLocale(
  preference: LocalePreference | undefined,
  systemLocale: string | undefined
): Locale {
  if (preference && preference !== 'system') return preference;
  return (systemLocale ?? '').toLowerCase().startsWith('zh') ? 'zh-Hans' : 'en';
}

/** Narrowing guard for values arriving from settings files and `<select>`s. */
export function isLocalePreference(value: string): value is LocalePreference {
  return value === 'system' || (LOCALES as readonly string[]).includes(value);
}

/**
 * Look a message up and fill in `{placeholders}`.
 *
 * No fallback chain on purpose: `CATALOGUES` is `Record<Locale, Record<MessageKey,
 * string>>`, so a key missing from a locale is a type error, not something the
 * runtime has to paper over.
 */
export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const template = CATALOGUES[locale][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
