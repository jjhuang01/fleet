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

  it('forwards the same text again when it was pasted', () => {
    // Committing `a` and then pasting `a` produces two identical chunks. Only
    // the first belongs to the composition; the paste says the second is the
    // user's.
    const guard = new CompositionGuard();
    guard.compositionUpdate('a');
    guard.compositionEnd('a', 1_000);
    expect(guard.shouldForward('a', 1_001)).toBe(true);

    guard.paste();
    expect(guard.shouldForward('a', 1_050)).toBe(true);
  });

  it('drops the repeat whichever side of it the flushing key lands on', () => {
    // The two copies of one commit are indistinguishable from the user typing
    // the same text again, so the guard does not try: it drops the repeat while
    // the window is open, and only a new composition or a paste ends it.
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    expect(guard.shouldForward(COMPOSITION, 1_000)).toBe(true);

    guard.compositionEnd(COMPOSITION, 1_001);
    expect(guard.shouldForward(COMPOSITION, 1_002)).toBe(false);
  });

  it('drops the repeat even when the flushing key arrives between the copies', () => {
    // Regression: the `\r` the flushing Enter sends lands between the two copies
    // of the text. Counting keystrokes or treating different data as the end of
    // the episode let the second copy through, and the user saw their command
    // twice.
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    expect(guard.shouldForward(COMPOSITION, 1_000)).toBe(true);
    expect(guard.shouldForward('\r', 1_001)).toBe(true);

    guard.compositionEnd(COMPOSITION, 1_002);
    expect(guard.shouldForward(COMPOSITION, 1_003)).toBe(false);
  });

  it('stops suppressing once the composition episode is over', () => {
    const guard = new CompositionGuard();
    guard.compositionUpdate(COMPOSITION);
    guard.compositionEnd(COMPOSITION, 1_000);
    expect(guard.shouldForward(COMPOSITION, 1_001)).toBe(true);

    expect(guard.shouldForward(COMPOSITION, 9_000)).toBe(true);
  });
});
