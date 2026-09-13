/**
 * How long after `compositionend` a repeat of the same text still counts as the
 * duplicate xterm emits for one IME commit. Both copies of a commit arrive in
 * the same tick, so the window only has to survive a frame.
 */
const DEDUPE_WINDOW_MS = 250;

/**
 * xterm can hand one IME commit to the PTY twice. Pressing a key that flushes the
 * composition early - Enter being the common one - sends the text from the
 * keydown path, and the `compositionend` that follows re-reads the textarea and
 * sends the same text again (xtermjs/xterm.js#6060). The repeated copy lands
 * after the first one has already run, so the user sees what they typed appear
 * twice.
 *
 * Within the window an exact repeat of the committed text is therefore dropped,
 * and the episode ends only on something a duplicate cannot be: a new
 * composition, a paste, or the window running out.
 *
 * Both obvious shortcuts are wrong, and both have shipped here:
 *
 * - Counting keystrokes cannot tell the user typing the text again from the very
 *   key that flushed the composition. Whichever side of the first copy that key
 *   lands on, some ordering lets the duplicate through, because one Enter looks
 *   exactly like any other.
 * - Treating "some other data arrived" as the end of the episode is defeated by
 *   the flush key's own `\r`, which arrives between the two copies of the text.
 *
 * What a duplicate cannot do is start a composition or paste, so those are the
 * escapes. Retyping the same text is safe by construction: with an IME it is a
 * new composition, and without one it arrives as single characters rather than
 * as one chunk equal to the whole commit.
 */
export class CompositionGuard {
  private text: string | null = null;
  private composing = false;
  private forwarded = false;
  private pasted = false;
  private windowClosesAt = 0;

  compositionUpdate(text: string | null): void {
    this.text = text;
    this.composing = true;
    this.forwarded = false;
    this.pasted = false;
    this.windowClosesAt = 0;
  }

  compositionEnd(text: string | null, now: number): void {
    if (text) this.text = text;
    this.composing = false;
    this.windowClosesAt = now + DEDUPE_WINDOW_MS;
  }

  /**
   * The user pasted, so the text that follows is theirs however it compares to
   * the commit. Without this, pasting the very text a composition just committed
   * inside the window would be swallowed as the duplicate.
   */
  paste(): void {
    this.pasted = true;
  }

  /** Whether this chunk of terminal input should be written to the PTY. */
  shouldForward(data: string, now: number): boolean {
    if (this.text === null) return true;
    if (!this.composing && now >= this.windowClosesAt) {
      this.reset();
      return true;
    }
    if (data !== this.text) return true;
    if (this.forwarded && !this.pasted) return false;
    this.forwarded = true;
    this.pasted = false;
    return true;
  }

  private reset(): void {
    this.text = null;
    this.composing = false;
    this.forwarded = false;
    this.pasted = false;
    this.windowClosesAt = 0;
  }
}
