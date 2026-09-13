import { describe, it, expect } from 'vitest';
import { neighbourInDirection, type PaneBox } from '../pane-neighbour';

function box(left: number, top: number, width: number, height: number): PaneBox {
  return { left, top, right: left + width, bottom: top + height };
}

/** 2x2, 100x100 cells, with the 6px seam the grid leaves between them. */
const GRID = [
  { id: 'tl', box: box(0, 0, 100, 100) },
  { id: 'tr', box: box(106, 0, 100, 100) },
  { id: 'bl', box: box(0, 106, 100, 100) },
  { id: 'br', box: box(106, 106, 100, 100) }
];

describe('neighbourInDirection', () => {
  it('finds the pane on the same row when moving sideways in a 2x2', () => {
    expect(neighbourInDirection(GRID, 'br', 'left')).toBe('bl');
    expect(neighbourInDirection(GRID, 'bl', 'right')).toBe('br');
  });

  it('finds the pane on the same column when moving up or down in a 2x2', () => {
    expect(neighbourInDirection(GRID, 'br', 'up')).toBe('tr');
    expect(neighbourInDirection(GRID, 'tr', 'down')).toBe('br');
  });

  it('ignores panes that only touch at a corner', () => {
    // `bl` shares no edge with `tr`, so the diagonal is not a neighbour.
    expect(neighbourInDirection(GRID, 'tr', 'down')).toBe('br');
    expect(neighbourInDirection(GRID, 'br', 'up')).toBe('tr');
  });

  it('returns null at the edge of the layout', () => {
    expect(neighbourInDirection(GRID, 'tl', 'left')).toBeNull();
    expect(neighbourInDirection(GRID, 'tl', 'up')).toBeNull();
    expect(neighbourInDirection(GRID, 'br', 'right')).toBeNull();
  });

  it('prefers the neighbour sharing the most edge when both are as far away', () => {
    // Left column: a tall pane over two short ones. Moving left from the middle
    // of the right pane hits the tall one; from the bottom, the bottom-left one.
    const stack = [
      { id: 'right', box: box(200, 0, 100, 300) },
      { id: 'tallLeft', box: box(0, 0, 100, 200) },
      { id: 'shortLeft', box: box(0, 206, 100, 94) }
    ];
    expect(neighbourInDirection(stack, 'right', 'left')).toBe('tallLeft');
    expect(
      neighbourInDirection([stack[0], { id: 'low', box: box(0, 150, 100, 150) }], 'right', 'left')
    ).toBe('low');
  });

  it('steps into the next column instead of jumping over it', () => {
    // Three columns with the middle one split top to bottom. Moving left from
    // the full-height right column reaches the middle column first; the
    // leftmost column merely happens to share more edge with the source.
    const row = [
      { id: 'right', box: box(212, 0, 100, 300) },
      { id: 'midTop', box: box(106, 0, 100, 147) },
      { id: 'midBottom', box: box(106, 153, 100, 147) },
      { id: 'left', box: box(0, 0, 100, 300) }
    ];
    expect(['midTop', 'midBottom']).toContain(neighbourInDirection(row, 'right', 'left'));
    expect(neighbourInDirection(row, 'midTop', 'left')).toBe('left');
  });

  it('takes the closest pane when two share the same edge overlap', () => {
    const three = [
      { id: 'self', box: box(0, 0, 100, 100) },
      { id: 'near', box: box(106, 0, 100, 100) },
      { id: 'far', box: box(212, 0, 100, 100) }
    ];
    expect(neighbourInDirection(three, 'self', 'right')).toBe('near');
  });

  it('returns null for a pane that is not in the layout', () => {
    expect(neighbourInDirection(GRID, 'gone', 'left')).toBeNull();
  });
});
