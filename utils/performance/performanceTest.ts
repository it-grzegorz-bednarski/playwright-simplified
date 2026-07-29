import { chromium, expect, Page, test as pwt } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import {
  performanceDevicesConfig,
  type PerformanceDeviceKey,
} from '@config/feature-config/performanceDevices.config';
import { performanceTestConfig } from '@config/feature-config/performanceTest.config';
import { buildDir } from '@root/playwright.config';
import type { PerformanceCategory, PerformanceTestOptions } from './performanceTypes';
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
import { resolveBasicAuthProfile } from '@utils/basicAuth';

export type PerformanceTestTarget =
  | string
  | {
  goto: () => Promise<void>;
  getFullPageUrl?: () => string;
  getPageUrl?: () => string;
};

export interface CategoryScoreResult {
  category: PerformanceCategory;
  score: number;
  threshold: number;
  passed: boolean;
}

export interface UrlPerformanceResult {
  name: string;
  url: string;
  device: PerformanceDeviceKey;
  categories: CategoryScoreResult[];
  allPassed: boolean;
  htmlReportPath?: string;
  jsonReportPath?: string;
}

interface PerUrlSummaryReport {
  startedAt: string;
  env: string;
  allPassed: boolean;
  results: UrlPerformanceResult[];
  configSnapshot: {
    hideSensitiveDataInReport: boolean;
    devices: readonly PerformanceDeviceKey[];
    onlyCategories: readonly PerformanceCategory[];
    thresholds: Record<PerformanceCategory, number>;
  };
}

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
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
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

    const key = token.slice(0, eq);
    const value = parseFlagValue(token.slice(eq + 1));
    setByPath(settings, key, value);
  }
}

async function syncPlaywrightStateToLighthouseBrowser(
  page: Page,
  launcherPort: number,
  logs: boolean
): Promise<void> {
  type StorageEntry = { name: string; value: string };

  const storageState = await page.context().storageState();
  const cookies = storageState.cookies ?? [];
  const origins = storageState.origins ?? [];
  const pageUrl = page.url();
  const currentOrigin = pageUrl && pageUrl !== 'about:blank' ? new URL(pageUrl).origin : undefined;
  const currentSessionStorage: StorageEntry[] = currentOrigin
    ? await page
      .evaluate(() =>
        Object.entries(sessionStorage).map(([name, value]) => ({
          name,
          value: String(value),
        }))
      )
      .catch(() => [])
    : [];

  if (!cookies.length && !origins.length) {
    return;
  }

  const cdpBrowser = await chromium.connectOverCDP(`http://127.0.0.1:${launcherPort}`);

  try {
    const context = cdpBrowser.contexts()[0];
    if (!context) {
      if (logs) {
        console.log('[performance-test] Lighthouse CDP context is not available for state sync.');
      }
      return;
    }

    if (cookies.length) {
      await context.addCookies(cookies as Parameters<typeof context.addCookies>[0]);
    }

    if (origins.length) {
      const storagePage = await context.newPage();
      try {
        for (const originData of origins) {
          const origin = originData.origin;
          const entries = originData.localStorage ?? [];

          if (!origin || !entries.length) {
            continue;
          }

          const authOrigin = tryBuildLighthouseAuthUrl(origin) ?? origin;
          try {
            await storagePage.goto(authOrigin, { waitUntil: 'domcontentloaded' });
            await storagePage.evaluate((items: StorageEntry[]) => {
              for (const item of items) {
                localStorage.setItem(item.name, item.value);
              }
            }, entries);
            if (currentOrigin && currentOrigin === origin && currentSessionStorage?.length) {
              await storagePage.evaluate((items: StorageEntry[]) => {
                for (const item of items) {
                  sessionStorage.setItem(item.name, item.value);
                }
              }, currentSessionStorage);
            }
          } catch {
            // Some origins can redirect immediately and replace execution context.
            // Keep storage sync best-effort to avoid blocking the whole Lighthouse run.
            if (logs) {
              console.log(
                `[performance-test] Skipped localStorage sync for origin ${origin} due to navigation context replacement.`
              );
            }
          }
        }
      } finally {
        await storagePage.close();
      }
    }

    if (logs) {
      console.log(
        `[performance-test] Synced state to Lighthouse Chrome: cookies=${cookies.length}, origins=${origins.length}, sessionStorage=${currentSessionStorage?.length ?? 0}.`
      );
    }
  } finally {
    await cdpBrowser.close();
  }
}

