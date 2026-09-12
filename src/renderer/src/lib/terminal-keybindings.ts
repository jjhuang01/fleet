type TerminalKeyEvent = Pick<KeyboardEvent, 'key'> &
  Partial<Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>>;

/**
 * Return terminal input for macOS shortcuts that browsers cannot encode as
 * terminal control characters themselves.
 */
export function terminalKeyInput(event: TerminalKeyEvent, platform: string): string | null {
  if (
    platform === 'darwin' &&
    event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    (event.key === 'Backspace' || event.key === 'Delete')
  ) {
    return '\x15';
  }
  return null;
}
