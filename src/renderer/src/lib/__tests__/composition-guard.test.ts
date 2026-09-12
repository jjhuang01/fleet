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

  it('forwards the same text again once the user presses a key', () => {
    // Committing `a` and then pressing `a` again produces two identical chunks.
    // Only the first belongs to the composition, and the second is the user's.
    const guard = new CompositionGuard();
    guard.compositionUpdate('a');
    guard.compositionEnd('a', 1_000);
    expect(guard.shouldForward('a', 1_001)).toBe(true);

    guard.userKeystroke();
    expect(guard.shouldForward('a', 1_050)).toBe(true);
  });

  it('still drops the repeat made by the key that flushed the composition', () => {
    // Enter arrives before the copy it flushes, so that keystroke must not be
    // mistaken for the user typing the commit again.
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.userKeystroke();
    expect(guard.shouldForward(COMPOSITION, 1_000)).toBe(true);

    guard.compositionEnd(COMPOSITION, 1_001);
    expect(guard.shouldForward(COMPOSITION, 1_002)).toBe(false);
  });

  it('stops suppressing once the composition episode is over', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);
    expect(guard.shouldForward(COMPOSITION, 1_001)).toBe(true);

    expect(guard.shouldForward(COMPOSITION, 9_000)).toBe(true);
  });
});
