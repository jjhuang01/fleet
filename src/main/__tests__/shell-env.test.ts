import { describe, it, expect } from 'vitest';
import { enrichProcessEnv, isLauncherTerminalEnv } from '../shell-env';

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
      'ITERM_PROFILE'
    ]) {
      expect(isLauncherTerminalEnv(key), key).toBe(true);
    }
  });

  it("leaves the user's own environment alone", () => {
    for (const key of ['PATH', 'HOME', 'SHELL', 'LANG', 'EDITOR', 'CLAUDE_CONFIG_DIR']) {
      expect(isLauncherTerminalEnv(key), key).toBe(false);
    }
  });

  it('keeps the credentials plumbing VS Code writes into that namespace', () => {
    // `GIT_ASKPASS` is left in place and points at a script that cannot run
    // without these, so a Fleet started from a VS Code terminal would lose git
    // auth entirely. VS Code's *identity* is `TERM_PROGRAM=vscode`, and that is
    // dropped by the rule above instead.
    for (const key of ['VSCODE_GIT_ASKPASS_NODE', 'VSCODE_GIT_ASKPASS_MAIN', 'VSCODE_INJECTION']) {
      expect(isLauncherTerminalEnv(key), key).toBe(false);
    }
  });

  it('leaves TERM alone', () => {
    // node-pty sets TERM from the pty's own name, so the value a pane sees is
    // already Fleet's; dropping it here would only lose the login shell's copy.
    expect(isLauncherTerminalEnv('TERM')).toBe(false);
  });
});

/**
 * A pane is created from whatever `process.env` says at that moment, and the
 * login shell can take seconds to answer. Identity is therefore stamped
 * synchronously - before the first await inside the resolution - so a pane
 * created during that window gets Fleet's own environment rather than one with
 * the launcher's dropped and nothing put back.
 */
describe('enrichProcessEnv', () => {
  it.skipIf(process.platform === 'win32')(
    'stamps the terminal identity before it awaits the login shell',
    async () => {
      process.env.NO_COLOR = '1';
      process.env.TERM_PROGRAM = 'otty';
      delete process.env.COLORTERM;

      const pending = enrichProcessEnv(); // deliberately not awaited yet

      expect(process.env.COLORTERM).toBe('truecolor');
      expect(process.env.TERM_PROGRAM).toBe('Fleet');
      expect(process.env.NO_COLOR).toBeUndefined();

      await pending;
      expect(process.env.COLORTERM).toBe('truecolor');
    }
  );
});
