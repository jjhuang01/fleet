import { useEffect, useRef, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import type { RemoteDirEntry } from '../../../../shared/remote-ssh-types';
import { useTranslation } from '../../lib/i18n';
import { Overlay } from '../Overlay';

type Props = {
  entry: RemoteDirEntry | null;
  hostLabel: string;
  /** Resolves to an error to show in place, or null once the entry is gone. */
  onConfirm: () => Promise<string | null>;
  onClose: () => void;
};

/**
 * Confirmation for a permanent remote delete.
 *
 * There is no trash on the far side - SFTP `rm` is final - so the dialog says so
 * outright rather than relying on the user to know it. Cancel holds focus: the
 * safe choice is the one a reflexive Return or Escape lands on.
 */
export function RemoteDeleteDialog({
  entry,
  hostLabel,
  onConfirm,
  onClose
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Held copy so the name stays put through the exit animation.
  const [shown, setShown] = useState<RemoteDirEntry | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!entry) return;
    setShown(entry);
    setError(null);
    setBusy(false);
    requestAnimationFrame(() => cancelRef.current?.focus());
  }, [entry]);

  const confirm = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    const failure = await onConfirm();
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onClose();
  };

  const isDir = shown?.kind === 'dir';
  const errorText =
    error === null
      ? null
      : error === 'This browser pane is no longer open.'
        ? t('ssh.error.paneGone')
        : error;

  return (
    <Overlay open={entry !== null} onClose={onClose} closeOnBackdrop={!busy}>
      <div className="w-[400px] rounded-lg border border-fleet-border-strong bg-fleet-surface p-4">
        <div className="flex items-start gap-2.5">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-400" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-fleet-text">
              {t(
                isDir
                  ? 'ssh.delete.title.folder'
                  : shown?.kind === 'symlink'
                    ? 'ssh.delete.title.link'
                    : 'ssh.delete.title.file'
              )}
            </h3>
            <p className="mt-1 text-xs text-fleet-text-muted break-words">
              {t(isDir ? 'ssh.delete.body.folder' : 'ssh.delete.body.entry', {
                name: shown?.name,
                host: hostLabel
              })}
            </p>
            <p className="mt-1.5 text-xs text-fleet-text-subtle">{t('ssh.delete.warning')}</p>
          </div>
        </div>

        {errorText !== null && (
          <div className="mt-3 text-xs text-red-400 break-words">{errorText}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="text-xs px-3 py-1 rounded bg-fleet-surface-2 transition hover:bg-fleet-surface-3 active:scale-[0.97] outline-none focus:ring-1 focus:ring-[color:var(--fleet-accent)]"
            onClick={onClose}
            disabled={busy}
          >
            {t('ssh.action.cancel')}
          </button>
          <button
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded bg-red-700 transition hover:bg-red-600 active:scale-[0.97] disabled:opacity-50"
            onClick={() => void confirm()}
            disabled={busy}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {t('ssh.action.delete')}
          </button>
        </div>
      </div>
    </Overlay>
  );
}
