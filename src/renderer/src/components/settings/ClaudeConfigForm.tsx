import { useEffect, useMemo, useState } from 'react';
import { useClaudeConfigStore } from '../../store/claude-config-store';
import { resolveClaudeFilePath } from '../../../../shared/claude-config';
import type { ClaudeConfigScope, ClaudeConfigDirs } from '../../../../shared/claude-config';
import { enumAtPath } from '../../../../shared/claude-settings-schema';
import {
  describePrecedence,
  isIneffectiveDefaultMode,
  SCOPE_PRECEDENCE
} from '../../../../shared/claude-settings-precedence';
import type { PrecedenceResult } from '../../../../shared/claude-settings-precedence';
import type { Locale, MessageKey } from '../../../../shared/i18n';
import { useTranslation, type Translator } from '../../lib/i18n';
import {
  parseSettings,
  valueAtPath,
  recordAtPath,
  applySettingsEdit
} from '../../lib/claude-json-edit';
import { SCALAR_FIELDS, LIST_FIELDS } from '../../lib/claude-settings-fields';
import { adoptRows, commitRows, rowsMatchDocument } from '../../lib/claude-key-value-rows';
import type { KeyValueRow } from '../../lib/claude-key-value-rows';
import { ClaudeConfigHooks } from './ClaudeConfigHooks';
import { ClaudeConfigEffective } from './ClaudeConfigEffective';

/**
 * The typed view of a settings file.
 *
 * Every control writes through `applySettingsEdit`, which parses the document,
 * changes one key and writes the rest back untouched. The form therefore never
 * has to know every key in the file - and cannot delete the ones it does not
 * know.
 */

const fieldCls =
  'min-w-0 rounded border border-fleet-border-strong bg-fleet-surface-3 px-2 py-1 text-sm text-fleet-text';
const inputCls = `w-full ${fieldCls}`;

/** Scalars share one width; a ragged right edge is what a settings page must not have. */
const SCALAR_WIDTH = 'max-w-[280px]';

const SCOPE_LABEL_KEYS: Record<ClaudeConfigScope, MessageKey> = {
  user: 'settings.claudeConfig.scope.user.settings',
  project: 'settings.claudeConfig.scope.project.settings',
  projectLocal: 'settings.claudeConfig.scope.projectLocal.settings'
};

type FieldText = { label: MessageKey; note: MessageKey; empty?: MessageKey };
type ListFieldText = FieldText & { empty: MessageKey };

const SCALAR_FIELD_TEXT: Record<string, FieldText | undefined> = {
  model: {
    label: 'settings.claudeConfig.field.model.label',
    note: 'settings.claudeConfig.field.model.note'
  },
  outputStyle: {
    label: 'settings.claudeConfig.field.outputStyle.label',
    note: 'settings.claudeConfig.field.outputStyle.note'
  },
  effortLevel: {
    label: 'settings.claudeConfig.field.effortLevel.label',
    note: 'settings.claudeConfig.field.effortLevel.note'
  },
  'permissions.defaultMode': {
    label: 'settings.claudeConfig.field.permissionMode.label',
    note: 'settings.claudeConfig.field.permissionMode.note'
  },
  alwaysThinkingEnabled: {
    label: 'settings.claudeConfig.field.extendedThinking.label',
    note: 'settings.claudeConfig.field.extendedThinking.note'
  },
  autoCompactEnabled: {
    label: 'settings.claudeConfig.field.autoCompact.label',
    note: 'settings.claudeConfig.field.autoCompact.note'
  },
  includeCoAuthoredBy: {
    label: 'settings.claudeConfig.field.coauthoredByline.label',
    note: 'settings.claudeConfig.field.coauthoredByline.note'
  },
  cleanupPeriodDays: {
    label: 'settings.claudeConfig.field.keepSessions.label',
    note: 'settings.claudeConfig.field.keepSessions.note'
  }
};

