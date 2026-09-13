import { describe, it, expect } from 'vitest';
import { isTabStop, tabTarget } from '../focus-trap';

/** An element's two deciding facts, without needing a DOM to have one. */
function facts(tabIndex: number, rectCount: number): { tabIndex: number; rectCount: number } {
  return { tabIndex, rectCount };
}

describe('isTabStop', () => {
  it('accepts what the browser reaches with Tab', () => {
    expect(isTabStop(facts(0, 1))).toBe(true);
    expect(isTabStop(facts(3, 1))).toBe(true);
  });

  it('rejects what it reaches only programmatically', () => {
    // A button the author skipped, and a disabled one: both are -1.
    expect(isTabStop(facts(-1, 1))).toBe(false);
  });

  it('rejects what lays out no box', () => {
    expect(isTabStop(facts(0, 0))).toBe(false);
  });
});

describe('tabTarget', () => {
  it('wraps forward from the last stop to the first', () => {
    expect(tabTarget(2, 3, false)).toEqual({ hold: true, index: 0 });
  });

  it('wraps backward from the first stop to the last', () => {
    expect(tabTarget(0, 3, true)).toEqual({ hold: true, index: 2 });
  });

  it('leaves a move between two stops to the browser', () => {
    expect(tabTarget(0, 3, false)).toEqual({ hold: false });
    expect(tabTarget(1, 3, false)).toEqual({ hold: false });
    expect(tabTarget(1, 3, true)).toEqual({ hold: false });
    expect(tabTarget(2, 3, true)).toEqual({ hold: false });
  });

  it('pulls focus into the dialog when it is on the panel or outside', () => {
    expect(tabTarget(-1, 3, false)).toEqual({ hold: true, index: 0 });
    expect(tabTarget(-1, 3, true)).toEqual({ hold: true, index: 2 });
  });

  it('holds focus on the panel when there is nothing to move to', () => {
    // Every button disabled: nowhere inside to go, and the default has to be
    // stopped or Tab lands on the panes behind the dialog.
    expect(tabTarget(-1, 0, false)).toEqual({ hold: true, index: null });
    expect(tabTarget(-1, 0, true)).toEqual({ hold: true, index: null });
  });

  it('treats a single stop as both ends', () => {
    expect(tabTarget(0, 1, false)).toEqual({ hold: true, index: 0 });
    expect(tabTarget(0, 1, true)).toEqual({ hold: true, index: 0 });
  });
});
