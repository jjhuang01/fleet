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
 * This trusts the first copy of a composition and drops an identical repeat that
 * arrives before the episode closes. A new composition resets the guard, so
 * typing the same text twice on purpose is unaffected.
 *
 * Text alone cannot tell the two apart: committing `a` and then pressing `a`
 * again looks exactly like a commit that was echoed back. The key press is the
 * difference, and a key pressed *after* the first copy means the episode is
 * over - so the guard records keystrokes and only suppresses a repeat while
 * none has happened since it forwarded that copy.
 */
export class CompositionGuard {
  private text: string | null = null;
  private composing = false;
  private forwarded = false;
  private windowClosesAt = 0;
  private keystrokes = 0;
  private forwardedAtKeystroke = -1;

  compositionUpdate(text: string | null): void {
    this.text = text;
    this.composing = true;
    this.forwarded = false;
    this.forwardedAtKeystroke = -1;
    this.windowClosesAt = 0;
  }

  compositionEnd(text: string | null, now: number): void {
    if (text) this.text = text;
    this.composing = false;
    this.windowClosesAt = now + DEDUPE_WINDOW_MS;
  }

  /**
   * A key the user pressed. Counted rather than acted on immediately: the key
   * that flushes a composition arrives before the copy it produces, so only a
   * key that comes after that copy may end the episode.
   */
  userKeystroke(): void {
    this.keystrokes++;
  }

  /** Whether this chunk of terminal input should be written to the PTY. */
  shouldForward(data: string, now: number): boolean {
    if (this.text === null) return true;
    if (!this.composing && now >= this.windowClosesAt) {
      this.reset();
      return true;
    }
    if (data !== this.text) return true;
    if (this.forwarded) {
      if (this.keystrokes === this.forwardedAtKeystroke) return false;
      // The user typed since the first copy went out, so this is their input,
      // not xterm's echo of the composition.
      this.reset();
      return true;
    }
    this.forwarded = true;
    this.forwardedAtKeystroke = this.keystrokes;
    return true;
  }

  private reset(): void {
    this.text = null;
    this.composing = false;
    this.forwarded = false;
    this.forwardedAtKeystroke = -1;
    this.windowClosesAt = 0;
  }
}
