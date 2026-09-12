import { useState } from 'react';
import { Database, Route, Shuffle } from 'lucide-react';
import {
  FALLBACK_MAX_MODELS,
  PROVIDER_SORTS,
  type AgentCacheConfig,
  type AgentFallbackConfig,
  type AgentProviderConfig,
  type ProviderSort
} from '../../../../../shared/agent-routing';
import type { AgentCatalogModel } from '../../../../../shared/agent-types';
import type { MessageKey } from '../../../../../shared/i18n';
import { useTranslation } from '../../../lib/i18n';
import { LineList, RoleCard, inputCls, selectCls } from './controls';
import { commitPrice } from './bounded-number';
import { Toggle } from './Toggle';
import { ModelSelect } from './ModelSelect';

/**
 * Prompt caching: paying once for the part of the request that never changes.
 *
 * The card has to be honest in a way the feature name is not. Most providers
 * cache on their own and this changes nothing for them; it is Anthropic and
 * Qwen that cache only what a request marks, and for those the marked prefix
 * comes back at a tenth of its price. So the copy says "some providers"
 * rather than promising a saving everyone will see.
 *
 * On by default, which is the one default in this group that is not today's
 * behaviour. Safe to be: a provider that does not read the marker ignores it.
 */
export function AgentCacheSettings({
  config,
  onChange
}: {
  config: AgentCacheConfig;
  onChange: (patch: Partial<AgentCacheConfig>) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <RoleCard
      title={t('agentSettings.cache.title')}
      description={t('agentSettings.cache.description')}
      icon={<Database size={16} />}
    >
      <Row
        id="agent-cache-enabled"
        label={t('agentSettings.cache.enabled.label')}
        hint={t('agentSettings.cache.enabled.hint')}
      >
        <Toggle
          id="agent-cache-enabled"
          checked={config.enabled}
          onChange={(enabled) => onChange({ enabled })}
        />
      </Row>

      {config.enabled && (
        <Row
          id="agent-cache-long-ttl"
          label={t('agentSettings.cache.longTtl.label')}
          hint={t('agentSettings.cache.longTtl.hint')}
        >
          <Toggle
            id="agent-cache-long-ttl"
            checked={config.longTtl}
            onChange={(longTtl) => onChange({ longTtl })}
          />
        </Row>
      )}
    </RoleCard>
  );
}

/**
 * Which of OpenRouter's providers may serve a request.
 *
 * One model is served by several companies at different prices, speeds and
 * levels of parameter support, and by default OpenRouter picks. This is where
 * somebody who cares says which.
 *
 * The price fields are the ones to be careful about. They bound a rate, not a
 * bill, and the hint says so in those words - "max price" reads as a cap to
 * everybody who has not read the documentation, and a user who set one
 * thinking it was a budget would find out from an invoice.
 */
export function AgentProviderSettings({
  config,
  onChange
}: {
  config: AgentProviderConfig;
  onChange: (patch: Partial<AgentProviderConfig>) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <RoleCard
      title={t('agentSettings.routing.title')}
      description={t('agentSettings.routing.description')}
      icon={<Route size={16} />}
    >
      <Row
        id="agent-routing-sort"
        label={t('agentSettings.routing.sort.label')}
        hint={t('agentSettings.routing.sort.hint')}
      >
        <select
          id="agent-routing-sort"
          value={config.sort}
          onChange={(e) => onChange({ sort: toSort(e.target.value) })}
          className={`${selectCls} w-36`}
        >
          {PROVIDER_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(SORT_LABEL_KEYS[sort])}
            </option>
          ))}
        </select>
      </Row>

      <ListRow
        id="agent-routing-order"
        label={t('agentSettings.routing.order.label')}
        hint={t('agentSettings.routing.order.hint')}
        value={config.order}
        onChange={(order) => onChange({ order })}
      />

      <ListRow
        id="agent-routing-only"
        label={t('agentSettings.routing.only.label')}
        hint={t('agentSettings.routing.only.hint')}
        value={config.only}
        onChange={(only) => onChange({ only })}
      />

      <ListRow
        id="agent-routing-ignore"
        label={t('agentSettings.routing.ignore.label')}
        hint={t('agentSettings.routing.ignore.hint')}
        value={config.ignore}
        onChange={(ignore) => onChange({ ignore })}
      />

      <Row
        id="agent-routing-require-parameters"
        label={t('agentSettings.routing.requireParameters.label')}
        hint={t('agentSettings.routing.requireParameters.hint')}
      >
        <Toggle
          id="agent-routing-require-parameters"
          checked={config.requireParameters}
          onChange={(requireParameters) => onChange({ requireParameters })}
        />
      </Row>

      <Row
        id="agent-routing-allow-fallbacks"
        label={t('agentSettings.routing.allowFallbacks.label')}
        hint={t('agentSettings.routing.allowFallbacks.hint')}
      >
        <Toggle
          id="agent-routing-allow-fallbacks"
          checked={config.allowFallbacks}
          onChange={(allowFallbacks) => onChange({ allowFallbacks })}
        />
      </Row>

      <PriceRow
        id="agent-routing-max-prompt-price"
        label={t('agentSettings.routing.maxPromptPrice.label')}
        value={config.maxPromptPrice}
        onChange={(maxPromptPrice) => onChange({ maxPromptPrice })}
      />

      <PriceRow
        id="agent-routing-max-completion-price"
        label={t('agentSettings.routing.maxCompletionPrice.label')}
        value={config.maxCompletionPrice}
        onChange={(maxCompletionPrice) => onChange({ maxCompletionPrice })}
      />
    </RoleCard>
  );
}

