import { teamsReporterConfig, teamsWebhookKeys } from '@config/feature-config/teamsReporter.config';

export type TeamsThemeColor = 'Default' | 'Good' | 'Warning' | 'Attention' | 'Accent';
export type TeamsDebugMode = 'always' | 'on-failure' | 'off';
type TeamsWebhookKey = keyof typeof teamsWebhookKeys;

const DEFAULT_TEAMS_THEME = {
  titlePrefix: 'Playwright test finished:',
  successLabel: 'SUCCESS',
  failureLabel: 'FAILURE',
  successColor: 'Good' as TeamsThemeColor,
  failureColor: 'Attention' as TeamsThemeColor,
} as const;

export type TeamsReporterRuntimeConfig = {
  enabled: boolean;
  debug: TeamsDebugMode;
  onSuccessWebhookUrls: string[];
  onFailureWebhookUrls: string[];
  showFailuresDetails: boolean;
  environment: string;
  reportUrl?: string;
  localReportPath?: string;
  titlePrefix: string;
  successLabel: string;
  failureLabel: string;
  successColor: TeamsThemeColor;
  failureColor: TeamsThemeColor;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseDebugMode(value: string | undefined, fallback: TeamsDebugMode): TeamsDebugMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'always' || normalized === 'on-failure' || normalized === 'off') {
    return normalized;
  }
  return fallback;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isTeamsWebhookKey(value: string): value is TeamsWebhookKey {
  return Object.prototype.hasOwnProperty.call(teamsWebhookKeys, value);
}

type ResolvedWebhookUrls = {
  urls: string[];
  missingEnvVars: string[];
  invalidKeys: string[];
};

type CombinedWebhookResolution = {
  onSuccessWebhookUrls: string[];
  onFailureWebhookUrls: string[];
  invalidKeys: string[];
  missingEnvVars: string[];
};

function resolveWebhookUrlsFromKeys(keys: readonly string[]): ResolvedWebhookUrls {
  const urls: string[] = [];
  const missingEnvVars: string[] = [];
  const invalidKeys: string[] = [];

  for (const key of keys) {
    if (!isTeamsWebhookKey(key)) {
      invalidKeys.push(key);
      continue;
    }

    const envVarName = teamsWebhookKeys[key];
    const url = process.env[envVarName];
    const trimmedUrl = nonEmpty(url);
    if (!trimmedUrl) {
      missingEnvVars.push(envVarName);
      continue;
    }

    urls.push(trimmedUrl);
  }

  return { urls, missingEnvVars, invalidKeys };
}

function resolveAllWebhooks(): CombinedWebhookResolution {
  const onSuccessResolved = resolveWebhookUrlsFromKeys(teamsReporterConfig.onSuccessWebhookKeys);
  const onFailureResolved = resolveWebhookUrlsFromKeys(teamsReporterConfig.onFailureWebhookKeys);

  return {
    onSuccessWebhookUrls: onSuccessResolved.urls,
    onFailureWebhookUrls: onFailureResolved.urls,
    invalidKeys: [...onSuccessResolved.invalidKeys, ...onFailureResolved.invalidKeys],
    missingEnvVars: [...onSuccessResolved.missingEnvVars, ...onFailureResolved.missingEnvVars],
  };
}

function resolveEnvironment(): string {
  return nonEmpty(process.env.ENVIRONMENT) ?? 'unknown';
}

function resolveCiRunUrl(): string | undefined {
  const githubServer = nonEmpty(process.env.GITHUB_SERVER_URL);
  const githubRepo = nonEmpty(process.env.GITHUB_REPOSITORY);
  const githubRunId = nonEmpty(process.env.GITHUB_RUN_ID);

  if (githubServer && githubRepo && githubRunId) {
    return `${githubServer}/${githubRepo}/actions/runs/${githubRunId}`;
  }

  return undefined;
}

function resolveReportUrl(): string | undefined {
  return resolveCiRunUrl();
}

function resolveLocalReportPath(reportUrl: string | undefined): string | undefined {
  if (reportUrl) return undefined;
  return 'build/html-report/index.html';
}