const LIST_FIELD_TEXT: Record<string, ListFieldText | undefined> = {
  'permissions.allow': {
    label: 'settings.claudeConfig.field.allow.label',
    note: 'settings.claudeConfig.field.allow.note',
    empty: 'settings.claudeConfig.field.allow.empty'
  },
  'permissions.ask': {
    label: 'settings.claudeConfig.field.ask.label',
    note: 'settings.claudeConfig.field.ask.note',
    empty: 'settings.claudeConfig.field.ask.empty'
  },
  'permissions.deny': {
    label: 'settings.claudeConfig.field.deny.label',
    note: 'settings.claudeConfig.field.deny.note',
    empty: 'settings.claudeConfig.field.deny.empty'
  },
  'permissions.additionalDirectories': {
    label: 'settings.claudeConfig.field.extraDirectories.label',
    note: 'settings.claudeConfig.field.extraDirectories.note',
    empty: 'settings.claudeConfig.field.extraDirectories.empty'
  }
};

function fieldText(fields: Record<string, FieldText | undefined>, path: string[]): FieldText {
  const text = fields[path.join('.')];
  if (!text) throw new Error(`Missing Claude config translation for ${path.join('.')}`);
  return text;
}

function listFieldText(path: string[]): ListFieldText {
  const text = LIST_FIELD_TEXT[path.join('.')];
  if (!text) throw new Error(`Missing Claude config translation for ${path.join('.')}`);
  return text;
}

function joinLabels(labels: string[], locale: Locale): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (locale === 'zh-Hans') return labels.join('、');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

/**
 * The three precedence states do not deserve equal weight.
 *
 * Twenty identically-styled grey lines is alert fatigue, so only the state a
 * user would be surprised by carries a colour cue: the value in front of them
 * is not the one Claude Code will use. Everything else is a passive indicator,
 * and a field behaving normally says nothing at all.
 */
type Notice = { text: string; surprising: boolean };

function noticeFor(
  result: PrecedenceResult,
  current: ClaudeConfigScope,
  t: Translator,
  locale: Locale
): Notice | null {
  const plain = (text: string): Notice => ({ text, surprising: false });

  switch (result.kind) {
    case 'unset':
      return null;
    case 'only':
      return result.scope === current
        ? null
        : plain(
            t('settings.claudeConfig.form.notice.only', {
              scope: t(SCOPE_LABEL_KEYS[result.scope])
            })
          );
    case 'overridden':
      return result.winner === current
        ? plain(
            t('settings.claudeConfig.form.notice.wins', {
              scopes: joinLabels(
                result.losers.map((scope) => t(SCOPE_LABEL_KEYS[scope])),
                locale
              )
            })
          )
        : {
            text: t('settings.claudeConfig.form.notice.overrides', {
              scope: t(SCOPE_LABEL_KEYS[result.winner])
            }),
            surprising: true
          };
    case 'combined':
      return plain(
        t('settings.claudeConfig.form.notice.combined', {
          scopes: joinLabels(
            result.contributors
              .filter((scope) => scope !== current)
              .map((scope) => t(SCOPE_LABEL_KEYS[scope])),
            locale
          )
        })
      );
    case 'special':
      return plain(
        t('settings.claudeConfig.form.notice.special', {
          scopes: joinLabels(
            result.scopes.map((scope) => t(SCOPE_LABEL_KEYS[scope])),
            locale
          )
        })
      );
  }
}

/**
 * `values` holds each file's whole parsed object, not the value at `path`.
 * `describePrecedence` walks the path itself, so handing it an extracted value
 * makes every key look unset.
 */
function FieldNote({
  path,
  scope,
  values,
  fallback
}: {
  path: string[];
  scope: ClaudeConfigScope;
  values: Partial<Record<ClaudeConfigScope, Record<string, unknown>>>;
  /** What the row says when there is nothing to report about precedence. */
  fallback: MessageKey;
}): React.JSX.Element {
  const { t, locale } = useTranslation();
  const notice = noticeFor(describePrecedence(path, values), scope, t, locale);
  // Secondary, not subtle: the fix for too many notices is fewer of them, not
  // fainter ones.
  return (
    <div
      className={`text-[11px] ${notice?.surprising ? 'text-amber-400' : 'text-fleet-text-secondary'}`}
      title={notice ? t('settings.claudeConfig.effective.caveat') : undefined}
    >
      {notice ? notice.text : t(fallback)}
    </div>
  );
}

/**
 * A settings group: a plain heading, an optional line under it, hairline rows.
 *
 * No card. A border and a fill around every group adds two contrast steps to a
 * dark page that then have to be fought at every level inside it, and it reads
 * heavier than the whitespace that would have separated the groups anyway.
 */
