import { FileText, FileCode, X } from 'lucide-react';
import type { AgentAttachment } from '../../../../shared/agent-types';
import { toFleetImageUrl } from '../../../../shared/path-platform';
import { basename } from '../../lib/path-utils';
import { useTranslation } from '../../lib/i18n';
import { AgentImage } from './AgentImage';

/**
 * What the user attached, in the two places it is seen.
 *
 * In the composer it is a chip: small, removable, and there to confirm that the
 * thing they dropped landed. In the transcript it is the attachment itself -
 * the picture at a size worth looking at, and openable, because a screenshot
 * you sent an hour ago is the one piece of a conversation you come back to.
 *
 * A document is a pill in both places. There is nothing to look at: what
 * matters about a PDF here is that it was read, and how much of it there was.
 */

/** A document or a mentioned file, named rather than shown. */
function Pill({ attachment }: { attachment: AgentAttachment }): React.JSX.Element {
  const { t } = useTranslation();
  const Icon = attachment.kind === 'pdf' ? FileText : FileCode;
  const name = attachment.kind === 'pdf' ? attachment.name : basename(attachment.path);
  const pages =
    attachment.kind === 'pdf'
      ? t(attachment.pages === 1 ? 'agent.attachment.pageOne' : 'agent.attachment.pageMany', {
          count: attachment.pages
        })
      : null;
  const detail =
    attachment.kind === 'pdf'
      ? attachment.scanned
        ? t('agent.attachment.noTextFound')
        : pages
      : null;
  const title =
    attachment.kind === 'pdf'
      ? t(attachment.scanned ? 'agent.attachment.scannedTitle' : 'agent.attachment.pdfTitle', {
          name: attachment.name,
          pages: pages ?? ''
        })
      : attachment.path;

  return (
    <span
      title={title}
      className="flex max-w-full items-center gap-1.5 rounded-lg border border-fleet-border bg-fleet-glass-surface-2 px-2 py-1 text-xs text-fleet-text"
    >
      <Icon size={13} className="shrink-0 text-fleet-text-muted" />
      <span className="truncate">{name}</span>
      {detail !== null && <span className="shrink-0 text-fleet-text-subtle">{detail}</span>}
    </span>
  );
}

/**
 * One attachment waiting in the composer.
 *
 * The remove button sits over the corner rather than beside the name, so a row
 * of them is a row of the things themselves rather than a row of controls. It
 * is always there rather than appearing on hover: a chip you cannot see how to
 * remove is one you have to guess at.
 */
export function AgentAttachmentChip({
  attachment,
  onRemove
}: {
  attachment: AgentAttachment;
  onRemove: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const name = attachment.kind === 'mention' ? basename(attachment.path) : attachment.name;

  return (
    <span className="relative inline-flex max-w-[14rem] shrink-0">
      {attachment.kind === 'image' ? (
        <img
          src={toFleetImageUrl(attachment.path)}
          alt={name}
          title={name}
          className="size-11 rounded-lg border border-fleet-border object-cover"
        />
      ) : (
        <Pill attachment={attachment} />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('agent.attachment.removeNamed', { name })}
        title={t('common.remove')}
        className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full border border-fleet-border bg-fleet-surface-3 text-fleet-text-muted transition-colors hover:text-fleet-text focus-ring"
      >
        <X size={9} strokeWidth={3} />
      </button>
    </span>
  );
}

/**
 * What rode along with a message, above the words it rode with.
 *
 * Above rather than below, matching the composer it was sent from: the chips
 * sit over the box you type in, so that is where they stay.
 */
export function AgentMessageAttachments({
  attachments
}: {
  attachments: AgentAttachment[];
}): React.JSX.Element | null {
  if (attachments.length === 0) return null;

  return (
    <div className="flex max-w-[85%] flex-col items-end gap-1.5 self-end">
      {attachments.map((attachment, i) =>
        attachment.kind === 'image' ? (
          <AgentImage key={i} src={toFleetImageUrl(attachment.path)} alt={attachment.name} />
        ) : (
          <Pill key={i} attachment={attachment} />
        )
      )}
    </div>
  );
}
