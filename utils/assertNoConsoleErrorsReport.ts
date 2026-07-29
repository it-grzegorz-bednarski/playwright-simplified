import * as fs from 'fs';
import * as path from 'path';

import { buildDir } from '@root/playwright.config';
import { convertMarkdownToPdf } from '@utils/mdToPdf';

export type ConsoleErrorsUrlResult = {
  url: string;
  errors: number;
  messages?: string[];
};

export type ConsoleErrorsAggregateReport = {
  timestamp: string;
  results: ConsoleErrorsUrlResult[];
  summary: {
    pages: number;
    pagesWithErrors: number;
    totalErrors: number;
  };
};

function safeReadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildMarkdown(report: ConsoleErrorsAggregateReport): string {
  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# Console Errors Report  \n*Generated on ${timestamp}*\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| **Pages scanned** | ${report.summary.pages} |\n`;
  md += `| **Pages with errors** | ${report.summary.pagesWithErrors} |\n`;
  md += `| **Total errors** | ${report.summary.totalErrors} |\n\n`;

  md += `---\n\n`;
  md += `## Pages\n\n`;
  md += `| Status | Page | Errors |\n`;
  md += `|--------|------|------:|\n`;

  for (const r of report.results) {
    const status = r.errors > 0 ? 'ERRORS' : 'OK';
    md += `| ${status} | ${r.url} | ${r.errors} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Details\n\n`;

  const withIssues = report.results.filter(r => r.errors > 0);
  if (!withIssues.length) {
    md += `OK _No console errors found._\n`;
    return md;
  }

  for (const r of withIssues) {
    md += `### ${r.url}\n\n`;
    for (const m of r.messages ?? []) {
      md += `- ${m}\n`;
    }
    md += `\n`;
  }

  return md;
}

async function mergeConsoleErrorsReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('console-errors_') && f.endsWith('.json'))
    .filter(f => !['console-errors-report.json'].includes(f));

  const results: ConsoleErrorsUrlResult[] = [];

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const messages = Array.isArray(json.errors) ? json.errors.map((x: any) => String(x)) : [];

    results.push({
      url: String(json.url ?? 'unknown'),
      errors: Number(json.summary?.errors ?? messages.length),
      messages: messages.length ? messages : undefined,
    });
  }

  const byUrl = new Map<string, ConsoleErrorsUrlResult>();
  for (const r of results) byUrl.set(r.url, r);
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = {
    pages: finalResults.length,
    pagesWithErrors: finalResults.filter(r => r.errors > 0).length,
    totalErrors: finalResults.reduce((acc, r) => acc + r.errors, 0),
  };

  const aggregate: ConsoleErrorsAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'console-errors-report.json');
  const mdOut = path.join(reportsDir, 'console-errors-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'console-errors-report.pdf'),
      cssPath: path.join(__dirname, 'console-errors-report.css'),
      format: 'A4',
      margin: {
        top: '5mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      displayHeaderFooter: false,
    });
  } catch {
    // ignore
  }

  // Keep per-page JSON reports alongside aggregated files for deeper troubleshooting.
}

export async function mergeConsoleErrorsReports(): Promise<void> {
  await mergeConsoleErrorsReportsFromDir(
    path.resolve(buildDir, 'artifacts', 'assertNoConsoleErrors')
  );
}
