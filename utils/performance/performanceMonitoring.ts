import { Page, test as pwt } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import {
  performanceDevicesConfig,
  type PerformanceDeviceKey,
} from '@config/feature-config/performanceDevices.config';
import { performanceMonitoringConfig } from '@config/feature-config/performanceMonitoring.config';
import { buildDir } from '@root/playwright.config';
import type { PerformanceCategory, PerformanceMonitoringOptions } from './performanceTypes';
import lighthouse from './lighthouseShim';
import { launchChrome } from './chromeLauncherShim';
import {
  backoffBeforeRetry,
  createIsolatedChromeUserDataDir,
  createIsolatedLighthouseTempDir,
  isRetriableWindowsLighthouseTempError,
  killLauncherWithRetry,
  removeDirWithRetry,
  withTemporarySystemTempDir,
} from './lighthouseRuntimeSafety';

// ─── Public target type (same pattern as assertNoConsoleErrors) ───────────────

export type PerformanceMonitoringTarget =
  | string
  | {
      goto: () => Promise<void>;
      getFullPageUrl?: () => string;
      getPageUrl?: () => string;
    };

// ─── Result types ─────────────────────────────────────────────────────────────

export type MonitoringRunScores = Partial<Record<PerformanceCategory, number>>;

export interface MonitoringUrlResult {
  name: string;
  url: string;
  device: PerformanceDeviceKey;
  runs: number;
  scoresPerRun: MonitoringRunScores[];
  medianScores: MonitoringRunScores;
  onlyCategories: readonly PerformanceCategory[];
}

interface MonitoringPerTargetSummary {
  startedAt: string;
  env: string;
  results: MonitoringUrlResult[];
}

// ─── Internal merged options ──────────────────────────────────────────────────

