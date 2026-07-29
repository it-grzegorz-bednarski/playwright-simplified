import { execSync } from 'node:child_process';

const slackTemplate = {
  title: 'Playwright test finished',
  successLabel: 'SUCCESS',
  failureLabel: 'FAILURE',
  successIcon: ':large_green_circle:',
  failureIcon: ':red_circle:',
  passedIcon: ':white_check_mark:',
  failedIcon: ':x:',
  skippedIcon: ':fast_forward:',
  flakyIcon: ':large_yellow_circle:',
  unknownValue: '-',
  reportUrlEnvVar: 'PLAYWRIGHT_REPORT_URL',
  reportUrlFallbackEnvVar: 'SLACK_REPORT_URL',
  localReportPath: 'build/html-report/index.html',
} as const;

type SlackBlock = {
  type: 'section' | 'divider';
  text?: {
    type: 'mrkdwn';
    text: string;
  };
};

type SlackSummaryTest = {
  projectName?: string;
  startedAt: string;
  endedAt: string;
};

type SlackSummaryResults = {
  passed: number;
  failed: number;
  flaky?: number;
  skipped: number;
  tests: SlackSummaryTest[];
};

type NormalizedSlackCounts = {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  passRate: string;
};

function firstNonEmptyTrimmed(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return undefined;
}

function safeGitOutput(command: string): string | undefined {
  try {
    const value = execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
    }).trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function uniqueProjects(tests: SlackSummaryTest[]): string {
  const projects = [...new Set(tests.map(test => test.projectName).filter(Boolean))] as string[];
  return projects.length > 0 ? projects.join(', ') : slackTemplate.unknownValue;
}

function resolveEnvName(): string {
  return (
    firstNonEmptyTrimmed(process.env.ENV, process.env.ENVIRONMENT, process.env.NODE_ENV) ??
    slackTemplate.unknownValue
  );
}

function resolveUserScope(): string | null {
  const scope = process.env.PW_USER_SCOPE?.trim();
  return scope || null;
}

function resolveBranchName(): string {
  return (
    firstNonEmptyTrimmed(
      process.env.GITHUB_REF_NAME,
      process.env.GITHUB_HEAD_REF,
      process.env.BUILD_SOURCEBRANCHNAME,
      process.env.CI_COMMIT_REF_NAME,
      process.env.BRANCH_NAME
    ) ??
    safeGitOutput('git rev-parse --abbrev-ref HEAD') ??
    slackTemplate.unknownValue
  );
}

function resolveCommitMessage(): string {
  return (
    firstNonEmptyTrimmed(
      process.env.COMMIT_MESSAGE,
      process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE,
      process.env.CI_COMMIT_MESSAGE,
      process.env.BUILD_SOURCEVERSIONMESSAGE
    ) ??
    safeGitOutput('git log -1 --pretty=%s') ??
    slackTemplate.unknownValue
  );
}

function formatDurationMs(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return slackTemplate.unknownValue;

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function resolveRunDuration(tests: SlackSummaryTest[]): string {
  if (tests.length === 0) return slackTemplate.unknownValue;

  const starts = tests
    .map(test => Date.parse(test.startedAt))
    .filter(value => Number.isFinite(value)) as number[];
  const ends = tests
    .map(test => Date.parse(test.endedAt))
    .filter(value => Number.isFinite(value)) as number[];

  if (starts.length === 0 || ends.length === 0) return slackTemplate.unknownValue;

  return formatDurationMs(Math.max(...ends) - Math.min(...starts));
}

function resolveReportUrl(): string | undefined {
  return firstNonEmptyTrimmed(
    process.env[slackTemplate.reportUrlEnvVar],
    process.env[slackTemplate.reportUrlFallbackEnvVar]
  );
}

function normalizeSlackCounts(summaryResults: SlackSummaryResults): NormalizedSlackCounts {
  const totalFromTests = summaryResults.tests.length;
  const failed = Math.max(0, summaryResults.failed);
  const skipped = Math.max(0, summaryResults.skipped);
  const flaky = Math.max(0, summaryResults.flaky ?? 0);
  const passed = Math.max(0, summaryResults.passed - flaky);
  const countedTotal = passed + failed + skipped + flaky;
  const totalTests = Math.max(totalFromTests, countedTotal);
  const passRate = totalTests > 0 ? `${Math.round((passed / totalTests) * 100)}%` : '0%';

  return {
    totalTests,
    passed,
    failed,
    skipped,
    flaky,
    passRate,
  };
}

export function generateSlackMessageLayout(summaryResults: SlackSummaryResults): SlackBlock[] {
  const { totalTests, failed, passed, skipped, flaky, passRate } = normalizeSlackCounts(summaryResults);

  const status = failed > 0 ? slackTemplate.failureLabel : slackTemplate.successLabel;
  const statusIcon = failed > 0 ? slackTemplate.failureIcon : slackTemplate.successIcon;
  const reportUrl = resolveReportUrl();
  const userScope = resolveUserScope();

  const mainSection = {
    type: 'section' as const,
    text: {
      type: 'mrkdwn' as const,
      text:
        `${statusIcon} *${slackTemplate.title}: ${status}*\n` +
        `*Project:* ${uniqueProjects(summaryResults.tests)}\n` +
        `*Env:* ${resolveEnvName()}\n` +
        (userScope ? `*Scope:* ${userScope}\n` : '') +
        `*Branch:* ${resolveBranchName()}\n` +
        `*Commit message:* ${resolveCommitMessage()}\n` +
        `*Duration:* ${resolveRunDuration(summaryResults.tests)}`,
    },
  };

  const summarySection = {
    type: 'section' as const,
    text: {
      type: 'mrkdwn' as const,
      text:
        `*Total tests:* ${totalTests}\n` +
        `*Pass rate:* ${passRate}\n` +
        `${slackTemplate.passedIcon} *Passed:* ${passed}\n` +
        `${slackTemplate.failedIcon} *Failed:* ${failed}\n` +
        `${slackTemplate.skippedIcon} *Skipped:* ${skipped}\n` +
        `${slackTemplate.flakyIcon} *Flaky:* ${flaky}`,
    },
  };

  const blocks: SlackBlock[] = [mainSection, { type: 'divider' }, summarySection];

  if (reportUrl) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Report:* <${reportUrl}|Available in run artifacts>`,
      },
    });
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Local report path:* \`${slackTemplate.localReportPath}\``,
      },
    });
  }

  return blocks;
}
