import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSlackReporterOptions } from '@utils/slackReporter/slackReporter';
import { runWithoutCiSharding } from '@utils/runWithoutCiSharding';

// The upstream package prints delivery summaries with console.log().
// This adapter suppresses those logs when debug=false.
const SlackReporterBase = require('playwright-slack-report/dist/src/SlackReporter.js').default as {
  new (): Reporter;
};

type DebugMode = 'always' | 'on-failure' | 'off';

class SlackReporterAdapter implements Reporter {
  private readonly inner: Reporter;
  private readonly reporterOptions: Record<string, unknown>;
  private readonly debugMode: DebugMode;

  constructor(options?: { debug?: DebugMode }) {
    const resolvedOptions = (() => {
      try {
        return {
          ...buildSlackReporterOptions(),
          ...(options || {}),
        };
      } catch (error) {
        failReporterConfig(
          'Slack Reporter',
          error instanceof Error ? error.message : String(error)
        );
      }
    })();

    this.reporterOptions = resolvedOptions;
    this.inner = new SlackReporterBase();
    const debugValue = this.reporterOptions.debug;
    this.debugMode =
      debugValue === 'always' || debugValue === 'on-failure' || debugValue === 'off'
        ? debugValue
        : 'off';
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.withOptionalSilence(() =>
      this.inner.onBegin?.(this.withInjectedSlackOptions(config), suite)
    );
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.inner.onTestEnd?.(test, result);
  }

  async onEnd(result: FullResult): Promise<void> {
    await runWithoutCiSharding(async () => {
      const logs = await this.withOptionalSilenceAsync(async () => {
        await this.inner.onEnd?.(result);
      });

      if (this.debugMode === 'on-failure' && this.hasSendFailure(logs)) {
        for (const line of logs) {
          // Re-emit only when delivery failed and debug mode asks for failure logs.
          console.log(line);
        }
      }
    });
  }

  printsToStdio(): boolean {
    return this.inner.printsToStdio?.() ?? false;
  }

  private withInjectedSlackOptions(config: FullConfig): FullConfig {
    const reporters = Array.isArray(config.reporter) ? config.reporter : [];
    const patchedReporters = reporters.map(entry => {
      if (Array.isArray(entry)) {
        const [name, existingOptions] = entry;
        if (typeof name === 'string' && name.toLowerCase().includes('slackreporter')) {
          return [
            name,
            { ...(existingOptions as Record<string, unknown>), ...this.reporterOptions },
          ];
        }

        return entry;
      }

      return entry;
    });

    return {
      ...config,
      reporter: patchedReporters as FullConfig['reporter'],
    };
  }

  private withOptionalSilence(action: () => void): string[] {
    if (this.debugMode === 'always') {
      action();
      return [];
    }

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;

    const bufferedLogs: string[] = [];
    const capture = (...args: unknown[]) => {
      bufferedLogs.push(args.map(arg => String(arg)).join(' '));
    };

    console.log = capture;
    console.info = capture;
    console.warn = capture;

    try {
      action();
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
    }

    return bufferedLogs;
  }

  private async withOptionalSilenceAsync(action: () => Promise<void>): Promise<string[]> {
    if (this.debugMode === 'always') {
      await action();
      return [];
    }

    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;

    const bufferedLogs: string[] = [];
    const capture = (...args: unknown[]) => {
      bufferedLogs.push(args.map(arg => String(arg)).join(' '));
    };

    console.log = capture;
    console.info = capture;
    console.warn = capture;

    try {
      await action();
    } finally {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
    }

    return bufferedLogs;
  }

  private hasSendFailure(logs: string[]): boolean {
    return logs.some(line => {
      const lowered = line.toLowerCase();
      return (
        lowered.includes('message not sent') ||
        lowered.includes('channel_not_found') ||
        lowered.includes('api error occurred')
      );
    });
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

export default SlackReporterAdapter;
