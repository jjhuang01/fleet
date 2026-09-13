import { Suspense, lazy, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PaneNode, PaneLeaf, TerminalBackground } from '../../../shared/types';
import type { PathContext } from '../../../shared/shell-profiles';
import type { RemoteFileRef } from '../../../shared/remote-ssh-types';
import type { TerminalThemeId } from '../../../shared/theme-presets';
import type { SlideshowFrame } from '../hooks/use-slideshow';
import { TerminalPane } from './TerminalPane';
import { PaneStatusGlyph } from './PaneStatusGlyph';
import { RemoteFileGate } from './ssh/RemoteFileGate';
import { useWorkspaceStore } from '../store/workspace-store';
import { useNotificationStore } from '../store/notification-store';
import { activityRingClass } from '../lib/activity-glyph';
import { PANE_DRAG_MIME, hasPanePayload } from '../lib/pane-drag';
import { neighbourInDirection, type PaneBox, type PaneDirection } from '../lib/pane-neighbour';
import { createLogger } from '../logger';
import { useTranslation } from '../lib/i18n';

const log = createLogger('layout:panes');

// Only TerminalPane is imported eagerly. Every other pane type drags in a large
// dependency it alone needs — pdfjs, CodeMirror, highlight.js, shiki — and a
// window that opens on terminals should not pay to parse any of them. These are
// local disk reads inside Electron, so the chunk resolves within a frame or two.
const ImageViewerPane = lazy(async () => ({
  default: (await import('./ImageViewerPane')).ImageViewerPane
}));
const PdfViewerPane = lazy(async () => ({
  default: (await import('./PdfViewerPane')).PdfViewerPane
}));
const FileEditorPane = lazy(async () => ({
  default: (await import('./FileEditorPane')).FileEditorPane
}));
const MarkdownPane = lazy(async () => ({
  default: (await import('./MarkdownPane')).MarkdownPane
}));
const SshBrowserPane = lazy(async () => ({
  default: (await import('./ssh/SshBrowserPane')).SshBrowserPane
}));
const AgentPane = lazy(async () => ({
  default: (await import('./agent/AgentPane')).AgentPane
}));

// Panes sit on the themed pane background, so an empty box is the right
// placeholder — anything more would flash in and out within a couple of frames.
const PANE_FALLBACK = <div className="h-full w-full" />;

// --- Calc-based absolute positioning system ---
// Each dimension is expressed as `calc(pct% + px)` to handle the 6px resize
// handles without knowing the container's pixel size at render time.

type CalcValue = { pct: number; px: number };
type Rect = { top: CalcValue; left: CalcValue; width: CalcValue; height: CalcValue };

const HANDLE_PX = 6;
const HALF_HANDLE = HANDLE_PX / 2;
// The seam stays 6px so the gutters between cards read the same, but the strip
// that answers the pointer is 12px - the leeway iced gives Otty's splitters
// (`PANE_RESIZE_GRAB`). Half of the extra 6px hangs over each neighbour's own
// 1px padding, so what a divider steals from a pane is a 2px sliver at its
// very edge, and the target it buys is a divider you can actually hit.
const HANDLE_HIT_PX = 12;
// The grip sitting on an intersection. Bigger than the 6px seam so it is easy to
// hit, small enough that the rest of both dividers stays grabbable.
const CORNER_PX = 14;

function cv(pct: number, px: number): CalcValue {
  return { pct, px };
}

function toCSS(v: CalcValue): string {
  if (v.px === 0) return `${v.pct}%`;
  if (v.pct === 0) return `${v.px}px`;
  return `calc(${v.pct}% + ${v.px}px)`;
}

function addCV(a: CalcValue, b: CalcValue): CalcValue {
  return { pct: a.pct + b.pct, px: a.px + b.px };
}

function scaleCV(a: CalcValue, f: number): CalcValue {
  return { pct: a.pct * f, px: a.px * f };
}

function calcToPixels(v: CalcValue, containerDim: number): number {
  return containerDim * (v.pct / 100) + v.px;
}

/**
 * A key for "these two dividers sit on the same line".
 *
 * Rounding rather than comparing the expressions as written: a divider a third
 * of the way across arrives as 33.33333333333333 on one branch and
 * 33.333333333333336 on another, and a raw string compare would call those two
 * different lines - leaving one column behind when the corner is dragged. A
 * thousandth of a percent is far below anything a pointer can aim at and far
 * above the drift.
 */
function lineKeyOf(v: CalcValue): string {
  return `${Math.round(v.pct * 1000)}:${Math.round(v.px * 1000)}`;
}

// --- Layout computation ---

