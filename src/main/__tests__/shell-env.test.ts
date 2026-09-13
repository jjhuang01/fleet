import { describe, it, expect } from 'vitest';
import { isLauncherTerminalEnv } from '../shell-env';

/**
 * A Fleet started from inside another terminal inherits that terminal's
 * identity, and one of those keys - `NO_COLOR` - makes every agent CLI print in
 * a single colour. These are the keys that have to be caught; everything else
 * in the environment belongs to the user and is left alone.
 */
describe('isLauncherTerminalEnv', () => {
  it('catches the identity another terminal leaves behind', () => {
    for (const key of [
      'NO_COLOR',
      'FORCE_COLOR',
      'COLORTERM',
      'TERM_PROGRAM',
      'TERM_PROGRAM_VERSION',
      'OTTY_SHELL_INTEGRATION',
      'OTTY_PANE_ID',
      'WEZTERM_PANE',
      'KITTY_WINDOW_ID',
      'GHOSTTY_RESOURCES_DIR',
      'ITERM_PROFILE',
      'VSCODE_INJECTION'
    ]) {
      expect(isLauncherTerminalEnv(key), key).toBe(true);
    }
  });

  it("leaves the user's own environment alone", () => {
    for (const key of ['PATH', 'HOME', 'SHELL', 'LANG', 'EDITOR', 'CLAUDE_CONFIG_DIR']) {
      expect(isLauncherTerminalEnv(key), key).toBe(false);
    }
  });

  it('leaves TERM alone', () => {
    // node-pty sets TERM from the pty's own name, so the value a pane sees is
    // already Fleet's; dropping it here would only lose the login shell's copy.
    expect(isLauncherTerminalEnv('TERM')).toBe(false);
  });
});
