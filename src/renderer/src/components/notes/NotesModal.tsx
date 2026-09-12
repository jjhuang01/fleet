import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  Folder,
  Columns2,
  Code,
  Eye,
  Check,
  Loader2,
  AlertTriangle,
  NotebookPen
} from 'lucide-react';
import { basename } from '../../lib/path-utils';
import type { NoteReadResult } from '../../../../shared/notes-types';
import type { PathContext } from '../../../../shared/shell-profiles';
import { createCancellation } from '../../lib/cancellation';
import { useTranslation } from '../../lib/i18n';

type Layout = 'split' | 'editor' | 'preview';

const AUTOSAVE_DELAY_MS = 800;

// This modal is mounted for the whole session but renders nothing until opened,
// so importing the preview eagerly would put react-markdown and the whole of
// highlight.js in the startup parse for a pane most windows never open. The
// import fires on first open instead, once `isOpen` lets the tree render.
const MarkdownPreview = lazy(async () => ({
  default: (await import('../markdown/MarkdownPreview')).MarkdownPreview
}));

/**
 * Per-project Markdown notes. Keyed by the pane's repo root (or the folder
 * itself when not a repo), stored centrally under ~/.fleet/notes/. Autosaves as
 * you type; the same note appears from any subfolder of the project.
 */
