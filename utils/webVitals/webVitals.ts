import { expect, Page, test as pwt } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

import { buildDir } from '@root/playwright.config';
import { webVitalsActions } from '@config/feature-config/webVitalsActions.config';
import { webVitalsConfig } from '@config/feature-config/webVitals.config';
import { webVitalsDevicesConfig } from '@config/feature-config/webVitalsDevices.config';
import {
  cwvMetricKeys,
  ensureWebVitalsDevicesConfigured,
  WEB_VITALS_DEFAULT_TRIGGER_INTERACTION_FOR_INP,
} from './webVitalsCore.types';
import type { CwvMetricKey, CwvThresholds, WebVitalsDeviceKey } from './webVitalsCore.types';
import { centerClickFallback } from './webVitalsHelpers';
import type {
  CwvMetricResult,
  CwvRating,
  WebVitalsInteractionAction,
  WebVitalsOptions,
  WebVitalsPageResult,
  WebVitalsRunSummary,
} from './webVitalsTypes';

// ─── Target type (same pattern as performanceTest) ────────────────────────────

export type WebVitalsTarget =
  | string
  | {
      goto: () => Promise<void>;
      getFullPageUrl?: () => string;
      getPageUrl?: () => string;
    };

// ─── Google "Good / Needs Improvement / Poor" boundaries ─────────────────────

/**
 * [good_max, needs_improvement_max] per metric.
 * Values at or below good_max → "good"
 * Values above good_max but below needs_improvement_max → "needs-improvement"
 * Values at or above needs_improvement_max → "poor"
 */
