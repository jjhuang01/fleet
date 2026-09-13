import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { connect } from 'node:net';
import type * as SharedConstants from '../../shared/constants';

// The real socket path is a fixed location the running app owns, so the test
// points the server at a private one instead of unlinking the user's socket.
vi.mock('../../shared/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof SharedConstants>();
  const { mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  return {
    ...actual,
    COPILOT_SOCKET_PATH: join(mkdtempSync(join(tmpdir(), 'fleet-copilot-sock-')), 'copilot.sock')
  };
});

import { COPILOT_SOCKET_PATH } from '../../shared/constants';
import { CopilotSocketServer } from '../copilot/socket-server';
import { CopilotSessionStore } from '../copilot/session-store';

async function sendEvent(payload: Record<string, unknown>): Promise<boolean> {
  return new Promise((resolve) => {
    const client = connect(COPILOT_SOCKET_PATH);
    const timer = setTimeout(() => resolve(false), 2000);
    const finish = (closed: boolean): void => {
      clearTimeout(timer);
      resolve(closed);
    };
    client.on('connect', () => client.end(JSON.stringify(payload)));
    client.on('close', () => finish(true));
    client.on('error', () => finish(false));
  });
}

/**
 * `allowHalfOpen` keeps a socket open after the hook process sends its FIN, so
 * every event the server does not have to answer has to be closed by the server
 * itself. Without that, each hook event costs an fd until the process exits.
 */
describe('CopilotSocketServer socket lifetime', () => {
  let server: CopilotSocketServer;

  beforeEach(async () => {
    server = new CopilotSocketServer(new CopilotSessionStore());
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('closes the socket for an event it has no answer for', async () => {
    await expect(
      sendEvent({
        session_id: 'sess-1',
        cwd: '/tmp/project',
        event: 'Stop',
        status: 'waiting_for_input'
      })
    ).resolves.toBe(true);
  });

  it('closes the socket for an event it cannot parse', async () => {
    await expect(
      sendEvent({ session_id: 'sess-2', cwd: '/tmp/project', event: 'Stop' })
    ).resolves.toBe(true);
  });

  it('holds a permission request open, because the answer goes back on it', async () => {
    await expect(
      sendEvent({
        session_id: 'sess-3',
        cwd: '/tmp/project',
        event: 'Notification',
        status: 'waiting_for_approval',
        tool: 'Bash',
        tool_use_id: 'tu-1',
        tool_input: { command: 'ls' }
      })
    ).resolves.toBe(false);
  });
});