export function NotesModal({
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scopePath, setScopePath] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [externalChange, setExternalChange] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('split');

  // Refs mirror state so the debounced autosave reads current values without
  // re-subscribing on every keystroke.
  const textRef = useRef('');
  const originalTextRef = useRef('');
  const mtimeMsRef = useRef(0);
  const scopeRef = useRef<string | undefined>(undefined);

  const dirty = text !== originalText;
  const projectName = scopePath ? basename(scopePath) : '';

  const applyLoadedNote = useCallback((res: NoteReadResult) => {
    setText(res.text);
    setOriginalText(res.text);
    textRef.current = res.text;
    originalTextRef.current = res.text;
    mtimeMsRef.current = res.mtimeMs;
  }, []);

  const save = useCallback(
    async (force: boolean) => {
      const scope = scopeRef.current;
      if (!scope) return;
      const toSave = textRef.current;
      if (toSave === originalTextRef.current && !force) return;
      setSaving(true);
      setError(null);
      try {
        const res = await window.fleet.notes.write(
          scope,
          toSave,
          force ? undefined : mtimeMsRef.current,
          pathContext
        );
        // A different note may have loaded while the write was in flight (pane
        // switch / project change) — don't apply this result over it.
        if (scopeRef.current !== scope) return;
        if (!res.ok) {
          setExternalChange(true);
          return;
        }
        originalTextRef.current = toSave;
        setOriginalText(toSave);
        mtimeMsRef.current = res.mtimeMs;
        setExternalChange(false);
      } catch (e) {
        if (scopeRef.current === scope) {
          setError(e instanceof Error ? e.message : t('dialogs.notes.saveFailed'));
        }
      } finally {
        setSaving(false);
      }
    },
    [pathContext, t]
  );

  // On open (and if the pane later moves to a different project): resolve the
  // pane's live cwd, then its repo root (fallback to the folder), then load that
  // project's note. A live `cd` *within* the same project fires a cwd change but
  // resolves to the same scope — we skip reloading then, so it never clobbers
  // unsaved edits.
  useEffect(() => {
    if (!isOpen) return;
    const run = createCancellation();
    void (async () => {
      let base = cwd;
      if (paneId) {
        const live = await window.fleet.pty.resolveCwd(paneId, pathContext);
        if (run.isCancelled()) return;
        if (live) base = live;
      }
      let scope = base;
      if (base) {
        try {
          const { root } = await window.fleet.git.repoRoot(base, pathContext);
          if (!run.isCancelled() && root) scope = root;
        } catch {
          /* not a repo / git unavailable — key on the folder itself */
        }
      }
      if (run.isCancelled() || scope === scopeRef.current) return;
      // Switching to a different project: flush any unsaved edit to the previous
      // note before swapping the buffer.
      if (scopeRef.current && textRef.current !== originalTextRef.current) {
        await save(false);
        if (run.isCancelled()) return;
      }
      setLoading(true);
      setError(null);
      setExternalChange(false);
      setScopePath(scope);
      scopeRef.current = scope;
      if (!scope) {
        setLoading(false);
        return;
      }
      try {
        const res = await window.fleet.notes.read(scope, pathContext);
        if (run.isCancelled()) return;
        applyLoadedNote(res);
      } catch (e) {
        if (!run.isCancelled()) {
          setError(e instanceof Error ? e.message : t('dialogs.notes.loadFailed'));
        }
      } finally {
        if (!run.isCancelled()) setLoading(false);
      }
    })();
    return () => {
      run.cancel();
    };
  }, [isOpen, cwd, paneId, pathContext, save, applyLoadedNote, t]);

  useEffect(() => {
    if (isOpen && layout !== 'preview') textareaRef.current?.focus();
  }, [isOpen, loading, layout]);

  // Debounced autosave: schedule a write shortly after typing stops.
  useEffect(() => {
    if (loading || !dirty) return;
    const t = setTimeout(() => void save(false), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [text, dirty, loading, save]);

  const reload = useCallback(async () => {
    const scope = scopeRef.current;
    if (!scope) return;
    const res = await window.fleet.notes.read(scope, pathContext);
    applyLoadedNote(res);
    setExternalChange(false);
  }, [pathContext, applyLoadedNote]);

  const requestClose = useCallback(async () => {
    // Flush any pending edit before closing. If the save fails (an external-change
    // conflict or a write error), stay open so its banner is visible rather than
    // closing over silently-lost edits — save() leaves the note dirty on failure.
    if (textRef.current !== originalTextRef.current) {
      await save(false);
      if (textRef.current !== originalTextRef.current) return;
    }
    onClose();
  }, [save, onClose]);

  const onChange = useCallback((value: string) => {
    setText(value);
    textRef.current = value;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, save]);

  if (!isOpen) return null;

  const showEditor = layout !== 'preview';
  const showPreview = layout !== 'editor';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 dark:bg-black/60 duration-150 animate-in fade-in-0"
      onClick={() => void requestClose()}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            void requestClose();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-[1000px] max-w-[92vw] flex-col overflow-hidden rounded-xl border border-fleet-border-strong bg-fleet-surface shadow-2xl duration-150 animate-in fade-in-0 zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-fleet-border px-5 py-3">
          <div className="flex items-center gap-2 text-fleet-text">
            <NotebookPen size={16} className="text-fleet-text-muted" />
            <h2 className="text-base font-semibold">{t('dialogs.notes.title')}</h2>
          </div>
          {scopePath && (
            <div
              title={scopePath}
              className="flex items-center gap-1.5 rounded-md bg-fleet-surface-2 px-2.5 py-1 text-xs text-fleet-text-secondary"
            >
              <Folder size={13} />
              <span className="max-w-[260px] truncate">{projectName}</span>
            </div>
          )}

          {/* Save status */}
          <div className="flex min-w-[76px] items-center gap-1.5 text-xs">
            {saving ? (
              <span className="flex items-center gap-1.5 text-fleet-text-muted">
                <Loader2 size={12} className="animate-spin" /> {t('dialogs.notes.saving')}
              </span>
            ) : dirty ? (
              <span className="text-amber-700 dark:text-amber-400">
                ● {t('dialogs.notes.unsaved')}
              </span>
            ) : text.length > 0 ? (
              <span className="flex items-center gap-1 text-fleet-text-muted">
                <Check size={12} /> {t('dialogs.notes.saved')}
              </span>
            ) : null}
          </div>

          {/* Layout toggle */}
          <div className="ml-auto flex overflow-hidden rounded-md border border-fleet-border-strong text-xs">
            {(
              [
                ['editor', Code, 'dialogs.notes.layout.editor'],
                ['split', Columns2, 'dialogs.notes.layout.split'],
                ['preview', Eye, 'dialogs.notes.layout.preview']
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setLayout(id)}
                title={t(label)}
                className={`flex items-center gap-1 px-2.5 py-1 transition active:scale-95 ${
                  layout === id
                    ? 'fleet-accent-bg text-white'
                    : 'text-fleet-text-muted hover:bg-fleet-surface-2'
                }`}
              >
                <Icon size={12} /> {t(label)}
              </button>
            ))}
          </div>

          <button
            onClick={() => void requestClose()}
            className="rounded-md p-1.5 text-fleet-text-muted transition-colors hover:bg-fleet-surface-2 hover:text-fleet-text active:scale-90"
            aria-label={t('dialogs.notes.close')}
          >
            <X size={16} />
          </button>
        </div>

        {externalChange && (
          <div className="flex items-center gap-2 border-b border-amber-600/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle size={13} />
            {t('dialogs.notes.externalChanged')}
            <button onClick={() => void reload()} className="font-medium underline active:scale-95">
              {t('dialogs.notes.reload')}
            </button>
            <button
              onClick={() => void save(true)}
              className="font-medium underline active:scale-95"
            >
              {t('dialogs.notes.overwrite')}
            </button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 border-b border-red-600/30 bg-red-500/10 px-4 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle size={13} /> {error}
          </div>
        )}

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {showEditor && (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
              disabled={loading || !scopePath}
              placeholder={t('dialogs.notes.placeholder')}
              className={`min-h-0 flex-1 resize-none bg-fleet-bg p-5 font-mono text-[13px] leading-relaxed text-fleet-text-secondary outline-none placeholder:text-fleet-text-subtle ${
                showPreview ? 'border-r border-fleet-border' : ''
              }`}
            />
          )}
          {showPreview && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-fleet-surface">
              {text.trim() === '' ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                  <NotebookPen size={26} className="text-fleet-text-subtle" />
                  <p className="text-sm font-medium text-fleet-text-secondary">
                    {projectName
                      ? t('dialogs.notes.emptyTitleWithProject', { project: projectName })
                      : t('dialogs.notes.emptyTitle')}
                  </p>
                  <p className="max-w-xs text-xs text-fleet-text-muted">
                    {t('dialogs.notes.emptyDescription')}
                  </p>
                </div>
              ) : (
                <Suspense fallback={null}>
                  <MarkdownPreview
                    content={text}
                    baseDir={scopePath ?? ''}
                    className="mx-auto max-w-3xl px-6 py-5 leading-relaxed text-fleet-text-secondary markdown-preview"
                  />
                </Suspense>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
