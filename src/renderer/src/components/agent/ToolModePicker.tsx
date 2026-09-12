import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import type { AgentToolMode } from '../../../../shared/agent-types';
import type { MessageKey } from '../../../../shared/i18n';
import { useTranslation } from '../../lib/i18n';
import { popperAnim } from '../../lib/motion';

/**
 * Who answers the agent's permission questions.
 *
 * In the composer rather than only in Settings, because it is the one setting
 * here that changes what happens on this machine without anybody being asked -
 * and a person who has forgotten which mode they are in is exactly the person
 * it matters to. It reads as a label the whole time the pane is open, and the
 * two words on it say the answer.
 *
 * Every option carries a sentence. "Auto" alone would be a switch whose meaning
 * has to be guessed at, and the guess people make - that it does everything
 * unasked - is wrong in the direction that stops them ever turning it on. "Full"
 * is the one where that guess is right, and its sentence has to say so plainly
 * enough that nobody arrives there by mistake.
 */
const MODES = [
  {
    value: 'ask',
    Icon: Shield,
    label: 'agent.toolMode.ask.label',
    title: 'agent.toolMode.ask.title',
    description: 'agent.toolMode.ask.description'
  },
  {
    value: 'auto',
    Icon: ShieldCheck,
    label: 'agent.toolMode.auto.label',
    // The same words the Settings row uses. Two controls for one setting have
    // to be recognisably the same control.
    title: 'agent.toolMode.auto.title',
    description: 'agent.toolMode.auto.description'
  },
  {
    value: 'full',
    Icon: ShieldOff,
    label: 'agent.toolMode.full.label',
    title: 'agent.toolMode.full.title',
    description: 'agent.toolMode.full.description'
  }
] as const satisfies ReadonlyArray<{
  value: AgentToolMode;
  Icon: typeof Shield;
  label: MessageKey;
  title: MessageKey;
  description: MessageKey;
}>;

/**
 * What the label looks like when it is not being touched.
 *
 * The two modes that can act without anybody having said so are the ones worth
 * spotting from across the room, and they are not the same amount of worth
 * spotting: Auto takes the accent, Full takes the colour the rest of the app
 * only uses for damage.
 */
function triggerTone(value: AgentToolMode): string {
  if (value === 'full') return 'text-red-400 hover:text-red-300';
  if (value === 'auto') return 'fleet-accent-text';
  return 'text-fleet-text-muted hover:text-fleet-text';
}

export function ToolModePicker({
  value,
  disabled,
  onChange
}: {
  value: AgentToolMode;
  disabled: boolean;
  onChange: (mode: AgentToolMode) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = MODES.find((m) => m.value === value) ?? MODES[0];
  const currentTitle = t(current.title);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t('agent.toolMode.permissions', { title: currentTitle })}
          title={t(current.description)}
          className={`flex h-7 shrink-0 items-center gap-1 rounded-lg px-1.5 text-[11px] font-medium transition-colors hover:bg-fleet-surface-2 disabled:cursor-not-allowed disabled:opacity-40 focus-ring ${triggerTone(value)}`}
        >
          <current.Icon size={14} />
          {t(current.label)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          side="top"
          sideOffset={6}
          className={`z-50 w-72 overflow-hidden rounded-lg border border-fleet-border-strong bg-fleet-surface-2 p-1 shadow-xl ${popperAnim}`}
        >
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => {
                onChange(mode.value);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-fleet-surface-3"
            >
              <Check
                size={13}
                className={`mt-0.5 shrink-0 ${mode.value === value ? 'fleet-accent-text' : 'opacity-0'}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-fleet-text">{t(mode.title)}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-fleet-text-muted">
                  {t(mode.description)}
                </span>
              </span>
            </button>
          ))}
          {/* The thing someone hesitating over Auto most needs to know: it can
              only ever take a question away, never grant something they had
              already said no to. True of Full as well, and the only thing that
              still is. */}
          <p className="border-t border-fleet-border px-2 pt-1.5 pb-1 text-[11px] text-fleet-text-subtle">
            {t('agent.toolMode.denyFirst')}
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
