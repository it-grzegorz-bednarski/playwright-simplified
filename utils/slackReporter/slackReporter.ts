import { slackReporterConfig } from '@config/feature-config/slackReporter.config';
import { generateSlackMessageLayout } from '@utils/slackReporter/slackMessageLayout';

type SlackDebugMode = 'always' | 'on-failure' | 'off';

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveNumber(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseDebugMode(value: string | undefined, fallback: SlackDebugMode): SlackDebugMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'on-failure' || normalized === 'off') {
    return normalized;
  }

  return fallback;
}

function firstNonEmptyString(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function envListOrFallback(envValue: string | undefined, fallback: readonly string[]): string[] {
  const parsed = parseCsv(envValue);
  return parsed.length > 0 ? parsed : [...fallback];
}

type SlackAuthConfig = {
  slackOAuthToken: string | undefined;
  slackWebHookUrl: string | undefined;
  slackWebHookChannel: string | undefined;
};

type SlackChannelsConfig = {
  onSuccessChannels: string[];
  onFailureChannels: string[];
};

function resolveSlackAuthConfig(): SlackAuthConfig {
  return {
    slackOAuthToken: firstNonEmptyString(process.env.SLACK_BOT_USER_OAUTH_TOKEN),
    slackWebHookUrl: firstNonEmptyString(process.env.SLACK_WEBHOOK_URL),
    slackWebHookChannel: firstNonEmptyString(process.env.SLACK_WEBHOOK_CHANNEL),
  };
}

function resolveSlackChannelsConfig(): SlackChannelsConfig {
  return {
    onSuccessChannels: envListOrFallback(
      process.env.SLACK_REPORT_ON_SUCCESS_CHANNELS,
      slackReporterConfig.onSuccessChannels
    ),
    onFailureChannels: envListOrFallback(
      process.env.SLACK_REPORT_ON_FAILURE_CHANNELS,
      slackReporterConfig.onFailureChannels
    ),
  };
}

function resolveSendResults(
  enabled: boolean,
  hasAnyAuth: boolean,
  onSuccessChannels: string[],
  onFailureChannels: string[]
): 'always' | 'on-failure' | 'off' {
  if (!enabled || !hasAnyAuth) return 'off';
  if (onSuccessChannels.length > 0 && onFailureChannels.length > 0) return 'always';
  if (onFailureChannels.length > 0) return 'on-failure';
  return 'off';
}

function assertSlackReporterConfig(
  enabled: boolean,
  hasAnyAuth: boolean,
  hasAnyDestination: boolean
): void {
  if (!enabled) return;

  if (!hasAnyAuth) {
    throw new Error(
      '[Slack Reporter] SLACK_REPORT_ENABLED=true but no authentication is configured. ' +
        'Set SLACK_BOT_USER_OAUTH_TOKEN or SLACK_WEBHOOK_URL.'
    );
  }

  if (!hasAnyDestination) {
    throw new Error(
      '[Slack Reporter] SLACK_REPORT_ENABLED=true but no destination channels are configured. ' +
        'Set SLACK_REPORT_ON_SUCCESS_CHANNELS and/or SLACK_REPORT_ON_FAILURE_CHANNELS.'
    );
  }
}

export function buildSlackReporterOptions(): Record<string, unknown> {
  const enabled = parseBoolean(process.env.SLACK_REPORT_ENABLED, slackReporterConfig.enabled);
  const debugMode = parseDebugMode(process.env.SLACK_REPORT_DEBUG, slackReporterConfig.debug);
  const { onSuccessChannels, onFailureChannels } = resolveSlackChannelsConfig();
  const { slackOAuthToken, slackWebHookUrl, slackWebHookChannel } = resolveSlackAuthConfig();

  const hasAnyDestination = onSuccessChannels.length > 0 || onFailureChannels.length > 0;
  const hasAnyAuth = Boolean(slackOAuthToken) || Boolean(slackWebHookUrl);

  assertSlackReporterConfig(enabled, hasAnyAuth, hasAnyDestination);

  const sendResults = resolveSendResults(enabled, hasAnyAuth, onSuccessChannels, onFailureChannels);

  return {
    sendResults,
    onSuccessChannels,
    onFailureChannels,
    showInThread: parseBoolean(
      process.env.SLACK_REPORT_SHOW_IN_THREAD,
      slackReporterConfig.showInThread
    ),
    disableUnfurl: parseBoolean(
      process.env.SLACK_REPORT_DISABLE_UNFURL,
      slackReporterConfig.disableUnfurl
    ),
    maxNumberOfFailuresToShow: parsePositiveNumber(
      process.env.SLACK_REPORT_MAX_FAILURES,
      slackReporterConfig.maxNumberOfFailuresToShow
    ),
    debug: debugMode,
    slackLogLevel: debugMode === 'always' ? 'DEBUG' : 'ERROR',
    layout: generateSlackMessageLayout,
    slackOAuthToken,
    slackWebHookUrl,
    slackWebHookChannel,
  };
}
