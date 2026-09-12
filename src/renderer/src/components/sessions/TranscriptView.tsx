// src/renderer/src/components/sessions/TranscriptView.tsx
import { useState } from 'react';
import type {
  SessionSummary,
  TranscriptBlock,
  TranscriptMessage
} from '../../../../shared/sessions';
import { useSessionsStore } from '../../store/sessions-store';
import { useWorkspaceStore } from '../../store/workspace-store';
import { DistillModal } from './DistillModal';
import { useLocale, useTranslation } from '../../lib/i18n';
import { formatDateTime } from '../../lib/relative-time';
import type { MessageKey } from '../../../../shared/i18n';

function resumeCommand(s: SessionSummary): string {
  return `claude --resume ${s.id}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd > 0 && usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

function durationMessage(ms: number): {
  key: MessageKey;
  params: { seconds: number } | { minutes: number } | { hours: number; minutes: number };
} {
  const sec = Math.round(ms / 1000);
  if (sec < 60) {
    return { key: 'dialogs.sessions.transcript.duration.seconds', params: { seconds: sec } };
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return { key: 'dialogs.sessions.transcript.duration.minutes', params: { minutes: min } };
  }
  const hr = Math.floor(min / 60);
  return {
    key: 'dialogs.sessions.transcript.duration.hours',
    params: { hours: hr, minutes: min % 60 }
  };
}

const ROLE_LABEL: Record<TranscriptMessage['role'], MessageKey> = {
  user: 'dialogs.sessions.transcript.role.user',
  assistant: 'dialogs.sessions.transcript.role.assistant',
  tool: 'dialogs.sessions.transcript.role.tool'
};

function MetaRow({
  label,
  value,
  title
}: {
  label: string;
  value: string;
  title?: string;
}): React.JSX.Element {
  return (
    <>
      <dt className="text-fleet-text-subtle">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-fleet-text" title={title}>
        {value}
      </dd>
    </>
  );
}

/**
 * Labeled key→value metadata for a Claude session. Every value carries a visible
 * label (NN/G: idiosyncratic icons need text); breakdowns live in tooltips so the
 * panel stays scannable (Baymard spec-sheet guidance: single column, aligned pairs).
 */
function ClaudeMetaPanel({
  s,
  messageCount
}: {
  s: SessionSummary;
  messageCount: number;
}): React.JSX.Element {
  const { t } = useTranslation();
  const locale = useLocale();
  const u = s.claudeUsage;
  const cacheWrite = u ? u.cacheWrite5m + u.cacheWrite1h : 0;
  const duration = s.startedAt && s.endedAt ? durationMessage(s.endedAt - s.startedAt) : null;
  return (
    <dl className="mt-3 grid grid-cols-[max-content_1fr] items-baseline gap-x-4 gap-y-1.5 text-xs">
      <MetaRow
        label={t('dialogs.sessions.transcript.meta.cost')}
        value={
          s.costUsd === undefined
            ? t('dialogs.sessions.transcript.meta.unavailable')
            : formatCost(s.costUsd)
        }
        title={
          s.costUsd === undefined
            ? t('dialogs.sessions.transcript.meta.costMissing')
            : t('dialogs.sessions.transcript.meta.costEstimated')
        }
      />
      {s.models && s.models.length > 0 && (
        <MetaRow label={t('dialogs.sessions.transcript.meta.model')} value={s.models.join(', ')} />
      )}
      <MetaRow
        label={t('dialogs.sessions.transcript.meta.messages')}
        value={String(messageCount)}
      />
      {u && (
        <MetaRow
          label={t('dialogs.sessions.transcript.meta.tokens')}
          value={formatTokens(u.input + u.output)}
          title={t('dialogs.sessions.transcript.meta.tokensTitle', {
            input: formatTokens(u.input),
            output: formatTokens(u.output)
          })}
        />
      )}
      {u && (u.cacheRead > 0 || cacheWrite > 0) && (
        <MetaRow
          label={t('dialogs.sessions.transcript.meta.cache')}
          value={formatTokens(u.cacheRead + cacheWrite)}
          title={t('dialogs.sessions.transcript.meta.cacheTitle', {
            read: formatTokens(u.cacheRead),
            write: formatTokens(cacheWrite)
          })}
        />
      )}
      {s.gitBranch && (
        <MetaRow label={t('dialogs.sessions.transcript.meta.branch')} value={s.gitBranch} />
      )}
      {s.startedAt && s.endedAt && (
        <MetaRow
          label={t('dialogs.sessions.transcript.meta.duration')}
          value={`${duration ? t(duration.key, duration.params) : ''} · ${formatDateTime(
            s.startedAt,
            locale,
            { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
          )} – ${formatDateTime(s.endedAt, locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`}
          title={t('dialogs.sessions.transcript.meta.sessionRange')}
        />
      )}
    </dl>
  );
}

function Block({ block }: { block: TranscriptBlock }): React.JSX.Element {
  const { t } = useTranslation();
  switch (block.type) {
    case 'text':
      return (
        <div className="whitespace-pre-wrap break-words text-sm text-fleet-text">{block.text}</div>
      );
    case 'tool_use':
      return (
        <div className="whitespace-pre-wrap break-words text-xs text-fleet-text-subtle font-mono">
          ⚙ {block.name} <span className="opacity-60">{block.argsPreview}</span>
        </div>
      );
    case 'tool_result':
      return (
        <div
          className={`whitespace-pre-wrap break-words text-xs font-mono ${block.isError ? 'text-red-400' : 'text-fleet-text-subtle'}`}
        >
          ↳ {block.output.slice(0, 2000)}
        </div>
      );
    case 'image':
      return (
        <div className="text-xs text-fleet-text-subtle italic">
          {t('dialogs.sessions.transcript.image')}
        </div>
      );
  }
}

function Message({ message }: { message: TranscriptMessage }): React.JSX.Element {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-[10px] uppercase tracking-wider text-fleet-text-subtle">
        {t(ROLE_LABEL[message.role])}
      </span>
      <div
        className={`min-w-0 max-w-[85%] rounded-md px-3 py-2 ${
          isUser ? 'fleet-accent-bg-soft' : 'bg-fleet-surface-2/60'
        } flex flex-col gap-1`}
      >
        {message.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

export function TranscriptView({
  onDistilled
}: {
  /** Fired after a distill is saved, so the Learnings list can refresh. */
  onDistilled?: () => void;
} = {}): React.JSX.Element {
  const { t } = useTranslation();
  const { selected, transcript, isLoadingTranscript, transcriptError } = useSessionsStore();
  const openResumeTab = useWorkspaceStore((s) => s.openResumeTab);
  const [distilling, setDistilling] = useState(false);

  const messages = transcript?.messages ?? [];

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fleet-text-subtle">
        {t('dialogs.sessions.transcript.selectPrompt')}
      </div>
    );
  }
  if (transcriptError) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-400">
        {transcriptError}
      </div>
    );
  }
  if (isLoadingTranscript || !transcript) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fleet-text-subtle">
        {t('dialogs.sessions.transcript.loading')}
      </div>
    );
  }

  const s = transcript.summary;
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-fleet-border px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-fleet-text">{s.title}</div>
          <ClaudeMetaPanel s={s} messageCount={messages.length} />
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => setDistilling(true)}
            className="rounded border border-fleet-border-strong px-2 py-1.5 text-xs text-fleet-text-subtle hover:bg-fleet-surface-2/50"
            title={t('dialogs.sessions.transcript.distillTitle')}
          >
            ✨ {t('dialogs.sessions.transcript.distill')}
          </button>
          <button
            onClick={() => openResumeTab(s.cwd, resumeCommand(s), s.title)}
            className="rounded fleet-accent-bg fleet-accent-bg-hover px-3 py-1.5 text-xs font-medium text-white"
          >
            {t('dialogs.sessions.transcript.resume')}
          </button>
        </div>
      </div>
      <DistillModal
        open={distilling}
        session={s}
        onClose={() => setDistilling(false)}
        onSaved={onDistilled}
      />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {messages.map((m, i) => (
            <Message key={i} message={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
