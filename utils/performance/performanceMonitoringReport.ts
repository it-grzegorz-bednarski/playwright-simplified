import * as fs from 'fs';
import * as path from 'path';

import { buildDir } from '@root/playwright.config';
import { convertMarkdownToPdf } from '@utils/mdToPdf';
import type { MonitoringUrlResult } from './performanceMonitoring';

type MonitoringPerTargetJson = {
  startedAt?: string;
  env?: string;
  results?: MonitoringUrlResult[];
};

type OverallMonitoringResult = {
  startedAt: string;
  finishedAt: string;
  env: string;
  results: MonitoringUrlResult[];
};

const REPORT_DIR = path.resolve(buildDir, 'artifacts', 'performance-monitoring-reports');

function safeReadJson(filePath: string): MonitoringPerTargetJson | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function formatScore(score: number | undefined): string {
  return score !== undefined ? `${score.toFixed(1)}%` : 'N/A';
}

function buildMarkdown(overall: OverallMonitoringResult): string {
  const lines: string[] = [];
  const dateStr = new Date(overall.finishedAt).toLocaleString('pl-PL');

  lines.push('# Performance Monitoring Summary');
  lines.push(`*Generated on ${dateStr}*`);
  lines.push('');
  lines.push(`## Results [Environment: ${overall.env}]`);
  lines.push('');

  const allCategories = Array.from(
    new Set(overall.results.flatMap(r => r.onlyCategories ?? []))
  ).sort((a, b) => a.localeCompare(b));

  const header = ['Page', 'Device', 'Runs', ...allCategories.map(c => `${c} (median)`)].join(' | ');
  lines.push(`| ${header} |`);
  lines.push(`| ${['----', '----', ':---:', ...allCategories.map(() => ':---:')].join(' | ')} |`);

  const sortedRows = [...overall.results].sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    return byName !== 0 ? byName : a.device.localeCompare(b.device);
  });

  for (const result of sortedRows) {
    const cells = [
      `[${result.name}](${result.url})`,
      result.device,
      String(result.runs),
      ...allCategories.map(cat =>
        formatScore(result.medianScores[cat as keyof typeof result.medianScores])
      ),
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }

  lines.push('');
  lines.push('## Raw Statistics');
  lines.push('');

  for (const result of sortedRows) {
    const cats = result.onlyCategories ?? allCategories;
    lines.push(`### ${result.name} [${result.device}] (${result.runs} runs)`);
    lines.push('');

    const rHeader = ['Run', ...cats].join(' | ');
    const rSep = ['----', ...cats.map(() => ':---:')].join(' | ');
    lines.push(`| ${rHeader} |`);
    lines.push(`| ${rSep} |`);

    result.scoresPerRun.forEach((run, i) => {
      const cells = [
        `#${i + 1}`,
        ...cats.map(cat => {
          const v = run[cat as keyof typeof run];
          return v !== undefined ? `${(v as number).toFixed(1)}%` : 'N/A';
        }),
      ];
      lines.push(`| ${cells.join(' | ')} |`);
    });

    lines.push('');
  }

  lines.push('## Configuration summary');
  lines.push('');
  lines.push(`- aggregationMethod: median`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Merge all per-test performance monitoring JSON files into a single summary MD, JSON and PDF.
 * Called from globalTeardown.
 */
export async function mergePerformanceMonitoringReports(): Promise<void> {
  if (!fs.existsSync(REPORT_DIR)) return;

  const files = fs
    .readdirSync(REPORT_DIR)
    .filter(f => f.startsWith('performance-monitoring-') && f.endsWith('.json'));

  const allResults: MonitoringUrlResult[] = [];
  let env = process.env.TEST_ENV ?? 'local';
  let startedAt = new Date().toISOString();

  for (const f of files) {
    const full = path.join(REPORT_DIR, f);
    const json = safeReadJson(full);
    if (!json) continue;

    if (json.startedAt && startedAt > json.startedAt) startedAt = json.startedAt;
    if (json.env) env = json.env;
    if (Array.isArray(json.results)) allResults.push(...json.results);
  }

  if (!allResults.length) return;

  const overall: OverallMonitoringResult = {
    startedAt,
    finishedAt: new Date().toISOString(),
    env,
    results: allResults,
  };

  const md = buildMarkdown(overall);
  const mdPath = path.join(REPORT_DIR, 'performance-monitoring-summary.md');
  const jsonPath = path.join(REPORT_DIR, 'performance-monitoring-summary.json');

  fs.writeFileSync(mdPath, md, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(overall, null, 2), 'utf8');

  try {
    await convertMarkdownToPdf(mdPath, {
      cssPath: path.join(__dirname, 'performance-report.css'),
    });
  } catch {
    // ignore PDF errors
  }
}
