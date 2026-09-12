// src/renderer/src/components/env-sync/EnvSyncBadge.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';
import type { TargetStatus, TargetSyncState } from '../../../../shared/env-sync-types';
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

// 'error' ranks highest so an auth/config failure is never masked by a benign state.
const SYNC_STATE_ORDER: TargetSyncState[] = [
  'error',
  'conflict',
  'remote-ahead',
  'local-ahead',
  'remote-only',
  'local-only',
  'in-sync',
  'no-remote-no-local'
];

async function fetchAggState(
  cwd: string,
  pathContext?: PathContext
): Promise<TargetSyncState | null> {
  const repo = await window.fleet.envSync.discover(cwd, pathContext);
  if (!repo) return null;
  const statuses = await window.fleet.envSync.status(repo.repoDir);
  return SYNC_STATE_ORDER.find((s) => statuses.some((t: TargetStatus) => t.state === s)) ?? null;
}

/** Aggregate badge for the active tab's resolved repo. Pass the active tab cwd. */
export function EnvSyncBadge({
  cwd,
  pathContext
}: {
  cwd: string | undefined;
  pathContext?: PathContext;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const [agg, setAgg] = useState<TargetSyncState | null>(null);

  useEffect(() => {
    if (!cwd) {
      setAgg(null);
      return;
    }
    let active = true;
    const load = (): void => {
      fetchAggState(cwd, pathContext)
        .then((state) => {
          if (active) setAgg(state);
        })
        .catch(() => {
          if (active) setAgg('error');
        });
    };
    load();
    // Re-aggregate whenever the modal (or any flow) mutates env-sync state, so the
    // badge reflects fixes immediately instead of going stale until a refresh.
    window.addEventListener('env-sync:changed', load);
    return () => {
      active = false;
      window.removeEventListener('env-sync:changed', load);
    };
  }, [cwd, pathContext]);

  if (!agg || agg === 'no-remote-no-local') return null;

  const color =
    agg === 'conflict' || agg === 'error'
      ? 'bg-red-600'
      : agg === 'in-sync'
        ? 'bg-emerald-700 dark:bg-green-600'
        : 'bg-amber-700 dark:bg-amber-600';

  const glyph = agg === 'in-sync' ? '✓' : agg === 'conflict' ? '!' : agg === 'error' ? '⚠' : '↑↓';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white ${color}`}
      title={t('envSync.badge.title', { state: t(STATUS_LABEL[agg]) })}
    >
      {t('envSync.badge.label')} {glyph}
    </span>
  );
}
