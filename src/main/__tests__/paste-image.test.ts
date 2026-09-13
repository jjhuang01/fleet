import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { choosePaste, prunePastedImages, writePastedImage } from '../paste-image';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The slice of a clipboard picture these tests need, without Electron. */
const picture = (empty: boolean, bytes = [7]) => ({
  isEmpty: () => empty,
  toPNG: () => Buffer.from(bytes)
});

describe('choosePaste', () => {
  it('prefers text when the clipboard holds text and a picture', () => {
    expect(choosePaste('hello', picture(false))).toEqual({ kind: 'text', text: 'hello' });
  });

  it('takes the picture when there is no text', () => {
    expect(choosePaste('', picture(false))).toEqual({ kind: 'image', bytes: Buffer.from([7]) });
  });

  it('answers nothing for an empty clipboard', () => {
    expect(choosePaste('', picture(true))).toBeNull();
  });
});

describe('writePastedImage', () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it('writes the bytes under the moment it was pasted, making the directory', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fleet-paste-'));
    const path = await writePastedImage(
      join(dir, 'fleet-paste'),
      Buffer.from([1, 2, 3]),
      1_760_000_000_000
    );

    expect(basename(path)).toBe('image-1760000000000.png');
    expect(readFileSync(path)).toEqual(Buffer.from([1, 2, 3]));
  });

  it('gives a second paste in the same millisecond its own file', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fleet-paste-'));
    const first = await writePastedImage(dir, Buffer.from([1]), 42);
    const second = await writePastedImage(dir, Buffer.from([2]), 42);

    expect(second).not.toBe(first);
    expect(readFileSync(first)).toEqual(Buffer.from([1]));
    expect(readFileSync(second)).toEqual(Buffer.from([2]));
  });
});

describe('prunePastedImages', () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  it('removes its own pictures past their age and nothing else', async () => {
    dir = mkdtempSync(join(tmpdir(), 'fleet-paste-'));
    const stale = join(dir, 'image-1000.png');
    const fresh = join(dir, 'image-2000-1.png');
    const foreign = join(dir, 'notes.txt');
    writeFileSync(stale, 'old');
    writeFileSync(fresh, 'fresh');
    writeFileSync(foreign, 'keep');
    const eightDaysAgo = (Date.now() - 8 * DAY_MS) / 1000;
    utimesSync(stale, eightDaysAgo, eightDaysAgo);

    await expect(prunePastedImages(dir, Date.now())).resolves.toBe(1);
    expect(existsSync(stale)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
    expect(existsSync(foreign)).toBe(true);
  });

  it('is a no-op before anything has been pasted', async () => {
    const never = join(mkdtempSync(join(tmpdir(), 'fleet-paste-empty-')), 'fleet-paste');
    await expect(prunePastedImages(never, Date.now())).resolves.toBe(0);
  });
});
