import * as pty from 'node-pty';
import { basename } from 'node:path';
import { getDefaultShell } from './shell-detection';
import { wslExePath } from './wsl-service';
import { createLogger } from './logger';
import { buildEnvSnapshot } from '../shared/shell-env-snapshot';
import type { ShellProfile } from '../shared/shell-profiles';
import type { EnvSource, ShellEnvSnapshot } from '../shared/shell-env-types';

const log = createLogger('pty');

export type PtyCreateOptions = {
  paneId: string;
  cwd: string;
  shell?: string;
  cmd?: string;
  cols?: number;
  rows?: number;
  env?: Record<string, string | undefined>;
  /** If true, the PTY exits when cmd finishes instead of falling back to a shell.
   *  Used for crew PTYs where we need onExit to fire for cleanup. */
  exitOnComplete?: boolean;
  /** For resolving per-workspace Claude config (e.g. CLAUDE_CONFIG_DIR). */
  workspaceId?: string;
  /** Optional resolved profile. When present, drives WSL arg construction. */
  profile?: ShellProfile;
  /** Per-key provenance for env vars Fleet injected (Env Sync / Fleet built-ins). */
  envSources?: Record<string, EnvSource>;
};

export type PtyCreateResult = {
  paneId: string;
  pid: number;
};

type PtyEntry = {
  process: pty.IPty;
  paneId: string;
  cwd: string;
  outputBuffer: string;
  paused: boolean;
  /**
   * Output handed to the renderer since the pause that it has not acknowledged
   * yet. `resume` waits for this to reach zero, which is what makes the pause a
   * real end-to-end backpressure rather than a fixed delay.
   */
  unackedBytes: number;
  /** When the pause started, for the self-heal in `flushAll`. Null when running. */
  pausedAt: number | null;
  dataDisposable: pty.IDisposable | null;
  exitDisposable: pty.IDisposable | null;
  snapshot: ShellEnvSnapshot | null;
};

const FLUSH_INTERVAL_MS = 16;
const BUFFER_OVERFLOW_BYTES = 256 * 1024;

/**
 * The longest a pane may stay paused waiting for an acknowledgement.
 *
 * Pausing is renderer-driven: the renderer acknowledges the bytes it has handed
 * to xterm, and this side resumes once every byte it sent while paused has been
 * acknowledged. That is the honest signal - output consumed, not merely sent -
 * and it is what keeps a flood from piling up in the renderer's write queue.
 *
 * Waiting forever is not safe, because a renderer that never acknowledges would
 * freeze the shell: a pane whose terminal has not attached yet buffers into
 * `pendingLiveData` and acknowledges nothing, and a renderer busy enough to be
 * late is exactly when a person is watching the terminal not move. So the
 * acknowledgement is the normal path and this is the escape from it. It has to
 * clear the renderer's own slowest normal path, which is a hidden pane flushing
 * its buffer every 250 ms, so it is several times that rather than a hair above.
 */
const DRAIN_CEILING_MS = 2000;

