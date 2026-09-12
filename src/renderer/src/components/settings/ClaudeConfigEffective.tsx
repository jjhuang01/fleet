import { useMemo, useState } from 'react';
import type { ClaudeConfigScope } from '../../../../shared/claude-config';
import { resolveEffective } from '../../../../shared/claude-settings-precedence';
import type { EffectiveValue, ScopeValues } from '../../../../shared/claude-settings-precedence';
import type { Locale, MessageKey } from '../../../../shared/i18n';
import { useTranslation, type Translator } from '../../lib/i18n';
import { SCALAR_FIELDS, LIST_FIELDS } from '../../lib/claude-settings-fields';

/**
 * What Claude Code actually ends up using, across all three files.
 *
 * The page's hardest idea is that two resolution rules run at once: a single
 * value is *replaced* by a narrower file, a list is *added to* by every file.
 * Saying that in a sentence at the top of the page is necessary but not
 * sufficient - config prose goes unread. This strip demonstrates it instead,
 * by showing the resolved value with its sources attached.
 *
 * It is read-only on purpose. The moment it accepts an edit it stops being a
 * mirror of the three files and becomes a fourth thing to reconcile.
 */

/** Short forms, because a source line names up to three of them. */
const SHORT: Record<ClaudeConfigScope, MessageKey> = {
  user: 'settings.claudeConfig.scope.user.name',
  project: 'settings.claudeConfig.scope.project.name',
  projectLocal: 'settings.claudeConfig.scope.projectLocal.name'
};

const FIELD_LABELS: Record<string, MessageKey | undefined> = {
  model: 'settings.claudeConfig.field.model.label',
  outputStyle: 'settings.claudeConfig.field.outputStyle.label',
  effortLevel: 'settings.claudeConfig.field.effortLevel.label',
  'permissions.defaultMode': 'settings.claudeConfig.field.permissionMode.label',
  alwaysThinkingEnabled: 'settings.claudeConfig.field.extendedThinking.label',
  autoCompactEnabled: 'settings.claudeConfig.field.autoCompact.label',
  includeCoAuthoredBy: 'settings.claudeConfig.field.coauthoredByline.label',
  cleanupPeriodDays: 'settings.claudeConfig.field.keepSessions.label',
  'permissions.allow': 'settings.claudeConfig.field.allow.label',
  'permissions.ask': 'settings.claudeConfig.field.ask.label',
  'permissions.deny': 'settings.claudeConfig.field.deny.label',
  'permissions.additionalDirectories': 'settings.claudeConfig.field.extraDirectories.label'
};

function fieldLabel(path: string[]): MessageKey {
  const label = FIELD_LABELS[path.join('.')];
  if (!label) throw new Error(`Missing Claude config translation for ${path.join('.')}`);
  return label;
}

function joinLabels(labels: string[], locale: Locale): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (locale === 'zh-Hans') return labels.join('、');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/** One line of what a value is, short enough to sit at the end of a row. */
function formatScalar(value: unknown, t: Translator): string {
  if (typeof value === 'string') {
    return value === '' ? t('settings.claudeConfig.effective.empty') : value;
  }
  // On/Off rather than true/false, so the strip and the form's own select say
  // the same word for the same state.
  if (typeof value === 'boolean') {
    return value ? t('settings.claudeConfig.form.on') : t('settings.claudeConfig.form.off');
  }
  if (typeof value === 'number') return String(value);
  // Objects and arrays only reach here for a key the schema calls scalar, so a
  // one-line JSON rendering is the honest answer rather than a made-up label.
  return JSON.stringify(value);
}

type Resolved = { labelKey: MessageKey; path: string[]; effective: EffectiveValue };

/**
 * The row's right-hand side: the value, in the shape its own rule produces.
 *
 * A replaced value is one string. A combined list is a count, because the
 * entries themselves are already on the page a few rows down and repeating
 * thirty permission rules here would bury the thing this strip exists to say.
 */
function Value({ effective }: { effective: EffectiveValue }): React.JSX.Element {
  const { t } = useTranslation();

  if (effective.kind === 'replaced') {
    return (
      <span className="font-mono text-xs text-fleet-text">{formatScalar(effective.value, t)}</span>
    );
  }
  if (effective.kind === 'combined') {
    const total = effective.parts.reduce((sum, part) => sum + part.entries.length, 0);
    return (
      <span className="text-xs text-fleet-text">
        {total === 1
          ? t('settings.claudeConfig.effective.entryOne')
          : t('settings.claudeConfig.effective.entryOther', { count: total })}
      </span>
    );
  }
  return (
    <span className="text-xs text-fleet-text-subtle">
      {t('settings.claudeConfig.effective.notCompared')}
    </span>
  );
}

