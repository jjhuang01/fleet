// src/renderer/src/components/env-sync/EnvSyncConflictDialog.tsx
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { Overlay } from '../Overlay';
import { useToastStore } from '../../store/toast-store';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';
import type { EnvDiff, EnvDiffEntry } from '../../../../shared/env-sync-types';

const ConflictTargetSchema = z.object({ repoDir: z.string().min(1), envFile: z.string().min(1) });
type ConflictTarget = z.infer<typeof ConflictTargetSchema>;

const CHANGE_LABEL: Record<EnvDiffEntry['change'], MessageKey> = {
  added: 'envSync.change.added',
  removed: 'envSync.change.removed',
  changed: 'envSync.change.changed',
  unchanged: 'envSync.change.unchanged'
};

export function EnvSyncConflictDialog(): React.JSX.Element | null {
  const showToast = useToastStore((s) => s.show);
  const { t } = useTranslation();
  const [target, setTarget] = useState<ConflictTarget | null>(null);
  const [diff, setDiff] = useState<EnvDiff | null>(null);
  // Held copy so the dialog body stays rendered through the exit animation.
  const [shown, setShown] = useState<ConflictTarget | null>(null);

  useEffect(() => {
    if (target) setShown(target);
  }, [target]);

  useEffect(() => {
    const onConflict = (e: Event): void => {
      if (!(e instanceof CustomEvent)) return;
      const parsed = ConflictTargetSchema.safeParse(e.detail);
      if (!parsed.success) return;
      setDiff(null);
      setTarget(parsed.data);
      void window.fleet.envSync.diff(parsed.data.repoDir, parsed.data.envFile).then((res) => {
        if (!res.ok && 'diff' in res) setDiff(res.diff);
      });
    };
    window.addEventListener('env-sync:conflict', onConflict);
    return () => window.removeEventListener('env-sync:conflict', onConflict);
  }, []);

  const resolve = async (choice: 'keep-local' | 'keep-remote'): Promise<void> => {
    if (!target) return;
    const res = await window.fleet.envSync.resolve(target.repoDir, target.envFile, choice);
    showToast(
      res.ok
        ? t('envSync.conflict.resolved', {
            file: target.envFile,
            choice: t(
              choice === 'keep-local'
                ? 'envSync.conflict.choiceKeepLocal'
                : 'envSync.conflict.choiceKeepRemote'
            )
          })
        : t('envSync.conflict.resolveFailed'),
      { duration: 5000 }
    );
    if (res.ok) window.dispatchEvent(new CustomEvent('env-sync:changed'));
    setTarget(null);
  };

  return (
    <Overlay open={target !== null} onClose={() => setTarget(null)}>
      <div className="w-[560px] max-h-[80vh] overflow-auto rounded-lg border border-fleet-border-strong bg-fleet-surface p-4">
        <h3 className="text-sm font-semibold text-fleet-text">
          {t('envSync.conflict.title', { file: shown?.envFile })}
        </h3>
        <p className="mt-1 text-xs text-fleet-text-subtle">{t('envSync.conflict.body')}</p>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-fleet-text-subtle">
              <th className="text-left">{t('envSync.conflict.key')}</th>
              <th className="text-left">{t('envSync.conflict.change')}</th>
              <th className="text-left">{t('envSync.conflict.local')}</th>
              <th className="text-left">{t('envSync.conflict.remote')}</th>
            </tr>
          </thead>
          <tbody>
            {(diff?.entries ?? [])
              .filter((e) => e.change !== 'unchanged')
              .map((e) => (
                <tr key={e.key} className="border-t border-fleet-border">
                  <td className="py-1 text-fleet-text-secondary">{e.key}</td>
                  <td className="py-1 text-fleet-text-subtle">{t(CHANGE_LABEL[e.change])}</td>
                  <td className="py-1 text-fleet-text-muted">{e.localMask ?? '—'}</td>
                  <td className="py-1 text-fleet-text-muted">{e.remoteMask ?? '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="text-xs px-3 py-1 rounded bg-fleet-surface-2 transition hover:bg-fleet-surface-3 active:scale-[0.97]"
            onClick={() => setTarget(null)}
          >
            {t('common.cancel')}
          </button>
          <button
            className="text-xs px-3 py-1 rounded bg-fleet-surface-3 transition hover:bg-fleet-surface-3 active:scale-[0.97]"
            onClick={() => void resolve('keep-remote')}
          >
            {t('envSync.conflict.keepRemote')}
          </button>
          <button
            className="text-xs px-3 py-1 rounded fleet-accent-bg transition fleet-accent-bg-hover active:scale-[0.97]"
            onClick={() => void resolve('keep-local')}
          >
            {t('envSync.conflict.keepLocal')}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
