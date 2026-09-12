import type {
  EndpointProbeFailure,
  EndpointProbeResult,
  LocalEndpointState,
  LocalEndpointStatus
} from '../../../../../../shared/agent-endpoints';
import type { MessageKey, TranslateParams } from '../../../../../../shared/i18n';

/**
 * What a row says about a server, and what it says when there is nothing there.
 *
 * Its own module because it is where nearly all of the judgement in this
 * feature lives and none of the markup does. A row is a `<div>`; deciding that
 * a server still loading a 30GB file is not a fault, and that the sentence
 * about it should not send anybody to check a firewall, is the part worth
 * getting right and the part worth testing.
 *
 * The rule throughout, after Baymard on form errors: say which of the causes it
 * was and what to do about it. "Could not connect" is the same sentence for a
 * server that is off, a server that is starting, and an address that belongs to
 * something else entirely - three different things to go and do, reported as
 * one shrug.
 */

/** How loudly a row's state should be drawn. */
export type StatusTone = 'ok' | 'warn' | 'busy' | 'muted';

const TONES: Record<LocalEndpointState, StatusTone> = {
  ready: 'ok',
  // Reachable, and about to wake on the first token asked of it. Nothing is
  // wrong, so nothing should look wrong.
  sleeping: 'ok',
  checking: 'busy',
  unreachable: 'warn',
  // Neither good nor bad. Nobody has asked yet, and an endpoint that has not
  // been asked has not failed at anything - colouring it as an error would be
  // the app inventing a fault to report.
  unchecked: 'muted',
  disabled: 'muted'
};

export function statusTone(state: LocalEndpointState): StatusTone {
  return TONES[state];
}

/**
 * The short line on the collapsed row.
 *
 * Text rather than a coloured dot alone, per NN/g: a dot is a legend the reader
 * has to have learned, and three of these states differ in ways no colour can
 * carry - "off" and "not checked" are both grey and are not the same thing.
 */
export function statusText(status: LocalEndpointStatus | undefined): {
  key: MessageKey;
  params?: TranslateParams;
} {
  if (status === undefined) return { key: 'agentSettings.endpoint.statusNotChecked' };
  switch (status.state) {
    case 'checking':
      return { key: 'agentSettings.endpoint.statusChecking' };
    case 'ready':
      return modelCount(status.modelCount);
    case 'sleeping':
      if (status.modelCount === 1) return { key: 'agentSettings.endpoint.statusIdleOne' };
      return {
        key: 'agentSettings.endpoint.statusIdleOther',
        params: { count: status.modelCount }
      };
    case 'unreachable':
      return { key: failureTitle(status.reason) };
    case 'disabled':
      return { key: 'agentSettings.common.off' };
    case 'unchecked':
      if (status.modelCount === 0) return { key: 'agentSettings.endpoint.statusNotChecked' };
      if (status.modelCount === 1) return { key: 'agentSettings.endpoint.statusSavedOne' };
      return {
        key: 'agentSettings.endpoint.statusSavedOther',
        params: { count: status.modelCount }
      };
  }
}

/** "1 model" / "3 models" / "No models". */
export function modelCount(n: number): { key: MessageKey; params?: TranslateParams } {
  if (n === 0) return { key: 'agentSettings.endpoint.statusReadyNone' };
  if (n === 1) return { key: 'agentSettings.endpoint.statusReadyOne' };
  return { key: 'agentSettings.endpoint.statusReadyOther', params: { count: n } };
}

/** The heading a failure gets, on a row and in the add form alike. */
export function failureTitle(reason: EndpointProbeFailure | null): MessageKey {
  switch (reason) {
    case 'refused':
      return 'agentSettings.endpoint.failureRefusedTitle';
    case 'timeout':
      return 'agentSettings.endpoint.failureTimeoutTitle';
    case 'loading':
      return 'agentSettings.endpoint.failureLoadingTitle';
    case 'auth-required':
      return 'agentSettings.endpoint.failureAuthRequiredTitle';
    case 'no-models':
      return 'agentSettings.endpoint.failureNoModelsTitle';
    case 'not-openai':
      return 'agentSettings.endpoint.failureNotOpenAiTitle';
    case null:
      return 'agentSettings.endpoint.failureUnreachableTitle';
  }
}

/**
 * What to do about it, in one sentence, naming the address it is about.
 *
 * Each of these points somewhere different, which is the whole reason they are
 * separate cases. Two of them - starting up, and idle - are not faults at all
 * and say so, because a person who reads "failed" about a server that is
 * working goes looking for a problem that does not exist.
 */
export function failureHint(
  reason: EndpointProbeFailure | null,
  hostPort: string
): { key: MessageKey; params?: TranslateParams } {
  switch (reason) {
    case 'refused':
      return {
        key: 'agentSettings.endpoint.failureRefusedHint',
        params: { hostPort }
      };
    case 'timeout':
      return {
        key: 'agentSettings.endpoint.failureTimeoutHint',
        params: { hostPort }
      };
    case 'loading':
      return { key: 'agentSettings.endpoint.failureLoadingHint' };
    case 'auth-required':
      return { key: 'agentSettings.endpoint.failureAuthRequiredHint' };
    case 'no-models':
      return { key: 'agentSettings.endpoint.failureNoModelsHint' };
    case 'not-openai':
      return {
        key: 'agentSettings.endpoint.failureNotOpenAiHint',
        params: { hostPort }
      };
    case null:
      return {
        key: 'agentSettings.endpoint.failureUnreachableHint',
        params: { hostPort }
      };
  }
}

/**
 * The answer the Test button gives, before anything has been saved.
 *
 * Warnings rather than validations, in Baymard's sense: none of these stops the
 * user saving. A server that is off right now is the ordinary case for a
 * process on somebody's own laptop, and refusing to save the address until they
 * start it would be the app being obstructive about a fact it cannot verify on
 * the user's behalf anyway.
 */
export type TestOutcome = {
  tone: 'ok' | 'warn';
  title: MessageKey;
  hint: { key: MessageKey; params?: TranslateParams };
  /** What was found, so the form can name it before it is saved. */
  models: string[];
};

export function testOutcome(result: EndpointProbeResult, hostPort: string): TestOutcome {
  if (!result.ok) {
    return {
      tone: 'warn',
      title: failureTitle(result.reason),
      hint: failureHint(result.reason, hostPort),
      models: []
    };
  }
  const names = result.models.map((m) => m.name);
  return {
    tone: 'ok',
    title:
      result.fingerprint === 'llamacpp'
        ? result.sleeping
          ? 'agentSettings.endpoint.testFoundLlamaIdle'
          : 'agentSettings.endpoint.testFoundLlama'
        : result.sleeping
          ? 'agentSettings.endpoint.testFoundOpenAiIdle'
          : 'agentSettings.endpoint.testFoundOpenAi',
    hint:
      names.length === 0
        ? { key: 'agentSettings.endpoint.testNoModel' }
        : {
            key: 'agentSettings.endpoint.testServing',
            params: { models: names.join(', ') }
          },
    models: names
  };
}

/**
 * An id for a new endpoint, which nothing may ever change afterwards.
 *
 * Every model chosen from this server names it by this string, in three
 * separate model slots in settings. Keying by the address instead would orphan
 * all of them the moment somebody corrected the port - which is the ordinary
 * thing to do while getting a server running, not an edge case.
 */
export function newEndpointId(): string {
  return `ep_${crypto.randomUUID().slice(0, 8)}`;
}
