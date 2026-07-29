import * as fs from 'fs';
import * as path from 'path';
import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { buildDir } from '@root/playwright.config';

export type SecurityHeadersUrlResult = {
  url: string;
  okCount: number;
  missingCount: number;
  forbiddenPresentCount: number;
  missingHeaders: string[];
  forbiddenPresentHeaders: string[];
};

export type SecurityHeadersAggregateReport = {
  timestamp: string;
  results: SecurityHeadersUrlResult[];
  summary: {
    pages: number;
    okPages: number;
    pagesWithIssues: number;
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

function buildMarkdown(report: SecurityHeadersAggregateReport): string {
  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# Security Headers Report  \n*Generated on ${timestamp}*\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| **Pages scanned** | ${report.summary.pages} |\n`;
  md += `| **OK pages** | ${report.summary.okPages} |\n`;
  md += `| **Pages with issues** | ${report.summary.pagesWithIssues} |\n\n`;

  md += `---\n\n`;
  md += `## Pages\n\n`;
  md += `| Status | Page | Missing | Forbidden present |\n`;
  md += `|--------|------|--------:|-----------------:|\n`;

  for (const r of report.results) {
    const status = r.missingCount + r.forbiddenPresentCount > 0 ? 'ISSUES' : 'OK';
    md += `| ${status} | ${r.url} | ${r.missingCount} | ${r.forbiddenPresentCount} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Details\n\n`;

  const issues = report.results.filter(r => r.missingCount + r.forbiddenPresentCount > 0);
  if (!issues.length) {
    md += `No issues found.\n`;
    return md;
  }

  for (const r of issues) {
    md += `### ${r.url}\n\n`;
    if (r.missingHeaders.length) {
      md += `**Missing required headers:**\n`;
      for (const h of r.missingHeaders) md += `- ${h}\n`;
      md += `\n`;
    }
    if (r.forbiddenPresentHeaders.length) {
      md += `**Forbidden headers present:**\n`;
      for (const h of r.forbiddenPresentHeaders) md += `- ${h}\n`;
      md += `\n`;
    }
  }

  return md;
}

async function mergeSecurityHeadersReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('security-headers_') && f.endsWith('.json'))
    .filter(f => !['security-headers-report.json'].includes(f));

  const results: SecurityHeadersUrlResult[] = [];

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const url = String(json.url ?? 'unknown');
    const missingHeaders = Array.isArray(json.missingHeaders)
      ? json.missingHeaders.map((x: any) => String(x))
      : [];
    const forbiddenPresentHeaders = Array.isArray(json.forbiddenPresentHeaders)
      ? json.forbiddenPresentHeaders.map((x: any) => String(x))
      : [];

    results.push({
      url,
      okCount: Number(json.okCount ?? 0),
      missingCount: missingHeaders.length,
      forbiddenPresentCount: forbiddenPresentHeaders.length,
      missingHeaders,
      forbiddenPresentHeaders,
    });
  }

  const byUrl = new Map<string, SecurityHeadersUrlResult>();
  for (const r of results) byUrl.set(r.url, r);
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = {
    pages: finalResults.length,
    okPages: finalResults.filter(r => r.missingCount + r.forbiddenPresentCount === 0).length,
    pagesWithIssues: finalResults.filter(r => r.missingCount + r.forbiddenPresentCount > 0).length,
  };

  const aggregate: SecurityHeadersAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'security-headers-report.json');
  const mdOut = path.join(reportsDir, 'security-headers-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'security-headers-report.pdf'),
      cssPath: path.join(__dirname, 'security-headers-report.css'),
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
 * Aggregates per-page security headers JSON reports into a single summary
 * and generates JSON, Markdown, and PDF outputs.
 */
export async function mergeSecurityHeadersReports(): Promise<void> {
  await mergeSecurityHeadersReportsFromDir(path.resolve(buildDir, 'artifacts', 'securityHeaders'));
}
