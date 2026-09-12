import type { Translator } from './i18n';

/**
 * How long ago something happened, at the coarseness a list row can afford.
 *
 * Six components had grown their own copy of this ladder, each with slightly
 * different boundaries - three copies past the point where the shape was
 * obviously shared. The boundaries live here once; the words come from the
 * catalogue, because the compact English form is an abbreviation ("5m") that
 * Chinese cannot borrow: it needs a different sentence, not a different number.
 *
 * Returns `null` once the answer is older than `maxDays`, so the caller can put
 * a date there instead - "3d ago" stops helping long before "Aug 12" does.
 */
export function formatElapsed(
  epochMs: number,
  t: Translator,
  options: { now?: number; maxDays?: number } = {}
): string | null {
  const now = options.now ?? Date.now();
  const minutes = Math.floor((now - epochMs) / 60_000);
  if (minutes < 1) return t('time.justNow');
  if (minutes < 60) return t('time.minutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hoursAgo', { hours });
  const days = Math.floor(hours / 24);
  if (options.maxDays !== undefined && days > options.maxDays) return null;
  return t('time.daysAgo', { days });
}

/**
 * An absolute date, formatted for the language the UI is in rather than for
 * whatever locale the OS happens to have.
 *
 * That difference is the point: `toLocaleDateString()` with no argument reads
 * the *browser's* locale, so a user who picked English on a Chinese Mac would
 * read 8月12日 in the middle of an English list.
 */
export function formatDateTime(
  epochMs: number,
  locale: string,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(epochMs));
}
