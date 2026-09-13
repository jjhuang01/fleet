import { describe, expect, it } from 'vitest';
import { followAfterContentScroll, followAfterWheel } from '../scroll-follow';

/**
 * The failure these lock down: while output is streaming, scrolling up has to
 * stay scrolled up. Content arriving is not a reason to re-lock, and neither is
 * a whole-row position that a tolerant "at the bottom" test would still call the
 * bottom.
 */
describe('followAfterWheel', () => {
  it('lets an upward notch escape, whatever the position says', () => {
    // Three rows up is unambiguous; one row up is inside the tolerance that the
    // content path used to apply, and is the case that kept pulling people back.
    expect(followAfterWheel({ follow: true, upward: true, viewportY: 375, baseY: 376 })).toBe(
      false
    );
    expect(followAfterWheel({ follow: true, upward: true, viewportY: 373, baseY: 376 })).toBe(
      false
    );
  });

  it('does not escape when there is no scrollback to read', () => {
    expect(followAfterWheel({ follow: true, upward: true, viewportY: 0, baseY: 0 })).toBe(true);
  });

  it('re-locks on a downward notch once the view is back at the bottom', () => {
    expect(followAfterWheel({ follow: false, upward: false, viewportY: 376, baseY: 376 })).toBe(
      true
    );
    expect(followAfterWheel({ follow: false, upward: false, viewportY: 374, baseY: 376 })).toBe(
      true
    );
    expect(followAfterWheel({ follow: false, upward: false, viewportY: 373, baseY: 376 })).toBe(
      false
    );
  });
});

describe('followAfterContentScroll', () => {
  it('never takes the view away from where the user put it', () => {
    // Output arriving: the buffer's last row moves on, the viewport does not.
    expect(followAfterContentScroll({ follow: false, viewportY: 100, baseY: 900 })).toBe(false);
    // Even a row or two from the bottom: the user is reading, not following.
    expect(followAfterContentScroll({ follow: false, viewportY: 899, baseY: 900 })).toBe(false);
  });

  it('re-locks when the view has actually landed on the bottom', () => {
    // What the pane's own scroll-to-bottom leaves behind.
    expect(followAfterContentScroll({ follow: false, viewportY: 900, baseY: 900 })).toBe(true);
  });

  it('leaves a following pane following', () => {
    expect(followAfterContentScroll({ follow: true, viewportY: 898, baseY: 900 })).toBe(true);
  });
});
