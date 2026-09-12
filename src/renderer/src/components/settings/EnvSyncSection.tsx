// src/renderer/src/components/settings/EnvSyncSection.tsx
import { useEffect, useState, useCallback } from 'react';
import { SettingRow } from './SettingRow';
import { useToastStore } from '../../store/toast-store';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';
import type {
  DiscoveredRepo,
  TargetStatus,
  TargetSyncState,
  RedactedEnvSyncSecrets,
  RedactedEnvSyncAuth,
  EnvSyncAuthMode,
  EnvSyncAuthInput,
  EnvSyncConfig,
  EnvSyncTarget
} from '../../../../shared/env-sync-types';
import type { PathContext } from '../../../../shared/shell-profiles';

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

const inputCls =
  'bg-fleet-surface-3 text-sm text-fleet-text rounded px-2 py-1 border border-fleet-border-strong';

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

  const save = async (): Promise<void> => {
    await window.fleet.envSync.setPassphrase({ id, passphrase: draft });
    setDraft('');
    await onChanged();
    showToast(t('envSync.passphrase.saved'));
  };
  const clear = async (): Promise<void> => {
    await window.fleet.envSync.clearPassphrase({ id });
    await onChanged();
  };

  return present ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-fleet-text-muted">{t('envSync.passphrase.set')}</span>
      <button
        className="text-xs text-red-400 transition active:scale-[0.97]"
        onClick={() => void clear()}
      >
        {t(clearLabel)}
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <input
        type="password"
        autoComplete="off"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t('envSync.passphrase.label')}
        className={inputCls}
      />
      <button
        disabled={!draft || !encAvailable}
        onClick={() => void save()}
        className="text-xs bg-fleet-surface-3 rounded px-2 py-1 disabled:text-fleet-text-subtle transition active:scale-[0.97] disabled:active:scale-100"
      >
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
    }
  };
  const reset = async (): Promise<void> => {
    await window.fleet.envSync.clearAuth({ id });
    await onChanged();
  };

  return (
    <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
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

      <div className="flex items-center gap-2">
        <button
          onClick={() => void save()}
          className="text-xs bg-fleet-surface-3 rounded px-2 py-1 transition active:scale-[0.97]"
        >
          {t('common.save')}
        </button>
        {redacted && (
          <button
            className="text-xs text-red-400 transition active:scale-[0.97]"
            onClick={() => void reset()}
          >
            {t(resetLabel)}
          </button>
        )}
      </div>
    </div>
  );
}