function Group({
  titleKey,
  noteKey,
  children
}: {
  titleKey: MessageKey;
  noteKey?: MessageKey;
  children: React.ReactNode;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="space-y-1">
      <h3 className="text-sm text-fleet-text">{t(titleKey)}</h3>
      {noteKey ? <p className="pb-1 text-[11px] text-fleet-text-secondary">{t(noteKey)}</p> : null}
      <div className="divide-y divide-fleet-border border-t border-fleet-border">{children}</div>
    </section>
  );
}

/**
 * One row: label and its note on the left, control on the right.
 *
 * The note slot is where a precedence notice goes. Every row has one already,
 * so saying "another file overrides this" costs no new line and cannot become
 * an orphaned scrap of small text between two controls.
 */
function Row({
  labelKey,
  note,
  control,
  full
}: {
  labelKey: MessageKey;
  note: React.ReactNode;
  control: React.ReactNode;
  /** Wide controls take their own line rather than stretching the row. */
  full?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm text-fleet-text">{t(labelKey)}</div>
          {note ? <div className="mt-0.5 space-y-0.5">{note}</div> : null}
        </div>
        {full ? null : <div className="flex-none">{control}</div>}
      </div>
      {full ? <div className="mt-2">{control}</div> : null}
    </div>
  );
}

function StringList({
  values,
  emptyKey,
  onChange
}: {
  values: string[];
  /** What an unset list means, so a bare Add button is never the whole answer. */
  emptyKey: MessageKey;
  onChange: (next: string[] | undefined) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  const replace = (index: number, value: string): void => {
    const next = [...values];
    next[index] = value;
    onChange(next);
  };
  const remove = (index: number): void => {
    const next = values.filter((_, i) => i !== index);
    onChange(next.length === 0 ? undefined : next);
  };

  return (
    <div className="w-full space-y-1">
      {values.length === 0 ? (
        <div className="text-xs text-fleet-text-subtle">{t(emptyKey)}</div>
      ) : (
        values.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className={`${inputCls} font-mono text-xs`}
              value={entry}
              onChange={(e) => replace(index, e.target.value)}
            />
            <button
              onClick={() => remove(index)}
              className="shrink-0 text-xs text-red-400 transition active:scale-[0.97]"
            >
              {t('settings.claudeConfig.form.remove')}
            </button>
          </div>
        ))
      )}
      <button
        onClick={() => onChange([...values, ''])}
        className="rounded border border-fleet-border-strong px-2 py-0.5 text-xs text-fleet-text-secondary transition hover:text-fleet-text active:scale-[0.97]"
      >
        {t('settings.claudeConfig.form.add')}
      </button>
    </div>
  );
}

/**
 * One row of a key/value map: its name, its value, and the button that drops it.
 *
 * Split out of the list because the value side has two shapes - a text box and
 * an on/off select - and the branch between them is longer than the list that
 * holds it.
 */
