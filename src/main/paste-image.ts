import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Pasting a picture into a pane.
 *
 * A terminal pane can only be handed text, so a clipboard image has to become a
 * file and a path: that is what the agent CLIs accept - Codex and Claude Code
 * both take the path to an image in the prompt, and `pi` documents `@image.png`
 * - and it is what the terminal people compare this one to does. Otty writes
 * the clipboard to `$TMPDIR/otty-paste/image-<ms>.png` and pastes that path.
 *
 * The directory is the OS temp one rather than anywhere in a project: nothing
 * here belongs to the user's repository, and the path only has to live as long
 * as the prompt that mentions it.
 */
export const PASTE_DIR_NAME = 'fleet-paste';

/** How long a pasted picture is kept before a later start sweeps it. */
export const PASTED_IMAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The smallest slice of Electron's `NativeImage` this file needs. */
export type ClipboardImage = { isEmpty: () => boolean; toPNG: () => Buffer };

/**
 * Text wins when the clipboard holds both, and an empty image is not a paste.
 *
 * Answering this from one read of the clipboard is the point: asking for the
 * text and then for the picture is two answers about two different moments, and
 * anything that takes the clipboard in between turns into a lost paste or the
 * wrong picture.
 */
export function choosePaste(
  text: string,
  image: ClipboardImage
): { kind: 'text'; text: string } | { kind: 'image'; bytes: Buffer } | null {
  if (text !== '') return { kind: 'text', text };
  if (image.isEmpty()) return null;
  return { kind: 'image', bytes: image.toPNG() };
}

/**
 * Write the bytes out and hand back the path a pane can be given.
 *
 * `wx` rather than an existence check: two pastes in the same millisecond pick
 * the same name, and the loser has to take the next one instead of overwriting
 * a picture some prompt already names.
 */
export async function writePastedImage(dir: string, bytes: Buffer, now: number): Promise<string> {
  // 0700/0600: on Linux the temp directory is shared, and a screenshot is the
  // user's, not the machine's.
  await mkdir(dir, { recursive: true, mode: 0o700 });
  for (let n = 0; ; n += 1) {
    const path = join(dir, n === 0 ? `image-${now}.png` : `image-${now}-${n}.png`);
    try {
      await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
      return path;
    } catch (error) {
      if (!isAlreadyThere(error)) throw error;
    }
  }
}

/** Whether a write lost the race for a name that something already holds. */
function isAlreadyThere(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST';
}

/**
 * Sweep pictures past their life. A prompt can name a pasted picture for as
 * long as it is on screen, so this is deliberately a week rather than a session
 * - and it only touches this directory's own `image-*.png` files, so a user's
 * other temp files are none of its business.
 */
export async function prunePastedImages(
  dir: string,
  now: number,
  ttl: number = PASTED_IMAGE_TTL_MS
): Promise<number> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    // Nothing has been pasted yet.
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    if (!/^image-\d+(-\d+)?\.png$/.test(name)) continue;
    const path = join(dir, name);
    try {
      const info = await stat(path);
      if (now - info.mtimeMs > ttl) {
        await unlink(path);
        removed += 1;
      }
    } catch {
      // Another sweep, or the user, got there first.
    }
  }
  return removed;
}