const CWV_BOUNDARIES: Record<CwvMetricKey, [number, number]> = {
  LCP: [2500, 4000],
  CLS: [0.1, 0.25],
  INP: [200, 500],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

const CWV_UNITS: Record<CwvMetricKey, 'ms' | 'score'> = {
  LCP: 'ms',
  CLS: 'score',
  INP: 'ms',
  FCP: 'ms',
  TTFB: 'ms',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRating(metric: CwvMetricKey, value: number): CwvRating {
  const [goodMax, poorMin] = CWV_BOUNDARIES[metric];
  if (value <= goodMax) return 'good';
  if (value < poorMin) return 'needs-improvement';
  return 'poor';
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.BASE_URL?.replace(/\/$/, '') ?? '';
  if (!base)
    throw new Error(`Cannot resolve relative URL "${url}" — set BASE_URL or pass an absolute URL.`);
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

async function resolveTarget(
  page: Page,
  target: WebVitalsTarget
): Promise<{ url: string; navigatedByTarget: boolean }> {
  if (typeof target === 'string') {
    return { url: target, navigatedByTarget: false };
  }
  await target.goto();
  const url = target.getFullPageUrl?.() ?? target.getPageUrl?.() ?? page.url();
  return { url, navigatedByTarget: true };
}

type ResolvedInteractionAction = {
  name: string;
  run: WebVitalsInteractionAction;
};

function getAvailableActionNames(): string {
  return Object.keys(webVitalsActions).sort().join(', ');
}

function resolveInteractionAction(options: MergedOptions): ResolvedInteractionAction | undefined {
  if (options.interactionAction) {
    return {
      name: 'inline-action',
      run: options.interactionAction,
    };
  }

  if (options.interactionActionName) {
    const action = webVitalsActions[options.interactionActionName];
    if (!action) {
      throw new Error(
        `Unknown Web Vitals action "${options.interactionActionName}". ` +
          `Available actions: ${getAvailableActionNames()}`
      );
    }
    return { name: options.interactionActionName, run: action };
  }

  // Built-in fallback: centre-of-viewport click.
  return {
    name: 'centerClick',
    run: ({ page }) => centerClickFallback(page),
  };
}

async function applyDevicePreset(page: Page, deviceName?: WebVitalsDeviceKey): Promise<void> {
  if (!deviceName) return;

  const preset = webVitalsDevicesConfig[deviceName];
  if (!preset) {
    throw new Error(
      `Unknown Web Vitals device preset "${deviceName}". Available: ${Object.keys(webVitalsDevicesConfig).join(', ')}`
    );
  }

  const { width, height } = preset.screenEmulation;
  await page.setViewportSize({ width, height });
}

// ─── Core metric collection (browser Performance API) ────────────────────────

/**
 * Collects CWV metrics from the browser's native Performance API.
 * No external library is injected — the same raw data source used by web-vitals.
 */
async function collectMetrics(
  page: Page,
  target: WebVitalsTarget,
  requestedMetrics: readonly CwvMetricKey[],
  collectTimeout: number,
  triggerInteractionForInp: boolean,
  interactionAction: ResolvedInteractionAction | undefined,
  interactionDelayMs: number
): Promise<Partial<Record<CwvMetricKey, number>>> {
  // Avoid hard-failing on ad-heavy pages that never reach complete network idle.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.evaluate(
    (metrics: string[]) => {
      type PerfObserverWindow = Window & {
        __pwCwvCollector?: {
          lcp?: number;
          cls?: number;
          inp?: number;
          fcp?: number;
          ttfb?: number;
          observers: PerformanceObserver[];
        };
      };

      const w = window as PerfObserverWindow;

      // Reset collector per run to avoid cross-test pollution in reused pages.
      w.__pwCwvCollector = {
        lcp: undefined,
        cls: 0,
        inp: undefined,
        fcp: undefined,
        ttfb: undefined,
        observers: [],
      };

      const collector = w.__pwCwvCollector;

      const observe = (
        type: string,
        onEntry: (entry: PerformanceEntry) => void,
        extraOptions?: Record<string, number>
      ) => {
        try {
          const observer = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) onEntry(entry);
          });
          observer.observe({ type, buffered: true, ...(extraOptions ?? {}) });
          collector.observers.push(observer);
        } catch {
          // Unsupported entry type in this browser.
        }
      };

      if (metrics.includes('TTFB')) {
        const nav = performance.getEntriesByType('navigation')[0] as
          PerformanceNavigationTiming | undefined;
        if (nav) collector.ttfb = nav.responseStart;
      }

      if (metrics.includes('FCP')) {
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find(e => e.name === 'first-contentful-paint');
        if (fcp) collector.fcp = fcp.startTime;
        observe('paint', entry => {
          if (entry.name === 'first-contentful-paint') collector.fcp = entry.startTime;
        });
      }

      if (metrics.includes('LCP')) {
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) collector.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        observe('largest-contentful-paint', entry => {
          collector.lcp = entry.startTime;
        });
      }

      if (metrics.includes('CLS')) {
        const shifts = performance.getEntriesByType('layout-shift') as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[];
        collector.cls = shifts.filter(e => !e.hadRecentInput).reduce((sum, e) => sum + e.value, 0);
        observe('layout-shift', entry => {
          const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!shift.hadRecentInput) collector.cls = (collector.cls ?? 0) + shift.value;
        });
      }

      if (metrics.includes('INP')) {
        const updateInp = (entry: PerformanceEntry) => {
          const eventEntry = entry as PerformanceEntry & {
            duration?: number;
            processingStart?: number;
            processingEnd?: number;
            startTime: number;
          };
          const duration =
            typeof eventEntry.duration === 'number' && eventEntry.duration > 0
              ? eventEntry.duration
              : typeof eventEntry.processingStart === 'number' &&
                  typeof eventEntry.processingEnd === 'number'
                ? eventEntry.processingEnd - eventEntry.startTime
                : undefined;

          if (duration !== undefined && duration > 0) {
            collector.inp =
              collector.inp === undefined ? duration : Math.max(collector.inp, duration);
          }
        };

        for (const entry of performance.getEntriesByType('event')) updateInp(entry);
        for (const entry of performance.getEntriesByType('first-input')) updateInp(entry);

        observe('event', updateInp, { durationThreshold: 16 });
        observe('first-input', updateInp);
      }
    },
    [...requestedMetrics]
  );

  if (requestedMetrics.includes('INP') && triggerInteractionForInp && interactionAction) {
    await interactionAction.run({ page, target });
    if (interactionDelayMs > 0) await page.waitForTimeout(interactionDelayMs);
  }

  if (collectTimeout > 0) await page.waitForTimeout(collectTimeout);

  return page.evaluate(
    (metrics: string[]) => {
      type PerfObserverWindow = Window & {
        __pwCwvCollector?: {
          lcp?: number;
          cls?: number;
          inp?: number;
          fcp?: number;
          ttfb?: number;
          observers: PerformanceObserver[];
        };
      };

      const w = window as PerfObserverWindow;
      const collector = w.__pwCwvCollector;
      const result: Record<string, number | undefined> = {};

      if (!collector) return result;

      if (metrics.includes('LCP')) result['LCP'] = collector.lcp;
      if (metrics.includes('CLS')) result['CLS'] = collector.cls;
      if (metrics.includes('INP')) result['INP'] = collector.inp;
      if (metrics.includes('FCP')) result['FCP'] = collector.fcp;
      if (metrics.includes('TTFB')) result['TTFB'] = collector.ttfb;

      for (const observer of collector.observers) {
        try {
          observer.disconnect();
        } catch {
          // ignore observer cleanup failures
        }
      }

      return result;
    },
    [...requestedMetrics]
  );
}

