import { useCallback, useEffect, useState } from 'react';
import type { LearningsStatus } from '../../../../shared/learnings';
import { useTranslation } from '../../lib/i18n';
import type { MessageKey } from '../../../../shared/i18n';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function statusLabelKey(status: LearningsStatus | null): MessageKey {
  if (!status) return 'learnings.status.checking';
  if (!status.vectorSupport) return 'learnings.status.keywordOnlyVector';
  switch (status.embedder) {
    case 'ready':
      return 'learnings.status.active';
    case 'loading':
    case 'idle':
      return 'learnings.status.preparing';
    case 'failed':
      return 'learnings.status.keywordOnlyModel';
  }
}

export function LearningsSection(): React.JSX.Element {
  const { t } = useTranslation();
  const [status, setStatus] = useState<LearningsStatus | null>(null);
  const [cacheBytes, setCacheBytes] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const [s, size] = await Promise.all([
      window.fleet.learnings.status(),
      window.fleet.learnings.modelCacheSize()
    ]);
    setStatus(s);
    setCacheBytes(size);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clearCache = useCallback(async (): Promise<void> => {
    if (!window.confirm(t('settings.learnings.confirmClear'))) return;
    setClearing(true);
    try {
      await window.fleet.learnings.clearModelCache();
      await load();
    } finally {
      setClearing(false);
    }
  }, [load, t]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-fleet-text mb-1">
          {t('settings.learnings.title')}
        </h2>
        <p className="text-sm text-fleet-text-muted">{t('settings.learnings.body')}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-fleet-text-secondary">
          {t('settings.learnings.semantic')}
        </h3>
        <div className="flex items-center justify-between">
          <label className="text-sm text-fleet-text-muted">{t('settings.learnings.status')}</label>
          <span className="text-sm text-fleet-text">{t(statusLabelKey(status))}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-fleet-text-muted block">
              {t('settings.learnings.modelCache')}
            </label>
            <span className="text-xs text-fleet-text-subtle">
              {t('settings.learnings.modelCacheNote')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-fleet-text">
              {cacheBytes === null ? '…' : formatBytes(cacheBytes)}
            </span>
            <button
              onClick={() => void clearCache()}
              disabled={clearing || !cacheBytes}
              className="px-2.5 py-1 text-sm rounded-md bg-fleet-surface-3 border border-fleet-border-strong text-fleet-text hover:bg-fleet-surface-3 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition"
            >
              {clearing ? t('settings.learnings.clearing') : t('settings.learnings.clearCache')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
