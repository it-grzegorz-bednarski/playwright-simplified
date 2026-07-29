import { Reporter, TestCase, TestResult, FullResult, Suite } from '@playwright/test/reporter';
import * as readline from 'node:readline';

/**
 * Custom Playwright reporter that prints a compact per-test line
 * and a short summary of failed tests at the end of the run.
 */
class CleanReporter implements Reporter {
  private failedTests: { test: TestCase; result: TestResult }[] = [];
  private rootSuite: Suite | null = null;
  private nextTestIndex = 0;
  private testIndexes = new Map<string, number>();
  private printedTestLineIds = new Set<string>();
  private runningTests = new Map<string, { index: number; formattedTest: string }>();
  private runStartMs = 0;
  private renderedLines = 0;
  private passedCount = 0;
  private skippedCount = 0;
  private failedCount = 0;
  private flakyCount = 0;
  private spinnerFrameIndex = 0;
  private spinnerTimer: NodeJS.Timeout | null = null;

  private readonly isInteractiveStdout = Boolean(process.stdout.isTTY);
  private readonly useColor =
    Boolean(process.stdout.isTTY) && !process.env.NO_COLOR && process.env.FORCE_COLOR !== '0';
  private readonly spinnerFrames = ['|', '/', '-', '\\'];
  private readonly brightGreen = '\x1b[92m';
  private readonly brightBlue = '\x1b[94m';
  private readonly brightRed = '\x1b[91m';
  private readonly brightYellow = '\x1b[93m';
  private readonly resetColor = '\x1b[0m';

  /**
   * Called once before all tests start. Logs total test and worker counts.
   */
  onBegin(config: any, suite: Suite) {
    this.rootSuite = suite;
    this.runStartMs = Date.now();
    const testCount = suite.allTests().length;
    const workerCount = config.workers;
    console.log(`\nRunning ${testCount} tests using ${workerCount} workers\n`);
  }

  /**
   * Called when a test starts. Prints one dedicated line for this test.
   * That exact line is updated later in onTestEnd.
   */
  onTestBegin(test: TestCase) {
    const index = this.getOrAssignTestIndex(test);
    const formattedTest = this.formatTestInfo(test);
    const runningLine = this.formatRunningLine(index, formattedTest);
    const hasPrintedLine = this.printedTestLineIds.has(test.id);

    this.runningTests.set(test.id, { index, formattedTest });
    this.ensureSpinner();

    // One test = one line. Retries update the same line instead of printing a duplicate.
    if (!hasPrintedLine) {
      console.log(runningLine);
      this.renderedLines++;
      this.printedTestLineIds.add(test.id);
      return;
    }

    if (this.isInteractiveStdout) {
      this.updateTestLine(index, runningLine);
    }
  }

  /**
   * Called after each test finishes. Logs a single-line status and
   * collects failed tests for the final summary.
   */
  onTestEnd(test: TestCase, result: TestResult) {
    const index = this.getOrAssignTestIndex(test);
    const formattedTest = this.formatTestInfo(test);
    const duration = this.formatDuration(result.duration);

    const isFlakyFinal = this.isFlakyFinalAttempt(test, result);
    const finalLine = this.formatFinalStatusLine(
      index,
      result.status,
      formattedTest,
      duration,
      isFlakyFinal,
      test.results.length - 1
    );

    if (this.isInteractiveStdout) {
      this.updateTestLine(index, finalLine);
    } else {
      console.log(finalLine);
    }

    this.runningTests.delete(test.id);
    if (this.runningTests.size === 0) {
      this.stopSpinner();
    }

    // Per-attempt callbacks can include retries. Final counts are computed in onEnd from test outcomes.
  }

  /**
   * Called once after all tests complete. Prints failed test details
   * and an aggregate summary.
   */
  onEnd(_result: FullResult) {
    this.stopSpinner();
    this.collectFinalOutcomes();
    this.printFailedTestsDetails();
    this.printSummary();

    const totalDurationMs = this.runStartMs ? Date.now() - this.runStartMs : 0;
    console.log(`  Total time: ${this.formatTotalDuration(totalDurationMs)}`);
  }

