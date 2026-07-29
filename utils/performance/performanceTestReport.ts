import * as fs from 'fs';
import * as path from 'path';

import { buildDir } from '@root/playwright.config';
import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { isHideSensitiveDataEnabled } from './performanceReportUtils';

type CategoryScoreResult = {
  category: string;
  score: number;
  threshold: number;
  passed: boolean;
};

type UrlPerformanceResult = {
  name: string;
  url: string;
  device: string;
  categories: CategoryScoreResult[];
  allPassed: boolean;
};

type PerUrlSummary = {
  startedAt?: string;
  env?: string;
  allPassed?: boolean;
  results?: UrlPerformanceResult[];
  configSnapshot?: {
    hideSensitiveDataInReport?: boolean;
    devices?: string[];
    onlyCategories?: string[];
    thresholds?: Record<string, number>;
  };
};

type OverallPerformanceTestResult = {
  startedAt: string;
  finishedAt: string;
  env: string;
  allPassed: boolean;
  results: UrlPerformanceResult[];
  configSnapshot?: PerUrlSummary['configSnapshot'];
};

const REPORT_DIR = path.resolve(buildDir, 'artifacts', 'performance-test-reports');

function safeReadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function formatDetailedScore(categoryRes: CategoryScoreResult | undefined): string {
  if (!categoryRes) return 'N/A';
  const { score, passed } = categoryRes;
  const status = passed ? 'OK' : 'FAIL';
  const color = passed ? 'green' : 'red';
  return `<span style="color:${color}; font-weight:600;">${score.toFixed(1)}% ${status}</span>`;
}

function buildMarkdown(overall: OverallPerformanceTestResult): string {
  const lines: string[] = [];

  const dateStr = new Date(overall.finishedAt).toLocaleString('pl-PL');
  lines.push(`# Performance Test Summary`);
  lines.push(`*Generated on ${dateStr}*`);
  lines.push('');

  lines.push(`## Results [Environment: ${overall.env}]`);
  lines.push('');

  const categories = Array.from(
    new Set(overall.results.flatMap(r => r.categories.map(c => c.category)))
  ).sort((a, b) => a.localeCompare(b));

  const header = ['Page', 'Device', ...categories.map(c => `${c} score`)].join(' | ');
  lines.push(`| ${header} |`);
  lines.push(`| ${['----', '----', ...categories.map(() => ':---:')].join(' | ')} |`);

  const sortedRows = [...overall.results].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : a.device.localeCompare(b.device);
  });

  for (const result of sortedRows) {
    const cells = [`[${result.name}](${result.url})`, result.device];
    for (const category of categories) {
      const catResult = result.categories.find(c => c.category === category);
      cells.push(formatDetailedScore(catResult));
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('');
  lines.push('## Summary');
  lines.push('');

  const allPassed = overall.allPassed;
  const summaryColor = allPassed ? 'green' : 'red';
  const summaryStatus = allPassed ? 'OK [PASS]' : 'FAIL [FAIL]';
  const summaryText = allPassed
    ? 'All performance tests completed successfully.'
    : 'Some performance tests did not meet threshold requirements.';
  lines.push(
    `<div style="color:${summaryColor}; font-weight:700;">${summaryStatus} ${summaryText}</div>`
  );
  lines.push('');

  const hideSensitive = isHideSensitiveDataEnabled();
  lines.push('## Configuration summary');
  lines.push('');
  lines.push(
    `- hideSensitiveDataInReport: ${String(
      overall.configSnapshot?.hideSensitiveDataInReport ?? hideSensitive
    )}`
  );
  lines.push(`- devices: ${(overall.configSnapshot?.devices || []).join(', ') || 'none'}`);
  lines.push(
    `- onlyCategories: ${(overall.configSnapshot?.onlyCategories || []).join(', ') || 'none'}`
  );
  lines.push('');

  return lines.join('\n');
}

export async function mergePerformanceTestReports(): Promise<void> {
  if (!fs.existsSync(REPORT_DIR)) return;

  const files = fs
    .readdirSync(REPORT_DIR)
    .filter(f => f.startsWith('performance-test-') && f.endsWith('.json'));

  const allResults: UrlPerformanceResult[] = [];
  let env = process.env.TEST_ENV ?? 'local';
  let startedAt = new Date().toISOString();
  let configSnapshot: PerUrlSummary['configSnapshot'];

  for (const f of files) {
    const full = path.join(REPORT_DIR, f);
    const json = safeReadJson(full) as PerUrlSummary | null;
    if (!json) continue;

    if (json.startedAt && startedAt > json.startedAt) startedAt = json.startedAt;
    if (json.env) env = json.env;
    if (json.configSnapshot) configSnapshot = json.configSnapshot;

    if (Array.isArray(json.results)) {
      allResults.push(...json.results);
    }
  }

  if (!allResults.length) return;

  const overall: OverallPerformanceTestResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    env,
    allPassed: allResults.every(r => r.allPassed),
    results: allResults,
    configSnapshot,
  };

  const md = buildMarkdown(overall);
  const mdPath = path.join(REPORT_DIR, 'performance-test-summary.md');
  const jsonPath = path.join(REPORT_DIR, 'performance-test-summary.json');

  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(overall, null, 2), 'utf8');

  try {
    await convertMarkdownToPdf(mdPath, {
      cssPath: path.join(__dirname, 'performance-report.css'),
    });
  } catch {
    // ignore
  }
}
