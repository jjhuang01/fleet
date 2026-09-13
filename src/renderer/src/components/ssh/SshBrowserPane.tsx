import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  FolderOpen,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  ServerCrash,
  Upload
} from 'lucide-react';
import type { MessageKey } from '../../../../shared/i18n';
import type { RemoteDirEntry, RemoteHost } from '../../../../shared/remote-ssh-types';
import { isBinaryBlockedFilePath } from '../../../../shared/file-open';
import { useTranslation } from '../../lib/i18n';
import { remoteChildPath } from '../../lib/remote-names';
import { useRemoteSshStore, isTransfer } from '../../store/remote-ssh-store';
import { useWorkspaceStore } from '../../store/workspace-store';
import { useToastStore } from '../../store/toast-store';
import { RemoteBreadcrumbs } from './RemoteBreadcrumbs';
import { RemoteDeleteDialog } from './RemoteDeleteDialog';
import { RemoteEntryList } from './RemoteEntryList';
import { RemoteNameDialog, type NameRequest } from './RemoteNameDialog';
import { TransferStrip } from './TransferStrip';

type Props = {
  paneId: string;
  host: RemoteHost;
  initialPath?: string;
};

/** The one open dialog, if any. Only one can be up at a time by construction. */
type PaneDialog =
  | { kind: 'new-folder' }
  | { kind: 'rename'; entry: RemoteDirEntry }
  | { kind: 'delete'; entry: RemoteDirEntry };