  onStdOut?(chunk: string | Buffer, test?: TestCase, _result?: TestResult): void {
    // Intentionally muted to keep reporter output compact and line-stable.
    void chunk;
    void test;
  }

  onStdErr?(chunk: string | Buffer, _test?: TestCase, _result?: TestResult): void {
    // Intentionally muted to keep reporter output compact and line-stable.
    void chunk;
  }

  /**
   * Update a previously printed test line in-place.
   *
   * We always print one line per started test, so line N corresponds to test index N.
   * To update line N while cursor is at the bottom, we move up, rewrite, then move down.
   */
  private updateTestLine(index: number, line: string): void {
    if (this.renderedLines === 0) {
      console.log(line);
      return;
    }

    const linesUp = this.renderedLines - index + 1;
    readline.moveCursor(process.stdout, 0, -linesUp);
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(line);
    readline.moveCursor(process.stdout, 0, linesUp);
    readline.cursorTo(process.stdout, 0);
  }

  private ensureSpinner(): void {
    if (!this.isInteractiveStdout || this.spinnerTimer) return;

    this.spinnerTimer = setInterval(() => {
      if (this.runningTests.size === 0) return;

      this.spinnerFrameIndex = (this.spinnerFrameIndex + 1) % this.spinnerFrames.length;

      const running = Array.from(this.runningTests.values()).sort((a, b) => a.index - b.index);
      for (const entry of running) {
        this.updateTestLine(
          entry.index,
          this.formatRunningLine(
            entry.index,
            entry.formattedTest,
            this.spinnerFrames[this.spinnerFrameIndex]
          )
        );
      }
    }, 120);
  }

  private stopSpinner(): void {
    if (!this.spinnerTimer) return;
    clearInterval(this.spinnerTimer);
    this.spinnerTimer = null;
  }

  private getOrAssignTestIndex(test: TestCase): number {
    const existing = this.testIndexes.get(test.id);
    if (existing) return existing;

    this.nextTestIndex++;
    this.testIndexes.set(test.id, this.nextTestIndex);
    return this.nextTestIndex;
  }

  private formatFinalStatusLine(
    index: number,
    status: TestResult['status'],
    formattedTest: string,
    duration: string,
    isFlakyFinal: boolean,
    retryCount: number
  ): string {
    const statusIcon = isFlakyFinal
      ? '!'
      : status === 'failed'
        ? '✗'
        : status === 'skipped'
          ? '-'
          : '✓';
    const flakySuffix = isFlakyFinal ? ` [FLAKY, retries: ${retryCount}]` : '';
    const line = `  ${statusIcon}  ${index} ${formattedTest} ${duration}${flakySuffix}`;
    if (!this.useColor) return line;

    if (isFlakyFinal) {
      return `${this.brightYellow}${line}${this.resetColor}`;
    }

    if (status === 'failed') {
      return `${this.brightRed}${line}${this.resetColor}`;
    }

    if (status === 'skipped') {
      return `${this.brightBlue}${line}${this.resetColor}`;
    }

    return `${this.brightGreen}${line}${this.resetColor}`;
  }

  private formatRunningLine(index: number, formattedTest: string, spinner = ' '): string {
    // Keep status column width identical to final lines: "  ✓  ".
    return `  ${spinner}  ${index} ${formattedTest}`;
  }

  /**
   * Formats total run duration to a compact human-readable string.
   */
  private formatTotalDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((durationMs % 1000) / 100);

