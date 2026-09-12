import { Layers } from 'lucide-react';
import {
  TOOL_SEARCH_MAX_RESULTS,
  TOOL_SEARCH_MIN_RESULTS,
  type AgentToolSearchConfig
} from '../../../../../shared/agent-tool-search';
import type { MessageKey } from '../../../../../shared/i18n';
import { useTranslation } from '../../../lib/i18n';
import { RoleCard, inputCls } from './controls';
import { Toggle } from './Toggle';

/**
 * Holding back the tools from connected servers until the model asks for them.
 *
 * The one card in this panel about neither a capability nor a cost per use.
 * Every tool stays reachable with this on; what changes is when the model is
 * told about them. Tool definitions are charged on every request of every
 * round, so a long turn pays for the whole list many times over, and the list
 * is the user's own servers rather than anything Fleet ships.
 *
 * The copy has to be honest that this is a trade rather than a free win: the
 * first turn that needs a server tool spends a round finding it. That is worth
 * it with a dozen servers connected and not worth it with one, which is why
 * this is off by default and why the hint names the condition rather than
 * recommending the setting.
 */
export function AgentToolSearchSettings({
  config,
  onChange,
  serverCount,
  hasKey
}: {
  config: AgentToolSearchConfig;
  onChange: (patch: Partial<AgentToolSearchConfig>) => void;
  /** Connected MCP servers, so the hint can say whether this would do anything. */
  serverCount: number;
  /** Whether there is an OpenRouter key at all. See the search card. */
  hasKey: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const hintKey = hint(hasKey, serverCount);

  return (
    <RoleCard
      title={t('agentSettings.toolSearch.title')}
      description={t('agentSettings.toolSearch.description')}
      icon={<Layers size={16} />}
    >
      <Row
        id="agent-tool-search-enabled"
        label={t('agentSettings.toolSearch.enabled.label')}
        hint={t(hintKey, { count: serverCount })}
      >
        <Toggle
          id="agent-tool-search-enabled"
          checked={config.enabled}
          onChange={(enabled) => onChange({ enabled })}
        />
      </Row>

      {config.enabled && (
        <Row
          id="agent-tool-search-max-results"
          label={t('agentSettings.toolSearch.maxResults.label')}
          hint={t('agentSettings.toolSearch.maxResults.hint')}
        >
          <input
            id="agent-tool-search-max-results"
            type="number"
            inputMode="numeric"
            min={TOOL_SEARCH_MIN_RESULTS}
            max={TOOL_SEARCH_MAX_RESULTS}
            value={config.maxResults}
            onChange={(e) => {
              const parsed = Number(e.target.value.trim());
              if (!Number.isFinite(parsed)) return;
              onChange({
                maxResults: Math.min(
                  TOOL_SEARCH_MAX_RESULTS,
                  Math.max(TOOL_SEARCH_MIN_RESULTS, Math.round(parsed))
                )
              });
            }}
            className={`${inputCls} w-20 tabular-nums`}
          />
        </Row>
      )}
    </RoleCard>
  );
}

/**
 * What the switch is worth on this machine, rather than in general.
 *
 * Three answers, and the useful one is the middle: somebody with no servers
 * connected would turn this on and see nothing change, and telling them so is
 * better than letting them wonder. The saving is stated as a rule rather than
 * as a figure, because the figure is theirs and Fleet cannot know it from here.
 */
function hint(hasKey: boolean, serverCount: number): MessageKey {
  if (!hasKey) return 'agentSettings.toolSearch.hint.noKey';
  if (serverCount === 0) {
    return 'agentSettings.toolSearch.hint.noServers';
  }
  return serverCount === 1
    ? 'agentSettings.toolSearch.hint.oneServer'
    : 'agentSettings.toolSearch.hint.manyServers';
}

/** Label and hint on the left, the control on the right - the panel's own shape. */
function Row({
  id,
  label,
  hint: text,
  children
}: {
  id: string;
  label: string;
  hint: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm text-fleet-text-secondary">
          {label}
        </label>
        <p className="mt-0.5 text-xs text-fleet-text-muted">{text}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