function RepoCard({
  repo,
  statuses,
  encAvailable,
  secrets,
  onChanged,
  onSecretsChanged,
  doSync
}: {
  repo: DiscoveredRepo;
  statuses: TargetStatus[];
  encAvailable: boolean;
  secrets: RedactedEnvSyncSecrets;
  onChanged: () => Promise<void>;
  onSecretsChanged: () => Promise<void>;
  doSync: (repoDir: string, envFile: string, dir: 'pull' | 'push') => Promise<void>;
}): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const { repoDir, config } = repo;

  const [editing, setEditing] = useState(false);
  const [bucketDraft, setBucketDraft] = useState(config.bucket);
  const [regionDraft, setRegionDraft] = useState(config.region);
  // null = scan panel closed; an array (possibly empty) = panel open with results.
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const saveConfig = async (next: EnvSyncConfig): Promise<boolean> => {
    try {
      await window.fleet.envSync.writeConfig(repoDir, next);
      await onChanged();
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
    if (await saveConfig({ ...config, bucket, region })) {
      setEditing(false);
      showToast(t('envSync.config.bucketRegionSaved'));
    }
  };

  const runScan = async (): Promise<void> => {
    const found = await window.fleet.envSync.scan(repoDir);
    const existing = new Set(config.targets.map((t) => t.envFile));
    const fresh = found.filter((f) => !existing.has(f));
    setCandidates(fresh);
    setSelected(new Set(fresh));
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
    if (await saveConfig({ ...config, targets: [...config.targets, ...additions] })) {
      closeScan();
      showToast(
        t(additions.length === 1 ? 'envSync.config.addedTarget' : 'envSync.config.addedTargets', {
          count: additions.length
        })
      );
    }
  };

  const changeDelivery = async (envFile: string, delivery: 'file' | 'inject'): Promise<void> => {
    const targets = config.targets.map((t) => (t.envFile === envFile ? { ...t, delivery } : t));
    await saveConfig({ ...config, targets });
  };

  return (
    <div className="rounded border border-fleet-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-fleet-text">{config.id}</span>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={bucketDraft}
              onChange={(e) => setBucketDraft(e.target.value)}
              placeholder={t('envSync.config.bucket')}
              className={`${inputCls} w-36`}
            />
            <input
              value={regionDraft}
              onChange={(e) => setRegionDraft(e.target.value)}
              placeholder={t('envSync.config.region')}
              className={`${inputCls} w-28`}
            />
            <button
              className="text-xs fleet-accent-text transition active:scale-[0.97]"
              onClick={() => void saveBucketRegion()}
            >
              {t('common.save')}
            </button>
            <button
              className="text-xs text-fleet-text-muted transition active:scale-[0.97]"
              onClick={() => setEditing(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fleet-text-subtle">
              {config.bucket} · {config.region}
            </span>
            <button
              className="text-xs fleet-accent-text transition active:scale-[0.97]"
              onClick={startEdit}
            >
              {t('envSync.action.edit')}
            </button>
          </div>
        )}
      </div>

      <table className="mt-2 w-full text-xs">
        <tbody>
          {statuses.map((target) => (
            <tr key={target.envFile} className="border-t border-fleet-border">
              <td className="py-1 text-fleet-text-secondary">{target.envFile}</td>
              <td className="py-1">
                <select
                  value={target.delivery}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'file' || v === 'inject') void changeDelivery(target.envFile, v);
                  }}
                  className="rounded border border-fleet-border-strong bg-fleet-surface-3 px-1 py-0.5 text-fleet-text-muted"
                >
                  <option value="file">{t('envSync.delivery.file')}</option>
                  <option value="inject">{t('envSync.delivery.inject')}</option>
                </select>
              </td>
              <td className="py-1 text-fleet-text-muted">{t(STATUS_LABEL[target.state])}</td>
              <td className="py-1 text-right">
                <button
                  className="text-xs fleet-accent-text mr-2 transition active:scale-[0.97]"
                  onClick={() => void doSync(repoDir, target.envFile, 'pull')}
                >
                  {t('envSync.action.pull')}
                </button>
                <button
                  className="text-xs fleet-accent-text transition active:scale-[0.97]"
                  onClick={() => void doSync(repoDir, target.envFile, 'push')}
                >
                  {t('envSync.action.push')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2">
        {candidates === null ? (
          <button
            className="text-xs fleet-accent-text transition active:scale-[0.97]"
            onClick={() => void runScan()}
          >
            {t('envSync.action.scanForFiles')}
          </button>
        ) : (
          <div className="rounded border border-fleet-border p-2">
            {candidates.length === 0 ? (
              <p className="text-xs text-fleet-text-subtle">{t('envSync.config.noNewFiles')}</p>
            ) : (
              <div className="space-y-1">
                {candidates.map((path) => (
                  <label
                    key={path}
                    className="flex items-center gap-2 text-xs text-fleet-text-secondary"
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
            <div className="mt-2 flex items-center gap-2">
              <button
                disabled={selected.size === 0}
                className="text-xs bg-fleet-surface-3 rounded px-2 py-1 disabled:text-fleet-text-subtle transition active:scale-[0.97] disabled:active:scale-100"
                onClick={() => void addSelected()}
              >
                {t('envSync.action.addSelected')}
              </button>
              <button
                className="text-xs text-fleet-text-muted transition active:scale-[0.97]"
                onClick={closeScan}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-fleet-border pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="w-32 text-xs text-fleet-text-subtle">
            {t('envSync.passphrase.override')}
          </span>
          <PassphraseControl
            id={config.id}
            present={Boolean(secrets.repoOverrides[config.id]?.present)}
            encAvailable={encAvailable}
            clearLabel="envSync.action.useGlobal"
            onChanged={onSecretsChanged}
          />
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="w-32 pt-1 text-xs text-fleet-text-subtle">
            {t('envSync.auth.override')}
          </span>
          <AuthControl
            id={config.id}
            redacted={secrets.authRepoOverrides[config.id]}
            encAvailable={encAvailable}
            resetLabel="envSync.action.useGlobalDefault"
            onChanged={onSecretsChanged}
          />
        </div>
      </div>
    </div>
  );
}

export function EnvSyncSection(): React.JSX.Element {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const [encAvailable, setEncAvailable] = useState(true);
  const [encBackend, setEncBackend] = useState<string | undefined>(undefined);
  const [secrets, setSecrets] = useState<RedactedEnvSyncSecrets>({
    globalPresent: false,
    repoOverrides: {},
    authRepoOverrides: {}
  });
  const [repos, setRepos] = useState<DiscoveredRepo[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TargetStatus[]>>({});

  const refreshSecrets = useCallback(async () => {
    setSecrets(await window.fleet.envSync.getSecrets());
  }, []);

  const refreshRepos = useCallback(async () => {
    const { workspaces } = await window.fleet.layout.list();
    // Keep each cwd's pane context so a WSL tab's posix cwd resolves correctly.
    const cwds = new Map<string, PathContext | undefined>();
    for (const ws of workspaces) {
      for (const tab of ws.tabs)
        if (tab.cwd && !cwds.has(tab.cwd)) cwds.set(tab.cwd, tab.pathContext);
    }
    const found = new Map<string, DiscoveredRepo>();
    for (const [cwd, ctx] of cwds) {
      const repo = await window.fleet.envSync.discover(cwd, ctx);
      if (repo) found.set(repo.repoDir, repo);
    }
    const list = Array.from(found.values());
    setRepos(list);
    const next: Record<string, TargetStatus[]> = {};
    for (const r of list) {
      next[r.repoDir] = await window.fleet.envSync.status(r.repoDir);
    }
    setStatuses(next);
  }, []);

  useEffect(() => {
    void window.fleet.envSync.encryptionAvailable().then((r) => {
      setEncAvailable(r.available);
      setEncBackend(r.backend);
    });
    void refreshSecrets();
    void refreshRepos();
  }, [refreshSecrets, refreshRepos]);

  const onSecretsChanged = useCallback(async (): Promise<void> => {
    await refreshSecrets();
    await refreshRepos();
  }, [refreshSecrets, refreshRepos]);

  const doSync = async (repoDir: string, envFile: string, dir: 'pull' | 'push'): Promise<void> => {
    const res =
      dir === 'pull'
        ? await window.fleet.envSync.pull(repoDir, envFile, false)
        : await window.fleet.envSync.push(repoDir, envFile, false);
    if (res.ok) {
      showToast(
        t(dir === 'pull' ? 'envSync.toast.pulled' : 'envSync.toast.pushed', { file: envFile })
      );
      await refreshRepos();
    } else if ('conflict' in res && res.conflict) {
      window.dispatchEvent(new CustomEvent('env-sync:conflict', { detail: { repoDir, envFile } }));
    } else {
      showToast(
        t('envSync.toast.syncFailed', {
          error: 'error' in res ? res.error : t('envSync.toast.unknown')
        }),
        { duration: 6000 }
      );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-fleet-text">{t('pane.envSync')}</h2>

      {!encAvailable && (
        <div className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
          {t('envSync.warning.encryptionUnavailable')}
        </div>
      )}

      {encAvailable && encBackend === 'basic_text' && (
        <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-300">
          {t('envSync.warning.basicTextBackend', { backend: 'basic_text' })}
        </div>
      )}

      <SettingRow label={t('envSync.passphrase.global')}>
        <PassphraseControl
          present={secrets.globalPresent}
          encAvailable={encAvailable}
          clearLabel="envSync.action.clear"
          onChanged={onSecretsChanged}
        />
      </SettingRow>

      <SettingRow label={t('envSync.auth.label')}>
        <AuthControl
          redacted={secrets.globalAuth}
          encAvailable={encAvailable}
          resetLabel="envSync.action.resetDefaultChain"
          onChanged={onSecretsChanged}
        />
      </SettingRow>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fleet-text-secondary">
          {t('envSync.config.projects')}
        </h3>
        {repos.length === 0 && (
          <p className="text-xs text-fleet-text-subtle">
            {t('envSync.config.noProjects', { file: '.fleet/env-sync.json' })}
          </p>
        )}
        {repos.map((repo) => (
          <RepoCard
            key={repo.repoDir}
            repo={repo}
            statuses={statuses[repo.repoDir] ?? []}
            encAvailable={encAvailable}
            secrets={secrets}
            onChanged={refreshRepos}
            onSecretsChanged={onSecretsChanged}
            doSync={doSync}
          />
        ))}
      </div>
    </div>
  );
}
