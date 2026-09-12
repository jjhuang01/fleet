import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Folder,
  ChevronDown,
  Table,
  Code,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Loader2,
  FilePlus2
} from 'lucide-react';
import { useToastStore } from '../../store/toast-store';
import { NewFileDialog } from './NewFileDialog';
import { FileNavigator } from './FileNavigator';
import { EnvForm } from './EnvForm';
import { EnvRawEditor } from './EnvRawEditor';
import type { EnvFileEntry } from '../../../../shared/env-editor-types';
import type { PathContext } from '../../../../shared/shell-profiles';
import {
  parseEnvFile,
  serializeEnvFile,
  type EnvLine,
  type ParsedEnvFile
} from '../../../../shared/env-parse';
import { createCancellation } from '../../lib/cancellation';
import { useTranslation } from '../../lib/i18n';

const RAW_ONLY_BYTES = 256 * 1024;

export function EnvEditorModal({
  isOpen,
  onClose,
  cwd,
  paneId,
  pathContext
}: {
  isOpen: boolean;
  onClose: () => void;
  cwd: string | undefined;
  paneId: string | null;
  pathContext?: PathContext;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<string | undefined>(cwd);
  const [files, setFiles] = useState<EnvFileEntry[]>([]);
  const [selected, setSelected] = useState<EnvFileEntry | null>(null);
  const [parsed, setParsed] = useState<ParsedEnvFile | null>(null);
  const [originalText, setOriginalText] = useState('');
  const mtimeMsRef = useRef(0);
  const [revealAll, setRevealAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'form' | 'raw'>('form');
  const [rawText, setRawText] = useState('');
  const showToast = useToastStore((s) => s.show);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFileError, setNewFileError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!root) {
      setFiles([]);
      return;
    }
    const list = await window.fleet.envEditor.list(root, pathContext);
    setFiles(list);
  }, [root, pathContext]);

  // On open, resolve the pane's live cwd (in case the folder was renamed/moved
  // out from under the cached path), then list from it — one round-trip, no
  // stale-root flash.
  useEffect(() => {
    if (!isOpen) return;
    const run = createCancellation();
    setError(null);
    setExternalChange(false);
    void (async () => {
      let activeRoot = cwd;
      if (paneId) {
        const live = await window.fleet.pty.resolveCwd(paneId, pathContext);
        if (run.isCancelled()) return;
        if (live) activeRoot = live;
      }
      setRoot(activeRoot);
      const list = activeRoot ? await window.fleet.envEditor.list(activeRoot, pathContext) : [];
      if (!run.isCancelled()) setFiles(list);
    })();
    return () => {
      run.cancel();
    };
  }, [isOpen, cwd, paneId, pathContext]);

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const run = createCancellation();
    setRevealed(new Set());
    setRevealAll(false);
    setError(null);
    setExternalChange(false);
    if (!selected) {
      setParsed(null);
      setOriginalText('');
      setRawText('');
      setMode('form');
      return;
    }
    void window.fleet.envEditor
      .read(selected.absPath)
      .then((res) => {
        if (run.isCancelled()) return;
        setOriginalText(res.text);
        mtimeMsRef.current = res.mtimeMs;
        setParsed(parseEnvFile(res.text));
        setRawText(res.text);
        setMode('form');
      })
      .catch((e) => {
        if (run.isCancelled()) return;
        setError(e instanceof Error ? e.message : t('dialogs.envEditor.readFailed'));
      });
    return () => {
      run.cancel();
    };
  }, [selected, t]);

  const setLines = useCallback(
    (lines: EnvLine[]) => setParsed((p) => (p ? { ...p, lines } : p)),
    []
  );

  const toggleReveal = useCallback((index: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Works in both modes: in raw mode onRawChange keeps `parsed` in sync, and
  // serializeEnvFile(parseEnvFile(x)) === x is a round-trip invariant of the parser.
  const dirty = parsed !== null && serializeEnvFile(parsed) !== originalText;

  const rawOnly = originalText.length > RAW_ONLY_BYTES;
  const effectiveMode = rawOnly ? 'raw' : mode;

  const onRawChange = useCallback((text: string) => {
    setRawText(text);
    setParsed(parseEnvFile(text));
  }, []);

  const showForm = useCallback(() => setMode('form'), []);
  const showRaw = useCallback(() => {
    if (parsed) setRawText(serializeEnvFile(parsed));
    setMode('raw');
  }, [parsed]);

  const pickFolder = useCallback(async () => {
    const dir = await window.fleet.showFolderPicker();
    if (dir !== null) {
      setSelected(null);
      setRoot(dir);
      const list = await window.fleet.envEditor.list(dir, pathContext);
      setFiles(list);
    }
  }, [pathContext]);

  const writeFile = useCallback(
    async (force: boolean) => {
      if (!selected || !parsed || saving) return;
      const text = serializeEnvFile(parsed);
      setSaving(true);
      setError(null);
      try {
        const res = await window.fleet.envEditor.write(
          selected.absPath,
          text,
          force ? undefined : mtimeMsRef.current
        );
        if (!res.ok && res.externalChange) {
          setExternalChange(true);
          return;
        }
        if (!res.ok && res.missingDir) {
          showToast(t('dialogs.envEditor.folderMissing'));
          return;
        }
        setOriginalText(text);
        mtimeMsRef.current = res.mtimeMs;
        setExternalChange(false);
        void reload(); // refresh var counts
        showToast(t('dialogs.envEditor.saved'));
      } catch (e) {
        setError(e instanceof Error ? e.message : t('dialogs.envEditor.saveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [selected, parsed, saving, reload, showToast, t]
  );

  const save = useCallback(() => {
    void writeFile(false);
  }, [writeFile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, dirty, save]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm(t('dialogs.envEditor.discardChanges'))) return;
    onClose();
  }, [dirty, onClose, t]);

  const selectFile = useCallback(
    (file: EnvFileEntry) => {
      if (dirty && !window.confirm(t('dialogs.envEditor.discardFileChanges'))) return;
      setSelected(file);
    },
    [dirty, t]
  );

  const dialogGroups = (() => {
    const gs = Array.from(new Set(files.map((f) => f.group)));
    return gs.length ? gs : ['·root'];
  })();

  const createFile = useCallback(
    async (group: string, name: string) => {
      if (!root) return;
      setNewFileError(null);
      try {
        const dir = group === '·root' ? root : `${root}/${group}`;
        const { absPath } = await window.fleet.envEditor.create(dir, name, pathContext);
        const list = await window.fleet.envEditor.list(root, pathContext);
        setFiles(list);
        setNewFileOpen(false);
        const created = list.find((f) => f.absPath === absPath) ?? null;
        if (created) setSelected(created);
      } catch (e) {
        setNewFileError(e instanceof Error ? e.message : t('dialogs.envEditor.createFailed'));
      }
    },
    [root, pathContext, t]
  );

  const renameFile = useCallback(
    async (file: EnvFileEntry, newName: string) => {
      if (!root || newName === file.name) return;
      if (!newName.startsWith('.env')) {
        showToast(t('dialogs.envEditor.fileNamePrefix'));
        return;
      }
      try {
        const { absPath } = await window.fleet.envEditor.rename(file.absPath, newName);
        const list = await window.fleet.envEditor.list(root, pathContext);
        setFiles(list);
        if (selected?.absPath === file.absPath) {
          setSelected(list.find((f) => f.absPath === absPath) ?? null);
        }
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('dialogs.envEditor.renameFailed'));
      }
    },
    [root, selected, showToast, pathContext, t]
  );

  const deleteFile = useCallback(
    async (file: EnvFileEntry) => {
      try {
        const { trashPath } = await window.fleet.envEditor.delete(file.absPath);
        if (selected?.absPath === file.absPath) setSelected(null);
        await reload();
        showToast(t('dialogs.envEditor.deletedFile', { path: file.relPath }), {
          action: {
            label: t('dialogs.envEditor.undo'),
            onClick: () => {
              void window.fleet.envEditor.restore(trashPath, file.absPath).then(() => {
                void reload();
              });
            }
          }
        });
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('dialogs.envEditor.deleteFailed'));
      }
    },
    [reload, selected, showToast, t]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 duration-150 animate-in fade-in-0"
      onClick={requestClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            requestClose();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-[860px] flex-col overflow-hidden rounded-xl border border-fleet-border-strong bg-fleet-surface shadow-2xl duration-150 animate-in fade-in-0 zoom-in-95"
      >
        <div className="flex items-center gap-3 border-b border-fleet-border px-5 py-3">
          <h2 className="text-base font-semibold text-fleet-text">
            {t('dialogs.envEditor.title')}
          </h2>
          <button
            onClick={() => void pickFolder()}
            title={root}
            className="flex items-center gap-1.5 rounded-md bg-fleet-surface-2 px-2.5 py-1 text-xs text-fleet-text-secondary transition hover:bg-fleet-surface-3 active:scale-[0.98]"
          >
            <Folder size={13} />
            <span className="max-w-[260px] truncate">
              {root ? basenameOf(root) : t('dialogs.envEditor.openFolder')}
            </span>
            <ChevronDown size={13} className="text-fleet-text-subtle" />
          </button>
          <button
            onClick={() => save()}
            disabled={!dirty || saving}
            title={t('dialogs.envEditor.saveTitle')}
            className="ml-auto inline-flex items-center gap-2 rounded-md fleet-accent-bg px-3 py-1.5 text-xs font-medium text-white transition active:scale-[0.97] fleet-accent-bg-hover disabled:opacity-50 disabled:active:scale-100"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {t('common.save')}
          </button>
          <button
            onClick={requestClose}
            className="rounded-md p-1.5 text-fleet-text-subtle transition-colors hover:bg-fleet-surface-2 hover:text-fleet-text active:scale-90"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <FileNavigator
            files={files}
            selectedPath={selected?.absPath ?? null}
            dirtyPaths={dirty && selected ? new Set([selected.absPath]) : new Set()}
            onSelect={selectFile}
            onNewFile={() => {
              setNewFileError(null);
              setNewFileOpen(true);
            }}
            onRename={(file, newName) => void renameFile(file, newName)}
            onDelete={(file) => void deleteFile(file)}
          />
          <div className="relative flex min-h-0 flex-1 flex-col">
            {error && (
              <div className="flex items-center gap-2 border-b border-red-500/30 dark:border-red-800 bg-red-500/10 dark:bg-red-950/40 px-4 py-2 text-xs text-red-700 dark:text-red-300">
                <AlertTriangle size={13} /> {error}
              </div>
            )}
            {externalChange && (
              <div className="flex items-center gap-2 border-b border-amber-500/30 dark:border-amber-800 bg-amber-500/10 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle size={13} />
                {t('dialogs.envEditor.externalChanged')}
                <button
                  onClick={() => {
                    setExternalChange(false);
                    // Shallow-clone selected to force the [selected] loader effect to re-read from disk.
                    setSelected((s) => (s ? { ...s } : s));
                  }}
                  className="font-medium underline active:scale-95"
                >
                  {t('dialogs.envEditor.reload')}
                </button>
                <button
                  onClick={() => {
                    void writeFile(true);
                  }}
                  className="font-medium underline active:scale-95"
                >
                  {t('dialogs.envEditor.overwrite')}
                </button>
              </div>
            )}
            {selected && (
              <div className="flex items-center gap-2 border-b border-fleet-border px-4 py-2">
                <span className="font-mono text-xs text-fleet-text">{selected.name}</span>
                {selected.isTemplate && (
                  <span className="rounded bg-fleet-surface-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-fleet-text-subtle">
                    {t('dialogs.envEditor.template')}
                  </span>
                )}
                {dirty && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    {t('dialogs.envEditor.unsaved')}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {effectiveMode !== 'raw' && (
                    <button
                      onClick={() => setRevealAll((v) => !v)}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-fleet-text-secondary transition hover:bg-fleet-surface-2 active:scale-95"
                    >
                      {revealAll ? <EyeOff size={13} /> : <Eye size={13} />}
                      {revealAll
                        ? t('dialogs.envEditor.hideAll')
                        : t('dialogs.envEditor.revealAll')}
                    </button>
                  )}
                  {!rawOnly && (
                    <div className="flex overflow-hidden rounded-md border border-fleet-border-strong text-xs">
                      <button
                        onClick={showForm}
                        className={`flex items-center gap-1 px-2.5 py-1 transition active:scale-95 ${
                          mode === 'form'
                            ? 'fleet-accent-bg text-white'
                            : 'text-fleet-text-muted hover:bg-fleet-surface-2'
                        }`}
                      >
                        <Table size={12} /> {t('dialogs.envEditor.form')}
                      </button>
                      <button
                        onClick={showRaw}
                        className={`flex items-center gap-1 px-2.5 py-1 transition active:scale-95 ${
                          mode === 'raw'
                            ? 'fleet-accent-bg text-white'
                            : 'text-fleet-text-muted hover:bg-fleet-surface-2'
                        }`}
                      >
                        <Code size={12} /> {t('dialogs.envEditor.raw')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {selected && parsed ? (
              effectiveMode === 'raw' ? (
                <EnvRawEditor text={rawText} onChange={onRawChange} />
              ) : (
                <EnvForm
                  lines={parsed.lines}
                  revealAll={revealAll}
                  revealed={revealed}
                  onToggleReveal={toggleReveal}
                  onResetReveal={() => setRevealed(new Set())}
                  onChange={setLines}
                />
              )
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <FilePlus2 size={28} className="text-fleet-text-subtle" />
                <p className="text-sm text-fleet-text-muted">
                  {files.length === 0
                    ? t('dialogs.envEditor.noFiles')
                    : t('dialogs.envEditor.selectFile')}
                </p>
                {files.length === 0 && (
                  <button
                    onClick={() => {
                      setNewFileError(null);
                      setNewFileOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-md fleet-accent-bg px-4 py-2 text-sm font-medium text-white transition fleet-accent-bg-hover active:scale-[0.97]"
                  >
                    <FilePlus2 size={15} /> {t('dialogs.envEditor.createFile')}
                  </button>
                )}
              </div>
            )}
            {newFileOpen && (
              <NewFileDialog
                groups={dialogGroups}
                error={newFileError}
                onCancel={() => setNewFileOpen(false)}
                onCreate={(group, name) => void createFile(group, name)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function basenameOf(dir: string): string {
  const parts = dir.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? dir;
}
