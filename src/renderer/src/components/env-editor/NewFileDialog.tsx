import { useState } from 'react';
import { useTranslation } from '../../lib/i18n';

type Props = {
  groups: string[]; // distinct folder groups ('·root' for top level)
  onCancel: () => void;
  onCreate: (group: string, name: string) => void;
  error: string | null;
};

export function NewFileDialog({ groups, onCancel, onCreate, error }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [group, setGroup] = useState(groups[0] ?? '·root');
  const [name, setName] = useState('.env');

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 dark:bg-black/60"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] rounded-lg border border-fleet-border-strong bg-fleet-surface p-4 shadow-2xl"
      >
        <h3 className="mb-3 text-sm font-semibold text-fleet-text">
          {t('dialogs.envEditor.newFileTitle')}
        </h3>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-fleet-text-subtle">
          {t('dialogs.envEditor.folder')}
        </label>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="mb-3 w-full rounded-md border border-fleet-border-strong bg-fleet-surface-2 px-2 py-1.5 text-xs text-fleet-text outline-none focus:border-[color:var(--fleet-accent)]"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g === '·root' ? t('dialogs.envEditor.root') : g}
            </option>
          ))}
        </select>
        <label className="mb-1 block text-[10px] uppercase tracking-wide text-fleet-text-subtle">
          {t('dialogs.envEditor.fileName')}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCreate(group, name);
            else if (e.key === 'Escape') {
              e.stopPropagation();
              onCancel();
            }
          }}
          spellCheck={false}
          className="w-full rounded-md border border-fleet-border-strong bg-fleet-surface-2 px-2 py-1.5 font-mono text-xs text-fleet-text outline-none focus:border-[color:var(--fleet-accent)]"
        />
        {error && <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs text-fleet-text-secondary transition hover:bg-fleet-surface-2 active:scale-95"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onCreate(group, name)}
            disabled={!name.startsWith('.env')}
            className="rounded-md fleet-accent-bg px-3 py-1.5 text-xs font-medium text-white transition fleet-accent-bg-hover active:scale-95 disabled:opacity-50"
          >
            {t('common.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