function tryBuildLighthouseAuthUrl(url: string): string | undefined {
  try {
    const creds = resolveBasicAuthProfile(true, { env: process.env });
    if (!creds) return undefined;

    const withCreds = new URL(url);
    withCreds.username = creds.username;
    withCreds.password = creds.password;
    return withCreds.toString();
  } catch {
    return undefined;
  }
}

function stripCredentialsFromUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (!parsed.username && !parsed.password) return value;
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    return value;
  }
}

function redactAuthUrlInText(content: string, authUrl: string, cleanUrl: string): string {
  if (!content) return content;

  let redacted = content.split(authUrl).join(cleanUrl);

  try {
    const auth = new URL(authUrl);
    const clean = new URL(cleanUrl);
    const authPrefix = `${auth.protocol}//${auth.username}:${auth.password}@${auth.host}`;
    const cleanPrefix = `${clean.protocol}//${clean.host}`;
    redacted = redacted.split(authPrefix).join(cleanPrefix);
  } catch {
    // ignore URL parse errors and return direct replacement result
  }

  return redacted;
}

function generateHtmlFromLhr(lhr: any): string | undefined {
  try {
    // Fallback for cases where Lighthouse does not return HTML in `result.report`.
    // This keeps `.report.html` available even when payload shape varies.
    const { ReportGenerator } = require('lighthouse/report/generator/report-generator.js');

    if (typeof ReportGenerator?.generateReportHtml === 'function') {
      return ReportGenerator.generateReportHtml(lhr);
    }

    if (typeof ReportGenerator?.generateReport === 'function') {
      return ReportGenerator.generateReport(lhr, 'html');
    }
  } catch {
    // Best-effort fallback only.
  }

  return undefined;
}

async function attachReportsLocationNote(reportDir: string): Promise<void> {
  try {
    const note = [
      '# Performance test reports location',
      '',
      `More detailed performance reports are available in: \`${reportDir}\``,
      '',
      'What you can find there:',
      '- per-test summary files attached to this test run (`performance-test-<name>.json` and `.md`),',
      '- per-device Lighthouse reports in `detailed-results/` (`*.report.json` and `*.report.html`),',
      '- aggregated summary reports generated in teardown for the whole run:',
      '  - `performance-test-summary.json`',
      '  - `performance-test-summary.md`',
      '  - `performance-test-summary.pdf`',
    ].join('\n');

    await pwt.info().attach('performance-test-reports-location.md', {
      body: Buffer.from(note, 'utf8'),
      contentType: 'text/markdown',
    });
  } catch {
    // ignore attachment errors
  }
}

function formatCategoryResult(categoryResult: CategoryScoreResult): string {
  const status = categoryResult.passed
    ? '<span style="color:green; font-weight:600;">OK</span>'
    : '<span style="color:red; font-weight:600;">FAIL</span>';
  return `${categoryResult.category}: ${categoryResult.score.toFixed(1)} / ${categoryResult.threshold} ${
    status
  }`;
}

