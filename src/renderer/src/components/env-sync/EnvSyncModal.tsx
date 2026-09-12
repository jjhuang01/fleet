// src/renderer/src/components/env-sync/EnvSyncModal.tsx
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, KeyRound, Loader2, MoreHorizontal, X } from 'lucide-react';
import { useToastStore } from '../../store/toast-store';
import { primaryBtn, neutralBtn } from '../../lib/button-styles';
import { Overlay } from '../Overlay';
import { useTranslation, type Translator } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';
import type {
  EnvSyncConfig,
  EnvSyncTarget,
  TargetStatus,
  TargetSyncState,
  RedactedEnvSyncSecrets,
  RedactedEnvSyncAuth,
  EnvSyncAuthMode,
  EnvSyncAuthInput
} from '../../../../shared/env-sync-types';
import type { PathContext } from '../../../../shared/shell-profiles';
import { toWindowsAccessiblePath } from '../../../../shared/path-platform';
import { createCancellation } from '../../lib/cancellation';

const STATUS_LABEL: Record<TargetSyncState, MessageKey> = {
  'in-sync': 'envSync.status.inSync',
  'remote-ahead': 'envSync.status.remoteAhead',
  'local-ahead': 'envSync.status.localAhead',
  conflict: 'envSync.status.conflict',
  'local-only': 'envSync.status.localOnly',
  'remote-only': 'envSync.status.remoteOnly',
  'no-remote-no-local': 'envSync.status.nothingYet',
  error: 'envSync.status.error'
};

// Status text colour by state: green = settled, amber = action available, red = problem.
const STATE_TEXT: Record<TargetSyncState, string> = {
  'in-sync': 'text-emerald-600 dark:text-emerald-400',
  'remote-ahead': 'text-amber-600 dark:text-amber-400',
  'local-ahead': 'text-amber-600 dark:text-amber-400',
  conflict: 'text-red-600 dark:text-red-400',
  'local-only': 'text-amber-600 dark:text-amber-400',
  'remote-only': 'text-amber-600 dark:text-amber-400',
  'no-remote-no-local': 'text-fleet-text-subtle',
  error: 'text-red-600 dark:text-red-400'
};

/** The single recommended sync action for a state, or null when nothing to do. */
function primaryAction(state: TargetSyncState): { dir: 'pull' | 'push'; label: MessageKey } | null {
  switch (state) {
    case 'remote-ahead':
    case 'remote-only':
      return { dir: 'pull', label: 'envSync.action.pull' };
    case 'local-ahead':
    case 'local-only':
      return { dir: 'push', label: 'envSync.action.push' };
    case 'conflict':
      return { dir: 'pull', label: 'envSync.action.resolve' };
    case 'in-sync':
    case 'no-remote-no-local':
    case 'error':
      return null;
  }
}

const inputCls =
  'w-full bg-fleet-surface-2 text-sm text-fleet-text rounded-md px-3 py-2 border border-fleet-border-strong transition-colors focus:border-[color:var(--fleet-accent)] focus:outline-none';

const SPIN = <Loader2 size={14} className="animate-spin" />;

function basename(dir: string): string {
  const parts = dir.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? dir;
}