export class PtyManager {
  private ptys = new Map<string, PtyEntry>();
  /** PTYs that must not be killed by the renderer-driven GC. */
  private protectedPtys = new Set<string>();
  private dataCallbacks = new Map<string, (data: string, paused: boolean) => void>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  create(opts: PtyCreateOptions): PtyCreateResult {
    if (this.ptys.has(opts.paneId)) {
      // Idempotent: return existing PTY info (handles HMR reloads in dev where the
      // renderer-side createdPtys Set is reset but the main process map persists)
      const existing = this.ptys.get(opts.paneId);
      if (!existing) return { paneId: opts.paneId, pid: 0 };
      log.debug('PTY already exists, returning existing pid', {
        paneId: opts.paneId,
        pid: existing.process.pid
      });
      return { paneId: opts.paneId, pid: existing.process.pid };
    }

    let shell: string;
    let baseArgs: string[];

    if (opts.profile?.kind === 'wsl') {
      const distro =
        opts.profile.pathContext === 'win32' || opts.profile.pathContext === 'posix'
          ? ''
          : opts.profile.pathContext.distro;
      // Pin the absolute System32 path rather than relying on PATH for wsl.exe.
      shell = wslExePath();
      // `--cd ~` lands the WSL shell in $HOME, overriding the Windows cwd that
      // node-pty passes to wsl.exe. NOTE: a bare trailing `~` does NOT work here —
      // with `-d <distro>` present, wsl.exe treats `~` as a *command* and the
      // login shell tries to exec the home dir ("permission denied"). The
      // `wsl ~` shorthand only applies to the bare invocation; with a distro
      // selected we must use the documented `--cd` flag.
      baseArgs = ['-d', distro, '--cd', '~'];
    } else if (opts.profile?.kind === 'system') {
      shell = opts.profile.command;
      baseArgs = [...opts.profile.args];
    } else {
      shell = opts.shell ?? getDefaultShell();
      baseArgs = [];
    }

    const args: string[] = [...baseArgs];

    if (opts.cmd) {
      if (opts.exitOnComplete) {
        args.push('-c', opts.cmd);
      } else {
        args.push('-c', `${opts.cmd}; exec ${shell}`);
      }
    }

    log.debug('spawning PTY', {
      shell,
      args,
      cwd: opts.cwd,
      profileId: opts.profile?.id,
      pathPrefix: process.env.PATH?.substring(0, 80)
    });
    const finalEnv = { ...(opts.env ?? process.env), FLEET_SESSION: '1' };
    const proc = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: opts.cols ?? 80,
      rows: opts.rows ?? 24,
      cwd: opts.cwd,
      env: finalEnv
    });

    const entry: PtyEntry = {
      process: proc,
      paneId: opts.paneId,
      cwd: opts.cwd,
      outputBuffer: '',
      paused: false,
      unackedBytes: 0,
      pausedAt: null,
      dataDisposable: null,
      exitDisposable: null,
      snapshot: buildEnvSnapshot({
        finalEnv,
        sources: opts.envSources ?? {},
        shellName: basename(shell),
        cwd: opts.cwd,
        spawnedAt: Date.now()
      })
    };

    // Register the internal buffering callback immediately at create time so
    // the IDisposable is captured and can be disposed during kill().
    entry.dataDisposable = proc.onData((data: string) => {
      entry.outputBuffer += data;
      if (entry.outputBuffer.length > BUFFER_OVERFLOW_BYTES) {
        log.debug('backpressure pause', {
          paneId: opts.paneId,
          bufferBytes: entry.outputBuffer.length
        });
        entry.paused = true;
        entry.pausedAt = Date.now();
        // Fresh accounting: everything handed over from here until the renderer
        // catches up is owed an acknowledgement.
        entry.unackedBytes = 0;
        this.flushPane(opts.paneId);
        proc.pause();
      }
    });

    this.ptys.set(opts.paneId, entry);

    return { paneId: opts.paneId, pid: proc.pid };
  }

  write(paneId: string, data: string): void {
    const entry = this.ptys.get(paneId);
    if (entry) {
      entry.process.write(data);
    }
  }

  resize(paneId: string, cols: number, rows: number): void {
    const entry = this.ptys.get(paneId);
    if (entry) {
      log.debug('resize', { paneId, cols, rows });
      entry.process.resize(cols, rows);
    }
  }

  protect(paneId: string): void {
    this.protectedPtys.add(paneId);
  }

  kill(paneId: string): void {
    const entry = this.ptys.get(paneId);
    if (entry) {
      log.debug('kill', { paneId, pid: entry.process.pid });
      entry.dataDisposable?.dispose();
      entry.exitDisposable?.dispose();
      this.dataCallbacks.delete(paneId);
      entry.process.kill();
      this.ptys.delete(paneId);
      this.protectedPtys.delete(paneId);
      this.clearFlushTimerIfEmpty();
    }
  }

  killAll(): void {
    for (const [paneId] of this.ptys) {
      this.kill(paneId);
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  has(paneId: string): boolean {
    return this.ptys.has(paneId);
  }

  get(paneId: string): PtyEntry | undefined {
    return this.ptys.get(paneId);
  }

  paneIds(): string[] {
    return Array.from(this.ptys.keys());
  }

  getCwd(paneId: string): string | undefined {
    return this.ptys.get(paneId)?.cwd;
  }

  getEnvSnapshot(paneId: string): ShellEnvSnapshot | null {
    return this.ptys.get(paneId)?.snapshot ?? null;
  }

  updateCwd(paneId: string, cwd: string): void {
    const entry = this.ptys.get(paneId);
    if (entry) entry.cwd = cwd;
  }

  getPid(paneId: string): number | undefined {
    return this.ptys.get(paneId)?.process.pid;
  }

  /** Returns the current foreground process name for a PTY (e.g. "zsh", "node", "claude"). */
  getProcessName(paneId: string): string | undefined {
    return this.ptys.get(paneId)?.process.process;
  }

  /** Kill any PTY whose paneId is not in the given set of active IDs (and not protected). */
  gc(activePaneIds: Set<string>): string[] {
    const killed: string[] = [];
    for (const paneId of this.ptys.keys()) {
      if (!activePaneIds.has(paneId) && !this.protectedPtys.has(paneId)) {
        this.kill(paneId);
        killed.push(paneId);
      }
    }
    return killed;
  }

  /**
   * Register a callback that receives batched PTY output every ~16ms.
   * The internal process.onData listener is already registered at create() time;
   * this method wires up the flush callback and starts the shared flush timer.
   */
  onData(paneId: string, callback: (data: string, paused: boolean) => void): void {
    const entry = this.ptys.get(paneId);
    if (!entry) return;

    if (this.dataCallbacks.has(paneId)) {
      log.warn('onData already registered for pane, skipping to prevent silent overwrite', {
        paneId
      });
      return;
    }

    this.dataCallbacks.set(paneId, callback);

    // Start shared flush timer if not already running
    this.flushTimer ??= setInterval(() => this.flushAll(), FLUSH_INTERVAL_MS);
  }

  /**
   * Resume a paused PTY.
   *
   * Called when the renderer has acknowledged everything this side sent while
   * paused, and by the ceiling in `flushAll` when it has not.
   */
  resume(paneId: string): void {
    const entry = this.ptys.get(paneId);
    if (entry) {
      log.debug('resume', { paneId });
      entry.paused = false;
      entry.pausedAt = null;
      entry.unackedBytes = 0;
      entry.process.resume();
    }
  }

  /**
   * The renderer has taken `bytes` of the output it was sent while paused.
   *
   * Resuming here rather than on the first acknowledgement is the point of the
   * counter: a batch is sent as soon as it exists, so the renderer can be a
   * flush or two behind and still be catching up.
   */
  drain(paneId: string, bytes: number): void {
    const entry = this.ptys.get(paneId);
    if (!entry?.paused) return;
    entry.unackedBytes = Math.max(0, entry.unackedBytes - bytes);
    if (entry.unackedBytes === 0) this.resume(paneId);
  }

  onExit(paneId: string, callback: (exitCode: number) => void): void {
    const entry = this.ptys.get(paneId);
    if (entry) {
      // Dispose previous exit listener to prevent stacking (e.g. on HMR re-register)
      entry.exitDisposable?.dispose();
      entry.exitDisposable = entry.process.onExit(({ exitCode }) => {
        log.debug('exit', { paneId, exitCode });
        entry.dataDisposable?.dispose();
        // Whatever arrived between the last flush tick and this exit is still in
        // the buffer, and dropping the callbacks below would drop it with them.
        // It is the tail of the command's own output - a compiler's last error,
        // a test summary - which is exactly the part worth reading.
        this.flushPane(paneId);
        this.dataCallbacks.delete(paneId);
        this.ptys.delete(paneId);
        this.protectedPtys.delete(paneId);
        this.clearFlushTimerIfEmpty();
        callback(exitCode);
      });
    }
  }

  private clearFlushTimerIfEmpty(): void {
    if (this.ptys.size === 0 && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private flushPane(paneId: string): void {
    const entry = this.ptys.get(paneId);
    if (!entry?.outputBuffer) return;
    const callback = this.dataCallbacks.get(paneId);
    if (callback) {
      // Everything sent while paused is owed an acknowledgement, counted in the
      // same unit as the overflow guard above so the two sides agree.
      if (entry.paused) entry.unackedBytes += entry.outputBuffer.length;
      callback(entry.outputBuffer, entry.paused);
      entry.outputBuffer = '';
    }
  }

  private flushAll(): void {
    for (const paneId of this.ptys.keys()) {
      this.flushPane(paneId);
      this.resumeIfStuck(paneId);
    }
  }

  /**
   * Let a pane that has been paused too long start reading again.
   *
   * Runs on the flush tick rather than on a timer of its own, so a pane is
   * reconsidered every 16ms while paused and costs nothing while it is not.
   * The buffer has just been flushed by the time this is reached, so resuming
   * here is resuming into an empty one - if the producer is genuinely faster
   * than the renderer, the next burst simply pauses it again, which is the
   * behaviour wanted: output arrives in bursts rather than stopping dead.
   *
   * See DRAIN_CEILING_MS for why this exists at all.
   */
  private resumeIfStuck(paneId: string): void {
    const entry = this.ptys.get(paneId);
    if (entry === undefined || !entry.paused || entry.pausedAt === null) return;
    if (Date.now() - entry.pausedAt < DRAIN_CEILING_MS) return;
    log.debug('resuming without a drain', {
      paneId,
      pausedMs: Date.now() - entry.pausedAt,
      unackedBytes: entry.unackedBytes
    });
    this.resume(paneId);
  }
}
