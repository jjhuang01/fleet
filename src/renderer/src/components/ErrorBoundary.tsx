import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../logger';
import { useTranslation } from '../lib/i18n';

const log = createLogger('renderer:error-boundary');

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

function ErrorFallback({ error }: { error: Error }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center justify-center bg-fleet-bg p-8">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-lg font-medium text-fleet-text">{t('panes.error.title')}</div>
        <p className="text-sm text-fleet-text-muted">{t('panes.error.body')}</p>
        <pre className="max-h-32 overflow-auto rounded-md border border-fleet-border bg-fleet-surface-2 p-3 text-left text-xs text-red-600 dark:text-red-400">
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-fleet-surface-3 px-3 py-1.5 text-sm text-fleet-text transition-colors hover:bg-fleet-surface-2 active:scale-[0.97]"
        >
          {t('panes.error.reload')}
        </button>
      </div>
    </div>
  );
}

/**
 * Catches render-time errors so a crashing component shows a recoverable
 * fallback instead of a blank window, and logs the error + component stack to
 * ~/.fleet/logs/ for debugging.
 */
class ErrorBoundaryImpl extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('react render error', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined
    });
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return <ErrorFallback error={error} />;
  }
}

export function ErrorBoundary({ children }: Props): React.JSX.Element {
  return <ErrorBoundaryImpl>{children}</ErrorBoundaryImpl>;
}
