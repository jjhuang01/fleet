import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '../hooks/use-presence';
import { overlayExitMs, overlayTiming } from '../lib/motion';
import { FOCUSABLE_SELECTOR, isTabStop, tabTarget } from '../lib/focus-trap';

/**
 * The overlays that are open, oldest first.
 *
 * Every overlay listens for Escape on `document`, so with a dialog stacked on a
 * dialog one press used to reach both listeners and take the whole stack down -
 * the workflow underneath went with the panel the user actually dismissed.
 * Only the last one opened answers now.
 */
const escapeStack: Array<(e: KeyboardEvent) => void> = [];

/**
 * The panels that are open, oldest first, so only the top one traps Tab.
 *
 * Tab is trapped because `aria-modal` is a promise and the browser does not keep
 * it: without this, Tab walks out of the dialog and into the panes behind it,
 * which are real focusable terminals.
 */
const overlayPanels: HTMLElement[] = [];

/** Everything the browser will move focus to inside a panel, in DOM order. */
function focusablesIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) =>
    isTabStop({ tabIndex: el.tabIndex, rectCount: el.getClientRects().length })
  );
}

/**
 * The last thing outside a panel to have had focus.
 *
 * A panel whose first control carries `autoFocus` has already been given focus
 * by the time this component's own effect runs - React applies `autoFocus` as
 * part of the commit, effects come after - so `document.activeElement` there is
 * the panel's own control, and closing would hand focus back to something that
 * is about to be taken off the page. Watching focus move is what still leaves
 * the control that opened the panel, which is the one to come back to.
 */
let focusBeforePanel: HTMLElement | null = null;

// Guarded because this module is also imported by tests with no document.
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Anything inside a modal belongs to that modal. What is wanted is the
      // thing the modal took focus from.
      if (target.closest('[role="dialog"][aria-modal="true"]') !== null) return;
      focusBeforePanel = target;
    },
    true
  );
}

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
  /**
   * Accessible name for the dialog. Omit it and the dialog is named after the
   * first heading inside the panel, which is what most panels already show.
   */
  label?: string;
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
  backdropClassName = 'bg-black/25 dark:bg-black/60',
  label
}: OverlayProps): React.JSX.Element | null {
  const { mounted, state } = usePresence(open, overlayExitMs);
  // A click closes only when the press that produced it also began on the
  // backdrop. Otherwise a gesture that starts inside the panel and ends outside
  // it - dragging a zoomed image, selecting to the end of a line - dismisses
  // the thing the user was working in.
  const pressedBackdrop = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const [labelledBy, setLabelledBy] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (panel === null) return;

    // Name the dialog after the heading it already draws, so every overlay is
    // announceable without its call site having to pass a string.
    const heading = panel.querySelector<HTMLElement>('h1, h2, h3');
    if (heading?.id === '') heading.id = headingId;
    setLabelledBy(heading?.id);

    const active = document.activeElement;
    // What holds focus now, unless that is already inside the panel - which is
    // the `autoFocus` case above, and the one the tracked element answers.
    const previouslyFocused =
      active instanceof HTMLElement && !panel.contains(active) ? active : focusBeforePanel;
    // Only move focus in when nothing inside has taken it: a panel that focuses
    // its own field on mount does so in a child effect, which runs before this
    // one, and taking it back would break that field.
    if (!panel.contains(document.activeElement)) {
      (focusablesIn(panel)[0] ?? panel).focus({ preventScroll: true });
    }

    overlayPanels.push(panel);
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      if (overlayPanels[overlayPanels.length - 1] !== panel) return;
      const items = focusablesIn(panel);
      const at =
        document.activeElement instanceof HTMLElement ? items.indexOf(document.activeElement) : -1;
      const target = tabTarget(at, items.length, e.shiftKey);
      // The common case: the browser's own next stop is inside the panel.
      if (!target.hold) return;
      e.preventDefault();
      (target.index === null ? panel : (items[target.index] ?? panel)).focus({
        preventScroll: true
      });
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const at = overlayPanels.indexOf(panel);
      if (at !== -1) overlayPanels.splice(at, 1);
      // Hand focus back to whatever had it, when that thing is still on the page.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, mounted, headingId]);

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
        ref={panelRef}
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label === undefined ? labelledBy : undefined}
        tabIndex={-1}
        className={`${overlayTiming} data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2 fleet-shadow-overlay ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
