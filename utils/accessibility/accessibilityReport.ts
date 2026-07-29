import * as fs from 'fs';
import * as path from 'path';

import { convertMarkdownToPdf } from '@utils/mdToPdf';
import { buildDir } from '@root/playwright.config';
import { accessibilityConfig } from '@config/feature-config/accessibility.config';

export type AccessibilityUrlResult = {
  url: string;
  violations: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  issues?: Array<{
    id: string;
    impact?: string;
    description?: string;
    help: string;
    helpUrl?: string;
    nodes: string[];
  }>;
};

export type AccessibilityAggregateReport = {
  timestamp: string;
  results: AccessibilityUrlResult[];
  summary: {
    pages: number;
    pagesWithViolations: number;
    totalViolations: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
};

type AccessibilityIssueEntry = {
  id: string;
  impact?: string;
  description?: string;
  help: string;
  helpUrl?: string;
  nodes: string[];
};

function escapeMarkdownText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/([`*_{}\[\]()#+\-.!|])/g, '\\$1');
}

function escapeMarkdownCode(value: string): string {
  return value.replace(/`/g, '\\`');
}

function safeReadJson(filePath: string): any | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForStableAccessibilityInputs(reportsDir: string): Promise<void> {
  const maxAttempts = 6;
  const intervalMs = 1000;
  let previousSnapshot = '';
  let stableCount = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const snapshot = fs
      .readdirSync(reportsDir)
      .filter(f => f.startsWith('accessibility_') && f.endsWith('.json'))
      .filter(f => f !== 'accessibility-report.json')
      .sort()
      .map(file => {
        const fullPath = path.join(reportsDir, file);
        const stat = fs.statSync(fullPath);
        return `${file}:${stat.size}:${stat.mtimeMs}`;
      })
      .join('|');

    if (snapshot === previousSnapshot) {
      stableCount += 1;
      if (stableCount >= 2) return;
    } else {
      stableCount = 0;
      previousSnapshot = snapshot;
    }

    await sleep(intervalMs);
  }
}

