import { describe, it, expect, vi } from 'vitest';
import { registerHiddenFlush, serializePane, getPaneTailText } from '../use-terminal';

/**
 * A background pane defers its xterm writes to a 250 ms timer, so its newest
 * output lives in a buffer until then. Everything that reads the terminal has to
 * let that buffer land first, or the read reports a pane that is missing the very
 * lines it stopped on - which is what the undo-close snapshot used to do.
 */
describe('deferred output of a hidden pane', () => {
  it('flushes before serializing, and only for the pane that asked', () => {
    const flush = vi.fn();
    const unregister = registerHiddenFlush('pane-hidden', flush);

    serializePane('pane-hidden');
    expect(flush).toHaveBeenCalledTimes(1);

    serializePane('pane-other');
    expect(flush).toHaveBeenCalledTimes(1);

    serializePane('pane-hidden', 100);
    expect(flush).toHaveBeenCalledTimes(2);

    unregister();
    serializePane('pane-hidden');
    expect(flush).toHaveBeenCalledTimes(2);
  });

  it('flushes before reading the read-only tail', () => {
    const flush = vi.fn();
    const unregister = registerHiddenFlush('pane-tail', flush);

    getPaneTailText('pane-tail');
    expect(flush).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('keeps the newer registration when the older one unregisters', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = registerHiddenFlush('pane-swap', first);

    registerHiddenFlush('pane-swap', second);
    unregisterFirst();
    serializePane('pane-swap');

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