interface MergedMonitoringOptions {
  devices: readonly PerformanceDeviceKey[];
  logs: boolean;
  chrome: { headless?: boolean; flags?: readonly string[] };
  extraHeaders: Record<string, string>;
  extraLighthouseFlags: readonly string[];
  skipAudits: readonly string[];
  onlyCategories: readonly PerformanceCategory[];
  numberOfRuns: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function toLighthouseCategory(cat: PerformanceCategory): string {
  return cat === 'bestPractices' ? 'best-practices' : cat;
}

function toCamelCase(input: string): string {
  return input.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function setByPath(obj: Record<string, any>, dottedPath: string, value: any): void {
  const parts = dottedPath.split('.').filter(Boolean);
  if (!parts.length) return;
  let current: Record<string, any> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = toCamelCase(parts[i]);
    if (!current[key] || typeof current[key] !== 'object') current[key] = {};
    current = current[key];
  }
  current[toCamelCase(parts[parts.length - 1])] = value;
}

function parseFlagValue(raw: string): any {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

function applyExtraLighthouseFlags(
  settings: Record<string, any>,
  flags: readonly string[] | undefined
): void {
  for (const rawFlag of flags ?? []) {
    const token = rawFlag.startsWith('--') ? rawFlag.slice(2) : rawFlag;
    if (!token) continue;
    const eq = token.indexOf('=');
    if (eq === -1) {
      setByPath(settings, token, true);
      continue;
    }
    setByPath(settings, token.slice(0, eq), parseFlagValue(token.slice(eq + 1)));
  }
}

async function buildCookieHeader(page: Page, url: string): Promise<string | undefined> {
  try {
    const cookies = await page.context().cookies([url]);
    if (!cookies.length) return undefined;
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
  } catch {
    return undefined;
  }
}

function calculateMedian(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function aggregateMedianScores(runs: MonitoringRunScores[]): MonitoringRunScores {
  const keys: PerformanceCategory[] = [
    'performance',
    'accessibility',
    'bestPractices',
    'seo',
    'pwa',
  ];
  const result: MonitoringRunScores = {};
  for (const key of keys) {
    const values = runs
      .map(r => r[key])
      .filter((v): v is number => v !== undefined && !Number.isNaN(v));
    const median = calculateMedian(values);
    if (median !== undefined) result[key] = Number(median.toFixed(1));
  }
  return result;
}

function extractScores(lhr: any): MonitoringRunScores {
  const categoryMap: Record<string, PerformanceCategory> = {
    performance: 'performance',
    accessibility: 'accessibility',
    'best-practices': 'bestPractices',
    seo: 'seo',
    pwa: 'pwa',
  };
  const scores: MonitoringRunScores = {};
  for (const [key, category] of Object.entries((lhr?.categories ?? {}) as Record<string, any>)) {
    const mapped = categoryMap[key];
    if (mapped && category && category.score != null) {
      scores[mapped] = Number((Number(category.score) * 100).toFixed(1));
    }
  }
  return scores;
}

function mergeWithDefaults(options?: PerformanceMonitoringOptions): MergedMonitoringOptions {
  return {
    devices: options?.devices ?? performanceMonitoringConfig.devices,
    logs: options?.logs ?? performanceMonitoringConfig.logs,
    chrome: options?.chrome ?? performanceMonitoringConfig.chrome,
    extraHeaders: options?.extraHeaders ?? performanceMonitoringConfig.extraHeaders,
    extraLighthouseFlags:
      options?.extraLighthouseFlags ?? performanceMonitoringConfig.extraLighthouseFlags,
    skipAudits: options?.skipAudits ?? performanceMonitoringConfig.skipAudits,
    onlyCategories: options?.onlyCategories ?? performanceMonitoringConfig.onlyCategories,
    numberOfRuns: options?.numberOfRuns ?? performanceMonitoringConfig.numberOfRuns,
  };
}

async function resolveMonitoringTarget(
  page: Page,
  target: PerformanceMonitoringTarget
): Promise<{ resolvedUrl: string; navigatedByTarget: boolean }> {
  if (typeof target === 'string') {
    return { resolvedUrl: target, navigatedByTarget: false };
  }
  await target.goto();
  const resolvedUrl = target.getFullPageUrl?.() ?? page.url() ?? target.getPageUrl?.();
  if (!resolvedUrl) {
    throw new Error(
      'Cannot resolve performance monitoring target URL. Provide getFullPageUrl()/getPageUrl() or ensure goto() navigates the page.'
    );
  }
  return { resolvedUrl, navigatedByTarget: true };
}

function toAbsoluteUrl(resolvedUrl: string): string {
  if (resolvedUrl.startsWith('http')) return resolvedUrl;
  const baseUrlEnv = process.env.BASE_URL;
  if (!baseUrlEnv) {
    throw new Error(
      `Cannot resolve relative URL "${resolvedUrl}" - either provide an absolute URL, pass a POM target, or set BASE_URL environment variable.`
    );
  }
  const base = baseUrlEnv.replace(/\/$/, '');
  return `${base}${resolvedUrl.startsWith('/') ? resolvedUrl : `/${resolvedUrl}`}`;
}

// ─── Lighthouse runner (single run) ──────────────────────────────────────────

async function runLighthouseOnce(
  page: Page,
  url: string,
  options: MergedMonitoringOptions,
  deviceKey: PerformanceDeviceKey,
  baseFilePath: string
): Promise<{ lhr: any; jsonReportPath?: string; htmlReportPath?: string }> {
  const { logs, chrome, extraLighthouseFlags: extraFlags, skipAudits } = options;
  const categories = options.onlyCategories.map(toLighthouseCategory);

  const extraHeaders: Record<string, string> = { ...options.extraHeaders };
  const cookieHeader = await buildCookieHeader(page, url);
  if (cookieHeader) extraHeaders.Cookie = cookieHeader;

  const device = performanceDevicesConfig[deviceKey];
  const chromeFlags = [
    ...(chrome?.headless ? ['--headless=new'] : []),
    ...((chrome?.flags as readonly string[] | undefined) ?? []),
  ];

  const maxAttempts = process.platform === 'win32' ? 5 : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const userDataDir = createIsolatedChromeUserDataDir();
    const isolatedTempDir = createIsolatedLighthouseTempDir();
    let launcher: Awaited<ReturnType<typeof launchChrome>> | undefined;

    try {
      return await withTemporarySystemTempDir(isolatedTempDir, async () => {
        launcher = await launchChrome({
          chromeFlags,
          userDataDir,
          logLevel: logs ? 'verbose' : 'error',
        });

        const settingsOverrides: Record<string, any> = {
          formFactor: device.formFactor,
          screenEmulation: {
            mobile: device.screenEmulation.mobile,
            width: device.screenEmulation.width,
            height: device.screenEmulation.height,
            deviceScaleFactor: device.screenEmulation.deviceScaleFactor,
            disabled: false,
          },
          onlyCategories: categories,
          skipAudits,
          extraHeaders,
          disableStorageReset: true,
        };

        applyExtraLighthouseFlags(settingsOverrides, extraFlags);

        const result = await lighthouse(url, {
          port: launcher.port,
          logLevel: logs ? 'info' : 'error',
          output: ['json', 'html'],
          onlyCategories: categories,
          settings: settingsOverrides,
        });

        const reportArr = Array.isArray(result?.report)
          ? result.report
          : [result?.report].filter(Boolean);
        const jsonContent = reportArr.find(
          (r: string) => typeof r === 'string' && r.trim().startsWith('{')
        );
        const htmlContent = reportArr.find(
          (r: string) => typeof r === 'string' && r.includes('<html')
        );

        const jsonReportPath = `${baseFilePath}.report.json`;
        const htmlReportPath = `${baseFilePath}.report.html`;

        if (jsonContent) fs.writeFileSync(jsonReportPath, jsonContent, 'utf8');
        if (htmlContent) fs.writeFileSync(htmlReportPath, htmlContent, 'utf8');

        return {
          lhr: result?.lhr ?? {},
          jsonReportPath: fs.existsSync(jsonReportPath) ? jsonReportPath : undefined,
          htmlReportPath: fs.existsSync(htmlReportPath) ? htmlReportPath : undefined,
        };
      });
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < maxAttempts && isRetriableWindowsLighthouseTempError(error);
      if (!shouldRetry) {
        throw error;
      }

      await backoffBeforeRetry(attempt);
    } finally {
      if (launcher) {
        await killLauncherWithRetry(launcher);
      }
      await removeDirWithRetry(userDataDir);
      await removeDirWithRetry(isolatedTempDir);
    }
  }

  throw lastError;
}

// ─── Per-target report builders ───────────────────────────────────────────────

function formatMonitoringScore(score: number | undefined): string {
  return score !== undefined
    ? `<span style="color:#333;">${score.toFixed(1)}%</span>`
    : '<span style="color:#999;">N/A</span>';
}

function buildMonitoringPerTargetMarkdown(
  name: string,
  summary: MonitoringPerTargetSummary
): string {
  const lines: string[] = [];
  const generatedOn = new Date().toLocaleString('pl-PL');

  lines.push('# Performance Monitoring Report');
  lines.push(`*Generated on ${generatedOn}*`);
  lines.push('');
  lines.push(`**Test name:** ${name}`);
  lines.push(`**Environment:** ${summary.env}`);
  lines.push(`**Aggregation method:** median`);
  lines.push('');
  lines.push('## Aggregated Results (Median)');
  lines.push('');
  lines.push('| URL | Device | Runs | Scores (median) |');
  lines.push('|-----|--------|------|-----------------|');

  for (const result of summary.results) {
    const scoreStr = result.onlyCategories
      .map(cat => `${cat}: ${formatMonitoringScore(result.medianScores[cat])}`)
      .join('<br>');
    lines.push(
      `| [${result.name}](${result.url}) | ${result.device} | ${result.runs} | ${scoreStr} |`
    );
  }

  lines.push('');
  lines.push('## Raw Scores Per Run');
  lines.push('');

  for (const result of summary.results) {
    lines.push(`### ${result.name} [${result.device}]`);
    lines.push('');

    const header = ['Run', ...result.onlyCategories].join(' | ');
    const sep = ['----', ...result.onlyCategories.map(() => ':---:')].join(' | ');
    lines.push(`| ${header} |`);
    lines.push(`| ${sep} |`);

    result.scoresPerRun.forEach((run, i) => {
      const cells = [
        `#${i + 1}`,
        ...result.onlyCategories.map(cat =>
          run[cat] !== undefined ? `${run[cat]!.toFixed(1)}%` : 'N/A'
        ),
      ];
      lines.push(`| ${cells.join(' | ')} |`);
    });

    lines.push('');
  }

  return lines.join('\n');
}

async function attachFileIfExists(name: string, filePath: string | undefined): Promise<void> {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    await pwt.info().attach(name, { path: filePath });
  } catch {
    // ignore attachment errors
  }
}

async function attachReportsLocationNote(reportDir: string): Promise<void> {
  try {
    const note = [
      '# Performance monitoring reports location',
      '',
      `More detailed performance monitoring reports are available in: \`${reportDir}\``,
      '',
      'What you can find there:',
      '- per-test summary files attached to this test run (`performance-monitoring-<name>.json` and `.md`),',
      '- per-device per-run Lighthouse reports in `detailed-results/` (`*.report.json` and `*.report.html`),',
      '- aggregated summary reports generated in teardown for the whole run:',
      '  - `performance-monitoring-summary.json`',
      '  - `performance-monitoring-summary.md`',
      '  - `performance-monitoring-summary.pdf`',
    ].join('\n');

    await pwt.info().attach('performance-monitoring-reports-location.md', {
      body: Buffer.from(note, 'utf8'),
      contentType: 'text/markdown',
    });
  } catch {
    // ignore attachment errors
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run a performance monitoring check against a page.
 *
 * Lighthouse is executed `numberOfRuns` times per device; the final score is the median.
 * Results are attached to the Playwright HTML reporter as JSON and Markdown.
 * Failures are NOT asserted — monitoring is purely observational (no thresholds).
 *
 * @param page Playwright page object
 * @param target POM object (with `goto()`) or URL string (absolute or relative to BASE_URL)
 * @param testName Optional name for the report (defaults to shortened URL)
 * @param options Optional overrides for devices, numberOfRuns, categories, etc.
 *
 * POM target:
 *   await runPerformanceMonitoring(page, homePage, 'homePage');
 *
 * URL string:
 *   await runPerformanceMonitoring(page, 'https://example.com/', 'homePage');
 *
 * With overrides:
 *   await runPerformanceMonitoring(page, homePage, 'homePage', {
 *     numberOfRuns: 5,
 *     devices: ['desktop'],
 *   });
 */
export async function runPerformanceMonitoring(
  page: Page,
  target: PerformanceMonitoringTarget,
  testName?: string,
  options?: PerformanceMonitoringOptions
): Promise<void> {
  const mergedOptions = mergeWithDefaults(options);

  const stepLabel =
    testName ||
    (typeof target === 'string'
      ? target
      : (target.getFullPageUrl?.() ?? target.getPageUrl?.() ?? '[pom target]'));

  await pwt.step(`Performance monitoring on ${stepLabel}`, async () => {
    const { resolvedUrl, navigatedByTarget } = await resolveMonitoringTarget(page, target);
    const absoluteUrl = toAbsoluteUrl(resolvedUrl);

    if (!navigatedByTarget) {
      await page.goto(absoluteUrl);
    }

    const auditUrl = page.url() || absoluteUrl;
    const name = testName || auditUrl.replace(/^https?:\/\//, '').slice(0, 50);

    const devices: PerformanceDeviceKey[] = mergedOptions.devices.length
      ? [...mergedOptions.devices]
      : ['desktop'];

    const reportDir = path.resolve(buildDir, 'artifacts', 'performance-monitoring-reports');
    const detailedDir = path.join(reportDir, 'detailed-results');
    fs.mkdirSync(detailedDir, { recursive: true });
    await attachReportsLocationNote(reportDir);

    const results: MonitoringUrlResult[] = [];

    for (const deviceKey of devices) {
      const scoresPerRun: MonitoringRunScores[] = [];

      for (let runIndex = 0; runIndex < mergedOptions.numberOfRuns; runIndex++) {
        const fileBase = path.join(
          detailedDir,
          `${sanitizeFileName(name)}-${deviceKey}-run${runIndex + 1}-${Date.now()}`
        );

        const { lhr, jsonReportPath, htmlReportPath } = await runLighthouseOnce(
          page,
          auditUrl,
          mergedOptions,
          deviceKey,
          fileBase
        );

        scoresPerRun.push(extractScores(lhr));

        await attachFileIfExists(
          `performance-monitoring-${sanitizeFileName(name)}-${deviceKey}-run${runIndex + 1}.report.json`,
          jsonReportPath
        );
        await attachFileIfExists(
          `performance-monitoring-${sanitizeFileName(name)}-${deviceKey}-run${runIndex + 1}.report.html`,
          htmlReportPath
        );
      }

      results.push({
        name,
        url: auditUrl,
        device: deviceKey,
        runs: mergedOptions.numberOfRuns,
        scoresPerRun,
        medianScores: aggregateMedianScores(scoresPerRun),
        onlyCategories: mergedOptions.onlyCategories,
      });
    }

    const reportStamp = Date.now();
    const summary: MonitoringPerTargetSummary = {
      startedAt: new Date().toISOString(),
      env: process.env.TEST_ENV ?? 'local',
      results,
    };

    const jsonPath = path.join(
      reportDir,
      `performance-monitoring-${sanitizeFileName(name)}-${reportStamp}.json`
    );
    const mdPath = path.join(
      reportDir,
      `performance-monitoring-${sanitizeFileName(name)}-${reportStamp}.md`
    );

    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');
    fs.writeFileSync(mdPath, buildMonitoringPerTargetMarkdown(name, summary), 'utf8');

    await attachFileIfExists(`performance-monitoring-${sanitizeFileName(name)}.json`, jsonPath);
    await attachFileIfExists(`performance-monitoring-${sanitizeFileName(name)}.md`, mdPath);
  });
}
