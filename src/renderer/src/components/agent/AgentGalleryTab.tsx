import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageDown, Paperclip } from 'lucide-react';
import type {
  GalleryCursor,
  GalleryImage,
  GalleryMetadata
} from '../../../../shared/agent-gallery';
import type { MessageKey } from '../../../../shared/i18n';
import { toFleetImageUrl } from '../../../../shared/path-platform';
import { useTranslation } from '../../lib/i18n';
import { AgentImageOverlay } from './AgentImage';

function relativeTimeParts(epochMs: number): { key: MessageKey; count?: number } {
  const minutes = Math.round((Date.now() - epochMs) / 60_000);
  if (minutes < 1) return { key: 'agent.time.justNow' };
  if (minutes < 60) return { key: 'agent.time.minutesAgo', count: minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { key: 'agent.time.hoursAgo', count: hours };
  return { key: 'agent.time.daysAgo', count: Math.round(hours / 24) };
}

/**
 * Every picture the agent has made, from every conversation.
 *
 * Global on purpose, and the only view in the pane that is. A generated image
 * is filed under the conversation that made it and named with a uuid, so the
 * folder-scoped listing that works for sessions would leave the user browsing
 * forty conversations to find one picture - and the conversation is rarely the
 * thing they remember about it.
 *
 * The bargain that comes with that is worth saying out loud in the pane, so the
 * empty state does: these are deleted with the conversation that made them.
 * Someone who wants to keep one has to save it, which is what the actions on
 * the opened picture are for.
 */
export function AgentGalleryTab({
  onUseAsReference
}: {
  /** Send this picture to the composer next door, and go back to it. */
  onUseAsReference: (path: string) => void;
}): React.JSX.Element {
  // `null` while the first read is in flight, so an empty store and an
  // unanswered question do not look the same.
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [next, setNext] = useState<GalleryCursor | null>(null);
  const [failed, setFailed] = useState(false);
  const [opened, setOpened] = useState<GalleryImage | null>(null);
  // Whether a page is in flight, so the sentinel firing twice on one scroll
  // cannot ask for the same page twice.
  const loading = useRef(false);

  const loadPage = useCallback(async (cursor: GalleryCursor | null): Promise<void> => {
    if (loading.current) return;
    loading.current = true;
    try {
      const page = await window.fleet.agent.gallery.list(cursor);
      // Appended for a later page, replaced for the first: the first page is
      // also what a fresh mount reads, and concatenating there would double
      // every picture under React's development double-render.
      setImages((current) =>
        cursor === null || current === null ? page.images : [...current, ...page.images]
      );
      setNext(page.next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      loading.current = false;
    }
  }, []);

  useEffect(() => {
    void loadPage(null);
  }, [loadPage]);

  // The last row, watched. An observer rather than a scroll handler because the
  // grid is the scrolling element and the sentinel is what actually says
  // "there is nothing after this on screen" at any column count.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (el === null || next === null) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadPage(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [next, loadPage]);

  if (failed) {
    return <Message text="agent.gallery.readFailed" />;
  }
  if (images === null) {
    return <Message />;
  }
  if (images.length === 0) {
    return <Message text="agent.gallery.empty" icon />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-2 pb-4">
      {/* Auto-fill rather than a fixed column count: an agent pane is anything
          from a third of the window to all of it, and a three-up grid that
          keeps three columns in a narrow split shows three postage stamps. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
        {images.map((image) => (
          <Thumbnail key={image.path} image={image} onOpen={() => setOpened(image)} />
        ))}
      </div>
      {next !== null && <div ref={sentinel} className="h-8 shrink-0" aria-hidden />}

      {opened !== null && (
        <OpenedImage
          image={opened}
          onClose={() => setOpened(null)}
          onUseAsReference={() => {
            onUseAsReference(opened.path);
            setOpened(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * One tile.
 *
 * Square and cropped, unlike the transcript's picture, which is never trimmed.
 * The two are answering different questions: a row shows one image as the model
 * composed it, a grid shows sixty at a glance, and a grid of ragged heights is
 * one nothing can be found in. The whole picture is one click away.
 */
function Thumbnail({
  image,
  onOpen
}: {
  image: GalleryImage;
  onOpen: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const time = relativeTimeParts(image.modifiedAt);
  const generated = t(time.key, { count: time.count });

  return (
    <button
      type="button"
      onClick={onOpen}
      title={t('agent.gallery.generatedAt', { time: generated })}
      aria-label={t('agent.gallery.viewGeneratedAt', { time: generated })}
      className="group relative aspect-square overflow-hidden rounded-lg border border-fleet-border bg-fleet-surface-2/40 transition-colors hover:border-fleet-border-strong focus-ring"
    >
      <img
        src={toFleetImageUrl(image.path)}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
      />
    </button>
  );
}

/**
 * The opened picture, and what the conversation behind it still says.
 *
 * The metadata is read here rather than with the listing: it replays a session
 * file, and paying that per thumbnail would make scrolling the grid the slowest
 * thing in the app. It arrives after the picture, which is the right way round
 * - the picture is what was clicked on.
 */
function OpenedImage({
  image,
  onClose,
  onUseAsReference
}: {
  image: GalleryImage;
  onClose: () => void;
  onUseAsReference: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [meta, setMeta] = useState<GalleryMetadata | null>(null);

  useEffect(() => {
    let live = true;
    setMeta(null);
    void window.fleet.agent.gallery
      .meta(image.path)
      .then((result) => {
        if (live) setMeta(result);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [image.path]);

  const prompt = meta?.prompt ?? null;
  const title = meta?.title ?? null;

  return (
    <AgentImageOverlay
      open
      src={toFleetImageUrl(image.path)}
      alt={prompt ?? t('agent.gallery.generatedImage')}
      path={image.path}
      onClose={onClose}
      extraActions={
        <button
          type="button"
          onClick={onUseAsReference}
          aria-label={t('agent.gallery.useAsReference')}
          title={t('agent.gallery.useAsReference')}
          className="rounded p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-ring"
        >
          <Paperclip size={15} />
        </button>
      }
      caption={
        prompt === null && title === null ? undefined : (
          <div className="flex flex-col gap-0.5 text-white">
            {prompt !== null && <p className="line-clamp-3 text-xs leading-relaxed">{prompt}</p>}
            {title !== null && <p className="text-[11px] text-white/60">{title}</p>}
          </div>
        )
      }
    />
  );
}

/**
 * Whatever the grid has instead of pictures: nothing yet, or nothing at all.
 *
 * Scrimmed with the same tokens the transcript's own empty state uses, which
 * are transparent and zero-padded unless a background image is set. Without
 * them a sentence in the middle of the pane is drawn straight onto whatever the
 * user chose to look at, and the one thing this pane is about is that people
 * put pictures behind it.
 */
function Message({ text, icon = false }: { text?: MessageKey; icon?: boolean }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-8">
      <div
        className="flex max-w-sm flex-col items-center gap-2 rounded-xl text-center"
        style={{ background: 'var(--fleet-turn-scrim)', padding: 'var(--fleet-turn-pad)' }}
      >
        {icon && <ImageDown size={20} className="text-fleet-text-secondary" strokeWidth={1.5} />}
        {text !== undefined && (
          <p className="text-xs leading-relaxed text-fleet-text-secondary">{t(text)}</p>
        )}
      </div>
    </div>
  );
}
