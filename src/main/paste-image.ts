import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
export function writePastedImage(dir: string, bytes: Buffer, now: number): string {
  mkdirSync(dir, { recursive: true });
  let path = join(dir, `image-${now}.png`);
  // A second paste in the same millisecond would otherwise overwrite the first,
  // and a prompt already naming that path would then point at the wrong
  // picture.
  for (let n = 1; existsSync(path); n += 1) {
    path = join(dir, `image-${now}-${n}.png`);
  }
  writeFileSync(path, bytes);
  return path;
}
