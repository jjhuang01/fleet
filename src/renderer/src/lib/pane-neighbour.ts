export type PaneBox = { left: number; top: number; right: number; bottom: number };
export type PaneDirection = 'left' | 'right' | 'up' | 'down';

/** One pixel of slack: dividers leave a 6px seam between the boxes they bound. */
const EPSILON = 1;

/**
 * The pane a person would point at when they say "the one to the left of this".
 *
 * Only panes lying wholly on that side count, and the nearest one wins: a step
 * never jumps over an adjacent pane to reach one that merely shares more edge
 * with the source. In a 2x2, "left" from the bottom-right pane is the
 * bottom-left pane and not the one diagonally across the row; in a row of three
 * columns it is the middle column, however the middle column is split. Sharing
 * more edge only breaks a tie between panes the same distance away, which is
 * what picks the tall pane over a short one beside it. Returns null when the
 * source is on that edge already.
 *
 * Pure and pixel-based so it can be reasoned about (and tested) without a DOM;
 * callers convert their own layout rectangles.
 */
export function neighbourInDirection(
  panes: Array<{ id: string; box: PaneBox }>,
  paneId: string,
  direction: PaneDirection
): string | null {
  const source = panes.find((pane) => pane.id === paneId);
  if (!source) return null;

  const vertical = direction === 'left' || direction === 'right';
  let bestId: string | null = null;
  let bestOverlap = 0;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const pane of panes) {
    if (pane.id === paneId) continue;
    const box = pane.box;

    const onSide =
      direction === 'left'
        ? box.right <= source.box.left + EPSILON
        : direction === 'right'
          ? box.left >= source.box.right - EPSILON
          : direction === 'up'
            ? box.bottom <= source.box.top + EPSILON
            : box.top >= source.box.bottom - EPSILON;
    if (!onSide) continue;

    const overlap = vertical
      ? Math.min(source.box.bottom, box.bottom) - Math.max(source.box.top, box.top)
      : Math.min(source.box.right, box.right) - Math.max(source.box.left, box.left);
    // Sharing only a corner is not "next to".
    if (overlap <= EPSILON) continue;

    const gap =
      direction === 'left'
        ? source.box.left - box.right
        : direction === 'right'
          ? box.left - source.box.right
          : direction === 'up'
            ? source.box.top - box.bottom
            : box.top - source.box.bottom;

    const closer = gap < bestGap - EPSILON;
    const sameGapMoreOverlap =
      Math.abs(gap - bestGap) <= EPSILON && overlap > bestOverlap + EPSILON;
    if (closer || sameGapMoreOverlap) {
      bestId = pane.id;
      bestOverlap = overlap;
      bestGap = gap;
    }
  }

  return bestId;
}