/** Vertical label + control. Top-aligned labels read ~50% faster than left-aligned. */
function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-fleet-text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Collapsible section so advanced/secondary controls stay out of the way until needed. */
function Disclosure({
  title,
  summary,
  defaultOpen = false,
  children
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-fleet-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-fleet-surface-2/40 active:scale-[0.97]"
      >
        <ChevronRight
          size={15}
          className={`shrink-0 text-fleet-text-subtle transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-sm font-medium text-fleet-text-secondary">{title}</span>
        {summary && !open && (
          <span className="ml-auto truncate pl-3 text-xs text-fleet-text-subtle">{summary}</span>
        )}
      </button>
      {open && <div className="space-y-4 border-t border-fleet-border px-4 py-4">{children}</div>}
    </div>
  );
}

function PassphraseControl({
  id,
  present,
  encAvailable,
  clearLabel,
  onChanged
}: {
  id?: string;
  present: boolean;
  encAvailable: boolean;
  clearLabel: MessageKey;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const save = async (): Promise<void> => {
    setSaving(true);
    try {
      await window.fleet.envSync.setPassphrase({ id, passphrase: draft });
      setDraft('');
      await onChanged();
      showToast(t('envSync.passphrase.saved'));
    } finally {
      setSaving(false);
    }
  };
  const clear = async (): Promise<void> => {
    setClearing(true);
    try {
      await window.fleet.envSync.clearPassphrase({ id });
      await onChanged();
    } finally {
      setClearing(false);
    }
  };

  return present ? (
    <div className="flex items-center gap-3">
      <span className="text-sm text-fleet-text-muted">{t('envSync.passphrase.set')}</span>
      <button
        disabled={clearing}
        className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 transition-colors hover:text-red-700 dark:hover:text-red-300 disabled:text-fleet-text-subtle active:scale-[0.97] disabled:active:scale-100"
        onClick={() => void clear()}
      >
        {clearing && SPIN}
        {t(clearLabel)}
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-3">
      <input
        type="password"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('envSync.passphrase.label')}
        className={inputCls}
      />
      <button
        disabled={!draft || !encAvailable || saving}
        onClick={() => void save()}
        className={`shrink-0 ${neutralBtn}`}
      >
        {saving && SPIN}
        {t('common.save')}
      </button>
    </div>
  );
}

function AuthControl({
  id,
  redacted,
  encAvailable,
  resetLabel,
  onChanged
}: {
  id?: string;
  redacted: RedactedEnvSyncAuth | undefined;
  encAvailable: boolean;
  resetLabel: MessageKey;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const [mode, setMode] = useState<EnvSyncAuthMode>(redacted?.mode ?? 'default-chain');
  const [profile, setProfile] = useState(redacted?.profile ?? '');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setMode(redacted?.mode ?? 'default-chain');
    setProfile(redacted?.profile ?? '');
  }, [redacted]);

  const save = async (): Promise<void> => {
    const auth: EnvSyncAuthInput = { mode };
    if (mode === 'profile') auth.profile = profile;
    if (mode === 'static') {
      auth.accessKeyId = accessKeyId;
      auth.secretAccessKey = secretAccessKey;
      if (sessionToken) auth.sessionToken = sessionToken;
    }
    setSaving(true);
    try {
      await window.fleet.envSync.setAuth({ id, auth });
      setAccessKeyId('');
      setSecretAccessKey('');
      setSessionToken('');
      await onChanged();
      showToast(t('envSync.auth.saved'));
    } catch (err) {
      showToast(
        t('envSync.auth.saveFailed', {
          error: err instanceof Error ? err.message : t('envSync.toast.unknown')
        }),
        { duration: 6000 }
      );
    } finally {
      setSaving(false);
    }
  };
  const reset = async (): Promise<void> => {
    setResetting(true);
    try {
      await window.fleet.envSync.clearAuth({ id });
      await onChanged();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <select
        value={mode}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'default-chain' || v === 'profile' || v === 'static') setMode(v);
        }}
        className={inputCls}
      >
        <option value="default-chain">{t('envSync.auth.defaultChain')}</option>
        <option value="profile">{t('envSync.auth.namedProfile')}</option>
        <option value="static" disabled={!encAvailable}>
          {t('envSync.auth.staticKeys')}
        </option>
      </select>

      {mode === 'profile' && (
        <input
          type="text"
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          placeholder={t('envSync.auth.profilePlaceholder')}
          className={inputCls}
        />
      )}

      {mode === 'static' && (
        <div className="flex flex-col gap-3">
          {redacted?.mode === 'static' && redacted.hasAccessKeyId ? (
            <span className="text-sm text-fleet-text-muted">{t('envSync.auth.staticKeysSet')}</span>
          ) : null}
          <input
            type="text"
            autoComplete="off"
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            placeholder={t('envSync.auth.accessKeyId')}
            className={inputCls}
          />
          <input
            type="password"
            autoComplete="off"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            placeholder={t('envSync.auth.secretAccessKey')}
            className={inputCls}
          />
          <input
            type="password"
            autoComplete="off"
            value={sessionToken}
            onChange={(e) => setSessionToken(e.target.value)}
            placeholder={t('envSync.auth.sessionToken')}
            className={inputCls}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button disabled={saving} onClick={() => void save()} className={neutralBtn}>
          {saving && SPIN}
          {t('common.save')}
        </button>
        {redacted && (
          <button
            disabled={resetting}
            className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 transition-colors hover:text-red-700 dark:hover:text-red-300 disabled:text-fleet-text-subtle active:scale-[0.97] disabled:active:scale-100"
            onClick={() => void reset()}
          >
            {resetting && SPIN}
            {t(resetLabel)}
          </button>
        )}
      </div>
    </div>
  );
}

function authSummary(t: Translator, a: RedactedEnvSyncAuth | undefined): string {
  if (!a || a.mode === 'default-chain') return t('envSync.auth.defaultChain');
  if (a.mode === 'profile') {
    return t('envSync.auth.profileSummary', {
      profile: a.profile || t('envSync.auth.unset')
    });
  }
  return t('envSync.auth.staticKeys');
}

/**
 * Per-repo AWS auth override. When no override is stored the repo inherits the
 * global auth, so show that explicitly (with an Override button) instead of a
 * populated default-chain dropdown that looks like an active default-chain choice.
 */
function RepoAuthOverride({
  id,
  override,
  globalAuth,
  encAvailable,
  onChanged
}: {
  id: string;
  override: RedactedEnvSyncAuth | undefined;
  globalAuth: RedactedEnvSyncAuth | undefined;
  encAvailable: boolean;
  onChanged: () => Promise<void>;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  if (!override && !editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-fleet-text-muted">
          {t('envSync.auth.inheritsGlobal', { auth: authSummary(t, globalAuth) })}
        </span>
        <button
          className="text-xs text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 active:scale-[0.97]"
          onClick={() => setEditing(true)}
        >
          {t('envSync.action.override')}
        </button>
      </div>
    );
  }

  return (
    <AuthControl
      id={id}
      redacted={override}
      encAvailable={encAvailable}
      resetLabel="envSync.action.useGlobalDefault"
      onChanged={async () => {
        setEditing(false);
        await onChanged();
      }}
    />
  );
}

function InitForm({
  repoDir,
  onCreate
}: {
  repoDir: string;
  onCreate: (config: EnvSyncConfig) => Promise<void>;
}): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const [id, setId] = useState(basename(repoDir));
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('');
  const [creating, setCreating] = useState(false);

  const create = async (): Promise<void> => {
    const trimmedId = id.trim();
    const trimmedBucket = bucket.trim();
    const trimmedRegion = region.trim();
    if (!trimmedId || !trimmedBucket || !trimmedRegion) {
      showToast(t('envSync.config.required'), { duration: 4000 });
      return;
    }
    setCreating(true);
    try {
      await onCreate({
        version: 1,
        id: trimmedId,
        bucket: trimmedBucket,
        region: trimmedRegion,
        targets: []
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5 rounded-lg border border-fleet-border p-5">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-fleet-text">{t('envSync.config.setupTitle')}</h3>
        <p className="text-xs text-fleet-text-subtle">
          {t('envSync.config.setupDescription', { file: '.fleet/env-sync.json' })}
        </p>
        <p className="break-all pt-1 text-xs text-fleet-text-subtle">{repoDir}</p>
      </div>
      <Field label={t('envSync.config.repoId')}>
        <input value={id} onChange={(e) => setId(e.target.value)} className={inputCls} />
      </Field>
      <Field label={t('envSync.config.s3Bucket')}>
        <input
          value={bucket}
          onChange={(e) => setBucket(e.target.value)}
          placeholder={t('envSync.config.bucketPlaceholder')}
          className={inputCls}
        />
      </Field>
      <Field label={t('envSync.config.awsRegion')}>
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder={t('envSync.config.regionPlaceholder')}
          className={inputCls}
        />
      </Field>
      <button disabled={creating} onClick={() => void create()} className={primaryBtn}>
        {creating && SPIN}
        {t('envSync.config.createConfig')}
      </button>
    </div>
  );
}

function RepoManager({
  repoDir,
  config,
  statuses,
  reload
}: {
  repoDir: string;
  config: EnvSyncConfig;
  statuses: TargetStatus[];
  reload: () => Promise<void>;
}): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [bucketDraft, setBucketDraft] = useState(config.bucket);
  const [regionDraft, setRegionDraft] = useState(config.region);
  // null = scan panel closed; an array (possibly empty) = panel open with results.
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBucket, setConfirmBucket] = useState(false);
  const [creatingBucket, setCreatingBucket] = useState(false);
  // envFile whose row "more actions" menu is open, or null.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // In-flight async feedback.
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savingBucket, setSavingBucket] = useState(false);

  const createBucket = async (): Promise<void> => {
    setCreatingBucket(true);
    const res = await window.fleet.envSync.createBucket(repoDir);
    setCreatingBucket(false);
    setConfirmBucket(false);
    if (res.ok) {
      showToast(t('envSync.config.createdBucket', { bucket: config.bucket }));
      await reload();
    } else {
      showToast(t('envSync.config.createBucketFailed', { error: res.error }), { duration: 6000 });
    }
  };

  const saveConfig = async (next: EnvSyncConfig): Promise<boolean> => {
    try {
      await window.fleet.envSync.writeConfig(repoDir, next);
      await reload();
      return true;
    } catch (err) {
      showToast(
        t('envSync.config.saveFailed', {
          error: err instanceof Error ? err.message : t('envSync.toast.unknown')
        }),
        { duration: 6000 }
      );
      return false;
    }
  };

  const startEdit = (): void => {
    setBucketDraft(config.bucket);
    setRegionDraft(config.region);
    setEditing(true);
  };

  const saveBucketRegion = async (): Promise<void> => {
    const bucket = bucketDraft.trim();
    const region = regionDraft.trim();
    if (!bucket || !region) {
      showToast(t('envSync.config.bucketRegionRequired'), { duration: 4000 });
      return;
    }
    setSavingBucket(true);
    try {
      if (await saveConfig({ ...config, bucket, region })) {
        setEditing(false);
        showToast(t('envSync.config.bucketRegionSaved'));
      }
    } finally {
      setSavingBucket(false);
    }
  };

  const runScan = async (): Promise<void> => {
    setScanning(true);
    try {
      const found = await window.fleet.envSync.scan(repoDir);
      const existing = new Set(config.targets.map((t) => t.envFile));
      const fresh = found.filter((f) => !existing.has(f));
      setCandidates(fresh);
      setSelected(new Set(fresh));
    } finally {
      setScanning(false);
    }
  };

  const toggleCandidate = (path: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const closeScan = (): void => {
    setCandidates(null);
    setSelected(new Set());
  };

  const addSelected = async (): Promise<void> => {
    const additions: EnvSyncTarget[] = Array.from(selected).map((envFile) => ({
      envFile,
      delivery: 'file'
    }));
    if (additions.length === 0) return;
    setAdding(true);
    try {
      if (await saveConfig({ ...config, targets: [...config.targets, ...additions] })) {
        closeScan();
        showToast(
          t(additions.length === 1 ? 'envSync.config.addedTarget' : 'envSync.config.addedTargets', {
            count: additions.length
          })
        );
      }
    } finally {
      setAdding(false);
    }
  };

  const changeDelivery = async (envFile: string, delivery: 'file' | 'inject'): Promise<void> => {
    const targets = config.targets.map((t) => (t.envFile === envFile ? { ...t, delivery } : t));
    setMenuFor(null);
    await saveConfig({ ...config, targets });
  };

  const doSync = async (envFile: string, dir: 'pull' | 'push'): Promise<void> => {
    setMenuFor(null);
    setBusyRow(envFile);
    try {
      const res =
        dir === 'pull'
          ? await window.fleet.envSync.pull(repoDir, envFile, false)
          : await window.fleet.envSync.push(repoDir, envFile, false);
      if (res.ok) {
        showToast(
          t(dir === 'pull' ? 'envSync.toast.pulled' : 'envSync.toast.pushed', { file: envFile })
        );
        await reload();
      } else if ('conflict' in res && res.conflict) {
        window.dispatchEvent(
          new CustomEvent('env-sync:conflict', { detail: { repoDir, envFile } })
        );
      } else {
        showToast(
          t('envSync.toast.syncFailed', {
            error: 'error' in res ? res.error : t('envSync.toast.unknown')
          }),
          { duration: 6000 }
        );
      }
    } finally {
      setBusyRow(null);
    }
  };

  return (
    <div className="rounded-lg border border-fleet-border p-5">
      {/* Click-away catcher for the row action menu. */}
      {menuFor && <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-fleet-text">{config.id}</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={bucketDraft}
              onChange={(e) => setBucketDraft(e.target.value)}
              placeholder={t('envSync.config.bucket')}
              className="w-36 rounded-md border border-fleet-border-strong bg-fleet-surface-2 px-3 py-1.5 text-sm text-fleet-text"
            />
            <input
              value={regionDraft}
              onChange={(e) => setRegionDraft(e.target.value)}
              placeholder={t('envSync.config.region')}
              className="w-28 rounded-md border border-fleet-border-strong bg-fleet-surface-2 px-3 py-1.5 text-sm text-fleet-text"
            />
            <button
              disabled={savingBucket}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 disabled:text-fleet-text-subtle active:scale-[0.97] disabled:active:scale-100"
              onClick={() => void saveBucketRegion()}
            >
              {savingBucket && <Loader2 size={12} className="animate-spin" />}
              {t('common.save')}
            </button>
            <button
              className="text-xs text-fleet-text-muted transition-colors hover:text-fleet-text active:scale-[0.97]"
              onClick={() => setEditing(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-fleet-text-subtle">
              {config.bucket} · {config.region}
            </span>
            <button
              className="text-xs text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 active:scale-[0.97]"
              onClick={startEdit}
            >
              {t('envSync.action.edit')}
            </button>
            {confirmBucket ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-fleet-text-muted">
                  {t('envSync.config.createInRegion', { region: config.region })}
                </span>
                <button
                  disabled={creatingBucket}
                  className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 disabled:text-fleet-text-subtle active:scale-[0.97] disabled:active:scale-100"
                  onClick={() => void createBucket()}
                >
                  {creatingBucket && <Loader2 size={12} className="animate-spin" />}
                  {creatingBucket ? t('envSync.action.creating') : t('common.create')}
                </button>
                <button
                  className="text-fleet-text-muted transition-colors hover:text-fleet-text active:scale-[0.97]"
                  onClick={() => setConfirmBucket(false)}
                >
                  {t('common.cancel')}
                </button>
              </span>
            ) : (
              <button
                className="text-xs text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 active:scale-[0.97]"
                onClick={() => setConfirmBucket(true)}
              >
                {t('envSync.action.createBucket')}
              </button>
            )}
          </div>
        )}
      </div>

      {statuses.length === 0 ? (
        <p className="mt-5 text-xs text-fleet-text-subtle">{t('envSync.config.noTracked')}</p>
      ) : (
        <table className="mt-5 w-full border-separate border-spacing-y-1 text-sm">
          <tbody>
            {statuses.map((target) => {
              const action = primaryAction(target.state);
              return (
                <Fragment key={target.envFile}>
                  <tr>
                    <td className="py-2 pr-3 text-fleet-text">{target.envFile}</td>
                    <td className={`py-2 pr-3 ${STATE_TEXT[target.state]}`} title={target.error}>
                      {t(STATUS_LABEL[target.state])}
                    </td>
                    <td className="py-2 text-right">
                      <div className="relative inline-flex items-center justify-end gap-2">
                        {action && (
                          <button
                            disabled={busyRow === target.envFile}
                            className="inline-flex items-center gap-1.5 rounded-md bg-fleet-surface-3 px-3 py-1.5 text-xs font-medium text-fleet-text transition active:scale-[0.94] hover:bg-fleet-surface-3 disabled:active:scale-100"
                            onClick={() => void doSync(target.envFile, action.dir)}
                          >
                            {busyRow === target.envFile && (
                              <Loader2 size={12} className="animate-spin" />
                            )}
                            {t(action.label)}
                          </button>
                        )}
                        <button
                          aria-label={t('envSync.action.moreActions')}
                          disabled={busyRow === target.envFile}
                          className="rounded-md p-1.5 text-fleet-text-subtle transition-colors hover:bg-fleet-surface-2 hover:text-fleet-text disabled:opacity-50 active:scale-90 disabled:active:scale-100"
                          onClick={() =>
                            setMenuFor(menuFor === target.envFile ? null : target.envFile)
                          }
                        >
                          <MoreHorizontal size={15} />
                        </button>
                        {menuFor === target.envFile && (
                          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-fleet-border-strong bg-fleet-surface-2 py-1.5 text-left shadow-xl">
                            <button
                              className="block w-full px-3 py-1.5 text-left text-xs text-fleet-text transition-colors hover:bg-fleet-surface-3 active:scale-[0.97]"
                              onClick={() => void doSync(target.envFile, 'pull')}
                            >
                              {t('envSync.action.pullFromRemote')}
                            </button>
                            <button
                              className="block w-full px-3 py-1.5 text-left text-xs text-fleet-text transition-colors hover:bg-fleet-surface-3 active:scale-[0.97]"
                              onClick={() => void doSync(target.envFile, 'push')}
                            >
                              {t('envSync.action.pushToRemote')}
                            </button>
                            <div className="my-1.5 border-t border-fleet-border-strong" />
                            <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-fleet-text-subtle">
                              {t('envSync.delivery.heading')}
                            </div>
                            <button
                              className="block w-full px-3 py-1.5 text-left text-xs text-fleet-text transition-colors hover:bg-fleet-surface-3 active:scale-[0.97]"
                              onClick={() => void changeDelivery(target.envFile, 'file')}
                            >
                              {target.delivery === 'file' ? '✓ ' : '  '}
                              {t('envSync.action.writeFile')}
                            </button>
                            <button
                              className="block w-full px-3 py-1.5 text-left text-xs text-fleet-text transition-colors hover:bg-fleet-surface-3 active:scale-[0.97]"
                              onClick={() => void changeDelivery(target.envFile, 'inject')}
                            >
                              {target.delivery === 'inject' ? '✓ ' : '  '}
                              {t('envSync.action.injectIntoEnv')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {target.error && (
                    <tr>
                      <td
                        colSpan={3}
                        className="pb-2 text-xs leading-relaxed text-red-600 dark:text-red-400"
                      >
                        {target.error}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-5">
        {candidates === null ? (
          <button
            disabled={scanning}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 transition-colors hover:text-blue-700 dark:hover:text-blue-300 disabled:text-fleet-text-subtle active:scale-[0.97] disabled:active:scale-100"
            onClick={() => void runScan()}
          >
            {scanning && <Loader2 size={12} className="animate-spin" />}
            {scanning ? t('envSync.action.scanning') : `+ ${t('envSync.action.scanForFiles')}`}
          </button>
        ) : (
          <div className="rounded-lg border border-fleet-border p-4">
            {candidates.length === 0 ? (
              <p className="text-xs text-fleet-text-subtle">{t('envSync.config.noNewFiles')}</p>
            ) : (
              <div className="space-y-2">
                {candidates.map((path) => (
                  <label
                    key={path}
                    className="flex items-center gap-3 text-sm text-fleet-text-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(path)}
                      onChange={() => toggleCandidate(path)}
                    />
                    {path}
                  </label>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                disabled={selected.size === 0 || adding}
                className="inline-flex items-center gap-1.5 rounded-md bg-fleet-surface-3 px-3 py-1.5 text-xs text-fleet-text transition active:scale-[0.96] hover:bg-fleet-surface-3 disabled:text-fleet-text-subtle disabled:active:scale-100"
                onClick={() => void addSelected()}
              >
                {adding && <Loader2 size={12} className="animate-spin" />}
                {t('envSync.action.addSelected')}
              </button>
              <button
                className="text-xs text-fleet-text-muted transition-colors hover:text-fleet-text active:scale-[0.97]"
                onClick={closeScan}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EnvSyncModal({
  isOpen,
  onClose,
  cwd,
  pathContext
}: {
  isOpen: boolean;
  onClose: () => void;
  cwd: string | undefined;
  pathContext?: PathContext;
}): React.JSX.Element | null {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [repoDir, setRepoDir] = useState<string | null>(null);
  const [config, setConfig] = useState<EnvSyncConfig | null>(null);
  const [statuses, setStatuses] = useState<TargetStatus[]>([]);
  const [encAvailable, setEncAvailable] = useState(true);
  const [encBackend, setEncBackend] = useState<string | undefined>(undefined);
  const [secrets, setSecrets] = useState<RedactedEnvSyncSecrets>({
    globalPresent: false,
    repoOverrides: {},
    authRepoOverrides: {}
  });

  const reloadSecrets = useCallback(async (): Promise<void> => {
    setSecrets(await window.fleet.envSync.getSecrets());
  }, []);

  // Reload the config + statuses for the already-resolved repoDir. Notifies the
  // toolbar badge so it re-aggregates instead of going stale until a refresh.
  const reload = useCallback(async (): Promise<void> => {
    if (!repoDir) return;
    const cfg = await window.fleet.envSync.getConfig(repoDir);
    setConfig(cfg);
    setStatuses(cfg ? await window.fleet.envSync.status(repoDir) : []);
    window.dispatchEvent(new CustomEvent('env-sync:changed'));
  }, [repoDir]);

  // Secret/auth changes can flip a target between error and synced, so refresh
  // both the redacted secrets and the statuses (and thus the badge).
  const onSecretsChanged = useCallback(async (): Promise<void> => {
    await reloadSecrets();
    await reload();
  }, [reloadSecrets, reload]);

  // On open, resolve which repo dir this pane maps to and load its state.
  useEffect(() => {
    if (!isOpen) return;
    const run = createCancellation();
    setLoading(true);
    void (async () => {
      void window.fleet.envSync.encryptionAvailable().then((r) => {
        if (run.isCancelled()) return;
        setEncAvailable(r.available);
        setEncBackend(r.backend);
      });
      await reloadSecrets();
      if (run.isCancelled()) return;

      if (!cwd) {
        if (!run.isCancelled()) {
          setRepoDir(null);
          setConfig(null);
          setStatuses([]);
          setLoading(false);
        }
        return;
      }

      const discovered = await window.fleet.envSync.discover(cwd, pathContext);
      if (discovered) {
        const status = await window.fleet.envSync.status(discovered.repoDir);
        if (run.isCancelled()) return;
        setRepoDir(discovered.repoDir);
        setConfig(discovered.config);
        setStatuses(status);
      } else {
        // repoRoot stays posix for a WSL pane (Tier-3 contract); translate it so
        // the repoDir we hand to writeConfig/status is Windows-accessible, matching
        // the form discover() returns. Idempotent / passthrough for native panes.
        const { root } = await window.fleet.git.repoRoot(cwd, pathContext);
        if (run.isCancelled()) return;
        const resolved = root ?? cwd;
        setRepoDir(
          typeof pathContext === 'object'
            ? toWindowsAccessiblePath(resolved, pathContext)
            : resolved
        );
        setConfig(null);
        setStatuses([]);
      }
      if (!run.isCancelled()) setLoading(false);
    })();
    return () => {
      run.cancel();
    };
  }, [isOpen, cwd, pathContext, reloadSecrets]);

  // Focus the panel on open so the onKeyDown Escape handler receives keys.
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  const createConfig = async (next: EnvSyncConfig): Promise<void> => {
    if (!repoDir) return;
    try {
      await window.fleet.envSync.writeConfig(repoDir, next);
      await reload();
      showToast(t('envSync.config.created'));
    } catch (err) {
      showToast(
        t('envSync.config.createFailed', {
          error: err instanceof Error ? err.message : t('envSync.toast.unknown')
        }),
        { duration: 6000 }
      );
    }
  };

  const globalSummary = t(
    secrets.globalPresent
      ? 'envSync.globalSummary.passphraseSet'
      : 'envSync.globalSummary.noPassphrase',
    { auth: authSummary(t, secrets.globalAuth) }
  );

  // Effective AWS auth for the active repo: a per-repo override wins, else global.
  const repoAuthOverride = config ? secrets.authRepoOverrides[config.id] : undefined;
  const effectiveAuth = repoAuthOverride ?? secrets.globalAuth;
  const authIsOverride = Boolean(repoAuthOverride);

  return (
    <Overlay open={isOpen} onClose={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
        className="flex max-h-[85vh] w-[600px] flex-col overflow-hidden rounded-xl border border-fleet-border-strong bg-fleet-surface shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-fleet-border px-6 py-4">
          <h2 className="text-base font-semibold text-fleet-text">{t('pane.envSync')}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-fleet-text-subtle transition-colors hover:bg-fleet-surface-2 hover:text-fleet-text active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        {!loading && (
          <div className="flex items-center gap-2 border-b border-fleet-border bg-fleet-surface-2/40 px-6 py-2.5 text-xs">
            <KeyRound size={13} className="shrink-0 text-fleet-text-subtle" />
            <span className="text-fleet-text-muted">{t('envSync.auth.activeCredentials')}</span>
            <span className="truncate font-medium text-fleet-text">
              {authSummary(t, effectiveAuth)}
            </span>
            <span
              className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                authIsOverride
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'bg-fleet-surface-3/50 text-fleet-text-muted'
              }`}
            >
              {t(authIsOverride ? 'envSync.auth.repoOverride' : 'envSync.auth.global')}
            </span>
          </div>
        )}

        <div className="space-y-5 overflow-y-auto p-6">
          {!encAvailable && (
            <div className="rounded-lg border border-red-500/30 dark:border-red-700 bg-red-500/10 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
              {t('envSync.warning.encryptionUnavailable')}
            </div>
          )}
          {encAvailable && encBackend === 'basic_text' && (
            <div className="rounded-lg border border-amber-500/30 dark:border-amber-700 bg-amber-500/10 dark:bg-amber-950/40 p-4 text-sm text-amber-700 dark:text-amber-300">
              {t('envSync.warning.basicTextBackend', { backend: 'basic_text' })}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-fleet-text-subtle">{t('common.loading')}</p>
          ) : !repoDir ? (
            <p className="text-sm text-fleet-text-subtle">{t('envSync.modal.noActiveTerminal')}</p>
          ) : (
            <>
              {/* Primary: this repo. */}
              {config ? (
                <RepoManager
                  repoDir={repoDir}
                  config={config}
                  statuses={statuses}
                  reload={reload}
                />
              ) : (
                <InitForm repoDir={repoDir} onCreate={createConfig} />
              )}

              {/* Secondary: shared account settings, collapsed with a state summary. */}
              <Disclosure title={t('envSync.modal.globalAccount')} summary={globalSummary}>
                <Field label={t('envSync.passphrase.label')}>
                  <PassphraseControl
                    present={secrets.globalPresent}
                    encAvailable={encAvailable}
                    clearLabel="envSync.action.clear"
                    onChanged={onSecretsChanged}
                  />
                </Field>
                <Field label={t('envSync.auth.authentication')}>
                  <AuthControl
                    redacted={secrets.globalAuth}
                    encAvailable={encAvailable}
                    resetLabel="envSync.action.resetDefaultChain"
                    onChanged={onSecretsChanged}
                  />
                </Field>
              </Disclosure>

              {/* Advanced: per-repo overrides, only meaningful once a config exists. */}
              {config && (
                <Disclosure title={t('envSync.modal.advancedOverrides')}>
                  <Field label={t('envSync.passphrase.override')}>
                    <PassphraseControl
                      id={config.id}
                      present={Boolean(secrets.repoOverrides[config.id]?.present)}
                      encAvailable={encAvailable}
                      clearLabel="envSync.action.useGlobal"
                      onChanged={onSecretsChanged}
                    />
                  </Field>
                  <Field label={t('envSync.auth.override')}>
                    <RepoAuthOverride
                      id={config.id}
                      override={secrets.authRepoOverrides[config.id]}
                      globalAuth={secrets.globalAuth}
                      encAvailable={encAvailable}
                      onChanged={onSecretsChanged}
                    />
                  </Field>
                </Disclosure>
              )}
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
