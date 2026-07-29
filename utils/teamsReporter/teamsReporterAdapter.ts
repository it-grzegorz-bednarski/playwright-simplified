import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import {
  buildAdaptiveCard,
  buildOverallSummary,
  collectResultsFromSuite,
  type TeamsMessagePayload,
} from 'playwright-teams-reporter';
import { buildTeamsReporterConfig } from '@utils/teamsReporter/teamsReporter';
import { runWithoutCiSharding } from '@utils/runWithoutCiSharding';

type TestOutcome = 'success' | 'failure';

type SendAttempt = {
  destination: string;
  ok: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
};

type ReportContextDetails = {
  project: string;
  scope?: string;
  branch: string;
  commitMessage: string;
};

const TEAMS_PAYLOAD_SOFT_LIMIT_BYTES = 24 * 1024;
const FAILURE_STATUSES = new Set(['FAILED', 'FLAKY', 'TIMEDOUT', 'INTERRUPTED']);

type PayloadBuildResult = {
  payload: TeamsMessagePayload;
  totalFailureCases: number;
  includedFailureCases: number;
  payloadBytes: number;
  trimmedByPayloadLimit: boolean;
};

type PayloadBuildOptions = {
  showFailuresDetails: boolean;
  titlePrefix: string;
  successLabel: string;
  failureLabel: string;
  colors: { successColor: string; failureColor: string };
  runOutcome: TestOutcome;
  reportUrl?: string;
  localReportPath?: string;
  context?: ReportContextDetails;
};

class TeamsReporterAdapter implements Reporter {
  private readonly runtime: ReturnType<typeof buildTeamsReporterConfig>;
  private rootSuite: Suite | null = null;
  private hasExecutedTests = false;

  constructor() {
    this.runtime = (() => {
      try {
        return buildTeamsReporterConfig();
      } catch (error) {
        failReporterConfig(
          'Teams Reporter',
          error instanceof Error ? error.message : String(error)
        );
      }
    })();
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    if (!this.runtime.enabled) return;
    this.rootSuite = suite;
  }

  onTestEnd(_test: TestCase, _result: TestResult): void {
    if (!this.runtime.enabled) return;
    this.hasExecutedTests = true;
  }

  async onEnd(result: FullResult): Promise<void> {
    await runWithoutCiSharding(async () => {
      if (!this.runtime.enabled) return;

      if (!this.hasExecutedTests || !this.rootSuite) {
        this.log('always', '[teams-reporter] No executed tests detected. Skipping send.');
        return;
      }

      const runOutcome: TestOutcome = result.status === 'passed' ? 'success' : 'failure';
      const webhookUrls =
        runOutcome === 'success'
          ? this.runtime.onSuccessWebhookUrls
          : this.runtime.onFailureWebhookUrls;

      if (webhookUrls.length === 0) {
        throw new Error(
          `[Teams Reporter] No webhook URLs configured for ${runOutcome}. ` +
            `Check teamsReporterConfig ${runOutcome === 'success' ? 'onSuccessWebhookKeys' : 'onFailureWebhookKeys'} ` +
            'and corresponding TEAMS_WEBHOOK_* environment values.'
        );
      }

      const aggregated = collectResultsFromSuite(this.rootSuite);
      const summary = buildOverallSummary(result.status, aggregated);
      const strictPassed = Math.max(0, aggregated.passed - aggregated.flaky);
      const failureTestCases = this.runtime.showFailuresDetails
        ? aggregated.testCases.filter(testCase => FAILURE_STATUSES.has(testCase.status))
        : [];

      const resultData = {
        duration: formatDuration(result.duration),
        environment: this.runtime.environment,
        failed: aggregated.failed,
        flaky: aggregated.flaky,
        reportUrl: this.runtime.reportUrl,
        skip: aggregated.skipped,
        success: strictPassed,
        summary,
        testCases: failureTestCases,
        timedOut: aggregated.timedOut,
        total: aggregated.total,
      };

      const payloadBuild = buildPayloadWithSizeGuard(
        resultData as Parameters<typeof buildAdaptiveCard>[0],
        {
          showFailuresDetails: this.runtime.showFailuresDetails,
          titlePrefix: this.runtime.titlePrefix,
          successLabel: this.runtime.successLabel,
          failureLabel: this.runtime.failureLabel,
          colors: {
            successColor: this.runtime.successColor,
            failureColor: this.runtime.failureColor,
          },
          runOutcome,
          reportUrl: this.runtime.reportUrl,
          localReportPath: this.runtime.localReportPath,
          context: buildReportContextDetails(this.rootSuite),
        }
      );
      const payload = payloadBuild.payload;

      if (payloadBuild.trimmedByPayloadLimit) {
        this.log(
          'always',
          `[teams-reporter] Payload trimmed for Teams limit: included ${payloadBuild.includedFailureCases}/${payloadBuild.totalFailureCases} failed test case details (${payloadBuild.payloadBytes}/${TEAMS_PAYLOAD_SOFT_LIMIT_BYTES} bytes).`
        );
      }

      const attempts = await Promise.all(
        webhookUrls.map(destination => sendWebhook(destination, payload))
      );

      this.printDeliveryLogs(attempts, runOutcome);
    });
  }