function resolveThemeColor(
  envValue: string | undefined,
  fallback: TeamsThemeColor
): TeamsThemeColor {
  const normalized = envValue?.trim();
  if (
    normalized === 'Default' ||
    normalized === 'Good' ||
    normalized === 'Warning' ||
    normalized === 'Attention' ||
    normalized === 'Accent'
  ) {
    return normalized;
  }
  return fallback;
}

function resolveThemeTexts() {
  return {
    titlePrefix: nonEmpty(process.env.TEAMS_REPORT_TITLE_PREFIX) ?? DEFAULT_TEAMS_THEME.titlePrefix,
    successLabel:
      nonEmpty(process.env.TEAMS_REPORT_SUCCESS_LABEL) ?? DEFAULT_TEAMS_THEME.successLabel,
    failureLabel:
      nonEmpty(process.env.TEAMS_REPORT_FAILURE_LABEL) ?? DEFAULT_TEAMS_THEME.failureLabel,
  };
}

function resolveThemeColors() {
  return {
    successColor: resolveThemeColor(
      process.env.TEAMS_REPORT_THEME_SUCCESS_COLOR,
      DEFAULT_TEAMS_THEME.successColor
    ),
    failureColor: resolveThemeColor(
      process.env.TEAMS_REPORT_THEME_FAILURE_COLOR,
      DEFAULT_TEAMS_THEME.failureColor
    ),
  };
}

function assertEnabledReporterConfig(
  enabled: boolean,
  invalidKeys: string[],
  missingEnvVars: string[],
  onSuccessWebhookUrls: string[],
  onFailureWebhookUrls: string[]
): void {
  if (!enabled) return;

  if (invalidKeys.length > 0) {
    throw new Error(
      `[Teams Reporter] Invalid webhook key(s) in teamsReporterConfig: ${invalidKeys.join(', ')}. ` +
        'Use keys defined in teamsWebhookKeys.'
    );
  }

  if (missingEnvVars.length > 0) {
    throw new Error(
      `[Teams Reporter] TEAMS_REPORT_ENABLED=true but required webhook env var(s) are missing: ${missingEnvVars.join(', ')}. ` +
        'Set them in env/.env.<env> or repository secrets.'
    );
  }

  if (onSuccessWebhookUrls.length === 0 && onFailureWebhookUrls.length === 0) {
    throw new Error(
      '[Teams Reporter] TEAMS_REPORT_ENABLED=true but no valid webhook destinations are configured. ' +
        'Set TEAMS_WEBHOOK_* values referenced by onSuccessWebhookKeys/onFailureWebhookKeys.'
    );
  }
}

export function buildTeamsReporterConfig(): TeamsReporterRuntimeConfig {
  const reportUrl = resolveReportUrl();
  const enabled = parseBoolean(process.env.TEAMS_REPORT_ENABLED, teamsReporterConfig.enabled);
  const { onSuccessWebhookUrls, onFailureWebhookUrls, invalidKeys, missingEnvVars } =
    resolveAllWebhooks();
  const { titlePrefix, successLabel, failureLabel } = resolveThemeTexts();
  const { successColor, failureColor } = resolveThemeColors();

  assertEnabledReporterConfig(
    enabled,
    invalidKeys,
    missingEnvVars,
    onSuccessWebhookUrls,
    onFailureWebhookUrls
  );

  return {
    enabled,
    debug: parseDebugMode(process.env.TEAMS_REPORT_DEBUG, teamsReporterConfig.debug),
    onSuccessWebhookUrls,
    onFailureWebhookUrls,
    showFailuresDetails: parseBoolean(
      process.env.TEAMS_REPORT_SHOW_FAILURES_DETAILS,
      teamsReporterConfig.showFailuresDetails
    ),
    environment: resolveEnvironment(),
    reportUrl,
    localReportPath: resolveLocalReportPath(reportUrl),
    titlePrefix,
    successLabel,
    failureLabel,
    successColor,
    failureColor,
  };
}
