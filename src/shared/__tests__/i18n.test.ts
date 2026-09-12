import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { zhCN } from '../i18n/zh-CN';
import { LOCALES, isLocalePreference, resolveLocale, translate } from '../i18n';

describe('catalogue parity', () => {
  it('translates every key the English catalogue defines', () => {
    // `zhCN` is typed `Record<MessageKey, string>`, so this is the runtime half
    // of the same promise: it also catches an empty string standing in for a
    // translation, which the type cannot.
    const missing = Object.keys(en).filter((key) => !zhCN[key as keyof typeof en]);
    expect(missing).toEqual([]);
  });

  it('has no keys the English catalogue does not define', () => {
    const extra = Object.keys(zhCN).filter((key) => !(key in en));
    expect(extra).toEqual([]);
  });

  it('defines a non-empty string for every key', () => {
    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      expect(en[key].length, `en.${key}`).toBeGreaterThan(0);
      expect(zhCN[key].length, `zh-CN.${key}`).toBeGreaterThan(0);
    }
  });
});

describe('resolveLocale', () => {
  it('honours an explicit choice over the OS locale', () => {
    expect(resolveLocale('en', 'zh-Hans-CN')).toBe('en');
    expect(resolveLocale('zh-CN', 'en-US')).toBe('zh-CN');
  });

  it('follows the OS when the preference is "system" or unset', () => {
    expect(resolveLocale('system', 'zh-Hans-CN')).toBe('zh-CN');
    expect(resolveLocale('system', 'zh-TW')).toBe('zh-CN');
    expect(resolveLocale(undefined, 'en-US')).toBe('en');
    expect(resolveLocale('system', undefined)).toBe('en');
  });
});

describe('isLocalePreference', () => {
  it('accepts every shipped locale plus "system"', () => {
    expect(isLocalePreference('system')).toBe(true);
    for (const locale of LOCALES) {
      expect(isLocalePreference(locale)).toBe(true);
    }
  });

  it('rejects anything else, so a hand-edited settings file cannot reach the UI', () => {
    expect(isLocalePreference('de')).toBe(false);
    expect(isLocalePreference('')).toBe(false);
  });
});

describe('translate', () => {
  it('renders the locale it is asked for', () => {
    expect(translate('en', 'common.save')).toBe('Save');
    expect(translate('zh-CN', 'common.save')).toBe('保存');
  });

  it('fills placeholders and repeats them when used twice', () => {
    expect(translate('en', 'sidebar.tabCount', { count: 3 })).toBe('3 tabs');
    expect(translate('zh-CN', 'sidebar.tabCount', { count: 3 })).toBe('3 个标签页');
    expect(translate('en', 'tabStatus.minutesAgo', { minutes: 5 })).toBe('5m ago');
  });

  it('leaves unmatched placeholders readable instead of printing "undefined"', () => {
    expect(translate('en', 'sidebar.tabCount', {})).toBe('{count} tabs');
  });

  it('does not touch braces when no parameters are passed', () => {
    expect(translate('en', 'sidebar.newTabHint')).toBe('New Tab ({shortcut})');
  });
});