function buildMarkdown(report: AccessibilityAggregateReport): string {
  const impactMeta: Record<string, { order: number; emoji: string }> = {
    critical: { order: 0, emoji: '🔴' },
    serious: { order: 1, emoji: '🟠' },
    moderate: { order: 2, emoji: '🟡' },
    minor: { order: 3, emoji: '🟢' },
    unknown: { order: 4, emoji: '⚪' },
  };

  const issueGroups = new Map<
    string,
    {
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl?: string;
      pages: Map<string, string[]>;
    }
  >();

  for (const result of report.results) {
    for (const issue of result.issues ?? []) {
      const impact = issue.impact ?? 'unknown';
      const key = `${impact}::${issue.id}`;
      const existing = issueGroups.get(key);
      if (existing) {
        const currentNodes = existing.pages.get(result.url) ?? [];
        existing.pages.set(result.url, [...new Set([...currentNodes, ...issue.nodes])]);
        continue;
      }

      issueGroups.set(key, {
        id: issue.id,
        impact,
        description: issue.description ?? issue.help,
        help: issue.help,
        helpUrl: issue.helpUrl,
        pages: new Map([[result.url, [...new Set(issue.nodes)]]]),
      });
    }
  }

  const groupedIssues = Array.from(issueGroups.values()).sort((a, b) => {
    const orderA = impactMeta[a.impact]?.order ?? impactMeta.unknown.order;
    const orderB = impactMeta[b.impact]?.order ?? impactMeta.unknown.order;
    if (orderA !== orderB) return orderA - orderB;
    return a.id.localeCompare(b.id);
  });

  const timestamp = new Date(report.timestamp).toLocaleString('pl-PL');

  let md = `# Accessibility Report\n\n_Generated on ${timestamp}_\n\n`;

  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `| ----- | ----- |\n`;
  md += `| **Total Violations** | ${report.summary.totalViolations} |\n`;
  md += `| **Unique Issue Types** | ${groupedIssues.length} |\n`;
  md += `| **Pages Affected** | ${report.summary.pagesWithViolations} |\n`;
  md += `| 🔴 Critical | ${report.summary.critical} |\n`;
  md += `| 🟠 Serious | ${report.summary.serious} |\n`;
  md += `| 🟡 Moderate | ${report.summary.moderate} |\n`;
  md += `| 🟢 Minor | ${report.summary.minor} |\n\n`;

  if (!groupedIssues.length) {
    md += `---\n\n`;
    md += `OK _No accessibility violations found._\n`;
    return md;
  }

  md += `---\n\n`;

  for (const issue of groupedIssues) {
    const meta = impactMeta[issue.impact] ?? impactMeta.unknown;
    md += `### ${meta.emoji} ${escapeMarkdownText(issue.id)}\n\n`;
    md += `${escapeMarkdownText(issue.description)}\n\n`;

    if (issue.helpUrl) {
      md += `**How to fix:** [${escapeMarkdownText(issue.help)}](${issue.helpUrl})\n\n`;
    } else {
      md += `**How to fix:** ${escapeMarkdownText(issue.help)}\n\n`;
    }

    const pages = Array.from(issue.pages.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    md += `**Pages Affected (${pages.length}):**\n\n`;

    for (const [url, nodes] of pages) {
      const suffix = nodes.length === 1 ? 'element' : 'elements';
      md += `**[${escapeMarkdownText(url)}](${url})** (${nodes.length} ${suffix})\n\n`;
      for (const node of nodes) {
        md += `- \`${escapeMarkdownCode(node)}\`\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

async function mergeAccessibilityReportsFromDir(reportsDir: string): Promise<void> {
  if (!fs.existsSync(reportsDir)) return;

  await waitForStableAccessibilityInputs(reportsDir);

  const files = fs
    .readdirSync(reportsDir)
    .filter(f => f.startsWith('accessibility_') && f.endsWith('.json'))
    .filter(f => !['accessibility-report.json'].includes(f));

  const results: AccessibilityUrlResult[] = [];
  const issueLimitPerPage = accessibilityConfig.issueLimitPerPage ?? 50;

  for (const f of files) {
    const full = path.join(reportsDir, f);
    const json = safeReadJson(full);
    if (!json) continue;

    const violations = Array.isArray(json.violations) ? json.violations : [];
    const topIssues = violations.slice(0, issueLimitPerPage).map((v: any) => ({
      id: String(v.id ?? 'unknown'),
      impact: typeof v.impact === 'string' ? v.impact : undefined,
      description: typeof v.description === 'string' ? v.description : undefined,
      help: String(v.help ?? ''),
      helpUrl: typeof v.helpUrl === 'string' ? v.helpUrl : undefined,
      nodes: Array.isArray(v.nodes) ? v.nodes.map((n: any) => String(n)) : [],
    }));

    results.push({
      url: String(json.url ?? 'unknown'),
      violations: Number(json.summary?.violations ?? violations.length),
      critical: Number(json.summary?.critical ?? 0),
      serious: Number(json.summary?.serious ?? 0),
      moderate: Number(json.summary?.moderate ?? 0),
      minor: Number(json.summary?.minor ?? 0),
      issues: topIssues.length ? topIssues : undefined,
    });
  }

  const byUrl = new Map<string, AccessibilityUrlResult>();
  for (const r of results) {
    const existing = byUrl.get(r.url);
    if (existing) {
      // Merge results for duplicate URLs: sum violations and deduplicate issues
      const existingIssueMap = new Map<string, AccessibilityIssueEntry>();
      (existing.issues ?? []).forEach(issue => {
        existingIssueMap.set(issue.id, issue);
      });
      (r.issues ?? []).forEach(issue => {
        if (!existingIssueMap.has(issue.id)) {
          existingIssueMap.set(issue.id, issue);
        }
      });
      byUrl.set(r.url, {
        url: r.url,
        violations: existing.violations + r.violations,
        critical: existing.critical + r.critical,
        serious: existing.serious + r.serious,
        moderate: existing.moderate + r.moderate,
        minor: existing.minor + r.minor,
        issues: Array.from(existingIssueMap.values()),
      });
    } else {
      byUrl.set(r.url, r);
    }
  }
  const finalResults = Array.from(byUrl.values()).sort((a, b) => a.url.localeCompare(b.url));

  const summary = {
    pages: finalResults.length,
    pagesWithViolations: finalResults.filter(r => r.violations > 0).length,
    totalViolations: finalResults.reduce((acc, r) => acc + r.violations, 0),
    critical: finalResults.reduce((acc, r) => acc + r.critical, 0),
    serious: finalResults.reduce((acc, r) => acc + r.serious, 0),
    moderate: finalResults.reduce((acc, r) => acc + r.moderate, 0),
    minor: finalResults.reduce((acc, r) => acc + r.minor, 0),
  };

  const aggregate: AccessibilityAggregateReport = {
    timestamp: new Date().toISOString(),
    results: finalResults,
    summary,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonOut = path.join(reportsDir, 'accessibility-report.json');
  const mdOut = path.join(reportsDir, 'accessibility-report.md');

  fs.writeFileSync(jsonOut, JSON.stringify(aggregate, null, 2), 'utf8');
  fs.writeFileSync(mdOut, buildMarkdown(aggregate), 'utf8');

  try {
    await convertMarkdownToPdf(mdOut, {
      outputPath: path.join(reportsDir, 'accessibility-report.pdf'),
      cssPath: path.join(__dirname, 'accessibility-report.css'),
      format: 'A4',
      margin: {
        top: '5mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      displayHeaderFooter: false,
    });
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    fs.writeFileSync(path.join(reportsDir, 'accessibility-report.pdf.error.log'), message, 'utf8');
  }

  // Keep per-page JSON reports alongside aggregated files for deeper troubleshooting.
}

export async function mergeAccessibilityReports(): Promise<void> {
  await mergeAccessibilityReportsFromDir(path.resolve(buildDir, 'artifacts', 'accessibility'));
}