type LeafEntry = { id: string; node: PaneLeaf; rect: Rect };
type HandleEntry = {
  key: string;
  path: number[];
  direction: 'horizontal' | 'vertical';
  rect: Rect;
  splitRect: Rect;
  /** The split's live ratio, so keyboard resizing can step from where the divider is. */
  ratio: number;
};
/**
 * A corner sits where two dividers cross. Dragging it moves both: this node's
 * divider along one axis, and every divider collinear with the crossing one
 * along the other - which is what lets a 2x2 grid resize along the diagonal
 * instead of one axis at a time.
 */
type CornerEntry = {
  key: string;
  anchor: { path: number[]; direction: 'horizontal' | 'vertical'; rect: Rect };
  linked: Array<{ path: number[]; rect: Rect }>;
  rect: Rect;
};
type Layout = { leaves: LeafEntry[]; handles: HandleEntry[]; corners: CornerEntry[] };

function sameCV(a: CalcValue, b: CalcValue): boolean {
  return Math.abs(a.pct - b.pct) < 1e-9 && Math.abs(a.px - b.px) < 1e-9;
}

/**
 * Whether a divider running the other way actually reaches this one.
 *
 * Two dividers cross only where they meet. A perpendicular one nested deeper
 * than a single level - three columns where the rightmost is split top to
 * bottom - stops inside its own column, short of the divider between the first
 * two. A grip placed at that crossing would sit where no divider runs and would
 * drag a divider the user never pointed at.
 */
function bandReachesDivider(
  band: Rect,
  divider: Rect,
  isH: boolean,
  side: 'start' | 'end'
): boolean {
  if (isH) {
    return side === 'start'
      ? sameCV(addCV(band.left, band.width), divider.left)
      : sameCV(band.left, addCV(divider.left, divider.width));
  }
  return side === 'start'
    ? sameCV(addCV(band.top, band.height), divider.top)
    : sameCV(band.top, addCV(divider.top, divider.height));
}

function computeLayout(node: PaneNode, rect: Rect, path: number[]): Layout {
  if (node.type === 'leaf') {
    return { leaves: [{ id: node.id, node, rect }], handles: [], corners: [] };
  }

  const r = node.ratio;
  const isH = node.direction === 'horizontal';

  let leftRect: Rect, handleRect: Rect, rightRect: Rect;

  if (isH) {
    const leftW = addCV(scaleCV(rect.width, r), cv(0, -HALF_HANDLE));
    const hLeft = addCV(rect.left, leftW);
    const rLeft = addCV(hLeft, cv(0, HANDLE_PX));
    const rightW = addCV(scaleCV(rect.width, 1 - r), cv(0, -HALF_HANDLE));

    leftRect = { top: rect.top, left: rect.left, width: leftW, height: rect.height };
    handleRect = { top: rect.top, left: hLeft, width: cv(0, HANDLE_PX), height: rect.height };
    rightRect = { top: rect.top, left: rLeft, width: rightW, height: rect.height };
  } else {
    const topH = addCV(scaleCV(rect.height, r), cv(0, -HALF_HANDLE));
    const hTop = addCV(rect.top, topH);
    const bTop = addCV(hTop, cv(0, HANDLE_PX));
    const botH = addCV(scaleCV(rect.height, 1 - r), cv(0, -HALF_HANDLE));

    leftRect = { top: rect.top, left: rect.left, width: rect.width, height: topH };
    handleRect = { top: hTop, left: rect.left, width: rect.width, height: cv(0, HANDLE_PX) };
    rightRect = { top: bTop, left: rect.left, width: rect.width, height: botH };
  }

  const left = computeLayout(node.children[0], leftRect, [...path, 0]);
  const right = computeLayout(node.children[1], rightRect, [...path, 1]);

  // Dividers running at right angles to this one, grouped by the line they sit
  // on: a corner drag moves every divider on that line together, so the row
  // stays straight instead of leaving one column behind. A line only earns a
  // grip where it actually runs into this divider - see `bandReachesDivider`.
  const groups = new Map<string, { handles: HandleEntry[]; reaches: boolean }>();
  const perpendicular: Array<{ handle: HandleEntry; side: 'start' | 'end' }> = [
    ...left.handles.map((handle) => ({ handle, side: 'start' as const })),
    ...right.handles.map((handle) => ({ handle, side: 'end' as const }))
  ];
  for (const { handle, side } of perpendicular) {
    if (handle.direction === node.direction) continue;
    const lineKey = lineKeyOf(isH ? handle.rect.top : handle.rect.left);
    const reaches = bandReachesDivider(handle.rect, handleRect, isH, side);
    const group = groups.get(lineKey);
    if (group) {
      group.handles.push(handle);
      group.reaches = group.reaches || reaches;
    } else {
      groups.set(lineKey, { handles: [handle], reaches });
    }
  }

  const offset = cv(0, HALF_HANDLE - CORNER_PX / 2);
  const corners: CornerEntry[] = [];
  for (const [lineKey, group] of groups) {
    // A group no member of which runs into this divider never crosses it. A
    // divider nested two levels down stops inside its own column, and a grip
    // anchored there would sit on bare divider and drag the wrong thing.
    if (!group.reaches) continue;
    const line = isH ? group.handles[0].rect.top : group.handles[0].rect.left;
    corners.push({
      key: `${path.join('-') || 'root'}:${lineKey}`,
      anchor: { path, direction: node.direction, rect },
      linked: group.handles.map((handle) => ({ path: handle.path, rect: handle.splitRect })),
      rect: isH
        ? {
            top: addCV(line, offset),
            left: addCV(handleRect.left, offset),
            width: cv(0, CORNER_PX),
            height: cv(0, CORNER_PX)
          }
        : {
            top: addCV(handleRect.top, offset),
            left: addCV(line, offset),
            width: cv(0, CORNER_PX),
            height: cv(0, CORNER_PX)
          }
    });
  }

  return {
    leaves: [...left.leaves, ...right.leaves],
    corners: [...left.corners, ...right.corners, ...corners],
    handles: [
      ...left.handles,
      ...right.handles,
      {
        key: path.join('-') || 'root',
        path,
        direction: node.direction,
        rect: handleRect,
        splitRect: rect,
        ratio: r
      }
    ]
  };
}

