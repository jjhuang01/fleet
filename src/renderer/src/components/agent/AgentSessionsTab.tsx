import { useCallback, useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2 } from 'lucide-react';
import type { AgentSessionListItem } from '../../../../shared/agent-session';
import type { MessageKey, TranslateParams } from '../../../../shared/i18n';
import { useAgentStore } from '../../store/agent-store';
import { agentSessionsInUse } from '../../store/workspace-store';
import { useTranslation } from '../../lib/i18n';
import { dialogFadeAnim } from '../../lib/motion';
import { formatTokens, formatUsd } from './settings/format';
import { hasSpend, type AgentSessionSpend } from '../../../../shared/agent-spend';

type RelativeTime = { key: MessageKey; count?: number };

function relativeTime(epochMs: number): RelativeTime {
  const minutes = Math.round((Date.now() - epochMs) / 60_000);
  if (minutes < 1) return { key: 'agent.time.justNow' };
  if (minutes < 60) return { key: 'agent.time.minutesAgo', count: minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { key: 'agent.time.hoursAgo', count: hours };
  return { key: 'agent.time.daysAgo', count: Math.round(hours / 24) };
}

/**
 * The conversations this pane's folder has had, and a way back into one.
 *
 * Scoped to the folder rather than to everything on disk: a pane is a place to
 * work, and a session from somewhere else would arrive with a history that
 * disagrees with the folder the agent is actually standing in.
 */
export function AgentSessionsTab({
  paneId,
  cwd,
  onResumed
}: {
  paneId: string;
  cwd: string;
  onResumed: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  // `null` while the first read is in flight, so an empty folder and an
  // unanswered question do not look the same.
  const [sessions, setSessions] = useState<AgentSessionListItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AgentSessionListItem | null>(null);
  const [deleteError, setDeleteError] = useState<MessageKey | null>(null);
  const resumeSession = useAgentStore((s) => s.resumeSession);
  const busy = useAgentStore((s) => (s.threads[paneId]?.streamId ?? null) !== null);
  // The thread's own id rather than the layout's: they agree, but this is the
  // one that changes the moment a session is resumed or cleared.
  const currentSessionId = useAgentStore((s) => s.threads[paneId]?.sessionId ?? null);
  // Read once, like the list itself: the tab is mounted fresh every time it is
  // shown, and the delete itself asks again rather than trusting this.
  const [inUse] = useState(agentSessionsInUse);

  // Only on mount, which is every time the tab is shown: the pane renders one
  // view at a time, so coming back here re-reads the folder without anything
  // watching it in between.
  useEffect(() => {
    let live = true;
    window.fleet.agent
      .listSessions(cwd)
      .then((list) => {
        if (live) setSessions(list);
      })
      // Without this the pane sits on "Reading sessions" for as long as it is
      // open: a rejected invoke never reaches the `then`, and the loading state
      // is the absence of an answer rather than a wait with an end to it.
      .catch(() => {
        if (!live) return;
        setSessions([]);
        setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [cwd]);

  const confirmDelete = useCallback(async () => {
    if (pendingDelete === null) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    setDeleteError(null);
    // Asked again here rather than only when the row was drawn: a pane
    // elsewhere may have resumed this session while the dialog was open.
    if (agentSessionsInUse().has(id)) {
      setDeleteError('agent.sessions.openElsewhere');
      return;
    }
    const removed = await window.fleet.agent.deleteSession(id).catch(() => false);
    if (!removed) {
      // Leaving the row where it is says more than removing it would: the file
      // is still there, and the list would put it back on the next visit.
      setDeleteError('agent.sessions.deleteFailed');
      return;
    }
    // The row is known gone, so there is nothing to re-read the folder for.
    setSessions((current) => (current ?? []).filter((s) => s.id !== id));
  }, [pendingDelete]);

  if (sessions === null) {
    return <Centered>{t('agent.sessions.reading')}</Centered>;
  }

  if (sessions.length === 0) {
    return (
      <Centered>{failed ? t('agent.sessions.readFailed') : t('agent.sessions.empty')}</Centered>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-6">
      {busy && (
        <p role="status" className="pb-3 text-[11px] text-fleet-text-subtle">
          {t('agent.sessions.busy')}
        </p>
      )}
      {deleteError !== null && (
        <p role="alert" className="pb-3 text-[11px] text-red-400">
          {t(deleteError)}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {sessions.map((session) => {
          const isCurrent = session.id === currentSessionId;
          const held = isCurrent || inUse.has(session.id);
          const relative = relativeTime(session.updatedAt);
          const costTitle = sessionCostTitle(session.spend);
          return (
            <li key={session.id} className="group flex items-center gap-2">
              <button
                type="button"
                disabled={isCurrent || busy}
                onClick={() => {
                  void resumeSession(paneId, session.cwd, session.id);
                  onResumed();
                }}
                className="flex min-w-0 flex-1 items-baseline gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-fleet-surface-2 disabled:cursor-default disabled:hover:bg-transparent focus-ring"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-fleet-text">
                  {sessionLabel(session)}
                </span>
                {isCurrent && (
                  <span className="shrink-0 rounded border border-fleet-border px-1.5 py-px text-[10px] uppercase tracking-wide text-fleet-text-muted">
                    {t('agent.sessions.current')}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-fleet-text-subtle">
                  {t(relative.key, { count: relative.count })}
                </span>
                {/*
                 * A fixed column so the amounts line up down the list, which is
                 * what makes an expensive session findable at a glance. A dash
                 * for one that kept no count - which is every session from
                 * before this existed, and is not the same as one that was free.
                 */}
                <span
                  className="w-14 shrink-0 text-right text-[11px] tabular-nums text-fleet-text-subtle"
                  title={t(costTitle.key, costTitle.params)}
                >
                  {sessionCost(session.spend)}
                </span>
              </button>
              <button
                type="button"
                disabled={held}
                onClick={() => setPendingDelete(session)}
                aria-label={t('agent.sessions.deleteNamed', {
                  name: sessionLabel(session) ?? t('agent.sessions.emptySession')
                })}
                title={t('agent.sessions.deleteTitle')}
                // Shown on hover, and whenever it has focus, so the keyboard
                // can reach a control the mouse only sees on approach.
                className="shrink-0 rounded-md p-2 text-fleet-text-subtle opacity-0 transition-opacity hover:text-fleet-text focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0 focus-ring"
              >
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog.Root
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={`fixed inset-0 z-50 bg-fleet-bg/60 ${dialogFadeAnim}`} />
          <Dialog.Content
            className={`fixed top-1/2 left-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-fleet-border-strong bg-fleet-surface p-5 text-sm shadow-xl ${dialogFadeAnim}`}
          >
            <Dialog.Title className="mb-1 text-base font-semibold text-fleet-text">
              {t('agent.sessions.deleteConfirmTitle')}
            </Dialog.Title>
            <Dialog.Description className="mb-5 text-xs text-fleet-text-muted">
              {pendingDelete === null
                ? ''
                : t('agent.sessions.deleteConfirmBody', {
                    name: sessionLabel(pendingDelete) ?? t('agent.sessions.emptySession')
                  })}
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded px-3 py-1.5 text-xs text-fleet-text-muted transition hover:bg-fleet-surface-2 hover:text-fleet-text active:scale-[0.97]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-500 active:scale-[0.97]"
              >
                {t('common.delete')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/**
 * What to call a session in the list.
 *
 * The model's name for it when there is one, and otherwise the words it was
 * opened with - which is every session written before naming existed, and any
 * whose first turn never came back with one.
 */
function sessionLabel(session: AgentSessionListItem): string | null {
  const title = session.title?.trim() ?? '';
  if (title !== '') return title;
  const opening = session.firstUserText.trim().split('\n')[0];
  return opening === '' ? null : opening;
}

/**
 * What a session cost, in the width of a column.
 *
 * Three states rather than two, and the difference matters: a price, a session
 * whose provider quoted none, and a session from before any of this was
 * recorded. Only the last is a dash - "we never counted" is the one of the
 * three that is about Fleet rather than about the conversation.
 */
function sessionCost(spend: AgentSessionSpend | null): string {
  if (spend === null || !hasSpend(spend)) return '—';
  return spend.costUsd === null ? '·' : formatUsd(spend.costUsd);
}

function sessionCostTitle(spend: AgentSessionSpend | null): {
  key: MessageKey;
  params?: TranslateParams;
} {
  if (spend === null || !hasSpend(spend)) return { key: 'agent.sessions.costUntracked' };
  const params = {
    tokens: formatTokens(spend.promptTokens + spend.completionTokens),
    calls: spend.calls
  };
  return {
    key: spend.costUsd === null ? 'agent.sessions.costTokensNoPrice' : 'agent.sessions.costTokens',
    params
  };
}

function Centered({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <span className="text-xs text-fleet-text-subtle">{children}</span>
    </div>
  );
}
