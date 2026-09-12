import { describe, expect, it } from 'vitest';
import { terminalKeyInput } from '../terminal-keybindings';

describe('terminalKeyInput', () => {
  it.each(['Backspace', 'Delete'])(
    'maps macOS Command+%s to the terminal clear-line control character',
    (key) => {
      expect(terminalKeyInput({ key, metaKey: true }, 'darwin')).toBe('\x15');
    }
  );

  it.each([
    [{ key: 'Backspace', metaKey: false }, 'darwin'],
    [{ key: 'Backspace', metaKey: true, ctrlKey: true }, 'darwin'],
    [{ key: 'Backspace', metaKey: true, altKey: true }, 'darwin'],
    [{ key: 'Backspace', metaKey: true, shiftKey: true }, 'darwin'],
    [{ key: 'Backspace', metaKey: true }, 'linux']
  ] as const)('leaves other delete combinations to the terminal', (event, platform) => {
    expect(terminalKeyInput(event, platform)).toBeNull();
  });
});