// The canvas gutter is 8px, and two things already contribute to it between a
// pair of panes: each leaf's own padding, twice, plus the HANDLE_PX seam the
// split maths carves out for the resize handle. So the leaf padding is what is
// left over - (8 - 6) / 2 = 1 - and the grid's outer inset is the rest, 7, to
// bring the window edge to the same 8.
//
// The outer inset cannot live on the grid element itself: leaves are absolutely
// positioned, and an absolute child resolves against its ancestor's padding
// box, so padding there moves nothing. It goes on a wrapper instead.
const PANE_GUTTER = 'p-px';
const GRID_INSET = 'p-[7px]';

function rectStyle(rect: Rect): React.CSSProperties {
  return {
    position: 'absolute',
    top: toCSS(rect.top),
    left: toCSS(rect.left),
    width: toCSS(rect.width),
    height: toCSS(rect.height)
  };
}

// --- Components ---

type PaneDropSide = 'left' | 'right' | 'top' | 'bottom';

type PaneFrameProps = {
  paneId: string;
  isActive: boolean;
  /** Non-terminal panes (file/markdown/image/pdf) have no activity tracking and aren't "agents" - they still get the focus lift and status ring, but not the status glyph. */
  showGlyph?: boolean;
  children: React.ReactNode;
};

function paneDropSide(e: React.DragEvent<HTMLDivElement>): PaneDropSide {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const nearest = Math.min(x, 1 - x, y, 1 - y);
  if (nearest === x) return 'left';
  if (nearest === 1 - x) return 'right';
  return nearest === y ? 'top' : 'bottom';
}

/**
 * Wraps a leaf pane so it can subscribe to its own activity state - a ring
 * appears in the colour of that state when it wants attention, and a corner
 * glyph encodes state + process liveness always.
 *
 * Focus is carried by elevation and by the pane's own title bar, never by a
 * colour. The focused card keeps its shadow and its title bar lights up; every
 * other card flattens onto the canvas and its title bar goes grey. That is the
 * active/inactive window model macOS has used for decades, and it leaves the
 * accent free to keep meaning "something needs you" - the status ring, the
 * activity glyph, the permission prompt. An accent ring here made the colour
 * say two unrelated things, and shouted the less interesting one.
 *
 * `group/pane` + `data-pane-active` is how the title bars downstream find out;
 * see `PaneHeader` and `PathChromeHeader`. It avoids threading a prop through
 * five pane types that otherwise have no interest in focus.
 */
