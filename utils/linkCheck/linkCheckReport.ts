import * as fs from 'fs';
import * as path from 'path';
import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { buildDir } from '@root/playwright.config';

export type LinkCheckUrlResult = {
  url: string;
  okCount: number;
  brokenCount: number;
  skippedCount: number;
  brokenLinks: { url?: string; status?: number | null }[];
  skippedLinks: { url?: string; status?: number | null }[];
};

export type LinkCheckAggregateReport = {
  timestamp: string;
  results: LinkCheckUrlResult[];
  summary: {
    pages: number;
    okCount: number;
    brokenCount: number;
    skippedCount: number;
    pagesWithBrokenLinks: number;
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

function buildMarkdown(report: LinkCheckAggregateReport): string {
  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# Link Check Report  \n*Generated on ${timestamp}*\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|------:|\n`;
  md += `| **Pages scanned** | ${report.summary.pages} |\n`;
  md += `| **Pages with broken links** | ${report.summary.pagesWithBrokenLinks} |\n`;
  md += `| **OK** | ${report.summary.okCount} |\n`;
  md += `| **Broken** | ${report.summary.brokenCount} |\n`;
  md += `| **Skipped** | ${report.summary.skippedCount} |\n\n`;

  md += `---\n\n`;
  md += `## Pages\n\n`;
  md += `| Status | Page | OK | Broken | Skipped |\n`;
  md += `|--------|------|---:|------:|--------:|\n`;

  for (const r of report.results) {
    const status = r.brokenCount > 0 ? 'BROKEN' : 'OK';
    md += `| ${status} | ${r.url} | ${r.okCount} | ${r.brokenCount} | ${r.skippedCount} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Broken links details\n\n`;

  const brokenPages = report.results.filter(r => r.brokenCount > 0);
  if (brokenPages.length === 0) {
    md += `No broken links found.\n`;
    return md;
  }

  for (const page of brokenPages) {
    md += `### ${page.url}\n\n`;
    if (page.brokenLinks?.length) {
      for (const l of page.brokenLinks) {
        md += `- ${l.url ?? 'unknown'} -> ${l.status ?? 'unknown'}\n`;
      }
    }
    md += `\n`;
  }

  return md;
}

async function mergeLinkCheckReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('link-check_') && f.endsWith('.json'))
    .filter(f => !['link-check-report.json'].includes(f));

  const results: LinkCheckUrlResult[] = [];

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const url = String(json.url ?? 'unknown');
    const okCount = Number(json.summary?.okCount ?? 0);
    const brokenCount = Number(json.summary?.brokenCount ?? 0);
    const skippedCount = Number(json.summary?.skippedCount ?? 0);

    results.push({
      url,
      okCount,
      brokenCount,
      skippedCount,
      brokenLinks: Array.isArray(json.brokenLinks)
        ? json.brokenLinks.map((b: any) => ({ url: b?.url, status: b?.status }))
        : [],
      skippedLinks: Array.isArray(json.skippedLinks)
        ? json.skippedLinks.map((s: any) => ({ url: s?.url, status: s?.status }))
        : [],
    });
  }

  const byUrl = new Map<string, LinkCheckUrlResult>();
  for (const r of results) byUrl.set(r.url, r);
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = finalResults.reduce(
    (acc, r) => {
      acc.pages += 1;
      acc.okCount += r.okCount;
      acc.brokenCount += r.brokenCount;
      acc.skippedCount += r.skippedCount;
      if (r.brokenCount > 0) acc.pagesWithBrokenLinks += 1;
      return acc;
    },
    {
      pages: 0,
      okCount: 0,
      brokenCount: 0,
      skippedCount: 0,
      pagesWithBrokenLinks: 0,
    }
  );

  const aggregate: LinkCheckAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'link-check-report.json');
  const mdOut = path.join(reportsDir, 'link-check-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'link-check-report.pdf'),
      cssPath: path.join(__dirname, 'link-check-report.css'),
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
 * Aggregates per-page link check JSON reports into a single summary and generates JSON, Markdown, and PDF outputs.
 */
export async function mergeLinkCheckReports(): Promise<void> {
  await mergeLinkCheckReportsFromDir(path.resolve(buildDir, 'artifacts', 'linkCheck'));
}
