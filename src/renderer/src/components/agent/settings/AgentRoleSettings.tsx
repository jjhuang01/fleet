import {
  FALLBACK_REASONING_EFFORT,
  FALLBACK_TEMPERATURE,
  defaultThinkingBudget,
  type AgentCatalogModel,
  type AgentModelConfig
} from '../../../../../shared/agent-types';
import { useTranslation } from '../../../lib/i18n';
import { Toggle } from './Toggle';
import { ModelSelect } from './ModelSelect';
import { ParamSlider, OptionPills, RoleCard } from './controls';
import { formatTokens } from './format';

/** Sane ceiling for models whose catalog entry omits an output limit. */
const FALLBACK_OUTPUT_LIMIT = 32_000;

/**
 * Model choice plus inference settings for one agent role. Every control below
 * the picker is driven by what models.dev says the selected model supports, so
 * the panel never offers a knob the provider would reject.
 */
export function AgentRoleSettings({
  title,
  description,
  icon,
  models,
  config,
  onChange,
  allowNone = false,
  noneLabel
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  models: AgentCatalogModel[];
  config: AgentModelConfig;
  onChange: (patch: Partial<AgentModelConfig>) => void;
  allowNone?: boolean;
  noneLabel?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  const model = models.find((m) => m.id === config.model) ?? null;
  const outputLimit = model?.outputLimit ?? FALLBACK_OUTPUT_LIMIT;
  const effort = model?.reasoning.find((r) => r.type === 'effort');
  const budget = model?.reasoning.find((r) => r.type === 'budget_tokens');
  const toggle = model?.reasoning.some((r) => r.type === 'toggle') ?? false;

  // Every control below falls back to what the model itself does when the
  // parameter is omitted, so an untouched setting is shown as a real number.
  const reasoningOn = config.reasoningEnabled ?? model?.defaultReasoningEnabled ?? !toggle;
  const defaultEffort =
    model?.defaultReasoningEffort ??
    (effort?.values.includes(FALLBACK_REASONING_EFFORT) === true
      ? FALLBACK_REASONING_EFFORT
      : null);
  const budgetDefault = budget
    ? Math.min(
        Math.max(defaultThinkingBudget(config.maxTokens ?? outputLimit), budget.min),
        budget.max
      )
    : 0;

  return (
    <RoleCard title={title} description={description} icon={icon}>
      <ModelSelect
        models={models}
        value={config.model}
        onChange={(id) => onChange({ model: id })}
        allowNone={allowNone}
        noneLabel={noneLabel}
      />

      {model && (
        <>
          <ModelFacts model={model} />

          <ParamSlider
            label={t('agentSettings.role.maxOutput.label')}
            hint={t('agentSettings.role.maxOutput.hint')}
            value={config.maxTokens === null ? null : Math.min(config.maxTokens, outputLimit)}
            defaultValue={outputLimit}
            defaultNote={t('agentSettings.role.maxOutput.default')}
            onChange={(v) => onChange({ maxTokens: v })}
            min={1024}
            max={outputLimit}
            step={1024}
            format={formatTokens}
          />

          {model.supportsTemperature && (
            <ParamSlider
              label={t('agentSettings.role.temperature.label')}
              hint={t('agentSettings.role.temperature.hint')}
              value={config.temperature}
              defaultValue={model.defaultTemperature ?? FALLBACK_TEMPERATURE}
              defaultNote={
                model.defaultTemperature === null
                  ? t('agentSettings.role.temperature.providerDefault')
                  : t('agentSettings.role.temperature.modelDefault')
              }
              onChange={(v) => onChange({ temperature: v })}
              min={0}
              max={2}
              step={0.05}
              format={(v) => v.toFixed(2)}
            />
          )}

          {toggle && (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-sm text-fleet-text-secondary">
                  {t('agentSettings.role.reasoning.label')}
                </span>
                <p className="mt-0.5 text-xs text-fleet-text-muted">
                  {t('agentSettings.role.reasoning.hint')}
                </p>
              </div>
              <Toggle
                checked={reasoningOn}
                onChange={(next) => onChange({ reasoningEnabled: next })}
                ariaLabel={t('agentSettings.role.reasoning.label')}
              />
            </div>
          )}

          {effort && (
            <OptionPills
              label={t('agentSettings.role.effort.label')}
              hint={
                defaultEffort === null
                  ? t('agentSettings.role.effort.hint')
                  : t('agentSettings.role.effort.hintDefault', { effort: defaultEffort })
              }
              options={effort.values}
              value={config.reasoningEffort}
              onChange={(v) => onChange({ reasoningEffort: v })}
            />
          )}

          {budget && reasoningOn && (
            <ParamSlider
              label={t('agentSettings.role.thinkingBudget.label')}
              hint={t('agentSettings.role.thinkingBudget.hint')}
              value={config.reasoningTokens}
              defaultValue={budgetDefault}
              defaultNote={t('agentSettings.role.thinkingBudget.default')}
              onChange={(v) => onChange({ reasoningTokens: v })}
              min={budget.min}
              max={budget.max}
              step={1024}
              format={formatTokens}
            />
          )}
        </>
      )}
    </RoleCard>
  );
}

/** The catalog's own read-only summary of the selected model. */
function ModelFacts({ model }: { model: AgentCatalogModel }): React.JSX.Element {
  const { t } = useTranslation();
  const unitPrice = (n: number): string => (n < 1 ? `$${n.toFixed(2)}` : `$${n}`);
  const facts: Array<React.ReactNode | null> = [
    model.contextLimit !== null
      ? t('agentSettings.role.fact.context', { tokens: formatTokens(model.contextLimit) })
      : null,
    model.outputLimit !== null
      ? t('agentSettings.role.fact.maxOutput', { tokens: formatTokens(model.outputLimit) })
      : null,
    // A model on the user's own hardware bills nothing, and "$0.00 / $0.00 per
    // 1M" reads as a price that failed to load rather than as an absence of one.
    model.cost && model.local === undefined
      ? t('agentSettings.model.cost', {
          input: unitPrice(model.cost.input),
          output: unitPrice(model.cost.output)
        })
      : null,
    model.supportsTools
      ? t('agentSettings.role.fact.toolCalling')
      : t('agentSettings.role.fact.noToolCalling'),
    model.releaseDate ? t('agentSettings.role.fact.released', { date: model.releaseDate }) : null
  ].filter((fact) => fact !== null);

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fleet-text-muted">
      {facts.map((fact, index) => (
        <span key={index}>{fact}</span>
      ))}
    </div>
  );
}