function PaneFrame({
  paneId,
  isActive,
  showGlyph = true,
  children
}: PaneFrameProps): React.JSX.Element {
  const movePane = useWorkspaceStore((s) => s.movePane);
  const activityState = useNotificationStore((s) => s.activities.get(paneId)?.state);
  const ringClass = activityRingClass(activityState);
  const [dropSide, setDropSide] = useState<PaneDropSide | null>(null);
  // A drag carries no readable payload while it is in flight - `getData` only
  // answers on drop, so during dragover every pane looks like a valid target,
  // including the one being dragged. Tracking the source locally is what keeps
  // a pane from offering to drop onto itself.
  const [isDragSource, setIsDragSource] = useState(false);

  const acceptsPane = useCallback(
    (event: React.DragEvent<HTMLDivElement>): boolean => !isDragSource && hasPanePayload(event),
    [isDragSource]
  );

  const clearDropSide = useCallback(() => setDropSide(null), []);

  const handleDragStart = useCallback(() => setIsDragSource(true), []);

  const handleDragEnd = useCallback(() => {
    setIsDragSource(false);
    clearDropSide();
    // The sidebar cannot see the drag end - it is raised on the source - and a
    // drop zone left lit after an abandoned drag reads as a stuck state.
    document.dispatchEvent(new CustomEvent('fleet:pane-drag-end'));
  }, [clearDropSide]);

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (
        event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)
      ) {
        return;
      }
      clearDropSide();
    },
    [clearDropSide]
  );

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!acceptsPane(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDropSide(paneDropSide(event));
    },
    [acceptsPane]
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!acceptsPane(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDropSide(paneDropSide(event));
    },
    [acceptsPane]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!acceptsPane(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const sourcePaneId = event.dataTransfer.getData(PANE_DRAG_MIME);
      movePane(sourcePaneId, paneId, paneDropSide(event));
      clearDropSide();
    },
    [acceptsPane, clearDropSide, movePane, paneId]
  );

  return (
    // Two elements because the drop shadow and the state ring are both
    // box-shadow, and the ring classes set it raw, so anything sharing an
    // element with them loses. The outer div owns the lift, the inner the ring.
    <div
      className={`h-full rounded-lg transition-shadow duration-150 ${
        isActive ? 'shadow-lg shadow-black/10 dark:shadow-black/30' : ''
      }`}
      onDragStartCapture={handleDragStart}
      onDragEndCapture={handleDragEnd}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
    >
      {/* No border. A pane is bounded by the gutter around it, its own rounded
          ground, and its title bar; drawing an edge as well only restated what
          those already said, and against a background image the extra line read
          as an outline pasted over the picture rather than the card's own edge.
          What is left - the focused card's lift, and a status ring when a pane
          actually wants you - is the part that carries information. */}
      <div
        data-pane-active={isActive ? 'true' : 'false'}
        className={`group/pane relative flex flex-col h-full overflow-hidden rounded-lg ${ringClass}`}
      >
        {showGlyph && (
          <PaneStatusGlyph state={activityState} className="absolute top-1 right-1 z-10" />
        )}
        {dropSide && (
          <div
            aria-hidden
            className={`pointer-events-none absolute z-50 rounded-lg border-2 fleet-accent-border fleet-accent-bg-soft ${
              dropSide === 'left'
                ? 'inset-y-0 left-0 w-1/2'
                : dropSide === 'right'
                  ? 'inset-y-0 right-0 w-1/2'
                  : dropSide === 'top'
                    ? 'inset-x-0 top-0 h-1/2'
                    : 'inset-x-0 bottom-0 h-1/2'
            }`}
          />
        )}
        {/* Inactive panes used to dim the whole subtree, which dimmed terminal
            text along with the chrome. The card's ring and its ground colour
            carry that signal now, so the text stays at full contrast. */}
        <div className="flex flex-1 min-h-0 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** The layout's rectangles as pixels, which is the space the neighbour search works in. */
function leafBoxes(
  leaves: LeafEntry[],
  width: number,
  height: number
): Array<{
  id: string;
  box: PaneBox;
}> {
  return leaves.map((leaf) => {
    const left = calcToPixels(leaf.rect.left, width);
    const top = calcToPixels(leaf.rect.top, height);
    return {
      id: leaf.id,
      box: {
        left,
        top,
        right: left + calcToPixels(leaf.rect.width, width),
        bottom: top + calcToPixels(leaf.rect.height, height)
      }
    };
  });
}

/** Where a pane lands when it is moved onto a neighbour, in `movePane` terms. */
const MOVE_SIDES: Record<PaneDirection, PaneDropSide> = {
  left: 'left',
  right: 'right',
  up: 'top',
  down: 'bottom'
};

type ViewerPaneType = 'file' | 'markdown' | 'image' | 'pdf';

function isViewerPaneType(paneType: PaneLeaf['paneType']): paneType is ViewerPaneType {
  return (
    paneType === 'file' || paneType === 'markdown' || paneType === 'image' || paneType === 'pdf'
  );
}

/**
 * Dispatches to the right viewer for a file-backed pane. `filePath` is always a
 * path the local `fs` can reach - for remote panes that is the cache copy, and
 * `remote` carries the origin so writes go back over SSH instead of into it.
 */
function ViewerPane({
  paneType,
  paneId,
  filePath,
  pathContext,
  remote
}: {
  paneType: ViewerPaneType;
  paneId: string;
  filePath: string;
  pathContext?: PathContext;
  remote?: RemoteFileRef;
}): React.JSX.Element {
  switch (paneType) {
    // The image and PDF viewers are read-only - they render straight from the
    // cache copy and only need `remote` to name the file the user asked for.
    case 'image':
      return <ImageViewerPane filePath={filePath} pathContext={pathContext} remote={remote} />;
    case 'pdf':
      return <PdfViewerPane filePath={filePath} pathContext={pathContext} remote={remote} />;
    case 'markdown':
      return (
        <MarkdownPane
          paneId={paneId}
          filePath={filePath}
          pathContext={pathContext}
          remote={remote}
        />
      );
    case 'file':
      return (
        <FileEditorPane
          paneId={paneId}
          filePath={filePath}
          pathContext={pathContext}
          remote={remote}
        />
      );
  }
}

type TerminalLeafProps = {
  paneId: string;
  node: PaneLeaf;
  isActive: boolean;
  onPaneFocus: (paneId: string) => void;
  serializedContent?: string;
  fontFamily?: string;
  fontSize?: number;
  scrollbackSize?: number;
  terminalTheme?: TerminalThemeId;
  terminalBackground?: TerminalBackground;
  slideshowFrame?: SlideshowFrame;
};

/*
 * The memo boundary for a single terminal. `memo` on `TerminalPane` itself
 * would be inert: its split/close/focus handlers can only be built per leaf, so
 * inlining them in the map would hand it four new functions on every grid
 * render. Owning them here makes them stable, which - together with the
 * identity-preserving tree walkers in the workspace store - means splitting or
 * renaming one pane no longer re-renders its siblings.
 */
const TerminalLeaf = memo(function TerminalLeaf({
  paneId,
  node,
  isActive,
  onPaneFocus,
  serializedContent,
  fontFamily,
  fontSize,
  scrollbackSize,
  terminalTheme,
  terminalBackground,
  slideshowFrame
}: TerminalLeafProps): React.JSX.Element {
  const splitPane = useWorkspaceStore((s) => s.splitPane);
  const closePane = useWorkspaceStore((s) => s.closePane);

  const handleFocus = useCallback(() => onPaneFocus(paneId), [onPaneFocus, paneId]);
  const handleSplitHorizontal = useCallback(
    () => splitPane(paneId, 'horizontal'),
    [splitPane, paneId]
  );
  const handleSplitVertical = useCallback(() => splitPane(paneId, 'vertical'), [splitPane, paneId]);
  const handleClose = useCallback(() => closePane(paneId), [closePane, paneId]);

  return (
    <TerminalPane
      paneId={paneId}
      cwd={node.cwd}
      isActive={isActive}
      label={node.label}
      labelIsCustom={node.labelIsCustom}
      onFocus={handleFocus}
      serializedContent={serializedContent}
      fontFamily={fontFamily}
      fontSize={fontSize}
      scrollbackSize={scrollbackSize}
      terminalTheme={terminalTheme}
      terminalBackground={terminalBackground}
      slideshowFrame={slideshowFrame}
      onSplitHorizontal={handleSplitHorizontal}
      onSplitVertical={handleSplitVertical}
      onClose={handleClose}
      shellProfileId={node.shellProfileId}
      cmd={node.cmd}
    />
  );
});

type PaneGridProps = {
  root: PaneNode;
  activePaneId: string | null;
  onPaneFocus: (paneId: string) => void;
  serializedPanes?: Map<string, string>;
  fontFamily?: string;
  fontSize?: number;
  scrollbackSize?: number;
  terminalTheme?: TerminalThemeId;
  terminalBackground?: TerminalBackground;
  slideshowFrame?: SlideshowFrame;
};

function PaneGridImpl({
  root,
  activePaneId,
  onPaneFocus,
  serializedPanes,
  fontFamily,
  fontSize,
  scrollbackSize,
  terminalTheme,
  terminalBackground,
  slideshowFrame
}: PaneGridProps): React.JSX.Element {
  const gridRef = useRef<HTMLDivElement>(null);

  // Stable reference — never changes, safe to omit from deps.
  const fullRect = useRef<Rect>({
    top: cv(0, 0),
    left: cv(0, 0),
    width: cv(100, 0),
    height: cv(100, 0)
  });

  const layout = useMemo(() => computeLayout(root, fullRect.current, []), [root]);
  const movePane = useWorkspaceStore((s) => s.movePane);

  // The keyboard's drag-and-drop: Cmd+Alt+Arrow asks the grid which pane sits
  // that way and re-docks onto it, exactly as dropping on that pane's edge does.
  // Only the tab on screen has an active pane, so background grids ignore it.
  useEffect(() => {
    const handler = (event: Event): void => {
      if (!(event instanceof CustomEvent)) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const detail = event.detail as { paneId?: string; direction?: PaneDirection } | undefined;
      if (!detail?.paneId || !detail.direction || detail.paneId !== activePaneId) return;
      const grid = gridRef.current;
      if (!grid) return;
      const neighbour = neighbourInDirection(
        leafBoxes(layout.leaves, grid.clientWidth, grid.clientHeight),
        detail.paneId,
        detail.direction
      );
      if (neighbour) movePane(detail.paneId, neighbour, MOVE_SIDES[detail.direction]);
    };
    document.addEventListener('fleet:move-pane', handler);
    return () => document.removeEventListener('fleet:move-pane', handler);
  }, [activePaneId, layout, movePane]);

  return (
    <div className={`h-full w-full ${GRID_INSET}`}>
      <div ref={gridRef} className="group/grid h-full w-full" style={{ position: 'relative' }}>
        {/* Terminal panes — flat keyed siblings, never unmounted by tree changes */}
        {layout.leaves.map((leaf) => {
          if (leaf.node.paneType === 'agent') {
            return (
              <div key={leaf.id} className={PANE_GUTTER} style={rectStyle(leaf.rect)}>
                {/* No PaneHeader: like the other non-terminal panes, the agent
                  pane owns its own chrome and has no live cwd to show. */}
                <PaneFrame paneId={leaf.id} isActive={leaf.id === activePaneId} showGlyph={false}>
                  <Suspense fallback={PANE_FALLBACK}>
                    <AgentPane
                      paneId={leaf.id}
                      cwd={leaf.node.cwd}
                      sessionId={leaf.node.agentSessionId}
                      terminalBackground={terminalBackground}
                      slideshowFrame={slideshowFrame}
                    />
                  </Suspense>
                </PaneFrame>
              </div>
            );
          }
          if (leaf.node.paneType === 'ssh-browser' && leaf.node.remoteHost) {
            const host = leaf.node.remoteHost;
            return (
              <div key={leaf.id} className={PANE_GUTTER} style={rectStyle(leaf.rect)}>
                <PaneFrame paneId={leaf.id} isActive={leaf.id === activePaneId} showGlyph={false}>
                  <Suspense fallback={PANE_FALLBACK}>
                    <SshBrowserPane
                      paneId={leaf.id}
                      host={host}
                      initialPath={leaf.node.remotePath}
                    />
                  </Suspense>
                </PaneFrame>
              </div>
            );
          }
          const viewerType = leaf.node.paneType;
          if (isViewerPaneType(viewerType)) {
            const node = leaf.node;
            const remote =
              node.remoteHost && node.remotePath
                ? { host: node.remoteHost, path: node.remotePath }
                : null;
            // Remote files are materialised into the local cache first, so every
            // viewer below sees an ordinary local path and needs no SSH awareness.
            return (
              <div key={leaf.id} className={PANE_GUTTER} style={rectStyle(leaf.rect)}>
                <PaneFrame paneId={leaf.id} isActive={leaf.id === activePaneId} showGlyph={false}>
                  <Suspense fallback={PANE_FALLBACK}>
                    {remote ? (
                      <RemoteFileGate host={remote.host} remotePath={remote.path}>
                        {(fetched) => (
                          <ViewerPane
                            paneType={viewerType}
                            paneId={leaf.id}
                            filePath={fetched.localPath}
                            remote={{ ...remote, mtimeMs: fetched.mtimeMs }}
                          />
                        )}
                      </RemoteFileGate>
                    ) : (
                      <ViewerPane
                        paneType={viewerType}
                        paneId={leaf.id}
                        filePath={node.filePath ?? ''}
                        pathContext={node.pathContext}
                      />
                    )}
                  </Suspense>
                </PaneFrame>
              </div>
            );
          }
          return (
            <div key={leaf.id} className={PANE_GUTTER} style={rectStyle(leaf.rect)}>
              {/* The glyph moved into the title bar, which the terminal draws
                itself - leaving it here too would put it under the actions. */}
              <PaneFrame paneId={leaf.id} isActive={leaf.id === activePaneId} showGlyph={false}>
                <div className="flex-1 min-h-0">
                  {/* The title bar is the terminal's own now, so that the pane
                    actions can live in it instead of over the output. */}
                  <TerminalLeaf
                    paneId={leaf.id}
                    node={leaf.node}
                    isActive={leaf.id === activePaneId}
                    onPaneFocus={onPaneFocus}
                    serializedContent={serializedPanes?.get(leaf.id) ?? leaf.node.serializedContent}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    scrollbackSize={scrollbackSize}
                    terminalTheme={terminalTheme}
                    terminalBackground={terminalBackground}
                    slideshowFrame={slideshowFrame}
                  />
                </div>
              </PaneFrame>
            </div>
          );
        })}

        {/* Resize handles */}
        {layout.handles.map((h) => (
          <AbsoluteResizeHandle
            key={h.key}
            direction={h.direction}
            path={h.path}
            rect={h.rect}
            splitRect={h.splitRect}
            ratio={h.ratio}
            gridRef={gridRef}
          />
        ))}

        {/* Intersections: drag one to resize the row and the column together */}
        {layout.corners.map((corner) => (
          <GridCornerHandle key={corner.key} corner={corner} gridRef={gridRef} />
        ))}
      </div>
    </div>
  );
}

/*
 * Backstop for #541. Every tab renders a grid and all of them stay mounted, so
 * one whole-object workspace update used to re-render every pane in the app.
 * The store guards are the real fix; this stops the next one that slips through.
 *
 * Requires callers to pass a stable `onPaneFocus` — see App.tsx.
 */
export const PaneGrid = memo(PaneGridImpl);

// --- Resize handle (absolute positioned) ---

/**
 * Where the pointer sits inside a split, expressed as the ratio that split
 * stores. Both the single-axis divider and the two-axis corner drag measure
 * positions this way, so a corner never disagrees with the divider it crosses.
 */
function ratioAtPoint(
  rect: Rect,
  axis: 'x' | 'y',
  point: { x: number; y: number },
  gridRect: DOMRect
): number | null {
  const containerDim = axis === 'x' ? gridRect.width : gridRect.height;
  const start = calcToPixels(axis === 'x' ? rect.left : rect.top, containerDim);
  const size = calcToPixels(axis === 'x' ? rect.width : rect.height, containerDim);
  if (size <= 0) return null;
  return ((axis === 'x' ? point.x : point.y) - start) / size;
}

type AbsoluteResizeHandleProps = {
  direction: 'horizontal' | 'vertical';
  path: number[];
  rect: Rect;
  splitRect: Rect;
  ratio: number;
  gridRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Whether a drag's own element has been hidden or removed mid-gesture.
 *
 * `offsetParent` is null inside a `display:none` subtree, which is what an
 * inactive tab is.
 */
function isGone(handle: HTMLElement | null): boolean {
  return handle === null || !handle.isConnected || handle.offsetParent === null;
}

function AbsoluteResizeHandle({
  direction,
  path,
  rect,
  splitRect,
  ratio,
  gridRef
}: AbsoluteResizeHandleProps): React.JSX.Element {
  const { t } = useTranslation();
  const isH = direction === 'horizontal';
  const resizeSplit = useWorkspaceStore((s) => s.resizeSplit);
  /** Ends a drag that is in progress; set only while one is running. */
  const releaseDrag = useRef<(() => void) | null>(null);

  // The drag listens on `document`, so leaving the grid in the middle of one -
  // the workspace closing under the cursor - would otherwise strand those
  // listeners along with the `col-resize` cursor and `user-select: none` they
  // set on the body.
  useEffect(() => () => releaseDrag.current?.(), []);

  // Grow the hit strip past the seam it draws, in the one axis that matters.
  const overhang = (HANDLE_HIT_PX - HANDLE_PX) / 2;
  const hitRect: Rect = isH
    ? { ...rect, left: cv(rect.left.pct, rect.left.px - overhang), width: cv(0, HANDLE_HIT_PX) }
    : { ...rect, top: cv(rect.top.pct, rect.top.px - overhang), height: cv(0, HANDLE_HIT_PX) };

  // The pointer drag is the primary gesture; the arrow keys are the same
  // gesture for anyone who cannot use it, and they step from the live ratio so
  // a held key keeps walking in one direction.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const towardsStart = isH ? 'ArrowLeft' : 'ArrowUp';
      const towardsEnd = isH ? 'ArrowRight' : 'ArrowDown';
      if (e.key !== towardsStart && e.key !== towardsEnd) return;
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.02;
      resizeSplit(path, ratio + (e.key === towardsStart ? -step : step));
    },
    [isH, path, ratio, resizeSplit]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;

      log.debug('resize start', { splitNodePath: path });

      const gridRect = grid.getBoundingClientRect();

      document.body.style.cursor = isH ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      const target = e.currentTarget;
      const handle = target instanceof HTMLElement ? target : null;
      const inner = handle?.querySelector('div') ?? null;
      if (inner) inner.classList.add('fleet-accent-bg', 'opacity-100');

      const onMouseMove = (moveEvent: MouseEvent): void => {
        // A drag survives the pointer leaving the window, but not the handle
        // being hidden: switching tabs leaves this grid `display:none`, and
        // `resizeSplit` acts on whichever tab is active now, so carrying on
        // would resize the layout the user just switched to.
        if (isGone(handle)) {
          release();
          return;
        }
        const ratio = ratioAtPoint(
          splitRect,
          isH ? 'x' : 'y',
          { x: moveEvent.clientX - gridRect.left, y: moveEvent.clientY - gridRect.top },
          gridRect
        );
        if (ratio !== null) resizeSplit(path, ratio);
      };

      const release = (): void => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (inner) inner.classList.remove('fleet-accent-bg', 'opacity-100');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        releaseDrag.current = null;
      };

      const onMouseUp = (): void => {
        release();
        log.debug('resize complete', { splitNodePath: path });
      };

      // The listeners are on `document`, so a drag that never sees its mouseup
      // - the pane closed under the cursor, a workspace switch, the pointer
      // leaving for another window - would otherwise keep them and the frozen
      // body cursor for the life of the renderer.
      releaseDrag.current = release;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [isH, path, splitRect, gridRef, resizeSplit]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      data-grid-handle={path.join('-') || 'root'}
      role="separator"
      // A separator that moves left and right splits left from right, which
      // ARIA spells `vertical` - the axis it runs along, not the one it moves.
      aria-orientation={isH ? 'vertical' : 'horizontal'}
      aria-label={t('panes.grid.resize')}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={15}
      aria-valuemax={85}
      tabIndex={0}
      style={{ ...rectStyle(hitRect), zIndex: 10 }}
      className={`flex items-center justify-center group/handle focus-ring ${
        isH ? 'cursor-col-resize' : 'cursor-row-resize'
      }`}
    >
      {/* The gutter between two cards already separates them, so the handle
          shows nothing until it is worth grabbing - then a short pill, not a
          full-length rule, because the thing being offered is a grip. */}
      <div
        className={`rounded-full bg-fleet-border-strong opacity-0 group-hover/handle:opacity-100 group-focus/handle:opacity-100 transition-opacity ${
          isH ? 'w-[3px] h-8' : 'h-[3px] w-8'
        }`}
      />
    </div>
  );
}

