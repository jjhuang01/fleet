import { describe, expect, it } from 'vitest';
import { translate } from '../i18n';
import type { NextFireLabel } from '../agent-schedule';
import {
  nextFireLabel,
  overdueLabel,
  renderScheduleBlock,
  renderScheduleFire,
  splitScheduleFire,
  type AgentScheduleRecord
} from '../agent-schedule';

const NOW = new Date(2026, 5, 1, 12, 0);

function record(over: Partial<AgentScheduleRecord> = {}): AgentScheduleRecord {
  return {
    id: 'sch_1',
    sessionId: 'session-1',
    cwd: '/repo',
    cron: '0 9 * * *',
    note: 'Check whether the release job on PR #512 has gone green.',
    recurring: false,
    createdAt: NOW.toISOString(),
    expiresAt: null,
    depth: 0,
    state: 'pending',
    nextDueAt: new Date(2026, 5, 2, 9, 0).toISOString(),
    dueSince: null,
    terminal: false,
    ...over
  };
}

/*
 * The turn that reads a fire has nothing else, so the one property that must
 * hold whatever else changes is that the note comes through untouched.
 */
describe('renderScheduleFire', () => {
  const note = 'Read the failing job log on PR #512 and say which step broke.';

  it('carries the note verbatim, whenever it arrives', () => {
    for (const lateMs of [0, 90_000, 5 * 60 * 60 * 1000, 3 * 24 * 60 * 60 * 1000]) {
      const text = renderScheduleFire({
        note,
        dueSince: new Date(NOW.getTime() - lateMs).toISOString(),
        deliveredAt: NOW,
        recurring: false
      });

      expect(text).toContain(note);
    }
  });

  it('says it is due now when it is on time', () => {
    const text = renderScheduleFire({
      note,
      dueSince: new Date(NOW.getTime() - 20_000).toISOString(),
      deliveredAt: NOW,
      recurring: false
    });

    expect(text).toContain('has just come due');
    expect(text).not.toContain('ago');
  });

  it('says how late it is', () => {
    const text = renderScheduleFire({
      note,
      dueSince: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      deliveredAt: NOW,
      recurring: false
    });

    expect(text).toContain('3 hours ago');
  });

  // Without this the model goes looking for the messages it never got.
  it('tells a recurring schedule that its missed intervals coalesced', () => {
    const text = renderScheduleFire({
      note,
      dueSince: new Date(NOW.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      deliveredAt: NOW,
      recurring: true
    });

    expect(text).toContain('one catch-up');
  });

  it('survives a record with no claim time on it', () => {
    const text = renderScheduleFire({ note, dueSince: null, deliveredAt: NOW, recurring: false });

    expect(text).toContain(note);
    expect(text).toContain('has just come due');
  });
});

describe('splitScheduleFire', () => {
  const note = 'Read the failing job log on PR #512.\n\nThen say which step broke.';

  it('gives back the note the renderer was given, blank lines and all', () => {
    const text = renderScheduleFire({
      note,
      dueSince: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      deliveredAt: NOW,
      recurring: false
    });

    const split = splitScheduleFire(text);
    expect(split.note).toBe(note);
    expect(split.opening).toContain('3 hours ago');
  });

  // What a transcript written before the wording changed looks like.
  it('treats a message with no framing as all note', () => {
    expect(splitScheduleFire('Just the note.')).toEqual({ opening: '', note: 'Just the note.' });
  });
});

describe('overdueLabel', () => {
  const late = (ms: number): string | null =>
    overdueLabel(NOW, new Date(NOW.getTime() - ms).toISOString());

  it('calls anything inside a minute on time', () => {
    expect(late(0)).toBeNull();
    expect(late(59_000)).toBeNull();
  });

  it('counts in the largest unit that still says something', () => {
    expect(late(60_000)).toBe('1 minute');
    expect(late(59 * 60_000)).toBe('59 minutes');
    expect(late(60 * 60_000)).toBe('1 hour');
    expect(late(23 * 60 * 60_000)).toBe('23 hours');
    expect(late(24 * 60 * 60_000)).toBe('1 day');
    expect(late(3 * 24 * 60 * 60_000)).toBe('3 days');
  });

  it('rounds down, so the number is never more than the truth', () => {
    expect(late(119_000)).toBe('1 minute');
  });
});

describe('renderScheduleBlock', () => {
  it('says nothing when nothing is set', () => {
    expect(renderScheduleBlock([], NOW)).toBeNull();
  });

  it('gives the id, which is the one thing the model cannot guess', () => {
    const block = renderScheduleBlock([record({ id: 'sch_abc' })], NOW);

    expect(block).toContain('sch_abc');
    expect(block).toContain('0 9 * * *');
    expect(block).toContain('Check whether the release job');
  });

  it('marks a claimed one as due rather than as upcoming', () => {
    const block = renderScheduleBlock([record({ state: 'due' })], NOW);

    expect(block).toContain('due now');
    expect(block).not.toContain('next ');
  });

  it('counts them when there is more than one', () => {
    const block = renderScheduleBlock([record(), record({ id: 'sch_2' })], NOW);

    expect(block).toContain('all 2 of which');
  });
});

/** The English words, so the assertions read the way the code reads. */
const say = (label: NextFireLabel): string => translate('en', label.key, label.params);

describe('nextFireLabel', () => {
  it('says today and tomorrow by name', () => {
    const today = nextFireLabel(
      record({ nextDueAt: new Date(2026, 5, 1, 17, 30).toISOString() }),
      NOW,
      'en-US'
    );
    const tomorrow = nextFireLabel(
      record({ nextDueAt: new Date(2026, 5, 2, 9, 0).toISOString() }),
      NOW,
      'en-US'
    );

    expect(say(today)).toMatch(/^today /);
    expect(say(tomorrow)).toMatch(/^tomorrow /);
  });

  it('gives a date for anything further out', () => {
    const label = nextFireLabel(
      record({ nextDueAt: new Date(2026, 5, 9, 9, 0).toISOString() }),
      NOW,
      'en-US'
    );

    expect(label.key).toBe('agent.schedule.onDate');
    expect(say(label)).not.toMatch(/^(today|tomorrow) /);
    expect(say(label)).toContain('9');
  });

  it('speaks the panel\u2019s language when the panel asks for one', () => {
    const label = nextFireLabel(
      record({ nextDueAt: new Date(2026, 5, 1, 17, 30).toISOString() }),
      NOW,
      'zh-Hans'
    );

    expect(translate('zh-Hans', label.key, label.params)).toMatch(/^\u4eca\u5929 /);
  });

  // Earlier today rather than later: a due record's next time is in the past
  // until it is recycled, and "today" is still the honest word for it.
  it('does not mistake earlier today for a past date', () => {
    const label = nextFireLabel(
      record({ nextDueAt: new Date(2026, 5, 1, 9, 0).toISOString() }),
      NOW,
      'en-US'
    );

    expect(say(label)).toMatch(/^today /);
  });
});
