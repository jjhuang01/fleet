import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writePastedImage } from '../paste-image';

/**
 * A pasted picture is written where the caller says, under a name made of the
 * moment it was pasted, so a prompt that references it keeps pointing at that
 * paste.
 */
describe('writePastedImage', () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it('writes the bytes under the moment it was pasted, making the directory', () => {
    dir = mkdtempSync(join(tmpdir(), 'fleet-paste-'));
    const path = writePastedImage(
      join(dir, 'fleet-paste'),
      Buffer.from([1, 2, 3]),
      1_760_000_000_000
    );

    expect(basename(path)).toBe('image-1760000000000.png');
    expect(statSync(join(dir, 'fleet-paste')).isDirectory()).toBe(true);
    expect(readFileSync(path)).toEqual(Buffer.from([1, 2, 3]));
  });

  it('gives a second paste in the same millisecond its own file', () => {
    dir = mkdtempSync(join(tmpdir(), 'fleet-paste-'));
    const first = writePastedImage(dir, Buffer.from([1]), 42);
    const second = writePastedImage(dir, Buffer.from([2]), 42);

    expect(second).not.toBe(first);
    expect(readFileSync(first)).toEqual(Buffer.from([1]));
    expect(readFileSync(second)).toEqual(Buffer.from([2]));
  });
});