function KeyValueRowFields({
  row,
  valuePlaceholder,
  autoFocus,
  onChange,
  onRemove
}: {
  row: KeyValueRow;
  valuePlaceholder: MessageKey;
  autoFocus: boolean;
  onChange: (next: KeyValueRow) => void;
  onRemove: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [key, value] = row;
  // Anything that is not text or a switch has no honest control here.
  const editable = typeof value === 'string' || typeof value === 'boolean';

  return (
    <div className="flex items-center gap-2">
      <input
        className={`${inputCls} flex-1 font-mono text-xs`}
        value={key}
        placeholder={t('settings.claudeConfig.form.namePlaceholder')}
        autoFocus={autoFocus}
        onChange={(e) => onChange([e.target.value, value])}
      />
      {typeof value === 'boolean' ? (
        <select
          className={`${fieldCls} w-[92px] flex-none`}
          value={value ? 'true' : 'false'}
          onChange={(e) => onChange([key, e.target.value === 'true'])}
        >
          <option value="true">{t('settings.claudeConfig.form.on')}</option>
          <option value="false">{t('settings.claudeConfig.form.off')}</option>
        </select>
      ) : (
        <input
          className={`${inputCls} flex-1 font-mono text-xs disabled:opacity-50`}
          value={typeof value === 'string' ? value : JSON.stringify(value)}
          placeholder={t(valuePlaceholder)}
          disabled={!editable}
          title={editable ? undefined : t('settings.claudeConfig.form.nonPlainTextTitle')}
          onChange={(e) => onChange([key, e.target.value])}
        />
      )}
      <button
        onClick={onRemove}
        className="shrink-0 text-xs text-red-400 transition active:scale-[0.97]"
      >
        {t('settings.claudeConfig.form.remove')}
      </button>
    </div>
  );
}

function KeyValueList({
  entries,
  onChange,
  valuePlaceholder
}: {
  entries: KeyValueRow[];
  onChange: (next: Record<string, unknown> | undefined) => void;
  valuePlaceholder: MessageKey;
}): React.JSX.Element {
  const { t } = useTranslation();

  // Rows, not the object. A row the user has just added has no name yet, and a
  // nameless key cannot exist in the document, so deriving rows from the object
  // would delete every new row before it could be typed into.
  const [rows, setRows] = useState<KeyValueRow[]>(entries);
  useEffect(() => {
    setRows((current) => adoptRows(current, entries));
  }, [entries]);

  const update = (next: KeyValueRow[]): void => {
    setRows(next);
    // Adding an empty row changes nothing the document can hold, and reporting
    // a change there would mark the file dirty for a row that is not in it.
    if (!rowsMatchDocument(next, entries)) onChange(commitRows(next));
  };

  const blankRow: KeyValueRow = [
    '',
    valuePlaceholder === 'settings.claudeConfig.form.onOffPlaceholder' ? true : ''
  ];

  return (
    <div className="w-full space-y-1">
      {rows.map((row, index) => (
        <KeyValueRowFields
          key={index}
          row={row}
          valuePlaceholder={valuePlaceholder}
          autoFocus={row[0] === '' && index === rows.length - 1}
          onChange={(next) => update(rows.map((r, i) => (i === index ? next : r)))}
          onRemove={() => update(rows.filter((_, i) => i !== index))}
        />
      ))}
      <button
        onClick={() => update([...rows, blankRow])}
        className="rounded border border-fleet-border-strong px-2 py-0.5 text-xs text-fleet-text-secondary transition hover:text-fleet-text active:scale-[0.97]"
      >
        {t('settings.claudeConfig.form.add')}
      </button>
    </div>
  );
}

export function ClaudeConfigForm({
  scope,
  path,
  dirs
}: {
  scope: ClaudeConfigScope;
  path: string;
  dirs: ClaudeConfigDirs;
}): React.JSX.Element {
  const { t } = useTranslation();
  const text = useClaudeConfigStore((s) => s.documents[path]?.text ?? '{}');
  const documents = useClaudeConfigStore((s) => s.documents);
  const edit = useClaudeConfigStore((s) => s.edit);

  const document = useMemo(() => parseSettings(text), [text]);

  // The other two files, so a value can be reported as overridden or combined
  // rather than presented as if this file were the only one.
  const perScope = useMemo(() => {
    const out: Partial<Record<ClaudeConfigScope, Record<string, unknown>>> = {};
    for (const other of SCOPE_PRECEDENCE) {
      const otherPath = resolveClaudeFilePath({ scope: other, kind: 'settings', dirs });
      if (!otherPath) continue;
      const parsed = parseSettings(documents[otherPath]?.text ?? '{}');
      if (parsed) out[other] = parsed;
    }
    return out;
  }, [documents, dirs]);

  const write = (keyPath: string[], value: unknown): void => {
    const next = applySettingsEdit(text, keyPath, value);
    if (next !== null) edit(path, next);
  };

  if (!document) {
    return (
      <div className="rounded border border-fleet-border-strong bg-fleet-surface-2 px-3 py-6 text-center text-sm text-fleet-text-secondary">
        {t('settings.claudeConfig.form.invalidJson')}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ClaudeConfigEffective values={perScope} />

      <Group titleKey="settings.claudeConfig.form.group.modelAndBehaviour">
        {SCALAR_FIELDS.map((field) => {
          const key = field.path.join('.');
          const text = fieldText(SCALAR_FIELD_TEXT, field.path);
          const value = valueAtPath(document, field.path);
          const options = field.control === 'enum' ? enumAtPath(field.path) : [];
          const ineffective =
            key === 'permissions.defaultMode' &&
            typeof value === 'string' &&
            isIneffectiveDefaultMode(scope, value);
          return (
            <Row
              key={key}
              labelKey={text.label}
              note={
                <>
                  {/* The notice takes the slot when there is one; the standing
                      note is what the row says the rest of the time. */}
                  <FieldNote
                    path={field.path}
                    scope={scope}
                    values={perScope}
                    fallback={text.note}
                  />
                  {ineffective ? (
                    <div className="text-[11px] text-amber-400">
                      {t('settings.claudeConfig.form.ineffectiveDefaultMode', {
                        value: String(value)
                      })}
                    </div>
                  ) : null}
                </>
              }
              control={
                field.control === 'boolean' ? (
                  <select
                    className={`${fieldCls} ${SCALAR_WIDTH} w-[200px]`}
                    value={value === undefined ? '' : value === true ? 'true' : 'false'}
                    onChange={(e) =>
                      write(
                        field.path,
                        e.target.value === '' ? undefined : e.target.value === 'true'
                      )
                    }
                  >
                    <option value="">{t('settings.claudeConfig.form.notSet')}</option>
                    <option value="true">{t('settings.claudeConfig.form.on')}</option>
                    <option value="false">{t('settings.claudeConfig.form.off')}</option>
                  </select>
                ) : field.control === 'enum' ? (
                  <select
                    className={`${fieldCls} ${SCALAR_WIDTH} w-[200px]`}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(e) =>
                      write(field.path, e.target.value === '' ? undefined : e.target.value)
                    }
                  >
                    <option value="">{t('settings.claudeConfig.form.notSet')}</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.control === 'number' ? (
                  <input
                    type="number"
                    min={1}
                    className={`${fieldCls} ${SCALAR_WIDTH} w-[200px]`}
                    value={typeof value === 'number' ? String(value) : ''}
                    placeholder={t('settings.claudeConfig.form.notSet')}
                    onChange={(e) =>
                      write(field.path, e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                ) : (
                  <input
                    className={`${fieldCls} ${SCALAR_WIDTH} w-[200px]`}
                    value={typeof value === 'string' ? value : ''}
                    placeholder={t('settings.claudeConfig.form.notSet')}
                    onChange={(e) =>
                      write(field.path, e.target.value === '' ? undefined : e.target.value)
                    }
                  />
                )
              }
            />
          );
        })}
      </Group>

      <Group
        titleKey="settings.claudeConfig.form.group.permissions"
        noteKey="settings.claudeConfig.form.permissionsDenyNote"
      >
        {LIST_FIELDS.map((field) => {
          const text = listFieldText(field.path);
          const raw = valueAtPath(document, field.path);
          const list = Array.isArray(raw) ? raw.map((v) => String(v)) : [];
          return (
            <Row
              key={field.path.join('.')}
              full
              labelKey={text.label}
              note={
                <FieldNote path={field.path} scope={scope} values={perScope} fallback={text.note} />
              }
              control={
                <StringList
                  values={list}
                  emptyKey={text.empty}
                  onChange={(next) => write(field.path, next)}
                />
              }
            />
          );
        })}
      </Group>

      <Group titleKey="settings.claudeConfig.form.group.environmentAndPlugins">
        <Row
          full
          labelKey="settings.claudeConfig.field.environment.label"
          note={
            <FieldNote
              path={['env']}
              scope={scope}
              values={perScope}
              fallback="settings.claudeConfig.field.environment.note"
            />
          }
          control={
            <KeyValueList
              entries={Object.entries(recordAtPath(document, ['env']))}
              valuePlaceholder="settings.claudeConfig.form.valuePlaceholder"
              onChange={(next) => write(['env'], next)}
            />
          }
        />
        <Row
          full
          labelKey="settings.claudeConfig.field.enabledPlugins.label"
          note={
            <FieldNote
              path={['enabledPlugins']}
              scope={scope}
              values={perScope}
              fallback="settings.claudeConfig.field.enabledPlugins.note"
            />
          }
          control={
            <KeyValueList
              entries={Object.entries(recordAtPath(document, ['enabledPlugins']))}
              valuePlaceholder="settings.claudeConfig.form.onOffPlaceholder"
              onChange={(next) => write(['enabledPlugins'], next)}
            />
          }
        />
      </Group>

      <ClaudeConfigHooks document={document} onChange={(next) => write(['hooks'], next)} />
    </div>
  );
}
