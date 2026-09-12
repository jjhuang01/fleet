import { describe, expect, it } from 'vitest';
import { CompositionGuard } from '../composition-guard';

const COMPOSITION = 'echo ime';

describe('CompositionGuard', () => {
  it('forwards a committed composition once', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);

    expect(guard.shouldForward(COMPOSITION, 1_001)).toBe(true);
    expect(guard.shouldForward(COMPOSITION, 1_002)).toBe(false);
  });

  it('drops the repeat xterm emits when a key flushes the composition early', () => {
    // Pressing Enter mid-composition makes xterm send the text from the keydown
    // path; the compositionend that follows re-reads the textarea and sends the
    // same text a second time.
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    expect(guard.shouldForward(COMPOSITION, 1_000)).toBe(true);
    guard.compositionEnd(COMPOSITION, 1_001);

    expect(guard.shouldForward(COMPOSITION, 1_002)).toBe(false);
  });

  it('lets the same text through again as a new composition', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);
    expect(guard.shouldForward(COMPOSITION, 1_001)).toBe(true);

    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 2_000);
    expect(guard.shouldForward(COMPOSITION, 2_001)).toBe(true);
  });

  it('passes input that is not the composition text', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);

    expect(guard.shouldForward('ls\r', 1_001)).toBe(true);
  });

  it('stops suppressing once the composition episode is over', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);
    expect(guard.shouldForward(COMPOSITION, 1_001)).toBe(true);

    expect(guard.shouldForward(COMPOSITION, 9_000)).toBe(true);
  });
});