  printsToStdio(): boolean {
    return false;
  }

  private printDeliveryLogs(attempts: SendAttempt[], runOutcome: TestOutcome): void {
    const failed = attempts.filter(item => !item.ok);
    const hasFailure = failed.length > 0;

    if (this.runtime.debug === 'off' && !hasFailure) {
      return;
    }

    if (this.runtime.debug === 'on-failure' && !hasFailure) {
      return;
    }

    const prefix = `[teams-reporter] ${runOutcome.toUpperCase()}`;
    for (const attempt of attempts) {
      if (attempt.ok) {
        console.log(
          `${prefix} sent to ${attempt.destination} (status ${attempt.statusCode ?? 'n/a'})`
        );
      } else {
        console.warn(
          `${prefix} failed for ${attempt.destination}: ${attempt.errorMessage ?? 'Unknown error'}`
        );
      }
    }
  }

  private log(mode: 'always' | 'on-failure', message: string): void {
    if (mode === 'always') {
      console.log(message);
      return;
    }

    if (this.runtime.debug === 'always') {
      console.log(message);
      return;
    }

    if (this.runtime.debug === 'on-failure' && mode === 'on-failure') {
      console.log(message);
    }
  }
}

function failReporterConfig(reporterName: string, details: string): never {
  const lines = [
    '==================================================================',
    `${reporterName} configuration error`,
    '==================================================================',
    details,
  ];

  for (const line of lines) {
    console.error(line);
  }

  try {
    const logDir = path.resolve(process.cwd(), 'build');
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'error.log');
    const stack = new Error(details).stack || details;
    fs.writeFileSync(logPath, `${reporterName}: ${stack}\n`, 'utf8');
  } catch {
    // no-op
  }

  process.exit(1);
}

function applyTheme(
  payload: TeamsMessagePayload,
  titlePrefix: string,
  successLabel: string,
  failureLabel: string,
  colors: { successColor: string; failureColor: string },
  runOutcome: TestOutcome,
  reportUrl?: string,
  localReportPath?: string,
  context?: ReportContextDetails
): void {
  const card = payload.attachments[0]?.content;
  if (!card?.body) return;

  card.body = card.body.filter(
    block =>
      !(
        block.type === 'TextBlock' &&
        typeof block.text === 'string' &&
        block.text.startsWith('Date:')
      )
  );

  const statusLabel = runOutcome === 'success' ? successLabel : failureLabel;
  const headerColor = runOutcome === 'success' ? colors.successColor : colors.failureColor;

  const titleBlock = card.body[0] as { type?: string; text?: string; color?: string } | undefined;
  if (titleBlock && titleBlock.type === 'TextBlock') {
    titleBlock.text = `${titlePrefix} ${statusLabel}`;
    titleBlock.color = headerColor;
  }

  for (const block of card.body) {
    if (block.type !== 'TextBlock') continue;
    if (typeof block.text === 'string' && block.text.includes('Pass Rate:')) {
      block.color = headerColor;
    }
  }

  if (context) {
    const contextLines = [
      `Project: ${context.project}`,
      ...(context.scope ? [`Scope: ${context.scope}`] : []),
      `Branch: ${context.branch}`,
      `Commit message: ${context.commitMessage}`,
    ];

    card.body.push({
      type: 'TextBlock',
      text: contextLines.join('\n'),
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    } as any);
  }

  if (reportUrl) {
    card.body.push({
      type: 'TextBlock',
      text: `Report: [Available in run artifacts](${reportUrl})`,
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    } as any);
  } else if (localReportPath) {
    card.body.push({
      type: 'TextBlock',
      text: `Local report path: ${localReportPath}`,
      wrap: true,
      spacing: 'Small',
      isSubtle: true,
    } as any);
  }

  payload.summary = `${titlePrefix} ${statusLabel}`;
}

