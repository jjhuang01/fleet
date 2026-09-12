import { Fragment, useMemo, useState } from 'react';
import { Search, FilePlus2, Pencil, Trash2 } from 'lucide-react';
import type { EnvFileEntry } from '../../../../shared/env-editor-types';
import { useTranslation } from '../../lib/i18n';

type Props = {
  files: EnvFileEntry[];
  selectedPath: string | null;
  dirtyPaths: Set<string>;
  onSelect: (file: EnvFileEntry) => void;
  onNewFile: () => void;
  onRename: (file: EnvFileEntry, newName: string) => void;
  onDelete: (file: EnvFileEntry) => void;
};

export function FileNavigator({
  files,
  selectedPath,
  dirtyPaths,
  onSelect,
  onNewFile,
  onRename,
  onDelete
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q ? files.filter((f) => f.relPath.toLowerCase().includes(q)) : files;
    const byGroup = new Map<string, EnvFileEntry[]>();
    for (const f of filtered) {
      const arr = byGroup.get(f.group) ?? [];
      arr.push(f);
      byGroup.set(f.group, arr);
    }
    return Array.from(byGroup.entries());
  }, [files, filter]);

  return (
    <div className="flex w-[230px] shrink-0 flex-col border-r border-fleet-border bg-fleet-surface">
      <div className="border-b border-fleet-border p-2">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fleet-text-subtle"
          />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('dialogs.envEditor.filterPlaceholder')}
            className="w-full rounded-md border border-fleet-border-strong bg-fleet-surface-2 py-1.5 pl-7 pr-2 text-xs text-fleet-text transition-colors focus:border-[color:var(--fleet-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {groups.length === 0 ? (
          <p className="px-3 py-4 text-xs text-fleet-text-subtle">
            {filter ? t('dialogs.envEditor.noMatch') : t('dialogs.envEditor.noEnvFiles')}
          </p>
        ) : (
          groups.map(([group, entries]) => (
            <Fragment key={group}>
              <div className="px-3 pb-1 pt-3 text-[9px] font-medium uppercase tracking-wider text-fleet-text-subtle">
                {group === '·root' ? t('dialogs.envEditor.root') : group}
              </div>
              {entries.map((f) => {
                const selected = f.absPath === selectedPath;
                const dirty = dirtyPaths.has(f.absPath);
                return (
                  <button
                    key={f.absPath}
                    onClick={() => onSelect(f)}
                    disabled={!f.readable}
                    title={f.readable ? f.relPath : t('dialogs.envEditor.cannotRead')}
                    className={`group flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-xs transition-colors active:scale-[0.98] ${
                      selected
                        ? 'bg-fleet-accent-bg-soft font-semibold text-fleet-text shadow-[inset_3px_0_0_0_var(--fleet-accent)]'
                        : 'text-fleet-text-secondary hover:bg-fleet-surface-2'
                    } ${f.isTemplate ? (selected ? 'italic' : 'italic text-fleet-text-subtle') : ''} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {renaming === f.absPath ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRename(f, draft);
                            setRenaming(null);
                          } else if (e.key === 'Escape') {
                            setRenaming(null);
                          }
                        }}
                        onBlur={() => setRenaming(null)}
                        spellCheck={false}
                        className="w-full rounded border border-[color:var(--fleet-accent)] bg-fleet-surface-2 px-1 py-0.5 font-mono text-xs text-fleet-text outline-none"
                      />
                    ) : (
                      <>
                        <span className="truncate">{f.name}</span>
                        {dirty && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                            aria-label={t('dialogs.envEditor.unsavedChanges')}
                          />
                        )}
                        <span className="ml-auto flex items-center gap-1">
                          <span className="text-[9px] text-fleet-text-subtle group-hover:hidden">
                            {f.varCount}
                          </span>
                          <span className="hidden items-center gap-1 group-hover:flex">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDraft(f.name);
                                setRenaming(f.absPath);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDraft(f.name);
                                  setRenaming(f.absPath);
                                }
                              }}
                              title={t('common.rename')}
                              className="rounded p-0.5 text-fleet-text-subtle transition hover:text-fleet-text active:scale-90"
                            >
                              <Pencil size={11} />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(f);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onDelete(f);
                                }
                              }}
                              title={t('common.delete')}
                              className="rounded p-0.5 text-fleet-text-subtle transition hover:text-red-600 dark:hover:text-red-400 active:scale-90"
                            >
                              <Trash2 size={11} />
                            </span>
                          </span>
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </Fragment>
          ))
        )}
      </div>

      <div className="border-t border-fleet-border p-2">
        <button
          onClick={onNewFile}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-fleet-surface-2 py-1.5 text-xs text-fleet-text transition hover:bg-fleet-surface-3 active:scale-[0.98]"
        >
          <FilePlus2 size={13} /> {t('dialogs.envEditor.newFileTitle')}
        </button>
      </div>
    </div>
  );
}
