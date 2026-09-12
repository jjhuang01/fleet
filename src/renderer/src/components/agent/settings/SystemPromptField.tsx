import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '../../../../../shared/agent-types';
import { useTranslation } from '../../../lib/i18n';
import { Field } from './primitives';

/**
 * The agent's instructions. Empty means Fleet's default, shown as the
 * placeholder so the text being replaced is never a mystery. Committed on blur
 * rather than per keystroke - this writes to the settings file on disk.
 */
export function SystemPromptField({
  value,
  onChange
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value ?? '');
  const custom = (value ?? '').trim() !== '';

  // Follow the stored value when something else changes it, e.g. Reset.
  useEffect(() => setDraft(value ?? ''), [value]);

  const commit = (): void => {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next !== value) onChange(next);
  };

  return (
    <Field
      label={t('agentSettings.systemPrompt.label')}
      description={t('agentSettings.systemPrompt.description')}
      layout="stack"
      htmlFor="agent-system-prompt"
    >
      <textarea
        id="agent-system-prompt"
        // Tall enough that the default prompt sits in the placeholder whole,
        // rather than clipped mid-sentence.
        rows={10}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        placeholder={DEFAULT_AGENT_SYSTEM_PROMPT}
        spellCheck={false}
        className="w-full resize-y rounded-md border border-fleet-border bg-fleet-surface-2 px-2.5 py-2 font-mono text-xs leading-relaxed text-fleet-text outline-none transition-colors placeholder:text-fleet-text-subtle focus:border-fleet-border-strong focus-ring"
      />
      <div className="flex items-center justify-between gap-3 text-xs text-fleet-text-muted">
        <span>
          {custom
            ? t('agentSettings.systemPrompt.custom')
            : t('agentSettings.systemPrompt.default')}
        </span>
        {custom && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onChange(null);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-fleet-border-strong px-2 py-1 text-fleet-text-secondary transition-colors hover:bg-fleet-surface-2 focus-ring"
          >
            <RotateCcw size={12} />
            {t('agentSettings.systemPrompt.reset')}
          </button>
        )}
      </div>
    </Field>
  );
}