// ─── Result builders ──────────────────────────────────────────────────────────

function buildMetricResults(
  raw: Partial<Record<CwvMetricKey, number>>,
  requestedMetrics: readonly CwvMetricKey[],
  thresholds: CwvThresholds
): CwvMetricResult[] {
  return requestedMetrics.map(metric => {
    const value = raw[metric];
    const threshold = thresholds[metric];
    const unit = CWV_UNITS[metric];
    const rating = value !== undefined ? getRating(metric, value) : undefined;
    const passed = value !== undefined && threshold !== undefined ? value <= threshold : undefined;

    return { metric, value, unit, rating, threshold, passed };
  });
}

// ─── Per-test report (Markdown + JSON attached to HTML reporter) ──────────────

function formatValue(result: CwvMetricResult): string {
  if (result.value === undefined) return 'N/A';
  return result.unit === 'ms' ? `${result.value.toFixed(0)} ms` : result.value.toFixed(3);
}

function ratingColor(rating: CwvRating | undefined): string {
  if (rating === 'good') return 'green';
  if (rating === 'needs-improvement') return 'orange';
  return 'red';
}

function formatGoogleResult(rating: CwvRating | undefined): string {
  if (!rating) return 'N/A';
  if (rating === 'needs-improvement') return 'NEEDS IMPROVEMENT';
  return rating.toUpperCase();
}

function buildPerTestMarkdown(name: string, summary: WebVitalsRunSummary): string {
  const lines: string[] = [];
  const date = new Date().toLocaleString('pl-PL');
  const hasMultipleDevices = summary.results.length > 1;

  lines.push('# Core Web Vitals Report');
  lines.push(`*Generated on ${date}*`);
  lines.push('');
  lines.push(`**Test name:** ${name}`);
  lines.push(`**URL:** ${summary.results[0]?.url ?? 'N/A'}`);
  lines.push(`**Environment:** ${summary.env}`);
  if (!hasMultipleDevices) {
    lines.push(`**Device preset:** ${summary.results[0]?.deviceName ?? 'default'}`);
    lines.push(`**Interaction action:** ${summary.results[0]?.interactionActionUsed ?? 'none'}`);
  }
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push(
    hasMultipleDevices
      ? '| Device | Action | Metric | Value | Google result | Threshold | Status |'
      : '| Metric | Value | Google result | Threshold | Status |'
  );
  lines.push(
    hasMultipleDevices
      ? '|--------|--------|--------|-------|---------------|-----------|--------|'
      : '|--------|-------|---------------|-----------|--------|'
  );

  for (const result of summary.results) {
    for (const m of result.metrics) {
      const isAsserted = m.threshold !== undefined;
      const value = formatValue(m);
      const valueCell = isAsserted ? value : `<span style="color:#6b7280;">${value}</span>`;
      const googleResult = formatGoogleResult(m.rating);
      const threshold =
        m.threshold !== undefined
          ? m.unit === 'ms'
            ? `≤ ${m.threshold} ms`
            : `≤ ${m.threshold}`
          : '<span style="color:#6b7280;">not set</span>';
      const status =
        m.passed === true
          ? `<span style="color:green;">✓ PASS</span>`
          : m.passed === false
            ? `<span style="color:red;">✗ FAIL</span>`
            : '<span style="color:#6b7280;">NOT ASSERTED</span>';
      const googleResultCell =
        m.rating !== undefined
          ? `<span style="color:${ratingColor(m.rating)};">${googleResult}</span>`
          : googleResult;

      if (hasMultipleDevices) {
        lines.push(
          `| ${result.deviceName ?? 'default'} | ${result.interactionActionUsed ?? 'none'} | **${m.metric}** | ${valueCell} | ${googleResultCell} | ${threshold} | ${status} |`
        );
      } else {
        lines.push(
          `| **${m.metric}** | ${valueCell} | ${googleResultCell} | ${threshold} | ${status} |`
        );
      }
    }
  }

  lines.push('');
  lines.push(
    '<sub>Gray "NOT ASSERTED" means the metric was measured, but no custom threshold was configured so it does not affect pass/fail.</sub>'
  );
  lines.push('');
  lines.push('## Metric descriptions');
  lines.push('');
  lines.push('| Metric | Full name | Unit | What it measures |');
  lines.push('|--------|-----------|------|-----------------|');
  lines.push(
    '| **LCP** | Largest Contentful Paint | ms | When the largest visible content element finishes loading |'
  );
  lines.push(
    '| **CLS** | Cumulative Layout Shift | score | Total amount of unexpected layout shifts during page load |'
  );
  lines.push(
    '| **INP** | Interaction to Next Paint | ms | Time from user input to the next rendered frame |'
  );
  lines.push(
    '| **FCP** | First Contentful Paint | ms | When the first text or image is rendered |'
  );
  lines.push(
    '| **TTFB** | Time to First Byte | ms | Time from request start to receiving the first byte from the server |'
  );

  return lines.join('\n');
}