/**
 * The row's source line: where the value came from, in the rule's own verb.
 *
 * "replaces" and "adds to" rather than "precedence" and "union" - the whole
 * point is that the two rules read as different sentences.
 */
function sourceLine(effective: EffectiveValue, t: Translator, locale: Locale): string | null {
  if (effective.kind === 'replaced') {
    const scope = t(SHORT[effective.winner]);
    if (effective.losers.length === 0) {
      return t('settings.claudeConfig.effective.source.only', { scope });
    }
    return t('settings.claudeConfig.effective.source.replaced', {
      scope,
      others: joinLabels(
        effective.losers.map((loser) => t(SHORT[loser])),
        locale
      )
    });
  }
  if (effective.kind === 'combined') {
    const parts = effective.parts.filter((part) => part.entries.length > 0);
    if (parts.length === 0) return null;
    if (parts.length === 1) {
      return t('settings.claudeConfig.effective.source.allFrom', {
        scope: t(SHORT[parts[0].scope])
      });
    }
    return t('settings.claudeConfig.effective.source.combined', {
      sources: parts
        .map((part) =>
          t('settings.claudeConfig.effective.source.part', {
            scope: t(SHORT[part.scope]),
            count: part.entries.length
          })
        )
        .join(' + ')
    });
  }
  if (effective.kind === 'special') {
    return t('settings.claudeConfig.effective.source.special', {
      scopes: joinLabels(
        effective.scopes.map((scope) => t(SHORT[scope])),
        locale
      )
    });
  }
  return null;
}

export function ClaudeConfigEffective({ values }: { values: ScopeValues }): React.JSX.Element {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);

  const resolved = useMemo<Resolved[]>(() => {
    const fields = [
      ...SCALAR_FIELDS.map((f) => ({ labelKey: fieldLabel(f.path), path: f.path })),
      ...LIST_FIELDS.map((f) => ({ labelKey: fieldLabel(f.path), path: f.path }))
    ];
    return fields.map((field) => ({ ...field, effective: resolveEffective(field.path, values) }));
  }, [values]);

  const set = resolved.filter((row) => row.effective.kind !== 'unset');
  const replaced = set.filter(
    (row) => row.effective.kind === 'replaced' && row.effective.losers.length > 0
  ).length;
  const combined = set.filter(
    (row) => row.effective.kind === 'combined' && row.effective.parts.length > 1
  ).length;

  // Nothing set anywhere means nothing to teach, and an empty strip on a fresh
  // install would only be one more thing to read past.
  if (set.length === 0) return <></>;

  const settings =
    set.length === 1
      ? t('settings.claudeConfig.effective.settingOne')
      : t('settings.claudeConfig.effective.settingOther', { count: set.length });
  const summary =
    replaced > 0 && combined > 0
      ? t('settings.claudeConfig.effective.summaryBoth', { settings, replaced, combined })
      : replaced > 0
        ? t('settings.claudeConfig.effective.summaryReplaced', { settings, replaced })
        : combined > 0
          ? t('settings.claudeConfig.effective.summaryCombined', { settings, combined })
          : t('settings.claudeConfig.effective.summaryBasic', { settings });

  return (
    <section className="rounded border border-fleet-border bg-fleet-surface-2/40">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block text-sm text-fleet-text">
            {t('settings.claudeConfig.effective.title')}
          </span>
          <span className="block text-[11px] text-fleet-text-secondary">{summary}</span>
        </span>
        <span className="flex-none text-[11px] text-fleet-text-secondary">
          {open
            ? t('settings.claudeConfig.effective.hide')
            : t('settings.claudeConfig.effective.show')}
        </span>
      </button>

      {open ? (
        <div className="border-t border-fleet-border px-3 pb-2">
          <div className="divide-y divide-fleet-border">
            {set.map((row) => {
              const source = sourceLine(row.effective, t, locale);
              return (
                <div
                  key={row.path.join('.')}
                  className="flex items-start justify-between gap-6 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-fleet-text">{t(row.labelKey)}</div>
                    {source ? (
                      <div className="text-[11px] text-fleet-text-secondary">{source}</div>
                    ) : null}
                  </div>
                  <div className="flex-none pt-0.5 text-right">
                    <Value effective={row.effective} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="pt-2 text-[11px] text-fleet-text-subtle">
            {t('settings.claudeConfig.effective.caveat')}
          </p>
        </div>
      ) : null}
    </section>
  );
}
