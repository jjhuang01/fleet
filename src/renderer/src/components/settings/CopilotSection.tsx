import { useState, useEffect, useMemo } from 'react';
import { useSettingsStore } from '../../store/settings-store';
import { useWorkspaceStore } from '../../store/workspace-store';
import { useWorkspaceListStore } from '../../store/workspace-list-store';
import { useHookStatusStore } from '../../store/hook-status-store';
import type { HookState } from '../../store/hook-status-store';
import { resolveClaudeConfig } from '../../../../shared/claude-config';
import type { MessageKey } from '../../../../shared/i18n';
import { useTranslation } from '../../lib/i18n';
import { SettingRow } from './SettingRow';
import type { SettingsSectionProps } from './SettingsTab';

const SYSTEM_SOUNDS = [
  'Pop',
  'Ping',
  'Tink',
  'Glass',
  'Blow',
  'Bottle',
  'Frog',
  'Funk',
  'Hero',
  'Morse',
  'Purr',
  'Sosumi',
  'Submarine',
  'Basso'
];

const HOOK_SUMMARY: Record<HookState, MessageKey> = {
  checking: 'settings.copilot.hookChecking',
  installed: 'settings.copilot.hookInstalled',
  missing: 'settings.copilot.hookMissing',
  error: 'settings.copilot.hookError'
};

/**
 * One workspace's line in the connection summary.
 *
 * Read-only by design. Folders are chosen in Workspaces; repeating the editor
 * here is what left two pages disagreeing about the same setting. The status
 * comes from the same folder-keyed store the Workspaces page writes to, so
 * installing hooks there is reflected here without a reload.
 */
function ConnectionRow({
  label,
  folder,
  source,
  onManage
}: {
  label: string;
  folder: string;
  source: 'default' | 'custom';
  onManage: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const state = useHookStatusStore((s) => s.byFolder[folder]?.state) ?? 'checking';
  const check = useHookStatusStore((s) => s.check);

  useEffect(() => {
    check(folder);
  }, [folder, check]);

  return (
    <div className="border border-fleet-border-strong rounded px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-fleet-text-secondary truncate">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-fleet-text-subtle border border-fleet-border-strong rounded px-1 py-px shrink-0">
          {source === 'custom'
            ? t('settings.copilot.sourceCustom')
            : t('settings.copilot.sourceInherited')}
        </span>
        <span className="text-xs text-fleet-text-subtle ml-auto shrink-0">
          {t(HOOK_SUMMARY[state])}
        </span>
      </div>
      <p className="text-xs text-fleet-text-subtle mt-0.5 break-all">{folder}</p>
      <button
        onClick={onManage}
        className="mt-1 text-xs text-fleet-text-secondary underline underline-offset-2 hover:text-fleet-text transition"
      >
        {t('settings.copilot.manageWorkspaceConnection')}
      </button>
    </div>
  );
}

export function CopilotSection({ onNavigate }: SettingsSectionProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettingsStore();
  const activeWorkspaceId = useWorkspaceStore((s) => s.workspace.id);
  const workspaces = useWorkspaceListStore((s) => s.workspaces);
  const refreshList = useWorkspaceListStore((s) => s.refresh);
  const [claudeDetected, setClaudeDetected] = useState(true);

  useEffect(() => {
    void refreshList();
    window.fleet.copilot
      .serviceStatus()
      .then((st) => setClaudeDetected(st.claudeDetected))
      .catch(() => {});
  }, [refreshList]);

  const copilot = settings?.copilot;

  const shown = useMemo(() => {
    if (!copilot) return [];
    const scoped = copilot.showAllWorkspaces
      ? workspaces
      : workspaces.filter((w) => w.id === activeWorkspaceId);
    return scoped.map((ws) => ({
      ws,
      config: resolveClaudeConfig({
        defaultDir: copilot.claudeConfigDir,
        overrideDir: copilot.workspaceOverrides[ws.id]?.claudeConfigDir,
        homeDir: window.fleet.homeDir
      })
    }));
  }, [copilot, workspaces, activeWorkspaceId]);

  if (!settings || !copilot) return null;
  if (window.fleet.platform !== 'darwin') return null;

  const updateCopilot = (patch: Partial<typeof copilot>): void => {
    void updateSettings({ copilot: patch });
  };

  return (
    <div className="space-y-6">
      {/* Show Copilot */}
      <div>
        <SettingRow label={t('settings.copilot.enabled')}>
          <input
            type="checkbox"
            checked={copilot.enabled}
            onChange={(e) => updateCopilot({ enabled: e.target.checked })}
            className="fleet-accent-input"
          />
        </SettingRow>
        <p className="text-xs text-fleet-text-subtle mt-1">
          {t('settings.copilot.enabledDescription')}
        </p>
      </div>

      {/* Notification sound */}
      <div>
        <SettingRow label={t('settings.copilot.notificationSound')}>
          <select
            value={copilot.notificationSound}
            onChange={(e) => updateCopilot({ notificationSound: e.target.value })}
            className="bg-fleet-surface-2 text-sm text-fleet-text rounded px-2 py-1 border border-fleet-border-strong"
          >
            <option value="">{t('settings.copilot.notificationSoundNone')}</option>
            {SYSTEM_SOUNDS.map((sound) => (
              <option key={sound} value={sound}>
                {sound}
              </option>
            ))}
          </select>
        </SettingRow>
        <p className="text-xs text-fleet-text-subtle mt-1">
          {t('settings.copilot.notificationSoundDescription')}
        </p>
      </div>

      {/* Sessions to show */}
      <div>
        <SettingRow label={t('settings.copilot.sessionsToShow')}>
          <select
            value={copilot.showAllWorkspaces ? 'all' : 'active'}
            onChange={(e) => updateCopilot({ showAllWorkspaces: e.target.value === 'all' })}
            className="bg-fleet-surface-2 text-sm text-fleet-text rounded px-2 py-1 border border-fleet-border-strong"
          >
            <option value="all">{t('settings.copilot.allWorkspaces')}</option>
            <option value="active">{t('settings.copilot.activeWorkspaceOnly')}</option>
          </select>
        </SettingRow>
      </div>

      {/* Claude Code connection */}
      <div>
        <label className="text-sm text-fleet-text-secondary block mb-1">
          {t('settings.copilot.claudeCodeConnection')}
        </label>
        <p className="text-xs text-fleet-text-subtle mb-2">
          {t('settings.copilot.claudeCodeConnectionDescription')}
        </p>
        {!claudeDetected && (
          <div className="rounded bg-amber-900/30 border border-amber-700/50 px-2 py-1.5 mb-2">
            <span className="text-xs text-amber-400 block font-medium">
              {t('settings.copilot.claudeNotFound')}
            </span>
            <span className="text-xs text-amber-400/70 block">
              {t('settings.copilot.claudeInstall', {
                command: 'npm install -g @anthropic-ai/claude-code'
              })}
            </span>
          </div>
        )}
        {shown.length === 0 ? (
          <p className="text-xs text-fleet-text-subtle italic">
            {t('settings.copilot.noWorkspaces')}
          </p>
        ) : (
          <div className="space-y-1">
            {shown.map(({ ws, config }) => (
              <ConnectionRow
                key={ws.id}
                label={ws.label}
                folder={config.path}
                source={config.source}
                // Opens the row in Workspaces. It does not activate that
                // workspace - the user is reading settings, not switching work.
                onManage={() => onNavigate?.('workspaces', ws.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
