import * as fs from 'fs';
import * as path from 'path';

import { buildDir } from '@root/playwright.config';
import { convertMarkdownToPdf } from '@utils/mdToPdf';

// ─── Local types (mirrors WebVitalsRunSummary without importing from main file) ─

type CwvRating = 'good' | 'needs-improvement' | 'poor';

type CwvMetricResult = {
  metric: string;
  value: number | undefined;
  unit: 'ms' | 'score';
  rating: CwvRating | undefined;
  threshold: number | undefined;
  passed: boolean | undefined;
};

type WebVitalsPageResult = {
  name: string;
  url: string;
  deviceName?: string;
  interactionActionUsed?: string;
  metrics: CwvMetricResult[];
  allPassed: boolean;
};

type WebVitalsRunSummary = {
  startedAt: string;
  env: string;
  allPassed: boolean;
  results?: WebVitalsPageResult[];
  result?: WebVitalsPageResult;
};

type OverallSummary = {
  startedAt: string;
  finishedAt: string;
  env: string;
  allPassed: boolean;
  results: WebVitalsPageResult[];
};

const REPORT_DIR = path.resolve(buildDir, 'artifacts', 'web-vitals-reports');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeReadJson(filePath: string): WebVitalsRunSummary | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function formatValue(m: CwvMetricResult): string {
  if (m.value === undefined) return 'N/A';
  return m.unit === 'ms' ? `${m.value.toFixed(0)} ms` : m.value.toFixed(3);
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

// ─── Markdown builder ─────────────────────────────────────────────────────────

function buildSummaryMarkdown(overall: OverallSummary): string {
  const lines: string[] = [];
  const date = new Date(overall.finishedAt).toLocaleString('pl-PL');

  lines.push('# Core Web Vitals Summary');
  lines.push(`*Generated on ${date}*`);
  lines.push('');
  lines.push(`**Environment:** ${overall.env}`);
  lines.push('');

  // Collect all metric keys present in results
  const allMetrics = Array.from(
    new Set(overall.results.flatMap(r => r.metrics.map(m => m.metric)))
  );

  // Results table
  lines.push('## Results');
  lines.push('');

  const header = ['Page', 'Device', ...allMetrics].join(' | ');
  const sep = ['----', '----', ...allMetrics.map(() => ':---:')].join(' | ');
  lines.push(`| ${header} |`);
  lines.push(`| ${sep} |`);

  for (const r of overall.results) {
    const pageCell = r.interactionActionUsed
      ? `[${r.name}](${r.url})<br/><sub>Action: ${r.interactionActionUsed}</sub>`
      : `[${r.name}](${r.url})`;
    const cells: string[] = [pageCell, r.deviceName ?? 'default'];
    for (const key of allMetrics) {
      const m = r.metrics.find(x => x.metric === key);
      if (!m) {
        cells.push('—');
        continue;
      }
      const val = formatValue(m);
      const isAsserted = m.threshold !== undefined;
      // Lighter value colors improve Markdown readability in dark editor themes.
      const valueColor = isAsserted ? '#e5e7eb' : '#9ca3af';
      const valueClass = isAsserted ? 'cwv-value--asserted' : 'cwv-value--not-asserted';
      const googleResult = formatGoogleResult(m.rating);
      const googleColor = m.rating ? ratingColor(m.rating) : '#333';
      const customStatus =
        m.passed === true ? 'PASS' : m.passed === false ? 'FAIL' : 'NOT ASSERTED';
      const customColor = m.passed === true ? 'green' : m.passed === false ? 'red' : '#6b7280';
      cells.push(
        `<span class="${valueClass}" style="color:${valueColor};">${val}</span><br/><span style="color:${googleColor};">Google: ${googleResult}</span><br/><span style="color:${customColor};">Custom: ${customStatus}</span>`
      );
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('');
  lines.push(
    '<sub>Gray "Custom: NOT ASSERTED" means the metric was measured, but no custom threshold was configured so it does not affect pass/fail.</sub>'
  );
  lines.push('');

  // Overall status
  const overallColor = overall.allPassed ? 'green' : 'red';
  const overallStatus = overall.allPassed
    ? '✓ All web vitals checks passed'
    : '✗ Some web vitals checks failed';
  lines.push(`<div style="color:${overallColor}; font-weight:700;">${overallStatus}</div>`);
  lines.push('');

  // Metric legend
  lines.push('## Metric descriptions');
  lines.push('');
  lines.push('| Metric | Full name | Unit | Google status bands |');
  lines.push('|--------|-----------|------|---------------------|');
  lines.push(
    '| LCP | Largest Contentful Paint | ms | Good: <= 2500 ms; Needs improvement: < 4000 ms; Poor: >= 4000 ms |'
  );
  lines.push(
    '| CLS | Cumulative Layout Shift | score | Good: <= 0.10; Needs improvement: < 0.25; Poor: >= 0.25 |'
  );
  lines.push(
    '| INP | Interaction to Next Paint | ms | Good: <= 200 ms; Needs improvement: < 500 ms; Poor: >= 500 ms |'
  );
  lines.push(
    '| FCP | First Contentful Paint | ms | Good: <= 1800 ms; Needs improvement: < 3000 ms; Poor: >= 3000 ms |'
  );
  lines.push(
    '| TTFB | Time to First Byte | ms | Good: <= 800 ms; Needs improvement: < 1800 ms; Poor: >= 1800 ms |'
  );

  return lines.join('\n');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Merges all per-test web-vitals JSON reports into a single summary.
 * Called from globalTeardown.
 */
export async function mergeWebVitalsReports(): Promise<void> {
  if (!fs.existsSync(REPORT_DIR)) return;

  const files = fs
    .readdirSync(REPORT_DIR)
    .filter(f => f.startsWith('web-vitals-') && f.endsWith('.json') && !f.includes('summary'));

  if (!files.length) return;

  const allResults: WebVitalsPageResult[] = [];
  let env = process.env.TEST_ENV ?? 'local';
  let startedAt = new Date().toISOString();

  for (const f of files) {
    const json = safeReadJson(path.join(REPORT_DIR, f));
    if (!json) continue;
    if (json.startedAt && json.startedAt < startedAt) startedAt = json.startedAt;
    if (json.env) env = json.env;
    if (Array.isArray(json.results) && json.results.length) {
      allResults.push(...json.results);
    } else if (json.result) {
      // Backward compatibility with older single-result files.
      allResults.push(json.result);
    }
  }

  if (!allResults.length) return;

  const overall: OverallSummary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    env,
    allPassed: allResults.every(r => r.allPassed),
    results: allResults,
  };

  const md = buildSummaryMarkdown(overall);
  const mdPath = path.join(REPORT_DIR, 'web-vitals-summary.md');
  const jsonPath = path.join(REPORT_DIR, 'web-vitals-summary.json');

  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(overall, null, 2), 'utf8');

  try {
    await convertMarkdownToPdf(mdPath, {
      cssPath: path.join(__dirname, '..', 'performance', 'performance-report.css'),
    });
  } catch {
    // PDF generation is optional — ignore errors
  }
}