// ─── Attach helpers ───────────────────────────────────────────────────────────

async function attachIfExists(name: string, filePath?: string): Promise<void> {
  if (!filePath || !fs.existsSync(filePath)) return;
  try {
    await pwt.info().attach(name, { path: filePath });
  } catch {
    // ignore
  }
}

async function attachLocationNote(reportDir: string): Promise<void> {
  const note = [
    '# Core Web Vitals reports location',
    '',
    `Detailed reports are saved in: \`${reportDir}\``,
    '',
    'What you can find there:',
    '- per-test JSON and Markdown reports attached to this test run,',
    '- aggregated summary (JSON, Markdown, PDF) generated in teardown.',
  ].join('\n');

  try {
    await pwt.info().attach('web-vitals-reports-location.md', {
      body: Buffer.from(note, 'utf8'),
      contentType: 'text/markdown',
    });
  } catch {
    // ignore
  }
}

// ─── Failure message ──────────────────────────────────────────────────────────

function buildFailureMessage(
  name: string,
  results: WebVitalsPageResult[],
  jsonPath: string,
  mdPath: string
): string {
  const failed = results.flatMap(result =>
    result.metrics
      .filter(m => m.passed === false)
      .map(metric => ({ device: result.deviceName ?? 'default', metric }))
  );
  const lines = [`Core Web Vitals thresholds not met for '${name}'.`, '', 'Failed checks:'];

  for (const entry of failed) {
    const value = formatValue(entry.metric);
    const threshold =
      entry.metric.threshold !== undefined
        ? entry.metric.unit === 'ms'
          ? `${entry.metric.threshold} ms`
          : String(entry.metric.threshold)
        : '?';
    lines.push(`  - [${entry.device}] ${entry.metric.metric}: ${value} > ${threshold}`);
  }

  lines.push('', `Reports: ${jsonPath}`, `         ${mdPath}`);
  return lines.join('\n');
}

// ─── Merged options ───────────────────────────────────────────────────────────

interface MergedOptions {
  thresholds: CwvThresholds;
  collectTimeout: number;
  devices: readonly WebVitalsDeviceKey[];
  triggerInteractionForInp: boolean;
  interactionActionName?: string;
  interactionAction?: WebVitalsInteractionAction;
  interactionDelayMs: number;
}