function buildPerUrlSummaryMarkdown(name: string, summary: PerUrlSummaryReport): string {
  const lines: string[] = [];
  const generatedOn = new Date().toLocaleString('pl-PL');
  const overallStatus = summary.allPassed
    ? '<span style="color:green; font-weight:700;">PASS</span>'
    : '<span style="color:red; font-weight:700;">FAIL</span>';

  lines.push('# Performance Test Report');
  lines.push(`*Generated on ${generatedOn}*`);
  lines.push('');
  lines.push(`**Test name:** ${name}`);
  lines.push(`**Environment:** ${summary.env}`);
  lines.push(`**Overall result:** ${overallStatus}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('| URL | Device | Result | Scores |');
  lines.push('|-----|--------|--------|--------|');

  for (const result of summary.results) {
    const rowStatus = result.allPassed
      ? '<span style="color:green; font-weight:700;">PASS</span>'
      : '<span style="color:red; font-weight:700;">FAIL</span>';
    lines.push(
      `| [${result.name}](${result.url}) | ${result.device} | ${rowStatus} | ${result.categories
        .map(formatCategoryResult)
        .join('<br>')} |`
    );
  }

  lines.push('');
  lines.push('## Configuration snapshot');
  lines.push('');
  lines.push(
    `- hideSensitiveDataInReport: ${String(summary.configSnapshot.hideSensitiveDataInReport)}`
  );
  lines.push(`- devices: ${summary.configSnapshot.devices.join(', ') || 'none'}`);
  lines.push(`- onlyCategories: ${summary.configSnapshot.onlyCategories.join(', ') || 'none'}`);
  lines.push(
    `- thresholds: ${
      summary.configSnapshot.onlyCategories
        .map(category => `${category}=${summary.configSnapshot.thresholds[category] ?? 0}`)
        .join(', ') || 'none'
    }`
  );
  lines.push('');
  lines.push('## Detailed Lighthouse files');
  lines.push('');

  for (const result of summary.results) {
    lines.push(`- ${result.name} [${result.device}]`);
    lines.push(`  - HTML: ${result.htmlReportPath ?? 'not generated'}`);
    lines.push(`  - JSON: ${result.jsonReportPath ?? 'not generated'}`);
  }

  lines.push('');

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

function buildFailureMessage(
  name: string,
  summary: PerUrlSummaryReport,
  jsonPath: string,
  mdPath: string,
  reportDir: string
): string {
  const failingChecks = summary.results.flatMap(result =>
    result.categories
      .filter(category => !category.passed)
      .map(
        category =>
          `- ${result.name} [${result.device}] ${category.category}: ${category.score.toFixed(1)} < ${category.threshold}`
      )
  );

  const detailFiles = summary.results.flatMap(result =>
    [
      result.htmlReportPath ? `  - HTML: ${result.htmlReportPath}` : undefined,
      result.jsonReportPath ? `  - JSON: ${result.jsonReportPath}` : undefined,
    ].filter((value): value is string => Boolean(value))
  );

  return [
    `Performance thresholds not met for '${name}'.`,
    '',
    'Failed checks:',
    ...(failingChecks.length ? failingChecks : ['- no failing checks details available']),
    '',
    'Summary reports saved to:',
    `  - ${jsonPath}`,
    `  - ${mdPath}`,
    '',
    'Detailed Lighthouse reports:',
    ...detailFiles,
    '',
    'More performance reports can be found at:',
    `  ${reportDir}`,
  ].join('\n');
}

async function resolvePerformanceTarget(
  page: Page,
  target: PerformanceTestTarget
): Promise<{ resolvedUrl: string; navigatedByTarget: boolean }> {
  if (typeof target === 'string') {
    return { resolvedUrl: target, navigatedByTarget: false };
  }

  await target.goto();

  const resolvedUrl = target.getFullPageUrl?.() ?? page.url() ?? target.getPageUrl?.();
  if (!resolvedUrl) {
    throw new Error(
      'Cannot resolve performance target URL from POM. Provide getFullPageUrl()/getPageUrl() or ensure goto() navigates.'
    );
  }

  return { resolvedUrl, navigatedByTarget: true };
}

function toAbsoluteUrl(resolvedUrl: string): string {
  if (resolvedUrl.startsWith('http')) {
    return resolvedUrl;
  }

  const baseUrlEnv = process.env.BASE_URL;
  if (!baseUrlEnv) {
    throw new Error(
      `Cannot resolve relative URL "${resolvedUrl}" - either provide an absolute URL, pass a POM target, or set BASE_URL environment variable.`
    );
  }

  const base = baseUrlEnv.replace(/\/$/, '');
  return `${base}${resolvedUrl.startsWith('/') ? resolvedUrl : `/${resolvedUrl}`}`;
}

function extractScores(lhr: any): Record<PerformanceCategory, number | undefined> {
  const categoryMap: Record<string, PerformanceCategory> = {
    performance: 'performance',
    accessibility: 'accessibility',
    'best-practices': 'bestPractices',
    seo: 'seo',
    pwa: 'pwa',
  };

  const scores: Record<PerformanceCategory, number | undefined> = {
    performance: undefined,
    accessibility: undefined,
    bestPractices: undefined,
    seo: undefined,
    pwa: undefined,
  };

  for (const [key, category] of Object.entries((lhr?.categories ?? {}) as Record<string, any>)) {
    const mapped = categoryMap[key];
    if (mapped && category && category.score != null) {
      scores[mapped] = Number((Number(category.score) * 100).toFixed(1));
    }
  }

  return scores;
}

interface MergedPerformanceOptions {
  devices: readonly PerformanceDeviceKey[];
  logs: boolean;
  chrome: { headless?: boolean; flags?: readonly string[] };
  extraHeaders: Record<string, string>;
  extraLighthouseFlags: readonly string[];
  skipAudits: readonly string[];
  onlyCategories: readonly PerformanceCategory[];
  thresholds: Record<PerformanceCategory, number>;
}

function mergeWithDefaults(options?: PerformanceTestOptions): MergedPerformanceOptions {
  return {
    devices: options?.devices ?? performanceTestConfig.devices,
    logs: options?.logs ?? performanceTestConfig.logs,
    chrome: options?.chrome ?? performanceTestConfig.chrome,
    extraHeaders: options?.extraHeaders ?? performanceTestConfig.extraHeaders,
    extraLighthouseFlags:
      options?.extraLighthouseFlags ?? performanceTestConfig.extraLighthouseFlags,
    skipAudits: options?.skipAudits ?? performanceTestConfig.skipAudits,
    onlyCategories: options?.onlyCategories ?? performanceTestConfig.onlyCategories,
    thresholds: {
      performance: (options?.thresholds?.performance ??
        performanceTestConfig.thresholds.performance) as number,
      accessibility: (options?.thresholds?.accessibility ??
        performanceTestConfig.thresholds.accessibility) as number,
      bestPractices: (options?.thresholds?.bestPractices ??
        performanceTestConfig.thresholds.bestPractices) as number,
      seo: (options?.thresholds?.seo ?? performanceTestConfig.thresholds.seo) as number,
      pwa: (options?.thresholds?.pwa ?? performanceTestConfig.thresholds.pwa) as number,
    },
  };
}

async function runLighthouseWithPlaywrightSession(
  page: Page,
  url: string,
  options: MergedPerformanceOptions,
  deviceKey: PerformanceDeviceKey,
  baseFilePath: string
): Promise<{ lhr: any; jsonReportPath?: string; htmlReportPath?: string }> {
  const logs = options.logs;
  const chrome = options.chrome;
  const extraHeaders = {
    ...options.extraHeaders,
  } as Record<string, string>;
  const extraFlags = options.extraLighthouseFlags;
  const skipAudits = options.skipAudits;
  const categories = options.onlyCategories.map(toLighthouseCategory);

  const device = performanceDevicesConfig[deviceKey];

  const chromeFlags = [
    ...(chrome?.headless ? ['--headless=new'] : []),
    ...((chrome?.flags as readonly string[] | undefined) ?? []),
  ];

  const hasAuthorizationHeader = Object.keys(extraHeaders).some(
    key => key.toLowerCase() === 'authorization'
  );
  const lighthouseAuthUrl = hasAuthorizationHeader ? undefined : tryBuildLighthouseAuthUrl(url);
  const lighthouseNavigationUrl = lighthouseAuthUrl ?? url;

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

        await syncPlaywrightStateToLighthouseBrowser(page, launcher.port, logs);

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

        const result = await lighthouse(lighthouseNavigationUrl, {
          port: launcher.port,
          logLevel: logs ? 'info' : 'error',
          output: ['json', 'html'],
          ...settingsOverrides,
        });

        const reportArr = Array.isArray(result?.report)
          ? result.report
          : [result?.report].filter(Boolean);
        const reportStrings = reportArr.filter((r: unknown): r is string => typeof r === 'string');

        // Lighthouse returns reports in the same order as requested in `output`.
        // Prefer positional extraction to avoid false matches (JSON can contain `<html` snippets).
        const positionalJson = reportStrings[0];
        const positionalHtml = reportStrings[1];

        const rawJsonContent = positionalJson?.trimStart().startsWith('{')
          ? positionalJson
          : reportStrings.find((r: string) => r.trimStart().startsWith('{'));
        const rawHtmlContent =
          positionalHtml && /^<(?:!doctype\s+html|html)\b/i.test(positionalHtml.trimStart())
            ? positionalHtml
            : reportStrings.find((r: string) =>
              /^<(?:!doctype\s+html|html)\b/i.test(r.trimStart())
            );

        const cleanNavigationUrl = stripCredentialsFromUrl(lighthouseNavigationUrl);
        const jsonContent = rawJsonContent
          ? redactAuthUrlInText(rawJsonContent, lighthouseNavigationUrl, cleanNavigationUrl)
          : undefined;
        const htmlSource = rawHtmlContent ?? generateHtmlFromLhr(result?.lhr);
        const htmlContent = htmlSource
          ? redactAuthUrlInText(htmlSource, lighthouseNavigationUrl, cleanNavigationUrl)
          : undefined;

        if (result?.lhr) {
          if (typeof result.lhr.requestedUrl === 'string') {
            result.lhr.requestedUrl = stripCredentialsFromUrl(result.lhr.requestedUrl);
          }
          if (typeof result.lhr.finalUrl === 'string') {
            result.lhr.finalUrl = stripCredentialsFromUrl(result.lhr.finalUrl);
          }
          if (typeof result.lhr.finalDisplayedUrl === 'string') {
            result.lhr.finalDisplayedUrl = stripCredentialsFromUrl(result.lhr.finalDisplayedUrl);
          }
        }

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

async function runPerformanceTestForUrl(
  page: Page,
  testName: string,
  url: string,
  options: MergedPerformanceOptions,
  deviceKey: PerformanceDeviceKey
): Promise<UrlPerformanceResult> {
  const reportDir = path.resolve(
    buildDir,
    'artifacts',
    'performance-test-reports',
    'detailed-results'
  );
  fs.mkdirSync(reportDir, { recursive: true });

  const fileBase = path.join(reportDir, `${sanitizeFileName(testName)}-${deviceKey}-${Date.now()}`);

  const { lhr, htmlReportPath, jsonReportPath } = await runLighthouseWithPlaywrightSession(
    page,
    url,
    options,
    deviceKey,
    fileBase
  );

  const scores = extractScores(lhr);
  const thresholds = options.thresholds;
  const categoriesToTest = [...options.onlyCategories].sort((a, b) => a.localeCompare(b));

  const categories: CategoryScoreResult[] = categoriesToTest.map(category => {
    const score = scores[category] ?? 0;
    const threshold = thresholds[category] ?? 0;
    return {
      category,
      score,
      threshold,
      passed: score >= threshold,
    };
  });

  const allPassed = categories.every(c => c.passed);

  return {
    name: testName,
    url,
    device: deviceKey,
    categories,
    allPassed,
    htmlReportPath,
    jsonReportPath,
  };
}

/**
 * Run a performance test on a given URL with optional configuration overrides.
 *
 * @param page Playwright page object
 * @param target target to test: URL string (absolute/relative) or POM object with goto()
 * @param testName Optional test name for reporting (defaults to shortened URL)
 * @param options Optional overrides for devices, thresholds, categories, etc.
 *
 * Static URL example (uses global config defaults):
 *   await runPerformanceTest(page, '/', 'homePage');
 *
 * POM target example:
 *   await runPerformanceTest(page, homePage, 'homePage');
 *
 * Threshold override example:
 *   await runPerformanceTest(page, '/', 'homePage', {
 *     thresholds: { performance: 80, seo: 85 },
 *     devices: ['desktop'],
 *   });
 */
export async function runPerformanceTest(
  page: Page,
  target: PerformanceTestTarget,
  testName?: string,
  options?: PerformanceTestOptions
): Promise<void> {
  const mergedOptions: MergedPerformanceOptions = mergeWithDefaults(options);
  const stepLabel =
    testName ||
    (typeof target === 'string'
      ? target
      : (target.getFullPageUrl?.() ?? target.getPageUrl?.() ?? '[pom target]'));

  await pwt.step(`Performance test on ${stepLabel}`, async () => {
    const { resolvedUrl, navigatedByTarget } = await resolvePerformanceTarget(page, target);
    const absoluteUrl = toAbsoluteUrl(resolvedUrl);

    if (!navigatedByTarget) {
      await page.goto(absoluteUrl);
    }

    // Do not force Authorization into extra headers globally.
    // Basic Auth for Lighthouse is handled in runLighthouseWithPlaywrightSession via URL creds,
    // which keeps challenge-style auth behavior and avoids blanket auth headers on every request.

    const auditUrl = page.url() || absoluteUrl;
    const name = testName || auditUrl.replace(/^https?:\/\//, '').slice(0, 50);

    const devices: PerformanceDeviceKey[] = mergedOptions.devices.length
      ? [...mergedOptions.devices]
      : ['desktop'];
    const results: UrlPerformanceResult[] = [];

    for (const deviceKey of devices) {
      const result = await runPerformanceTestForUrl(page, name, auditUrl, mergedOptions, deviceKey);
      results.push(result);
    }

    const allPassed = results.every(r => r.allPassed);

    const summaryPath = path.resolve(buildDir, 'artifacts', 'performance-test-reports');
    fs.mkdirSync(summaryPath, { recursive: true });
    await attachReportsLocationNote(summaryPath);

    const thresholdsSnapshot: Record<PerformanceCategory, number> = {
      performance: mergedOptions.thresholds.performance,
      accessibility: mergedOptions.thresholds.accessibility,
      bestPractices: mergedOptions.thresholds.bestPractices,
      seo: mergedOptions.thresholds.seo,
      pwa: mergedOptions.thresholds.pwa,
    };

    const perUrlSummary: PerUrlSummaryReport = {
      startedAt: new Date().toISOString(),
      env: process.env.TEST_ENV ?? 'local',
      allPassed,
      results,
      configSnapshot: {
        hideSensitiveDataInReport: performanceTestConfig.hideSensitiveDataInReport,
        devices: mergedOptions.devices,
        onlyCategories: mergedOptions.onlyCategories,
        thresholds: thresholdsSnapshot,
      },
    };

    const reportStamp = Date.now();
    const jsonPath = path.join(
      summaryPath,
      `performance-test-${sanitizeFileName(name)}-${reportStamp}.json`
    );
    const mdPath = path.join(
      summaryPath,
      `performance-test-${sanitizeFileName(name)}-${reportStamp}.md`
    );
    fs.writeFileSync(jsonPath, JSON.stringify(perUrlSummary, null, 2), 'utf8');
    fs.writeFileSync(mdPath, buildPerUrlSummaryMarkdown(name, perUrlSummary), 'utf8');

    await attachFileIfExists(`performance-test-${sanitizeFileName(name)}.json`, jsonPath);
    await attachFileIfExists(`performance-test-${sanitizeFileName(name)}.md`, mdPath);

    for (const result of results) {
      await attachFileIfExists(
        `performance-test-${sanitizeFileName(result.name)}-${result.device}.report.json`,
        result.jsonReportPath
      );
      await attachFileIfExists(
        `performance-test-${sanitizeFileName(result.name)}-${result.device}.report.html`,
        result.htmlReportPath
      );
    }

    if (!allPassed) {
      // Always use soft fail - performance issues are reported without failing immediately.
      expect
        .soft(allPassed, buildFailureMessage(name, perUrlSummary, jsonPath, mdPath, summaryPath))
        .toBe(true);
    }
  });
}
