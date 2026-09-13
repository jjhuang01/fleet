import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../hooks/use-presence';
import { overlayExitMs, overlayTiming } from '../lib/motion';

/**
 * The overlays that are open, oldest first.
 *
 * Every overlay listens for Escape on `document`, so with a dialog stacked on a
 * dialog one press used to reach both listeners and take the whole stack down -
 * the workflow underneath went with the panel the user actually dismissed.
 * Only the last one opened answers now.
 */
const escapeStack: Array<(e: KeyboardEvent) => void> = [];

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Panel content. The panel box (background/border/sizing) is yours via `panelClassName`. */
  children: React.ReactNode;
  /** Classes for the panel box — background, border, sizing, layout. */
  panelClassName?: string;
  /** Flex alignment for the panel within the viewport. Default centers both axes. */
  containerClassName?: string;
  /** Close when the Escape key is pressed. Default true. */
  closeOnEscape?: boolean;
  /** Close when the backdrop (area outside the panel) is clicked. Default true. */
  closeOnBackdrop?: boolean;
  /** Backdrop tint classes. Default `bg-black/60`. */
  backdropClassName?: string;
};

/**
 * Shared modal/overlay shell: a backdrop that fades and a panel that scales +
 * slides on enter/exit. Centralizes backdrop-click-to-close and Escape so the
 * individual overlays only describe their panel. Exit animations work because
 * {@link usePresence} keeps the tree mounted for the duration of the close.
 *
 * Rendered into `document.body` rather than where it was written. `z-50` only
 * ranks an element against its siblings inside whatever stacking context it
 * finds itself in, and the panes of this app sit in one - so an overlay opened
 * from a pane was being painted under the sidebar beside it, which is a lower
 * z-index in a higher context. A modal covers the window, so it has to be a
 * child of the window.
 */
export function Overlay({
  open,
  onClose,
  children,
  panelClassName = '',
  containerClassName = 'items-center justify-center',
  closeOnEscape = true,
  closeOnBackdrop = true,
  backdropClassName = 'bg-black/25 dark:bg-black/60'
}: OverlayProps): React.JSX.Element | null {
  const { mounted, state } = usePresence(open, overlayExitMs);
  // A click closes only when the press that produced it also began on the
  // backdrop. Otherwise a gesture that starts inside the panel and ends outside
  // it - dragging a zoomed image, selecting to the end of a line - dismisses
  // the thing the user was working in.
  const pressedBackdrop = useRef(false);
  // Read through a ref so the listener below does not have to be torn down and
  // re-registered - which would send this overlay to the top of the stack - on
  // every render that happens to pass a new closure.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      // Still on top: an overlay opened on top of this one answers instead.
      if (escapeStack[escapeStack.length - 1] !== onKey) return;
      if (closeOnEscape) close.current();
    };
    escapeStack.push(onKey);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = escapeStack.indexOf(onKey);
      if (at !== -1) escapeStack.splice(at, 1);
    };
  }, [open, closeOnEscape]);

  if (!mounted) return null;

  return createPortal(
    <div
      data-state={state}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (closeOnBackdrop && pressedBackdrop.current && e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex ${containerClassName} ${backdropClassName} ${overlayTiming} data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0`}
    >
      <div
        data-state={state}
        className={`${overlayTiming} data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 fleet-shadow-overlay ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