function mergeOptions(options?: WebVitalsOptions): MergedOptions {
  const devices = options?.devices ?? webVitalsConfig.devices;
  ensureWebVitalsDevicesConfigured(devices);

  return {
    // If per-call thresholds are provided, treat them as the exact asserted set.
    // This allows `{}` (observational mode) and partial subsets (e.g. only LCP/CLS).
    thresholds: options?.thresholds ?? (webVitalsConfig.thresholds as CwvThresholds),
    collectTimeout: options?.collectTimeout ?? webVitalsConfig.collectTimeout,
    devices: [...devices],
    triggerInteractionForInp:
      options?.triggerInteractionForInp ?? WEB_VITALS_DEFAULT_TRIGGER_INTERACTION_FOR_INP,
    interactionActionName: options?.interactionActionName,
    interactionAction: options?.interactionAction,
    interactionDelayMs: options?.interactionDelayMs ?? webVitalsConfig.interactionDelayMs,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Collect Core Web Vitals metrics for a page and assert them against
 * configured thresholds (soft fail — all metrics run before the test fails).
 *
 * Metrics are collected from the browser's native Performance API
 * (the same data source used by the `web-vitals` library).
 *
 * @param page     Playwright page object
 * @param target   POM object with goto() or URL string (absolute / relative to BASE_URL)
 * @param testName Optional label for the report (defaults to shortened URL)
 * @param options  Optional per-call overrides
 *
 * Examples:
 *   // POM target — recommended
 *   await runWebVitals(page, homePage, 'homePage');
 *
 *   // URL string
 *   await runWebVitals(page, 'https://example.com/', 'homePage');
 *
 *   // Assert only LCP and CLS, skip other thresholds
 *   await runWebVitals(page, homePage, 'homePage', {
 *     thresholds: { LCP: 2500, CLS: 0.1 },
 *     interactionActionName: 'flipBothCheckboxes',
 *   });
 *
 *   // Collect all metrics but assert nothing (pure observational run)
 *   await runWebVitals(page, homePage, 'homePage', { thresholds: {} });
 */
export async function runWebVitals(
  page: Page,
  target: WebVitalsTarget,
  testName?: string,
  options?: WebVitalsOptions
): Promise<void> {
  const merged = mergeOptions(options);
  const devices: WebVitalsDeviceKey[] = [...merged.devices];

  const stepLabel = `${
    testName ??
    (typeof target === 'string'
      ? target
      : (target.getFullPageUrl?.() ?? target.getPageUrl?.() ?? '[pom target]'))
  } [${devices.join(', ')}]`;

  await pwt.step(`Core Web Vitals on ${stepLabel}`, async () => {
    const results: WebVitalsPageResult[] = [];
    const requestedMetrics = [...cwvMetricKeys] as readonly CwvMetricKey[];

    for (const deviceName of devices) {
      const interactionAction =
        merged.triggerInteractionForInp && requestedMetrics.includes('INP')
          ? resolveInteractionAction(merged)
          : undefined;

      await applyDevicePreset(page, deviceName);

      const { url: rawUrl, navigatedByTarget } = await resolveTarget(page, target);

      // If POM target or absolute URL is provided, navigate; otherwise fall back to current page
      if (!navigatedByTarget) {
        const absoluteUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : toAbsoluteUrl(rawUrl);
        await page.goto(absoluteUrl);
      }

      const auditUrl = page.url();
      const name = testName ?? auditUrl.replace(/^https?:\/\//, '').slice(0, 50);

      // Collect raw metric values
      const raw = await collectMetrics(
        page,
        target,
        requestedMetrics,
        merged.collectTimeout,
        merged.triggerInteractionForInp,
        interactionAction,
        merged.interactionDelayMs
      );

      // Build typed results
      const metricResults = buildMetricResults(raw, requestedMetrics, merged.thresholds);
      const allPassed = metricResults.every(m => m.passed !== false);

      results.push({
        name,
        url: auditUrl,
        deviceName,
        interactionActionUsed: interactionAction?.name,
        metrics: metricResults,
        allPassed,
      });
    }

    const firstResult = results[0];
    const name = firstResult?.name ?? testName ?? 'web-vitals';
    const allPassed = results.every(r => r.allPassed);

    // Persist per-test reports
    const reportDir = path.resolve(buildDir, 'artifacts', 'web-vitals-reports');
    fs.mkdirSync(reportDir, { recursive: true });
    await attachLocationNote(reportDir);

    const stamp = Date.now();
    const safeName = sanitizeFileName(name);
    const jsonPath = path.join(reportDir, `web-vitals-${safeName}-${stamp}.json`);
    const mdPath = path.join(reportDir, `web-vitals-${safeName}-${stamp}.md`);

    const runSummary: WebVitalsRunSummary = {
      startedAt: new Date().toISOString(),
      env: process.env.TEST_ENV ?? 'local',
      allPassed,
      results,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(runSummary, null, 2), 'utf8');
    fs.writeFileSync(mdPath, buildPerTestMarkdown(name, runSummary), 'utf8');

    await attachIfExists(`web-vitals-${safeName}.json`, jsonPath);
    await attachIfExists(`web-vitals-${safeName}.md`, mdPath);

    if (!allPassed) {
      expect.soft(allPassed, buildFailureMessage(name, results, jsonPath, mdPath)).toBe(true);
    }
  });
}
