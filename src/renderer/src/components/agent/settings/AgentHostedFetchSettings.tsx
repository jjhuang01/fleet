import { FileDown } from 'lucide-react';
import {
  DEFAULT_AGENT_HOSTED_FETCH,
  HOSTED_FETCH_ENGINES,
  HOSTED_FETCH_MAX_CONTENT_TOKENS,
  HOSTED_FETCH_MAX_FETCHES,
  HOSTED_FETCH_MIN_CONTENT_TOKENS,
  HOSTED_FETCH_MIN_FETCHES,
  type AgentHostedFetchConfig,
  type HostedFetchEngine
} from '../../../../../shared/agent-hosted-fetch';
import { useTranslation } from '../../../lib/i18n';
import { BoundedNumber, LineList, OptionalNumber, RoleCard, selectCls } from './controls';
import { Toggle } from './Toggle';

/**
 * OpenRouter's page reader, beside the one Fleet already has.
 *
 * The card whose job is mostly to talk somebody out of it. Fleet fetches pages
 * itself, and that reader is the one that can see this machine and this
 * network; this one cannot, and turning it on gives the model two tools it has
 * to choose between on every page. It earns its place on public PDFs and on
 * public pages the local reader mangles, and the copy says exactly that rather
 * than selling it as a better fetch.
 *
 * Off by default, and the free engine is the default engine. The engines worth
 * paying for are the ones somebody picks after the free one has failed on a
 * page they actually have.
 */
export function AgentHostedFetchSettings({
  config,
  onChange,
  hasKey
}: {
  config: AgentHostedFetchConfig;
  onChange: (patch: Partial<AgentHostedFetchConfig>) => void;
  /** Whether there is an OpenRouter key at all. See the search card. */
  hasKey: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <RoleCard
      title={t('agentSettings.hostedFetch.title')}
      description={t('agentSettings.hostedFetch.description')}
      icon={<FileDown size={16} />}
    >
      <Row
        id="agent-hosted-fetch-enabled"
        label={t('agentSettings.hostedFetch.enabled.label')}
        hint={
          hasKey
            ? t('agentSettings.hostedFetch.enabled.hint')
            : t('agentSettings.hostedFetch.enabled.noKey')
        }
      >
        <Toggle
          id="agent-hosted-fetch-enabled"
          checked={config.enabled}
          onChange={(enabled) => onChange({ enabled })}
        />
      </Row>

      {config.enabled && (
        <>
          <Row
            id="agent-hosted-fetch-engine"
            label={t('agentSettings.common.engine')}
            hint={t('agentSettings.hostedFetch.engine.hint')}
          >
            <select
              id="agent-hosted-fetch-engine"
              value={config.engine}
              onChange={(e) => onChange({ engine: toEngine(e.target.value) })}
              className={`${selectCls} w-32 capitalize`}
            >
              {HOSTED_FETCH_ENGINES.map((engine) => (
                <option key={engine} value={engine}>
                  {engine}
                </option>
              ))}
            </select>
          </Row>

          <NumberRow
            id="agent-hosted-fetch-max-uses"
            label={t('agentSettings.hostedFetch.maxFetches.label')}
            hint={t('agentSettings.hostedFetch.maxFetches.hint')}
            value={config.maxFetches}
            min={HOSTED_FETCH_MIN_FETCHES}
            max={HOSTED_FETCH_MAX_FETCHES}
            onChange={(maxFetches) => onChange({ maxFetches })}
          />

          <ContentTokensRow
            value={config.maxContentTokens}
            onChange={(maxContentTokens) => onChange({ maxContentTokens })}
          />

          <DomainsRow
            id="agent-hosted-fetch-blocked"
            label={t('agentSettings.hostedFetch.blocked.label')}
            hint={t('agentSettings.hostedFetch.blocked.hint')}
            value={config.blockedDomains}
            onChange={(blockedDomains) => onChange({ blockedDomains })}
          />

          <DomainsRow
            id="agent-hosted-fetch-allowed"
            label={t('agentSettings.hostedFetch.allowed.label')}
            hint={t('agentSettings.hostedFetch.allowed.hint')}
            value={config.allowedDomains}
            onChange={(allowedDomains) => onChange({ allowedDomains })}
          />
        </>
      )}
    </RoleCard>
  );
}

/**
 * A `<select>` hands back a plain string. Narrowed by lookup rather than
 * asserted, the way the search card does it.
 */
function toEngine(value: string): HostedFetchEngine {
  return (
    HOSTED_FETCH_ENGINES.find((engine) => engine === value) ?? DEFAULT_AGENT_HOSTED_FETCH.engine
  );
}

/** Label and hint on the left, the control on the right - the panel's own shape. */
function Row({
  id,
  label,
  hint,
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
        <p className="mt-0.5 text-xs text-fleet-text-muted">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** A bounded count. The limits apply when the field is left, not per keystroke. */
function NumberRow({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}): React.JSX.Element {
  return (
    <Row id={id} label={label} hint={hint}>
      <BoundedNumber
        id={id}
        value={value}
        min={min}
        max={max}
        fallback={DEFAULT_AGENT_HOSTED_FETCH.maxFetches}
        onCommit={onChange}
        className="w-20"
      />
    </Row>
  );
}

/**
 * How much of a page reaches the model, or nothing for the engine's own answer.
 *
 * Empty is a real value here rather than a missing one: it means "however much
 * the engine thinks", which is the right default when the engine is the one
 * that knows what it extracted.
 */
function ContentTokensRow({
  value,
  onChange
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Row
      id="agent-hosted-fetch-content-tokens"
      label={t('agentSettings.hostedFetch.pageLength.label')}
      hint={t('agentSettings.hostedFetch.pageLength.hint')}
    >
      <OptionalNumber
        id="agent-hosted-fetch-content-tokens"
        value={value}
        min={HOSTED_FETCH_MIN_CONTENT_TOKENS}
        max={HOSTED_FETCH_MAX_CONTENT_TOKENS}
        step={1_000}
        placeholder={t('agentSettings.hostedFetch.pageLength.placeholder')}
        onCommit={onChange}
      />
    </Row>
  );
}

/**
 * A host list, edited as lines. See `LineList` for why the raw text is kept
 * while the field has focus: normalising per keystroke eats the newline that
 * starts the next host.
 */
function DomainsRow({
  id,
  label,
  hint,
  value,
  onChange
}: {
  id: string;
  label: string;
  hint: string;
  value: string[];
  onChange: (next: string[]) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-fleet-text-secondary">
        {label}
      </label>
      <p className="text-xs text-fleet-text-muted">{hint}</p>
      <LineList id={id} value={value} placeholder="example.com" onCommit={onChange} />
    </div>
  );
}