/**
 * The grip at a divider intersection. Dragging it moves the divider it sits on
 * and every divider collinear with the one it crosses, so a 2x2 grid can be
 * pulled towards a diagonal corner - making pane 1 or pane 4 bigger - in one
 * gesture instead of two.
 */
type GridCornerHandleProps = {
  corner: CornerEntry;
  gridRef: React.RefObject<HTMLDivElement | null>;
};

function GridCornerHandle({ corner, gridRef }: GridCornerHandleProps): React.JSX.Element {
  const resizeSplits = useWorkspaceStore((s) => s.resizeSplits);
  const { anchor, linked } = corner;
  /** Ends a drag that is in progress; set only while one is running. */
  const releaseDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => releaseDrag.current?.(), []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;

      log.debug('corner resize start', { splitNodePath: anchor.path });
      const gridRect = grid.getBoundingClientRect();
      // The anchor divider is crossed by dividers running the other way, so each
      // axis of the pointer drives one of them.
      const anchorAxis = anchor.direction === 'horizontal' ? 'x' : 'y';
      const linkedAxis = anchorAxis === 'x' ? 'y' : 'x';

      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';

      const target = e.currentTarget;
      const handle = target instanceof HTMLElement ? target : null;
      const inner = handle?.querySelector('div') ?? null;
      if (inner) inner.classList.add('fleet-accent-bg', 'opacity-100');

      const onMouseMove = (moveEvent: MouseEvent): void => {
        // Same guard as the divider grip, for the same reason.
        if (isGone(handle)) {
          release();
          return;
        }
        const point = {
          x: moveEvent.clientX - gridRect.left,
          y: moveEvent.clientY - gridRect.top
        };
        const anchorRatio = ratioAtPoint(anchor.rect, anchorAxis, point, gridRect);
        if (anchorRatio === null) return;

        const updates = [{ path: anchor.path, ratio: anchorRatio }];
        for (const entry of linked) {
          const ratio = ratioAtPoint(entry.rect, linkedAxis, point, gridRect);
          if (ratio !== null) updates.push({ path: entry.path, ratio });
        }
        resizeSplits(updates);
      };

      const release = (): void => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (inner) inner.classList.remove('fleet-accent-bg', 'opacity-100');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        releaseDrag.current = null;
      };

      const onMouseUp = (): void => {
        release();
        log.debug('corner resize complete', { splitNodePath: anchor.path });
      };

      releaseDrag.current = release;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [anchor, linked, gridRef, resizeSplits]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      data-grid-corner={corner.key}
      style={{ ...rectStyle(corner.rect), zIndex: 20 }}
      className="flex items-center justify-center cursor-move group/corner"
    >
      <div className="h-2.5 w-2.5 rounded-full bg-fleet-border-strong opacity-0 group-hover/grid:opacity-40 group-hover/corner:opacity-100 transition-opacity" />
    </div>
  );
}