/**
 * Models to try when the chosen one will not take the request.
 *
 * Costs nothing to have configured: OpenRouter bills only the model that
 * answered, so a fallback that never fires never appears on the invoice. And
 * one that does fire is already visible - the pane names the model that served
 * each turn - so this card does not need to announce anything.
 */
export function AgentFallbackSettings({
  models,
  config,
  onChange
}: {
  models: AgentCatalogModel[];
  config: AgentFallbackConfig;
  onChange: (patch: Partial<AgentFallbackConfig>) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const chosen = config.models.slice(0, FALLBACK_MAX_MODELS);
  return (
    <RoleCard
      title={t('agentSettings.fallback.title')}
      description={t('agentSettings.fallback.description')}
      icon={<Shuffle size={16} />}
    >
      {chosen.map((model, index) => (
        <div key={model} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-xs tabular-nums text-fleet-text-muted">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <ModelSelect
              models={models}
              value={model}
              onChange={(next) =>
                onChange({
                  models: chosen.flatMap((m, i) =>
                    i !== index ? [m] : next === null ? [] : [next]
                  )
                })
              }
              allowNone
              noneLabel={t('agentSettings.common.remove')}
            />
          </div>
        </div>
      ))}

      {chosen.length < FALLBACK_MAX_MODELS && (
        <ModelSelect
          models={models}
          value={null}
          onChange={(next) => {
            if (next === null || chosen.includes(next)) return;
            onChange({ models: [...chosen, next] });
          }}
          allowNone
          noneLabel={
            chosen.length === 0
              ? t('agentSettings.fallback.none')
              : t('agentSettings.fallback.addAnother')
          }
        />
      )}
    </RoleCard>
  );
}

const SORT_LABEL_KEYS: Record<ProviderSort, MessageKey> = {
  default: 'agentSettings.routing.sort.balanced',
  price: 'agentSettings.routing.sort.cheapest',
  throughput: 'agentSettings.routing.sort.fastest',
  latency: 'agentSettings.routing.sort.quickest'
};

/** A `<select>` hands back a plain string. Narrowed by lookup, never asserted. */
function toSort(value: string): ProviderSort {
  return PROVIDER_SORTS.find((sort) => sort === value) ?? 'default';
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

/**
 * A rate ceiling, and the row whose copy has to work hardest.
 *
 * It bounds what one token costs and says nothing about how many a turn will
 * spend. Calling it a budget - or letting the label imply one - would be a
 * promise Fleet cannot keep, and the user would find out from an invoice.
 */
function PriceRow({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
}): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Row id={id} label={label} hint={t('agentSettings.routing.price.hint')}>
      <div className="flex items-center gap-1">
        <span className="text-sm text-fleet-text-muted">$</span>
        <PriceInput id={id} value={value} onChange={onChange} />
      </div>
    </Row>
  );
}

/**
 * A price ceiling in dollars, held as text until the field is left.
 *
 * The only decimal field in these panes, so the draft lives here rather than in
 * the shared controls; the rule it follows is `commitPrice`, which is where the
 * reason is written down.
 */
function PriceInput({
  id,
  value,
  onChange
}: {
  id: string;
  value: number | null;
  onChange: (next: number | null) => void;
}): React.JSX.Element {
  const [draft, setDraft] = useState<string | null>(null);
  const { t } = useTranslation();

  const commit = (): void => {
    if (draft === null) return;
    setDraft(null);
    onChange(commitPrice(draft));
  };

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      step={0.1}
      placeholder={t('agentSettings.routing.price.placeholder')}
      value={draft ?? (value === null ? '' : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setDraft(null);
      }}
      className={`${inputCls} w-20 tabular-nums`}
    />
  );
}

/** A list of provider slugs, one per line. Same shape as the domain lists. */
function ListRow({
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
      <LineList id={id} value={value} placeholder="anthropic" onCommit={onChange} />
    </div>
  );
}
