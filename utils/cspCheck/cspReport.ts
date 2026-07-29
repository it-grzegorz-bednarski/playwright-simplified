import * as fs from 'fs';
import * as path from 'path';
import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { buildDir } from '@root/playwright.config';

export type CspUrlResult = {
  url: string;
  hasCsp: boolean;
  issuesCount: number;
  issues: { code: string; message: string }[];
};

export type CspAggregateReport = {
  timestamp: string;
  results: CspUrlResult[];
  summary: {
    pages: number;
    pagesWithCsp: number;
    pagesWithIssues: number;
    totalIssues: number;
  };
};

function safeReadJson(filePath: string): any | null {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

function buildMarkdown(report: CspAggregateReport): string {
  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# CSP Report  \n*Generated on ${timestamp}*\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| **Pages scanned** | ${report.summary.pages} |\n`;
  md += `| **Pages with CSP** | ${report.summary.pagesWithCsp} |\n`;
  md += `| **Pages with issues** | ${report.summary.pagesWithIssues} |\n`;
  md += `| **Total issues** | ${report.summary.totalIssues} |\n\n`;

  md += `---\n\n`;
  md += `## Pages\n\n`;
  md += `| Status | Page | CSP | Issues |\n`;
  md += `|--------|------|:---:|------:|\n`;

  for (const r of report.results) {
    const status = r.issuesCount > 0 ? 'ISSUES' : 'OK';
    md += `| ${status} | ${r.url} | ${r.hasCsp ? '✅' : '—'} | ${r.issuesCount} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Details\n\n`;

  const issues = report.results.filter(r => r.issuesCount > 0);
  if (!issues.length) {
    md += `No issues found.\n`;
    return md;
  }

  for (const r of issues) {
    md += `### ${r.url}\n\n`;
    for (const i of r.issues) {
      md += `- **${i.code}** – ${i.message}\n`;
    }
    md += `\n`;
  }

  return md;
}

async function mergeCspReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('csp_') && f.endsWith('.json'))
    .filter(f => !['csp-report.json'].includes(f));

  const results: CspUrlResult[] = [];

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const url = String(json.url ?? 'unknown');
    const issues = Array.isArray(json.issues)
      ? json.issues.map((x: any) => ({
          code: String(x.code ?? ''),
          message: String(x.message ?? ''),
        }))
      : [];

    results.push({
      url,
      hasCsp: Boolean(json.hasCsp),
      issuesCount: issues.length,
      issues,
    });
  }

  const byUrl = new Map<string, CspUrlResult>();
  for (const r of results) byUrl.set(r.url, r);
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = {
    pages: finalResults.length,
    pagesWithCsp: finalResults.filter(r => r.hasCsp).length,
    pagesWithIssues: finalResults.filter(r => r.issuesCount > 0).length,
    totalIssues: finalResults.reduce((acc, r) => acc + r.issuesCount, 0),
  };

  const aggregate: CspAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'csp-report.json');
  const mdOut = path.join(reportsDir, 'csp-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'csp-report.pdf'),
      cssPath: path.join(__dirname, 'csp-report.css'),
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

/**
 * Aggregates per-page CSP JSON reports into a single summary and generates JSON, Markdown, and PDF outputs.
 */
export async function mergeCspReports(): Promise<void> {
  await mergeCspReportsFromDir(path.resolve(buildDir, 'artifacts', 'cspCheck'));
}
