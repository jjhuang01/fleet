import { describe, it, expect } from 'vitest';
import { translate } from '../../../../shared/i18n';
import { formatElapsed, formatDateTime } from '../relative-time';
import type { Translator } from '../i18n';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function translator(locale: 'en' | 'zh-Hans'): Translator {
  return (key, params) => translate(locale, key, params);
}

describe('formatElapsed', () => {
  const now = 1_700_000_000_000;

  it('walks minutes, hours and days in English', () => {
    const t = translator('en');
    expect(formatElapsed(now - 5_000, t, { now })).toBe('just now');
    expect(formatElapsed(now - 5 * MINUTE, t, { now })).toBe('5m ago');
    expect(formatElapsed(now - 5 * HOUR, t, { now })).toBe('5h ago');
    expect(formatElapsed(now - 5 * DAY, t, { now })).toBe('5d ago');
  });

  it('says the same thing in Chinese, with Chinese units', () => {
    const t = translator('zh-Hans');
    expect(formatElapsed(now - 5_000, t, { now })).toBe('刚刚');
    expect(formatElapsed(now - 5 * MINUTE, t, { now })).toBe('5 分钟前');
    expect(formatElapsed(now - 5 * HOUR, t, { now })).toBe('5 小时前');
    expect(formatElapsed(now - 5 * DAY, t, { now })).toBe('5 天前');
  });

  it('rounds down, so an item is never older than it looks', () => {
    const t = translator('en');
    expect(formatElapsed(now - (59 * MINUTE + 59_000), t, { now })).toBe('59m ago');
    expect(formatElapsed(now - (23 * HOUR + 59 * MINUTE), t, { now })).toBe('23h ago');
  });

  it('hands the caller a null past maxDays so a date can take over', () => {
    const t = translator('en');
    expect(formatElapsed(now - 7 * DAY, t, { now, maxDays: 7 })).toBe('7d ago');
    expect(formatElapsed(now - 8 * DAY, t, { now, maxDays: 7 })).toBeNull();
  });
});

describe('formatDateTime', () => {
  it('formats for the locale the UI is in, not the OS locale', () => {
    const stamp = Date.UTC(2026, 7, 12, 12);
    // Same instant, two languages, and the day-month order differs between them
    // only by locale - which is exactly why this cannot be hand-rolled.
    expect(formatDateTime(stamp, 'en')).toBe('Aug 12, 2026');
    expect(formatDateTime(stamp, 'zh-Hans')).toBe('2026年8月12日');
  });

  it('accepts a narrower shape for a list cell', () => {
    const stamp = Date.UTC(2026, 7, 12, 12);
    expect(formatDateTime(stamp, 'en', { month: 'short', day: 'numeric' })).toBe('Aug 12');
  });
});