function buildReportContextDetails(rootSuite: Suite): ReportContextDetails {
  return {
    project: resolveProjectNames(rootSuite),
    scope: resolveUserScope(),
    branch: resolveBranchName(),
    commitMessage: resolveCommitMessage(),
  };
}

function resolveProjectNames(rootSuite: Suite): string {
  const names = new Set<string>();

  for (const test of rootSuite.allTests()) {
    const projectName = ((test as any).parent?.project?.() as { name?: string } | undefined)?.name;
    if (projectName?.trim()) names.add(projectName.trim());
  }

  if (names.size === 0) return '-';
  return Array.from(names).join(', ');
}

function resolveUserScope(): string | undefined {
  const scope = process.env.PW_USER_SCOPE?.trim();
  return scope || undefined;
}

function resolveBranchName(): string {
  const envBranch =
    process.env.GITHUB_REF_NAME ||
    process.env.GITHUB_HEAD_REF ||
    process.env.BUILD_SOURCEBRANCHNAME ||
    process.env.CI_COMMIT_REF_NAME ||
    process.env.BRANCH_NAME;

  if (envBranch?.trim()) return envBranch.trim();

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
    }).trim();
  } catch {
    return '-';
  }
}

function resolveCommitMessage(): string {
  const envMessage =
    process.env.COMMIT_MESSAGE ||
    process.env.GITHUB_EVENT_HEAD_COMMIT_MESSAGE ||
    process.env.CI_COMMIT_MESSAGE ||
    process.env.BUILD_SOURCEVERSIONMESSAGE;

  if (envMessage?.trim()) return envMessage.trim();

  try {
    return execSync('git log -1 --pretty=%s', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1500,
    }).trim();
  } catch {
    return '-';
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function buildPayloadWithSizeGuard(
  resultData: Parameters<typeof buildAdaptiveCard>[0],
  options: PayloadBuildOptions
): PayloadBuildResult {
  const totalFailureCases = resultData.testCases.length;

  if (!options.showFailuresDetails || totalFailureCases === 0) {
    const candidate = buildPayloadCandidate(resultData, 0, totalFailureCases, false, options);
    return {
      payload: candidate.payload,
      totalFailureCases,
      includedFailureCases: 0,
      payloadBytes: candidate.payloadBytes,
      trimmedByPayloadLimit: false,
    };
  }

  let bestPayload: TeamsMessagePayload | null = null;
  let bestIncluded = -1;
  let bestPayloadBytes = Number.MAX_SAFE_INTEGER;

  let left = 1;
  let right = totalFailureCases;

  while (left <= right) {
    const candidateCount = Math.floor((left + right) / 2);
    const candidate = buildPayloadCandidate(
      resultData,
      candidateCount,
      totalFailureCases,
      true,
      options
    );
    const candidateBytes = candidate.payloadBytes;

    if (candidateBytes <= TEAMS_PAYLOAD_SOFT_LIMIT_BYTES) {
      bestPayload = candidate.payload;
      bestIncluded = candidateCount;
      bestPayloadBytes = candidateBytes;
      left = candidateCount + 1;
      continue;
    }

    right = candidateCount - 1;
  }

  if (!bestPayload) {
    const fallback = buildPayloadCandidate(resultData, 0, totalFailureCases, true, options);
    return {
      payload: fallback.payload,
      totalFailureCases,
      includedFailureCases: 0,
      payloadBytes: fallback.payloadBytes,
      trimmedByPayloadLimit: true,
    };
  }

  const trimmedByPayloadLimit = bestIncluded < totalFailureCases;

  return {
    payload: bestPayload,
    totalFailureCases,
    includedFailureCases: bestIncluded,
    payloadBytes: bestPayloadBytes,
    trimmedByPayloadLimit,
  };
}

function buildPayloadCandidate(
  resultData: Parameters<typeof buildAdaptiveCard>[0],
  includedFailureCases: number,
  totalFailureCases: number,
  shouldMarkTrimmed: boolean,
  options: PayloadBuildOptions
): { payload: TeamsMessagePayload; payloadBytes: number } {
  const includeDetails = options.showFailuresDetails && includedFailureCases > 0;
  const payload = buildAdaptiveCard(
    resultData,
    includeDetails,
    includeDetails ? includedFailureCases : 1
  );

  if (includeDetails) {
    renameDetailsSectionAsFailures(payload, includedFailureCases, totalFailureCases);
  }

  applyTheme(
    payload,
    options.titlePrefix,
    options.successLabel,
    options.failureLabel,
    options.colors,
    options.runOutcome,
    options.reportUrl,
    options.localReportPath,
    options.context
  );

  // Keep trim note as the very last card element (below report link/path).
  if (shouldMarkTrimmed && includedFailureCases < totalFailureCases) {
    addPayloadTrimInfo(payload, includedFailureCases, totalFailureCases);
  }

  return {
    payload,
    payloadBytes: getPayloadSizeInBytes(payload),
  };
}

function getPayloadSizeInBytes(payload: TeamsMessagePayload): number {
  return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}

function renameDetailsSectionAsFailures(
  payload: TeamsMessagePayload,
  includedFailureCases: number,
  totalFailureCases: number
): void {
  const card = payload.attachments[0]?.content as { actions?: any[] } | undefined;
  const actions = card?.actions;
  if (!actions) return;

  const title = `Failed Cases Details (${includedFailureCases}/${totalFailureCases})`;

  for (const action of actions) {
    if (action?.type !== 'Action.ShowCard') continue;

    if (typeof action.title === 'string' && action.title.includes('Test Cases Details')) {
      action.title = title;
    }

    const showCardBody = action.card?.body;
    if (!Array.isArray(showCardBody)) continue;

    for (const block of showCardBody) {
      if (block?.type !== 'TextBlock' || typeof block.text !== 'string') continue;
      if (!block.text.includes('Test Cases Details')) continue;
      block.text = `Failed Cases Details (${includedFailureCases}/${totalFailureCases})`;
      break;
    }
  }
}

function addPayloadTrimInfo(
  payload: TeamsMessagePayload,
  includedFailureCases: number,
  totalFailureCases: number
): void {
  const card = payload.attachments[0]?.content as { body?: any[] } | undefined;
  if (!Array.isArray(card?.body)) return;

  card.body.push({
    type: 'TextBlock',
    text: `Failed details trimmed due to payload limits. Failed cases: ${includedFailureCases}/${totalFailureCases}.`,
    wrap: true,
    spacing: 'Medium',
    separator: true,
    isSubtle: true,
  });
}

async function sendWebhook(
  destination: string,
  payload: TeamsMessagePayload
): Promise<SendAttempt> {
  try {
    const response = await postJson(destination, payload, 10_000);
    const responseBody = response.body;
    if (!response.ok) {
      return {
        destination,
        ok: false,
        statusCode: response.statusCode,
        responseBody,
        errorMessage: `HTTP ${response.statusCode}: ${responseBody || '(empty body)'}`,
      };
    }

    return {
      destination,
      ok: true,
      statusCode: response.statusCode,
      responseBody,
    };
  } catch (error) {
    return {
      destination,
      ok: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

type PostJsonResponse = {
  ok: boolean;
  statusCode: number;
  body: string;
};

function postJson(url: string, payload: unknown, timeoutMs: number): Promise<PostJsonResponse> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error(`Invalid webhook URL: ${url}`));
      return;
    }

    const body = JSON.stringify(payload);
    const transport = parsed.protocol === 'https:' ? https : http;

    const request = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Connection: 'close',
        },
        agent: false,
      },
      response => {
        const chunks: Buffer[] = [];
        response.on('data', chunk =>
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        );
        response.on('end', () => {
          const responseBody = Buffer.concat(chunks).toString('utf8');
          const statusCode = response.statusCode ?? 0;
          resolve({
            ok: statusCode >= 200 && statusCode < 300,
            statusCode,
            body: responseBody,
          });
        });
      }
    );

    request.on('error', reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Webhook request timed out after ${timeoutMs}ms`));
    });
    request.write(body);
    request.end();
  });
}

export default TeamsReporterAdapter;
