import * as fs from 'fs';
import * as path from 'path';

import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { buildDir } from '@root/playwright.config';

export type HtmlValidateUrlResult = {
  url: string;
  errors: number;
  warnings: number;
  total: number;
  issues?: Array<{
    severity: 'error' | 'warning';
    ruleId: string;
    message: string;
    line?: number;
    column?: number;
  }>;
};

export type HtmlValidateAggregateReport = {
  timestamp: string;
  results: HtmlValidateUrlResult[];
  summary: {
    pages: number;
    pagesWithErrors: number;
    totalErrors: number;
    totalWarnings: number;
  };
};

function safeReadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function buildMarkdown(report: HtmlValidateAggregateReport): string {
  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# HTML Validation Report  \n*Generated on ${timestamp}*\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| **Pages scanned** | ${report.summary.pages} |\n`;
  md += `| **Pages with errors** | ${report.summary.pagesWithErrors} |\n`;
  md += `| **Total errors** | ${report.summary.totalErrors} |\n`;
  md += `| **Total warnings** | ${report.summary.totalWarnings} |\n\n`;

  md += `---\n\n`;
  md += `## Pages\n\n`;
  md += `| Status | Page | Errors | Warnings |\n`;
  md += `|--------|------|------:|---------:|\n`;

  for (const r of report.results) {
    const status = r.errors > 0 ? 'ERRORS' : 'OK';
    md += `| ${status} | ${r.url} | ${r.errors} | ${r.warnings} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Details\n\n`;

  const withIssues = report.results.filter(r => (r.issues?.length ?? 0) > 0);
  if (withIssues.length === 0) {
    md += `OK _No issues to display._\n`;
    return md;
  }

  const escapeTableCell = (v: string) =>
    v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  for (const r of withIssues) {
    md += `### ${r.url}\n\n`;
    md += `| Severity | Rule | Location | Message |\n`;
    md += `|----------|------|----------|---------|\n`;
    for (const i of r.issues ?? []) {
      const loc = typeof i.line === 'number' ? `${i.line}:${i.column ?? 0}` : '-';
      md += `| ${i.severity.toUpperCase()} | ${escapeTableCell(i.ruleId)} | ${loc} | ${escapeTableCell(i.message)} |\n`;
    }
    md += `\n\n`;
  }

  return md;
}

async function mergeHtmlValidateReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('html-validate_') && f.endsWith('.json'))
    .filter(f => !['html-validate-report.json'].includes(f));

  const results: HtmlValidateUrlResult[] = [];
  const issueLimitPerPage = 50;

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const issues = Array.isArray(json.issues) ? json.issues : [];
    const topIssues = issues.slice(0, issueLimitPerPage).map((i: any) => ({
      severity: i.severity === 'warning' ? 'warning' : 'error',
      ruleId: String(i.ruleId ?? 'unknown'),
      message: String(i.message ?? ''),
      line: typeof i.line === 'number' ? i.line : undefined,
      column: typeof i.column === 'number' ? i.column : undefined,
    }));

    results.push({
      url: String(json.url ?? 'unknown'),
      errors: Number(json.summary?.errors ?? 0),
      warnings: Number(json.summary?.warnings ?? 0),
      total: Number(json.summary?.total ?? 0),
      issues: topIssues.length ? topIssues : undefined,
    });
  }

  const byUrl = new Map<string, HtmlValidateUrlResult>();
  for (const r of results) byUrl.set(r.url, r);
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = {
    pages: finalResults.length,
    pagesWithErrors: finalResults.filter(r => r.errors > 0).length,
    totalErrors: finalResults.reduce((acc, r) => acc + r.errors, 0),
    totalWarnings: finalResults.reduce((acc, r) => acc + r.warnings, 0),
  };

  const aggregate: HtmlValidateAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'html-validate-report.json');
  const mdOut = path.join(reportsDir, 'html-validate-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'html-validate-report.pdf'),
      cssPath: path.join(__dirname, 'html-validator-report.css'),
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

export async function mergeHtmlValidateReports(): Promise<void> {
  await mergeHtmlValidateReportsFromDir(path.resolve(buildDir, 'artifacts', 'htmlValidator'));
}