    if (minutes > 0) {
      return `${minutes}m ${seconds}.${tenths}s`;
    }
    return `${seconds}.${tenths}s`;
  }

  private getProjectName(test: TestCase): string {
    let suite: Suite | undefined = test.parent;
    while (suite) {
      if (suite.type === 'project') return suite.title || '';
      suite = suite.parent;
    }
    return '';
  }

  private formatTestInfo(test: TestCase): string {
    const fileName = this.extractFileName(test.location?.file);
    const testTitle = test.title || 'Unknown Test';
    const projectName = this.getProjectName(test);
    const projectPrefix = projectName ? `[${projectName}] ` : '';
    return `${projectPrefix}${fileName} › ${testTitle}`;
  }

  private formatTestLocation(test: TestCase): string {
    const fileName = this.extractFileName(test.location?.file);
    const line = test.location?.line || 0;
    const column = test.location?.column || 0;
    const testTitle = test.title || 'Unknown Test';
    const projectName = this.getProjectName(test);
    const projectPrefix = projectName ? `[${projectName}] ` : '';
    return `${projectPrefix}${fileName}:${line}:${column} › ${testTitle}`;
  }

  /**
   * Extracts the filename from an absolute or relative path.
   */
  private extractFileName(filePath?: string): string {
    if (!filePath) return 'Unknown File';
    return filePath.split(/[\\/]/).pop() || 'Unknown File';
  }

  /**
   * Formats test duration in seconds with a single decimal place.
   */
  private formatDuration(duration: number): string {
    return `(${(duration / 1000).toFixed(1)}s)`;
  }

  /**
   * Prints a numbered list of failed tests with a short error message.
   */
  private printFailedTestsDetails(): void {
    if (this.failedTests.length === 0) return;

    console.log('');

    this.failedTests.forEach(({ test, result }, index) => {
      const testLocation = this.formatTestLocation(test);
      console.log(`  ${index + 1}) ${testLocation} ───\n`);

      if (result.error?.message) {
        const errorMessage = result.error.message.split('\n')[0];
        console.log(`    Error: ${errorMessage}\n`);
      }
    });
  }

  /**
   * Prints a final summary line with passed/failed test counts.
   */
  private printSummary(): void {
    const passed = this.passedCount;

    if (this.failedTests.length === 0) {
      const parts: string[] = [`${passed} passed`];
      if (this.flakyCount > 0) parts.push(`${this.flakyCount} flaky`);
      if (this.skippedCount > 0) parts.push(`${this.skippedCount} skipped`);
      console.log(`\n  ${parts.join(', ')}\n`);
    } else {
      if (this.flakyCount > 0 && this.skippedCount > 0) {
        console.log(
          `  ${this.failedCount} failed, ${this.flakyCount} flaky, ${this.skippedCount} skipped`
        );
      } else if (this.flakyCount > 0) {
        console.log(`  ${this.failedCount} failed, ${this.flakyCount} flaky`);
      } else if (this.skippedCount > 0) {
        console.log(`  ${this.failedCount} failed, ${this.skippedCount} skipped`);
      } else {
        console.log(`  ${this.failedCount} failed`);
      }
      this.failedTests.forEach(({ test }) => {
        const testLocation = this.formatTestLocation(test);
        console.log(`    ${testLocation} ────`);
      });
      console.log('');
    }
  }

  private isFlakyFinalAttempt(test: TestCase, result: TestResult): boolean {
    if (result.status !== 'passed') return false;
    if (test.results.length <= 1) return false;

    return test.results.some(
      attempt =>
        attempt.status === 'failed' ||
        attempt.status === 'timedOut' ||
        attempt.status === 'interrupted'
    );
  }

  private collectFinalOutcomes(): void {
    this.failedTests = [];
    this.passedCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;
    this.flakyCount = 0;

    const tests = this.rootSuite?.allTests() ?? [];
    for (const test of tests) {
      const outcome = test.outcome();
      const lastResult = test.results[test.results.length - 1];

      if (outcome === 'flaky') {
        this.flakyCount++;
        continue;
      }

      if (outcome === 'unexpected') {
        this.failedCount++;
        if (lastResult) this.failedTests.push({ test, result: lastResult });
        continue;
      }

      if (outcome === 'skipped') {
        this.skippedCount++;
        continue;
      }

      this.passedCount++;
    }
  }
}

export default CleanReporter;
