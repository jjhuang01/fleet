import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import type { RemoteFetchResult, RemoteHost } from '../../../../shared/remote-ssh-types';
import { useTranslation } from '../../lib/i18n';

type Props = {
  host: RemoteHost;
  remotePath: string;
  children: (fetched: RemoteFetchResult) => React.ReactNode;
};

/**
 * Materialises a remote file into the local cache, then hands the resulting
 * **local** path to a viewer.
 *
 * This is the single seam that keeps remote browsing from leaking into the
 * viewers: `fleet-image://`, `fleet-pdf://` and `fs` all keep receiving ordinary
 * local paths, so `toFleetImageUrl` / `toFleetPdfUrl` / `protocol-paths.ts` need
 * no notion of SSH at all.
 */
export function RemoteFileGate({ host, remotePath, children }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const [fetched, setFetched] = useState<RemoteFetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFetched(null);
    setError(null);
    void window.fleet.remoteSsh.fetch(host, remotePath).then((result) => {
      if (cancelled) return;
      if (result.success) setFetched(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [host, remotePath, attempt]);

  if (error !== null) {
    const errorText =
      error === 'File not found on the remote host.'
        ? t('ssh.file.error.notFound')
        : error === 'Path is a directory.'
          ? t('ssh.file.error.isDirectory')
          : error;

    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-neutral-900 text-sm px-6 text-center">
        <div className="text-red-400">{errorText}</div>
        <div className="text-neutral-500 font-mono text-xs break-all">
          {host.label}:{remotePath}
        </div>
        <button
          className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors active:scale-[0.97]"
          onClick={() => setAttempt((n) => n + 1)}
        >
          <RefreshCw size={12} />
          {t('ssh.file.retry')}
        </button>
      </div>
    );
  }

  if (fetched === null) {
    return (
      <div className="h-full w-full flex items-center justify-center gap-2 bg-neutral-900 text-neutral-400 text-sm">
        <Loader2 className="animate-spin" size={16} />
        {t('ssh.file.downloading', { host: host.label })}
      </div>
    );
  }

  return <>{children(fetched)}</>;
}
