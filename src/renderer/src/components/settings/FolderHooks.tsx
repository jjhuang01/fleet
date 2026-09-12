import { useEffect } from 'react';
import { useHookStatusStore } from '../../store/hook-status-store';
import type { HookState } from '../../store/hook-status-store';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';

/** Fleet hooks exist only where the Copilot service does. */
export const HOOKS_SUPPORTED = window.fleet.platform === 'darwin';

const STATE_LABEL: Record<HookState, MessageKey> = {
  checking: 'settings.folderHooks.checking',
  installed: 'settings.folderHooks.installed',
  missing: 'settings.folderHooks.missing',
  error: 'settings.folderHooks.error'
};

// Amber for both "we do not know" states. Red is reserved for something being
// wrong, and missing hooks are optional Copilot setup, not a broken workspace.
const STATE_DOT: Record<HookState, string> = {
  checking: 'bg-fleet-text-subtle',
  installed: 'bg-green-500',
  missing: 'bg-fleet-text-subtle',
  error: 'bg-amber-500'
};

/**
 * Fleet hook install/remove for one Claude config folder.
 *
 * Used by the default-folder setting and by each expanded workspace row, so
 * that everything pointed at the same folder shows the same answer and one
 * install updates all of them - the status lives in a folder-keyed store, not
 * in this component.
 *
 * `sharedWith` names every workspace resolving to this folder. Passing more
 * than one name is what turns an install into an action the user is told
 * affects several workspaces before they take it.
 *
 * Renders nothing where Copilot does not run. `initCopilot` returns before
 * registering the hook IPC handlers off macOS, so every check there rejects -
 * which would fill the Workspaces page with failed checks and buttons that
 * cannot work. Choosing a config folder stays available on every platform;
 * only the Copilot-specific setup disappears.
 */
export function FolderHooks({
  folder,
  sharedWith = []
}: {
  folder: string;
  sharedWith?: string[];
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const entry = useHookStatusStore((s) => s.byFolder[folder]);
  const check = useHookStatusStore((s) => s.check);
  const install = useHookStatusStore((s) => s.install);
  const remove = useHookStatusStore((s) => s.remove);

  useEffect(() => {
    if (!HOOKS_SUPPORTED) return;
    check(folder);
  }, [folder, check]);

  const state = entry?.state ?? 'checking';
  const busy = entry?.busy ?? false;
  const installed = state === 'installed';
  // Nothing to install *to* until a check has come back, and offering "Remove"
  // for a folder we could not read would be a guess.
  const actionable = state === 'installed' || state === 'missing';

  // After the hooks above, not before: the early return has to come last so the
  // hook order stays the same on every render.
  if (!HOOKS_SUPPORTED) return null;

  return (
    <div>
      <label className="text-xs text-fleet-text-muted block mb-1">
        {t('settings.folderHooks.title')}
      </label>
      <p className="text-xs text-fleet-text-subtle mb-1.5">{t('settings.folderHooks.hint')}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATE_DOT[state]}`} />
        <span className="text-xs text-fleet-text-secondary">{t(STATE_LABEL[state])}</span>
        <button
          disabled={!actionable || busy}
          onClick={() => void (installed ? remove(folder) : install(folder))}
          className="px-2 py-0.5 text-xs bg-fleet-surface-3 hover:bg-fleet-surface-3 rounded border border-fleet-border-strong text-fleet-text-secondary transition active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy
            ? t('settings.folderHooks.working')
            : installed
              ? t('settings.folderHooks.remove')
              : t('settings.folderHooks.install')}
        </button>
        {state === 'error' && (
          <button
            onClick={() => check(folder)}
            className="px-2 py-0.5 text-xs text-fleet-text-secondary underline underline-offset-2 hover:text-fleet-text transition"
          >
            {t('settings.folderHooks.retry')}
          </button>
        )}
      </div>
      <p className="text-xs text-fleet-text-subtle mt-1 break-all">{folder}</p>
      {sharedWith.length > 1 && (
        <p className="text-xs text-amber-500/70 mt-1">
          {t('settings.folderHooks.shared', { names: sharedWith.join(' and ') })}
        </p>
      )}
    </div>
  );
}