export function SshBrowserPane({ paneId, host, initialPath }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const pane = useRemoteSshStore((s) => s.panes[paneId]);
  const openPane = useRemoteSshStore((s) => s.openPane);
  const closePane = useRemoteSshStore((s) => s.closePane);
  const navigate = useRemoteSshStore((s) => s.navigate);
  const refresh = useRemoteSshStore((s) => s.refresh);
  const goUp = useRemoteSshStore((s) => s.goUp);
  const goBack = useRemoteSshStore((s) => s.goBack);
  const goForward = useRemoteSshStore((s) => s.goForward);
  const setSort = useRemoteSshStore((s) => s.setSort);
  const setView = useRemoteSshStore((s) => s.setView);
  const setFocused = useRemoteSshStore((s) => s.setFocused);

  const createFolder = useRemoteSshStore((s) => s.createFolder);
  const renameEntry = useRemoteSshStore((s) => s.renameEntry);
  const removeEntry = useRemoteSshStore((s) => s.removeEntry);

  const startTransfer = useRemoteSshStore((s) => s.startTransfer);
  const cancelTransfer = useRemoteSshStore((s) => s.cancelTransfer);
  const dismissTransfer = useRemoteSshStore((s) => s.dismissTransfer);
  const allTransfers = useRemoteSshStore((s) => s.transfers);

  const openRemoteFile = useWorkspaceStore((s) => s.openRemoteFile);
  const showToast = useToastStore((s) => s.show);
  const listRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dialog, setDialog] = useState<PaneDialog | null>(null);

  const transfers = useMemo(
    () =>
      Object.values(allTransfers)
        .filter((t) => t?.paneId === paneId)
        .filter(isTransfer),
    [allTransfers, paneId]
  );

  useEffect(() => {
    void openPane(paneId, host, initialPath);
    return () => closePane(paneId);
    // Re-opening on host/path identity change is intentional; the pane is keyed
    // by paneId and a different target is a different browsing session.
  }, [paneId, host, initialPath, openPane, closePane]);

  const handleOpen = useCallback(
    (entry: RemoteDirEntry) => {
      // Symlinks resolve server-side: `list`/`stat` follow them, so a link to a
      // directory simply lists as that directory.
      if (entry.kind === 'dir') {
        void navigate(paneId, entry.path);
        return;
      }
      if (isBinaryBlockedFilePath(entry.path)) {
        showToast(t('ssh.toast.previewBlocked', { name: entry.name }));
        return;
      }
      openRemoteFile(host, entry.path);
    },
    [paneId, host, navigate, openRemoteFile, showToast, t]
  );

  const handleCopyPath = useCallback(
    (entry: RemoteDirEntry) => {
      void navigator.clipboard
        .writeText(entry.path)
        .then(() => showToast(t('ssh.toast.pathCopied')));
    },
    [showToast, t]
  );

  const handleDownload = useCallback(
    async (entry: RemoteDirEntry) => {
      const localPath = await window.fleet.file.saveDialog({ defaultName: entry.name });
      if (!localPath) return;
      await startTransfer('download', { paneId, host, localPath, remotePath: entry.path });
    },
    [paneId, host, startTransfer]
  );

  const uploadFiles = useCallback(
    async (localPaths: string[]) => {
      if (!pane) return;
      // Sequential rather than parallel: several transfers over one multiplexed
      // connection just share the same pipe, and one bar at a time is far
      // easier to read than five racing each other.
      for (const localPath of localPaths) {
        const name = localPath.split(/[\\/]/).pop() ?? localPath;
        await startTransfer('upload', {
          paneId,
          host,
          localPath,
          remotePath: remoteChildPath(pane.cwd, name)
        });
      }
    },
    [pane, paneId, host, startTransfer]
  );

  const handleUploadClick = useCallback(async () => {
    const picked = await window.fleet.file.openDialog({ multi: true });
    if (picked.length > 0) await uploadFiles(picked);
  }, [uploadFiles]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      // Electron exposes the real filesystem path of a dropped file here; a drop
      // from another app that carries no path is silently ignored rather than
      // uploading an empty file.
      const paths = Array.from(e.dataTransfer.files)
        .map((file) => window.fleet.utils.getFilePath(file))
        .filter((path) => path.length > 0);
      if (paths.length > 0) void uploadFiles(paths);
    },
    [uploadFiles]
  );

  const nameRequest: NameRequest | null = useMemo(() => {
    if (dialog?.kind === 'new-folder') {
      return {
        titleKey: 'ssh.name.title.newFolder',
        labelKey: 'ssh.name.label.createdIn',
        labelParams: { path: pane?.cwd ?? '' },
        initialValue: '',
        confirmLabelKey: 'ssh.action.create'
      };
    }
    if (dialog?.kind === 'rename') {
      return {
        titleKey: 'ssh.name.title.rename',
        labelKey: 'ssh.name.label.newName',
        initialValue: dialog.entry.name,
        confirmLabelKey: 'ssh.action.rename'
      };
    }
    return null;
  }, [dialog, pane?.cwd]);

  const submitName = useCallback(
    async (value: string): Promise<string | null> => {
      if (dialog?.kind === 'new-folder') return createFolder(paneId, value);
      if (dialog?.kind === 'rename') return renameEntry(paneId, dialog.entry, value);
      return null;
    },
    [dialog, paneId, createFolder, renameEntry]
  );

  const confirmDelete = useCallback(async (): Promise<string | null> => {
    if (dialog?.kind !== 'delete') return null;
    return removeEntry(paneId, dialog.entry);
  }, [dialog, paneId, removeEntry]);

  // Keyboard navigation over the visible (already sorted) rows.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!pane) return;
      const { entries, focused } = pane;
      const index = entries.findIndex((entry) => entry.path === focused);

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (entries.length === 0) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = Math.min(entries.length - 1, Math.max(0, index + delta));
        setFocused(paneId, entries[next].path);
        return;
      }
      if (e.key === 'Enter' && index >= 0) {
        e.preventDefault();
        handleOpen(entries[index]);
        return;
      }
      // ⌘⌫ is the Finder gesture for delete, and it opens the same confirmation
      // the menu item does - the shortcut is a faster route, never a quieter one.
      if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (index >= 0) setDialog({ kind: 'delete', entry: entries[index] });
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        void goUp(paneId);
      }
    },
    [pane, paneId, setFocused, handleOpen, goUp]
  );

  // Keep the focused row in view as the arrow keys walk past the viewport edge.
  useEffect(() => {
    if (!pane?.focused) return;
    const el = listRef.current?.querySelector('[data-focused="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [pane?.focused]);

  if (!pane) {
    return (
      <div className="h-full w-full flex items-center justify-center gap-2 bg-fleet-surface text-fleet-text-muted text-sm">
        <Loader2 className="animate-spin" size={16} />
        {t('ssh.status.connecting', { host: host.label })}
      </div>
    );
  }

  const canBack = pane.historyIndex > 0;
  const canForward = pane.historyIndex < pane.history.length - 1;

  return (
    <div
      className="relative flex flex-col h-full w-full bg-fleet-surface outline-none"
      onKeyDown={handleKeyDown}
      onDragOver={(e) => {
        // Only files upload, so only a file drag lights the pane up. Dragging a
        // tab or a text selection across it must not offer to send it anywhere.
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the pointer actually leaves the pane, not when it
        // crosses between children, which fire dragleave on the way past.
        const entering = e.relatedTarget;
        if (!(entering instanceof Node) || !e.currentTarget.contains(entering)) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {/* Toolbar: navigation on the left, view controls on the right */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 h-8 border-b border-fleet-border bg-fleet-bg/60">
        <ToolbarButton
          onClick={() => void goBack(paneId)}
          titleKey="ssh.action.back"
          disabled={!canBack}
        >
          <ArrowLeft size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => void goForward(paneId)}
          titleKey="ssh.action.forward"
          disabled={!canForward}
        >
          <ArrowRight size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => void goUp(paneId)}
          titleKey="ssh.action.parentFolder"
          disabled={pane.cwd === '/'}
        >
          <ArrowUpFromLine size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => void refresh(paneId)} titleKey="ssh.action.refresh">
          <RefreshCw size={13} className={pane.loading ? 'animate-spin' : ''} />
        </ToolbarButton>

        <div className="w-px h-3.5 bg-fleet-surface-3 mx-1" />

        <div className="flex-1 min-w-0 overflow-hidden">
          <RemoteBreadcrumbs
            hostLabel={host.label}
            path={pane.cwd}
            connected={pane.connection === 'connected'}
            onNavigate={(path) => void navigate(paneId, path)}
          />
        </div>

        <div className="w-px h-3.5 bg-fleet-surface-3 mx-1" />

        <ToolbarButton
          onClick={() => setDialog({ kind: 'new-folder' })}
          titleKey="ssh.action.newFolder"
        >
          <FolderPlus size={13} />
        </ToolbarButton>
        <ToolbarButton onClick={() => void handleUploadClick()} titleKey="ssh.action.uploadFiles">
          <Upload size={13} />
        </ToolbarButton>

        <div className="w-px h-3.5 bg-fleet-surface-3 mx-1" />

        <ToolbarButton
          onClick={() => setView(paneId, 'list')}
          titleKey="ssh.action.listView"
          active={pane.view === 'list'}
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setView(paneId, 'grid')}
          titleKey="ssh.action.gridView"
          active={pane.view === 'grid'}
        >
          <LayoutGrid size={13} />
        </ToolbarButton>
      </div>

      {/* Body */}
      {pane.error !== null ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <ServerCrash size={28} className="text-fleet-text-subtle" />
          <div className="text-sm text-red-400 max-w-md whitespace-pre-wrap">{pane.error}</div>
          <button
            className="flex items-center gap-1.5 text-xs text-fleet-text-secondary hover:text-fleet-text px-2 py-1 rounded hover:bg-fleet-surface-3 transition-colors active:scale-[0.97]"
            onClick={() => void refresh(paneId)}
          >
            <RefreshCw size={12} />
            {t('ssh.action.tryAgain')}
          </button>
        </div>
      ) : pane.loading && pane.entries.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center gap-2 text-fleet-text-subtle text-sm">
          <Loader2 className="animate-spin" size={16} />
          {t('ssh.status.loading')}
        </div>
      ) : pane.entries.length === 0 ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 text-sm">
          <FolderOpen size={28} className="text-fleet-text-subtle" />
          <div className="text-fleet-text-muted">{t('ssh.status.empty')}</div>
        </div>
      ) : (
        <RemoteEntryList
          ref={listRef}
          entries={pane.entries}
          view={pane.view}
          sortKey={pane.sortKey}
          sortDir={pane.sortDir}
          focused={pane.focused}
          onFocus={(path) => setFocused(paneId, path)}
          onSort={(key) => setSort(paneId, key)}
          onOpen={handleOpen}
          onCopyPath={handleCopyPath}
          onDownload={(entry) => void handleDownload(entry)}
          onRename={(entry) => setDialog({ kind: 'rename', entry })}
          onDelete={(entry) => setDialog({ kind: 'delete', entry })}
        />
      )}

      <TransferStrip transfers={transfers} onCancel={cancelTransfer} onDismiss={dismissTransfer} />

      {/* Status bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 h-7 bg-fleet-bg/80 border-t border-fleet-border text-xs text-fleet-text-subtle">
        <span>
          {t(pane.entries.length === 1 ? 'ssh.status.item' : 'ssh.status.items', {
            count: pane.entries.length
          })}
        </span>
        <span className="font-mono truncate min-w-0 ml-auto" title={pane.cwd}>
          {pane.cwd}
        </span>
      </div>

      {/* Drop target. Named so the destination is unambiguous before the drop -
          the folder being uploaded into is the one currently open, not the row
          under the cursor. */}
      {dragging && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-fleet-bg/80 border-2 border-dashed border-teal-500/60 pointer-events-none">
          <Upload size={28} className="text-teal-400" />
          <div className="text-sm text-fleet-text">
            {t('ssh.status.uploadTo', { host: host.label })}
          </div>
          <div className="text-xs font-mono text-fleet-text-subtle">{pane.cwd}</div>
        </div>
      )}

      <RemoteNameDialog
        request={nameRequest}
        onSubmit={submitName}
        onClose={() => setDialog(null)}
      />
      <RemoteDeleteDialog
        entry={dialog?.kind === 'delete' ? dialog.entry : null}
        hostLabel={host.label}
        onConfirm={confirmDelete}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  titleKey,
  disabled,
  active
}: {
  children: React.ReactNode;
  onClick: () => void;
  titleKey: MessageKey;
  disabled?: boolean;
  active?: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const title = t(titleKey);

  return (
    <button
      className={`px-1.5 py-1 rounded transition-colors active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100 ${
        active
          ? 'bg-fleet-surface-3 text-fleet-text'
          : 'text-fleet-text-muted hover:text-fleet-text hover:bg-fleet-surface-3'
      }`}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
